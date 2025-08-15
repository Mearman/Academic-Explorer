/**
 * Client-side entity service for static Next.js exports
 * 
 * This service provides functions for fetching OpenAlex entities with comprehensive
 * error handling, type safety, and support for both prefixed and clean IDs.
 * Designed for browser-only operation with static export compatibility.
 */

'use client';

import { cachedOpenAlex } from '@/lib/openalex';
import type { 
  Work, 
  Author, 
  Source, 
  Institution, 
  Publisher, 
  Funder, 
  Topic,
  // ApiResponse // Currently unused
} from '@/lib/openalex/types';
import { 
  EntityType, 
  detectEntityType, 
  normalizeEntityId, 
  // validateEntityId, // Currently unused
  EntityDetectionError,
  parseEntityIdentifier,
  // isValidEntityIdentifier // Currently unused
} from '@/lib/openalex/utils/entity-detection';

/**
 * Union type for all possible entity data types
 */
export type EntityData = Work | Author | Source | Institution | Publisher | Funder | Topic;

/**
 * Service error types with specific categorization
 */
export enum ServiceErrorType {
  INVALID_ID = 'INVALID_ID',
  NOT_FOUND = 'NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',
  FORBIDDEN = 'FORBIDDEN',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Comprehensive service error interface
 */
export interface ServiceError extends Error {
  type: ServiceErrorType;
  statusCode?: number;
  retryable: boolean;
  userMessage: string;
  technicalMessage: string;
  entityId?: string;
  entityType?: EntityType;
  timestamp: number;
}

/**
 * Service response wrapper for type safety
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  cached?: boolean;
  fetchTime: number;
}

/**
 * Options for entity fetching
 */
export interface EntityFetchOptions {
  /** Skip cache for this request */
  skipCache?: boolean;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether to throw errors or return them in response */
  throwOnError?: boolean;
}

/**
 * Default fetch options
 */
const DEFAULT_FETCH_OPTIONS: Required<EntityFetchOptions> = {
  skipCache: false,
  timeout: 30000,
  throwOnError: false
};

/**
 * Create a comprehensive service error from various error types
 */
function createServiceError(
  error: unknown,
  entityId?: string,
  entityType?: EntityType
): ServiceError {
  const timestamp = Date.now();
  
  // Handle ID validation errors
  if (error instanceof EntityDetectionError) {
    const serviceError = new Error(error.message) as ServiceError;
    serviceError.type = ServiceErrorType.INVALID_ID;
    serviceError.retryable = false;
    serviceError.userMessage = `Invalid entity ID format: "${entityId}". Please ensure you're using a valid OpenAlex ID (e.g., W123456789, A987654321).`;
    serviceError.technicalMessage = error.message;
    serviceError.entityId = entityId;
    serviceError.entityType = entityType;
    serviceError.timestamp = timestamp;
    return serviceError;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const serviceError = new Error(error.message) as ServiceError;
    serviceError.entityId = entityId;
    serviceError.entityType = entityType;
    serviceError.timestamp = timestamp;
    
    // Detect error type from message and context
    if (message.includes('not found') || message.includes('404')) {
      serviceError.type = ServiceErrorType.NOT_FOUND;
      serviceError.statusCode = 404;
      serviceError.retryable = false;
      serviceError.userMessage = `Entity "${entityId}" was not found. Please verify the ID is correct and the entity exists in OpenAlex.`;
      serviceError.technicalMessage = error.message;
    } else if (message.includes('forbidden') || message.includes('403')) {
      serviceError.type = ServiceErrorType.FORBIDDEN;
      serviceError.statusCode = 403;
      serviceError.retryable = false;
      serviceError.userMessage = 'Access to this entity is forbidden. You may not have permission to view this resource.';
      serviceError.technicalMessage = error.message;
    } else if (message.includes('rate') || message.includes('429') || message.includes('too many')) {
      serviceError.type = ServiceErrorType.RATE_LIMITED;
      serviceError.statusCode = 429;
      serviceError.retryable = true;
      serviceError.userMessage = 'Too many requests. Please wait a moment before trying again.';
      serviceError.technicalMessage = error.message;
    } else if (message.includes('timeout') || message.includes('aborted')) {
      serviceError.type = ServiceErrorType.TIMEOUT;
      serviceError.retryable = true;
      serviceError.userMessage = 'Request timed out. The server may be experiencing high load. Please try again.';
      serviceError.technicalMessage = error.message;
    } else if (message.includes('fetch') || message.includes('network') || message.includes('connection')) {
      serviceError.type = ServiceErrorType.NETWORK_ERROR;
      serviceError.retryable = true;
      serviceError.userMessage = 'Network connection failed. Please check your internet connection and try again.';
      serviceError.technicalMessage = error.message;
    } else if (message.includes('server') || message.includes('500') || message.includes('502') || message.includes('503')) {
      serviceError.type = ServiceErrorType.SERVER_ERROR;
      serviceError.statusCode = 500;
      serviceError.retryable = true;
      serviceError.userMessage = 'Server error occurred. Please try again later.';
      serviceError.technicalMessage = error.message;
    } else {
      serviceError.type = ServiceErrorType.UNKNOWN;
      serviceError.retryable = true;
      serviceError.userMessage = 'An unexpected error occurred while fetching the entity. Please try again.';
      serviceError.technicalMessage = error.message;
    }
    
    return serviceError;
  }

  // Default unknown error
  const serviceError = new Error(String(error)) as ServiceError;
  serviceError.type = ServiceErrorType.UNKNOWN;
  serviceError.retryable = true;
  serviceError.userMessage = 'An unexpected error occurred while fetching the entity. Please try again.';
  serviceError.technicalMessage = String(error);
  serviceError.entityId = entityId;
  serviceError.entityType = entityType;
  serviceError.timestamp = timestamp;
  return serviceError;
}

/**
 * Validate and normalize entity ID with comprehensive checking
 */
function validateAndNormalizeId(
  id: string,
  entityType?: EntityType
): { normalizedId: string; detectedType: EntityType } {
  if (!id || typeof id !== 'string' || !id.trim()) {
    throw new EntityDetectionError('Entity ID cannot be empty');
  }

  const trimmedId = id.trim();

  // Try to parse the identifier
  try {
    const parsed = parseEntityIdentifier(trimmedId, entityType);
    
    // If entityType was provided, validate it matches
    if (entityType && parsed.type !== entityType) {
      throw new EntityDetectionError(
        `Entity ID "${trimmedId}" is of type ${parsed.type}, but ${entityType} was expected`
      );
    }
    
    return {
      normalizedId: parsed.id,
      detectedType: parsed.type
    };
  } catch (error) {
    // If parsing failed and we have a fallback type, try with that
    if (entityType && /^\d+$/.test(trimmedId)) {
      try {
        const normalizedId = normalizeEntityId(trimmedId, entityType);
        return {
          normalizedId,
          detectedType: entityType
        };
      } catch {
        // Fall through to original error
      }
    }
    
    throw error;
  }
}

/**
 * Execute entity fetch with timeout and error handling
 */
async function executeEntityFetch<T extends EntityData>(
  fetchFn: () => Promise<T>,
  entityId: string,
  entityType: EntityType,
  timeout: number
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const result = await fetchFn();
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle abort as timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    
    throw error;
  }
}

