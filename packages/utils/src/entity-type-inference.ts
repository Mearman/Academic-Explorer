import type {
	Work,
	Author,
	Source,
	InstitutionEntity,
	Topic,
	Concept,
	Publisher,
	Funder,
	EntityType,
} from "@academic-explorer/types"

/**
 * OpenAlex ID patterns for different entity types
 */
export const ENTITY_ID_PATTERNS = {
	works: /^W\d+/,
	authors: /^A\d+/,
	sources: /^S\d+/,
	institutions: /^I\d+/,
	topics: /^T\d+/,
	concepts: /^C\d+/,
	publishers: /^P\d+/,
	funders: /^F\d+/,
} as const

/**
 * External ID patterns for different entity types
 */
export const EXTERNAL_ID_PATTERNS = {
	works: {
		doi: /^10\.\d+\/[a-z\d]+/, // DOI pattern
		pmid: /^\d+/, // PubMed ID
		pmcid: /^[a-zA-Z]\d+/, // PMC ID
		wikidata: /^Q\d+/, // Wikidata Q-ID
	},
	authors: {
		orcid: /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, // ORCID pattern
		wikidata: /^Q\d+/, // Wikidata Q-ID
	},
	sources: {
		issn: /^\d{4}-\d{3}X?(\d{3})$/, // ISSN pattern
		issn_l: /^\d{4}-\d{3}-\d{3}X$/, // ISSN-L pattern
		wikidata: /^Q\d+/, // Wikidata Q-ID
	},
	institutions: {
		ror: /^https:\/\/ror\.org\/[0-9a-zA-Z]+/, // ROR URL pattern
		wikidata: /^Q\d+/, // Wikidata Q-ID
		grid: /^grid\.\d+/, // GRID ID pattern (deprecated)
	},
	publishers: {
		issn: /^\d{4}-\d{3}X?(\d{3})$/, // ISSN pattern
		issn_l: /^\d{4}-\d{3}-\d{3}X$/, // ISSN-L pattern
		wikidata: /^Q\d+/, // Wikidata Q-ID
	},
} as const

/**
 * Type guard to check if a string matches a pattern
 */
const matchesPattern = (pattern: RegExp, id: string): boolean => {
	return pattern.test(id)
}

/**
 * Infer entity type from a standard OpenAlex ID
 */
export function inferEntityTypeFromOpenAlexId(id: string): EntityType | null {
	for (const [entityType, pattern] of Object.entries(ENTITY_ID_PATTERNS)) {
		if (matchesPattern(pattern, id)) {
			return entityType as EntityType
		}
	}
	return null
}

/**
 * Infer entity type from external ID (DOI, ORCID, ISSN, etc.)
 */
export function inferEntityTypeFromExternalId(id: string): EntityType | null {
	// Check DOI patterns
	if (EXTERNAL_ID_PATTERNS.works.doi.test(id)) return "works"
	if (EXTERNAL_ID_PATTERNS.works.pmid.test(id)) return "works"
	if (EXTERNAL_ID_PATTERNS.works.pmcid.test(id)) return "works"
	if (EXTERNAL_ID_PATTERNS.works.wikidata.test(id)) return "works"

	// Check author patterns
	if (EXTERNAL_ID_PATTERNS.authors.orcid.test(id)) return "authors"
	if (EXTERNAL_ID_PATTERNS.authors.wikidata.test(id)) return "authors"

	// Check source patterns
	if (EXTERNAL_ID_PATTERNS.sources.issn.test(id)) return "sources"
	if (EXTERNAL_ID_PATTERNS.sources.issn_l.test(id)) return "sources"
	if (EXTERNAL_ID_PATTERNS.sources.wikidata.test(id)) return "sources"

	// Check institution patterns
	if (EXTERNAL_ID_PATTERNS.institutions.ror.test(id)) return "institutions"
	if (EXTERNAL_ID_PATTERNS.institutions.wikidata.test(id)) return "institutions"
	if (EXTERNAL_ID_PATTERNS.institutions.grid.test(id)) return "institutions"

	// Check publisher patterns
	if (EXTERNAL_ID_PATTERNS.publishers.issn.test(id)) return "publishers"
	if (EXTERNAL_ID_PATTERNS.publishers.issn_l.test(id)) return "publishers"
	if (EXTERNAL_ID_PATTERNS.publishers.wikidata.test(id)) return "publishers"

	// Check topic patterns (using T-prefixed IDs)
	if (ENTITY_ID_PATTERNS.topics.test(id)) return "topics"

	// Check concept patterns (using C-prefixed IDs)
	if (ENTITY_ID_PATTERNS.concepts.test(id)) return "concepts"

	return null
}

/**
 * Comprehensive entity type inference from any ID format
 */
export function inferEntityType(id: string): EntityType | null {
	// Try OpenAlex ID patterns first
	const openAlexType = inferEntityTypeFromOpenAlexId(id)
	if (openAlexType) return openAlexType

	// Fall back to external ID patterns
	return inferEntityTypeFromExternalId(id)
}

/**
 * Get entity type from a typed entity object
 */
export function getEntityTypeFromEntity<
	T extends Work | Author | Source | InstitutionEntity | Topic | Concept | Publisher | Funder,
>(entity: T): EntityType {
	// Use type narrowing based on unique properties
	if ("orcid" in entity) return "authors"
	if ("issn" in entity || "issn_l" in entity) return "sources"
	if ("ror" in entity) return "institutions"
	if ("doi_url" in entity || "pmid" in entity || "pmcid" in entity) return "works"
	if ("publication_year_range" in entity) return "publishers" // Publishers have year ranges

	// Default to topic/concept based on context or remaining options
	return "topics" // Default fallback
}
