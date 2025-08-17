/**
 * Graph Storage Types
 * 
 * Comprehensive graph-based storage system for tracking OpenAlex entities,
 * query parameters, query executions, and all their relationships.
 * 
 * This replaces the simple storage system with a proper graph database
 * that captures the full network of academic relationships.
 */

import type { EntityType } from '@/lib/openalex/utils/entity-detection';

// Re-export EntityType for consumers of this module
export type { EntityType };

/**
 * Vertex types in the graph database
 */
export enum VertexType {
  // Real OpenAlex entities
  ENTITY = 'entity',
  
  // Synthetic/virtual vertices for query tracking
  QUERY_PARAMETERS = 'query_parameters',  // Unique set of query parameters
  QUERY_EXECUTION = 'query_execution',    // Individual query execution
}

/**
 * Edge types representing all possible relationships in OpenAlex data model
 * Based on comprehensive analysis of OpenAlex entity types and their relationships
 */
export enum GraphEdgeType {
  // Citation relationships (Works ↔ Works)
  CITES = 'cites',
  CITED_BY = 'cited_by',
  REFERENCES = 'references',
  REFERENCED_BY = 'referenced_by',
  RELATED_TO = 'related_to',
  
  // Authorship relationships (Authors ↔ Works)
  AUTHORED = 'authored',
  AUTHORED_BY = 'authored_by',
  
  // Institutional relationships (Authors/Works ↔ Institutions)
  AFFILIATED_WITH = 'affiliated_with',
  EMPLOYS = 'employs',
  ASSOCIATED_WITH = 'associated_with',
  
  // Publication relationships (Works ↔ Sources)
  PUBLISHED_IN = 'published_in',
  PUBLISHES = 'publishes',
  HOSTED_BY = 'hosted_by',
  HOSTS = 'hosts',
  
  // Publisher relationships (Sources ↔ Publishers)
  PUBLISHED_BY = 'published_by',
  PUBLISHER_OF = 'publisher_of',
  
  // Funding relationships (Works/Authors ↔ Funders)
  FUNDED_BY = 'funded_by',
  FUNDS = 'funds',
  GRANTED_TO = 'granted_to',
  RECEIVED_GRANT_FROM = 'received_grant_from',
  
  // Topic/Concept relationships (Works/Authors ↔ Topics/Concepts)
  HAS_TOPIC = 'has_topic',
  TOPIC_OF = 'topic_of',
  HAS_CONCEPT = 'has_concept',
  CONCEPT_OF = 'concept_of',
  PRIMARY_TOPIC = 'primary_topic',
  PRIMARY_TOPIC_OF = 'primary_topic_of',
  
  // Hierarchical relationships (Topics ↔ Subfields ↔ Fields ↔ Domains)
  HAS_SUBFIELD = 'has_subfield',
  SUBFIELD_OF = 'subfield_of',
  HAS_FIELD = 'has_field',
  FIELD_OF = 'field_of',
  HAS_DOMAIN = 'has_domain',
  DOMAIN_OF = 'domain_of',
  
  // Geographic relationships (Institutions ↔ Geographic entities)
  LOCATED_IN = 'located_in',
  LOCATION_OF = 'location_of',
  
  // Institutional hierarchy (Institutions ↔ Institutions)
  PARENT_OF = 'parent_of',
  CHILD_OF = 'child_of',
  PART_OF = 'part_of',
  HAS_PART = 'has_part',
  
  // Publisher hierarchy (Publishers ↔ Publishers)
  PARENT_PUBLISHER = 'parent_publisher',
  SUBSIDIARY_OF = 'subsidiary_of',
  
  // Concept relationships (Concepts ↔ Concepts) - legacy system
  ANCESTOR_OF = 'ancestor_of',
  DESCENDANT_OF = 'descendant_of',
  SIBLING_OF = 'sibling_of',
  
  // Query-related relationships (synthetic)
  QUERY_RESULT = 'query_result',        // Query execution → Entity (result)
  QUERY_INSTANCE = 'query_instance',    // Query parameters → Query execution
  
  // Co-occurrence relationships (derived)
  CO_AUTHORED_WITH = 'co_authored_with',
  CO_CITED_WITH = 'co_cited_with',
  CO_OCCURRING_TOPIC = 'co_occurring_topic',
  
  // Temporal relationships
  PRECEDES = 'precedes',
  FOLLOWS = 'follows',
  CONTEMPORARY_WITH = 'contemporary_with',
  
  // Open Access relationships
  OA_VERSION_OF = 'oa_version_of',
  HAS_OA_VERSION = 'has_oa_version',
  
  // Generic similarity relationships
  SIMILAR_TO = 'similar_to',
  
