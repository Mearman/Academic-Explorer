/**
 * WebSocket service for real-time collaboration
 * Handles connection management, message queuing, and automatic reconnection
 */

import type { WebSocketMessage, WebSocketMessageType } from '@/types/collaboration';

/**
 * WebSocket service configuration
 */
export interface WebSocketConfig {
  /** WebSocket server URL */
  url: string;
  /** Protocols to use */
  protocols?: string | string[];
  /** Connection timeout in milliseconds */
  connectionTimeout?: number;
  /** Heartbeat interval in milliseconds */
  heartbeatInterval?: number;
  /** Heartbeat timeout in milliseconds */
  heartbeatTimeout?: number;
  /** Enable automatic reconnection */
  autoReconnect?: boolean;
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number;
  /** Base reconnection delay in milliseconds */
  reconnectDelay?: number;
  /** Maximum reconnection delay in milliseconds */
  maxReconnectDelay?: number;
  /** Backoff multiplier for reconnection delay */
  backoffMultiplier?: number;
  /** Enable message queuing during disconnection */
  enableQueuing?: boolean;
  /** Maximum queued messages */
  maxQueueSize?: number;
  /** Message acknowledgment timeout */
  ackTimeout?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<WebSocketConfig> = {
  url: '',
  protocols: [],
  connectionTimeout: 5000,
  heartbeatInterval: 30000,
  heartbeatTimeout: 5000,
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  backoffMultiplier: 2,
  enableQueuing: true,
  maxQueueSize: 100,
  ackTimeout: 5000,
};

/**
 * Connection states
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnecting' | 'disconnected' | 'error';

/**
 * Event handler type
 */
type EventHandler = (data?: unknown) => void;

/**
 * Queued message with retry information
 */
interface QueuedMessage {
  message: WebSocketMessage;
  retries: number;
  timestamp: number;
}

/**
 * Pending acknowledgment
 */
interface PendingAck {
  messageId: string;
  resolve: (value: boolean) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

/**
 * WebSocket service class
 */
export class WebSocketService {
  private config: Required<WebSocketConfig>;
  private ws: WebSocket | null = null;
  private state: ConnectionState = 'disconnected';
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private messageQueue: QueuedMessage[] = [];
  private pendingAcks: Map<string, PendingAck> = new Map();
  
  // Reconnection state
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isReconnecting = false;
  
  // Heartbeat state
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatTimeoutTimer: NodeJS.Timeout | null = null;
  private lastHeartbeatTime = 0;
  
  // Connection timeout
  private connectionTimer: NodeJS.Timeout | null = null;

