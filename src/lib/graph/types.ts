/**
 * Core graph types and interfaces for Academic Explorer
 * Provider-agnostic definitions that work with any graph visualization library
 */

// Generic graph types - no library-specific imports
export enum EntityType {
  WORK = 'work',
  AUTHOR = 'author',
  SOURCE = 'source',
  INSTITUTION = 'institution',
  CONCEPT = 'concept',
  PUBLISHER = 'publisher',
  FUNDER = 'funder',
  TOPIC = 'topic',
  KEYWORD = 'keyword',
  GEO = 'geo'
}

export enum RelationType {
  AUTHORED = 'authored',
  CITED = 'cited',
  AFFILIATED = 'affiliated',
  PUBLISHED_IN = 'published_in',
  FUNDED_BY = 'funded_by',
  RELATED_TO = 'related_to',
  CO_AUTHORED = 'co_authored',
  REFERENCES = 'references'
}

export interface Position {
  x: number;
  y: number;
}

export interface ExternalIdentifier {
  type: 'doi' | 'orcid' | 'issn_l' | 'ror' | 'wikidata';
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
  type: 'force' | 'hierarchical' | 'circular' | 'grid';
  options?: Record<string, unknown>;
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
export type ProviderType = 'xyflow' | 'd3' | 'cytoscape';

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