/**
 * React hooks for graph algorithms
 * Provides easy-to-use hooks for running graph algorithms on visualization data
 * @module hooks/use-graph-algorithms
 */

import type { EntityType,GraphEdge, GraphNode } from '@bibgraph/types';
import { useCallback, useMemo, useState } from 'react';

import {
  type BibliographicCouplingResult,
  type BiconnectedResult,
  calculateStatistics,
  type ClusteringAlgorithm,
  type ClusterQualityResult,
  type CoCitationResult,
  type CommunityResult,
  type ComponentResult,
  type CorePeripheryResult,
  type CycleResult,
  detectCommunities,
  type EdgePropertyFilter,
  type EgoNetworkResult,
  filterByNodeType,
  findComponents,
  findShortestPath,
  findStrongComponents,
  getBibliographicCoupling,
  getBiconnectedComponents,
  getClusterQuality,
  getCoCitations,
  getCorePeriphery,
  getCycleInfo,
  getEgoNetwork,
  getKCore,
  getKTruss,
  getModularityScore,
  getStarPatterns,
  getSubgraph,
  getTopologicalOrder,
  getTriangles,
  type GraphStatistics,
  hasCycles,
  type KCoreResult,
  type KTrussResult,
  type PathResult,
  performBFS,
  performDFS,
  type StarPatternResult,
  type TraversalResult,
  type TriangleResult,
  type WeightConfig,
  type WeightedPathOptions,
} from '@/services/graph-algorithms';

// Re-export types for consumer convenience

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
 * @param nodes
 * @param edges
 * @param directed
 */
export const useGraphStatistics = (nodes: GraphNode[], edges: GraphEdge[], directed: boolean = true): GraphStatistics => useMemo(
    () => calculateStatistics(nodes, edges, directed),
    [nodes, edges, directed]
  );

/**
 * Hook for community detection
 * Returns communities and a function to recompute with different options
 * @param nodes
 * @param edges
 * @param options
 */
export const useCommunityDetection = (nodes: GraphNode[], edges: GraphEdge[], options: CommunityDetectionOptions = {}): {
  communities: CommunityResult[];
  modularity: number;
  isComputing: boolean;
  recompute: (newOptions?: CommunityDetectionOptions) => void;
} => {
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
};

/**
 * Hook for finding shortest path between two nodes
 * @param nodes - Graph nodes
 * @param edges - Graph edges
 * @param sourceId - Source node ID (null to disable)
 * @param targetId - Target node ID (null to disable)
 * @param options - Weighted path options or boolean for directed flag
 * @example
 * ```typescript
 * // Simple unweighted path
 * const path = useShortestPath(nodes, edges, 'A', 'B');
 *
 * // Weighted by score (inverted for "strongest connection" path)
 * const path = useShortestPath(nodes, edges, 'A', 'B', {
 *   weight: { property: 'score', invert: true },
 * });
 *
 * // Path through authors only with score filter
 * const path = useShortestPath(nodes, edges, 'A', 'B', {
 *   nodeTypes: ['author'],
 *   edgeFilter: { scoreMin: 0.5 },
 * });
 * ```
 */
export const useShortestPath = (nodes: GraphNode[], edges: GraphEdge[], sourceId: string | null, targetId: string | null, options?: WeightedPathOptions | boolean): PathResult | null => useMemo(() => {
    if (!sourceId || !targetId || nodes.length === 0) return null;
    return findShortestPath(nodes, edges, sourceId, targetId, options);
  }, [nodes, edges, sourceId, targetId, options]);

/**
 * Hook for finding weighted shortest path with full configuration
 *
 * More explicit API for weighted pathfinding with state management for
 * source/target selection and weight configuration.
 * @param nodes
 * @param edges
 * @example
 * ```typescript
 * const {
 *   path,
 *   sourceId,
 *   targetId,
 *   setSource,
 *   setTarget,
 *   weightConfig,
 *   setWeightConfig,
 *   edgeFilter,
 *   setEdgeFilter,
 *   nodeTypes,
 *   setNodeTypes,
 * } = useWeightedPath(nodes, edges);
 *
 * // Configure weight to use topic score (inverted)
 * setWeightConfig({ property: 'score', invert: true });
 *
 * // Only traverse through authors
 * setNodeTypes(['author']);
 *
 * // Select endpoints
 * setSource('A123');
 * setTarget('B456');
 * ```
 */
