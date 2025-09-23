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
  safeJsonParse
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
  getWeekNumber
} from "./date-helpers.js";

// Storage utilities
export * from "./storage/index.js";

// Cache utilities
export * from "./cache/index.js";