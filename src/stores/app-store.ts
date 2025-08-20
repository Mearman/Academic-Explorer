import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type { WorksParams } from '@/lib/openalex/types';
import { generateQuerySignature, isPageNavigation } from '@/lib/utils/query-comparison';

interface SearchFilters {
  dateRange?: {
    from?: string;
    to?: string;
  };
  publicationType?: string[];
  openAccess?: boolean;
}

interface QueryRecord {
  id: string;
  timestamp: string;
  query: string;
  params: WorksParams;
  results?: {
    count: number;
    responseTimeMs: number;
    firstResult?: {
      id: string;
      title: string;
    };
  };
  error?: string;
  
  // Hierarchical grouping fields
  parentQueryId?: string;        // Links page navigations to their parent query
  pageNavigations?: QueryRecord[]; // Array of child page navigation records
  isPageNavigation?: boolean;    // Flag to identify page navigation vs new query
  querySignature?: string;       // Unique signature based on core search parameters
}

interface RecordQueryParams {
  query: string;
  params: WorksParams;
}

interface UpdateQueryResultsParams {
  queryId: string;
  results: QueryRecord['results'];
}

interface UpdateQueryErrorParams {
  queryId: string;
  error: string;
}

interface AppState {
  // Theme
  theme: 'light' | 'dark' | 'system';
  
  // Search
  searchQuery: string;
  searchFilters: SearchFilters;
  searchHistory: string[];
  
  // Query Recording
  queryHistory: QueryRecord[];
  
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
  
  // Query Recording Actions
  recordQuery: (params: RecordQueryParams) => string;
  updateQueryResults: (params: UpdateQueryResultsParams) => void;
  updateQueryError: (params: UpdateQueryErrorParams) => void;
  clearQueryHistory: () => void;
  getQueryHistory: () => QueryRecord[];
}

export const useAppStore = create<AppState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      theme: 'system',
      searchQuery: '',
      searchFilters: {},
      searchHistory: [],
      queryHistory: [],
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
        
      // Query Recording Actions
      recordQuery: ({ query, params }) => {
        const queryId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const signature = generateQuerySignature(params);
        
        set((state) => {
          // Always check for existing parent query with the same signature first
          const parentQuery = state.queryHistory.find(q => 
            q.querySignature === signature && !q.isPageNavigation
          );
          
          // Determine if this is a navigation vs a new occurrence of the same query
          let isNavigation = false;
          if (parentQuery) {
            // Check if this is a page navigation from any recent query with same signature
            const recentSimilarQueries = [
              parentQuery,
              ...(parentQuery.pageNavigations || [])
            ].slice(0, 5); // Check last 5 queries of this type
            
            isNavigation = recentSimilarQueries.some(recentQuery => 
              isPageNavigation(params, recentQuery.params)
            );
          }
          
          const queryRecord: QueryRecord = {
            id: queryId,
            timestamp: new Date().toISOString(),
            query,
            params,
            querySignature: signature,
            isPageNavigation: isNavigation,
            parentQueryId: parentQuery?.id,
          };
          
          if (parentQuery) {
            if (isNavigation) {
              // This is a page navigation - add to parent's pageNavigations array
              if (!parentQuery.pageNavigations) {
                parentQuery.pageNavigations = [];
              }
              parentQuery.pageNavigations.unshift(queryRecord);
              // Don't add page navigations to the main history list
            } else {
              // This is a new occurrence of the same base query (e.g., rerun)
              // Add to pageNavigations as a grouped occurrence
              if (!parentQuery.pageNavigations) {
                parentQuery.pageNavigations = [];
              }
              parentQuery.pageNavigations.unshift(queryRecord);
              // Don't add to main history list to avoid duplication
            }
          } else {
            // This is a completely new query - create new parent entry
            queryRecord.pageNavigations = [];
            state.queryHistory = [queryRecord, ...state.queryHistory].slice(0, 50);
          }
        });
        
        return queryId;
      },
      
      updateQueryResults: ({ queryId, results }) =>
        set((state) => {
          // Look for query in main history first
          let query = state.queryHistory.find(q => q.id === queryId);
          
          // If not found, look in pageNavigations of each parent query
          if (!query) {
            for (const parentQuery of state.queryHistory) {
              if (parentQuery.pageNavigations) {
                query = parentQuery.pageNavigations.find(q => q.id === queryId);
                if (query) break;
              }
            }
          }
          
          if (query) {
            query.results = results;
          }
        }),
        
      updateQueryError: ({ queryId, error }) =>
        set((state) => {
          // Look for query in main history first
          let query = state.queryHistory.find(q => q.id === queryId);
          
          // If not found, look in pageNavigations of each parent query
          if (!query) {
            for (const parentQuery of state.queryHistory) {
              if (parentQuery.pageNavigations) {
                query = parentQuery.pageNavigations.find(q => q.id === queryId);
                if (query) break;
              }
            }
          }
          
          if (query) {
            query.error = error;
          }
        }),
        
      clearQueryHistory: () =>
        set((state) => {
          state.queryHistory = [];
        }),
        
      getQueryHistory: () => get().queryHistory,
    })),
    {
      name: 'academic-explorer-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        searchHistory: state.searchHistory,
        queryHistory: state.queryHistory,
        preferences: state.preferences,
      }),
    }
  )
);

export type { QueryRecord };