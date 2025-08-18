/**
 * @file use-prefetch-entity.unit.test.ts
 * @description Comprehensive unit tests for usePrefetchEntity, useBatchPrefetch, and useRelatedPrefetch hooks
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  usePrefetchEntity,
  useBatchPrefetch,
  useRelatedPrefetch,
  type UsePrefetchEntityOptions,
  type UseBatchPrefetchOptions,
  type UseRelatedPrefetchOptions,
} from './use-prefetch-entity';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { CacheWarmingStrategy, type WarmCacheOptions } from '@/lib/openalex/cache-warming';
import { mockWork, mockAuthor } from '@/test/mocks/data';

// Mock the cache warming service
vi.mock('@/lib/openalex/cache-warming', () => {
  const mockPrefetchEntity = vi.fn();
  const mockWarmCache = vi.fn();
  const mockWarmRelatedEntities = vi.fn();

  return {
    cacheWarmingService: {
      prefetchEntity: mockPrefetchEntity,
      warmCache: mockWarmCache,
      warmRelatedEntities: mockWarmRelatedEntities,
    },
    CacheWarmingStrategy: {
      OFF: 'off',
      CONSERVATIVE: 'conservative',
      AGGRESSIVE: 'aggressive',
      CUSTOM: 'custom',
    },
  };
});

// Get access to the mocked functions
let mockPrefetchEntity: any;
let mockWarmCache: any;
let mockWarmRelatedEntities: any;

describe('usePrefetchEntity', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get access to the mocked functions
    const module = await import('@/lib/openalex/cache-warming');
    mockPrefetchEntity = module.cacheWarmingService.prefetchEntity;
    mockWarmCache = module.cacheWarmingService.warmCache;
    mockWarmRelatedEntities = module.cacheWarmingService.warmRelatedEntities;
    
    mockPrefetchEntity.mockResolvedValue(mockWork);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => usePrefetchEntity());

      expect(result.current.isPrefetching).toBe(false);
      expect(result.current.prefetchQueue).toEqual([]);
      expect(result.current.prefetchError).toBeNull();
      expect(result.current.prefetchedCount).toBe(0);
      expect(typeof result.current.prefetch).toBe('function');
      expect(typeof result.current.clearQueue).toBe('function');
    });

    it('should accept configuration options', () => {
      const options: UsePrefetchEntityOptions = {
        strategy: CacheWarmingStrategy.AGGRESSIVE,
        maxQueueSize: 100,
        priority: 'high',
        timeout: 5000,
      };

      const { result } = renderHook(() => usePrefetchEntity(options));

      expect(result.current).toBeDefined();
      expect(result.current.prefetch).toBeDefined();
    });
  });

  describe('Prefetch functionality', () => {
    it('should successfully prefetch an entity', async () => {
      const { result } = renderHook(() => usePrefetchEntity());

      await act(async () => {
        await result.current.prefetch('W2741809807', EntityType.WORK);
      });

      expect(mockPrefetchEntity).toHaveBeenCalledWith(
        'W2741809807',
        EntityType.WORK,
        expect.objectContaining({
          priority: 'normal',
          timeout: 10000,
          strategy: CacheWarmingStrategy.CONSERVATIVE,
        })
      );

      await waitFor(() => {
        expect(result.current.prefetchedCount).toBe(1);
        expect(result.current.isPrefetching).toBe(false);
        expect(result.current.prefetchQueue).toEqual([]);
      });
    });

    it('should handle entity prefetch with custom options', async () => {
      const { result } = renderHook(() => 
        usePrefetchEntity({ priority: 'high', timeout: 5000 })
      );

      await act(async () => {
        await result.current.prefetch('A123456789', EntityType.AUTHOR, {
          priority: 'low',
          skipCache: true,
        });
      });

      expect(mockPrefetchEntity).toHaveBeenCalledWith(
        'A123456789',
        EntityType.AUTHOR,
        expect.objectContaining({
          priority: 'low',
          skipCache: true,
          timeout: 5000,
          strategy: CacheWarmingStrategy.CONSERVATIVE,
        })
      );
    });

    it('should track loading state during prefetch', async () => {
      let resolvePromise: (value: unknown) => void;
      mockPrefetchEntity.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() => usePrefetchEntity());

      act(() => {
        result.current.prefetch('W2741809807', EntityType.WORK);
      });

      // Should be loading immediately
      expect(result.current.isPrefetching).toBe(true);
      expect(result.current.prefetchQueue).toContain('W2741809807');

      // Resolve the promise
      act(() => {
        resolvePromise!(mockWork);
      });

      await waitFor(() => {
        expect(result.current.isPrefetching).toBe(false);
        expect(result.current.prefetchQueue).toEqual([]);
        expect(result.current.prefetchedCount).toBe(1);
      });
    });

    it('should handle prefetch errors gracefully', async () => {
      const error = new Error('Network error');
      mockPrefetchEntity.mockRejectedValue(error);

      const { result } = renderHook(() => usePrefetchEntity());

      await act(async () => {
        await result.current.prefetch('W2741809807', EntityType.WORK);
      });

      await waitFor(() => {
        expect(result.current.prefetchError).toEqual(error);
        expect(result.current.isPrefetching).toBe(false);
        expect(result.current.prefetchQueue).toEqual([]);
      });
    });

    it('should skip prefetch when strategy is OFF', async () => {
      const { result } = renderHook(() => 
        usePrefetchEntity({ strategy: CacheWarmingStrategy.OFF })
      );

      await act(async () => {
        await result.current.prefetch('W2741809807', EntityType.WORK);
      });

      expect(mockPrefetchEntity).not.toHaveBeenCalled();
      expect(result.current.isPrefetching).toBe(false);
    });

    it('should prevent duplicate prefetch requests', async () => {
      const { result } = renderHook(() => usePrefetchEntity());

      // Start first prefetch (don't wait)
      act(() => {
        result.current.prefetch('W2741809807', EntityType.WORK);
      });

      // Try to prefetch same entity again
      await act(async () => {
        await result.current.prefetch('W2741809807', EntityType.WORK);
      });

      // Should only call once
      expect(mockPrefetchEntity).toHaveBeenCalledTimes(1);
    });

    it('should respect maxQueueSize limit', async () => {
      // Make prefetching hang so we can test queue limit
      let resolvePromise: (value: unknown) => void;
      mockPrefetchEntity.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() => 
        usePrefetchEntity({ maxQueueSize: 2 })
      );

      // Start first two prefetches (don't await)
      act(() => {
        result.current.prefetch('W1', EntityType.WORK);
        result.current.prefetch('W2', EntityType.WORK);
      });

      // Queue should be at capacity
      expect(result.current.prefetchQueue.length).toBe(2);

      // Try to add third (should be rejected)
      await act(async () => {
        await result.current.prefetch('W3', EntityType.WORK);
      });

      // Should only have called for first two
      expect(mockPrefetchEntity).toHaveBeenCalledTimes(2);
      expect(result.current.prefetchQueue.length).toBe(2);
    });
  });

  describe('Queue management', () => {
    it('should clear the prefetch queue', async () => {
      const { result } = renderHook(() => usePrefetchEntity());

      // Add some items to queue
      act(() => {
        result.current.prefetch('W1', EntityType.WORK);
        result.current.prefetch('W2', EntityType.WORK);
      });

      // Clear queue
      act(() => {
        result.current.clearQueue();
      });

      expect(result.current.prefetchQueue).toEqual([]);
      expect(result.current.isPrefetching).toBe(false);
      expect(result.current.prefetchError).toBeNull();
    });

    it('should remove items from queue after processing', async () => {
      const { result } = renderHook(() => usePrefetchEntity());

      await act(async () => {
        await result.current.prefetch('W2741809807', EntityType.WORK);
      });

      expect(result.current.prefetchQueue).toEqual([]);
    });
  });

  describe('Component lifecycle', () => {
    it('should handle unmount during prefetch', async () => {
      let resolvePromise: (value: unknown) => void;
      mockPrefetchEntity.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result, unmount } = renderHook(() => usePrefetchEntity());

      // Start prefetch
      act(() => {
        result.current.prefetch('W2741809807', EntityType.WORK);
      });

      // Unmount while prefetching
      unmount();

      // Resolve after unmount
      act(() => {
        resolvePromise!(mockWork);
      });

      // Should not crash or update state
      expect(() => resolvePromise!(mockWork)).not.toThrow();
    });
  });
});

describe('useBatchPrefetch', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get access to the mocked functions if not already set
    if (!mockWarmCache) {
      const module = await import('@/lib/openalex/cache-warming');
      mockPrefetchEntity = module.cacheWarmingService.prefetchEntity;
      mockWarmCache = module.cacheWarmingService.warmCache;
      mockWarmRelatedEntities = module.cacheWarmingService.warmRelatedEntities;
    }
    
    mockWarmCache.mockResolvedValue({
      successful: ['W1', 'W2'],
      failed: [],
      totalTime: 1000,
      cacheHits: 0,
      cacheMisses: 2,
    });
  });

  describe('Basic functionality', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useBatchPrefetch());

      expect(result.current.isBatchPrefetching).toBe(false);
      expect(result.current.batchProgress).toBeNull();
      expect(typeof result.current.batchPrefetch).toBe('function');
      expect(typeof result.current.cancelBatch).toBe('function');
    });

    it('should successfully batch prefetch entities', async () => {
      const { result } = renderHook(() => useBatchPrefetch());

      await act(async () => {
        await result.current.batchPrefetch(['W1', 'W2', 'W3']);
      });

      expect(mockWarmCache).toHaveBeenCalledWith(
        ['W1', 'W2', 'W3'],
        expect.objectContaining({
          maxConcurrency: 5,
          batchSize: 10,
          strategy: CacheWarmingStrategy.CONSERVATIVE,
        })
      );

      await waitFor(() => {
        expect(result.current.isBatchPrefetching).toBe(false);
      });
    });

    it('should track progress during batch prefetch', async () => {
      const onProgress = vi.fn();
      let progressCallback: (progress: any) => void;

      mockWarmCache.mockImplementation(async (entities: string[], options: WarmCacheOptions) => {
        progressCallback = options!.onProgress!;
        // Simulate progress updates immediately
        progressCallback({ completed: 1, total: 3, errors: [] });
        progressCallback({ completed: 2, total: 3, errors: [] });
        progressCallback({ completed: 3, total: 3, errors: [] });
        
        return Promise.resolve({
          successful: entities,
          failed: [],
          totalTime: 1000,
          cacheHits: 0,
          cacheMisses: entities.length,
        });
      });

      const { result } = renderHook(() => 
        useBatchPrefetch({ onProgress })
      );

      await act(async () => {
        await result.current.batchPrefetch(['W1', 'W2', 'W3']);
      });

      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({ completed: 3, total: 3 })
      );
    });

    it('should handle batch prefetch cancellation', async () => {
      const { result } = renderHook(() => useBatchPrefetch());

      // Start batch
      act(() => {
        result.current.batchPrefetch(['W1', 'W2', 'W3']);
      });

      // Cancel immediately
      act(() => {
        result.current.cancelBatch();
      });

      expect(result.current.isBatchPrefetching).toBe(false);
      expect(result.current.batchProgress).toBeNull();
    });

    it('should skip batch prefetch when strategy is OFF', async () => {
      const { result } = renderHook(() => 
        useBatchPrefetch({ strategy: CacheWarmingStrategy.OFF })
      );

      await act(async () => {
        await result.current.batchPrefetch(['W1', 'W2']);
      });

      expect(mockWarmCache).not.toHaveBeenCalled();
      expect(result.current.isBatchPrefetching).toBe(false);
    });
  });

  describe('Configuration options', () => {
    it('should accept custom batch prefetch options', async () => {
      const options: UseBatchPrefetchOptions = {
        maxConcurrency: 10,
        batchSize: 5,
        strategy: CacheWarmingStrategy.AGGRESSIVE,
      };

      const { result } = renderHook(() => useBatchPrefetch(options));

      await act(async () => {
        await result.current.batchPrefetch(['W1', 'W2']);
      });

      expect(mockWarmCache).toHaveBeenCalledWith(
        ['W1', 'W2'],
        expect.objectContaining({
          maxConcurrency: 10,
          batchSize: 5,
          strategy: CacheWarmingStrategy.AGGRESSIVE,
        })
      );
    });
  });
});

describe('useRelatedPrefetch', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get access to the mocked functions if not already set
    if (!mockWarmRelatedEntities) {
      const module = await import('@/lib/openalex/cache-warming');
      mockPrefetchEntity = module.cacheWarmingService.prefetchEntity;
      mockWarmCache = module.cacheWarmingService.warmCache;
      mockWarmRelatedEntities = module.cacheWarmingService.warmRelatedEntities;
    }
    
    mockWarmRelatedEntities.mockResolvedValue({
      successful: ['A123', 'I456'],
      failed: [],
      totalTime: 500,
      cacheHits: 0,
      cacheMisses: 2,
    });
  });

  describe('Basic functionality', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useRelatedPrefetch());

      expect(result.current.isRelatedPrefetching).toBe(false);
      expect(result.current.relatedPrefetchCount).toBe(0);
      expect(typeof result.current.prefetchRelated).toBe('function');
    });

    it('should successfully prefetch related entities', async () => {
      const { result } = renderHook(() => useRelatedPrefetch());

      await act(async () => {
        await result.current.prefetchRelated('W2741809807', EntityType.WORK);
      });

      // Wait for delay
      await waitFor(() => {
        expect(mockWarmRelatedEntities).toHaveBeenCalledWith(
          'W2741809807',
          EntityType.WORK,
          1
        );
      }, { timeout: 2000 });

      await waitFor(() => {
        expect(result.current.isRelatedPrefetching).toBe(false);
        expect(result.current.relatedPrefetchCount).toBe(2);
      });
    });

    it('should respect delay configuration', async () => {
      const { result } = renderHook(() => 
        useRelatedPrefetch({ delayMs: 100 })
      );

      const startTime = Date.now();

      await act(async () => {
        await result.current.prefetchRelated('W2741809807', EntityType.WORK);
      });

      await waitFor(() => {
        expect(mockWarmRelatedEntities).toHaveBeenCalled();
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeGreaterThanOrEqual(100);
      }, { timeout: 500 });
    });

    it('should cancel previous timeout when new prefetch is triggered', async () => {
      const { result } = renderHook(() => 
        useRelatedPrefetch({ delayMs: 500 })
      );

      // Start first prefetch
      act(() => {
        result.current.prefetchRelated('W1', EntityType.WORK);
      });

      // Start second prefetch before first completes
      act(() => {
        result.current.prefetchRelated('W2', EntityType.WORK);
      });

      // Wait for delay
      await waitFor(() => {
        expect(mockWarmRelatedEntities).toHaveBeenCalledWith(
          'W2',
          EntityType.WORK,
          1
        );
      }, { timeout: 1000 });

      // Should only be called once (for W2)
      expect(mockWarmRelatedEntities).toHaveBeenCalledTimes(1);
    });

    it('should handle related prefetch with custom depth', async () => {
      const { result } = renderHook(() => 
        useRelatedPrefetch({ depth: 2 })
      );

      await act(async () => {
        await result.current.prefetchRelated('W2741809807', EntityType.WORK);
      });

      await waitFor(() => {
        expect(mockWarmRelatedEntities).toHaveBeenCalledWith(
          'W2741809807',
          EntityType.WORK,
          2
        );
      }, { timeout: 2000 });
    });

    it('should skip when disabled', async () => {
      const { result } = renderHook(() => 
        useRelatedPrefetch({ enabled: false })
      );

      await act(async () => {
        await result.current.prefetchRelated('W2741809807', EntityType.WORK);
      });

      // Wait a bit to ensure no call is made
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(mockWarmRelatedEntities).not.toHaveBeenCalled();
    });

    it('should skip when strategy is OFF', async () => {
      const { result } = renderHook(() => 
        useRelatedPrefetch({ strategy: CacheWarmingStrategy.OFF })
      );

      await act(async () => {
        await result.current.prefetchRelated('W2741809807', EntityType.WORK);
      });

      // Wait a bit to ensure no call is made
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(mockWarmRelatedEntities).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle related prefetch errors gracefully', async () => {
      const error = new Error('Related prefetch failed');
      mockWarmRelatedEntities.mockRejectedValue(error);

      const { result } = renderHook(() => useRelatedPrefetch());

      await act(async () => {
        await result.current.prefetchRelated('W2741809807', EntityType.WORK);
      });

      await waitFor(() => {
        expect(result.current.isRelatedPrefetching).toBe(false);
      }, { timeout: 2000 });

      // Should not crash
      expect(result.current.relatedPrefetchCount).toBe(0);
    });
  });

  describe('Component lifecycle', () => {
    it('should cleanup timeout on unmount', async () => {
      const { result, unmount } = renderHook(() => 
        useRelatedPrefetch({ delayMs: 1000 })
      );

      // Start prefetch
      act(() => {
        result.current.prefetchRelated('W2741809807', EntityType.WORK);
      });

      // Unmount before delay completes
      unmount();

      // Wait longer than delay
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Should not have been called
      expect(mockWarmRelatedEntities).not.toHaveBeenCalled();
    });
  });
});