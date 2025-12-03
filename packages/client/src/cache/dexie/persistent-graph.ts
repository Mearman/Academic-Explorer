/**
 * Persistent Graph
 *
 * Combines in-memory graph operations with Dexie persistence for fast
 * traversal and durable storage. Implements write-through caching:
 * all mutations immediately persist to IndexedDB.
 * @module cache/dexie/persistent-graph
 */

import {
  type CompletenessStatus,
  type EdgeDirectionFilter,
  type EdgePropertyFilter,
  type EntityType,
  type GraphEdgeInput,
  type GraphEdgeRecord,
  type GraphNodeInput,
  type GraphNodeRecord,
  type GraphStatistics,
  type NeighborQueryOptions,
  type RelationType,
  type SubgraphResult,
} from '@bibgraph/types';
import { logger } from '@bibgraph/utils';

import { generateEdgeId } from './graph-index-db';
import { getGraphIndexTier, type GraphIndexTier } from './graph-index-tier';

const LOG_PREFIX = 'persistent-graph';

/**
 * PersistentGraph state
 */
type HydrationState = 'not_started' | 'hydrating' | 'hydrated' | 'error';

/**
 * PersistentGraph - In-memory graph with IndexedDB persistence
 *
 * The graph hydrates from IndexedDB on first access, then maintains
 * an in-memory copy for fast queries. All mutations write through
 * to IndexedDB immediately.
 */
export class PersistentGraph {
  private tier: GraphIndexTier;
  private hydrationState: HydrationState = 'not_started';
  private hydrationPromise: Promise<void> | null = null;

  // In-memory caches for fast access
  private nodeCache: Map<string, GraphNodeRecord> = new Map();
  private edgeCache: Map<string, GraphEdgeRecord> = new Map();

  // Adjacency lists for fast neighbor lookups
  private outboundEdges: Map<string, Set<string>> = new Map(); // nodeId -> edgeIds
  private inboundEdges: Map<string, Set<string>> = new Map(); // nodeId -> edgeIds

