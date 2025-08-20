/**
 * Hook to fetch publications/works for a specific author
 */

import { useState, useEffect, useCallback } from 'react';

import { cachedOpenAlex } from '@/lib/openalex';
import type { Work, ApiResponse } from '@/lib/openalex/types';

export interface AuthorWorksOptions {
  enabled?: boolean;
  sortBy?: 'publication_date' | 'cited_by_count' | 'relevance_score';
  sortOrder?: 'asc' | 'desc';
  yearRange?: {
    start?: number;
    end?: number;
  };
  limit?: number;
  offset?: number;
}

export interface AuthorWorksState {
  works: Work[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  hasNextPage: boolean;
  isLoadingMore: boolean;
}

export interface AuthorWorksActions {
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
  updateOptions: (options: Partial<AuthorWorksOptions>) => void;
}

interface UseAuthorWorksParams {
  authorId: string;
  options?: AuthorWorksOptions;
}

export function useAuthorWorks({
  authorId,
  options = {}
}: UseAuthorWorksParams): AuthorWorksState & AuthorWorksActions {
  const {
    enabled = true,
    sortBy = 'publication_date',
    sortOrder = 'desc',
    limit = 25
  } = options;

  const [state, setState] = useState<AuthorWorksState>({
    works: [],
    totalCount: 0,
    loading: false,
    error: null,
    hasNextPage: false,
    isLoadingMore: false
  });

  const [currentOptions, setCurrentOptions] = useState(options);

  interface BuildFilterParams {
    authorId: string;
    yearRange?: { start?: number; end?: number };
  }

  const buildFilter = useCallback(({ authorId, yearRange }: BuildFilterParams) => {
    let filter = `author.id:${authorId}`;
    
    if (yearRange?.start || yearRange?.end) {
      const startYear = yearRange.start || 1900;
      const endYear = yearRange.end || new Date().getFullYear();
      filter += `,publication_year:${startYear}-${endYear}`;
    }
    
    return filter;
  }, []);

  interface BuildSortParams {
    sortBy: string;
    sortOrder: string;
  }

  const buildSort = useCallback(({ sortBy, sortOrder }: BuildSortParams) => {
    const sortMap: Record<string, string> = {
      'publication_date': 'publication_date',
      'cited_by_count': 'cited_by_count',
      'relevance_score': 'relevance_score'
    };
    
    const sortField = sortMap[sortBy] || 'publication_date';
    return `${sortField}:${sortOrder}`;
  }, []);

  interface FetchWorksParams {
    isLoadMore?: boolean;
    customOffset?: number;
  }

  const fetchWorks = useCallback(async ({
    isLoadMore = false,
    customOffset
  }: FetchWorksParams = {}): Promise<void> => {
    if (!enabled || !authorId) return;

    setState(prev => ({
      ...prev,
      loading: !isLoadMore,
      isLoadingMore: isLoadMore,
      error: null
    }));

    try {
      const filter = buildFilter({ authorId, yearRange: currentOptions.yearRange });
      const sort = buildSort({ sortBy: currentOptions.sortBy || sortBy, sortOrder: currentOptions.sortOrder || sortOrder });
      const currentOffset = customOffset !== undefined ? customOffset : (isLoadMore ? state.works.length : 0);

      const response: ApiResponse<Work> = await cachedOpenAlex.works({
        filter,
        sort,
        per_page: limit,
        page: Math.floor(currentOffset / limit) + 1
      });

      setState(prev => ({
        ...prev,
        works: isLoadMore ? [...prev.works, ...response.results] : response.results,
        totalCount: response.meta.count,
        hasNextPage: (currentOffset + response.results.length) < response.meta.count,
        loading: false,
        isLoadingMore: false
      }));

    } catch (error) {
      console.error('Error fetching author works:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch works',
        loading: false,
        isLoadingMore: false
      }));
    }
  }, [enabled, authorId, currentOptions, limit, sortBy, sortOrder, buildFilter, buildSort, state.works.length]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (state.hasNextPage && !state.isLoadingMore) {
      await fetchWorks({ isLoadMore: true });
    }
  }, [state.hasNextPage, state.isLoadingMore, fetchWorks]);

  const refetch = useCallback(async (): Promise<void> => {
    await fetchWorks({ isLoadMore: false, customOffset: 0 });
  }, [fetchWorks]);

  const updateOptions = useCallback((newOptions: Partial<AuthorWorksOptions>) => {
    setCurrentOptions(prev => ({ ...prev, ...newOptions }));
  }, []);

  // Initial fetch and refetch when options change
  useEffect(() => {
    if (enabled && authorId) {
      fetchWorks({ isLoadMore: false, customOffset: 0 });
    }
  }, [enabled, authorId, currentOptions, fetchWorks]);

  return {
    ...state,
    loadMore,
    refetch,
    updateOptions
  };
}