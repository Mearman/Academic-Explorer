/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useOfflineQueue } from './use-offline-queue';
import type { QueuedRequest, RequestQueueStatus } from '@/types/network';

// Mock the network status hook
const mockNetworkStatus = {
  isOnline: true,
  isOffline: false,
  connectionType: 'unknown' as const,
  effectiveConnectionType: 'unknown' as const,
  connectionQuality: 'fast' as const,
  isSlowConnection: false,
  downlink: 10,
  rtt: 50,
  saveData: false,
  lastOnlineTime: Date.now(),
  offlineDuration: 0,
};

vi.mock('./use-network-status', () => ({
  useNetworkStatus: () => mockNetworkStatus,
}));

// Mock localStorage for queue persistence
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('useOfflineQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Reset network status
    mockNetworkStatus.isOnline = true;
    mockNetworkStatus.isOffline = false;
    
    // Reset localStorage mock
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Queue management', () => {
    it('should initialise with empty queue', () => {
      const { result } = renderHook(() => useOfflineQueue());

      expect(result.current.queueStatus.pendingRequests).toBe(0);
      expect(result.current.queueStatus.isProcessing).toBe(false);
    });

    it('should load persisted queue from localStorage on mount', () => {
      const persistedQueue: QueuedRequest[] = [
        {
          id: 'test-1',
          url: '/api/test',
          method: 'GET',
          queuedAt: Date.now(),
          retryCount: 0,
          maxRetries: 3,
          priority: 1,
          persistent: true,
        },
      ];
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(persistedQueue));

      const { result } = renderHook(() => useOfflineQueue());

      expect(result.current.queueStatus.pendingRequests).toBe(1);
    });

    it('should add request to queue when offline', () => {
      mockNetworkStatus.isOnline = false;
      mockNetworkStatus.isOffline = true;

      const { result } = renderHook(() => useOfflineQueue());

      act(() => {
        const requestId = result.current.queueRequest({
          url: '/api/test',
          method: 'GET',
          maxRetries: 3,
          priority: 1,
          persistent: false,
        });
        
        expect(requestId).toBeTruthy();
      });

      expect(result.current.queueStatus.pendingRequests).toBe(1);
    });

    it('should execute request immediately when online', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response('{}'));
      global.fetch = mockFetch;

      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        const requestId = result.current.queueRequest({
          url: '/api/test',
          method: 'GET',
          maxRetries: 3,
          priority: 1,
          persistent: false,
        });
        
        expect(requestId).toBeTruthy();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        method: 'GET',
      }));
      expect(result.current.queueStatus.pendingRequests).toBe(0);
    });

    it('should cancel queued request', () => {
      mockNetworkStatus.isOnline = false;

      const { result } = renderHook(() => useOfflineQueue());

      let requestId: string;
      
      act(() => {
        requestId = result.current.queueRequest({
          url: '/api/test',
          method: 'GET',
          maxRetries: 3,
          priority: 1,
          persistent: false,
        });
      });

      expect(result.current.queueStatus.pendingRequests).toBe(1);

      act(() => {
        const cancelled = result.current.cancelRequest(requestId);
        expect(cancelled).toBe(true);
      });

      expect(result.current.queueStatus.pendingRequests).toBe(0);
    });

    it('should clear entire queue', () => {
      mockNetworkStatus.isOnline = false;

      const { result } = renderHook(() => useOfflineQueue());

      act(() => {
        result.current.queueRequest({
          url: '/api/test1',
          method: 'GET',
          maxRetries: 3,
          priority: 1,
          persistent: false,
        });
        
        result.current.queueRequest({
          url: '/api/test2',
          method: 'POST',
          maxRetries: 3,
          priority: 2,
          persistent: false,
        });
      });

      expect(result.current.queueStatus.pendingRequests).toBe(2);

      act(() => {
        result.current.clearQueue();
      });

      expect(result.current.queueStatus.pendingRequests).toBe(0);
    });
  });

  describe('Priority handling', () => {
    it('should process high priority requests first', async () => {
      mockNetworkStatus.isOnline = false;
      const { result } = renderHook(() => useOfflineQueue());

      // Add requests with different priorities
      act(() => {
        result.current.queueRequest({
          url: '/api/low-priority',
          method: 'GET',
          maxRetries: 3,
          priority: 1,
          persistent: false,
        });
        
        result.current.queueRequest({
          url: '/api/high-priority',
          method: 'GET',
          maxRetries: 3,
          priority: 5,
          persistent: false,
        });
        
        result.current.queueRequest({
          url: '/api/medium-priority',
          method: 'GET',
          maxRetries: 3,
          priority: 3,
          persistent: false,
        });
      });

      expect(result.current.queueStatus.pendingRequests).toBe(3);
      expect(result.current.queueStatus.highPriorityRequests).toBe(1);

      // Mock fetch to track order
      const fetchOrder: string[] = [];
      global.fetch = vi.fn().mockImplementation((url: string) => {
        fetchOrder.push(url);
        return Promise.resolve(new Response('{}'));
      });

      // Go online and trigger processing
      act(() => {
        mockNetworkStatus.isOnline = true;
        mockNetworkStatus.isOffline = false;
      });

      await act(async () => {
        await result.current.processQueue();
      });

      expect(fetchOrder).toEqual([
        '/api/high-priority',
        '/api/medium-priority', 
        '/api/low-priority',
      ]);
    });
  });

  describe('Request execution', () => {
    it('should execute GET request with proper headers', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response('{"data": "test"}'));
      global.fetch = mockFetch;

      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        result.current.queueRequest({
          url: '/api/test',
          method: 'GET',
          headers: { 'Authorization': 'Bearer token' },
          maxRetries: 3,
          priority: 1,
          persistent: false,
        });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer token' },
      });
    });

    it('should execute POST request with body', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response('{"success": true}'));
      global.fetch = mockFetch;

      const requestBody = { name: 'test', value: 123 };
      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        result.current.queueRequest({
          url: '/api/create',
          method: 'POST',
          body: requestBody,
          headers: { 'Content-Type': 'application/json' },
          maxRetries: 3,
          priority: 1,
          persistent: false,
        });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
    });

    it('should retry failed requests up to max retries', async () => {
      mockNetworkStatus.isOnline = false;
      const { result } = renderHook(() => useOfflineQueue());

      // Queue request while offline
      act(() => {
        result.current.queueRequest({
          url: '/api/test',
          method: 'GET',
          maxRetries: 2,
          priority: 1,
          persistent: false,
        });
      });

      // Mock fetch to fail twice then succeed
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(new Response('{"success": true}'));
      });

      // Go online and process
      act(() => {
        mockNetworkStatus.isOnline = true;
      });

      await act(async () => {
        const processPromise = result.current.processQueue();
        // Advance timers to handle retry delays
        await vi.advanceTimersByTimeAsync(1000);
        await processPromise;
      });

      expect(fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(result.current.queueStatus.pendingRequests).toBe(0);
    });

    it('should remove request after max retries exceeded', async () => {
      mockNetworkStatus.isOnline = false;
      const { result } = renderHook(() => useOfflineQueue());

      act(() => {
        result.current.queueRequest({
          url: '/api/test',
          method: 'GET',
          maxRetries: 1,
          priority: 1,
          persistent: false,
        });
      });

      // Mock fetch to always fail
      global.fetch = vi.fn().mockRejectedValue(new Error('Persistent error'));

      // Go online and process
      act(() => {
        mockNetworkStatus.isOnline = true;
      });

      await act(async () => {
        const processPromise = result.current.processQueue();
        // Advance timers to handle retry delays
        await vi.advanceTimersByTimeAsync(1000);
        await processPromise;
      });

      expect(fetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
      expect(result.current.queueStatus.pendingRequests).toBe(0);
    });
  });

  describe('Persistence', () => {
    it('should persist queue to localStorage for persistent requests', () => {
      mockNetworkStatus.isOnline = false;
      const { result } = renderHook(() => useOfflineQueue());

      act(() => {
        result.current.queueRequest({
          url: '/api/persistent',
          method: 'GET',
          maxRetries: 3,
          priority: 1,
          persistent: true,
        });
        
        result.current.queueRequest({
          url: '/api/transient',
          method: 'GET',
          maxRetries: 3,
          priority: 1,
          persistent: false,
        });
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'offline-request-queue',
        expect.stringContaining('/api/persistent')
      );
      
      // Should only persist the persistent request
      const persistedData = mockLocalStorage.setItem.mock.calls.find(
        call => call[0] === 'offline-request-queue'
      )?.[1];
      
      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].url).toBe('/api/persistent');
      }
    });

    it('should not persist non-persistent requests', () => {
      mockNetworkStatus.isOnline = false;
      const { result } = renderHook(() => useOfflineQueue());

      act(() => {
        result.current.queueRequest({
          url: '/api/transient',
          method: 'GET',
          maxRetries: 3,
          priority: 1,
          persistent: false,
        });
      });

      // Should not call setItem or should call with empty array
      const persistCall = mockLocalStorage.setItem.mock.calls.find(
        call => call[0] === 'offline-request-queue'
      );
      
      if (persistCall) {
        const persistedData = JSON.parse(persistCall[1]);
        expect(persistedData).toHaveLength(0);
      }
    });
  });

  describe('Background processing', () => {
    it('should automatically process queue when coming online', async () => {
      // Start offline with queued requests
      mockNetworkStatus.isOnline = false;
      const { result } = renderHook(() => useOfflineQueue());

      act(() => {
        result.current.queueRequest({
          url: '/api/test',
          method: 'GET',
          maxRetries: 3,
          priority: 1,
          persistent: false,
        });
      });

      expect(result.current.queueStatus.pendingRequests).toBe(1);

      // Mock successful fetch
      global.fetch = vi.fn().mockResolvedValue(new Response('{}'));

      // Go online
      act(() => {
        mockNetworkStatus.isOnline = true;
        mockNetworkStatus.isOffline = false;
      });

      // Should automatically process
      await act(async () => {
        // Trigger the online event handler
        const onlineEvent = new Event('online');
        window.dispatchEvent(onlineEvent);
      });

      expect(result.current.queueStatus.pendingRequests).toBe(0);
      expect(fetch).toHaveBeenCalled();
    });

    it('should process queue in batches', async () => {
      mockNetworkStatus.isOnline = false;
      const { result } = renderHook(() => useOfflineQueue());

      // Add multiple requests
      act(() => {
        for (let i = 0; i < 15; i++) {
          result.current.queueRequest({
            url: `/api/test-${i}`,
            method: 'GET',
            maxRetries: 3,
            priority: 1,
            persistent: false,
          });
        }
      });

      expect(result.current.queueStatus.pendingRequests).toBe(15);

      global.fetch = vi.fn().mockResolvedValue(new Response('{}'));

      act(() => {
        mockNetworkStatus.isOnline = true;
      });

      await act(async () => {
        await result.current.processQueue();
      });

      // Should process all requests
      expect(fetch).toHaveBeenCalledTimes(15);
      expect(result.current.queueStatus.pendingRequests).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should track successful request statistics', async () => {
      global.fetch = vi.fn().mockResolvedValue(new Response('{}'));
      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        result.current.queueRequest({
          url: '/api/test',
          method: 'GET',
          maxRetries: 3,
          priority: 1,
          persistent: false,
        });
      });

      expect(result.current.queueStatus.totalProcessed).toBe(1);
      expect(result.current.queueStatus.totalFailed).toBe(0);
      expect(result.current.queueStatus.lastSuccessfulRequest).toBeGreaterThan(0);
    });

    it('should track failed request statistics', async () => {
      mockNetworkStatus.isOnline = false;
      const { result } = renderHook(() => useOfflineQueue());

      act(() => {
        result.current.queueRequest({
          url: '/api/test',
          method: 'GET',
          maxRetries: 1,
          priority: 1,
          persistent: false,
        });
      });

      global.fetch = vi.fn().mockRejectedValue(new Error('Persistent error'));

      act(() => {
        mockNetworkStatus.isOnline = true;
      });

      await act(async () => {
        await result.current.processQueue();
      });

      expect(result.current.queueStatus.totalFailed).toBe(1);
    });
  });
});