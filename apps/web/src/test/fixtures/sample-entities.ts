/**
 * Sample entity IDs for E2E testing
 *
 * These are fallback IDs used when runtime discovery from OpenAlex API fails.
 * Each ID represents a known-stable entity that should remain accessible.
 */

import type { EntityType } from "@bibgraph/types";

/**
 * Sample OpenAlex entity IDs by type
 * Used for smoke testing entity detail pages
 */
export const SAMPLE_ENTITIES: Record<EntityType, string> = {
	works: "W2741809807",
	authors: "A5017898742",
	sources: "S137773608",
	institutions: "I27837315",
	topics: "T10159",
	publishers: "P4310319900",
	funders: "F4320308380",
	concepts: "C2778407487",
	keywords: "K10982",
	domains: "D1",
	fields: "F17",
	subfields: "SF30",
};

/**
 * Sample external identifiers for testing external ID resolution routes
 */
export const SAMPLE_EXTERNAL_IDS = {
	orcid: "0000-0002-1298-3089",
	issn: "2041-1723",
	ror: "00cvxb145",
	doi: "10.1038/nature12373",
} as const;

/**
 * Entity type to URL path segment mapping
 */
export const ENTITY_TYPE_TO_PATH: Record<EntityType, string> = {
	works: "works",
	authors: "authors",
	sources: "sources",
	institutions: "institutions",
	topics: "topics",
	publishers: "publishers",
	funders: "funders",
	concepts: "concepts",
	keywords: "keywords",
	domains: "domains",
	fields: "fields",
	subfields: "subfields",
};
