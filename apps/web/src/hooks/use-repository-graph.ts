/**
 * useRepositoryGraph - Hook for loading bookmarked entities as graph data
 *
 * Bridges the catalogue storage (bookmarks) to graph visualization components.
 * Converts CatalogueEntity[] to GraphNode[] for visualization.
 *
 * @module hooks/use-repository-graph
 */

import type { GraphNode, GraphEdge } from '@bibgraph/types';
import { catalogueEventEmitter, logger } from '@bibgraph/utils';
import type { CatalogueEntity } from '@bibgraph/utils';
import { useState, useEffect, useCallback, useRef } from 'react';

import { useStorageProvider } from '@/contexts/storage-provider-context';

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

/**
 * Convert a CatalogueEntity (bookmark) to a GraphNode for visualization
 */
function catalogueEntityToGraphNode(entity: CatalogueEntity): GraphNode {
  return {
    id: entity.entityId,
    entityType: entity.entityType,
    entityId: entity.entityId,
    label: entity.entityId, // Use entityId as label (title not stored in CatalogueEntity)
    x: Math.random() * 800 - 400, // Random initial position
    y: Math.random() * 600 - 300,
    externalIds: [],
    entityData: {
      notes: entity.notes,
      addedAt: entity.addedAt,
    },
  };
}

/**
 * Hook that bridges bookmarks to graph visualization.
 *
 * Behavior:
 * - Loads bookmarked entities on mount
 * - Subscribes to catalogue events for reactive updates
 * - Converts CatalogueEntity to GraphNode format
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
  const storage = useStorageProvider();
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Refs for tracking state without causing re-renders
  const prevNodeCountRef = useRef<number>(0);
  const initializedRef = useRef(false);

  /**
   * Load bookmarks and convert to graph nodes
   */
  const loadData = useCallback(async () => {
    try {
      // Initialize special lists if not already done
      if (!initializedRef.current) {
        await storage.initializeSpecialLists();
        initializedRef.current = true;
      }

      const bookmarks = await storage.getBookmarks();

      // Only update state if data actually changed
      if (bookmarks.length !== prevNodeCountRef.current) {
        const nodeArray = bookmarks.map(catalogueEntityToGraphNode);
        setNodes(nodeArray);
        setEdges([]); // Bookmarks don't have edges
        setLastUpdated(new Date());

        prevNodeCountRef.current = bookmarks.length;

        logger.debug('repository-graph', 'Bookmarks loaded as graph nodes', {
          nodeCount: nodeArray.length,
        });
      }

      setError(null);
    } catch (err) {
      const loadError = err instanceof Error ? err : new Error('Failed to load bookmarks');
      setError(loadError);
      logger.error('repository-graph', 'Failed to load bookmarks', { error: err });
    } finally {
      setLoading(false);
    }
  }, [storage]);

  /**
   * Force refresh - exposed for manual refresh triggers
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    // Reset previous count to force update
    prevNodeCountRef.current = -1;
    await loadData();
  }, [loadData]);

  // Initial load
  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Subscribe to catalogue events for reactive updates
  useEffect(() => {
    const unsubscribe = catalogueEventEmitter.subscribe((event) => {
      // Refresh on bookmark-related events
      const isBookmarksEvent =
        event.listId === 'bookmarks-list' ||
        event.type === 'entity-added' ||
        event.type === 'entity-removed';

      if (isBookmarksEvent) {
        logger.debug('repository-graph', 'Catalogue event detected, refreshing', {
          eventType: event.type,
        });
        void loadData();
      }
    });

    return unsubscribe;
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
