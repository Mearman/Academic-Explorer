/**
 * Graph Algorithms Service
 * Bridges between web app GraphNode/GraphEdge types and the algorithms package
 *
 * @module services/graph-algorithms
 */

import {
  Graph,
  // Analysis
  connectedComponents,
  detectCycle,
  stronglyConnectedComponents,
  topologicalSort,
  // Clustering
  detectCommunities as louvainDetectCommunities,
  leiden,
  labelPropagation,
  infomap,
  // Hierarchical
  hierarchicalClustering,
  // Partitioning
  spectralPartition,
  // Traversal
  bfs,
  dfs,
  // Pathfinding
  dijkstra,
  // Metrics
  calculateModularity,
  calculateConductance,
  calculateDensity,
  calculateCoverageRatio,
  // Decomposition
  kCoreDecomposition,
  corePeripheryDecomposition,
  biconnectedComponents,
  // Extraction
  extractEgoNetwork,
  filterGraph,
  extractInducedSubgraph,
  extractKTruss,
  // Motif Detection
  detectTriangles,
  detectStarPatterns,
  detectCoCitations,
  detectBibliographicCoupling,
  // Types
  type Node as AlgorithmNode,
  type Edge as AlgorithmEdge,
  type Community,
} from '@bibgraph/algorithms';
import type {
  GraphNode,
  GraphEdge,
  EntityType,
  AuthorPosition,
  WeightableEdgeProperty,
} from '@bibgraph/types';

/**
 * Algorithm node type that satisfies the algorithms package requirements
 */
interface AcademicNode extends AlgorithmNode {
  id: string;
  type: string;
  entityType: EntityType;
  label: string;
}

/**
 * Algorithm edge type that satisfies the algorithms package requirements
 */
interface AcademicEdge extends AlgorithmEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight?: number;
}

/**
 * Community detection result with node IDs
 */
export interface CommunityResult {
  id: number;
  nodeIds: string[];
  size: number;
  density: number;
}

/**
 * Shortest path result
 */
export interface PathResult {
  path: string[];
  distance: number;
  found: boolean;
}

/**
 * Connected component result
 */
export interface ComponentResult {
  components: string[][];
  count: number;
}

/**
 * Graph statistics
 */
export interface GraphStatistics {
  nodeCount: number;
  edgeCount: number;
  density: number;
  averageDegree: number;
  isConnected: boolean;
  componentCount: number;
  hasCycles: boolean;
}

/**
 * K-Core decomposition result
 */
export interface KCoreResult {
  nodes: string[];
  k: number;
}

/**
 * Ego network result
 */
export interface EgoNetworkResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  centerNodeId: string;
  radius: number;
}

/**
 * Traversal result from BFS/DFS
 */
export interface TraversalResult {
  visitOrder: string[];
  parents: Map<string, string | null>;
  discovered?: Map<string, number>;
  finished?: Map<string, number>;
}

/**
 * Cycle detection result with details
 */
export interface CycleResult {
  hasCycle: boolean;
  cycle: string[];
}

/**
 * Core-periphery decomposition result
 */
export interface CorePeripheryResult {
  coreNodes: string[];
  peripheryNodes: string[];
  corenessScores: Map<string, number>;
  fitQuality: number;
}

/**
 * Biconnected components result
 */
export interface BiconnectedResult {
  components: Array<{
    id: number;
    nodes: string[];
    isBridge: boolean;
  }>;
  articulationPoints: string[];
}

/**
 * Hierarchical clustering result
 */
export interface HierarchicalClusterResult {
  clusters: CommunityResult[];
  dendrogram: {
    merges: Array<{ cluster1: number; cluster2: number; distance: number }>;
    heights: number[];
  };
}

/**
 * Spectral partitioning result
 */
export interface SpectralPartitionResult {
  partitions: Array<{
    id: number;
    nodeIds: string[];
    size: number;
    edgeCuts: number;
    balance: number;
  }>;
}

/**
 * Triangle motif result
 */
export interface TriangleResult {
  triangles: Array<{
    nodes: [string, string, string];
  }>;
  count: number;
  clusteringCoefficient: number;
}

/**
 * Star pattern result
 */
