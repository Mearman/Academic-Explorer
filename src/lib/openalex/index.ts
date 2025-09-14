/**
 * OpenAlex API Client - Main Export
 *
 * Comprehensive TypeScript client for the OpenAlex API
 * https://docs.openalex.org/
 */

// Main client exports
export {
	OpenAlexClient,
	createOpenAlexClient,
	openAlex,
	type OpenAlexClientOptions
} from "./openalex-client";

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

// Utilities
export {
	AutocompleteApi
} from "./utils/autocomplete";

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

// Re-export everything from types for convenience
export * from "./types";