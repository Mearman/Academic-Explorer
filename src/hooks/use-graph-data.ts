/**
 * React hook for graph data operations
 * Provides a clean interface for loading and manipulating graph data
 */

import { useCallback, useRef } from 'react';
import { GraphDataService } from '@/services/graph-data-service';
import { useGraphStore } from '@/stores/graph-store';
import type { SearchOptions } from '@/lib/graph/types';

export function useGraphData() {
  const service = useRef(new GraphDataService());
  const { isLoading, error } = useGraphStore();

  const loadEntity = useCallback(async (entityId: string) => {
    try {
      await service.current.loadEntityGraph(entityId);
    } catch (err) {
      console.error('Failed to load entity:', err);
    }
  }, []);

  const expandNode = useCallback(async (nodeId: string, options?: {
    depth?: number;
    limit?: number;
  }) => {
    try {
      await service.current.expandNode(nodeId, options);
    } catch (err) {
      console.error('Failed to expand node:', err);
    }
  }, []);

  const search = useCallback(async (query: string, options?: Partial<SearchOptions>) => {
    const searchOptions: SearchOptions = {
      query,
      entityTypes: options?.entityTypes || ['work', 'author', 'source', 'institution'],
      includeExternalIds: options?.includeExternalIds ?? true,
      preferExternalIdResults: options?.preferExternalIdResults ?? false,
      limit: options?.limit || 20,
    };

    try {
      await service.current.searchAndVisualize(query, searchOptions);
    } catch (err) {
      console.error('Failed to search:', err);
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