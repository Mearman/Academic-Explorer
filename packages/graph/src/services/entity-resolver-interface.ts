/**
 * Entity Resolver Interface and Types
 * Phase 1: Define interfaces without implementation dependencies
 * Full implementation will be added in Phase 3 with proper client integration
 */

import type { GraphNode, EntityType } from '../types/core';

export interface ExpansionOptions {
  maxNodes?: number;
  maxDepth?: number;
}

export interface ExpansionResult {
  nodes: GraphNode[];
  edges: never[]; // Will be GraphEdge[] in Phase 3
  metadata: {
    expandedFrom: string;
    totalFound: number;
    limitReached: boolean;
  };
}

/**
 * Interface for entity resolution and graph expansion
 * Phase 1: Interface definition only
 * Phase 3: Full implementation with OpenAlex client integration
 */
export interface IEntityResolver {
  /**
   * Resolve a single entity by ID and convert to GraphNode
   */
  resolveEntity(id: string): Promise<GraphNode>;

  /**
   * Expand an entity to find related nodes and edges
   */
  expandEntity(nodeId: string, options?: ExpansionOptions): Promise<ExpansionResult>;

  /**
   * Search for entities based on query
   */
  searchEntities(query: string, entityTypes?: EntityType[], limit?: number): Promise<GraphNode[]>;
}

/**
 * Placeholder EntityResolver implementation for Phase 1
 * Returns stub data to satisfy interface requirements
 * Will be replaced with full implementation in Phase 3
 */
export class EntityResolver implements IEntityResolver {
  /**
   * Stub implementation - returns placeholder GraphNode
   * TODO: Implement with OpenAlex client in Phase 3
   */
  async resolveEntity(id: string): Promise<GraphNode> {
    // Detect entity type from ID prefix
    const entityType = this.detectEntityType(id);

    return {
      id,
      entityId: id,
      entityType,
      label: `Placeholder: ${id}`,
      x: Math.random() * 800,
      y: Math.random() * 600,
      externalIds: [],
      entityData: { id, placeholder: true },
    };
  }

  /**
   * Stub implementation - returns single node
   * TODO: Implement full expansion logic in Phase 3
   */
  async expandEntity(nodeId: string, options: ExpansionOptions = {}): Promise<ExpansionResult> {
    const baseEntity = await this.resolveEntity(nodeId);

    return {
      nodes: [baseEntity],
      edges: [],
      metadata: {
        expandedFrom: nodeId,
        totalFound: 1,
        limitReached: false,
      },
    };
  }

  /**
   * Stub implementation - returns empty array
   * TODO: Implement search with OpenAlex client in Phase 3
   */
  async searchEntities(
    query: string,
    entityTypes: EntityType[] = [],
    limit: number = 25
  ): Promise<GraphNode[]> {
    // Return empty results for now
    console.warn('EntityResolver.searchEntities is a stub implementation. Full implementation in Phase 3.');
    return [];
  }

  private detectEntityType(id: string): EntityType {
    const prefix = id.charAt(0).toLowerCase();
    switch (prefix) {
      case 'w': return 'works';
      case 'a': return 'authors';
      case 's': return 'sources';
      case 'i': return 'institutions';
      case 't': return 'topics';
      case 'c': return 'topics'; // Legacy concepts
      case 'p': return 'publishers';
      case 'f': return 'funders';
      default: return 'works'; // Default fallback
    }
  }
}