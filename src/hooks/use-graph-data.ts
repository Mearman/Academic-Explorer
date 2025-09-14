/**
 * React hook for graph data operations
 * Provides a clean interface for loading and manipulating graph data
 */

import { useCallback, useRef } from 'react';
import { GraphDataService } from '@/services/graph-data-service';
import { useGraphStore } from '@/stores/graph-store';
import { logError } from '@/lib/logger';
import type { SearchOptions } from '@/lib/graph/types';

export function useGraphData() {
  const service = useRef(new GraphDataService());
  const { isLoading, error } = useGraphStore();

  const loadEntity = useCallback(async (entityId: string) => {
    try {
      await service.current.loadEntityGraph(entityId);
    } catch (err) {
      logError('Failed to load entity in graph data hook', err, 'useGraphData', 'graph');
    }
  }, []);

  const expandNode = useCallback(async (nodeId: string, options?: {
    depth?: number;
    limit?: number;
  }) => {
    const store = useGraphStore.getState();
    store.setLoading(true);

    try {
      await service.current.expandNode(nodeId, options);
    } catch (err) {
      logError('Failed to expand node in graph data hook', err, 'useGraphData', 'graph');
      store.setError(err instanceof Error ? err.message : 'Failed to expand node');
    } finally {
      store.setLoading(false);
    }
  }, []);

  const search = useCallback(async (query: string, options?: Partial<SearchOptions>) => {
    const searchOptions: SearchOptions = {
      query,
      entityTypes: options?.entityTypes || ['works', 'authors', 'sources', 'institutions'],
      includeExternalIds: options?.includeExternalIds ?? true,
      preferExternalIdResults: options?.preferExternalIdResults ?? false,
      limit: options?.limit || 20,
    };

    try {
      await service.current.searchAndVisualize(query, searchOptions);
    } catch (err) {
      logError('Failed to perform graph search operation', err, 'useGraphData', 'graph');
    }
  }, []);

  const clearGraph = useCallback(() => {
    const { clear } = useGraphStore.getState();
    clear();
  }, []);

  return {
    loadEntity,
    expandNode,
    search,
    clearGraph,
    isLoading,
    error,
  };
}