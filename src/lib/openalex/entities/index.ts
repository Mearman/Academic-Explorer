/**
 * OpenAlex Entities API - Main exports
 * Provides comprehensive access to all OpenAlex entity types
 */

// Export all entity APIs
export * from "./works";
export * from "./authors";
export * from "./sources";
export * from "./institutions";
export * from "./topics";
export * from "./publishers";
export * from "./funders";
export * from "./keywords";

// Export types and interfaces
export type {
	WorksQueryParams,
	SearchWorksOptions,
	RelatedWorksOptions,
} from "./works";

export type {
	AuthorWorksFilters,
	AuthorCollaboratorsFilters,
} from "./authors";

// Note: sources.ts uses QueryParams directly, no custom interfaces

export type {
	InstitutionsQueryParams,
} from "./institutions";

// Note: topics.ts uses QueryParams directly, no custom interfaces

// Note: publishers.ts uses QueryParams directly, no custom interfaces

// Note: funders.ts uses QueryParams directly, no custom interfaces

export type {
	KeywordsQueryParams,
	SearchKeywordsOptions,
} from "./keywords";

