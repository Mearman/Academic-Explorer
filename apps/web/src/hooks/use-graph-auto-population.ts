/**
 * useGraphAutoPopulation - Automatic graph population hook
 *
 * Watches the graph for changes and automatically:
 * 1. Resolves display names for stub nodes (using batch queries)
 * 2. Discovers relationships between existing nodes
 *
 * This is separate from explicit node expansion which adds NEW nodes.
 * Auto-population only works with nodes already in the graph.
 *
 * @module hooks/use-graph-auto-population
 */

import { getWorks } from '@bibgraph/client';
import type { EntityType, GraphNode, GraphEdge } from '@bibgraph/types';
import { RelationType } from '@bibgraph/types';
import { logger } from '@bibgraph/utils';
import { useCallback, useEffect, useRef, useState } from 'react';

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
 */
export function useGraphAutoPopulation({
  nodes,
  edges,
  onLabelsResolved,
  onEdgesDiscovered,
  enabled = true,
}: UseGraphAutoPopulationOptions): AutoPopulationResult {
  const [isPopulating, setIsPopulating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [labelsResolved, setLabelsResolved] = useState(0);
  const [edgesDiscovered, setEdgesDiscovered] = useState(0);

  // Track which nodes have been processed to avoid re-processing
  const processedNodesRef = useRef<Set<string>>(new Set());
  const processedEdgePairsRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Resolve display names for nodes with ID-only labels
   */
  const resolveLabels = useCallback(
    async (nodesToResolve: GraphNode[]): Promise<Map<string, string>> => {
      const labelMap = new Map<string, string>();

      // Filter to nodes needing resolution
      const needsResolution = nodesToResolve.filter(
        (node) => isIdOnlyLabel(node.label) && !processedNodesRef.current.has(node.id)
      );

      if (needsResolution.length === 0) {
        return labelMap;
      }

      logger.debug(LOG_PREFIX, `Resolving labels for ${needsResolution.length} nodes`);

      // Group by entity type
      const nodesByType = new Map<EntityType, GraphNode[]>();
      for (const node of needsResolution) {
        const existing = nodesByType.get(node.entityType) ?? [];
        existing.push(node);
        nodesByType.set(node.entityType, existing);
      }

      // Process each type with batch queries
      for (const [entityType, typeNodes] of nodesByType) {
        for (let i = 0; i < typeNodes.length; i += BATCH_SIZE) {
          const batch = typeNodes.slice(i, i + BATCH_SIZE);
          const idFilter = batch.map((n) => n.id).join('|');

          try {
            const response = await getWorks({
              filter: entityType === 'works' ? `id:${idFilter}` : undefined,
              per_page: batch.length,
              select: ['id', 'display_name', 'title'],
            });

            for (const entity of response.results) {
              const displayName =
                (entity as Record<string, unknown>).display_name ??
                (entity as Record<string, unknown>).title;
              if (displayName && entity.id) {
                const shortId = normalizeId(entity.id);
                labelMap.set(shortId, displayName as string);
                processedNodesRef.current.add(shortId);
              }
            }
          } catch (err) {
            logger.warn(LOG_PREFIX, `Failed to resolve batch of ${entityType}`, { error: err });
          }
        }
      }

      return labelMap;
    },
    []
  );

  /**
   * Discover citation relationships between works in the graph
   */
  const discoverWorkCitations = useCallback(
    async (workNodes: GraphNode[], existingEdges: GraphEdge[]): Promise<GraphEdge[]> => {
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

      logger.debug(LOG_PREFIX, `Discovering citations between ${workNodes.length} works`);

      // Query for works that cite any of our works
      // This tells us which of our works cite other works in the graph
      for (let i = 0; i < workIds.length; i += BATCH_SIZE) {
        const batch = workIds.slice(i, i + BATCH_SIZE);
        const citesFilter = batch.join('|');

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

              newEdges.push({
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
      }

      logger.debug(LOG_PREFIX, `Discovered ${newEdges.length} citation edges`);
      return newEdges;
    },
    []
  );

  /**
   * Main population function
   */
  const populate = useCallback(async () => {
    if (!enabled || nodes.length === 0) {
      return;
    }

    setIsPopulating(true);
    setError(null);

    try {
      // 1. Resolve labels for stub nodes
      const labelUpdates = await resolveLabels(nodes);

      if (labelUpdates.size > 0 && onLabelsResolved) {
        onLabelsResolved(labelUpdates);
        setLabelsResolved((prev) => prev + labelUpdates.size);
      }

      // 2. Discover relationships between existing nodes
      const workNodes = nodes.filter((n) => n.entityType === 'works');
      const discoveredEdges = await discoverWorkCitations(workNodes, edges);

      if (discoveredEdges.length > 0 && onEdgesDiscovered) {
        onEdgesDiscovered(discoveredEdges);
        setEdgesDiscovered((prev) => prev + discoveredEdges.length);
      }
    } catch (err) {
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
    };
  }, [enabled, nodes.length, populate]);

  return {
    labelsResolved,
    edgesDiscovered,
    isPopulating,
    error,
  };
}
