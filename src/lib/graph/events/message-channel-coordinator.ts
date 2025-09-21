/**
 * MessageChannel Coordinator
 * Implements dedicated communication channels between workers using MessageChannel API
 * Based on ChatGPT document recommendations for private worker-to-worker communication
 */

import { logger } from "@/lib/logger";

export interface ChannelMessage {
  type: string;
  payload?: unknown;
  messageId: string;
  timestamp: number;
  responseId?: string; // For request-response patterns
}

export interface ChannelOptions {
  timeout?: number; // Default timeout for request-response patterns
  maxRetries?: number; // Maximum retries for failed messages
}

export class MessageChannelCoordinator {
  private channels = new Map<string, MessagePort>();
  private pendingRequests = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private messageHandlers = new Map<string, Set<(message: ChannelMessage) => void>>();
  private messageIdCounter = 0;
  private defaultTimeout: number;
  private maxRetries: number;

  constructor(options: ChannelOptions = {}) {
    this.defaultTimeout = options.timeout || 5000; // 5 seconds default
    this.maxRetries = options.maxRetries || 3;
  }

  /**
   * Create a new MessageChannel and return both ports
   * Main thread should call this and transfer one port to each worker
   */
  createChannel(): { port1: MessagePort; port2: MessagePort } {
    const channel = new MessageChannel();
    return {
      port1: channel.port1,
      port2: channel.port2
    };
  }

  /**
   * Register a MessagePort for communication
   */
  registerPort(portId: string, port: MessagePort): void {
    if (this.channels.has(portId)) {
      logger.warn("eventbridge", "Port already registered, replacing", { portId });
      this.channels.get(portId)?.close();
    }

    this.channels.set(portId, port);

    // Setup message handling
    port.onmessage = (event: MessageEvent<ChannelMessage>) => {
      this.handleIncomingMessage(portId, event.data);
    };

    port.onmessageerror = (event: MessageEvent) => {
      logger.error("eventbridge", "MessagePort error", { portId, event });
    };

    // Start the port
    port.start();

    logger.debug("eventbridge", "MessagePort registered", { portId });
  }