export interface StarPatternResult {
  patterns: Array<{
    hubId: string;
    leafIds: string[];
    type: 'in' | 'out';
  }>;
  count: number;
}

/**
 * Co-citation pair result
 */
export interface CoCitationResult {
  pairs: Array<{
    paper1Id: string;
    paper2Id: string;
    count: number;
  }>;
}

/**
 * Bibliographic coupling result
 */
export interface BibliographicCouplingResult {
  pairs: Array<{
    paper1Id: string;
    paper2Id: string;
    sharedReferences: number;
  }>;
}

/**
 * K-Truss extraction result
 */
export interface KTrussResult {
  nodes: string[];
  edges: Array<{ source: string; target: string }>;
  k: number;
  nodeCount: number;
  edgeCount: number;
}

/**
 * Cluster quality metrics result
 */
export interface ClusterQualityResult {
  modularity: number;
  avgConductance: number;
  avgDensity: number;
  coverageRatio: number;
  numClusters: number;
}

/**
 * Edge property filter for weighted traversal
 */
export interface EdgePropertyFilter {
  /** Filter by author position */
  authorPosition?: AuthorPosition;
  /** Filter by corresponding author status */
  isCorresponding?: boolean;
  /** Filter by open access status */
  isOpenAccess?: boolean;
  /** Minimum score threshold */
  scoreMin?: number;
  /** Maximum score threshold */
  scoreMax?: number;
}

/**
 * Weight configuration for pathfinding
 */
export interface WeightConfig {
  /** Use edge property as weight */
  property?: WeightableEdgeProperty;
  /** Custom weight function (takes precedence over property) */
  weightFn?: (edge: GraphEdge, source: GraphNode, target: GraphNode) => number;
  /** Invert weights (for "shortest = highest score" scenarios) */
  invert?: boolean;
  /** Default weight when property is undefined */
  defaultWeight?: number;
}

/**
 * Options for weighted pathfinding
 */
export interface WeightedPathOptions {
  /** Weight configuration */
  weight?: WeightConfig;
  /** Filter edges by properties */
  edgeFilter?: EdgePropertyFilter;
  /** Filter nodes by entity type */
  nodeTypes?: EntityType[];
  /** Treat graph as directed */
  directed?: boolean;
}

/**
 * Convert web app GraphNode to algorithm Node
 */
function toAlgorithmNode(node: GraphNode): AcademicNode {
  return {
    id: node.id,
    type: node.entityType,
    entityType: node.entityType,
    label: node.label,
  };
}

/**
 * Convert web app GraphEdge to algorithm Edge
 */
function toAlgorithmEdge(edge: GraphEdge): AcademicEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type,
    weight: edge.weight ?? 1,
  };
}

/**
 * Build a weight function from WeightConfig
 *
 * Priority order:
 * 1. Custom weightFn (if provided)
 * 2. Property-based weight extraction
 * 3. Default weight (defaults to 1)
 */
function buildWeightFunction(
  config?: WeightConfig
): (edge: AcademicEdge, source: AcademicNode, target: AcademicNode) => number {
  if (!config) {
    return () => 1;
  }

  // Custom weight function takes precedence
  if (config.weightFn) {
    const baseFn = config.weightFn;
    if (config.invert) {
      return (edge, source, target) => {
        // Convert to GraphEdge/GraphNode for the user's function
        const weight = baseFn(
          edge as unknown as GraphEdge,
          source as unknown as GraphNode,
          target as unknown as GraphNode
        );
        return 1 / Math.max(weight, 0.001);
      };
    }
    return (edge, source, target) =>
      baseFn(
        edge as unknown as GraphEdge,
        source as unknown as GraphNode,
        target as unknown as GraphNode
      );
  }

  // Property-based weight
  if (config.property) {
    const prop = config.property;
    const defaultWeight = config.defaultWeight ?? 1;

    if (config.invert) {
      return (edge) => {
        const value = ((edge as Record<string, unknown>)[prop] as number | undefined) ?? defaultWeight;
        return 1 / Math.max(value, 0.001);
      };
    }

    return (edge) => {
      return ((edge as Record<string, unknown>)[prop] as number | undefined) ?? defaultWeight;
    };
  }

  return () => config.defaultWeight ?? 1;
}

