/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useAdaptiveRetry } from './use-adaptive-retry';
import type { 
  NetworkRetryPolicy, 
  RetryStrategy, 
  ConnectionQuality 
} from '@/types/network';

// Mock the network status hook
const mockNetworkStatus = {
  isOnline: true,
  isOffline: false,
  connectionQuality: 'fast' as ConnectionQuality,
  isSlowConnection: false,
  rtt: 100,
  downlink: 10,
};

vi.mock('./use-network-status', () => ({
  useNetworkStatus: () => mockNetworkStatus,
}));

describe('useAdaptiveRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Reset network status
    mockNetworkStatus.isOnline = true;
    mockNetworkStatus.isOffline = false;
    mockNetworkStatus.connectionQuality = 'fast';
    mockNetworkStatus.isSlowConnection = false;
    mockNetworkStatus.rtt = 100;
    mockNetworkStatus.downlink = 10;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Retry delay calculation', () => {
    it('should calculate exponential backoff delays', () => {
      const policy: NetworkRetryPolicy = {
        strategy: 'exponential',
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 8000,
        backoffMultiplier: 2,
        adaptToNetwork: false,
        requestTimeout: 5000,
      };

      const { result } = renderHook(() => useAdaptiveRetry(policy));

      expect(result.current.calculateRetryDelay(0)).toBe(1000); // 1000 * 2^0
      expect(result.current.calculateRetryDelay(1)).toBe(2000); // 1000 * 2^1
      expect(result.current.calculateRetryDelay(2)).toBe(4000); // 1000 * 2^2
      expect(result.current.calculateRetryDelay(3)).toBe(8000); // capped at maxDelay
    });

    it('should calculate linear backoff delays', () => {
      const policy: NetworkRetryPolicy = {
        strategy: 'linear',
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 8000,
        backoffMultiplier: 2,
        adaptToNetwork: false,
        requestTimeout: 5000,
      };

      const { result } = renderHook(() => useAdaptiveRetry(policy));

      expect(result.current.calculateRetryDelay(0)).toBe(1000); // baseDelay + (0 * baseDelay)
      expect(result.current.calculateRetryDelay(1)).toBe(2000); // baseDelay + (1 * baseDelay)
      expect(result.current.calculateRetryDelay(2)).toBe(3000); // baseDelay + (2 * baseDelay)
    });

    it('should return 0 delay for immediate strategy', () => {
      const policy: NetworkRetryPolicy = {
        strategy: 'immediate',
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 8000,
        backoffMultiplier: 2,
        adaptToNetwork: false,
        requestTimeout: 5000,
      };

      const { result } = renderHook(() => useAdaptiveRetry(policy));

      expect(result.current.calculateRetryDelay(0)).toBe(0);
      expect(result.current.calculateRetryDelay(1)).toBe(0);
      expect(result.current.calculateRetryDelay(2)).toBe(0);
    });

    it('should adapt delays based on network conditions when enabled', () => {
      const policy: NetworkRetryPolicy = {
        strategy: 'exponential',
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        adaptToNetwork: true,
        requestTimeout: 5000,
      };

      const { result } = renderHook(() => useAdaptiveRetry(policy));

      // Fast connection - should use base delays
      mockNetworkStatus.connectionQuality = 'fast';
      mockNetworkStatus.rtt = 50;
      expect(result.current.calculateRetryDelay(1)).toBe(2000);

      // Slow connection - should increase delays
      mockNetworkStatus.connectionQuality = 'slow';
      mockNetworkStatus.rtt = 500;
      expect(result.current.calculateRetryDelay(1)).toBeGreaterThan(2000);

      // Very slow connection - should increase delays even more
      mockNetworkStatus.connectionQuality = 'verySlow';
      mockNetworkStatus.rtt = 1000;
      expect(result.current.calculateRetryDelay(1)).toBeGreaterThan(3000);
    });
  });

  describe('Adaptive strategy', () => {
    it('should adjust strategy based on network conditions', () => {
      const policy: NetworkRetryPolicy = {
        strategy: 'adaptive',
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        adaptToNetwork: true,
        requestTimeout: 5000,
      };

      const { result } = renderHook(() => useAdaptiveRetry(policy));

      // Fast connection - should use exponential with lower delays
      mockNetworkStatus.connectionQuality = 'fast';
      mockNetworkStatus.rtt = 50;
      const fastDelay = result.current.calculateRetryDelay(1);

      // Slow connection - should use different strategy with higher delays
      mockNetworkStatus.connectionQuality = 'slow';
      mockNetworkStatus.rtt = 500;
      const slowDelay = result.current.calculateRetryDelay(1);

      expect(slowDelay).toBeGreaterThan(fastDelay);
    });

    it('should consider RTT in adaptive calculations', () => {
      const policy: NetworkRetryPolicy = {
        strategy: 'adaptive',
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        adaptToNetwork: true,
        requestTimeout: 5000,
      };

      const { result } = renderHook(() => useAdaptiveRetry(policy));

      // Low RTT
      mockNetworkStatus.rtt = 50;
      const lowRttDelay = result.current.calculateRetryDelay(1);

      // High RTT
      mockNetworkStatus.rtt = 1000;
      const highRttDelay = result.current.calculateRetryDelay(1);

      expect(highRttDelay).toBeGreaterThan(lowRttDelay);
    });
  });

  describe('shouldRetry logic', () => {
    it('should allow retries when under max retry limit', () => {
      const policy: NetworkRetryPolicy = {
        strategy: 'exponential',
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 8000,
        backoffMultiplier: 2,
        adaptToNetwork: false,
        requestTimeout: 5000,
      };

      const { result } = renderHook(() => useAdaptiveRetry(policy));

      expect(result.current.shouldRetry(0, new Error('Network error'))).toBe(true);
      expect(result.current.shouldRetry(1, new Error('Network error'))).toBe(true);
      expect(result.current.shouldRetry(2, new Error('Network error'))).toBe(true);
    });

    it('should deny retries when at max retry limit', () => {
      const policy: NetworkRetryPolicy = {
        strategy: 'exponential',
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 8000,
        backoffMultiplier: 2,
        adaptToNetwork: false,
        requestTimeout: 5000,
      };

      const { result } = renderHook(() => useAdaptiveRetry(policy));

      expect(result.current.shouldRetry(3, new Error('Network error'))).toBe(false);
      expect(result.current.shouldRetry(4, new Error('Network error'))).toBe(false);
    });

    it('should deny retries when offline', () => {
      const policy: NetworkRetryPolicy = {
        strategy: 'exponential',
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 8000,
        backoffMultiplier: 2,
        adaptToNetwork: true,
        requestTimeout: 5000,
      };

      mockNetworkStatus.isOnline = false;
      mockNetworkStatus.isOffline = true;

      const { result } = renderHook(() => useAdaptiveRetry(policy));

      expect(result.current.shouldRetry(0, new Error('Network error'))).toBe(false);
    });

    it('should consider error type in retry decision', () => {
      const policy: NetworkRetryPolicy = {
        strategy: 'exponential',
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 8000,
        backoffMultiplier: 2,
        adaptToNetwork: false,
        requestTimeout: 5000,
      };

      const { result } = renderHook(() => useAdaptiveRetry(policy));

      // Retryable errors
      expect(result.current.shouldRetry(0, new Error('fetch failed'))).toBe(true);
      expect(result.current.shouldRetry(0, new Error('timeout'))).toBe(true);
      expect(result.current.shouldRetry(0, new Error('network error'))).toBe(true);

      // Non-retryable errors
      expect(result.current.shouldRetry(0, new Error('404 not found'))).toBe(false);
      expect(result.current.shouldRetry(0, new Error('400 bad request'))).toBe(false);
      expect(result.current.shouldRetry(0, new Error('401 unauthorized'))).toBe(false);
    });
  });

  describe('executeWithRetry', () => {
    it('should execute operation successfully without retries', async () => {
      const policy: NetworkRetryPolicy = {
        strategy: 'exponential',
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        adaptToNetwork: false,
        requestTimeout: 5000,
      };

      const mockOperation = vi.fn().mockResolvedValue('success');
      const { result } = renderHook(() => useAdaptiveRetry(policy));

      const promise = result.current.executeWithRetry(mockOperation);
      
      await act(async () => {
        const response = await promise;
        expect(response).toBe('success');
      });

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry failed operation and eventually succeed', async () => {
      const policy: NetworkRetryPolicy = {
        strategy: 'exponential',
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        adaptToNetwork: false,
        requestTimeout: 5000,
      };

      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue('success');

      const { result } = renderHook(() => useAdaptiveRetry(policy));

      const promise = result.current.executeWithRetry(mockOperation);
      
      // Fast-forward through retry delays
      act(() => {
        vi.advanceTimersByTime(100); // First retry delay
      });
      
      act(() => {
        vi.advanceTimersByTime(200); // Second retry delay
      });

      await act(async () => {
        const response = await promise;
        expect(response).toBe('success');
      });

      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should fail after exhausting all retries', async () => {
      const policy: NetworkRetryPolicy = {
        strategy: 'exponential',
        maxRetries: 2,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        adaptToNetwork: false,
        requestTimeout: 5000,
      };

      const mockOperation = vi.fn().mockRejectedValue(new Error('persistent error'));
      const { result } = renderHook(() => useAdaptiveRetry(policy));

      const promise = result.current.executeWithRetry(mockOperation);
      
      // Fast-forward through all retry delays
      act(() => {
        vi.advanceTimersByTime(100); // First retry
      });
      
      act(() => {
        vi.advanceTimersByTime(200); // Second retry
      });

      await act(async () => {
        await expect(promise).rejects.toThrow('persistent error');
      });

      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry non-retryable errors', async () => {
      const policy: NetworkRetryPolicy = {
        strategy: 'exponential',
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        adaptToNetwork: false,
        requestTimeout: 5000,
      };

      const mockOperation = vi.fn().mockRejectedValue(new Error('404 not found'));
      const { result } = renderHook(() => useAdaptiveRetry(policy));

      const promise = result.current.executeWithRetry(mockOperation);

      await act(async () => {
        await expect(promise).rejects.toThrow('404 not found');
      });

      expect(mockOperation).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('Retry statistics', () => {
    it('should track retry statistics', async () => {
      const policy: NetworkRetryPolicy = {
        strategy: 'exponential',
        maxRetries: 2,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        adaptToNetwork: false,
        requestTimeout: 5000,
      };

      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue('success');

      const { result } = renderHook(() => useAdaptiveRetry(policy));

      const promise = result.current.executeWithRetry(mockOperation);
      
      act(() => {
        vi.advanceTimersByTime(100);
      });

      await act(async () => {
        await promise;
      });

      const stats = result.current.getRetryStats();
      expect(stats.totalAttempts).toBe(1);
      expect(stats.totalRetries).toBe(1);
      expect(stats.successfulRetries).toBe(1);
      expect(stats.failedRetries).toBe(0);
    });

    it('should reset statistics', () => {
      const policy: NetworkRetryPolicy = {
        strategy: 'exponential',
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        adaptToNetwork: false,
        requestTimeout: 5000,
      };

      const { result } = renderHook(() => useAdaptiveRetry(policy));

      // Execute some operations to generate stats
      result.current.executeWithRetry(() => Promise.resolve('test'));

      act(() => {
        result.current.resetStats();
      });

      const stats = result.current.getRetryStats();
      expect(stats.totalAttempts).toBe(0);
      expect(stats.totalRetries).toBe(0);
      expect(stats.successfulRetries).toBe(0);
      expect(stats.failedRetries).toBe(0);
    });
  });
});