  /**
   * Send a message through a specific port
   */
  sendMessage(portId: string, type: string, payload?: unknown): boolean {
    const port = this.channels.get(portId);
    if (!port) {
      logger.warn("eventbridge", "Port not found for message", { portId, type });
      return false;
    }

    try {
      const message: ChannelMessage = {
        type,
        payload,
        messageId: this.generateMessageId(),
        timestamp: Date.now()
      };

      port.postMessage(message);

      logger.debug("eventbridge", "Message sent through port", {
        portId,
        type,
        messageId: message.messageId
      });

      return true;
    } catch (error) {
      logger.error("eventbridge", "Failed to send message through port", {
        portId,
        type,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      return false;
    }
  }

  /**
   * Send a request and wait for response (request-response pattern)
   */
  async sendRequest(
    portId: string,
    type: string,
    payload?: unknown,
    timeout?: number
  ): Promise<unknown> {
    const port = this.channels.get(portId);
    if (!port) {
      throw new Error(`Port not found: ${portId}`);
    }

    const messageId = this.generateMessageId();
    const timeoutMs = timeout || this.defaultTimeout;

    return new Promise((resolve, reject) => {
      // Setup timeout
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new Error(`Request timeout after ${timeoutMs.toString()}ms`));
      }, timeoutMs);

      // Store pending request
      this.pendingRequests.set(messageId, {
        resolve,
        reject,
        timeout: timeoutHandle
      });

      // Send request
      try {
        const message: ChannelMessage = {
          type,
          payload,
          messageId,
          timestamp: Date.now()
        };

        port.postMessage(message);

        logger.debug("eventbridge", "Request sent through port", {
          portId,
          type,
          messageId,
          timeout: timeoutMs
        });
      } catch (error) {
        this.pendingRequests.delete(messageId);
        clearTimeout(timeoutHandle);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Send a response to a previous request
   */
  sendResponse(portId: string, originalMessage: ChannelMessage, responsePayload?: unknown): boolean {
    const responseMessage: ChannelMessage = {
      type: `${originalMessage.type}_RESPONSE`,
      payload: responsePayload,
      messageId: this.generateMessageId(),
      responseId: originalMessage.messageId,
      timestamp: Date.now()
    };

    return this.sendMessage(portId, responseMessage.type, responseMessage);
  }

  /**
   * Register a handler for a specific message type
   */
  onMessage(type: string, handler: (message: ChannelMessage) => void): string {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    const handlerId = `${type}-${Date.now().toString()}-${Math.random().toString(36).substring(2)}`;
    const typeHandlers = this.messageHandlers.get(type);
    if (typeHandlers) {
      typeHandlers.add(handler);
    }

    logger.debug("eventbridge", "Message handler registered", { type, handlerId });

    return handlerId;
  }

  /**
   * Remove a message handler
   */
  removeHandler(type: string, handler: (message: ChannelMessage) => void): boolean {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const removed = handlers.delete(handler);
      if (handlers.size === 0) {
        this.messageHandlers.delete(type);
      }
      return removed;
    }
    return false;
  }

  /**
   * Remove a port and clean up resources
   */
  removePort(portId: string): void {
    const port = this.channels.get(portId);
    if (port) {
      port.close();
      this.channels.delete(portId);
      logger.debug("eventbridge", "Port removed and closed", { portId });
    }
  }

  /**
   * Get list of registered ports
   */
  getRegisteredPorts(): string[] {
    return Array.from(this.channels.keys());
  }

  /**
   * Check if a port is registered and active
   */
  hasPort(portId: string): boolean {
    return this.channels.has(portId);
  }

  /**
   * Clean up all resources
   */
  cleanup(): void {
    // Clear pending requests
    for (const [, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Coordinator cleanup - request cancelled"));
    }
    this.pendingRequests.clear();

    // Close all ports
    for (const [, port] of this.channels.entries()) {
      port.close();
    }
    this.channels.clear();

    // Clear handlers
    this.messageHandlers.clear();

    logger.debug("eventbridge", "MessageChannelCoordinator cleaned up");
  }

  /**
   * Handle incoming messages from ports
   */
  private handleIncomingMessage(portId: string, message: ChannelMessage): void {
    logger.debug("eventbridge", "Message received from port", {
      portId,
      type: message.type,
      messageId: message.messageId,
      hasResponseId: !!message.responseId
    });

    // Check if this is a response to a pending request
    if (message.responseId && this.pendingRequests.has(message.responseId)) {
      const pending = this.pendingRequests.get(message.responseId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.responseId);

        // Check if it's an error response
        if (message.type.endsWith("_ERROR")) {
          const errorMessage = typeof message.payload === "string" ? message.payload : "Request failed";
          pending.reject(new Error(errorMessage));
        } else {
          pending.resolve(message.payload);
        }
      }
      return;
    }

    // Handle regular messages
    const handlers = this.messageHandlers.get(message.type);
    if (handlers && handlers.size > 0) {
      for (const handler of handlers) {
        try {
          handler(message);
        } catch (error) {
          logger.error("eventbridge", "Error in message handler", {
            type: message.type,
            messageId: message.messageId,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
    } else {
      logger.debug("eventbridge", "No handlers for message type", {
        type: message.type,
        messageId: message.messageId
      });
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now().toString()}-${(++this.messageIdCounter).toString()}`;
  }

  /**
   * Get debug information
   */
  getDebugInfo(): Record<string, unknown> {
    return {
      registeredPorts: Array.from(this.channels.keys()),
      pendingRequests: this.pendingRequests.size,
      messageHandlers: Object.fromEntries(
        Array.from(this.messageHandlers.entries()).map(([type, handlers]) => [type, handlers.size])
      ),
      defaultTimeout: this.defaultTimeout,
      maxRetries: this.maxRetries
    };
  }
}

// Export singleton instance
export const messageChannelCoordinator = new MessageChannelCoordinator();