  constructor(config: WebSocketConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Validate configuration
    if (!this.config.url) {
      throw new Error('WebSocket URL is required');
    }
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.setState('connecting');
        this.emit('connecting');

        // Create WebSocket connection
        this.ws = new WebSocket(this.config.url, this.config.protocols);

        // Set up connection timeout
        this.connectionTimer = setTimeout(() => {
          this.handleConnectionTimeout();
          reject(new Error('Connection timeout'));
        }, this.config.connectionTimeout);

        // Set up event handlers
        this.ws.onopen = (event) => {
          this.handleOpen(event);
          resolve();
        };

        this.ws.onclose = (event) => {
          this.handleClose(event);
          if (this.state === 'connecting') {
            reject(new Error(`Connection failed: ${event.reason || 'Unknown error'}`));
          }
        };

        this.ws.onerror = (event) => {
          this.handleError(event);
          if (this.state === 'connecting') {
            reject(new Error('Connection error'));
          }
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

      } catch (error) {
        this.setState('error');
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.setState('disconnecting');
    this.isReconnecting = false;
    
    // Clear timers
    this.clearTimers();
    
    // Close WebSocket connection
    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
    
    // Clear pending acknowledgments
    this.clearPendingAcks();
    
    this.setState('disconnected');
    this.emit('disconnected');
  }

  /**
   * Send a message
   */
  async send(message: WebSocketMessage): Promise<void> {
    if (!this.isValidMessage(message)) {
      throw new Error('Invalid message format');
    }

    if (this.state === 'connected' && this.ws) {
      try {
        const serialized = JSON.stringify(message);
        this.ws.send(serialized);
        this.emit('message-sent', message);
      } catch (error) {
        throw new Error(`Failed to send message: ${error}`);
      }
    } else if (this.config.enableQueuing) {
      this.queueMessage(message);
    } else {
      throw new Error('WebSocket is not connected and queuing is disabled');
    }
  }

  /**
   * Send a message with acknowledgment
   */
  async sendWithAck(message: WebSocketMessage, timeout?: number): Promise<boolean> {
    const ackTimeout = timeout || this.config.ackTimeout;
    
    return new Promise((resolve, reject) => {
      // Set up acknowledgment waiting
      const timer = setTimeout(() => {
        this.pendingAcks.delete(message.id);
        reject(new Error('Acknowledgment timeout'));
      }, ackTimeout);

      this.pendingAcks.set(message.id, {
        messageId: message.id,
        resolve,
        reject,
        timeout: timer,
      });

      // Send message
      this.send(message).catch(error => {
        this.pendingAcks.delete(message.id);
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Send a message with retry capability
   */
  async sendWithRetry(
    message: WebSocketMessage, 
    options: { maxRetries?: number; retryDelay?: number } = {}
  ): Promise<void> {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 1000;
    
    let attempts = 0;
    
    while (attempts <= maxRetries) {
      try {
        await this.send(message);
        this.emit('message-send-attempt', { attempts: attempts + 1, success: true });
        return;
      } catch (error) {
        attempts++;
        this.emit('message-send-attempt', { attempts, success: false, error });
        
        if (attempts > maxRetries) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
      }
    }
  }

  /**
   * Add event listener
   */
  on(event: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Remove event listener
   */
  off(event: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Add one-time event listener
   */
  once(event: string, handler: EventHandler): void {
    const onceHandler = (data?: unknown) => {
      handler(data);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === 'connected';
  }

  /**
   * Get queued messages
   */
  getQueuedMessages(): WebSocketMessage[] {
    return this.messageQueue.map(item => item.message);
  }

  /**
   * Clear message queue
   */
  clearQueue(): void {
    this.messageQueue = [];
    this.emit('queue-cleared');
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    state: ConnectionState;
    reconnectAttempts: number;
    queuedMessages: number;
    pendingAcks: number;
    lastHeartbeat: number;
  } {
    return {
      state: this.state,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      pendingAcks: this.pendingAcks.size,
      lastHeartbeat: this.lastHeartbeatTime,
    };
  }

  // Private methods

  /**
   * Handle WebSocket open event
   */
  private handleOpen(event: Event): void {
    this.clearConnectionTimer();
    this.setState('connected');
    this.reconnectAttempts = 0;
    this.isReconnecting = false;
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Process queued messages
    this.processMessageQueue();
    
    this.emit('connected', event);
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    this.clearTimers();
    this.setState('disconnected');
    
    // Clear pending acknowledgments
    this.clearPendingAcks();
    
    this.emit('disconnected', event);
    
    // Attempt reconnection if enabled and not manually closed
    if (this.config.autoReconnect && event.code !== 1000 && !this.isReconnecting) {
      this.attemptReconnection();
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    this.setState('error');
    this.emit('error', event);
  }

  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      // Handle heartbeat response
      if (message.type === 'heartbeat') {
        this.handleHeartbeatResponse(message);
        return;
      }
      
      // Handle acknowledgment
      if (message.type === 'message-ack' as WebSocketMessageType) {
        this.handleAcknowledgment(message);
        return;
      }
      
      this.emit('message', message);
      this.emit(message.type, message);
      
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      this.emit('error', new Error('Invalid message format'));
    }
  }

  /**
   * Handle connection timeout
   */
  private handleConnectionTimeout(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState('error');
    this.emit('connection-timeout');
  }

  /**
   * Handle heartbeat response
   */
  private handleHeartbeatResponse(message: WebSocketMessage): void {
    this.lastHeartbeatTime = Date.now();
    this.clearHeartbeatTimeout();
    this.emit('heartbeat-received', message);
  }

  /**
   * Handle message acknowledgment
   */
  private handleAcknowledgment(message: WebSocketMessage): void {
    // Type guard to check if payload has messageId property
    const isAckPayload = (payload: unknown): payload is { messageId: string } => {
      return typeof payload === 'object' && payload !== null && 'messageId' in payload;
    };
    
    if (isAckPayload(message.payload)) {
      const messageId = message.payload.messageId;
      
      if (messageId && this.pendingAcks.has(messageId)) {
        const pending = this.pendingAcks.get(messageId)!;
        clearTimeout(pending.timeout);
        pending.resolve(true);
        this.pendingAcks.delete(messageId);
      }
    }
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }

  /**
   * Send heartbeat message
   */
  private sendHeartbeat(): void {
    if (this.state === 'connected' && this.ws) {
      const heartbeat: WebSocketMessage = {
        type: 'heartbeat',
        payload: { timestamp: Date.now() },
        timestamp: Date.now(),
        sessionId: 'heartbeat',
        id: this.generateId(),
      };
      
      try {
        this.ws.send(JSON.stringify(heartbeat));
        this.emit('heartbeat-sent', heartbeat);
        
        // Set heartbeat timeout
        this.heartbeatTimeoutTimer = setTimeout(() => {
          this.handleHeartbeatTimeout();
        }, this.config.heartbeatTimeout);
        
      } catch (error) {
        console.error('Failed to send heartbeat:', error);
      }
    }
  }

  /**
   * Handle heartbeat timeout
   */
  private handleHeartbeatTimeout(): void {
    console.warn('Heartbeat timeout - connection may be lost');
    this.emit('connection-lost');
    
    // Force reconnection
    if (this.config.autoReconnect) {
      this.disconnect();
      this.attemptReconnection();
    }
  }

  /**
   * Clear heartbeat timeout
   */
  private clearHeartbeatTimeout(): void {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private attemptReconnection(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.emit('max-reconnect-attempts-reached');
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;
    
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(this.config.backoffMultiplier, this.reconnectAttempts - 1),
      this.config.maxReconnectDelay
    );
    
    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
        this.emit('reconnected');
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.attemptReconnection();
      }
    }, delay);
  }

  /**
   * Queue message for later sending
   */
  private queueMessage(message: WebSocketMessage): void {
    if (this.messageQueue.length >= this.config.maxQueueSize) {
      // Remove oldest message
      this.messageQueue.shift();
    }
    
    this.messageQueue.push({
      message,
      retries: 0,
      timestamp: Date.now(),
    });
    
    this.emit('message-queued', message);
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    const queue = [...this.messageQueue];
    this.messageQueue = [];
    
    for (const item of queue) {
      this.send(item.message).catch(error => {
        console.error('Failed to send queued message:', error);
        
        // Re-queue with retry limit
        if (item.retries < 3) {
          this.messageQueue.push({
            ...item,
            retries: item.retries + 1,
          });
        }
      });
    }
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    this.clearConnectionTimer();
    this.clearHeartbeatTimer();
    this.clearHeartbeatTimeout();
    this.clearReconnectTimer();
  }

  /**
   * Clear connection timer
   */
  private clearConnectionTimer(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  /**
   * Clear heartbeat timer
   */
  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Clear reconnect timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Clear pending acknowledgments
   */
  private clearPendingAcks(): void {
    for (const pending of this.pendingAcks.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    }
    this.pendingAcks.clear();
  }

  /**
   * Set connection state
   */
  private setState(state: ConnectionState): void {
    const previousState = this.state;
    this.state = state;
    
    if (previousState !== state) {
      this.emit('state-change', { from: previousState, to: state });
    }
  }

  /**
   * Emit event to handlers
   */
  private emit(event: string, data?: unknown): void {
    const handlers = this.eventHandlers.get(event) || [];
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    }
  }

  /**
   * Validate message format
   */
  private isValidMessage(message: WebSocketMessage): boolean {
    return !!(
      message &&
      typeof message === 'object' &&
      message.type &&
      message.timestamp &&
      message.sessionId &&
      message.id
    );
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Create a WebSocket service instance
 */
export function createWebSocketService(config: WebSocketConfig): WebSocketService {
  return new WebSocketService(config);
}

/**
 * Create a WebSocket service with network awareness
 * Note: Network monitoring should be handled at the component level using React hooks
 */
export function createNetworkAwareWebSocketService(config: WebSocketConfig): WebSocketService {
  const service = new WebSocketService(config);
  
  // Network status monitoring should be implemented at the component level
  // using the useNetworkStatus hook to properly integrate with React lifecycle
  
  return service;
}