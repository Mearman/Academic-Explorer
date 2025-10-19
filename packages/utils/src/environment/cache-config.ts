/**
 * Cache configuration system for Academic Explorer
 *
 * Provides environment-specific configuration for static data paths and cache strategies.
 * Handles differences between local development (public/ directory) and production (GitHub Pages URLs).
 */

import {
  EnvironmentDetector,
  type BuildContext,
} from "./environment-detector.js";

/**
 * Static data path configuration
 */
export interface StaticDataPaths {
  /** Base URL for static data */
  baseUrl: string;
  /** Path to OpenAlex static data */
  openalexPath: string;
  /** Full URL to OpenAlex data directory */
  openalexBaseUrl: string;
  /** Whether paths are absolute URLs or relative */
  isAbsolute: boolean;
  /** CDN or cache headers configuration */
  cacheHeaders?: Record<string, string>;
}

/**
 * Cache storage configuration
 */
export interface CacheStorageConfig {
  /** Maximum cache size in bytes */
  maxSize: number;
  /** Cache expiration time in milliseconds */
  expirationTime: number;
  /** Whether to persist cache across sessions */
  persistent: boolean;
  /** Storage mechanism preference */
  storagePreference: "indexeddb" | "localstorage" | "memory";
  /** Whether to enable compression */
  compression: boolean;
  /** Debug mode for cache operations */
  debug: boolean;
}

/**
 * Network configuration for cache behavior
 */
export interface NetworkConfig {
  /** Request timeout in milliseconds */
  timeout: number;
  /** Number of retry attempts */
  retries: number;
  /** Retry delay multiplier */
  retryDelayMs: number;
  /** Enable request deduplication */
  deduplication: boolean;
  /** Enable background cache warming */
  backgroundSync: boolean;
  /** Rate limiting configuration */
  rateLimit?: {
    requestsPerMinute: number;
    burstLimit: number;
  };
}

/**
 * Complete cache configuration
 */
export interface CacheConfig {
  /** Static data path configuration */
  paths: StaticDataPaths;
  /** Cache storage configuration */
  storage: CacheStorageConfig;
  /** Network configuration */
  network: NetworkConfig;
  /** Environment context */
  environment: BuildContext;
}

/**
 * Cache configuration factory
 */
export class CacheConfigFactory {
  private static readonly GITHUB_PAGES_DOMAIN = "academic-explorer.joenash.uk";
  private static readonly GITHUB_IO_DOMAIN = "mearman.github.io";
  private static readonly LOCAL_DATA_PATH = "/data";
  private static readonly OPENALEX_SUBPATH = "/openalex";

  /**
   * Create static data paths configuration based on environment
   */
  static createStaticDataPaths(context: BuildContext): StaticDataPaths {
    if (context.isDevelopment && context.isDevServer) {
      // Local development server - use relative paths to public directory
      return {
        baseUrl: this.LOCAL_DATA_PATH,
        openalexPath: this.OPENALEX_SUBPATH,
        openalexBaseUrl: `${this.LOCAL_DATA_PATH}${this.OPENALEX_SUBPATH}`,
        isAbsolute: false,
        cacheHeaders: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      };
    }

    if (context.isProduction && context.isGitHubPages) {
      // GitHub Pages production deployment
      const baseUrl =
        context.hostname === this.GITHUB_PAGES_DOMAIN
          ? `https://${this.GITHUB_PAGES_DOMAIN}${this.LOCAL_DATA_PATH}`
          : `https://${this.GITHUB_IO_DOMAIN}/Academic-Explorer${this.LOCAL_DATA_PATH}`;

      return {
        baseUrl,
        openalexPath: this.OPENALEX_SUBPATH,
        openalexBaseUrl: `${baseUrl}${this.OPENALEX_SUBPATH}`,
        isAbsolute: true,
        cacheHeaders: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          "Accept-Encoding": "gzip, deflate, br",
        },
      };
    }

