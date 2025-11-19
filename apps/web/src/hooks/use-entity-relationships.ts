/**
 * React hook for entity relationship visualization
 * Filters and organizes graph edges into incoming/outgoing relationship sections
 *
 * @module use-entity-relationships
 * @see specs/016-entity-relationship-viz/data-model.md
 */

import { useMemo } from 'react';
import { useGraphStore } from '@/stores/graph-store';
import type { EntityType } from '@academic-explorer/types';
import type {
  RelationshipSection,
  RelationshipError,
  RelationshipFilter,
} from '@/types/relationship';
import { RelationshipErrorCode } from '@/types/relationship';

export interface UseEntityRelationshipsResult {
  /** Incoming relationship sections (other entities → this entity) */
  incoming: RelationshipSection[];

  /** Outgoing relationship sections (this entity → other entities) */
  outgoing: RelationshipSection[];

  /** Loading state */
  loading: boolean;

  /** Error state (if any) */
  error?: RelationshipError;
}

/**
 * Hook to fetch and organize entity relationships
 *
 * @param entityId - The entity whose relationships to display
 * @param entityType - The type of the entity
 * @param filter - Optional filter configuration
 * @returns Incoming and outgoing relationship sections with loading/error states
 */
export function useEntityRelationships(
  entityId: string,
  entityType: EntityType,
  filter?: RelationshipFilter,
): UseEntityRelationshipsResult {
  const { edges, isLoading, error: graphError } = useGraphStore();

  // Convert edges Record to array
  const edgesArray = useMemo(() => Object.values(edges), [edges]);

  // Filter edges for this entity
  const entityEdges = useMemo(() => {
    return edgesArray.filter(
      (edge) => edge.source === entityId || edge.target === entityId
    );
  }, [edgesArray, entityId]);

  // Separate incoming and outgoing edges
  const { incomingEdges, outgoingEdges } = useMemo(() => {
    const incoming = entityEdges.filter((edge) => edge.target === entityId);
    const outgoing = entityEdges.filter((edge) => edge.source === entityId);
    return { incomingEdges: incoming, outgoingEdges: outgoing };
  }, [entityEdges, entityId]);

  // TODO: Group edges by RelationType and create RelationshipSection objects
  // This will be implemented in Phase 2 (US1)
  const incoming: RelationshipSection[] = [];
  const outgoing: RelationshipSection[] = [];

  // Convert graph error to RelationshipError if needed
  const relationshipError: RelationshipError | undefined = graphError
    ? {
        message: graphError,
        code: RelationshipErrorCode.GRAPH_LOAD_FAILED,
        retryable: true,
        timestamp: new Date(),
      }
    : undefined;

  return {
    incoming,
    outgoing,
    loading: isLoading,
    error: relationshipError,
  };
}
