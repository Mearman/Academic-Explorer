/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useNetworkStatus } from './use-network-status';

// Simple test to verify the hook works
describe('useNetworkStatus - Simple', () => {
  it('should return a network status object', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current).toHaveProperty('isOnline');
    expect(result.current).toHaveProperty('isOffline');
    expect(result.current).toHaveProperty('connectionQuality');
    expect(result.current).toHaveProperty('connectionType');
    expect(result.current).toHaveProperty('isSlowConnection');
    expect(result.current).toHaveProperty('downlink');
    expect(result.current).toHaveProperty('rtt');
    expect(result.current).toHaveProperty('saveData');
    expect(result.current).toHaveProperty('lastOnlineTime');
    expect(result.current).toHaveProperty('offlineDuration');
  });

  it('should have boolean values for online status', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(typeof result.current.isOnline).toBe('boolean');
    expect(typeof result.current.isOffline).toBe('boolean');
    expect(result.current.isOnline).toBe(!result.current.isOffline);
  });

  it('should have valid connection quality enum value', () => {
    const { result } = renderHook(() => useNetworkStatus());

    const validQualities = ['fast', 'moderate', 'slow', 'verySlow', 'unknown'];
    expect(validQualities).toContain(result.current.connectionQuality);
  });

  it('should have valid connection type enum value', () => {
    const { result } = renderHook(() => useNetworkStatus());

    const validTypes = ['slow-2g', '2g', '3g', '4g', 'unknown'];
    expect(validTypes).toContain(result.current.connectionType);
  });

  it('should have numeric values for timing and bandwidth', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(typeof result.current.downlink).toBe('number');
    expect(typeof result.current.rtt).toBe('number');
    expect(typeof result.current.lastOnlineTime).toBe('number');
    expect(typeof result.current.offlineDuration).toBe('number');
    
    expect(result.current.downlink).toBeGreaterThanOrEqual(0);
    expect(result.current.rtt).toBeGreaterThanOrEqual(0);
    expect(result.current.lastOnlineTime).toBeGreaterThanOrEqual(0);
    expect(result.current.offlineDuration).toBeGreaterThanOrEqual(0);
  });
});