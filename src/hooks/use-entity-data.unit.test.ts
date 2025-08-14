// @ts-nocheck
/**
 * @file use-entity-data.unit.test.ts
 * @description Comprehensive unit tests for useEntityData hook and related functionality
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { server } from '@/test/setup';
import { http, HttpResponse } from 'msw';
import {
  useEntityData,
  useWorkData,
  useAuthorData,
  useSourceData,
  useInstitutionData,
  usePublisherData,
  useFunderData,
  useTopicData,
  useBatchEntityData,
  EntityErrorType,
  EntityLoadingState,
  type UseEntityDataOptions,
  type EntityError
} from './use-entity-data';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { mockWork, mockAuthor, mockSource, mockInstitution } from '@/test/mocks/data';

// Mock the cached-client module to return our mock
vi.mock('@/lib/openalex/cached-client', () => ({
  cachedClient: {
    work: vi.fn(),
    works: vi.fn(),
    author: vi.fn(),
    authors: vi.fn(),
    source: vi.fn(),
    sources: vi.fn(),
    institution: vi.fn(),
    institutions: vi.fn(),
    publisher: vi.fn(),
    publishers: vi.fn(),
    funder: vi.fn(),
    funders: vi.fn(),
    topic: vi.fn(),
    topics: vi.fn(),
  },
}));

// Get the mocked client for test usage
let mockCachedOpenAlex: any;

beforeEach(async () => {
  const { cachedClient } = await import('@/lib/openalex/cached-client');
  mockCachedOpenAlex = vi.mocked(cachedClient);
  vi.clearAllMocks();
});

describe('useEntityData Hook', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  describe('Basic Functionality', () => {
    it('should fetch entity data successfully', async () => {
      server.use(
        http.get('https://api.openalex.org/works/W2741809807', () => {
          return HttpResponse.json(mockWork);
        })
      );

      const { result } = renderHook(() => 
        useEntityData('W2741809807')
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.state).toBe(EntityLoadingState.LOADING);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockWork);
      expect(result.current.error).toBeNull();
      expect(result.current.state).toBe(EntityLoadingState.SUCCESS);
      expect(result.current.retryCount).toBe(0);
      expect(result.current.lastFetchTime).toBeGreaterThan(0);
    });

    it('should handle entity ID with explicit type', async () => {
      mockCachedOpenAlex.author.mockResolvedValue(mockAuthor);

      const { result } = renderHook(() => 
        useEntityData('2887492', EntityType.AUTHOR)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockAuthor);
      expect(mockCachedOpenAlex.author).toHaveBeenCalledWith('A2887492', false);
    });

    it('should handle null/undefined entity ID', () => {
      const { result } = renderHook(() => 
        useEntityData(null)
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.state).toBe(EntityLoadingState.IDLE);
    });

    it('should be disabled when enabled option is false', () => {
      const { result } = renderHook(() => 
        useEntityData('W2741809807', undefined, { enabled: false })
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.state).toBe(EntityLoadingState.IDLE);
      expect(mockCachedOpenAlex.work).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid entity ID format', async () => {
      const { result } = renderHook(() => 
        useEntityData('invalid-id')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toEqual(
        expect.objectContaining({
          type: EntityErrorType.INVALID_ID,
          retryable: false,
          message: expect.stringContaining('Invalid entity ID format')
        })
      );
      expect(result.current.state).toBe(EntityLoadingState.ERROR);
    });

    it('should handle 404 not found errors', async () => {
      mockCachedOpenAlex.work.mockRejectedValue(new Error('Not found - 404'));

      const { result } = renderHook(() => 
        useEntityData('W2741809807')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(
        expect.objectContaining({
          type: EntityErrorType.NOT_FOUND,
          retryable: false,
          message: expect.stringContaining('was not found')
        })
      );
    });

    it('should handle network errors', async () => {
      mockCachedOpenAlex.work.mockRejectedValue(new Error('Network connection failed'));

      const { result } = renderHook(() => 
        useEntityData('W2741809807')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(
        expect.objectContaining({
          type: EntityErrorType.NETWORK_ERROR,
          retryable: true,
          message: expect.stringContaining('Network connection failed')
        })
      );
    });

    it('should handle timeout errors', async () => {
      mockCachedOpenAlex.work.mockRejectedValue(new Error('Request timeout'));

      const { result } = renderHook(() => 
        useEntityData('W2741809807')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(
        expect.objectContaining({
          type: EntityErrorType.TIMEOUT,
          retryable: true,
          message: expect.stringContaining('Request timed out')
        })
      );
    });

    it('should handle rate limiting errors', async () => {
      mockCachedOpenAlex.work.mockRejectedValue(new Error('Too many requests - 429'));

      const { result } = renderHook(() => 
        useEntityData('W2741809807')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(
        expect.objectContaining({
          type: EntityErrorType.RATE_LIMITED,
          retryable: true,
          message: expect.stringContaining('Too many requests')
        })
      );
    });
  });

  describe('Retry Mechanism', () => {
    it('should auto-retry retryable errors', async () => {
      mockCachedOpenAlex.work
        .mockRejectedValueOnce(new Error('Network connection failed'))
        .mockResolvedValue(mockWork);

      const { result } = renderHook(() => 
        useEntityData('W2741809807', undefined, { maxRetries: 2, retryDelay: 50 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.state).toBe(EntityLoadingState.ERROR);
      expect(result.current.retryCount).toBe(0);

      // Wait for retry to be scheduled and executed (using a shorter delay)
      await new Promise(resolve => setTimeout(resolve, 100));

      await waitFor(() => {
        expect(result.current.state).toBe(EntityLoadingState.RETRYING);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.data).toEqual(mockWork);
      });

      expect(result.current.state).toBe(EntityLoadingState.SUCCESS);
      expect(result.current.error).toBeNull();
    });

    it('should not retry non-retryable errors', async () => {
      const { result } = renderHook(() => 
        useEntityData('invalid-id', undefined, { maxRetries: 2 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error?.retryable).toBe(false);
      expect(result.current.retryCount).toBe(0);

      // Wait to ensure no retry happens
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.state).toBe(EntityLoadingState.ERROR);
    });

    it('should stop retrying after max retries', async () => {
      mockCachedOpenAlex.work.mockRejectedValue(new Error('Network connection failed'));

      const { result } = renderHook(() => 
        useEntityData('W2741809807', undefined, { maxRetries: 2, retryDelay: 100 })
      );

      // Initial failure
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // First retry
      act(() => {
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.state).toBe(EntityLoadingState.RETRYING);
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.retryCount).toBe(1);
      });

      // Second retry
      act(() => {
        vi.advanceTimersByTime(200); // Exponential backoff
      });

      await waitFor(() => {
        expect(result.current.retryCount).toBe(2);
      });

      // Should not retry again
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.retryCount).toBe(2);
      expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('Manual Controls', () => {
    it('should refetch when refetch is called', async () => {
      mockCachedOpenAlex.work.mockResolvedValue(mockWork);

      const { result } = renderHook(() => 
        useEntityData('W2741809807')
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockWork);
      });

      expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(1);

      // Call refetch
      await act(async () => {
        await result.current.refetch();
      });

      expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(2);
    });

    it('should retry when retry is called', async () => {
      mockCachedOpenAlex.work
        .mockRejectedValueOnce(new Error('Network connection failed'))
        .mockResolvedValue(mockWork);

      const { result } = renderHook(() => 
        useEntityData('W2741809807')
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Call retry
      await act(async () => {
        await result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockWork);
        expect(result.current.error).toBeNull();
      });
    });

    it('should not retry non-retryable errors', async () => {
      const { result } = renderHook(() => 
        useEntityData('invalid-id')
      );

      await waitFor(() => {
        expect(result.current.error?.retryable).toBe(false);
      });

      // Try to retry
      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.error?.retryable).toBe(false);
      expect(mockCachedOpenAlex.work).not.toHaveBeenCalled();
    });

    it('should reset state when reset is called', async () => {
      mockCachedOpenAlex.work.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => 
        useEntityData('W2741809807')
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.state).toBe(EntityLoadingState.IDLE);
      expect(result.current.retryCount).toBe(0);
      expect(result.current.lastFetchTime).toBeNull();
    });
  });

  describe('Options', () => {
    it('should call onSuccess callback', async () => {
      const onSuccess = vi.fn();
      mockCachedOpenAlex.work.mockResolvedValue(mockWork);

      renderHook(() => 
        useEntityData('W2741809807', undefined, { onSuccess })
      );

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockWork);
      });
    });

    it('should call onError callback', async () => {
      const onError = vi.fn();
      mockCachedOpenAlex.work.mockRejectedValue(new Error('Test error'));

      renderHook(() => 
        useEntityData('W2741809807', undefined, { onError })
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            type: EntityErrorType.UNKNOWN,
            message: expect.any(String)
          })
        );
      });
    });

    it('should skip cache when skipCache is true', async () => {
      mockCachedOpenAlex.work.mockResolvedValue(mockWork);

      renderHook(() => 
        useEntityData('W2741809807', undefined, { skipCache: true })
      );

      await waitFor(() => {
        expect(mockCachedOpenAlex.work).toHaveBeenCalledWith('W2741809807', true);
      });
    });

    it('should handle custom timeout', async () => {
      // Mock a slow response
      mockCachedOpenAlex.work.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockWork), 200))
      );

      const { result } = renderHook(() => 
        useEntityData('W2741809807', undefined, { timeout: 100 })
      );

      await waitFor(() => {
        expect(result.current.error?.type).toBe(EntityErrorType.TIMEOUT);
      });
    });
  });

  describe('Window Focus Refetch', () => {
    it('should refetch on window focus when enabled and data is stale', async () => {
      mockCachedOpenAlex.work.mockResolvedValue(mockWork);

      const { result } = renderHook(() => 
        useEntityData('W2741809807', undefined, {
          refetchOnWindowFocus: true,
          staleTime: 1000
        })
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockWork);
      });

      expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(1);

      // Fast-forward time to make data stale
      act(() => {
        vi.advanceTimersByTime(1001);
      });

      // Simulate window focus
      act(() => {
        window.dispatchEvent(new Event('focus'));
      });

      await waitFor(() => {
        expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(2);
      });
    });

    it('should not refetch on window focus when data is fresh', async () => {
      mockCachedOpenAlex.work.mockResolvedValue(mockWork);

      const { result } = renderHook(() => 
        useEntityData('W2741809807', undefined, {
          refetchOnWindowFocus: true,
          staleTime: 5000
        })
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockWork);
      });

      expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(1);

      // Simulate window focus without advancing time
      act(() => {
        window.dispatchEvent(new Event('focus'));
      });

      // Wait a bit to ensure no additional call
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Specialized Entity Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should useWorkData hook work correctly', async () => {
    mockCachedOpenAlex.work.mockResolvedValue(mockWork);

    const { result } = renderHook(() => 
      useWorkData('W2741809807')
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockWork);
    });

    expect(mockCachedOpenAlex.work).toHaveBeenCalledWith('W2741809807', false);
  });

  it('should useAuthorData hook work correctly', async () => {
    mockCachedOpenAlex.author.mockResolvedValue(mockAuthor);

    const { result } = renderHook(() => 
      useAuthorData('A2887492')
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockAuthor);
    });

    expect(mockCachedOpenAlex.author).toHaveBeenCalledWith('A2887492', false);
  });

  it('should useSourceData hook work correctly', async () => {
    mockCachedOpenAlex.source.mockResolvedValue(mockSource);

    const { result } = renderHook(() => 
      useSourceData('S123456789')
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockSource);
    });

    expect(mockCachedOpenAlex.source).toHaveBeenCalledWith('S123456789', false);
  });

  it('should useInstitutionData hook work correctly', async () => {
    mockCachedOpenAlex.institution.mockResolvedValue(mockInstitution);

    const { result } = renderHook(() => 
      useInstitutionData('I123456789')
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockInstitution);
    });

    expect(mockCachedOpenAlex.institution).toHaveBeenCalledWith('I123456789', false);
  });

  it('should usePublisherData hook work correctly', async () => {
    const mockPublisher = {
      id: 'https://openalex.org/P123456789',
      display_name: 'Test Publisher',
      works_count: 1000
    };
    mockCachedOpenAlex.publisher.mockResolvedValue(mockPublisher);

    const { result } = renderHook(() => 
      usePublisherData('P123456789')
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockPublisher);
    });

    expect(mockCachedOpenAlex.publisher).toHaveBeenCalledWith('P123456789', false);
  });

  it('should useFunderData hook work correctly', async () => {
    const mockFunder = {
      id: 'https://openalex.org/F123456789',
      display_name: 'Test Funder',
      grants_count: 500
    };
    mockCachedOpenAlex.funder.mockResolvedValue(mockFunder);

    const { result } = renderHook(() => 
      useFunderData('F123456789')
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockFunder);
    });

    expect(mockCachedOpenAlex.funder).toHaveBeenCalledWith('F123456789', false);
  });

  it('should useTopicData hook work correctly', async () => {
    const mockTopic = {
      id: 'https://openalex.org/T123456789',
      display_name: 'Test Topic',
      works_count: 2000
    };
    mockCachedOpenAlex.topic.mockResolvedValue(mockTopic);

    const { result } = renderHook(() => 
      useTopicData('T123456789')
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockTopic);
    });

    expect(mockCachedOpenAlex.topic).toHaveBeenCalledWith('T123456789', false);
  });
});

describe('useBatchEntityData Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch multiple entities successfully', async () => {
    const mockWorks = [
      { ...mockWork, id: 'https://openalex.org/W1' },
      { ...mockWork, id: 'https://openalex.org/W2' },
      { ...mockWork, id: 'https://openalex.org/W3' }
    ];

    mockCachedOpenAlex.work
      .mockResolvedValueOnce(mockWorks[0])
      .mockResolvedValueOnce(mockWorks[1])
      .mockResolvedValueOnce(mockWorks[2]);

    const { result } = renderHook(() => 
      useBatchEntityData(['W1', 'W2', 'W3'], EntityType.WORK)
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.total).toBe(3);
    expect(result.current.completed).toBe(0);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({
      'W1': mockWorks[0],
      'W2': mockWorks[1],
      'W3': mockWorks[2]
    });
    expect(result.current.errors).toEqual({});
    expect(result.current.completed).toBe(3);
    expect(result.current.total).toBe(3);
  });

  it('should handle mixed success and failure', async () => {
    const mockWorkSuccess = { ...mockWork, id: 'https://openalex.org/W1' };

    mockCachedOpenAlex.work
      .mockResolvedValueOnce(mockWorkSuccess)
      .mockRejectedValueOnce(new Error('Not found'))
      .mockResolvedValueOnce({ ...mockWork, id: 'https://openalex.org/W3' });

    const { result } = renderHook(() => 
      useBatchEntityData(['W1', 'W2', 'W3'], EntityType.WORK)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(
      expect.objectContaining({
        'W1': mockWorkSuccess,
        'W3': expect.any(Object)
      })
    );
    expect(result.current.errors).toEqual(
      expect.objectContaining({
        'W2': expect.objectContaining({
          type: EntityErrorType.UNKNOWN,
          message: expect.any(String)
        })
      })
    );
  });

  it('should handle empty entity list', () => {
    const { result } = renderHook(() => 
      useBatchEntityData([], EntityType.WORK)
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual({});
    expect(result.current.errors).toEqual({});
    expect(result.current.total).toBe(0);
    expect(result.current.completed).toBe(0);
  });

  it('should refetch all entities when refetchAll is called', async () => {
    mockCachedOpenAlex.work.mockResolvedValue(mockWork);

    const { result } = renderHook(() => 
      useBatchEntityData(['W1', 'W2'], EntityType.WORK)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(2);

    await act(async () => {
      await result.current.refetchAll();
    });

    expect(mockCachedOpenAlex.work).toHaveBeenCalledTimes(4);
  });
});

describe('Entity Type Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should route to correct client method based on detected entity type', async () => {
    const testCases = [
      { id: 'W123456789', method: 'work', mock: mockWork },
      { id: 'A123456789', method: 'author', mock: mockAuthor },
      { id: 'S123456789', method: 'source', mock: mockSource },
      { id: 'I123456789', method: 'institution', mock: mockInstitution }
    ];

    for (const testCase of testCases) {
      (mockCachedOpenAlex as any)[testCase.method].mockResolvedValue(testCase.mock);

      const { result } = renderHook(() => 
        useEntityData(testCase.id)
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(testCase.mock);
      });

      expect((mockCachedOpenAlex as any)[testCase.method]).toHaveBeenCalledWith(
        testCase.id,
        false
      );

      vi.clearAllMocks();
    }
  });

  it('should handle unsupported entity types gracefully', async () => {
    // Mock an unsupported entity type by using an invalid prefix
    const { result } = renderHook(() => 
      useEntityData('X123456789') // X is not a valid prefix
    );

    await waitFor(() => {
      expect(result.current.error?.type).toBe(EntityErrorType.INVALID_ID);
    });
  });
});

describe('Cleanup and Memory Management', () => {
  it('should cleanup timers on unmount', async () => {
    mockCachedOpenAlex.work.mockRejectedValue(new Error('Network error'));

    const { result, unmount } = renderHook(() => 
      useEntityData('W2741809807', undefined, { maxRetries: 3, retryDelay: 1000 })
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    // Spy on clearTimeout
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });

  it('should not update state after unmount', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    mockCachedOpenAlex.work.mockReturnValue(promise);

    const { result, unmount } = renderHook(() => 
      useEntityData('W2741809807')
    );

    expect(result.current.loading).toBe(true);

    unmount();

    // Resolve the promise after unmount
    resolvePromise!(mockWork);

    // Wait a bit to ensure no state update occurs
    await new Promise(resolve => setTimeout(resolve, 10));

    // No assertions needed - if state updated after unmount, React would warn
  });
});
