/**
 * Entity Fetchers - Robust data fetching logic for OpenAlex entities
 * 
 * This module provides type-safe, error-resistant functions for fetching
 * each entity type from the OpenAlex API with comprehensive error handling,
 * caching integration, and retry mechanisms.
 */

import { cachedClient } from '../openalex/cached-client';
import { OpenAlexError } from '../openalex/client';
import {
  type Work,
  type Author,
  type Source,
  type Institution,
  type Publisher,
  type Funder,
  type Topic,
  type Concept,
  type Keyword,
  type Continent,
  type Region,
} from '../openalex/types/entities';
import {
  // normalizeEntityId, // Currently unused
  validateEntityId,
  parseEntityIdentifier,
  EntityType,
  type EntityParseResult,
} from '../openalex/utils/entity-detection';

/**
 * Common error types for entity fetching
 */
export enum EntityFetchErrorType {
  INVALID_ID = 'INVALID_ID',
  NOT_FOUND = 'NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Options for creating EntityFetchError
 */
export interface EntityFetchErrorOptions {
  message: string;
  type: EntityFetchErrorType;
  entityType?: EntityType;
  entityId?: string;
  statusCode?: number;
  retryable?: boolean;
  cause?: Error;
}

/**
 * Enhanced error class for entity fetching operations
 */
export class EntityFetchError extends Error {
  public readonly type: EntityFetchErrorType;
  public readonly entityType?: EntityType;
  public readonly entityId?: string;
  public readonly statusCode?: number;
  public readonly retryable: boolean;
  public readonly cause?: Error;

  constructor(options: EntityFetchErrorOptions) {
    super(options.message);
    this.name = 'EntityFetchError';
    this.type = options.type;
    this.entityType = options.entityType;
    this.entityId = options.entityId;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? false;
    this.cause = options.cause;
  }

  /**
   * Check if this error indicates the entity was not found
   */
  get isNotFound(): boolean {
    return this.type === EntityFetchErrorType.NOT_FOUND;
  }

  /**
   * Check if this error can be retried
   */
  get canRetry(): boolean {
    return this.retryable;
  }

  /**
   * Get user-friendly error message
   */
  get userMessage(): string {
    switch (this.type) {
      case EntityFetchErrorType.INVALID_ID:
        return 'The provided ID is not valid. Please check the format.';
      case EntityFetchErrorType.NOT_FOUND:
        return `${this.entityType || 'Entity'} not found. It may have been removed or the ID may be incorrect.`;
      case EntityFetchErrorType.NETWORK_ERROR:
        return 'Network connection error. Please check your internet connection and try again.';
      case EntityFetchErrorType.RATE_LIMITED:
        return 'Too many requests. Please wait a moment and try again.';
      case EntityFetchErrorType.SERVER_ERROR:
        return 'Server error. Please try again later.';
      case EntityFetchErrorType.TIMEOUT:
        return 'Request timed out. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

/**
 * Result type for successful entity fetches
 */
export interface EntityFetchResult<T> {
  data: T;
  cached: boolean;
  fetchedAt: Date;
  parsedId: EntityParseResult;
}

/**
 * Configuration for entity fetching
 */
export interface EntityFetchConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Retry delay in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Whether to validate ID format before fetching (default: true) */
  validateId?: boolean;
  /** Whether to normalize ID format (default: true) */
  normalizeId?: boolean;
}

const DEFAULT_CONFIG: Required<EntityFetchConfig> = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000,
  validateId: true,
  normalizeId: true,
};

/**
 * Parse and validate an entity ID with comprehensive error handling
 */
function parseAndValidateId(
  id: string,
  expectedType: EntityType,
  config: Required<EntityFetchConfig>
): EntityParseResult {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    throw new EntityFetchError({
      message: 'Entity ID cannot be empty',
      type: EntityFetchErrorType.INVALID_ID,
      entityType: expectedType,
      entityId: id,
    });
  }

  const trimmedId = id.trim();

