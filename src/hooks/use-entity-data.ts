/**
 * Client-side entity data fetching hook for static Next.js exports
 * 
 * This hook provides React-based data fetching for OpenAlex entities,
 * supporting loading states, error handling, retry mechanisms, and all entity types.
 * Designed for static export compatibility with browser-only data fetching.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cachedOpenAlex } from '@/lib/openalex';
import { 
  EntityType, 
  detectEntityType, 
  normalizeEntityId, 
  // validateEntityId, // Currently unused
  EntityDetectionError 
} from '@/lib/openalex/utils/entity-detection';
import type { 
  Work, 
  Author, 
  Source, 
  Institution, 
  Publisher, 
  Funder, 
  Topic,
  Concept,
  Continent,
  Keyword,
  Region
} from '@/lib/openalex/types';

/**
 * Union type for all possible entity data types
 */
export type EntityData = Work | Author | Source | Institution | Publisher | Funder | Topic | Concept | Continent | Keyword | Region;

/**
 * Error types for entity fetching
 */
export enum EntityErrorType {
  INVALID_ID = 'INVALID_ID',
  NOT_FOUND = 'NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Entity error interface with user-friendly messages
 */
export interface EntityError {
  type: EntityErrorType;
  message: string;
  originalError?: Error;
  retryable: boolean;
}

/**
 * Loading states for entity fetching
 */
export enum EntityLoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  RETRYING = 'RETRYING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

/**
 * Hook state interface
 */
export interface UseEntityDataState<T = EntityData> {
  data: T | null;
  loading: boolean;
  error: EntityError | null;
  state: EntityLoadingState;
  retryCount: number;
  lastFetchTime: number | null;
}

/**
 * Hook options interface
 */
export interface UseEntityDataOptions {
  /** Whether to fetch immediately on mount */
  enabled?: boolean;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Base delay between retries in ms */
  retryDelay?: number;
  /** Timeout for requests in ms */
  timeout?: number;
  /** Whether to skip cache */
  skipCache?: boolean;
  /** Callback for successful fetch */
  onSuccess?: (data: EntityData) => void;
  /** Callback for error */
  onError?: (error: EntityError) => void;
  /** Whether to refetch on window focus */
  refetchOnWindowFocus?: boolean;
  /** Stale time in ms before refetching */
  staleTime?: number;
}

/**
 * Default options for the hook
 */
const DEFAULT_OPTIONS: Required<UseEntityDataOptions> = {
  enabled: true,
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000,
  skipCache: false,
  onSuccess: () => {},
  onError: () => {},
  refetchOnWindowFocus: false,
  staleTime: 5 * 60 * 1000 // 5 minutes
};

/**
 * Create a user-friendly error from various error types
 */
function createEntityError(error: unknown, entityId: string): EntityError {
  // Handle ID validation errors
  if (error instanceof EntityDetectionError) {
    return {
      type: EntityErrorType.INVALID_ID,
      message: `Invalid entity ID format: "${entityId}". Please ensure you're using a valid OpenAlex ID (e.g., W123456789, A987654321).`,
      originalError: error,
      retryable: false
    };
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Check for 404 errors
    if (message.includes('not found') || message.includes('404')) {
      return {
        type: EntityErrorType.NOT_FOUND,
        message: `Entity "${entityId}" was not found. Please verify the ID is correct and the entity exists in OpenAlex.`,
        originalError: error,
        retryable: false
      };
    }
    
    // Check for network errors
    if (message.includes('fetch') || message.includes('network') || message.includes('connection')) {
      return {
        type: EntityErrorType.NETWORK_ERROR,
        message: 'Network connection failed. Please check your internet connection and try again.',
        originalError: error,
        retryable: true
      };
    }
    
    // Check for timeout errors
    if (message.includes('timeout') || message.includes('aborted')) {
      return {
        type: EntityErrorType.TIMEOUT,
        message: 'Request timed out. The server may be experiencing high load. Please try again.',
        originalError: error,
        retryable: true
      };
    }
    
    // Check for rate limiting
    if (message.includes('rate') || message.includes('429') || message.includes('too many')) {
      return {
        type: EntityErrorType.RATE_LIMITED,
        message: 'Too many requests. Please wait a moment before trying again.',
        originalError: error,
        retryable: true
      };
    }
  }

  // Default unknown error
  return {
    type: EntityErrorType.UNKNOWN,
    message: 'An unexpected error occurred while fetching the entity. Please try again.',
    originalError: error instanceof Error ? error : new Error(String(error)),
    retryable: true
  };
}

/**
 * Fetch entity data with timeout support
 */
async function fetchEntityWithTimeout(
  entityId: string,
  entityType: EntityType,
  timeout: number,
  skipCache: boolean
): Promise<EntityData> {
  try {
    const normalizedId = normalizeEntityId(entityId, entityType);
    
    console.log(`[fetchEntityWithTimeout] Fetching ${entityType}:${normalizedId}, skipCache: ${skipCache}`);
    
    let result: EntityData;
    
    // Route to appropriate client method based on entity type
    switch (entityType) {
      case EntityType.WORK:
        console.log(`[fetchEntityWithTimeout] Calling cachedOpenAlex.work(${normalizedId})`);
        result = await cachedOpenAlex.work(normalizedId, skipCache);
        console.log(`[fetchEntityWithTimeout] cachedOpenAlex.work returned:`, !!result);
        break;
      case EntityType.AUTHOR:
        result = await cachedOpenAlex.author(normalizedId, skipCache);
        break;
      case EntityType.SOURCE:
        result = await cachedOpenAlex.source(normalizedId, skipCache);
        break;
      case EntityType.INSTITUTION:
        result = await cachedOpenAlex.institution(normalizedId, skipCache);
        break;
      case EntityType.PUBLISHER:
        result = await cachedOpenAlex.publisher(normalizedId, skipCache);
        break;
      case EntityType.FUNDER:
        result = await cachedOpenAlex.funder(normalizedId, skipCache);
        break;
      case EntityType.TOPIC:
        result = await cachedOpenAlex.topic(normalizedId, skipCache);
        break;
      case EntityType.CONCEPT:
        result = await cachedOpenAlex.concept(normalizedId, skipCache);
        break;
      case EntityType.CONTINENT:
        result = await cachedOpenAlex.request<Continent>(`/continents/${normalizedId}`);
        break;
      case EntityType.KEYWORD:
        result = await cachedOpenAlex.request<Keyword>(`/keywords/${normalizedId}`);
        break;
      case EntityType.REGION:
        result = await cachedOpenAlex.request<Region>(`/regions/${normalizedId}`);
        break;
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
    
    if (!result) {
      throw new Error(`Entity ${entityType}:${normalizedId} returned null or undefined`);
    }
    
    console.log(`[fetchEntityWithTimeout] Successfully fetched ${entityType}:${normalizedId}:`, result.display_name || result.id);
    
    return result;
  } catch (error) {
    console.error(`[fetchEntityWithTimeout] Error fetching ${entityType}:${entityId}:`, error);
    throw error;
  }
}

/**
 * Calculate exponential backoff delay
 */
function calculateRetryDelay(retryCount: number, baseDelay: number): number {
  return Math.min(baseDelay * Math.pow(2, retryCount), 30000); // Max 30 seconds
}

/**
 * React hook for fetching OpenAlex entity data client-side
 * 
 * @param entityId - The entity ID (with or without prefix)
 * @param entityType - Optional explicit entity type (required for numeric IDs)
 * @param options - Configuration options
 * @returns Hook state and control functions
 * 
 * @example
 * ```typescript
 * // Fetch a work by prefixed ID
 * const { data, loading, error, retry } = useEntityData('W2741809807');
 * 
 * // Fetch an author by numeric ID with explicit type
 * const { data, loading, error } = useEntityData('2887492', EntityType.AUTHOR);
 * 
 * // With custom options
 * const { data, loading, error } = useEntityData('W123', undefined, {
 *   maxRetries: 5,
 *   onSuccess: (data) => console.log('Loaded:', data.display_name),
 *   onError: (error) => console.error('Failed:', error.message)
 * });
 * ```
 */
export function useEntityData<T extends EntityData = EntityData>(
  entityId: string | null | undefined,
  entityType?: EntityType,
  options: Partial<UseEntityDataOptions> = {}
): UseEntityDataState<T> & {
  /** Manually trigger a refetch */
  refetch: () => Promise<void>;
  /** Retry the last failed request */
  retry: () => Promise<void>;
  /** Reset the hook state */
  reset: () => void;
} {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [state, setState] = useState<UseEntityDataState<T>>({
    data: null,
    loading: false,
    error: null,
    state: EntityLoadingState.IDLE,
    retryCount: 0,
    lastFetchTime: null
  });

  // Use refs to store latest options to avoid recreating effect
  const optionsRef = useRef(opts);
  optionsRef.current = opts;

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Main fetch function
  const fetchEntity = useCallback(async (isRetry = false): Promise<void> => {
    if (!entityId) {
      setState(prev => ({
        ...prev,
        data: null,
        loading: false,
        error: null,
        state: EntityLoadingState.IDLE
      }));
      return;
    }

    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Validate entity ID and determine type
    let detectedType: EntityType;
    try {
      if (entityType) {
        detectedType = entityType;
      } else {
        detectedType = detectEntityType(entityId);
      }
    } catch (error) {
      const entityError = createEntityError(error, entityId);
      setState(prev => ({
        ...prev,
        loading: false,
        error: entityError,
        state: EntityLoadingState.ERROR
      }));
      optionsRef.current.onError(entityError);
      return;
    }

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      state: isRetry ? EntityLoadingState.RETRYING : EntityLoadingState.LOADING
    }));

    try {
      console.log(`[useEntityData] Fetching entity: ${entityId} (type: ${detectedType}, retry: ${isRetry})`);
      
      // Add timeout debug indicator  
      const debugEl = document.getElementById('debug-entity-fetch');
      if (debugEl) {
        debugEl.style.background = 'blue';
        debugEl.textContent = `API Call: ${entityId}`;
      }
      
      const data = await fetchEntityWithTimeout(
        entityId,
        detectedType,
        optionsRef.current.timeout,
        optionsRef.current.skipCache
      );

      if (!mountedRef.current) {
        console.log(`[useEntityData] Component unmounted, skipping state update for ${entityId}`);
        return;
      }

      console.log(`[useEntityData] Successfully fetched data for ${entityId}:`, data);

      setState(prev => ({
        ...prev,
        data: data as T,
        loading: false,
        error: null,
        state: EntityLoadingState.SUCCESS,
        retryCount: 0,
        lastFetchTime: Date.now()
      }));

      // Add success debug indicator
      const successDebugEl = document.getElementById('debug-entity-fetch');
      if (successDebugEl) {
        successDebugEl.style.background = 'green';
        successDebugEl.textContent = `Success: ${entityId}`;
        setTimeout(() => {
          successDebugEl.remove();
        }, 3000);
      }

      optionsRef.current.onSuccess(data);
    } catch (error) {
      if (!mountedRef.current) {
        console.log(`[useEntityData] Component unmounted, skipping error state update for ${entityId}`);
        return;
      }

      console.error(`[useEntityData] Error fetching entity ${entityId}:`, error);
      
      // Add error debug indicator
      const debugEl = document.getElementById('debug-entity-fetch');
      if (debugEl) {
        debugEl.style.background = 'orange';
        debugEl.textContent = `Error: ${error.message || 'Unknown error'}`;
      }
      
      const entityError = createEntityError(error, entityId);
      
      setState(prev => {
        const newRetryCount = isRetry ? prev.retryCount + 1 : 1;
        
        console.log(`[useEntityData] Setting error state. Retry count: ${newRetryCount}, Max retries: ${optionsRef.current.maxRetries}`);
        
        // Schedule retry if retryable
        if (entityError.retryable && newRetryCount < optionsRef.current.maxRetries) {
          const delay = calculateRetryDelay(newRetryCount, optionsRef.current.retryDelay);
          
          console.log(`[useEntityData] Scheduling retry ${newRetryCount + 1}/${optionsRef.current.maxRetries} in ${delay}ms for ${entityId}`);
          
          retryTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              console.log(`[useEntityData] Executing retry ${newRetryCount + 1} for ${entityId}`);
              fetchEntity(true);
            }
          }, delay);
        } else {
          console.log(`[useEntityData] No retry: retryable=${entityError.retryable}, retryCount=${newRetryCount}, maxRetries=${optionsRef.current.maxRetries}`);
        }
        
        return {
          ...prev,
          loading: false,
          error: entityError,
          state: EntityLoadingState.ERROR,
          retryCount: newRetryCount
        };
      });

      optionsRef.current.onError(entityError);
    }
  }, [entityId, entityType]); // Removed state.retryCount from dependencies

  // Auto-fetch effect
  useEffect(() => {
    if (opts.enabled && entityId) {
      console.log(`[useEntityData] Auto-fetch effect triggered for ${entityId}, enabled: ${opts.enabled}`);
      // Add a visible debug indicator
      const debugEl = document.getElementById('debug-entity-fetch');
      if (!debugEl) {
        const el = document.createElement('div');
        el.id = 'debug-entity-fetch';
        el.style.cssText = 'position:fixed;top:10px;right:10px;background:red;color:white;padding:10px;z-index:9999;font-size:12px;';
        el.textContent = `Fetching: ${entityId}`;
        document.body.appendChild(el);
      } else {
        debugEl.textContent = `Fetching: ${entityId}`;
      }
      fetchEntity();
    } else {
      console.log(`[useEntityData] Auto-fetch skipped - enabled: ${opts.enabled}, entityId: ${entityId}`);
    }
  }, [entityId, entityType, opts.enabled, fetchEntity]);

  // Window focus refetch
  useEffect(() => {
    if (!opts.refetchOnWindowFocus || !entityId) return;

    const handleFocus = () => {
      const now = Date.now();
      const lastFetch = state.lastFetchTime;
      
      if (lastFetch && (now - lastFetch) > opts.staleTime) {
        fetchEntity();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [opts.refetchOnWindowFocus, opts.staleTime, entityId, state.lastFetchTime, fetchEntity]);

  // Control functions
  const refetch = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, retryCount: 0 }));
    await fetchEntity(false);
  }, [fetchEntity]);

  const retry = useCallback(async (): Promise<void> => {
    console.log(`[useEntityData] Manual retry requested for ${entityId}`);
    if (state.error?.retryable || state.error) {
      setState(prev => ({ ...prev, retryCount: 0 })); // Reset retry count for manual retries
      await fetchEntity(true);
    } else {
      console.log(`[useEntityData] Retry not available - no retryable error`);
    }
  }, [fetchEntity, entityId, state.error]);

  const reset = useCallback((): void => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    setState({
      data: null,
      loading: false,
      error: null,
      state: EntityLoadingState.IDLE,
      retryCount: 0,
      lastFetchTime: null
    });
  }, []);

  return {
    ...state,
    refetch,
    retry,
    reset
  };
}

