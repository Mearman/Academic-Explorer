/**
 * Graph utilities service for Academic Explorer
 * Provides academic research focused graph operations
 */

import type { GraphNode, GraphEdge } from "./types";
import { logger } from "@/lib/logger";
import { getNodeYear } from "./utils/node-helpers";

export interface GraphUtilityResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  removedCount: number;
  operation: string;
}

export class GraphUtilitiesService {
	private logger = logger;

	/**
   * Remove leaf nodes (nodes with no outgoing edges)
   * Essential for academic citation network analysis - removes papers that don't cite others
   */
	trimLeafNodes(nodes: GraphNode[], edges: GraphEdge[]): GraphUtilityResult {
		const startTime = performance.now();
		this.logger.debug("graph", "Starting leaf node trimming", {
			nodeCount: nodes.length,
			edgeCount: edges.length
		});

		// Count outgoing edges for each node
		const outgoingCounts = new Map<string, number>();

		edges.forEach(edge => {
			outgoingCounts.set(edge.source, (outgoingCounts.get(edge.source) || 0) + 1);
		});

		// Filter out leaf nodes (nodes with no outgoing edges)
		const filteredNodes = nodes.filter(node => {
			const outgoingCount = outgoingCounts.get(node.id) || 0;
			return outgoingCount > 0;
		});

		// Remove edges connected to deleted nodes
		const nodeIds = new Set(filteredNodes.map(n => n.id));
		const filteredEdges = edges.filter(edge =>
			nodeIds.has(edge.source) && nodeIds.has(edge.target)
		);

		const removedCount = nodes.length - filteredNodes.length;
		const duration = performance.now() - startTime;

		this.logger.debug("graph", "Leaf node trimming completed", {
			originalNodes: nodes.length,
			filteredNodes: filteredNodes.length,
			removedNodes: removedCount,
			originalEdges: edges.length,
			filteredEdges: filteredEdges.length,
			duration
		});

		return {
			nodes: filteredNodes,
			edges: filteredEdges,
			removedCount,
			operation: "trimLeafNodes"
		};
	}

	/**
   * Remove root nodes (nodes with no incoming edges)
   * Useful for finding cited papers - removes papers that aren't cited by others
   */
	trimRootNodes(nodes: GraphNode[], edges: GraphEdge[]): GraphUtilityResult {
		const startTime = performance.now();
		this.logger.debug("graph", "Starting root node trimming", {
			nodeCount: nodes.length,
			edgeCount: edges.length
		});

		// Count incoming edges for each node
		const incomingCounts = new Map<string, number>();

		edges.forEach(edge => {
			incomingCounts.set(edge.target, (incomingCounts.get(edge.target) || 0) + 1);
		});

		// Filter out root nodes (nodes with no incoming edges)
		const filteredNodes = nodes.filter(node => {
			const incomingCount = incomingCounts.get(node.id) || 0;
			return incomingCount > 0;
		});

		// Remove edges connected to deleted nodes
		const nodeIds = new Set(filteredNodes.map(n => n.id));
		const filteredEdges = edges.filter(edge =>
			nodeIds.has(edge.source) && nodeIds.has(edge.target)
		);

		const removedCount = nodes.length - filteredNodes.length;
		const duration = performance.now() - startTime;

		this.logger.debug("graph", "Root node trimming completed", {
			originalNodes: nodes.length,
			filteredNodes: filteredNodes.length,
			removedNodes: removedCount,
			originalEdges: edges.length,
			filteredEdges: filteredEdges.length,
			duration
		});

		return {
			nodes: filteredNodes,
			edges: filteredEdges,
			removedCount,
			operation: "trimRootNodes"
		};
	}

