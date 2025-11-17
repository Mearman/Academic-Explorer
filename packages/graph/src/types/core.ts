/**
 * Core graph types and interfaces for Academic Explorer
 * Provider-agnostic definitions that work with any graph visualization library
 */

import type { GraphSnapshot } from "../data/graph-repository"

// Core entity types from OpenAlex
export type EntityType =
	| "works"
	| "authors"
	| "sources"
	| "institutions"
	| "publishers"
	| "funders"
	| "topics"
	| "concepts"
	| "keywords"

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
	FUNDED_BY = "funded_by", // Work → Funder
	PUBLISHER_CHILD_OF = "publisher_child_of", // Publisher → Parent Publisher
	WORK_HAS_KEYWORD = "work_has_keyword", // Work → Keyword
	AUTHOR_RESEARCHES = "author_researches", // Author → Topic
	INSTITUTION_LOCATED_IN = "institution_located_in", // Institution → Geo/Country
	FUNDER_LOCATED_IN = "funder_located_in", // Funder → Country
	TOPIC_PART_OF_FIELD = "topic_part_of_field", // Topic → Field → Domain

	// General catch-all (use sparingly)
	RELATED_TO = "related_to", // General relationships
}

export interface Position {
	x: number
	y: number
}

export interface ExternalIdentifier {
	type: "doi" | "orcid" | "issn_l" | "ror" | "wikidata"
	value: string
	url: string
}

export interface GraphNode {
	id: string // Always OpenAlex ID for internal consistency
	entityType: EntityType
	label: string
	entityId: string // OpenAlex ID
	x: number // XY coordinates for graph positioning
	y: number
	loading?: boolean // Optional loading state
	error?: string | Error // Optional error state

	// External identifiers (DOIs, ORCIDs, etc.)
	externalIds: ExternalIdentifier[]

	// Raw entity data - all display data extracted on-demand via helper functions
	entityData?: Record<string, unknown>

	// Node metadata for loading states, errors, etc.
	metadata?: Record<string, unknown>

	// Work-specific metadata flags (User Story 2)
	isXpac?: boolean // Indicates if this is an XPAC work (dataset/software/specimen/other)
	hasUnverifiedAuthor?: boolean // Indicates if work has authors without Author IDs
}

/**
 * Edge direction type
 * - outbound: Relationship stored on source entity (complete data)
 * - inbound: Relationship discovered via reverse lookup (potentially incomplete)
 */
export type EdgeDirection = 'outbound' | 'inbound'

export interface GraphEdge {
	id: string
	source: string // node id (entity that owns the relationship data)
	target: string // node id (entity being referenced)
	type: RelationType
	direction?: EdgeDirection // Direction reflects data ownership (optional during migration)
	label?: string
	weight?: number
	metadata?: Record<string, unknown> // Relationship-specific data from OpenAlex
}

export interface GraphLayout {
	type: "force" | "hierarchical" | "circular" | "grid" | "force-deterministic" | "d3-force"
	options?: {
		iterations?: number
		strength?: number
		distance?: number
		center?: { x: number; y: number }
		preventOverlap?: boolean
		seed?: number // For deterministic layouts
		forceReLayout?: boolean // Force complete re-layout of all nodes
		// D3-force specific options
		linkDistance?: number
		linkStrength?: number
		chargeStrength?: number
		centerStrength?: number
		collisionRadius?: number
		collisionStrength?: number
		velocityDecay?: number
		alpha?: number
		alphaDecay?: number
	}
}

export interface GraphEvents {
	onNodeClick?: (node: GraphNode) => void
	onNodeHover?: (node: GraphNode | null) => void
	onNodeDoubleClick?: (node: GraphNode) => void
	onEdgeClick?: (edge: GraphEdge) => void
	onBackgroundClick?: () => void
	onSelectionChange?: (nodes: GraphNode[], edges: GraphEdge[]) => void
}

export interface GraphOptions {
	interactive?: boolean
	minimap?: boolean
	controls?: boolean
	physics?: boolean
	[key: string]: unknown
}

/**
 * Abstract interface for graph visualization providers
 * Implementations can be XYFlow, D3, Cytoscape, etc.
 */
export interface GraphProvider {
	// Lifecycle
	initialize: (container: HTMLElement, options?: GraphOptions) => Promise<void>
	destroy: () => void

	// Data management
	setNodes: (nodes: GraphNode[]) => void
	setEdges: (edges: GraphEdge[]) => void
	addNode: (node: GraphNode) => void
	addEdge: (edge: GraphEdge) => void
	removeNode: (nodeId: string) => void
	removeEdge: (edgeId: string) => void
	clear: () => void

	// Layout
	applyLayout: (layout: GraphLayout) => void
	fitView: () => void
	center: (nodeId?: string) => void

	// Interaction
	setEvents: (events: GraphEvents) => void
	highlightNode: (nodeId: string) => void
	highlightPath: (nodeIds: string[]) => void
	clearHighlights: () => void

	// State
	getSnapshot: () => GraphSnapshot
	loadSnapshot: (snapshot: GraphSnapshot) => void
}

// URL Routing support
export type EntityIdentifier = string // Can be OpenAlex ID or external ID

// Provider types
export type ProviderType = "xyflow" | "d3" | "cytoscape"

// Search and filtering
export interface SearchOptions {
	query: string
	entityTypes: EntityType[]
	includeExternalIds?: boolean
	preferExternalIdResults?: boolean
	limit?: number
}

export interface SearchResult {
	id: string
	entityType: EntityType
	label: string
	description?: string
	externalIds: ExternalIdentifier[]
	url: string
}

// Graph data structures
export interface GraphData {
	nodes: GraphNode[]
	edges: GraphEdge[]
}

// Cache structures
export interface GraphCache {
	// Cache transformed graph data
	nodes: Map<string, GraphNode>
	edges: Map<string, GraphEdge>

	// Track what's been fetched
	expandedNodes: Set<string>
	fetchedRelationships: Map<string, Set<RelationType>>
}

// Statistics for graph analysis
export interface GraphStats {
	nodeCount: number
	edgeCount: number
	nodesByType: Record<EntityType, number>
	edgesByType: Record<RelationType, number>
	avgDegree: number
	maxDegree: number
	density: number
	connectedComponents: number
}

// Community detection results
export interface Community {
	id: string
	nodes: string[] // Node IDs
	size: number
	density: number
}
