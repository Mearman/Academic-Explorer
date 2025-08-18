/**
 * Simple Graph Synchronization Utilities
 * 
 * Converts between minimal persisted data (ID, display_name, edges only)
 * and full in-memory EntityGraph structure with generated encounter data.
 */

import type { EntityType } from '@/lib/openalex/utils/entity-detection';
import type { SimpleGraph, SimpleEntity, SimpleEdge } from '@/types/simple-graph-storage';
import type {
  EntityGraph,
  EntityGraphVertex,
  EntityGraphEdge,
  EntityEncounter,
} from '@/types/entity-graph';
import { EdgeType, EncounterType } from '@/types/entity-graph';
import { simpleGraphStorage } from './simple-graph-storage';

/**
 * Load minimal graph from storage and expand to full in-memory format
 */
export async function loadEntityGraphFromSimpleStorage(): Promise<{
  vertices: Map<string, EntityGraphVertex>;
  edges: Map<string, EntityGraphEdge>;
  edgesBySource: Map<string, Set<string>>;
  edgesByTarget: Map<string, Set<string>>;
  verticesByType: Map<EntityType, Set<string>>;
  directlyVisitedVertices: Set<string>;
}> {
  const simpleGraph = await simpleGraphStorage.load();
  
  // Create Maps and Sets for the in-memory format
  const vertices = new Map<string, EntityGraphVertex>();
  const edges = new Map<string, EntityGraphEdge>();
  const edgesBySource = new Map<string, Set<string>>();
  const edgesByTarget = new Map<string, Set<string>>();
  const verticesByType = new Map<EntityType, Set<string>>();
  const directlyVisitedVertices = new Set(simpleGraph.visitedEntityIds);
  
  // Convert entities to vertices with generated encounter data
  Object.values(simpleGraph.entities).forEach(entity => {
    const vertex = convertSimpleEntityToVertex(entity, directlyVisitedVertices.has(entity.id));
    vertices.set(entity.id, vertex);
    
    // Update type index
    if (!verticesByType.has(entity.entityType)) {
      verticesByType.set(entity.entityType, new Set());
    }
    verticesByType.get(entity.entityType)!.add(entity.id);
  });
  
  // Convert edges
  Object.values(simpleGraph.edges).forEach(simpleEdge => {
    // Only include edges where both source and target entities exist
    if (vertices.has(simpleEdge.sourceId) && vertices.has(simpleEdge.targetId)) {
      const edge = convertSimpleEdgeToEntityEdge(simpleEdge, directlyVisitedVertices.has(simpleEdge.sourceId));
      edges.set(edge.id, edge);
      
      // Update edge indices
      if (!edgesBySource.has(edge.sourceId)) {
        edgesBySource.set(edge.sourceId, new Set());
      }
      edgesBySource.get(edge.sourceId)!.add(edge.id);
      
      if (!edgesByTarget.has(edge.targetId)) {
        edgesByTarget.set(edge.targetId, new Set());
      }
      edgesByTarget.get(edge.targetId)!.add(edge.id);
    }
  });
  
  console.log(`[SimpleGraphSync] Loaded ${vertices.size} entities and ${edges.size} edges from simple storage`);
  
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
 * Convert simple entity to full vertex with generated encounter data
 */
function convertSimpleEntityToVertex(entity: SimpleEntity, isDirectlyVisited: boolean): EntityGraphVertex {
  const now = new Date().toISOString();
  
  // Generate minimal encounter data based on whether entity was visited
  const encounters: EntityEncounter[] = [];
  if (isDirectlyVisited) {
    encounters.push({
      type: EncounterType.DIRECT_VISIT,
      timestamp: now, // We don't have the original timestamp, use current
      context: {},
    });
  }
  
  return {
    id: entity.id,
    entityType: entity.entityType,
    displayName: entity.displayName,
    directlyVisited: isDirectlyVisited,
    firstSeen: now,
    lastVisited: isDirectlyVisited ? now : undefined,
    visitCount: isDirectlyVisited ? 1 : 0,
    encounters,
    encounterStats: {
      totalEncounters: encounters.length,
      searchResultCount: 0,
      relatedEntityCount: 0,
      lastEncounter: encounters.length > 0 ? now : undefined,
    },
    metadata: {},
  };
}

/**
 * Convert simple edge to full entity edge
 */
function convertSimpleEdgeToEntityEdge(simpleEdge: SimpleEdge, discoveredFromDirectVisit: boolean): EntityGraphEdge {
  const now = new Date().toISOString();
  
  return {
    id: simpleEdge.id,
    sourceId: simpleEdge.sourceId,
    targetId: simpleEdge.targetId,
    edgeType: simpleEdge.edgeType,
    weight: 0.5, // Default weight
    discoveredFromDirectVisit,
    discoveredAt: now, // We don't have the original timestamp, use current
    metadata: {
      source: 'openalex',
    },
  };
}

/**
 * Save entity data to simple storage (minimal persistence)
 */
export async function saveEntityToSimpleStorage(
  entityId: string,
  entityType: EntityType,
  displayName: string,
  isVisited: boolean = false
): Promise<void> {
  // Upsert the entity
  await simpleGraphStorage.upsertEntity(entityId, entityType, displayName);
  
  // Mark as visited if this is a direct visit
  if (isVisited) {
    await simpleGraphStorage.markEntityVisited(entityId);
  }
}

/**
 * Save edge data to simple storage
 */
export async function saveEdgeToSimpleStorage(
  sourceId: string,
  targetId: string,
  edgeType: EdgeType,
  edgeId: string
): Promise<void> {
  await simpleGraphStorage.addEdge(sourceId, targetId, edgeType, edgeId);
}

/**
 * Get metadata for the entity graph
 */
export async function getSimpleGraphMetadata() {
  const simpleGraph = await simpleGraphStorage.load();
  return {
    createdAt: simpleGraph.metadata.lastUpdated, // Use lastUpdated as createdAt
    lastUpdated: simpleGraph.metadata.lastUpdated,
    totalVisits: simpleGraph.metadata.totalVisits,
    uniqueEntitiesVisited: simpleGraph.metadata.uniqueEntitiesVisited,
  };
}