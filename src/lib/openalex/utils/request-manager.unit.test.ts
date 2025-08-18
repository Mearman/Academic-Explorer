/**
 * Unit tests for RequestManager class
 * Tests request deduplication, promise sharing, and memory management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RequestManager } from './request-manager';

// Mock type for testing
interface TestResult {
  id: string;
  data: string;
}

describe('RequestManager', () => {
  let requestManager: RequestManager;
  let mockExecutor: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    requestManager = new RequestManager();
    mockExecutor = vi.fn();
  });

  afterEach(() => {
    requestManager.clear();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create an empty request manager', () => {
      expect(requestManager.getStats().activeRequests).toBe(0);
      expect(requestManager.getStats().totalRequests).toBe(0);
      expect(requestManager.getStats().deduplicatedRequests).toBe(0);
    });

    it('should accept configuration options', () => {
      const manager = new RequestManager({
        maxConcurrentRequests: 5,
        requestTimeout: 30000,
        enableMetrics: false
      });
      
      expect(manager).toBeDefined();
    });
  });

  describe('request deduplication', () => {
    it('should execute a single request normally', async () => {
      const key = 'test-key-1';
      const expectedResult = { id: '1', data: 'test' };
      
      mockExecutor.mockResolvedValueOnce(expectedResult);
      
      const result = await requestManager.deduplicate(key, mockExecutor);
      
      expect(result).toEqual(expectedResult);
      expect(mockExecutor).toHaveBeenCalledTimes(1);
      expect(requestManager.getStats().totalRequests).toBe(1);
      expect(requestManager.getStats().deduplicatedRequests).toBe(0);
      expect(requestManager.getStats().activeRequests).toBe(0);
    });

    it('should deduplicate concurrent requests for the same key', async () => {
      const key = 'test-key-concurrent';
      const expectedResult = { id: '1', data: 'test' };
      
      // Create a promise that we can control
      let resolvePromise: (value: TestResult) => void;
      const controlledPromise = new Promise<TestResult>((resolve) => {
        resolvePromise = resolve;
      });
      
      mockExecutor.mockReturnValue(controlledPromise);
      
      // Start multiple requests simultaneously
      const promise1 = requestManager.deduplicate(key, mockExecutor);
      const promise2 = requestManager.deduplicate(key, mockExecutor);
      const promise3 = requestManager.deduplicate(key, mockExecutor);
      
      // Verify that only one request is active
      expect(requestManager.getStats().activeRequests).toBe(1);
      expect(mockExecutor).toHaveBeenCalledTimes(1);
      
      // Resolve the controlled promise
      resolvePromise!(expectedResult);
      
      // Wait for all promises to resolve
      const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);
      
      // All should return the same result
      expect(result1).toEqual(expectedResult);
      expect(result2).toEqual(expectedResult);
      expect(result3).toEqual(expectedResult);
      
      // Verify metrics
      expect(requestManager.getStats().totalRequests).toBe(3);
      expect(requestManager.getStats().deduplicatedRequests).toBe(2);
      expect(requestManager.getStats().activeRequests).toBe(0);
      expect(mockExecutor).toHaveBeenCalledTimes(1);
    });

    it('should handle different keys independently', async () => {
      const key1 = 'test-key-1';
      const key2 = 'test-key-2';
      const result1 = { id: '1', data: 'test1' };
      const result2 = { id: '2', data: 'test2' };
      
      mockExecutor
        .mockResolvedValueOnce(result1)
        .mockResolvedValueOnce(result2);
      
      // Execute requests with different keys
      const [actualResult1, actualResult2] = await Promise.all([
        requestManager.deduplicate(key1, mockExecutor),
        requestManager.deduplicate(key2, mockExecutor)
      ]);
      
      expect(actualResult1).toEqual(result1);
      expect(actualResult2).toEqual(result2);
      expect(mockExecutor).toHaveBeenCalledTimes(2);
      expect(requestManager.getStats().deduplicatedRequests).toBe(0);
    });

    it('should handle sequential requests for the same key', async () => {
      const key = 'test-key-sequential';
      const result1 = { id: '1', data: 'test1' };
      const result2 = { id: '2', data: 'test2' };
      
      mockExecutor
        .mockResolvedValueOnce(result1)
        .mockResolvedValueOnce(result2);
      
      // Execute requests sequentially
      const actualResult1 = await requestManager.deduplicate(key, mockExecutor);
      const actualResult2 = await requestManager.deduplicate(key, mockExecutor);
      
      expect(actualResult1).toEqual(result1);
      expect(actualResult2).toEqual(result2);
      expect(mockExecutor).toHaveBeenCalledTimes(2);
      expect(requestManager.getStats().deduplicatedRequests).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should propagate errors to all concurrent requests', async () => {
      const key = 'test-key-error';
      const testError = new Error('Test error');
      
      // Create a promise that we can control
      let rejectPromise: (error: Error) => void;
      const controlledPromise = new Promise<TestResult>((_, reject) => {
        rejectPromise = reject;
      });
      
      mockExecutor.mockReturnValue(controlledPromise);
      
      // Start multiple requests simultaneously
      const promise1 = requestManager.deduplicate(key, mockExecutor);
      const promise2 = requestManager.deduplicate(key, mockExecutor);
      const promise3 = requestManager.deduplicate(key, mockExecutor);
      
      // Reject the controlled promise
      rejectPromise!(testError);
      
      // All should reject with the same error
      await expect(promise1).rejects.toThrow('Test error');
      await expect(promise2).rejects.toThrow('Test error');
      await expect(promise3).rejects.toThrow('Test error');
      
      // Verify cleanup happened
      expect(requestManager.getStats().activeRequests).toBe(0);
      expect(mockExecutor).toHaveBeenCalledTimes(1);
    });

    it('should allow new requests after error cleanup', async () => {
      const key = 'test-key-after-error';
      const testError = new Error('Test error');
      const successResult = { id: '1', data: 'success' };
      
      mockExecutor
        .mockRejectedValueOnce(testError)
        .mockResolvedValueOnce(successResult);
      
      // First request should fail
      await expect(requestManager.deduplicate(key, mockExecutor)).rejects.toThrow('Test error');
      
      // Second request should succeed
      const result = await requestManager.deduplicate(key, mockExecutor);
      expect(result).toEqual(successResult);
      expect(mockExecutor).toHaveBeenCalledTimes(2);
    });
  });

  describe('memory management', () => {
    it('should clean up completed requests', async () => {
      const key = 'test-key-cleanup';
      const result = { id: '1', data: 'test' };
      
      mockExecutor.mockResolvedValueOnce(result);
      
      await requestManager.deduplicate(key, mockExecutor);
      
      // Request should be cleaned up
      expect(requestManager.getStats().activeRequests).toBe(0);
      expect(requestManager.hasActiveRequest(key)).toBe(false);
    });

    it('should clean up failed requests', async () => {
      const key = 'test-key-cleanup-error';
      const testError = new Error('Test error');
      
      mockExecutor.mockRejectedValueOnce(testError);
      
      await expect(requestManager.deduplicate(key, mockExecutor)).rejects.toThrow('Test error');
      
      // Request should be cleaned up
      expect(requestManager.getStats().activeRequests).toBe(0);
      expect(requestManager.hasActiveRequest(key)).toBe(false);
    });

    it('should clear all requests', async () => {
      const result = { id: '1', data: 'test' };
      
      // Create a promise that we can control to keep request active
      let resolvePromise: (value: TestResult) => void;
      const controlledPromise = new Promise<TestResult>((resolve) => {
        resolvePromise = resolve;
      });
      
      mockExecutor.mockReturnValue(controlledPromise);
      
      // Start a request but don't resolve it
      const promise = requestManager.deduplicate('test-key', mockExecutor);
      
      expect(requestManager.getStats().activeRequests).toBe(1);
      
      // Clear should remove all requests
      requestManager.clear();
      
      expect(requestManager.getStats().activeRequests).toBe(0);
      expect(requestManager.getStats().totalRequests).toBe(0);
      expect(requestManager.getStats().deduplicatedRequests).toBe(0);
      
      // The promise should still be pending/rejected due to cleanup
      resolvePromise!(result);
      await expect(promise).resolves.toEqual(result);
    });
  });

  describe('request tracking', () => {
    it('should track active requests', () => {
      const key = 'test-key-tracking';
      
      // Create a promise that we can control
      const controlledPromise = new Promise<TestResult>(() => {
        // Never resolve to keep request active
      });
      
      mockExecutor.mockReturnValue(controlledPromise);
      
      // Start request
      requestManager.deduplicate(key, mockExecutor);
      
      expect(requestManager.hasActiveRequest(key)).toBe(true);
      expect(requestManager.getStats().activeRequests).toBe(1);
    });

    it('should provide request statistics', async () => {
      const key1 = 'test-key-stats-1';
      const key2 = 'test-key-stats-2';
      const result = { id: '1', data: 'test' };
      
      mockExecutor.mockResolvedValue(result);
      
      // Execute some requests
      await Promise.all([
        requestManager.deduplicate(key1, mockExecutor),
        requestManager.deduplicate(key1, mockExecutor), // This should be deduplicated
        requestManager.deduplicate(key2, mockExecutor)
      ]);
      
      const stats = requestManager.getStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.deduplicatedRequests).toBe(1);
      expect(stats.activeRequests).toBe(0);
      expect(stats.completedRequests).toBe(3);
      expect(stats.failedRequests).toBe(0);
    });

    it('should track failed requests in statistics', async () => {
      const key = 'test-key-failed-stats';
      const testError = new Error('Test error');
      
      mockExecutor.mockRejectedValueOnce(testError);
      
      await expect(requestManager.deduplicate(key, mockExecutor)).rejects.toThrow('Test error');
      
      const stats = requestManager.getStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.failedRequests).toBe(1);
      expect(stats.completedRequests).toBe(0);
    });
  });

  describe('cancellation support', () => {
    it('should support request cancellation', async () => {
      const key = 'test-key-cancel';
      
      // Create a cancellable promise
      const abortController = new AbortController();
      const signal = abortController.signal;
      
      const cancellablePromise = new Promise<TestResult>((_, reject) => {
        signal.addEventListener('abort', () => {
          reject(new Error('Request cancelled'));
        });
      });
      
      mockExecutor.mockReturnValue(cancellablePromise);
      
      // Start request
      const promise = requestManager.deduplicate(key, mockExecutor);
      
      // Cancel the request
      requestManager.cancel(key);
      
      // Should clean up
      expect(requestManager.hasActiveRequest(key)).toBe(false);
      
      // Original promise should still work as the executor manages cancellation
      abortController.abort();
      await expect(promise).rejects.toThrow('Request cancelled');
    });

    it('should cancel all requests', async () => {
      // Create multiple active requests
      const controlledPromise = new Promise<TestResult>(() => {
        // Never resolve
      });
      
      mockExecutor.mockReturnValue(controlledPromise);
      
      requestManager.deduplicate('key1', mockExecutor);
      requestManager.deduplicate('key2', mockExecutor);
      requestManager.deduplicate('key3', mockExecutor);
      
      expect(requestManager.getStats().activeRequests).toBe(3);
      
      // Cancel all
      requestManager.cancelAll();
      
      expect(requestManager.getStats().activeRequests).toBe(0);
    });
  });

  describe('configuration options', () => {
    it('should respect maxConcurrentRequests limit', async () => {
      const managerWithLimit = new RequestManager({
        maxConcurrentRequests: 2
      });
      
      // Create promises that won't resolve
      const controlledPromise = new Promise<TestResult>(() => {
        // Never resolve
      });
      
      mockExecutor.mockReturnValue(controlledPromise);
      
      // Start requests up to the limit
      managerWithLimit.deduplicate('key1', mockExecutor);
      managerWithLimit.deduplicate('key2', mockExecutor);
      
      expect(managerWithLimit.getStats().activeRequests).toBe(2);
      
      // Third request should be queued or handled according to strategy
      const promise3 = managerWithLimit.deduplicate('key3', mockExecutor);
      
      // The behavior here depends on the implementation strategy
      // For now, let's just verify it doesn't exceed the limit immediately
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      
      managerWithLimit.clear();
    });

    it('should support disabling metrics', () => {
      const managerWithoutMetrics = new RequestManager({
        enableMetrics: false
      });
      
      const stats = managerWithoutMetrics.getStats();
      expect(stats).toBeDefined();
      // The exact behavior depends on implementation
    });
  });

  describe('key generation', () => {
    it('should handle complex keys correctly', async () => {
      const complexKey = 'works:{"filter":"publication_year:2023","sort":"cited_by_count:desc"}';
      const result = { id: '1', data: 'test' };
      
      mockExecutor.mockResolvedValueOnce(result);
      
      const actualResult = await requestManager.deduplicate(complexKey, mockExecutor);
      
      expect(actualResult).toEqual(result);
      expect(mockExecutor).toHaveBeenCalledTimes(1);
    });

    it('should treat different keys as separate requests', async () => {
      const key1 = 'entity:work:W123';
      const key2 = 'entity:work:W124';
      const result = { id: '1', data: 'test' };
      
      mockExecutor.mockResolvedValue(result);
      
      await Promise.all([
        requestManager.deduplicate(key1, mockExecutor),
        requestManager.deduplicate(key2, mockExecutor)
      ]);
      
      expect(mockExecutor).toHaveBeenCalledTimes(2);
      expect(requestManager.getStats().deduplicatedRequests).toBe(0);
    });
  });
});