/**
 * Specialized hook for fetching works
 */
export function useWorkData(
  workId: string | null | undefined,
  options?: Partial<UseEntityDataOptions>
) {
  return useEntityData<Work>(workId, EntityType.WORK, options);
}

/**
 * Specialized hook for fetching authors
 */
export function useAuthorData(
  authorId: string | null | undefined,
  options?: Partial<UseEntityDataOptions>
) {
  return useEntityData<Author>(authorId, EntityType.AUTHOR, options);
}

/**
 * Specialized hook for fetching sources
 */
export function useSourceData(
  sourceId: string | null | undefined,
  options?: Partial<UseEntityDataOptions>
) {
  return useEntityData<Source>(sourceId, EntityType.SOURCE, options);
}

/**
 * Specialized hook for fetching institutions
 */
export function useInstitutionData(
  institutionId: string | null | undefined,
  options?: Partial<UseEntityDataOptions>
) {
  return useEntityData<Institution>(institutionId, EntityType.INSTITUTION, options);
}

/**
 * Specialized hook for fetching publishers
 */
export function usePublisherData(
  publisherId: string | null | undefined,
  options?: Partial<UseEntityDataOptions>
) {
  return useEntityData<Publisher>(publisherId, EntityType.PUBLISHER, options);
}

/**
 * Specialized hook for fetching funders
 */
