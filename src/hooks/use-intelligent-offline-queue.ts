/**
 * Intelligent offline queue management with conflict resolution
 * Advanced queue management with smart retry strategies, conflict detection, and data synchronization
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import type { 
  QueuedRequest, 
  RequestQueueStatus,
  NetworkRetryPolicy,
  RetryStrategy,
} from '@/types/network';

import { useNetworkStatus } from './use-network-status';

/**
 * Conflict resolution strategies
 */
export type ConflictResolutionStrategy = 
  | 'overwrite'     // Overwrite server data with local data
  | 'merge'         // Attempt to merge local and server data
  | 'prompt'        // Prompt user to choose resolution
  | 'preserve'      // Keep server data, discard local changes
  | 'version'       // Use version/timestamp comparison
  | 'manual';       // Manual resolution required

/**
 * Request conflict information
 */
export interface RequestConflict {
  requestId: string;
  localData: unknown;
  serverData: unknown;
  conflictType: 'data' | 'version' | 'deletion' | 'concurrent';
  timestamp: number;
  resolutionStrategy: ConflictResolutionStrategy;
  resolved: boolean;
  userChoice?: 'local' | 'server' | 'merge';
}

/**
 * Enhanced queued request with conflict handling
 */
export interface IntelligentQueuedRequest extends QueuedRequest {
  originalData?: unknown;
  expectedVersion?: string | number;
  conflictStrategy: ConflictResolutionStrategy;
  dependencies?: string[]; // IDs of requests this depends on
  idempotent: boolean;
  lastModified?: number;
  etag?: string;
  optimisticUpdate?: boolean;
}

/**
 * Request batch for efficient processing
 */
export interface RequestBatch {
  id: string;
  requests: IntelligentQueuedRequest[];
  priority: number;
  estimatedDuration: number;
  canProcessInParallel: boolean;
}

/**
 * Enhanced queue status with conflict information
 */
export interface IntelligentQueueStatus extends RequestQueueStatus {
  conflicts: RequestConflict[];
  batches: RequestBatch[];
  estimatedSyncTime: number;
  dataIntegrityScore: number;
  conflictResolutionsPending: number;
}

/**
 * Sync strategies for different scenarios
 */
export interface SyncStrategy {
  name: string;
  description: string;
  batchSize: number;
  parallelRequests: number;
  retryPolicy: NetworkRetryPolicy;
  conflictStrategy: ConflictResolutionStrategy;
  enableOptimisticUpdates: boolean;
}

/**
 * Storage key constants
 */
const QUEUE_STORAGE_KEY = 'intelligent-offline-queue';
const CONFLICTS_STORAGE_KEY = 'offline-queue-conflicts';
const SYNC_STATE_STORAGE_KEY = 'sync-state';

/**
 * Default sync strategies for different network conditions
 */
const SYNC_STRATEGIES: Record<string, SyncStrategy> = {
  fast: {
    name: 'Fast Network',
    description: 'Optimised for fast, reliable connections',
    batchSize: 10,
    parallelRequests: 5,
    retryPolicy: {
      strategy: 'exponential',
      maxRetries: 3,
      baseDelay: 500,
      maxDelay: 5000,
      backoffMultiplier: 2,
      adaptToNetwork: true,
      requestTimeout: 5000,
    },
    conflictStrategy: 'version',
    enableOptimisticUpdates: true,
  },
  slow: {
    name: 'Slow Network',
    description: 'Conservative approach for unreliable connections',
    batchSize: 3,
    parallelRequests: 2,
    retryPolicy: {
      strategy: 'adaptive',
      maxRetries: 5,
      baseDelay: 2000,
      maxDelay: 30000,
      backoffMultiplier: 1.5,
      adaptToNetwork: true,
      requestTimeout: 15000,
    },
    conflictStrategy: 'prompt',
    enableOptimisticUpdates: false,
  },
  offline: {
    name: 'Offline Mode',
    description: 'Queue everything for later synchronisation',
    batchSize: 50,
    parallelRequests: 1,
    retryPolicy: {
      strategy: 'none',
      maxRetries: 0,
      baseDelay: 0,
      maxDelay: 0,
      backoffMultiplier: 1,
      adaptToNetwork: false,
      requestTimeout: 1000,
    },
    conflictStrategy: 'merge',
    enableOptimisticUpdates: true,
  },
};

