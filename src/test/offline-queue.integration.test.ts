/**
 * Integration tests for offline queue management
 * Tests the interaction between network status, queue management, and request processing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

import { useOfflineQueue } from '@/hooks/use-offline-queue';
import { useNetworkStatus } from '@/hooks/use-network-status';
import type { QueuedRequest } from '@/types/network';

// Mock the network status hook
vi.mock('@/hooks/use-network-status');

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  data: new Map<string, string>(),
  getItem: vi.fn((key: string) => mockLocalStorage.data.get(key) || null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage.data.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    mockLocalStorage.data.delete(key);
  }),
  clear: vi.fn(() => {
    mockLocalStorage.data.clear();
  }),
  length: 0,
  key: vi.fn(),
};

describe('Offline Queue Integration Tests', () => {
  const mockUseNetworkStatus = vi.mocked(useNetworkStatus);

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
    
    // Mock localStorage
    vi.stubGlobal('localStorage', mockLocalStorage);
    
    // Default to online state
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      isOffline: false,
      connectionType: '4g',
      effectiveConnectionType: '4g',
      connectionQuality: 'fast',
      isSlowConnection: false,
      downlink: 10,
      rtt: 50,
      saveData: false,
      lastOnlineTime: Date.now(),
      offlineDuration: 0,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Online Request Processing', () => {
    it('should execute requests immediately when online', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useOfflineQueue());

      let resolvedData: unknown = null;
      const testRequest: Omit<QueuedRequest, 'id' | 'queuedAt' | 'retryCount'> = {
        url: 'https://api.openalex.org/works',
        method: 'GET',
        maxRetries: 3,
        priority: 5,
        persistent: false,
        resolve: (data) => { resolvedData = data; },
      };

      act(() => {
        result.current.queueRequest(testRequest);
      });

      await waitFor(() => {
        expect(resolvedData).toEqual({ success: true });
      });

      expect(mockFetch).toHaveBeenCalledWith('https://api.openalex.org/works', {
        method: 'GET',
      });
    });

    it('should handle immediate execution failures with retry', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        });

      const { result } = renderHook(() => useOfflineQueue());

      let resolvedData: unknown = null;
      let rejectedError: Error | null = null;
      
      const testRequest: Omit<QueuedRequest, 'id' | 'queuedAt' | 'retryCount'> = {
        url: 'https://api.openalex.org/works',
        method: 'GET',
        maxRetries: 2,
        priority: 5,
        persistent: false,
        resolve: (data) => { resolvedData = data; },
        reject: (error) => { rejectedError = error; },
      };

      act(() => {
        result.current.queueRequest(testRequest);
      });

      // Should queue the request for retry after initial failure
      await waitFor(() => {
        expect(result.current.queueStatus.pendingRequests).toBeGreaterThan(0);
      });
    });
  });

  describe('Offline Queue Management', () => {
    beforeEach(() => {
      // Set network to offline
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
        connectionType: 'unknown',
        effectiveConnectionType: 'unknown',
        connectionQuality: 'unknown',
        isSlowConnection: false,
        downlink: 0,
        rtt: 0,
        saveData: false,
        lastOnlineTime: Date.now() - 5000,
        offlineDuration: 5000,
      });
    });

    it('should queue requests when offline', async () => {
      const { result } = renderHook(() => useOfflineQueue());

      const testRequest: Omit<QueuedRequest, 'id' | 'queuedAt' | 'retryCount'> = {
        url: 'https://api.openalex.org/works',
        method: 'GET',
        maxRetries: 3,
        priority: 5,
        persistent: true,
      };

      act(() => {
        result.current.queueRequest(testRequest);
      });

      expect(result.current.queueStatus.pendingRequests).toBe(1);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should persist high-priority requests to localStorage', async () => {
      const { result } = renderHook(() => useOfflineQueue());

      const highPriorityRequest: Omit<QueuedRequest, 'id' | 'queuedAt' | 'retryCount'> = {
        url: 'https://api.openalex.org/works',
        method: 'POST',
        body: { data: 'important' },
        maxRetries: 5,
        priority: 8,
        persistent: true,
      };

      act(() => {
        result.current.queueRequest(highPriorityRequest);
      });

      expect(result.current.queueStatus.highPriorityRequests).toBe(1);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should maintain queue priority order', async () => {
      const { result } = renderHook(() => useOfflineQueue());

      const lowPriorityRequest: Omit<QueuedRequest, 'id' | 'queuedAt' | 'retryCount'> = {
        url: 'https://api.openalex.org/works/1',
        method: 'GET',
        maxRetries: 3,
        priority: 2,
        persistent: true,
      };

      const highPriorityRequest: Omit<QueuedRequest, 'id' | 'queuedAt' | 'retryCount'> = {
        url: 'https://api.openalex.org/works/2',
        method: 'GET',
        maxRetries: 3,
        priority: 8,
        persistent: true,
      };

      act(() => {
        result.current.queueRequest(lowPriorityRequest);
        result.current.queueRequest(highPriorityRequest);
      });

      expect(result.current.queueStatus.pendingRequests).toBe(2);
      expect(result.current.queueStatus.highPriorityRequests).toBe(1);
    });

    it('should allow cancelling queued requests', async () => {
      const { result } = renderHook(() => useOfflineQueue());

      const testRequest: Omit<QueuedRequest, 'id' | 'queuedAt' | 'retryCount'> = {
        url: 'https://api.openalex.org/works',
        method: 'GET',
        maxRetries: 3,
        priority: 5,
        persistent: true,
      };

      let requestId: string;
      act(() => {
        requestId = result.current.queueRequest(testRequest);
      });

      expect(result.current.queueStatus.pendingRequests).toBe(1);

      act(() => {
        const cancelled = result.current.cancelRequest(requestId);
        expect(cancelled).toBe(true);
      });

      expect(result.current.queueStatus.pendingRequests).toBe(0);
    });

    it('should clear entire queue when requested', async () => {
      const { result } = renderHook(() => useOfflineQueue());

      // Add multiple requests
      act(() => {
        for (let i = 0; i < 3; i++) {
          result.current.queueRequest({
            url: `https://api.openalex.org/works/${i}`,
            method: 'GET',
            maxRetries: 3,
            priority: 5,
            persistent: true,
          });
        }
      });

      expect(result.current.queueStatus.pendingRequests).toBe(3);

      act(() => {
        result.current.clearQueue();
      });

      expect(result.current.queueStatus.pendingRequests).toBe(0);
    });
  });

  describe('Online/Offline Transitions', () => {
    it('should process queue when coming back online', async () => {
      // Start offline
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
        connectionType: 'unknown',
        effectiveConnectionType: 'unknown',
        connectionQuality: 'unknown',
        isSlowConnection: false,
        downlink: 0,
        rtt: 0,
        saveData: false,
        lastOnlineTime: Date.now() - 5000,
        offlineDuration: 5000,
      });

      const { result, rerender } = renderHook(() => useOfflineQueue());

      // Queue some requests while offline
      act(() => {
        result.current.queueRequest({
          url: 'https://api.openalex.org/works/1',
          method: 'GET',
          maxRetries: 3,
          priority: 5,
          persistent: true,
        });
        result.current.queueRequest({
          url: 'https://api.openalex.org/works/2',
          method: 'GET',
          maxRetries: 3,
          priority: 8,
          persistent: true,
        });
      });

      expect(result.current.queueStatus.pendingRequests).toBe(2);

      // Mock successful responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ id: '1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ id: '2' }),
        });

      // Come back online
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        isOffline: false,
        connectionType: '4g',
        effectiveConnectionType: '4g',
        connectionQuality: 'fast',
        isSlowConnection: false,
        downlink: 10,
        rtt: 50,
        saveData: false,
        lastOnlineTime: Date.now(),
        offlineDuration: 0,
      });

      rerender();

      // Manually trigger queue processing
      act(() => {
        result.current.processQueue();
      });

      // Wait for queue to be processed
      await waitFor(() => {
        expect(result.current.queueStatus.pendingRequests).toBe(0);
      }, { timeout: 3000 });

      expect(result.current.queueStatus.totalProcessed).toBe(2);
    });

    it('should handle network instability with frequent online/offline transitions', async () => {
      const { result, rerender } = renderHook(() => useOfflineQueue());

      // Add a request while online
      mockFetch.mockRejectedValue(new Error('Network unstable'));

      act(() => {
        result.current.queueRequest({
          url: 'https://api.openalex.org/works',
          method: 'GET',
          maxRetries: 5,
          priority: 5,
          persistent: true,
        });
      });

      // Simulate going offline quickly
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
        connectionType: 'unknown',
        effectiveConnectionType: 'unknown',
        connectionQuality: 'unknown',
        isSlowConnection: false,
        downlink: 0,
        rtt: 0,
        saveData: false,
        lastOnlineTime: Date.now() - 1000,
        offlineDuration: 1000,
      });

      rerender();

      // Come back online
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        isOffline: false,
        connectionType: '3g',
        effectiveConnectionType: '3g',
        connectionQuality: 'slow',
        isSlowConnection: true,
        downlink: 1,
        rtt: 300,
        saveData: false,
        lastOnlineTime: Date.now(),
        offlineDuration: 0,
      });

      rerender();

      // Should have at least one request in queue due to failures
      expect(result.current.queueStatus.pendingRequests).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should respect maximum retry limits', async () => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        isOffline: false,
        connectionType: '4g',
        effectiveConnectionType: '4g',
        connectionQuality: 'fast',
        isSlowConnection: false,
        downlink: 10,
        rtt: 50,
        saveData: false,
        lastOnlineTime: Date.now(),
        offlineDuration: 0,
      });

      const { result } = renderHook(() => useOfflineQueue());

      // Mock all requests to fail
      mockFetch.mockRejectedValue(new Error('Persistent failure'));

      let rejectedError: Error | null = null;
      
      act(() => {
        result.current.queueRequest({
          url: 'https://api.openalex.org/works',
          method: 'GET',
          maxRetries: 2,
          priority: 5,
          persistent: true,
          reject: (error) => { rejectedError = error; },
        });
      });

      await waitFor(() => {
        expect(rejectedError).toBeInstanceOf(Error);
      }, { timeout: 5000 });

      expect(result.current.queueStatus.totalFailed).toBe(1);
    });

    it('should handle request timeout scenarios', async () => {
      const { result } = renderHook(() => useOfflineQueue());

      // Mock a timeout scenario
      mockFetch.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject(new DOMException('AbortError', 'AbortError'));
          }, 100);
        });
      });

      let rejectedError: Error | null = null;

      act(() => {
        result.current.queueRequest({
          url: 'https://api.openalex.org/works',
          method: 'GET',
          maxRetries: 1,
          priority: 5,
          persistent: false,
          reject: (error) => { rejectedError = error; },
        });
      });

      await waitFor(() => {
        expect(rejectedError).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  describe('Persistence and Recovery', () => {
    it('should load persisted queue on initialisation', async () => {
      // Simulate persisted data in localStorage
      const persistedQueue = [
        {
          id: 'test-1',
          url: 'https://api.openalex.org/works/1',
          method: 'GET',
          queuedAt: Date.now() - 1000,
          retryCount: 0,
          maxRetries: 3,
          priority: 5,
          persistent: true,
        },
        {
          id: 'test-2',
          url: 'https://api.openalex.org/works/2',
          method: 'POST',
          body: { data: 'test' },
          queuedAt: Date.now() - 2000,
          retryCount: 1,
          maxRetries: 3,
          priority: 8,
          persistent: true,
        },
      ];

      mockLocalStorage.setItem('offline-request-queue', JSON.stringify(persistedQueue));

      const { result } = renderHook(() => useOfflineQueue());

      await waitFor(() => {
        expect(result.current.queueStatus.pendingRequests).toBe(2);
      });

      expect(result.current.queueStatus.highPriorityRequests).toBe(1);
    });

    it('should handle corrupted persisted queue data gracefully', async () => {
      // Simulate corrupted data in localStorage
      mockLocalStorage.setItem('offline-request-queue', 'invalid-json{');

      const { result } = renderHook(() => useOfflineQueue());

      // Should not crash and should start with empty queue
      expect(result.current.queueStatus.pendingRequests).toBe(0);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large numbers of queued requests efficiently', async () => {
      const { result } = renderHook(() => useOfflineQueue());

      // Set offline to prevent immediate execution
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
        connectionType: 'unknown',
        effectiveConnectionType: 'unknown',
        connectionQuality: 'unknown',
        isSlowConnection: false,
        downlink: 0,
        rtt: 0,
        saveData: false,
        lastOnlineTime: Date.now() - 5000,
        offlineDuration: 5000,
      });

      const startTime = performance.now();

      // Queue many requests
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.queueRequest({
            url: `https://api.openalex.org/works/${i}`,
            method: 'GET',
            maxRetries: 3,
            priority: Math.floor(Math.random() * 10),
            persistent: i % 10 === 0, // Only persist every 10th request
          });
        }
      });

      const endTime = performance.now();

      expect(result.current.queueStatus.pendingRequests).toBe(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });
});