/**
 * Apply edge property filter to edges
 */
function applyEdgeFilter(
  edges: GraphEdge[],
  filter?: EdgePropertyFilter
): GraphEdge[] {
  if (!filter) return edges;

  return edges.filter((edge) => {
    if (filter.authorPosition !== undefined && edge.authorPosition !== filter.authorPosition) {
      return false;
    }
    if (filter.isCorresponding !== undefined && edge.isCorresponding !== filter.isCorresponding) {
      return false;
    }
    if (filter.isOpenAccess !== undefined && edge.isOpenAccess !== filter.isOpenAccess) {
      return false;
    }
    if (filter.scoreMin !== undefined && (edge.score === undefined || edge.score < filter.scoreMin)) {
      return false;
    }
    if (filter.scoreMax !== undefined && (edge.score === undefined || edge.score > filter.scoreMax)) {
      return false;
    }
    return true;
  });
}

/**
 * Filter nodes by entity type
 */
function applyNodeTypeFilter(
  nodes: GraphNode[],
  nodeTypes?: EntityType[]
): GraphNode[] {
  if (!nodeTypes || nodeTypes.length === 0) return nodes;
  const typeSet = new Set(nodeTypes);
  return nodes.filter((node) => typeSet.has(node.entityType));
}

/**
 * Create an algorithms Graph from web app nodes and edges
 */
export function createGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  directed: boolean = true
): Graph<AcademicNode, AcademicEdge> {
  const graph = new Graph<AcademicNode, AcademicEdge>(directed);

  // Add all nodes first
  for (const node of nodes) {
    const algorithmNode = toAlgorithmNode(node);
    graph.addNode(algorithmNode);
  }

  // Add edges (only if both source and target nodes exist)
  for (const edge of edges) {
    const algorithmEdge = toAlgorithmEdge(edge);
    const result = graph.addEdge(algorithmEdge);
    if (!result.ok && 'error' in result) {
      // Edge references non-existent node, skip it
      console.debug(`Skipping edge ${edge.id}: ${result.error.message}`);
    }
  }

  return graph;
}

/**
 * Detect communities using various clustering algorithms
 */
export function detectCommunities(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: {
    algorithm?: 'louvain' | 'leiden' | 'label-propagation' | 'infomap' | 'spectral' | 'hierarchical';
    resolution?: number;
    numClusters?: number;
    linkage?: 'single' | 'complete' | 'average';
  } = {}
): CommunityResult[] {
  const { algorithm = 'louvain', resolution = 1.0, numClusters = 5, linkage = 'average' } = options;

  // Use undirected graph for community detection
  const graph = createGraph(nodes, edges, false);

  if (graph.getNodeCount() === 0) {
    return [];
  }

  try {
    switch (algorithm) {
      case 'leiden': {
        const result = leiden(graph, { resolution });
        if (result.ok) {
          return result.value.communities.map((community) => ({
            id: community.id,
            nodeIds: Array.from(community.nodes).map((node) => node.id),
            size: community.nodes.size,
            density: 0, // LeidenCommunity has conductance, not density
          }));
        }
        return [];
      }
      case 'label-propagation': {
        const result = labelPropagation(graph);
        if (result.ok) {
          return result.value.clusters.map((cluster, index) => ({
            id: index,
            nodeIds: Array.from(cluster.nodes).map((node) => node.id),
            size: cluster.nodes.size,
            density: 0, // Label propagation doesn't compute density
          }));
        }
        return [];
      }
      case 'infomap': {
        const result = infomap(graph);
        if (result.ok) {
          return result.value.modules.map((module, index) => ({
            id: index,
            nodeIds: Array.from(module.nodes).map((node) => node.id),
            size: module.nodes.size,
            density: 0,
          }));
        }
        return [];
      }
      case 'spectral': {
        const k = Math.min(numClusters, nodes.length);
        if (k < 2) return [];
        const result = spectralPartition(graph, k);
        if (result.ok) {
          return result.value.map((partition) => ({
            id: partition.id,
            nodeIds: Array.from(partition.nodes).map((node) => node.id),
            size: partition.size,
            density: 0,
          }));
        }
        return [];
      }
      case 'hierarchical': {
        const result = hierarchicalClustering(graph, { linkage });
        if (result.ok) {
          const clusters = result.value.dendrogram.getClusters(numClusters);
          return clusters.map((cluster, index) => ({
            id: index,
            nodeIds: Array.from(cluster),
            size: cluster.size,
            density: 0,
          }));
        }
        return [];
      }
      case 'louvain':
      default: {
        const communities = louvainDetectCommunities(graph, { resolution });
        return communities.map((community: Community<AcademicNode>) => ({
          id: community.id,
          nodeIds: Array.from(community.nodes).map((node) => node.id),
          size: community.size,
          density: community.density,
        }));
      }
    }
  } catch (error) {
    console.error('Community detection error:', error);
    return [];
  }
}

