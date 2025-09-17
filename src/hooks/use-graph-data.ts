/**
 * React hook for graph data operations
 * Provides a clean interface for loading and manipulating graph data
 */

import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GraphDataService } from "@/services/graph-data-service";
import { useGraphStore } from "@/stores/graph-store";
import { useDataFetchingWorker } from "@/hooks/use-data-fetching-worker";
import { useExpansionSettingsStore } from "@/stores/expansion-settings-store";
import { logger, logError } from "@/lib/logger";
import { setNodeExpanded } from "@/lib/cache/graph-cache";
import type { SearchOptions, EntityType, ExpansionTarget } from "@/lib/graph/types";
import type { ExpandCompletePayload } from "@/workers/data-fetching.worker";

export function useGraphData() {
	const queryClient = useQueryClient();
	const service = useRef(new GraphDataService(queryClient));
	const isLoading = useGraphStore((state) => state.isLoading);
	const error = useGraphStore((state) => state.error);

	// Initialize data fetching worker with callbacks
	const dataFetchingWorker = useDataFetchingWorker({
		onExpandComplete: useCallback((result: ExpandCompletePayload) => {
			const store = useGraphStore.getState();

			// Add new nodes and edges to the graph
			store.addNodes(result.nodes);
			store.addEdges(result.edges);

			// Mark as expanded in cache
			setNodeExpanded(queryClient, result.nodeId, true);

			// Clear node loading state
			store.markNodeAsLoading(result.nodeId, false);

			logger.info("graph", "Worker-based node expansion completed", {
				nodeId: result.nodeId,
				nodesAdded: result.nodes.length,
				edgesAdded: result.edges.length,
				duration: result.statistics?.duration || 0,
				apiCalls: result.statistics?.apiCalls || 0
			}, "useGraphData");

		}, [queryClient]),

		onExpandError: useCallback((nodeId: string, error: string) => {
			const store = useGraphStore.getState();
			store.markNodeAsLoading(nodeId, false);
			store.setError(error);

			logger.error("graph", "Worker-based node expansion failed", {
				nodeId,
				error
			}, "useGraphData");
		}, []),

		onProgress: useCallback((nodeId: string, progress: { completed: number; total: number; stage: string }) => {
			logger.debug("graph", "Node expansion progress", {
				nodeId,
				...progress
			}, "useGraphData");
		}, [])
	});

	const loadEntity = useCallback(async (entityId: string) => {
		try {
			await service.current.loadEntityGraph(entityId);
		} catch (err) {
			logError("Failed to load entity in graph data hook", err, "useGraphData", "graph");
		}
	}, []);

	const loadEntityIntoGraph = useCallback(async (entityId: string) => {
		try {
			await service.current.loadEntityIntoGraph(entityId);
		} catch (err) {
			logError("Failed to load entity into graph in graph data hook", err, "useGraphData", "graph");
		}
	}, []);

	const expandNode = useCallback(async (nodeId: string, options?: {
    depth?: number;
    limit?: number;
    force?: boolean;
  }) => {
		const store = useGraphStore.getState();

		// Get the node to expand
		const node = store.nodes[nodeId];
		if (!node) {
			logger.warn("graph", "Node not found for expansion", { nodeId }, "useGraphData");
			return;
		}

		// Check if worker is ready
		if (!dataFetchingWorker.isWorkerReady) {
			logger.warn("graph", "Data fetching worker not ready, falling back to service", { nodeId }, "useGraphData");

			// Fallback to original service method
			store.setLoading(true);
			try {
				await service.current.expandNode(nodeId, options);

				// Recalculate depths after expansion using first pinned node
				const pinnedNodes = Object.keys(store.pinnedNodes);
				const firstPinnedNodeId = pinnedNodes[0];
				if (firstPinnedNodeId) {
					store.calculateNodeDepths(firstPinnedNodeId);
				}

				logger.info("graph", "Fallback expansion completed", { nodeId }, "useGraphData");
			} catch (err) {
				logger.error("graph", "Fallback expansion failed", {
					nodeId,
					error: err instanceof Error ? err.message : "Unknown error"
				}, "useGraphData");
				logError("Failed to expand node via fallback", err, "useGraphData", "graph");
				store.setError(err instanceof Error ? err.message : "Failed to expand node");
			} finally {
				store.setLoading(false);
			}
			return;
		}

		// Check if expansion is already in progress
		if (dataFetchingWorker.activeRequests.has(nodeId)) {
			logger.info("graph", "Node expansion already in progress", { nodeId }, "useGraphData");
			return;
		}

		// Use traversal depth from store if not specified
		const depth = options?.depth ?? store.traversalDepth;
		const limit = options?.limit ?? 10;
		const force = options?.force ?? true;

		// Get expansion settings for this entity type
		const expansionSettingsStore = useExpansionSettingsStore.getState();
		const expansionTarget = node.type as ExpansionTarget;
		const expansionSettings = expansionSettingsStore.getSettings(expansionTarget);

		// Mark node as loading immediately for visual feedback
		store.markNodeAsLoading(nodeId);

		logger.info("graph", "Starting worker-based node expansion", {
			nodeId,
			entityType: node.type,
			depth,
			limit,
			force,
			workerReady: dataFetchingWorker.isWorkerReady
		}, "useGraphData");

		try {
			// Use worker for non-blocking expansion
			await dataFetchingWorker.expandNode(
				nodeId,
				node.entityId,
				node.type,
				{
					depth,
					limit,
					force
				},
				expansionSettings
			);
		} catch (err) {
			// Worker expansion failed
			store.markNodeAsLoading(nodeId, false);

			logger.error("graph", "Worker-based expansion failed", {
				nodeId,
				error: err instanceof Error ? err.message : "Unknown error"
			}, "useGraphData");

			logError("Failed to expand node via worker", err, "useGraphData", "graph");
			store.setError(err instanceof Error ? err.message : "Failed to expand node");
		}
	}, [dataFetchingWorker]);

	const expandAllNodesOfType = useCallback(async (entityType: EntityType, options?: {
		depth?: number;
		limit?: number;
		force?: boolean;
	}) => {
		const store = useGraphStore.getState();
		store.setLoading(true);

		// Use traversal depth from store if not specified
		const depth = options?.depth ?? store.traversalDepth;
		const limit = options?.limit ?? 10;
		const force = options?.force ?? true;

		logger.info("graph", "expandAllNodesOfType called", {
			entityType,
			depth,
			limit,
			force
		}, "useGraphData");

		try {
			await service.current.expandAllNodesOfType(entityType, {
				depth,
				limit,
				force
			});

			// Recalculate depths after expansion using first pinned node
			const pinnedNodes = Object.keys(store.pinnedNodes);
			const firstPinnedNodeId = pinnedNodes[0];
			if (firstPinnedNodeId) {
				store.calculateNodeDepths(firstPinnedNodeId);
			}

			logger.info("graph", "expandAllNodesOfType completed successfully", {
				entityType
			}, "useGraphData");
		} catch (err) {
			logger.error("graph", "expandAllNodesOfType failed", {
				entityType,
				error: err instanceof Error ? err.message : "Unknown error"
			}, "useGraphData");
			logError("Failed to expand all nodes of type in graph data hook", err, "useGraphData", "graph");
			store.setError(err instanceof Error ? err.message : `Failed to expand all ${entityType} nodes`);
		} finally {
			store.setLoading(false);
		}
	}, []);

	const search = useCallback(async (query: string, options?: Partial<SearchOptions>) => {
		const searchOptions: SearchOptions = {
			query,
			entityTypes: options?.entityTypes || ["works", "authors", "sources", "institutions"],
			includeExternalIds: options?.includeExternalIds ?? true,
			preferExternalIdResults: options?.preferExternalIdResults ?? false,
			limit: options?.limit || 20,
		};

		try {
			await service.current.searchAndVisualize(query, searchOptions);
		} catch (err) {
			logError("Failed to perform graph search operation", err, "useGraphData", "graph");
		}
	}, []);

	const loadAllCachedNodes = useCallback(() => {
		try {
			service.current.loadAllCachedNodes();
		} catch (err) {
			logError("Failed to load cached nodes in graph data hook", err, "useGraphData", "graph");
		}
	}, []);


	const clearGraph = useCallback(() => {
		const { clear } = useGraphStore.getState();
		clear();
	}, []);

	const hydrateNode = useCallback(async (nodeId: string) => {
		try {
			await service.current.hydrateNode(nodeId);
		} catch (err) {
			logError("Failed to hydrate node in graph data hook", err, "useGraphData", "graph");
		}
	}, []);

	return {
		loadEntity,
		loadEntityIntoGraph,
		loadAllCachedNodes,
		expandNode,
		expandAllNodesOfType,
		search,
		clearGraph,
		hydrateNode,
		isLoading,
		error,
	};
}