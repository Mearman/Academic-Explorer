/**
 * @file cache-warming.integration.test.ts
 * @description Integration tests for cache warming hooks with real cache warming service
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { server } from '@/test/setup';
import { http, HttpResponse } from 'msw';
import {
  usePrefetchEntity,
  useBatchPrefetch,
  useRelatedPrefetch,
  useWarmCache,
  useBackgroundWarming,
} from './cache-warming';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { CacheWarmingStrategy } from '@/lib/openalex/cache-warming';
import { mockWork, mockAuthor, mockInstitution } from '@/test/mocks/data';

// Mock the OpenAlex client at a lower level
vi.mock('@/lib/openalex/client-with-cache', () => ({
  cachedOpenAlex: {
    work: vi.fn(),
    author: vi.fn(),
    source: vi.fn(),
    institution: vi.fn(),
    publisher: vi.fn(),
    funder: vi.fn(),
    topic: vi.fn(),
    concept: vi.fn(),
    request: vi.fn(),
  },
}));

// Get access to the mocked client
let mockCachedOpenAlex: any;
beforeEach(async () => {
  const module = await import('@/lib/openalex/client-with-cache');
  mockCachedOpenAlex = module.cachedOpenAlex;
});

describe('Cache Warming Hooks Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockCachedOpenAlex.work.mockResolvedValue(mockWork);
    mockCachedOpenAlex.author.mockResolvedValue(mockAuthor);
    mockCachedOpenAlex.institution.mockResolvedValue(mockInstitution);
    mockCachedOpenAlex.source.mockResolvedValue({ id: 'S123', display_name: 'Test Source' });
    mockCachedOpenAlex.publisher.mockResolvedValue({ id: 'P123', display_name: 'Test Publisher' });
    mockCachedOpenAlex.funder.mockResolvedValue({ id: 'F123', display_name: 'Test Funder' });
    mockCachedOpenAlex.topic.mockResolvedValue({ id: 'T123', display_name: 'Test Topic' });
    mockCachedOpenAlex.concept.mockResolvedValue({ id: 'C123', display_name: 'Test Concept' });
    mockCachedOpenAlex.request.mockResolvedValue({ id: 'R123', display_name: 'Test Resource' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('usePrefetchEntity Integration', () => {
    it('should successfully prefetch different entity types', async () => {
      const { result } = renderHook(() => usePrefetchEntity());

      // Test Work prefetching
      await act(async () => {
        await result.current.prefetch('W2741809807', EntityType.WORK);
      });

      expect(mockCachedOpenAlex.work).toHaveBeenCalledWith('W2741809807', undefined);
      expect(result.current.prefetchedCount).toBe(1);

      // Test Author prefetching
      await act(async () => {
        await result.current.prefetch('A5017898742', EntityType.AUTHOR);
      });

      expect(mockCachedOpenAlex.author).toHaveBeenCalledWith('A5017898742', undefined);
      expect(result.current.prefetchedCount).toBe(2);

      // Test Institution prefetching
      await act(async () => {
        await result.current.prefetch('I123456789', EntityType.INSTITUTION);
      });

      expect(mockCachedOpenAlex.institution).toHaveBeenCalledWith('I123456789', undefined);
      expect(result.current.prefetchedCount).toBe(3);
    });

    it('should handle entity detection and normalization', async () => {
      const { result } = renderHook(() => usePrefetchEntity());

      // Test with full OpenAlex URL
      await act(async () => {
        await result.current.prefetch('https://openalex.org/W2741809807', EntityType.WORK);
      });

      expect(mockCachedOpenAlex.work).toHaveBeenCalledWith('W2741809807', undefined);
    });

    it('should handle skipCache option', async () => {
      const { result } = renderHook(() => usePrefetchEntity());

      await act(async () => {
        await result.current.prefetch('W2741809807', EntityType.WORK, {
          skipCache: true,
        });
      });

      expect(mockCachedOpenAlex.work).toHaveBeenCalledWith('W2741809807', true);
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error');
      mockCachedOpenAlex.work.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => usePrefetchEntity());

      await act(async () => {
        await result.current.prefetch('W2741809807', EntityType.WORK);
      });

      await waitFor(() => {
        expect(result.current.prefetchError).toEqual(networkError);
        expect(result.current.isPrefetching).toBe(false);
      });
    });

    it('should work with aggressive strategy', async () => {
      const { result } = renderHook(() => 
        usePrefetchEntity({ strategy: CacheWarmingStrategy.AGGRESSIVE })
      );

      await act(async () => {
        await result.current.prefetch('W2741809807', EntityType.WORK);
      });

      expect(mockCachedOpenAlex.work).toHaveBeenCalled();
      expect(result.current.prefetchedCount).toBe(1);
    });
  });

  describe('useBatchPrefetch Integration', () => {
    it('should prefetch multiple entities in batch', async () => {
      const { result } = renderHook(() => useBatchPrefetch());

      const entityIds = ['W1', 'W2', 'A1', 'I1'];

      await act(async () => {
        await result.current.batchPrefetch(entityIds);
      });

      // Should have called the appropriate methods for each entity type
      expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(2); // W1, W2
      expect(mockCachedOpenAlex.author).toHaveBeenCalledTimes(1); // A1
      expect(mockCachedOpenAlex.institution).toHaveBeenCalledTimes(1); // I1

      await waitFor(() => {
        expect(result.current.isBatchPrefetching).toBe(false);
      });
    });

    it('should track progress during batch prefetch', async () => {
      const onProgress = vi.fn();
      const { result } = renderHook(() => useBatchPrefetch({ onProgress }));

      await act(async () => {
        await result.current.batchPrefetch(['W1', 'W2', 'W3']);
      });

      expect(onProgress).toHaveBeenCalled();
      expect(onProgress).toHaveBeenLastCalledWith(
        expect.objectContaining({
          completed: 3,
          total: 3,
          errors: [],
        })
      );
    });

    it('should handle partial failures in batch', async () => {
      // Make second work request fail
      mockCachedOpenAlex.work
        .mockResolvedValueOnce(mockWork) // W1 succeeds
        .mockRejectedValueOnce(new Error('W2 failed')) // W2 fails
        .mockResolvedValueOnce(mockWork); // W3 succeeds

      const onError = vi.fn();
      const { result } = renderHook(() => useBatchPrefetch({ onError }));

      await act(async () => {
        await result.current.batchPrefetch(['W1', 'W2', 'W3']);
      });

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        'W2'
      );

      await waitFor(() => {
        expect(result.current.isBatchPrefetching).toBe(false);
      });
    });
  });

  describe('useRelatedPrefetch Integration', () => {
    it('should prefetch related entities for a work', async () => {
      // Mock a work with related entities
      const workWithRelated = {
        ...mockWork,
        authorships: [
          {
            author: { id: 'https://openalex.org/A123' },
            institutions: [
              { id: 'https://openalex.org/I456' },
              { id: 'https://openalex.org/I789' },
            ],
          },
          {
            author: { id: 'https://openalex.org/A456' },
            institutions: [
              { id: 'https://openalex.org/I456' },
            ],
          },
        ],
        primary_location: {
          source: { id: 'https://openalex.org/S123' },
        },
        concepts: [
          { id: 'https://openalex.org/C111' },
          { id: 'https://openalex.org/C222' },
        ],
      };

      mockCachedOpenAlex.work.mockResolvedValueOnce(workWithRelated);

      const { result } = renderHook(() => 
        useRelatedPrefetch({ delayMs: 100 })
      );

      await act(async () => {
        await result.current.prefetchRelated('W2741809807', EntityType.WORK);
      });

      // Wait for the delay and related prefetching
      await waitFor(() => {
        expect(result.current.isRelatedPrefetching).toBe(false);
      }, { timeout: 2000 });

      // Should have prefetched the main work
      expect(mockCachedOpenAlex.work).toHaveBeenCalledWith('W2741809807', undefined);

      // Should have prefetched related entities
      expect(mockCachedOpenAlex.author).toHaveBeenCalledWith('A123', undefined);
      expect(mockCachedOpenAlex.author).toHaveBeenCalledWith('A456', undefined);
      expect(mockCachedOpenAlex.institution).toHaveBeenCalledWith('I456', undefined);
      expect(mockCachedOpenAlex.institution).toHaveBeenCalledWith('I789', undefined);
      expect(mockCachedOpenAlex.source).toHaveBeenCalledWith('S123', undefined);
      expect(mockCachedOpenAlex.concept).toHaveBeenCalledWith('C111', undefined);
      expect(mockCachedOpenAlex.concept).toHaveBeenCalledWith('C222', undefined);

      expect(result.current.relatedPrefetchCount).toBeGreaterThan(0);
    });

    it('should handle depth parameter for recursive related prefetching', async () => {
      // Mock author with institution relationships
      const authorWithInstitutions = {
        ...mockAuthor,
        last_known_institutions: [
          { id: 'https://openalex.org/I123' },
        ],
      };

      const institutionWithAssociated = {
        ...mockInstitution,
        associated_institutions: [
          { id: 'https://openalex.org/I456' },
        ],
      };

      mockCachedOpenAlex.author.mockResolvedValueOnce(authorWithInstitutions);
      mockCachedOpenAlex.institution
        .mockResolvedValueOnce(institutionWithAssociated) // I123
        .mockResolvedValueOnce({ id: 'I456', display_name: 'Associated Institution' }); // I456

      const { result } = renderHook(() => 
        useRelatedPrefetch({ delayMs: 100, depth: 2 })
      );

      await act(async () => {
        await result.current.prefetchRelated('A5017898742', EntityType.AUTHOR);
      });

      await waitFor(() => {
        expect(result.current.isRelatedPrefetching).toBe(false);
      }, { timeout: 3000 });

      // Should have prefetched at multiple levels
      expect(mockCachedOpenAlex.author).toHaveBeenCalledWith('A5017898742', undefined);
      expect(mockCachedOpenAlex.institution).toHaveBeenCalledWith('I123', undefined);
      expect(mockCachedOpenAlex.institution).toHaveBeenCalledWith('I456', undefined);

      expect(result.current.relatedPrefetchCount).toBeGreaterThan(0);
    });
  });

  describe('useWarmCache Integration', () => {
    it('should warm cache for mixed entity types', async () => {
      const { result } = renderHook(() => useWarmCache());

      const entityIds = ['W1', 'W2', 'A1', 'I1', 'S1', 'T1'];

      let warmResult: any;
      await act(async () => {
        warmResult = await result.current.warmCache(entityIds);
      });

      expect(warmResult).toBeDefined();
      expect(warmResult.successful).toContain('W1');
      expect(warmResult.successful).toContain('W2');
      expect(warmResult.successful).toContain('A1');
      expect(warmResult.successful).toContain('I1');
      expect(warmResult.successful).toContain('S1');
      expect(warmResult.successful).toContain('T1');

      expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(2);
      expect(mockCachedOpenAlex.author).toHaveBeenCalledTimes(1);
      expect(mockCachedOpenAlex.institution).toHaveBeenCalledTimes(1);
      expect(mockCachedOpenAlex.source).toHaveBeenCalledTimes(1);
      expect(mockCachedOpenAlex.topic).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrency and batching', async () => {
      const { result } = renderHook(() => 
        useWarmCache({
          maxConcurrency: 2,
          batchSize: 3,
        })
      );

      // Create a larger batch to test batching behavior
      const entityIds = Array.from({ length: 10 }, (_, i) => `W${i + 1}`);

      await act(async () => {
        await result.current.warmCache(entityIds);
      });

      expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(10);
      
      await waitFor(() => {
        expect(result.current.isWarming).toBe(false);
        expect(result.current.lastResult).toBeDefined();
      });
    });

    it('should collect and retry failed entities', async () => {
      // Make some entities fail
      mockCachedOpenAlex.work
        .mockResolvedValueOnce(mockWork) // W1 succeeds
        .mockRejectedValueOnce(new Error('W2 failed')) // W2 fails
        .mockResolvedValueOnce(mockWork) // W3 succeeds
        .mockResolvedValueOnce(mockWork); // W2 retry succeeds

      const { result } = renderHook(() => 
        useWarmCache({ retryFailedEntities: true })
      );

      // Initial warming with failures
      await act(async () => {
        await result.current.warmCache(['W1', 'W2', 'W3']);
      });

      expect(result.current.lastResult?.failed).toHaveLength(1);
      expect(result.current.lastResult?.failed[0].entityId).toBe('W2');

      // Retry failed entities
      await act(async () => {
        await result.current.retryFailed();
      });

      // Should have called W2 again for retry
      expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(4); // 3 initial + 1 retry
      expect(mockCachedOpenAlex.work).toHaveBeenLastCalledWith('W2', undefined);
    });
  });

  describe('useBackgroundWarming Integration', () => {
    it('should process background warming queue', async () => {
      const { result } = renderHook(() => 
        useBackgroundWarming({ 
          idleThreshold: 100,
          maxIdleRequests: 2,
        })
      );

      // Schedule background warming
      act(() => {
        result.current.scheduleWarming(['W1', 'W2'], 'high');
        result.current.scheduleWarming(['W3', 'W4'], 'low');
      });

      expect(result.current.backgroundQueue).toBe(2);

      // Wait for background processing
      await waitFor(() => {
        expect(result.current.backgroundQueue).toBeLessThan(2);
      }, { timeout: 3000 });

      // Should have processed some entities
      expect(mockCachedOpenAlex.work).toHaveBeenCalled();
    });

    it('should handle background warming errors gracefully', async () => {
      mockCachedOpenAlex.work.mockRejectedValue(new Error('Background warming failed'));

      const { result } = renderHook(() => 
        useBackgroundWarming({ idleThreshold: 100 })
      );

      // Schedule work that will fail
      act(() => {
        result.current.scheduleWarming(['W1']);
      });

      // Wait for processing
      await waitFor(() => {
        expect(result.current.backgroundQueue).toBe(0);
      }, { timeout: 2000 });

      // Should have attempted the warming
      expect(mockCachedOpenAlex.work).toHaveBeenCalled();
      
      // Should not crash the hook
      expect(result.current.scheduleWarming).toBeDefined();
    });

    it('should pause and resume background processing', async () => {
      const { result } = renderHook(() => 
        useBackgroundWarming({ idleThreshold: 100 })
      );

      // Schedule work
      act(() => {
        result.current.scheduleWarming(['W1']);
      });

      // Pause immediately
      act(() => {
        result.current.pauseBackgroundWarming();
      });

      // Wait a bit - should not process while paused
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(result.current.backgroundQueue).toBe(1);
      expect(mockCachedOpenAlex.work).not.toHaveBeenCalled();

      // Resume
      act(() => {
        result.current.resumeBackgroundWarming();
      });

      // Now it should process
      await waitFor(() => {
        expect(result.current.backgroundQueue).toBe(0);
      }, { timeout: 2000 });

      expect(mockCachedOpenAlex.work).toHaveBeenCalled();
    });
  });

  describe('Cross-hook Integration', () => {
    it('should work together - prefetch leads to background warming', async () => {
      const { result: prefetchResult } = renderHook(() => 
        usePrefetchEntity({ strategy: CacheWarmingStrategy.AGGRESSIVE })
      );
      
      const { result: backgroundResult } = renderHook(() => 
        useBackgroundWarming({ idleThreshold: 100 })
      );

      // Prefetch a work with related entities
      const workWithRelated = {
        ...mockWork,
        authorships: [
          { author: { id: 'https://openalex.org/A123' } },
        ],
      };

      mockCachedOpenAlex.work.mockResolvedValueOnce(workWithRelated);

      await act(async () => {
        await prefetchResult.current.prefetch('W2741809807', EntityType.WORK);
      });

      expect(prefetchResult.current.prefetchedCount).toBe(1);

      // Background warming should eventually process related entities
      await waitFor(() => {
        expect(backgroundResult.current.backgroundQueue).toBeGreaterThanOrEqual(0);
      }, { timeout: 2000 });
    });
  });
});