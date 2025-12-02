/**
 * Dexie-based graph index database
 * Provides persistent browser storage for graph nodes and edges
 */

import {
  GRAPH_INDEX_DB_NAME,
  GRAPH_INDEX_DB_VERSION,
  NODE_INDEXES,
  EDGE_INDEXES,
  type GraphNodeRecord,
  type GraphEdgeRecord,
} from '@bibgraph/types';
import Dexie from 'dexie';


/**
 * Dexie database class for graph index storage
 *
 * Stores nodes and edges separately with appropriate indexes
 * for efficient graph traversal queries.
 */
class GraphIndexDB extends Dexie {
  nodes!: Dexie.Table<GraphNodeRecord, string>;
  edges!: Dexie.Table<GraphEdgeRecord, string>;

  constructor() {
    super(GRAPH_INDEX_DB_NAME);

    this.version(GRAPH_INDEX_DB_VERSION).stores({
      // Nodes indexed by ID, type, completeness, and timestamps
      nodes: NODE_INDEXES,
      // Edges indexed by ID, source, target, type, direction, and compound indexes
      edges: EDGE_INDEXES,
    });
  }
}

// Singleton instance (lazily initialized)
let dbInstance: GraphIndexDB | null = null;

/**
 * Check if IndexedDB is available in the current environment
 */
export function isIndexedDBAvailableForGraph(): boolean {
  try {
    // Check for browser environment
    if (typeof globalThis === 'undefined' || !('indexedDB' in globalThis)) {
      return false;
    }
    // Additional check for indexedDB availability
    return globalThis.indexedDB !== null && globalThis.indexedDB !== undefined;
  } catch {
    return false;
  }
}

/**
 * Get the graph index database instance (lazy initialization)
 */
export function getGraphIndexDB(): GraphIndexDB | null {
  if (!isIndexedDBAvailableForGraph()) {
    return null;
  }

  if (!dbInstance) {
    try {
      dbInstance = new GraphIndexDB();
    } catch (error) {
      console.error('Failed to initialize graph index database:', error);
      return null;
    }
  }

  return dbInstance;
}

/**
 * Close the database connection
 */
export function closeGraphIndexDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Delete the entire graph index database
 */
export async function deleteGraphIndexDB(): Promise<void> {
  closeGraphIndexDB();
  if (isIndexedDBAvailableForGraph()) {
    await Dexie.delete(GRAPH_INDEX_DB_NAME);
  }
}

/**
 * Generate a unique edge ID from source, target, and type
 *
 * Format: `${source}-${target}-${type}`
 * This ensures edge deduplication.
 */
export function generateEdgeId(
  source: string,
  target: string,
  type: string
): string {
  return `${source}-${target}-${type}`;
}

export { GraphIndexDB };
