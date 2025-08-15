import { useState, useEffect, useCallback } from 'react';

import { cachedOpenAlex } from '@/lib/openalex';
import type { Work, ApiResponse, WorksParams } from '@/lib/openalex/types';

interface SearchState {
  results: Work[];
  meta: ApiResponse<Work>['meta'] | null;
  groupBy: ApiResponse<Work>['group_by'];
  loading: boolean;
  error: string | null;
  currentPage: number;
}

export function useSearchState() {
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
    
    try {
      const response = params.group_by 
        ? await cachedOpenAlex.worksGroupBy({ ...params, group_by: params.group_by })
        : await cachedOpenAlex.works(params);
      
      setState(prev => ({
        ...prev,
        results: response.results,
        meta: response.meta,
        groupBy: response.group_by,
        loading: false,
        currentPage: params.page || 1,
      }));
    } catch (error) {
      console.error('Search error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Search failed',
      }));
    }
  }, []);

  return {
    state,
    performSearch,
  };
}