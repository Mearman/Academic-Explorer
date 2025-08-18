/**
 * TDD: Timer Management Fix for useEntityData Hook
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useEntityData, EntityLoadingState, EntityErrorType } from './use-entity-data';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

// Mock the openalex module
vi.mock('@/lib/openalex', () => ({
  cachedOpenAlex: {
    work: vi.fn(),
  },
}));

describe('TDD: Timer Management Fix', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('FAILING TEST: should properly handle timer-based retry logic', async () => {
    const { cachedOpenAlex } = await import('@/lib/openalex');
    
    // Setup: Mock API to fail first, then succeed
    let callCount = 0;
    (cachedOpenAlex.work as any).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        throw new Error('Network error');
      }
      return { id: 'https://openalex.org/W2741809807', display_name: 'Test Work' };
    });

    const { result } = renderHook(() => 
      useEntityData('W2741809807', EntityType.WORK, {
        retryOnError: true,
        retryDelay: 1000,
      })
    );

    // Initial state should be loading
    expect(result.current.state).toBe(EntityLoadingState.LOADING);

    // Wait for initial error
    await waitFor(() => {
      expect(result.current.state).toBe(EntityLoadingState.ERROR);
    });

    // Should have retryCount = 0 initially (before retry starts)
    expect(result.current.retryCount).toBe(0);

    // Now advance timers to trigger retry
    act(() => {
      vi.advanceTimersByTime(1100); // Advance slightly past the retry delay
    });

    // Allow promises to resolve
    await new Promise(resolve => setTimeout(resolve, 0));

    // After retry delay, should be retrying
    await waitFor(() => {
      expect(result.current.state).toBe(EntityLoadingState.RETRYING);
      expect(result.current.retryCount).toBe(1);
    });

    // Should eventually succeed and reset retry count
    await waitFor(() => {
      expect(result.current.state).toBe(EntityLoadingState.SUCCESS);
      expect(result.current.retryCount).toBe(0);
      expect(result.current.data).toBeTruthy();
    });

    // Should have called the API twice (initial + 1 retry)
    expect(callCount).toBe(2);
  });

  it('FAILING TEST: should respect custom timeout with fake timers', async () => {
    const { cachedOpenAlex } = await import('@/lib/openalex');
    
    // Setup: Mock API to hang indefinitely
    (cachedOpenAlex.work as any).mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => 
      useEntityData('W2741809807', EntityType.WORK, {
        timeout: 2000,
      })
    );

    // Initial state should be loading
    expect(result.current.state).toBe(EntityLoadingState.LOADING);

    // Advance time past timeout
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    // Should timeout and show timeout error
    await waitFor(() => {
      expect(result.current.state).toBe(EntityLoadingState.ERROR);
      expect(result.current.error?.type).toBe(EntityErrorType.TIMEOUT);
    }, { timeout: 1000 });
  });

  it('FAILING TEST: should cleanup timers on unmount', async () => {
    const { cachedOpenAlex } = await import('@/lib/openalex');
    
    // Setup: Mock API to fail, which will trigger auto-retry timer
    (cachedOpenAlex.work as any).mockImplementation(() => {
      throw new Error('Network error');
    });
    
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    
    const { unmount } = renderHook(() => 
      useEntityData('W2741809807', EntityType.WORK, {
        retryOnError: true,
        retryDelay: 1000,
      })
    );

    // Wait for initial error which should trigger auto-retry timer
    await waitFor(() => {
      expect(clearTimeoutSpy).not.toHaveBeenCalled(); // Timer should be set, not cleared yet
    });

    // Now unmount - this should trigger cleanup
    unmount();

    // Should have called clearTimeout to cleanup the retry timer
    expect(clearTimeoutSpy).toHaveBeenCalled();
    
    clearTimeoutSpy.mockRestore();
  });

  it('PASSING TEST: should setup retry timer when auto-retry is enabled', async () => {
    const { cachedOpenAlex } = await import('@/lib/openalex');
    
    // Setup: Mock API to fail
    (cachedOpenAlex.work as any).mockImplementation(() => {
      throw new Error('Network connection failed'); // Retryable error
    });

    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

    const { result } = renderHook(() => 
      useEntityData('W2741809807', EntityType.WORK, {
        retryOnError: true,
        retryDelay: 1000,
        maxRetries: 2,
      })
    );

    // Wait for initial error
    await waitFor(() => {
      expect(result.current.state).toBe(EntityLoadingState.ERROR);
    });

    // Should have called setTimeout to schedule retry
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    
    setTimeoutSpy.mockRestore();
  });

  it('PASSING TEST: should not setup retry timer when auto-retry is disabled', async () => {
    const { cachedOpenAlex } = await import('@/lib/openalex');
    
    // Setup: Mock API to fail
    (cachedOpenAlex.work as any).mockImplementation(() => {
      throw new Error('Network connection failed'); // Retryable error
    });

    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

    const { result } = renderHook(() => 
      useEntityData('W2741809807', EntityType.WORK, {
        retryOnError: false, // Disabled
        retryDelay: 1000,
      })
    );

    // Wait for initial error
    await waitFor(() => {
      expect(result.current.state).toBe(EntityLoadingState.ERROR);
    });

    // Should NOT have called setTimeout since auto-retry is disabled
    expect(setTimeoutSpy).not.toHaveBeenCalled();
    
    setTimeoutSpy.mockRestore();
  });
});