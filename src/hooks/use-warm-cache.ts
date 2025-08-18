/**
 * React hook for cache warming
 * 
 * Provides advanced cache warming functionality with:
 * - Batch cache warming
 * - Progress tracking  
 * - Background warming
 * - Intelligent queueing
 * - Error handling and recovery
 * - Performance monitoring
 */

import { useState, useCallback, useRef, useEffect } from 'react';

import { 
  cacheWarmingService,
  type WarmCacheOptions,
  type CacheWarmingResult,
  type CacheWarmingStrategy,
  type CacheWarmingStats,
  CacheWarmingStrategy as Strategy
} from '@/lib/openalex/cache-warming';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

export interface UseWarmCacheOptions {
  strategy?: CacheWarmingStrategy;
  maxConcurrency?: number;
  batchSize?: number;
  enableBackgroundWarming?: boolean;
  retryFailedEntities?: boolean;
  maxRetries?: number;
}

export interface UseWarmCacheReturn {
  warmCache: (entityIds: string[], options?: WarmCacheOptions) => Promise<CacheWarmingResult>;
  isWarming: boolean;
  progress: { completed: number; total: number; errors: string[] } | null;
  cancel: () => void;
  lastResult: CacheWarmingResult | null;
  retryFailed: () => Promise<void>;
  stats: CacheWarmingStats;
}

/**
 * Main cache warming hook
 */
export function useWarmCache(options: UseWarmCacheOptions = {}): UseWarmCacheReturn {
  const {
    strategy = Strategy.CONSERVATIVE,
    maxConcurrency = 5,
    batchSize = 10,
    retryFailedEntities = true,
    maxRetries = 3,
  } = options;

  const [isWarming, setIsWarming] = useState(false);
  const [progress, setProgress] = useState<{ completed: number; total: number; errors: string[] } | null>(null);
  const [lastResult, setLastResult] = useState<CacheWarmingResult | null>(null);
  const [stats, setStats] = useState<CacheWarmingStats>(() => cacheWarmingService.getStats());

  const mountedRef = useRef(true);
  const cancelRef = useRef(false);
  const failedEntitiesRef = useRef<Array<{ entityId: string; error: Error; retryCount: number }>>([]);

  // Update stats periodically
  useEffect(() => {
    mountedRef.current = true;
    
    const statsInterval = setInterval(() => {
      if (mountedRef.current) {
        setStats(cacheWarmingService.getStats());
      }
    }, 1000);

    return () => {
      mountedRef.current = false;
      clearInterval(statsInterval);
    };
  }, []);

  /**
   * Warm cache for multiple entities
   */
  const warmCache = useCallback(async (
    entityIds: string[], 
    warmOptions: WarmCacheOptions = {}
  ): Promise<CacheWarmingResult> => {
    if (!mountedRef.current || strategy === Strategy.OFF) {
      return {
        successful: [],
        failed: [],
        totalTime: 0,
        cacheHits: 0,
        cacheMisses: 0,
      };
    }

    try {
      setIsWarming(true);
      cancelRef.current = false;
      failedEntitiesRef.current = [];
      
      const startProgress = { completed: 0, total: entityIds.length, errors: [] };
      setProgress(startProgress);

      console.log(`[useWarmCache] Starting cache warming for ${entityIds.length} entities`);

      // Merge options
      const finalOptions: WarmCacheOptions = {
        maxConcurrency,
        batchSize,
        strategy,
        ...warmOptions,
        onProgress: (progressUpdate) => {
          if (!mountedRef.current || cancelRef.current) {
            return;
          }

          setProgress(progressUpdate);
          
          // Call user-provided progress callback
          if (warmOptions.onProgress) {
            warmOptions.onProgress(progressUpdate);
          }
        },
        onError: (error, entityId) => {
          if (retryFailedEntities) {
            failedEntitiesRef.current.push({
              entityId,
              error,
              retryCount: 0,
            });
          }

          // Call user-provided error callback
          if (warmOptions.onError) {
            warmOptions.onError(error, entityId);
          }
        },
      };

      const result = await cacheWarmingService.warmCache(entityIds, finalOptions);

      if (mountedRef.current && !cancelRef.current) {
        setLastResult(result);
        console.log(`[useWarmCache] Cache warming completed: ${result.successful.length} successful, ${result.failed.length} failed in ${result.totalTime}ms`);
      }

      return result;

    } catch (error) {
      if (mountedRef.current) {
        console.error('[useWarmCache] Cache warming failed:', error);
        throw error;
      }
      return {
        successful: [],
        failed: [],
        totalTime: 0,
        cacheHits: 0,
        cacheMisses: 0,
      };
    } finally {
      if (mountedRef.current) {
        setIsWarming(false);
      }
    }
  }, [strategy, maxConcurrency, batchSize, retryFailedEntities]);

  /**
   * Cancel current warming operation
   */
  const cancel = useCallback((): void => {
    cancelRef.current = true;
    setIsWarming(false);
    setProgress(null);
    console.log('[useWarmCache] Cache warming cancelled');
  }, []);

  /**
   * Retry failed entities from last warming operation
   */
  const retryFailed = useCallback(async (): Promise<void> => {
    if (!mountedRef.current || failedEntitiesRef.current.length === 0) {
      return;
    }

    const toRetry = failedEntitiesRef.current
      .filter(item => item.retryCount < maxRetries)
      .map(item => item.entityId);

    if (toRetry.length === 0) {
      console.log('[useWarmCache] No failed entities to retry');
      return;
    }

    console.log(`[useWarmCache] Retrying ${toRetry.length} failed entities`);

    try {
      const retryResult = await warmCache(toRetry, {
        onError: (error, entityId) => {
          // Increment retry count for failed entities
          const failedItem = failedEntitiesRef.current.find(item => item.entityId === entityId);
          if (failedItem) {
            failedItem.retryCount++;
          }
        },
      });

      // Remove successfully retried entities from failed list
      retryResult.successful.forEach(entityId => {
        const index = failedEntitiesRef.current.findIndex(item => item.entityId === entityId);
        if (index > -1) {
          failedEntitiesRef.current.splice(index, 1);
        }
      });

      console.log(`[useWarmCache] Retry completed: ${retryResult.successful.length} recovered`);

    } catch (error) {
      console.error('[useWarmCache] Retry failed:', error);
    }
  }, [maxRetries, warmCache]);

  return {
    warmCache,
    isWarming,
    progress,
    cancel,
    lastResult,
    retryFailed,
    stats,
  };
}