    if (context.isProduction) {
      // Production build not on GitHub Pages (potential local static server)
      return {
        baseUrl: this.LOCAL_DATA_PATH,
        openalexPath: this.OPENALEX_SUBPATH,
        openalexBaseUrl: `${this.LOCAL_DATA_PATH}${this.OPENALEX_SUBPATH}`,
        isAbsolute: false,
        cacheHeaders: {
          "Cache-Control": "public, max-age=1800",
        },
      };
    }

    // Test environment or unknown - use minimal local paths
    return {
      baseUrl: this.LOCAL_DATA_PATH,
      openalexPath: this.OPENALEX_SUBPATH,
      openalexBaseUrl: `${this.LOCAL_DATA_PATH}${this.OPENALEX_SUBPATH}`,
      isAbsolute: false,
      cacheHeaders: {
        "Cache-Control": "no-cache",
      },
    };
  }

  /**
   * Create cache storage configuration based on environment
   */
  static createCacheStorageConfig(context: BuildContext): CacheStorageConfig {
    if (context.isDevelopment) {
      return {
        maxSize: 50 * 1024 * 1024, // 50MB for development
        expirationTime: 10 * 60 * 1000, // 10 minutes
        persistent: false, // Don't persist in development for faster iteration
        storagePreference: "memory",
        compression: false, // Faster without compression in dev
        debug: true,
      };
    }

    if (context.isProduction) {
      return {
        maxSize: 200 * 1024 * 1024, // 200MB for production
        expirationTime: 24 * 60 * 60 * 1000, // 24 hours
        persistent: true, // Persist for better user experience
        storagePreference: "indexeddb",
        compression: true, // Save space in production
        debug: false,
      };
    }

    if (context.isTest) {
      return {
        maxSize: 10 * 1024 * 1024, // 10MB for tests
        expirationTime: 5 * 60 * 1000, // 5 minutes
        persistent: false, // Don't persist test data
        storagePreference: "memory",
        compression: false,
        debug: false,
      };
    }

    // Default configuration
    return {
      maxSize: 100 * 1024 * 1024, // 100MB default
      expirationTime: 60 * 60 * 1000, // 1 hour
      persistent: true,
      storagePreference: "indexeddb",
      compression: true,
      debug: false,
    };
  }

  /**
   * Create network configuration based on environment
   */
  static createNetworkConfig(context: BuildContext): NetworkConfig {
    if (context.isDevelopment) {
      return {
        timeout: 30000, // 30 seconds for dev (slower responses expected)
        retries: 2,
        retryDelayMs: 1000,
        deduplication: true,
        backgroundSync: false, // Disable background sync in dev
        rateLimit: {
          requestsPerMinute: 120, // Higher rate limit for development
          burstLimit: 20,
        },
      };
    }

    if (context.isProduction) {
      return {
        timeout: 15000, // 15 seconds for production
        retries: 3,
        retryDelayMs: 2000,
        deduplication: true,
        backgroundSync: true, // Enable background sync for better UX
        rateLimit: {
          requestsPerMinute: 60, // Respect OpenAlex rate limits
          burstLimit: 10,
        },
      };
    }

    if (context.isTest) {
      return {
        timeout: 5000, // 5 seconds for tests (fast failure)
        retries: 1,
        retryDelayMs: 100,
        deduplication: false, // Disable deduplication for test predictability
        backgroundSync: false,
        rateLimit: {
          requestsPerMinute: 300, // High rate limit for tests
          burstLimit: 50,
        },
      };
    }

    // Default configuration
    return {
      timeout: 20000, // 20 seconds default
      retries: 2,
      retryDelayMs: 1500,
      deduplication: true,
      backgroundSync: true,
      rateLimit: {
        requestsPerMinute: 60,
        burstLimit: 10,
      },
    };
  }

  /**
   * Create complete cache configuration for current environment
   */
  static createCacheConfig(context?: BuildContext): CacheConfig {
    const envContext = context ?? EnvironmentDetector.getBuildContext();

    return {
      paths: this.createStaticDataPaths(envContext),
      storage: this.createCacheStorageConfig(envContext),
      network: this.createNetworkConfig(envContext),
      environment: envContext,
    };
  }

  /**
   * Get optimized configuration for specific use cases
   */
  static createOptimizedConfig({
    useCase,
    context,
  }: {
    useCase: "research" | "production" | "testing" | "development";
    context?: BuildContext;
  }): CacheConfig {
    const baseConfig = this.createCacheConfig(context);

    switch (useCase) {
      case "research":
        // Optimize for academic research - longer cache times, more storage
        return {
          ...baseConfig,
          storage: {
            ...baseConfig.storage,
            maxSize: 500 * 1024 * 1024, // 500MB for research datasets
            expirationTime: 7 * 24 * 60 * 60 * 1000, // 7 days
            persistent: true,
            debug: true, // Enable debug for research insights
          },
          network: {
            ...baseConfig.network,
            backgroundSync: true,
            rateLimit: {
              requestsPerMinute: 30, // Conservative for research ethics
              burstLimit: 5,
            },
          },
        };

      case "production":
        // Optimize for production performance
        return {
          ...baseConfig,
          storage: {
            ...baseConfig.storage,
            compression: true,
            persistent: true,
            debug: false,
          },
          network: {
            ...baseConfig.network,
            backgroundSync: true,
            timeout: 10000, // Faster timeout for production
          },
        };

      case "testing":
        // Optimize for testing reliability
        return {
          ...baseConfig,
          storage: {
            ...baseConfig.storage,
            maxSize: 5 * 1024 * 1024, // 5MB for tests
            persistent: false,
            compression: false,
            debug: false,
          },
          network: {
            ...baseConfig.network,
            timeout: 3000,
            retries: 0, // No retries in tests for faster feedback
            backgroundSync: false,
            deduplication: false,
          },
        };

      case "development":
        // Optimize for development experience
        return {
          ...baseConfig,
          storage: {
            ...baseConfig.storage,
            persistent: false, // Fresh state on each reload
            compression: false, // Faster without compression
            debug: true,
          },
          network: {
            ...baseConfig.network,
            timeout: 60000, // Longer timeout for debugging
            backgroundSync: false,
          },
        };

      default:
        return baseConfig;
    }
  }
}

