/**
 * useGraphAutoPopulation - Automatic graph population hook
 *
 * Watches the graph for changes and automatically:
 * 1. Resolves display names for stub nodes (using batch queries)
 * 2. Discovers relationships between existing nodes
 *
 * Uses pluggable background task execution to avoid blocking the UI.
 * Strategies: idle (requestIdleCallback), scheduler (postTask), worker, sync
 *
 * This is separate from explicit node expansion which adds NEW nodes.
 * Auto-population only works with nodes already in the graph.
 *
 * @module hooks/use-graph-auto-population
 */

import { getWorks, getAuthors, getInstitutions, getSources, getTopicById } from '@bibgraph/client';
import type { EntityType, GraphNode, GraphEdge } from '@bibgraph/types';
import { RelationType, getEntityRelationshipQueries } from '@bibgraph/types';
import type { RelationshipQueryConfig } from '@bibgraph/types';
import {
  logger,
  getBackgroundTaskExecutor,
  type BackgroundStrategy,
} from '@bibgraph/utils';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';

const LOG_PREFIX = 'graph-auto-population';

/**
 * Maximum number of IDs to include in a single batch query
 */
const BATCH_SIZE = 50;

/**
 * Debounce delay for auto-population (ms)
 */
const DEBOUNCE_DELAY = 500;

/**
 * Chunk size for background processing
 */
const PROCESSING_CHUNK_SIZE = 10;

/**
 * Result of auto-population
 */
export interface AutoPopulationResult {
  /** Number of labels resolved */
  labelsResolved: number;
  /** Number of edges discovered */
  edgesDiscovered: number;
  /** Whether population is in progress */
  isPopulating: boolean;
  /** Error if population failed */
  error: Error | null;
  /** Current background processing strategy */
  currentStrategy: BackgroundStrategy;
}

/**
 * Options for the auto-population hook
 */
export interface UseGraphAutoPopulationOptions {
  /** Current graph nodes */
  nodes: GraphNode[];
  /** Current graph edges */
  edges: GraphEdge[];
  /** Callback to update node labels */
  onLabelsResolved?: (updates: Map<string, string>) => void;
  /** Callback to add discovered edges */
  onEdgesDiscovered?: (edges: GraphEdge[]) => void;
  /** Whether auto-population is enabled */
  enabled?: boolean;
  /** Background processing strategy (default: 'idle') */
  strategy?: BackgroundStrategy;
}

/**
 * Check if a label looks like an ID-only label
 */
function isIdOnlyLabel(label: string): boolean {
  return /^[A-Z]\d+$/i.test(label);
}

/**
 * Normalize an OpenAlex ID to short form
 */
function normalizeId(id: string): string {
  return id.replace('https://openalex.org/', '').toUpperCase();
}

/**
 * Hook for automatic graph population
 *
 * Watches the graph and automatically:
 * - Resolves display names for stub nodes
 * - Discovers relationships between existing nodes
 *
 * Uses background task execution to avoid blocking UI
 */