/**
 * Find shortest path between two nodes using Dijkstra's algorithm
 *
 * Supports weighted traversal with edge property filtering and node type filtering.
 *
 * @example
 * ```typescript
 * // Simple unweighted path
 * const result = findShortestPath(nodes, edges, 'A', 'B');
 *
 * // Weighted by score (inverted so higher score = shorter path)
 * const result = findShortestPath(nodes, edges, 'A', 'B', {
 *   weight: { property: 'score', invert: true },
 * });
 *
 * // Path through authors only
 * const result = findShortestPath(nodes, edges, 'A', 'B', {
 *   nodeTypes: ['author'],
 * });
 *
 * // Filter edges by score threshold
 * const result = findShortestPath(nodes, edges, 'A', 'B', {
 *   edgeFilter: { scoreMin: 0.5 },
 * });
 * ```
 */
export function findShortestPath(
  nodes: GraphNode[],
  edges: GraphEdge[],
  sourceId: string,
  targetId: string,
  options?: WeightedPathOptions | boolean
): PathResult {
  // Handle legacy boolean `directed` parameter for backward compatibility
  const opts: WeightedPathOptions = typeof options === 'boolean'
    ? { directed: options }
    : (options ?? {});

  const directed = opts.directed ?? true;

  // Apply node type filtering
  const filteredNodes = applyNodeTypeFilter(nodes, opts.nodeTypes);
  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));

  // Verify source and target exist in filtered nodes
  if (opts.nodeTypes && opts.nodeTypes.length > 0) {
    if (!filteredNodeIds.has(sourceId) || !filteredNodeIds.has(targetId)) {
      return {
        path: [],
        distance: Infinity,
        found: false,
      };
    }
  }

  // Apply edge filtering - also remove edges referencing filtered-out nodes
  let filteredEdges = applyEdgeFilter(edges, opts.edgeFilter);
  if (opts.nodeTypes && opts.nodeTypes.length > 0) {
    filteredEdges = filteredEdges.filter(
      e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
    );
  }

  // Build weight function from config
  const weightFn = buildWeightFunction(opts.weight);

  const graph = createGraph(filteredNodes, filteredEdges, directed);

  const result = dijkstra(graph, sourceId, targetId, weightFn);

  // dijkstra returns Result<Option<Path>, GraphError>
  if (!result.ok) {
    return {
      path: [],
      distance: Infinity,
      found: false,
    };
  }

  // result.value is Option<Path>
  const pathOption = result.value;
  if (!pathOption.some) {
    return {
      path: [],
      distance: Infinity,
      found: false,
    };
  }

  // Path type has: nodes, edges, totalWeight
  const pathValue = pathOption.value;
  return {
    path: pathValue.nodes.map((node) => node.id),
    distance: pathValue.totalWeight,
    found: pathValue.nodes.length > 0,
  };
}

/**
 * Find connected components in the graph
 */
export function findComponents(
  nodes: GraphNode[],
  edges: GraphEdge[],
  directed: boolean = false
): ComponentResult {
  const graph = createGraph(nodes, edges, directed);

  const result = connectedComponents(graph);

  if (!result.ok) {
    return {
      components: [],
      count: 0,
    };
  }

  return {
    components: result.value.map((component) =>
      component.nodes.map((node) => node.id)
    ),
    count: result.value.length,
  };
}

/**
 * Find strongly connected components (for directed graphs)
 */
