/**
 * Mode switcher for Academic Explorer
 *
 * Orchestrates cache behavior switching based on detected environment.
 * Provides a unified interface for selecting and configuring cache strategies.
 */

import { EnvironmentDetector, type BuildContext } from './environment-detector.js';
import { CacheConfigFactory, type CacheConfig } from './cache-config.js';
import {
  CacheStrategySelector,
  CacheStrategy,
  CacheOperation,
  CachePriority,
  CacheStorageType,
  type CacheStrategyConfig
} from './cache-strategies.js';

/**
 * Runtime mode configuration options
 */
export interface ModeOptions {
  /** Force specific environment mode */
  forceMode?: 'development' | 'production' | 'test';
  /** Use case optimization */
  useCase?: 'research' | 'production' | 'development' | 'testing';
  /** Enable offline mode */
  offline?: boolean;
  /** Enable debug mode */
  debug?: boolean;
  /** Override cache strategy */
  cacheStrategy?: CacheStrategy;
  /** Override storage type */
  storageType?: CacheStorageType;
  /** Custom cache size limit */
  maxCacheSize?: number;
  /** Custom TTL in milliseconds */
  ttl?: number;
}

/**
 * Complete runtime environment configuration
 */
export interface RuntimeEnvironmentConfig {
  /** Environment context */
  context: BuildContext;
  /** Cache configuration */
  cacheConfig: CacheConfig;
  /** Cache strategy */
  strategy: CacheStrategy;
  /** Cache strategy configuration */
  strategyConfig: CacheStrategyConfig;
  /** Applied mode options */
  options: ModeOptions;
  /** Configuration timestamp */
  timestamp: number;
}

/**
 * Mode switcher for dynamic environment configuration
 */
export class ModeSwitcher {
  private static _currentConfig: RuntimeEnvironmentConfig | undefined;
  private static _listeners: Array<(config: RuntimeEnvironmentConfig) => void> = [];

  /**
   * Initialize mode switcher with optional overrides
   */
  static initialize(options: ModeOptions = {}): RuntimeEnvironmentConfig {
    const context = this.createEnvironmentContext(options);
    const cacheConfig = this.createCacheConfiguration(context, options);
    const strategy = this.selectCacheStrategy(context, options);
    const strategyConfig = this.createStrategyConfiguration(strategy, options);

    const config: RuntimeEnvironmentConfig = {
      context,
      cacheConfig,
      strategy,
      strategyConfig,
      options,
      timestamp: Date.now()
    };

    this._currentConfig = config;
    this.notifyListeners(config);

    return config;
  }

  /**
   * Get current runtime configuration
   */
  static getCurrentConfig(): RuntimeEnvironmentConfig {
    if (!this._currentConfig) {
      return this.initialize();
    }
    return this._currentConfig;
  }

  /**
   * Reconfigure with new options
   */
  static reconfigure(options: ModeOptions): RuntimeEnvironmentConfig {
    return this.initialize(options);
  }

  /**
   * Switch to specific mode
   */
  static switchToMode(
    mode: 'development' | 'production' | 'test',
    additionalOptions: Omit<ModeOptions, 'forceMode'> = {}
  ): RuntimeEnvironmentConfig {
    return this.initialize({
      ...additionalOptions,
      forceMode: mode
    });
  }

  /**
   * Switch to research mode
   */
  static switchToResearchMode(options: Omit<ModeOptions, 'useCase'> = {}): RuntimeEnvironmentConfig {
    return this.initialize({
      ...options,
      useCase: 'research'
    });
  }

  /**
   * Switch to offline mode
   */
  static switchToOfflineMode(options: Omit<ModeOptions, 'offline'> = {}): RuntimeEnvironmentConfig {
    return this.initialize({
      ...options,
      offline: true
    });
  }

  /**
   * Switch to debug mode
   */
  static switchToDebugMode(options: Omit<ModeOptions, 'debug'> = {}): RuntimeEnvironmentConfig {
    return this.initialize({
      ...options,
      debug: true
    });
  }