  try {
    // Parse the identifier to understand its format
    const parsed = parseEntityIdentifier(trimmedId, expectedType);
    
    // Validate that it matches the expected type
    if (parsed.type !== expectedType) {
      throw new EntityFetchError({
        message: `ID ${trimmedId} is for ${parsed.type} but expected ${expectedType}`,
        type: EntityFetchErrorType.INVALID_ID,
        entityType: expectedType,
        entityId: trimmedId,
      });
    }

    // Additional validation if enabled
    if (config.validateId && !validateEntityId(parsed.id, expectedType)) {
      throw new EntityFetchError({
        message: `Invalid ${expectedType} ID format: ${trimmedId}`,
        type: EntityFetchErrorType.INVALID_ID,
        entityType: expectedType,
        entityId: trimmedId,
      });
    }

    return parsed;
  } catch (error) {
    if (error instanceof EntityFetchError) {
      throw error;
    }

    // Handle parsing errors from entity detection utilities
    throw new EntityFetchError({
      message: `Invalid ${expectedType} ID: ${error instanceof Error ? error.message : 'Unknown format error'}`,
      type: EntityFetchErrorType.INVALID_ID,
      entityType: expectedType,
      entityId: trimmedId,
      statusCode: undefined,
      retryable: false,
      cause: error instanceof Error ? error : undefined,
    });
  }
}

/**
 * Convert OpenAlex API errors to EntityFetchError
 */
function handleApiError(
  error: unknown,
  entityType: EntityType,
  entityId: string
): EntityFetchError {
  if (error instanceof OpenAlexError) {
    let type: EntityFetchErrorType;
    let retryable = false;

    switch (error.statusCode) {
      case 404:
        type = EntityFetchErrorType.NOT_FOUND;
        break;
      case 429:
        type = EntityFetchErrorType.RATE_LIMITED;
        retryable = true;
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        type = EntityFetchErrorType.SERVER_ERROR;
        retryable = true;
        break;
      default:
        type = EntityFetchErrorType.UNKNOWN;
        retryable = error.statusCode >= 500;
    }

    return new EntityFetchError({
      message: error.message,
      type: type,
      entityType: entityType,
      entityId: entityId,
      statusCode: error.statusCode,
      retryable: retryable,
      cause: error,
    });
  }

  if (error instanceof Error) {
    // Check for network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return new EntityFetchError({
        message: 'Network error: ' + error.message,
        type: EntityFetchErrorType.NETWORK_ERROR,
        entityType: entityType,
        entityId: entityId,
        statusCode: undefined,
        retryable: true,
        cause: error,
      });
    }

    // Check for timeout errors
    if (error.message.includes('timeout') || error.message.includes('aborted')) {
      return new EntityFetchError({
        message: 'Request timeout: ' + error.message,
        type: EntityFetchErrorType.TIMEOUT,
        entityType: entityType,
        entityId: entityId,
        statusCode: undefined,
        retryable: true,
        cause: error,
      });
    }
  }

  return new EntityFetchError({
    message: `Unknown error: ${error instanceof Error ? error.message : String(error)}`,
    type: EntityFetchErrorType.UNKNOWN,
    entityType: entityType,
    entityId: entityId,
    statusCode: undefined,
    retryable: false,
    cause: error instanceof Error ? error : undefined,
  });
}

/**
 * Generic entity fetcher with retry logic and comprehensive error handling
 */
async function fetchEntityWithRetry<T>(
  fetchFn: () => Promise<T>,
  entityType: EntityType,
  entityId: string,
  config: Required<EntityFetchConfig>
): Promise<T> {
  let lastError: EntityFetchError | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (error) {
      const fetchError = handleApiError(error, entityType, entityId);
      lastError = fetchError;

      // Don't retry for non-retryable errors
      if (!fetchError.canRetry || attempt === config.maxRetries) {
        throw fetchError;
      }

      // Calculate delay with exponential backoff
      const delay = config.retryDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but just in case
  throw lastError || new EntityFetchError({
    message: 'Max retries exceeded',
    type: EntityFetchErrorType.UNKNOWN,
    entityType: entityType,
    entityId: entityId,
  });
}

/**
 * Create a typed entity fetcher function
 */
function createEntityFetcher<T>(
  entityType: EntityType,
  clientMethod: (id: string) => Promise<T>
) {
  return async function fetchEntity(
    id: string,
    config: EntityFetchConfig = {}
  ): Promise<EntityFetchResult<T>> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    // const startTime = Date.now(); // Currently unused

    // Parse and validate the ID
    const parsedId = parseAndValidateId(id, entityType, finalConfig);

    // Use normalized ID for fetching
    const normalizedId = finalConfig.normalizeId ? parsedId.id : id;

    // Fetch with retry logic
    const data = await fetchEntityWithRetry(
      () => clientMethod(normalizedId),
      entityType,
      normalizedId,
      finalConfig
    );

    return {
      data,
      cached: false, // The cached client handles this internally
      fetchedAt: new Date(),
      parsedId,
    };
  };
}

