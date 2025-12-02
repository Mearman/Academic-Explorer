/**
 * Storage Provider Interface Contract: Graph List Methods
 *
 * Feature: 038-graph-list
 * Date: 2025-12-02
 *
 * This file defines the interface extensions for CatalogueStorageProvider
 * to support graph list operations. These methods will be added to the
 * existing interface in packages/utils/src/storage/catalogue-storage-provider.ts
 */

import type { EntityType } from '@bibgraph/types';

/**
 * Provenance tracking for graph list nodes
 */
export type GraphProvenance =
  | 'user'              // Explicitly added by user
  | 'collection-load'   // Added from bookmarks/history
  | 'expansion'         // Added via node expansion
  | 'auto-population';  // Added by background system

/**
 * Node in the persistent graph working set
 */
export interface GraphListNode {
  id: string;
  entityId: string;
  entityType: EntityType;
  label: string;
  addedAt: Date;
  provenance: GraphProvenance;
}

/**
 * Parameters for adding a node to the graph list
 */
export interface AddToGraphListParams {
  entityId: string;
  entityType: EntityType;
  label: string;
  provenance: GraphProvenance;
}

/**
 * Result of prune operation
 */
export interface PruneGraphListResult {
  /** Number of nodes removed */
  removedCount: number;
  /** IDs of nodes that were removed */
  removedNodeIds: string[];
}

/**
 * Interface extensions for CatalogueStorageProvider
 *
 * Add these methods to the existing CatalogueStorageProvider interface:
 */
export interface GraphListStorageProvider {
  /**
   * Get all nodes in the graph list
   *
   * Returns all nodes currently in the persistent graph working set.
   * Nodes are ordered by addedAt timestamp (newest first).
   *
   * @returns Promise resolving to array of graph list nodes
   * @throws {Error} If retrieval fails
   *
   * @example
   * ```typescript
   * const nodes = await provider.getGraphList();
   * console.log(`Graph contains ${nodes.length} nodes`);
   * nodes.forEach(node => {
   *   console.log(`${node.label} (${node.provenance})`);
   * });
   * ```
   */
  getGraphList(): Promise<GraphListNode[]>;

  /**
   * Add a node to the graph list
   *
   * Adds a new node to the persistent graph working set. If a node with the
   * same entityId already exists, updates its provenance to the most recent.
   * Enforces size limit (max 1000 nodes). Throws error if list is full.
   *
   * @param params - Node parameters (entityId, entityType, label, provenance)
   * @returns Promise resolving to node ID
   * @throws {Error} If graph list is full (1000 nodes)
   * @throws {Error} If addition fails
   *
   * @example
   * ```typescript
   * const nodeId = await provider.addToGraphList({
   *   entityId: 'W2741809807',
   *   entityType: 'works',
   *   label: 'Attention Is All You Need',
   *   provenance: 'user'
   * });
   * ```
   */
  addToGraphList(params: AddToGraphListParams): Promise<string>;

  /**
   * Remove a node from the graph list
   *
   * Removes a specific node from the persistent graph working set.
   * Also removes all edges connected to this node from the graph visualization.
   * No-op if node doesn't exist in graph list.
   *
   * @param entityId - OpenAlex entity ID to remove
   * @returns Promise resolving when removal complete
   * @throws {Error} If removal fails
   *
   * @example
   * ```typescript
   * await provider.removeFromGraphList('W2741809807');
   * console.log('Node and connected edges removed');
   * ```
   */
  removeFromGraphList(entityId: string): Promise<void>;

  /**
   * Clear all nodes from the graph list
   *
   * Removes all nodes from the persistent graph working set.
   * Also cancels any ongoing auto-population tasks.
   * Graph list will be empty after this operation.
   *
   * @returns Promise resolving when clear complete
   * @throws {Error} If clear operation fails
   *
   * @example
   * ```typescript
   * await provider.clearGraphList();
   * console.log('Graph list cleared');
   * ```
   */
  clearGraphList(): Promise<void>;

