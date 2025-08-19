/**
 * Graph Synchronization Utilities
 * 
 * Utilities to synchronize data between the IndexedDB GraphDatabaseService
 * and the in-memory Zustand EntityGraphStore.
 */

import type { EntityType } from '@/lib/openalex/utils/entity-detection';
import type {
  EntityGraphVertex,
  EntityGraphEdge,
  EntityEncounter,
} from '@/types/entity-graph';
import { EdgeType, EncounterType } from '@/types/entity-graph';
import type {
  GraphVertex,
  GraphEdge,
} from '@/types/graph-storage';
import { VertexType, GraphEdgeType } from '@/types/graph-storage';

/**
 * Convert GraphVertex (IndexedDB) to EntityGraphVertex (Zustand store)
 */
export function graphVertexToEntityVertex(graphVertex: GraphVertex): EntityGraphVertex | null {
  // Only convert entity vertices (not query parameters or executions)
  if (graphVertex.vertexType !== VertexType.ENTITY || !graphVertex.entityType) {
    return null;
  }

  // Convert encounters
  const encounters: EntityEncounter[] = graphVertex.encounters.map(encounter => {
    const context = encounter.context || {};
    
    // Convert relationshipType if it exists
    const convertedContext: Record<string, unknown> = { ...context };
    if (context.relationshipType && typeof context.relationshipType === 'string') {
      // Convert GraphEdgeType to EdgeType
      convertedContext.relationshipType = convertGraphEdgeTypeToEdgeType(context.relationshipType as GraphEdgeType);
    }
    
    return {
      type: convertEncounterType(encounter.type),
      timestamp: encounter.timestamp,
      context: convertedContext,
    };
  });

  return {
    id: graphVertex.id,
    entityType: graphVertex.entityType,
    displayName: graphVertex.displayName,
    directlyVisited: graphVertex.directlyVisited,
    firstSeen: graphVertex.firstSeen,
    lastVisited: graphVertex.lastVisited,
    visitCount: graphVertex.visitCount,
    encounters,
    encounterStats: {
      totalEncounters: graphVertex.stats.totalEncounters,
      searchResultCount: graphVertex.stats.searchResultCount,
      relatedEntityCount: graphVertex.stats.relatedEntityCount,
      lastEncounter: graphVertex.stats.lastEncounter,
      firstSearchResult: graphVertex.stats.firstSearchResult,
      firstRelatedEntity: graphVertex.stats.firstRelatedEntity,
    },
    metadata: graphVertex.metadata,
  };
}

/**
 * Convert GraphEdge (IndexedDB) to EntityGraphEdge (Zustand store)
 */
export function graphEdgeToEntityEdge(graphEdge: GraphEdge): EntityGraphEdge {
  const edgeType = convertGraphEdgeTypeToEdgeType(graphEdge.edgeType);
  return {
    id: graphEdge.id,
    sourceId: graphEdge.sourceId,
    targetId: graphEdge.targetId,
    source: graphEdge.sourceId,
    target: graphEdge.targetId,
    edgeType: edgeType,
    type: edgeType,
    weight: graphEdge.weight,
    discoveredFromDirectVisit: graphEdge.discoveredFromDirectVisit,
    discoveredAt: graphEdge.discoveredAt,
    metadata: {
      source: (graphEdge.properties?.source as 'openalex' | 'inferred' | 'user') || 'openalex',
      confidence: graphEdge.properties?.confidence,
      context: graphEdge.properties?.context,
    },
  };
}

/**
 * Convert encounter type from IndexedDB format to Zustand format
 */
function convertEncounterType(graphEncounterType: string): EncounterType {
  switch (graphEncounterType) {
    case 'direct_visit':
      return EncounterType.DIRECT_VISIT;
    case 'search_result':
      return EncounterType.SEARCH_RESULT;
    case 'related_entity':
      return EncounterType.RELATED_ENTITY;
    case 'relationship_discovery':
      return EncounterType.RELATIONSHIP_DISCOVERY;
    default:
      return EncounterType.DIRECT_VISIT; // fallback
  }
}

/**
 * Convert edge type from IndexedDB format to Zustand format
 */
function convertGraphEdgeTypeToEdgeType(graphEdgeType: GraphEdgeType): EdgeType {
  switch (graphEdgeType) {
    case GraphEdgeType.AUTHORED_BY:
      return EdgeType.AUTHORED_BY;
    case GraphEdgeType.AFFILIATED_WITH:
      return EdgeType.AFFILIATED_WITH;
    case GraphEdgeType.PUBLISHED_IN:
      return EdgeType.PUBLISHED_IN;
    case GraphEdgeType.HAS_TOPIC:
      return EdgeType.RELATED_TO_TOPIC;
    case GraphEdgeType.HAS_CONCEPT:
      return EdgeType.HAS_CONCEPT;
    case GraphEdgeType.FUNDED_BY:
      return EdgeType.FUNDED_BY;
    case GraphEdgeType.CITES:
      return EdgeType.CITES;
    case GraphEdgeType.PARENT_OF:
      return EdgeType.PART_OF; // PARENT_OF maps back to PART_OF
    case GraphEdgeType.RELATED_TO:
      return EdgeType.RELATED_TO;
    default:
      return EdgeType.RELATED_TO; // fallback
  }
}