  // Keyword/Mesh relationships
  HAS_KEYWORD = 'has_keyword',
  KEYWORD_OF = 'keyword_of',
  HAS_MESH_TERM = 'has_mesh_term',
  MESH_TERM_OF = 'mesh_term_of',
  
  // SDG (Sustainable Development Goals) relationships
  ADDRESSES_SDG = 'addresses_sdg',
  SDG_ADDRESSED_BY = 'sdg_addressed_by',
}

/**
 * Vertex (node) in the graph database
 * Represents either real entities or synthetic query vertices
 */
export interface GraphVertex {
  /** Unique identifier */
  id: string;
  
  /** Type of vertex */
  vertexType: VertexType;
  
  /** Entity type (for ENTITY vertices) */
  entityType?: EntityType;
  
  /** Display name */
  displayName: string;
  
  /** Whether this entity was directly visited by the user */
  directlyVisited: boolean;
  
  /** Timestamp when first discovered/created */
  firstSeen: string;
  
  /** Timestamp when last visited (if directly visited) */
  lastVisited?: string;
  
  /** Number of times directly visited */
  visitCount: number;
  
  /** All encounters with this vertex */
  encounters: VertexEncounter[];
  
  /** Cached metadata about the vertex */
  metadata: {
    /** URL to entity page */
    url?: string;
    
    /** Publication year (for works) */
    publicationYear?: number;
    
    /** Citation count */
    citedByCount?: number;
    
    /** Works count (for authors, institutions, etc.) */
    worksCount?: number;
    
    /** Open access status (for works) */
    isOpenAccess?: boolean;
    
    /** Country code (for institutions/authors) */
    countryCode?: string;
    
    /** ORCID (for authors) */
    orcid?: string;
    
    /** DOI (for works) */
    doi?: string;
    
    /** ROR ID (for institutions) */
    ror?: string;
    
    /** ISSN-L (for sources) */
    issn?: string;
    
    /** Query string (for query parameter vertices) */
    queryString?: string;
    
    /** Query filters (for query parameter vertices) */
    queryFilters?: Record<string, unknown>;
    
    /** Query hash (for query parameter vertices) */
    queryHash?: string;
    
    /** Execution timestamp (for query execution vertices) */
    executionTimestamp?: string;
    
    /** Result count (for query execution vertices) */
    resultCount?: number;
    
    /** Page number (for query execution vertices) */
    pageNumber?: number;
    
    /** Per-page count (for query execution vertices) */
    perPage?: number;
    
    /** Additional flexible metadata */
    additionalInfo?: Record<string, unknown>;
  };
  
  /** Position for graph layout (persisted) */
  position?: {
    x: number;
    y: number;
  };
  
  /** Graph statistics for this vertex */
  stats: {
    /** Total number of encounters (all types) */
    totalEncounters: number;
    
    /** Number of times seen in search results */
    searchResultCount: number;
    
    /** Number of times seen as related entity */
    relatedEntityCount: number;
    
    /** Most recent encounter timestamp */
    lastEncounter?: string;
    
    /** First time seen in search results */
    firstSearchResult?: string;
    
    /** First time seen as related entity */
    firstRelatedEntity?: string;
    
    /** Incoming edge count (in-degree) */
    inDegree: number;
    
    /** Outgoing edge count (out-degree) */
    outDegree: number;
    
    /** Total degree (in + out) */
    totalDegree: number;
  };
}

/**
 * Edge (relationship) in the graph database
 */
export interface GraphEdge {
  /** Unique identifier for the edge */
  id: string;
  
  /** Source vertex ID */
  sourceId: string;
  
  /** Target vertex ID */
  targetId: string;
  
  /** Type of relationship */
  edgeType: GraphEdgeType;
  
  /** Weight/strength of the relationship (0-1) */
  weight: number;
  
  /** Whether this edge was discovered from a directly visited entity */
  discoveredFromDirectVisit: boolean;
  
  /** Timestamp when edge was first discovered */
  discoveredAt: string;
  
  /** Timestamp when edge was last confirmed/updated */
  lastConfirmed?: string;
  
  /** How many times this relationship has been observed */
  confirmationCount: number;
  
