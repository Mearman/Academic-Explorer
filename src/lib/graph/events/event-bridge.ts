/**
 * Event Bridge - Central cross-context communication system
 * Handles message passing between main thread and web workers
 */

import { logger } from "@/lib/logger";
import type {
  CrossContextMessage,
  SerializedEvent,
  ExecutionContext
} from "./types";

// Detect current context
const getCurrentContext = (): ExecutionContext => {
  // Check for worker context using self and lack of window
  if (typeof window === "undefined" && typeof self !== "undefined") {
    return "worker";
  }
  return "main";
};

export class EventBridge {
  private static instance: EventBridge | null = null;
  private currentContext: ExecutionContext;
  private workers = new Map<string, Worker>();
  private messageHandlers = new Map<string, (message: CrossContextMessage) => void>();

  private constructor() {
    this.currentContext = getCurrentContext();
    this.setupMessageHandling();
    logger.debug("general", `EventBridge initialized in ${this.currentContext} context`);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EventBridge {
    if (!EventBridge.instance) {
      EventBridge.instance = new EventBridge();
    }
    return EventBridge.instance;
  }

  /**
   * Register a worker for cross-context communication
   */
  registerWorker(worker: Worker, workerId: string): void {
    if (this.currentContext !== "main") {
      logger.warn("general", "Workers can only be registered from main thread");
      return;
    }

    this.workers.set(workerId, worker);

    // Listen for messages from this worker
    worker.addEventListener("message", (event) => {
      // Type guard for message data
      const eventData: unknown = event.data;
      if (!this.isValidCrossContextMessage(eventData)) {
        logger.warn("general", "Invalid cross-context message received", { data: eventData });
        return;
      }

      const message = eventData;
      if (message.type === "event") {
        this.handleCrossContextMessage(message);
      }
    });

    logger.debug("general", `Registered worker: ${workerId}`);
  }

  /**
   * Register a message handler
   */
  registerMessageHandler(id: string, handler: (message: CrossContextMessage) => void): void {
    this.messageHandlers.set(id, handler);
    logger.debug("general", `Registered message handler: ${id}`);
  }

  /**
   * Unregister a message handler
   */
  unregisterMessageHandler(id: string): void {
    this.messageHandlers.delete(id);
    logger.debug("general", `Unregistered message handler: ${id}`);
  }

  /**
   * Emit an event to target context(s)
   */
  emit(
    eventType: string,
    payload: unknown,
    targetContext?: ExecutionContext
  ): void {
    const message: CrossContextMessage = {
      type: "event",
      eventType,
      payload,
      sourceContext: this.currentContext,
      targetContext,
      timestamp: Date.now()
    };

    // Handle local listeners first
    if (!targetContext || targetContext === this.currentContext || targetContext === "current") {
      this.handleLocalMessage(message);
    }

    // Handle cross-context messaging
    if (targetContext && targetContext !== this.currentContext && targetContext !== "current") {
      this.sendCrossContextMessage(message);
    }

    // If no target specified, broadcast to all contexts
    if (!targetContext) {
      this.sendCrossContextMessage(message);
    }
  }

  /**
   * Serialize event for cross-context transmission
   */
  serialize(eventType: string, payload: unknown, targetContext?: ExecutionContext): SerializedEvent {
    try {
      return {
        eventType,
        payload: JSON.stringify(payload),
        metadata: {
          sourceContext: this.currentContext,
          targetContext,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      logger.error("general", "Failed to serialize event", {
        eventType,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      throw new Error(`Event serialization failed: ${eventType}`);
    }
  }

  /**
   * Deserialize event from cross-context transmission
   */
  deserialize(serializedEvent: SerializedEvent): { eventType: string; payload: unknown } {
    try {
      return {
        eventType: serializedEvent.eventType,
        payload: JSON.parse(serializedEvent.payload)
      };
    } catch (error) {
      logger.error("general", "Failed to deserialize event", {
        eventType: serializedEvent.eventType,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      throw new Error(`Event deserialization failed: ${serializedEvent.eventType}`);
    }
  }

  /**
   * Setup message handling based on context
   */
  private setupMessageHandling(): void {
    if (this.currentContext === "worker") {
      // Worker context - listen for messages from main thread
      addEventListener("message", (event) => {
        // Type guard for message data
        const eventData: unknown = event.data;
        if (!this.isValidCrossContextMessage(eventData)) {
          logger.warn("general", "Invalid cross-context message received in worker", { data: eventData });
          return;
        }

        const message = eventData;
        if (message.type === "event") {
          this.handleCrossContextMessage(message);
        }
      });
    }
    // Main thread handling is done in registerWorker()
  }

  /**
   * Handle messages within the current context
   */
  private handleLocalMessage(message: CrossContextMessage): void {
    for (const handler of this.messageHandlers.values()) {
      try {
        handler(message);
      } catch (error) {
        logger.error("general", "Error in message handler", {
          eventType: message.eventType,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  }

  /**
   * Handle messages from other contexts
   */
  private handleCrossContextMessage(message: CrossContextMessage): void {
    logger.debug("general", `Received cross-context message`, {
      eventType: message.eventType,
      sourceContext: message.sourceContext,
      targetContext: message.targetContext
    });

    // Only handle if this context is the target or no target specified
    if (message.targetContext &&
        message.targetContext !== this.currentContext &&
        message.targetContext !== "current") {
      return;
    }

    this.handleLocalMessage(message);
  }

  /**
   * Send message to other contexts
   */
  private sendCrossContextMessage(message: CrossContextMessage): void {
    if (this.currentContext === "main") {
      // Send to all registered workers
      for (const [workerId, worker] of this.workers.entries()) {
        try {
          worker.postMessage(message);
          logger.debug("general", `Sent message to worker: ${workerId}`, {
            eventType: message.eventType
          });
        } catch (error) {
          logger.error("general", `Failed to send message to worker: ${workerId}`, {
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
    } else if (this.currentContext === "worker") {
      // Send to main thread
      try {
        postMessage(message);
        logger.debug("general", "Sent message to main thread", {
          eventType: message.eventType
        });
      } catch (error) {
        logger.error("general", "Failed to send message to main thread", {
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  }

  /**
   * Get current execution context
   */
  getCurrentContext(): ExecutionContext {
    return this.currentContext;
  }

  /**
   * Get debug information
   */
  getDebugInfo(): Record<string, unknown> {
    return {
      currentContext: this.currentContext,
      registeredWorkers: Array.from(this.workers.keys()),
      messageHandlers: Array.from(this.messageHandlers.keys())
    };
  }

  /**
   * Type guard for CrossContextMessage
   */
  private isValidCrossContextMessage(data: unknown): data is CrossContextMessage {
    if (!data || typeof data !== "object") {
      return false;
    }

    return (
      typeof data === "object" &&
      data !== null &&
      "type" in data &&
      "eventType" in data &&
      "sourceContext" in data &&
      "timestamp" in data &&
      typeof data.type === "string" &&
      typeof data.eventType === "string" &&
      typeof data.sourceContext === "string" &&
      typeof data.timestamp === "number"
    );
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.messageHandlers.clear();

    // Clean up worker references (but don"t terminate them)
    this.workers.clear();

    logger.debug("general", "EventBridge cleaned up");
  }

  /**
   * Reset singleton instance (primarily for testing)
   */
  static resetInstance(): void {
    if (EventBridge.instance) {
      EventBridge.instance.cleanup();
      EventBridge.instance = null;
    }
  }
}

// Export singleton instance
export const eventBridge = EventBridge.getInstance();