/**
 * Cache strategies for Academic Explorer
 *
 * Defines environment-specific cache strategies and behaviors.
 * Provides type-safe cache strategy selection based on environment detection.
 */

import { EnvironmentMode, type BuildContext } from './environment-detector.js';

/**
 * Cache strategy enumeration
 * Defines how caching should behave in different environments
 */
export enum CacheStrategy {
  /** Development: Write cache to disk, read from memory first */
  DEVELOPMENT_DISK_WRITE = 'development_disk_write',

  /** Development: Memory-only caching, no persistence */
  DEVELOPMENT_MEMORY_ONLY = 'development_memory_only',

  /** Production: Read from GitHub Pages static files */
  PRODUCTION_GITHUB_READ = 'production_github_read',

  /** Production: Hybrid cache with IndexedDB persistence */
  PRODUCTION_HYBRID_CACHE = 'production_hybrid_cache',

  /** Test: Mock responses, no real caching */
  TEST_MOCK_RESPONSES = 'test_mock_responses',

  /** Test: In-memory cache for testing cache logic */
  TEST_MEMORY_CACHE = 'test_memory_cache',

  /** Research: Long-term persistent cache optimized for academic use */
  RESEARCH_PERSISTENT = 'research_persistent',

  /** Offline: Use only cached data, no network requests */
  OFFLINE_CACHE_ONLY = 'offline_cache_only',

  /** Debug: Verbose logging and cache inspection */
  DEBUG_VERBOSE = 'debug_verbose'
}

/**
 * Cache operation modes
 */
export enum CacheOperation {
  /** Read from cache, fetch if missing */
  READ_THROUGH = 'read_through',

  /** Write to cache when data is fetched */
  WRITE_THROUGH = 'write_through',

  /** Write to cache asynchronously */
  WRITE_BEHIND = 'write_behind',

  /** Cache only, never fetch */
  CACHE_ONLY = 'cache_only',

  /** Network only, never cache */
  NETWORK_ONLY = 'network_only',

  /** Cache first, fallback to network */
  CACHE_FIRST = 'cache_first',

  /** Network first, fallback to cache */
  NETWORK_FIRST = 'network_first',

  /** Invalidate and refresh cache */
  INVALIDATE_REFRESH = 'invalidate_refresh'
}

/**
 * Cache priority levels
 */
export enum CachePriority {
  /** Critical data that should never be evicted */
  CRITICAL = 'critical',

  /** High priority data */
  HIGH = 'high',

  /** Normal priority data */
  NORMAL = 'normal',

  /** Low priority data, can be evicted */
  LOW = 'low',

  /** Temporary data, evict first */
  TEMPORARY = 'temporary'
}

/**
 * Cache storage types
 */
export enum CacheStorageType {
  /** In-memory storage (fastest, not persistent) */
  MEMORY = 'memory',

  /** Local storage (persistent, size limited) */
  LOCAL_STORAGE = 'local_storage',

  /** IndexedDB (persistent, large capacity) */
  INDEXED_DB = 'indexed_db',

  /** Static file cache (read-only, CDN-friendly) */
  STATIC_FILE = 'static_file',

  /** Service Worker cache (offline-capable) */
  SERVICE_WORKER = 'service_worker',

  /** Mock storage (for testing) */
  MOCK = 'mock'
}

/**
 * Cache strategy configuration
 */
export interface CacheStrategyConfig {
  /** Primary cache strategy */
  strategy: CacheStrategy;

  /** Supported cache operations */
  operations: CacheOperation[];

  /** Storage type preference */
  storageType: CacheStorageType;

  /** Fallback storage types */
  fallbackStorageTypes: CacheStorageType[];

  /** Default cache priority */
  defaultPriority: CachePriority;

  /** Whether to enable background sync */
  backgroundSync: boolean;

  /** Whether to enable compression */
  compression: boolean;

  /** Whether to enable encryption */
  encryption: boolean;

  /** TTL (time to live) in milliseconds */
  ttl: number;

  /** Maximum cache size in bytes */
  maxSize: number;

  /** Whether to enable debug logging */
  debug: boolean;

  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Cache strategy selector based on environment
 */
export class CacheStrategySelector {

  /**
   * Get default cache strategy for environment mode
   */
  static getDefaultStrategy(mode: EnvironmentMode): CacheStrategy {
    switch (mode) {
      case EnvironmentMode.DEVELOPMENT:
        return CacheStrategy.DEVELOPMENT_DISK_WRITE;

      case EnvironmentMode.PRODUCTION:
        return CacheStrategy.PRODUCTION_GITHUB_READ;

      case EnvironmentMode.TEST:
        return CacheStrategy.TEST_MEMORY_CACHE;

      default:
        return CacheStrategy.DEVELOPMENT_MEMORY_ONLY;
    }
  }

