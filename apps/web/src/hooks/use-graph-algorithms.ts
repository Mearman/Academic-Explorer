/**
 * React hooks for graph algorithms
 * Provides easy-to-use hooks for running graph algorithms on visualization data
 *
 * @module hooks/use-graph-algorithms
 */

import type { GraphNode, GraphEdge, EntityType } from '@bibgraph/types';
import { useMemo, useCallback, useState } from 'react';

import {
  detectCommunities,
  findShortestPath,
  findComponents,
  findStrongComponents,
  hasCycles,
  getTopologicalOrder,
  calculateStatistics,
  getModularityScore,
  getKCore,
  getEgoNetwork,
  filterByNodeType,
  getSubgraph,
  type CommunityResult,
  type PathResult,
  type ComponentResult,
  type GraphStatistics,
  type KCoreResult,
  type EgoNetworkResult,
  type ClusteringAlgorithm,
} from '@/services/graph-algorithms';

/**
 * Options for community detection
 */
export interface CommunityDetectionOptions {
  algorithm?: ClusteringAlgorithm;
  resolution?: number;
}

/**
 * Hook for computing graph statistics
 * Automatically recomputes when nodes/edges change
 */
export function useGraphStatistics(
  nodes: GraphNode[],
  edges: GraphEdge[],
  directed: boolean = true
): GraphStatistics {
  return useMemo(
    () => calculateStatistics(nodes, edges, directed),
    [nodes, edges, directed]
  );
}

/**
 * Hook for community detection
 * Returns communities and a function to recompute with different options
 */
export function useCommunityDetection(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: CommunityDetectionOptions = {}
): {
  communities: CommunityResult[];
  modularity: number;
  isComputing: boolean;
  recompute: (newOptions?: CommunityDetectionOptions) => void;
} {
  const [isComputing, setIsComputing] = useState(false);
  const [currentOptions, setCurrentOptions] = useState(options);

  const communities = useMemo(() => {
    if (nodes.length === 0) return [];
    setIsComputing(true);
    const result = detectCommunities(nodes, edges, currentOptions);
    setIsComputing(false);
    return result;
  }, [nodes, edges, currentOptions]);

  const modularity = useMemo(() => {
    if (communities.length === 0 || nodes.length === 0) return 0;
    return getModularityScore(nodes, edges, communities);
  }, [nodes, edges, communities]);

  const recompute = useCallback((newOptions?: CommunityDetectionOptions) => {
    setCurrentOptions((prev) => ({ ...prev, ...newOptions }));
  }, []);

  return { communities, modularity, isComputing, recompute };
}

/**
 * Hook for finding shortest path between two nodes
 */
export function useShortestPath(
  nodes: GraphNode[],
  edges: GraphEdge[],
  sourceId: string | null,
  targetId: string | null,
  directed: boolean = true
): PathResult | null {
  return useMemo(() => {
    if (!sourceId || !targetId || nodes.length === 0) return null;
    return findShortestPath(nodes, edges, sourceId, targetId, directed);
  }, [nodes, edges, sourceId, targetId, directed]);
}

/**
 * Hook for connected components analysis
 */
export function useConnectedComponents(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: { directed?: boolean; strong?: boolean } = {}
): ComponentResult {
  const { directed = false, strong = false } = options;

  return useMemo(() => {
    if (nodes.length === 0) return { components: [], count: 0 };

    if (strong && directed) {
      return findStrongComponents(nodes, edges);
    }
    return findComponents(nodes, edges, directed);
  }, [nodes, edges, directed, strong]);
}

/**
 * Hook for cycle detection
 */
export function useCycleDetection(
  nodes: GraphNode[],
  edges: GraphEdge[],
  directed: boolean = true
): boolean {
  return useMemo(() => {
    if (nodes.length === 0) return false;
    return hasCycles(nodes, edges, directed);
  }, [nodes, edges, directed]);
}

/**
 * Hook for topological sort (returns null if graph has cycles)
 */
export function useTopologicalSort(
  nodes: GraphNode[],
  edges: GraphEdge[]
): string[] | null {
  return useMemo(() => {
    if (nodes.length === 0) return [];
    return getTopologicalOrder(nodes, edges);
  }, [nodes, edges]);
}

/**
 * Hook for k-core decomposition
 */
export function useKCore(
  nodes: GraphNode[],
  edges: GraphEdge[],
  k: number
): KCoreResult {
  return useMemo(() => {
    if (nodes.length === 0 || k < 1) return { nodes: [], k };
    return getKCore(nodes, edges, k);
  }, [nodes, edges, k]);
}

