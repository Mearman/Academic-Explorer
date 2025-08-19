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
    const currentQueue = queue;
    const requestExists = currentQueue.some(req => req.id === requestId);
    
    if (!requestExists) {
      console.log(`[useOfflineQueue] Request ${requestId} not found in queue`);
      return false;
    }
    
    setQueue(prev => prev.filter(req => req.id !== requestId));
    
    console.log(`[useOfflineQueue] Cancelled request ${requestId}`);
    return true;
  }, [queue]);

  /**
   * Clear entire queue
   */
  const clearQueue = useCallback(() => {
    setQueue(prev => {
      const clearedCount = prev.length;
      console.log(`[useOfflineQueue] Cleared ${clearedCount} requests from queue`);
      return [];
    });
  }, []);

  /**
   * Process queue when online
   */
  const processQueue = useCallback(async (): Promise<void> => {
    if (!networkStatus.isOnline || processingRef.current) {
      return;
    }

    // Get current queue length for early return
    const currentQueueLength = queue.length;
    if (currentQueueLength === 0) {
      return;
    }

    processingRef.current = true;
    setQueueStatus(prev => ({ ...prev, isProcessing: true }));
    
    console.log(`[useOfflineQueue] Processing ${currentQueueLength} queued requests`);

    try {
      // Get snapshot of queue to process
      const requestsToProcess = [...queue];
      
      // Process each request individually with proper retry logic
      for (const request of requestsToProcess) {
        if (!mountedRef.current || !networkStatus.isOnline) {
          break;
        }
        
        let currentRequest = request;
        let attemptCount = 0;
        const {maxRetries} = currentRequest;
        
        // Loop for initial attempt + retries
        while (attemptCount <= maxRetries) {
          try {
            const result = await executeQueuedRequest(currentRequest);
            
            // Success: Remove from queue and update stats
            setQueue(prev => prev.filter(req => req.id !== currentRequest.id));
            
            setQueueStatus(prev => ({
              ...prev,
              lastSuccessfulRequest: Date.now(),
              totalProcessed: prev.totalProcessed + 1,
            }));
            
            // Call resolve callback
            if (currentRequest.resolve) {
              currentRequest.resolve(result);
            }
            
            console.log(`[useOfflineQueue] Successfully processed request ${currentRequest.id}`);
            break; // Success, exit retry loop
            
          } catch (error) {
            console.error(`[useOfflineQueue] Failed to process request ${currentRequest.id} (attempt ${attemptCount + 1}):`, error);
            
            attemptCount++;
            
            if (attemptCount <= maxRetries) {
              // Update retry count in queue
              const updatedRequest = {
                ...currentRequest,
                retryCount: attemptCount,
              };
              
              setQueue(prev => 
                prev.map(req => req.id === currentRequest.id ? updatedRequest : req)
              );
              
              currentRequest = updatedRequest;
              
              // Add small delay before retry
              await new Promise(resolve => setTimeout(resolve, 100));
            } else {
              // Max retries exceeded: Remove from queue and mark as failed
              setQueue(prev => prev.filter(req => req.id !== currentRequest.id));
              
              setQueueStatus(prev => ({
                ...prev,
                totalFailed: prev.totalFailed + 1,
              }));
              
              // Call reject callback
              if (currentRequest.reject) {
                currentRequest.reject(error instanceof Error ? error : new Error(String(error)));
              }
              
              break; // Exit the retry loop
            }
          }
        }
        
        // Small delay between requests to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 50));
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