export const useWeightedPath = (nodes: GraphNode[], edges: GraphEdge[]): {
  /** Computed path result */
  path: PathResult | null;
  /** Source node ID */
  sourceId: string | null;
  /** Target node ID */
  targetId: string | null;
  /** Set source node */
  setSource: (id: string | null) => void;
  /** Set target node */
  setTarget: (id: string | null) => void;
  /** Current weight configuration */
  weightConfig: WeightConfig | undefined;
  /** Set weight configuration */
  setWeightConfig: (config: WeightConfig | undefined) => void;
  /** Current edge filter */
  edgeFilter: EdgePropertyFilter | undefined;
  /** Set edge filter */
  setEdgeFilter: (filter: EdgePropertyFilter | undefined) => void;
  /** Current node type filter */
  nodeTypes: EntityType[] | undefined;
  /** Set node type filter */
  setNodeTypes: (types: EntityType[] | undefined) => void;
  /** Whether graph is treated as directed */
  directed: boolean;
  /** Set directed mode */
  setDirected: (directed: boolean) => void;
  /** Clear all selections and filters */
  reset: () => void;
} => {
  const [sourceId, setSource] = useState<string | null>(null);
  const [targetId, setTarget] = useState<string | null>(null);
  const [weightConfig, setWeightConfig] = useState<WeightConfig | undefined>();
  const [edgeFilter, setEdgeFilter] = useState<EdgePropertyFilter | undefined>();
  const [nodeTypes, setNodeTypes] = useState<EntityType[] | undefined>();
  const [directed, setDirected] = useState(true);

  const options = useMemo(
    (): WeightedPathOptions => ({
      weight: weightConfig,
      edgeFilter,
      nodeTypes,
      directed,
    }),
    [weightConfig, edgeFilter, nodeTypes, directed]
  );

  const path = useMemo(() => {
    if (!sourceId || !targetId || nodes.length === 0) return null;
    return findShortestPath(nodes, edges, sourceId, targetId, options);
  }, [nodes, edges, sourceId, targetId, options]);

  const reset = useCallback(() => {
    setSource(null);
    setTarget(null);
    setWeightConfig(undefined);
    setEdgeFilter(undefined);
    setNodeTypes(undefined);
    setDirected(true);
  }, []);

  return {
    path,
    sourceId,
    targetId,
    setSource,
    setTarget,
    weightConfig,
    setWeightConfig,
    edgeFilter,
    setEdgeFilter,
    nodeTypes,
    setNodeTypes,
    directed,
    setDirected,
    reset,
  };
};

/**
 * Hook for connected components analysis
 * @param nodes
 * @param edges
 * @param options
 * @param options.directed
 * @param options.strong
 */
export const useConnectedComponents = (nodes: GraphNode[], edges: GraphEdge[], options: { directed?: boolean; strong?: boolean } = {}): ComponentResult => {
  const { directed = false, strong = false } = options;

  return useMemo(() => {
    if (nodes.length === 0) return { components: [], count: 0 };

    if (strong && directed) {
      return findStrongComponents(nodes, edges);
    }
    return findComponents(nodes, edges, directed);
  }, [nodes, edges, directed, strong]);
};

/**
 * Hook for cycle detection
 * @param nodes
 * @param edges
 * @param directed
 */
export const useCycleDetection = (nodes: GraphNode[], edges: GraphEdge[], directed: boolean = true): boolean => useMemo(() => {
    if (nodes.length === 0) return false;
    return hasCycles(nodes, edges, directed);
  }, [nodes, edges, directed]);

/**
 * Hook for topological sort (returns null if graph has cycles)
 * @param nodes
 * @param edges
 */