  /** Properties specific to the relationship */
  properties: {
    /** Source of the relationship data */
    source: 'openalex' | 'inferred' | 'user' | 'derived';
    
    /** Confidence score (0-1) */
    confidence: number;
    
    /** Position/order information (e.g., author position, citation context) */
    position?: number;
    
    /** Additional context about the relationship */
    context?: string;
    
    /** Temporal information */
    temporalInfo?: {
      /** When this relationship was established (publication year, employment start, etc.) */
      establishedYear?: number;
      
      /** When this relationship ended (if applicable) */
      endedYear?: number;
      
      /** Duration of the relationship */
      duration?: number;
    };
    
    /** Bibliographic information (for citation edges) */
    bibliographicInfo?: {
      /** Citation context */
      citationContext?: string;
      
      /** Page number where citation appears */
      pageNumber?: string;
      
      /** Section where citation appears */
      section?: string;
    };
    
    /** Authorship information (for authorship edges) */
    authorshipInfo?: {
      /** Author position (first, middle, last) */
      authorPosition?: 'first' | 'middle' | 'last';
      
      /** Is corresponding author */
      isCorresponding?: boolean;
      
      /** Raw author name as appeared in publication */
      rawAuthorName?: string;
    };
    
    /** Affiliation information (for institutional edges) */
    affiliationInfo?: {
      /** Years of affiliation */
      years?: number[];
      
      /** Whether this is current affiliation */
      isCurrent?: boolean;
      
      /** Type of affiliation */
      affiliationType?: string;
    };
    
    /** Query-specific information (for query edges) */
    queryInfo?: {
      /** Result rank/position in query results */
      resultRank?: number;
      
      /** Relevance score */
      relevanceScore?: number;
      
      /** Query execution ID that created this edge */
      queryExecutionId?: string;
    };
    
    /** Additional flexible properties */
    additionalProperties?: Record<string, unknown>;
  };
}

/**
 * Encounter types for tracking different ways vertices are discovered
 */
export enum EncounterType {
  /** Entity was directly visited by clicking on its page */
  DIRECT_VISIT = 'direct_visit',
  
  /** Entity appeared in search results */
  SEARCH_RESULT = 'search_result',
  
  /** Entity appeared as a related entity */
  RELATED_ENTITY = 'related_entity',
  
  /** Entity was discovered through relationships */
  RELATIONSHIP_DISCOVERY = 'relationship_discovery',
  
  /** Synthetic vertex was created for query parameters */
  QUERY_PARAMETER_CREATION = 'query_parameter_creation',
  
  /** Synthetic vertex was created for query execution */
  QUERY_EXECUTION_CREATION = 'query_execution_creation',
}

/**
 * Record of a vertex encounter
 */
export interface VertexEncounter {
  /** Type of encounter */
  type: EncounterType;
  
  /** When the encounter occurred */
  timestamp: string;
  
  /** Context of the encounter */
  context: {
    /** Source vertex ID where this was encountered */
    sourceVertexId?: string;
    
    /** Search query if from search results */
    searchQuery?: string;
    
    /** Relationship type if discovered through relationships */
    relationshipType?: GraphEdgeType;
    
    /** Position in search results or related entities list */
    position?: number;
    
    /** Query execution ID (for search results) */
    queryExecutionId?: string;
    
    /** Additional context information */
    additionalInfo?: Record<string, unknown>;
  };
}

/**
 * Complete graph database schema
 */
export interface GraphDatabaseSchema {
  /** All vertices in the graph */
  vertices: {
    key: string; // vertex ID
    value: GraphVertex;
  };
  
  /** All edges in the graph */
  edges: {
    key: string; // edge ID
    value: GraphEdge;
  };
  
  /** Index: edges by source vertex ID */
  edgesBySource: {
    key: string; // source vertex ID
    value: string[]; // edge IDs
  };
  
  /** Index: edges by target vertex ID */
  edgesByTarget: {
    key: string; // target vertex ID
    value: string[]; // edge IDs
  };
  
  /** Index: vertices by type */
  verticesByType: {
    key: string; // vertex type
    value: string[]; // vertex IDs
  };
  
  /** Index: vertices by entity type */
  verticesByEntityType: {
    key: string; // entity type
    value: string[]; // vertex IDs
  };
  
  /** Index: edges by type */
  edgesByType: {
    key: string; // edge type
    value: string[]; // edge IDs
  };
  
  /** Graph metadata and statistics */
  graphMetadata: {
    key: 'metadata';
    value: {
      /** When the graph was created */
      createdAt: string;
      
      /** When the graph was last updated */
      lastUpdated: string;
      
      /** Total number of direct visits across all entities */
      totalVisits: number;
      
      /** Total number of unique entities visited */
      uniqueEntitiesVisited: number;
      
      /** Total number of query executions */
      totalQueryExecutions: number;
      
      /** Total number of unique query parameter sets */
      uniqueQueryParameters: number;
      
      /** Database schema version */
      schemaVersion: number;
    };
  };
}

