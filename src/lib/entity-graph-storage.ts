/**
 * Simple Graph Storage Service
 * 
 * Lightweight persistence service that stores ID, display_name, and edges
 * using IndexedDB for permanent storage with better performance and capacity.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

import type { EntityType } from '@/lib/openalex/utils/entity-detection';
import type { EdgeType } from '@/types/entity-graph';
import type { SimpleGraph, SimpleEntity, SimpleEdge } from '@/types/entity-graph-storage';

// IndexedDB schema for entity graph storage
interface EntityGraphDB extends DBSchema {
  entities: {
    key: string; // entity ID
    value: SimpleEntity;
    indexes: {
      'by-type': EntityType;
    };
  };
  edges: {
    key: string; // edge ID
    value: SimpleEdge;
    indexes: {
      'by-source': string;
      'by-target': string;
    };
  };
  visited: {
    key: string; // entity ID
    value: {
      entityId: string;
      visitedAt: string;
    };
  };
  metadata: {
    key: string; // metadata key
    value: {
      key: string;
      lastUpdated: string;
      totalVisits: number;
      uniqueEntitiesVisited: number;
    };
  };
}

class SimpleGraphStorage {
  private db: IDBPDatabase<EntityGraphDB> | null = null;
  private readonly DB_NAME = 'academic-explorer-entity-graph';
  private readonly DB_VERSION = 1;

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await openDB<EntityGraphDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Create entities store with index
          if (!db.objectStoreNames.contains('entities')) {
            const entitiesStore = db.createObjectStore('entities');
            entitiesStore.createIndex('by-type', 'entityType');
          }

          // Create edges store with indexes
          if (!db.objectStoreNames.contains('edges')) {
            const edgesStore = db.createObjectStore('edges');
            edgesStore.createIndex('by-source', 'sourceId');
            edgesStore.createIndex('by-target', 'targetId');
          }

          // Create visited entities store
          if (!db.objectStoreNames.contains('visited')) {
            db.createObjectStore('visited');
          }

          // Create metadata store
          if (!db.objectStoreNames.contains('metadata')) {
            db.createObjectStore('metadata');
          }
        },
      });

      console.log('[SimpleGraphStorage] IndexedDB initialized successfully');
    } catch (error) {
      console.error('[SimpleGraphStorage] Failed to initialize IndexedDB:', error);
      throw error;
    }
  }

  private async ensureDB(): Promise<IDBPDatabase<EntityGraphDB>> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  /**
   * Load the simple graph from IndexedDB
   */
  async load(): Promise<SimpleGraph> {
    try {
      const db = await this.ensureDB();
      
      // Load all entities
      const entitiesArray = await db.getAll('entities');
      const entities: Record<string, SimpleEntity> = {};
      entitiesArray.forEach(entity => {
        entities[entity.id] = entity;
      });

      // Load all edges
      const edgesArray = await db.getAll('edges');
      const edges: Record<string, SimpleEdge> = {};
      edgesArray.forEach(edge => {
        edges[edge.id] = edge;
      });

      // Load visited entity IDs
      const visitedArray = await db.getAll('visited');
      const visitedEntityIds = visitedArray.map(v => v.entityId);

      // Load metadata
      const metadata = await db.get('metadata', 'main') || {
        key: 'main',
        lastUpdated: new Date().toISOString(),
        totalVisits: 0,
        uniqueEntitiesVisited: 0,
      };

      console.log(`[SimpleGraphStorage] Loaded ${entitiesArray.length} entities, ${edgesArray.length} edges, ${visitedEntityIds.length} visited from IndexedDB`);

      return {
        entities,
        edges,
        visitedEntityIds,
        metadata: {
          lastUpdated: metadata.lastUpdated,
          totalVisits: metadata.totalVisits,
          uniqueEntitiesVisited: metadata.uniqueEntitiesVisited,
        },
      };
    } catch (error) {
      console.warn('[SimpleGraphStorage] Failed to load entity graph from IndexedDB:', error);
      return this.createEmptyGraph();
    }
  }
  
  /**
   * Add or update an entity
   */
  async upsertEntity(entityId: string, entityType: EntityType, displayName: string): Promise<void> {
    try {
      const db = await this.ensureDB();
      
      const entity: SimpleEntity = {
        id: entityId,
        entityType,
        displayName,
      };
      
      await db.put('entities', entity, entityId);
      await this.updateMetadata();
      
      console.log(`[SimpleGraphStorage] Upserted entity ${entityType}:${entityId}`);
    } catch (error) {
      console.error('[SimpleGraphStorage] Failed to upsert entity:', error);
    }
  }
  
  /**
   * Mark an entity as directly visited
   */
  async markEntityVisited(entityId: string): Promise<void> {
    try {
      const db = await this.ensureDB();
      
      // Check if already visited
      const existing = await db.get('visited', entityId);
      const isNewVisit = !existing;
      
      // Add to visited set
      await db.put('visited', {
        entityId,
        visitedAt: new Date().toISOString(),
      }, entityId);
      
      // Update metadata
      const metadata = await db.get('metadata', 'main') || {
        key: 'main',
        lastUpdated: new Date().toISOString(),
        totalVisits: 0,
        uniqueEntitiesVisited: 0,
      };
      
      metadata.totalVisits += 1;
      if (isNewVisit) {
        metadata.uniqueEntitiesVisited += 1;
      }
      metadata.lastUpdated = new Date().toISOString();
      
      await db.put('metadata', metadata, 'main');
      
      console.log(`[SimpleGraphStorage] Marked entity ${entityId} as visited`);
    } catch (error) {
      console.error('[SimpleGraphStorage] Failed to mark entity as visited:', error);
    }
  }
  
  /**
   * Add an edge between entities
   */
  async addEdge(sourceId: string, targetId: string, edgeType: EdgeType, edgeId: string): Promise<void> {
    try {
      const db = await this.ensureDB();
      
      const edge: SimpleEdge = {
        id: edgeId,
        sourceId,
        targetId,
        edgeType,
      };
      
      await db.put('edges', edge, edgeId);
      await this.updateMetadata();
      
      console.log(`[SimpleGraphStorage] Added edge ${edgeId}: ${sourceId} -> ${targetId}`);
    } catch (error) {
      console.error('[SimpleGraphStorage] Failed to add edge:', error);
    }
  }
  
  /**
   * Remove an entity and all connected edges
   */
  async removeEntity(entityId: string): Promise<void> {
    try {
      const db = await this.ensureDB();
      
      // Remove the entity
      await db.delete('entities', entityId);
      
      // Remove from visited list
      await db.delete('visited', entityId);
      
      // Remove all edges connected to this entity
      const allEdges = await db.getAll('edges');
      for (const edge of allEdges) {
        if (edge.sourceId === entityId || edge.targetId === entityId) {
          await db.delete('edges', edge.id);
        }
      }
      
      // Update metadata
      const visitedCount = (await db.getAllKeys('visited')).length;
      const metadata = await db.get('metadata', 'main') || {
        key: 'main',
        lastUpdated: new Date().toISOString(),
        totalVisits: 0,
        uniqueEntitiesVisited: 0,
      };
      
      metadata.uniqueEntitiesVisited = visitedCount;
      metadata.lastUpdated = new Date().toISOString();
      await db.put('metadata', metadata, 'main');
      
      console.log(`[SimpleGraphStorage] Removed entity ${entityId} and connected edges`);
    } catch (error) {
      console.error('[SimpleGraphStorage] Failed to remove entity:', error);
    }
  }
  
  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    try {
      const db = await this.ensureDB();
      
      // Clear all stores
      await db.clear('entities');
      await db.clear('edges');
      await db.clear('visited');
      await db.clear('metadata');
      
      console.log('[SimpleGraphStorage] Cleared all data from IndexedDB');
    } catch (error) {
      console.error('[SimpleGraphStorage] Failed to clear data from IndexedDB:', error);
    }
  }

  /**
   * Update metadata timestamp
   */
  private async updateMetadata(): Promise<void> {
    try {
      const db = await this.ensureDB();
      const metadata = await db.get('metadata', 'main') || {
        key: 'main',
        lastUpdated: new Date().toISOString(),
        totalVisits: 0,
        uniqueEntitiesVisited: 0,
      };
      
      metadata.lastUpdated = new Date().toISOString();
      await db.put('metadata', metadata, 'main');
    } catch (error) {
      console.error('[SimpleGraphStorage] Failed to update metadata:', error);
    }
  }
  
  /**
   * Create an empty graph structure
   */
  private createEmptyGraph(): SimpleGraph {
    return {
      entities: {},
      edges: {},
      visitedEntityIds: [],
      metadata: {
        lastUpdated: new Date().toISOString(),
        totalVisits: 0,
        uniqueEntitiesVisited: 0,
      },
    };
  }
}

export const entityGraphStorage = new SimpleGraphStorage();