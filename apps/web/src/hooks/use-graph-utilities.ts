/**
 * Hook for graph utilities integration with Academic Explorer
 * Provides access to graph manipulation functions with proper store integration
 */

import { useCallback, useMemo } from "react";
import { useGraphStore } from "@/stores/graph-store";
import { graphUtilitiesService, type GraphUtilityResult } from "@academic-explorer/graph";
import { logger } from "@academic-explorer/shared-utils/logger";

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
	const applyUtilityResult = useCallback((result: GraphUtilityResult) => {
		logger.debug("graph", `Applied graph utility: ${result.operation}`, {
			operation: result.operation,
			nodesAfter: result.nodes.length,
			edgesAfter: result.edges.length,
			removedCount: result.removedCount
		});

		setGraphData(result.nodes, result.edges);
	}, [setGraphData]);

	// Utility functions with proper error handling
	const trimLeafNodes = useCallback(() => {
		setLoading(true);
		setError(null);

		try {
			const result = graphUtilitiesService.trimLeafNodes(nodes, edges);
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
	}, [nodes, edges, applyUtilityResult, setLoading, setError]);

	const trimRootNodes = useCallback(() => {
		setLoading(true);
		setError(null);

		try {
			const result = graphUtilitiesService.trimRootNodes(nodes, edges);
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
	}, [nodes, edges, applyUtilityResult, setLoading, setError]);

	const trimDegree1Nodes = useCallback(() => {
		setLoading(true);
		setError(null);

		try {
			const result = graphUtilitiesService.trimDegree1Nodes(nodes, edges);
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
	}, [nodes, edges, applyUtilityResult, setLoading, setError]);

	const removeIsolatedNodes = useCallback(() => {
		setLoading(true);
		setError(null);

		try {
			const result = graphUtilitiesService.removeIsolatedNodes(nodes, edges);
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
	}, [nodes, edges, applyUtilityResult, setLoading, setError]);

	const filterByPublicationYear = useCallback((minYear: number, maxYear: number) => {
		setLoading(true);
		setError(null);

		try {
			const result = graphUtilitiesService.filterByPublicationYear(nodes, edges, minYear, maxYear);
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
	}, [nodes, edges, applyUtilityResult, setLoading, setError]);

	const extractEgoNetwork = useCallback((centerNodeId: string, hops: number = 2) => {
		setLoading(true);
		setError(null);

		try {
			const result = graphUtilitiesService.extractEgoNetwork(nodes, edges, centerNodeId, hops);
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
	}, [nodes, edges, applyUtilityResult, setLoading, setError]);

	const getLargestConnectedComponent = useCallback(() => {
		setLoading(true);
		setError(null);

		try {
			const result = graphUtilitiesService.getLargestConnectedComponent(nodes, edges);
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
	}, [nodes, edges, applyUtilityResult, setLoading, setError]);

	// Analysis functions that don't modify the graph
	const findConnectedComponents = useCallback(() => {
		try {
			return graphUtilitiesService.findConnectedComponents(nodes, edges);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			logger.error("graph", "Find connected components failed", { error: errorMessage });
			throw error;
		}
	}, [nodes, edges]);

	// Graph statistics
	const getGraphStats = useCallback(() => {
		const components = findConnectedComponents();
		const nodesByType: Record<string, number> = {};
		const edgesByType: Record<string, number> = {};

		// Count nodes by type
		nodes.forEach(node => {
			const count = nodesByType[node.type] || 0;
			nodesByType[node.type] = count + 1;
		});

		// Count edges by type
		edges.forEach(edge => {
			const count = edgesByType[edge.type] || 0;
			edgesByType[edge.type] = count + 1;
		});

		return {
			totalNodes: nodes.length,
			totalEdges: edges.length,
			connectedComponents: components.length,
			largestComponentSize: components.length > 0 ? Math.max(...components.map(c => c.length)) : 0,
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