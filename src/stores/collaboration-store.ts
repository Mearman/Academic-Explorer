/**
 * Collaboration store for real-time multi-user features
 * Manages collaboration sessions, annotations, comments, and operational transformation
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { useNetworkStatus } from '@/hooks/use-network-status';
import { OperationalTransform } from '@/lib/operational-transform';
import type {
  CollaborationState,
  CollaborationActions,
  CollaborationUser,
  CollaborationSession,
  Annotation,
  Comment,
  CommentThread,
  Operation,
  UserPresence,
  SessionRecording,
  WebSocketMessage,
  PermissionLevel,
  UserPermissions,
} from '@/types/collaboration';
import { PERMISSION_LEVELS, DEFAULT_SESSION_SETTINGS } from '@/types/collaboration';

// WebSocket service interface (to be implemented)
interface WebSocketService {
  connect(): Promise<void>;
  disconnect(): void;
  send(message: WebSocketMessage): Promise<void>;
  on(event: string, handler: (data: unknown) => void): void;
  off(event: string, handler: (data: unknown) => void): void;
  isConnected(): boolean;
}

// Mock WebSocket service for development
const createMockWebSocketService = (): WebSocketService => ({
  connect: async () => Promise.resolve(),
  disconnect: () => {},
  send: async () => Promise.resolve(),
  on: () => {},
  off: () => {},
  isConnected: () => false,
});

/**
 * Generate unique IDs
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if user has required permissions
 */
function hasPermission(
  userPermissions: UserPermissions,
  requiredPermission: keyof UserPermissions
): boolean {
  return userPermissions[requiredPermission] === true;
}

/**
 * Validate annotation data
 */
function validateAnnotation(annotation: Partial<Annotation>): boolean {
  return !!(
    annotation.type &&
    annotation.target &&
    annotation.content &&
    annotation.author
  );
}

/**
 * Validate comment data
 */
function validateComment(comment: Partial<Comment>): boolean {
  return !!(
    comment.parentId &&
    comment.content &&
    comment.author
  );
}

/**
 * Debounce function for presence updates
 */
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Create the collaboration store
 */
