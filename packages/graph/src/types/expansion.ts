/**
 * Expansion configuration types for relationship discovery in Academic Explorer
 * Supports configurable limits per relationship type to control graph growth
 * and API bandwidth usage while maintaining performance.
 *
 * See research.md Section 4 (lines 441-461) for complete specification
 */

import { RelationType } from './core'

/**
 * Truncation metadata for relationship limits (FR-033, research.md Section 4)
 * Tracks how many entities are included vs available for a given relationship type
 */
export interface TruncationInfo {
	/** Total available entities in OpenAlex for this relationship */
	total: number
	/** Number of entities included in the expansion */
	shown: number
	/** Convenience flag indicating whether more entities are available beyond what was shown */
	hasMore?: boolean
}

/**
 * Configurable limits for relationship expansion
 * Controls how many related entities are fetched for each relationship type
 * Prevents memory exhaustion from highly-connected nodes while allowing
 * per-relationship customization based on use case.
 */
export interface ExpansionLimits {
	/**
	 * Global default limit applied to all relationship types
	 * when no relationship-specific limit is configured.
	 * Default: 10
	 */
	default?: number

	/**
	 * Relationship-specific limits override the global default
	 * Each limit controls max entities fetched for that relationship type
	 */

	/** Work → Authors limit (AUTHORSHIP edges). Default: 10 */
	[RelationType.AUTHORSHIP]?: number

	/** Work → Cited Works limit (REFERENCE edges). Default: 20 */
	[RelationType.REFERENCE]?: number

	/** Work → Funders limit (FUNDED_BY edges). Default: 5 */
	[RelationType.FUNDED_BY]?: number

	/** Author → Institutions limit (AFFILIATION edges). Default: 10 */
	[RelationType.AFFILIATION]?: number

	/** Work → Topics limit (TOPIC edges). Default: 10 */
	[RelationType.TOPIC]?: number

	/** Work → Sources limit (PUBLICATION edges). Default: 10 */
	[RelationType.PUBLICATION]?: number

	/** Source → Publisher limit (HOST_ORGANIZATION edges). Default: 10 */
	[RelationType.HOST_ORGANIZATION]?: number

	/** Institution → Parents limit (LINEAGE edges). Default: 5 */
	[RelationType.LINEAGE]?: number

	/** Topic → Field limit (TOPIC_PART_OF_FIELD edges). Default: 10 */
	[RelationType.TOPIC_PART_OF_FIELD]?: number

	/** Topic → Sibling limit (TOPIC_SIBLING edges). Default: 10 */
	'TOPIC_SIBLING'?: number

	/** Work → Keywords limit (WORK_HAS_KEYWORD edges). Default: 10 */
	[RelationType.WORK_HAS_KEYWORD]?: number

	/** Author → Research Topics limit (AUTHOR_RESEARCHES edges). Default: 10 */
	[RelationType.AUTHOR_RESEARCHES]?: number

	/** Publisher → Parent Publisher limit (PUBLISHER_CHILD_OF edges). Default: 5 */
	[RelationType.PUBLISHER_CHILD_OF]?: number

	/** Topic → Domain limit (FIELD_PART_OF_DOMAIN edges). Default: 10 */
	'FIELD_PART_OF_DOMAIN'?: number
}

/**
 * Recommended default expansion limits by relationship type
 * These values optimize for typical academic network exploration:
 * - Small defaults (5-10) for most relationships to prevent graph explosion
 * - Larger defaults (20-50) for citation/reference networks where depth is important
 * - Very small defaults (5) for hierarchies which are usually small
 *
 * See research.md Section 4 (lines 509-528) for rationale
 */
export const DEFAULT_LIMITS: ExpansionLimits = {
	default: 10,

	// Core work relationships
	[RelationType.AUTHORSHIP]: 10, // Most works have < 10 authors
	[RelationType.REFERENCE]: 20, // Citation networks need more depth
	[RelationType.FUNDED_BY]: 5, // Most works have 1-3 funders
	[RelationType.TOPIC]: 10, // Works typically have 3-5 topics
	[RelationType.PUBLICATION]: 10, // Works have 1 primary location

	// Author relationships
	[RelationType.AFFILIATION]: 10, // Career progression (10 institutions max)

	// Publisher relationships
	[RelationType.HOST_ORGANIZATION]: 10, // Source hosts usually just one publisher
	[RelationType.PUBLISHER_CHILD_OF]: 5, // Publisher hierarchies are small

	// Hierarchies (usually small)
	[RelationType.LINEAGE]: 5, // Institution/publisher parents
	[RelationType.TOPIC_PART_OF_FIELD]: 10, // Topic → Field relationship

	// Additional relationships
	[RelationType.WORK_HAS_KEYWORD]: 10, // Keywords per work
	[RelationType.AUTHOR_RESEARCHES]: 10, // Author research topics
	'TOPIC_SIBLING': 10, // Related topics
	'FIELD_PART_OF_DOMAIN': 10, // Field → Domain relationship
}

/**
 * Provider expansion options including configurable limits
 * Used when expanding nodes to control relationship discovery depth
 */
export interface ProviderExpansionOptions {
	/**
	 * Relationship-specific limits for this expansion
	 * If not provided, uses DEFAULT_LIMITS
	 */
	limits?: ExpansionLimits

	/**
	 * Legacy single limit for backwards compatibility
	 * Applies to all relationship types if limits not provided.
	 * Will be applied as the global default: `limits?.default ?? limit ?? 10`
	 */
	limit?: number
}