export const useTopologicalSort = (nodes: GraphNode[], edges: GraphEdge[]): string[] | null => useMemo(() => {
    if (nodes.length === 0) return [];
    return getTopologicalOrder(nodes, edges);
  }, [nodes, edges]);

/**
 * Hook for k-core decomposition
 * @param nodes
 * @param edges
 * @param k
 */
export const useKCore = (nodes: GraphNode[], edges: GraphEdge[], k: number): KCoreResult => useMemo(() => {
    if (nodes.length === 0 || k < 1) return { nodes: [], k };
    return getKCore(nodes, edges, k);
  }, [nodes, edges, k]);

/**
 * Hook for ego network extraction
 * @param nodes
 * @param edges
 * @param centerId
 * @param radius
 * @param directed
 */
export const useEgoNetwork = (nodes: GraphNode[], edges: GraphEdge[], centerId: string | null, radius: number = 1, directed: boolean = true): EgoNetworkResult | null => useMemo(() => {
    if (!centerId || nodes.length === 0) return null;
    return getEgoNetwork(nodes, edges, centerId, radius, directed);
  }, [nodes, edges, centerId, radius, directed]);

/**
 * Hook for filtering graph by node types
 * @param nodes
 * @param edges
 * @param allowedTypes
 * @param directed
 */
export const useFilteredGraph = (nodes: GraphNode[], edges: GraphEdge[], allowedTypes: EntityType[], directed: boolean = true): { nodes: GraphNode[]; edges: GraphEdge[] } => useMemo(() => {
    if (nodes.length === 0 || allowedTypes.length === 0) {
      return { nodes: [], edges: [] };
    }
    return filterByNodeType(nodes, edges, allowedTypes, directed);
  }, [nodes, edges, allowedTypes, directed]);

/**
 * Hook for subgraph extraction
 * @param nodes
 * @param edges
 * @param nodeIds
 * @param directed
 */
export const useSubgraph = (nodes: GraphNode[], edges: GraphEdge[], nodeIds: string[], directed: boolean = true): { nodes: GraphNode[]; edges: GraphEdge[] } => useMemo(() => {
    if (nodes.length === 0 || nodeIds.length === 0) {
      return { nodes: [], edges: [] };
    }
    return getSubgraph(nodes, edges, nodeIds, directed);
  }, [nodes, edges, nodeIds, directed]);

/**
 * Hook for BFS traversal
 * @param nodes
 * @param edges
 * @param startId
 * @param directed
 */
export const useBFS = (nodes: GraphNode[], edges: GraphEdge[], startId: string | null, directed: boolean = true): TraversalResult | null => useMemo(() => {
    if (!startId || nodes.length === 0) return null;
    return performBFS(nodes, edges, startId, directed);
  }, [nodes, edges, startId, directed]);

/**
 * Hook for DFS traversal
 * @param nodes
 * @param edges
 * @param startId
 * @param directed
 */
export const useDFS = (nodes: GraphNode[], edges: GraphEdge[], startId: string | null, directed: boolean = true): TraversalResult | null => useMemo(() => {
    if (!startId || nodes.length === 0) return null;
    return performDFS(nodes, edges, startId, directed);
  }, [nodes, edges, startId, directed]);

/**
 * Hook for cycle detection with details
 * @param nodes
 * @param edges
 * @param directed
 */
export const useCycleInfo = (nodes: GraphNode[], edges: GraphEdge[], directed: boolean = true): CycleResult => useMemo(() => {
    if (nodes.length === 0) return { hasCycle: false, cycle: [] };
    return getCycleInfo(nodes, edges, directed);
  }, [nodes, edges, directed]);

/**
 * Hook for strongly connected components
 * @param nodes
 * @param edges
 */
export const useStronglyConnectedComponents = (nodes: GraphNode[], edges: GraphEdge[]): ComponentResult => useMemo(() => {
    if (nodes.length === 0) return { components: [], count: 0 };
    return findStrongComponents(nodes, edges);
  }, [nodes, edges]);