/**
 * Events for tracking graph changes
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
  
  /** Source of the visit */
  source: 'direct' | 'link' | 'search' | 'related';
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

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
    relationshipType?: GraphEdgeType;
    
    /** Position in list */
    position?: number;
    
    /** Query execution ID */
    queryExecutionId?: string;
    
    /** Additional context */
    additionalInfo?: Record<string, unknown>;
  };
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface RelationshipDiscoveryEvent {
  /** Source entity ID */
  sourceEntityId: string;
  
  /** Target entity ID */
  targetEntityId: string;
  
  /** Relationship type */
  relationshipType: GraphEdgeType;
  
  /** Discovery timestamp */
  timestamp: string;
  
  /** Source of the relationship data */
  source: 'openalex' | 'inferred' | 'derived';
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface QueryParametersEvent {
  /** Query string */
  queryString: string;
  
  /** Query filters */
  queryFilters?: Record<string, unknown>;
  
  /** Timestamp when query parameters were first used */
  timestamp: string;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface QueryExecutionEvent {
  /** Query parameters vertex ID */
  queryParametersId: string;
  
  /** Execution timestamp */
  timestamp: string;
  
  /** Result entity IDs */
  resultEntityIds: string[];
  
  /** Total result count */
  totalResults: number;
  
  /** Page number */
  pageNumber: number;
  
  /** Results per page */
  perPage: number;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Utility functions for ID generation
 */
export function generateVertexId(type: VertexType, identifier: string): string {
  return `${type}:${identifier}`;
}

export function generateEdgeId(sourceId: string, targetId: string, edgeType: GraphEdgeType): string {
  return `${sourceId}_${edgeType}_${targetId}`;
}

export function generateQueryParametersId(queryString: string, queryFilters?: Record<string, unknown>): string {
  const filtersStr = queryFilters ? JSON.stringify(queryFilters) : '';
  const combined = `${queryString}|${filtersStr}`;
  
  // Create hash of query + filters
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return generateVertexId(VertexType.QUERY_PARAMETERS, hash.toString());
}

export function generateQueryExecutionId(queryParametersId: string, timestamp: string): string {
  return generateVertexId(VertexType.QUERY_EXECUTION, `${queryParametersId}_${timestamp}`);
}

/**
 * Type guards for runtime type checking
 */
export function isGraphVertex(obj: unknown): obj is GraphVertex {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'vertexType' in obj &&
    'displayName' in obj &&
    'directlyVisited' in obj
  );
}

export function isGraphEdge(obj: unknown): obj is GraphEdge {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'sourceId' in obj &&
    'targetId' in obj &&
    'edgeType' in obj
  );
}

export function isEntityVertex(vertex: GraphVertex): boolean {
  return vertex.vertexType === VertexType.ENTITY;
}

export function isQueryParametersVertex(vertex: GraphVertex): boolean {
  return vertex.vertexType === VertexType.QUERY_PARAMETERS;
}

export function isQueryExecutionVertex(vertex: GraphVertex): boolean {
  return vertex.vertexType === VertexType.QUERY_EXECUTION;
}

/**
 * Constants for default values
 */
export const DEFAULT_EDGE_WEIGHT = 0.5;
export const DEFAULT_CONFIDENCE = 0.8;
export const GRAPH_SCHEMA_VERSION = 1;
export const DEFAULT_MAX_VERTICES = 100;
export const DEFAULT_MIN_EDGE_WEIGHT = 0.1;
export const DEFAULT_MAX_HOPS = 2;

/**
 * Edge weight calculation helpers
 */
export function calculateEdgeWeight(edgeType: GraphEdgeType, properties: GraphEdge['properties']): number {
  // Different edge types have different baseline weights
  const baseWeights: Partial<Record<GraphEdgeType, number>> = {
    [GraphEdgeType.CITES]: 0.8,
    [GraphEdgeType.CITED_BY]: 0.8,
    [GraphEdgeType.AUTHORED_BY]: 0.9,
    [GraphEdgeType.AFFILIATED_WITH]: 0.7,
    [GraphEdgeType.PUBLISHED_IN]: 0.8,
    [GraphEdgeType.FUNDED_BY]: 0.6,
    [GraphEdgeType.HAS_TOPIC]: 0.5,
    [GraphEdgeType.PRIMARY_TOPIC]: 0.9,
    [GraphEdgeType.QUERY_RESULT]: 0.3,
    [GraphEdgeType.CO_AUTHORED_WITH]: 0.7,
  };
  
  let weight = baseWeights[edgeType] ?? DEFAULT_EDGE_WEIGHT;
  
  // Adjust based on confidence
  weight *= properties.confidence;
  
  // Adjust based on specific properties
  if (properties.authorshipInfo?.isCorresponding) {
    weight *= 1.2; // Boost for corresponding authors
  }
  
  if (properties.authorshipInfo?.authorPosition === 'first') {
    weight *= 1.1; // Boost for first authors
  }
  
  if (properties.queryInfo?.resultRank && properties.queryInfo.resultRank <= 5) {
    weight *= 1.1; // Boost for top search results
  }
  
  // Clamp to valid range
  return Math.max(0, Math.min(1, weight));
}