/**
 * Detect conflicts between local and server data
 */
function detectConflict(
  localRequest: IntelligentQueuedRequest,
  serverResponse: Response
): RequestConflict | null {
  // If request succeeded without conflict, no conflict exists
  if (serverResponse.ok) {
    return null;
  }

  // Check for version conflicts (412 Precondition Failed)
  if (serverResponse.status === 412) {
    return {
      requestId: localRequest.id,
      localData: localRequest.body,
      serverData: null, // Would need to fetch current server state
      conflictType: 'version',
      timestamp: Date.now(),
      resolutionStrategy: localRequest.conflictStrategy,
      resolved: false,
    };
  }

  // Check for concurrent modification (409 Conflict)
  if (serverResponse.status === 409) {
    return {
      requestId: localRequest.id,
      localData: localRequest.body,
      serverData: null, // Would be provided in response body
      conflictType: 'concurrent',
      timestamp: Date.now(),
      resolutionStrategy: localRequest.conflictStrategy,
      resolved: false,
    };
  }

  return null;
}

/**
 * Resolve conflicts based on strategy
 */
async function resolveConflict(
  conflict: RequestConflict,
  request: IntelligentQueuedRequest
): Promise<{ resolved: boolean; resolvedData?: unknown }> {
  switch (conflict.resolutionStrategy) {
    case 'overwrite':
      return { resolved: true, resolvedData: conflict.localData };
    
    case 'preserve':
      return { resolved: true, resolvedData: conflict.serverData };
    
    case 'merge':
      // Simple merge strategy - in practice would be more sophisticated
      if (
        typeof conflict.localData === 'object' && 
        typeof conflict.serverData === 'object' &&
        conflict.localData !== null &&
        conflict.serverData !== null
      ) {
        const merged = { ...conflict.serverData, ...conflict.localData };
        return { resolved: true, resolvedData: merged };
      }
      return { resolved: false };
    
    case 'version':
      // Compare timestamps/versions
      if (request.lastModified && typeof conflict.serverData === 'object') {
        const serverData = conflict.serverData as { lastModified?: number };
        if (serverData.lastModified && request.lastModified > serverData.lastModified) {
          return { resolved: true, resolvedData: conflict.localData };
        }
      }
      return { resolved: true, resolvedData: conflict.serverData };
    
    case 'prompt':
      // Would trigger UI for user decision
      return { resolved: false };
    
    case 'manual':
      // Requires manual intervention
      return { resolved: false };
    
    default:
      return { resolved: false };
  }
}

/**
 * Create request batches for efficient processing
 */
function createRequestBatches(
  requests: IntelligentQueuedRequest[],
  strategy: SyncStrategy
): RequestBatch[] {
  const batches: RequestBatch[] = [];
  const processed = new Set<string>();
  
  // Sort by priority and dependencies
  const sortedRequests = [...requests].sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority; // Higher priority first
    }
    return a.queuedAt - b.queuedAt; // Older first
  });

  let batchId = 0;
  
  while (processed.size < requests.length) {
    const batch: IntelligentQueuedRequest[] = [];
    const batchDependencies = new Set<string>();
    
    for (const request of sortedRequests) {
      if (processed.has(request.id)) continue;
      
      // Check if dependencies are satisfied
      const dependenciesSatisfied = !request.dependencies || 
        request.dependencies.every(dep => processed.has(dep));
      
      if (!dependenciesSatisfied) continue;
      
      // Check if adding this request would create conflicts
      const hasConflicts = request.dependencies?.some(dep => 
        batchDependencies.has(dep)
      );
      
      if (hasConflicts) continue;
      
      // Check batch size limit
      if (batch.length >= strategy.batchSize) break;
      
      batch.push(request);
      processed.add(request.id);
      
      if (request.dependencies) {
        request.dependencies.forEach(dep => batchDependencies.add(dep));
      }
    }
    
    if (batch.length === 0) {
      // Prevent infinite loops - process remaining requests individually
      const remaining = sortedRequests.find(r => !processed.has(r.id));
      if (remaining) {
        batch.push(remaining);
        processed.add(remaining.id);
      }
    }
    
    if (batch.length > 0) {
      batches.push({
        id: `batch-${batchId++}`,
        requests: batch,
        priority: Math.max(...batch.map(r => r.priority)),
        estimatedDuration: batch.length * 1000, // Rough estimate
        canProcessInParallel: batch.every(r => r.idempotent),
      });
    }
  }
  
  return batches;
}

