/**
 * OpenAlex API Client - Main Export
 *
 * Comprehensive TypeScript client for the OpenAlex API
 * https://docs.openalex.org/
 */

// Main client exports (removed - legacy client files cleaned up)

// Base client and configuration
export {
  OpenAlexApiError,
  OpenAlexBaseClient,
  OpenAlexRateLimitError,
  type OpenAlexClientConfig,
} from "./client";

// Entity APIs
export { AuthorsApi } from "./entities/authors";
export { ConceptsApi } from "./entities/concepts";
export { FundersApi } from "./entities/funders";
export { InstitutionsApi } from "./entities/institutions";
export { KeywordsApi } from "./entities/keywords";
export { PublishersApi } from "./entities/publishers";
export { SourcesApi } from "./entities/sources";
export { TextAnalysisApi } from "./entities/text-analysis";
export { TopicsApi } from "./entities/topics";
export { WorksApi } from "./entities/works";

// Helper functions for common operations
export {
  getAuthorById,
  getAuthors,
  getWorkById,
  getWorks,
  getConceptById,
  getConcepts,
  getInstitutionById,
  getInstitutions,
  getFunderById,
  getFunders,
  getPublisherById,
  getPublishers,
  getSourceById,
  getSources,
  getTopicById,
  getTopics,
  getKeywordById,
  getKeywords,
  setSharedClient,
  resetSharedClient,
} from "./helpers";

// Utilities
export { AutocompleteApi } from "./utils/autocomplete";

// Client configuration utilities
export {
  cachedOpenAlex,
  CachedOpenAlexClient,
  createCachedOpenAlexClient,
  getCachePerformanceMetrics,
  updateOpenAlexEmail,
  type CachedClientConfig,
  type ClientApis,
} from "./cached-client";

// Static data caching
export {
  CacheTier,
  Environment,
  staticDataProvider,
  type CacheStatistics,
  type StaticDataResult,
} from "./internal/static-data-provider";

export { logger } from "./internal/logger";

export {
  cleanOpenAlexId,
  toStaticEntityType,
  type StaticEntityType,
} from "./internal/static-data-utils";

// Advanced field selection utilities
export {
  ADVANCED_FIELD_SELECTIONS,
  createAdvancedFieldSelection,
} from "./advanced-field-selection";

export type { AdvancedEntityFieldSelections } from "./advanced-field-selection";

export {
  buildFilterString,
  buildSelectString,
  buildSortString,
  createAuthorsQuery,
  createFundersQuery,
  createInstitutionsQuery,
  createPublishersQuery,
  createSourcesQuery,
  createTopicsQuery,
  createWorksQuery,
  escapeFilterValue,
  normalizePaginationParams,
  QueryBuilder,
  SELECT_PRESETS,
  SORT_FIELDS,
  validateDateRange,
} from "./utils/query-builder";

export {
  buildFilterString as buildFilterStringFromBuilder,
  createFilterBuilder,
  FilterBuilder,
  type FilterBuilderOptions,
  type FilterCondition,
  type FilterExpression,
  type FilterLogicalOperator,
  type FilterOperator,
  type FilterValidationResult,
  type FilterValue,
} from "./utils/filter-builder";

// Type exports - All the TypeScript types for OpenAlex entities
export type {
  Author,
  AuthorsFilters,
  Authorship,
  AutocompleteResult,
  Concept,
  CountsByYear,
  DOI,
  EntityFilters,
  EntityType,
  Funder,
  FundersFilters,
  Institution,
  InstitutionEntity,
  InstitutionsFilters,
  ISSNId,
  Location,
  NGram,
  OpenAlexEntity,
  OpenAlexError,
  // Common types
  OpenAlexId,
  OpenAlexResponse,
  ORCID,
  Publisher,
  PublishersFilters,
  // Utility types
  QueryParams,
  RORId,
  Source,
  SourcesFilters,
  Topic,
  TopicsFilters,
  WikidataId,
  // Core entities
  Work,
  // Filter types
  WorksFilters,
} from "./types";

// Entity field constants for select parameter
export {
  AUTHOR_FIELDS,
  BASE_ENTITY_FIELDS,
  ENTITY_WITH_WORKS_FIELDS,
  FUNDER_FIELDS,
  INSTITUTION_FIELDS,
  SOURCE_FIELDS,
  TOPIC_FIELDS,
  WORK_FIELDS,
} from "./types/entities";
export type {
  AuthorField,
  BaseEntityField,
  EntityWithWorksField,
  FunderField,
  InstitutionField,
  SourceField,
  TopicField,
  WorkField,
} from "./types/entities";

// Text Analysis API types
export type {
  ConceptsResponse,
  KeywordsResponse,
  TextAnalysisConcept,
  TextAnalysisEntity,
  TextAnalysisKeyword,
  TextAnalysisOptions,
  TextAnalysisResponse,
  TextAnalysisTopic,
  TopicsResponse,
} from "./entities/text-analysis";

// Concepts API types
export type {
  AutocompleteOptions,
  ConceptSelectField,
  ConceptSortOption,
  ConceptsQueryParams,
  SearchConceptsOptions,
} from "./types";

// Static cache exports
export {
  createGitHubPagesReader,
  defaultGitHubPagesConfig,
  GitHubPagesReader,
  GitHubPagesReaderError,
  type GitHubPagesReaderConfig,
} from "./cache/static";

// API Interceptor exports (development mode only)
export {
  ApiInterceptor,
  apiInterceptor,
  type ApiInterceptorConfig,
  type CacheKeyComponents,
  type InterceptedApiCall,
  type InterceptedRequest,
  type InterceptedResponse,
} from "./interceptors";

// Data Pipeline exports
export {
  RequestPipeline,
  createRequestPipeline,
  defaultPipeline,
  classifyError,
  type ErrorClassification,
  type ErrorType,
  type PipelineMiddleware,
  type PipelineOptions,
  type RequestContext,
  type ResponseContext,
} from "./data-pipeline";

// Re-export everything from types for convenience
export * from "./types";

// Re-export all utils (including validateExternalId)
export * from "./utils";

// Request normalization utilities
export {
  isDuplicateRequest,
  normalizeRequest,
  requestsEqual,
  type NormalizedRequest,
  type OpenAlexRequest,
} from "./utils/request-normalizer";
