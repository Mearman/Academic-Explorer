/**
 * Client-side entity data fetching hook for static Next.js exports
 * 
 * This hook provides React-based data fetching for OpenAlex entities,
 * supporting loading states, error handling, retry mechanisms, and all entity types.
 * Designed for static export compatibility with browser-only data fetching.
 * 
 * SIMPLIFIED VERSION: This is a simplified, working version that replaces the
 * complex original implementation that had useCallback/setState issues.
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type React from 'react';

import { cachedOpenAlex } from '@/lib/openalex';
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
import { 
  EntityType, 
  detectEntityType, 
  normalizeEntityId, 
  EntityDetectionError 
} from '@/lib/openalex/utils/entity-detection';

// Re-export EntityType for use in tests and other modules
export { EntityType } from '@/lib/openalex/utils/entity-detection';

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
  /** Whether to automatically retry on retryable errors */
  retryOnError?: boolean;
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
  retryOnError: false, // Disabled by default to avoid unexpected behavior
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 10000,
  skipCache: false,
  onSuccess: () => {},
  onError: () => {},
  refetchOnWindowFocus: false,
  staleTime: 5 * 60 * 1000 // 5 minutes
};

interface CreateEntityErrorParams {
  error: unknown;
  entityId: string;
}

/**
 * Create a user-friendly error from various error types
 */
function createEntityError({ error, entityId }: CreateEntityErrorParams): EntityError {
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
    
    if (message.includes('not found') || message.includes('404')) {
      return {
        type: EntityErrorType.NOT_FOUND,
        message: `Entity "${entityId}" was not found. Please verify the ID is correct and the entity exists in OpenAlex.`,
        originalError: error,
        retryable: false
      };
    }
    
    if (message.includes('fetch') || message.includes('network') || message.includes('connection')) {
      return {
        type: EntityErrorType.NETWORK_ERROR,
        message: 'Network connection failed. Please check your internet connection and try again.',
        originalError: error,
        retryable: true
      };
    }
    
    if (message.includes('timeout') || message.includes('aborted')) {
      return {
        type: EntityErrorType.TIMEOUT,
        message: 'Request timed out. The server may be experiencing high load. Please try again.',
        originalError: error,
        retryable: true
      };
    }
    
    if (message.includes('rate') || message.includes('429') || message.includes('too many')) {
      return {
        type: EntityErrorType.RATE_LIMITED,
        message: 'Too many requests. Please wait a moment before trying again.',
        originalError: error,
        retryable: true
      };
    }
  }

  return {
    type: EntityErrorType.UNKNOWN,
    message: 'An unexpected error occurred while fetching the entity. Please try again.',
    originalError: error instanceof Error ? error : new Error(String(error)),
    retryable: true
  };
}

interface FetchEntityDataParams {
  entityId: string;
  entityType?: EntityType;
  skipCache?: boolean;
}

/**
 * Fetch entity data from OpenAlex API
 */
async function fetchEntityData<T extends EntityData = EntityData>({
  entityId,
  entityType,
  skipCache = false
}: FetchEntityDataParams): Promise<T> {
  // Determine entity type
  let detectedType: EntityType;
  if (entityType) {
    detectedType = entityType;
  } else {
    try {
      detectedType = detectEntityType(entityId);
    } catch (error) {
      throw error;
    }
  }

  const normalizedId = normalizeEntityId(entityId, detectedType);
  let result: EntityData;
  
  try {
    switch (detectedType) {
      case EntityType.WORK:
        result = await cachedOpenAlex.work(normalizedId, skipCache);
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
        throw new Error(`Unsupported entity type: ${detectedType}`);
    }
  } catch (apiError) {
    throw apiError;
  }
  
  if (!result) {
    throw new Error(`Entity ${detectedType}:${normalizedId} returned null or undefined`);
  }
  
  return result as T;
}

/**
 * Create a timeout promise that rejects after the specified time
 */
