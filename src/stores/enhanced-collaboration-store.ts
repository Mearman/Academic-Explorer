/**
 * Enhanced collaboration store with improved stability and error recovery
 * Extends the base collaboration store with advanced reliability features
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { EnhancedWebSocketService, createEnhancedWebSocketService } from '@/lib/enhanced-websocket-service';
import { OperationalTransform } from '@/lib/operational-transform';
import type {
  CollaborationState,
  CollaborationActions,
  CollaborationUser,
  CollaborationSession,
  Annotation,
  Comment,
  Operation,
  UserPresence,
  WebSocketMessage,
  AnnotationTarget,
} from '@/types/collaboration';

import { useCollaborationStore } from './collaboration-store';

/**
 * Additional types for enhanced collaboration features
 */
interface NetworkQualityData {
  latency?: number;
  stability?: number;
  packetLoss?: number;
  timestamp: number;
}

interface HealthCheckFailureData {
  consecutiveFailures: number;
  lastFailure: number;
  error?: string;
}

interface EnhancedConnectionFailureData {
  error: string;
  timestamp: number;
  reconnectAttempt?: number;
}

interface CommentThread {
  id: string;
  title?: string;
  annotationId?: string;
  target: AnnotationTarget;
  comments: Comment[];
  participants: string[];
  status: 'open' | 'resolved' | 'closed';
  createdAt: number;
  lastActivity: number;
}

interface SyncResponsePayload {
  type: 'full' | 'incremental';
  session?: CollaborationSession;
  annotations?: Array<[string, Annotation]>;
  commentThreads?: Array<[string, CommentThread]>;
  updates?: IncrementalUpdate[];
}

interface IncrementalUpdate {
  type: 'annotation' | 'comment' | 'session';
  operation: 'create' | 'update' | 'delete';
  data: {
    id: string;
    [key: string]: unknown;
  };
}

interface ConflictResolutionPayload {
  entityType: 'annotation' | 'comment' | 'session';
  entityId: string;
  resolvedData?: Record<string, unknown>;
  conflictReason?: string;
}

/**
 * Enhanced collaboration state with reliability features
 */
interface EnhancedCollaborationState extends CollaborationState {
  // Connection quality and reliability
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  lastSyncTimestamp: number;
  syncInProgress: boolean;
  autoRecoveryEnabled: boolean;
  
  // Error recovery and resilience
  offlineQueue: Operation[];
  conflictResolution: 'manual' | 'automatic';
  lastKnownGoodState: Date | null;
  recoveryAttempts: number;
  maxRecoveryAttempts: number;
  
  // Performance monitoring
  operationHistory: Operation[];
  messageLatency: number;
  networkMetrics: {
    packetsLost: number;
    averageLatency: number;
    reconnectCount: number;
    lastReconnect: number;
  };
  
  // Enhanced presence tracking
  userActivityStatus: Map<string, 'active' | 'idle' | 'away' | 'offline'>;
  presenceUpdateFrequency: number;
  
  // Session reliability
  sessionHeartbeat: number;
  participantStability: Map<string, number>; // Stability score 0-1
}

/**
 * Enhanced collaboration actions with reliability features
 */
interface EnhancedCollaborationActions extends CollaborationActions {
  // Enhanced connection management
  enableAutoRecovery: () => void;
  disableAutoRecovery: () => void;
  forceSync: () => Promise<void>;
  checkConnectionHealth: () => Promise<boolean>;
  
  // Offline operation management
  getOfflineQueueSize: () => number;
  clearOfflineQueue: () => void;
  processOfflineQueue: () => Promise<void>;
  
  // Enhanced error recovery
  attemptRecovery: () => Promise<boolean>;
  resetToLastKnownGoodState: () => void;
  setConflictResolutionMode: (mode: 'manual' | 'automatic') => void;
  
  // Performance optimization
  optimizeForNetworkConditions: () => void;
  adjustPresenceUpdateFrequency: (frequency: number) => void;
  