export const useCollaborationStore = create<CollaborationState & CollaborationActions>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => {
        // Initialize operational transformation engine
        const otEngine = new OperationalTransform();
        
        // Initialize WebSocket service (will be replaced with real implementation)
        const webSocketService: WebSocketService = createMockWebSocketService();
        
        // Debounced presence update function
        const debouncedPresenceUpdate = debounce((presence: Partial<UserPresence>) => {
          const state = get();
          if (state.currentSession && state.currentUser && webSocketService.isConnected()) {
            const message: WebSocketMessage = {
              type: 'user-presence',
              payload: {
                ...presence,
                userId: state.currentUser.id,
                lastActivity: Date.now(),
              },
              timestamp: Date.now(),
              sessionId: state.currentSession.id,
              id: generateId(),
            };
            
            webSocketService.send(message).catch(error => {
              console.error('Failed to send presence update:', error);
            });
          }
        }, 100);

        // WebSocket event handlers
        const setupWebSocketHandlers = () => {
          webSocketService.on('message', (data: unknown) => {
            // Type guard to ensure we have a valid WebSocketMessage
            if (data && typeof data === 'object' && 'type' in data && 'payload' in data) {
              handleIncomingMessage(data as WebSocketMessage);
            }
          });

          webSocketService.on('error', (data: unknown) => {
            const error = data instanceof Error ? data : new Error(String(data));
            set(state => {
              state.error = error.message;
              state.connectionStatus = 'error';
            });
          });

          webSocketService.on('close', () => {
            set(state => {
              state.connectionStatus = 'disconnected';
            });
          });
        };

        // Handle incoming WebSocket messages
        const handleIncomingMessage = (message: WebSocketMessage) => {
          const state = get();
          
          switch (message.type) {
            case 'join-session':
              handleUserJoined(message);
              break;
            case 'leave-session':
              handleUserLeft(message);
              break;
            case 'user-presence':
              handlePresenceUpdate(message);
              break;
            case 'annotation-create':
              handleAnnotationCreated(message);
              break;
            case 'annotation-update':
              handleAnnotationUpdated(message);
              break;
            case 'annotation-delete':
              handleAnnotationDeleted(message);
              break;
            case 'comment-create':
              handleCommentCreated(message);
              break;
            case 'comment-update':
              handleCommentUpdated(message);
              break;
            case 'comment-delete':
              handleCommentDeleted(message);
              break;
            case 'operation-apply':
              handleOperationApplied(message);
              break;
            case 'session-update':
              handleSessionUpdated(message);
              break;
            case 'error':
              set(state => {
                state.error = (message.payload as any)?.message || 'Unknown error';
              });
              break;
          }
        };

        // Message handlers
        const handleUserJoined = (message: WebSocketMessage) => {
          set(state => {
            const payload = message.payload as any;
            if (payload.user && state.currentSession) {
              state.currentSession.participants.set(payload.user.id, payload.user);
            }
          });
        };

        const handleUserLeft = (message: WebSocketMessage) => {
          set(state => {
            const payload = message.payload as any;
            if (payload.userId && state.currentSession) {
              state.currentSession.participants.delete(payload.userId);
              state.userPresence.delete(payload.userId);
            }
          });
        };

        const handlePresenceUpdate = (message: WebSocketMessage) => {
          set(state => {
            const presence = message.payload as UserPresence;
            if (presence.userId && presence.userId !== state.currentUser?.id) {
              state.userPresence.set(presence.userId, presence);
            }
          });
        };

        const handleAnnotationCreated = (message: WebSocketMessage) => {
          set(state => {
            const annotation = message.payload as Annotation;
            if (validateAnnotation(annotation)) {
              state.annotations.set(annotation.id, annotation);
            }
          });
        };

        const handleAnnotationUpdated = (message: WebSocketMessage) => {
          set(state => {
            const payload = message.payload as { id: string; updates: Partial<Annotation> };
            const existing = state.annotations.get(payload.id);
            if (existing) {
              state.annotations.set(payload.id, {
                ...existing,
                ...payload.updates,
                modifiedAt: Date.now(),
              });
            }
          });
        };

        const handleAnnotationDeleted = (message: WebSocketMessage) => {
          set(state => {
            const payload = message.payload as { id: string };
            state.annotations.delete(payload.id);
          });
        };

        const handleCommentCreated = (message: WebSocketMessage) => {
          set(state => {
            const comment = message.payload as Comment;
            if (validateComment(comment)) {
              // Find or create comment thread
              let thread = state.commentThreads.get(comment.threadId);
              if (!thread) {
                thread = {
                  id: comment.threadId,
                  target: { type: 'element', id: comment.parentId, url: '', title: '' },
                  comments: [],
                  participants: [],
                  status: 'open',
                  createdAt: Date.now(),
                  lastActivity: Date.now(),
                };
                state.commentThreads.set(comment.threadId, thread);
              }

              // Ensure thread exists before proceeding
              const currentThread = state.commentThreads.get(comment.threadId);
              if (!currentThread) {
                return; // Cannot proceed without a valid thread
              }

              // Add comment to thread
              if (comment.parentId === currentThread.id || comment.parentId === comment.threadId) {
                // Root level comment
                currentThread.comments.push(comment);
              } else {
                // Reply to another comment
                const addReplyToComment = (comments: Comment[]): boolean => {
                  for (const c of comments) {
                    if (c.id === comment.parentId) {
                      c.replies.push(comment);
                      return true;
                    }
                    if (addReplyToComment(c.replies)) {
                      return true;
                    }
                  }
                  return false;
                };
                addReplyToComment(currentThread.comments);
              }

              // Update thread metadata
              currentThread.lastActivity = Date.now();
              if (!currentThread.participants.includes(comment.author.id)) {
                currentThread.participants.push(comment.author.id);
              }
            }
          });
        };

        const handleCommentUpdated = (message: WebSocketMessage) => {
          set(state => {
            const payload = message.payload as { id: string; updates: Partial<Comment> };
            
            // Find and update comment in threads
            for (const thread of state.commentThreads.values()) {
              const updateCommentInList = (comments: Comment[]): boolean => {
                for (const comment of comments) {
                  if (comment.id === payload.id) {
                    Object.assign(comment, payload.updates, { modifiedAt: Date.now() });
                    return true;
                  }
                  if (updateCommentInList(comment.replies)) {
                    return true;
                  }
                }
                return false;
              };
              
              if (updateCommentInList(thread.comments)) {
                thread.lastActivity = Date.now();
                break;
              }
            }
          });
        };

        const handleCommentDeleted = (message: WebSocketMessage) => {
          set(state => {
            const payload = message.payload as { id: string };
            
            // Find and remove comment from threads
            for (const thread of state.commentThreads.values()) {
              const removeCommentFromList = (comments: Comment[]): boolean => {
                const index = comments.findIndex(c => c.id === payload.id);
                if (index >= 0) {
                  comments.splice(index, 1);
                  return true;
                }
                
                for (const comment of comments) {
                  if (removeCommentFromList(comment.replies)) {
                    return true;
                  }
                }
                return false;
              };
              
              if (removeCommentFromList(thread.comments)) {
                thread.lastActivity = Date.now();
                break;
              }
            }
          });
        };

        const handleOperationApplied = (message: WebSocketMessage) => {
          const operation = message.payload as Operation;
          const state = get();
          
          if (operation.userId !== state.currentUser?.id) {
            // Apply remote operation using operational transformation
            otEngine.applyRemoteOperation(operation);
            
            set(state => {
              // Update document state if needed
              // This would depend on the specific document model
            });
          } else {
            // Acknowledge our own operation
            otEngine.acknowledgeOperation(operation.id);
          }
        };

        const handleSessionUpdated = (message: WebSocketMessage) => {
          set(state => {
            const updates = message.payload as Partial<CollaborationSession>;
            if (state.currentSession) {
              Object.assign(state.currentSession, updates);
            }
          });
        };

        return {
          // Initial state
          currentSession: null,
          currentUser: null,
          connectionStatus: 'disconnected',
          userPresence: new Map(),
          annotations: new Map(),
          commentThreads: new Map(),
          activeRecording: null,
          error: null,
          isSyncing: false,
          lastSync: 0,

          // Actions
          async joinSession(sessionId: string, userInfo: Partial<CollaborationUser>) {
            set(state => {
              state.connectionStatus = 'connecting';
              state.error = null;
            });

            try {
              // Connect to WebSocket if not already connected
              if (!webSocketService.isConnected()) {
                await webSocketService.connect();
                setupWebSocketHandlers();
              }

              // Create user with generated ID if not provided
              const user: CollaborationUser = {
                id: userInfo.id || generateId(),
                name: userInfo.name || 'Anonymous User',
                avatar: userInfo.avatar,
                colour: userInfo.colour || `#${Math.floor(Math.random() * 16777215).toString(16)}`,
                status: 'online',
                lastSeen: Date.now(),
                permissions: userInfo.permissions || PERMISSION_LEVELS.annotator,
                ...userInfo,
              };

              // Send join session message
              const message: WebSocketMessage = {
                type: 'join-session',
                payload: { sessionId, user },
                timestamp: Date.now(),
                userId: user.id,
                sessionId,
                id: generateId(),
              };

              await webSocketService.send(message);

              // Update state
              set(state => {
                state.currentUser = user;
                state.connectionStatus = 'connected';
                
                // Create or update session
                if (!state.currentSession) {
                  state.currentSession = {
                    id: sessionId,
                    title: `Session ${sessionId}`,
                    ownerId: user.id,
                    createdAt: Date.now(),
                    lastActivity: Date.now(),
                    visibility: 'private',
                    status: 'active',
                    participants: new Map([[user.id, user]]),
                    permissions: new Map([[user.id, user.permissions]]),
                    settings: DEFAULT_SESSION_SETTINGS,
                  };
                } else {
                  state.currentSession.participants.set(user.id, user);
                  state.currentSession.permissions.set(user.id, user.permissions);
                }
              });

            } catch (error) {
              set(state => {
                state.error = error instanceof Error ? error.message : 'Failed to join session';
                state.connectionStatus = 'error';
              });
              throw error;
            }
          },

          async leaveSession() {
            const state = get();
            
            if (state.currentSession && state.currentUser) {
              try {
                const message: WebSocketMessage = {
                  type: 'leave-session',
                  payload: { sessionId: state.currentSession.id },
                  timestamp: Date.now(),
                  userId: state.currentUser.id,
                  sessionId: state.currentSession.id,
                  id: generateId(),
                };

                await webSocketService.send(message);
              } catch (error) {
                console.error('Failed to send leave session message:', error);
              }
            }

            // Disconnect WebSocket and reset state
            webSocketService.disconnect();
            
            set(state => {
              state.currentSession = null;
              state.currentUser = null;
              state.connectionStatus = 'disconnected';
              state.userPresence.clear();
              state.annotations.clear();
              state.commentThreads.clear();
              state.activeRecording = null;
              state.error = null;
            });
          },

          async createSession(sessionInfo: Partial<CollaborationSession>) {
            const sessionId = generateId();
            const state = get();

            if (!state.currentUser) {
              throw new Error('No current user');
            }

            const session: CollaborationSession = {
              id: sessionId,
              title: sessionInfo.title || `Session ${sessionId}`,
              description: sessionInfo.description,
              ownerId: state.currentUser.id,
              createdAt: Date.now(),
              lastActivity: Date.now(),
              visibility: sessionInfo.visibility || 'private',
              status: 'active',
              participants: new Map([[state.currentUser.id, state.currentUser]]),
              permissions: new Map([[state.currentUser.id, PERMISSION_LEVELS.owner]]),
              settings: { ...DEFAULT_SESSION_SETTINGS, ...sessionInfo.settings },
              shareToken: generateId(),
              shareExpiry: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
              ...sessionInfo,
            };

            set(state => {
              state.currentSession = session;
            });

            return sessionId;
          },

          async updateSession(updates: Partial<CollaborationSession>) {
            const state = get();
            
            if (!state.currentSession || !state.currentUser) {
              throw new Error('No active session or user');
            }

            if (!hasPermission(state.currentUser.permissions, 'canAdmin')) {
              throw new Error('Insufficient permissions to update session');
            }

            set(state => {
              if (state.currentSession) {
                Object.assign(state.currentSession, updates, {
                  lastActivity: Date.now(),
                });
              }
            });

            // Send update to other participants
            if (webSocketService.isConnected()) {
              const message: WebSocketMessage = {
                type: 'session-update',
                payload: updates,
                timestamp: Date.now(),
                userId: state.currentUser.id,
                sessionId: state.currentSession.id,
                id: generateId(),
              };

              await webSocketService.send(message);
            }
          },

          updateUser(updates: Partial<CollaborationUser>) {
            set(state => {
              if (state.currentUser) {
                Object.assign(state.currentUser, updates);
                
                // Update in session participants if exists
                if (state.currentSession) {
                  state.currentSession.participants.set(state.currentUser.id, state.currentUser);
                }
              }
            });
          },

          updateUserPresence(presence: Partial<UserPresence>) {
            debouncedPresenceUpdate(presence);
          },

          async createAnnotation(annotationData: Omit<Annotation, 'id' | 'createdAt' | 'modifiedAt'>) {
            const state = get();
            
            if (!state.currentUser) {
              throw new Error('No current user');
            }

            if (!hasPermission(state.currentUser.permissions, 'canAnnotate')) {
              throw new Error('Insufficient permissions to create annotation');
            }

            if (!validateAnnotation(annotationData)) {
              throw new Error('Invalid annotation data');
            }

            const annotation: Annotation = {
              ...annotationData,
              id: generateId(),
              createdAt: Date.now(),
              modifiedAt: Date.now(),
            };

            // Add to local state
            set(state => {
              state.annotations.set(annotation.id, annotation);
            });

            // Send to other participants
            if (state.currentSession && webSocketService.isConnected()) {
              const message: WebSocketMessage = {
                type: 'annotation-create',
                payload: annotation,
                timestamp: Date.now(),
                userId: state.currentUser.id,
                sessionId: state.currentSession.id,
                id: generateId(),
              };

              await webSocketService.send(message);
            }

            return annotation.id;
          },

          async updateAnnotation(id: string, updates: Partial<Annotation>) {
            const state = get();
            
            if (!state.currentUser) {
              throw new Error('No current user');
            }

            const annotation = state.annotations.get(id);
            if (!annotation) {
              throw new Error('Annotation not found');
            }

            // Check permissions
            if (annotation.author.id !== state.currentUser.id && 
                !hasPermission(state.currentUser.permissions, 'canEdit')) {
              throw new Error('Insufficient permissions to edit annotation');
            }

            // Update local state
            set(state => {
              const existing = state.annotations.get(id);
              if (existing) {
                state.annotations.set(id, {
                  ...existing,
                  ...updates,
                  modifiedAt: Date.now(),
                });
              }
            });

            // Send update to other participants
            if (state.currentSession && webSocketService.isConnected()) {
              const message: WebSocketMessage = {
                type: 'annotation-update',
                payload: { id, updates },
                timestamp: Date.now(),
                userId: state.currentUser.id,
                sessionId: state.currentSession.id,
                id: generateId(),
              };

              await webSocketService.send(message);
            }
          },

          async deleteAnnotation(id: string) {
            const state = get();
            
            if (!state.currentUser) {
              throw new Error('No current user');
            }

            const annotation = state.annotations.get(id);
            if (!annotation) {
              throw new Error('Annotation not found');
            }

            // Check permissions
            if (annotation.author.id !== state.currentUser.id && 
                !hasPermission(state.currentUser.permissions, 'canEdit')) {
              throw new Error('Insufficient permissions to delete annotation');
            }

            // Remove from local state
            set(state => {
              state.annotations.delete(id);
            });

            // Send deletion to other participants
            if (state.currentSession && webSocketService.isConnected()) {
              const message: WebSocketMessage = {
                type: 'annotation-delete',
                payload: { id },
                timestamp: Date.now(),
                userId: state.currentUser.id,
                sessionId: state.currentSession.id,
                id: generateId(),
              };

              await webSocketService.send(message);
            }
          },

          async createComment(commentData: Omit<Comment, 'id' | 'createdAt' | 'modifiedAt'>) {
            const state = get();
            
            if (!state.currentUser) {
              throw new Error('No current user');
            }

            if (!hasPermission(state.currentUser.permissions, 'canAnnotate')) {
              throw new Error('Insufficient permissions to create comment');
            }

            if (!validateComment(commentData)) {
              throw new Error('Invalid comment data');
            }

            const comment: Comment = {
              ...commentData,
              id: generateId(),
              createdAt: Date.now(),
              modifiedAt: Date.now(),
              replies: [],
              reactions: [],
              resolved: false,
              status: 'published',
            };

            // Send to participants (local state will be updated via message handler)
            if (state.currentSession && webSocketService.isConnected()) {
              const message: WebSocketMessage = {
                type: 'comment-create',
                payload: comment,
                timestamp: Date.now(),
                userId: state.currentUser.id,
                sessionId: state.currentSession.id,
                id: generateId(),
              };

              await webSocketService.send(message);
            }

            return comment.id;
          },

          async updateComment(id: string, updates: Partial<Comment>) {
            const state = get();
            
            if (!state.currentUser) {
              throw new Error('No current user');
            }

            // Find comment in threads
            let foundComment: Comment | null = null;
            for (const thread of state.commentThreads.values()) {
              const findComment = (comments: Comment[]): Comment | null => {
                for (const comment of comments) {
                  if (comment.id === id) return comment;
                  const found = findComment(comment.replies);
                  if (found) return found;
                }
                return null;
              };
              foundComment = findComment(thread.comments);
              if (foundComment) break;
            }

            if (!foundComment) {
              throw new Error('Comment not found');
            }

            // Check permissions
            if (foundComment.author.id !== state.currentUser.id && 
                !hasPermission(state.currentUser.permissions, 'canEdit')) {
              throw new Error('Insufficient permissions to edit comment');
            }

            // Send update to participants
            if (state.currentSession && webSocketService.isConnected()) {
              const message: WebSocketMessage = {
                type: 'comment-update',
                payload: { id, updates },
                timestamp: Date.now(),
                userId: state.currentUser.id,
                sessionId: state.currentSession.id,
                id: generateId(),
              };

              await webSocketService.send(message);
            }
          },

          async deleteComment(id: string) {
            const state = get();
            
            if (!state.currentUser) {
              throw new Error('No current user');
            }

            // Find comment in threads
            let foundComment: Comment | null = null;
            for (const thread of state.commentThreads.values()) {
              const findComment = (comments: Comment[]): Comment | null => {
                for (const comment of comments) {
                  if (comment.id === id) return comment;
                  const found = findComment(comment.replies);
                  if (found) return found;
                }
                return null;
              };
              foundComment = findComment(thread.comments);
              if (foundComment) break;
            }

            if (!foundComment) {
              throw new Error('Comment not found');
            }

            // Check permissions
            if (foundComment.author.id !== state.currentUser.id && 
                !hasPermission(state.currentUser.permissions, 'canEdit')) {
              throw new Error('Insufficient permissions to delete comment');
            }

            // Send deletion to participants
            if (state.currentSession && webSocketService.isConnected()) {
              const message: WebSocketMessage = {
                type: 'comment-delete',
                payload: { id },
                timestamp: Date.now(),
                userId: state.currentUser.id,
                sessionId: state.currentSession.id,
                id: generateId(),
              };

              await webSocketService.send(message);
            }
          },

          sendOperation(operationData: Omit<Operation, 'id' | 'timestamp'>) {
            const state = get();
            
            if (!state.currentUser || !state.currentSession) {
              throw new Error('No active session or user');
            }

            const operation: Operation = {
              ...operationData,
              id: generateId(),
              timestamp: Date.now(),
              userId: state.currentUser.id,
            };

            // Apply operation locally using operational transformation
            otEngine.applyLocalOperation(operation);

            // Send to other participants
            if (webSocketService.isConnected()) {
              const message: WebSocketMessage = {
                type: 'operation-apply',
                payload: operation,
                timestamp: Date.now(),
                userId: state.currentUser.id,
                sessionId: state.currentSession.id,
                id: generateId(),
              };

              webSocketService.send(message).catch(error => {
                console.error('Failed to send operation:', error);
              });
            }
          },

          applyOperation(operation: Operation) {
            // This is handled by the operational transformation engine
            // and the WebSocket message handler
          },

          async startRecording(title?: string) {
            const state = get();
            
            if (!state.currentSession || !state.currentUser) {
              throw new Error('No active session or user');
            }

            if (!hasPermission(state.currentUser.permissions, 'canAdmin')) {
              throw new Error('Insufficient permissions to start recording');
            }

            const recording: SessionRecording = {
              id: generateId(),
              sessionId: state.currentSession.id,
              title: title || `Recording of ${state.currentSession.title}`,
              startTime: Date.now(),
              duration: 0,
              status: 'recording',
              events: [],
              metadata: {
                participantCount: state.currentSession.participants.size,
                quality: 'high',
                fileSize: 0,
                compressionRatio: 1,
                formatVersion: '1.0',
              },
            };

            set(state => {
              state.activeRecording = recording;
            });

            return recording.id;
          },

          async stopRecording() {
            const state = get();
            
            if (!state.activeRecording) {
              throw new Error('No active recording');
            }

            set(state => {
              if (state.activeRecording) {
                state.activeRecording.endTime = Date.now();
                state.activeRecording.duration = Date.now() - state.activeRecording.startTime;
                state.activeRecording.status = 'processing';
                
                // In a real implementation, this would trigger server-side processing
                setTimeout(() => {
                  set(state => {
                    if (state.activeRecording) {
                      state.activeRecording.status = 'ready';
                    }
                  });
                }, 1000);
              }
            });
          },

          async connect() {
            set(state => {
              state.connectionStatus = 'connecting';
              state.error = null;
            });

            try {
              await webSocketService.connect();
              setupWebSocketHandlers();
              
              set(state => {
                state.connectionStatus = 'connected';
              });
            } catch (error) {
              set(state => {
                state.error = error instanceof Error ? error.message : 'Connection failed';
                state.connectionStatus = 'error';
              });
              throw error;
            }
          },

          disconnect() {
            webSocketService.disconnect();
            
            set(state => {
              state.connectionStatus = 'disconnected';
            });
          },

          async reconnect() {
            this.disconnect();
            await this.connect();
          },
        };
      }),
      {
        name: 'collaboration-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Only persist essential state, not real-time data
          currentUser: state.currentUser,
          // Don't persist currentSession as it should be rejoined
          // Don't persist real-time data like userPresence, annotations, etc.
        }),
      }
    )
  )
);