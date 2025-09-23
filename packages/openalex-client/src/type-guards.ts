/**
 * Type guards for OpenAlex entity types
 * Provides runtime type checking for proper TypeScript type narrowing
 */

import type {
	OpenAlexEntity,
	Work,
	Author,
	InstitutionEntity,
	Source,
	Topic,
	Concept,
	Publisher,
	Funder,
	Keyword
} from "./types";

/**
 * Helper to safely check if entity is a non-null object
 */
function isValidEntity(entity: unknown): entity is Record<string, unknown> {
	return entity != null && typeof entity === "object";
}

/**
 * Type guard to check if an entity is a Work
 */
export function isWork(entity: OpenAlexEntity): entity is Work {
	return (
		isValidEntity(entity) &&
    "authorships" in entity &&
    "locations" in entity &&
    "primary_location" in entity &&
    "publication_year" in entity
	);
}

/**
 * Type guard to check if an entity is an Author
 */
export function isAuthor(entity: OpenAlexEntity): entity is Author {
	return (
		isValidEntity(entity) &&
    "affiliations" in entity &&
    "works_count" in entity &&
    "last_known_institutions" in entity &&
    "orcid" in entity
	);
}

/**
 * Type guard to check if an entity is an Institution
 */
export function isInstitution(entity: OpenAlexEntity): entity is InstitutionEntity {
	return (
		isValidEntity(entity) &&
    "geo" in entity &&
    "country_code" in entity &&
    "works_count" in entity &&
    "ror" in entity
	);
}

/**
 * Type guard to check if an entity is a Source
 */
export function isSource(entity: OpenAlexEntity): entity is Source {
	return (
		isValidEntity(entity) &&
    "issn_l" in entity &&
    "host_organization" in entity &&
    "abbreviated_title" in entity
	);
}

/**
 * Type guard to check if an entity is a Topic
 */
export function isTopic(entity: OpenAlexEntity): entity is Topic {
	return (
		isValidEntity(entity) &&
    "subfield" in entity &&
    "field" in entity &&
    "domain" in entity &&
    "works_count" in entity &&
    "cited_by_count" in entity
	);
}

/**
 * Type guard to check if an entity is a Concept
 */
export function isConcept(entity: OpenAlexEntity): entity is Concept {
	return (
		isValidEntity(entity) &&
    "level" in entity &&
    "ancestors" in entity &&
    "related_concepts" in entity &&
    "international" in entity &&
    "works_count" in entity &&
    "cited_by_count" in entity
	);
}

/**
 * Type guard to check if an entity is a Publisher
 */
export function isPublisher(entity: OpenAlexEntity): entity is Publisher {
	return (
		isValidEntity(entity) &&
    "parent_publisher" in entity &&
    "sources_api_url" in entity &&
    "hierarchy_level" in entity
	);
}

/**
 * Type guard to check if an entity is a Funder
 */
export function isFunder(entity: OpenAlexEntity): entity is Funder {
	return (
		isValidEntity(entity) &&
    "grants_count" in entity &&
    "works_count" in entity &&
    "country_code" in entity &&
    "homepage_url" in entity
	);
}

/**
 * Type guard to check if an entity is a Keyword
 */
export function isKeyword(entity: OpenAlexEntity): entity is Keyword {
	return (
		isValidEntity(entity) &&
    "keywords" in entity &&
    "works_count" in entity &&
    "cited_by_count" in entity &&
    "works_api_url" in entity &&
    // Additional distinction from Topic: Keywords don't have subfield/field/domain
    !("subfield" in entity) &&
    !("field" in entity) &&
    !("domain" in entity)
	);
}

/**
 * Get the entity type string from an OpenAlex entity
 */
export function getEntityType(entity: OpenAlexEntity): string {
	if (isWork(entity)) return "works";
	if (isAuthor(entity)) return "authors";
	if (isInstitution(entity)) return "institutions";
	if (isSource(entity)) return "sources";
	if (isTopic(entity)) return "topics";
	if (isConcept(entity)) return "concepts";
	if (isPublisher(entity)) return "publishers";
	if (isFunder(entity)) return "funders";
	if (isKeyword(entity)) return "keywords";
	return "unknown";
}

/**
 * Utility type guard to check if an entity has a specific property
 */
export function hasProperty<K extends string>(
	entity: OpenAlexEntity,
	property: K
): entity is OpenAlexEntity & Record<K, unknown> {
	return property in entity;
}

/**
 * Type guard for filtering non-null values
 */
export function isNonNull<T>(value: T | null | undefined): value is T {
	return value !== null && value !== undefined;
}

/**
 * Type guard for checking if a TanStack Query result contains an OpenAlexEntity
 */
export function isOpenAlexEntity(data: unknown): data is OpenAlexEntity {
	if (typeof data !== "object" || data === null) return false;

	// Check if the data has the required properties
	if (!("id" in data && "display_name" in data)) {
		return false;
	}

	// Use array indexing to access properties without type assertions
	const hasValidId = typeof data["id"] === "string";
	const hasValidDisplayName = typeof data["display_name"] === "string";

	return hasValidId && hasValidDisplayName;
}