/**
 * Load persisted queue and conflicts
 */
function loadPersistedData(): {
  queue: IntelligentQueuedRequest[];
  conflicts: RequestConflict[];
} {
  try {
    const queueData = localStorage.getItem(QUEUE_STORAGE_KEY);
    const conflictsData = localStorage.getItem(CONFLICTS_STORAGE_KEY);
    
    const queue = queueData ? JSON.parse(queueData) : [];
    const conflicts = conflictsData ? JSON.parse(conflictsData) : [];
    
    return {
      queue: Array.isArray(queue) ? queue : [],
      conflicts: Array.isArray(conflicts) ? conflicts : [],
    };
  } catch (error) {
    console.warn('Failed to load persisted offline data:', error);
    return { queue: [], conflicts: [] };
  }
}

/**
 * Save queue and conflicts to storage
 */
function savePersistedData(
  queue: IntelligentQueuedRequest[],
  conflicts: RequestConflict[]
): void {
  try {
    const persistentRequests = queue.filter(req => req.persistent);
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(persistentRequests));
    localStorage.setItem(CONFLICTS_STORAGE_KEY, JSON.stringify(conflicts));
  } catch (error) {
    console.warn('Failed to save offline data:', error);
  }
}

/**
 * Intelligent offline queue hook with conflict resolution
 */
