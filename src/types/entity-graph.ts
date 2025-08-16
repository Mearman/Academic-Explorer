/**
 * Entity Graph Types
 * 
 * Defines the data model for tracking entity visits and relationships
 * in an interactive graph structure for Academic Explorer.
 */

import type { EntityType } from '@/lib/openalex/utils/entity-detection';

// Re-export EntityType for consumers of this module
export type { EntityType };

/**
 * Edge types representing different relationship categories
 */
export enum EdgeType {
  // Citation relationships
  CITES = 'cites',
  CITED_BY = 'cited_by',
  
  // Authorship relationships
  AUTHORED_BY = 'authored_by',
  AUTHOR_OF = 'author_of',
  
  // Institutional relationships
  AFFILIATED_WITH = 'affiliated_with',
  EMPLOYS = 'employs',
  
  // Publication relationships
  PUBLISHED_IN = 'published_in',
  PUBLISHES = 'publishes',
  
  // Funding relationships
  FUNDED_BY = 'funded_by',
  FUNDS = 'funds',
  
  // Topic/Concept relationships
  RELATED_TO_TOPIC = 'related_to_topic',
  TOPIC_OF = 'topic_of',
  HAS_CONCEPT = 'has_concept',
  CONCEPT_OF = 'concept_of',
  
  // Geographical relationships
  LOCATED_IN = 'located_in',
  CONTAINS = 'contains',
  
  // Generic relationships
  RELATED_TO = 'related_to',
  SIMILAR_TO = 'similar_to',
  PART_OF = 'part_of',
  HAS_PART = 'has_part'
}

/**
 * Entity encounter types for tracking different ways entities are discovered
 */
export enum EncounterType {
  /** Entity was directly visited by clicking on its page */
  DIRECT_VISIT = 'direct_visit',
  
  /** Entity appeared in search results */
  SEARCH_RESULT = 'search_result',
  
  /** Entity appeared as a related entity (co-author, citation, etc.) */
  RELATED_ENTITY = 'related_entity',
  
  /** Entity was discovered through relationships (discovered entities) */
  RELATIONSHIP_DISCOVERY = 'relationship_discovery'
}

/**
 * Record of an entity encounter
 */
export interface EntityEncounter {
  /** Type of encounter */
  type: EncounterType;
  
  /** When the encounter occurred */
  timestamp: string;
  
  /** Context of the encounter */
  context: {
    /** Source page/entity where this was encountered */
    sourceEntityId?: string;
    
    /** Search query if from search results */
    searchQuery?: string;
    
    /** Relationship type if discovered through relationships */
    relationshipType?: EdgeType;
    
    /** Position in search results or related entities list */
    position?: number;
    
    /** Additional context information */
    additionalInfo?: Record<string, unknown>;
  };
}

/**
 * Vertex (node) in the entity graph representing an encountered entity
 */
export interface EntityGraphVertex {
  /** Unique identifier (OpenAlex ID) */
  id: string;
  
  /** Entity type */
  entityType: EntityType;
  
  /** Display name of the entity */
  displayName: string;
  
  /** Whether this entity was directly visited by the user */
  directlyVisited: boolean;
  
  /** Timestamp when first discovered */
  firstSeen: string;
  
  /** Timestamp when last visited (if directly visited) */
  lastVisited?: string;
  
  /** Number of times directly visited */
  visitCount: number;
  
  /** All encounters with this entity (visits, search results, related entities) */
  encounters: EntityEncounter[];
  
  /** Derived stats from encounters */
  encounterStats: {
    /** Total number of times encountered (all types) */
    totalEncounters: number;
    
    /** Number of times seen in search results */
    searchResultCount: number;
    
    /** Number of times seen as related entity */
    relatedEntityCount: number;
    
    /** Most recent encounter (any type) */
    lastEncounter?: string;
    
    /** First time seen in search results */
    firstSearchResult?: string;
    
    /** First time seen as related entity */
    firstRelatedEntity?: string;
  };
  