/**
 * Hook for ego network extraction
 */
export function useEgoNetwork(
  nodes: GraphNode[],
  edges: GraphEdge[],
  centerId: string | null,
  radius: number = 1,
  directed: boolean = true
): EgoNetworkResult | null {
  return useMemo(() => {
    if (!centerId || nodes.length === 0) return null;
    return getEgoNetwork(nodes, edges, centerId, radius, directed);
  }, [nodes, edges, centerId, radius, directed]);
}

/**
 * Hook for filtering graph by node types
 */
export function useFilteredGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  allowedTypes: EntityType[],
  directed: boolean = true
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  return useMemo(() => {
    if (nodes.length === 0 || allowedTypes.length === 0) {
      return { nodes: [], edges: [] };
    }
    return filterByNodeType(nodes, edges, allowedTypes, directed);
  }, [nodes, edges, allowedTypes, directed]);
}

/**
 * Hook for subgraph extraction
 */
export function useSubgraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  nodeIds: string[],
  directed: boolean = true
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  return useMemo(() => {
    if (nodes.length === 0 || nodeIds.length === 0) {
      return { nodes: [], edges: [] };
    }
    return getSubgraph(nodes, edges, nodeIds, directed);
  }, [nodes, edges, nodeIds, directed]);
}

/**
 * Combined hook that provides access to all graph algorithm operations
 * Use this when you need multiple algorithm operations
 */
export function useGraphAlgorithms(
  nodes: GraphNode[],
  edges: GraphEdge[]
) {
  // Memoized statistics
  const statistics = useGraphStatistics(nodes, edges, true);

  // Community detection with controls
  const [communityOptions, setCommunityOptions] = useState<CommunityDetectionOptions>({
    algorithm: 'louvain',
    resolution: 1.0,
  });

  const communities = useMemo(() => {
    if (nodes.length === 0) return [];
    return detectCommunities(nodes, edges, communityOptions);
  }, [nodes, edges, communityOptions]);

  const modularity = useMemo(() => {
    if (communities.length === 0 || nodes.length === 0) return 0;
    return getModularityScore(nodes, edges, communities);
  }, [nodes, edges, communities]);

  // Path finding state
  const [pathSource, setPathSource] = useState<string | null>(null);
  const [pathTarget, setPathTarget] = useState<string | null>(null);

  const shortestPath = useMemo(() => {
    if (!pathSource || !pathTarget) return null;
    return findShortestPath(nodes, edges, pathSource, pathTarget, true);
  }, [nodes, edges, pathSource, pathTarget]);

  // Connected components
  const connectedComponents = useMemo(() => {
    if (nodes.length === 0) return { components: [], count: 0 };
    return findComponents(nodes, edges, false);
  }, [nodes, edges]);

  // Ego network state
  const [egoCenter, setEgoCenter] = useState<string | null>(null);
  const [egoRadius, setEgoRadius] = useState(1);

  const egoNetwork = useMemo(() => {
    if (!egoCenter) return null;
    return getEgoNetwork(nodes, edges, egoCenter, egoRadius, true);
  }, [nodes, edges, egoCenter, egoRadius]);

  // K-core state
  const [kCoreK, setKCoreK] = useState(2);

  const kCore = useMemo(() => {
    if (nodes.length === 0) return { nodes: [], k: kCoreK };
    return getKCore(nodes, edges, kCoreK);
  }, [nodes, edges, kCoreK]);

  return {
    // Statistics
    statistics,

    // Community detection
    communities,
    modularity,
    communityOptions,
    setCommunityOptions,

    // Path finding
    shortestPath,
    pathSource,
    pathTarget,
    setPathSource,
    setPathTarget,

    // Connected components
    connectedComponents,

    // Ego network
    egoNetwork,
    egoCenter,
    egoRadius,
    setEgoCenter,
    setEgoRadius,

    // K-core
    kCore,
    kCoreK,
    setKCoreK,

    // Utility functions
    findPath: (source: string, target: string) =>
      findShortestPath(nodes, edges, source, target, true),
    getEgo: (center: string, radius: number = 1) =>
      getEgoNetwork(nodes, edges, center, radius, true),
    filterByType: (types: EntityType[]) =>
      filterByNodeType(nodes, edges, types, true),
    extractSubgraph: (ids: string[]) =>
      getSubgraph(nodes, edges, ids, true),
  };
}
