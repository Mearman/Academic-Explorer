import { useMemo, useCallback } from 'react';
import { useEntityGraphStore } from '@/stores/entity-graph-store';

// STABLE: Use primitive selectors with cached results
export function useEntityGraphStats(entityId?: string) {
  // Use separate stable selectors for each value to prevent object recreation
  const totalVertices = useEntityGraphStore(useCallback((state) => state.graph.vertices.size, []));
  const totalEdges = useEntityGraphStore(useCallback((state) => state.graph.edges.size, []));
  const directlyVisited = useEntityGraphStore(useCallback((state) => state.graph.directlyVisitedVertices.size, []));
  const isHydrated = useEntityGraphStore(useCallback((state) => state.isHydrated, []));

  // Only this selector needs to depend on entityId
  const hasCurrentEntity = useEntityGraphStore(
    useCallback((state) => entityId ? state.graph.vertices.has(entityId) : false, [entityId])
  );

  // Memoize the final object to prevent recreation
  return useMemo(() => ({
    totalVertices,
    totalEdges,
    directlyVisited,
    isHydrated,
    hasCurrentEntity
  }), [totalVertices, totalEdges, directlyVisited, isHydrated, hasCurrentEntity]);
}