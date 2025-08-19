/**
 * Enhanced Cache Hook
 * 
 * React hook that provides access to the enhanced caching system with:
 * - Real-time analytics monitoring
 * - Cache warming controls
 * - Memory pressure monitoring
 * - Performance metrics
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { enhancedCacheInterceptor, type CacheAnalytics } from '@/lib/openalex/utils/enhanced-cache-interceptor';
import { intelligentCacheWarmingService } from '@/lib/openalex/utils/intelligent-cache-warming';

export interface CacheControlsOptions {
  enableAutoWarming?: boolean;
  warmingInterval?: number;
  memoryPressureThreshold?: number;
  analyticsUpdateInterval?: number;
}

export interface CacheControls {
  analytics: CacheAnalytics;
  warmingStats: {
    isActive: boolean;
    frequencyTracked: number;
    dependencyNodes: number;
    topEntities: Array<{
      entityId: string;
      entityType: string;
      accessCount: number;
      priority: number;
    }>;
  };
  actions: {
    clearCache: () => Promise<void>;
    warmCache: (strategy: 'frequency' | 'dependencies' | 'predictive') => Promise<void>;
    startWarming: () => void;
    stopWarming: () => void;
    handleMemoryPressure: () => Promise<void>;
    invalidatePattern: (pattern: string | RegExp) => Promise<void>;
    trackEntityAccess: (entityId: string, entityType: string) => void;
  };
  performance: {
    hitRate: number;
    averageResponseTime: number;
    memoryPressure: number;
    requestDeduplicationRate: number;
  };
  storage: {
    memoryUsage: number;
    localStorageUsage: number;
    indexedDBUsage?: number;
    quotaUtilization: number;
  };
}

/**
 * Hook for enhanced cache management and monitoring
 */