  /**
   * Get current size of graph list
   *
   * Returns the number of nodes currently in the graph list.
   * Used for size limit checks and warnings.
   *
   * @returns Promise resolving to node count
   * @throws {Error} If size retrieval fails
   *
   * @example
   * ```typescript
   * const size = await provider.getGraphListSize();
   * if (size >= 900) {
   *   console.warn(`Graph approaching size limit: ${size}/1000`);
   * }
   * ```
   */
  getGraphListSize(): Promise<number>;

  /**
   * Prune old auto-populated nodes
   *
   * Removes auto-populated nodes that are older than 24 hours.
   * User-added, collection-load, and expansion nodes are never pruned.
   * This is used to keep the graph list manageable and remove stale data.
   *
   * @returns Promise resolving to prune result (count and IDs of removed nodes)
   * @throws {Error} If prune operation fails
   *
   * @example
   * ```typescript
   * const result = await provider.pruneGraphList();
   * console.log(`Pruned ${result.removedCount} auto-populated nodes`);
   * ```
   */
  pruneGraphList(): Promise<PruneGraphListResult>;

  /**
   * Check if a node exists in the graph list
   *
   * Efficiently checks if a specific entity is in the graph list.
   * Useful for UI states (e.g., "In graph" badge).
   *
   * @param entityId - OpenAlex entity ID to check
   * @returns Promise resolving to true if node exists in graph list
   * @throws {Error} If check fails
   *
   * @example
   * ```typescript
   * const inGraph = await provider.isInGraphList('W2741809807');
   * if (inGraph) {
   *   console.log('Node is already in graph');
   * }
   * ```
   */
  isInGraphList(entityId: string): Promise<boolean>;

  /**
   * Batch add nodes to graph list
   *
   * Efficiently adds multiple nodes in a single transaction.
   * Skips nodes that already exist (updates provenance instead).
   * Respects size limit (stops adding when limit reached).
   *
   * @param nodes - Array of nodes to add
   * @returns Promise resolving to array of added node IDs
   * @throws {Error} If batch operation fails
   *
   * @example
   * ```typescript
   * const ids = await provider.batchAddToGraphList([
   *   { entityId: 'W1', entityType: 'works', label: 'Paper 1', provenance: 'expansion' },
   *   { entityId: 'W2', entityType: 'works', label: 'Paper 2', provenance: 'expansion' },
   * ]);
   * console.log(`Added ${ids.length} nodes`);
   * ```
   */
  batchAddToGraphList(nodes: AddToGraphListParams[]): Promise<string[]>;
}

/**
 * Implementation notes:
 *
 * 1. Storage schema:
 *    - Graph list nodes stored as CatalogueEntity records
 *    - listId = "graph-list" (SPECIAL_LIST_IDS.GRAPH)
 *    - provenance stored in notes field as "provenance:user"
 *
 * 2. InitializeSpecialLists:
 *    - Update initializeSpecialLists() to create graph list:
 *      ```typescript
 *      if (!graphList) {
 *        await this.createList({
 *          id: SPECIAL_LIST_IDS.GRAPH,
 *          title: 'Graph',
 *          description: 'System-managed graph working set',
 *          type: 'list',
 *          tags: ['system'],
 *        });
 *      }
 *      ```
 *
 * 3. Size limit enforcement:
 *    - Check size before every add operation
 *    - Throw error if at capacity (1000 nodes)
 *    - Show warning UI at 900 nodes (not enforced by storage)
 *
 * 4. Provenance serialization:
 *    - Write: `notes = `provenance:${provenance}``
 *    - Read: `provenance = notes.replace('provenance:', '')`
 *
 * 5. Deduplication:
 *    - Use composite index [listId, entityType, entityId]
 *    - Check existence before add
 *    - Update provenance if node already exists
 *
 * 6. Performance:
 *    - getGraphList: Use index on listId
 *    - getGraphListSize: Cache count, invalidate on add/remove
 *    - batchAddToGraphList: Single IndexedDB transaction
 *    - pruneGraphList: Query by addedAt index + provenance filter
 */