/**
 * Convert EdgeType (Zustand) to GraphEdgeType (IndexedDB)
 */
export function edgeTypeToGraphEdgeType(edgeType: EdgeType): GraphEdgeType {
  switch (edgeType) {
    case EdgeType.AUTHORED_BY:
      return GraphEdgeType.AUTHORED_BY;
    case EdgeType.AFFILIATED_WITH:
      return GraphEdgeType.AFFILIATED_WITH;
    case EdgeType.PUBLISHED_IN:
      return GraphEdgeType.PUBLISHED_IN;
    case EdgeType.RELATED_TO_TOPIC:
      return GraphEdgeType.HAS_TOPIC;
    case EdgeType.HAS_CONCEPT:
      return GraphEdgeType.HAS_CONCEPT;
    case EdgeType.FUNDED_BY:
      return GraphEdgeType.FUNDED_BY;
    case EdgeType.CITES:
      return GraphEdgeType.CITES;
    case EdgeType.PART_OF:
      return GraphEdgeType.PARENT_OF;
    case EdgeType.HAS_PART:
      return GraphEdgeType.PARENT_OF; // HAS_PART maps to PARENT_OF (institution has department)
    case EdgeType.RELATED_TO:
      return GraphEdgeType.RELATED_TO;
    default:
      return GraphEdgeType.RELATED_TO;
  }
}

/**
 * Load entity graph data from IndexedDB and convert to in-memory format
 */
export async function loadEntityGraphFromIndexedDB(): Promise<{
  vertices: Map<string, EntityGraphVertex>;
  edges: Map<string, EntityGraphEdge>;
  edgesBySource: Map<string, Set<string>>;
  edgesByTarget: Map<string, Set<string>>;
  verticesByType: Map<EntityType, Set<string>>;
  directlyVisitedVertices: Set<string>;
}> {
  const { graphDb } = await import('@/lib/graph-db');
  
  // Initialize the database
  await graphDb.init();
  
  // Load all vertices and edges
  const [allGraphVertices, allGraphEdges] = await Promise.all([
    graphDb.getAllVertices(),
    graphDb.getAllEdges(),
  ]);
  
  // Convert and filter entity vertices
  const vertices = new Map<string, EntityGraphVertex>();
  const verticesByType = new Map<EntityType, Set<string>>();
  const directlyVisitedVertices = new Set<string>();
  
  for (const graphVertex of allGraphVertices) {
    const entityVertex = graphVertexToEntityVertex(graphVertex);
    if (entityVertex) {
      vertices.set(entityVertex.id, entityVertex);
      
      // Update indices
      if (!verticesByType.has(entityVertex.entityType)) {
        verticesByType.set(entityVertex.entityType, new Set());
      }
      verticesByType.get(entityVertex.entityType)!.add(entityVertex.id);
      
      if (entityVertex.directlyVisited) {
        directlyVisitedVertices.add(entityVertex.id);
      }
    }
  }
  
  // Convert edges that reference entity vertices
  const edges = new Map<string, EntityGraphEdge>();
  const edgesBySource = new Map<string, Set<string>>();
  const edgesByTarget = new Map<string, Set<string>>();
  
  for (const graphEdge of allGraphEdges) {
    // Only include edges where both source and target are entity vertices
    if (vertices.has(graphEdge.sourceId) && vertices.has(graphEdge.targetId)) {
      const entityEdge = graphEdgeToEntityEdge(graphEdge);
      edges.set(entityEdge.id, entityEdge);
      
      // Update edge indices
      if (!edgesBySource.has(entityEdge.sourceId)) {
        edgesBySource.set(entityEdge.sourceId, new Set());
      }
      edgesBySource.get(entityEdge.sourceId)!.add(entityEdge.id);
      
      if (!edgesByTarget.has(entityEdge.targetId)) {
        edgesByTarget.set(entityEdge.targetId, new Set());
      }
      edgesByTarget.get(entityEdge.targetId)!.add(entityEdge.id);
    }
  }
  
  console.log(`[GraphSync] Loaded ${vertices.size} entity vertices and ${edges.size} edges from IndexedDB`);
  
  return {
    vertices,
    edges,
    edgesBySource,
    edgesByTarget,
    verticesByType,
    directlyVisitedVertices,
  };
}

/**
 * Get metadata for the entity graph
 */
export async function getEntityGraphMetadata() {
  const { graphDb } = await import('@/lib/graph-db');
  await graphDb.init();
  
  const metadata = await graphDb.getMetadata();
  
  return {
    createdAt: metadata.createdAt,
    lastUpdated: metadata.lastUpdated,
    totalVisits: metadata.totalVisits,
    uniqueEntitiesVisited: metadata.uniqueEntitiesVisited,
  };
}