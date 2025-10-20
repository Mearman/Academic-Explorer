/**
 * Re-export all utility APIs and functions
 */
export { AutocompleteApi } from "./autocomplete";
export { TextAnalysisApi } from "./text-analysis";
export { SamplingApi } from "./sampling";
export { GroupingApi } from "./grouping";
export { StatisticsApi } from "./statistics";

export {
  QueryBuilder,
  createWorksQuery,
  createAuthorsQuery,
  createSourcesQuery,
  createInstitutionsQuery,
  createTopicsQuery,
  createPublishersQuery,
  createFundersQuery,
  buildFilterString,
  buildSortString,
  buildSelectString,
  validateDateRange,
  escapeFilterValue,
  SORT_FIELDS,
  SELECT_PRESETS,
} from "./query-builder";

// Re-export transformers
export * from "./transformers";

// Re-export hydration helpers
export * from "./hydration-helpers";

// Re-export ID resolver utilities
export {
  IdResolver,
  createIdResolver,
  isValidPMID,
  isValidWikidata,
  isValidOpenAlex,
  validateExternalId,
  normalizeExternalId,
  normalizeToUrl,
  type ExternalIdType,
  type IdValidationResult,
  type IdValidationConfig,
} from "./id-resolver";
