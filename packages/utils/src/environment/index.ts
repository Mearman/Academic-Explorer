/**
 * Environment detection and configuration system for Academic Explorer
 *
 * Provides unified interface for environment detection, cache configuration,
 * and runtime mode switching. Enables other packages to determine optimal
 * caching behavior based on detected environment.
 *
 * @example Basic usage
 * ```typescript
 * import { getCurrentEnvironmentMode, getCurrentCacheConfig } from '@academic-explorer/utils/environment';
 *
 * const mode = getCurrentEnvironmentMode();
 * const config = getCurrentCacheConfig();
 *
 * if (mode === EnvironmentMode.DEVELOPMENT) {
 *   // Development-specific logic
 * }
 * ```
 *
 * @example Research mode initialization
 * ```typescript
 * import { initializeResearchEnvironment } from '@academic-explorer/utils/environment';
 *
 * const config = initializeResearchEnvironment({
 *   debug: true,
 *   maxCacheSize: 500 * 1024 * 1024 // 500MB
 * });
 * ```
 *
 * @example Runtime mode switching
 * ```typescript
 * import { ModeSwitcher } from '@academic-explorer/utils/environment';
 *
 * // Switch to offline mode
 * ModeSwitcher.switchToOfflineMode();
 *
 * // Switch to debug mode with custom settings
 * ModeSwitcher.switchToDebugMode({
 *   storageType: CacheStorageType.MEMORY,
 *   ttl: 30000
 * });
 * ```
 */

// Environment Detection
export {
	EnvironmentDetector,
	EnvironmentMode,
	getCurrentEnvironmentMode,
	isDevelopment,
	isProduction,
	isTest,
	getBuildContext,
	type BuildContext,
} from "./environment-detector.js"

// Cache Configuration
export {
	CacheConfigFactory,
	getCurrentCacheConfig,
	getOptimizedCacheConfig,
	getStaticDataUrl,
	getOpenAlexDataUrl,
	type StaticDataPaths,
	type CacheStorageConfig,
	type NetworkConfig,
	type CacheConfig,
} from "./cache-config.js"

// Cache Strategies
export {
	CacheStrategySelector,
	getCurrentCacheStrategy,
	getCacheStrategyConfig,
	CacheStrategy,
	CacheOperation,
	CachePriority,
	CacheStorageType,
	type CacheStrategyConfig,
} from "./cache-strategies.js"

// Mode Switching
export {
	ModeSwitcher,
	getCurrentCacheConfiguration,
	getCurrentStrategyConfiguration,
	isCacheOperationSupported,
	getDefaultCachePriority,
	isDebugMode,
	getEnvironmentDescription,
	initializeResearchEnvironment,
	initializeProductionEnvironment,
	initializeDevelopmentEnvironment,
	type ModeOptions,
	type RuntimeEnvironmentConfig,
} from "./mode-switcher.js"
