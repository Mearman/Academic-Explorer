import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface SearchFilters {
  dateRange?: {
    from?: string;
    to?: string;
  };
  publicationType?: string[];
  openAccess?: boolean;
}

interface AppState {
  // Theme
  theme: 'light' | 'dark' | 'system';
  
  // Search
  searchQuery: string;
  searchFilters: SearchFilters;
  searchHistory: string[];
  
  // User preferences
  preferences: {
    resultsPerPage: number;
    defaultView: 'grid' | 'list';
    showAbstracts: boolean;
  };
  
  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setSearchQuery: (query: string) => void;
  updateSearchFilters: (filters: Partial<SearchFilters>) => void;
  clearSearchFilters: () => void;
  addToSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
  updatePreferences: (prefs: Partial<AppState['preferences']>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    immer((set) => ({
      // Initial state
      theme: 'system',
      searchQuery: '',
      searchFilters: {},
      searchHistory: [],
      preferences: {
        resultsPerPage: 20,
        defaultView: 'grid',
        showAbstracts: true,
      },
      
      // Actions
      setTheme: (theme) =>
        set((state) => {
          state.theme = theme;
        }),
        
      setSearchQuery: (query) =>
        set((state) => {
          state.searchQuery = query;
        }),
        
      updateSearchFilters: (filters) =>
        set((state) => {
          // Use direct property assignment instead of Object.assign for Immer compatibility
          if (filters.dateRange !== undefined) state.searchFilters.dateRange = filters.dateRange;
          if (filters.publicationType !== undefined) state.searchFilters.publicationType = filters.publicationType;
          if (filters.openAccess !== undefined) state.searchFilters.openAccess = filters.openAccess;
        }),
        
      clearSearchFilters: () =>
        set((state) => {
          state.searchFilters = {};
        }),
        
      addToSearchHistory: (query) =>
        set((state) => {
          // Add to history, remove duplicates, keep last 10
          const filtered = state.searchHistory.filter((q) => q !== query);
          state.searchHistory = [query, ...filtered].slice(0, 10);
        }),
        
      clearSearchHistory: () =>
        set((state) => {
          state.searchHistory = [];
        }),
        
      updatePreferences: (prefs) =>
        set((state) => {
          // Use direct property assignment instead of Object.assign for Immer compatibility
          if (prefs.resultsPerPage !== undefined) state.preferences.resultsPerPage = prefs.resultsPerPage;
          if (prefs.defaultView !== undefined) state.preferences.defaultView = prefs.defaultView;
          if (prefs.showAbstracts !== undefined) state.preferences.showAbstracts = prefs.showAbstracts;
        }),
    })),
    {
      name: 'academic-explorer-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        searchHistory: state.searchHistory,
        preferences: state.preferences,
      }),
    }
  )
);