export function findStrongComponents(
  nodes: GraphNode[],
  edges: GraphEdge[]
): ComponentResult {
  const graph = createGraph(nodes, edges, true);

  const result = stronglyConnectedComponents(graph);

  if (!result.ok) {
    return {
      components: [],
      count: 0,
    };
  }

  return {
    components: result.value.map((component) =>
      component.nodes.map((node) => node.id)
    ),
    count: result.value.length,
  };
}

/**
 * Check if graph has cycles
 */
export function hasCycles(
  nodes: GraphNode[],
  edges: GraphEdge[],
  directed: boolean = true
): boolean {
  const graph = createGraph(nodes, edges, directed);
  const result = detectCycle(graph);

  if (!result.ok) {
    return false;
  }

  // detectCycle returns Result<Option<CycleInfo>, Error>
  // result.value.some is true if a cycle was found
  return result.value.some;
}

/**
 * Get topological ordering of nodes (for DAGs)
 */
export function getTopologicalOrder(
  nodes: GraphNode[],
  edges: GraphEdge[]
): string[] | null {
  const graph = createGraph(nodes, edges, true);
  const result = topologicalSort(graph);

  if (!result.ok) {
    return null; // Graph has cycles
  }

  return result.value.map((node) => node.id);
}

/**
 * Calculate graph statistics
 */
export function calculateStatistics(
  nodes: GraphNode[],
  edges: GraphEdge[],
  directed: boolean = true
): GraphStatistics {
  const nodeCount = nodes.length;
  const edgeCount = edges.length;

  // Calculate density
  // For directed: density = E / (V * (V - 1))
  // For undirected: density = 2E / (V * (V - 1))
  const maxPossibleEdges = directed
    ? nodeCount * (nodeCount - 1)
    : (nodeCount * (nodeCount - 1)) / 2;
  const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

  // Calculate average degree
  // For undirected: avg degree = 2E / V
  // For directed: avg out-degree = E / V
  const averageDegree = nodeCount > 0 ? (directed ? 1 : 2) * edgeCount / nodeCount : 0;

  // Find connected components
  const components = findComponents(nodes, edges, false);
  const isConnected = components.count === 1;

  // Check for cycles
  const cyclic = hasCycles(nodes, edges, directed);

  return {
    nodeCount,
    edgeCount,
    density,
    averageDegree,
    isConnected,
    componentCount: components.count,
    hasCycles: cyclic,
  };
}

/**
 * Calculate modularity score for a given community assignment
 */
export function getModularityScore(
  nodes: GraphNode[],
  edges: GraphEdge[],
  communities: CommunityResult[]
): number {
  const graph = createGraph(nodes, edges, false);

  // Convert CommunityResult back to node sets for modularity calculation
  const nodeIdToCommunity = new Map<string, number>();
  for (const community of communities) {
    for (const nodeId of community.nodeIds) {
      nodeIdToCommunity.set(nodeId, community.id);
    }
  }

  // Build community assignment for modularity calculation
  const communityNodes = new Map<number, Set<AcademicNode>>();
  for (const node of graph.getAllNodes()) {
    const communityId = nodeIdToCommunity.get(node.id) ?? 0;
    if (!communityNodes.has(communityId)) {
      communityNodes.set(communityId, new Set());
    }
    communityNodes.get(communityId)?.add(node);
  }

  // Convert to Community array for modularity calculation
  const communitiesForCalc: Community<AcademicNode>[] = Array.from(communityNodes.entries()).map(
    ([id, nodeSet]) => ({
      id,
      nodes: nodeSet,
      size: nodeSet.size,
      density: 0,
      internalEdges: 0,
      externalEdges: 0,
      modularity: 0,
    })
  );

  return calculateModularity(graph, communitiesForCalc);
}

/**
 * Find k-core decomposition
 */
export function getKCore(
  nodes: GraphNode[],
  edges: GraphEdge[],
  k: number
): KCoreResult {
  const graph = createGraph(nodes, edges, false);
  const result = kCoreDecomposition(graph);

  if (!result.ok) {
    return {
      nodes: [],
      k,
    };
  }

  // Get the k-core from the decomposition result
  const kCore = result.value.cores.get(k);
  if (!kCore) {
    return {
      nodes: [],
      k,
    };
  }

  return {
    nodes: Array.from(kCore.nodes),
    k,
  };
}

