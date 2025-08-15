// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStore } from './use-store';
import { useAppStore } from '@/stores/app-store';

// Mock the app store
vi.mock('@/stores/app-store', () => ({
  useAppStore: vi.fn(),
}));

describe('useStore', () => {
  let mockUseAppStore: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked useAppStore
    const { useAppStore } = await import('@/stores/app-store');
    mockUseAppStore = useAppStore;
  });

  describe('Basic functionality', () => {
    it('should call useAppStore with provided selector', () => {
      const mockSelector = vi.fn((state) => state.theme);
      vi.mocked(mockUseAppStore).mockReturnValue('dark');

      const { result } = renderHook(() => useStore(mockSelector));

      expect(mockUseAppStore).toHaveBeenCalledWith(mockSelector);
      expect(result.current).toBe('dark');
    });

    it('should return undefined when store returns undefined', () => {
      const mockSelector = vi.fn((state) => state.theme);
      vi.mocked(mockUseAppStore).mockReturnValue(undefined);

      const { result } = renderHook(() => useStore(mockSelector));

      expect(result.current).toBeUndefined();
    });

    it('should work with complex selectors', () => {
      const mockSelector = vi.fn((state) => ({
        query: state.searchQuery,
        filters: state.searchFilters,
      }));
      
      const expectedResult = {
        query: 'test query',
        filters: { openAccess: true },
      };

      vi.mocked(mockUseAppStore).mockReturnValue(expectedResult);

      const { result } = renderHook(() => useStore(mockSelector));

      expect(result.current).toEqual(expectedResult);
    });

    it('should work with primitive value selectors', () => {
      const mockSelector = vi.fn((state) => state.preferences.resultsPerPage);
      vi.mocked(mockUseAppStore).mockReturnValue(50);

      const { result } = renderHook(() => useStore(mockSelector));

      expect(result.current).toBe(50);
    });

    it('should work with array selectors', () => {
      const mockSelector = vi.fn((state) => state.searchHistory);
      const mockHistory = ['query1', 'query2', 'query3'];
      
      vi.mocked(mockUseAppStore).mockReturnValue(mockHistory);

      const { result } = renderHook(() => useStore(mockSelector));

      expect(result.current).toEqual(mockHistory);
    });
  });

  describe('Reactivity', () => {
    it('should update when store value changes', () => {
      const mockSelector = vi.fn((state) => state.theme);
      
      // Initially return 'light'
      vi.mocked(mockUseAppStore).mockReturnValue('light');

      const { result, rerender } = renderHook(() => useStore(mockSelector));

      expect(result.current).toBe('light');

      // Change store value
      vi.mocked(mockUseAppStore).mockReturnValue('dark');

      rerender();

      expect(result.current).toBe('dark');
    });
  });

  describe('Type safety', () => {
    it('should preserve selector return type', () => {
      // Test with string selector
      const stringSelector = vi.fn((state) => state.theme);
      vi.mocked(mockUseAppStore).mockReturnValue('dark');

      const { result } = renderHook(() => useStore(stringSelector));

      expect(typeof result.current).toBe('string');

      // Test with object selector
      const objectSelector = vi.fn((state) => state.preferences);
      const mockPreferences = {
        resultsPerPage: 20,
        defaultView: 'grid' as const,
        showAbstracts: true,
      };
      vi.mocked(mockUseAppStore).mockReturnValue(mockPreferences);

      const { result: objectResult } = renderHook(() => 
        useStore(objectSelector)
      );

      expect(typeof objectResult.current).toBe('object');
      expect(objectResult.current).toEqual(mockPreferences);
    });
  });

  describe('Edge cases', () => {
    it('should handle selector that returns null', () => {
      const mockSelector = vi.fn(() => null);
      vi.mocked(mockUseAppStore).mockReturnValue(null);

      const { result } = renderHook(() => useStore(mockSelector));

      expect(result.current).toBeNull();
    });

    it('should handle selector that throws an error', () => {
      const mockSelector = vi.fn(() => {
        throw new Error('Selector error');
      });
      
      vi.mocked(mockUseAppStore).mockImplementation((selector) => {
        return selector({});
      });

      expect(() => {
        renderHook(() => useStore(mockSelector));
      }).toThrow('Selector error');
    });

    it('should work with empty object selector', () => {
      const mockSelector = vi.fn(() => ({}));
      vi.mocked(mockUseAppStore).mockReturnValue({});

      const { result } = renderHook(() => useStore(mockSelector));

      expect(result.current).toEqual({});
    });
  });

  describe('Return values', () => {
    it('should return all expected functions and values', () => {
      const mockSelector = vi.fn((state) => state.theme);
      vi.mocked(mockUseAppStore).mockReturnValue('light');

      const { result } = renderHook(() => useStore(mockSelector));

      expect(result.current).toBeDefined();
      expect(typeof result.current).toBe('string');
    });
  });
});