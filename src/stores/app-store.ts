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
          Object.assign(state.searchFilters, filters);
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
          Object.assign(state.preferences, prefs);
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