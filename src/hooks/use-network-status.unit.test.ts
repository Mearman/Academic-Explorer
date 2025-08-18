/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useNetworkStatus } from './use-network-status';
import type { NetworkConnectionType, NetworkStatus } from '@/types/network';

// Mock navigator.connection
const mockConnection = {
  effectiveType: '4g' as NetworkConnectionType,
  downlink: 10,
  rtt: 100,
  saveData: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

const mockNavigator = {
  onLine: true,
  connection: mockConnection,
};

// Mock performance.now for consistent timing
const mockPerformance = {
  now: vi.fn(() => 1000),
};

describe('useNetworkStatus', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock browser APIs
    Object.defineProperty(window, 'navigator', {
      value: mockNavigator,
      writable: true,
    });
    
    Object.defineProperty(window, 'performance', {
      value: mockPerformance,
      writable: true,
    });

    // Mock addEventListener/removeEventListener
    const mockAddEventListener = vi.fn();
    const mockRemoveEventListener = vi.fn();
    
    Object.defineProperty(window, 'addEventListener', {
      value: mockAddEventListener,
      writable: true,
    });
    
    Object.defineProperty(window, 'removeEventListener', {
      value: mockRemoveEventListener,
      writable: true,
    });

    // Reset connection state
    mockNavigator.onLine = true;
    mockConnection.effectiveType = '4g';
    mockConnection.downlink = 10;
    mockConnection.rtt = 100;
    mockConnection.saveData = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic network status detection', () => {
    it('should return online status when navigator.onLine is true', () => {
      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isOnline).toBe(true);
      expect(result.current.isOffline).toBe(false);
    });

    it('should return offline status when navigator.onLine is false', () => {
      mockNavigator.onLine = false;
      
      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isOnline).toBe(false);
      expect(result.current.isOffline).toBe(true);
    });

    it('should detect connection type from navigator.connection', () => {
      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.connectionType).toBe('4g');
      expect(result.current.effectiveConnectionType).toBe('4g');
    });

    it('should handle missing navigator.connection gracefully', () => {
      // @ts-expect-error - Testing undefined connection
      mockNavigator.connection = undefined;
      
      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.connectionType).toBe('unknown');
      expect(result.current.effectiveConnectionType).toBe('unknown');
    });
  });

  describe('Connection quality assessment', () => {
    it('should classify fast connection (4g, high bandwidth)', () => {
      mockConnection.effectiveType = '4g';
      mockConnection.downlink = 15;
      mockConnection.rtt = 50;
      
      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.connectionQuality).toBe('fast');
      expect(result.current.isSlowConnection).toBe(false);
    });

    it('should classify slow connection (3g, low bandwidth)', () => {
      mockConnection.effectiveType = '3g';
      mockConnection.downlink = 0.5;
      mockConnection.rtt = 500;
      
      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.connectionQuality).toBe('slow');
      expect(result.current.isSlowConnection).toBe(true);
    });

    it('should classify very slow connection (2g, very low bandwidth)', () => {
      mockConnection.effectiveType = '2g';
      mockConnection.downlink = 0.1;
      mockConnection.rtt = 1000;
      
      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.connectionQuality).toBe('verySlow');
      expect(result.current.isSlowConnection).toBe(true);
    });

    it('should handle save data mode', () => {
      mockConnection.saveData = true;
      
      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.saveData).toBe(true);
    });
  });

  describe('Network change detection', () => {
    it('should register event listeners for network status changes', () => {
      renderHook(() => useNetworkStatus());

      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
      expect(mockConnection.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should update status when going offline', () => {
      const { result } = renderHook(() => useNetworkStatus());
      
      expect(result.current.isOnline).toBe(true);

      // Simulate offline event
      act(() => {
        mockNavigator.onLine = false;
        const offlineEvent = new Event('offline');
        window.dispatchEvent(offlineEvent);
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.isOffline).toBe(true);
    });

    it('should update status when coming back online', () => {
      mockNavigator.onLine = false;
      const { result } = renderHook(() => useNetworkStatus());
      
      expect(result.current.isOnline).toBe(false);

      // Simulate online event
      act(() => {
        mockNavigator.onLine = true;
        const onlineEvent = new Event('online');
        window.dispatchEvent(onlineEvent);
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.isOffline).toBe(false);
    });

    it('should update connection info when connection changes', () => {
      const { result } = renderHook(() => useNetworkStatus());
      
      expect(result.current.connectionType).toBe('4g');

      // Simulate connection change
      act(() => {
        mockConnection.effectiveType = '3g';
        mockConnection.downlink = 1;
        mockConnection.rtt = 300;
        const changeEvent = new Event('change');
        // Simulate the connection change event handler
        const handler = mockConnection.addEventListener.mock.calls.find(
          call => call[0] === 'change'
        )?.[1];
        if (handler) handler(changeEvent);
      });

      expect(result.current.connectionType).toBe('3g');
      expect(result.current.connectionQuality).toBe('slow');
    });
  });

  describe('Connection timing measurements', () => {
    it('should track last online time', () => {
      mockPerformance.now.mockReturnValue(5000);
      
      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.lastOnlineTime).toBe(5000);
    });

    it('should update last online time when coming back online', () => {
      mockNavigator.onLine = false;
      const { result } = renderHook(() => useNetworkStatus());
      
      // Simulate going online
      act(() => {
        mockPerformance.now.mockReturnValue(10000);
        mockNavigator.onLine = true;
        const onlineEvent = new Event('online');
        window.dispatchEvent(onlineEvent);
      });

      expect(result.current.lastOnlineTime).toBe(10000);
    });

    it('should track offline duration', () => {
      mockPerformance.now.mockReturnValue(1000);
      const { result } = renderHook(() => useNetworkStatus());
      
      // Go offline
      act(() => {
        mockNavigator.onLine = false;
        mockPerformance.now.mockReturnValue(2000);
        const offlineEvent = new Event('offline');
        window.dispatchEvent(offlineEvent);
      });

      // Come back online after some time
      act(() => {
        mockNavigator.onLine = true;
        mockPerformance.now.mockReturnValue(5000);
        const onlineEvent = new Event('online');
        window.dispatchEvent(onlineEvent);
      });

      expect(result.current.offlineDuration).toBe(3000); // 5000 - 2000
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const { unmount } = renderHook(() => useNetworkStatus());

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
      expect(mockConnection.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined performance.now gracefully', () => {
      // @ts-expect-error - Testing undefined performance
      window.performance = undefined;
      
      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.lastOnlineTime).toBe(0);
    });

    it('should handle browsers without Network Information API', () => {
      // @ts-expect-error - Testing undefined connection
      mockNavigator.connection = undefined;
      
      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.connectionType).toBe('unknown');
      expect(result.current.connectionQuality).toBe('unknown');
      expect(result.current.saveData).toBe(false);
    });

    it('should provide fallback values for missing connection properties', () => {
      mockNavigator.connection = {
        effectiveType: '4g',
        downlink: undefined,
        rtt: undefined, 
        saveData: undefined,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any;
      
      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.downlink).toBe(0);
      expect(result.current.rtt).toBe(0);
      expect(result.current.saveData).toBe(false);
    });
  });
});