export function useEnhancedCache(options: CacheControlsOptions = {}): CacheControls {
  const {
    enableAutoWarming = false,
    warmingInterval = 60000, // 1 minute
    memoryPressureThreshold = 0.8,
    analyticsUpdateInterval = 5000, // 5 seconds
  } = options;

  const [analytics, setAnalytics] = useState<CacheAnalytics>(() => 
    enhancedCacheInterceptor.getAnalytics()
  );
  
  const [warmingStats, setWarmingStats] = useState(() =>
    intelligentCacheWarmingService.getWarmingStatistics()
  );

  const analyticsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const warmingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update analytics periodically
  useEffect(() => {
    const updateAnalytics = () => {
      setAnalytics(enhancedCacheInterceptor.getAnalytics());
      setWarmingStats(intelligentCacheWarmingService.getWarmingStatistics());
    };

    // Initial update
    updateAnalytics();

    // Set up periodic updates
    analyticsIntervalRef.current = setInterval(updateAnalytics, analyticsUpdateInterval);

    return () => {
      if (analyticsIntervalRef.current) {
        clearInterval(analyticsIntervalRef.current);
      }
    };
  }, [analyticsUpdateInterval]);

  // Auto-warming management
  useEffect(() => {
    if (enableAutoWarming) {
      intelligentCacheWarmingService.start();

      // Periodic memory pressure check
      warmingIntervalRef.current = setInterval(async () => {
        const currentAnalytics = enhancedCacheInterceptor.getAnalytics();
        if (currentAnalytics.memoryPressure > memoryPressureThreshold) {
          await enhancedCacheInterceptor.handleMemoryPressure();
        }
      }, warmingInterval);

      return () => {
        intelligentCacheWarmingService.stop();
        if (warmingIntervalRef.current) {
          clearInterval(warmingIntervalRef.current);
        }
      };
    }
  }, [enableAutoWarming, warmingInterval, memoryPressureThreshold]);

  // Cache management actions
  const clearCache = useCallback(async () => {
    await enhancedCacheInterceptor.invalidate('*');
    intelligentCacheWarmingService.clearWarmingData();
    
    // Update analytics immediately
    setAnalytics(enhancedCacheInterceptor.getAnalytics());
    setWarmingStats(intelligentCacheWarmingService.getWarmingStatistics());
  }, []);

  const warmCache = useCallback(async (strategy: 'frequency' | 'dependencies' | 'predictive') => {
    try {
      let result;
      switch (strategy) {
        case 'frequency':
          result = await intelligentCacheWarmingService.warmByFrequency();
          break;
        case 'dependencies':
          result = await intelligentCacheWarmingService.warmByDependencies();
          break;
        case 'predictive':
          result = await intelligentCacheWarmingService.warmPredictively();
          break;
      }
      
      console.log(`Cache warming (${strategy}) completed:`, result);
      
      // Update stats
      setWarmingStats(intelligentCacheWarmingService.getWarmingStatistics());
      setAnalytics(enhancedCacheInterceptor.getAnalytics());
      
      return result;
    } catch (error) {
      console.error(`Cache warming (${strategy}) failed:`, error);
      throw error;
    }
  }, []);

  const startWarming = useCallback(() => {
    intelligentCacheWarmingService.start();
    setWarmingStats(intelligentCacheWarmingService.getWarmingStatistics());
  }, []);

  const stopWarming = useCallback(() => {
    intelligentCacheWarmingService.stop();
    setWarmingStats(intelligentCacheWarmingService.getWarmingStatistics());
  }, []);

  const handleMemoryPressure = useCallback(async () => {
    await enhancedCacheInterceptor.handleMemoryPressure();
    setAnalytics(enhancedCacheInterceptor.getAnalytics());
  }, []);

  const invalidatePattern = useCallback(async (pattern: string | RegExp) => {
    await enhancedCacheInterceptor.invalidate(pattern);
    setAnalytics(enhancedCacheInterceptor.getAnalytics());
  }, []);

  const trackEntityAccess = useCallback((entityId: string, entityType: string) => {
    intelligentCacheWarmingService.trackEntityAccess(entityId, entityType);
    
    // Update warming stats after tracking
    setTimeout(() => {
      setWarmingStats(intelligentCacheWarmingService.getWarmingStatistics());
    }, 100);
  }, []);

  // Derived performance metrics
  const performance = {
    hitRate: analytics.hitRate,
    averageResponseTime: (analytics.performance.averageHitTime + analytics.performance.averageMissTime) / 2,
    memoryPressure: analytics.memoryPressure,
    requestDeduplicationRate: analytics.requestDeduplication.deduplicationRate,
  };

  // Storage utilization metrics
  const storage = {
    memoryUsage: analytics.storageUtilization.memory.used,
    localStorageUsage: analytics.storageUtilization.localStorage.used,
    indexedDBUsage: analytics.storageUtilization.indexedDB.used,
    quotaUtilization: Math.max(
      analytics.storageUtilization.memory.used / Math.max(analytics.storageUtilization.memory.limit, 1),
      analytics.storageUtilization.localStorage.used / Math.max(analytics.storageUtilization.localStorage.limit, 1)
    ),
  };

  return {
    analytics,
    warmingStats: {
      isActive: warmingStats.isActive,
      frequencyTracked: warmingStats.frequencyTracked,
      dependencyNodes: warmingStats.dependencyNodes,
      topEntities: warmingStats.topEntities,
    },
    actions: {
      clearCache,
      warmCache,
      startWarming,
      stopWarming,
      handleMemoryPressure,
      invalidatePattern,
      trackEntityAccess,
    },
    performance,
    storage,
  };
}

/**
 * Hook for cache performance monitoring only (read-only)
 */
export function useCacheAnalytics(): {
  analytics: CacheAnalytics;
  performance: CacheControls['performance'];
  storage: CacheControls['storage'];
} {
  const { analytics, performance, storage } = useEnhancedCache({
    enableAutoWarming: false,
    analyticsUpdateInterval: 10000, // Less frequent updates for read-only
  });

  return {
    analytics,
    performance,
    storage,
  };
}

/**
 * Hook for cache warming management
 */