	/**
   * Remove nodes with degree 1 (exactly 1 total connection)
   * Useful for removing true leaf nodes that have only one connection
   */
	trimDegree1Nodes(nodes: GraphNode[], edges: GraphEdge[]): GraphUtilityResult {
		const startTime = performance.now();
		this.logger.debug("graph", "Starting degree 1 node trimming", {
			nodeCount: nodes.length,
			edgeCount: edges.length
		});

		// Count total degree for each node (incoming + outgoing)
		const degreeCount = new Map<string, number>();

		// Initialize all nodes with degree 0
		nodes.forEach(node => {
			degreeCount.set(node.id, 0);
		});

		// Count connections for each node
		edges.forEach(edge => {
			// Each edge contributes 1 to both source and target degree
			degreeCount.set(edge.source, (degreeCount.get(edge.source) || 0) + 1);
			degreeCount.set(edge.target, (degreeCount.get(edge.target) || 0) + 1);
		});

		// Filter out nodes with exactly degree 1
		const filteredNodes = nodes.filter(node => {
			const totalDegree = degreeCount.get(node.id) || 0;
			return totalDegree !== 1;
		});

		// Remove edges connected to deleted nodes
		const nodeIds = new Set(filteredNodes.map(n => n.id));
		const filteredEdges = edges.filter(edge =>
			nodeIds.has(edge.source) && nodeIds.has(edge.target)
		);

		const removedCount = nodes.length - filteredNodes.length;
		const duration = performance.now() - startTime;

		this.logger.debug("graph", "Degree 1 node trimming completed", {
			originalNodes: nodes.length,
			filteredNodes: filteredNodes.length,
			removedNodes: removedCount,
			originalEdges: edges.length,
			filteredEdges: filteredEdges.length,
			duration
		});

		return {
			nodes: filteredNodes,
			edges: filteredEdges,
			removedCount,
			operation: "trimDegree1Nodes"
		};
	}

	/**
   * Remove isolated nodes (nodes with no connections at all)
   * Cleans up disconnected entities in the academic network
   */
	removeIsolatedNodes(nodes: GraphNode[], edges: GraphEdge[]): GraphUtilityResult {
		const startTime = performance.now();
		this.logger.debug("graph", "Starting isolated node removal", {
			nodeCount: nodes.length,
			edgeCount: edges.length
		});

		// Collect all connected node IDs
		const connectedNodeIds = new Set<string>();
		edges.forEach(edge => {
			connectedNodeIds.add(edge.source);
			connectedNodeIds.add(edge.target);
		});

		// Filter out isolated nodes
		const filteredNodes = nodes.filter(node => connectedNodeIds.has(node.id));
		const removedCount = nodes.length - filteredNodes.length;
		const duration = performance.now() - startTime;

		this.logger.debug("graph", "Isolated node removal completed", {
			originalNodes: nodes.length,
			filteredNodes: filteredNodes.length,
			removedNodes: removedCount,
			duration
		});

		return {
			nodes: filteredNodes,
			edges: edges, // Edges remain unchanged
			removedCount,
			operation: "removeIsolatedNodes"
		};
	}

	/**
   * Filter nodes by publication year (Works entities only)
   * Essential for temporal analysis in academic research
   */
	filterByPublicationYear(nodes: GraphNode[], edges: GraphEdge[], minYear: number, maxYear: number): GraphUtilityResult {
		const startTime = performance.now();
		this.logger.debug("graph", "Starting publication year filtering", {
			nodeCount: nodes.length,
			minYear,
			maxYear
		});

		const filteredNodes = nodes.filter(node => {
			// Only filter Works entities by publication year
			if (node.type === "works") {
				const pubYear = getNodeYear(node);
				if (typeof pubYear === "number") {
					return pubYear >= minYear && pubYear <= maxYear;
				}
				// Keep nodes without year data
				return true;
			}
			// Keep all non-work nodes (authors, institutions, etc.)
			return true;
		});

		// Remove edges connected to deleted nodes
		const nodeIds = new Set(filteredNodes.map(n => n.id));
		const filteredEdges = edges.filter(edge =>
			nodeIds.has(edge.source) && nodeIds.has(edge.target)
		);

		const removedCount = nodes.length - filteredNodes.length;
		const duration = performance.now() - startTime;

		this.logger.debug("graph", "Publication year filtering completed", {
			originalNodes: nodes.length,
			filteredNodes: filteredNodes.length,
			removedNodes: removedCount,
			originalEdges: edges.length,
			filteredEdges: filteredEdges.length,
			duration
		});

		return {
			nodes: filteredNodes,
			edges: filteredEdges,
			removedCount,
			operation: "filterByPublicationYear"
		};
	}