export function useFunderData(
  funderId: string | null | undefined,
  options?: Partial<UseEntityDataOptions>
) {
  return useEntityData<Funder>(funderId, EntityType.FUNDER, options);
}

/**
 * Specialized hook for fetching topics
 */
export function useTopicData(
  topicId: string | null | undefined,
  options?: Partial<UseEntityDataOptions>
) {
  return useEntityData<Topic>(topicId, EntityType.TOPIC, options);
}

/**
 * Specialized hook for fetching concepts
 */
export function useConceptData(
  conceptId: string | null | undefined,
  options?: Partial<UseEntityDataOptions>
) {
  return useEntityData<Concept>(conceptId, EntityType.CONCEPT, options);
}

/**
 * Specialized hook for fetching continents
 */
export function useContinentData(
  continentId: string | null | undefined,
  options?: Partial<UseEntityDataOptions>
) {
  return useEntityData<Continent>(continentId, EntityType.CONTINENT, options);
}

/**
 * Specialized hook for fetching keywords
 */
export function useKeywordData(
  keywordId: string | null | undefined,
  options?: Partial<UseEntityDataOptions>
) {
  return useEntityData<Keyword>(keywordId, EntityType.KEYWORD, options);
}

/**
 * Specialized hook for fetching regions
 */
export function useRegionData(
  regionId: string | null | undefined,
  options?: Partial<UseEntityDataOptions>
) {
  return useEntityData<Region>(regionId, EntityType.REGION, options);
}

