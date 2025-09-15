/**
 * Core graph types and interfaces for Academic Explorer
 * Provider-agnostic definitions that work with any graph visualization library
 */

// Import OpenAlex EntityType to ensure consistency
import type { EntityType as OpenAlexEntityType } from "@/lib/openalex/types"
export type EntityType = OpenAlexEntityType

export enum RelationType {
  // Core academic relationships (unique and specific)
  AUTHORED = "authored",                    // Author → Work
  AFFILIATED = "affiliated",                // Author → Institution
  PUBLISHED_IN = "published_in",            // Work → Source
  FUNDED_BY = "funded_by",                  // Work → Funder
  REFERENCES = "references",                // Work → Work (citations)

  // Publishing relationships
  SOURCE_PUBLISHED_BY = "source_published_by",  // Source → Publisher

  // Institutional relationships
  INSTITUTION_CHILD_OF = "institution_child_of",    // Institution → Parent Institution
  PUBLISHER_CHILD_OF = "publisher_child_of",        // Publisher → Parent Publisher

  // Topic/keyword relationships
  WORK_HAS_TOPIC = "work_has_topic",            // Work → Topic
  WORK_HAS_KEYWORD = "work_has_keyword",        // Work → Keyword
  AUTHOR_RESEARCHES = "author_researches",      // Author → Topic

  // Geographic relationships
  INSTITUTION_LOCATED_IN = "institution_located_in",  // Institution → Geo/Country
  FUNDER_LOCATED_IN = "funder_located_in",            // Funder → Country

  // Topic hierarchy
  TOPIC_PART_OF_FIELD = "topic_part_of_field",       // Topic → Field → Domain

  // General catch-all (use sparingly)
  RELATED_TO = "related_to"                     // General relationships
}

export interface Position {
  x: number;
  y: number;
}

export interface ExternalIdentifier {
  type: "doi" | "orcid" | "issn_l" | "ror" | "wikidata";
  value: string;
  url: string;
}

export interface GraphNode {
  id: string;  // Always OpenAlex ID for internal consistency
  type: EntityType;
  label: string;
  entityId: string;  // OpenAlex ID
  position: Position;

  // External identifiers (DOIs, ORCIDs, etc.)
  externalIds: ExternalIdentifier[];

  // Metadata for display and filtering
  metadata?: {
    citationCount?: number;
    year?: number;
    openAccess?: boolean;
    isPlaceholder?: boolean;
    isLoading?: boolean;
    loadingError?: string;
    dataLoadedAt?: number; // timestamp
    [key: string]: unknown;
  };
}

export interface GraphEdge {
  id: string;
  source: string;  // node id
  target: string;  // node id
  type: RelationType;
  label?: string;
  weight?: number;
  metadata?: Record<string, unknown>;
}

export interface GraphLayout {
  type: "force" | "hierarchical" | "circular" | "grid" | "force-deterministic" | "d3-force";
  options?: {
    iterations?: number;
    strength?: number;
    distance?: number;
    center?: { x: number; y: number };
    preventOverlap?: boolean;
    seed?: number; // For deterministic layouts
    forceReLayout?: boolean; // Force complete re-layout of all nodes
    // D3-force specific options
    linkDistance?: number;
    linkStrength?: number;
    chargeStrength?: number;
    centerStrength?: number;
    collisionRadius?: number;
    collisionStrength?: number;
    velocityDecay?: number;
    alpha?: number;
    alphaDecay?: number;
  };
}

export interface GraphEvents {
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
  onNodeDoubleClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
  onBackgroundClick?: () => void;
  onSelectionChange?: (nodes: GraphNode[], edges: GraphEdge[]) => void;
}

export interface GraphSnapshot {
  nodes: GraphNode[];
  edges: GraphEdge[];
  viewport?: {
    zoom: number;
    center: Position;
  };
}

export interface GraphOptions {
  interactive?: boolean;
  minimap?: boolean;
  controls?: boolean;
  physics?: boolean;
  [key: string]: unknown;
}

/**
 * Abstract interface for graph visualization providers
 * Implementations can be XYFlow, D3, Cytoscape, etc.
 */
export interface GraphProvider {
  // Lifecycle
  initialize: (container: HTMLElement, options?: GraphOptions) => Promise<void>;
  destroy: () => void;

  // Data management
  setNodes: (nodes: GraphNode[]) => void;
  setEdges: (edges: GraphEdge[]) => void;
  addNode: (node: GraphNode) => void;
  addEdge: (edge: GraphEdge) => void;
  removeNode: (nodeId: string) => void;
  removeEdge: (edgeId: string) => void;
  clear: () => void;

  // Layout
  applyLayout: (layout: GraphLayout) => void;
  fitView: () => void;
  center: (nodeId?: string) => void;

  // Interaction
  setEvents: (events: GraphEvents) => void;
  highlightNode: (nodeId: string) => void;
  highlightPath: (nodeIds: string[]) => void;
  clearHighlights: () => void;

  // State
  getSnapshot: () => GraphSnapshot;
  loadSnapshot: (snapshot: GraphSnapshot) => void;
}

// URL Routing support
export type EntityIdentifier = string; // Can be OpenAlex ID or external ID

// Provider types
export type ProviderType = "xyflow" | "d3" | "cytoscape";

// Search and filtering
export interface SearchOptions {
  query: string;
  entityTypes: EntityType[];
  includeExternalIds?: boolean;
  preferExternalIdResults?: boolean;
  limit?: number;
}

export interface SearchResult {
  id: string;
  entityType: EntityType;
  label: string;
  description?: string;
  externalIds: ExternalIdentifier[];
  url: string;
}

// Graph data structures
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Cache structures
export interface GraphCache {
  // Cache transformed graph data
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;

  // Track what's been fetched
  expandedNodes: Set<string>;
  fetchedRelationships: Map<string, Set<RelationType>>;
}