/**
 * Generic entity fetcher with comprehensive error handling
 */
async function fetchEntity<T extends EntityData>(
  entityId: string,
  entityType?: EntityType,
  options: EntityFetchOptions = {}
): Promise<ServiceResponse<T>> {
  const opts = { ...DEFAULT_FETCH_OPTIONS, ...options };
  const fetchTime = Date.now();

  try {
    // Validate and normalize the ID
    const { normalizedId, detectedType } = validateAndNormalizeId(entityId, entityType);

    // Route to appropriate client method based on entity type
    let fetchFn: () => Promise<T>;
    
    switch (detectedType) {
      case EntityType.WORK:
        fetchFn = () => cachedOpenAlex.work(normalizedId, opts.skipCache) as Promise<T>;
        break;
      case EntityType.AUTHOR:
        fetchFn = () => cachedOpenAlex.author(normalizedId, opts.skipCache) as Promise<T>;
        break;
      case EntityType.SOURCE:
        fetchFn = () => cachedOpenAlex.source(normalizedId, opts.skipCache) as Promise<T>;
        break;
      case EntityType.INSTITUTION:
        fetchFn = () => cachedOpenAlex.institution(normalizedId, opts.skipCache) as Promise<T>;
        break;
      case EntityType.PUBLISHER:
        fetchFn = () => cachedOpenAlex.publisher(normalizedId, opts.skipCache) as Promise<T>;
        break;
      case EntityType.FUNDER:
        fetchFn = () => cachedOpenAlex.funder(normalizedId, opts.skipCache) as Promise<T>;
        break;
      case EntityType.TOPIC:
        fetchFn = () => cachedOpenAlex.topic(normalizedId, opts.skipCache) as Promise<T>;
        break;
      default:
        throw new Error(`Unsupported entity type: ${detectedType}`);
    }

    const data = await executeEntityFetch(fetchFn, entityId, detectedType, opts.timeout);

    return {
      success: true,
      data,
      cached: !opts.skipCache,
      fetchTime
    };
  } catch (error) {
    const serviceError = createServiceError(error, entityId, entityType);
    
    if (opts.throwOnError) {
      throw serviceError;
    }
    
    return {
      success: false,
      error: serviceError,
      fetchTime
    };
  }
}

