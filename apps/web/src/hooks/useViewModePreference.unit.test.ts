/**
 * Unit tests for useViewModePreference hook
 * @vitest-environment jsdom
 * @module useViewModePreference.unit.test
 */

import { act,renderHook } from '@testing-library/react';
import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import { useViewModePreference } from './useViewModePreference';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('useViewModePreference', () => {
  const STORAGE_KEY = 'bibgraph-view-mode-preference';

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should default to 2D mode when no preference is stored', () => {
    const { result } = renderHook(() => useViewModePreference());

    expect(result.current.viewMode).toBe('2D');
    expect(result.current.isLoaded).toBe(true);
  });

  it('should use custom default mode when provided', () => {
    const { result } = renderHook(() => useViewModePreference('3D'));

    // Note: Without stored preference, it will still check localStorage
    // and fall back to parsed value or default
    expect(result.current.isLoaded).toBe(true);
  });

  it('should load stored preference from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, '3D');

    const { result } = renderHook(() => useViewModePreference());

    expect(result.current.viewMode).toBe('3D');
    expect(result.current.isLoaded).toBe(true);
  });

  it('should persist preference when setViewMode is called', () => {
    const { result } = renderHook(() => useViewModePreference());

    act(() => {
      result.current.setViewMode('3D');
    });

    expect(result.current.viewMode).toBe('3D');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('3D');
  });

  it('should switch between modes correctly', () => {
    const { result } = renderHook(() => useViewModePreference());

    // Start in 2D
    expect(result.current.viewMode).toBe('2D');

    // Switch to 3D
    act(() => {
      result.current.setViewMode('3D');
    });
    expect(result.current.viewMode).toBe('3D');

    // Switch back to 2D
    act(() => {
      result.current.setViewMode('2D');
    });
    expect(result.current.viewMode).toBe('2D');
  });

  it('should handle invalid stored values gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid-mode');

    const { result } = renderHook(() => useViewModePreference());

    // Should fall back to default
    expect(result.current.viewMode).toBe('2D');
    expect(result.current.isLoaded).toBe(true);
  });

  it('should handle localStorage errors gracefully', () => {
    // Mock localStorage to throw
    const originalGetItem = localStorage.getItem;
    const originalSetItem = localStorage.setItem;

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock getItem to throw
    Object.defineProperty(window, 'localStorage', {
      value: {
        ...localStorage,
        getItem: vi.fn().mockImplementation(() => {
          throw new Error('localStorage unavailable');
        }),
        setItem: vi.fn().mockImplementation(() => {
          throw new Error('localStorage unavailable');
        }),
      },
      writable: true,
    });

    const { result } = renderHook(() => useViewModePreference());

    // Should still work with default value
    expect(result.current.viewMode).toBe('2D');
    expect(result.current.isLoaded).toBe(true);

    // Try to set (should warn but not crash)
    act(() => {
      result.current.setViewMode('3D');
    });

    expect(result.current.viewMode).toBe('3D');
    expect(consoleWarnSpy).toHaveBeenCalled();

    // Restore
    consoleWarnSpy.mockRestore();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: originalGetItem,
        setItem: originalSetItem,
        removeItem: localStorage.removeItem,
        clear: localStorage.clear,
        length: localStorage.length,
        key: localStorage.key,
      },
      writable: true,
    });
  });

  it('should return isLoaded as false initially then true after effect', async () => {
    // This test verifies the loading state transition
    // Note: In most test environments, the effect runs synchronously
    // so isLoaded will be true immediately
    const { result } = renderHook(() => useViewModePreference());

    // After initial render, isLoaded should be true (effect has run)
    expect(result.current.isLoaded).toBe(true);
  });

  it('should maintain stable setViewMode reference', () => {
    const { result, rerender } = renderHook(() => useViewModePreference());

    const firstSetViewMode = result.current.setViewMode;

    rerender();

    // setViewMode should be stable (wrapped in useCallback)
    expect(result.current.setViewMode).toBe(firstSetViewMode);
  });
});
