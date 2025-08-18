/**
 * Offline request queue management hook
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import type { 
  QueuedRequest, 
  RequestQueueStatus 
} from '@/types/network';

import { useNetworkStatus } from './use-network-status';

/**
 * Storage key for persistent queue
 */
const QUEUE_STORAGE_KEY = 'offline-request-queue';

/**
 * Default batch size for processing requests
 */
const DEFAULT_BATCH_SIZE = 10;


/**
 * Load persisted queue from localStorage
 */
function loadPersistedQueue(): QueuedRequest[] {
  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.warn('Failed to load persisted queue:', error);
  }
  return [];
}

/**
 * Save persistent requests to localStorage
 */
function savePersistedQueue(queue: QueuedRequest[]): void {
  try {
    const persistentRequests = queue.filter(req => req.persistent);
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(persistentRequests));
  } catch (error) {
    console.warn('Failed to save queue to localStorage:', error);
  }
}

/**
 * Execute a queued request
 */
async function executeQueuedRequest(request: QueuedRequest): Promise<unknown> {
  const { url, method, headers, body } = request;
  
  const fetchOptions: RequestInit = {
    method,
    headers,
  };
  
  // Add body for non-GET requests
  if (body && method !== 'GET' && method !== 'HEAD') {
    if (typeof body === 'object') {
      fetchOptions.body = JSON.stringify(body);
      if (!headers || !headers['Content-Type']) {
        fetchOptions.headers = {
          ...headers,
          'Content-Type': 'application/json',
        };
      }
    } else {
      fetchOptions.body = String(body);
    }
  }
  
  const response = await fetch(url, fetchOptions);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  
  return await response.text();
}

/**
 * Hook for managing offline request queue
 */