/**
 * Extract ego network around a central node
 */
export function getEgoNetwork(
  nodes: GraphNode[],
  edges: GraphEdge[],
  centerId: string,
  radius: number = 1,
  directed: boolean = true
): EgoNetworkResult {
  const graph = createGraph(nodes, edges, directed);
  const result = extractEgoNetwork(graph, {
    seedNodes: [centerId],
    radius,
  });

  if (!result.ok) {
    return {
      nodes: [],
      edges: [],
      centerNodeId: centerId,
      radius,
    };
  }

  const egoGraph = result.value;
  const egoNodeIds = new Set(egoGraph.getAllNodes().map((n) => n.id));

  // Filter original nodes and edges to those in the ego network
  const egoNodes = nodes.filter((n) => egoNodeIds.has(n.id));
  const egoEdges = edges.filter(
    (e) => egoNodeIds.has(e.source) && egoNodeIds.has(e.target)
  );

  return {
    nodes: egoNodes,
    edges: egoEdges,
    centerNodeId: centerId,
    radius,
  };
}

/**
 * Filter graph by node types
 */
export function filterByNodeType(
  nodes: GraphNode[],
  edges: GraphEdge[],
  allowedTypes: EntityType[],
  directed: boolean = true
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const graph = createGraph(nodes, edges, directed);

  const allowedTypesSet = new Set(allowedTypes as string[]);
  // filterGraph takes nodePredicate as a function, not an options object
  const result = filterGraph(
    graph,
    (node: AcademicNode) => allowedTypesSet.has(node.type)
  );

  if (!result.ok) {
    return { nodes: [], edges: [] };
  }

  const filteredGraph = result.value;
  const filteredNodeIds = new Set(filteredGraph.getAllNodes().map((n) => n.id));

  // Return original nodes/edges that match the filter
  const filteredNodes = nodes.filter((n) => filteredNodeIds.has(n.id));
  const filteredEdges = edges.filter(
    (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
  );

  return { nodes: filteredNodes, edges: filteredEdges };
}

/**
 * Extract a subgraph containing only specified node IDs
 */
export function getSubgraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  nodeIds: string[],
  directed: boolean = true
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const graph = createGraph(nodes, edges, directed);
  const result = extractInducedSubgraph(graph, new Set(nodeIds));

  if (!result.ok) {
    return { nodes: [], edges: [] };
  }

  const subGraph = result.value;
  const subNodeIds = new Set(subGraph.getAllNodes().map((n) => n.id));

  const subNodes = nodes.filter((n) => subNodeIds.has(n.id));
  const subEdges = edges.filter(
    (e) => subNodeIds.has(e.source) && subNodeIds.has(e.target)
  );

  return { nodes: subNodes, edges: subEdges };
}

/**
 * Perform breadth-first search traversal
 */
export function performBFS(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startId: string,
  directed: boolean = true
): TraversalResult | null {
  const graph = createGraph(nodes, edges, directed);
  const result = bfs(graph, startId);

  if (!result.ok) {
    return null;
  }

  return {
    visitOrder: result.value.visitOrder.map((node) => node.id),
    parents: result.value.parents,
  };
}

/**
 * Perform depth-first search traversal
 */
export function performDFS(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startId: string,
  directed: boolean = true
): TraversalResult | null {
  const graph = createGraph(nodes, edges, directed);
  const result = dfs(graph, startId);

  if (!result.ok) {
    return null;
  }

  return {
    visitOrder: result.value.visitOrder.map((node) => node.id),
    parents: result.value.parents,
    discovered: result.value.discovered,
    finished: result.value.finished,
  };
}

/**
 * Detect cycles with detailed information
 */
export function getCycleInfo(
  nodes: GraphNode[],
  edges: GraphEdge[],
  directed: boolean = true
): CycleResult {
  const graph = createGraph(nodes, edges, directed);
  const result = detectCycle(graph);

  if (!result.ok || !result.value.some) {
    return {
      hasCycle: false,
      cycle: [],
    };
  }

  // The cycle info contains nodes in the cycle
  const cycleInfo = result.value.value;
  return {
    hasCycle: true,
    cycle: cycleInfo.nodes.map((node) => node.id),
  };
}

