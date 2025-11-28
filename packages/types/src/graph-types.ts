/**
 * Core graph types and interfaces for BibGraph
 * Provider-agnostic definitions that work with any graph visualization library
 */

import type { EntityType } from "./entities"
import type { RelationType } from "./relationships"

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

// Force simulation types
export interface ForceLink {
	source: string
	target: string
	distance?: number
}

export interface ForceSimulationNode extends Position {
	id: string
	[key: string]: unknown
}

export interface ForceSimulationTask {
	type: "force-simulation"
	nodes: ForceSimulationNode[]
	links: ForceLink[]
	options?: {
		iterations?: number
		linkDistance?: number
		linkStrength?: number
		chargeStrength?: number
		seed?: number
	}
}