export function useOfflineQueue() {
  const networkStatus = useNetworkStatus();
  const [queue, setQueue] = useState<QueuedRequest[]>([]);
  const [queueStatus, setQueueStatus] = useState<RequestQueueStatus>({
    pendingRequests: 0,
    highPriorityRequests: 0,
    isProcessing: false,
    lastSuccessfulRequest: 0,
    totalProcessed: 0,
    totalFailed: 0,
  });
  
  const processingRef = useRef(false);
  const mountedRef = useRef(true);

  /**
   * Load persisted queue on mount
   */
  useEffect(() => {
    const persistedQueue = loadPersistedQueue();
    if (persistedQueue.length > 0) {
      setQueue(persistedQueue);
      console.log(`[useOfflineQueue] Loaded ${persistedQueue.length} persisted requests`);
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Update queue status when queue changes
   */
  useEffect(() => {
    const highPriorityRequests = queue.filter(req => req.priority >= 5).length;
    
    setQueueStatus(prev => ({
      ...prev,
      pendingRequests: queue.length,
      highPriorityRequests,
    }));
  }, [queue]);

  /**
   * Persist queue changes to localStorage
   */
  useEffect(() => {
    savePersistedQueue(queue);
  }, [queue]);

  /**
   * Execute request immediately without queueing
   */
  const executeImmediately = useCallback(async (request: QueuedRequest): Promise<void> => {
    try {
      const result = await executeQueuedRequest(request);
      
      setQueueStatus(prev => ({
        ...prev,
        lastSuccessfulRequest: Date.now(),
        totalProcessed: prev.totalProcessed + 1,
      }));
      
      // Call resolve callback if provided
      if (request.resolve) {
        request.resolve(result);
      }
      
      console.log(`[useOfflineQueue] Executed request ${request.id} immediately`);
    } catch (error) {
      console.error(`[useOfflineQueue] Failed to execute request ${request.id}:`, error);
      
      // Add to queue for retry if it's a retryable error
      if (request.retryCount < request.maxRetries) {
        setQueue(prev => [...prev, {
          ...request,
          retryCount: request.retryCount + 1,
        }]);
      } else {
        setQueueStatus(prev => ({
          ...prev,
          totalFailed: prev.totalFailed + 1,
        }));
        
        // Call reject callback if provided
        if (request.reject) {
          request.reject(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }
  }, []);

  /**
   * Add request to queue or execute immediately if online
   */
  const queueRequest = useCallback((
    requestData: Omit<QueuedRequest, 'id' | 'queuedAt' | 'retryCount'>
  ): string => {
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedRequest: QueuedRequest = {
      ...requestData,
      id: requestId,
      queuedAt: Date.now(),
      retryCount: 0,
    };

    // If online, try to execute immediately
    if (networkStatus.isOnline) {
      executeImmediately(queuedRequest);
    } else {
      // Add to queue for later processing
      setQueue(prev => {
        const newQueue = [...prev, queuedRequest];
        // Sort by priority (higher first) then by queue time
        return newQueue.sort((a, b) => {
          if (a.priority !== b.priority) {
            return b.priority - a.priority;
          }
          return a.queuedAt - b.queuedAt;
        });
      });
      
      console.log(`[useOfflineQueue] Queued request ${requestId} (offline)`);
    }
    
    return requestId;
  }, [networkStatus.isOnline, executeImmediately]);

  /**
   * Cancel a queued request
   */
  const cancelRequest = useCallback((requestId: string): boolean => {
    const initialLength = queue.length;
    
    setQueue(prev => prev.filter(req => req.id !== requestId));
    
    const wasCancelled = queue.length < initialLength;
    if (wasCancelled) {
      console.log(`[useOfflineQueue] Cancelled request ${requestId}`);
    }
    
    return wasCancelled;
  }, [queue.length]);

  /**
   * Clear entire queue
   */
  const clearQueue = useCallback(() => {
    const clearedCount = queue.length;
    setQueue([]);
    console.log(`[useOfflineQueue] Cleared ${clearedCount} requests from queue`);
  }, [queue.length]);

  /**
   * Process queue when online
   */
  const processQueue = useCallback(async (): Promise<void> => {
    if (!networkStatus.isOnline || processingRef.current || queue.length === 0) {
      return;
    }

    processingRef.current = true;
    setQueueStatus(prev => ({ ...prev, isProcessing: true }));
    
    console.log(`[useOfflineQueue] Processing ${queue.length} queued requests`);

    try {
      // Process in batches to avoid overwhelming the network
      const batchSize = DEFAULT_BATCH_SIZE;
      const requestsToProcess = [...queue];
      
      for (let i = 0; i < requestsToProcess.length; i += batchSize) {
        if (!mountedRef.current || !networkStatus.isOnline) {
          break;
        }
        
        const batch = requestsToProcess.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (request) => {
            try {
              const result = await executeQueuedRequest(request);
              
              // Remove from queue
              setQueue(prev => prev.filter(req => req.id !== request.id));
              
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
              
              console.log(`[useOfflineQueue] Successfully processed request ${request.id}`);
            } catch (error) {
              console.error(`[useOfflineQueue] Failed to process request ${request.id}:`, error);
              
              // Increment retry count
              const updatedRequest = {
                ...request,
                retryCount: request.retryCount + 1,
              };
              
              if (updatedRequest.retryCount < updatedRequest.maxRetries) {
                // Keep in queue for retry
                setQueue(prev => 
                  prev.map(req => req.id === request.id ? updatedRequest : req)
                );
              } else {
                // Remove from queue and mark as failed
                setQueue(prev => prev.filter(req => req.id !== request.id));
                
                setQueueStatus(prev => ({
                  ...prev,
                  totalFailed: prev.totalFailed + 1,
                }));
                
                // Call reject callback
                if (request.reject) {
                  request.reject(error instanceof Error ? error : new Error(String(error)));
                }
              }
            }
          })
        );
        
        // Small delay between batches to prevent overwhelming
        if (i + batchSize < requestsToProcess.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } finally {
      processingRef.current = false;
      setQueueStatus(prev => ({ ...prev, isProcessing: false }));
    }
  }, [networkStatus.isOnline, queue]);

  /**
   * Auto-process queue when coming online
   */
  useEffect(() => {
    const handleOnline = () => {
      console.log('[useOfflineQueue] Network came online, processing queue');
      processQueue();
    };

    if (networkStatus.isOnline && queue.length > 0 && !processingRef.current) {
      // Small delay to allow network stabilization
      const timer = setTimeout(() => {
        processQueue();
      }, 1000);
      
      return () => clearTimeout(timer);
    }

    // Listen for online events
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [networkStatus.isOnline, queue.length, processQueue]);

  return {
    queueStatus,
    queueRequest,
    cancelRequest,
    clearQueue,
    processQueue,
  };
}