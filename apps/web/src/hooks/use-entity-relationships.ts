/**
 * React hook for entity relationship visualization
 * Filters and organizes graph edges into incoming/outgoing relationship sections
 *
 * @module use-entity-relationships
 * @see specs/016-entity-relationship-viz/data-model.md
 */

import { useMemo, useContext, useRef, useEffect } from 'react';
import { GraphContext } from '@/stores/graph-store';
import type { EntityType } from '@academic-explorer/types';
import type { GraphEdge, GraphNode } from '@academic-explorer/graph';
import { RelationType } from '@academic-explorer/graph';
import type {
  RelationshipSection,
  RelationshipError,
  RelationshipFilter,
  RelationshipItem,
} from '@/types/relationship';
import {
  RelationshipErrorCode,
  DEFAULT_PAGE_SIZE,
  RELATIONSHIP_TYPE_LABELS,
} from '@/types/relationship';
import { filterByType, filterByDirection } from '@/utils/relationship-filters';

// Stable empty objects to avoid hook dependency changes
const EMPTY_EDGES: Record<string, GraphEdge> = {};
const EMPTY_NODES: Record<string, GraphNode> = {};

export interface UseEntityRelationshipsResult {
  /** Incoming relationship sections (other entities → this entity) */
  incoming: RelationshipSection[];

  /** Outgoing relationship sections (this entity → other entities) */
  outgoing: RelationshipSection[];

  /** Total count of incoming relationships (sum of all section totals) */
  incomingCount: number;

  /** Total count of outgoing relationships (sum of all section totals) */
  outgoingCount: number;

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
  // Safely access GraphContext - use stable empty objects if not in provider
  const graphContext = useContext(GraphContext);
  const edges = graphContext?.state.edges ?? EMPTY_EDGES;
  const nodes = graphContext?.state.nodes ?? EMPTY_NODES;
  const isLoading = graphContext?.state.isLoading ?? false;
  const graphError = graphContext?.state.error ?? undefined;

  // Create stable string representation of edge keys for dependency tracking
  const edgeKeys = Object.keys(edges).sort().join(',');
  const nodeKeys = Object.keys(nodes).sort().join(',');

  // Convert edges Record to array
  const edgesArray = useMemo(() => Object.values(edges), [edgeKeys]);

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

  // Group edges by RelationType and create RelationshipSection objects
  const allIncoming = useMemo(() => {
    return createRelationshipSections(incomingEdges, 'inbound', entityId, nodes);
  }, [incomingEdges, entityId, nodeKeys]);

  const allOutgoing = useMemo(() => {
    return createRelationshipSections(outgoingEdges, 'outbound', entityId, nodes);
  }, [outgoingEdges, entityId, nodeKeys]);

  // Apply filters if provided
  const incoming = useMemo(() => {
    if (!filter) return allIncoming;
    let filtered = allIncoming;

    // Apply type filter
    if (filter.types && filter.types.length > 0) {
      filtered = filterByType(filtered, filter.types);
    }

    // Apply direction filter
    if (filter.direction && filter.direction !== 'both') {
      filtered = filterByDirection(filtered, filter.direction);
    }

    return filtered;
  }, [allIncoming, filter]);

  const outgoing = useMemo(() => {
    if (!filter) return allOutgoing;
    let filtered = allOutgoing;

    // Apply type filter
    if (filter.types && filter.types.length > 0) {
      filtered = filterByType(filtered, filter.types);
    }

    // Apply direction filter
    if (filter.direction && filter.direction !== 'both') {
      filtered = filterByDirection(filtered, filter.direction);
    }

    return filtered;
  }, [allOutgoing, filter]);

  // Calculate total counts (sum of all section totalCounts)
  const incomingCount = useMemo(() => {
    return incoming.reduce((sum, section) => sum + section.totalCount, 0);
  }, [incoming]);

  const outgoingCount = useMemo(() => {
    return outgoing.reduce((sum, section) => sum + section.totalCount, 0);
  }, [outgoing]);

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
    incomingCount,
    outgoingCount,
    loading: isLoading,
    error: relationshipError,
  };
}

/**
 * Helper function to create RelationshipSection objects from edges
 */
function createRelationshipSections(
  edges: GraphEdge[],
  direction: 'inbound' | 'outbound',
  currentEntityId: string,
  nodes: Record<string, GraphNode>
): RelationshipSection[] {
  if (edges.length === 0) return [];

  // Group edges by RelationType
  const edgesByType = new Map<RelationType, GraphEdge[]>();
  for (const edge of edges) {
    const existing = edgesByType.get(edge.type) || [];
    existing.push(edge);
    edgesByType.set(edge.type, existing);
  }

  // Create RelationshipSection for each type
  const sections: RelationshipSection[] = [];

  edgesByType.forEach((typeEdges, relationType) => {
    // Convert edges to RelationshipItem objects
    const items: RelationshipItem[] = typeEdges.map((edge) => {
      // Determine which entity is the "other" entity
      const relatedEntityId = direction === 'inbound' ? edge.source : edge.target;
      const relatedNode = nodes[relatedEntityId];

      // Check if this is a self-reference
      const isSelfReference = edge.source === edge.target;

      return {
        id: edge.id,
        sourceId: edge.source,
        targetId: edge.target,
        sourceType: nodes[edge.source]?.entityType || 'works', // Fallback to 'works' if node not found
        targetType: nodes[edge.target]?.entityType || 'works',
        type: relationType,
        direction,
        displayName: relatedNode?.label || relatedEntityId, // Use label or fall back to ID
        isSelfReference,
        // TODO: Add subtitle and metadata extraction in Phase 6
      };
    });

    // Create pagination state
    const totalCount = items.length;
    const pageSize = DEFAULT_PAGE_SIZE;
    const visibleItems = items.slice(0, pageSize);
    const visibleCount = visibleItems.length;
    const hasMore = totalCount > pageSize;

    const section: RelationshipSection = {
      id: `${relationType}-${direction}`,
      type: relationType,
      direction,
      label: RELATIONSHIP_TYPE_LABELS[relationType] || relationType,
      items,
      visibleItems,
      totalCount,
      visibleCount,
      hasMore,
      pagination: {
        pageSize,
        currentPage: 0,
        totalPages: Math.ceil(totalCount / pageSize),
        hasNextPage: hasMore,
        hasPreviousPage: false,
      },
    };

    sections.push(section);
  });

  return sections;
}