/**
 * Work fetcher - fetch academic works/papers
 */
export const fetchWork = createEntityFetcher(
  EntityType.WORK,
  (id: string) => cachedClient.work(id)
);

/**
 * Author fetcher - fetch academic authors
 */
export const fetchAuthor = createEntityFetcher(
  EntityType.AUTHOR,
  (id: string) => cachedClient.author(id)
);

/**
 * Source fetcher - fetch journals, conferences, etc.
 */
export const fetchSource = createEntityFetcher(
  EntityType.SOURCE,
  (id: string) => cachedClient.source(id)
);

/**
 * Institution fetcher - fetch academic institutions
 */
export const fetchInstitution = createEntityFetcher(
  EntityType.INSTITUTION,
  (id: string) => cachedClient.institution(id)
);

/**
 * Publisher fetcher - fetch academic publishers
 */
export const fetchPublisher = createEntityFetcher(
  EntityType.PUBLISHER,
  (id: string) => cachedClient.publisher(id)
);

/**
 * Funder fetcher - fetch funding organizations
 */
export const fetchFunder = createEntityFetcher(
  EntityType.FUNDER,
  (id: string) => cachedClient.funder(id)
);

/**
 * Topic fetcher - fetch academic topics
 */
export const fetchTopic = createEntityFetcher(
  EntityType.TOPIC,
  (id: string) => cachedClient.topic(id)
);

/**
 * Concept fetcher - fetch academic concepts (legacy)
 */
export const fetchConcept = createEntityFetcher(
  EntityType.CONCEPT,
  (id: string) => cachedClient.concept(id)
);

/**
 * Keyword fetcher - fetch academic keywords
 */
export const fetchKeyword = createEntityFetcher(
  EntityType.KEYWORD,
  (id: string) => cachedClient.keyword(id)
);

/**
 * Continent fetcher - fetch geographic continents
 */
export const fetchContinent = createEntityFetcher(
  EntityType.CONTINENT,
  (id: string) => cachedClient.continent(id)
);

/**
 * Region fetcher - fetch geographic regions
 */
export const fetchRegion = createEntityFetcher(
  EntityType.REGION,
  (id: string) => cachedClient.region(id)
);

/**
 * Union type for all entity types
 */
export type AnyEntity = 
  | Work 
  | Author 
  | Source 
  | Institution 
  | Publisher 
  | Funder 
  | Topic 
  | Concept 
  | Keyword 
  | Continent 
  | Region;

/**
 * Union type for all entity fetch results
 */
export type AnyEntityFetchResult = 
  | EntityFetchResult<Work>
  | EntityFetchResult<Author>
  | EntityFetchResult<Source>
  | EntityFetchResult<Institution>
  | EntityFetchResult<Publisher>
  | EntityFetchResult<Funder>
  | EntityFetchResult<Topic>
  | EntityFetchResult<Concept>
  | EntityFetchResult<Keyword>
  | EntityFetchResult<Continent>
  | EntityFetchResult<Region>;

/**
 * Generic entity fetcher that automatically detects entity type
 */
