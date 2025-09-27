/**
 * OpenAlex API Client - Main Export
 *
 * Comprehensive TypeScript client for the OpenAlex API
 * https://docs.openalex.org/
 */

// Main client exports (removed - legacy client files cleaned up)

// Base client and configuration
export {
	OpenAlexBaseClient,
	type OpenAlexClientConfig,
	OpenAlexApiError,
	OpenAlexRateLimitError
} from "./client";

// Entity APIs
export { WorksApi } from "./entities/works";
export { AuthorsApi } from "./entities/authors";
export { SourcesApi } from "./entities/sources";
export { InstitutionsApi } from "./entities/institutions";
export { TopicsApi } from "./entities/topics";
export { PublishersApi } from "./entities/publishers";
export { FundersApi } from "./entities/funders";
export { KeywordsApi } from "./entities/keywords";
export { TextAnalysisApi } from "./entities/text-analysis";
export { ConceptsApi } from "./entities/concepts";

// Utilities
export {
	AutocompleteApi
} from "./utils/autocomplete";

// Type guards
export {
	isWork,
	isAuthor,
	isInstitution,
	isSource,
	isTopic,
	isConcept,
	isPublisher,
	isFunder,
	isKeyword,
	getEntityType,
	hasProperty,
	isNonNull,
	isOpenAlexEntity
} from "./type-guards";

// Client configuration utilities
export {
	updateOpenAlexEmail,
	cachedOpenAlex,
	CachedOpenAlexClient,
	type ClientApis
} from "./cached-client";

// Advanced field selection utilities
export {
	ADVANCED_FIELD_SELECTIONS,
	createAdvancedFieldSelection
} from "./advanced-field-selection";

export type {
	AdvancedEntityFieldSelections
} from "./advanced-field-selection";

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
	SELECT_PRESETS
} from "./utils/query-builder";

// Type exports - All the TypeScript types for OpenAlex entities
export type {
	// Core entities
	Work,
	Author,
	Source,
	InstitutionEntity,
	Topic,
	Concept,
	Publisher,
	Funder,

	// Common types
	OpenAlexId,
	DOI,
	ORCID,
	RORId,
	ISSNId,
	WikidataId,
	OpenAlexResponse,
	OpenAlexError,
	Location,
	CountsByYear,
	Institution,
	Authorship,
	AutocompleteResult,
	NGram,

	// Filter types
	WorksFilters,
	AuthorsFilters,
	SourcesFilters,
	InstitutionsFilters,
	TopicsFilters,
	PublishersFilters,
	FundersFilters,
	EntityFilters,

	// Utility types
	QueryParams,
	EntityType,
	OpenAlexEntity
} from "./types";

// Text Analysis API types
export type {
	TextAnalysisOptions,
	TextAnalysisEntity,
	TextAnalysisKeyword,
	TextAnalysisTopic,
	TextAnalysisConcept,
	TextAnalysisResponse,
	KeywordsResponse,
	TopicsResponse,
	ConceptsResponse
} from "./entities/text-analysis";

// Concepts API types
export type {
	StrictConceptsQueryParams,
	ConceptsQueryParams,
	ConceptSortOption,
	ConceptSelectField,
	SearchConceptsOptions,
	AutocompleteOptions
} from "./entities/concepts";

// Re-export everything from types for convenience
export * from "./types";