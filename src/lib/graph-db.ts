/**
 * Graph Database Service
 * 
 * Comprehensive graph-based storage system for tracking OpenAlex entities,
 * query parameters, query executions, and all their relationships.
 * 
 * Replaces the simple DatabaseService with a proper graph database
 * using IndexedDB as the persistence layer.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

import type {
  GraphVertex,
  GraphEdge,
  GraphDatabaseSchema,
  EntityVisitEvent,
  EntityEncounterEvent,
  RelationshipDiscoveryEvent,
  QueryParametersEvent,
  QueryExecutionEvent,
  VertexEncounter,
} from '@/types/graph-storage';
import {
  VertexType,
  GraphEdgeType,
  EncounterType,
} from '@/types/graph-storage';
import {
  generateVertexId,
  generateEdgeId,
  generateQueryParametersId,
  generateQueryExecutionId,
  calculateEdgeWeight,
  DEFAULT_CONFIDENCE,
  GRAPH_SCHEMA_VERSION,
} from '@/types/graph-storage';
import type { EntityType } from '@/lib/openalex/utils/entity-detection';

// IndexedDB Schema
interface GraphDB extends DBSchema {
  vertices: GraphDatabaseSchema['vertices'];
  edges: GraphDatabaseSchema['edges'];
  edgesBySource: GraphDatabaseSchema['edgesBySource'];
  edgesByTarget: GraphDatabaseSchema['edgesByTarget'];
  verticesByType: GraphDatabaseSchema['verticesByType'];
  verticesByEntityType: GraphDatabaseSchema['verticesByEntityType'];
  edgesByType: GraphDatabaseSchema['edgesByType'];
  graphMetadata: GraphDatabaseSchema['graphMetadata'];
}

export class GraphDatabaseService {
  private db: IDBPDatabase<GraphDB> | null = null;
  private readonly DB_NAME = 'academic-explorer-graph';
  private readonly DB_VERSION = 1;
  private openDBFn: typeof openDB;

  constructor(openDBFn: typeof openDB = openDB) {
    this.openDBFn = openDBFn;
  }

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await this.openDBFn<GraphDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Create object stores
        if (!db.objectStoreNames.contains('vertices')) {
          db.createObjectStore('vertices');
        }

        if (!db.objectStoreNames.contains('edges')) {
          db.createObjectStore('edges');
        }

        if (!db.objectStoreNames.contains('edgesBySource')) {
          db.createObjectStore('edgesBySource');
        }

        if (!db.objectStoreNames.contains('edgesByTarget')) {
          db.createObjectStore('edgesByTarget');
        }

        if (!db.objectStoreNames.contains('verticesByType')) {
          db.createObjectStore('verticesByType');
        }

        if (!db.objectStoreNames.contains('verticesByEntityType')) {
          db.createObjectStore('verticesByEntityType');
        }

        if (!db.objectStoreNames.contains('edgesByType')) {
          db.createObjectStore('edgesByType');
        }

        if (!db.objectStoreNames.contains('graphMetadata')) {
          db.createObjectStore('graphMetadata');
        }
      },
    });

    // Initialize metadata if it doesn't exist
    await this.initializeMetadata();
  }

  private async ensureDB(): Promise<IDBPDatabase<GraphDB>> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Failed to initialise graph database');
    }
    return this.db;
  }

  private async initializeMetadata(): Promise<void> {
    const db = await this.ensureDB();
    const existing = await db.get('graphMetadata', 'metadata');
    
    if (!existing) {
      await db.put('graphMetadata', {
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        totalVisits: 0,
        uniqueEntitiesVisited: 0,
        totalQueryExecutions: 0,
        uniqueQueryParameters: 0,
        schemaVersion: GRAPH_SCHEMA_VERSION,
      }, 'metadata');
    }
  }

  private async updateMetadata(updates: Partial<GraphDatabaseSchema['graphMetadata']['value']>): Promise<void> {
    const db = await this.ensureDB();
    const metadata = await db.get('graphMetadata', 'metadata');
    
    if (metadata) {
      const updated = {
        ...metadata,
        ...updates,
        lastUpdated: new Date().toISOString(),
      };
      await db.put('graphMetadata', updated, 'metadata');
    }
  }

  // Vertex Management
  async createVertex(vertex: GraphVertex): Promise<void> {
    const db = await this.ensureDB();
    
    await db.put('vertices', vertex, vertex.id);
    
    // Update indices
    await this.addToIndex('verticesByType', vertex.vertexType, vertex.id);
    
    if (vertex.entityType) {
      await this.addToIndex('verticesByEntityType', vertex.entityType, vertex.id);
    }
    
    await this.updateMetadata({});
  }

  async getVertex(vertexId: string): Promise<GraphVertex | undefined> {
    const db = await this.ensureDB();
    return db.get('vertices', vertexId);
  }

  async updateVertex(vertex: GraphVertex): Promise<void> {
    const db = await this.ensureDB();
    await db.put('vertices', vertex, vertex.id);
    await this.updateMetadata({});
  }

  async deleteVertex(vertexId: string): Promise<void> {
    const db = await this.ensureDB();
    const vertex = await db.get('vertices', vertexId);
    
    if (!vertex) return;
    
    // Remove all connected edges
    const connectedEdges = await this.getConnectedEdges(vertexId);
    for (const edge of connectedEdges) {
      await this.deleteEdge(edge.id);
    }
    
    // Remove from indices
    await this.removeFromIndex('verticesByType', vertex.vertexType, vertexId);
    if (vertex.entityType) {
      await this.removeFromIndex('verticesByEntityType', vertex.entityType, vertexId);
    }
    
    // Remove vertex
    await db.delete('vertices', vertexId);
    await this.updateMetadata({});
  }

  async getVerticesByType(vertexType: VertexType): Promise<GraphVertex[]> {
    const db = await this.ensureDB();
    const vertexIds = await db.get('verticesByType', vertexType);
    
    if (!vertexIds) return [];
    
    const vertices: GraphVertex[] = [];
    for (const id of vertexIds) {
      const vertex = await db.get('vertices', id);
      if (vertex) vertices.push(vertex);
    }
    
    return vertices;
  }

  async getVerticesByEntityType(entityType: EntityType): Promise<GraphVertex[]> {
    const db = await this.ensureDB();
    const vertexIds = await db.get('verticesByEntityType', entityType);
    
    if (!vertexIds) return [];
    
    const vertices: GraphVertex[] = [];
    for (const id of vertexIds) {
      const vertex = await db.get('vertices', id);
      if (vertex) vertices.push(vertex);
    }
    
    return vertices;
  }

  // Edge Management
  async createEdge(edge: GraphEdge): Promise<void> {
    const db = await this.ensureDB();
    
    await db.put('edges', edge, edge.id);
    
    // Update indices
    await this.addToIndex('edgesBySource', edge.sourceId, edge.id);
    await this.addToIndex('edgesByTarget', edge.targetId, edge.id);
    await this.addToIndex('edgesByType', edge.edgeType, edge.id);
    
    // Update vertex statistics
    await this.updateVertexDegree(edge.sourceId);
    await this.updateVertexDegree(edge.targetId);
    
    await this.updateMetadata({});
  }

  async getEdge(edgeId: string): Promise<GraphEdge | undefined> {
    const db = await this.ensureDB();
    return db.get('edges', edgeId);
  }

  async updateEdge(edge: GraphEdge): Promise<void> {
    const db = await this.ensureDB();
    await db.put('edges', edge, edge.id);
    await this.updateMetadata({});
  }

  async deleteEdge(edgeId: string): Promise<void> {
    const db = await this.ensureDB();
    const edge = await db.get('edges', edgeId);
    
    if (!edge) return;
    
    // Remove from indices
    await this.removeFromIndex('edgesBySource', edge.sourceId, edgeId);
    await this.removeFromIndex('edgesByTarget', edge.targetId, edgeId);
    await this.removeFromIndex('edgesByType', edge.edgeType, edgeId);
    
    // Update vertex statistics
    await this.updateVertexDegree(edge.sourceId);
    await this.updateVertexDegree(edge.targetId);
    
    // Remove edge
    await db.delete('edges', edgeId);
    await this.updateMetadata({});
  }

  async getEdgesBySource(sourceId: string): Promise<GraphEdge[]> {
    const db = await this.ensureDB();
    const edgeIds = await db.get('edgesBySource', sourceId);
    
    if (!edgeIds) return [];
    
    const edges: GraphEdge[] = [];
    for (const id of edgeIds) {
      const edge = await db.get('edges', id);
      if (edge) edges.push(edge);
    }
    
    return edges;
  }

  async getEdgesByTarget(targetId: string): Promise<GraphEdge[]> {
    const db = await this.ensureDB();
    const edgeIds = await db.get('edgesByTarget', targetId);
    
    if (!edgeIds) return [];
    
    const edges: GraphEdge[] = [];
    for (const id of edgeIds) {
      const edge = await db.get('edges', id);
      if (edge) edges.push(edge);
    }
    
    return edges;
  }

  async getConnectedEdges(vertexId: string): Promise<GraphEdge[]> {
    const [outgoing, incoming] = await Promise.all([
      this.getEdgesBySource(vertexId),
      this.getEdgesByTarget(vertexId),
    ]);
    
    return [...outgoing, ...incoming];
  }

  async getEdgesByType(edgeType: GraphEdgeType): Promise<GraphEdge[]> {
    const db = await this.ensureDB();
    const edgeIds = await db.get('edgesByType', edgeType);
    
    if (!edgeIds) return [];
    
    const edges: GraphEdge[] = [];
    for (const id of edgeIds) {
      const edge = await db.get('edges', id);
      if (edge) edges.push(edge);
    }
    
    return edges;
  }

  // High-level entity tracking methods
  async recordEntityVisit(event: EntityVisitEvent): Promise<GraphVertex> {
    const vertexId = generateVertexId(VertexType.ENTITY, event.entityId);
    const existingVertex = await this.getVertex(vertexId);
    
    const encounter: VertexEncounter = {
      type: EncounterType.DIRECT_VISIT,
      timestamp: event.timestamp,
      context: {
        sourceVertexId: event.source === 'link' ? event.metadata?.sourceEntityId as string : undefined,
        additionalInfo: event.metadata,
      },
    };
    
    if (existingVertex) {
      // Update existing vertex
      existingVertex.directlyVisited = true;
      existingVertex.lastVisited = event.timestamp;
      existingVertex.visitCount += 1;
      existingVertex.encounters.push(encounter);
      
      // Update stats
      existingVertex.stats.totalEncounters += 1;
      existingVertex.stats.lastEncounter = event.timestamp;
      
      // Update display name if we have better data
      if (event.displayName && 
          !event.displayName.includes('loading') && 
          !event.displayName.includes('Loading')) {
        existingVertex.displayName = event.displayName;
      }
      
      // Update metadata
      if (event.metadata?.url) {
        existingVertex.metadata.url = event.metadata.url as string;
      }
      
      await this.updateVertex(existingVertex);
      
      // Update global metadata
      await this.updateMetadata({
        totalVisits: (await this.getMetadata()).totalVisits + 1,
      });
      
      return existingVertex;
    } else {
      // Create new vertex
      const newVertex: GraphVertex = {
        id: vertexId,
        vertexType: VertexType.ENTITY,
        entityType: event.entityType,
        displayName: event.displayName,
        directlyVisited: true,
        firstSeen: event.timestamp,
        lastVisited: event.timestamp,
        visitCount: 1,
        encounters: [encounter],
        metadata: {
          url: event.metadata?.url as string,
          ...event.metadata,
        },
        stats: {
          totalEncounters: 1,
          searchResultCount: 0,
          relatedEntityCount: 0,
          lastEncounter: event.timestamp,
          inDegree: 0,
          outDegree: 0,
          totalDegree: 0,
        },
      };
      
      await this.createVertex(newVertex);
      
      // Update global metadata
      const metadata = await this.getMetadata();
      await this.updateMetadata({
        totalVisits: metadata.totalVisits + 1,
        uniqueEntitiesVisited: metadata.uniqueEntitiesVisited + 1,
      });
      
      return newVertex;
    }
  }

  async recordEntityEncounter(event: EntityEncounterEvent): Promise<GraphVertex> {
    const vertexId = generateVertexId(VertexType.ENTITY, event.entityId);
    const existingVertex = await this.getVertex(vertexId);
    
    const encounter: VertexEncounter = {
      type: event.encounterType,
      timestamp: event.timestamp,
      context: event.context,
    };
    
    if (existingVertex) {
      // Update existing vertex
      existingVertex.encounters.push(encounter);
      existingVertex.stats.totalEncounters += 1;
      existingVertex.stats.lastEncounter = event.timestamp;
      
      // Update specific encounter type counts
      if (event.encounterType === EncounterType.SEARCH_RESULT) {
        existingVertex.stats.searchResultCount += 1;
        if (!existingVertex.stats.firstSearchResult) {
          existingVertex.stats.firstSearchResult = event.timestamp;
        }
      } else if (event.encounterType === EncounterType.RELATED_ENTITY) {
        existingVertex.stats.relatedEntityCount += 1;
        if (!existingVertex.stats.firstRelatedEntity) {
          existingVertex.stats.firstRelatedEntity = event.timestamp;
        }
      }
      
      // Update display name if we have better data
      if (event.displayName && 
          !event.displayName.includes('loading') && 
          !event.displayName.includes('Loading')) {
        existingVertex.displayName = event.displayName;
      }
      
      await this.updateVertex(existingVertex);
      return existingVertex;
    } else {
      // Create new vertex for encountered entity
      const newVertex: GraphVertex = {
        id: vertexId,
        vertexType: VertexType.ENTITY,
        entityType: event.entityType,
        displayName: event.displayName,
        directlyVisited: false,
        firstSeen: event.timestamp,
        visitCount: 0,
        encounters: [encounter],
        metadata: event.metadata || {},
        stats: {
          totalEncounters: 1,
          searchResultCount: event.encounterType === EncounterType.SEARCH_RESULT ? 1 : 0,
          relatedEntityCount: event.encounterType === EncounterType.RELATED_ENTITY ? 1 : 0,
          lastEncounter: event.timestamp,
          firstSearchResult: event.encounterType === EncounterType.SEARCH_RESULT ? event.timestamp : undefined,
          firstRelatedEntity: event.encounterType === EncounterType.RELATED_ENTITY ? event.timestamp : undefined,
          inDegree: 0,
          outDegree: 0,
          totalDegree: 0,
        },
      };
      
      await this.createVertex(newVertex);
      return newVertex;
    }
  }

  async addRelationship(event: RelationshipDiscoveryEvent): Promise<GraphEdge | null> {
    const edgeId = generateEdgeId(event.sourceEntityId, event.targetEntityId, event.relationshipType);
    
    // Check if edge already exists
    const existingEdge = await this.getEdge(edgeId);
    if (existingEdge) {
      // Update confirmation count and last confirmed timestamp
      existingEdge.confirmationCount += 1;
      existingEdge.lastConfirmed = event.timestamp;
      await this.updateEdge(existingEdge);
      return existingEdge;
    }
    
    // Ensure both vertices exist
    const sourceVertex = await this.getVertex(generateVertexId(VertexType.ENTITY, event.sourceEntityId));
    const targetVertex = await this.getVertex(generateVertexId(VertexType.ENTITY, event.targetEntityId));
    
    if (!sourceVertex) {
      // This shouldn't happen in normal flow
      return null;
    }
    
    if (!targetVertex && event.metadata?.targetEntityType && event.metadata?.targetDisplayName) {
      // Create discovered vertex
      await this.recordEntityEncounter({
        entityId: event.targetEntityId,
        entityType: event.metadata.targetEntityType as EntityType,
        displayName: event.metadata.targetDisplayName as string,
        encounterType: EncounterType.RELATIONSHIP_DISCOVERY,
        timestamp: event.timestamp,
        context: {
          sourceEntityId: event.sourceEntityId,
          relationshipType: event.relationshipType,
          additionalInfo: event.metadata,
        },
        metadata: event.metadata,
      });
    } else if (!targetVertex) {
      return null; // Can't create edge without target vertex
    }
    
    // Create the edge
    const edge: GraphEdge = {
      id: edgeId,
      sourceId: event.sourceEntityId,
      targetId: event.targetEntityId,
      edgeType: event.relationshipType,
      weight: calculateEdgeWeight(event.relationshipType, {
        source: event.source,
        confidence: DEFAULT_CONFIDENCE,
        ...event.metadata,
      } as GraphEdge['properties']),
      discoveredFromDirectVisit: sourceVertex.directlyVisited,
      discoveredAt: event.timestamp,
      confirmationCount: 1,
      properties: {
        source: event.source,
        confidence: event.metadata?.confidence as number ?? DEFAULT_CONFIDENCE,
        context: event.metadata?.context as string,
        additionalProperties: event.metadata,
      },
    };
    
    await this.createEdge(edge);
    return edge;
  }

  async recordQueryParameters(event: QueryParametersEvent): Promise<GraphVertex> {
    const vertexId = generateQueryParametersId(event.queryString, event.queryFilters);
    const existingVertex = await this.getVertex(vertexId);
    
    if (existingVertex) {
      return existingVertex;
    }
    
    // Create new query parameters vertex
    const newVertex: GraphVertex = {
      id: vertexId,
      vertexType: VertexType.QUERY_PARAMETERS,
      displayName: `Query: ${event.queryString}`,
      directlyVisited: false,
      firstSeen: event.timestamp,
      visitCount: 0,
      encounters: [{
        type: EncounterType.QUERY_PARAMETER_CREATION,
        timestamp: event.timestamp,
        context: {},
      }],
      metadata: {
        queryString: event.queryString,
        queryFilters: event.queryFilters,
        queryHash: vertexId,
        ...event.metadata,
      },
      stats: {
        totalEncounters: 1,
        searchResultCount: 0,
        relatedEntityCount: 0,
        lastEncounter: event.timestamp,
        inDegree: 0,
        outDegree: 0,
        totalDegree: 0,
      },
    };
    
    await this.createVertex(newVertex);
    
    // Update global metadata
    const metadata = await this.getMetadata();
    await this.updateMetadata({
      uniqueQueryParameters: metadata.uniqueQueryParameters + 1,
    });
    
    return newVertex;
  }

  async recordQueryExecution(event: QueryExecutionEvent): Promise<{ queryVertex: GraphVertex; executionVertex: GraphVertex; resultEdges: GraphEdge[] }> {
    const executionId = generateQueryExecutionId(event.queryParametersId, event.timestamp);
    
    // Create query execution vertex
    const executionVertex: GraphVertex = {
      id: executionId,
      vertexType: VertexType.QUERY_EXECUTION,
      displayName: `Query Execution ${event.timestamp}`,
      directlyVisited: false,
      firstSeen: event.timestamp,
      visitCount: 0,
      encounters: [{
        type: EncounterType.QUERY_EXECUTION_CREATION,
        timestamp: event.timestamp,
        context: {
          sourceVertexId: event.queryParametersId,
        },
      }],
      metadata: {
        executionTimestamp: event.timestamp,
        resultCount: event.totalResults,
        pageNumber: event.pageNumber,
        perPage: event.perPage,
        ...event.metadata,
      },
      stats: {
        totalEncounters: 1,
        searchResultCount: 0,
        relatedEntityCount: 0,
        lastEncounter: event.timestamp,
        inDegree: 0,
        outDegree: 0,
        totalDegree: 0,
      },
    };
    
    await this.createVertex(executionVertex);
    
    // Create edge from query parameters to execution
    const queryInstanceEdge: GraphEdge = {
      id: generateEdgeId(event.queryParametersId, executionId, GraphEdgeType.QUERY_INSTANCE),
      sourceId: event.queryParametersId,
      targetId: executionId,
      edgeType: GraphEdgeType.QUERY_INSTANCE,
      weight: 1.0,
      discoveredFromDirectVisit: false,
      discoveredAt: event.timestamp,
      confirmationCount: 1,
      properties: {
        source: 'derived',
        confidence: 1.0,
      },
    };
    
    await this.createEdge(queryInstanceEdge);
    
    // Create edges to result entities
    const resultEdges: GraphEdge[] = [];
    for (let i = 0; i < event.resultEntityIds.length; i++) {
      const entityId = event.resultEntityIds[i];
      const resultEdge: GraphEdge = {
        id: generateEdgeId(executionId, entityId, GraphEdgeType.QUERY_RESULT),
        sourceId: executionId,
        targetId: entityId,
        edgeType: GraphEdgeType.QUERY_RESULT,
        weight: 1.0 - (i / event.resultEntityIds.length), // Higher weight for higher-ranked results
        discoveredFromDirectVisit: false,
        discoveredAt: event.timestamp,
        confirmationCount: 1,
        properties: {
          source: 'derived',
          confidence: 1.0,
          queryInfo: {
            resultRank: i + 1,
            queryExecutionId: executionId,
          },
        },
      };
      
      await this.createEdge(resultEdge);
      resultEdges.push(resultEdge);
    }
    
    // Get query parameters vertex
    const queryVertex = await this.getVertex(event.queryParametersId);
    if (!queryVertex) {
      throw new Error(`Query parameters vertex not found: ${event.queryParametersId}`);
    }
    
    // Update global metadata
    const metadata = await this.getMetadata();
    await this.updateMetadata({
      totalQueryExecutions: metadata.totalQueryExecutions + 1,
    });
    
    return { queryVertex, executionVertex, resultEdges };
  }

  // Utility methods
  private async addToIndex(
    indexStore: 'edgesBySource' | 'edgesByTarget' | 'verticesByType' | 'verticesByEntityType' | 'edgesByType', 
    key: string, 
    value: string
  ): Promise<void> {
    const db = await this.ensureDB();
    const existing = await db.get(indexStore, key) as string[] | undefined;
    const updated = existing ? [...existing, value] : [value];
    await db.put(indexStore, updated, key);
  }

  private async removeFromIndex(
    indexStore: 'edgesBySource' | 'edgesByTarget' | 'verticesByType' | 'verticesByEntityType' | 'edgesByType', 
    key: string, 
    value: string
  ): Promise<void> {
    const db = await this.ensureDB();
    const existing = await db.get(indexStore, key) as string[] | undefined;
    if (existing) {
      const updated = existing.filter((v: string) => v !== value);
      if (updated.length > 0) {
        await db.put(indexStore, updated, key);
      } else {
        await db.delete(indexStore, key);
      }
    }
  }

  private async updateVertexDegree(vertexId: string): Promise<void> {
    const vertex = await this.getVertex(vertexId);
    if (!vertex) return;
    
    const [outgoingEdges, incomingEdges] = await Promise.all([
      this.getEdgesBySource(vertexId),
      this.getEdgesByTarget(vertexId),
    ]);
    
    vertex.stats.outDegree = outgoingEdges.length;
    vertex.stats.inDegree = incomingEdges.length;
    vertex.stats.totalDegree = vertex.stats.inDegree + vertex.stats.outDegree;
    
    await this.updateVertex(vertex);
  }

  async getMetadata(): Promise<GraphDatabaseSchema['graphMetadata']['value']> {
    const db = await this.ensureDB();
    const metadata = await db.get('graphMetadata', 'metadata');
    if (!metadata) {
      throw new Error('Graph metadata not found');
    }
    return metadata;
  }

  async getAllVertices(): Promise<GraphVertex[]> {
    const db = await this.ensureDB();
    return db.getAll('vertices');
  }

  async getAllEdges(): Promise<GraphEdge[]> {
    const db = await this.ensureDB();
    return db.getAll('edges');
  }

  // Cleanup utilities
  async clearGraph(): Promise<void> {
    const db = await this.ensureDB();
    
    // Clear all stores
    await Promise.all([
      db.clear('vertices'),
      db.clear('edges'),
      db.clear('edgesBySource'),
      db.clear('edgesByTarget'),
      db.clear('verticesByType'),
      db.clear('verticesByEntityType'),
      db.clear('edgesByType'),
    ]);
    
    // Reinitialize metadata
    await this.initializeMetadata();
  }

  async getStorageEstimate(): Promise<{ usage?: number; quota?: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage,
        quota: estimate.quota,
      };
    }
    return {};
  }
}

// Export singleton instance
export const graphDb = new GraphDatabaseService();