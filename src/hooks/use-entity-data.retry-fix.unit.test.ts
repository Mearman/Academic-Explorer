/**
 * TDD: Fix retry count behavior in useEntityData hook
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

describe('TDD: Retry Count Fix', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('FAILING TEST: retryCount should be 0 immediately after first error', async () => {
    const { cachedOpenAlex } = await import('@/lib/openalex');
    
    // Setup: Mock API to fail first time, succeed second time
    let callCount = 0;
    (cachedOpenAlex.work as any).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        throw new Error('Network error');
      }
      return { id: 'W2741809807', display_name: 'Test Work' };
    });

    const { result } = renderHook(() => 
      useEntityData('W2741809807', EntityType.WORK, {
        retryOnError: true,
        maxRetries: 2,
        retryDelay: 50,
      })
    );

    // Wait for initial error
    await waitFor(() => {
      expect(result.current.state).toBe(EntityLoadingState.ERROR);
    });

    // CORE ISSUE: retryCount should be 0 immediately after error, before retry starts
    console.log('retryCount after error:', result.current.retryCount);
    expect(result.current.retryCount).toBe(0);
  });

  it('PASSING TEST: retryCount should increment during retry attempts', async () => {
    const { cachedOpenAlex } = await import('@/lib/openalex');
    
    // Setup: Mock API to always fail
    (cachedOpenAlex.work as any).mockImplementation(() => {
      throw new Error('Network error');
    });

    const { result } = renderHook(() => 
      useEntityData('W2741809807', EntityType.WORK, {
        retryOnError: true,
        maxRetries: 2,
        retryDelay: 50,
      })
    );

    // Wait for initial error
    await waitFor(() => {
      expect(result.current.state).toBe(EntityLoadingState.ERROR);
    });

    const initialRetryCount = result.current.retryCount;
    console.log('Initial retry count:', initialRetryCount);

    // Advance time to trigger first retry
    act(() => {
      vi.advanceTimersByTime(60);
    });

    // After retry delay, should be retrying
    await waitFor(() => {
      expect(result.current.state).toBe(EntityLoadingState.RETRYING);
    });

    // Retry count should now be higher
    expect(result.current.retryCount).toBeGreaterThan(initialRetryCount);
    console.log('Retry count during retry:', result.current.retryCount);
  });

  it('FAILING TEST: retryCount should reset to 0 on successful retry', async () => {
    const { cachedOpenAlex } = await import('@/lib/openalex');
    
    // Setup: Fail first, succeed second
    let callCount = 0;
    (cachedOpenAlex.work as any).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        throw new Error('Network error');
      }
      return { id: 'W2741809807', display_name: 'Test Work' };
    });

    const { result } = renderHook(() => 
      useEntityData('W2741809807', EntityType.WORK, {
        retryOnError: true,
        retryDelay: 50,
      })
    );

    // Wait for initial error
    await waitFor(() => {
      expect(result.current.state).toBe(EntityLoadingState.ERROR);
    });

    // Trigger retry
    act(() => {
      vi.advanceTimersByTime(60);
    });

    // Wait for success
    await waitFor(() => {
      expect(result.current.state).toBe(EntityLoadingState.SUCCESS);
    });

    // Retry count should reset to 0 on success
    expect(result.current.retryCount).toBe(0);
  });
});