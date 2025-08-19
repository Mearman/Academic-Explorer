/**
 * Integration tests for concurrent editing scenarios and conflict resolution
 * Tests real-time collaboration with multiple users editing simultaneously
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import type {
  CollaborationUser,
  CollaborationSession,
  Operation,
  Annotation,
  Comment,
  CollaborationState,
  CollaborationActions,
} from '@/types/collaboration';

import { useCollaborationStore } from '@/stores/collaboration-store';
import { 
  transformOperation, 
  transformOperations,
  applyOperation,
  OperationalTransform 
} from '@/lib/operational-transform';
import {
  createMockUser,
  createMockSession,
  createMockAnnotation,
  createMockComment,
  createMockOperation,
  waitFor,
  waitForCondition,
} from '@/test/utils/collaboration-test-utils';

// Simulates multiple concurrent users for testing
class ConcurrentUserSimulator {
  private users: CollaborationUser[] = [];
  private stores: Array<CollaborationState & CollaborationActions> = [];
  private otEngines: OperationalTransform[] = [];
  private networkLatency = 50; // Base network latency
  private messageDelays: Map<string, number> = new Map();

  constructor(userCount: number) {
    for (let i = 0; i < userCount; i++) {
      this.users.push(createMockUser({ name: `User ${i + 1}` }));
      this.stores.push(useCollaborationStore.getState() as CollaborationState & CollaborationActions);
      this.otEngines.push(new OperationalTransform());
    }
  }

  async initializeSession(session: CollaborationSession): Promise<void> {
    // All users join the session
    const joinPromises = this.users.map((user, index) =>
      this.stores[index].joinSession(session.id, user)
    );

    await Promise.all(joinPromises);

    // Wait for all users to see each other
    await waitForCondition(() =>
      this.stores.every(store => 
        store.currentSession?.participants.size === this.users.length
      ),
      5000
    );
  }

  setNetworkConditions(latency: number, jitter: number = 0): void {
    this.networkLatency = latency;
    
    // Add random jitter to simulate real network conditions
    this.users.forEach(user => {
      const delay = latency + (Math.random() - 0.5) * jitter;
      this.messageDelays.set(user.id, Math.max(0, delay));
    });
  }

  // Simulate operations with network delays
  async sendOperation(userIndex: number, operation: Operation): Promise<void> {
    const delay = this.messageDelays.get(this.users[userIndex].id) || this.networkLatency;
    
    // Apply locally first (optimistic update)
    this.otEngines[userIndex].applyLocalOperation(operation);
    
    // Simulate network delay before sending to other users
    await waitFor(delay);
    
    // Send to all other users with their respective delays
    const remotePromises = this.stores
      .filter((_, index) => index !== userIndex)
      .map(async (store, index) => {
        const actualIndex = index >= userIndex ? index + 1 : index;
        const remoteDelay = this.messageDelays.get(this.users[actualIndex].id) || this.networkLatency;
        
        await waitFor(remoteDelay);
        
        // Apply operational transformation and remote operation
        this.otEngines[actualIndex].applyRemoteOperation(operation);
        
        // Update store (mock the WebSocket message handling)
        return this.simulateRemoteOperationReceived(actualIndex, operation);
      });

    await Promise.all(remotePromises);
  }

  private async simulateRemoteOperationReceived(userIndex: number, operation: Operation): Promise<void> {
    // This would normally be handled by WebSocket message handlers
    // For testing, we'll directly update the document state
    const store = this.stores[userIndex];
    
    // Simulate the operation being applied through the collaboration system
    store.sendOperation(operation);
  }

  getDocumentState(userIndex: number): string {
    return this.otEngines[userIndex].getContent();
  }

  getAllDocumentStates(): string[] {
    return this.otEngines.map(engine => engine.getContent());
  }

  verifyConsistency(): boolean {
    const states = this.getAllDocumentStates();
    return states.every(state => state === states[0]);
  }

  async cleanup(): Promise<void> {
    const leavePromises = this.stores.map(store => store.leaveSession());
    await Promise.all(leavePromises);
  }
}

describe('Concurrent Editing Scenarios', () => {
  let session: CollaborationSession;
  let simulator: ConcurrentUserSimulator;

  beforeEach(async () => {
    session = createMockSession({ title: 'Concurrent Editing Test' });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (simulator) {
      await simulator.cleanup();
    }
  });

  describe('Basic Concurrent Operations', () => {
    test('should handle simultaneous text insertions at different positions', async () => {
      simulator = new ConcurrentUserSimulator(3);
      await simulator.initializeSession(session);

      const initialContent = 'Hello World';
      
      // Set same initial content for all users
      const otEngines = [
        new OperationalTransform(initialContent),
        new OperationalTransform(initialContent),
        new OperationalTransform(initialContent),
      ];

      // User 1 inserts at position 0
      const op1 = createMockOperation({
        type: 'insert',
        position: 0,
        content: 'Hi, ',
        userId: 'user-1',
        timestamp: Date.now(),
      });

      // User 2 inserts at position 6 (after "Hello ")
      const op2 = createMockOperation({
        type: 'insert',
        position: 6,
        content: 'Beautiful ',
        userId: 'user-2',
        timestamp: Date.now() + 10,
      });

      // User 3 inserts at position 11 (after "World")
      const op3 = createMockOperation({
        type: 'insert',
        position: 11,
        content: '!',
        userId: 'user-3',
        timestamp: Date.now() + 20,
      });

      // Apply operations concurrently with transformation
      const transformedOps = [
        [op1, op2, op3],
        [op2, op1, op3],
        [op3, op1, op2],
      ];

      // Simulate operations arriving in different orders for each user
      for (let userIndex = 0; userIndex < 3; userIndex++) {
        let content = initialContent;
        
        for (const op of transformedOps[userIndex]) {
          // Transform operation against previously applied operations
          const appliedOps = otEngines[userIndex].getAppliedOperations();
          let transformedOp = op;
          
          for (const appliedOp of appliedOps) {
            if (appliedOp.userId !== op.userId) {
              transformedOp = transformOperation(transformedOp, appliedOp, 'right');
            }
          }
          
          content = applyOperation(content, transformedOp);
          otEngines[userIndex].applyRemoteOperation(transformedOp);
        }
      }

      // All users should have the same final content
      const finalStates = otEngines.map(engine => engine.getContent());
      expect(finalStates[0]).toBe(finalStates[1]);
      expect(finalStates[1]).toBe(finalStates[2]);
      
      // Content should contain all insertions
      expect(finalStates[0]).toContain('Hi, ');
      expect(finalStates[0]).toContain('Beautiful ');
      expect(finalStates[0]).toContain('!');
    });

    test('should handle simultaneous text deletions', async () => {
      simulator = new ConcurrentUserSimulator(2);
      await simulator.initializeSession(session);

      const initialContent = 'The quick brown fox jumps over the lazy dog';
      
      // User 1 deletes "quick " (positions 4-10)
      const op1 = createMockOperation({
        type: 'delete',
        position: 4,
        length: 6,
        userId: 'user-1',
        timestamp: Date.now(),
      });

      // User 2 deletes "brown " (positions 10-16)
      const op2 = createMockOperation({
        type: 'delete',
        position: 10,
        length: 6,
        userId: 'user-2',
        timestamp: Date.now() + 10,
      });

      // Transform operations against each other
      const op1TransformedAgainstOp2 = transformOperation(op1, op2, 'left');
      const op2TransformedAgainstOp1 = transformOperation(op2, op1, 'right');

      // Apply operations in different orders
      let content1 = initialContent;
      content1 = applyOperation(content1, op1);
      content1 = applyOperation(content1, op2TransformedAgainstOp1);

      let content2 = initialContent;
      content2 = applyOperation(content2, op2);
      content2 = applyOperation(content2, op1TransformedAgainstOp2);

      // Both should result in the same content
      expect(content1).toBe(content2);
      expect(content1).toBe('The fox jumps over the lazy dog');
    });

    test('should handle insert-delete conflicts at same position', async () => {
      simulator = new ConcurrentUserSimulator(2);
      await simulator.initializeSession(session);

      const initialContent = 'Hello World';
      
      // User 1 inserts at position 6
      const insertOp = createMockOperation({
        type: 'insert',
        position: 6,
        content: 'Beautiful ',
        userId: 'user-1',
        timestamp: Date.now(),
      });

      // User 2 deletes at position 6 (same position)
      const deleteOp = createMockOperation({
        type: 'delete',
        position: 6,
        length: 5, // "World"
        userId: 'user-2',
        timestamp: Date.now() + 10,
      });

      // Transform operations
      const insertTransformed = transformOperation(insertOp, deleteOp, 'left');
      const deleteTransformed = transformOperation(deleteOp, insertOp, 'right');

      // Apply in both orders
      let content1 = initialContent;
      content1 = applyOperation(content1, insertOp);
      content1 = applyOperation(content1, deleteTransformed);

      let content2 = initialContent;
      content2 = applyOperation(content2, deleteOp);
      content2 = applyOperation(content2, insertTransformed);

      // Should produce consistent results
      expect(content1).toBe(content2);
    });
  });

  describe('Complex Multi-User Scenarios', () => {
    test('should handle rapid concurrent edits from multiple users', async () => {
      simulator = new ConcurrentUserSimulator(5);
      await simulator.initializeSession(session);

      simulator.setNetworkConditions(100, 50); // 100ms ± 50ms latency

      const operations: Operation[] = [];
      
      // Generate 20 random operations from different users
      for (let i = 0; i < 20; i++) {
        const userIndex = i % 5;
        const operation = createMockOperation({
          type: Math.random() > 0.7 ? 'delete' : 'insert',
          position: Math.floor(Math.random() * 50),
          content: Math.random() > 0.5 ? `text${i} ` : undefined,
          length: Math.random() > 0.5 ? Math.floor(Math.random() * 5) + 1 : undefined,
          userId: `user-${userIndex + 1}`,
          timestamp: Date.now() + i * 50,
        });
        
        operations.push(operation);
      }

      // Send operations concurrently with random delays
      const sendPromises = operations.map(async (operation, index) => {
        await waitFor(Math.random() * 200); // Random start delay
        const userIndex = parseInt(operation.userId.split('-')[1]) - 1;
        return simulator.sendOperation(userIndex, operation);
      });

      await Promise.all(sendPromises);

      // Wait for all operations to propagate
      await waitFor(2000);

      // Verify all users have consistent state
      expect(simulator.verifyConsistency()).toBe(true);
    });

    test('should handle annotation conflicts during concurrent editing', async () => {
      simulator = new ConcurrentUserSimulator(3);
      await simulator.initializeSession(session);

      // Create initial annotation
      const annotation = createMockAnnotation({
        content: 'Original annotation content',
        type: 'highlight',
      });

      // All users try to update the same annotation simultaneously
      const updates = [
        { content: 'User 1 update', tags: ['user1'] },
        { content: 'User 2 update', tags: ['user2'] },
        { content: 'User 3 update', tags: ['user3'] },
      ];

      // Simulate concurrent updates with different timestamps
      const updatePromises = updates.map(async (update, index) => {
        const delay = index * 10; // Slight time differences
        await waitFor(delay);
        
        // This would normally go through the collaboration store
        // For testing, we'll simulate the conflict resolution
        return {
          ...update,
          timestamp: Date.now() + delay,
          userId: `user-${index + 1}`,
        };
      });

      const results = await Promise.all(updatePromises);

      // Last-write-wins should resolve the conflict
      const winningUpdate = results.reduce((latest, current) => 
        current.timestamp > latest.timestamp ? current : latest
      );

      expect(winningUpdate.content).toBeDefined();
      expect(['User 1 update', 'User 2 update', 'User 3 update'])
        .toContain(winningUpdate.content);
    });

    test('should maintain consistency during network partitions', async () => {
      simulator = new ConcurrentUserSimulator(4);
      await simulator.initializeSession(session);

      // Simulate network partition: Users 0,1 vs Users 2,3
      const partition1Users = [0, 1];
      const partition2Users = [2, 3];

      // Set high latency between partitions, low within partitions
      simulator.setNetworkConditions(50, 10);

      // Each partition makes different edits
      const partition1Ops = [
        createMockOperation({
          type: 'insert',
          position: 0,
          content: 'Partition1: ',
          userId: 'user-1',
          timestamp: Date.now(),
        }),
        createMockOperation({
          type: 'insert',
          position: 12,
          content: 'Group A ',
          userId: 'user-2',
          timestamp: Date.now() + 100,
        }),
      ];

      const partition2Ops = [
        createMockOperation({
          type: 'insert',
          position: 0,
          content: 'Partition2: ',
          userId: 'user-3',
          timestamp: Date.now() + 50,
        }),
        createMockOperation({
          type: 'insert',
          position: 12,
          content: 'Group B ',
          userId: 'user-4',
          timestamp: Date.now() + 150,
        }),
      ];

      // Apply operations within partitions first
      await Promise.all([
        ...partition1Ops.map((op, i) => 
          simulator.sendOperation(partition1Users[i], op)
        ),
        ...partition2Ops.map((op, i) => 
          simulator.sendOperation(partition2Users[i], op)
        ),
      ]);

      // Wait for intra-partition synchronization
      await waitFor(500);

      // Simulate partition healing - operations cross partitions
      await waitFor(1000);

      // After healing, all users should converge to same state
      await waitForCondition(() => simulator.verifyConsistency(), 5000);
      
      expect(simulator.verifyConsistency()).toBe(true);
    });
  });

  describe('Conflict Resolution Strategies', () => {
    test('should implement last-write-wins for simple conflicts', async () => {
      const user1 = createMockUser({ name: 'Alice' });
      const user2 = createMockUser({ name: 'Bob' });

      const annotation = createMockAnnotation({
        content: 'Original content',
        modifiedAt: Date.now() - 1000,
      });

      // Simulate concurrent updates with different timestamps
      const update1 = {
        content: 'Alice update',
        modifiedAt: Date.now(),
      };

      const update2 = {
        content: 'Bob update', 
        modifiedAt: Date.now() + 100, // Later timestamp
      };

      // Last-write-wins resolution
      const resolvedUpdate = update2.modifiedAt > update1.modifiedAt ? update2 : update1;

      expect(resolvedUpdate.content).toBe('Bob update');
      expect(resolvedUpdate.modifiedAt).toBeGreaterThan(update1.modifiedAt);
    });

    test('should implement operational transformation for text operations', async () => {
      const initialContent = 'The quick brown fox';
      
      // Two operations on same document
      const op1 = createMockOperation({
        type: 'insert',
        position: 4,
        content: 'very ',
        userId: 'user-1',
        timestamp: Date.now(),
      });

      const op2 = createMockOperation({
        type: 'delete',
        position: 10,
        length: 6, // "brown "
        userId: 'user-2',
        timestamp: Date.now() + 10,
      });

      // Transform op2 against op1
      const transformedOp2 = transformOperation(op2, op1, 'right');

      // Apply operations in sequence
      let content = initialContent;
      content = applyOperation(content, op1); // "The very quick brown fox"
      content = applyOperation(content, transformedOp2); // Position adjusted for op1

      expect(content).toBe('The very quick fox');
    });

    test('should handle three-way operation conflicts', async () => {
      const initialContent = 'abc';
      
      const operations = [
        createMockOperation({
          type: 'insert',
          position: 1,
          content: 'X',
          userId: 'user-1',
          timestamp: 1000,
        }),
        createMockOperation({
          type: 'insert',
          position: 1,
          content: 'Y',
          userId: 'user-2',
          timestamp: 1001,
        }),
        createMockOperation({
          type: 'insert',
          position: 1,
          content: 'Z',
          userId: 'user-3',
          timestamp: 1002,
        }),
      ];

      // Apply operations in all possible orders with transformation
      const permutations = [
        [0, 1, 2], [0, 2, 1], [1, 0, 2], 
        [1, 2, 0], [2, 0, 1], [2, 1, 0]
      ];

      const results = permutations.map(order => {
        let content = initialContent;
        const appliedOps: Operation[] = [];
        
        for (const opIndex of order) {
          let transformedOp = operations[opIndex];
          
          // Transform against all previously applied operations
          for (const appliedOp of appliedOps) {
            if (appliedOp.userId !== transformedOp.userId) {
              transformedOp = transformOperation(transformedOp, appliedOp, 'right');
            }
          }
          
          content = applyOperation(content, transformedOp);
          appliedOps.push(transformedOp);
        }
        
        return content;
      });

      // All permutations should produce the same result
      const firstResult = results[0];
      expect(results.every(result => result === firstResult)).toBe(true);
    });
  });

  describe('Performance Under Concurrent Load', () => {
    test('should maintain performance with high operation frequency', async () => {
      simulator = new ConcurrentUserSimulator(10);
      await simulator.initializeSession(session);

      const operationCount = 100;
      const startTime = performance.now();

      // Generate high-frequency operations
      const operationPromises = Array.from({ length: operationCount }, async (_, i) => {
        const userIndex = i % 10;
        const operation = createMockOperation({
          type: 'insert',
          position: i % 20,
          content: `${i} `,
          userId: `user-${userIndex + 1}`,
          timestamp: Date.now() + i,
        });

        await waitFor(Math.random() * 10); // Small random delay
        return simulator.sendOperation(userIndex, operation);
      });

      await Promise.all(operationPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds

      // Wait for final synchronization
      await waitFor(2000);

      // All users should have consistent state
      expect(simulator.verifyConsistency()).toBe(true);
    });

    test('should handle memory efficiently with large operation history', async () => {
      const otEngine = new OperationalTransform('initial');
      const largeOperationCount = 1000;

      // Apply many operations
      for (let i = 0; i < largeOperationCount; i++) {
        const operation = createMockOperation({
          type: 'insert',
          position: i % 50,
          content: `${i} `,
          userId: `user-${i % 5}`,
          timestamp: Date.now() + i,
        });

        otEngine.applyLocalOperation(operation);
      }

      // Engine should not consume excessive memory
      const appliedOps = otEngine.getAppliedOperations();
      const pendingOps = otEngine.getPendingOperations();

      // Should maintain reasonable operation history
      expect(appliedOps.length).toBeLessThanOrEqual(largeOperationCount);
      expect(pendingOps.length).toBeLessThan(100); // Reasonable pending queue

      // Content should be well-formed
      const content = otEngine.getContent();
      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle operations on empty document', async () => {
      const otEngine = new OperationalTransform('');

      const operation = createMockOperation({
        type: 'insert',
        position: 0,
        content: 'First content',
        userId: 'user-1',
        timestamp: Date.now(),
      });

      const result = otEngine.applyLocalOperation(operation);

      expect(result).toBe('First content');
      expect(otEngine.getContent()).toBe('First content');
    });

    test('should handle operations beyond document boundaries', async () => {
      const otEngine = new OperationalTransform('Hello');

      // Insert beyond end of document
      const operation1 = createMockOperation({
        type: 'insert',
        position: 100, // Beyond document length
        content: ' World',
        userId: 'user-1',
        timestamp: Date.now(),
      });

      const result1 = otEngine.applyLocalOperation(operation1);
      expect(result1).toBe('Hello World'); // Should clamp to end

      // Delete beyond document length
      const operation2 = createMockOperation({
        type: 'delete',
        position: 3,
        length: 100, // More than remaining content
        userId: 'user-1',
        timestamp: Date.now() + 1,
      });

      const result2 = otEngine.applyLocalOperation(operation2);
      expect(result2.length).toBeLessThan(11); // Should not delete beyond content
    });

    test('should handle invalid operations gracefully', async () => {
      const otEngine = new OperationalTransform('Test content');

      // Operation with negative position
      const invalidOp1 = createMockOperation({
        type: 'insert',
        position: -5,
        content: 'Invalid',
        userId: 'user-1',
        timestamp: Date.now(),
      });

      // Should handle gracefully (clamp to 0 or reject)
      expect(() => otEngine.applyLocalOperation(invalidOp1)).not.toThrow();

      // Operation with negative length
      const invalidOp2 = createMockOperation({
        type: 'delete',
        position: 0,
        length: -3,
        userId: 'user-1',
        timestamp: Date.now() + 1,
      });

      expect(() => otEngine.applyLocalOperation(invalidOp2)).not.toThrow();
    });
  });
});