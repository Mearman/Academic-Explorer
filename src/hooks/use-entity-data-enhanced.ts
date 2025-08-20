/**
 * Enhanced useEntityData hook with network awareness
 * 
 * This enhanced version includes:
 * - Network-aware retry strategies
 * - Offline request queueing
 * - Adaptive timeouts based on connection quality
 * - Connection quality indicators
 * - Background sync support
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
// import type React from 'react'; // Unused import

import { useNetworkContext } from '@/hooks/use-network-context';
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
import type { 
  NetworkStatus as _NetworkStatus,
  ConnectionQuality 
} from '@/types/network';

import { useAdaptiveRetry } from './use-adaptive-retry';

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
  OFFLINE = 'OFFLINE',
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
  networkAware?: boolean;
}

/**
 * Loading states for entity fetching
 */
export enum EntityLoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  RETRYING = 'RETRYING',
  QUEUED = 'QUEUED',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

/**
 * Network information in hook state
 */
export interface NetworkInfo {
  connectionQuality: ConnectionQuality;
  isOnline: boolean;
  isSlowConnection: boolean;
  rtt: number;
  downlink: number;
  saveData: boolean;
}

/**
 * Enhanced hook state interface
 */
export interface UseEntityDataState<T = EntityData> {
  data: T | null;
  loading: boolean;
  error: EntityError | null;
  state: EntityLoadingState;
  retryCount: number;
  lastFetchTime: number | null;
  networkInfo?: NetworkInfo;
  queuedRequestId?: string;
  isQueued: boolean;
}

/**
 * Priority levels for offline queue
 */
export type RequestPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Enhanced hook options interface
 */
export interface UseEntityDataOptions {
  /** Whether to fetch immediately on mount */
  enabled?: boolean;
  /** Whether to automatically retry on retryable errors */
  retryOnError?: boolean;
  /** Maximum number of retry attempts (overridden by network-aware policies) */
  maxRetries?: number;
  /** Base delay between retries in ms (overridden by network-aware policies) */
  retryDelay?: number;
  /** Timeout for requests in ms (overridden by network-aware policies) */
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
  
  // Network awareness options
  /** Enable network-aware retry strategies */
  networkAware?: boolean;
  /** Priority level for offline queueing */
  priority?: RequestPriority;
  /** Whether to persist request for background sync */
  backgroundSync?: boolean;
  /** Whether to adapt caching based on network conditions */
  adaptiveCaching?: boolean;
  /** Whether to provide network status in hook state */
  includeNetworkInfo?: boolean;
}

/**
 * Default options for the enhanced hook
 */
const DEFAULT_OPTIONS: Required<UseEntityDataOptions> = {
  enabled: true,
  retryOnError: true, // Enabled by default with network awareness
  maxRetries: 3, // Will be overridden by network policies
  retryDelay: 1000, // Will be overridden by network policies
  timeout: 10000, // Will be overridden by network policies
  skipCache: false,
  onSuccess: () => {},
  onError: () => {},
  refetchOnWindowFocus: false,
  staleTime: 5 * 60 * 1000, // 5 minutes
  
  // Network awareness defaults
  networkAware: true,
  priority: 'normal',
  backgroundSync: true,
  adaptiveCaching: true,
  includeNetworkInfo: true,
};

/**
 * Convert priority to numeric value
 */
function priorityToNumber(priority: RequestPriority): number {
  switch (priority) {
    case 'critical': return 10;
    case 'high': return 5;
    case 'normal': return 3;
    case 'low': return 1;
    default: return 3;
  }
}

/**
 * Create a user-friendly error from various error types
 */
