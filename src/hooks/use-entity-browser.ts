import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { cachedOpenAlex } from '@/lib/openalex';
import type { 
  ApiResponse, 
  WorksParams, 
  AuthorsParams, 
  SourcesParams, 
  InstitutionsParams, 
  FundersParams, 
  TopicsParams, 
  PublishersParams,
  ConceptsParams,
  Work, 
  Author, 
  Source, 
  Institution, 
  Funder, 
  Topic, 
  Publisher,
  Concept,
} from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

type EntityUnion = Work | Author | Source | Institution | Funder | Topic | Publisher | Concept;
type ParamsUnion = WorksParams | AuthorsParams | SourcesParams | InstitutionsParams | FundersParams | TopicsParams | PublishersParams | ConceptsParams;

interface UseEntityBrowserOptions {
  entityType: EntityType;
  search?: string;
  filters?: Record<string, unknown>;
  sort?: string;
  perPage?: number;
  page?: number;
  sample?: number;
  enabled?: boolean;
}

export function useEntityBrowser({
  entityType,
  search,
  filters = {},
  sort = 'cited_by_count:desc',
  perPage = 25,
  page = 1,
  sample,
  enabled = true,
}: UseEntityBrowserOptions) {
  // Build filter string from filters object
  const filterString = useMemo(() => {
    const filterParts: string[] = [];
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      
      if (Array.isArray(value) && value.length === 0) return;
      
      // Handle range filters (min/max)
      if (key.endsWith('_min') || key.endsWith('_max')) {
        const baseKey = key.replace(/_min$|_max$/, '');
        const operator = key.endsWith('_min') ? '>=' : '<=';
        filterParts.push(`${baseKey}:${operator}${value}`);
      }
      // Handle array values (multi-select)
      else if (Array.isArray(value)) {
        const valueString = value.join('|');
        filterParts.push(`${key}:${valueString}`);
      }
      // Handle boolean values
      else if (typeof value === 'boolean') {
        filterParts.push(`${key}:${value}`);
      }
      // Handle string/number values
      else {
        filterParts.push(`${key}:${value}`);
      }
    });
    
    return filterParts.length > 0 ? filterParts.join(',') : undefined;
  }, [filters]);

  // Build parameters object based on entity type
  const params = useMemo((): ParamsUnion => {
    const baseParams = {
      search: search || undefined,
      filter: filterString,
      sort: sort || undefined,
      per_page: perPage,
      page,
      sample: sample || undefined,
    };
    
    // Remove undefined values
    return Object.fromEntries(
      Object.entries(baseParams).filter(([, value]) => value !== undefined)
    ) as ParamsUnion;
  }, [search, filterString, sort, perPage, page, sample]);

  // Create query key and function based on entity type
  const { queryKey, queryFn } = useMemo((): {
    queryKey: (string | ParamsUnion)[];
    queryFn: () => Promise<ApiResponse<EntityUnion>>;
  } => {
    const key = [entityType.toLowerCase(), 'browser', params];
    
    switch (entityType) {
      case EntityType.WORK:
        return {
          queryKey: key,
          queryFn: () => cachedOpenAlex.works(params as WorksParams) as Promise<ApiResponse<Work>>,
        };
      case EntityType.AUTHOR:
        return {
          queryKey: key,
          queryFn: () => cachedOpenAlex.authors(params as AuthorsParams) as Promise<ApiResponse<Author>>,
        };
      case EntityType.SOURCE:
        return {
          queryKey: key,
          queryFn: () => cachedOpenAlex.sources(params as SourcesParams) as Promise<ApiResponse<Source>>,
        };
      case EntityType.INSTITUTION:
        return {
          queryKey: key,
          queryFn: () => cachedOpenAlex.institutions(params as InstitutionsParams) as Promise<ApiResponse<Institution>>,
        };
      case EntityType.FUNDER:
        return {
          queryKey: key,
          queryFn: () => cachedOpenAlex.funders(params as FundersParams) as Promise<ApiResponse<Funder>>,
        };
      case EntityType.TOPIC:
        return {
          queryKey: key,
          queryFn: () => cachedOpenAlex.topics(params as TopicsParams) as Promise<ApiResponse<Topic>>,
        };
      case EntityType.PUBLISHER:
        return {
          queryKey: key,
          queryFn: () => cachedOpenAlex.publishers(params as PublishersParams) as Promise<ApiResponse<Publisher>>,
        };
      case EntityType.CONCEPT:
        return {
          queryKey: key,
          queryFn: () => cachedOpenAlex.concepts(params as ConceptsParams) as Promise<ApiResponse<Concept>>,
        };
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }, [entityType, params]);

  // Execute query
  const query = useQuery({
    queryKey,
    queryFn,
    enabled: enabled && (!!search || !!filterString || !!sample || Object.keys(filters).length === 0),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Get random entities function
  const getRandom = useCallback(async (count: number = 25) => {
    const randomParams = { sample: count } as ParamsUnion;
    
    try {
      switch (entityType) {
        case EntityType.WORK:
          return await cachedOpenAlex.works(randomParams as WorksParams);
        case EntityType.AUTHOR:
          return await cachedOpenAlex.authors(randomParams as AuthorsParams);
        case EntityType.SOURCE:
          return await cachedOpenAlex.sources(randomParams as SourcesParams);
        case EntityType.INSTITUTION:
          return await cachedOpenAlex.institutions(randomParams as InstitutionsParams);
        case EntityType.FUNDER:
          return await cachedOpenAlex.funders(randomParams as FundersParams);
        case EntityType.TOPIC:
          return await cachedOpenAlex.topics(randomParams as TopicsParams);
        case EntityType.PUBLISHER:
          return await cachedOpenAlex.publishers(randomParams as PublishersParams);
        case EntityType.CONCEPT:
          return await cachedOpenAlex.concepts(randomParams as ConceptsParams);
        default:
          throw new Error(`Unsupported entity type: ${entityType}`);
      }
    } catch (error) {
      console.error('[useEntityBrowser] Error fetching random entities:', error);
      throw error;
    }
  }, [entityType]);

  // Clear search function
  const clearSearch = useCallback(() => {
    // This will be handled by the parent component
    // We return the current query refetch function
    return query.refetch();
  }, [query]);

  // Get single random entity function
  const getRandomSingle = useCallback(async (): Promise<EntityUnion> => {
    try {
      switch (entityType) {
        case EntityType.WORK:
          return await cachedOpenAlex.randomWork();
        case EntityType.AUTHOR:
          return await cachedOpenAlex.randomAuthor();
        case EntityType.SOURCE:
          return await cachedOpenAlex.randomSource();
        case EntityType.INSTITUTION:
          return await cachedOpenAlex.randomInstitution();
        case EntityType.FUNDER:
          return await cachedOpenAlex.randomFunder();
        case EntityType.TOPIC:
          return await cachedOpenAlex.randomTopic();
        case EntityType.PUBLISHER:
          return await cachedOpenAlex.randomPublisher();
        case EntityType.CONCEPT:
          return await cachedOpenAlex.randomConcept();
        default:
          throw new Error(`Unsupported entity type: ${entityType}`);
      }
    } catch (error) {
      console.error('[useEntityBrowser] Error fetching random entity:', error);
      throw error;
    }
  }, [entityType]);

  return {
    data: query.data as ApiResponse<EntityUnion> | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
    refetch: query.refetch,
    getRandom,
    getRandomSingle,
    clearSearch,
    // Additional utility functions
    isValidSearch: !!search || !!filterString || !!sample,
    hasFilters: Object.keys(filters).length > 0,
    currentParams: params,
  };
}