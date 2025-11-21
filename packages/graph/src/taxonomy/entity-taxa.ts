/**
 * Relation taxonomy definitions for Academic Explorer
 *
 * NOTE: Entity metadata has been moved to @academic-explorer/types/entities
 * Import entity metadata directly from types package, not from here.
 */

import type { EntityType } from "@academic-explorer/types"
import { RelationType } from "@academic-explorer/types"
import type { Taxon } from "@academic-explorer/types"
import { ENTITY_METADATA } from "@academic-explorer/types"

// Re-export Taxon for backward compatibility
export type { Taxon }

/**
 * Taxonomy definitions for all entity types
 * @deprecated Use ENTITY_METADATA instead - maintained for backward compatibility
 */
export const ENTITY_TAXONOMY: Record<EntityType, Taxon> = {
	works: ENTITY_METADATA.works,
	authors: ENTITY_METADATA.authors,
	sources: ENTITY_METADATA.sources,
	institutions: ENTITY_METADATA.institutions,
	publishers: ENTITY_METADATA.publishers,
	funders: ENTITY_METADATA.funders,
	topics: ENTITY_METADATA.topics,
	concepts: ENTITY_METADATA.concepts,
	keywords: ENTITY_METADATA.keywords,
	domains: ENTITY_METADATA.domains,
	fields: ENTITY_METADATA.fields,
	subfields: ENTITY_METADATA.subfields,
}

/**
 * Taxonomy definitions for all relation types
 */
export const RELATION_TAXONOMY: Record<RelationType, Taxon> = {
	// Core relationships (noun form - preferred)
	[RelationType.AUTHORSHIP]: {
		displayName: "Authorship",
		description: "Author contributed to or created the work",
		color: "green",
		plural: "Authorships",
	},
	[RelationType.AFFILIATION]: {
		displayName: "Affiliation",
		description: "Author is affiliated with an institution",
		color: "orange",
		plural: "Affiliations",
	},
	[RelationType.PUBLICATION]: {
		displayName: "Publication",
		description: "Work was published in a source",
		color: "purple",
		plural: "Publications",
	},
	[RelationType.REFERENCE]: {
		displayName: "Reference",
		description: "Work cites or references another work",
		color: "blue",
		plural: "References",
	},
	[RelationType.TOPIC]: {
		displayName: "Topic",
		description: "Work is associated with a research topic",
		color: "red",
		plural: "Topics",
	},
	[RelationType.FUNDED_BY]: {
		displayName: "Funded By",
		description: "Work received funding from a funder",
		color: "cyan",
		plural: "Funded By",
	},
	[RelationType.HOST_ORGANIZATION]: {
		displayName: "Host Organization",
		description: "Source is published by a publisher",
		color: "teal",
		plural: "Host Organizations",
	},
	[RelationType.LINEAGE]: {
		displayName: "Lineage",
		description: "Institution is a subsidiary or department of another institution",
		color: "orange",
		plural: "Lineages",
	},
	[RelationType.INSTITUTION_ASSOCIATED]: {
		displayName: "Associated Institution",
		description: "Institution has an association with another institution",
		color: "orange",
		plural: "Associated Institutions",
	},
	[RelationType.INSTITUTION_HAS_REPOSITORY]: {
		displayName: "Has Repository",
		description: "Institution maintains a research repository",
		color: "purple",
		plural: "Has Repositories",
	},

	// Additional relationship types
	[RelationType.PUBLISHER_CHILD_OF]: {
		displayName: "Child Of",
		description: "Publisher is a subsidiary of another publisher",
		color: "teal",
		plural: "Children Of",
	},
	[RelationType.WORK_HAS_KEYWORD]: {
		displayName: "Has Keyword",
		description: "Work is tagged with a keyword",
		color: "gray",
		plural: "Has Keywords",
	},
		[RelationType.AUTHOR_RESEARCHES]: {
		displayName: "Researches",
		description: "Author conducts research in a topic area",
		color: "red",
		plural: "Researches",
	},
	[RelationType.INSTITUTION_LOCATED_IN]: {
		displayName: "Located In",
		description: "Institution is located in a geographic area",
		color: "yellow",
		plural: "Located In",
	},
	[RelationType.FUNDER_LOCATED_IN]: {
		displayName: "Located In",
		description: "Funder is located in a geographic area",
		color: "yellow",
		plural: "Located In",
	},
	[RelationType.TOPIC_PART_OF_FIELD]: {
		displayName: "Part Of Field",
		description: "Topic belongs to a broader research field",
		color: "red",
		plural: "Parts Of Fields",
	},
	[RelationType.FIELD_PART_OF_DOMAIN]: {
		displayName: "Field Part Of Domain",
		description: "Research field belongs to a broader domain",
		color: "red",
		plural: "Fields Part Of Domains",
	},
	[RelationType.TOPIC_PART_OF_SUBFIELD]: {
		displayName: "Topic Part Of Subfield",
		description: "Topic belongs to a research subfield",
		color: "red",
		plural: "Topics Part Of Subfields",
	},
	[RelationType.TOPIC_SIBLING]: {
		displayName: "Topic Sibling",
		description: "Topics share the same parent field or subfield",
		color: "red",
		plural: "Topic Siblings",
	},
	[RelationType.RELATED_TO]: {
		displayName: "Related To",
		description: "General relationship between entities",
		color: "gray",
		plural: "Related To",
	},

	// Missing relation types that need string keys
	"concept": {
		displayName: "Has Concept",
		description: "Work is associated with a legacy concept",
		color: "violet",
		plural: "Has Concepts",
	},
	"has_role": {
		displayName: "Has Role",
		description: "Entity has a role in relation to another entity",
		color: "indigo",
		plural: "Has Roles",
	},

}