function createEntityError(
  error: unknown, 
  entityId: string, 
  networkAware: boolean = false
): EntityError {
  if (error instanceof EntityDetectionError) {
    return {
      type: EntityErrorType.INVALID_ID,
      message: `Invalid entity ID format: "${entityId}". Please ensure you're using a valid OpenAlex ID (e.g., W123456789, A987654321).`,
      originalError: error,
      retryable: false,
      networkAware,
    };
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('not found') || message.includes('404')) {
      return {
        type: EntityErrorType.NOT_FOUND,
        message: `Entity "${entityId}" was not found. Please verify the ID is correct and the entity exists in OpenAlex.`,
        originalError: error,
        retryable: false,
        networkAware,
      };
    }
    
    if (message.includes('fetch') || message.includes('network') || message.includes('connection')) {
      return {
        type: EntityErrorType.NETWORK_ERROR,
        message: networkAware 
          ? 'Network connection failed. The request will be retried automatically based on your connection quality.'
          : 'Network connection failed. Please check your internet connection and try again.',
        originalError: error,
        retryable: true,
        networkAware,
      };
    }
    
    if (message.includes('timeout') || message.includes('aborted')) {
      return {
        type: EntityErrorType.TIMEOUT,
        message: networkAware
          ? 'Request timed out. Retry timeouts are adjusted based on your connection speed.'
          : 'Request timed out. The server may be experiencing high load. Please try again.',
        originalError: error,
        retryable: true,
        networkAware,
      };
    }
    
    if (message.includes('rate') || message.includes('429') || message.includes('too many')) {
      return {
        type: EntityErrorType.RATE_LIMITED,
        message: 'Too many requests. Please wait a moment before trying again.',
        originalError: error,
        retryable: true,
        networkAware,
      };
    }
  }

  return {
    type: EntityErrorType.UNKNOWN,
    message: 'An unexpected error occurred while fetching the entity. Please try again.',
    originalError: error instanceof Error ? error : new Error(String(error)),
    retryable: true,
    networkAware,
  };
}

/**
 * Fetch entity data from OpenAlex API
 */
async function fetchEntityData<T extends EntityData = EntityData>(
  entityId: string,
  entityType?: EntityType,
  skipCache: boolean = false
): Promise<T> {
  // Determine entity type
  let detectedType: EntityType;
  if (entityType) {
    detectedType = entityType;
  } else {
    detectedType = detectEntityType(entityId);
  }

  const normalizedId = normalizeEntityId(entityId, detectedType);
  
  console.log(`[fetchEntityData] Fetching ${detectedType}:${normalizedId}, skipCache: ${skipCache}`);
  
  let result: EntityData;
  
  // Route to appropriate client method based on entity type
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
  
  if (!result) {
    throw new Error(`Entity ${detectedType}:${normalizedId} returned null or undefined`);
  }
  
  console.log(`[fetchEntityData] Successfully fetched ${detectedType}:${normalizedId}:`, result.display_name || result.id);
  
  return result as T;
}

interface UseEntityDataParams<_T extends EntityData = EntityData> {
  entityId: string | null | undefined;
  entityType?: EntityType;
  options?: Partial<UseEntityDataOptions>;
}

