/**
 * useRepositoryGraph - Hook for loading repository graph data
 *
 * Bridges the repository store to graph visualization components.
 * Converts Record<string, T> to T[] and provides loading/empty states.
 *
 * @module hooks/use-repository-graph
 */

import type { GraphNode, GraphEdge } from '@bibgraph/types';
import { logger } from '@bibgraph/utils/logger';
import { useState, useEffect, useCallback, useRef } from 'react';

import { repositoryStore } from '@/stores/repository-store';

/**
 * Return type of the useRepositoryGraph hook
 */
export interface UseRepositoryGraphResult {
  /** Array of graph nodes from the repository */
  nodes: GraphNode[];

  /** Array of graph edges from the repository */
  edges: GraphEdge[];

  /** True while initial data is being loaded */
  loading: boolean;

  /** True when repository contains no entities */
  isEmpty: boolean;

  /** Error object if data loading failed */
  error: Error | null;

  /** Timestamp of last successful data refresh */
  lastUpdated: Date | null;

  /** Force refresh data from repository store */
  refresh: () => Promise<void>;
}

/** Polling interval in milliseconds (1 second as per contract) */
const POLL_INTERVAL_MS = 1000;

/**
 * Hook that bridges repository store to graph visualization.
 *
 * Behavior:
 * - Loads repository state on mount
 * - Polls for changes every 1 second (updates if changed)
 * - Cleans up polling interval on unmount
 * - Handles errors gracefully without crashing
 *
 * @example
 * ```tsx
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
 */
export function useRepositoryGraph(): UseRepositoryGraphResult {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Refs for tracking previous state (to detect changes)
  const prevNodeCountRef = useRef<number>(0);
  const prevEdgeCountRef = useRef<number>(0);

  /**
   * Load data from repository store
   */
  const loadData = useCallback(async () => {
    try {
      const state = await repositoryStore.getRepositoryState();

      // Convert Record<string, T> to T[]
      const nodeArray = Object.values(state.repositoryNodes);
      const edgeArray = Object.values(state.repositoryEdges);

      // Only update state if data actually changed
      if (
        nodeArray.length !== prevNodeCountRef.current ||
        edgeArray.length !== prevEdgeCountRef.current
      ) {
        setNodes(nodeArray);
        setEdges(edgeArray);
        setLastUpdated(new Date());

        prevNodeCountRef.current = nodeArray.length;
        prevEdgeCountRef.current = edgeArray.length;

        logger.debug('repository-graph', 'Repository data updated', {
          nodeCount: nodeArray.length,
          edgeCount: edgeArray.length,
        });
      }

      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load repository data');
      setError(error);
      logger.error('repository-graph', 'Failed to load repository data', { error: err });
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Force refresh - exposed for manual refresh triggers
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    // Reset previous counts to force update
    prevNodeCountRef.current = -1;
    prevEdgeCountRef.current = -1;
    await loadData();
  }, [loadData]);

  // Initial load and polling setup
  useEffect(() => {
    // Initial load
    void loadData();

    // Set up polling interval
    const pollInterval = setInterval(() => {
      void loadData();
    }, POLL_INTERVAL_MS);

    // Cleanup on unmount
    return () => {
      clearInterval(pollInterval);
    };
  }, [loadData]);

  // Compute isEmpty from current state
  const isEmpty = nodes.length === 0 && edges.length === 0;

  return {
    nodes,
    edges,
    loading,
    isEmpty,
    error,
    lastUpdated,
    refresh,
  };
}