  /**
   * Get cache strategy configuration for specific strategy
   */
  static getStrategyConfig(strategy: CacheStrategy): CacheStrategyConfig {
    switch (strategy) {
      case CacheStrategy.DEVELOPMENT_DISK_WRITE:
        return {
          strategy,
          operations: [
            CacheOperation.READ_THROUGH,
            CacheOperation.WRITE_THROUGH,
            CacheOperation.INVALIDATE_REFRESH
          ],
          storageType: CacheStorageType.INDEXED_DB,
          fallbackStorageTypes: [CacheStorageType.LOCAL_STORAGE, CacheStorageType.MEMORY],
          defaultPriority: CachePriority.NORMAL,
          backgroundSync: false,
          compression: false,
          encryption: false,
          ttl: 10 * 60 * 1000, // 10 minutes
          maxSize: 50 * 1024 * 1024, // 50MB
          debug: true
        };

      case CacheStrategy.DEVELOPMENT_MEMORY_ONLY:
        return {
          strategy,
          operations: [
            CacheOperation.READ_THROUGH,
            CacheOperation.WRITE_THROUGH
          ],
          storageType: CacheStorageType.MEMORY,
          fallbackStorageTypes: [],
          defaultPriority: CachePriority.NORMAL,
          backgroundSync: false,
          compression: false,
          encryption: false,
          ttl: 5 * 60 * 1000, // 5 minutes
          maxSize: 25 * 1024 * 1024, // 25MB
          debug: true
        };

      case CacheStrategy.PRODUCTION_GITHUB_READ:
        return {
          strategy,
          operations: [
            CacheOperation.CACHE_FIRST,
            CacheOperation.READ_THROUGH
          ],
          storageType: CacheStorageType.STATIC_FILE,
          fallbackStorageTypes: [CacheStorageType.INDEXED_DB, CacheStorageType.LOCAL_STORAGE],
          defaultPriority: CachePriority.HIGH,
          backgroundSync: true,
          compression: true,
          encryption: false,
          ttl: 24 * 60 * 60 * 1000, // 24 hours
          maxSize: 200 * 1024 * 1024, // 200MB
          debug: false
        };

      case CacheStrategy.PRODUCTION_HYBRID_CACHE:
        return {
          strategy,
          operations: [
            CacheOperation.READ_THROUGH,
            CacheOperation.WRITE_BEHIND,
            CacheOperation.CACHE_FIRST
          ],
          storageType: CacheStorageType.INDEXED_DB,
          fallbackStorageTypes: [CacheStorageType.LOCAL_STORAGE, CacheStorageType.MEMORY],
          defaultPriority: CachePriority.HIGH,
          backgroundSync: true,
          compression: true,
          encryption: false,
          ttl: 24 * 60 * 60 * 1000, // 24 hours
          maxSize: 200 * 1024 * 1024, // 200MB
          debug: false
        };

      case CacheStrategy.TEST_MOCK_RESPONSES:
        return {
          strategy,
          operations: [
            CacheOperation.CACHE_ONLY
          ],
          storageType: CacheStorageType.MOCK,
          fallbackStorageTypes: [],
          defaultPriority: CachePriority.NORMAL,
          backgroundSync: false,
          compression: false,
          encryption: false,
          ttl: 1000, // 1 second
          maxSize: 1024 * 1024, // 1MB
          debug: false
        };

      case CacheStrategy.TEST_MEMORY_CACHE:
        return {
          strategy,
          operations: [
            CacheOperation.READ_THROUGH,
            CacheOperation.WRITE_THROUGH
          ],
          storageType: CacheStorageType.MEMORY,
          fallbackStorageTypes: [],
          defaultPriority: CachePriority.NORMAL,
          backgroundSync: false,
          compression: false,
          encryption: false,
          ttl: 30 * 1000, // 30 seconds
          maxSize: 5 * 1024 * 1024, // 5MB
          debug: false
        };

      case CacheStrategy.RESEARCH_PERSISTENT:
        return {
          strategy,
          operations: [
            CacheOperation.READ_THROUGH,
            CacheOperation.WRITE_THROUGH,
            CacheOperation.CACHE_FIRST
          ],
          storageType: CacheStorageType.INDEXED_DB,
          fallbackStorageTypes: [CacheStorageType.LOCAL_STORAGE],
          defaultPriority: CachePriority.CRITICAL,
          backgroundSync: true,
          compression: true,
          encryption: false,
          ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
          maxSize: 500 * 1024 * 1024, // 500MB
          debug: true,
          metadata: {
            researchMode: true,
            ethicalUse: true
          }
        };

      case CacheStrategy.OFFLINE_CACHE_ONLY:
        return {
          strategy,
          operations: [
            CacheOperation.CACHE_ONLY
          ],
          storageType: CacheStorageType.INDEXED_DB,
          fallbackStorageTypes: [CacheStorageType.LOCAL_STORAGE, CacheStorageType.MEMORY],
          defaultPriority: CachePriority.CRITICAL,
          backgroundSync: false,
          compression: true,
          encryption: false,
          ttl: Number.MAX_SAFE_INTEGER, // Never expire
          maxSize: 1024 * 1024 * 1024, // 1GB
          debug: false
        };

      case CacheStrategy.DEBUG_VERBOSE:
        return {
          strategy,
          operations: [
            CacheOperation.READ_THROUGH,
            CacheOperation.WRITE_THROUGH,
            CacheOperation.INVALIDATE_REFRESH
          ],
          storageType: CacheStorageType.MEMORY,
          fallbackStorageTypes: [CacheStorageType.INDEXED_DB],
          defaultPriority: CachePriority.NORMAL,
          backgroundSync: false,
          compression: false,
          encryption: false,
          ttl: 2 * 60 * 1000, // 2 minutes
          maxSize: 10 * 1024 * 1024, // 10MB
          debug: true,
          metadata: {
            verboseLogging: true,
            performanceMetrics: true
          }
        };

      default:
        // Fallback to safe defaults
        return {
          strategy: CacheStrategy.DEVELOPMENT_MEMORY_ONLY,
          operations: [CacheOperation.READ_THROUGH],
          storageType: CacheStorageType.MEMORY,
          fallbackStorageTypes: [],
          defaultPriority: CachePriority.NORMAL,
          backgroundSync: false,
          compression: false,
          encryption: false,
          ttl: 5 * 60 * 1000,
          maxSize: 10 * 1024 * 1024,
          debug: false
        };
    }
  }