	/**
   * Extract ego network (k-hop neighborhood around selected node)
   * Critical for academic research - focus on specific entity neighborhoods
   */
	extractEgoNetwork(nodes: GraphNode[], edges: GraphEdge[], centerNodeId: string, hops: number = 2): GraphUtilityResult {
		const startTime = performance.now();
		this.logger.debug("graph", "Starting ego network extraction", {
			centerNodeId,
			hops,
			nodeCount: nodes.length
		});

		// Build adjacency list (undirected graph)
		const adjacencyList = new Map<string, Set<string>>();
		nodes.forEach(node => adjacencyList.set(node.id, new Set()));
		edges.forEach(edge => {
			adjacencyList.get(edge.source)?.add(edge.target);
			adjacencyList.get(edge.target)?.add(edge.source);
		});

		// BFS to find k-hop neighborhood
		const egoNodeIds = new Set<string>();
		const queue = [{ nodeId: centerNodeId, distance: 0 }];
		egoNodeIds.add(centerNodeId);

		while (queue.length > 0) {
			const current = queue.shift();
			if (!current) break;
			const { nodeId, distance } = current;

			if (distance < hops) {
				adjacencyList.get(nodeId)?.forEach(neighborId => {
					if (!egoNodeIds.has(neighborId)) {
						egoNodeIds.add(neighborId);
						queue.push({ nodeId: neighborId, distance: distance + 1 });
					}
				});
			}
		}

		const egoNodes = nodes.filter(node => egoNodeIds.has(node.id));
		const egoEdges = edges.filter(edge =>
			egoNodeIds.has(edge.source) && egoNodeIds.has(edge.target)
		);

		const removedCount = nodes.length - egoNodes.length;
		const duration = performance.now() - startTime;

		this.logger.debug("graph", "Ego network extraction completed", {
			originalNodes: nodes.length,
			egoNodes: egoNodes.length,
			removedNodes: removedCount,
			networkSize: egoNodeIds.size,
			duration
		});

		return {
			nodes: egoNodes,
			edges: egoEdges,
			removedCount,
			operation: "extractEgoNetwork"
		};
	}

	/**
   * Find connected components in the graph
   * Useful for identifying separate research clusters
   */
	findConnectedComponents(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[][] {
		const startTime = performance.now();
		this.logger.debug("graph", "Finding connected components", {
			nodeCount: nodes.length,
			edgeCount: edges.length
		});

		// Build adjacency list (undirected graph)
		const adjacencyList = new Map<string, Set<string>>();
		const visited = new Set<string>();
		const components: GraphNode[][] = [];

		nodes.forEach(node => adjacencyList.set(node.id, new Set()));
		edges.forEach(edge => {
			adjacencyList.get(edge.source)?.add(edge.target);
			adjacencyList.get(edge.target)?.add(edge.source);
		});

		// DFS to find components
		const dfs = (nodeId: string, component: GraphNode[]) => {
			visited.add(nodeId);
			const node = nodes.find(n => n.id === nodeId);
			if (node) component.push(node);

			adjacencyList.get(nodeId)?.forEach(neighborId => {
				if (!visited.has(neighborId)) {
					dfs(neighborId, component);
				}
			});
		};

		nodes.forEach(node => {
			if (!visited.has(node.id)) {
				const component: GraphNode[] = [];
				dfs(node.id, component);
				if (component.length > 0) {
					components.push(component);
				}
			}
		});

		const duration = performance.now() - startTime;
		this.logger.debug("graph", "Connected components analysis completed", {
			totalComponents: components.length,
			largestComponent: Math.max(...components.map(c => c.length)),
			smallestComponent: Math.min(...components.map(c => c.length)),
			duration
		});

		return components;
	}

	/**
   * Get largest connected component
   * Focus on the main research network
   */
	getLargestConnectedComponent(nodes: GraphNode[], edges: GraphEdge[]): GraphUtilityResult {
		const components = this.findConnectedComponents(nodes, edges);

		if (components.length === 0) {
			return {
				nodes: [],
				edges: [],
				removedCount: nodes.length,
				operation: "getLargestConnectedComponent"
			};
		}

		// Find largest component
		const largestComponent = components.reduce((largest, current) =>
			current.length > largest.length ? current : largest
		);

		// Filter edges to only include those within the largest component
		const componentNodeIds = new Set(largestComponent.map(n => n.id));
		const componentEdges = edges.filter(edge =>
			componentNodeIds.has(edge.source) && componentNodeIds.has(edge.target)
		);

		const removedCount = nodes.length - largestComponent.length;

		this.logger.debug("graph", "Largest connected component extracted", {
			originalNodes: nodes.length,
			componentNodes: largestComponent.length,
			removedNodes: removedCount,
			totalComponents: components.length
		});

		return {
			nodes: largestComponent,
			edges: componentEdges,
			removedCount,
			operation: "getLargestConnectedComponent"
		};
	}
}

// Singleton instance for use across the application
export const graphUtilitiesService = new GraphUtilitiesService();