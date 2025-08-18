/**
 * Simple unit tests for useEntityData hook deduplication verification
 * Tests basic deduplication behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Simple mock setup
const mockWork = vi.fn();
const mockAuthor = vi.fn();

vi.mock('@/lib/openalex', () => ({
  cachedOpenAlex: {
    work: mockWork,
    author: mockAuthor,
    source: vi.fn(),
    institution: vi.fn(),
    publisher: vi.fn(),
    funder: vi.fn(),
    topic: vi.fn(),
    concept: vi.fn(),
    request: vi.fn(),
  },
}));

const mockEntityType = {
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
} as const;

vi.mock('@/lib/openalex/utils/entity-detection', () => ({
  detectEntityType: vi.fn((id: string) => {
    if (id.startsWith('W')) return mockEntityType.WORK;
    if (id.startsWith('A')) return mockEntityType.AUTHOR;
    return mockEntityType.WORK;
  }),
  normalizeEntityId: vi.fn((id: string) => id),
  EntityType: mockEntityType,
  EntityDetectionError: class EntityDetectionError extends Error {},
}));

describe('useEntityData Basic Deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should demonstrate that deduplication happens at cache level', async () => {
    // Import after mocks are set up
    const { useEntityData } = await import('./use-entity-data');

    const workData = {
      id: 'W123456789',
      title: 'Test Work',
      display_name: 'Test Work'
    };

    // Mock a resolved promise
    mockWork.mockResolvedValue(workData);

    // Render multiple hooks for the same entity
    const { result: result1 } = renderHook(() =>
      useEntityData('W123456789', mockEntityType.WORK as any)
    );

    const { result: result2 } = renderHook(() =>
      useEntityData('W123456789', mockEntityType.WORK as any)
    );

    // Wait for both to complete
    await waitFor(() => {
      expect(result1.current.loading).toBe(false);
      expect(result2.current.loading).toBe(false);
    });

    // Both should have the same data
    expect(result1.current.data).toEqual(workData);
    expect(result2.current.data).toEqual(workData);

    // The key question: how many times was the API called?
    // If deduplication is working at the cache level, this should be 1
    // If not, it will be 2
    console.log(`API called ${mockWork.mock.calls.length} times`);
    
    // Since we have deduplication at the cache interceptor level,
    // the actual API should only be called once
    expect(mockWork).toHaveBeenCalledTimes(1);
  });

  it('should handle different entities independently', async () => {
    const { useEntityData } = await import('./use-entity-data');

    const workData = { id: 'W123', title: 'Work', display_name: 'Work' };
    const authorData = { id: 'A456', display_name: 'Author', works_count: 10 };

    mockWork.mockResolvedValue(workData);
    mockAuthor.mockResolvedValue(authorData);

    // Different entities should not be deduplicated
    const { result: workResult } = renderHook(() =>
      useEntityData('W123', mockEntityType.WORK as any)
    );

    const { result: authorResult } = renderHook(() =>
      useEntityData('A456', mockEntityType.AUTHOR as any)
    );

    await waitFor(() => {
      expect(workResult.current.loading).toBe(false);
      expect(authorResult.current.loading).toBe(false);
    });

    expect(workResult.current.data).toEqual(workData);
    expect(authorResult.current.data).toEqual(authorData);

    // Different entity types should each make their own call
    expect(mockWork).toHaveBeenCalledTimes(1);
    expect(mockAuthor).toHaveBeenCalledTimes(1);
  });

  it('should verify that the cache interceptor provides deduplication', async () => {
    const { useEntityData } = await import('./use-entity-data');

    const workData = {
      id: 'W999',
      title: 'Deduplication Test',
      display_name: 'Deduplication Test'
    };

    // Create a slow-resolving promise to ensure concurrency
    let resolveWork: (value: any) => void;
    const workPromise = new Promise((resolve) => {
      resolveWork = resolve;
    });

    mockWork.mockReturnValue(workPromise);

    // Start multiple hooks at the same time
    const promises = Array.from({ length: 5 }, () =>
      renderHook(() => useEntityData('W999', mockEntityType.WORK as any))
    );

    // Resolve after all hooks are started
    setTimeout(() => {
      resolveWork!(workData);
    }, 10);

    // Wait for all to complete
    await waitFor(() => {
      promises.forEach(({ result }) => {
        expect(result.current.loading).toBe(false);
        expect(result.current.data).toEqual(workData);
      });
    });

    // With proper deduplication, only one API call should be made
    expect(mockWork).toHaveBeenCalledTimes(1);

    // Cleanup
    promises.forEach(({ unmount }) => unmount());
  });
});