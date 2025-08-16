import { useState, useCallback } from 'react';

import { cachedOpenAlex } from '@/lib/openalex';
import type { Work, ApiResponse, WorksParams } from '@/lib/openalex/types';
import { useAppStore } from '@/stores/app-store';

interface SearchState {
  results: Work[];
  meta: ApiResponse<Work>['meta'] | null;
  groupBy: ApiResponse<Work>['group_by'];
  loading: boolean;
  error: string | null;
  currentPage: number;
}

export function useSearchState() {
  const { recordQuery, updateQueryResults, updateQueryError } = useAppStore();
  const [state, setState] = useState<SearchState>({
    results: [],
    meta: null,
    groupBy: undefined,
    loading: false,
    error: null,
    currentPage: 1,
  });

  const performSearch = useCallback(async (params: WorksParams) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    // Record the query start
    const queryText = params.search || 'Advanced Query';
    const queryId = recordQuery(queryText, params);
    const startTime = Date.now();
    
    try {
      const response = params.group_by 
        ? await cachedOpenAlex.worksGroupBy({ ...params, group_by: params.group_by })
        : await cachedOpenAlex.works(params);
      
      const responseTime = Date.now() - startTime;
      
      // API response received successfully
      
      // Record successful query results with null checking
      updateQueryResults(queryId, {
        count: response.meta?.count ?? 0,
        responseTimeMs: response.meta?.db_response_time_ms ?? responseTime,
        firstResult: response.results?.length > 0 ? {
          id: response.results[0].id,
          title: response.results[0].title || 'Untitled',
        } : undefined,
      });
      
      setState(prev => ({
        ...prev,
        results: response.results || [],
        meta: response.meta || null,
        groupBy: response.group_by,
        loading: false,
        currentPage: params.page || 1,
      }));
    } catch (error) {
      console.error('Search error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Search failed';
      
      // Record query error
      updateQueryError(queryId, errorMessage);
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, [recordQuery, updateQueryResults, updateQueryError]);

  return {
    state,
    performSearch,
  };
}