  /**
   * Select optimal cache strategy based on build context
   */
  static selectStrategy(
    context: BuildContext,
    options?: {
      useCase?: 'research' | 'production' | 'development' | 'testing';
      offline?: boolean;
      debug?: boolean;
    }
  ): CacheStrategy {
    const { useCase, offline, debug } = options || {};

    // Handle special cases
    if (offline) {
      return CacheStrategy.OFFLINE_CACHE_ONLY;
    }

    if (debug) {
      return CacheStrategy.DEBUG_VERBOSE;
    }

    // Handle use case overrides
    if (useCase === 'research') {
      return CacheStrategy.RESEARCH_PERSISTENT;
    }

    if (useCase === 'testing' || context.isTest) {
      return CacheStrategy.TEST_MEMORY_CACHE;
    }

    // Environment-based selection
    if (context.isDevelopment) {
      if (context.isDevServer) {
        return CacheStrategy.DEVELOPMENT_DISK_WRITE;
      }
      return CacheStrategy.DEVELOPMENT_MEMORY_ONLY;
    }

    if (context.isProduction) {
      if (context.isGitHubPages) {
        return CacheStrategy.PRODUCTION_GITHUB_READ;
      }
      return CacheStrategy.PRODUCTION_HYBRID_CACHE;
    }

    // Default fallback
    return CacheStrategy.DEVELOPMENT_MEMORY_ONLY;
  }

  /**
   * Get all available strategies for current environment
   */
  static getAvailableStrategies(context: BuildContext): CacheStrategy[] {
    const strategies: CacheStrategy[] = [];

    // Always available
    strategies.push(
      CacheStrategy.DEVELOPMENT_MEMORY_ONLY,
      CacheStrategy.DEBUG_VERBOSE
    );

    if (context.isDevelopment) {
      strategies.push(
        CacheStrategy.DEVELOPMENT_DISK_WRITE,
        CacheStrategy.RESEARCH_PERSISTENT
      );
    }

    if (context.isProduction) {
      strategies.push(
        CacheStrategy.PRODUCTION_HYBRID_CACHE
      );

      if (context.isGitHubPages) {
        strategies.push(CacheStrategy.PRODUCTION_GITHUB_READ);
      }
    }

    if (context.isTest) {
      strategies.push(
        CacheStrategy.TEST_MEMORY_CACHE,
        CacheStrategy.TEST_MOCK_RESPONSES
      );
    }

    // Offline support (if service worker available)
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      strategies.push(CacheStrategy.OFFLINE_CACHE_ONLY);
    }

    return strategies;
  }
}

/**
 * Convenience function to get cache strategy for current environment
 */
export function getCurrentCacheStrategy(_options?: {
  useCase?: 'research' | 'production' | 'development' | 'testing';
  offline?: boolean;
  debug?: boolean;
}): CacheStrategy {
  // This would import from environment-detector, but we avoid circular imports
  // Implementation should be provided by mode-switcher
  throw new Error('getCurrentCacheStrategy should be called through mode-switcher');
}

/**
 * Convenience function to get cache strategy configuration
 */
export function getCacheStrategyConfig(strategy: CacheStrategy): CacheStrategyConfig {
  return CacheStrategySelector.getStrategyConfig(strategy);
}