/**
 * Perform core-periphery decomposition
 */
export function getCorePeriphery(
  nodes: GraphNode[],
  edges: GraphEdge[],
  coreThreshold: number = 0.7
): CorePeripheryResult | null {
  const graph = createGraph(nodes, edges, false);
  const result = corePeripheryDecomposition(graph, { coreThreshold });

  if (!result.ok) {
    return null;
  }

  return {
    coreNodes: Array.from(result.value.structure.coreNodes),
    peripheryNodes: Array.from(result.value.structure.peripheryNodes),
    corenessScores: result.value.structure.corenessScores,
    fitQuality: result.value.structure.fitQuality,
  };
}

/**
 * Find biconnected components (for undirected graphs)
 */
export function getBiconnectedComponents(
  nodes: GraphNode[],
  edges: GraphEdge[]
): BiconnectedResult | null {
  // Create undirected graph by adding reverse edges
  const graph = createGraph(nodes, edges, false);
  const result = biconnectedComponents(graph);

  if (!result.ok) {
    return null;
  }

  return {
    components: result.value.components.map((comp) => ({
      id: comp.id,
      nodes: Array.from(comp.nodes),
      isBridge: comp.isBridge,
    })),
    articulationPoints: Array.from(result.value.articulationPoints),
  };
}

/**
 * Detect triangle motifs in the graph
 */
export function getTriangles(
  nodes: GraphNode[],
  edges: GraphEdge[]
): TriangleResult {
  const graph = createGraph(nodes, edges, false);
  const result = detectTriangles(graph);

  if (!result.ok) {
    return {
      triangles: [],
      count: 0,
      clusteringCoefficient: 0,
    };
  }

  const triangles = result.value.map((t) => ({
    nodes: [t.nodes[0].id, t.nodes[1].id, t.nodes[2].id] as [string, string, string],
  }));

  // Calculate global clustering coefficient
  // C = 3 * triangles / connected_triples
  const triangleCount = triangles.length;

  // Estimate connected triples from degrees
  let connectedTriples = 0;
  const degreeMap = new Map<string, number>();
  for (const edge of edges) {
    degreeMap.set(edge.source, (degreeMap.get(edge.source) ?? 0) + 1);
    degreeMap.set(edge.target, (degreeMap.get(edge.target) ?? 0) + 1);
  }
  for (const degree of degreeMap.values()) {
    connectedTriples += (degree * (degree - 1)) / 2;
  }

  const clusteringCoefficient = connectedTriples > 0
    ? (3 * triangleCount) / connectedTriples
    : 0;

  return {
    triangles,
    count: triangleCount,
    clusteringCoefficient: Math.min(1, clusteringCoefficient),
  };
}

/**
 * Detect star patterns (hub nodes with many connections)
 */
export function getStarPatterns(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: { minDegree?: number; type?: 'in' | 'out' } = {}
): StarPatternResult {
  const { minDegree = 5, type = 'out' } = options;
  const graph = createGraph(nodes, edges, true);
  const result = detectStarPatterns(graph, { minDegree, type });

  if (!result.ok) {
    return {
      patterns: [],
      count: 0,
    };
  }

  return {
    patterns: result.value.map((star) => ({
      hubId: star.hub.id,
      leafIds: star.leaves.map((leaf) => leaf.id),
      type: star.type,
    })),
    count: result.value.length,
  };
}

/**
 * Detect co-citation pairs (papers cited together)
 */
export function getCoCitations(
  nodes: GraphNode[],
  edges: GraphEdge[],
  minCount: number = 2
): CoCitationResult {
  const graph = createGraph(nodes, edges, true);
  const result = detectCoCitations(graph, { minCount });

  if (!result.ok) {
    return {
      pairs: [],
    };
  }

  return {
    pairs: result.value.map((pair) => ({
      paper1Id: pair.paper1.id,
      paper2Id: pair.paper2.id,
      count: pair.count,
    })),
  };
}

/**
 * Detect bibliographic coupling pairs (papers citing same references)
 */