function createTimeoutPromise(timeoutMs: number): Promise<never> {
  return new Promise((_, reject) => {  
    setTimeout(() => {
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

interface FetchEntityDataWithTimeoutParams {
  entityId: string;
  entityType?: EntityType;
  skipCache?: boolean;
  timeoutMs?: number;
}

/**
 * Fetch entity data with timeout support
 */
async function fetchEntityDataWithTimeout<T extends EntityData = EntityData>({
  entityId,
  entityType,
  skipCache = false,
  timeoutMs
}: FetchEntityDataWithTimeoutParams): Promise<T> {
  if (timeoutMs && timeoutMs > 0) {
    // Race the fetch against the timeout
    return Promise.race([
      fetchEntityData<T>({ entityId, entityType, skipCache }),
      createTimeoutPromise(timeoutMs)
    ]);
  } else {
    // No timeout, use regular fetch
    return fetchEntityData<T>({ entityId, entityType, skipCache });
  }
}

/**
 * Schedule an automatic retry if conditions are met
 */
interface ScheduleAutoRetryParams<T extends EntityData> {
  error: EntityError;
  entityId: string;
  entityType: EntityType | undefined;
  opts: Required<UseEntityDataOptions>;
  currentRetryCount: number;
  mountedRef: React.MutableRefObject<boolean>;
  retryTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  setState: React.Dispatch<React.SetStateAction<UseEntityDataState<T>>>;
}

function scheduleAutoRetryIfNeeded<T extends EntityData>({
  error,
  entityId,
  entityType,
  opts,
  currentRetryCount,
  mountedRef,
  retryTimerRef,
  setState
}: ScheduleAutoRetryParams<T>): void {
  // Check if auto-retry should be attempted
  if (!opts.retryOnError || !error.retryable || currentRetryCount >= opts.maxRetries) {
    return;
  }

  // Clear any existing retry timer
  if (retryTimerRef.current) {
    clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
  }

  // Schedule the retry
  retryTimerRef.current = setTimeout(async () => {
    if (!mountedRef.current) {
      return;
    }

    const newRetryCount = currentRetryCount + 1;

    // Update state to indicate retrying
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      state: EntityLoadingState.RETRYING,
      retryCount: newRetryCount
    }));

    try {
      const data = await fetchEntityDataWithTimeout<T>({ entityId, entityType, skipCache: opts.skipCache, timeoutMs: opts.timeout });

      if (!mountedRef.current) {
        return;
      }

      setState(prev => ({
        ...prev,
        data,
        loading: false,
        error: null,
        state: EntityLoadingState.SUCCESS,
        retryCount: 0, // Reset on success
        lastFetchTime: Date.now()
      }));

      opts.onSuccess(data);
    } catch (retryError) {
      if (!mountedRef.current) {
        return;
      }

      const retryEntityError = createEntityError({ error: retryError, entityId });

      setState(prev => ({
        ...prev,
        loading: false,
        error: retryEntityError,
        state: EntityLoadingState.ERROR,
        retryCount: newRetryCount
      }));

      opts.onError(retryEntityError);

      // Schedule another retry if we haven't hit the limit
      scheduleAutoRetryIfNeeded({
        error: retryEntityError,
        entityId,
        entityType,
        opts,
        currentRetryCount: newRetryCount,
        mountedRef,
        retryTimerRef,
        setState
      });
    }
  }, opts.retryDelay);
}

interface UseEntityDataParams<_T extends EntityData = EntityData> {
  entityId: string | null | undefined;
  entityType?: EntityType;
  options?: Partial<UseEntityDataOptions>;
}

/**
 * React hook for fetching OpenAlex entity data client-side
 * 
 * @param params - Object containing entityId, entityType, and options
 * @returns Hook state and control functions
 */
export function useEntityData<T extends EntityData = EntityData>({
  entityId,
  entityType,
  options = {}
}: UseEntityDataParams<T>): UseEntityDataState<T> & {
  /** Manually trigger a refetch */
  refetch: () => Promise<void>;
  /** Retry the last failed request */
  retry: () => Promise<void>;
  /** Reset the hook state */
  reset: () => void;
} {
  // Memoize options with stable references to prevent infinite loops
  const opts = useMemo(() => {
    const result = { ...DEFAULT_OPTIONS };
    
    if (options) {
      // Copy non-function properties
      if (options.enabled !== undefined) result.enabled = options.enabled;
      if (options.retryOnError !== undefined) result.retryOnError = options.retryOnError;
      if (options.maxRetries !== undefined) result.maxRetries = options.maxRetries;
      if (options.retryDelay !== undefined) result.retryDelay = options.retryDelay;
      if (options.timeout !== undefined) result.timeout = options.timeout;
      if (options.skipCache !== undefined) result.skipCache = options.skipCache;
      if (options.refetchOnWindowFocus !== undefined) result.refetchOnWindowFocus = options.refetchOnWindowFocus;
      if (options.staleTime !== undefined) result.staleTime = options.staleTime;
      
      // Use provided callbacks or defaults (but don't include them in deps)
      if (options.onSuccess) result.onSuccess = options.onSuccess;
      if (options.onError) result.onError = options.onError;
    }
    
    return result;
    // Options object and function properties excluded from deps to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    options?.enabled,
    options?.retryOnError,
    options?.maxRetries,
    options?.retryDelay,
    options?.timeout,
    options?.skipCache,
    options?.refetchOnWindowFocus,
    options?.staleTime
  ]);
  
  const [state, setState] = useState<UseEntityDataState<T>>({
    data: null,
    loading: false,
    error: null,
    state: EntityLoadingState.IDLE,
    retryCount: 0,
    lastFetchTime: null
  });

  const mountedRef = useRef(true);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Clear any pending retry timer
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, []);

  // Main fetch effect using stable primitive dependencies
  useEffect(() => {
    if (!opts.enabled || !entityId) {
      setState(prev => ({
        ...prev,
        data: null,
        loading: false,
        error: null,
        state: EntityLoadingState.IDLE
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      state: EntityLoadingState.LOADING
    }));

    // Use the proven working async pattern
    (async () => {
      try {
        const data = await fetchEntityDataWithTimeout<T>({ entityId, entityType, skipCache: opts.skipCache, timeoutMs: opts.timeout });

        if (!mountedRef.current) {
          return;
        }

        setState(prev => ({
          ...prev,
          data,
          loading: false,
          error: null,
          state: EntityLoadingState.SUCCESS,
          retryCount: 0,
          lastFetchTime: Date.now()
        }));

        opts.onSuccess(data);
      } catch (error) {
        if (!mountedRef.current) {
          return;
        }

        const entityError = createEntityError({ error, entityId });
        
        setState(prev => ({
          ...prev,
          loading: false,
          error: entityError,
          state: EntityLoadingState.ERROR,
          retryCount: 0  // Start at 0 - this represents retry attempts, not total attempts
        }));

        opts.onError(entityError);

        // Auto-retry logic - schedule retry if conditions are met
        scheduleAutoRetryIfNeeded({
          error: entityError,
          entityId,
          entityType,
          opts,
          currentRetryCount: 0,
          mountedRef,
          retryTimerRef,
          setState
        });
      }
    })();
    // Intentionally excluded opts from dependencies to prevent infinite loops
    // The opts object is memoized but can still cause re-renders if included
    // onSuccess and onError callbacks are handled via the stable memoized opts reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    entityId, 
    entityType, 
    opts.enabled, 
    opts.skipCache
  ]);

  // Control functions
  const refetch = useCallback(async (): Promise<void> => {
    if (!entityId) return;
    
    // Clear any pending retry timer
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    
    setState(prev => ({ 
      ...prev, 
      loading: true,
      error: null,
      state: EntityLoadingState.LOADING,
      retryCount: 0 
    }));
    
    try {
      const data = await fetchEntityDataWithTimeout<T>({ entityId, entityType, skipCache: true, timeoutMs: opts.timeout }); // Force skip cache with timeout
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          data,
          loading: false,
          error: null,
          state: EntityLoadingState.SUCCESS,
          retryCount: 0, // Reset on success
          lastFetchTime: Date.now()
        }));
      }
    } catch (error) {
      if (mountedRef.current) {
        const entityError = createEntityError({ error, entityId });
        setState(prev => ({
          ...prev,
          loading: false,
          error: entityError,
          state: EntityLoadingState.ERROR,
          retryCount: 0 // Start at 0 for new fetch attempt
        }));
      }
    }
  }, [entityId, entityType, opts.timeout]);

  const retry = useCallback(async (): Promise<void> => {
    if (entityId && (state.error?.retryable || state.error)) {
      // Clear any pending retry timer
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      
      const nextRetryCount = state.retryCount + 1;
      
      setState(prev => ({ 
        ...prev, 
        retryCount: nextRetryCount,
        loading: true, 
        error: null,
        state: EntityLoadingState.RETRYING
      }));
      
      try {
        const data = await fetchEntityDataWithTimeout<T>({ entityId, entityType, skipCache: opts.skipCache, timeoutMs: opts.timeout });
        
        if (mountedRef.current) {
          setState(prev => ({
            ...prev,
            data,
            loading: false,
            error: null,
            state: EntityLoadingState.SUCCESS,
            retryCount: 0, // Reset on success
            lastFetchTime: Date.now()
          }));
        }
      } catch (error) {
        if (mountedRef.current) {
          const entityError = createEntityError({ error, entityId });
          setState(prev => ({
            ...prev,
            loading: false,
            error: entityError,
            state: EntityLoadingState.ERROR,
            retryCount: nextRetryCount // Keep the retry count that was attempted
          }));
        }
      }
    }
  }, [entityId, entityType, state.error, state.retryCount, opts.skipCache, opts.timeout]);

  const reset = useCallback((): void => {
    // Clear any pending retry timer
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
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
interface UseWorkDataParams {
  workId: string | null | undefined;
  options?: Partial<UseEntityDataOptions>;
}

export function useWorkData({ workId, options }: UseWorkDataParams) {
  return useEntityData<Work>({ entityId: workId, entityType: EntityType.WORK, options });
}

/**
 * Specialized hook for fetching authors
 */
interface UseAuthorDataParams {
  authorId: string | null | undefined;
  options?: Partial<UseEntityDataOptions>;
}

export function useAuthorData({ authorId, options }: UseAuthorDataParams) {
  return useEntityData<Author>({ entityId: authorId, entityType: EntityType.AUTHOR, options });
}

/**
 * Specialized hook for fetching sources
 */
interface UseSourceDataParams {
  sourceId: string | null | undefined;
  options?: Partial<UseEntityDataOptions>;
}

export function useSourceData({ sourceId, options }: UseSourceDataParams) {
  return useEntityData<Source>({ entityId: sourceId, entityType: EntityType.SOURCE, options });
}

/**
 * Specialized hook for fetching institutions
 */
interface UseInstitutionDataParams {
  institutionId: string | null | undefined;
  options?: Partial<UseEntityDataOptions>;
}

export function useInstitutionData({ institutionId, options }: UseInstitutionDataParams) {
  return useEntityData<Institution>({ entityId: institutionId, entityType: EntityType.INSTITUTION, options });
}

/**
 * Specialized hook for fetching publishers
 */
interface UsePublisherDataParams {
  publisherId: string | null | undefined;
  options?: Partial<UseEntityDataOptions>;
}

export function usePublisherData({ publisherId, options }: UsePublisherDataParams) {
  return useEntityData<Publisher>({ entityId: publisherId, entityType: EntityType.PUBLISHER, options });
}

/**
 * Specialized hook for fetching funders
 */
interface UseFunderDataParams {
  funderId: string | null | undefined;
  options?: Partial<UseEntityDataOptions>;
}

export function useFunderData({ funderId, options }: UseFunderDataParams) {
  return useEntityData<Funder>({ entityId: funderId, entityType: EntityType.FUNDER, options });
}

/**
 * Specialized hook for fetching topics
 */
interface UseTopicDataParams {
  topicId: string | null | undefined;
  options?: Partial<UseEntityDataOptions>;
}

export function useTopicData({ topicId, options }: UseTopicDataParams) {
  return useEntityData<Topic>({ entityId: topicId, entityType: EntityType.TOPIC, options });
}

/**
 * Specialized hook for fetching concepts
 */
interface UseConceptDataParams {
  conceptId: string | null | undefined;
  options?: Partial<UseEntityDataOptions>;
}

export function useConceptData({ conceptId, options }: UseConceptDataParams) {
  return useEntityData<Concept>({ entityId: conceptId, entityType: EntityType.CONCEPT, options });
}

/**
 * Specialized hook for fetching continents
 */
interface UseContinentDataParams {
  continentId: string | null | undefined;
  options?: Partial<UseEntityDataOptions>;
}

export function useContinentData({ continentId, options }: UseContinentDataParams) {
  return useEntityData<Continent>({ entityId: continentId, entityType: EntityType.CONTINENT, options });
}

/**
 * Specialized hook for fetching keywords
 */
interface UseKeywordDataParams {
  keywordId: string | null | undefined;
  options?: Partial<UseEntityDataOptions>;
}

export function useKeywordData({ keywordId, options }: UseKeywordDataParams) {
  return useEntityData<Keyword>({ entityId: keywordId, entityType: EntityType.KEYWORD, options });
}

/**
 * Specialized hook for fetching regions
 */
interface UseRegionDataParams {
  regionId: string | null | undefined;
  options?: Partial<UseEntityDataOptions>;
}

export function useRegionData({ regionId, options }: UseRegionDataParams) {
  return useEntityData<Region>({ entityId: regionId, entityType: EntityType.REGION, options });
}