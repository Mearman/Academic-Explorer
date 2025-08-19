/**
 * WebSocket mock for testing collaboration features
 * Provides comprehensive mocking infrastructure for real-time communication testing
 */

import type { 
  WebSocketMessage, 
  WebSocketMessageType,
  CollaborationUser,
  UserPresence,
  Annotation,
  Comment,
  Operation 
} from '@/types/collaboration';

/**
 * Mock WebSocket implementation for testing
 */
export class MockWebSocket extends EventTarget {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  public readonly CONNECTING = 0;
  public readonly OPEN = 1;
  public readonly CLOSING = 2;
  public readonly CLOSED = 3;

  public readyState: number = MockWebSocket.CONNECTING;
  public url: string;
  public protocol: string = '';
  public bufferedAmount: number = 0;
  public extensions: string = '';

  private messageQueue: WebSocketMessage[] = [];
  private isConnected: boolean = false;
  private connectionDelay: number = 100;
  private shouldReconnect: boolean = true;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  // Event handlers
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  constructor(url: string, protocols?: string | string[]) {
    super();
    this.url = url;
    if (typeof protocols === 'string') {
      this.protocol = protocols;
    } else if (Array.isArray(protocols) && protocols.length > 0) {
      this.protocol = protocols[0];
    }

    // Simulate connection delay
    setTimeout(() => {
      this.simulateConnection();
    }, this.connectionDelay);
  }

