/**
 * Hook for graph utilities integration with Academic Explorer
 * Provides access to graph manipulation functions with proper store integration
 */

import { useCallback, useMemo, useState, useEffect } from "react";
import { graphStore } from "@/stores/graph-store";
import {
  graphUtilitiesService,
  type GraphUtilityResult,
} from "@academic-explorer/graph";
import { logger } from "@academic-explorer/utils/logger";
import type { GraphNode, GraphEdge } from "@academic-explorer/graph";

// Constants
const UNKNOWN_ERROR_MESSAGE = "Unknown error";

// Extended result type for graph utility operations
interface GraphOperationResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  removedCount: number;
  operation: string;
}

// Type guard to check if result has graph operation properties
function isGraphOperationResult(
  result: unknown,
): result is GraphOperationResult {
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
function hasDataProperty(
  result: GraphUtilityResult,
): result is GraphUtilityResult & { data: unknown } {
  return "data" in result && result.data != null;
}

export const useGraphUtilities = () => {
  // Get current graph state - using direct store access with reactivity
  const [nodesMap, setNodesMap] = useState(
    (graphStore.getState() as unknown).nodes,
  );
  const [edgesMap, setEdgesMap] = useState(
    (graphStore.getState() as unknown).edges,
  );
  const store = graphStore.getState() as unknown;
  const setGraphData = store.setGraphData;
  const setLoading = store.setLoading;
  const setError = store.setError;

  useEffect(() => {
    return (graphStore as unknown).subscribe((state: unknown) => {
      setNodesMap(state.nodes);
      setEdgesMap(state.edges);
    });
  }, []);

  // Convert Records to arrays with stable dependencies
  const nodes = useMemo(
    () => Object.values(nodesMap) as GraphNode[],
    [nodesMap],
  );
  const edges = useMemo(
    () => Object.values(edgesMap) as GraphEdge[],
    [edgesMap],
  );

  // Apply utility result to store
  const applyUtilityResult = useCallback(
    (result: GraphUtilityResult | GraphOperationResult) => {
      // Handle direct GraphOperationResult
      if (isGraphOperationResult(result)) {
        logger.debug("graph", `Applied graph utility: ${result.operation}`, {
          operation: result.operation,
          nodesAfter: result.nodes.length,
          edgesAfter: result.edges.length,
          removedCount: result.removedCount,
        });
        setGraphData(result.nodes, result.edges);
        return;
      }

      // Handle GraphUtilityResult with data property
      if (hasDataProperty(result) && isGraphOperationResult(result.data)) {
        const operationResult = result.data;
        logger.debug(
          "graph",
          `Applied graph utility: ${operationResult.operation}`,
          {
            operation: operationResult.operation,
            nodesAfter: operationResult.nodes.length,
            edgesAfter: operationResult.edges.length,
            removedCount: operationResult.removedCount,
          },
        );
        setGraphData(operationResult.nodes, operationResult.edges);
        return;
      }

      // Fallback - log the actual structure for debugging
      logger.warn("graph", "Unexpected result structure from graph utility", {
        result,
      });
    },
    [setGraphData],
  );

  // Safe method caller for graph utilities service
  const callServiceMethod = useCallback(
    ({
      methodName,
      args,
    }: {
      methodName: string;
      args: unknown[];
    }): GraphOperationResult | GraphUtilityResult => {
      const service = graphUtilitiesService as unknown as Record<
        string,
        unknown
      >;

      if (typeof service[methodName] === "function") {
        const method = service[methodName] as (...args: unknown[]) => unknown;
        return method(...args) as GraphOperationResult | GraphUtilityResult;
      }

      // Return a stub result if method doesn't exist
      logger.warn(
        "graph",
        `Method ${methodName} not available on graphUtilitiesService`,
      );
      return {
        success: false,
        message: `Method ${methodName} not implemented`,
        errors: [
          `${methodName} is not available on the current graph utilities service`,
        ],
      } as GraphUtilityResult;
    },
    [],
  );

  // Utility functions with proper error handling
  const trimLeafNodes = useCallback(() => {
    setLoading(true);
    setError(null);

    try {
      const result = callServiceMethod({
        methodName: "trimLeafNodes",
        args: [nodes, edges],
        operationName: "trimLeafNodes",
      });
      applyUtilityResult(result);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
      logger.error("graph", "Trim leaf nodes failed", { error: errorMessage });
      setError(`Failed to trim leaf nodes: ${errorMessage}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [
    nodes,
    edges,
    applyUtilityResult,
    setLoading,
    setError,
    callServiceMethod,
  ]);

  const trimRootNodes = useCallback(() => {
    setLoading(true);
    setError(null);

    try {
      const result = callServiceMethod({
        methodName: "trimRootNodes",
        args: [nodes, edges],
        operationName: "trimRootNodes",
      });
      applyUtilityResult(result);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
      logger.error("graph", "Trim root nodes failed", { error: errorMessage });
      setError(`Failed to trim root nodes: ${errorMessage}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [
    nodes,
    edges,
    applyUtilityResult,
    setLoading,
    setError,
    callServiceMethod,
  ]);

  const trimDegree1Nodes = useCallback(() => {
    setLoading(true);
    setError(null);

    try {
      const result = callServiceMethod({
        methodName: "trimDegree1Nodes",
        args: [nodes, edges],
        operationName: "trimDegree1Nodes",
      });
      applyUtilityResult(result);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
      logger.error("graph", "Trim degree 1 nodes failed", {
        error: errorMessage,
      });
      setError(`Failed to trim degree 1 nodes: ${errorMessage}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [
    nodes,
    edges,
    applyUtilityResult,
    setLoading,
    setError,
    callServiceMethod,
  ]);

  const removeIsolatedNodes = useCallback(() => {
    setLoading(true);
    setError(null);

    try {
      const result = callServiceMethod({
        methodName: "removeIsolatedNodes",
        args: [nodes, edges],
        operationName: "removeIsolatedNodes",
      });
      applyUtilityResult(result);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
      logger.error("graph", "Remove isolated nodes failed", {
        error: errorMessage,
      });
      setError(`Failed to remove isolated nodes: ${errorMessage}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [
    nodes,
    edges,
    applyUtilityResult,
    setLoading,
    setError,
    callServiceMethod,
  ]);

  const filterByPublicationYear = useCallback(
    ({ minYear, maxYear }: { minYear: number; maxYear: number }) => {
      setLoading(true);
      setError(null);

      try {
        const result = callServiceMethod({
          methodName: "filterByPublicationYear",
          args: [nodes, edges, minYear, maxYear],
          operationName: "filterByPublicationYear",
        });
        applyUtilityResult(result);
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
        logger.error("graph", "Filter by publication year failed", {
          error: errorMessage,
          minYear,
          maxYear,
        });
        setError(`Failed to filter by publication year: ${errorMessage}`);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [nodes, edges, applyUtilityResult, setLoading, setError, callServiceMethod],
  );

  const extractEgoNetwork = useCallback(
    ({ centerNodeId, hops = 2 }: { centerNodeId: string; hops?: number }) => {
      setLoading(true);
      setError(null);

      try {
        const result = callServiceMethod({
          methodName: "extractEgoNetwork",
          args: [nodes, edges, centerNodeId, hops],
          operationName: "extractEgoNetwork",
        });
        applyUtilityResult(result);
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
        logger.error("graph", "Extract ego network failed", {
          error: errorMessage,
          centerNodeId,
          hops,
        });
        setError(`Failed to extract ego network: ${errorMessage}`);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [nodes, edges, applyUtilityResult, setLoading, setError, callServiceMethod],
  );

  const getLargestConnectedComponent = useCallback(() => {
    setLoading(true);
    setError(null);

    try {
      const result = callServiceMethod({
        methodName: "getLargestConnectedComponent",
        args: [nodes, edges],
        operationName: "getLargestConnectedComponent",
      });
      applyUtilityResult(result);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
      logger.error("graph", "Get largest connected component failed", {
        error: errorMessage,
      });
      setError(`Failed to get largest connected component: ${errorMessage}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [
    nodes,
    edges,
    applyUtilityResult,
    setLoading,
    setError,
    callServiceMethod,
  ]);

  // Analysis functions that don't modify the graph
  const findConnectedComponents = useCallback((): string[][] => {
    try {
      const result = callServiceMethod({
        methodName: "findConnectedComponents",
        args: [nodes, edges],
        operationName: "findConnectedComponents",
      });

      // Handle direct array result
      if (Array.isArray(result)) {
        return result as string[][];
      }

      // Handle GraphUtilityResult with data property
      if (
        typeof result === "object" &&
        "data" in result &&
        Array.isArray((result as GraphUtilityResult & { data: unknown }).data)
      ) {
        return (result as GraphUtilityResult & { data: string[][] }).data;
      }

      // Fallback for no actual implementation
      logger.warn(
        "graph",
        "findConnectedComponents returned unexpected result",
        { result },
      );
      return [];
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
      logger.error("graph", "Find connected components failed", {
        error: errorMessage,
      });
      return []; // Return empty array instead of throwing
    }
  }, [nodes, edges, callServiceMethod]);

  // Cached graph statistics to prevent React 19 infinite loops
  const cachedGraphStats = useMemo(() => {
    // Call findConnectedComponents directly instead of relying on the callback
    // to avoid infinite dependency chain
    let components: string[][] = [];
    try {
      const result = callServiceMethod({
        methodName: "findConnectedComponents",
        args: [nodes, edges],
        operationName: "findConnectedComponents",
      });

      // Handle direct array result
      if (Array.isArray(result)) {
        components = result as string[][];
      } else if (
        typeof result === "object" &&
        "data" in result &&
        Array.isArray((result as GraphUtilityResult & { data: unknown }).data)
      ) {
        components = (result as GraphUtilityResult & { data: string[][] }).data;
      } else {
        logger.warn(
          "graph",
          "findConnectedComponents returned unexpected result in cachedGraphStats",
          { result },
        );
        components = [];
      }
    } catch (error) {
      logger.error(
        "graph",
        "Find connected components failed in cachedGraphStats",
        { error },
      );
      components = [];
    }

    // Calculate node and edge statistics from actual data
    const nodesByType: Record<string, number> = {};
    for (const node of nodes) {
      nodesByType[node.entityType] = (nodesByType[node.entityType] || 0) + 1;
    }

    const edgesByType: Record<string, number> = {};
    for (const edge of edges) {
      edgesByType[edge.type] = (edgesByType[edge.type] || 0) + 1;
    }

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      connectedComponents: components.length,
      largestComponentSize:
        components.length > 0
          ? Math.max(
              ...components.map((component: string[]) => component.length),
            )
          : 0,
      nodesByType,
      edgesByType,
    };
  }, [nodes, edges, callServiceMethod]);

  // Graph statistics getter - returns cached value
  const getGraphStats = useCallback(() => {
    return cachedGraphStats;
  }, [cachedGraphStats]);

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