/**
 * Icon mappings for entity types using Tabler icon names
 * @deprecated Use ENTITY_METADATA instead - maintained for backward compatibility
 */
export const ENTITY_ICON_MAP: Record<EntityType, string> = {
	works: ENTITY_METADATA.works.icon,
	authors: ENTITY_METADATA.authors.icon,
	sources: ENTITY_METADATA.sources.icon,
	institutions: ENTITY_METADATA.institutions.icon,
	publishers: ENTITY_METADATA.publishers.icon,
	funders: ENTITY_METADATA.funders.icon,
	topics: ENTITY_METADATA.topics.icon,
	concepts: ENTITY_METADATA.concepts.icon,
	keywords: ENTITY_METADATA.keywords.icon,
	domains: ENTITY_METADATA.domains.icon,
	fields: ENTITY_METADATA.fields.icon,
	subfields: ENTITY_METADATA.subfields.icon,
}

/**
 * Helper function to get taxonomy information for an entity type
 * @deprecated Use ENTITY_METADATA directly
 */
export function getEntityTaxon(entityType: EntityType): Taxon {
	return ENTITY_TAXONOMY[entityType]
}

/**
 * Helper function to get taxonomy information for a relation type
 */
export function getRelationTaxon(relationType: RelationType): Taxon {
	return RELATION_TAXONOMY[relationType]
}

/**
 * Helper function to get the color for a relation type
 */
export function getRelationColor(relationType: RelationType): string {
	return RELATION_TAXONOMY[relationType].color
}

/**
 * Helper function to get the icon for an entity type
 * @deprecated Use ENTITY_METADATA[entityType].icon directly
 */
export function getEntityIcon(entityType: EntityType): string {
	return ENTITY_METADATA[entityType].icon
}

/**
 * Helper function to get the color for an entity type
 * @deprecated Use ENTITY_METADATA[entityType].color directly
 */
export function getEntityColor(entityType: EntityType): string {
	return ENTITY_METADATA[entityType].color
}

/**
 * Helper function to get the display name for an entity type
 * @deprecated Use ENTITY_METADATA[entityType].displayName directly
 */
export function getEntityDisplayName(entityType: EntityType): string {
	return ENTITY_METADATA[entityType].displayName
}

/**
 * Helper function to get the plural form for an entity type
 * @deprecated Use ENTITY_METADATA[entityType].plural directly
 */
export function getEntityPlural(entityType: EntityType): string {
	return ENTITY_METADATA[entityType].plural
}
