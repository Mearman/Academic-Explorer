/**
 * TDD: Fix retry count semantics
 * 
 * The retry count should represent the number of RETRY attempts, not total attempts.
 * - Initial request fails: retryCount = 0 (no retries yet)
 * - First retry fails: retryCount = 1 
 * - Second retry fails: retryCount = 2
 * - etc.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEntityData, EntityLoadingState } from './use-entity-data';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

// Mock the openalex module
vi.mock('@/lib/openalex', () => ({
  cachedOpenAlex: {
    work: vi.fn(),
  },
}));

describe('TDD: Retry Count Semantics Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FAILING TEST: retryCount should be 0 after initial failure (before any retries)', async () => {
    const { cachedOpenAlex } = await import('@/lib/openalex');
    
    // Setup: Always fail
    (cachedOpenAlex.work as any).mockImplementation(() => {
      throw new Error('Network error');
    });

    const { result } = renderHook(() => 
      useEntityData('W2741809807', EntityType.WORK, {
        retryOnError: true,
        maxRetries: 2,
      })
    );

    // Wait for initial error
    await waitFor(() => {
      expect(result.current.state).toBe(EntityLoadingState.ERROR);
    }, { timeout: 1000 });

    // The retry count should be 0 because no retries have been attempted yet
    expect(result.current.retryCount).toBe(0);
  });

  it('PASSING TEST: manual retry should reset retryCount to 0', async () => {
    const { cachedOpenAlex } = await import('@/lib/openalex');
    
    // Setup: Fail first, succeed on retry
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
        retryOnError: false, // Disable auto-retry to test manual retry
      })
    );

    // Wait for initial error
    await waitFor(() => {
      expect(result.current.state).toBe(EntityLoadingState.ERROR);
    }, { timeout: 1000 });

    // Manual retry
    await result.current.retry();

    // Should succeed and reset retry count
    await waitFor(() => {
      expect(result.current.state).toBe(EntityLoadingState.SUCCESS);
    }, { timeout: 1000 });

    expect(result.current.retryCount).toBe(0);
  });
});