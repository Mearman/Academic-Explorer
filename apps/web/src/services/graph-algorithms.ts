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
  // Pathfinding
  dijkstra,
  // Metrics
  calculateModularity,
  // Decomposition
  kCoreDecomposition,
  // Extraction
  extractEgoNetwork,
  filterGraph,
  extractInducedSubgraph,
  // Types
  type Node as AlgorithmNode,
  type Edge as AlgorithmEdge,
  type Community,
} from '@academic-explorer/algorithms';
import type { GraphNode, GraphEdge, EntityType } from '@academic-explorer/types';

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
    algorithm?: 'louvain' | 'leiden' | 'label-propagation';
    resolution?: number;
  } = {}
): CommunityResult[] {
  const { algorithm = 'louvain', resolution = 1.0 } = options;

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
 */
export function findShortestPath(
  nodes: GraphNode[],
  edges: GraphEdge[],
  sourceId: string,
  targetId: string,
  directed: boolean = true
): PathResult {
  const graph = createGraph(nodes, edges, directed);

  const result = dijkstra(graph, sourceId, targetId);

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
 * Get all algorithms available
 */
export const AVAILABLE_ALGORITHMS = {
  clustering: ['louvain', 'leiden', 'label-propagation'] as const,
  analysis: ['connected-components', 'strongly-connected-components', 'cycle-detection', 'topological-sort'] as const,
  pathfinding: ['dijkstra'] as const,
  decomposition: ['k-core'] as const,
  extraction: ['ego-network', 'filter', 'subgraph'] as const,
} as const;

export type ClusteringAlgorithm = typeof AVAILABLE_ALGORITHMS.clustering[number];
export type AnalysisAlgorithm = typeof AVAILABLE_ALGORITHMS.analysis[number];
export type PathfindingAlgorithm = typeof AVAILABLE_ALGORITHMS.pathfinding[number];
export type DecompositionAlgorithm = typeof AVAILABLE_ALGORITHMS.decomposition[number];
export type ExtractionAlgorithm = typeof AVAILABLE_ALGORITHMS.extraction[number];
