/**
 * TDD: Implement missing auto-retry functionality
 * 
 * The original tests expect auto-retry but it's not implemented.
 * This test-driven approach will implement the missing functionality.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useEntityData, EntityLoadingState } from './use-entity-data';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

// Mock the openalex module
vi.mock('@/lib/openalex', () => ({
  cachedOpenAlex: {
    work: vi.fn(),
  },
}));

describe('TDD: Auto-Retry Implementation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('FAILING TEST: should automatically retry after retryable error when retryOnError=true', async () => {
    const { cachedOpenAlex } = await import('@/lib/openalex');
    
    // Setup: Fail first time, succeed second time
    let callCount = 0;
    (cachedOpenAlex.work as any).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        throw new Error('Network connection failed'); // Retryable error
      }
      return { id: 'W2741809807', display_name: 'Test Work' };
    });

    const { result } = renderHook(() => 
      useEntityData('W2741809807', EntityType.WORK, {
        retryOnError: true,
        retryDelay: 50,
        maxRetries: 2,
      })
    );

    // Wait for initial error
    await waitFor(() => {
      expect(result.current.state).toBe(EntityLoadingState.ERROR);
    });

    expect(result.current.retryCount).toBe(0); // No retries yet

    // Auto-retry should be scheduled. Advance time to trigger it.
    act(() => {
      vi.advanceTimersByTime(60); // Advance past retryDelay (50ms)
    });

    // Should now be in RETRYING state
    await waitFor(() => {
      expect(result.current.state).toBe(EntityLoadingState.RETRYING);
    });

    // Should eventually succeed
    await waitFor(() => {
      expect(result.current.state).toBe(EntityLoadingState.SUCCESS);
      expect(result.current.data).toBeTruthy();
      expect(result.current.retryCount).toBe(0); // Reset on success
    });

    // Should have called the API twice (initial + 1 retry)
    expect(callCount).toBe(2);
  });

  it('FAILING TEST: should not auto-retry when retryOnError=false', async () => {
    const { cachedOpenAlex } = await import('@/lib/openalex');
    
    // Always fail
    (cachedOpenAlex.work as any).mockImplementation(() => {
      throw new Error('Network connection failed');
    });

    const { result } = renderHook(() => 
      useEntityData('W2741809807', EntityType.WORK, {
        retryOnError: false, // Disabled
        retryDelay: 50,
      })
    );

    // Wait for initial error
    await waitFor(() => {
      expect(result.current.state).toBe(EntityLoadingState.ERROR);
    });

    // Advance time - should NOT trigger retry
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Should remain in ERROR state
    expect(result.current.state).toBe(EntityLoadingState.ERROR);
    expect(result.current.retryCount).toBe(0);
  });

  it('FAILING TEST: should not auto-retry non-retryable errors', async () => {
    const { cachedOpenAlex } = await import('@/lib/openalex');
    
    // Mock an invalid ID error (non-retryable)
    (cachedOpenAlex.work as any).mockImplementation(() => {
      const error = new Error('Invalid ID format');
      (error as any).retryable = false;
      throw error;
    });

    const { result } = renderHook(() => 
      useEntityData('invalid-id', EntityType.WORK, {
        retryOnError: true,
        retryDelay: 50,
      })
    );

    // Wait for initial error
    await waitFor(() => {
      expect(result.current.state).toBe(EntityLoadingState.ERROR);
      expect(result.current.error?.retryable).toBe(false);
    });

    // Advance time - should NOT trigger retry for non-retryable error
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.state).toBe(EntityLoadingState.ERROR);
  });

  it('FAILING TEST: should stop auto-retrying after maxRetries attempts', async () => {
    const { cachedOpenAlex } = await import('@/lib/openalex');
    
    // Always fail
    let callCount = 0;
    (cachedOpenAlex.work as any).mockImplementation(() => {
      callCount++;
      throw new Error('Network connection failed');
    });

    const { result } = renderHook(() => 
      useEntityData('W2741809807', EntityType.WORK, {
        retryOnError: true,
        retryDelay: 50,
        maxRetries: 2,
      })
    );

    // Wait for initial error
    await waitFor(() => {
      expect(result.current.state).toBe(EntityLoadingState.ERROR);
    });

    // First retry
    act(() => {
      vi.advanceTimersByTime(60);
    });

    await waitFor(() => {
      expect(result.current.state).toBe(EntityLoadingState.RETRYING);
    });

    await waitFor(() => {
      expect(result.current.state).toBe(EntityLoadingState.ERROR);
      expect(result.current.retryCount).toBe(1);
    });

    // Second retry
    act(() => {
      vi.advanceTimersByTime(60);
    });

    await waitFor(() => {
      expect(result.current.retryCount).toBe(2);
    });

    // Should not retry again after maxRetries
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.retryCount).toBe(2);
    expect(callCount).toBe(3); // Initial + 2 retries
  });
});