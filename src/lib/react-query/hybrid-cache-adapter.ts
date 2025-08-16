/**
 * Hybrid Cache Adapter - Bridges React Query with existing sophisticated cache system
 * 
 * This adapter allows React Query to leverage our existing:
 * - Multi-tier caching (Memory → IndexedDB → localStorage → API)
 * - Entity-specific TTL strategies
 * - Publication year-based cache optimization
 * - Request deduplication
 */

import { QueryClient, QueryFunction, QueryKey } from '@tanstack/react-query';

import { cachedOpenAlex } from '@/lib/openalex';
import type { WorksParams, AuthorsParams, SourcesParams, InstitutionsParams, FundersParams, TopicsParams, ApiResponse, Work, Author, Source, Institution, Funder, Topic } from '@/lib/openalex/types';

// Type mapping for entity types to their params and response types
interface EntityTypeMap {
  works: { params: WorksParams; response: ApiResponse<Work> };
  authors: { params: AuthorsParams; response: ApiResponse<Author> };
  sources: { params: SourcesParams; response: ApiResponse<Source> };
  institutions: { params: InstitutionsParams; response: ApiResponse<Institution> };
  funders: { params: FundersParams; response: ApiResponse<Funder> };
  topics: { params: TopicsParams; response: ApiResponse<Topic> };
}

type EntityType = keyof EntityTypeMap;

/**
 * Creates query keys that are consistent and cacheable
 */
export function createQueryKey(entityType: EntityType, params: WorksParams | AuthorsParams | SourcesParams | InstitutionsParams | FundersParams | TopicsParams): QueryKey {
  // Sort params for consistent keys
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key as keyof typeof params];
      return acc;
    }, {} as Record<string, unknown>);

  return [entityType, sortedParams];
}

/**
 * Query functions that use our existing cached client
 */
export const queryFunctions = {
  works: async ({ queryKey }: { queryKey: QueryKey }): Promise<ApiResponse<Work>> => {
    const [, params] = queryKey as [string, WorksParams];
    return cachedOpenAlex.works(params);
  },

  authors: async ({ queryKey }: { queryKey: QueryKey }): Promise<ApiResponse<Author>> => {
    const [, params] = queryKey as [string, AuthorsParams];
    return cachedOpenAlex.authors(params);
  },

  sources: async ({ queryKey }: { queryKey: QueryKey }): Promise<ApiResponse<Source>> => {
    const [, params] = queryKey as [string, SourcesParams];
    return cachedOpenAlex.sources(params);
  },

  institutions: async ({ queryKey }: { queryKey: QueryKey }): Promise<ApiResponse<Institution>> => {
    const [, params] = queryKey as [string, InstitutionsParams];
    return cachedOpenAlex.institutions(params);
  },

  funders: async ({ queryKey }: { queryKey: QueryKey }): Promise<ApiResponse<Funder>> => {
    const [, params] = queryKey as [string, FundersParams];
    return cachedOpenAlex.funders(params);
  },

  topics: async ({ queryKey }: { queryKey: QueryKey }): Promise<ApiResponse<Topic>> => {
    const [, params] = queryKey as [string, TopicsParams];
    return cachedOpenAlex.topics(params);
  },
};

/**
 * Determine cache time based on entity type and params
 * Leverages our existing cache strategy logic
 */
