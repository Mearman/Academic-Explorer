/**
 * Graph Index Database Contract
 *
 * Defines the Dexie database schema and tier operations for
 * persisting graph nodes and edges to IndexedDB.
 *
 * @packageDocumentation
 */

import type { Table } from 'dexie';
import type {
  GraphNodeRecord,
  GraphEdgeRecord,
  CompletenessStatus,
} from './graph-index-types';
import type { RelationType } from '@bibgraph/types';

// ============================================================================
// Database Schema Interface
// ============================================================================

/**
 * Dexie database interface for graph index storage.
 *
 * Tables:
 * - nodes: Graph node records (OpenAlex entities)
 * - edges: Graph edge records (relationships)
 */
export interface IGraphIndexDatabase {
  /** Nodes table */
  nodes: Table<GraphNodeRecord, string>;

  /** Edges table */
  edges: Table<GraphEdgeRecord, string>;

  /**
   * Check if database is open.
   */
  isOpen(): boolean;

  /**
   * Open database connection.
   */
  open(): Promise<void>;

  /**
   * Close database connection.
   */
  close(): void;

  /**
   * Delete the database entirely.
   */
  delete(): Promise<void>;
}

// ============================================================================
// Graph Index Tier Interface
// ============================================================================

/**
 * GraphIndexTier provides CRUD operations for graph storage.
 *
 * This is the low-level persistence layer. Higher-level operations
 * should go through PersistentGraph which manages both memory and disk.
 */
export interface IGraphIndexTier {
  // ==========================================================================
  // Node Operations
  // ==========================================================================

  /**
   * Add or update a node.
   * Uses put() so existing nodes are overwritten.
   *
   * @param node - Node to store
   */
  putNode(node: GraphNodeRecord): Promise<void>;

  /**
   * Get a node by ID.
   *
   * @param id - Node ID
   * @returns Node or undefined if not found
   */
  getNode(id: string): Promise<GraphNodeRecord | undefined>;

  /**
   * Delete a node by ID.
   *
   * @param id - Node ID
   */
  deleteNode(id: string): Promise<void>;

  /**
   * Get all nodes.
   *
   * @returns Array of all nodes
   */
  getAllNodes(): Promise<GraphNodeRecord[]>;

  /**
   * Get nodes by completeness status.
   *
   * @param status - Completeness filter
   * @returns Matching nodes
   */
  getNodesByCompleteness(status: CompletenessStatus): Promise<GraphNodeRecord[]>;

  /**
   * Get nodes by entity type.
   *
   * @param entityType - Entity type filter
   * @returns Matching nodes
   */
  getNodesByType(entityType: string): Promise<GraphNodeRecord[]>;

  /**
   * Get node count.
   */
  getNodeCount(): Promise<number>;

  /**
   * Bulk add/update nodes.
   *
   * @param nodes - Nodes to store
   */
  bulkPutNodes(nodes: GraphNodeRecord[]): Promise<void>;

  // ==========================================================================
  // Edge Operations
  // ==========================================================================

  /**
   * Add or update an edge.
   * Uses put() so existing edges are overwritten.
   *
   * @param edge - Edge to store
   */
  putEdge(edge: GraphEdgeRecord): Promise<void>;

  /**
   * Get an edge by ID.
   *
   * @param id - Edge ID
   * @returns Edge or undefined if not found
   */
  getEdge(id: string): Promise<GraphEdgeRecord | undefined>;

  /**
   * Delete an edge by ID.
   *
   * @param id - Edge ID
   */
  deleteEdge(id: string): Promise<void>;

  /**
   * Get all edges.
   *
   * @returns Array of all edges
   */
  getAllEdges(): Promise<GraphEdgeRecord[]>;

  /**
   * Get edges by source node.
   *
   * @param source - Source node ID
   * @returns Matching edges
   */
  getEdgesBySource(source: string): Promise<GraphEdgeRecord[]>;

  /**
   * Get edges by target node.
   *
   * @param target - Target node ID
   * @returns Matching edges
   */
  getEdgesByTarget(target: string): Promise<GraphEdgeRecord[]>;

  /**
   * Get edges by source and type (compound index).
   *
   * @param source - Source node ID
   * @param type - Relationship type
   * @returns Matching edges
   */
  getEdgesBySourceAndType(source: string, type: RelationType): Promise<GraphEdgeRecord[]>;

  /**
   * Get edges by target and type (compound index).
   *
   * @param target - Target node ID
   * @param type - Relationship type
   * @returns Matching edges
   */
  getEdgesByTargetAndType(target: string, type: RelationType): Promise<GraphEdgeRecord[]>;

  /**
   * Check if edge exists.
   *
   * @param source - Source node ID
   * @param target - Target node ID
   * @param type - Relationship type
   * @returns true if edge exists
   */
  hasEdge(source: string, target: string, type: RelationType): Promise<boolean>;

  /**
   * Get edge count.
   */
  getEdgeCount(): Promise<number>;

  /**
   * Bulk add/update edges.
   *
   * @param edges - Edges to store
   */
  bulkPutEdges(edges: GraphEdgeRecord[]): Promise<void>;

  // ==========================================================================
  // Bulk Operations
  // ==========================================================================

  /**
   * Clear all nodes and edges.
   */
  clear(): Promise<void>;

  /**
   * Get storage statistics.
   */
  getStats(): Promise<{
    nodeCount: number;
    edgeCount: number;
    estimatedSizeBytes: number;
  }>;
}

// ============================================================================
// Edge ID Utilities
// ============================================================================

/**
 * Generate a unique edge ID from source, target, and type.
 *
 * @param source - Source node ID
 * @param target - Target node ID
 * @param type - Relationship type
 * @returns Edge ID in format "source-target-type"
 */
export function generateEdgeId(source: string, target: string, type: RelationType): string {
  return `${source}-${target}-${type}`;
}

/**
 * Parse an edge ID back into components.
 *
 * @param edgeId - Edge ID to parse
 * @returns Parsed components or null if invalid
 */
export function parseEdgeId(edgeId: string): { source: string; target: string; type: string } | null {
  // Edge ID format: "W123-A456-AUTHORSHIP"
  // Note: OpenAlex IDs are alphanumeric (letter prefix + digits)
  const match = edgeId.match(/^([A-Z]\d+)-([A-Z]\d+)-(.+)$/);
  if (!match) return null;

  return {
    source: match[1],
    target: match[2],
    type: match[3],
  };
}
