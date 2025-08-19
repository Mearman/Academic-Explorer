/**
 * Enhanced Cache Hook Unit Tests
 * 
 * Test-driven development for cache hook features including:
 * - Cache analytics monitoring
 * - Memory pressure handling
 * - Cache warming controls
 * - Performance metrics calculation
 * - Storage utilization tracking
 * - Health monitoring and issue detection
 */

import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { 
  useEnhancedCache, 
  useCacheAnalytics, 
  useCacheWarming, 
  useEntityAccessTracking,
  useCacheHealth,
  type CacheControlsOptions 
} from './use-enhanced-cache';
import type { CacheAnalytics, WarmingResult } from '@/lib/openalex/utils/enhanced-cache-interceptor';

// Mock the cache interceptor and warming service
const mockEnhancedCacheInterceptor = {
  getAnalytics: vi.fn(),
  handleMemoryPressure: vi.fn(),
  invalidate: vi.fn(),
};

const mockIntelligentCacheWarmingService = {
  getWarmingStatistics: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  clearWarmingData: vi.fn(),
  warmByFrequency: vi.fn(),
  warmByDependencies: vi.fn(),
  warmPredictively: vi.fn(),
  trackEntityAccess: vi.fn(),
  addDependency: vi.fn(),
};

vi.mock('@/lib/openalex/utils/enhanced-cache-interceptor', () => ({
  enhancedCacheInterceptor: mockEnhancedCacheInterceptor,
}));

vi.mock('@/lib/openalex/utils/intelligent-cache-warming', () => ({
  intelligentCacheWarmingService: mockIntelligentCacheWarmingService,
}));