export function useCacheWarming(): {
  warmingStats: CacheControls['warmingStats'];
  actions: Pick<CacheControls['actions'], 'warmCache' | 'startWarming' | 'stopWarming' | 'trackEntityAccess'>;
} {
  const { warmingStats, actions } = useEnhancedCache({
    enableAutoWarming: true,
    analyticsUpdateInterval: 30000, // Less frequent analytics updates
  });

  return {
    warmingStats,
    actions: {
      warmCache: actions.warmCache,
      startWarming: actions.startWarming,
      stopWarming: actions.stopWarming,
      trackEntityAccess: actions.trackEntityAccess,
    },
  };
}

/**
 * Hook for automatic entity access tracking
 */
export function useEntityAccessTracking(): {
  trackAccess: (entityId: string, entityType: string) => void;
  addDependency: (entityId: string, dependencyId: string, weight?: number) => void;
} {
  const trackAccess = useCallback((entityId: string, entityType: string) => {
    intelligentCacheWarmingService.trackEntityAccess(entityId, entityType);
  }, []);

  const addDependency = useCallback((entityId: string, dependencyId: string, weight = 1) => {
    intelligentCacheWarmingService.addDependency(entityId, dependencyId, weight);
  }, []);

  return {
    trackAccess,
    addDependency,
  };
}

/**
 * Hook for cache status and health monitoring
 */
export function useCacheHealth(): {
  isHealthy: boolean;
  issues: Array<{
    type: 'memory_pressure' | 'high_miss_rate' | 'storage_quota' | 'request_errors';
    severity: 'low' | 'medium' | 'high';
    message: string;
    recommendation: string;
  }>;
  lastChecked: Date;
} {
  const { analytics, performance, storage } = useCacheAnalytics();
  const [lastChecked] = useState(() => new Date());

  const issues = [];
  let isHealthy = true;

  // Check memory pressure
  if (performance.memoryPressure > 0.8) {
    isHealthy = false;
    issues.push({
      type: 'memory_pressure' as const,
      severity: 'high' as const,
      message: `High memory pressure: ${(performance.memoryPressure * 100).toFixed(1)}%`,
      recommendation: 'Clear cache or reduce cache size limits',
    });
  } else if (performance.memoryPressure > 0.6) {
    issues.push({
      type: 'memory_pressure' as const,
      severity: 'medium' as const,
      message: `Moderate memory pressure: ${(performance.memoryPressure * 100).toFixed(1)}%`,
      recommendation: 'Monitor memory usage and consider cache cleanup',
    });
  }

  // Check hit rate
  if (performance.hitRate < 0.3) {
    isHealthy = false;
    issues.push({
      type: 'high_miss_rate' as const,
      severity: 'high' as const,
      message: `Low cache hit rate: ${(performance.hitRate * 100).toFixed(1)}%`,
      recommendation: 'Enable cache warming or adjust TTL settings',
    });
  } else if (performance.hitRate < 0.5) {
    issues.push({
      type: 'high_miss_rate' as const,
      severity: 'medium' as const,
      message: `Moderate cache hit rate: ${(performance.hitRate * 100).toFixed(1)}%`,
      recommendation: 'Consider optimizing cache warming strategies',
    });
  }

  // Check storage quota
  if (storage.quotaUtilization > 0.9) {
    isHealthy = false;
    issues.push({
      type: 'storage_quota' as const,
      severity: 'high' as const,
      message: `Storage quota nearly exceeded: ${(storage.quotaUtilization * 100).toFixed(1)}%`,
      recommendation: 'Clear old cache entries or increase storage limits',
    });
  } else if (storage.quotaUtilization > 0.7) {
    issues.push({
      type: 'storage_quota' as const,
      severity: 'medium' as const,
      message: `High storage usage: ${(storage.quotaUtilization * 100).toFixed(1)}%`,
      recommendation: 'Monitor storage usage and plan for cleanup',
    });
  }

  // Check request errors
  if (analytics.performance.cacheErrors > analytics.performance.cacheHits * 0.1) {
    isHealthy = false;
    issues.push({
      type: 'request_errors' as const,
      severity: 'high' as const,
      message: `High cache error rate: ${analytics.performance.cacheErrors} errors`,
      recommendation: 'Check storage availability and error logs',
    });
  }

  return {
    isHealthy,
    issues,
    lastChecked,
  };
}