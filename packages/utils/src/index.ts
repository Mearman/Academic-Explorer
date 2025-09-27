/**
 * @academic-explorer/shared-utils
 *
 * Shared utilities for Academic Explorer monorepo packages
 * Provides generic, reusable utilities without domain-specific dependencies
 */

// Logger utilities
export {
  GenericLogger,
  logger,
  createApiLogger,
  createCacheLogger,
  createStorageLogger,
  logError,
  setupGlobalErrorHandling,
  type LogLevel,
  type LogCategory,
  type LogEntry
} from "./logger.js";

// Validation and type guards
export {
  validateApiResponse,
  trustApiContract,
  isRecord,
  trustObjectShape,
  extractProperty,
  isStringInSet,
  safeParseEnum,
  assertStringInSet,
  isString,
  isNumber,
  isBoolean,
  isArray,
  isNonEmptyArray,
  isFunction,
  isNull,
  isUndefined,
  isNullish,
  isDefined,
  isNonEmptyString,
  isValidUrl,
  isValidEmail,
  hasProperty,
  hasPropertyOfType,
  createShapeValidator,
  isArrayOfType,
  safeJsonParse,
  safeParseRelationType,
  safeParseExpansionTarget,
  type RelationType,
  type ExpansionTarget
} from "./validation.js";

// Data manipulation utilities
export {
  debouncedSearch,
  removeDuplicatesBy,
  sortByNumericProperty,
  sortByStringProperty,
  groupByProperty,
  extractSafeProperties,
  sanitizeObject,
  isValidSearchQuery,
  normalizeSearchQuery,
  hasValidData,
  getDisplayName,
  formatLargeNumber,
  formatPercentage,
  clamp,
  range,
  chunk,
  flatten,
  arrayToMap,
  arrayToLookup,
  unique,
  intersection,
  difference,
  sample,
  deepClone,
  mergeUnique,
  partition,
  maxBy,
  minBy,
  sumBy,
  averageBy,
  safeGet,
  throttle
} from "./data.js";

// Date helpers
export {
  formatDateToISO,
  formatDateToHuman,
  formatDateToShort,
  parseISODate,
  getCurrentDateISO,
  getCurrentTimestamp,
  daysBetween,
  msBetween,
  isDateInRange,
  addDays,
  addMonths,
  addYears,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isSameDay,
  isToday,
  isPast,
  isFuture,
  getRelativeTime,
  formatDuration,
  formatElapsed,
  createDateRange,
  getDaysInMonth,
  isLeapYear,
  getWeekNumber,
  formatPublicationYear
} from "./date-helpers.js";

// Storage utilities
export * from "./storage/index.js";

// Cache utilities
export * from "./cache/index.js";

// Cache browser utilities
export {
  CacheBrowserService,
  cacheBrowserService,
  type EntityType as CacheBrowserEntityType,
  type CachedEntityMetadata,
  type CacheBrowserStats,
  type CacheBrowserFilters,
  type CacheBrowserOptions,
  type CacheBrowserResult,
} from "./cache-browser/index.js";

// Build info utilities
export {
  getBuildInfo,
  formatBuildTimestamp,
  getCommitUrl,
  getReleaseUrl,
  getRelativeBuildTime,
  type BuildInfo
} from "./build-info.js";

// Data evaluation utilities
export {
  parseSTARFile,
  createSTARDatasetFromParseResult,
  DEFAULT_COLUMN_MAPPINGS,
  compareAcademicExplorerResults,
  DEFAULT_MATCHING_CONFIG,
  searchBasedOnSTARDataset,
  calculateSearchCoverage,
  DEFAULT_SEARCH_CONFIG,
  detectMissingPapers,
  type STARDataset,
  type ParseResult,
  type SearchCoverage,
  type WorkReference,
  type ComparisonResults,
  type ComparisonProgress,
  type MissingPaperDetectionConfig,
  type DetectionProgress,
  type MissingPaperDetectionResults
} from "./data-evaluation.js";

// Service utilities
export {
  getRelationshipDetectionService,
  getGraphDataService,
  useOpenAlexEntity,
  type RelationshipDetectionService,
  type GraphDataService
} from "./services.js";

// Environment detection and configuration
export {
  // Environment Detection
  EnvironmentDetector,
  EnvironmentMode,
  getCurrentEnvironmentMode,
  isDevelopment,
  isProduction,
  isTest,
  getBuildContext,

  // Cache Configuration
  CacheConfigFactory,
  getCurrentCacheConfig as getCurrentEnvironmentCacheConfig,
  getOptimizedCacheConfig,
  getStaticDataUrl,
  getOpenAlexDataUrl,

  // Cache Strategies
  CacheStrategySelector,
  getCurrentCacheStrategy,
  getCacheStrategyConfig,
  CacheStrategy,
  CacheOperation,
  CachePriority,
  CacheStorageType,

  // Mode Switching
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

  // Types
  type BuildContext,
  type StaticDataPaths,
  type CacheStorageConfig as EnvironmentCacheStorageConfig,
  type NetworkConfig,
  type CacheConfig as EnvironmentCacheConfig,
  type CacheStrategyConfig,
  type ModeOptions,
  type RuntimeEnvironmentConfig
} from "./environment/index.js";

// Static data index generator utilities
export {
  StaticDataIndexGenerator,
  generateAllIndexes,
  generateIndexForEntityType,
  validateIndex,
  repairIndex,
  createIndexGenerator,
  CURRENT_SCHEMA_VERSION,
  DEFAULT_INDEX_CONFIG,
  type EntityType as StaticDataEntityType,
  type EntityFileMetadata,
  type EntityTypeIndex,
  type MasterIndex,
  type IndexValidationResult,
  type IndexValidationError,
  type IndexValidationWarning,
  type IndexRepairAction,
  type IndexGenerationConfig,
  type IndexGenerationProgress,
  type IndexGenerationResult,
} from "./static-data/index.js";