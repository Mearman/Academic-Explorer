/**
 * Hook for graph utilities integration with Academic Explorer
 * Provides access to graph manipulation functions with proper store integration
 */

import { useCallback, useMemo } from "react";
import { useGraphStore } from "@/stores/graph-store";
import { graphUtilitiesService, type GraphUtilityResult } from "@academic-explorer/graph";
import { logger } from "@academic-explorer/utils/logger";
import type { GraphNode, GraphEdge } from "@academic-explorer/graph";

// Extended result type for graph utility operations
interface GraphOperationResult {
	nodes: GraphNode[];
	edges: GraphEdge[];
	removedCount: number;
	operation: string;
}

// Type guard to check if result has graph operation properties
function isGraphOperationResult(result: unknown): result is GraphOperationResult {
	return (
		typeof result === "object" &&
		result !== null &&
		"nodes" in result &&
		"edges" in result &&
		"removedCount" in result &&
		"operation" in result &&
		Array.isArray((result as GraphOperationResult).nodes) &&
		Array.isArray((result as GraphOperationResult).edges) &&
		typeof (result as GraphOperationResult).removedCount === "number" &&
		typeof (result as GraphOperationResult).operation === "string"
	);
}

// Type guard for GraphUtilityResult with data property
function hasDataProperty(result: GraphUtilityResult): result is GraphUtilityResult & { data: unknown } {
	return "data" in result && result.data != null;
}

