/**
 * Simple Graph Storage Service
 * 
 * Lightweight persistence service that only stores ID, display_name, and edges
 * using localStorage with automatic JSON serialization.
 */

import type { SimpleGraph, SimpleEntity, SimpleEdge } from '@/types/simple-graph-storage';
import type { EntityType } from '@/lib/openalex/utils/entity-detection';
import type { EdgeType } from '@/types/entity-graph';

const STORAGE_KEY = 'academic-explorer-entity-graph';

class SimpleGraphStorage {
  /**
   * Load the simple graph from localStorage
   */
  async load(): Promise<SimpleGraph> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return this.createEmptyGraph();
      }
      
      const parsed = JSON.parse(stored);
      
      // Validate and return with defaults for missing properties
      return {
        entities: parsed.entities || {},
        edges: parsed.edges || {},
        visitedEntityIds: Array.isArray(parsed.visitedEntityIds) ? parsed.visitedEntityIds : [],
        metadata: {
          lastUpdated: parsed.metadata?.lastUpdated || new Date().toISOString(),
          totalVisits: parsed.metadata?.totalVisits || 0,
          uniqueEntitiesVisited: parsed.metadata?.uniqueEntitiesVisited || 0,
        },
      };
    } catch (error) {
      console.warn('Failed to load entity graph from localStorage:', error);
      return this.createEmptyGraph();
    }
  }
  
  /**
   * Save the simple graph to localStorage
   */
  async save(graph: SimpleGraph): Promise<void> {
    try {
      const serialized = JSON.stringify(graph);
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
      console.warn('Failed to save entity graph to localStorage:', error);
    }
  }
  
  /**
   * Add or update an entity
   */
  async upsertEntity(entityId: string, entityType: EntityType, displayName: string): Promise<void> {
    const graph = await this.load();
    
    graph.entities[entityId] = {
      id: entityId,
      entityType,
      displayName,
    };
    
    graph.metadata.lastUpdated = new Date().toISOString();
    
    await this.save(graph);
  }
  
  /**
   * Mark an entity as directly visited
   */
  async markEntityVisited(entityId: string): Promise<void> {
    const graph = await this.load();
    
    // Add to visited set if not already there
    if (!graph.visitedEntityIds.includes(entityId)) {
      graph.visitedEntityIds.push(entityId);
      graph.metadata.uniqueEntitiesVisited = graph.visitedEntityIds.length;
    }
    
    graph.metadata.totalVisits += 1;
    graph.metadata.lastUpdated = new Date().toISOString();
    
    await this.save(graph);
  }
  
  /**
   * Add an edge between entities
   */
  async addEdge(sourceId: string, targetId: string, edgeType: EdgeType, edgeId: string): Promise<void> {
    const graph = await this.load();
    
    graph.edges[edgeId] = {
      id: edgeId,
      sourceId,
      targetId,
      edgeType,
    };
    
    graph.metadata.lastUpdated = new Date().toISOString();
    
    await this.save(graph);
  }
  
  /**
   * Remove an entity and all connected edges
   */
  async removeEntity(entityId: string): Promise<void> {
    const graph = await this.load();
    
    // Remove the entity
    delete graph.entities[entityId];
    
    // Remove from visited list
    graph.visitedEntityIds = graph.visitedEntityIds.filter(id => id !== entityId);
    
    // Remove all edges connected to this entity
    Object.keys(graph.edges).forEach(edgeId => {
      const edge = graph.edges[edgeId];
      if (edge.sourceId === entityId || edge.targetId === entityId) {
        delete graph.edges[edgeId];
      }
    });
    
    graph.metadata.uniqueEntitiesVisited = graph.visitedEntityIds.length;
    graph.metadata.lastUpdated = new Date().toISOString();
    
    await this.save(graph);
  }
  
  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear entity graph from localStorage:', error);
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

export const simpleGraphStorage = new SimpleGraphStorage();