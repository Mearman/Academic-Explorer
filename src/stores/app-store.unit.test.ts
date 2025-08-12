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
});