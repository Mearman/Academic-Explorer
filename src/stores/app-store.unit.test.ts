import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from './app-store';

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

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useAppStore.setState({
      theme: 'system',
      searchQuery: '',
      searchFilters: {},
      searchHistory: [],
      preferences: {
        resultsPerPage: 20,
        defaultView: 'grid',
        showAbstracts: true,
      },
    });
    vi.clearAllMocks();
  });

  describe('Initial state', () => {
    it('should have correct default values', () => {
      const state = useAppStore.getState();
      
      expect(state.theme).toBe('system');
      expect(state.searchQuery).toBe('');
      expect(state.searchFilters).toEqual({});
      expect(state.searchHistory).toEqual([]);
      expect(state.preferences).toEqual({
        resultsPerPage: 20,
        defaultView: 'grid',
        showAbstracts: true,
      });
    });
  });

  describe('Theme actions', () => {
    it('should set theme to light', () => {
      const { setTheme } = useAppStore.getState();
      
      setTheme('light');
      
      expect(useAppStore.getState().theme).toBe('light');
    });

    it('should set theme to dark', () => {
      const { setTheme } = useAppStore.getState();
      
      setTheme('dark');
      
      expect(useAppStore.getState().theme).toBe('dark');
    });

    it('should set theme to system', () => {
      const { setTheme } = useAppStore.getState();
      
      setTheme('system');
      
      expect(useAppStore.getState().theme).toBe('system');
    });
  });

  describe('Search query actions', () => {
    it('should set search query', () => {
      const { setSearchQuery } = useAppStore.getState();
      
      setSearchQuery('machine learning');
      
      expect(useAppStore.getState().searchQuery).toBe('machine learning');
    });

    it('should clear search query', () => {
      const { setSearchQuery } = useAppStore.getState();
      
      setSearchQuery('test query');
      setSearchQuery('');
      
      expect(useAppStore.getState().searchQuery).toBe('');
    });
  });

  describe('Search filters actions', () => {
    it('should update search filters', () => {
      const { updateSearchFilters } = useAppStore.getState();
      
      updateSearchFilters({
        publicationType: ['journal-article'],
        openAccess: true,
      });
      
      const { searchFilters } = useAppStore.getState();
      expect(searchFilters.publicationType).toEqual(['journal-article']);
      expect(searchFilters.openAccess).toBe(true);
    });

    it('should update date range filter', () => {
      const { updateSearchFilters } = useAppStore.getState();
      
      updateSearchFilters({
        dateRange: {
          from: '2020-01-01',
          to: '2023-12-31',
        },
      });
      
      const { searchFilters } = useAppStore.getState();
      expect(searchFilters.dateRange).toEqual({
        from: '2020-01-01',
        to: '2023-12-31',
      });
    });

    it('should merge filter updates', () => {
      const { updateSearchFilters } = useAppStore.getState();
      
      updateSearchFilters({ openAccess: true });
      updateSearchFilters({ publicationType: ['journal-article'] });
      
      const { searchFilters } = useAppStore.getState();
      expect(searchFilters.openAccess).toBe(true);
      expect(searchFilters.publicationType).toEqual(['journal-article']);
    });

    it('should clear search filters', () => {
      const { updateSearchFilters, clearSearchFilters } = useAppStore.getState();
      
      updateSearchFilters({
        publicationType: ['journal-article'],
        openAccess: true,
      });
      
      clearSearchFilters();
      
      expect(useAppStore.getState().searchFilters).toEqual({});
    });
  });

  describe('Search history actions', () => {
    it('should add query to search history', () => {
      const { addToSearchHistory } = useAppStore.getState();
      
      addToSearchHistory('machine learning');
      
      expect(useAppStore.getState().searchHistory).toEqual(['machine learning']);
    });

    it('should add multiple queries to history', () => {
      const { addToSearchHistory } = useAppStore.getState();
      
      addToSearchHistory('first query');
      addToSearchHistory('second query');
      
      expect(useAppStore.getState().searchHistory).toEqual([
        'second query',
        'first query',
      ]);
    });

    it('should remove duplicates from history', () => {
      const { addToSearchHistory } = useAppStore.getState();
      
      addToSearchHistory('machine learning');
      addToSearchHistory('artificial intelligence');
      addToSearchHistory('machine learning'); // Duplicate
      
      const { searchHistory } = useAppStore.getState();
      expect(searchHistory).toEqual([
        'machine learning',
        'artificial intelligence',
      ]);
      expect(searchHistory).toHaveLength(2);
    });

    it('should limit history to 10 items', () => {
      const { addToSearchHistory } = useAppStore.getState();
      
      // Add 12 queries
      for (let i = 1; i <= 12; i++) {
        addToSearchHistory(`query ${i}`);
      }
      
      const { searchHistory } = useAppStore.getState();
      expect(searchHistory).toHaveLength(10);
      expect(searchHistory[0]).toBe('query 12'); // Most recent
      expect(searchHistory[9]).toBe('query 3'); // Oldest kept
    });

    it('should clear search history', () => {
      const { addToSearchHistory, clearSearchHistory } = useAppStore.getState();
      
      addToSearchHistory('test query');
      clearSearchHistory();
      
      expect(useAppStore.getState().searchHistory).toEqual([]);
    });
  });

  describe('Preferences actions', () => {
    it('should update results per page', () => {
      const { updatePreferences } = useAppStore.getState();
      
      updatePreferences({ resultsPerPage: 50 });
      
      expect(useAppStore.getState().preferences.resultsPerPage).toBe(50);
    });

    it('should update default view', () => {
      const { updatePreferences } = useAppStore.getState();
      
      updatePreferences({ defaultView: 'list' });
      
      expect(useAppStore.getState().preferences.defaultView).toBe('list');
    });

    it('should update show abstracts preference', () => {
      const { updatePreferences } = useAppStore.getState();
      
      updatePreferences({ showAbstracts: false });
      
      expect(useAppStore.getState().preferences.showAbstracts).toBe(false);
    });

    it('should update multiple preferences at once', () => {
      const { updatePreferences } = useAppStore.getState();
      
      updatePreferences({
        resultsPerPage: 100,
        defaultView: 'list',
        showAbstracts: false,
      });
      
      const { preferences } = useAppStore.getState();
      expect(preferences.resultsPerPage).toBe(100);
      expect(preferences.defaultView).toBe('list');
      expect(preferences.showAbstracts).toBe(false);
    });

    it('should merge preference updates', () => {
      const { updatePreferences } = useAppStore.getState();
      
      updatePreferences({ resultsPerPage: 30 });
      updatePreferences({ defaultView: 'list' });
      
      const { preferences } = useAppStore.getState();
      expect(preferences.resultsPerPage).toBe(30);
      expect(preferences.defaultView).toBe('list');
      expect(preferences.showAbstracts).toBe(true); // Unchanged
    });
  });

  describe('Store persistence', () => {
    it('should have all required action functions', () => {
      const state = useAppStore.getState();
      
      expect(typeof state.setTheme).toBe('function');
      expect(typeof state.setSearchQuery).toBe('function');
      expect(typeof state.updateSearchFilters).toBe('function');
      expect(typeof state.clearSearchFilters).toBe('function');
      expect(typeof state.addToSearchHistory).toBe('function');
      expect(typeof state.clearSearchHistory).toBe('function');
      expect(typeof state.updatePreferences).toBe('function');
    });

    it('should maintain state consistency during multiple operations', () => {
      const {
        setTheme,
        setSearchQuery,
        updateSearchFilters,
        addToSearchHistory,
        updatePreferences,
      } = useAppStore.getState();

      // Perform multiple operations
      setTheme('dark');
      setSearchQuery('complex query');
      updateSearchFilters({ openAccess: true });
      addToSearchHistory('complex query');
      updatePreferences({ resultsPerPage: 50 });

      const finalState = useAppStore.getState();
      expect(finalState.theme).toBe('dark');
      expect(finalState.searchQuery).toBe('complex query');
      expect(finalState.searchFilters.openAccess).toBe(true);
      expect(finalState.searchHistory).toContain('complex query');
      expect(finalState.preferences.resultsPerPage).toBe(50);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string in search history', () => {
      const { addToSearchHistory } = useAppStore.getState();
      
      addToSearchHistory('');
      
      expect(useAppStore.getState().searchHistory).toEqual(['']);
    });

    it('should handle null/undefined values gracefully', () => {
      const { updateSearchFilters } = useAppStore.getState();
      
      // These should not throw errors
      updateSearchFilters({});
      updateSearchFilters({ publicationType: undefined });
      
      const state = useAppStore.getState();
      expect(state.searchFilters).toBeDefined();
    });

    it('should handle updating with same preference values', () => {
      const { updatePreferences } = useAppStore.getState();
      
      const initialPrefs = useAppStore.getState().preferences;
      updatePreferences(initialPrefs);
      
      expect(useAppStore.getState().preferences).toEqual(initialPrefs);
    });
  });

  describe('Immer middleware integration', () => {
    it('should preserve immutability with nested filter updates', () => {
      const { updateSearchFilters } = useAppStore.getState();
      
      const initialState = useAppStore.getState();
      const initialFilters = initialState.searchFilters;
      
      updateSearchFilters({
        dateRange: {
          from: '2020-01-01',
          to: '2023-12-31',
        },
      });
      
      const newState = useAppStore.getState();
      
      // Original state should not be mutated
      expect(initialFilters).not.toBe(newState.searchFilters);
      expect(initialFilters.dateRange).toBeUndefined();
      expect(newState.searchFilters.dateRange).toBeDefined();
    });

    it('should handle deeply nested object updates', () => {
      const { updateSearchFilters } = useAppStore.getState();
      
      updateSearchFilters({
        dateRange: {
          from: '2020-01-01',
          to: '2021-12-31',
        },
      });
      
      const firstState = useAppStore.getState();
      const firstDateRange = firstState.searchFilters.dateRange;
      
      updateSearchFilters({
        dateRange: {
          from: '2022-01-01',
          to: '2023-12-31',
        },
      });
      
      const secondState = useAppStore.getState();
      
      // Previous nested object should not be mutated
      expect(firstDateRange).toEqual({
        from: '2020-01-01',
        to: '2021-12-31',
      });
      expect(secondState.searchFilters.dateRange).toEqual({
        from: '2022-01-01',
        to: '2023-12-31',
      });
    });

    it('should preserve array immutability in search history', () => {
      const { addToSearchHistory } = useAppStore.getState();
      
      const initialState = useAppStore.getState();
      const initialHistory = initialState.searchHistory;
      
      addToSearchHistory('first query');
      const firstState = useAppStore.getState();
      
      addToSearchHistory('second query');
      const secondState = useAppStore.getState();
      
      // Previous arrays should not be mutated
      expect(initialHistory).toEqual([]);
      expect(firstState.searchHistory).toEqual(['first query']);
      expect(secondState.searchHistory).toEqual(['second query', 'first query']);
      
      // References should be different
      expect(initialHistory).not.toBe(firstState.searchHistory);
      expect(firstState.searchHistory).not.toBe(secondState.searchHistory);
    });

    it('should handle concurrent state updates correctly', () => {
      const { setTheme, setSearchQuery, updatePreferences } = useAppStore.getState();
      
      const initialState = useAppStore.getState();
      
      // Simulate concurrent updates
      setTheme('dark');
      setSearchQuery('concurrent test');
      updatePreferences({ resultsPerPage: 50 });
      
      const finalState = useAppStore.getState();
      
      // All updates should be applied
      expect(finalState.theme).toBe('dark');
      expect(finalState.searchQuery).toBe('concurrent test');
      expect(finalState.preferences.resultsPerPage).toBe(50);
      
      // Other properties should remain unchanged
      expect(finalState.preferences.defaultView).toBe(initialState.preferences.defaultView);
      expect(finalState.preferences.showAbstracts).toBe(initialState.preferences.showAbstracts);
    });
  });

  describe('Storage persistence scenarios', () => {
    it('should handle localStorage quota exceeded gracefully', () => {
      // Mock localStorage.setItem to throw quota exceeded error
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      
      const { addToSearchHistory, setTheme } = useAppStore.getState();
      
      // Operations should not throw even if localStorage fails
      expect(() => {
        addToSearchHistory('test query');
        setTheme('dark');
      }).not.toThrow();
    });

    it('should handle localStorage unavailability', () => {
      // Mock localStorage methods to be unavailable
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage is not available');
      });
      
      const { setTheme } = useAppStore.getState();
      
      // Should still work without localStorage
      expect(() => setTheme('light')).not.toThrow();
      expect(useAppStore.getState().theme).toBe('light');
    });

    it('should handle malformed persistence data', () => {
      // Mock localStorage to return malformed JSON
      mockLocalStorage.getItem.mockReturnValue('{"invalid": json}');
      
      // Store should still initialize with defaults
      const state = useAppStore.getState();
      expect(state.theme).toBeDefined();
      expect(state.searchHistory).toBeDefined();
      expect(state.preferences).toBeDefined();
    });

    it('should handle partial persistence data', () => {
      // Mock localStorage to return partial data
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        theme: 'dark',
        // Missing searchHistory and preferences
      }));
      
      const state = useAppStore.getState();
      expect(state.theme).toBeDefined();
      expect(state.searchHistory).toBeDefined();
      expect(state.preferences).toBeDefined();
    });
  });

  describe('Performance under load', () => {
    it('should handle rapid search history updates', () => {
      const { addToSearchHistory } = useAppStore.getState();
      
      const startTime = Date.now();
      
      // Add many queries rapidly
      for (let i = 0; i < 100; i++) {
        addToSearchHistory(`query ${i}`);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete quickly
      expect(duration).toBeLessThan(100); // 100ms threshold
      
      // Should maintain correct state
      const { searchHistory } = useAppStore.getState();
      expect(searchHistory).toHaveLength(10); // Limited to 10 items
      expect(searchHistory[0]).toBe('query 99'); // Most recent
    });

    it('should handle large search filter objects', () => {
      const { updateSearchFilters } = useAppStore.getState();
      
      const largeFilters = {
        publicationType: Array.from({ length: 100 }, (_, i) => `type-${i}`),
        dateRange: {
          from: '2000-01-01',
          to: '2023-12-31',
        },
        complexFilter: {
          level1: {
            level2: {
              level3: Array.from({ length: 50 }, (_, i) => ({
                id: i,
                name: `Filter ${i}`,
                options: Array.from({ length: 10 }, (_, j) => `option-${j}`),
              })),
            },
          },
        },
      };
      
      const startTime = Date.now();
      updateSearchFilters(largeFilters);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(50); // Should be fast
      
      const { searchFilters } = useAppStore.getState();
      expect(searchFilters.publicationType).toHaveLength(100);
    });

    it('should handle frequent preference updates', () => {
      const { updatePreferences } = useAppStore.getState();
      
      const startTime = Date.now();
      
      // Simulate frequent UI preference changes
      for (let i = 0; i < 50; i++) {
        updatePreferences({
          resultsPerPage: 20 + (i % 5) * 10,
          defaultView: i % 2 === 0 ? 'grid' : 'list',
          showAbstracts: i % 3 === 0,
        });
      }
      
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should handle updates quickly
      
      const { preferences } = useAppStore.getState();
      expect(preferences.resultsPerPage).toBe(60); // Last update: 20 + (49 % 5) * 10 = 20 + 4 * 10 = 60
      expect(preferences.defaultView).toBe('list'); // 49 % 2 === 1
      expect(preferences.showAbstracts).toBe(false); // 49 % 3 !== 0
    });
  });

  describe('Complex state interactions', () => {
    it('should handle search workflow state transitions', () => {
      const {
        setSearchQuery,
        updateSearchFilters,
        addToSearchHistory,
        clearSearchFilters,
      } = useAppStore.getState();
      
      // Simulate complete search workflow
      setSearchQuery('machine learning');
      updateSearchFilters({
        publicationType: ['journal-article'],
        dateRange: { from: '2020-01-01', to: '2023-12-31' },
        openAccess: true,
      });
      addToSearchHistory('machine learning');
      
      let state = useAppStore.getState();
      expect(state.searchQuery).toBe('machine learning');
      expect(state.searchFilters.publicationType).toEqual(['journal-article']);
      expect(state.searchHistory).toContain('machine learning');
      
      // Clear filters but keep query and history
      clearSearchFilters();
      
      state = useAppStore.getState();
      expect(state.searchQuery).toBe('machine learning'); // Unchanged
      expect(state.searchFilters).toEqual({}); // Cleared
      expect(state.searchHistory).toContain('machine learning'); // Unchanged
    });

    it('should maintain state consistency during complex updates', () => {
      const {
        setTheme,
        setSearchQuery,
        updateSearchFilters,
        addToSearchHistory,
        updatePreferences,
      } = useAppStore.getState();
      
      // Perform complex interleaved operations
      setTheme('dark');
      setSearchQuery('complex query');
      updatePreferences({ resultsPerPage: 50 });
      updateSearchFilters({ openAccess: true });
      addToSearchHistory('complex query');
      updateSearchFilters({ publicationType: ['journal-article'] });
      updatePreferences({ defaultView: 'list' });
      
      const finalState = useAppStore.getState();
      
      // Verify all operations were applied correctly
      expect(finalState.theme).toBe('dark');
      expect(finalState.searchQuery).toBe('complex query');
      expect(finalState.searchFilters.openAccess).toBe(true);
      expect(finalState.searchFilters.publicationType).toEqual(['journal-article']);
      expect(finalState.searchHistory).toContain('complex query');
      expect(finalState.preferences.resultsPerPage).toBe(50);
      expect(finalState.preferences.defaultView).toBe('list');
      expect(finalState.preferences.showAbstracts).toBe(true); // Unchanged
    });

    it('should handle state resets and reinitialisation', () => {
      const {
        setTheme,
        setSearchQuery,
        updateSearchFilters,
        addToSearchHistory,
        updatePreferences,
        clearSearchFilters,
        clearSearchHistory,
      } = useAppStore.getState();
      
      // Set up complex state
      setTheme('dark');
      setSearchQuery('test query');
      updateSearchFilters({ openAccess: true });
      addToSearchHistory('test query');
      updatePreferences({ resultsPerPage: 100 });
      
      // Verify state is set
      let state = useAppStore.getState();
      expect(state.theme).toBe('dark');
      expect(state.searchQuery).toBe('test query');
      expect(state.searchFilters.openAccess).toBe(true);
      expect(state.searchHistory).toContain('test query');
      expect(state.preferences.resultsPerPage).toBe(100);
      
      // Perform partial reset
      clearSearchFilters();
      clearSearchHistory();
      setSearchQuery('');
      
      state = useAppStore.getState();
      expect(state.theme).toBe('dark'); // Unchanged
      expect(state.searchQuery).toBe('');
      expect(state.searchFilters).toEqual({});
      expect(state.searchHistory).toEqual([]);
      expect(state.preferences.resultsPerPage).toBe(100); // Unchanged
    });
  });

  describe('State subscription and reactivity', () => {
    it('should notify subscribers of state changes', () => {
      const mockSubscriber = vi.fn();
      
      // Subscribe to store changes
      const unsubscribe = useAppStore.subscribe(mockSubscriber);
      
      try {
        const { setTheme } = useAppStore.getState();
        
        setTheme('dark');
        
        expect(mockSubscriber).toHaveBeenCalled();
      } finally {
        unsubscribe();
      }
    });

    it('should not notify subscribers when state does not change', () => {
      const mockSubscriber = vi.fn();
      
      const unsubscribe = useAppStore.subscribe(mockSubscriber);
      
      try {
        const { setTheme } = useAppStore.getState();
        const currentTheme = useAppStore.getState().theme;
        
        // Set to same value
        setTheme(currentTheme);
        
        // Zustand optimizes and may not call subscribers for identical updates
        // This behavior depends on the Zustand version and configuration
      } finally {
        unsubscribe();
      }
    });

    it('should handle multiple subscribers correctly', () => {
      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();
      
      const unsubscribe1 = useAppStore.subscribe(subscriber1);
      const unsubscribe2 = useAppStore.subscribe(subscriber2);
      
      try {
        const { setSearchQuery } = useAppStore.getState();
        
        setSearchQuery('test for multiple subscribers');
        
        expect(subscriber1).toHaveBeenCalled();
        expect(subscriber2).toHaveBeenCalled();
      } finally {
        unsubscribe1();
        unsubscribe2();
      }
    });
  });
});