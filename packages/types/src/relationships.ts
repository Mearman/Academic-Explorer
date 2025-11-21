/**
 * Relationship type definitions for Academic Explorer
 * Moved from graph package to avoid circular dependencies
 */

/**
 * Relation type enum for OpenAlex relationships
 * Edge directions reflect OpenAlex data ownership: source entity owns the relationship array
 */
export enum RelationType {
	// Core academic relationships (matching OpenAlex field names - noun form)
	// Edge directions reflect OpenAlex data ownership: source entity owns the relationship array
	AUTHORSHIP = "AUTHORSHIP", // Work → Author (via authorships[])
	AFFILIATION = "AFFILIATION", // Author → Institution (via affiliations[])
	PUBLICATION = "PUBLICATION", // Work → Source (via primary_location.source)
	REFERENCE = "REFERENCE", // Work → Work (via referenced_works[])
	TOPIC = "TOPIC", // Work → Topic (via topics[])

	// Publishing relationships
	HOST_ORGANIZATION = "HOST_ORGANIZATION", // Source → Publisher (via host_organization)

	// Institutional relationships
	LINEAGE = "LINEAGE", // Institution → Institution (via lineage[])
	INSTITUTION_ASSOCIATED = "institution_associated", // Institution → Institution (via associated_institutions[])
	INSTITUTION_HAS_REPOSITORY = "institution_has_repository", // Institution → Source (via repositories[])

	// Backwards-compatible aliases (deprecated - use noun form above)
	/** @deprecated Use AUTHORSHIP instead */
	AUTHORED = "AUTHORSHIP",
	/** @deprecated Use AFFILIATION instead */
	AFFILIATED = "AFFILIATION",
	/** @deprecated Use PUBLICATION instead */
	PUBLISHED_IN = "PUBLICATION",
	/** @deprecated Use REFERENCE instead */
	REFERENCES = "REFERENCE",
	/** @deprecated Use HOST_ORGANIZATION instead */
	SOURCE_PUBLISHED_BY = "HOST_ORGANIZATION",
	/** @deprecated Use LINEAGE instead */
	INSTITUTION_CHILD_OF = "LINEAGE",
	/** @deprecated Use TOPIC instead */
	WORK_HAS_TOPIC = "TOPIC",

	// Additional relationship types (less commonly used)
	AUTHOR_RESEARCHES = "author_researches", // Author → Topic
	FIELD_PART_OF_DOMAIN = "field_part_of_domain", // Field → Domain
	FUNDED_BY = "funded_by", // Work → Funder
	FUNDER_LOCATED_IN = "funder_located_in", // Funder → Country
	INSTITUTION_LOCATED_IN = "institution_located_in", // Institution → Geo/Country
	PUBLISHER_CHILD_OF = "publisher_child_of", // Publisher → Parent Publisher
	TOPIC_PART_OF_FIELD = "topic_part_of_field", // Topic → Field → Domain
	TOPIC_PART_OF_SUBFIELD = "topic_part_of_subfield", // Topic → Subfield
	TOPIC_SIBLING = "topic_sibling", // Topic → Topic (sibling relationship)
	WORK_HAS_KEYWORD = "work_has_keyword", // Work → Keyword
	CONCEPT = "concept", // Work → Concept (legacy concepts[])
	HAS_ROLE = "has_role", // Entity → Entity via roles[]

	// General catch-all (use sparingly)
	RELATED_TO = "related_to", // General relationships
}