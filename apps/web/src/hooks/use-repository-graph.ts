/**
 * useRepositoryGraph - Hook for loading bookmarked entities as graph data
 *
 * Bridges the catalogue storage (bookmarks) to graph visualization components.
 * Converts CatalogueEntity[] to GraphNode[] and extracts relationships as GraphEdge[].
 *
 * @module hooks/use-repository-graph
 */

import {
  getAuthorById,
  getWorkById,
  getInstitutionById,
  getSourceById,
  getTopicById,
  getFunderById,
  getPublisherById,
} from '@bibgraph/client';
import type { GraphNode, GraphEdge, EntityType } from '@bibgraph/types';
import { RelationType } from '@bibgraph/types';
import { catalogueEventEmitter, logger } from '@bibgraph/utils';
import type { CatalogueEntity } from '@bibgraph/utils';
import { useState, useEffect, useCallback, useRef } from 'react';

import { useStorageProvider } from '@/contexts/storage-provider-context';

/**
 * Fetch entity data by type and ID using cached client
 */
async function fetchEntityData(
  entityType: EntityType,
  entityId: string
): Promise<Record<string, unknown> | null> {
  try {
    switch (entityType) {
      case 'works':
        return (await getWorkById(entityId)) as unknown as Record<string, unknown>;
      case 'authors':
        return (await getAuthorById(entityId)) as unknown as Record<string, unknown>;
      case 'institutions':
        return (await getInstitutionById(entityId)) as unknown as Record<string, unknown>;
      case 'sources':
        return (await getSourceById(entityId)) as unknown as Record<string, unknown>;
      case 'topics':
        return (await getTopicById(entityId)) as unknown as Record<string, unknown>;
      case 'funders':
        return (await getFunderById(entityId)) as unknown as Record<string, unknown>;
      case 'publishers':
        return (await getPublisherById(entityId)) as unknown as Record<string, unknown>;
      default:
        return null;
    }
  } catch (error) {
    logger.debug('repository-graph', 'Failed to fetch entity data', {
      entityType,
      entityId,
      error,
    });
    return null;
  }
}

/**
 * Extract related entity IDs from entity data
 * Returns tuples of [targetId, targetType, relationType]
 */
function extractRelatedEntityIds(
  entityData: Record<string, unknown>,
  entityType: EntityType
): Array<{ targetId: string; targetType: EntityType; relationType: RelationType }> {
  const related: Array<{ targetId: string; targetType: EntityType; relationType: RelationType }> = [];

  switch (entityType) {
    case 'works': {
      // Authorships -> Authors
      const authorships = entityData.authorships as Array<{
        author?: { id?: string };
      }> | undefined;
      if (authorships) {
        for (const auth of authorships) {
          if (auth.author?.id) {
            related.push({ targetId: auth.author.id, targetType: 'authors', relationType: RelationType.AUTHORSHIP });
          }
        }
      }

      // Primary location -> Source
      const primaryLocation = entityData.primary_location as {
        source?: { id?: string };
      } | undefined;
      if (primaryLocation?.source?.id) {
        related.push({ targetId: primaryLocation.source.id, targetType: 'sources', relationType: RelationType.PUBLICATION });
      }

      // Referenced works
      const referencedWorks = entityData.referenced_works as string[] | undefined;
      if (referencedWorks) {
        for (const refId of referencedWorks) {
          related.push({ targetId: refId, targetType: 'works', relationType: RelationType.REFERENCE });
        }
      }

      // Topics
      const topics = entityData.topics as Array<{ id?: string }> | undefined;
      if (topics) {
        for (const topic of topics) {
          if (topic.id) {
            related.push({ targetId: topic.id, targetType: 'topics', relationType: RelationType.TOPIC });
          }
        }
      }

      // Grants -> Funders
      const grants = entityData.grants as Array<{ funder?: string }> | undefined;
      if (grants) {
        for (const grant of grants) {
          if (grant.funder) {
            related.push({ targetId: grant.funder, targetType: 'funders', relationType: RelationType.FUNDED_BY });
          }
        }
      }
      break;
    }

    case 'authors': {
      // Affiliations -> Institutions
      const affiliations = entityData.affiliations as Array<{
        institution?: { id?: string };
      }> | undefined;
      if (affiliations) {
        for (const aff of affiliations) {
          if (aff.institution?.id) {
            related.push({ targetId: aff.institution.id, targetType: 'institutions', relationType: RelationType.AFFILIATION });
          }
        }
      }

      // Topics
      const topics = entityData.topics as Array<{ id?: string }> | undefined;
      if (topics) {
        for (const topic of topics) {
          if (topic.id) {
            related.push({ targetId: topic.id, targetType: 'topics', relationType: RelationType.AUTHOR_RESEARCHES });
          }
        }
      }
      break;
    }

    case 'institutions': {
      // Topics
      const topics = entityData.topics as Array<{ id?: string }> | undefined;
      if (topics) {
        for (const topic of topics) {
          if (topic.id) {
            related.push({ targetId: topic.id, targetType: 'topics', relationType: RelationType.TOPIC });
          }
        }
      }

      // Lineage -> Parent institutions
      const lineage = entityData.lineage as string[] | undefined;
      const entityId = entityData.id as string;
      if (lineage) {
        for (const parentId of lineage) {
          if (parentId !== entityId) {
            related.push({ targetId: parentId, targetType: 'institutions', relationType: RelationType.LINEAGE });
          }
        }
      }
      break;
    }

    case 'sources': {
      // Host organization -> Publisher
      const hostOrg = entityData.host_organization as string | undefined;
      if (hostOrg) {
        related.push({ targetId: hostOrg, targetType: 'publishers', relationType: RelationType.HOST_ORGANIZATION });
      }

      // Topics
      const topics = entityData.topics as Array<{ id?: string }> | undefined;
      if (topics) {
        for (const topic of topics) {
          if (topic.id) {
            related.push({ targetId: topic.id, targetType: 'topics', relationType: RelationType.TOPIC });
          }
        }
      }
      break;
    }

    case 'topics': {
      // Field
      const field = entityData.field as { id?: string } | undefined;
      if (field?.id) {
        related.push({ targetId: field.id, targetType: 'fields', relationType: RelationType.TOPIC_PART_OF_FIELD });
      }

      // Domain
      const domain = entityData.domain as { id?: string } | undefined;
      if (domain?.id) {
        related.push({ targetId: domain.id, targetType: 'domains', relationType: RelationType.FIELD_PART_OF_DOMAIN });
      }
      break;
    }
  }

  return related;
}

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
 * Optionally accepts full entity data to extract display name
 */
