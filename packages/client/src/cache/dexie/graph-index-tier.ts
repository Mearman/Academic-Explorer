/**
 * Graph Index Tier
 *
 * Provides CRUD operations for graph nodes and edges stored in IndexedDB.
 * This is the low-level persistence layer - the PersistentGraph class
 * wraps this with in-memory caching for fast traversal.
 */

import {
  type CompletenessStatus,
  type EdgePropertyFilter,
  type GraphEdgeInput,
  type GraphEdgeRecord,
  type GraphNodeInput,
  type GraphNodeRecord,
  type RelationType,
} from '@bibgraph/types';
import { logger } from '@bibgraph/utils';

import {
  generateEdgeId,
  getGraphIndexDB,
  isIndexedDBAvailableForGraph,
} from './graph-index-db';

const LOG_PREFIX = 'graph-index-tier';

/**
 * Statistics for graph index operations
 */
export interface GraphIndexStats {
  nodeCount: number;
  edgeCount: number;
  nodesByCompleteness: Record<CompletenessStatus, number>;
}

/**
 * Graph Index Tier - Dexie-based persistence for graph data
 */
export class GraphIndexTier {
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Ensure the tier is initialized before operations
   */
  private async ensureInitialized(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
      return this.initialized;
    }

    this.initializationPromise = this.initialize();
    await this.initializationPromise;
    return this.initialized;
  }

  private async initialize(): Promise<void> {
    if (!isIndexedDBAvailableForGraph()) {
      logger.debug(LOG_PREFIX, 'IndexedDB not available, graph index tier disabled');
      this.initialized = false;
      return;
    }

    try {
      const db = getGraphIndexDB();
      if (!db) {
        this.initialized = false;
        return;
      }

      // Test database connectivity
      await db.nodes.count();
      this.initialized = true;

      logger.debug(LOG_PREFIX, 'Graph index tier initialized');
    } catch (error) {
      logger.warn(LOG_PREFIX, 'Failed to initialize graph index tier', { error });
      this.initialized = false;
    }
  }

  // ===========================================================================
  // Node Operations
  // ===========================================================================

  /**
   * Add a node to the graph index
   * @param input
   */
  async addNode(input: GraphNodeInput): Promise<void> {
    if (!(await this.ensureInitialized())) {
      return;
    }

    const db = getGraphIndexDB();
    if (!db) {
      return;
    }

    const now = Date.now();
    const record: GraphNodeRecord = {
      ...input,
      cachedAt: now,
      updatedAt: now,
    };

    try {
      await db.nodes.put(record);
      logger.debug(LOG_PREFIX, 'Node added', { id: input.id, completeness: input.completeness });
    } catch (error) {
      logger.warn(LOG_PREFIX, 'Error adding node', { id: input.id, error });
    }
  }

  /**
   * Get a node by ID
   * @param id
   */
  async getNode(id: string): Promise<GraphNodeRecord | undefined> {
    if (!(await this.ensureInitialized())) {
      return undefined;
    }

    const db = getGraphIndexDB();
    if (!db) {
      return undefined;
    }

    try {
      return await db.nodes.get(id);
    } catch (error) {
      logger.warn(LOG_PREFIX, 'Error getting node', { id, error });
      return undefined;
    }
  }

  /**
   * Check if a node exists
   * @param id
   */
  async hasNode(id: string): Promise<boolean> {
    if (!(await this.ensureInitialized())) {
      return false;
    }

    const db = getGraphIndexDB();
    if (!db) {
      return false;
    }

    try {
      const node = await db.nodes.get(id);
      return node !== undefined;
    } catch (error) {
      logger.warn(LOG_PREFIX, 'Error checking node existence', { id, error });
      return false;
    }
  }

  /**
   * Update a node's completeness status
   * Only upgrades: stub → partial → full (never downgrades)
   * @param id
   * @param completeness
   * @param label
   * @param metadata
   */
  async updateNodeCompleteness(
    id: string,
    completeness: CompletenessStatus,
    label?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!(await this.ensureInitialized())) {
      return;
    }

    const db = getGraphIndexDB();
    if (!db) {
      return;
    }

    try {
      const existing = await db.nodes.get(id);
      if (!existing) {
        logger.warn(LOG_PREFIX, 'Cannot update completeness: node not found', { id });
        return;
      }

      // Only upgrade completeness, never downgrade
      const shouldUpgrade = this.shouldUpgradeCompleteness(existing.completeness, completeness);
      if (!shouldUpgrade && !label && !metadata) {
        return;
      }

      const updates: Partial<GraphNodeRecord> = {
        updatedAt: Date.now(),
      };

      if (shouldUpgrade) {
        updates.completeness = completeness;
      }

      if (label && label !== existing.label) {
        updates.label = label;
      }

      if (metadata) {
        updates.metadata = { ...existing.metadata, ...metadata };
      }

      await db.nodes.update(id, updates);
      logger.debug(LOG_PREFIX, 'Node completeness updated', {
        id,
        from: existing.completeness,
        to: shouldUpgrade ? completeness : existing.completeness,
      });
    } catch (error) {
      logger.warn(LOG_PREFIX, 'Error updating node completeness', { id, error });
    }
  }

  /**
   * Mark a node as expanded (relationships have been fetched)
   * @param id
   */
  async markNodeExpanded(id: string): Promise<void> {
    if (!(await this.ensureInitialized())) {
      return;
    }

    const db = getGraphIndexDB();
    if (!db) {
      return;
    }

    try {
      const existing = await db.nodes.get(id);
      if (!existing) {
        logger.warn(LOG_PREFIX, 'Cannot mark as expanded: node not found', { id });
        return;
      }

      await db.nodes.update(id, {
        expandedAt: Date.now(),
        updatedAt: Date.now(),
      });

      logger.debug(LOG_PREFIX, 'Node marked as expanded', { id });
    } catch (error) {
      logger.warn(LOG_PREFIX, 'Error marking node as expanded', { id, error });
    }
  }

  /**
   * Get all nodes
   */
  async getAllNodes(): Promise<GraphNodeRecord[]> {
    if (!(await this.ensureInitialized())) {
      return [];
    }

    const db = getGraphIndexDB();
    if (!db) {
      return [];
    }

    try {
      return await db.nodes.toArray();
    } catch (error) {
      logger.warn(LOG_PREFIX, 'Error getting all nodes', { error });
      return [];
    }
  }

  /**
   * Get nodes by completeness status
   * @param status
   */
  async getNodesByCompleteness(status: CompletenessStatus): Promise<GraphNodeRecord[]> {
    if (!(await this.ensureInitialized())) {
      return [];
    }

    const db = getGraphIndexDB();
    if (!db) {
      return [];
    }

    try {
      return await db.nodes.where('completeness').equals(status).toArray();
    } catch (error) {
      logger.warn(LOG_PREFIX, 'Error getting nodes by completeness', { status, error });
      return [];
    }
  }

  /**
   * Get node count
   */
  async getNodeCount(): Promise<number> {
    if (!(await this.ensureInitialized())) {
      return 0;
    }

    const db = getGraphIndexDB();
    if (!db) {
      return 0;
    }

    try {
      return await db.nodes.count();
    } catch (error) {
      logger.warn(LOG_PREFIX, 'Error counting nodes', { error });
      return 0;
    }
  }

  /**
   * Delete a node
   * @param id
   */
  async deleteNode(id: string): Promise<void> {
    if (!(await this.ensureInitialized())) {
      return;
    }

    const db = getGraphIndexDB();
    if (!db) {
      return;
    }

    try {
      await db.nodes.delete(id);
      logger.debug(LOG_PREFIX, 'Node deleted', { id });
    } catch (error) {
      logger.warn(LOG_PREFIX, 'Error deleting node', { id, error });
    }
  }

  // ===========================================================================
  // Edge Operations
  // ===========================================================================

  /**
   * Add an edge to the graph index
   * Returns false if edge already exists (deduplication)
   * @param input
   */
  async addEdge(input: GraphEdgeInput): Promise<boolean> {
    if (!(await this.ensureInitialized())) {
      return false;
    }

    const db = getGraphIndexDB();
    if (!db) {
      return false;
    }

    const edgeId = generateEdgeId(input.source, input.target, input.type);

    try {
      // Check for existing edge (deduplication)
      const existing = await db.edges.get(edgeId);
      if (existing) {
        logger.debug(LOG_PREFIX, 'Edge already exists, skipping', { edgeId });
        return false;
      }

      const record: GraphEdgeRecord = {
        id: edgeId,
        source: input.source,
        target: input.target,
        type: input.type,
        direction: input.direction,
        discoveredAt: Date.now(),
        // Copy indexed properties
        authorPosition: input.authorPosition,
        isCorresponding: input.isCorresponding,
        isOpenAccess: input.isOpenAccess,
        version: input.version,
        score: input.score,
        years: input.years,
        awardId: input.awardId,
        role: input.role,
        metadata: input.metadata,
      };

      await db.edges.put(record);
      logger.debug(LOG_PREFIX, 'Edge added', { edgeId, type: input.type });
      return true;
    } catch (error) {
      logger.warn(LOG_PREFIX, 'Error adding edge', { edgeId, error });
      return false;
    }
  }

  /**
   * Check if an edge exists
   * @param source
   * @param target
   * @param type
   */
  async hasEdge(source: string, target: string, type: RelationType): Promise<boolean> {
    if (!(await this.ensureInitialized())) {
      return false;
    }

    const db = getGraphIndexDB();
    if (!db) {
      return false;
    }

    const edgeId = generateEdgeId(source, target, type);

    try {
      const edge = await db.edges.get(edgeId);
      return edge !== undefined;
    } catch (error) {
      logger.warn(LOG_PREFIX, 'Error checking edge existence', { edgeId, error });
      return false;
    }
  }

  /**
   * Get all edges from a source node
   * @param nodeId
   * @param type
   * @param filter
   */
  async getEdgesFrom(
    nodeId: string,
    type?: RelationType,
    filter?: EdgePropertyFilter
  ): Promise<GraphEdgeRecord[]> {
    if (!(await this.ensureInitialized())) {
      return [];
    }

    const db = getGraphIndexDB();
    if (!db) {
      return [];
    }

    try {
      let edges: GraphEdgeRecord[];

      edges = await (type ? db.edges.where('[source+type]').equals([nodeId, type]).toArray() : db.edges.where('source').equals(nodeId).toArray());

      if (filter) {
        edges = this.applyEdgeFilter(edges, filter);
      }

      return edges;
    } catch (error) {
      logger.warn(LOG_PREFIX, 'Error getting edges from node', { nodeId, type, error });
      return [];
    }
  }

  /**
   * Get all edges to a target node
   * @param nodeId
   * @param type
   * @param filter
   */
  async getEdgesTo(
    nodeId: string,
    type?: RelationType,
    filter?: EdgePropertyFilter
  ): Promise<GraphEdgeRecord[]> {
    if (!(await this.ensureInitialized())) {
      return [];
    }

    const db = getGraphIndexDB();
    if (!db) {
      return [];
    }

    try {
      let edges: GraphEdgeRecord[];

      edges = await (type ? db.edges.where('[target+type]').equals([nodeId, type]).toArray() : db.edges.where('target').equals(nodeId).toArray());

      if (filter) {
        edges = this.applyEdgeFilter(edges, filter);
      }

      return edges;
    } catch (error) {
      logger.warn(LOG_PREFIX, 'Error getting edges to node', { nodeId, type, error });
      return [];
    }
  }

  /**
   * Get all edges
   */
  async getAllEdges(): Promise<GraphEdgeRecord[]> {
    if (!(await this.ensureInitialized())) {
      return [];
    }

    const db = getGraphIndexDB();
    if (!db) {
      return [];
    }

    try {
      return await db.edges.toArray();
    } catch (error) {
      logger.warn(LOG_PREFIX, 'Error getting all edges', { error });
      return [];
    }
  }

  /**
   * Get edge count
   */
  async getEdgeCount(): Promise<number> {
    if (!(await this.ensureInitialized())) {
      return 0;
    }

    const db = getGraphIndexDB();
    if (!db) {
      return 0;
    }

    try {
      return await db.edges.count();
    } catch (error) {
      logger.warn(LOG_PREFIX, 'Error counting edges', { error });
      return 0;
    }
  }

  /**
   * Delete an edge
   * @param source
   * @param target
   * @param type
   */
  async deleteEdge(source: string, target: string, type: RelationType): Promise<void> {
    if (!(await this.ensureInitialized())) {
      return;
    }

    const db = getGraphIndexDB();
    if (!db) {
      return;
    }

    const edgeId = generateEdgeId(source, target, type);

    try {
      await db.edges.delete(edgeId);
      logger.debug(LOG_PREFIX, 'Edge deleted', { edgeId });
    } catch (error) {
      logger.warn(LOG_PREFIX, 'Error deleting edge', { edgeId, error });
    }
  }

  // ===========================================================================
  // Bulk Operations
  // ===========================================================================

  /**
   * Add multiple nodes in a batch
   * @param inputs
   */
  async addNodes(inputs: GraphNodeInput[]): Promise<void> {
    if (!(await this.ensureInitialized())) {
      return;
    }

    const db = getGraphIndexDB();
    if (!db) {
      return;
    }

    const now = Date.now();
    const records: GraphNodeRecord[] = inputs.map((input) => ({
      ...input,
      cachedAt: now,
      updatedAt: now,
    }));

    try {
      await db.nodes.bulkPut(records);
      logger.debug(LOG_PREFIX, 'Bulk nodes added', { count: records.length });
    } catch (error) {
      logger.warn(LOG_PREFIX, 'Error adding bulk nodes', { error });
    }
  }

  /**
   * Add multiple edges in a batch (with deduplication)
   * @param inputs
   */
  async addEdges(inputs: GraphEdgeInput[]): Promise<number> {
    if (!(await this.ensureInitialized())) {
      return 0;
    }

    const db = getGraphIndexDB();
    if (!db) {
      return 0;
    }

    const now = Date.now();
    const records: GraphEdgeRecord[] = inputs.map((input) => ({
      id: generateEdgeId(input.source, input.target, input.type),
      source: input.source,
      target: input.target,
      type: input.type,
      direction: input.direction,
      discoveredAt: now,
      authorPosition: input.authorPosition,
      isCorresponding: input.isCorresponding,
      isOpenAccess: input.isOpenAccess,
      version: input.version,
      score: input.score,
      years: input.years,
      awardId: input.awardId,
      role: input.role,
      metadata: input.metadata,
    }));

    try {
      // Use bulkPut to handle duplicates (will update existing)
      await db.edges.bulkPut(records);
      logger.debug(LOG_PREFIX, 'Bulk edges added', { count: records.length });
      return records.length;
    } catch (error) {
      logger.warn(LOG_PREFIX, 'Error adding bulk edges', { error });
      return 0;
    }
  }

  // ===========================================================================
  // Clear Operations
  // ===========================================================================

  /**
   * Clear all graph data
   */
  async clear(): Promise<void> {
    if (!(await this.ensureInitialized())) {
      return;
    }

    const db = getGraphIndexDB();
    if (!db) {
      return;
    }

    try {
      await db.transaction('rw', [db.nodes, db.edges], async () => {
        await db.nodes.clear();
        await db.edges.clear();
      });
      logger.debug(LOG_PREFIX, 'Graph index cleared');
    } catch (error) {
      logger.warn(LOG_PREFIX, 'Error clearing graph index', { error });
    }
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  /**
   * Get graph statistics
   */
  async getStats(): Promise<GraphIndexStats> {
    if (!(await this.ensureInitialized())) {
      return {
        nodeCount: 0,
        edgeCount: 0,
        nodesByCompleteness: { full: 0, partial: 0, stub: 0 },
      };
    }

    const db = getGraphIndexDB();
    if (!db) {
      return {
        nodeCount: 0,
        edgeCount: 0,
        nodesByCompleteness: { full: 0, partial: 0, stub: 0 },
      };
    }

    try {
      const [nodeCount, edgeCount, fullCount, partialCount, stubCount] = await Promise.all([
        db.nodes.count(),
        db.edges.count(),
        db.nodes.where('completeness').equals('full').count(),
        db.nodes.where('completeness').equals('partial').count(),
        db.nodes.where('completeness').equals('stub').count(),
      ]);

      return {
        nodeCount,
        edgeCount,
        nodesByCompleteness: {
          full: fullCount,
          partial: partialCount,
          stub: stubCount,
        },
      };
    } catch (error) {
      logger.warn(LOG_PREFIX, 'Error getting graph stats', { error });
      return {
        nodeCount: 0,
        edgeCount: 0,
        nodesByCompleteness: { full: 0, partial: 0, stub: 0 },
      };
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Check if completeness should be upgraded
   * @param current
   * @param proposed
   */
  private shouldUpgradeCompleteness(
    current: CompletenessStatus,
    proposed: CompletenessStatus
  ): boolean {
    const order: Record<CompletenessStatus, number> = {
      stub: 0,
      partial: 1,
      full: 2,
    };
    return order[proposed] > order[current];
  }

  /**
   * Apply edge property filter to edges
   * @param edges
   * @param filter
   */
  private applyEdgeFilter(edges: GraphEdgeRecord[], filter: EdgePropertyFilter): GraphEdgeRecord[] {
    return edges.filter((edge) => {
      if (filter.authorPosition !== undefined && edge.authorPosition !== filter.authorPosition) {
        return false;
      }
      if (filter.isCorresponding !== undefined && edge.isCorresponding !== filter.isCorresponding) {
        return false;
      }
      if (filter.isOpenAccess !== undefined && edge.isOpenAccess !== filter.isOpenAccess) {
        return false;
      }
      if (filter.version !== undefined && edge.version !== filter.version) {
        return false;
      }
      if (filter.scoreMin !== undefined && (edge.score === undefined || edge.score < filter.scoreMin)) {
        return false;
      }
      if (filter.scoreMax !== undefined && (edge.score === undefined || edge.score > filter.scoreMax)) {
        return false;
      }
      if (filter.yearsInclude !== undefined && filter.yearsInclude.length > 0 && (!edge.years || !filter.yearsInclude.some((year) => edge.years?.includes(year)))) {
          return false;
        }
      if (filter.awardId !== undefined && edge.awardId !== filter.awardId) {
        return false;
      }
      if (filter.role !== undefined && edge.role !== filter.role) {
        return false;
      }
      return true;
    });
  }

  /**
   * Check if the tier is available
   */
  isAvailable(): boolean {
    return isIndexedDBAvailableForGraph();
  }
}

// Singleton instance
let graphIndexTierInstance: GraphIndexTier | null = null;

/**
 * Get the graph index tier singleton
 */
export const getGraphIndexTier = (): GraphIndexTier => {
  if (!graphIndexTierInstance) {
    graphIndexTierInstance = new GraphIndexTier();
  }
  return graphIndexTierInstance;
};

/**
 * Reset the singleton instance (for testing)
 */
export const resetGraphIndexTier = (): void => {
  graphIndexTierInstance = null;
};