/**
 * Fetch a work entity
 */
export async function fetchWork(
  workId: string,
  options?: EntityFetchOptions
): Promise<ServiceResponse<Work>> {
  return fetchEntity<Work>(workId, EntityType.WORK, options);
}

/**
 * Fetch an author entity
 */
export async function fetchAuthor(
  authorId: string,
  options?: EntityFetchOptions
): Promise<ServiceResponse<Author>> {
  return fetchEntity<Author>(authorId, EntityType.AUTHOR, options);
}

/**
 * Fetch a source entity
 */
export async function fetchSource(
  sourceId: string,
  options?: EntityFetchOptions
): Promise<ServiceResponse<Source>> {
  return fetchEntity<Source>(sourceId, EntityType.SOURCE, options);
}

/**
 * Fetch an institution entity
 */
export async function fetchInstitution(
  institutionId: string,
  options?: EntityFetchOptions
): Promise<ServiceResponse<Institution>> {
  return fetchEntity<Institution>(institutionId, EntityType.INSTITUTION, options);
}

/**
 * Fetch a publisher entity
 */
export async function fetchPublisher(
  publisherId: string,
  options?: EntityFetchOptions
): Promise<ServiceResponse<Publisher>> {
  return fetchEntity<Publisher>(publisherId, EntityType.PUBLISHER, options);
}

/**
 * Fetch a funder entity
 */
export async function fetchFunder(
  funderId: string,
  options?: EntityFetchOptions
): Promise<ServiceResponse<Funder>> {
  return fetchEntity<Funder>(funderId, EntityType.FUNDER, options);
}

/**
 * Fetch a topic entity
 */
export async function fetchTopic(
  topicId: string,
  options?: EntityFetchOptions
): Promise<ServiceResponse<Topic>> {
  return fetchEntity<Topic>(topicId, EntityType.TOPIC, options);
}

/**
 * Generic entity fetcher that auto-detects type
 */
export async function fetchAnyEntity(
  entityId: string,
  options?: EntityFetchOptions
): Promise<ServiceResponse<EntityData>> {
  return fetchEntity<EntityData>(entityId, undefined, options);
}