export function useGraphAutoPopulation({
  nodes,
  edges,
  onLabelsResolved,
  onEdgesDiscovered,
  enabled = true,
  strategy = 'idle',
}: UseGraphAutoPopulationOptions): AutoPopulationResult {
  const [isPopulating, setIsPopulating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [labelsResolved, setLabelsResolved] = useState(0);
  const [edgesDiscovered, setEdgesDiscovered] = useState(0);

  // Track which nodes have been processed to avoid re-processing
  const processedNodesRef = useRef<Set<string>>(new Set());
  const processedEdgePairsRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get background task executor with configured strategy
  const executor = useMemo(() => {
    const exec = getBackgroundTaskExecutor();
    exec.setStrategy(strategy);
    return exec;
  }, [strategy]);

  /**
   * Resolve display names for nodes with ID-only labels
   * Uses background task execution to avoid blocking UI
   */
  const resolveLabels = useCallback(
    async (nodesToResolve: GraphNode[], signal?: AbortSignal): Promise<Map<string, string>> => {
      const labelMap = new Map<string, string>();

      // Filter to nodes needing resolution
      const needsResolution = nodesToResolve.filter(
        (node) => isIdOnlyLabel(node.label) && !processedNodesRef.current.has(node.id)
      );

      if (needsResolution.length === 0) {
        return labelMap;
      }

      logger.debug(LOG_PREFIX, `Resolving labels for ${needsResolution.length} nodes using ${executor.currentStrategy} strategy`);

      // Group by entity type
      const nodesByType = new Map<EntityType, GraphNode[]>();
      for (const node of needsResolution) {
        const existing = nodesByType.get(node.entityType) ?? [];
        existing.push(node);
        nodesByType.set(node.entityType, existing);
      }

      // Create batches for processing
      const batches: Array<{ entityType: EntityType; ids: string[] }> = [];
      for (const [entityType, typeNodes] of nodesByType) {
        for (let i = 0; i < typeNodes.length; i += BATCH_SIZE) {
          const batch = typeNodes.slice(i, i + BATCH_SIZE);
          batches.push({
            entityType,
            ids: batch.map((n) => n.id),
          });
        }
      }

      // Process batches using background executor
      const result = await executor.processBatch(
        batches,
        async (batch) => {
          const idFilter = batch.ids.join('|');
          const selectFields = ['id', 'display_name', 'title'];

          try {
            let results: Array<{ id: string; display_name?: string; title?: string }> = [];

            // Use appropriate API for each entity type
            switch (batch.entityType) {
              case 'works': {
                const response = await getWorks({
                  filter: `id:${idFilter}`,
                  per_page: batch.ids.length,
                  select: selectFields,
                });
                results = response.results as typeof results;
                break;
              }
              case 'authors': {
                const response = await getAuthors({
                  filter: `id:${idFilter}`,
                  per_page: batch.ids.length,
                  select: selectFields,
                });
                results = response.results as typeof results;
                break;
              }
              case 'institutions': {
                const response = await getInstitutions({
                  filters: { id: idFilter },
                  per_page: batch.ids.length,
                  select: selectFields,
                });
                results = response.results as typeof results;
                break;
              }
              case 'sources': {
                const response = await getSources({
                  filters: { id: idFilter },
                  per_page: batch.ids.length,
                  select: selectFields,
                });
                results = response.results as typeof results;
                break;
              }
              default:
                // Unsupported entity type, skip
                return [];
            }

            return results;
          } catch (err) {
            logger.warn(LOG_PREFIX, `Failed to resolve batch of ${batch.entityType}`, { error: err });
            return [];
          }
        },
        {
          signal,
          chunkSize: PROCESSING_CHUNK_SIZE,
        }
      );

      // Process results
      if (result.success && result.data) {
        for (const batchResults of result.data) {
          for (const entity of batchResults) {
            const displayName = entity.display_name ?? entity.title;
            if (displayName && entity.id) {
              const shortId = normalizeId(entity.id);
              labelMap.set(shortId, displayName);
              processedNodesRef.current.add(shortId);
            }
          }
        }
      }

      logger.debug(LOG_PREFIX, `Resolved ${labelMap.size} labels`);
      return labelMap;
    },
    [executor]
  );

  /**
   * Discover relationships between all nodes in the graph using the relationship registry
   * Uses background task execution to avoid blocking UI
   */
  const discoverRelationships = useCallback(
    async (allNodes: GraphNode[], existingEdges: GraphEdge[], signal?: AbortSignal): Promise<GraphEdge[]> => {
      const newEdges: GraphEdge[] = [];

      if (allNodes.length < 2) {
        return newEdges;
      }

      // Build set of existing edges for quick lookup
      const existingEdgeKeys = new Set(
        existingEdges.map((e) => `${normalizeId(e.source)}-${normalizeId(e.target)}-${e.type}`)
      );

      // Create a map of all node IDs for quick existence checks
      const allNodeIds = new Set(allNodes.map((n) => normalizeId(n.id)));

      // Group nodes by entity type
      const nodesByType = new Map<EntityType, GraphNode[]>();
      for (const node of allNodes) {
        const existing = nodesByType.get(node.entityType) ?? [];
        existing.push(node);
        nodesByType.set(node.entityType, existing);
      }

      logger.debug(
        LOG_PREFIX,
        `Discovering relationships between ${allNodes.length} nodes across ${nodesByType.size} entity types using ${executor.currentStrategy} strategy`
      );

      // Process each entity type
      for (const [entityType, nodes] of nodesByType) {
        // Get relationship query configurations for this entity type
        const queries = getEntityRelationshipQueries(entityType);

        // Process inbound queries (results → batch nodes)
        for (const query of queries.inbound) {
          logger.debug(LOG_PREFIX, `Processing ${nodes.length} ${entityType} nodes for inbound ${query.type} (${query.source})`);

          if (query.source === 'api') {
            const discoveredEdges = await discoverRelationshipsForQuery(
              nodes,
              query,
              allNodeIds,
              existingEdgeKeys,
              'inbound',
              signal
            );
            newEdges.push(...discoveredEdges);
          } else if (query.source === 'embedded') {
            const discoveredEdges = await discoverEmbeddedRelationships(
              nodes,
              query,
              entityType,
              allNodeIds,
              existingEdgeKeys,
              'inbound',
              signal
            );
            newEdges.push(...discoveredEdges);
          } else if (query.source === 'embedded-with-resolution') {
            const discoveredEdges = await discoverEmbeddedWithResolutionRelationships(
              nodes,
              query,
              entityType,
              allNodeIds,
              existingEdgeKeys,
              'inbound',
              signal
            );
            newEdges.push(...discoveredEdges);
          }
        }

        // Process outbound queries (batch nodes → results)
        for (const query of queries.outbound) {
          logger.debug(LOG_PREFIX, `Processing ${nodes.length} ${entityType} nodes for outbound ${query.type} (${query.source})`);

          if (query.source === 'api') {
            const discoveredEdges = await discoverRelationshipsForQuery(
              nodes,
              query,
              allNodeIds,
              existingEdgeKeys,
              'outbound',
              signal
            );
            newEdges.push(...discoveredEdges);
          } else if (query.source === 'embedded') {
            const discoveredEdges = await discoverEmbeddedRelationships(
              nodes,
              query,
              entityType,
              allNodeIds,
              existingEdgeKeys,
              'outbound',
              signal
            );
            newEdges.push(...discoveredEdges);
          } else if (query.source === 'embedded-with-resolution') {
            const discoveredEdges = await discoverEmbeddedWithResolutionRelationships(
              nodes,
              query,
              entityType,
              allNodeIds,
              existingEdgeKeys,
              'outbound',
              signal
            );
            newEdges.push(...discoveredEdges);
          }
        }
      }

      logger.debug(LOG_PREFIX, `Discovered ${newEdges.length} total edges across all entity types`);
      return newEdges;
    },
    [executor]
  );

  /**
   * Discover relationships for a specific query configuration
   * Creates edges only when both endpoints exist in the graph
   *
   * @param direction - 'inbound' means results point TO batch nodes, 'outbound' means batch nodes point TO results
   */
  const discoverRelationshipsForQuery = async (
    sourceNodes: GraphNode[],
    query: RelationshipQueryConfig & { source: 'api' },
    allNodeIds: Set<string>,
    existingEdgeKeys: Set<string>,
    direction: 'inbound' | 'outbound',
    signal?: AbortSignal
  ): Promise<GraphEdge[]> => {
    const newEdges: GraphEdge[] = [];
    const sourceIds = sourceNodes.map((n) => n.id);

    // Create batches for processing
    const batches: string[][] = [];
    for (let i = 0; i < sourceIds.length; i += BATCH_SIZE) {
      batches.push(sourceIds.slice(i, i + BATCH_SIZE));
    }

    // Process batches using background executor
    const result = await executor.processBatch(
      batches,
      async (batch) => {
        const discoveredEdges: GraphEdge[] = [];

        try {
          // Build filter string using the query's buildFilter function
          const filterValue = batch.join('|');
          const filter = query.buildFilter(filterValue);

          // Execute query using appropriate API function based on target type
          let response: { results: unknown[] };
          switch (query.targetType) {
            case 'works':
              response = await getWorks({
                filter,
                per_page: 100,
                select: query.select ?? ['id'],
              });
              break;
            case 'authors':
              response = await getAuthors({
                filter,
                per_page: 100,
                select: query.select ?? ['id'],
              });
              break;
            case 'institutions':
              response = await getInstitutions({
                filters: { id: filter },
                per_page: 100,
                select: query.select ?? ['id'],
              });
              break;
            case 'sources':
              response = await getSources({
                filters: { id: filter },
                per_page: 100,
                select: query.select ?? ['id'],
              });
              break;
            default:
              logger.warn(LOG_PREFIX, `Unsupported target type ${query.targetType} for discovery, skipping`);
              return discoveredEdges;
          }

          // Process results to create edges
          for (const result of response.results) {
            const entity = result as { id: string; [key: string]: unknown };
            const entityId = normalizeId(entity.id);

            // Only create edge if target entity is in our graph
            if (!allNodeIds.has(entityId)) continue;

            // Determine edge direction based on query type
            // Inbound queries: result is source, batch nodes are targets
            // Outbound queries: batch nodes are sources, result is target
            for (const batchId of batch) {
              const normalizedBatchId = normalizeId(batchId);

              // Skip if batch node not in graph (shouldn't happen, but safety check)
              if (!allNodeIds.has(normalizedBatchId)) continue;

              // Determine source and target based on query direction
              // Inbound: result entity → batch entity (result.id is source, batchId is target)
              // Outbound: batch entity → result entity (batchId is source, result.id is target)
              let sourceId: string, targetId: string;
              if (direction === 'inbound') {
                // Result entity points to batch entity
                sourceId = entityId;
                targetId = normalizedBatchId;
              } else {
                // Batch entity points to result entity
                sourceId = normalizedBatchId;
                targetId = entityId;
              }

              const edgeKey = `${sourceId}-${targetId}-${query.type}`;
              const pairKey = `${sourceId}-${targetId}`;

              // Skip if edge exists or pair already processed
              if (existingEdgeKeys.has(edgeKey) || processedEdgePairsRef.current.has(pairKey)) {
                continue;
              }

              processedEdgePairsRef.current.add(pairKey);

              discoveredEdges.push({
                id: edgeKey,
                source: sourceId,
                target: targetId,
                type: query.type as RelationType,
                weight: 1,
              });
            }
          }
        } catch (err) {
          logger.warn(LOG_PREFIX, `Failed to discover ${query.type} relationships`, { error: err });
        }

        return discoveredEdges;
      },
      {
        signal,
        chunkSize: PROCESSING_CHUNK_SIZE,
      }
    );

    // Flatten results
    if (result.success && result.data) {
      for (const batchEdges of result.data) {
        newEdges.push(...batchEdges);
      }
    }

    logger.debug(LOG_PREFIX, `Discovered ${newEdges.length} ${query.type} edges`);
    return newEdges;
  };

  /**
   * Discover relationships from embedded data in entity objects
   * Fetches entity data if needed, extracts embedded relationships, creates edges for targets in graph
   */
  const discoverEmbeddedRelationships = async (
    sourceNodes: GraphNode[],
    query: RelationshipQueryConfig & { source: 'embedded' },
    sourceEntityType: EntityType,
    allNodeIds: Set<string>,
    existingEdgeKeys: Set<string>,
    direction: 'inbound' | 'outbound',
    signal?: AbortSignal
  ): Promise<GraphEdge[]> => {
    const newEdges: GraphEdge[] = [];

    // Create batches for processing
    const batches: GraphNode[][] = [];
    for (let i = 0; i < sourceNodes.length; i += BATCH_SIZE) {
      batches.push(sourceNodes.slice(i, i + BATCH_SIZE));
    }

    // Process batches using background executor
    const result = await executor.processBatch(
      batches,
      async (batch) => {
        const discoveredEdges: GraphEdge[] = [];

        for (const node of batch) {
          try {
            // Fetch entity data
            let entityData: Record<string, unknown>;

            switch (sourceEntityType) {
              case 'works': {
                const response = await getWorks({
                  filter: `openalex_id:${node.id}`,
                  per_page: 1,
                });
                if (response.results.length === 0) continue;
                entityData = response.results[0] as Record<string, unknown>;
                break;
              }
              case 'authors': {
                const response = await getAuthors({
                  filter: `openalex_id:${node.id}`,
                  per_page: 1,
                });
                if (response.results.length === 0) continue;
                entityData = response.results[0] as Record<string, unknown>;
                break;
              }
              case 'institutions': {
                const response = await getInstitutions({
                  filters: { id: node.id },
                  per_page: 1,
                });
                if (response.results.length === 0) continue;
                entityData = response.results[0] as Record<string, unknown>;
                break;
              }
              case 'sources': {
                const response = await getSources({
                  filters: { id: node.id },
                  per_page: 1,
                });
                if (response.results.length === 0) continue;
                entityData = response.results[0] as Record<string, unknown>;
                break;
              }
              case 'topics': {
                const topic = await getTopicById(node.id);
                entityData = topic as Record<string, unknown>;
                break;
              }
              default:
                continue;
            }

            // Extract embedded relationships using the query's extraction function
            const embeddedItems = query.extractEmbedded(entityData);

            // Create edges for items that exist in the graph
            for (const item of embeddedItems) {
              const targetId = normalizeId(item.id);

              // Only create edge if target is in our graph
              if (!allNodeIds.has(targetId)) continue;

              const sourceId = normalizeId(node.id);

              // Determine edge endpoints based on direction
              let edgeSource: string, edgeTarget: string;
              if (direction === 'inbound') {
                edgeSource = targetId;
                edgeTarget = sourceId;
              } else {
                edgeSource = sourceId;
                edgeTarget = targetId;
              }

              const edgeKey = `${edgeSource}-${edgeTarget}-${query.type}`;
              const pairKey = `${edgeSource}-${edgeTarget}`;

              // Skip if edge exists or pair already processed
              if (existingEdgeKeys.has(edgeKey) || processedEdgePairsRef.current.has(pairKey)) {
                continue;
              }

              processedEdgePairsRef.current.add(pairKey);

              discoveredEdges.push({
                id: edgeKey,
                source: edgeSource,
                target: edgeTarget,
                type: query.type as RelationType,
                weight: 1,
              });
            }
          } catch (err) {
            logger.warn(LOG_PREFIX, `Failed to discover embedded ${query.type} for ${node.id}`, { error: err });
          }
        }

        return discoveredEdges;
      },
      {
        signal,
        chunkSize: PROCESSING_CHUNK_SIZE,
      }
    );

    // Flatten results
    if (result.success && result.data) {
      for (const batchEdges of result.data) {
        newEdges.push(...batchEdges);
      }
    }

    logger.debug(LOG_PREFIX, `Discovered ${newEdges.length} embedded ${query.type} edges`);
    return newEdges;
  };

  /**
   * Discover relationships from embedded IDs with batch resolution
   * Fetches entity data, extracts IDs, batch-fetches display names, creates edges for targets in graph
   */
  const discoverEmbeddedWithResolutionRelationships = async (
    sourceNodes: GraphNode[],
    query: RelationshipQueryConfig & { source: 'embedded-with-resolution' },
    sourceEntityType: EntityType,
    allNodeIds: Set<string>,
    existingEdgeKeys: Set<string>,
    direction: 'inbound' | 'outbound',
    signal?: AbortSignal
  ): Promise<GraphEdge[]> => {
    const newEdges: GraphEdge[] = [];

    // Create batches for processing
    const batches: GraphNode[][] = [];
    for (let i = 0; i < sourceNodes.length; i += BATCH_SIZE) {
      batches.push(sourceNodes.slice(i, i + BATCH_SIZE));
    }

    // Process batches using background executor
    const result = await executor.processBatch(
      batches,
      async (batch) => {
        const discoveredEdges: GraphEdge[] = [];

        for (const node of batch) {
          try {
            // Fetch entity data
            let entityData: Record<string, unknown>;

            switch (sourceEntityType) {
              case 'institutions': {
                const response = await getInstitutions({
                  filters: { id: node.id },
                  per_page: 1,
                });
                if (response.results.length === 0) continue;
                entityData = response.results[0] as Record<string, unknown>;
                break;
              }
              // Add other entity types as needed
              default:
                continue;
            }

            // Extract IDs that need resolution
            const itemsNeedingResolution = query.extractIds(entityData);

            // Create edges for items that exist in the graph (no need to fetch display names for discovery)
            for (const item of itemsNeedingResolution) {
              const targetId = normalizeId(item.id);

              // Only create edge if target is in our graph
              if (!allNodeIds.has(targetId)) continue;

              const sourceId = normalizeId(node.id);

              // Determine edge endpoints based on direction
              let edgeSource: string, edgeTarget: string;
              if (direction === 'inbound') {
                edgeSource = targetId;
                edgeTarget = sourceId;
              } else {
                edgeSource = sourceId;
                edgeTarget = targetId;
              }

              const edgeKey = `${edgeSource}-${edgeTarget}-${query.type}`;
              const pairKey = `${edgeSource}-${edgeTarget}`;

              // Skip if edge exists or pair already processed
              if (existingEdgeKeys.has(edgeKey) || processedEdgePairsRef.current.has(pairKey)) {
                continue;
              }

              processedEdgePairsRef.current.add(pairKey);

              discoveredEdges.push({
                id: edgeKey,
                source: edgeSource,
                target: edgeTarget,
                type: query.type as RelationType,
                weight: 1,
              });
            }
          } catch (err) {
            logger.warn(LOG_PREFIX, `Failed to discover embedded-with-resolution ${query.type} for ${node.id}`, {
              error: err,
            });
          }
        }

        return discoveredEdges;
      },
      {
        signal,
        chunkSize: PROCESSING_CHUNK_SIZE,
      }
    );

    // Flatten results
    if (result.success && result.data) {
      for (const batchEdges of result.data) {
        newEdges.push(...batchEdges);
      }
    }

    logger.debug(LOG_PREFIX, `Discovered ${newEdges.length} embedded-with-resolution ${query.type} edges`);
    return newEdges;
  };

  /**
   * Main population function
   * Uses abort controller for cancellation support
   */
  const populate = useCallback(async () => {
    if (!enabled || nodes.length === 0) {
      return;
    }

    // Cancel any in-progress population
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsPopulating(true);
    setError(null);

    try {
      // Filter out nodes from persistent graph source to prevent feedback loop
      // Persistent graph nodes are secondary - we shouldn't auto-complete them
      // Only process nodes from primary sources (bookmarks, history, caches)
      const primaryNodes = nodes.filter((node) => {
        const sourceId = node.entityData?.sourceId as string | undefined;
        return sourceId !== 'graph:persistent';
      });

      logger.debug(LOG_PREFIX, `Processing ${primaryNodes.length} primary nodes (filtered ${nodes.length - primaryNodes.length} persistent graph nodes)`);

      // 1. Resolve labels for stub nodes (only primary source nodes)
      const labelUpdates = await resolveLabels(primaryNodes, signal);

      if (signal.aborted) return;

      if (labelUpdates.size > 0 && onLabelsResolved) {
        onLabelsResolved(labelUpdates);
        setLabelsResolved((prev) => prev + labelUpdates.size);
      }

      // 2. Discover relationships between existing nodes (only primary source nodes)
      const discoveredEdges = await discoverRelationships(primaryNodes, edges, signal);

      if (signal.aborted) return;

      if (discoveredEdges.length > 0 && onEdgesDiscovered) {
        onEdgesDiscovered(discoveredEdges);
        setEdgesDiscovered((prev) => prev + discoveredEdges.length);
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const populationError = err instanceof Error ? err : new Error('Failed to populate graph');
      setError(populationError);
      logger.error(LOG_PREFIX, 'Graph population failed', { error: err });
    } finally {
      setIsPopulating(false);
    }
  }, [enabled, nodes, edges, resolveLabels, discoverRelationships, onLabelsResolved, onEdgesDiscovered]);

  // Debounced effect to trigger population when nodes change
  useEffect(() => {
    if (!enabled) return;

    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounced timer
    debounceTimerRef.current = setTimeout(() => {
      void populate();
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Cancel any in-progress population on cleanup
      abortControllerRef.current?.abort();
    };
  }, [enabled, nodes.length, populate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      executor.cancelAll();
    };
  }, [executor]);

  return {
    labelsResolved,
    edgesDiscovered,
    isPopulating,
    error,
    currentStrategy: executor.currentStrategy,
  };
}
