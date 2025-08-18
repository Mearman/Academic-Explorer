/**
 * Unit tests for useEntityData hook with request deduplication
 * Tests integration between useEntityData and request deduplication system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock the cached OpenAlex client with factory function
vi.mock('@/lib/openalex', () => ({
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

// Mock entity detection utilities
vi.mock('@/lib/openalex/utils/entity-detection', () => ({
  detectEntityType: vi.fn((id: string) => {
    if (id.startsWith('W')) return 'work';
    if (id.startsWith('A')) return 'author';
    return 'work';
  }),
  normalizeEntityId: vi.fn((id: string) => id),
  EntityType: {
    WORK: 'work',
    AUTHOR: 'author',
    SOURCE: 'source',
    INSTITUTION: 'institution',
    PUBLISHER: 'publisher',
    FUNDER: 'funder',
    TOPIC: 'topic',
    CONCEPT: 'concept',
    CONTINENT: 'continent',
    KEYWORD: 'keyword',
    REGION: 'region',
  },
}));

import { useEntityData, EntityType, EntityLoadingState } from './use-entity-data';
import { cachedOpenAlex } from '@/lib/openalex';
import type { Work, Author } from '@/lib/openalex/types';

const mockCachedOpenAlex = vi.mocked(cachedOpenAlex);

describe('useEntityData with Request Deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('concurrent hook usage', () => {
    it('should deduplicate requests when multiple hooks request the same entity', async () => {
      const workData = {
        id: 'W123456789',
        title: 'Test Work',
        cited_by_count: 100,
        display_name: 'Test Work'
      } as Work;

      // Create a controlled promise to simulate async behavior
      let resolveWork: (value: Work) => void;
      const workPromise = new Promise<Work>((resolve) => {
        resolveWork = resolve;
      });

      mockCachedOpenAlex.work.mockReturnValue(workPromise);

      // Render multiple hooks for the same entity simultaneously
      const { result: result1 } = renderHook(() =>
        useEntityData('W123456789', EntityType.WORK)
      );

      const { result: result2 } = renderHook(() =>
        useEntityData('W123456789', EntityType.WORK)
      );

      const { result: result3 } = renderHook(() =>
        useEntityData('W123456789', EntityType.WORK)
      );

      // All should start in loading state
      expect(result1.current.loading).toBe(true);
      expect(result2.current.loading).toBe(true);
      expect(result3.current.loading).toBe(true);

      // Resolve the work promise
      act(() => {
        resolveWork(workData);
      });

      // Wait for all hooks to complete
      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
        expect(result2.current.loading).toBe(false);
        expect(result3.current.loading).toBe(false);
      });

      // All should have the same data
      expect(result1.current.data).toEqual(workData);
      expect(result2.current.data).toEqual(workData);
      expect(result3.current.data).toEqual(workData);

      // API should only be called once due to deduplication
      expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(1);
      expect(mockCachedOpenAlex.work).toHaveBeenCalledWith('W123456789', false);
    });

    it('should handle different entities independently', async () => {
      const workData = {
        id: 'W123456789',
        title: 'Test Work',
        display_name: 'Test Work'
      } as Work;

      const authorData = {
        id: 'A987654321',
        display_name: 'Test Author',
        works_count: 50
      } as Author;

      mockCachedOpenAlex.work.mockResolvedValue(workData);
      mockCachedOpenAlex.author.mockResolvedValue(authorData);

      // Render hooks for different entities
      const { result: workResult } = renderHook(() =>
        useEntityData('W123456789', EntityType.WORK)
      );

      const { result: authorResult } = renderHook(() =>
        useEntityData('A987654321', EntityType.AUTHOR)
      );

      // Wait for both to complete
      await waitFor(() => {
        expect(workResult.current.loading).toBe(false);
        expect(authorResult.current.loading).toBe(false);
      });

      // Should have different data
      expect(workResult.current.data).toEqual(workData);
      expect(authorResult.current.data).toEqual(authorData);

      // Both APIs should be called (no deduplication between different entities)
      expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(1);
      expect(mockCachedOpenAlex.author).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent errors correctly', async () => {
      const error = new Error('Network error');

      // Create a controlled promise to simulate error
      let rejectWork: (error: Error) => void;
      const workPromise = new Promise<Work>((_, reject) => {
        rejectWork = reject;
      });

      mockCachedOpenAlex.work.mockReturnValue(workPromise);

      // Render multiple hooks for the same entity
      const { result: result1 } = renderHook(() =>
        useEntityData('W123456789', EntityType.WORK)
      );

      const { result: result2 } = renderHook(() =>
        useEntityData('W123456789', EntityType.WORK)
      );

      // Reject the work promise
      act(() => {
        rejectWork(error);
      });

      // Wait for all hooks to complete
      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
        expect(result2.current.loading).toBe(false);
      });

      // All should have the same error
      expect(result1.current.error).not.toBeNull();
      expect(result2.current.error).not.toBeNull();
      expect(result1.current.error?.message).toContain('Network connection failed');
      expect(result2.current.error?.message).toContain('Network connection failed');

      // API should only be called once
      expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(1);
    });
  });

  describe('sequential requests', () => {
    it('should not deduplicate sequential requests for the same entity', async () => {
      const workData1 = {
        id: 'W123456789',
        title: 'Test Work Version 1',
        display_name: 'Test Work Version 1'
      } as Work;

      const workData2 = {
        id: 'W123456789',
        title: 'Test Work Version 2',
        display_name: 'Test Work Version 2'
      } as Work;

      mockCachedOpenAlex.work
        .mockResolvedValueOnce(workData1)
        .mockResolvedValueOnce(workData2);

      // First hook
      const { result: result1 } = renderHook(() =>
        useEntityData('W123456789', EntityType.WORK)
      );

      // Wait for first to complete
      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
      });

      expect(result1.current.data).toEqual(workData1);

      // Second hook (after first is complete)
      const { result: result2 } = renderHook(() =>
        useEntityData('W123456789', EntityType.WORK)
      );

      // Wait for second to complete
      await waitFor(() => {
        expect(result2.current.loading).toBe(false);
      });

      expect(result2.current.data).toEqual(workData2);

      // API should be called twice (sequential, not concurrent)
      expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(2);
    });
  });

  describe('refetch functionality', () => {
    it('should handle concurrent refetches correctly', async () => {
      const initialData = {
        id: 'W123456789',
        title: 'Initial Work',
        display_name: 'Initial Work'
      } as Work;

      const refetchedData = {
        id: 'W123456789',
        title: 'Refetched Work',
        display_name: 'Refetched Work'
      } as Work;

      mockCachedOpenAlex.work
        .mockResolvedValueOnce(initialData)
        .mockResolvedValue(refetchedData);

      // Render multiple hooks for the same entity
      const { result: result1 } = renderHook(() =>
        useEntityData('W123456789', EntityType.WORK)
      );

      const { result: result2 } = renderHook(() =>
        useEntityData('W123456789', EntityType.WORK)
      );

      // Wait for initial load
      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
        expect(result2.current.loading).toBe(false);
      });

      expect(result1.current.data).toEqual(initialData);
      expect(result2.current.data).toEqual(initialData);

      // Refetch from both hooks simultaneously
      act(() => {
        result1.current.refetch();
        result2.current.refetch();
      });

      // Wait for refetch to complete
      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
        expect(result2.current.loading).toBe(false);
      });

      // Both should have the refetched data
      expect(result1.current.data).toEqual(refetchedData);
      expect(result2.current.data).toEqual(refetchedData);

      // Should have initial call + one refetch (deduplicated)
      expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(2);
    });
  });

  describe('retry functionality', () => {
    it('should handle concurrent retries correctly', async () => {
      const error = new Error('Network error');
      const retryData = {
        id: 'W123456789',
        title: 'Retry Success',
        display_name: 'Retry Success'
      } as Work;

      mockCachedOpenAlex.work
        .mockRejectedValueOnce(error)
        .mockResolvedValue(retryData);

      // Render multiple hooks for the same entity
      const { result: result1 } = renderHook(() =>
        useEntityData('W123456789', EntityType.WORK)
      );

      const { result: result2 } = renderHook(() =>
        useEntityData('W123456789', EntityType.WORK)
      );

      // Wait for initial error
      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
        expect(result2.current.loading).toBe(false);
        expect(result1.current.error).not.toBeNull();
        expect(result2.current.error).not.toBeNull();
      });

      // Retry from both hooks simultaneously
      act(() => {
        result1.current.retry();
        result2.current.retry();
      });

      // Wait for retry to complete
      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
        expect(result2.current.loading).toBe(false);
        expect(result1.current.error).toBeNull();
        expect(result2.current.error).toBeNull();
      });

      // Both should have the retry data
      expect(result1.current.data).toEqual(retryData);
      expect(result2.current.data).toEqual(retryData);

      // Should have initial call + one retry (deduplicated)
      expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(2);
    });
  });

  describe('hook options impact on deduplication', () => {
    it('should respect skipCache option in deduplication', async () => {
      const cachedData = {
        id: 'W123456789',
        title: 'Cached Work',
        display_name: 'Cached Work'
      } as Work;

      const freshData = {
        id: 'W123456789',
        title: 'Fresh Work',
        display_name: 'Fresh Work'
      } as Work;

      mockCachedOpenAlex.work
        .mockResolvedValueOnce(cachedData)  // Normal request
        .mockResolvedValueOnce(freshData);  // Skip cache request

      // One hook with cache, one without
      const { result: cachedResult } = renderHook(() =>
        useEntityData('W123456789', EntityType.WORK, { skipCache: false })
      );

      const { result: freshResult } = renderHook(() =>
        useEntityData('W123456789', EntityType.WORK, { skipCache: true })
      );

      // Wait for both to complete
      await waitFor(() => {
        expect(cachedResult.current.loading).toBe(false);
        expect(freshResult.current.loading).toBe(false);
      });

      // Different skipCache options should not be deduplicated
      expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(2);
      expect(mockCachedOpenAlex.work).toHaveBeenCalledWith('W123456789', false);
      expect(mockCachedOpenAlex.work).toHaveBeenCalledWith('W123456789', true);
    });

    it('should respect enabled option in deduplication', async () => {
      const workData = {
        id: 'W123456789',
        title: 'Test Work',
        display_name: 'Test Work'
      } as Work;

      mockCachedOpenAlex.work.mockResolvedValue(workData);

      // One enabled, one disabled
      const { result: enabledResult } = renderHook(() =>
        useEntityData('W123456789', EntityType.WORK, { enabled: true })
      );

      const { result: disabledResult } = renderHook(() =>
        useEntityData('W123456789', EntityType.WORK, { enabled: false })
      );

      // Wait a bit for any potential requests
      await waitFor(() => {
        // Enabled hook should have data
        expect(enabledResult.current.loading).toBe(false);
        expect(enabledResult.current.data).toEqual(workData);

        // Disabled hook should remain idle
        expect(disabledResult.current.state).toBe(EntityLoadingState.IDLE);
        expect(disabledResult.current.data).toBeNull();
      });

      // Only the enabled hook should make a request
      expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(1);
    });
  });

  describe('component unmounting during deduplication', () => {
    it('should handle component unmount during concurrent requests', async () => {
      const workData = {
        id: 'W123456789',
        title: 'Test Work',
        display_name: 'Test Work'
      } as Work;

      // Create a controlled promise
      let resolveWork: (value: Work) => void;
      const workPromise = new Promise<Work>((resolve) => {
        resolveWork = resolve;
      });

      mockCachedOpenAlex.work.mockReturnValue(workPromise);

      // Render two hooks
      const { result: result1, unmount: unmount1 } = renderHook(() =>
        useEntityData('W123456789', EntityType.WORK)
      );

      const { result: result2 } = renderHook(() =>
        useEntityData('W123456789', EntityType.WORK)
      );

      // Both should start loading
      expect(result1.current.loading).toBe(true);
      expect(result2.current.loading).toBe(true);

      // Unmount first hook before resolution
      unmount1();

      // Resolve the promise
      act(() => {
        resolveWork(workData);
      });

      // Wait for remaining hook to complete
      await waitFor(() => {
        expect(result2.current.loading).toBe(false);
      });

      // Remaining hook should have data
      expect(result2.current.data).toEqual(workData);

      // API should only be called once
      expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(1);
    });
  });

  describe('cross-component deduplication', () => {
    it('should deduplicate requests from different components using the same hook', async () => {
      const workData = {
        id: 'W123456789',
        title: 'Shared Work',
        display_name: 'Shared Work'
      } as Work;

      // Create controlled promise to ensure concurrency
      let resolveWork: (value: Work) => void;
      const workPromise = new Promise<Work>((resolve) => {
        resolveWork = resolve;
      });

      mockCachedOpenAlex.work.mockReturnValue(workPromise);

      // Simulate multiple components using the same hook
      const Component1 = () => {
        const { data, loading, error } = useEntityData('W123456789', EntityType.WORK);
        return { data, loading, error };
      };

      const Component2 = () => {
        const { data, loading, error } = useEntityData('W123456789', EntityType.WORK);
        return { data, loading, error };
      };

      const { result: comp1Result } = renderHook(() => Component1());
      const { result: comp2Result } = renderHook(() => Component2());

      // Both should start loading
      expect(comp1Result.current.loading).toBe(true);
      expect(comp2Result.current.loading).toBe(true);

      // Resolve the promise
      act(() => {
        resolveWork(workData);
      });

      // Wait for both to complete
      await waitFor(() => {
        expect(comp1Result.current.loading).toBe(false);
        expect(comp2Result.current.loading).toBe(false);
      });

      // Both should have the same data
      expect(comp1Result.current.data).toEqual(workData);
      expect(comp2Result.current.data).toEqual(workData);

      // API should only be called once due to deduplication
      expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(1);
    });
  });

  describe('performance and memory management', () => {
    it('should handle many concurrent requests efficiently', async () => {
      const workData = {
        id: 'W123456789',
        title: 'Popular Work',
        display_name: 'Popular Work'
      } as Work;

      mockCachedOpenAlex.work.mockResolvedValue(workData);

      // Create many concurrent hooks
      const hooks = Array.from({ length: 50 }, () =>
        renderHook(() => useEntityData('W123456789', EntityType.WORK))
      );

      // Wait for all to complete
      await waitFor(() => {
        hooks.forEach(({ result }) => {
          expect(result.current.loading).toBe(false);
          expect(result.current.data).toEqual(workData);
        });
      });

      // Should only make one API call despite 50 hooks
      expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(1);

      // Cleanup
      hooks.forEach(({ unmount }) => unmount());
    });

    it('should clean up deduplication state after requests complete', async () => {
      const workData = {
        id: 'W123456789',
        title: 'Cleanup Test Work',
        display_name: 'Cleanup Test Work'
      } as Work;

      mockCachedOpenAlex.work.mockResolvedValue(workData);

      // Create and complete a request
      const { result, unmount } = renderHook(() =>
        useEntityData('W123456789', EntityType.WORK)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.data).toEqual(workData);
      });

      // Unmount the hook
      unmount();

      // Create a new request for the same entity
      const { result: newResult } = renderHook(() =>
        useEntityData('W123456789', EntityType.WORK)
      );

      await waitFor(() => {
        expect(newResult.current.loading).toBe(false);
      });

      // Should make a new API call (not deduplicated with previous completed request)
      expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(2);
    });
  });
});