  /**
   * Add configuration change listener
   */
  static addConfigListener(listener: (config: RuntimeEnvironmentConfig) => void): () => void {
    this._listeners.push(listener);
    return () => {
      const index = this._listeners.indexOf(listener);
      if (index > -1) {
        this._listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get available modes for current context
   */
  static getAvailableModes(): {
    environments: Array<'development' | 'production' | 'test'>;
    useCases: Array<'research' | 'production' | 'development' | 'testing'>;
    strategies: CacheStrategy[];
    storageTypes: CacheStorageType[];
  } {
    const context = EnvironmentDetector.getBuildContext();
    const strategies = CacheStrategySelector.getAvailableStrategies(context);

    return {
      environments: ['development', 'production', 'test'],
      useCases: ['research', 'production', 'development', 'testing'],
      strategies,
      storageTypes: [
        CacheStorageType.MEMORY,
        CacheStorageType.LOCAL_STORAGE,
        CacheStorageType.INDEXED_DB,
        CacheStorageType.STATIC_FILE
      ]
    };
  }

  /**
   * Validate configuration compatibility
   */
  static validateConfiguration(options: ModeOptions): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for conflicting options
    if (options.offline && options.useCase === 'development') {
      warnings.push('Offline mode in development may not work as expected');
    }

    // Check storage type compatibility
    if (options.storageType === CacheStorageType.STATIC_FILE && !options.offline) {
      warnings.push('Static file storage works best in offline mode');
    }

    // Check cache size limits
    if (options.maxCacheSize && options.maxCacheSize > 1024 * 1024 * 1024) {
      warnings.push('Cache size over 1GB may impact performance');
    }

    // Check TTL values
    if (options.ttl && options.ttl < 1000) {
      warnings.push('TTL under 1 second may cause excessive cache thrashing');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get performance metrics for current configuration
   */
  static getPerformanceMetrics(): {
    configurationTime: number;
    cacheHitRate?: number;
    memoryUsage?: number;
    storageUsage?: number;
  } {
    const config = this.getCurrentConfig();

    return {
      configurationTime: config.timestamp,
      // Placeholder for actual metrics - would be implemented by cache implementation
      cacheHitRate: undefined,
      memoryUsage: undefined,
      storageUsage: undefined
    };
  }

  /**
   * Create environment context with potential overrides
   */
  private static createEnvironmentContext(options: ModeOptions): BuildContext {
    let context = EnvironmentDetector.getBuildContext();

    // Apply force mode override
    if (options.forceMode) {
      const forcedMode = options.forceMode;
      context = {
        ...context,
        isDevelopment: forcedMode === 'development',
        isProduction: forcedMode === 'production',
        isTest: forcedMode === 'test',
        mode: forcedMode as any // Type assertion needed for enum conversion
      };
    }

    return context;
  }

  /**
   * Create cache configuration based on context and options
   */
  private static createCacheConfiguration(
    context: BuildContext,
    options: ModeOptions
  ): CacheConfig {
    let config: CacheConfig;

    if (options.useCase) {
      config = CacheConfigFactory.createOptimizedConfig(options.useCase, context);
    } else {
      config = CacheConfigFactory.createCacheConfig(context);
    }

    // Apply option overrides
    if (options.maxCacheSize) {
      config.storage.maxSize = options.maxCacheSize;
    }

    if (options.ttl) {
      config.storage.expirationTime = options.ttl;
    }

    if (options.debug !== undefined) {
      config.storage.debug = options.debug;
    }

    return config;
  }

  /**
   * Select cache strategy based on context and options
   */
  private static selectCacheStrategy(
    context: BuildContext,
    options: ModeOptions
  ): CacheStrategy {
    if (options.cacheStrategy) {
      return options.cacheStrategy;
    }

    return CacheStrategySelector.selectStrategy(context, {
      useCase: options.useCase,
      offline: options.offline,
      debug: options.debug
    });
  }

  /**
   * Create strategy configuration with overrides
   */
  private static createStrategyConfiguration(
    strategy: CacheStrategy,
    options: ModeOptions
  ): CacheStrategyConfig {
    let config = CacheStrategySelector.getStrategyConfig(strategy);

    // Apply option overrides
    if (options.storageType) {
      config = {
        ...config,
        storageType: options.storageType
      };
    }

    if (options.maxCacheSize) {
      config = {
        ...config,
        maxSize: options.maxCacheSize
      };
    }

    if (options.ttl) {
      config = {
        ...config,
        ttl: options.ttl
      };
    }

    if (options.debug !== undefined) {
      config = {
        ...config,
        debug: options.debug
      };
    }

    return config;
  }

  /**
   * Notify all listeners of configuration changes
   */
  private static notifyListeners(config: RuntimeEnvironmentConfig): void {
    for (const listener of this._listeners) {
      try {
        listener(config);
      } catch (error) {
        console.error('Error in mode switcher listener:', error);
      }
    }
  }

  /**
   * Reset mode switcher state (useful for testing)
   */
  static reset(): void {
    this._currentConfig = undefined;
    this._listeners = [];
    EnvironmentDetector.clearCache();
  }
}

/**
 * Convenience functions for common mode operations
 */

/**
 * Get current cache strategy
 */
export function getCurrentCacheStrategy(options?: {
  useCase?: 'research' | 'production' | 'development' | 'testing';
  offline?: boolean;
  debug?: boolean;
}): CacheStrategy {
  if (options) {
    const config = ModeSwitcher.initialize(options);
    return config.strategy;
  }

  const config = ModeSwitcher.getCurrentConfig();
  return config.strategy;
}

/**
 * Get current cache configuration
 */
export function getCurrentCacheConfiguration(): CacheConfig {
  const config = ModeSwitcher.getCurrentConfig();
  return config.cacheConfig;
}

/**
 * Get current strategy configuration
 */
export function getCurrentStrategyConfiguration(): CacheStrategyConfig {
  const config = ModeSwitcher.getCurrentConfig();
  return config.strategyConfig;
}

/**
 * Check if specific cache operation is supported
 */
export function isCacheOperationSupported(operation: CacheOperation): boolean {
  const config = ModeSwitcher.getCurrentConfig();
  return config.strategyConfig.operations.includes(operation);
}

/**
 * Get default cache priority for current environment
 */
export function getDefaultCachePriority(): CachePriority {
  const config = ModeSwitcher.getCurrentConfig();
  return config.strategyConfig.defaultPriority;
}

/**
 * Check if debug mode is enabled
 */
export function isDebugMode(): boolean {
  const config = ModeSwitcher.getCurrentConfig();
  return config.strategyConfig.debug;
}

/**
 * Get environment description for current configuration
 */
export function getEnvironmentDescription(): string {
  const config = ModeSwitcher.getCurrentConfig();
  return EnvironmentDetector.getEnvironmentDescription();
}

/**
 * Initialize environment with research-optimized settings
 */
export function initializeResearchEnvironment(options: Omit<ModeOptions, 'useCase'> = {}): RuntimeEnvironmentConfig {
  return ModeSwitcher.switchToResearchMode(options);
}

/**
 * Initialize environment with production-optimized settings
 */
export function initializeProductionEnvironment(options: Omit<ModeOptions, 'useCase'> = {}): RuntimeEnvironmentConfig {
  return ModeSwitcher.reconfigure({
    ...options,
    useCase: 'production'
  });
}

/**
 * Initialize environment with development-optimized settings
 */
export function initializeDevelopmentEnvironment(options: Omit<ModeOptions, 'useCase'> = {}): RuntimeEnvironmentConfig {
  return ModeSwitcher.reconfigure({
    ...options,
    useCase: 'development'
  });
}