/**
 * Hook for intelligent background cache warming
 */
export interface UseBackgroundWarmingOptions {
  enabled?: boolean;
  strategy?: CacheWarmingStrategy;
  maxConcurrency?: number;
  priority?: 'low' | 'normal' | 'high';
  idleThreshold?: number;
  maxIdleRequests?: number;
}

export interface UseBackgroundWarmingReturn {
  scheduleWarming: (entityIds: string[], priority?: 'low' | 'normal' | 'high') => void;
  isBackgroundWarming: boolean;
  backgroundQueue: number;
  pauseBackgroundWarming: () => void;
  resumeBackgroundWarming: () => void;
  clearBackgroundQueue: () => void;
}

export function useBackgroundWarming(options: UseBackgroundWarmingOptions = {}): UseBackgroundWarmingReturn {
  const {
    enabled = true,
    strategy = Strategy.CONSERVATIVE,
    maxConcurrency = 2,
    priority = 'low',
    idleThreshold = 2000,
    maxIdleRequests = 5,
  } = options;

  const [isBackgroundWarming, setIsBackgroundWarming] = useState(false);
  const [backgroundQueue, setBackgroundQueue] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const mountedRef = useRef(true);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warmingQueueRef = useRef<Array<{ entityIds: string[]; priority: 'low' | 'normal' | 'high' }>>([]);
  const lastActivityRef = useRef(Date.now());

  // Cache warming hook for actual warming
  const { warmCache } = useWarmCache({ strategy, maxConcurrency: maxConcurrency });

  useEffect(() => {
    const mountedRefCurrent = mountedRef;
    const idleTimerRefCurrent = idleTimerRef;
    
    mountedRefCurrent.current = true;
    return () => {
      mountedRefCurrent.current = false;
      if (idleTimerRefCurrent.current) {
        clearTimeout(idleTimerRefCurrent.current);
      }
    };
  }, []);

  // Process background queue when idle
  useEffect(() => {
    if (!enabled || strategy === Strategy.OFF || isPaused) {
      return;
    }

    const processQueue = async () => {
      if (!mountedRef.current || warmingQueueRef.current.length === 0 || isBackgroundWarming) {
        return;
      }

      // Check if enough time has passed since last activity
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      if (timeSinceActivity < idleThreshold) {
        return;
      }

      setIsBackgroundWarming(true);

      try {
        // Process highest priority items first
        warmingQueueRef.current.sort((a, b) => {
          const priorityOrder = { high: 3, normal: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        const batch = warmingQueueRef.current.splice(0, Math.min(maxIdleRequests, warmingQueueRef.current.length));
        setBackgroundQueue(warmingQueueRef.current.length);

        for (const { entityIds } of batch) {
          if (!mountedRef.current || isPaused) {
            break;
          }

          try {
            await warmCache(entityIds);
            console.log(`[useBackgroundWarming] Background warmed ${entityIds.length} entities`);
          } catch (error) {
            console.warn('[useBackgroundWarming] Background warming failed:', error);
          }
        }

      } finally {
        if (mountedRef.current) {
          setIsBackgroundWarming(false);
        }
      }
    };

    const interval = setInterval(processQueue, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [enabled, strategy, isPaused, idleThreshold, maxIdleRequests, maxConcurrency, isBackgroundWarming, warmCache]);

  /**
   * Schedule entities for background warming
   */
  const scheduleWarming = useCallback((
    entityIds: string[], 
    entityPriority: 'low' | 'normal' | 'high' = priority
  ): void => {
    if (!enabled || strategy === Strategy.OFF || entityIds.length === 0) {
      return;
    }

    warmingQueueRef.current.push({
      entityIds: [...entityIds],
      priority: entityPriority,
    });

    setBackgroundQueue(warmingQueueRef.current.length);
    lastActivityRef.current = Date.now();

    console.log(`[useBackgroundWarming] Scheduled ${entityIds.length} entities for background warming (priority: ${entityPriority})`);
  }, [enabled, strategy, priority]);

  /**
   * Pause background warming
   */
  const pauseBackgroundWarming = useCallback((): void => {
    setIsPaused(true);
    console.log('[useBackgroundWarming] Background warming paused');
  }, []);

  /**
   * Resume background warming
   */
  const resumeBackgroundWarming = useCallback((): void => {
    setIsPaused(false);
    lastActivityRef.current = Date.now();
    console.log('[useBackgroundWarming] Background warming resumed');
  }, []);

  /**
   * Clear background warming queue
   */
  const clearBackgroundQueue = useCallback((): void => {
    warmingQueueRef.current = [];
    setBackgroundQueue(0);
    console.log('[useBackgroundWarming] Background warming queue cleared');
  }, []);

  return {
    scheduleWarming,
    isBackgroundWarming,
    backgroundQueue,
    pauseBackgroundWarming,
    resumeBackgroundWarming,
    clearBackgroundQueue,
  };
}

/**
 * Hook for predictive cache warming based on user navigation patterns
 */
export interface UsePredictiveWarmingOptions {
  enabled?: boolean;
  strategy?: CacheWarmingStrategy;
  learningMode?: boolean;
  confidence?: number;
  maxPredictions?: number;
}

export interface UsePredictiveWarmingReturn {
  recordNavigation: (from: string, to: string, entityType: EntityType) => void;
  getPredictions: (currentEntity: string) => string[];
  isLearning: boolean;
  predictionAccuracy: number;
}

export function usePredictiveWarming(options: UsePredictiveWarmingOptions = {}): UsePredictiveWarmingReturn {
  const {
    enabled = true,
    strategy = Strategy.CONSERVATIVE,
    learningMode = true,
    confidence = 0.3,
    maxPredictions = 5,
  } = options;

  const [isLearning] = useState(learningMode);
  const [predictionAccuracy, setPredictionAccuracy] = useState(0);

  const navigationPatternsRef = useRef(new Map<string, Map<string, number>>());
  const predictionHitsRef = useRef(0);
  const predictionAttemptsRef = useRef(0);

  const { scheduleWarming } = useBackgroundWarming({ 
    enabled, 
    strategy,
    priority: 'low',
  });

  /**
   * Record navigation pattern for learning
   */
  const recordNavigation = useCallback((
    from: string, 
    to: string, 
    entityType: EntityType
  ): void => {
    if (!enabled || !isLearning || strategy === Strategy.OFF) {
      return;
    }

    const patterns = navigationPatternsRef.current;
    
    if (!patterns.has(from)) {
      patterns.set(from, new Map());
    }

    const fromPatterns = patterns.get(from)!;
    const currentCount = fromPatterns.get(to) || 0;
    fromPatterns.set(to, currentCount + 1);

    console.log(`[usePredictiveWarming] Recorded navigation: ${from} → ${to} (${entityType})`);
  }, [enabled, isLearning, strategy]);

  /**
   * Get predictions for current entity
   */
  const getPredictions = useCallback((currentEntity: string): string[] => {
    if (!enabled || strategy === Strategy.OFF) {
      return [];
    }

    const patterns = navigationPatternsRef.current;
    const fromPatterns = patterns.get(currentEntity);

    if (!fromPatterns) {
      return [];
    }

    // Sort by frequency and filter by confidence
    const predictions = Array.from(fromPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .filter(([, count]) => {
        const total = Array.from(fromPatterns.values()).reduce((sum, c) => sum + c, 0);
        return (count / total) >= confidence;
      })
      .slice(0, maxPredictions)
      .map(([entityId]) => entityId);

    if (predictions.length > 0) {
      console.log(`[usePredictiveWarming] Predictions for ${currentEntity}:`, predictions);
      
      // Schedule background warming for predictions
      scheduleWarming(predictions, 'low');
      
      predictionAttemptsRef.current++;
    }

    return predictions;
  }, [enabled, strategy, confidence, maxPredictions, scheduleWarming]);

  // Update prediction accuracy
  useEffect(() => {
    if (predictionAttemptsRef.current > 0) {
      setPredictionAccuracy(predictionHitsRef.current / predictionAttemptsRef.current);
    }
  }, []);

  return {
    recordNavigation,
    getPredictions,
    isLearning,
    predictionAccuracy,
  };
}