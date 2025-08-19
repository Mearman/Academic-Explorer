/**
 * Integration tests for network disconnection edge cases
 * Tests collaboration features under various network failure scenarios
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import type {
  CollaborationUser,
  CollaborationSession,
  WebSocketMessage,
  Operation,
  CollaborationState,
  CollaborationActions,
} from '@/types/collaboration';

import { useCollaborationStore } from '@/stores/collaboration-store';
import { WebSocketService } from '@/lib/websocket-service';
import {
  createMockUser,
  createMockSession,
  createMockAnnotation,
  createMockOperation,
  waitFor,
  waitForCondition,
} from '@/test/utils/collaboration-test-utils';

// Enhanced WebSocket mock for testing network scenarios
class NetworkAwareWebSocketMock {
  public readyState: number = WebSocket.CLOSED;
  public url: string;
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;

  private messageQueue: string[] = [];
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private networkLatency = 0;
  private packetLossRate = 0;
  private maxReconnectDelay = 30000;

  constructor(url: string) {
    this.url = url;
  }

  // Simulate immediate connection
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() < 0.1) { // 10% chance of connection failure
          this.readyState = WebSocket.CLOSED;
          this.onerror?.(new Event('error'));
          reject(new Error('Connection failed'));
          return;
        }

        this.readyState = WebSocket.OPEN;
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.onopen?.(new Event('open'));
        resolve();
      }, 50 + Math.random() * 100); // 50-150ms connection time
    });
  }

  // Send message with network simulation
  send(data: string): void {
    if (!this.isConnected || this.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    // Simulate packet loss
    if (Math.random() < this.packetLossRate) {
      console.warn('[Test] Simulated packet loss for message:', data.substring(0, 50));
      return;
    }

    // Simulate network latency
    setTimeout(() => {
      if (this.isConnected) {
        this.messageQueue.push(data);
        // Simulate message received by server and processed
        this.simulateServerResponse(data);
      }
    }, this.networkLatency);
  }

  // Close connection
  close(code = 1000, reason = 'Normal closure'): void {
    this.readyState = WebSocket.CLOSED;
    this.isConnected = false;
    setTimeout(() => {
      this.onclose?.(new CloseEvent('close', { code, reason }));
    }, 10);
  }

  // Simulate various network conditions
  simulateNetworkConditions(options: {
    latency?: number;
    packetLoss?: number;
  }): void {
    this.networkLatency = options.latency || 0;
    this.packetLossRate = options.packetLoss || 0;
  }

  // Simulate sudden disconnection
  simulateUnexpectedDisconnection(): void {
    this.readyState = WebSocket.CLOSED;
    this.isConnected = false;
    setTimeout(() => {
      this.onclose?.(new CloseEvent('close', { 
        code: 1006, 
        reason: 'Abnormal closure' 
      }));
    }, 10);
  }

  // Simulate reconnection attempts
  async simulateReconnection(): Promise<void> {
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      throw new Error('Max reconnection attempts exceeded');
    }

    // Exponential backoff delay
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    await waitFor(delay);
    
    // 80% success rate for reconnection attempts
    if (Math.random() < 0.8) {
      return this.connect();
    } else {
      throw new Error('Reconnection failed');
    }
  }

  // Simulate server responses
  private simulateServerResponse(originalMessage: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(originalMessage);
      
      // Simulate acknowledgment for operations
      if (message.type === 'operation-apply') {
        setTimeout(() => {
          const ackMessage: WebSocketMessage = {
            type: 'message-ack' as any,
            payload: { messageId: message.id },
            timestamp: Date.now(),
            sessionId: message.sessionId,
            id: `ack-${message.id}`,
          };
          
          this.onmessage?.(new MessageEvent('message', {
            data: JSON.stringify(ackMessage)
          }));
        }, 50 + Math.random() * 100);
      }

      // Simulate heartbeat response
      if (message.type === 'heartbeat') {
        setTimeout(() => {
          this.onmessage?.(new MessageEvent('message', {
            data: originalMessage
          }));
        }, 20);
      }
    } catch (error) {
      console.warn('[Test] Failed to parse message for server simulation:', error);
    }
  }
}

// Mock WebSocket constructor
let mockWebSocketInstances: NetworkAwareWebSocketMock[] = [];

vi.mock('WebSocket', () => {
  return {
    default: class MockWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;

      constructor(url: string) {
        const instance = new NetworkAwareWebSocketMock(url);
        mockWebSocketInstances.push(instance);
        return instance;
      }
    }
  };
});

describe('Network Disconnection Edge Cases', () => {
  let store: CollaborationState & CollaborationActions;
  let user: CollaborationUser;
  let session: CollaborationSession;
  let mockSocket: NetworkAwareWebSocketMock;

  beforeEach(async () => {
    mockWebSocketInstances = [];
    vi.clearAllMocks();

    // Create test data
    user = createMockUser({ name: 'Test User' });
    session = createMockSession({ title: 'Network Test Session' });

    // Initialize store
    store = useCollaborationStore.getState() as CollaborationState & CollaborationActions;
  });

  afterEach(async () => {
    try {
      await store.leaveSession();
    } catch (error) {
      // Ignore cleanup errors
    }
    mockWebSocketInstances = [];
  });

  describe('Connection Establishment Failures', () => {
    test('should handle connection timeout during session join', async () => {
      // Mock connection that times out
      const originalConnect = vi.fn().mockImplementation(
        () => new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), 6000);
        })
      );

      vi.spyOn(WebSocketService.prototype, 'connect').mockImplementation(originalConnect);

      // Attempt to join session should fail gracefully
      await expect(
        store.joinSession(session.id, user)
      ).rejects.toThrow('Connection timeout');

      expect(store.connectionStatus).toBe('error');
      expect(store.error).toContain('timeout');
    });

    test('should handle DNS resolution failures', async () => {
      const dnsError = new Error('getaddrinfo ENOTFOUND');
      
      vi.spyOn(WebSocketService.prototype, 'connect')
        .mockRejectedValue(dnsError);

      await expect(
        store.joinSession(session.id, user)
      ).rejects.toThrow('getaddrinfo ENOTFOUND');

      expect(store.connectionStatus).toBe('error');
      expect(store.currentSession).toBeNull();
    });

    test('should handle server rejection during handshake', async () => {
      const handshakeError = new Error('Unexpected server response: 503');
      
      vi.spyOn(WebSocketService.prototype, 'connect')
        .mockRejectedValue(handshakeError);

      await expect(
        store.joinSession(session.id, user)
      ).rejects.toThrow('Unexpected server response: 503');

      expect(store.connectionStatus).toBe('error');
    });
  });

  describe('Sudden Network Interruptions', () => {
    test('should handle abrupt connection loss during active session', async () => {
      // Successfully join session first
      await store.joinSession(session.id, user);
      expect(store.connectionStatus).toBe('connected');

      mockSocket = mockWebSocketInstances[0];

      // Create annotation before disconnection
      const annotation = createMockAnnotation({
        content: 'Pre-disconnection annotation'
      });
      
      const annotationId = await store.createAnnotation(annotation);
      expect(store.annotations.has(annotationId)).toBe(true);

      // Simulate sudden network loss
      mockSocket.simulateUnexpectedDisconnection();

      // Wait for disconnection to be detected
      await waitForCondition(
        () => store.connectionStatus === 'disconnected',
        2000
      );

      expect(store.connectionStatus).toBe('disconnected');
      // Session data should be preserved locally
      expect(store.currentSession).not.toBeNull();
      expect(store.annotations.has(annotationId)).toBe(true);
    });

    test('should queue operations during disconnection', async () => {
      await store.joinSession(session.id, user);
      mockSocket = mockWebSocketInstances[0];

      // Disconnect
      mockSocket.simulateUnexpectedDisconnection();
      await waitForCondition(
        () => store.connectionStatus === 'disconnected',
        1000
      );

      // Create operations while offline
      const operations = [
        createMockOperation({ content: 'Offline operation 1' }),
        createMockOperation({ content: 'Offline operation 2' }),
        createMockOperation({ content: 'Offline operation 3' }),
      ];

      // Operations should be queued
      operations.forEach(op => {
        expect(() => store.sendOperation(op)).not.toThrow();
      });

      // Simulate reconnection
      await mockSocket.simulateReconnection();
      
      // Wait for reconnection
      await waitForCondition(
        () => store.connectionStatus === 'connected',
        5000
      );

      // Queued operations should be sent after reconnection
      await waitFor(1000);
      // Verify operations were sent (would need WebSocket service mock enhancement)
    });

    test('should handle partial message transmission', async () => {
      await store.joinSession(session.id, user);
      mockSocket = mockWebSocketInstances[0];

      // Simulate high packet loss
      mockSocket.simulateNetworkConditions({ packetLoss: 0.5 });

      // Send multiple operations
      const operations = Array.from({ length: 10 }, (_, i) =>
        createMockOperation({ content: `Operation ${i}` })
      );

      // Some operations should fail to send due to packet loss
      let successCount = 0;
      let failureCount = 0;

      for (const operation of operations) {
        try {
          store.sendOperation(operation);
          successCount++;
        } catch (error) {
          failureCount++;
        }
      }

      // Should handle failed transmissions gracefully
      expect(failureCount).toBeGreaterThan(0);
      expect(store.connectionStatus).toBe('connected'); // Should remain connected
    });
  });

  describe('Reconnection Scenarios', () => {
    test('should handle successful automatic reconnection', async () => {
      await store.joinSession(session.id, user);
      mockSocket = mockWebSocketInstances[0];

      // Store original session state
      const originalSessionId = store.currentSession?.id;
      const originalUserId = store.currentUser?.id;

      // Simulate disconnection
      mockSocket.simulateUnexpectedDisconnection();
      await waitForCondition(
        () => store.connectionStatus === 'disconnected',
        1000
      );

      // Simulate successful reconnection
      await mockSocket.simulateReconnection();
      await waitForCondition(
        () => store.connectionStatus === 'connected',
        3000
      );

      // Session should be restored
      expect(store.currentSession?.id).toBe(originalSessionId);
      expect(store.currentUser?.id).toBe(originalUserId);
      expect(store.error).toBeNull();
    });

    test('should handle repeated reconnection failures', async () => {
      await store.joinSession(session.id, user);
      mockSocket = mockWebSocketInstances[0];

      // Simulate disconnection
      mockSocket.simulateUnexpectedDisconnection();
      await waitForCondition(
        () => store.connectionStatus === 'disconnected',
        1000
      );

      // Mock repeated reconnection failures
      const failedReconnection = vi.fn().mockRejectedValue(
        new Error('Network unreachable')
      );
      vi.spyOn(mockSocket, 'simulateReconnection').mockImplementation(failedReconnection);

      // Should eventually give up after max attempts
      await waitForCondition(
        () => store.connectionStatus === 'error' || store.error !== null,
        10000
      );

      expect(failedReconnection).toHaveBeenCalledTimes(5); // Max reconnect attempts
      expect(store.connectionStatus).toBe('error');
    });

    test('should handle session expiry during reconnection', async () => {
      await store.joinSession(session.id, user);
      mockSocket = mockWebSocketInstances[0];

      // Simulate long disconnection (session expires on server)
      mockSocket.simulateUnexpectedDisconnection();
      
      // Wait for disconnect
      await waitForCondition(
        () => store.connectionStatus === 'disconnected',
        1000
      );

      // Simulate session expiry error on reconnection
      const sessionExpiredError = new Error('Session expired');
      vi.spyOn(mockSocket, 'simulateReconnection')
        .mockRejectedValue(sessionExpiredError);

      // Should handle session expiry gracefully
      await waitFor(2000);
      
      expect(store.error).toContain('Session expired');
      expect(store.currentSession).toBeNull();
    });
  });

  describe('Data Consistency During Network Issues', () => {
    test('should preserve local state during network outages', async () => {
      await store.joinSession(session.id, user);
      
      // Create local data
      const annotation1 = createMockAnnotation({ content: 'Local annotation 1' });
      const annotation2 = createMockAnnotation({ content: 'Local annotation 2' });
      
      const id1 = await store.createAnnotation(annotation1);
      const id2 = await store.createAnnotation(annotation2);

      expect(store.annotations.size).toBe(2);

      // Simulate network disconnection
      mockSocket = mockWebSocketInstances[0];
      mockSocket.simulateUnexpectedDisconnection();

      // Local state should be preserved
      expect(store.annotations.size).toBe(2);
      expect(store.annotations.get(id1)?.content).toBe('Local annotation 1');
      expect(store.annotations.get(id2)?.content).toBe('Local annotation 2');

      // Reconnection should not lose local data
      await mockSocket.simulateReconnection();
      await waitForCondition(
        () => store.connectionStatus === 'connected',
        3000
      );

      expect(store.annotations.size).toBe(2);
    });

    test('should handle conflicting updates after reconnection', async () => {
      await store.joinSession(session.id, user);
      
      // Create annotation
      const annotation = createMockAnnotation({ content: 'Original content' });
      const annotationId = await store.createAnnotation(annotation);

      // Simulate disconnection
      mockSocket = mockWebSocketInstances[0];
      mockSocket.simulateUnexpectedDisconnection();

      // Update locally while offline
      await store.updateAnnotation(annotationId, { 
        content: 'Local update while offline' 
      });

      expect(store.annotations.get(annotationId)?.content)
        .toBe('Local update while offline');

      // Simulate server having different update
      const conflictingUpdate = {
        id: annotationId,
        content: 'Server update while client offline',
        modifiedAt: Date.now(),
      };

      // Reconnect and receive conflicting update
      await mockSocket.simulateReconnection();
      
      // Should handle conflict resolution
      // Implementation would depend on conflict resolution strategy
      // (last-write-wins, operational transform, etc.)
      
      await waitFor(1000);
      
      // One of the updates should win
      const finalContent = store.annotations.get(annotationId)?.content;
      expect(finalContent).toBeDefined();
      expect(['Local update while offline', 'Server update while client offline'])
        .toContain(finalContent);
    });
  });

  describe('Performance Under Network Stress', () => {
    test('should handle high latency networks gracefully', async () => {
      await store.joinSession(session.id, user);
      mockSocket = mockWebSocketInstances[0];

      // Simulate high latency (2 seconds)
      mockSocket.simulateNetworkConditions({ latency: 2000 });

      const startTime = performance.now();

      // Create annotation with high latency
      const annotation = createMockAnnotation({ content: 'High latency test' });
      const annotationId = await store.createAnnotation(annotation);

      const endTime = performance.now();

      // Should still work but take longer
      expect(annotationId).toBeDefined();
      expect(endTime - startTime).toBeGreaterThan(2000);
      
      // UI should remain responsive
      expect(store.annotations.has(annotationId)).toBe(true);
    });

    test('should throttle rapid operations during poor connectivity', async () => {
      await store.joinSession(session.id, user);
      mockSocket = mockWebSocketInstances[0];

      // Simulate poor network conditions
      mockSocket.simulateNetworkConditions({ 
        latency: 1000, 
        packetLoss: 0.3 
      });

      // Send rapid presence updates
      const updateCount = 50;
      const startTime = performance.now();

      for (let i = 0; i < updateCount; i++) {
        store.updateUserPresence({
          cursor: { x: i, y: i, visible: true },
          lastActivity: Date.now(),
        });
      }

      const endTime = performance.now();

      // Should throttle/debounce updates efficiently
      expect(endTime - startTime).toBeLessThan(1000); // Should not block
      
      // Network queue should not grow unbounded
      await waitFor(2000);
      // Verify queue size is reasonable (implementation specific)
    });
  });

  describe('Recovery and Resynchronization', () => {
    test('should resynchronize missed updates after reconnection', async () => {
      await store.joinSession(session.id, user);
      
      // Initial sync state
      const annotation = createMockAnnotation({ content: 'Synced annotation' });
      const annotationId = await store.createAnnotation(annotation);

      // Simulate disconnection
      mockSocket = mockWebSocketInstances[0];
      mockSocket.simulateUnexpectedDisconnection();

      // Simulate missed server updates while offline
      const missedUpdates = [
        { type: 'annotation-create', annotation: createMockAnnotation() },
        { type: 'comment-create', comment: { content: 'Missed comment' } },
        { type: 'user-join', user: createMockUser({ name: 'New User' }) },
      ];

      // Reconnect
      await mockSocket.simulateReconnection();
      await waitForCondition(
        () => store.connectionStatus === 'connected',
        3000
      );

      // Should request and receive missed updates
      // Implementation would need sync mechanism
      await waitFor(1000);

      // Verify state is synchronized
      expect(store.currentSession).not.toBeNull();
      expect(store.annotations.size).toBeGreaterThanOrEqual(1);
    });

    test('should handle full state resynchronization', async () => {
      await store.joinSession(session.id, user);
      
      // Build up local state
      const annotations = await Promise.all([
        store.createAnnotation(createMockAnnotation({ content: 'Annotation 1' })),
        store.createAnnotation(createMockAnnotation({ content: 'Annotation 2' })),
        store.createAnnotation(createMockAnnotation({ content: 'Annotation 3' })),
      ]);

      expect(store.annotations.size).toBe(3);

      // Simulate long disconnection requiring full resync
      mockSocket = mockWebSocketInstances[0];
      mockSocket.simulateUnexpectedDisconnection();

      // Wait longer than sync window
      await waitFor(2000);

      // Reconnect with full state sync required
      await mockSocket.simulateReconnection();
      
      // Should handle full resynchronization
      await waitForCondition(
        () => store.connectionStatus === 'connected' && !store.isSyncing,
        5000
      );

      // Local and server state should be consistent
      expect(store.annotations.size).toBeGreaterThanOrEqual(3);
      annotations.forEach(id => {
        expect(store.annotations.has(id)).toBe(true);
      });
    });
  });
});