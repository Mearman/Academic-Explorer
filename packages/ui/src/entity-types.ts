/**
 * UI-specific entity type configuration
 * Combines taxonomy data with React icon components for UI rendering
 */

import type { EntityType } from "@academic-explorer/types"

/**
 * Taxonomy entry for entities
 */
interface Taxon {
	displayName: string
	description: string
	color: string
	plural: string
}

/**
 * Taxonomy definitions for all entity types (copied from graph package to avoid dependency)
 */
const ENTITY_TAXONOMY: Record<EntityType, Taxon> = {
	works: {
		displayName: "Work",
		description: "Academic publications, articles, books, and other scholarly outputs",
		color: "blue",
		plural: "Works",
	},
	authors: {
		displayName: "Author",
		description: "Researchers, scholars, and contributors to academic works",
		color: "green",
		plural: "Authors",
	},
	sources: {
		displayName: "Source",
		description: "Journals, conferences, books, and other publication venues",
		color: "purple",
		plural: "Sources",
	},
	institutions: {
		displayName: "Institution",
		description: "Universities, research centers, and academic organizations",
		color: "orange",
		plural: "Institutions",
	},
	publishers: {
		displayName: "Publisher",
		description: "Publishing companies and organizations",
		color: "teal",
		plural: "Publishers",
	},
	funders: {
		displayName: "Funder",
		description: "Funding agencies and research sponsors",
		color: "cyan",
		plural: "Funders",
	},
	topics: {
		displayName: "Topic",
		description: "Research topics and subject areas",
		color: "red",
		plural: "Topics",
	},
	concepts: {
		displayName: "Concept",
		description: "Semantic concepts and research areas from OpenAlex",
		color: "pink",
		plural: "Concepts",
	},
	keywords: {
		displayName: "Keyword",
		description: "User-defined keywords and tags",
		color: "gray",
		plural: "Keywords",
	},
}

function getEntityTaxon(entityType: EntityType): Taxon {
	return ENTITY_TAXONOMY[entityType]
}
import {
	IconFileText,
	IconUser,
	IconBook,
	IconBuilding,
	IconPrinter,
	IconCoin,
	IconTag,
	IconBulb,
	IconHash,
} from "@tabler/icons-react"

/**
 * Extended entity type configuration for UI components
 */
export interface EntityTypeConfig {
	/** Entity type identifier */
	entityType: EntityType
	/** Human-readable display name */
	label: string
	/** Plural form for display */
	plural: string
	/** Detailed description */
	description: string
	/** UI color identifier */
	color: string
	/** React icon component */
	icon: React.ComponentType<{ size?: number; className?: string }>
}

/**
 * Icon component mapping for entity types
 */
const ENTITY_ICON_COMPONENTS: Record<
	EntityType,
	React.ComponentType<{ size?: number; className?: string }>
> = {
	works: IconFileText,
	authors: IconUser,
	sources: IconBook,
	institutions: IconBuilding,
	publishers: IconPrinter,
	funders: IconCoin,
	topics: IconTag,
	concepts: IconBulb,
	keywords: IconHash,
}

/**
 * Complete entity type configurations for UI components
 */
export const ENTITY_TYPE_CONFIGS: Record<EntityType, EntityTypeConfig> = (() => {
	const configs: Record<EntityType, EntityTypeConfig> = {} as Record<EntityType, EntityTypeConfig>

	for (const entityType of Object.keys(ENTITY_TAXONOMY)) {
		const type = entityType as EntityType
		const taxon = getEntityTaxon(type)

		configs[type] = {
			entityType: type,
			label: taxon.displayName,
			plural: taxon.plural,
			description: taxon.description,
			color: taxon.color,
			icon: ENTITY_ICON_COMPONENTS[type],
		}
	}

	return configs
})()

/**
 * Array of all entity type configurations for iteration
 */
export const ENTITY_TYPE_OPTIONS: EntityTypeConfig[] = Object.values(ENTITY_TYPE_CONFIGS)

/**
 * Helper function to get entity type configuration
 */
export function getEntityTypeConfig(entityType: EntityType): EntityTypeConfig {
	return ENTITY_TYPE_CONFIGS[entityType]
}

/**
 * Helper function to get icon component for entity type
 */
export function getEntityIconComponent(
	entityType: EntityType
): React.ComponentType<{ size?: number; className?: string }> {
	return ENTITY_TYPE_CONFIGS[entityType].icon
}
