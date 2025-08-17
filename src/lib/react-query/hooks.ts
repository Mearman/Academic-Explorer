/**
 * React Query hooks that integrate with our existing cache system
 * 
 * These hooks provide the React Query developer experience while
 * preserving all existing cache behaviour and strategies.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import React, { useCallback } from 'react';

import { cachedOpenAlex } from '@/lib/openalex';
import type { WorksParams, AuthorsParams, SourcesParams, InstitutionsParams, FundersParams, TopicsParams, ApiResponse, Work, Author, Source, Institution, Funder, Topic, Publisher, Concept } from '@/lib/openalex/types';
import { useAppStore } from '@/stores/app-store';

import { createEntityQuery, invalidateEntityQueries, prefetchRelatedData } from './hybrid-cache-adapter';

/**
 * Hook for searching works with React Query + existing cache
 */
export function useWorks(
  params: WorksParams,
  options?: Omit<UseQueryOptions<ApiResponse<Work>>, 'queryKey' | 'queryFn'>
) {
  const { recordQuery, updateQueryResults, updateQueryError } = useAppStore();
  const queryClient = useQueryClient();

  const query = useQuery({
    ...createEntityQuery('works', params),
    ...options,
    
    // Only run query if we have search parameters
    enabled: !!(params.search || params.filter || options?.enabled !== false),
  });

  // Record query results/errors in app store when query settles
  React.useEffect(() => {
    if (query.isSuccess && query.data) {
      const queryText = params.search || 'Advanced Query';
      const queryId = recordQuery(queryText, params);
      
      updateQueryResults(queryId, {
        count: query.data.meta?.count ?? query.data.results?.length ?? 0,
        responseTimeMs: query.data.meta?.db_response_time_ms ?? 0,
        firstResult: query.data.results?.length > 0 ? {
          id: query.data.results[0].id,
          title: query.data.results[0].title || 'Untitled',
        } : undefined,
      });

      // Prefetch related data
      prefetchRelatedData(queryClient, 'works', params);
    }
    
    if (query.isError) {
      const queryText = params.search || 'Advanced Query';
      const queryId = recordQuery(queryText, params);
      const errorMessage = query.error instanceof Error ? query.error.message : 'Search failed';
      
      updateQueryError(queryId, errorMessage);
    }
  }, [query.isSuccess, query.isError, query.data, query.error, params, recordQuery, updateQueryResults, updateQueryError, queryClient]);

  // Helper to refetch with new params
  const searchWithParams = useCallback((newParams: WorksParams) => {
    const newQuery = createEntityQuery('works', newParams);
    return queryClient.fetchQuery(newQuery);
  }, [queryClient]);

  return {
    ...query,
    searchWithParams,
  } as typeof query & { searchWithParams: typeof searchWithParams };
}

/**
 * Hook for searching authors
 */
export function useAuthors(
  params: AuthorsParams,
  options?: Omit<UseQueryOptions<ApiResponse<Author>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    ...createEntityQuery('authors', params),
    ...options,
  });
}

/**
 * Hook for searching sources
 */
export function useSources(
  params: SourcesParams,
  options?: Omit<UseQueryOptions<ApiResponse<Source>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    ...createEntityQuery('sources', params),
    ...options,
  });
}

/**
 * Hook for searching institutions
 */
export function useInstitutions(
  params: InstitutionsParams,
  options?: Omit<UseQueryOptions<ApiResponse<Institution>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    ...createEntityQuery('institutions', params),
    ...options,
  });
}

/**
 * Hook for searching funders
 */
export function useFunders(
  params: FundersParams,
  options?: Omit<UseQueryOptions<ApiResponse<Funder>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    ...createEntityQuery('funders', params),
    ...options,
  });
}

/**
 * Hook for searching topics
 */
export function useTopics(
  params: TopicsParams,
  options?: Omit<UseQueryOptions<ApiResponse<Topic>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    ...createEntityQuery('topics', params),
    ...options,
  });
}

/**
 * Hook for invalidating and refreshing entity caches
 */
export function useCacheInvalidation() {
  const queryClient = useQueryClient();

  const invalidateWorks = useCallback(() => 
    invalidateEntityQueries(queryClient, 'works'), [queryClient]);
  
  const invalidateAuthors = useCallback(() => 
    invalidateEntityQueries(queryClient, 'authors'), [queryClient]);
  
  const invalidateSources = useCallback(() => 
    invalidateEntityQueries(queryClient, 'sources'), [queryClient]);
  
  const invalidateInstitutions = useCallback(() => 
    invalidateEntityQueries(queryClient, 'institutions'), [queryClient]);
  
  const invalidateFunders = useCallback(() => 
    invalidateEntityQueries(queryClient, 'funders'), [queryClient]);
  
  const invalidateTopics = useCallback(() => 
    invalidateEntityQueries(queryClient, 'topics'), [queryClient]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);

  return {
    invalidateWorks,
    invalidateAuthors,
    invalidateSources,
    invalidateInstitutions,
    invalidateFunders,
    invalidateTopics,
    invalidateAll,
  };
}

/**
 * Hook for managing search state with React Query
 * Replaces the existing useSearchState hook
 */