export const useGraphUtilities = () => {
	// Get current graph state with stable selectors
	const nodesMap = useGraphStore((state) => state.nodes);
	const edgesMap = useGraphStore((state) => state.edges);
	const setGraphData = useGraphStore((state) => state.setGraphData);
	const setLoading = useGraphStore((state) => state.setLoading);
	const setError = useGraphStore((state) => state.setError);

	// Convert Records to arrays with stable dependencies
	const nodes = useMemo(() => Object.values(nodesMap).filter((node): node is NonNullable<typeof node> => node != null), [nodesMap]);
	const edges = useMemo(() => Object.values(edgesMap).filter((edge): edge is NonNullable<typeof edge> => edge != null), [edgesMap]);

	// Apply utility result to store
	const applyUtilityResult = useCallback((result: GraphUtilityResult | GraphOperationResult) => {
		// Handle direct GraphOperationResult
		if (isGraphOperationResult(result)) {
			logger.debug("graph", `Applied graph utility: ${result.operation}`, {
				operation: result.operation,
				nodesAfter: result.nodes.length,
				edgesAfter: result.edges.length,
				removedCount: result.removedCount
			});
			setGraphData(result.nodes, result.edges);
			return;
		}

		// Handle GraphUtilityResult with data property
		if (hasDataProperty(result) && isGraphOperationResult(result.data)) {
			const operationResult = result.data;
			logger.debug("graph", `Applied graph utility: ${operationResult.operation}`, {
				operation: operationResult.operation,
				nodesAfter: operationResult.nodes.length,
				edgesAfter: operationResult.edges.length,
				removedCount: operationResult.removedCount
			});
			setGraphData(operationResult.nodes, operationResult.edges);
			return;
		}

		// Fallback - log the actual structure for debugging
		logger.warn("graph", "Unexpected result structure from graph utility", { result });
	}, [setGraphData]);

	// Safe method caller for graph utilities service
	const callServiceMethod = useCallback((
		methodName: string,
		args: unknown[],
		_operationName: string
	): GraphOperationResult | GraphUtilityResult => {
		const service = graphUtilitiesService as unknown as Record<string, unknown>;

		if (typeof service[methodName] === "function") {
			const method = service[methodName] as (...args: unknown[]) => unknown;
			return method(...args) as GraphOperationResult | GraphUtilityResult;
		}

		// Return a stub result if method doesn't exist
		logger.warn("graph", `Method ${methodName} not available on graphUtilitiesService`);
		return {
			success: false,
			message: `Method ${methodName} not implemented`,
			errors: [`${methodName} is not available on the current graph utilities service`]
		} as GraphUtilityResult;
	}, []);

	// Utility functions with proper error handling
	const trimLeafNodes = useCallback(() => {
		setLoading(true);
		setError(null);

		try {
			const result = callServiceMethod("trimLeafNodes", [nodes, edges], "trimLeafNodes");
			applyUtilityResult(result);
			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			logger.error("graph", "Trim leaf nodes failed", { error: errorMessage });
			setError(`Failed to trim leaf nodes: ${errorMessage}`);
			throw error;
		} finally {
			setLoading(false);
		}
	}, [nodes, edges, applyUtilityResult, setLoading, setError, callServiceMethod]);

	const trimRootNodes = useCallback(() => {
		setLoading(true);
		setError(null);

		try {
			const result = callServiceMethod("trimRootNodes", [nodes, edges], "trimRootNodes");
			applyUtilityResult(result);
			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			logger.error("graph", "Trim root nodes failed", { error: errorMessage });
			setError(`Failed to trim root nodes: ${errorMessage}`);
			throw error;
		} finally {
			setLoading(false);
		}
	}, [nodes, edges, applyUtilityResult, setLoading, setError, callServiceMethod]);

	const trimDegree1Nodes = useCallback(() => {
		setLoading(true);
		setError(null);

		try {
			const result = callServiceMethod("trimDegree1Nodes", [nodes, edges], "trimDegree1Nodes");
			applyUtilityResult(result);
			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			logger.error("graph", "Trim degree 1 nodes failed", { error: errorMessage });
			setError(`Failed to trim degree 1 nodes: ${errorMessage}`);
			throw error;
		} finally {
			setLoading(false);
		}
	}, [nodes, edges, applyUtilityResult, setLoading, setError, callServiceMethod]);

	const removeIsolatedNodes = useCallback(() => {
		setLoading(true);
		setError(null);

		try {
			const result = callServiceMethod("removeIsolatedNodes", [nodes, edges], "removeIsolatedNodes");
			applyUtilityResult(result);
			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			logger.error("graph", "Remove isolated nodes failed", { error: errorMessage });
			setError(`Failed to remove isolated nodes: ${errorMessage}`);
			throw error;
		} finally {
			setLoading(false);
		}
	}, [nodes, edges, applyUtilityResult, setLoading, setError, callServiceMethod]);

	const filterByPublicationYear = useCallback((minYear: number, maxYear: number) => {
		setLoading(true);
		setError(null);

		try {
			const result = callServiceMethod("filterByPublicationYear", [nodes, edges, minYear, maxYear], "filterByPublicationYear");
			applyUtilityResult(result);
			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			logger.error("graph", "Filter by publication year failed", {
				error: errorMessage,
				minYear,
				maxYear
			});
			setError(`Failed to filter by publication year: ${errorMessage}`);
			throw error;
		} finally {
			setLoading(false);
		}
	}, [nodes, edges, applyUtilityResult, setLoading, setError, callServiceMethod]);

	const extractEgoNetwork = useCallback((centerNodeId: string, hops: number = 2) => {
		setLoading(true);
		setError(null);

		try {
			const result = callServiceMethod("extractEgoNetwork", [nodes, edges, centerNodeId, hops], "extractEgoNetwork");
			applyUtilityResult(result);
			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			logger.error("graph", "Extract ego network failed", {
				error: errorMessage,
				centerNodeId,
				hops
			});
			setError(`Failed to extract ego network: ${errorMessage}`);
			throw error;
		} finally {
			setLoading(false);
		}
	}, [nodes, edges, applyUtilityResult, setLoading, setError, callServiceMethod]);

	const getLargestConnectedComponent = useCallback(() => {
		setLoading(true);
		setError(null);

		try {
			const result = callServiceMethod("getLargestConnectedComponent", [nodes, edges], "getLargestConnectedComponent");
			applyUtilityResult(result);
			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			logger.error("graph", "Get largest connected component failed", { error: errorMessage });
			setError(`Failed to get largest connected component: ${errorMessage}`);
			throw error;
		} finally {
			setLoading(false);
		}
	}, [nodes, edges, applyUtilityResult, setLoading, setError, callServiceMethod]);

	// Analysis functions that don't modify the graph
	const findConnectedComponents = useCallback((): string[][] => {
		try {
			const result = callServiceMethod("findConnectedComponents", [nodes, edges], "findConnectedComponents");

			// Handle direct array result
			if (Array.isArray(result)) {
				return result as string[][];
			}

			// Handle GraphUtilityResult with data property
			if (typeof result === "object" && "data" in result && Array.isArray((result as GraphUtilityResult & { data: unknown }).data)) {
				return (result as GraphUtilityResult & { data: string[][] }).data;
			}

			// Fallback for no actual implementation
			logger.warn("graph", "findConnectedComponents returned unexpected result", { result });
			return [];
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			logger.error("graph", "Find connected components failed", { error: errorMessage });
			return []; // Return empty array instead of throwing
		}
	}, [nodes, edges, callServiceMethod]);

	// Graph statistics
	const getGraphStats = useCallback(() => {
		const components = findConnectedComponents();
		const nodesByType: Record<string, number> = {};
		const edgesByType: Record<string, number> = {};

		// Count nodes by type
		nodes.forEach((node) => {
			const count = nodesByType[node.type] ?? 0;
			nodesByType[node.type] = count + 1;
		});

		// Count edges by type
		edges.forEach((edge) => {
			const count = edgesByType[edge.type] ?? 0;
			edgesByType[edge.type] = count + 1;
		});

		return {
			totalNodes: nodes.length,
			totalEdges: edges.length,
			connectedComponents: components.length,
			largestComponentSize: components.length > 0 ? Math.max(...components.map((component: string[]) => component.length)) : 0,
			nodesByType,
			edgesByType,
		};
	}, [nodes, edges, findConnectedComponents]);

	return {
		// Graph modification utilities
		trimLeafNodes,
		trimRootNodes,
		trimDegree1Nodes,
		removeIsolatedNodes,
		filterByPublicationYear,
		extractEgoNetwork,
		getLargestConnectedComponent,

		// Analysis utilities (read-only)
		findConnectedComponents,
		getGraphStats,

		// Current state
		nodeCount: nodes.length,
		edgeCount: edges.length,
	};
};