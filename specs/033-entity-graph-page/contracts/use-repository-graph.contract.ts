/**
 * Contract: useRepositoryGraph Hook
 *
 * This contract defines the interface for the useRepositoryGraph hook,
 * which bridges the repository store to graph visualization components.
 *
 * @module contracts/use-repository-graph
 */

import type { GraphNode, GraphEdge } from '@bibgraph/types';

/**
 * Return type of the useRepositoryGraph hook
 */
export interface UseRepositoryGraphResult {
  /**
   * Array of graph nodes from the repository
   * Converted from Record<string, GraphNode> to GraphNode[]
   */
  nodes: GraphNode[];

  /**
   * Array of graph edges from the repository
   * Converted from Record<string, GraphEdge> to GraphEdge[]
   */
  edges: GraphEdge[];

  /**
   * True while initial data is being loaded
   * False after first successful load
   */
  loading: boolean;

  /**
   * True when repository contains no entities
   * Used to render empty state UI
   */
  isEmpty: boolean;

  /**
   * Error object if data loading failed
   * null if no error occurred
   */
  error: Error | null;

  /**
   * Timestamp of last successful data refresh
   * Useful for debugging and cache invalidation
   */
  lastUpdated: Date | null;

  /**
   * Force refresh data from repository store
   * Useful after adding/removing entities elsewhere
   */
  refresh: () => Promise<void>;
}

/**
 * Hook contract: useRepositoryGraph
 *
 * Usage:
 * ```typescript
 * function GraphPage() {
 *   const { nodes, edges, loading, isEmpty, error, refresh } = useRepositoryGraph();
 *
 *   if (loading) return <LoadingState />;
 *   if (error) return <ErrorState error={error} onRetry={refresh} />;
 *   if (isEmpty) return <EmptyState />;
 *
 *   return <ForceGraphVisualization nodes={nodes} edges={edges} />;
 * }
 * ```
 *
 * Behavior:
 * - Loads repository state on mount
 * - Polls for changes every 1 second (updates if changed)
 * - Cleans up polling interval on unmount
 * - Handles errors gracefully without crashing
 *
 * Dependencies:
 * - repositoryStore.getRepositoryState()
 */
export type UseRepositoryGraph = () => UseRepositoryGraphResult;