  /**
   * Send a message through the mock WebSocket
   */
  public send(data: string | ArrayBuffer | Blob): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }

    try {
      const message: WebSocketMessage = JSON.parse(data as string);
      this.handleOutgoingMessage(message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      this.simulateError('Invalid message format');
    }
  }

  /**
   * Close the WebSocket connection
   */
  public close(code?: number, reason?: string): void {
    if (this.readyState === MockWebSocket.CLOSING || this.readyState === MockWebSocket.CLOSED) {
      return;
    }

    this.readyState = MockWebSocket.CLOSING;
    
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      this.isConnected = false;
      
      const closeEvent = new CloseEvent('close', {
        code: code || 1000,
        reason: reason || 'Normal closure',
        wasClean: true,
      });
      
      this.onclose?.(closeEvent);
      this.dispatchEvent(closeEvent);
    }, 50);
  }

  /**
   * Simulate connection establishment
   */
  private simulateConnection(): void {
    this.readyState = MockWebSocket.OPEN;
    this.isConnected = true;
    this.reconnectAttempts = 0;

    const openEvent = new Event('open');
    this.onopen?.(openEvent);
    this.dispatchEvent(openEvent);

    // Process any queued messages
    this.processMessageQueue();
  }

  /**
   * Simulate connection error
   */
  private simulateError(message: string): void {
    const errorEvent = new Event('error');
    this.onerror?.(errorEvent);
    this.dispatchEvent(errorEvent);
    
    if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.attemptReconnection();
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnection(): void {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    setTimeout(() => {
      if (this.shouldReconnect) {
        this.readyState = MockWebSocket.CONNECTING;
        setTimeout(() => this.simulateConnection(), this.connectionDelay);
      }
    }, delay);
  }

  /**
   * Handle outgoing messages and generate appropriate responses
   */
  private handleOutgoingMessage(message: WebSocketMessage): void {
    // Simulate server processing delay
    setTimeout(() => {
      this.generateResponse(message);
    }, 10);
  }

  /**
   * Generate appropriate responses based on message type
   */
  private generateResponse(message: WebSocketMessage): void {
    switch (message.type) {
      case 'join-session':
        this.handleJoinSession(message);
        break;
      case 'leave-session':
        this.handleLeaveSession(message);
        break;
      case 'user-presence':
        this.handleUserPresence(message);
        break;
      case 'cursor-update':
        this.handleCursorUpdate(message);
        break;
      case 'annotation-create':
        this.handleAnnotationCreate(message);
        break;
      case 'comment-create':
        this.handleCommentCreate(message);
        break;
      case 'operation-apply':
        this.handleOperationApply(message);
        break;
      case 'heartbeat':
        this.handleHeartbeat(message);
        break;
      default:
        console.warn('Unhandled message type:', message.type);
    }
  }

  /**
   * Handle join session requests
   */
  private handleJoinSession(message: WebSocketMessage): void {
    const user = message.payload as CollaborationUser;
    
    // Send confirmation
    this.sendIncomingMessage({
      type: 'join-session',
      payload: {
        success: true,
        sessionId: message.sessionId,
        user,
      },
      timestamp: Date.now(),
      userId: message.userId,
      sessionId: message.sessionId,
      id: this.generateMessageId(),
    });

    // Broadcast to other users
    this.broadcastUserJoined(user, message.sessionId);
  }

  /**
   * Handle leave session requests
   */
  private handleLeaveSession(message: WebSocketMessage): void {
    // Send confirmation
    this.sendIncomingMessage({
      type: 'leave-session',
      payload: {
        success: true,
        sessionId: message.sessionId,
      },
      timestamp: Date.now(),
      userId: message.userId,
      sessionId: message.sessionId,
      id: this.generateMessageId(),
    });

    // Broadcast to other users
    this.broadcastUserLeft(message.userId!, message.sessionId);
  }

  /**
   * Handle user presence updates
   */
  private handleUserPresence(message: WebSocketMessage): void {
    const presence = message.payload as UserPresence;
    
    // Broadcast presence update to other users
    this.sendIncomingMessage({
      type: 'user-presence',
      payload: presence,
      timestamp: Date.now(),
      userId: message.userId,
      sessionId: message.sessionId,
      id: this.generateMessageId(),
    });
  }

  /**
   * Handle cursor updates
   */
  private handleCursorUpdate(message: WebSocketMessage): void {
    // Broadcast cursor update to other users
    this.sendIncomingMessage({
      type: 'cursor-update',
      payload: message.payload,
      timestamp: Date.now(),
      userId: message.userId,
      sessionId: message.sessionId,
      id: this.generateMessageId(),
    });
  }

  /**
   * Handle annotation creation
   */
  private handleAnnotationCreate(message: WebSocketMessage): void {
    const annotation = message.payload as Annotation;
    
    // Generate annotation ID and timestamps
    const createdAnnotation: Annotation = {
      ...annotation,
      id: this.generateId(),
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };

    // Send confirmation to sender
    this.sendIncomingMessage({
      type: 'annotation-create',
      payload: {
        success: true,
        annotation: createdAnnotation,
      },
      timestamp: Date.now(),
      userId: message.userId,
      sessionId: message.sessionId,
      id: this.generateMessageId(),
    });

    // Broadcast to other users
    this.broadcastAnnotationCreated(createdAnnotation, message.sessionId, message.userId);
  }

  /**
   * Handle comment creation
   */
  private handleCommentCreate(message: WebSocketMessage): void {
    const comment = message.payload as Comment;
    
    // Generate comment ID and timestamps
    const createdComment: Comment = {
      ...comment,
      id: this.generateId(),
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };

    // Send confirmation to sender
    this.sendIncomingMessage({
      type: 'comment-create',
      payload: {
        success: true,
        comment: createdComment,
      },
      timestamp: Date.now(),
      userId: message.userId,
      sessionId: message.sessionId,
      id: this.generateMessageId(),
    });

    // Broadcast to other users
    this.broadcastCommentCreated(createdComment, message.sessionId, message.userId);
  }

  /**
   * Handle operational transformation
   */
  private handleOperationApply(message: WebSocketMessage): void {
    const operation = message.payload as Operation;
    
    // Generate operation ID and timestamp
    const appliedOperation: Operation = {
      ...operation,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    // Broadcast operation to all users (including sender for confirmation)
    this.sendIncomingMessage({
      type: 'operation-apply',
      payload: appliedOperation,
      timestamp: Date.now(),
      userId: message.userId,
      sessionId: message.sessionId,
      id: this.generateMessageId(),
    });
  }

  /**
   * Handle heartbeat messages
   */
  private handleHeartbeat(message: WebSocketMessage): void {
    // Respond with heartbeat
    this.sendIncomingMessage({
      type: 'heartbeat',
      payload: { timestamp: Date.now() },
      timestamp: Date.now(),
      userId: message.userId,
      sessionId: message.sessionId,
      id: this.generateMessageId(),
    });
  }

  /**
   * Send incoming message to the client
   */
  private sendIncomingMessage(message: WebSocketMessage): void {
    if (!this.isConnected) {
      this.messageQueue.push(message);
      return;
    }

    const messageEvent = new MessageEvent('message', {
      data: JSON.stringify(message),
    });

    this.onmessage?.(messageEvent);
    this.dispatchEvent(messageEvent);
  }

  /**
   * Process queued messages when connection is established
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendIncomingMessage(message);
      }
    }
  }

  /**
   * Broadcast user joined event
   */
  private broadcastUserJoined(user: CollaborationUser, sessionId: string): void {
    setTimeout(() => {
      this.sendIncomingMessage({
        type: 'user-presence',
        payload: {
          type: 'user-joined',
          user,
        },
        timestamp: Date.now(),
        sessionId,
        id: this.generateMessageId(),
      });
    }, 50);
  }

  /**
   * Broadcast user left event
   */
  private broadcastUserLeft(userId: string, sessionId: string): void {
    setTimeout(() => {
      this.sendIncomingMessage({
        type: 'user-presence',
        payload: {
          type: 'user-left',
          userId,
        },
        timestamp: Date.now(),
        sessionId,
        id: this.generateMessageId(),
      });
    }, 50);
  }

  /**
   * Broadcast annotation created event
   */
  private broadcastAnnotationCreated(
    annotation: Annotation, 
    sessionId: string, 
    senderId?: string
  ): void {
    setTimeout(() => {
      this.sendIncomingMessage({
        type: 'annotation-create',
        payload: annotation,
        timestamp: Date.now(),
        userId: senderId,
        sessionId,
        id: this.generateMessageId(),
      });
    }, 25);
  }

  /**
   * Broadcast comment created event
   */
  private broadcastCommentCreated(
    comment: Comment, 
    sessionId: string, 
    senderId?: string
  ): void {
    setTimeout(() => {
      this.sendIncomingMessage({
        type: 'comment-create',
        payload: comment,
        timestamp: Date.now(),
        userId: senderId,
        sessionId,
        id: this.generateMessageId(),
      });
    }, 25);
  }

  /**
   * Generate unique IDs
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique message IDs
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Test-specific methods for controlling mock behaviour

  /**
   * Simulate network disconnection
   */
  public simulateDisconnection(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.isConnected = false;
    
    const closeEvent = new CloseEvent('close', {
      code: 1006,
      reason: 'Connection lost',
      wasClean: false,
    });
    
    this.onclose?.(closeEvent);
    this.dispatchEvent(closeEvent);
  }

  /**
   * Simulate network reconnection
   */
  public simulateReconnection(): void {
    if (this.readyState === MockWebSocket.CLOSED) {
      this.readyState = MockWebSocket.CONNECTING;
      setTimeout(() => this.simulateConnection(), this.connectionDelay);
    }
  }

  /**
   * Set connection delay for testing
   */
  public setConnectionDelay(delay: number): void {
    this.connectionDelay = delay;
  }

  /**
   * Set whether to auto-reconnect
   */
  public setShouldReconnect(should: boolean): void {
    this.shouldReconnect = should;
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): {
    readyState: number;
    isConnected: boolean;
    reconnectAttempts: number;
  } {
    return {
      readyState: this.readyState,
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Force an error for testing
   */
  public forceError(message: string = 'Simulated error'): void {
    this.simulateError(message);
  }
}

/**
 * Mock WebSocket factory for testing
 */
export class MockWebSocketFactory {
  private instances: MockWebSocket[] = [];
  private shouldFailConnection: boolean = false;
  private defaultConnectionDelay: number = 100;

  /**
   * Create a new mock WebSocket instance
   */
  public create(url: string, protocols?: string | string[]): MockWebSocket {
    if (this.shouldFailConnection) {
      const failedSocket = new MockWebSocket(url, protocols);
      setTimeout(() => failedSocket.forceError('Connection failed'), 10);
      return failedSocket;
    }

    const socket = new MockWebSocket(url, protocols);
    socket.setConnectionDelay(this.defaultConnectionDelay);
    this.instances.push(socket);
    return socket;
  }

  /**
   * Get all created instances
   */
  public getInstances(): MockWebSocket[] {
    return [...this.instances];
  }

  /**
   * Get the last created instance
   */
  public getLastInstance(): MockWebSocket | null {
    return this.instances[this.instances.length - 1] || null;
  }

  /**
   * Set whether connections should fail
   */
  public setShouldFailConnection(should: boolean): void {
    this.shouldFailConnection = should;
  }

  /**
   * Set default connection delay
   */
  public setDefaultConnectionDelay(delay: number): void {
    this.defaultConnectionDelay = delay;
  }

  /**
   * Reset factory state
   */
  public reset(): void {
    this.instances.forEach(socket => socket.close());
    this.instances = [];
    this.shouldFailConnection = false;
    this.defaultConnectionDelay = 100;
  }

  /**
   * Simulate network failure for all instances
   */
  public simulateNetworkFailure(): void {
    this.instances.forEach(socket => socket.simulateDisconnection());
  }

  /**
   * Simulate network recovery for all instances
   */
  public simulateNetworkRecovery(): void {
    this.instances.forEach(socket => socket.simulateReconnection());
  }
}

// Export singleton factory instance
export const mockWebSocketFactory = new MockWebSocketFactory();

/**
 * Setup global WebSocket mock
 */
export function setupWebSocketMock(): void {
  (globalThis as any).WebSocket = MockWebSocket;
}

/**
 * Cleanup WebSocket mock
 */
export function cleanupWebSocketMock(): void {
  mockWebSocketFactory.reset();
  delete (globalThis as any).WebSocket;
}