  /** Additional metadata about the entity */
  metadata: {
    /** URL to entity page */
    url?: string;
    
    /** Publication year (for works) */
    publicationYear?: number;
    
    /** Citation count */
    citedByCount?: number;
    
    /** Open access status (for works) */
    isOpenAccess?: boolean;
    
    /** Country code (for institutions/authors) */
    countryCode?: string;
    
    /** Entity-specific summary information */
    summary?: string;
  };
  
  /** Position for graph layout (persisted) */
  position?: {
    x: number;
    y: number;
  };
}

/**
 * Edge (relationship) in the entity graph
 */
export interface EntityGraphEdge {
  /** Unique identifier for the edge */
  id: string;
  
  /** Source vertex ID */
  sourceId: string;
  
  /** Target vertex ID */
  targetId: string;
  
  /** Type of relationship */
  edgeType: EdgeType;
  
  /** Weight/strength of the relationship (0-1) */
  weight: number;
  
  /** Whether this edge was discovered from a directly visited entity */
  discoveredFromDirectVisit: boolean;
  
  /** Timestamp when edge was first discovered */
  discoveredAt: string;
  
  /** Additional metadata about the relationship */
  metadata: {
    /** Source of the relationship data */
    source: 'openalex' | 'inferred' | 'user';
    
    /** Confidence score (0-1) */
    confidence?: number;
    
    /** Additional context about the relationship */
    context?: string;
  };
}

/**
 * Complete entity graph structure
 */
export interface EntityGraph {
  /** All vertices in the graph */
  vertices: Map<string, EntityGraphVertex>;
  
  /** All edges in the graph */
  edges: Map<string, EntityGraphEdge>;
  
  /** Index of edges by source vertex ID */
  edgesBySource: Map<string, Set<string>>;
  
  /** Index of edges by target vertex ID */
  edgesByTarget: Map<string, Set<string>>;
  
  /** Index of vertices by entity type */
  verticesByType: Map<EntityType, Set<string>>;
  
  /** Index of directly visited vertices */
  directlyVisitedVertices: Set<string>;
  
  /** Graph metadata */
  metadata: {
    /** When the graph was created */
    createdAt: string;
    
    /** When the graph was last updated */
    lastUpdated: string;
    
    /** Total number of direct visits across all entities */
    totalVisits: number;
    
    /** Total number of unique entities visited */
    uniqueEntitiesVisited: number;
  };
}

/**
 * Graph traversal result for finding related entities
 */
export interface GraphTraversalResult {
  /** The target vertex */
  vertex: EntityGraphVertex;
  
  /** Path from source to target */
  path: EntityGraphVertex[];
  
  /** Total distance (number of hops) */
  distance: number;
  
  /** Aggregate path weight */
  pathWeight: number;
  
  /** Edge types used in the path */
  edgeTypes: EdgeType[];
}

/**
 * Graph statistics for analytics
 */
export interface GraphStatistics {
  /** Total vertices */
  totalVertices: number;
  
  /** Total edges */
  totalEdges: number;
  
  /** Directly visited vertices */
  directlyVisitedCount: number;
  
  /** Distribution by entity type */
  entityTypeDistribution: Record<EntityType, number>;
  
  /** Distribution by edge type */
  edgeTypeDistribution: Record<EdgeType, number>;
  
  /** Most connected vertices (highest degree) */
  mostConnectedVertices: Array<{
    vertexId: string;
    degree: number;
    displayName: string;
  }>;
  
  /** Most visited entities */
  mostVisitedEntities: Array<{
    vertexId: string;
    visitCount: number;
    displayName: string;
  }>;
  
  /** Recent activity */
  recentActivity: Array<{
    vertexId: string;
    lastVisited: string;
    displayName: string;
  }>;
  
  /** Connected components count */
  connectedComponents: number;
  
  /** Average clustering coefficient */
  clusteringCoefficient: number;
}

/**
 * Graph layout configuration
 */
export interface GraphLayoutConfig {
  /** Layout algorithm to use */
  algorithm: 'force-directed' | 'hierarchical' | 'circular' | 'grid';
  