export function getCacheTime(entityType: EntityType, params: WorksParams | AuthorsParams | SourcesParams | InstitutionsParams | FundersParams | TopicsParams): number {
  // For works, use publication year-based caching strategy
  if (entityType === 'works' && typeof params.filter === 'string') {
    const filterStr = params.filter;
    
    // Check for publication year in filter
    const yearMatch = filterStr.match(/publication_year:(\d{4})/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      const currentYear = new Date().getFullYear();
      const yearDiff = currentYear - year;
      
      if (yearDiff > 10) {
        // Very old papers: cache for 1 year
        return 1000 * 60 * 60 * 24 * 365;
      } else if (yearDiff > 2) {
        // Older papers: cache for 1 month
        return 1000 * 60 * 60 * 24 * 30;
      } else {
        // Recent papers: cache for 1 week
        return 1000 * 60 * 60 * 24 * 7;
      }
    }
  }
  
  // Default cache times by entity type
  switch (entityType) {
    case 'works':
      return 1000 * 60 * 60 * 24 * 7; // 1 week
    case 'authors':
    case 'institutions':
    case 'sources':
      return 1000 * 60 * 60 * 24 * 30; // 1 month
    case 'funders':
    case 'topics':
      return 1000 * 60 * 60 * 24 * 90; // 3 months
    default:
      return 1000 * 60 * 60 * 24; // 1 day
  }
}

/**
 * Get stale time (when data is considered stale but still usable)
 */
export function getStaleTime(entityType: EntityType, params: WorksParams | AuthorsParams | SourcesParams | InstitutionsParams | FundersParams | TopicsParams): number {
  // Academic data is generally stable, so we can use longer stale times
  return getCacheTime(entityType, params) / 2;
}

/**
 * Configure QueryClient with hybrid caching settings
 */
export function createHybridQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Retry failed requests
        retry: (failureCount, error) => {
          // Don't retry client errors (4xx)
          if (error && typeof error === 'object' && 'status' in error) {
            const status = error.status as number;
            if (status >= 400 && status < 500) {
              return false;
            }
          }
          
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        
        // Retry with exponential backoff
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Default stale time - will be overridden by specific queries
        staleTime: 1000 * 60 * 5, // 5 minutes
        
        // Default cache time - will be overridden by specific queries
        gcTime: 1000 * 60 * 60, // 1 hour
        
        // Don't refetch on window focus for academic data
        refetchOnWindowFocus: false,
        
        // Don't refetch on reconnect for academic data
        refetchOnReconnect: false,
        
        // Refetch on mount only if data is stale
        refetchOnMount: true,
      },
    },
  });
}

/**
 * Helper to create a query function with proper caching configuration
 */
export function createEntityQuery<T extends EntityType>(
  entityType: T,
  params: EntityTypeMap[T]['params']
) {
  const queryKey = createQueryKey(entityType, params);
  const gcTime = getCacheTime(entityType, params);
  const staleTime = getStaleTime(entityType, params);
  
  return {
    queryKey,
    queryFn: queryFunctions[entityType] as QueryFunction<EntityTypeMap[T]['response']>,
    gcTime,
    staleTime,
    
    // Additional configuration for academic data
    meta: {
      entityType,
      params,
      cacheStrategy: 'hybrid',
    },
  };
}

/**
 * Invalidate related queries when data changes
 */
export function invalidateEntityQueries(queryClient: QueryClient, entityType: EntityType) {
  return queryClient.invalidateQueries({
    queryKey: [entityType],
    exact: false, // Invalidate all queries that start with [entityType]
  });
}

/**
 * Prefetch related data for better UX
 */
export function prefetchRelatedData(
  queryClient: QueryClient,
  entityType: EntityType,
  params: WorksParams | AuthorsParams | SourcesParams | InstitutionsParams | FundersParams | TopicsParams
) {
  // For works searches, prefetch next page
  if (entityType === 'works' && typeof params.page === 'number') {
    const nextPageParams = { ...params, page: params.page + 1 };
    const nextPageQuery = createEntityQuery('works', nextPageParams as WorksParams);
    
    queryClient.prefetchQuery(nextPageQuery);
  }
  
  // For paginated results, prefetch previous page too
  if (typeof params.page === 'number' && params.page > 1) {
    const prevPageParams = { ...params, page: params.page - 1 };
    const prevPageQuery = createEntityQuery(entityType, prevPageParams as EntityTypeMap[EntityType]['params']);
    
    queryClient.prefetchQuery(prevPageQuery);
  }
}