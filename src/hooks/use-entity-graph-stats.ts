import { useMemo } from 'react';

import { useEntityGraphStore } from '@/stores/entity-graph-store';

export function useEntityGraphStats(entityId?: string) {
  const { getFilteredVertices, getFilteredEdges } = useEntityGraphStore();

  return useMemo(() => {
    const vertices = getFilteredVertices();
    const edges = getFilteredEdges();
    
    return {
      totalVertices: vertices.length,
      totalEdges: edges.length,
      directlyVisited: vertices.filter(v => v.directlyVisited).length,
      hasCurrentEntity: entityId ? vertices.some(v => v.id === entityId) : false,
    };
  }, [getFilteredVertices, getFilteredEdges, entityId]);
}