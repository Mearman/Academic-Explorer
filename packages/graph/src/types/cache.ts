/**
 * Smart caching types and interfaces for the graph package
 * Provides context-aware caching and field selection for OpenAlex entities
 */

/**
 * Cache context enum for determining field selection strategies
 */
export enum CacheContext {
  /** Minimal data needed for displaying node in graph */
  GRAPH_NODE = 'graph_node',
  /** Full entity data needed for detailed views */
  ENTITY_DETAIL = 'entity_detail',
  /** Expanded view with relationships and associated entities */
  ENTITY_EXPANDED = 'entity_expanded',
  /** Search result with relevant display fields */
  SEARCH_RESULT = 'search_result',
  /** Background loading with essential metadata */
  BACKGROUND_LOAD = 'background_load',
  /** Citation network analysis context */
  CITATION_ANALYSIS = 'citation_analysis',
  /** Author collaboration network context */
  COLLABORATION_NETWORK = 'collaboration_network'
}

/**
 * Cache entry metadata for smart caching decisions
 */
export interface CacheEntryMetadata {
  /** When the entry was created */
  createdAt: number;
  /** When the entry was last accessed */
  lastAccessed: number;
  /** Number of times this entry has been accessed */
  accessCount: number;
  /** Context in which this data was cached */
  context: CacheContext;
  /** OpenAlex fields that were selected for this cached data */
  selectedFields: string[];
  /** Estimated data completeness (0-1) */
  completeness: number;
  /** Size of cached data in bytes */
  size: number;
}

/**
 * Smart cache entry with context and metadata
 */
export interface SmartCacheEntry<T = unknown> {
  /** The cached data */
  data: T;
  /** Cache entry metadata */
  metadata: CacheEntryMetadata;
  /** Expiration timestamp (optional) */
  expiresAt?: number;
  /** Dependencies for cache invalidation */
  dependencies?: string[];
}

/**
 * Cache statistics for monitoring and optimization
 */
export interface CacheStatistics {
  /** Total number of cache entries */
  totalEntries: number;
  /** Total cache size in bytes */
  totalSize: number;
  /** Cache hit rate (0-1) */
  hitRate: number;
  /** Cache miss rate (0-1) */
  missRate: number;
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Statistics by context */
  byContext: Record<CacheContext, {
    entries: number;
    size: number;
    hitRate: number;
  }>;
}

/**
 * Configuration for smart entity cache
 */
export interface SmartCacheConfig {
  /** Maximum cache size in bytes */
  maxSize: number;
  /** Default TTL in milliseconds */
  defaultTtl: number;
  /** Maximum number of entries */
  maxEntries: number;
  /** Enable automatic cleanup */
  autoCleanup: boolean;
  /** Cleanup interval in milliseconds */
  cleanupInterval: number;
  /** Minimum access count to avoid eviction */
  minAccessCountForRetention: number;
  /** Context-specific TTL overrides */
  contextTtl: Partial<Record<CacheContext, number>>;
}

/**
 * Field selection strategy configuration
 */
export interface FieldSelectionStrategy {
  /** Context this strategy applies to */
  context: CacheContext;
  /** Required fields that must always be included */
  required: string[];
  /** Optional fields that may be included based on conditions */
  optional: string[];
  /** Fields to exclude from selection */
  excluded: string[];
  /** Maximum number of fields to select */
  maxFields?: number;
  /** Minimum completeness score required (0-1) */
  minCompleteness?: number;
}

/**
 * Cache key generation options
 */
export interface CacheKeyOptions {
  /** Entity ID */
  entityId: string;
  /** Cache context */
  context: CacheContext;
  /** Additional parameters that affect caching */
  parameters?: Record<string, unknown>;
  /** Version for cache busting */
  version?: string;
}

/**
 * Cache invalidation pattern
 */
export interface CacheInvalidationPattern {
  /** Pattern type */
  type: 'exact' | 'prefix' | 'suffix' | 'regex' | 'dependency';
  /** Pattern value */
  pattern: string;
  /** Reason for invalidation */
  reason?: string;
}

/**
 * Cache operation result
 */
export interface CacheOperationResult<T = unknown> {
  /** Whether the operation was successful */
  success: boolean;
  /** The data (if successful) */
  data?: T;
  /** Cache entry metadata (if successful) */
  metadata?: CacheEntryMetadata;
  /** Error message (if failed) */
  error?: string;
  /** Whether data was found in cache */
  fromCache?: boolean;
  /** Cache hit/miss information */
  cacheInfo?: {
    hit: boolean;
    key: string;
    context: CacheContext;
    age: number;
  };
}

/**
 * Events emitted by the smart cache system
 */
export type CacheEvent =
  | { type: 'hit'; key: string; context: CacheContext; metadata: CacheEntryMetadata }
  | { type: 'miss'; key: string; context: CacheContext }
  | { type: 'set'; key: string; context: CacheContext; size: number }
  | { type: 'evict'; key: string; reason: 'size' | 'ttl' | 'manual' | 'dependency' }
  | { type: 'clear'; reason: 'manual' | 'cleanup' | 'overflow' }
  | { type: 'stats'; statistics: CacheStatistics };

/**
 * Cache event handler type
 */
export type CacheEventHandler = (event: CacheEvent) => void;