export function getBibliographicCoupling(
  nodes: GraphNode[],
  edges: GraphEdge[],
  minShared: number = 2
): BibliographicCouplingResult {
  const graph = createGraph(nodes, edges, true);
  const result = detectBibliographicCoupling(graph, { minShared });

  if (!result.ok) {
    return {
      pairs: [],
    };
  }

  return {
    pairs: result.value.map((pair) => ({
      paper1Id: pair.paper1.id,
      paper2Id: pair.paper2.id,
      sharedReferences: pair.sharedReferences,
    })),
  };
}

/**
 * Extract k-truss subgraph (edges in at least k-2 triangles)
 */
export function getKTruss(
  nodes: GraphNode[],
  edges: GraphEdge[],
  k: number = 3
): KTrussResult {
  const graph = createGraph(nodes, edges, false);
  const result = extractKTruss(graph, { k });

  if (!result.ok) {
    return {
      nodes: [],
      edges: [],
      k,
      nodeCount: 0,
      edgeCount: 0,
    };
  }

  const trussNodes = result.value.getAllNodes().map((n) => n.id);
  const trussEdges = result.value.getAllEdges().map((e) => ({
    source: e.source,
    target: e.target,
  }));

  return {
    nodes: trussNodes,
    edges: trussEdges,
    k,
    nodeCount: trussNodes.length,
    edgeCount: trussEdges.length,
  };
}

/**
 * Calculate cluster quality metrics for a community assignment
 */
export function getClusterQuality(
  nodes: GraphNode[],
  edges: GraphEdge[],
  communities: CommunityResult[]
): ClusterQualityResult {
  const graph = createGraph(nodes, edges, false);

  // Convert CommunityResult to node sets for metrics
  const nodeSets: Set<AcademicNode>[] = [];
  for (const community of communities) {
    const nodeSet = new Set<AcademicNode>();
    for (const nodeId of community.nodeIds) {
      const node = graph.getNode(nodeId);
      if (node.some) {
        nodeSet.add(node.value);
      }
    }
    nodeSets.push(nodeSet);
  }

  // Calculate individual metrics
  let totalConductance = 0;
  let totalDensity = 0;

  for (const nodeSet of nodeSets) {
    totalConductance += calculateConductance(graph, nodeSet);
    totalDensity += calculateDensity(graph, nodeSet);
  }

  const avgConductance = nodeSets.length > 0 ? totalConductance / nodeSets.length : 0;
  const avgDensity = nodeSets.length > 0 ? totalDensity / nodeSets.length : 0;
  const coverageRatio = calculateCoverageRatio(graph, nodeSets);
  const modularity = getModularityScore(nodes, edges, communities);

  return {
    modularity,
    avgConductance,
    avgDensity,
    coverageRatio,
    numClusters: communities.length,
  };
}

/**
 * Get all algorithms available
 */
export const AVAILABLE_ALGORITHMS = {
  clustering: ['louvain', 'leiden', 'label-propagation', 'infomap', 'spectral', 'hierarchical'] as const,
  analysis: ['connected-components', 'strongly-connected-components', 'cycle-detection', 'topological-sort'] as const,
  traversal: ['bfs', 'dfs'] as const,
  pathfinding: ['dijkstra'] as const,
  decomposition: ['k-core', 'core-periphery', 'biconnected', 'k-truss'] as const,
  extraction: ['ego-network', 'filter', 'subgraph'] as const,
  motifs: ['triangles', 'star-patterns', 'co-citations', 'bibliographic-coupling'] as const,
  metrics: ['modularity', 'conductance', 'density', 'coverage'] as const,
} as const;

export type ClusteringAlgorithm = typeof AVAILABLE_ALGORITHMS.clustering[number];
export type AnalysisAlgorithm = typeof AVAILABLE_ALGORITHMS.analysis[number];
export type TraversalAlgorithm = typeof AVAILABLE_ALGORITHMS.traversal[number];
export type PathfindingAlgorithm = typeof AVAILABLE_ALGORITHMS.pathfinding[number];
export type DecompositionAlgorithm = typeof AVAILABLE_ALGORITHMS.decomposition[number];
export type ExtractionAlgorithm = typeof AVAILABLE_ALGORITHMS.extraction[number];
export type MotifAlgorithm = typeof AVAILABLE_ALGORITHMS.motifs[number];
export type MetricAlgorithm = typeof AVAILABLE_ALGORITHMS.metrics[number];
