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

import { getWorks, getAuthors, getInstitutions, getSources } from '@bibgraph/client';
import type { EntityType, GraphNode, GraphEdge } from '@bibgraph/types';
import { RelationType } from '@bibgraph/types';
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
   * Discover citation relationships between works in the graph
   * Uses background task execution to avoid blocking UI
   */
  const discoverWorkCitations = useCallback(
    async (workNodes: GraphNode[], existingEdges: GraphEdge[], signal?: AbortSignal): Promise<GraphEdge[]> => {
      const newEdges: GraphEdge[] = [];

      if (workNodes.length < 2) {
        return newEdges;
      }

      // Build set of existing edges for quick lookup
      const existingEdgeKeys = new Set(
        existingEdges.map((e) => `${normalizeId(e.source)}-${normalizeId(e.target)}-${e.type}`)
      );

      // Get work IDs
      const workIds = workNodes.map((n) => n.id);
      const workIdSet = new Set(workIds.map(normalizeId));

      logger.debug(LOG_PREFIX, `Discovering citations between ${workNodes.length} works using ${executor.currentStrategy} strategy`);

      // Create batches for processing
      const batches: string[][] = [];
      for (let i = 0; i < workIds.length; i += BATCH_SIZE) {
        batches.push(workIds.slice(i, i + BATCH_SIZE));
      }

      // Process batches using background executor
      const result = await executor.processBatch(
        batches,
        async (batch) => {
          const citesFilter = batch.join('|');
          const discoveredEdges: GraphEdge[] = [];

          try {
            // Find works in our graph that cite other works in our graph
            const response = await getWorks({
              filter: `cites:${citesFilter}`,
              per_page: 100,
              select: ['id', 'referenced_works'],
            });

            for (const work of response.results) {
              const sourceId = normalizeId(work.id);

              // Only process if source is in our graph
              if (!workIdSet.has(sourceId)) continue;

              // Check referenced_works for targets in our graph
              const refs = (work as unknown as { referenced_works?: string[] }).referenced_works ?? [];
              for (const refId of refs) {
                const targetId = normalizeId(refId);

                // Only create edge if target is in our graph
                if (!workIdSet.has(targetId)) continue;

                const edgeKey = `${sourceId}-${targetId}-${RelationType.REFERENCE}`;
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
                  type: RelationType.REFERENCE,
                  weight: 1,
                });
              }
            }
          } catch (err) {
            logger.warn(LOG_PREFIX, 'Failed to discover work citations', { error: err });
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

      logger.debug(LOG_PREFIX, `Discovered ${newEdges.length} citation edges`);
      return newEdges;
    },
    [executor]
  );

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
      const workNodes = primaryNodes.filter((n) => n.entityType === 'works');
      const discoveredEdges = await discoverWorkCitations(workNodes, edges, signal);

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
  }, [enabled, nodes, edges, resolveLabels, discoverWorkCitations, onLabelsResolved, onEdgesDiscovered]);

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