/**
 * Hook for batch fetching multiple entities of the same type
 */
export function useBatchEntityData<T extends EntityData = EntityData>(
  entityIds: string[],
  entityType: EntityType,
  options: Partial<UseEntityDataOptions> = {}
): {
  data: Record<string, T>;
  loading: boolean;
  errors: Record<string, EntityError>;
  completed: number;
  total: number;
  refetchAll: () => Promise<void>;
} {
  const [batchState, setBatchState] = useState({
    data: {} as Record<string, T>,
    loading: false,
    errors: {} as Record<string, EntityError>,
    completed: 0,
    total: entityIds.length
  });

  const fetchBatch = useCallback(async () => {
    if (entityIds.length === 0) return;

    setBatchState(prev => ({
      ...prev,
      loading: true,
      completed: 0,
      total: entityIds.length,
      errors: {}
    }));

    const results: Record<string, T> = {};
    const errors: Record<string, EntityError> = {};
    let completed = 0;

    await Promise.allSettled(
      entityIds.map(async (id) => {
        try {
          const data = await fetchEntityWithTimeout(
            id,
            entityType,
            options.timeout || DEFAULT_OPTIONS.timeout,
            options.skipCache || false
          );
          results[id] = data as T;
        } catch (error) {
          errors[id] = createEntityError(error, id);
        } finally {
          completed++;
          setBatchState(prev => ({
            ...prev,
            completed,
            data: { ...prev.data, ...results },
            errors: { ...prev.errors, ...errors }
          }));
        }
      })
    );

    setBatchState(prev => ({
      ...prev,
      loading: false
    }));
  }, [entityIds, entityType, options.timeout, options.skipCache]);

  useEffect(() => {
    if (options.enabled !== false) {
      fetchBatch();
    }
  }, [fetchBatch, options.enabled]);

  const refetchAll = useCallback(async () => {
    await fetchBatch();
  }, [fetchBatch]);

  return {
    ...batchState,
    refetchAll
  };
}