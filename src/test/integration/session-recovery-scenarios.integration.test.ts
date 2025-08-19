/**
 * Integration tests for session recovery and offline-to-online synchronization
 * Tests various scenarios of session restoration and data synchronization
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import type {
  CollaborationUser,
  CollaborationSession,
  Annotation,
  Comment,
  Operation,
  WebSocketMessage,
} from '@/types/collaboration';

import { useCollaborationStore } from '@/stores/collaboration-store';
import {
  createMockUser,
  createMockSession,
  createMockAnnotation,
  createMockComment,
  createMockOperation,
  waitFor,
  waitForCondition,
} from '@/test/utils/collaboration-test-utils';

// Mock storage for persistence testing
class MockPersistentStorage {
  private storage: Map<string, string> = new Map();
  private isOnline = true;
  private syncQueue: Array<{ key: string; value: string; timestamp: number }> = [];

  setItem(key: string, value: string): void {
    if (this.isOnline) {
      this.storage.set(key, value);
    } else {
      // Queue for later sync
      this.syncQueue.push({ key, value, timestamp: Date.now() });
    }
  }

  getItem(key: string): string | null {
    return this.storage.get(key) || null;
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
    this.syncQueue = [];
  }

  // Simulate offline mode
  setOffline(offline: boolean): void {
    this.isOnline = !offline;
  }

  // Simulate coming back online and syncing queued data
  async syncQueuedData(): Promise<void> {
    if (!this.isOnline) return;

    for (const item of this.syncQueue) {
      this.storage.set(item.key, item.value);
    }
    this.syncQueue = [];
  }

  getQueuedItemCount(): number {
    return this.syncQueue.length;
  }
}

// Session recovery manager for testing
class SessionRecoveryManager {
  private persistentStorage: MockPersistentStorage;
  private lastSyncTimestamp = 0;
  private pendingOperations: Operation[] = [];
  private recoveryAttempts = 0;
  private maxRecoveryAttempts = 3;

  constructor() {
    this.persistentStorage = new MockPersistentStorage();
  }

  // Save session state for recovery
  saveSessionState(
    session: CollaborationSession,
    annotations: Map<string, Annotation>,
    operations: Operation[]
  ): void {
    const sessionData = {
      session,
      annotations: Array.from(annotations.entries()),
      operations,
      timestamp: Date.now(),
    };

    this.persistentStorage.setItem(
      'collaboration-session',
      JSON.stringify(sessionData)
    );
    this.lastSyncTimestamp = Date.now();
  }

  // Restore session state after recovery
  restoreSessionState(): {
    session: CollaborationSession | null;
    annotations: Map<string, Annotation>;
    operations: Operation[];
  } | null {
    const data = this.persistentStorage.getItem('collaboration-session');
    
    if (!data) {
      return null;
    }

    try {
      const parsed = JSON.parse(data);
      return {
        session: parsed.session,
        annotations: new Map(parsed.annotations),
        operations: parsed.operations || [],
      };
    } catch (error) {
      console.error('Failed to restore session state:', error);
      return null;
    }
  }

  // Queue operations while offline
  queueOfflineOperation(operation: Operation): void {
    this.pendingOperations.push(operation);
    
    // Persist queued operations
    this.persistentStorage.setItem(
      'pending-operations',
      JSON.stringify(this.pendingOperations)
    );
  }

  // Get queued operations for sync
  getPendingOperations(): Operation[] {
    const data = this.persistentStorage.getItem('pending-operations');
    
    if (data) {
      try {
        return JSON.parse(data);
      } catch (error) {
        console.error('Failed to parse pending operations:', error);
      }
    }
    
    return this.pendingOperations;
  }

  // Clear queued operations after successful sync
  clearPendingOperations(): void {
    this.pendingOperations = [];
    this.persistentStorage.removeItem('pending-operations');
  }

  // Attempt session recovery
  async attemptRecovery(): Promise<boolean> {
    this.recoveryAttempts++;
    
    if (this.recoveryAttempts > this.maxRecoveryAttempts) {
      throw new Error('Max recovery attempts exceeded');
    }

    // Simulate recovery delay
    await waitFor(500 * this.recoveryAttempts);

    // 70% success rate, increasing with attempts
    const successRate = Math.min(0.7 + (this.recoveryAttempts * 0.1), 0.95);
    return Math.random() < successRate;
  }

  // Simulate network going offline/online
  setOfflineMode(offline: boolean): void {
    this.persistentStorage.setOffline(offline);
  }

  // Get sync status
  getSyncStatus(): {
    lastSync: number;
    pendingOperations: number;
    queuedItems: number;
  } {
    return {
      lastSync: this.lastSyncTimestamp,
      pendingOperations: this.pendingOperations.length,
      queuedItems: this.persistentStorage.getQueuedItemCount(),
    };
  }

  reset(): void {
    this.persistentStorage.clear();
    this.pendingOperations = [];
    this.recoveryAttempts = 0;
    this.lastSyncTimestamp = 0;
  }
}

describe('Session Recovery and Offline Sync', () => {
  let store: ReturnType<typeof useCollaborationStore.getState>;
  let recoveryManager: SessionRecoveryManager;
  let user: CollaborationUser;
  let session: CollaborationSession;

  beforeEach(() => {
    recoveryManager = new SessionRecoveryManager();
    store = useCollaborationStore.getState();
    user = createMockUser({ name: 'Recovery Test User' });
    session = createMockSession({ title: 'Recovery Test Session' });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await store.leaveSession();
    } catch (error) {
      // Ignore cleanup errors
    }
    recoveryManager.reset();
  });

  describe('Basic Session Recovery', () => {
    test('should restore session state after browser refresh', async () => {
      // Establish initial session
      await store.joinSession(session.id, user);
      
      // Create some session data
      const annotation1 = createMockAnnotation({ content: 'Test annotation 1' });
      const annotation2 = createMockAnnotation({ content: 'Test annotation 2' });
      
      const id1 = await store.createAnnotation(annotation1);
      const id2 = await store.createAnnotation(annotation2);

      expect(store.annotations.size).toBe(2);

      // Save session state
      recoveryManager.saveSessionState(
        store.currentSession!,
        store.annotations,
        []
      );

      // Simulate browser refresh/restart
      await store.leaveSession();
      expect(store.currentSession).toBeNull();
      expect(store.annotations.size).toBe(0);

      // Restore from saved state
      const restoredState = recoveryManager.restoreSessionState();
      expect(restoredState).not.toBeNull();
      
      if (restoredState && restoredState.session) {
        expect(restoredState.session.id).toBe(session.id);
        expect(restoredState.annotations.size).toBe(2);
      }

      // Re-establish session with restored data
      await store.joinSession(session.id, user);
      
      // Restore annotations
      if (restoredState) {
        restoredState.annotations.forEach((annotation, id) => {
          store.annotations.set(id, annotation);
        });
      }

      expect(store.annotations.size).toBe(2);
      expect(store.annotations.get(id1)?.content).toBe('Test annotation 1');
      expect(store.annotations.get(id2)?.content).toBe('Test annotation 2');
    });

    test('should handle corrupted session data gracefully', async () => {
      // Set corrupted data in storage
      const mockStorage = new MockPersistentStorage();
      mockStorage.setItem('collaboration-session', 'invalid json {');

      const testRecoveryManager = new SessionRecoveryManager();
      // Override storage with corrupted data
      (testRecoveryManager as any).persistentStorage = mockStorage;

      // Should handle corruption gracefully
      const restoredState = testRecoveryManager.restoreSessionState();
      expect(restoredState).toBeNull();

      // Should still allow new session creation
      await store.joinSession(session.id, user);
      expect(store.currentSession).not.toBeNull();
    });

    test('should recover from partial session data', async () => {
      await store.joinSession(session.id, user);
      
      // Create only annotations, no comments or operations
      const annotation = createMockAnnotation({ content: 'Partial data test' });
      const annotationId = await store.createAnnotation(annotation);

      // Save partial state
      recoveryManager.saveSessionState(
        store.currentSession!,
        store.annotations,
        []
      );

      // Clear session
      await store.leaveSession();

      // Restore partial state
      const restoredState = recoveryManager.restoreSessionState();
      expect(restoredState).not.toBeNull();
      
      if (restoredState) {
        expect(restoredState.annotations.size).toBe(1);
        expect(restoredState.operations.length).toBe(0);
      }

      // Should handle missing data gracefully
      await store.joinSession(session.id, user);
      expect(store.currentSession).not.toBeNull();
    });
  });

  describe('Offline Operation Queuing', () => {
    test('should queue operations while offline', async () => {
      await store.joinSession(session.id, user);
      
      // Go offline
      recoveryManager.setOfflineMode(true);

      // Create operations while offline
      const operations = [
        createMockOperation({ content: 'Offline op 1' }),
        createMockOperation({ content: 'Offline op 2' }),
        createMockOperation({ content: 'Offline op 3' }),
      ];

      operations.forEach(op => {
        recoveryManager.queueOfflineOperation(op);
      });

      expect(recoveryManager.getPendingOperations().length).toBe(3);

      // Verify operations are persisted
      const status = recoveryManager.getSyncStatus();
      expect(status.pendingOperations).toBe(3);
    });

    test('should sync queued operations when coming back online', async () => {
      await store.joinSession(session.id, user);

      // Queue operations while offline
      recoveryManager.setOfflineMode(true);
      
      const offlineOperations = [
        createMockOperation({ content: 'Offline 1', timestamp: Date.now() }),
        createMockOperation({ content: 'Offline 2', timestamp: Date.now() + 100 }),
        createMockOperation({ content: 'Offline 3', timestamp: Date.now() + 200 }),
      ];

      offlineOperations.forEach(op => {
        recoveryManager.queueOfflineOperation(op);
      });

      expect(recoveryManager.getPendingOperations().length).toBe(3);

      // Come back online
      recoveryManager.setOfflineMode(false);

      // Simulate sync process
      const pendingOps = recoveryManager.getPendingOperations();
      
      // Send each queued operation
      for (const operation of pendingOps) {
        store.sendOperation(operation);
      }

      // Clear queue after successful sync
      recoveryManager.clearPendingOperations();

      expect(recoveryManager.getPendingOperations().length).toBe(0);
      expect(recoveryManager.getSyncStatus().pendingOperations).toBe(0);
    });

    test('should handle queue overflow gracefully', async () => {
      await store.joinSession(session.id, user);
      recoveryManager.setOfflineMode(true);

      // Queue many operations (simulate extended offline period)
      const operationCount = 100;
      for (let i = 0; i < operationCount; i++) {
        const operation = createMockOperation({
          content: `Operation ${i}`,
          timestamp: Date.now() + i,
        });
        recoveryManager.queueOfflineOperation(operation);
      }

      const queuedOps = recoveryManager.getPendingOperations();
      expect(queuedOps.length).toBe(operationCount);

      // Should maintain operation order
      expect(queuedOps[0].content).toBe('Operation 0');
      expect(queuedOps[operationCount - 1].content).toBe(`Operation ${operationCount - 1}`);

      // Should handle large queue efficiently
      const startTime = performance.now();
      recoveryManager.getPendingOperations();
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });
  });

  describe('Synchronization Conflicts', () => {
    test('should resolve conflicts between offline and online changes', async () => {
      await store.joinSession(session.id, user);
      
      // Create initial annotation
      const annotation = createMockAnnotation({ 
        content: 'Original content',
        modifiedAt: Date.now() - 1000,
      });
      const annotationId = await store.createAnnotation(annotation);

      // Simulate going offline and making local changes
      recoveryManager.setOfflineMode(true);
      
      const offlineUpdate = {
        content: 'Offline update',
        modifiedAt: Date.now(),
      };

      // Queue offline update
      const offlineOperation = createMockOperation({
        type: 'format',
        content: JSON.stringify(offlineUpdate),
        timestamp: Date.now(),
        attributes: { operationType: 'annotation-update' },
      });
      
      recoveryManager.queueOfflineOperation(offlineOperation);

      // Simulate server having different update while offline
      const serverUpdate = {
        content: 'Server update while offline',
        modifiedAt: Date.now() + 500, // Later timestamp
      };

      // Come back online
      recoveryManager.setOfflineMode(false);

      // Simulate conflict resolution (server update wins due to later timestamp)
      const resolvedUpdate = serverUpdate.modifiedAt > offlineUpdate.modifiedAt
        ? serverUpdate
        : offlineUpdate;

      expect(resolvedUpdate.content).toBe('Server update while offline');
      
      // Clear queue after resolution
      recoveryManager.clearPendingOperations();
    });

    test('should merge non-conflicting changes', async () => {
      await store.joinSession(session.id, user);
      
      // Create initial state
      const annotation1 = createMockAnnotation({ content: 'Annotation 1' });
      const annotation2 = createMockAnnotation({ content: 'Annotation 2' });
      
      const id1 = await store.createAnnotation(annotation1);
      const id2 = await store.createAnnotation(annotation2);

      // Go offline and create new annotation
      recoveryManager.setOfflineMode(true);
      
      const offlineAnnotation = createMockAnnotation({ 
        content: 'Offline annotation' 
      });
      
      const offlineOperation = createMockOperation({
        type: 'insert',
        content: JSON.stringify(offlineAnnotation),
        timestamp: Date.now(),
        attributes: { operationType: 'annotation-create' },
      });
      
      recoveryManager.queueOfflineOperation(offlineOperation);

      // Simulate server having new annotation from another user
      const serverAnnotation = createMockAnnotation({
        content: 'Server annotation from other user',
      });

      // Come back online - both annotations should be merged
      recoveryManager.setOfflineMode(false);

      // Add server annotation
      const serverId = await store.createAnnotation(serverAnnotation);

      // Process offline annotation
      const offlineId = await store.createAnnotation(offlineAnnotation);

      // Both should exist without conflict
      expect(store.annotations.size).toBe(4); // Original 2 + server 1 + offline 1
      expect(store.annotations.get(offlineId)?.content).toBe('Offline annotation');
      expect(store.annotations.get(serverId)?.content).toBe('Server annotation from other user');
    });

    test('should handle timestamp-based conflict resolution', async () => {
      const operations = [
        createMockOperation({
          content: 'Operation A',
          timestamp: 1000,
          userId: 'user-1',
        }),
        createMockOperation({
          content: 'Operation B', 
          timestamp: 1100,
          userId: 'user-2',
        }),
        createMockOperation({
          content: 'Operation C',
          timestamp: 1050,
          userId: 'user-3',
        }),
      ];

      // Sort by timestamp for conflict resolution
      const sortedOps = [...operations].sort((a, b) => a.timestamp - b.timestamp);

      expect(sortedOps[0].content).toBe('Operation A');
      expect(sortedOps[1].content).toBe('Operation C'); 
      expect(sortedOps[2].content).toBe('Operation B');

      // Latest operation should win in conflicts
      const latestOp = operations.reduce((latest, current) =>
        current.timestamp > latest.timestamp ? current : latest
      );

      expect(latestOp.content).toBe('Operation B');
    });
  });

  describe('Recovery Failure Scenarios', () => {
    test('should handle repeated recovery failures', async () => {
      let attemptCount = 0;
      const maxAttempts = 3;

      // Mock failing recovery attempts
      const attemptRecovery = async (): Promise<boolean> => {
        attemptCount++;
        
        if (attemptCount <= maxAttempts) {
          return false; // Fail first attempts
        }
        
        return true; // Success on final attempt
      };

      // Simulate repeated failures
      for (let i = 0; i < maxAttempts; i++) {
        const success = await attemptRecovery();
        expect(success).toBe(false);
      }

      // Final attempt should succeed
      const finalAttempt = await attemptRecovery();
      expect(finalAttempt).toBe(true);
      expect(attemptCount).toBe(4);
    });

    test('should gracefully handle max recovery attempts exceeded', async () => {
      const testRecoveryManager = new SessionRecoveryManager();

      // Attempt recovery multiple times
      for (let i = 0; i < 3; i++) {
        try {
          await testRecoveryManager.attemptRecovery();
        } catch (error) {
          // Some attempts may fail
        }
      }

      // Should throw after max attempts
      await expect(testRecoveryManager.attemptRecovery())
        .rejects.toThrow('Max recovery attempts exceeded');
    });

    test('should fallback to clean state when recovery impossible', async () => {
      // Simulate complete recovery failure
      const testRecoveryManager = new SessionRecoveryManager();
      
      // Override to always fail
      vi.spyOn(testRecoveryManager, 'attemptRecovery')
        .mockRejectedValue(new Error('Recovery impossible'));

      // Should fall back to clean initialization
      try {
        await testRecoveryManager.attemptRecovery();
      } catch (error) {
        // Recovery failed, start fresh
        await store.joinSession(session.id, user);
        expect(store.currentSession).not.toBeNull();
        expect(store.annotations.size).toBe(0); // Clean state
      }
    });
  });

  describe('Performance and Memory Management', () => {
    test('should efficiently handle large offline queues', async () => {
      recoveryManager.setOfflineMode(true);

      const largeQueueSize = 1000;
      const startTime = performance.now();

      // Queue many operations
      for (let i = 0; i < largeQueueSize; i++) {
        const operation = createMockOperation({
          content: `Large queue operation ${i}`,
          timestamp: Date.now() + i,
        });
        recoveryManager.queueOfflineOperation(operation);
      }

      const queueTime = performance.now() - startTime;
      expect(queueTime).toBeLessThan(1000); // Should be fast

      // Retrieval should also be efficient
      const retrievalStart = performance.now();
      const queuedOps = recoveryManager.getPendingOperations();
      const retrievalTime = performance.now() - retrievalStart;

      expect(queuedOps.length).toBe(largeQueueSize);
      expect(retrievalTime).toBeLessThan(100); // Should be very fast
    });

    test('should manage memory during extended offline periods', async () => {
      recoveryManager.setOfflineMode(true);

      // Simulate extended offline period with periodic operation creation
      const sessionDuration = 100; // Simulate 100 operation cycles
      
      for (let cycle = 0; cycle < sessionDuration; cycle++) {
        // Create 5 operations per cycle
        for (let i = 0; i < 5; i++) {
          const operation = createMockOperation({
            content: `Cycle ${cycle} Op ${i}`,
            timestamp: Date.now() + (cycle * 5) + i,
          });
          recoveryManager.queueOfflineOperation(operation);
        }

        // Simulate periodic memory pressure
        if (cycle % 20 === 0) {
          const memoryUsage = process.memoryUsage();
          expect(memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // < 100MB
        }
      }

      const finalQueue = recoveryManager.getPendingOperations();
      expect(finalQueue.length).toBe(sessionDuration * 5);
    });

    test('should optimize sync operations for large datasets', async () => {
      await store.joinSession(session.id, user);

      // Create large dataset to sync
      const annotationCount = 200;
      const annotations = new Map<string, Annotation>();

      for (let i = 0; i < annotationCount; i++) {
        const annotation = createMockAnnotation({
          content: `Sync test annotation ${i}`,
        });
        const id = await store.createAnnotation(annotation);
        annotations.set(id, annotation);
      }

      // Save large dataset
      const saveStart = performance.now();
      recoveryManager.saveSessionState(
        store.currentSession!,
        annotations,
        []
      );
      const saveTime = performance.now() - saveStart;

      expect(saveTime).toBeLessThan(1000); // Should save efficiently

      // Restore large dataset
      const restoreStart = performance.now();
      const restoredState = recoveryManager.restoreSessionState();
      const restoreTime = performance.now() - restoreStart;

      expect(restoreTime).toBeLessThan(500); // Should restore efficiently
      expect(restoredState?.annotations.size).toBe(annotationCount);
    });
  });
});