/**
 * Hook for core-periphery decomposition
 * @param nodes
 * @param edges
 * @param coreThreshold
 */
export const useCorePeriphery = (nodes: GraphNode[], edges: GraphEdge[], coreThreshold: number = 0.7): CorePeripheryResult | null => useMemo(() => {
    if (nodes.length < 3) return null;
    return getCorePeriphery(nodes, edges, coreThreshold);
  }, [nodes, edges, coreThreshold]);

/**
 * Hook for biconnected components
 * @param nodes
 * @param edges
 */
export const useBiconnectedComponents = (nodes: GraphNode[], edges: GraphEdge[]): BiconnectedResult | null => useMemo(() => {
    if (nodes.length < 2) return null;
    return getBiconnectedComponents(nodes, edges);
  }, [nodes, edges]);

/**
 * Hook for triangle detection
 * @param nodes
 * @param edges
 */
export const useTriangles = (nodes: GraphNode[], edges: GraphEdge[]): TriangleResult => useMemo(() => {
    if (nodes.length < 3 || edges.length < 3) {
      return { triangles: [], count: 0, clusteringCoefficient: 0 };
    }
    return getTriangles(nodes, edges);
  }, [nodes, edges]);

/**
 * Hook for star pattern detection
 * @param nodes
 * @param edges
 * @param options
 * @param options.minDegree
 * @param options.type
 */
export const useStarPatterns = (nodes: GraphNode[], edges: GraphEdge[], options: { minDegree?: number; type?: 'in' | 'out' } = {}): StarPatternResult => {
  const { minDegree = 5, type = 'out' } = options;
  return useMemo(() => {
    if (nodes.length === 0) return { patterns: [], count: 0 };
    return getStarPatterns(nodes, edges, { minDegree, type });
  }, [nodes, edges, minDegree, type]);
};

/**
 * Hook for co-citation detection
 * @param nodes
 * @param edges
 * @param minCount
 */
export const useCoCitations = (nodes: GraphNode[], edges: GraphEdge[], minCount: number = 2): CoCitationResult => useMemo(() => {
    if (nodes.length === 0) return { pairs: [] };
    return getCoCitations(nodes, edges, minCount);
  }, [nodes, edges, minCount]);

/**
 * Hook for bibliographic coupling detection
 * @param nodes
 * @param edges
 * @param minShared
 */
export const useBibliographicCoupling = (nodes: GraphNode[], edges: GraphEdge[], minShared: number = 2): BibliographicCouplingResult => useMemo(() => {
    if (nodes.length === 0) return { pairs: [] };
    return getBibliographicCoupling(nodes, edges, minShared);
  }, [nodes, edges, minShared]);

/**
 * Hook for k-truss extraction
 * @param nodes
 * @param edges
 * @param k
 */
export const useKTruss = (nodes: GraphNode[], edges: GraphEdge[], k: number = 3): KTrussResult => useMemo(() => {
    if (nodes.length < 3 || edges.length < 3 || k < 2) {
      return { nodes: [], edges: [], k, nodeCount: 0, edgeCount: 0 };
    }
    return getKTruss(nodes, edges, k);
  }, [nodes, edges, k]);

/**
 * Hook for cluster quality metrics
 * @param nodes
 * @param edges
 * @param communities
 */
export const useClusterQuality = (nodes: GraphNode[], edges: GraphEdge[], communities: CommunityResult[]): ClusterQualityResult => useMemo(() => {
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

/**
 * Combined hook that provides access to all graph algorithm operations
 * Use this when you need multiple algorithm operations
 * @param nodes
 * @param edges
 */
export const useGraphAlgorithms = (nodes: GraphNode[], edges: GraphEdge[]) => {
  // Memoized statistics
  const statistics = useGraphStatistics(nodes, edges, true);

  // Community detection with controls
  const [communityOptions, setCommunityOptions] = useState<CommunityDetectionOptions>({
    algorithm: 'louvain',
    resolution: 1,
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
};