/**
 * Batch fetch multiple entities of the same type
 */
export async function fetchEntitiesBatch<T extends EntityData>(
  entityIds: string[],
  entityType: EntityType,
  options: EntityFetchOptions = {}
): Promise<{
  results: Record<string, ServiceResponse<T>>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    cached: number;
  };
}> {
  const results: Record<string, ServiceResponse<T>> = {};
  
  const promises = entityIds.map(async (id) => {
    const response = await fetchEntity<T>(id, entityType, options);
    results[id] = response;
    return response;
  });

  await Promise.allSettled(promises);

  // Calculate summary statistics
  const responses = Object.values(results);
  const summary = {
    total: entityIds.length,
    successful: responses.filter(r => r.success).length,
    failed: responses.filter(r => !r.success).length,
    cached: responses.filter(r => r.cached).length
  };

  return { results, summary };
}

/**
 * Fetch entities with automatic retry logic
 */
export async function fetchEntityWithRetry<T extends EntityData>(
  entityId: string,
  entityType?: EntityType,
  options: EntityFetchOptions & {
    maxRetries?: number;
    retryDelay?: number;
  } = {}
): Promise<ServiceResponse<T>> {
  const { maxRetries = 3, retryDelay = 1000, ...fetchOptions } = options;
  
  let lastError: ServiceError | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetchEntity<T>(entityId, entityType, fetchOptions);
    
    if (response.success || !response.error?.retryable) {
      return response;
    }
    
    lastError = response.error;
    
    // Wait before retrying (exponential backoff)
    if (attempt < maxRetries) {
      const delay = Math.min(retryDelay * Math.pow(2, attempt), 30000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return {
    success: false,
    error: lastError!,
    fetchTime: Date.now()
  };
}

/**
 * Validate entity ID format without fetching
 */
export function validateEntityIdFormat(
  entityId: string,
  entityType?: EntityType
): {
  valid: boolean;
  error?: string;
  normalizedId?: string;
  detectedType?: EntityType;
} {
  try {
    const { normalizedId, detectedType } = validateAndNormalizeId(entityId, entityType);
    return {
      valid: true,
      normalizedId,
      detectedType
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Check if an entity exists without fully fetching it (HEAD request equivalent)
 * Note: OpenAlex doesn't support HEAD requests, so this does a minimal fetch
 */
export async function checkEntityExists(
  entityId: string,
  entityType?: EntityType,
  options?: Pick<EntityFetchOptions, 'timeout'>
): Promise<{
  exists: boolean;
  error?: ServiceError;
}> {
  try {
    const response = await fetchEntity(entityId, entityType, {
      ...options,
      throwOnError: false
    });
    
    if (response.success) {
      return { exists: true };
    }
    
    if (response.error?.type === ServiceErrorType.NOT_FOUND) {
      return { exists: false };
    }
    
    return { exists: false, error: response.error };
  } catch (error) {
    return { 
      exists: false, 
      error: createServiceError(error, entityId, entityType) 
    };
  }
}

/**
 * Get entity type from ID without fetching
 */
export function getEntityTypeFromId(entityId: string): {
  type?: EntityType;
  error?: string;
} {
  try {
    const type = detectEntityType(entityId);
    return { type };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

/**
 * Service utility functions
 */
export const EntityService = {
  // Core fetch functions
  fetchWork,
  fetchAuthor,
  fetchSource,
  fetchInstitution,
  fetchPublisher,
  fetchFunder,
  fetchTopic,
  fetchAnyEntity,
  
  // Batch operations
  fetchEntitiesBatch,
  fetchEntityWithRetry,
  
  // Validation utilities
  validateEntityIdFormat,
  checkEntityExists,
  getEntityTypeFromId,
  
  // Error handling
  createServiceError,
  
  // Constants
  ErrorType: ServiceErrorType,
  DefaultOptions: DEFAULT_FETCH_OPTIONS
} as const;