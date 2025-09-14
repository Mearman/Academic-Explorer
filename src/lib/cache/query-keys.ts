/**
 * Centralized query key factory for TanStack Query
 * Provides consistent, hierarchical query keys for all OpenAlex entities
 */

import type { EntityType } from "@/config/cache";

/**
 * Query key factory following TanStack Query best practices
 * Hierarchical structure allows for efficient invalidation
 */
export const queryKeys = {
	// Root key for all OpenAlex queries
	all: ["openalex"] as const,

	// Works queries
	works: () => [...queryKeys.all, "works"] as const,
	work: (id: string) => [...queryKeys.works(), id] as const,
	workCitations: (id: string, params?: Record<string, unknown>) =>
    [...queryKeys.work(id), "citations", params] as const,
	workReferences: (id: string, params?: Record<string, unknown>) =>
    [...queryKeys.work(id), "references", params] as const,
	workRelated: (id: string, params?: Record<string, unknown>) =>
    [...queryKeys.work(id), "related", params] as const,

	// Authors queries
	authors: () => [...queryKeys.all, "authors"] as const,
	author: (id: string) => [...queryKeys.authors(), id] as const,
	authorWorks: (id: string, params?: Record<string, unknown>) =>
    [...queryKeys.author(id), "works", params] as const,
	authorCoauthors: (id: string, params?: Record<string, unknown>) =>
    [...queryKeys.author(id), "coauthors", params] as const,
	authorInstitutions: (id: string) => [...queryKeys.author(id), "institutions"] as const,

	// Sources queries
	sources: () => [...queryKeys.all, "sources"] as const,
	source: (id: string) => [...queryKeys.sources(), id] as const,
	sourceWorks: (id: string, params?: Record<string, unknown>) =>
    [...queryKeys.source(id), "works", params] as const,
	sourceAuthors: (id: string, params?: Record<string, unknown>) =>
    [...queryKeys.source(id), "authors", params] as const,

	// Institutions queries
	institutions: () => [...queryKeys.all, "institutions"] as const,
	institution: (id: string) => [...queryKeys.institutions(), id] as const,
	institutionWorks: (id: string, params?: Record<string, unknown>) =>
    [...queryKeys.institution(id), "works", params] as const,
	institutionAuthors: (id: string, params?: Record<string, unknown>) =>
    [...queryKeys.institution(id), "authors", params] as const,

	// Topics queries
	topics: () => [...queryKeys.all, "topics"] as const,
	topic: (id: string) => [...queryKeys.topics(), id] as const,
	topicWorks: (id: string, params?: Record<string, unknown>) =>
    [...queryKeys.topic(id), "works", params] as const,

	// Publishers queries
	publishers: () => [...queryKeys.all, "publishers"] as const,
	publisher: (id: string) => [...queryKeys.publishers(), id] as const,

	// Funders queries
	funders: () => [...queryKeys.all, "funders"] as const,
	funder: (id: string) => [...queryKeys.funders(), id] as const,

	// Search queries (with parameters for cache invalidation)
	search: (query: string, filters?: Record<string, unknown>) =>
    [...queryKeys.all, "search", { query, filters }] as const,
	searchWorks: (query: string, filters?: Record<string, unknown>) =>
    [...queryKeys.works(), "search", { query, filters }] as const,
	searchAuthors: (query: string, filters?: Record<string, unknown>) =>
    [...queryKeys.authors(), "search", { query, filters }] as const,
	searchSources: (query: string, filters?: Record<string, unknown>) =>
    [...queryKeys.sources(), "search", { query, filters }] as const,
	searchInstitutions: (query: string, filters?: Record<string, unknown>) =>
    [...queryKeys.institutions(), "search", { query, filters }] as const,

	// Autocomplete queries
	autocomplete: (query: string, entityType: EntityType) =>
    [...queryKeys.all, "autocomplete", entityType, query] as const,

	// External ID queries (DOI, ORCID, etc.)
	externalId: (type: string, value: string) =>
    [...queryKeys.all, "external", type, value] as const,
} as const;

/**
 * Get query keys for a specific entity type and ID
 */
export function getEntityQueryKey(entityType: EntityType, id: string) {
	switch (entityType) {
		case "work":
			return queryKeys.work(id);
		case "author":
			return queryKeys.author(id);
		case "source":
			return queryKeys.source(id);
		case "institution":
			return queryKeys.institution(id);
		case "topic":
			return queryKeys.topic(id);
		case "publisher":
			return queryKeys.publisher(id);
		case "funder":
			return queryKeys.funder(id);
		default:
			throw new Error(`Unknown entity type: ${entityType}`);
	}
}

/**
 * Get related entity query keys for a specific entity
 */
export function getRelatedEntityQueryKeys(entityType: EntityType, id: string) {
	switch (entityType) {
		case "work":
			return {
				citations: queryKeys.workCitations(id),
				references: queryKeys.workReferences(id),
				related: queryKeys.workRelated(id),
			};
		case "author":
			return {
				works: queryKeys.authorWorks(id),
				coauthors: queryKeys.authorCoauthors(id),
				institutions: queryKeys.authorInstitutions(id),
			};
		case "source":
			return {
				works: queryKeys.sourceWorks(id),
				authors: queryKeys.sourceAuthors(id),
			};
		case "institution":
			return {
				works: queryKeys.institutionWorks(id),
				authors: queryKeys.institutionAuthors(id),
			};
		case "topic":
			return {
				works: queryKeys.topicWorks(id),
			};
		default:
			return {};
	}
}

/**
 * Type-safe query key creation helper
 */
export type QueryKey = readonly string[];