  // Enhanced sync operations
  performIncrementalSync: () => Promise<void>;
  performFullStateSync: () => Promise<void>;
  
  // Monitoring and diagnostics
  getNetworkDiagnostics: () => object;
  getPerformanceMetrics: () => object;
  exportDiagnosticReport: () => object;
}

/**
 * Create the enhanced collaboration store
 */
export const useEnhancedCollaborationStore = create<
  EnhancedCollaborationState & EnhancedCollaborationActions
>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => {
        // Enhanced WebSocket service
        let enhancedWebSocketService: EnhancedWebSocketService | null = null;
        
        // Enhanced operational transformation
        const enhancedOtEngine = new OperationalTransform();
        
        // Recovery mechanisms
        const _recoveryTimer: NodeJS.Timeout | null = null;
        let syncTimer: NodeJS.Timeout | null = null;
        let heartbeatTimer: NodeJS.Timeout | null = null;
        let presenceTimer: NodeJS.Timeout | null = null;
        
        // Performance monitoring
        const performanceMonitor = {
          messageCount: 0,
          errorCount: 0,
          latencySum: 0,
          startTime: Date.now(),
        };

        /**
         * Initialize enhanced WebSocket service
         */
        const initializeEnhancedWebSocket = () => {
          if (enhancedWebSocketService) return;

          enhancedWebSocketService = createEnhancedWebSocketService({
            url: process.env.VITE_WEBSOCKET_URL || 'ws://localhost:8080',
            autoReconnect: true,
            maxReconnectAttempts: 10,
            exponentialBackoff: true,
            adaptToNetworkQuality: true,
            enableDeduplication: true,
            circuitBreakerThreshold: 3,
            healthCheckInterval: 30000,
            syncRecoveryStrategy: 'incremental',
          });

          setupEnhancedEventHandlers();
        };

        /**
         * Set up enhanced event handlers
         */
        const setupEnhancedEventHandlers = () => {
          if (!enhancedWebSocketService) return;

          // Network quality monitoring
          enhancedWebSocketService.on('network-quality-changed', (quality: unknown) => {
            // Type guard for network quality data
            if (quality && typeof quality === 'object' && 'timestamp' in quality) {
              handleNetworkQualityChange(quality as NetworkQualityData);
            }
          });

          // Circuit breaker events
          enhancedWebSocketService.on('circuit-breaker-open', () => {
            set(state => {
              state.connectionStatus = 'error';
              state.error = 'Connection circuit breaker activated';
            });
          });

          enhancedWebSocketService.on('circuit-breaker-closed', () => {
            set(state => {
              state.connectionStatus = 'connected';
              state.error = null;
            });
          });

          // Health check events
          enhancedWebSocketService.on('health-check-failure', (data: unknown) => {
            // Type guard for health check failure data
            if (data && typeof data === 'object' && 'consecutiveFailures' in data && 'lastFailure' in data) {
              handleHealthCheckFailure(data as HealthCheckFailureData);
            }
          });

          // Sync recovery events
          enhancedWebSocketService.on('sync-recovery-complete', () => {
            set(state => {
              state.syncInProgress = false;
              state.lastSyncTimestamp = Date.now();
            });
          });

          enhancedWebSocketService.on('sync-recovery-failed', (error) => {
            set(state => {
              state.syncInProgress = false;
              state.error = `Sync recovery failed: ${error}`;
            });
          });

          // Enhanced connection events
          enhancedWebSocketService.on('enhanced-connection-failure', (data: unknown) => {
            // Type guard for enhanced connection failure data
            if (data && typeof data === 'object' && 'error' in data && 'timestamp' in data) {
              handleEnhancedConnectionFailure(data as EnhancedConnectionFailureData);
            }
          });

          // Regular WebSocket events with proper typing
          enhancedWebSocketService.on('message', (data: unknown) => {
            // Type guard to ensure we have a valid WebSocketMessage
            if (data && typeof data === 'object' && 'type' in data && 'payload' in data) {
              handleIncomingMessage(data as WebSocketMessage);
            }
          });
          enhancedWebSocketService.on('error', handleWebSocketError);
          enhancedWebSocketService.on('connected', handleWebSocketConnected);
          enhancedWebSocketService.on('disconnected', handleWebSocketDisconnected);
        };

        /**
         * Handle network quality changes
         */
        const handleNetworkQualityChange = (quality: NetworkQualityData) => {
          set(state => {
            // Update connection quality based on network metrics
            const latency = quality.latency || 0;
            const stability = quality.stability || 1;
            const packetLoss = quality.packetLoss || 0;

            if (latency < 100 && stability > 0.9 && packetLoss < 0.05) {
              state.connectionQuality = 'excellent';
            } else if (latency < 300 && stability > 0.7 && packetLoss < 0.1) {
              state.connectionQuality = 'good';
            } else if (latency < 1000 && stability > 0.5 && packetLoss < 0.2) {
              state.connectionQuality = 'poor';
            } else {
              state.connectionQuality = 'offline';
            }

            // Update network metrics
            state.networkMetrics.averageLatency = latency;
            state.networkMetrics.packetsLost += packetLoss * 100;
            state.messageLatency = latency;
          });
        };

        /**
         * Handle health check failures
         */
        const handleHealthCheckFailure = (data: HealthCheckFailureData) => {
          set(state => {
            state.networkMetrics.reconnectCount++;
            state.networkMetrics.lastReconnect = Date.now();
            
            if (data.consecutiveFailures >= 3) {
              state.connectionQuality = 'poor';
              
              // Trigger recovery if auto-recovery is enabled
              if (state.autoRecoveryEnabled) {
                setTimeout(() => {
                  get().attemptRecovery();
                }, 1000);
              }
            }
          });
        };

        /**
         * Handle enhanced connection failures
         */
        const handleEnhancedConnectionFailure = (data: EnhancedConnectionFailureData) => {
          set(state => {
            state.error = `Connection failed: ${data.error}`;
            state.recoveryAttempts++;
            
            performanceMonitor.errorCount++;
            
            // Queue current operations for retry
            if (state.connectionStatus === 'connected') {
              // Move current operations to offline queue
              const pendingOps = enhancedOtEngine.getPendingOperations();
              state.offlineQueue.push(...pendingOps);
            }
          });
        };

        /**
         * Handle incoming WebSocket messages with enhanced processing
         */
        const handleIncomingMessage = (message: WebSocketMessage) => {
          const _state = get();
          
          // Update performance metrics
          performanceMonitor.messageCount++;
          
          // Track message latency
          const latency = Date.now() - message.timestamp;
          performanceMonitor.latencySum += latency;
          
          set(draft => {
            draft.messageLatency = latency;
          });

          // Process message through enhanced handlers
          switch (message.type) {
            case 'sync-response':
              handleSyncResponse(message);
              break;
            case 'conflict-resolution':
              handleConflictResolution(message);
              break;
            case 'enhanced-presence':
              handleEnhancedPresence(message);
              break;
            default:
              // Delegate to base store message handling
              // This would need integration with the base store
              break;
          }
        };

        /**
         * Handle sync response messages
         */
        const handleSyncResponse = (message: WebSocketMessage) => {
          set(state => {
            const payload = message.payload as SyncResponsePayload;
            
            if (payload.type === 'full') {
              // Full state sync
              if (payload.session) {
                state.currentSession = payload.session;
              }
              if (payload.annotations) {
                state.annotations = new Map(payload.annotations);
              }
              if (payload.commentThreads) {
                state.commentThreads = new Map(payload.commentThreads);
              }
            } else if (payload.type === 'incremental') {
              // Incremental updates
              payload.updates?.forEach((update: IncrementalUpdate) => {
                switch (update.type) {
                  case 'annotation':
                    if (update.operation === 'create' || update.operation === 'update') {
                      // Type guard to ensure we have a valid annotation
                      if (update.data && typeof update.data === 'object' && 'id' in update.data) {
                        state.annotations.set(update.data.id, update.data as unknown as Annotation);
                      }
                    } else if (update.operation === 'delete') {
                      state.annotations.delete(update.data.id);
                    }
                    break;
                  // Handle other update types
                }
              });
            }
            
            state.lastSyncTimestamp = Date.now();
            state.syncInProgress = false;
            state.lastKnownGoodState = new Date();
          });
        };

        /**
         * Handle conflict resolution messages
         */
        const handleConflictResolution = (message: WebSocketMessage) => {
          const payload = message.payload as ConflictResolutionPayload;
          
          set(state => {
            if (state.conflictResolution === 'automatic') {
              // Apply server resolution automatically
              if (payload.resolvedData) {
                switch (payload.entityType) {
                  case 'annotation':
                    if (payload.resolvedData && typeof payload.resolvedData === 'object') {
                      state.annotations.set(payload.entityId, payload.resolvedData as unknown as Annotation);
                    }
                    break;
                  case 'comment':
                    // Update comment in thread
                    for (const thread of state.commentThreads.values()) {
                      const updateComment = (comments: Comment[]): boolean => {
                        for (const comment of comments) {
                          if (comment.id === payload.entityId) {
                            Object.assign(comment, payload.resolvedData);
                            return true;
                          }
                          if (updateComment(comment.replies)) {
                            return true;
                          }
                        }
                        return false;
                      };
                      updateComment(thread.comments);
                    }
                    break;
                }
              }
            } else {
              // Manual resolution - emit event for UI to handle
              // This would need to be handled by the UI layer
            }
          });
        };

        /**
         * Handle enhanced presence updates
         */
        const handleEnhancedPresence = (message: WebSocketMessage) => {
          const payload = message.payload as UserPresence;
          
          set(state => {
            if (payload.userId && payload.userId !== state.currentUser?.id) {
              // Update presence
              state.userPresence.set(payload.userId, payload);
              
              // Update activity status based on last activity
              const timeSinceActivity = Date.now() - payload.lastActivity;
              let activityStatus: 'active' | 'idle' | 'away' | 'offline' = 'active';
              
              if (timeSinceActivity > 300000) { // 5 minutes
                activityStatus = 'away';
              } else if (timeSinceActivity > 60000) { // 1 minute
                activityStatus = 'idle';
              }
              
              state.userActivityStatus.set(payload.userId, activityStatus);
              
              // Update participant stability
              const currentStability = state.participantStability.get(payload.userId) || 0.5;
              const newStability = Math.min(currentStability + 0.1, 1.0);
              state.participantStability.set(payload.userId, newStability);
            }
          });
        };

        /**
         * Handle WebSocket errors with enhanced processing
         */
        const handleWebSocketError = (error: Error | string | unknown) => {
          set(state => {
            const errorMessage = error instanceof Error 
              ? error.message 
              : typeof error === 'string' 
                ? error 
                : 'Unknown error';
            state.error = `WebSocket error: ${errorMessage}`;
            state.connectionStatus = 'error';
            
            performanceMonitor.errorCount++;
            
            // Trigger recovery if enabled
            if (state.autoRecoveryEnabled && state.recoveryAttempts < state.maxRecoveryAttempts) {
              setTimeout(() => {
                get().attemptRecovery();
              }, 2000);
            }
          });
        };

        /**
         * Handle WebSocket connected event
         */
        const handleWebSocketConnected = () => {
          set(state => {
            state.connectionStatus = 'connected';
            state.error = null;
            state.recoveryAttempts = 0;
            state.connectionQuality = 'good';
            state.lastKnownGoodState = new Date();
          });

          // Process offline queue
          const state = get();
          if (state.offlineQueue.length > 0) {
            get().processOfflineQueue();
          }

          // Start periodic sync
          startPeriodicSync();
        };

        /**
         * Handle WebSocket disconnected event
         */
        const handleWebSocketDisconnected = () => {
          set(state => {
            state.connectionStatus = 'disconnected';
            state.connectionQuality = 'offline';
            
            // Reduce participant stability scores
            for (const [userId, stability] of state.participantStability.entries()) {
              state.participantStability.set(userId, Math.max(stability - 0.2, 0));
            }
          });

          stopPeriodicSync();
        };

        /**
         * Start periodic sync operations
         */
        const startPeriodicSync = () => {
          if (syncTimer) clearInterval(syncTimer);
          
          syncTimer = setInterval(() => {
            const state = get();
            if (state.connectionStatus === 'connected' && !state.syncInProgress) {
              get().performIncrementalSync().catch(error => {
                console.warn('Periodic sync failed:', error);
              });
            }
          }, 30000); // Every 30 seconds
        };

        /**
         * Stop periodic sync operations
         */
        const stopPeriodicSync = () => {
          if (syncTimer) {
            clearInterval(syncTimer);
            syncTimer = null;
          }
        };

        /**
         * Start session heartbeat
         */
        const startSessionHeartbeat = () => {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
          
          heartbeatTimer = setInterval(() => {
            set(state => {
              state.sessionHeartbeat = Date.now();
            });
            
            // Send heartbeat if connected
            if (enhancedWebSocketService?.isConnected()) {
              const heartbeatMessage: WebSocketMessage = {
                type: 'heartbeat',
                payload: { timestamp: Date.now() },
                timestamp: Date.now(),
                sessionId: get().currentSession?.id || 'heartbeat',
                id: `heartbeat-${Date.now()}`,
              };
              
              enhancedWebSocketService.send(heartbeatMessage).catch(error => {
                console.warn('Heartbeat failed:', error);
              });
            }
          }, 15000); // Every 15 seconds
        };

        /**
         * Start enhanced presence updates
         */
        const startEnhancedPresenceUpdates = () => {
          if (presenceTimer) clearInterval(presenceTimer);
          
          presenceTimer = setInterval(() => {
            const state = get();
            if (state.currentUser && state.currentSession && enhancedWebSocketService?.isConnected()) {
              // Send enhanced presence update
              const presenceUpdate: WebSocketMessage = {
                type: 'enhanced-presence',
                payload: {
                  userId: state.currentUser.id,
                  lastActivity: Date.now(),
                  connectionQuality: state.connectionQuality,
                  currentRoute: window.location.pathname,
                },
                timestamp: Date.now(),
                sessionId: state.currentSession.id,
                id: `presence-${Date.now()}`,
              };
              
              enhancedWebSocketService.send(presenceUpdate).catch(error => {
                console.warn('Enhanced presence update failed:', error);
              });
            }
          }, get().presenceUpdateFrequency);
        };

        // Return the enhanced store state and actions
        return {
          // Inherit base collaboration state
          ...useCollaborationStore.getState(),
          
          // Enhanced state
          connectionQuality: 'offline',
          lastSyncTimestamp: 0,
          syncInProgress: false,
          autoRecoveryEnabled: true,
          offlineQueue: [],
          conflictResolution: 'automatic',
          lastKnownGoodState: null,
          recoveryAttempts: 0,
          maxRecoveryAttempts: 5,
          operationHistory: [],
          messageLatency: 0,
          networkMetrics: {
            packetsLost: 0,
            averageLatency: 0,
            reconnectCount: 0,
            lastReconnect: 0,
          },
          userActivityStatus: new Map(),
          presenceUpdateFrequency: 5000, // 5 seconds
          sessionHeartbeat: Date.now(),
          participantStability: new Map(),

          // Enhanced actions
          enableAutoRecovery: () => {
            set(state => {
              state.autoRecoveryEnabled = true;
            });
          },

          disableAutoRecovery: () => {
            set(state => {
              state.autoRecoveryEnabled = false;
            });
          },

          forceSync: async () => {
            return get().performFullStateSync();
          },

          checkConnectionHealth: async () => {
            if (!enhancedWebSocketService) return false;
            
            try {
              const metrics = enhancedWebSocketService.getHealthMetrics();
              return metrics.circuitBreakerState === 'closed' && 
                     metrics.networkQuality.stability > 0.5;
            } catch {
              return false;
            }
          },

          getOfflineQueueSize: () => {
            return get().offlineQueue.length;
          },

          clearOfflineQueue: () => {
            set(state => {
              state.offlineQueue = [];
            });
          },

          processOfflineQueue: async () => {
            const state = get();
            
            if (state.offlineQueue.length === 0 || !enhancedWebSocketService?.isConnected()) {
              return;
            }

            // Process queued operations
            for (const operation of state.offlineQueue) {
              try {
                const operationMessage: WebSocketMessage = {
                  type: 'operation-apply',
                  payload: operation,
                  timestamp: Date.now(),
                  userId: state.currentUser?.id,
                  sessionId: state.currentSession?.id || '',
                  id: `queued-${operation.id}`,
                };
                
                await enhancedWebSocketService.send(operationMessage);
              } catch (error) {
                console.error('Failed to process queued operation:', error);
                // Keep failed operations in queue for retry
                return;
              }
            }

            // Clear queue after successful processing
            get().clearOfflineQueue();
          },

          attemptRecovery: async () => {
            const state = get();
            
            if (state.recoveryAttempts >= state.maxRecoveryAttempts) {
              throw new Error('Maximum recovery attempts exceeded');
            }

            set(draft => {
              draft.recoveryAttempts++;
            });

            try {
              // Initialize WebSocket if needed
              if (!enhancedWebSocketService) {
                initializeEnhancedWebSocket();
              }

              // Attempt connection
              await enhancedWebSocketService!.connect();
              
              // Wait a moment for connection to stabilize
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Perform sync recovery
              await enhancedWebSocketService!.forceSyncRecovery();
              
              set(draft => {
                draft.recoveryAttempts = 0;
                draft.error = null;
              });
              
              return true;
            } catch (error) {
              set(draft => {
                draft.error = `Recovery failed: ${error}`;
              });
              return false;
            }
          },

          resetToLastKnownGoodState: () => {
            // This would restore from persisted state or clear current state
            set(state => {
              state.annotations.clear();
              state.commentThreads.clear();
              state.userPresence.clear();
              state.offlineQueue = [];
              state.error = null;
            });
          },

          setConflictResolutionMode: (mode: 'manual' | 'automatic') => {
            set(state => {
              state.conflictResolution = mode;
            });
          },

          optimizeForNetworkConditions: () => {
            const state = get();
            
            // Adjust settings based on connection quality
            switch (state.connectionQuality) {
              case 'poor':
                set(draft => {
                  draft.presenceUpdateFrequency = 10000; // Reduce frequency
                });
                break;
              case 'good':
                set(draft => {
                  draft.presenceUpdateFrequency = 3000; // Increase frequency
                });
                break;
              case 'excellent':
                set(draft => {
                  draft.presenceUpdateFrequency = 1000; // High frequency
                });
                break;
            }
          },

          adjustPresenceUpdateFrequency: (frequency: number) => {
            set(state => {
              state.presenceUpdateFrequency = Math.max(1000, Math.min(frequency, 30000));
            });
          },

          performIncrementalSync: async () => {
            if (!enhancedWebSocketService?.isConnected()) {
              throw new Error('Not connected');
            }

            set(state => {
              state.syncInProgress = true;
            });

            const syncMessage: WebSocketMessage = {
              type: 'sync-request',
              payload: {
                type: 'incremental',
                since: get().lastSyncTimestamp,
              },
              timestamp: Date.now(),
              sessionId: get().currentSession?.id || '',
              id: `sync-incremental-${Date.now()}`,
            };

            await enhancedWebSocketService.send(syncMessage);
          },

          performFullStateSync: async () => {
            if (!enhancedWebSocketService?.isConnected()) {
              throw new Error('Not connected');
            }

            set(state => {
              state.syncInProgress = true;
            });

            const syncMessage: WebSocketMessage = {
              type: 'sync-request',
              payload: {
                type: 'full',
              },
              timestamp: Date.now(),
              sessionId: get().currentSession?.id || '',
              id: `sync-full-${Date.now()}`,
            };

            await enhancedWebSocketService.send(syncMessage);
          },

          getNetworkDiagnostics: () => {
            const state = get();
            return {
              connectionQuality: state.connectionQuality,
              messageLatency: state.messageLatency,
              networkMetrics: state.networkMetrics,
              connectionStatus: state.connectionStatus,
              lastSync: state.lastSyncTimestamp,
              offlineQueueSize: state.offlineQueue.length,
              recoveryAttempts: state.recoveryAttempts,
              wsHealth: enhancedWebSocketService?.getHealthMetrics(),
            };
          },

          getPerformanceMetrics: () => {
            const runtime = Date.now() - performanceMonitor.startTime;
            const avgLatency = performanceMonitor.messageCount > 0 
              ? performanceMonitor.latencySum / performanceMonitor.messageCount 
              : 0;
              
            return {
              runtime,
              messageCount: performanceMonitor.messageCount,
              errorCount: performanceMonitor.errorCount,
              errorRate: performanceMonitor.messageCount > 0 
                ? performanceMonitor.errorCount / performanceMonitor.messageCount 
                : 0,
              averageLatency: avgLatency,
              messagesPerSecond: performanceMonitor.messageCount / (runtime / 1000),
              operationHistorySize: get().operationHistory.length,
            };
          },

          exportDiagnosticReport: () => {
            const state = get();
            return {
              timestamp: new Date().toISOString(),
              session: {
                id: state.currentSession?.id,
                participantCount: state.currentSession?.participants.size || 0,
                lastActivity: state.currentSession?.lastActivity,
              },
              connection: get().getNetworkDiagnostics(),
              performance: get().getPerformanceMetrics(),
              state: {
                annotationCount: state.annotations.size,
                commentThreadCount: state.commentThreads.size,
                userPresenceCount: state.userPresence.size,
              },
            };
          },

          // Override base actions to use enhanced WebSocket service
          async connect() {
            initializeEnhancedWebSocket();
            if (enhancedWebSocketService) {
              await enhancedWebSocketService.connect();
              startSessionHeartbeat();
              startEnhancedPresenceUpdates();
            }
          },

          disconnect() {
            stopPeriodicSync();
            
            if (heartbeatTimer) {
              clearInterval(heartbeatTimer);
              heartbeatTimer = null;
            }
            
            if (presenceTimer) {
              clearInterval(presenceTimer);
              presenceTimer = null;
            }
            
            if (enhancedWebSocketService) {
              enhancedWebSocketService.disconnect();
            }
          },

          async reconnect() {
            if (enhancedWebSocketService) {
              await enhancedWebSocketService.reconnect();
            }
          },

          // Override join/leave session to use enhanced features
          async joinSession(sessionId: string, userInfo: Partial<CollaborationUser>) {
            initializeEnhancedWebSocket();
            
            // Call base implementation
            await useCollaborationStore.getState().joinSession(sessionId, userInfo);
            
            // Start enhanced features
            startSessionHeartbeat();
            startEnhancedPresenceUpdates();
          },

          async leaveSession() {
            // Stop enhanced features
            stopPeriodicSync();
            
            if (heartbeatTimer) {
              clearInterval(heartbeatTimer);
              heartbeatTimer = null;
            }
            
            if (presenceTimer) {
              clearInterval(presenceTimer);
              presenceTimer = null;
            }
            
            // Call base implementation
            await useCollaborationStore.getState().leaveSession();
          },
        };
      }),
      {
        name: 'enhanced-collaboration-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Persist only essential state
          currentUser: state.currentUser,
          autoRecoveryEnabled: state.autoRecoveryEnabled,
          conflictResolution: state.conflictResolution,
          presenceUpdateFrequency: state.presenceUpdateFrequency,
          offlineQueue: state.offlineQueue,
          lastKnownGoodState: state.lastKnownGoodState,
        }),
      }
    )
  )
);