describe('useEnhancedCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Setup default mock returns
    mockEnhancedCacheInterceptor.getAnalytics.mockReturnValue(createMockAnalytics());
    mockIntelligentCacheWarmingService.getWarmingStatistics.mockReturnValue(createMockWarmingStats());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Analytics Monitoring', () => {
    it('should initialize with current analytics data', () => {
      const mockAnalytics = createMockAnalytics({ hitRate: 0.75 });
      mockEnhancedCacheInterceptor.getAnalytics.mockReturnValue(mockAnalytics);

      const { result } = renderHook(() => useEnhancedCache());

      expect(result.current.analytics).toEqual(mockAnalytics);
      expect(result.current.performance.hitRate).toBe(0.75);
    });

    it('should update analytics periodically', () => {
      const { result } = renderHook(() => 
        useEnhancedCache({ analyticsUpdateInterval: 1000 })
      );

      const initialHitRate = result.current.analytics.hitRate;

      // Change mock data
      const updatedAnalytics = createMockAnalytics({ hitRate: 0.85 });
      mockEnhancedCacheInterceptor.getAnalytics.mockReturnValue(updatedAnalytics);

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.analytics.hitRate).toBe(0.85);
      expect(result.current.analytics.hitRate).not.toBe(initialHitRate);
    });

    it('should calculate performance metrics correctly', () => {
      const mockAnalytics = createMockAnalytics({
        hitRate: 0.8,
        performance: {
          averageHitTime: 50,
          averageMissTime: 200,
          cacheHits: 80,
          cacheMisses: 20,
          cacheErrors: 2,
        },
        memoryPressure: 0.6,
        requestDeduplication: {
          deduplicationRate: 0.15,
          duplicatesSaved: 30,
        },
      });

      mockEnhancedCacheInterceptor.getAnalytics.mockReturnValue(mockAnalytics);

      const { result } = renderHook(() => useEnhancedCache());

      expect(result.current.performance).toEqual({
        hitRate: 0.8,
        averageResponseTime: 125, // (50 + 200) / 2
        memoryPressure: 0.6,
        requestDeduplicationRate: 0.15,
      });
    });

    it('should calculate storage utilization metrics', () => {
      const mockAnalytics = createMockAnalytics({
        storageUtilization: {
          memory: { used: 50, limit: 100 },
          localStorage: { used: 2000, limit: 5000 },
          indexedDB: { used: 1500, limit: 10000 },
        },
      });

      mockEnhancedCacheInterceptor.getAnalytics.mockReturnValue(mockAnalytics);

      const { result } = renderHook(() => useEnhancedCache());

      expect(result.current.storage).toEqual({
        memoryUsage: 50,
        localStorageUsage: 2000,
        indexedDBUsage: 1500,
        quotaUtilization: 0.5, // Max of memory (50%) and localStorage (40%)
      });
    });
  });

  describe('Cache Management Actions', () => {
    it('should clear cache and update analytics', async () => {
      mockEnhancedCacheInterceptor.invalidate.mockResolvedValue(undefined);

      const { result } = renderHook(() => useEnhancedCache());

      await act(async () => {
        await result.current.actions.clearCache();
      });

      expect(mockEnhancedCacheInterceptor.invalidate).toHaveBeenCalledWith('*');
      expect(mockIntelligentCacheWarmingService.clearWarmingData).toHaveBeenCalled();
      expect(mockEnhancedCacheInterceptor.getAnalytics).toHaveBeenCalledTimes(2); // Initial + after clear
    });

    it('should warm cache with frequency strategy', async () => {
      const mockWarmingResult: WarmingResult = {
        strategy: 'frequency',
        entitiesWarmed: 25,
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        duration: 1000,
        errors: [],
        success: true,
      };

      mockIntelligentCacheWarmingService.warmByFrequency.mockResolvedValue(mockWarmingResult);

      const { result } = renderHook(() => useEnhancedCache());

      let warmingResult;
      await act(async () => {
        warmingResult = await result.current.actions.warmCache('frequency');
      });

      expect(mockIntelligentCacheWarmingService.warmByFrequency).toHaveBeenCalled();
      expect(warmingResult).toEqual(mockWarmingResult);
    });

    it('should warm cache with dependencies strategy', async () => {
      const mockWarmingResult: WarmingResult = {
        strategy: 'dependencies',
        entitiesWarmed: 15,
        startTime: Date.now(),
        endTime: Date.now() + 800,
        duration: 800,
        errors: [],
        success: true,
      };

      mockIntelligentCacheWarmingService.warmByDependencies.mockResolvedValue(mockWarmingResult);

      const { result } = renderHook(() => useEnhancedCache());

      let warmingResult;
      await act(async () => {
        warmingResult = await result.current.actions.warmCache('dependencies');
      });

      expect(mockIntelligentCacheWarmingService.warmByDependencies).toHaveBeenCalled();
      expect(warmingResult).toEqual(mockWarmingResult);
    });

    it('should warm cache with predictive strategy', async () => {
      const mockWarmingResult: WarmingResult = {
        strategy: 'predictive',
        entitiesWarmed: 30,
        startTime: Date.now(),
        endTime: Date.now() + 1200,
        duration: 1200,
        errors: [],
        success: true,
      };

      mockIntelligentCacheWarmingService.warmPredictively.mockResolvedValue(mockWarmingResult);

      const { result } = renderHook(() => useEnhancedCache());

      let warmingResult;
      await act(async () => {
        warmingResult = await result.current.actions.warmCache('predictive');
      });

      expect(mockIntelligentCacheWarmingService.warmPredictively).toHaveBeenCalled();
      expect(warmingResult).toEqual(mockWarmingResult);
    });

    it('should handle cache warming errors', async () => {
      const warmingError = new Error('Cache warming failed');
      mockIntelligentCacheWarmingService.warmByFrequency.mockRejectedValue(warmingError);

      const { result } = renderHook(() => useEnhancedCache());

      await expect(
        act(async () => {
          await result.current.actions.warmCache('frequency');
        })
      ).rejects.toThrow('Cache warming failed');
    });

    it('should handle memory pressure', async () => {
      mockEnhancedCacheInterceptor.handleMemoryPressure.mockResolvedValue(undefined);

      const { result } = renderHook(() => useEnhancedCache());

      await act(async () => {
        await result.current.actions.handleMemoryPressure();
      });

      expect(mockEnhancedCacheInterceptor.handleMemoryPressure).toHaveBeenCalled();
      expect(mockEnhancedCacheInterceptor.getAnalytics).toHaveBeenCalledTimes(2); // Initial + after pressure handling
    });

    it('should invalidate cache patterns', async () => {
      mockEnhancedCacheInterceptor.invalidate.mockResolvedValue(undefined);

      const { result } = renderHook(() => useEnhancedCache());

      await act(async () => {
        await result.current.actions.invalidatePattern(/works\/.*\/authors/);
      });

      expect(mockEnhancedCacheInterceptor.invalidate).toHaveBeenCalledWith(/works\/.*\/authors/);
    });

    it('should track entity access', () => {
      const { result } = renderHook(() => useEnhancedCache());

      act(() => {
        result.current.actions.trackEntityAccess('W123456789', 'W');
      });

      expect(mockIntelligentCacheWarmingService.trackEntityAccess).toHaveBeenCalledWith('W123456789', 'W');
    });
  });

  describe('Auto-warming Management', () => {
    it('should enable auto-warming when configured', () => {
      renderHook(() => useEnhancedCache({ enableAutoWarming: true }));

      expect(mockIntelligentCacheWarmingService.start).toHaveBeenCalled();
    });

    it('should disable auto-warming by default', () => {
      renderHook(() => useEnhancedCache());

      expect(mockIntelligentCacheWarmingService.start).not.toHaveBeenCalled();
    });

    it('should handle memory pressure automatically when enabled', () => {
      const mockAnalytics = createMockAnalytics({ memoryPressure: 0.85 });
      mockEnhancedCacheInterceptor.getAnalytics.mockReturnValue(mockAnalytics);
      mockEnhancedCacheInterceptor.handleMemoryPressure.mockResolvedValue(undefined);

      renderHook(() => 
        useEnhancedCache({ 
          enableAutoWarming: true, 
          memoryPressureThreshold: 0.8,
          warmingInterval: 1000,
        })
      );

      // Fast-forward past warming interval
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockEnhancedCacheInterceptor.handleMemoryPressure).toHaveBeenCalled();
    });

    it('should start and stop warming on demand', () => {
      const { result } = renderHook(() => useEnhancedCache());

      act(() => {
        result.current.actions.startWarming();
      });

      expect(mockIntelligentCacheWarmingService.start).toHaveBeenCalled();

      act(() => {
        result.current.actions.stopWarming();
      });

      expect(mockIntelligentCacheWarmingService.stop).toHaveBeenCalled();
    });

    it('should cleanup intervals on unmount', () => {
      const { unmount } = renderHook(() => 
        useEnhancedCache({ enableAutoWarming: true })
      );

      expect(mockIntelligentCacheWarmingService.start).toHaveBeenCalled();

      unmount();

      expect(mockIntelligentCacheWarmingService.stop).toHaveBeenCalled();
    });
  });

  describe('Warming Statistics', () => {
    it('should provide warming statistics', () => {
      const mockWarmingStats = createMockWarmingStats({
        isActive: true,
        frequencyTracked: 150,
        dependencyNodes: 45,
        topEntities: [
          { entityId: 'W123', entityType: 'W', accessCount: 25, priority: 0.9 },
          { entityId: 'A456', entityType: 'A', accessCount: 18, priority: 0.7 },
        ],
      });

      mockIntelligentCacheWarmingService.getWarmingStatistics.mockReturnValue(mockWarmingStats);

      const { result } = renderHook(() => useEnhancedCache());

      expect(result.current.warmingStats).toEqual({
        isActive: true,
        frequencyTracked: 150,
        dependencyNodes: 45,
        topEntities: [
          { entityId: 'W123', entityType: 'W', accessCount: 25, priority: 0.9 },
          { entityId: 'A456', entityType: 'A', accessCount: 18, priority: 0.7 },
        ],
      });
    });

    it('should update warming statistics periodically', () => {
      const { result } = renderHook(() => 
        useEnhancedCache({ analyticsUpdateInterval: 1000 })
      );

      const initialStats = result.current.warmingStats;

      // Update mock data
      const updatedStats = createMockWarmingStats({ frequencyTracked: 200 });
      mockIntelligentCacheWarmingService.getWarmingStatistics.mockReturnValue(updatedStats);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.warmingStats.frequencyTracked).toBe(200);
      expect(result.current.warmingStats.frequencyTracked).not.toBe(initialStats.frequencyTracked);
    });
  });
});