  constructor(tier?: GraphIndexTier) {
    this.tier = tier ?? getGraphIndexTier();
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /**
   * Initialize the persistent graph (idempotent)
   * Starts hydration if not already started
   */
  async initialize(): Promise<void> {
    if (this.hydrationState === 'hydrated') {
      return;
    }
    await this.hydrate();
  }

  /**
   * Hydrate in-memory cache from IndexedDB
   */
  async hydrate(): Promise<void> {
    if (this.hydrationState === 'hydrated') {
      return;
    }

    if (this.hydrationPromise) {
      await this.hydrationPromise;
      return;
    }

    this.hydrationState = 'hydrating';
    this.hydrationPromise = this.doHydrate();

    try {
      await this.hydrationPromise;
      this.hydrationState = 'hydrated';
      logger.debug(LOG_PREFIX, 'Graph hydrated', {
        nodes: this.nodeCache.size,
        edges: this.edgeCache.size,
      });
    } catch (error) {
      this.hydrationState = 'error';
      logger.warn(LOG_PREFIX, 'Graph hydration failed', { error });
      throw error;
    } finally {
      this.hydrationPromise = null;
    }
  }

  private async doHydrate(): Promise<void> {
    const startTime = Date.now();

    // Load all nodes and edges from IndexedDB
    const [nodes, edges] = await Promise.all([
      this.tier.getAllNodes(),
      this.tier.getAllEdges(),
    ]);

    // Populate node cache
    this.nodeCache.clear();
    for (const node of nodes) {
      this.nodeCache.set(node.id, node);
      this.outboundEdges.set(node.id, new Set());
      this.inboundEdges.set(node.id, new Set());
    }

    // Populate edge cache and adjacency lists
    this.edgeCache.clear();
    for (const edge of edges) {
      this.edgeCache.set(edge.id, edge);

      // Update adjacency lists
      const outbound = this.outboundEdges.get(edge.source);
      if (outbound) {
        outbound.add(edge.id);
      } else {
        this.outboundEdges.set(edge.source, new Set([edge.id]));
      }

      const inbound = this.inboundEdges.get(edge.target);
      if (inbound) {
        inbound.add(edge.id);
      } else {
        this.inboundEdges.set(edge.target, new Set([edge.id]));
      }
    }

    const elapsed = Date.now() - startTime;
    logger.debug(LOG_PREFIX, 'Hydration complete', {
      nodes: nodes.length,
      edges: edges.length,
      elapsed,
    });
  }

  /**
   * Clear all graph data from memory and IndexedDB
   */
  async clear(): Promise<void> {
    // Clear in-memory caches
    this.nodeCache.clear();
    this.edgeCache.clear();
    this.outboundEdges.clear();
    this.inboundEdges.clear();

    // Clear IndexedDB
    await this.tier.clear();

    logger.debug(LOG_PREFIX, 'Graph cleared');
  }

  /**
   * Check if the graph is hydrated and ready
   */
  isReady(): boolean {
    return this.hydrationState === 'hydrated';
  }

  /**
   * Get hydration state
   */
  getHydrationState(): HydrationState {
    return this.hydrationState;
  }

  // ===========================================================================
  // Node Operations
  // ===========================================================================

  /**
   * Add a node to the graph
   * Write-through: persists to IndexedDB immediately
   * @param input
   */
  async addNode(input: GraphNodeInput): Promise<void> {
    await this.ensureHydrated();

    // Check if node already exists
    if (this.nodeCache.has(input.id)) {
      // Update if higher completeness
      await this.updateNodeCompleteness(input.id, input.completeness, input.label, input.metadata);
      return;
    }

    const now = Date.now();
    const record: GraphNodeRecord = {
      ...input,
      cachedAt: now,
      updatedAt: now,
    };

    // Write to IndexedDB first (write-through)
    await this.tier.addNode(input);

    // Update in-memory cache
    this.nodeCache.set(input.id, record);
    this.outboundEdges.set(input.id, new Set());
    this.inboundEdges.set(input.id, new Set());

    logger.debug(LOG_PREFIX, 'Node added', { id: input.id, completeness: input.completeness });
  }

  /**
   * Get a node by ID (synchronous - from memory)
   * @param id
   */
  getNode(id: string): GraphNodeRecord | undefined {
    return this.nodeCache.get(id);
  }

  /**
   * Check if a node exists (synchronous - from memory)
   * @param id
   */
  hasNode(id: string): boolean {
    return this.nodeCache.has(id);
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
    await this.ensureHydrated();

    const existing = this.nodeCache.get(id);
    if (!existing) {
      return;
    }

    const shouldUpgrade = this.shouldUpgradeCompleteness(existing.completeness, completeness);
    if (!shouldUpgrade && !label && !metadata) {
      return;
    }

    // Write to IndexedDB first
    await this.tier.updateNodeCompleteness(id, completeness, label, metadata);

    // Update in-memory cache
    const updated: GraphNodeRecord = {
      ...existing,
      updatedAt: Date.now(),
    };

    if (shouldUpgrade) {
      updated.completeness = completeness;
    }

    if (label && label !== existing.label) {
      updated.label = label;
    }

    if (metadata) {
      updated.metadata = { ...existing.metadata, ...metadata };
    }

    this.nodeCache.set(id, updated);
  }

  /**
   * Update a node's label only
   * Convenience method for updating display names without changing completeness
   * @param id
   * @param label
   */
  async updateNodeLabel(id: string, label: string): Promise<void> {
    await this.ensureHydrated();

    const existing = this.nodeCache.get(id);
    if (!existing || existing.label === label) {
      return;
    }

    // Use updateNodeCompleteness with existing completeness to just update the label
    await this.updateNodeCompleteness(id, existing.completeness, label);
  }

  /**
   * Mark a node as expanded (relationships have been fetched)
   * @param id
   */
  async markNodeExpanded(id: string): Promise<void> {
    await this.ensureHydrated();

    const existing = this.nodeCache.get(id);
    if (!existing) {
      return;
    }

    // Already expanded
    if (existing.expandedAt !== undefined) {
      return;
    }

    // Write to IndexedDB first
    await this.tier.markNodeExpanded(id);

    // Update in-memory cache
    const updated: GraphNodeRecord = {
      ...existing,
      expandedAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.nodeCache.set(id, updated);
  }

  /**
   * Get node count (synchronous - from memory)
   */
  getNodeCount(): number {
    return this.nodeCache.size;
  }

  /**
   * Get all nodes (synchronous - from memory)
   */
  getAllNodes(): GraphNodeRecord[] {
    return Array.from(this.nodeCache.values());
  }

  /**
   * Get nodes by completeness status (synchronous - from memory)
   * @param status
   */
  getNodesByCompleteness(status: CompletenessStatus): GraphNodeRecord[] {
    return Array.from(this.nodeCache.values()).filter((n) => n.completeness === status);
  }

  /**
   * Get nodes by entity type (synchronous - from memory)
   * @param entityType
   */
  getNodesByType(entityType: EntityType): GraphNodeRecord[] {
    return Array.from(this.nodeCache.values()).filter((n) => n.entityType === entityType);
  }

  // ===========================================================================
  // Edge Operations
  // ===========================================================================

  /**
   * Add an edge to the graph
   * Write-through: persists to IndexedDB immediately
   * Returns false if edge already exists (deduplication)
   * @param input
   */
  async addEdge(input: GraphEdgeInput): Promise<boolean> {
    await this.ensureHydrated();

    const edgeId = generateEdgeId(input.source, input.target, input.type);

    // Check for duplicate
    if (this.edgeCache.has(edgeId)) {
      return false;
    }

    const record: GraphEdgeRecord = {
      id: edgeId,
      source: input.source,
      target: input.target,
      type: input.type,
      direction: input.direction,
      discoveredAt: Date.now(),
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

    // Write to IndexedDB first
    await this.tier.addEdge(input);

    // Update in-memory cache
    this.edgeCache.set(edgeId, record);

    // Update adjacency lists
    const outbound = this.outboundEdges.get(input.source);
    if (outbound) {
      outbound.add(edgeId);
    } else {
      this.outboundEdges.set(input.source, new Set([edgeId]));
    }

    const inbound = this.inboundEdges.get(input.target);
    if (inbound) {
      inbound.add(edgeId);
    } else {
      this.inboundEdges.set(input.target, new Set([edgeId]));
    }

    logger.debug(LOG_PREFIX, 'Edge added', { edgeId, type: input.type });
    return true;
  }

  /**
   * Check if an edge exists (synchronous - from memory)
   * @param source
   * @param target
   * @param type
   */
  hasEdge(source: string, target: string, type: RelationType): boolean {
    const edgeId = generateEdgeId(source, target, type);
    return this.edgeCache.has(edgeId);
  }

  /**
   * Get edge count (synchronous - from memory)
   */
  getEdgeCount(): number {
    return this.edgeCache.size;
  }

  /**
   * Get all edges (synchronous - from memory)
   */
  getAllEdges(): GraphEdgeRecord[] {
    return Array.from(this.edgeCache.values());
  }

  /**
   * Get edges from a source node (synchronous - from memory)
   * @param nodeId
   * @param type
   * @param filter
   */
  getEdgesFrom(
    nodeId: string,
    type?: RelationType,
    filter?: EdgePropertyFilter
  ): GraphEdgeRecord[] {
    const edgeIds = this.outboundEdges.get(nodeId);
    if (!edgeIds) {
      return [];
    }

    let edges = Array.from(edgeIds)
      .map((id) => this.edgeCache.get(id))
      .filter((e): e is GraphEdgeRecord => e !== undefined);

    if (type) {
      edges = edges.filter((e) => e.type === type);
    }

    if (filter) {
      edges = this.applyEdgeFilter(edges, filter);
    }

    return edges;
  }

  /**
   * Get edges to a target node (synchronous - from memory)
   * @param nodeId
   * @param type
   * @param filter
   */
  getEdgesTo(
    nodeId: string,
    type?: RelationType,
    filter?: EdgePropertyFilter
  ): GraphEdgeRecord[] {
    const edgeIds = this.inboundEdges.get(nodeId);
    if (!edgeIds) {
      return [];
    }

    let edges = Array.from(edgeIds)
      .map((id) => this.edgeCache.get(id))
      .filter((e): e is GraphEdgeRecord => e !== undefined);

    if (type) {
      edges = edges.filter((e) => e.type === type);
    }

    if (filter) {
      edges = this.applyEdgeFilter(edges, filter);
    }

    return edges;
  }

  // ===========================================================================
  // Query Operations
  // ===========================================================================

  /**
   * Get neighbors of a node (synchronous - from memory)
   * @param nodeId
   * @param options
   */
  getNeighbors(nodeId: string, options?: NeighborQueryOptions): string[] {
    const direction = options?.direction ?? 'both';
    const types = options?.types;
    const limit = options?.limit;

    const neighbors = new Set<string>();

    // Outbound neighbors (targets of edges from this node)
    if (direction === 'outbound' || direction === 'both') {
      const outEdgeIds = this.outboundEdges.get(nodeId);
      if (outEdgeIds) {
        for (const edgeId of outEdgeIds) {
          const edge = this.edgeCache.get(edgeId);
          if (edge && (!types || types.includes(edge.type))) {
            neighbors.add(edge.target);
          }
        }
      }
    }

    // Inbound neighbors (sources of edges to this node)
    if (direction === 'inbound' || direction === 'both') {
      const inEdgeIds = this.inboundEdges.get(nodeId);
      if (inEdgeIds) {
        for (const edgeId of inEdgeIds) {
          const edge = this.edgeCache.get(edgeId);
          if (edge && (!types || types.includes(edge.type))) {
            neighbors.add(edge.source);
          }
        }
      }
    }

    let result = Array.from(neighbors);

    if (limit && limit > 0) {
      result = result.slice(0, limit);
    }

    return result;
  }

  /**
   * Get edges by direction (synchronous - from memory)
   * @param nodeId
   * @param direction
   * @param type
   * @param filter
   */
  getEdgesByDirection(
    nodeId: string,
    direction: EdgeDirectionFilter,
    type?: RelationType,
    filter?: EdgePropertyFilter
  ): GraphEdgeRecord[] {
    let edges: GraphEdgeRecord[] = [];

    if (direction === 'outbound' || direction === 'both') {
      edges = edges.concat(this.getEdgesFrom(nodeId, type, filter));
    }

    if (direction === 'inbound' || direction === 'both') {
      edges = edges.concat(this.getEdgesTo(nodeId, type, filter));
    }

    return edges;
  }

  /**
   * Get edges filtered by indexed properties (synchronous - from memory)
   * @param filter
   */
  getEdgesByProperty(filter: EdgePropertyFilter): GraphEdgeRecord[] {
    return this.applyEdgeFilter(Array.from(this.edgeCache.values()), filter);
  }

  /**
   * Extract a subgraph containing specified nodes and their connecting edges
   * @param nodeIds
   */
  getSubgraph(nodeIds: string[]): SubgraphResult {
    const nodeSet = new Set(nodeIds);
    const nodes: GraphNodeRecord[] = [];
    const edges: GraphEdgeRecord[] = [];

    // Collect nodes
    for (const nodeId of nodeIds) {
      const node = this.nodeCache.get(nodeId);
      if (node) {
        nodes.push(node);
      }
    }

    // Collect edges where both endpoints are in the subgraph
    for (const edge of this.edgeCache.values()) {
      if (nodeSet.has(edge.source) && nodeSet.has(edge.target)) {
        edges.push(edge);
      }
    }

    return { nodes, edges };
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  /**
   * Get graph statistics (synchronous - from memory)
   */
  getStatistics(): GraphStatistics {
    const nodesByCompleteness: Record<CompletenessStatus, number> = {
      full: 0,
      partial: 0,
      stub: 0,
    };
    const nodesByType: Partial<Record<EntityType, number>> = {};
    const edgesByType: Partial<Record<RelationType, number>> = {};

    for (const node of this.nodeCache.values()) {
      nodesByCompleteness[node.completeness]++;
      nodesByType[node.entityType] = (nodesByType[node.entityType] ?? 0) + 1;
    }

    for (const edge of this.edgeCache.values()) {
      edgesByType[edge.type] = (edgesByType[edge.type] ?? 0) + 1;
    }

    return {
      nodeCount: this.nodeCache.size,
      edgeCount: this.edgeCache.size,
      nodesByCompleteness,
      nodesByType,
      edgesByType,
      lastUpdated: Date.now(),
    };
  }

  // ===========================================================================
  // Bulk Operations
  // ===========================================================================

  /**
   * Add multiple nodes in a batch
   * @param inputs
   */
  async addNodes(inputs: GraphNodeInput[]): Promise<void> {
    await this.ensureHydrated();

    // Filter out existing nodes (or handle upgrades)
    const newInputs: GraphNodeInput[] = [];
    for (const input of inputs) {
      if (this.nodeCache.has(input.id)) {
        // Try to upgrade if needed
        await this.updateNodeCompleteness(input.id, input.completeness, input.label, input.metadata);
      } else {
        newInputs.push(input);
      }
    }

    if (newInputs.length === 0) {
      return;
    }

    // Write to IndexedDB
    await this.tier.addNodes(newInputs);

    // Update in-memory cache
    const now = Date.now();
    for (const input of newInputs) {
      const record: GraphNodeRecord = {
        ...input,
        cachedAt: now,
        updatedAt: now,
      };
      this.nodeCache.set(input.id, record);
      this.outboundEdges.set(input.id, new Set());
      this.inboundEdges.set(input.id, new Set());
    }

    logger.debug(LOG_PREFIX, 'Bulk nodes added', { count: newInputs.length });
  }

  /**
   * Add multiple edges in a batch
   * @param inputs
   */
  async addEdges(inputs: GraphEdgeInput[]): Promise<number> {
    await this.ensureHydrated();

    // Filter out duplicates
    const newInputs = inputs.filter((input) => {
      const edgeId = generateEdgeId(input.source, input.target, input.type);
      return !this.edgeCache.has(edgeId);
    });

    if (newInputs.length === 0) {
      return 0;
    }

    // Write to IndexedDB
    await this.tier.addEdges(newInputs);

    // Update in-memory cache
    const now = Date.now();
    for (const input of newInputs) {
      const edgeId = generateEdgeId(input.source, input.target, input.type);
      const record: GraphEdgeRecord = {
        id: edgeId,
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
      };
      this.edgeCache.set(edgeId, record);

      // Update adjacency lists
      const outbound = this.outboundEdges.get(input.source);
      if (outbound) {
        outbound.add(edgeId);
      } else {
        this.outboundEdges.set(input.source, new Set([edgeId]));
      }

      const inbound = this.inboundEdges.get(input.target);
      if (inbound) {
        inbound.add(edgeId);
      } else {
        this.inboundEdges.set(input.target, new Set([edgeId]));
      }
    }

    logger.debug(LOG_PREFIX, 'Bulk edges added', { count: newInputs.length });
    return newInputs.length;
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Ensure the graph is hydrated before operations
   */
  private async ensureHydrated(): Promise<void> {
    if (this.hydrationState === 'hydrated') {
      return;
    }
    await this.hydrate();
  }

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
      if (filter.yearsInclude !== undefined && filter.yearsInclude.length > 0) {
        if (!edge.years || !filter.yearsInclude.some((year) => edge.years?.includes(year))) {
          return false;
        }
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
}

// ===========================================================================
// Singleton Instance
// ===========================================================================

let persistentGraphInstance: PersistentGraph | null = null;

/**
 * Get the singleton PersistentGraph instance
 */
export const getPersistentGraph = (): PersistentGraph => {
  if (!persistentGraphInstance) {
    persistentGraphInstance = new PersistentGraph();
  }
  return persistentGraphInstance;
};

/**
 * Reset the singleton instance (for testing)
 */
export const resetPersistentGraph = (): void => {
  persistentGraphInstance = null;
};
