/**
 * React hook for entity prefetching
 * 
 * Provides component-level cache warming functionality with:
 * - Prefetch function for manual triggering
 * - Loading state tracking
 * - Queue management
 * - Error handling
 * - Background prefetching support
 */

import { useState, useCallback, useRef, useEffect } from 'react';

import { 
  cacheWarmingService, 
  type PrefetchOptions,
  type CacheWarmingStrategy,
  CacheWarmingStrategy as Strategy
} from '@/lib/openalex/cache-warming';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

export interface UsePrefetchEntityOptions {
  strategy?: CacheWarmingStrategy;
  maxQueueSize?: number;
  enableBackgroundPrefetch?: boolean;
  priority?: 'low' | 'normal' | 'high';
  timeout?: number;
}

export interface UsePrefetchEntityReturn {
  prefetch: (entityId: string, entityType?: EntityType, options?: PrefetchOptions) => Promise<void>;
  isPrefetching: boolean;
  prefetchQueue: string[];
  clearQueue: () => void;
  prefetchError: Error | null;
  prefetchedCount: number;
}

/**
 * React hook for entity prefetching
 */
export function usePrefetchEntity(options: UsePrefetchEntityOptions = {}): UsePrefetchEntityReturn {
  const {
    strategy = Strategy.CONSERVATIVE,
    maxQueueSize = 50,
    priority = 'normal',
    timeout = 10000,
  } = options;

  const [isPrefetching, setIsPrefetching] = useState(false);
  const [prefetchQueue, setPrefetchQueue] = useState<string[]>([]);
  const [prefetchError, setPrefetchError] = useState<Error | null>(null);
  const [prefetchedCount, setPrefetchedCount] = useState(0);

  const mountedRef = useRef(true);
  const activeRequests = useRef(new Set<string>());

  // Cleanup on unmount
  useEffect(() => {
    const mountedRefCurrent = mountedRef;
    const activeRequestsCurrent = activeRequests;
    
    mountedRefCurrent.current = true;
    return () => {
      mountedRefCurrent.current = false;
      activeRequestsCurrent.current.clear();
    };
  }, []);

  /**
   * Prefetch a single entity
   */
  const prefetch = useCallback(async (
    entityId: string, 
    entityType?: EntityType, 
    prefetchOptions: PrefetchOptions = {}
  ): Promise<void> => {
    if (!mountedRef.current) {
      return;
    }

    // Skip if strategy is OFF
    if (strategy === Strategy.OFF) {
      console.log(`[usePrefetchEntity] Prefetching disabled (strategy: OFF)`);
      return;
    }

    // Skip if already being prefetched
    if (activeRequests.current.has(entityId)) {
      console.log(`[usePrefetchEntity] Skipping duplicate prefetch for ${entityId}`);
      return;
    }

    // Check queue size limit
    if (prefetchQueue.length >= maxQueueSize) {
      console.warn(`[usePrefetchEntity] Queue size limit reached (${maxQueueSize}), skipping ${entityId}`);
      return;
    }

    try {
      // Add to queue
      setPrefetchQueue(prev => {
        if (!prev.includes(entityId)) {
          return [...prev, entityId];
        }
        return prev;
      });

      // Add to active requests
      activeRequests.current.add(entityId);

      // Set loading state
      setIsPrefetching(true);
      setPrefetchError(null);

      console.log(`[usePrefetchEntity] Starting prefetch for ${entityId}`);

      // Merge options with defaults
      const finalOptions: PrefetchOptions = {
        priority,
        timeout,
        strategy,
        ...prefetchOptions,
      };

      // Call the cache warming service
      await cacheWarmingService.prefetchEntity(entityId, entityType, finalOptions);

      if (mountedRef.current) {
        console.log(`[usePrefetchEntity] Successfully prefetched ${entityId}`);
        setPrefetchedCount(prev => prev + 1);
      }

    } catch (error) {
      if (mountedRef.current) {
        const prefetchError = error instanceof Error ? error : new Error(String(error));
        console.error(`[usePrefetchEntity] Failed to prefetch ${entityId}:`, prefetchError);
        setPrefetchError(prefetchError);
      }
    } finally {
      if (mountedRef.current) {
        // Remove from queue
        setPrefetchQueue(prev => prev.filter(id => id !== entityId));
        
        // Remove from active requests
        activeRequests.current.delete(entityId);

        // Update loading state
        setIsPrefetching(activeRequests.current.size > 0);
      }
    }
  }, [strategy, maxQueueSize, priority, timeout, prefetchQueue.length]);

  /**
   * Clear the prefetch queue
   */
  const clearQueue = useCallback((): void => {
    setPrefetchQueue([]);
    setPrefetchError(null);
    activeRequests.current.clear();
    setIsPrefetching(false);
  }, []);

  return {
    prefetch,
    isPrefetching,
    prefetchQueue,
    clearQueue,
    prefetchError,
    prefetchedCount,
  };
}

/**
 * Hook for batch prefetching with progress tracking
 */