describe('useCacheAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnhancedCacheInterceptor.getAnalytics.mockReturnValue(createMockAnalytics());
    mockIntelligentCacheWarmingService.getWarmingStatistics.mockReturnValue(createMockWarmingStats());
  });

  it('should provide read-only analytics interface', () => {
    const { result } = renderHook(() => useCacheAnalytics());

    expect(result.current).toHaveProperty('analytics');
    expect(result.current).toHaveProperty('performance');
    expect(result.current).toHaveProperty('storage');
    expect(result.current).not.toHaveProperty('actions');
    expect(result.current).not.toHaveProperty('warmingStats');
  });

  it('should use less frequent update interval for read-only mode', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    renderHook(() => useCacheAnalytics());

    // Should use 10000ms interval instead of default 5000ms
    expect(mockEnhancedCacheInterceptor.getAnalytics).toHaveBeenCalledTimes(1);
    
    // Fast-forward less than read-only interval
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should not update yet
    expect(mockEnhancedCacheInterceptor.getAnalytics).toHaveBeenCalledTimes(1);
  });
});

describe('useCacheWarming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnhancedCacheInterceptor.getAnalytics.mockReturnValue(createMockAnalytics());
    mockIntelligentCacheWarmingService.getWarmingStatistics.mockReturnValue(createMockWarmingStats());
  });

  it('should provide warming-focused interface', () => {
    const { result } = renderHook(() => useCacheWarming());

    expect(result.current).toHaveProperty('warmingStats');
    expect(result.current).toHaveProperty('actions');
    expect(result.current.actions).toHaveProperty('warmCache');
    expect(result.current.actions).toHaveProperty('startWarming');
    expect(result.current.actions).toHaveProperty('stopWarming');
    expect(result.current.actions).toHaveProperty('trackEntityAccess');
    expect(result.current.actions).not.toHaveProperty('clearCache');
    expect(result.current.actions).not.toHaveProperty('handleMemoryPressure');
  });

  it('should enable auto-warming by default', () => {
    renderHook(() => useCacheWarming());

    expect(mockIntelligentCacheWarmingService.start).toHaveBeenCalled();
  });
});

