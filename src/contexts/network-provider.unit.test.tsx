/**
 * @vitest-environment jsdom
 */

import { render, renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { useNetworkContext, useNetworkContextOptional } from '@/hooks/use-network-context';
import type { 
  NetworkRetryPolicy,
  BackgroundSyncConfig,
  ConnectionQuality,
  QueuedRequest 
} from '@/types/network';

import { NetworkProvider } from './network-provider';

// Mock network status hook
const mockNetworkStatus = {
  isOnline: true,
  isOffline: false,
  connectionQuality: 'fast' as ConnectionQuality,
  isSlowConnection: false,
  connectionType: '4g' as const,
  effectiveConnectionType: '4g' as const,
  downlink: 10,
  rtt: 100,
  saveData: false,
  lastOnlineTime: 1000,
  offlineDuration: 0,
};

vi.mock('@/hooks/use-network-status', () => ({
  useNetworkStatus: () => mockNetworkStatus,
}));

// Mock offline queue hook
const mockOfflineQueue = {
  queueStatus: {
    pendingRequests: 0,
    highPriorityRequests: 0,
    isProcessing: false,
    lastSuccessfulRequest: 0,
    totalProcessed: 0,
    totalFailed: 0,
  },
  queueRequest: vi.fn().mockReturnValue('mock-request-id'),
  cancelRequest: vi.fn().mockReturnValue(true),
  clearQueue: vi.fn(),
  processQueue: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@/hooks/use-offline-queue', () => ({
  useOfflineQueue: () => mockOfflineQueue,
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
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

// Mock performance.now
Object.defineProperty(global, 'performance', {
  value: { now: vi.fn(() => 1000) },
  writable: true,
});

// Test wrapper component
function TestWrapper({ children }: { children: ReactNode }) {
  return <NetworkProvider debug={true}>{children}</NetworkProvider>;
}

describe('NetworkProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset network status
    mockNetworkStatus.isOnline = true;
    mockNetworkStatus.isOffline = false;
    mockNetworkStatus.connectionQuality = 'fast';
    mockNetworkStatus.isSlowConnection = false;
    
    // Reset queue status
    mockOfflineQueue.queueStatus.pendingRequests = 0;
    mockOfflineQueue.queueStatus.isProcessing = false;
    
    // Reset localStorage mocks
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockImplementation(() => {});
    
    // Reset fetch mock
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Context initialisation', () => {
    it('should provide network context with initial state', () => {
      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      expect(result.current.isInitialised).toBe(true);
      expect(result.current.networkStatus).toEqual(mockNetworkStatus);
      expect(result.current.queueStatus).toEqual(mockOfflineQueue.queueStatus);
      expect(result.current.retryPolicies).toBeDefined();
      expect(result.current.syncConfig).toBeDefined();
    });

    it('should throw error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useNetworkContext());
      }).toThrow('useNetworkContext must be used within a NetworkProvider');
      
      consoleSpy.mockRestore();
    });

    it('should return null with optional hook when used outside provider', () => {
      const { result } = renderHook(() => useNetworkContextOptional());
      expect(result.current).toBeNull();
    });

    it('should initialise with default retry policies', () => {
      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      const policies = result.current.retryPolicies;
      expect(policies.fast).toBeDefined();
      expect(policies.moderate).toBeDefined();
      expect(policies.slow).toBeDefined();
      expect(policies.verySlow).toBeDefined();
      expect(policies.offline).toBeDefined();
      expect(policies.unknown).toBeDefined();
    });

    it('should initialise with default sync configuration', () => {
      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      const syncConfig = result.current.syncConfig;
      expect(syncConfig.enabled).toBe(true);
      expect(syncConfig.syncInterval).toBeGreaterThan(0);
      expect(syncConfig.syncOnConnect).toBe(true);
    });

    it('should load persisted configurations on initialisation', () => {
      const persistedPolicies = {
        fast: {
          strategy: 'linear',
          maxRetries: 2,
          baseDelay: 1000,
          maxDelay: 5000,
          backoffMultiplier: 1.5,
          adaptToNetwork: false,
          requestTimeout: 3000,
        },
      };

      const persistedSyncConfig = {
        enabled: false,
        syncInterval: 60000,
      };

      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'network-retry-policies') {
          return JSON.stringify(persistedPolicies);
        }
        if (key === 'network-sync-config') {
          return JSON.stringify(persistedSyncConfig);
        }
        return null;
      });

      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      expect(result.current.retryPolicies.fast.strategy).toBe('linear');
      expect(result.current.syncConfig.enabled).toBe(false);
    });
  });

  describe('Queue management actions', () => {
    it('should queue request through context with event tracking', () => {
      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      const requestData: Omit<QueuedRequest, 'id' | 'queuedAt' | 'retryCount'> = {
        url: '/api/test',
        method: 'GET',
        maxRetries: 3,
        priority: 1,
        persistent: false,
      };

      act(() => {
        const requestId = result.current.queueRequest(requestData);
        expect(requestId).toBe('mock-request-id');
      });

      expect(mockOfflineQueue.queueRequest).toHaveBeenCalledWith(requestData);
    });

    it('should cancel request through context with event tracking', () => {
      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      act(() => {
        const cancelled = result.current.cancelRequest('test-id');
        expect(cancelled).toBe(true);
      });

      expect(mockOfflineQueue.cancelRequest).toHaveBeenCalledWith('test-id');
    });

    it('should clear queue through context with event tracking', () => {
      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.clearQueue();
      });

      expect(mockOfflineQueue.clearQueue).toHaveBeenCalled();
    });

    it('should trigger sync through context when online', async () => {
      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(mockOfflineQueue.processQueue).toHaveBeenCalled();
    });

    it('should not trigger sync when offline', async () => {
      mockNetworkStatus.isOnline = false;

      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(mockOfflineQueue.processQueue).not.toHaveBeenCalled();
    });

    it('should propagate sync errors', async () => {
      const syncError = new Error('Sync failed');
      mockOfflineQueue.processQueue.mockRejectedValue(syncError);

      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await expect(result.current.triggerSync()).rejects.toThrow('Sync failed');
      });
    });
  });

  describe('Configuration updates', () => {
    it('should update retry policies with persistence', () => {
      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      const newFastPolicy: NetworkRetryPolicy = {
        strategy: 'linear',
        maxRetries: 5,
        baseDelay: 500,
        maxDelay: 5000,
        backoffMultiplier: 1.5,
        adaptToNetwork: false,
        requestTimeout: 3000,
      };

      act(() => {
        result.current.updateRetryPolicies({
          fast: newFastPolicy,
        });
      });

      expect(result.current.retryPolicies.fast).toEqual(newFastPolicy);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'network-retry-policies',
        expect.stringContaining('"strategy":"linear"')
      );
    });

    it('should update sync configuration with persistence', () => {
      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      const newSyncConfig: Partial<BackgroundSyncConfig> = {
        enabled: false,
        syncInterval: 60000,
        showNotifications: true,
      };

      act(() => {
        result.current.updateSyncConfig(newSyncConfig);
      });

      expect(result.current.syncConfig.enabled).toBe(false);
      expect(result.current.syncConfig.syncInterval).toBe(60000);
      expect(result.current.syncConfig.showNotifications).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'network-sync-config',
        expect.stringContaining('"enabled":false')
      );
    });
  });

  describe('Network status integration', () => {
    it('should reflect current network status', () => {
      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      expect(result.current.networkStatus.isOnline).toBe(true);
      expect(result.current.networkStatus.connectionQuality).toBe('fast');
    });

    it('should provide current retry policy based on connection quality', () => {
      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      // Test fast connection
      expect(result.current.getCurrentRetryPolicy()).toEqual(
        result.current.retryPolicies.fast
      );

      // Test slow connection
      act(() => {
        mockNetworkStatus.connectionQuality = 'slow';
        mockNetworkStatus.isSlowConnection = true;
      });

      expect(result.current.getCurrentRetryPolicy()).toEqual(
        result.current.retryPolicies.slow
      );
    });

    it('should handle unknown connection quality', () => {
      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      act(() => {
        mockNetworkStatus.connectionQuality = 'unknown';
      });

      expect(result.current.getCurrentRetryPolicy()).toEqual(
        result.current.retryPolicies.unknown
      );
    });
  });

  describe('Connectivity testing', () => {
    it('should test connectivity successfully', async () => {
      mockFetch.mockResolvedValue(new Response('', { status: 200 }));

      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      let testResult: boolean;
      await act(async () => {
        testResult = await result.current.testConnectivity();
      });

      expect(testResult!).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://httpbin.org/status/200',
        expect.objectContaining({
          method: 'HEAD',
          cache: 'no-cache',
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should handle connectivity test failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      let testResult: boolean;
      await act(async () => {
        testResult = await result.current.testConnectivity();
      });

      expect(testResult!).toBe(false);
    });

    it('should handle HTTP error response', async () => {
      mockFetch.mockResolvedValue(new Response('', { status: 500 }));

      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      let testResult: boolean;
      await act(async () => {
        testResult = await result.current.testConnectivity();
      });

      expect(testResult!).toBe(false);
    });

    it('should prevent concurrent connectivity tests', async () => {
      mockFetch.mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve(new Response('', { status: 200 })), 100)
      ));

      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      let firstResult: boolean;
      let secondResult: boolean;

      await act(async () => {
        const [first, second] = await Promise.all([
          result.current.testConnectivity(),
          result.current.testConnectivity(),
        ]);
        firstResult = first;
        secondResult = second;
      });

      expect(firstResult!).toBe(true);
      expect(secondResult!).toBe(false); // Should return false due to test in progress
    });

    it('should use custom connectivity endpoint', async () => {
      mockFetch.mockResolvedValue(new Response('', { status: 200 }));

      const CustomWrapper = ({ children }: { children: ReactNode }) => (
        <NetworkProvider connectivityTestUrl="/api/health">
          {children}
        </NetworkProvider>
      );

      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: CustomWrapper,
      });

      await act(async () => {
        await result.current.testConnectivity();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/health', expect.anything());
    });

    it('should timeout long-running connectivity tests', async () => {
      // Mock a fetch that never resolves
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      // Mock setTimeout to trigger abort immediately
      const originalSetTimeout = global.setTimeout;
      const mockSetTimeoutFn = vi.fn().mockImplementation((callback: () => void) => {
        callback();
        return 1;
      });
      // Add the __promisify__ property that Node.js setTimeout has
      Object.assign(mockSetTimeoutFn, { __promisify__: vi.fn() });
      global.setTimeout = mockSetTimeoutFn as unknown as typeof setTimeout;

      let testResult: boolean;
      await act(async () => {
        testResult = await result.current.testConnectivity();
      });

      expect(testResult!).toBe(false);
      
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('Error handling', () => {
    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      // Should not throw error during provider initialisation
      expect(() => {
        render(<NetworkProvider>Test</NetworkProvider>);
      }).not.toThrow();
    });

    it('should handle malformed localStorage data', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      // Should not throw error and use default policies
      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      expect(result.current.retryPolicies.fast).toBeDefined();
    });

    it('should handle non-object localStorage data', () => {
      mockLocalStorage.getItem.mockReturnValue('"string value"');

      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      expect(result.current.retryPolicies.fast).toBeDefined();
    });
  });

  describe('Custom configuration', () => {
    it('should accept custom initial retry policies', () => {
      const customPolicies = {
        fast: {
          strategy: 'linear' as const,
          maxRetries: 1,
          baseDelay: 100,
          maxDelay: 1000,
          backoffMultiplier: 1,
          adaptToNetwork: false,
          requestTimeout: 2000,
        },
      };

      const CustomWrapper = ({ children }: { children: ReactNode }) => (
        <NetworkProvider initialRetryPolicies={customPolicies}>
          {children}
        </NetworkProvider>
      );

      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: CustomWrapper,
      });

      expect(result.current.retryPolicies.fast.strategy).toBe('linear');
      expect(result.current.retryPolicies.fast.maxRetries).toBe(1);
    });

    it('should accept custom sync configuration', () => {
      const customSyncConfig = {
        enabled: false,
        syncInterval: 60000,
        showNotifications: true,
      };

      const CustomWrapper = ({ children }: { children: ReactNode }) => (
        <NetworkProvider initialSyncConfig={customSyncConfig}>
          {children}
        </NetworkProvider>
      );

      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: CustomWrapper,
      });

      expect(result.current.syncConfig.enabled).toBe(false);
      expect(result.current.syncConfig.syncInterval).toBe(60000);
      expect(result.current.syncConfig.showNotifications).toBe(true);
    });

    it('should accept debug configuration', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const DebugWrapper = ({ children }: { children: ReactNode }) => (
        <NetworkProvider debug={true}>
          {children}
        </NetworkProvider>
      );

      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: DebugWrapper,
      });

      act(() => {
        result.current.updateRetryPolicies({ fast: result.current.retryPolicies.fast });
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[NetworkProvider]'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Event tracking and persistence', () => {
    it('should track events and persist to localStorage', () => {
      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.updateRetryPolicies({
          fast: result.current.retryPolicies.fast,
        });
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'network-events',
        expect.stringContaining('"type":"retry-policies-updated"')
      );
    });

    it('should limit event history size', () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'network-events') {
          // Return 150 events (more than MAX_EVENT_HISTORY of 100)
          const events = Array.from({ length: 150 }, (_, i) => ({
            type: 'test-event',
            timestamp: Date.now() - i,
            data: { index: i },
          }));
          return JSON.stringify(events);
        }
        return null;
      });

      renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      // Should have called setItem to trim the events to MAX_EVENT_HISTORY
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'network-events',
        expect.stringMatching(/"type":"test-event"/)
      );
    });
  });

  describe('Background sync management', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should schedule background sync when enabled and online', async () => {
      mockOfflineQueue.queueStatus.pendingRequests = 5;

      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      expect(result.current.syncConfig.enabled).toBe(true);

      // Fast-forward time to trigger sync
      act(() => {
        vi.advanceTimersByTime(result.current.syncConfig.syncInterval);
      });

      await waitFor(() => {
        expect(mockOfflineQueue.processQueue).toHaveBeenCalled();
      });
    });

    it('should not schedule background sync when disabled', () => {
      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.updateSyncConfig({ enabled: false });
      });

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(60000);
      });

      expect(mockOfflineQueue.processQueue).not.toHaveBeenCalled();
    });

    it('should not schedule background sync when offline', () => {
      mockNetworkStatus.isOnline = false;

      renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(60000);
      });

      expect(mockOfflineQueue.processQueue).not.toHaveBeenCalled();
    });

    it('should auto-sync when coming online with pending requests', async () => {
      mockOfflineQueue.queueStatus.pendingRequests = 3;

      const { result } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      expect(result.current.syncConfig.syncOnConnect).toBe(true);

      // Fast-forward the 1000ms delay for auto-sync
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockOfflineQueue.processQueue).toHaveBeenCalled();
      });
    });
  });

  describe('Component cleanup', () => {
    it('should clean up timers on unmount', () => {
      vi.useFakeTimers();
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount } = renderHook(() => useNetworkContext(), {
        wrapper: TestWrapper,
      });

      unmount();

      // Cleanup should have been called
      expect(clearTimeoutSpy).toHaveBeenCalled();

      vi.useRealTimers();
      clearTimeoutSpy.mockRestore();
    });
  });
});