export function useIntelligentOfflineQueue() {
  const networkStatus = useNetworkStatus();
  const [queue, setQueue] = useState<IntelligentQueuedRequest[]>([]);
  const [conflicts, setConflicts] = useState<RequestConflict[]>([]);
  const [queueStatus, setQueueStatus] = useState<IntelligentQueueStatus>({
    pendingRequests: 0,
    highPriorityRequests: 0,
    isProcessing: false,
    lastSuccessfulRequest: 0,
    totalProcessed: 0,
    totalFailed: 0,
    conflicts: [],
    batches: [],
    estimatedSyncTime: 0,
    dataIntegrityScore: 100,
    conflictResolutionsPending: 0,
  });
  
  const processingRef = useRef(false);
  const mountedRef = useRef(true);

  // Load persisted data on mount
  useEffect(() => {
    const { queue: persistedQueue, conflicts: persistedConflicts } = loadPersistedData();
    
    if (persistedQueue.length > 0) {
      setQueue(persistedQueue);
    }
    
    if (persistedConflicts.length > 0) {
      setConflicts(persistedConflicts);
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Update queue status when queue or conflicts change
  useEffect(() => {
    const currentStrategy = getCurrentSyncStrategy(networkStatus);
    const batches = createRequestBatches(queue, currentStrategy);
    const highPriorityRequests = queue.filter(req => req.priority >= 7).length;
    const unresolvedConflicts = conflicts.filter(c => !c.resolved).length;
    
    // Calculate data integrity score
    const totalRequests = queue.length + conflicts.length;
    const problematicRequests = unresolvedConflicts + queue.filter(r => !r.idempotent).length;
    const dataIntegrityScore = totalRequests > 0 
      ? Math.max(0, 100 - (problematicRequests / totalRequests) * 100)
      : 100;

    setQueueStatus(prev => ({
      ...prev,
      pendingRequests: queue.length,
      highPriorityRequests,
      conflicts,
      batches,
      estimatedSyncTime: batches.reduce((sum, batch) => sum + batch.estimatedDuration, 0),
      dataIntegrityScore: Math.round(dataIntegrityScore),
      conflictResolutionsPending: unresolvedConflicts,
    }));
  }, [queue, conflicts, networkStatus]);

  // Persist changes
  useEffect(() => {
    savePersistedData(queue, conflicts);
  }, [queue, conflicts]);

  /**
   * Get current sync strategy based on network conditions
   */
  const getCurrentSyncStrategy = useCallback((status: typeof networkStatus): SyncStrategy => {
    if (!status.isOnline) {
      return SYNC_STRATEGIES.offline;
    }
    
    if (status.isSlowConnection || status.connectionQuality === 'slow') {
      return SYNC_STRATEGIES.slow;
    }
    
    return SYNC_STRATEGIES.fast;
  }, []);

  /**
   * Execute a request with conflict detection
   */
  const executeRequestWithConflictDetection = useCallback(async (
    request: IntelligentQueuedRequest
  ): Promise<{ success: boolean; conflict?: RequestConflict; result?: unknown }> => {
    try {
      const fetchOptions: RequestInit = {
        method: request.method,
        headers: request.headers,
      };

      // Add conditional headers for conflict detection
      if (request.etag) {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          'If-Match': request.etag,
        };
      }

      if (request.lastModified) {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          'If-Unmodified-Since': new Date(request.lastModified).toUTCString(),
        };
      }

      // Add body for non-GET requests
      if (request.body && request.method !== 'GET' && request.method !== 'HEAD') {
        if (typeof request.body === 'object') {
          fetchOptions.body = JSON.stringify(request.body);
          fetchOptions.headers = {
            ...fetchOptions.headers,
            'Content-Type': 'application/json',
          };
        } else {
          fetchOptions.body = String(request.body);
        }
      }

      const response = await fetch(request.url, fetchOptions);
      
      // Check for conflicts
      const conflict = detectConflict(request, response);
      if (conflict) {
        return { success: false, conflict };
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      const result = contentType && contentType.includes('application/json')
        ? await response.json()
        : await response.text();

      return { success: true, result };
      
    } catch (error) {
      throw error;
    }
  }, []);

  /**
   * Queue an intelligent request
   */
  const queueIntelligentRequest = useCallback((
    requestData: Omit<IntelligentQueuedRequest, 'id' | 'queuedAt' | 'retryCount'>
  ): string => {
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedRequest: IntelligentQueuedRequest = {
      ...requestData,
      id: requestId,
      queuedAt: Date.now(),
      retryCount: 0,
    };

    // If online and no dependencies, try immediate execution
    if (networkStatus.isOnline && !queuedRequest.dependencies?.length) {
      executeRequestWithConflictDetection(queuedRequest)
        .then(({ success, conflict, result }) => {
          if (success) {
            setQueueStatus(prev => ({
              ...prev,
              lastSuccessfulRequest: Date.now(),
              totalProcessed: prev.totalProcessed + 1,
            }));
            
            if (queuedRequest.resolve) {
              queuedRequest.resolve(result);
            }
          } else if (conflict) {
            setConflicts(prev => [...prev, conflict]);
          }
        })
        .catch(() => {
          // Add to queue on failure
          setQueue(prev => {
            const newQueue = [...prev, queuedRequest];
            return newQueue.sort((a, b) => {
              if (a.priority !== b.priority) {
                return b.priority - a.priority;
              }
              return a.queuedAt - b.queuedAt;
            });
          });
        });
    } else {
      // Add to queue
      setQueue(prev => {
        const newQueue = [...prev, queuedRequest];
        return newQueue.sort((a, b) => {
          if (a.priority !== b.priority) {
            return b.priority - a.priority;
          }
          return a.queuedAt - b.queuedAt;
        });
      });
    }
    
    return requestId;
  }, [networkStatus.isOnline, executeRequestWithConflictDetection]);

  /**
   * Resolve a conflict manually
   */
  const resolveConflictManually = useCallback((
    conflictId: string,
    resolution: 'local' | 'server' | 'merge'
  ): void => {
    setConflicts(prev => prev.map(conflict => 
      conflict.requestId === conflictId
        ? { ...conflict, resolved: true, userChoice: resolution }
        : conflict
    ));
  }, []);

  /**
   * Process queue with intelligent batching and conflict resolution
   */
  const processQueueIntelligently = useCallback(async (): Promise<void> => {
    if (!networkStatus.isOnline || processingRef.current || queue.length === 0) {
      return;
    }

    processingRef.current = true;
    setQueueStatus(prev => ({ ...prev, isProcessing: true }));

    try {
      const strategy = getCurrentSyncStrategy(networkStatus);
      const batches = createRequestBatches(queue, strategy);
      
      for (const batch of batches) {
        if (!mountedRef.current || !networkStatus.isOnline) {
          break;
        }

        const batchPromises = batch.requests.map(async (request) => {
          try {
            const { success, conflict, result } = await executeRequestWithConflictDetection(request);
            
            if (success) {
              // Remove from queue
              setQueue(prev => prev.filter(r => r.id !== request.id));
              
              // Update stats
              setQueueStatus(prev => ({
                ...prev,
                lastSuccessfulRequest: Date.now(),
                totalProcessed: prev.totalProcessed + 1,
              }));
              
              // Call resolve callback
              if (request.resolve) {
                request.resolve(result);
              }
              
              return { success: true, requestId: request.id };
              
            } else if (conflict) {
              // Handle conflict
              const resolution = await resolveConflict(conflict, request);
              
              if (resolution.resolved) {
                // Retry with resolved data
                const resolvedRequest = {
                  ...request,
                  body: resolution.resolvedData,
                  retryCount: request.retryCount + 1,
                };
                
                const retryResult = await executeRequestWithConflictDetection(resolvedRequest);
                
                if (retryResult.success) {
                  setQueue(prev => prev.filter(r => r.id !== request.id));
                  setQueueStatus(prev => ({
                    ...prev,
                    lastSuccessfulRequest: Date.now(),
                    totalProcessed: prev.totalProcessed + 1,
                  }));
                  
                  if (request.resolve) {
                    request.resolve(retryResult.result);
                  }
                } else {
                  setConflicts(prev => [...prev, conflict]);
                }
              } else {
                // Add unresolved conflict
                setConflicts(prev => [...prev, conflict]);
              }
              
              return { success: false, requestId: request.id, conflict };
            }
            
          } catch (error) {
            console.error(`Failed to process request ${request.id}:`, error);
            
            // Update retry count or remove if max retries exceeded
            if (request.retryCount < request.maxRetries) {
              setQueue(prev => prev.map(r => 
                r.id === request.id 
                  ? { ...r, retryCount: r.retryCount + 1 }
                  : r
              ));
            } else {
              setQueue(prev => prev.filter(r => r.id !== request.id));
              setQueueStatus(prev => ({
                ...prev,
                totalFailed: prev.totalFailed + 1,
              }));
              
              if (request.reject) {
                request.reject(error instanceof Error ? error : new Error(String(error)));
              }
            }
            
            return { success: false, requestId: request.id, error };
          }
        });

        // Wait for batch to complete
        if (batch.canProcessInParallel) {
          await Promise.allSettled(batchPromises);
        } else {
          for (const promise of batchPromises) {
            await promise;
          }
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } finally {
      processingRef.current = false;
      setQueueStatus(prev => ({ ...prev, isProcessing: false }));
    }
  }, [networkStatus, queue, getCurrentSyncStrategy, executeRequestWithConflictDetection]);

  /**
   * Clear all data
   */
  const clearAll = useCallback(() => {
    setQueue([]);
    setConflicts([]);
    localStorage.removeItem(QUEUE_STORAGE_KEY);
    localStorage.removeItem(CONFLICTS_STORAGE_KEY);
  }, []);

  // Auto-process queue when coming online
  useEffect(() => {
    if (networkStatus.isOnline && queue.length > 0 && !processingRef.current) {
      const timer = setTimeout(() => {
        processQueueIntelligently();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [networkStatus.isOnline, queue.length, processQueueIntelligently]);

  return {
    queueStatus,
    conflicts,
    queueIntelligentRequest,
    resolveConflictManually,
    processQueueIntelligently,
    clearAll,
    getCurrentSyncStrategy: () => getCurrentSyncStrategy(networkStatus),
  };
}