export function useSearchState(initialParams: WorksParams = {}) {
  const queryClient = useQueryClient();
  
  const worksQuery = useWorks(initialParams, {
    enabled: !!(initialParams.search || initialParams.filter),
  });

  const performSearch = useCallback(async (params: WorksParams) => {
    const query = createEntityQuery('works', params);
    
    try {
      const data = await queryClient.fetchQuery(query);
      
      // Prefetch next page for better UX
      if (params.page && params.page < (data.meta?.count || 0) / (params.per_page || 25)) {
        const nextPageQuery = createEntityQuery('works', { ...params, page: params.page + 1 });
        queryClient.prefetchQuery(nextPageQuery);
      }
      
      return data;
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }, [queryClient]);

  return {
    // Existing interface compatibility
    state: {
      results: worksQuery.data?.results || [],
      meta: worksQuery.data?.meta || null,
      groupBy: worksQuery.data?.group_by,
      loading: worksQuery.isLoading,
      error: worksQuery.error ? (worksQuery.error instanceof Error ? worksQuery.error.message : 'Search failed') : null,
      currentPage: initialParams.page || 1,
    },
    performSearch,
    
    // Additional React Query features
    refetch: worksQuery.refetch,
    isStale: worksQuery.isStale,
    isFetching: worksQuery.isFetching,
    isError: worksQuery.isError,
    isSuccess: worksQuery.isSuccess,
  };
}

/**
 * Mutation hook for operations that might affect cache
 * (Future use for bookmarking, annotations, etc.)
 */
export function useEntityMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, Error, TVariables>
) {
  return useMutation({
    mutationFn,
    ...options,
    
    onSuccess: (data, variables, context) => {
      // Optionally invalidate related queries
      options?.onSuccess?.(data, variables, context);
    },
  });
}

/**
 * Individual Entity Hooks - for fetching single entities by ID
 */

export function useWork(
  id: string,
  options?: Omit<UseQueryOptions<Work>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['work', id],
    queryFn: () => cachedOpenAlex.work(id),
    staleTime: 1000 * 60 * 60 * 24, // 1 day
    gcTime: 1000 * 60 * 60 * 24 * 7, // 1 week (renamed from cacheTime in React Query v5)
    ...options,
  });
}

export function useAuthor(
  id: string,
  options?: Omit<UseQueryOptions<Author>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['author', id],
    queryFn: () => cachedOpenAlex.author(id),
    staleTime: 1000 * 60 * 60 * 24 * 30, // 30 days
    gcTime: 1000 * 60 * 60 * 24 * 90, // 90 days
    ...options,
  });
}

export function useSource(
  id: string,
  options?: Omit<UseQueryOptions<Source>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['source', id],
    queryFn: () => cachedOpenAlex.source(id),
    staleTime: 1000 * 60 * 60 * 24 * 30, // 30 days
    gcTime: 1000 * 60 * 60 * 24 * 90, // 90 days
    ...options,
  });
}

export function useInstitution(
  id: string,
  options?: Omit<UseQueryOptions<Institution>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['institution', id],
    queryFn: () => cachedOpenAlex.institution(id),
    staleTime: 1000 * 60 * 60 * 24 * 30, // 30 days
    gcTime: 1000 * 60 * 60 * 24 * 90, // 90 days
    ...options,
  });
}

export function usePublisher(
  id: string,
  options?: Omit<UseQueryOptions<Publisher>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['publisher', id],
    queryFn: () => cachedOpenAlex.publisher(id),
    staleTime: 1000 * 60 * 60 * 24 * 90, // 90 days
    gcTime: 1000 * 60 * 60 * 24 * 180, // 180 days
    ...options,
  });
}

export function useFunder(
  id: string,
  options?: Omit<UseQueryOptions<Funder>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['funder', id],
    queryFn: () => cachedOpenAlex.funder(id),
    staleTime: 1000 * 60 * 60 * 24 * 90, // 90 days
    gcTime: 1000 * 60 * 60 * 24 * 180, // 180 days
    ...options,
  });
}

export function useTopic(
  id: string,
  options?: Omit<UseQueryOptions<Topic>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['topic', id],
    queryFn: () => cachedOpenAlex.topic(id),
    staleTime: 1000 * 60 * 60 * 24 * 90, // 90 days
    gcTime: 1000 * 60 * 60 * 24 * 180, // 180 days
    ...options,
  });
}

export function useConcept(
  id: string,
  options?: Omit<UseQueryOptions<Concept>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['concept', id],
    queryFn: () => cachedOpenAlex.concept(id),
    staleTime: 1000 * 60 * 60 * 24 * 90, // 90 days
    gcTime: 1000 * 60 * 60 * 24 * 180, // 180 days
    ...options,
  });
}

/**
 * Generic entity hook that can fetch any entity type
 */
export function useEntity(
  entityType: 'work' | 'author' | 'source' | 'institution' | 'publisher' | 'funder' | 'topic' | 'concept',
  id: string,
  options?: UseQueryOptions<Work | Author | Source | Institution | Publisher | Funder | Topic | Concept>
) {
  const queryKey = [entityType, id];
  
  const queryFn = useCallback(async () => {
    switch (entityType) {
      case 'work':
        return cachedOpenAlex.work(id);
      case 'author':
        return cachedOpenAlex.author(id);
      case 'source':
        return cachedOpenAlex.source(id);
      case 'institution':
        return cachedOpenAlex.institution(id);
      case 'publisher':
        return cachedOpenAlex.publisher(id);
      case 'funder':
        return cachedOpenAlex.funder(id);
      case 'topic':
        return cachedOpenAlex.topic(id);
      case 'concept':
        return cachedOpenAlex.concept(id);
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }, [entityType, id]);

  return useQuery({
    queryKey,
    queryFn,
    staleTime: 1000 * 60 * 60 * 24, // 1 day default
    gcTime: 1000 * 60 * 60 * 24 * 7, // 1 week default
    ...options,
  });
}