/**
 * Enhanced React hook for fetching OpenAlex entity data with network awareness
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
  // Merge options with defaults
  const opts = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);
  
  // Network context (optional - graceful fallback if not available)
  // Always call the hook at the top level, but handle the error case gracefully
  let networkContext: ReturnType<typeof useNetworkContext> | null = null;
  let hasNetworkProvider = true;
  
  try {
    // This hook must always be called, so we call it unconditionally
    const networkCtx = useNetworkContext();
    networkContext = networkCtx;
  } catch {
    // Not wrapped in NetworkProvider - continue without network awareness
    hasNetworkProvider = false;
    networkContext = null;
    console.warn('[useEntityData] NetworkProvider not found - running without network awareness');
  }
  
  // Use the network context only if provider is available
  const safeNetworkContext = hasNetworkProvider ? networkContext : null;

  // Get current retry policy if network aware
  const currentRetryPolicy = safeNetworkContext?.getCurrentRetryPolicy();
  const adaptiveRetry = useAdaptiveRetry(currentRetryPolicy || {
    strategy: 'exponential',
    maxRetries: opts.maxRetries,
    baseDelay: opts.retryDelay,
    maxDelay: 30000,
    backoffMultiplier: 2,
    adaptToNetwork: false,
    requestTimeout: opts.timeout,
  });

  const [state, setState] = useState<UseEntityDataState<T>>({
    data: null,
    loading: false,
    error: null,
    state: EntityLoadingState.IDLE,
    retryCount: 0,
    lastFetchTime: null,
    isQueued: false,
  });

  const mountedRef = useRef(true);
  const currentRequestIdRef = useRef<string | null>(null);

  // Include network info if requested
  const networkInfo: NetworkInfo | undefined = useMemo(() => {
    if (opts.includeNetworkInfo && safeNetworkContext?.networkStatus) {
      const { connectionQuality, isOnline, rtt, downlink, saveData } = safeNetworkContext.networkStatus;
      return {
        connectionQuality,
        isOnline,
        isSlowConnection: connectionQuality === 'slow' || connectionQuality === 'verySlow',
        rtt,
        downlink,
        saveData,
      };
    }
    return undefined;
  }, [opts.includeNetworkInfo, safeNetworkContext?.networkStatus]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Cancel any queued request
      if (currentRequestIdRef.current && safeNetworkContext) {
        safeNetworkContext.cancelRequest(currentRequestIdRef.current);
      }
    };
  }, [safeNetworkContext]);

  /**
   * Execute fetch with network awareness
   */
  const executeFetch = useCallback(async (
    id: string,
    type?: EntityType,
    skipCache?: boolean
  ): Promise<T> => {
    // Determine cache strategy based on network conditions
    let shouldSkipCache = skipCache ?? opts.skipCache;
    
    if (opts.adaptiveCaching && networkInfo) {
      if (networkInfo.saveData || networkInfo.isSlowConnection) {
        // Prefer cache on slow connections or data saver mode
        shouldSkipCache = false;
      } else if (networkInfo.connectionQuality === 'fast' && skipCache === undefined) {
        // Allow fresh data on fast connections when not explicitly specified
        shouldSkipCache = false; // Still prefer cache unless explicitly requested
      }
    }

    if (opts.networkAware && safeNetworkContext && adaptiveRetry) {
      // Use adaptive retry with network awareness
      return adaptiveRetry.executeWithRetry(() => 
        fetchEntityData<T>(id, type, shouldSkipCache)
      );
    } else {
      // Standard fetch without network awareness
      return fetchEntityData<T>(id, type, shouldSkipCache);
    }
  }, [opts, networkInfo, safeNetworkContext, adaptiveRetry]);

  /**
   * Queue request for offline processing
   */
  const queueRequest = useCallback((
    id: string,
    type?: EntityType,
    _skipCache?: boolean
  ): string | null => {
    if (!safeNetworkContext) return null;

    const requestId = safeNetworkContext.queueRequest({
      url: `/api/entity/${type || 'auto'}/${id}`,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      maxRetries: opts.maxRetries,
      priority: priorityToNumber(opts.priority),
      persistent: opts.backgroundSync,
    });

    currentRequestIdRef.current = requestId;
    return requestId;
  }, [safeNetworkContext, opts]);

  /**
   * Main fetch logic
   */
  const performFetch = useCallback(async () => {
    if (!opts.enabled || !entityId) return;

    // Check if offline and network aware
    if (opts.networkAware && safeNetworkContext && !safeNetworkContext.networkStatus.isOnline) {
      console.log(`[useEntityData] Offline - queueing request for ${entityId}`);
      
      const queuedId = queueRequest(entityId, entityType, opts.skipCache);
      
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        state: EntityLoadingState.QUEUED,
        queuedRequestId: queuedId || undefined,
        isQueued: true,
        networkInfo,
      }));
      
      return;
    }

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      state: EntityLoadingState.LOADING,
      isQueued: false,
      networkInfo,
    }));

    try {
      const data = await executeFetch(entityId, entityType, opts.skipCache);

      if (!mountedRef.current) return;

      setState(prev => ({
        ...prev,
        data,
        loading: false,
        error: null,
        state: EntityLoadingState.SUCCESS,
        retryCount: 0,
        lastFetchTime: Date.now(),
        networkInfo,
      }));

      opts.onSuccess(data);
    } catch (error) {
      if (!mountedRef.current) return;

      console.error(`[useEntityData] Error fetching entity ${entityId}:`, error);
      
      const entityError = createEntityError(error, entityId, opts.networkAware);
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: entityError,
        state: EntityLoadingState.ERROR,
        retryCount: 0,
        networkInfo,
      }));

      opts.onError(entityError);
    }
  }, [
    opts,
    entityId,
    entityType,
    safeNetworkContext,
    networkInfo,
    executeFetch,
    queueRequest,
  ]);

  // Main fetch effect
  useEffect(() => {
    performFetch();
  }, [performFetch]);

  // Handle coming back online when queued
  useEffect(() => {
    if (
      state.isQueued &&
      safeNetworkContext?.networkStatus.isOnline &&
      state.queuedRequestId
    ) {
      console.log(`[useEntityData] Back online - processing queued request ${state.queuedRequestId}`);
      // The queue will be processed automatically by the network provider
    }
  }, [state.isQueued, state.queuedRequestId, safeNetworkContext?.networkStatus.isOnline]);

  /**
   * Manual refetch function
   */
  const refetch = useCallback(async (): Promise<void> => {
    if (!entityId) return;
    
    // Cancel any queued request
    if (currentRequestIdRef.current && safeNetworkContext) {
      safeNetworkContext.cancelRequest(currentRequestIdRef.current);
      currentRequestIdRef.current = null;
    }
    
    setState(prev => ({ 
      ...prev, 
      loading: true,
      error: null,
      state: EntityLoadingState.LOADING,
      retryCount: 0,
      isQueued: false,
      queuedRequestId: undefined,
      networkInfo,
    }));
    
    try {
      const data = await executeFetch(entityId, entityType, true); // Force skip cache on refetch
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          data,
          loading: false,
          error: null,
          state: EntityLoadingState.SUCCESS,
          retryCount: 0,
          lastFetchTime: Date.now(),
          networkInfo,
        }));
      }
    } catch (error) {
      if (mountedRef.current) {
        const entityError = createEntityError(error, entityId, opts.networkAware);
        setState(prev => ({
          ...prev,
          loading: false,
          error: entityError,
          state: EntityLoadingState.ERROR,
          retryCount: 0,
          networkInfo,
        }));
      }
    }
  }, [entityId, entityType, safeNetworkContext, networkInfo, executeFetch, opts.networkAware]);

  /**
   * Manual retry function
   */
  const retry = useCallback(async (): Promise<void> => {
    if (!entityId || !state.error?.retryable) return;
    
    const nextRetryCount = state.retryCount + 1;
    
    setState(prev => ({ 
      ...prev, 
      retryCount: nextRetryCount,
      loading: true, 
      error: null,
      state: EntityLoadingState.RETRYING,
      isQueued: false,
      networkInfo,
    }));
    
    try {
      const data = await executeFetch(entityId, entityType, opts.skipCache);
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          data,
          loading: false,
          error: null,
          state: EntityLoadingState.SUCCESS,
          retryCount: 0,
          lastFetchTime: Date.now(),
          networkInfo,
        }));
      }
    } catch (error) {
      if (mountedRef.current) {
        const entityError = createEntityError(error, entityId, opts.networkAware);
        setState(prev => ({
          ...prev,
          loading: false,
          error: entityError,
          state: EntityLoadingState.ERROR,
          retryCount: nextRetryCount,
          networkInfo,
        }));
      }
    }
  }, [entityId, entityType, state.error, state.retryCount, networkInfo, executeFetch, opts]);

  /**
   * Reset function
   */
  const reset = useCallback((): void => {
    // Cancel any queued request
    if (currentRequestIdRef.current && safeNetworkContext) {
      safeNetworkContext.cancelRequest(currentRequestIdRef.current);
      currentRequestIdRef.current = null;
    }
    
    setState({
      data: null,
      loading: false,
      error: null,
      state: EntityLoadingState.IDLE,
      retryCount: 0,
      lastFetchTime: null,
      isQueued: false,
      networkInfo,
    });
  }, [safeNetworkContext, networkInfo]);

  return {
    ...state,
    networkInfo,
    refetch,
    retry,
    reset,
  };
}