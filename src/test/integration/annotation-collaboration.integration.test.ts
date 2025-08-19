/**
 * Integration tests for annotation collaboration features
 * Tests real-time annotation synchronisation and multi-user scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAnnotationSync } from '@/hooks/use-annotation-sync';
import { useCollaborationStore } from '@/stores/collaboration-store';
import type { 
  Annotation, 
  CollaborationUser, 
  CollaborationSession,
  WebSocketMessage 
} from '@/types/collaboration';

// Mock WebSocket service
const mockSendMessage = vi.fn();
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();

vi.mock('@/lib/websocket-service', () => ({
  WebSocketService: class {
    connect = mockConnect;
    disconnect = mockDisconnect;
    send = mockSendMessage;
    on = vi.fn();
    off = vi.fn();
  },
}));

// Mock data
const mockUser1: CollaborationUser = {
  id: 'user-1',
  name: 'Alice',
  avatar: 'https://example.com/alice.jpg',
  colour: '#3B82F6',
  status: 'online',
  lastSeen: Date.now(),
  permissions: {
    canView: true,
    canAnnotate: true,
    canEdit: true,
    canInvite: false,
    canAdmin: false,
  },
};

const mockUser2: CollaborationUser = {
  id: 'user-2',
  name: 'Bob',
  avatar: 'https://example.com/bob.jpg',
  colour: '#10B981',
  status: 'online',
  lastSeen: Date.now(),
  permissions: {
    canView: true,
    canAnnotate: true,
    canEdit: false,
    canInvite: false,
    canAdmin: false,
  },
};

const mockSession: CollaborationSession = {
  id: 'session-1',
  title: 'Research Session',
  description: 'Collaborative research on author networks',
  ownerId: 'user-1',
  createdAt: Date.now() - 3600000,
  lastActivity: Date.now(),
  visibility: 'team',
  status: 'active',
  participants: new Map([
    ['user-1', mockUser1],
    ['user-2', mockUser2],
  ]),
  permissions: new Map([
    ['user-1', mockUser1.permissions],
    ['user-2', mockUser2.permissions],
  ]),
  settings: {
    allowAnonymous: false,
    maxParticipants: 10,
    requireApproval: false,
    enableRecording: true,
    autoSaveInterval: 30000,
    showCursors: true,
    showSelections: true,
    enableVoiceChat: false,
    enableScreenShare: false,
  },
};

const mockAnnotation: Annotation = {
  id: 'annotation-1',
  type: 'note',
  target: {
    type: 'entity',
    id: 'A123456789',
    url: '/authors/A123456789',
    title: 'Test Author',
  },
  content: 'This author has interesting collaboration patterns.',
  author: {
    id: mockUser1.id,
    name: mockUser1.name,
    avatar: mockUser1.avatar,
    colour: mockUser1.colour,
  },
  createdAt: Date.now() - 1800000,
  modifiedAt: Date.now() - 1800000,
  visibility: 'team',
  status: 'published',
  tags: ['collaboration', 'research'],
  reactions: [],
  commentIds: [],
  position: {
    x: 200,
    y: 300,
    anchor: 'center',
  },
};

describe('Annotation Collaboration Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset collaboration store
    const { getState } = useCollaborationStore;
    act(() => {
      const state = getState();
      state.currentSession = mockSession;
      state.currentUser = mockUser1;
      state.connectionStatus = 'connected';
      state.annotations = new Map([['annotation-1', mockAnnotation]]);
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Real-time Annotation Synchronisation', () => {
    it('should sync annotation creation across users', async () => {
      const { result } = renderHook(() => useAnnotationSync());
      
      // Simulate user 2 creating an annotation
      const newAnnotation: Annotation = {
        ...mockAnnotation,
        id: 'annotation-2',
        content: 'Bob\'s annotation about network analysis',
        author: {
          id: mockUser2.id,
          name: mockUser2.name,
          avatar: mockUser2.avatar,
          colour: mockUser2.colour,
        },
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };
      
      const message: WebSocketMessage = {
        type: 'annotation-create',
        payload: newAnnotation,
        timestamp: Date.now(),
        userId: mockUser2.id,
        sessionId: mockSession.id,
        id: 'msg-1',
      };
      
      // Simulate receiving WebSocket message
      act(() => {
        window.dispatchEvent(new CustomEvent('collaboration-message', { detail: message }));
      });
      
      await waitFor(() => {
        const { annotations } = useCollaborationStore.getState();
        expect(annotations.has('annotation-2')).toBe(true);
        expect(annotations.get('annotation-2')?.author.name).toBe('Bob');
      });
    });

    it('should sync annotation updates across users', async () => {
      const { result } = renderHook(() => useAnnotationSync());
      
      // Simulate user 2 updating an annotation
      const updates = {
        content: 'Updated annotation content with new insights',
        modifiedAt: Date.now(),
      };
      
      const message: WebSocketMessage = {
        type: 'annotation-update',
        payload: {
          annotationId: 'annotation-1',
          updates,
        },
        timestamp: Date.now(),
        userId: mockUser2.id,
        sessionId: mockSession.id,
        id: 'msg-2',
      };
      
      // Simulate receiving WebSocket message
      act(() => {
        window.dispatchEvent(new CustomEvent('collaboration-message', { detail: message }));
      });
      
      await waitFor(() => {
        const { annotations } = useCollaborationStore.getState();
        const annotation = annotations.get('annotation-1');
        expect(annotation?.content).toBe('Updated annotation content with new insights');
      });
    });

    it('should sync annotation deletion across users', async () => {
      const { result } = renderHook(() => useAnnotationSync());
      
      // Verify annotation exists initially
      expect(useCollaborationStore.getState().annotations.has('annotation-1')).toBe(true);
      
      // Simulate user 2 deleting an annotation
      const message: WebSocketMessage = {
        type: 'annotation-delete',
        payload: {
          annotationId: 'annotation-1',
        },
        timestamp: Date.now(),
        userId: mockUser2.id,
        sessionId: mockSession.id,
        id: 'msg-3',
      };
      
      // Simulate receiving WebSocket message
      act(() => {
        window.dispatchEvent(new CustomEvent('collaboration-message', { detail: message }));
      });
      
      await waitFor(() => {
        const { annotations } = useCollaborationStore.getState();
        expect(annotations.has('annotation-1')).toBe(false);
      });
    });

    it('should not process own messages to prevent loops', async () => {
      const { result } = renderHook(() => useAnnotationSync());
      
      // Simulate user 1 (current user) creating an annotation
      const newAnnotation: Annotation = {
        ...mockAnnotation,
        id: 'annotation-own',
        author: {
          id: mockUser1.id,
          name: mockUser1.name,
          avatar: mockUser1.avatar,
          colour: mockUser1.colour,
        },
      };
      
      const message: WebSocketMessage = {
        type: 'annotation-create',
        payload: newAnnotation,
        timestamp: Date.now(),
        userId: mockUser1.id, // Same as current user
        sessionId: mockSession.id,
        id: 'msg-own',
      };
      
      const initialAnnotationCount = useCollaborationStore.getState().annotations.size;
      
      // Simulate receiving own WebSocket message
      act(() => {
        window.dispatchEvent(new CustomEvent('collaboration-message', { detail: message }));
      });
      
      // Should not add duplicate annotation
      await waitFor(() => {
        const { annotations } = useCollaborationStore.getState();
        expect(annotations.size).toBe(initialAnnotationCount);
      });
    });
  });

  describe('Conflict Resolution', () => {
    it('should handle concurrent annotation edits', async () => {
      const { result } = renderHook(() => useAnnotationSync());
      
      // Simulate two users editing the same annotation simultaneously
      const update1 = {
        content: 'Alice\'s edit',
        modifiedAt: Date.now(),
      };
      
      const update2 = {
        content: 'Bob\'s edit',
        modifiedAt: Date.now() + 100, // Slightly later
      };
      
      const message1: WebSocketMessage = {
        type: 'annotation-update',
        payload: { annotationId: 'annotation-1', updates: update1 },
        timestamp: Date.now(),
        userId: mockUser1.id,
        sessionId: mockSession.id,
        id: 'msg-edit-1',
      };
      
      const message2: WebSocketMessage = {
        type: 'annotation-update',
        payload: { annotationId: 'annotation-1', updates: update2 },
        timestamp: Date.now() + 100,
        userId: mockUser2.id,
        sessionId: mockSession.id,
        id: 'msg-edit-2',
      };
      
      // Apply both updates
      act(() => {
        window.dispatchEvent(new CustomEvent('collaboration-message', { detail: message1 }));
        window.dispatchEvent(new CustomEvent('collaboration-message', { detail: message2 }));
      });
      
      await waitFor(() => {
        const { annotations } = useCollaborationStore.getState();
        const annotation = annotations.get('annotation-1');
        // Later edit should win (Bob's edit)
        expect(annotation?.content).toBe('Bob\'s edit');
      });
    });

    it('should maintain operation order for consistency', async () => {
      const { result } = renderHook(() => useAnnotationSync());
      
      // Simulate operations with different timestamps
      const operations = [
        {
          message: {
            type: 'annotation-update' as const,
            payload: { annotationId: 'annotation-1', updates: { content: 'First edit' } },
            timestamp: Date.now() - 200,
            userId: mockUser2.id,
            sessionId: mockSession.id,
            id: 'op-1',
          },
        },
        {
          message: {
            type: 'annotation-update' as const,
            payload: { annotationId: 'annotation-1', updates: { content: 'Second edit' } },
            timestamp: Date.now() - 100,
            userId: mockUser1.id,
            sessionId: mockSession.id,
            id: 'op-2',
          },
        },
        {
          message: {
            type: 'annotation-update' as const,
            payload: { annotationId: 'annotation-1', updates: { content: 'Final edit' } },
            timestamp: Date.now(),
            userId: mockUser2.id,
            sessionId: mockSession.id,
            id: 'op-3',
          },
        },
      ];
      
      // Apply operations in reverse order to test ordering
      act(() => {
        operations.reverse().forEach(({ message }) => {
          window.dispatchEvent(new CustomEvent('collaboration-message', { detail: message }));
        });
      });
      
      await waitFor(() => {
        const { annotations } = useCollaborationStore.getState();
        const annotation = annotations.get('annotation-1');
        // Should have final edit based on timestamp
        expect(annotation?.content).toBe('Final edit');
      });
    });
  });

  describe('Sync Status Management', () => {
    it('should track pending operations', async () => {
      const { result } = renderHook(() => useAnnotationSync());
      
      // Verify initial state
      expect(result.current.pendingOperations).toBe(0);
      expect(result.current.getSyncStatus('annotation-1')).toBe('synced');
      
      // Create a new annotation (which should add pending operations)
      const { createAnnotation } = useCollaborationStore.getState();
      
      act(() => {
        createAnnotation({
          type: 'note',
          target: mockAnnotation.target,
          content: 'New annotation',
          author: mockAnnotation.author,
          visibility: 'team',
          status: 'published',
          tags: [],
          reactions: [],
          commentIds: [],
        });
      });
      
      // Should have pending operations
      await waitFor(() => {
        expect(result.current.pendingOperations).toBeGreaterThan(0);
      });
    });

    it('should provide sync status for annotations', async () => {
      const { result } = renderHook(() => useAnnotationSync());
      
      // Existing annotation should be synced
      expect(result.current.getSyncStatus('annotation-1')).toBe('synced');
      
      // Non-existent annotation should be error
      expect(result.current.getSyncStatus('non-existent')).toBe('error');
    });

    it('should handle manual sync', async () => {
      const { result } = renderHook(() => useAnnotationSync());
      
      await act(async () => {
        await result.current.syncAnnotations();
      });
      
      // Should not throw and should complete
      expect(mockSendMessage).toHaveBeenCalled();
    });

    it('should handle annotation refresh', async () => {
      const { result } = renderHook(() => useAnnotationSync());
      
      await act(async () => {
        await result.current.refreshAnnotations();
      });
      
      // Should complete without errors
      expect(result.current.pendingOperations).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle WebSocket disconnection gracefully', async () => {
      const { result } = renderHook(() => useAnnotationSync());
      
      // Simulate disconnection
      act(() => {
        const { getState } = useCollaborationStore;
        getState().connectionStatus = 'disconnected';
      });
      
      // Operations should queue for later sync
      const { createAnnotation } = useCollaborationStore.getState();
      
      await act(async () => {
        await createAnnotation({
          type: 'note',
          target: mockAnnotation.target,
          content: 'Offline annotation',
          author: mockAnnotation.author,
          visibility: 'team',
          status: 'published',
          tags: [],
          reactions: [],
          commentIds: [],
        });
      });
      
      // Should track as pending
      expect(result.current.pendingOperations).toBeGreaterThan(0);
    });

    it('should handle malformed WebSocket messages', async () => {
      const { result } = renderHook(() => useAnnotationSync());
      
      const malformedMessage = {
        type: 'annotation-create',
        payload: null, // Invalid payload
        timestamp: Date.now(),
        userId: mockUser2.id,
        sessionId: mockSession.id,
        id: 'malformed',
      };
      
      // Should not crash when receiving malformed message
      expect(() => {
        act(() => {
          window.dispatchEvent(new CustomEvent('collaboration-message', { 
            detail: malformedMessage as any 
          }));
        });
      }).not.toThrow();
    });

    it('should handle missing session context', async () => {
      // Clear session
      act(() => {
        const { getState } = useCollaborationStore;
        getState().currentSession = null;
      });
      
      const { result } = renderHook(() => useAnnotationSync());
      
      // Operations should not be processed without session
      const message: WebSocketMessage = {
        type: 'annotation-create',
        payload: mockAnnotation,
        timestamp: Date.now(),
        userId: mockUser2.id,
        sessionId: 'unknown-session',
        id: 'no-session',
      };
      
      act(() => {
        window.dispatchEvent(new CustomEvent('collaboration-message', { detail: message }));
      });
      
      // Should not process the message
      await waitFor(() => {
        const { annotations } = useCollaborationStore.getState();
        expect(annotations.size).toBe(0); // No annotations should be added
      });
    });
  });

  describe('Performance and Cleanup', () => {
    it('should clean up pending operations after timeout', async () => {
      const { result } = renderHook(() => useAnnotationSync());
      
      // Create annotation to generate pending operation
      const { createAnnotation } = useCollaborationStore.getState();
      
      await act(async () => {
        await createAnnotation({
          type: 'note',
          target: mockAnnotation.target,
          content: 'Timeout test annotation',
          author: mockAnnotation.author,
          visibility: 'team',
          status: 'published',
          tags: [],
          reactions: [],
          commentIds: [],
        });
      });
      
      expect(result.current.pendingOperations).toBeGreaterThan(0);
      
      // Fast-forward time to trigger cleanup
      vi.advanceTimersByTime(35000); // 35 seconds
      
      await waitFor(() => {
        expect(result.current.pendingOperations).toBe(0);
      });
    });

    it('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      const { unmount } = renderHook(() => useAnnotationSync());
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'collaboration-message',
        expect.any(Function)
      );
      
      removeEventListenerSpy.mockRestore();
    });

    it('should handle rapid message processing efficiently', async () => {
      const { result } = renderHook(() => useAnnotationSync());
      
      // Send many messages rapidly
      const messages = Array.from({ length: 50 }, (_, i) => ({
        type: 'annotation-create' as const,
        payload: {
          ...mockAnnotation,
          id: `rapid-annotation-${i}`,
          content: `Rapid annotation ${i}`,
          author: mockUser2,
        },
        timestamp: Date.now() + i,
        userId: mockUser2.id,
        sessionId: mockSession.id,
        id: `rapid-msg-${i}`,
      }));
      
      const startTime = performance.now();
      
      act(() => {
        messages.forEach(message => {
          window.dispatchEvent(new CustomEvent('collaboration-message', { detail: message }));
        });
      });
      
      await waitFor(() => {
        const { annotations } = useCollaborationStore.getState();
        expect(annotations.size).toBe(51); // Original + 50 new
      });
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // Should process rapidly (under 100ms for 50 operations)
      expect(processingTime).toBeLessThan(100);
    });
  });
});