/**
 * Convenience function to get current cache configuration
 */
export function getCurrentCacheConfig(): CacheConfig {
  return CacheConfigFactory.createCacheConfig();
}

/**
 * Convenience function to get optimized cache configuration
 */
export function getOptimizedCacheConfig(
  useCase: "research" | "production" | "testing" | "development",
): CacheConfig {
  return CacheConfigFactory.createOptimizedConfig({ useCase });
}

/**
 * Get static data URL for a given path
 */
export function getStaticDataUrl({
  relativePath,
  config,
}: {
  relativePath: string;
  config?: CacheConfig;
}): string {
  const cacheConfig = config ?? getCurrentCacheConfig();
  const { paths } = cacheConfig;

  // Ensure relative path starts with /
  const normalizedPath = relativePath.startsWith("/")
    ? relativePath
    : `/${relativePath}`;

  if (paths.isAbsolute) {
    return `${paths.baseUrl}${normalizedPath}`;
  }

  // For relative paths, assume current origin
  return `${paths.baseUrl}${normalizedPath}`;
}

/**
 * Get OpenAlex data URL for a given entity path
 */
export function getOpenAlexDataUrl({
  entityPath,
  config,
}: {
  entityPath: string;
  config?: CacheConfig;
}): string {
  const cacheConfig = config ?? getCurrentCacheConfig();
  const { paths } = cacheConfig;

  // Ensure entity path starts with /
  const normalizedPath = entityPath.startsWith("/")
    ? entityPath
    : `/${entityPath}`;

  if (paths.isAbsolute) {
    return `${paths.openalexBaseUrl}${normalizedPath}`;
  }

  return `${paths.openalexBaseUrl}${normalizedPath}`;
}