  /** Whether to separate directly visited from discovered entities */
  separateVisitedEntities: boolean;
  
  /** Whether to cluster by entity type */
  clusterByEntityType: boolean;
  
  /** Whether to size nodes by visit count */
  sizeByVisitCount: boolean;
  
  /** Whether to weight edges by relationship strength */
  weightEdgesByStrength: boolean;
  
  /** Maximum number of vertices to display */
  maxVertices: number;
  
  /** Minimum edge weight to display */
  minEdgeWeight: number;
}

/**
 * Graph filter options
 */
export interface GraphFilterOptions {
  /** Entity types to include */
  entityTypes?: EntityType[];
  
  /** Edge types to include */
  edgeTypes?: EdgeType[];
  
  /** Show only directly visited entities */
  directlyVisitedOnly?: boolean;
  
  /** Show entities within N hops of directly visited */
  maxHopsFromVisited?: number;
  
  /** Date range filter */
  dateRange?: {
    from: string;
    to: string;
  };
  
  /** Minimum visit count */
  minVisitCount?: number;
  
  /** Minimum citation count */
  minCitationCount?: number;
}

/**
 * Entity visit event for tracking direct visits
 */
export interface EntityVisitEvent {
  /** Entity ID */
  entityId: string;
  
  /** Entity type */
  entityType: EntityType;
  
  /** Entity display name */
  displayName: string;
  
  /** Visit timestamp */
  timestamp: string;
  
  /** Source of the visit (direct navigation, link click, etc.) */
  source: 'direct' | 'link' | 'search' | 'related';
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Entity encounter event for tracking non-visit encounters
 */
export interface EntityEncounterEvent {
  /** Entity ID */
  entityId: string;
  
  /** Entity type */
  entityType: EntityType;
  
  /** Entity display name */
  displayName: string;
  
  /** Encounter type */
  encounterType: EncounterType;
  
  /** Encounter timestamp */
  timestamp: string;
  
  /** Context of the encounter */
  context: {
    /** Source entity where this was encountered */
    sourceEntityId?: string;
    
    /** Search query if from search results */
    searchQuery?: string;
    
    /** Relationship type if discovered through relationships */
    relationshipType?: EdgeType;
    
    /** Position in list */
    position?: number;
    
    /** Additional context */
    additionalInfo?: Record<string, unknown>;
  };
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Relationship discovery event
 */
export interface RelationshipDiscoveryEvent {
  /** Source entity ID */
  sourceEntityId: string;
  
  /** Target entity ID */
  targetEntityId: string;
  
  /** Relationship type */
  relationshipType: EdgeType;
  
  /** Discovery timestamp */
  timestamp: string;
  
  /** Source of the relationship data */
  source: 'openalex' | 'inferred';
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Type guards for runtime type checking
 */
export function isEntityGraphVertex(obj: unknown): obj is EntityGraphVertex {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'entityType' in obj &&
    'displayName' in obj &&
    'directlyVisited' in obj
  );
}

export function isEntityGraphEdge(obj: unknown): obj is EntityGraphEdge {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'sourceId' in obj &&
    'targetId' in obj &&
    'edgeType' in obj
  );
}

/**
 * Utility functions for edge ID generation
 */
export function generateEdgeId(sourceId: string, targetId: string, edgeType: EdgeType): string {
  return `${sourceId}_${edgeType}_${targetId}`;
}

export function parseEdgeId(edgeId: string): { sourceId: string; targetId: string; edgeType: EdgeType } | null {
  const parts = edgeId.split('_');
  if (parts.length !== 3) return null;
  
  return {
    sourceId: parts[0],
    targetId: parts[2],
    edgeType: parts[1] as EdgeType
  };
}

/**
 * Constants for default values
 */
export const DEFAULT_EDGE_WEIGHT = 0.5;
export const DEFAULT_MAX_VERTICES = 100;
export const DEFAULT_MIN_EDGE_WEIGHT = 0.1;
export const DEFAULT_MAX_HOPS = 2;