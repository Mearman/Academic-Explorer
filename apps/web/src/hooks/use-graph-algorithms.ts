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
  performBFS,
  performDFS,
  getCycleInfo,
  getCorePeriphery,
  getBiconnectedComponents,
  getTriangles,
  getStarPatterns,
  getCoCitations,
  getBibliographicCoupling,
  getKTruss,
  getClusterQuality,
  type CommunityResult,
  type PathResult,
  type ComponentResult,
  type GraphStatistics,
  type KCoreResult,
  type EgoNetworkResult,
  type ClusteringAlgorithm,
  type TraversalResult,
  type CycleResult,
  type CorePeripheryResult,
  type BiconnectedResult,
  type TriangleResult,
  type StarPatternResult,
  type CoCitationResult,
  type BibliographicCouplingResult,
  type KTrussResult,
  type ClusterQualityResult,
} from '@/services/graph-algorithms';

/**
 * Options for community detection
 */
export interface CommunityDetectionOptions {
  algorithm?: ClusteringAlgorithm;
  resolution?: number;
  numClusters?: number;
  linkage?: 'single' | 'complete' | 'average';
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
 * Hook for BFS traversal
 */
export function useBFS(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startId: string | null,
  directed: boolean = true
): TraversalResult | null {
  return useMemo(() => {
    if (!startId || nodes.length === 0) return null;
    return performBFS(nodes, edges, startId, directed);
  }, [nodes, edges, startId, directed]);
}

/**
 * Hook for DFS traversal
 */
export function useDFS(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startId: string | null,
  directed: boolean = true
): TraversalResult | null {
  return useMemo(() => {
    if (!startId || nodes.length === 0) return null;
    return performDFS(nodes, edges, startId, directed);
  }, [nodes, edges, startId, directed]);
}

/**
 * Hook for cycle detection with details
 */
export function useCycleInfo(
  nodes: GraphNode[],
  edges: GraphEdge[],
  directed: boolean = true
): CycleResult {
  return useMemo(() => {
    if (nodes.length === 0) return { hasCycle: false, cycle: [] };
    return getCycleInfo(nodes, edges, directed);
  }, [nodes, edges, directed]);
}

/**
 * Hook for strongly connected components
 */
export function useStronglyConnectedComponents(
  nodes: GraphNode[],
  edges: GraphEdge[]
): ComponentResult {
  return useMemo(() => {
    if (nodes.length === 0) return { components: [], count: 0 };
    return findStrongComponents(nodes, edges);
  }, [nodes, edges]);
}

/**
 * Hook for core-periphery decomposition
 */
export function useCorePeriphery(
  nodes: GraphNode[],
  edges: GraphEdge[],
  coreThreshold: number = 0.7
): CorePeripheryResult | null {
  return useMemo(() => {
    if (nodes.length < 3) return null;
    return getCorePeriphery(nodes, edges, coreThreshold);
  }, [nodes, edges, coreThreshold]);
}

/**
 * Hook for biconnected components
 */
export function useBiconnectedComponents(
  nodes: GraphNode[],
  edges: GraphEdge[]
): BiconnectedResult | null {
  return useMemo(() => {
    if (nodes.length < 2) return null;
    return getBiconnectedComponents(nodes, edges);
  }, [nodes, edges]);
}

/**
 * Hook for triangle detection
 */
export function useTriangles(
  nodes: GraphNode[],
  edges: GraphEdge[]
): TriangleResult {
  return useMemo(() => {
    if (nodes.length < 3 || edges.length < 3) {
      return { triangles: [], count: 0, clusteringCoefficient: 0 };
    }
    return getTriangles(nodes, edges);
  }, [nodes, edges]);
}

/**
 * Hook for star pattern detection
 */
export function useStarPatterns(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: { minDegree?: number; type?: 'in' | 'out' } = {}
): StarPatternResult {
  const { minDegree = 5, type = 'out' } = options;
  return useMemo(() => {
    if (nodes.length === 0) return { patterns: [], count: 0 };
    return getStarPatterns(nodes, edges, { minDegree, type });
  }, [nodes, edges, minDegree, type]);
}

/**
 * Hook for co-citation detection
 */
export function useCoCitations(
  nodes: GraphNode[],
  edges: GraphEdge[],
  minCount: number = 2
): CoCitationResult {
  return useMemo(() => {
    if (nodes.length === 0) return { pairs: [] };
    return getCoCitations(nodes, edges, minCount);
  }, [nodes, edges, minCount]);
}

/**
 * Hook for bibliographic coupling detection
 */
export function useBibliographicCoupling(
  nodes: GraphNode[],
  edges: GraphEdge[],
  minShared: number = 2
): BibliographicCouplingResult {
  return useMemo(() => {
    if (nodes.length === 0) return { pairs: [] };
    return getBibliographicCoupling(nodes, edges, minShared);
  }, [nodes, edges, minShared]);
}

/**
 * Hook for k-truss extraction
 */
export function useKTruss(
  nodes: GraphNode[],
  edges: GraphEdge[],
  k: number = 3
): KTrussResult {
  return useMemo(() => {
    if (nodes.length < 3 || edges.length < 3 || k < 2) {
      return { nodes: [], edges: [], k, nodeCount: 0, edgeCount: 0 };
    }
    return getKTruss(nodes, edges, k);
  }, [nodes, edges, k]);
}

/**
 * Hook for cluster quality metrics
 */
export function useClusterQuality(
  nodes: GraphNode[],
  edges: GraphEdge[],
  communities: CommunityResult[]
): ClusterQualityResult {
  return useMemo(() => {
    if (nodes.length === 0 || communities.length === 0) {
      return {
        modularity: 0,
        avgConductance: 0,
        avgDensity: 0,
        coverageRatio: 0,
        numClusters: 0,
      };
    }
    return getClusterQuality(nodes, edges, communities);
  }, [nodes, edges, communities]);
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