export interface UseBatchPrefetchOptions {
  maxConcurrency?: number;
  batchSize?: number;
  strategy?: CacheWarmingStrategy;
  onProgress?: (progress: { completed: number; total: number; errors: string[] }) => void;
  onError?: (error: Error, entityId: string) => void;
}

export interface UseBatchPrefetchReturn {
  batchPrefetch: (entityIds: string[]) => Promise<void>;
  isBatchPrefetching: boolean;
  batchProgress: { completed: number; total: number; errors: string[] } | null;
  cancelBatch: () => void;
}

export function useBatchPrefetch(options: UseBatchPrefetchOptions = {}): UseBatchPrefetchReturn {
  const {
    maxConcurrency = 5,
    batchSize = 10,
    strategy = Strategy.CONSERVATIVE,
    onProgress,
    onError,
  } = options;

  const [isBatchPrefetching, setIsBatchPrefetching] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ completed: number; total: number; errors: string[] } | null>(null);

  const mountedRef = useRef(true);
  const cancelRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelRef.current = true;
    };
  }, []);

  const batchPrefetch = useCallback(async (entityIds: string[]): Promise<void> => {
    if (!mountedRef.current || strategy === Strategy.OFF) {
      return;
    }

    try {
      setIsBatchPrefetching(true);
      cancelRef.current = false;
      
      const progress = { completed: 0, total: entityIds.length, errors: [] };
      setBatchProgress(progress);

      console.log(`[useBatchPrefetch] Starting batch prefetch for ${entityIds.length} entities`);

      const result = await cacheWarmingService.warmCache(entityIds, {
        maxConcurrency,
        batchSize,
        strategy,
        onProgress: (progressUpdate) => {
          if (!mountedRef.current || cancelRef.current) {
            return;
          }

          setBatchProgress(progressUpdate);
          
          if (onProgress) {
            onProgress(progressUpdate);
          }
        },
        onError,
      });

      if (mountedRef.current && !cancelRef.current) {
        console.log(`[useBatchPrefetch] Batch prefetch completed: ${result.successful.length} successful, ${result.failed.length} failed`);
      }

    } catch (error) {
      if (mountedRef.current) {
        console.error('[useBatchPrefetch] Batch prefetch failed:', error);
      }
    } finally {
      if (mountedRef.current) {
        setIsBatchPrefetching(false);
      }
    }
  }, [maxConcurrency, batchSize, strategy, onProgress, onError]);

  const cancelBatch = useCallback((): void => {
    cancelRef.current = true;
    setIsBatchPrefetching(false);
    setBatchProgress(null);
    console.log('[useBatchPrefetch] Batch prefetch cancelled');
  }, []);

  return {
    batchPrefetch,
    isBatchPrefetching,
    batchProgress,
    cancelBatch,
  };
}

/**
 * Hook for automatic prefetching based on entity relationships
 */
export interface UseRelatedPrefetchOptions {
  enabled?: boolean;
  depth?: number;
  strategy?: CacheWarmingStrategy;
  delayMs?: number;
}

export interface UseRelatedPrefetchReturn {
  prefetchRelated: (entityId: string, entityType: EntityType) => Promise<void>;
  isRelatedPrefetching: boolean;
  relatedPrefetchCount: number;
}

export function useRelatedPrefetch(options: UseRelatedPrefetchOptions = {}): UseRelatedPrefetchReturn {
  const {
    enabled = true,
    depth = 1,
    strategy = Strategy.CONSERVATIVE,
    delayMs = 1000,
  } = options;

  const [isRelatedPrefetching, setIsRelatedPrefetching] = useState(false);
  const [relatedPrefetchCount, setRelatedPrefetchCount] = useState(0);

  const mountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const prefetchRelated = useCallback(async (
    entityId: string, 
    entityType: EntityType
  ): Promise<void> => {
    if (!mountedRef.current || !enabled || strategy === Strategy.OFF) {
      return;
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Delay prefetching to avoid overwhelming the API
    timeoutRef.current = setTimeout(async () => {
      if (!mountedRef.current) {
        return;
      }

      try {
        setIsRelatedPrefetching(true);
        
        console.log(`[useRelatedPrefetch] Starting related prefetch for ${entityType}:${entityId} (depth: ${depth})`);

        const result = await cacheWarmingService.warmRelatedEntities(entityId, entityType, depth);

        if (mountedRef.current) {
          setRelatedPrefetchCount(prev => prev + result.successful.length);
          console.log(`[useRelatedPrefetch] Related prefetch completed: ${result.successful.length} entities prefetched`);
        }

      } catch (error) {
        if (mountedRef.current) {
          console.error(`[useRelatedPrefetch] Related prefetch failed for ${entityId}:`, error);
        }
      } finally {
        if (mountedRef.current) {
          setIsRelatedPrefetching(false);
        }
      }
    }, delayMs);
  }, [enabled, depth, strategy, delayMs]);

  return {
    prefetchRelated,
    isRelatedPrefetching,
    relatedPrefetchCount,
  };
}