function catalogueEntityToGraphNode(
  entity: CatalogueEntity,
  entityData?: Record<string, unknown> | null
): GraphNode {
  // Extract display name from entity data if available
  let label = entity.entityId;
  if (entityData) {
    const displayName = entityData.display_name as string | undefined;
    const title = entityData.title as string | undefined;
    label = displayName || title || entity.entityId;
  }

  return {
    id: entity.entityId,
    entityType: entity.entityType,
    entityId: entity.entityId,
    label,
    x: Math.random() * 800 - 400, // Random initial position
    y: Math.random() * 600 - 300,
    externalIds: [],
    entityData: {
      notes: entity.notes,
      addedAt: entity.addedAt,
      ...(entityData || {}),
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
   * Load bookmarks, fetch entity data, and extract relationships as edges
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
        // Fetch entity data for all bookmarks in parallel (should be cached)
        const entityDataPromises = bookmarks.map((bookmark) =>
          fetchEntityData(bookmark.entityType, bookmark.entityId)
        );
        const entityDataResults = await Promise.all(entityDataPromises);

        // Create a map of bookmarked entity IDs for quick lookup
        const bookmarkedIds = new Set(bookmarks.map((b) => b.entityId));

        // Convert bookmarks to nodes with entity data
        const nodeArray = bookmarks.map((bookmark, index) =>
          catalogueEntityToGraphNode(bookmark, entityDataResults[index])
        );

        // Extract edges from relationships where both endpoints are bookmarked
        const edgeArray: GraphEdge[] = [];
        const seenEdges = new Set<string>(); // Deduplicate edges

        for (let i = 0; i < bookmarks.length; i++) {
          const bookmark = bookmarks[i];
          const entityData = entityDataResults[i];

          if (entityData) {
            const relationships = extractRelatedEntityIds(entityData, bookmark.entityType);

            for (const rel of relationships) {
              // Only create edge if target is also bookmarked
              if (bookmarkedIds.has(rel.targetId)) {
                // Create unique edge key to avoid duplicates
                const edgeKey = `${bookmark.entityId}-${rel.targetId}-${rel.relationType}`;
                const reverseKey = `${rel.targetId}-${bookmark.entityId}-${rel.relationType}`;

                if (!seenEdges.has(edgeKey) && !seenEdges.has(reverseKey)) {
                  seenEdges.add(edgeKey);
                  edgeArray.push({
                    id: edgeKey,
                    source: bookmark.entityId,
                    target: rel.targetId,
                    type: rel.relationType,
                    weight: 1,
                  });
                }
              }
            }
          }
        }

        setNodes(nodeArray);
        setEdges(edgeArray);
        setLastUpdated(new Date());

        prevNodeCountRef.current = bookmarks.length;

        logger.debug('repository-graph', 'Bookmarks loaded as graph nodes with edges', {
          nodeCount: nodeArray.length,
          edgeCount: edgeArray.length,
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