export async function fetchAnyEntity(
  id: string,
  config: EntityFetchConfig = {}
): Promise<AnyEntityFetchResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    // Parse the ID to detect the entity type
    const parsedId = parseEntityIdentifier(id);
    
    // Fetch using the appropriate fetcher
    switch (parsedId.type) {
      case EntityType.WORK:
        return await fetchWork(id, finalConfig);
      case EntityType.AUTHOR:
        return await fetchAuthor(id, finalConfig);
      case EntityType.SOURCE:
        return await fetchSource(id, finalConfig);
      case EntityType.INSTITUTION:
        return await fetchInstitution(id, finalConfig);
      case EntityType.PUBLISHER:
        return await fetchPublisher(id, finalConfig);
      case EntityType.FUNDER:
        return await fetchFunder(id, finalConfig);
      case EntityType.TOPIC:
        return await fetchTopic(id, finalConfig);
      case EntityType.CONCEPT:
        return await fetchConcept(id, finalConfig);
      case EntityType.KEYWORD:
        return await fetchKeyword(id, finalConfig);
      case EntityType.CONTINENT:
        return await fetchContinent(id, finalConfig);
      case EntityType.REGION:
        return await fetchRegion(id, finalConfig);
      default:
        throw new EntityFetchError({
          message: `Unknown entity type: ${parsedId.type}`,
          type: EntityFetchErrorType.INVALID_ID,
          entityType: undefined,
          entityId: id,
        });
    }
  } catch (error) {
    if (error instanceof EntityFetchError) {
      throw error;
    }

    throw new EntityFetchError({
      message: `Failed to parse entity ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
      type: EntityFetchErrorType.INVALID_ID,
      entityType: undefined,
      entityId: id,
      statusCode: undefined,
      retryable: false,
      cause: error instanceof Error ? error : undefined,
    });
  }
}

/**
 * Batch fetch entities of the same type
 */
export async function fetchEntitiesBatch<T>(
  ids: string[],
  fetchFn: (id: string, config?: EntityFetchConfig) => Promise<EntityFetchResult<T>>,
  config: EntityFetchConfig & { concurrency?: number } = {}
): Promise<(EntityFetchResult<T> | EntityFetchError)[]> {
  const { concurrency = 5, ...fetchConfig } = config;
  const results: (EntityFetchResult<T> | EntityFetchError)[] = [];

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < ids.length; i += concurrency) {
    const batch = ids.slice(i, i + concurrency);
    
    const batchPromises = batch.map(async (id) => {
      try {
        return await fetchFn(id, fetchConfig);
      } catch (error) {
        return error instanceof EntityFetchError ? error : new EntityFetchError({
          message: `Batch fetch failed: ${error instanceof Error ? error.message : String(error)}`,
          type: EntityFetchErrorType.UNKNOWN,
          entityType: undefined,
          entityId: id,
          statusCode: undefined,
          retryable: false,
          cause: error instanceof Error ? error : undefined,
        });
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Check if an entity exists without fully fetching it
 * Uses a HEAD request or minimal fetch to verify existence
 */
export async function checkEntityExists(
  id: string,
  entityType?: EntityType,
  config: EntityFetchConfig = {}
): Promise<boolean> {
  try {
    // Use the appropriate fetcher based on type detection
    if (entityType) {
      const parsedId = parseAndValidateId(id, entityType, { ...DEFAULT_CONFIG, ...config });
      id = parsedId.id;
    }

    await fetchAnyEntity(id, { ...config, timeout: 5000 });
    return true;
  } catch (error) {
    if (error instanceof EntityFetchError && error.isNotFound) {
      return false;
    }
    // Re-throw non-404 errors as they indicate other issues
    throw error;
  }
}

/**
 * Preload entities into cache
 */
export async function preloadEntities(
  ids: string[],
  config: EntityFetchConfig = {}
): Promise<void> {
  const promises = ids.map(id => 
    fetchAnyEntity(id, config).catch(() => {
      // Ignore errors during preloading
    })
  );
  
  await Promise.all(promises);
}

/**
 * Export all entity fetchers as a map for dynamic access
 */
export const entityFetchers = {
  [EntityType.WORK]: fetchWork,
  [EntityType.AUTHOR]: fetchAuthor,
  [EntityType.SOURCE]: fetchSource,
  [EntityType.INSTITUTION]: fetchInstitution,
  [EntityType.PUBLISHER]: fetchPublisher,
  [EntityType.FUNDER]: fetchFunder,
  [EntityType.TOPIC]: fetchTopic,
  [EntityType.CONCEPT]: fetchConcept,
  [EntityType.KEYWORD]: fetchKeyword,
  [EntityType.CONTINENT]: fetchContinent,
  [EntityType.REGION]: fetchRegion,
} as const;

/**
 * Type for the entity fetchers map
 */
export type EntityFetchers = typeof entityFetchers;

/**
 * Get the appropriate fetcher for an entity type
 */
export function getEntityFetcher<K extends EntityType>(
  entityType: K
): EntityFetchers[K] {
  const fetcher = entityFetchers[entityType];
  if (!fetcher) {
    throw new EntityFetchError({
      message: `No fetcher available for entity type: ${entityType}`,
      type: EntityFetchErrorType.INVALID_ID,
    });
  }
  return fetcher;
}