describe('useEntityAccessTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide tracking functions', () => {
    const { result } = renderHook(() => useEntityAccessTracking());

    expect(result.current).toHaveProperty('trackAccess');
    expect(result.current).toHaveProperty('addDependency');
    expect(typeof result.current.trackAccess).toBe('function');
    expect(typeof result.current.addDependency).toBe('function');
  });

  it('should track entity access correctly', () => {
    const { result } = renderHook(() => useEntityAccessTracking());

    act(() => {
      result.current.trackAccess('W123456789', 'W');
    });

    expect(mockIntelligentCacheWarmingService.trackEntityAccess).toHaveBeenCalledWith('W123456789', 'W');
  });

  it('should add dependencies with default weight', () => {
    const { result } = renderHook(() => useEntityAccessTracking());

    act(() => {
      result.current.addDependency('W123', 'A456');
    });

    expect(mockIntelligentCacheWarmingService.addDependency).toHaveBeenCalledWith('W123', 'A456', 1);
  });

  it('should add dependencies with custom weight', () => {
    const { result } = renderHook(() => useEntityAccessTracking());

    act(() => {
      result.current.addDependency('W123', 'A456', 0.8);
    });

    expect(mockIntelligentCacheWarmingService.addDependency).toHaveBeenCalledWith('W123', 'A456', 0.8);
  });
});

