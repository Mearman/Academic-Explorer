import { useCallback } from 'react';

import { getEntityEndpointFromType } from './use-entity-type-detection';

export function useGraphActions() {
  const handleVertexClick = useCallback((vertex: any) => {
    if (vertex.metadata?.url) {
      window.location.href = vertex.metadata.url;
    } else {
      // Construct URL from entity ID and type
      const entityType = vertex.entityType;
      const endpoint = getEntityEndpointFromType(entityType);
      window.location.href = `/${endpoint}/${encodeURIComponent(vertex.id)}`;
    }
  }, []);

  return {
    handleVertexClick,
  };
}