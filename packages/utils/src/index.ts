// State module re-export
export * from "./state";

// Cache utilities
export * from "./cache";

// Cache browser utilities
export * from "./cache-browser";

// Logger
export { logger } from "./logger";

// Utility functions
export {
  isNonEmptyString,
  isString,
  safeParseRelationType,
  safeParseExpansionTarget,
  type RelationType,
  type ExpansionTarget,
} from "./validation";

// Data utilities
export {
  debouncedSearch,
  isValidSearchQuery,
  normalizeSearchQuery,
  formatLargeNumber,
} from "./data";

// Worker message schemas and types
export * from "./workers/messages";

// Build info utilities
export {
  getBuildInfo,
  formatBuildTimestamp,
  getCommitUrl,
  getReleaseUrl,
  getRelativeBuildTime,
  type BuildInfo,
} from "./build-info";

// Data evaluation utilities
export {
  parseSTARFile,
  createSTARDatasetFromParseResult,
  compareAcademicExplorerResults,
  searchBasedOnSTARDataset,
  calculateSearchCoverage,
  detectMissingPapers,
  DEFAULT_COLUMN_MAPPINGS,
  DEFAULT_MATCHING_CONFIG,
  DEFAULT_SEARCH_CONFIG,
  type STARDataset,
  type ParseResult,
  type WorkReference,
  type ComparisonResults,
  type SearchCoverage,
} from "./data-evaluation";