describe('useCacheHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnhancedCacheInterceptor.getAnalytics.mockReturnValue(createMockAnalytics());
    mockIntelligentCacheWarmingService.getWarmingStatistics.mockReturnValue(createMockWarmingStats());
  });

  it('should detect healthy cache state', () => {
    const healthyAnalytics = createMockAnalytics({
      hitRate: 0.8,
      memoryPressure: 0.4,
      storageUtilization: {
        memory: { used: 30, limit: 100 },
        localStorage: { used: 1000, limit: 5000 },
        indexedDB: { used: 500, limit: 10000 },
      },
      performance: {
        cacheHits: 800,
        cacheMisses: 200,
        cacheErrors: 5,
        averageHitTime: 50,
        averageMissTime: 200,
      },
    });

    mockEnhancedCacheInterceptor.getAnalytics.mockReturnValue(healthyAnalytics);

    const { result } = renderHook(() => useCacheHealth());

    expect(result.current.isHealthy).toBe(true);
    expect(result.current.issues).toHaveLength(0);
    expect(result.current.lastChecked).toBeInstanceOf(Date);
  });

  it('should detect high memory pressure issues', () => {
    const highMemoryAnalytics = createMockAnalytics({
      memoryPressure: 0.85,
    });

    mockEnhancedCacheInterceptor.getAnalytics.mockReturnValue(highMemoryAnalytics);

    const { result } = renderHook(() => useCacheHealth());

    expect(result.current.isHealthy).toBe(false);
    expect(result.current.issues).toContainEqual({
      type: 'memory_pressure',
      severity: 'high',
      message: 'High memory pressure: 85.0%',
      recommendation: 'Clear cache or reduce cache size limits',
    });
  });

  it('should detect low hit rate issues', () => {
    const lowHitRateAnalytics = createMockAnalytics({
      hitRate: 0.25,
    });

    mockEnhancedCacheInterceptor.getAnalytics.mockReturnValue(lowHitRateAnalytics);

    const { result } = renderHook(() => useCacheHealth());

    expect(result.current.isHealthy).toBe(false);
    expect(result.current.issues).toContainEqual({
      type: 'high_miss_rate',
      severity: 'high',
      message: 'Low cache hit rate: 25.0%',
      recommendation: 'Enable cache warming or adjust TTL settings',
    });
  });

  it('should detect storage quota issues', () => {
    const highStorageAnalytics = createMockAnalytics({
      storageUtilization: {
        memory: { used: 95, limit: 100 },
        localStorage: { used: 4500, limit: 5000 },
        indexedDB: { used: 1000, limit: 10000 },
      },
    });

    mockEnhancedCacheInterceptor.getAnalytics.mockReturnValue(highStorageAnalytics);

    const { result } = renderHook(() => useCacheHealth());

    expect(result.current.isHealthy).toBe(false);
    expect(result.current.issues).toContainEqual({
      type: 'storage_quota',
      severity: 'high',
      message: 'Storage quota nearly exceeded: 95.0%',
      recommendation: 'Clear old cache entries or increase storage limits',
    });
  });

  it('should detect request error issues', () => {
    const highErrorAnalytics = createMockAnalytics({
      performance: {
        cacheHits: 100,
        cacheMisses: 50,
        cacheErrors: 20, // 20% error rate
        averageHitTime: 50,
        averageMissTime: 200,
      },
    });

    mockEnhancedCacheInterceptor.getAnalytics.mockReturnValue(highErrorAnalytics);

    const { result } = renderHook(() => useCacheHealth());

    expect(result.current.isHealthy).toBe(false);
    expect(result.current.issues).toContainEqual({
      type: 'request_errors',
      severity: 'high',
      message: 'High cache error rate: 20 errors',
      recommendation: 'Check storage availability and error logs',
    });
  });

  it('should detect multiple issues simultaneously', () => {
    const problematicAnalytics = createMockAnalytics({
      hitRate: 0.2,
      memoryPressure: 0.9,
      storageUtilization: {
        memory: { used: 95, limit: 100 },
        localStorage: { used: 4800, limit: 5000 },
        indexedDB: { used: 1000, limit: 10000 },
      },
      performance: {
        cacheHits: 50,
        cacheMisses: 200,
        cacheErrors: 15,
        averageHitTime: 50,
        averageMissTime: 200,
      },
    });

    mockEnhancedCacheInterceptor.getAnalytics.mockReturnValue(problematicAnalytics);

    const { result } = renderHook(() => useCacheHealth());

    expect(result.current.isHealthy).toBe(false);
    expect(result.current.issues.length).toBeGreaterThan(1);
    
    const issueTypes = result.current.issues.map(issue => issue.type);
    expect(issueTypes).toContain('memory_pressure');
    expect(issueTypes).toContain('high_miss_rate');
    expect(issueTypes).toContain('storage_quota');
    expect(issueTypes).toContain('request_errors');
  });
});

// Helper functions for creating mock data

function createMockAnalytics(overrides: Partial<CacheAnalytics> = {}): CacheAnalytics {
  return {
    hitRate: 0.7,
    memoryPressure: 0.5,
    storageUtilization: {
      memory: { used: 50, limit: 100 },
      localStorage: { used: 2000, limit: 5000 },
      indexedDB: { used: 1000, limit: 10000 },
    },
    performance: {
      cacheHits: 700,
      cacheMisses: 300,
      cacheErrors: 5,
      averageHitTime: 50,
      averageMissTime: 200,
    },
    requestDeduplication: {
      deduplicationRate: 0.1,
      duplicatesSaved: 100,
    },
    ...overrides,
  };
}

function createMockWarmingStats(overrides = {}): any {
  return {
    isActive: false,
    frequencyTracked: 100,
    dependencyNodes: 25,
    topEntities: [
      { entityId: 'W123', entityType: 'W', accessCount: 15, priority: 0.8 },
      { entityId: 'A456', entityType: 'A', accessCount: 12, priority: 0.6 },
    ],
    ...overrides,
  };
}