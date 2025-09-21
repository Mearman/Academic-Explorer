/**
 * React hook for graph data operations
 * Provides a clean interface for loading and manipulating graph data
 */

import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGraphDataService } from "@/lib/services/service-provider";
import { useGraphStore } from "@/stores/graph-store";
import { useBackgroundWorker } from "@/hooks/use-unified-background-worker";
import { useExpansionSettingsStore } from "@/stores/expansion-settings-store";
import { logger, logError } from "@/lib/logger";
import { safeParseExpansionTarget } from "@/lib/type-guards";
import type { SearchOptions, EntityType } from "@/lib/graph/types";

export function useGraphData() {
	const queryClient = useQueryClient();
	const service = useMemo(() => getGraphDataService(queryClient), [queryClient]);
	const isLoading = useGraphStore((state) => state.isLoading);
	const error = useGraphStore((state) => state.error);

	// Enhanced background worker for data fetching and expansion
	const forceWorker = useBackgroundWorker({
		onExpansionProgress: (nodeId, progress) => {
			logger.debug("graph", "Node expansion progress", { nodeId, progress }, "useGraphData");
		},
		onExpansionComplete: (result) => {
			logger.debug("graph", "Node expansion completed via force worker", {
				nodeId: result.requestId,
				nodesAdded: result.nodes.length,
				edgesAdded: result.edges.length
			}, "useGraphData");
			// The worker has fetched the data, now we need to integrate it into the graph
			// This would typically be handled by a graph service or store
			// TODO: Integrate expansion result into graph store
			// const store = useGraphStore.getState();
			// store.addNodes(result.nodes);
			// store.addEdges(result.edges);
		},
		onExpansionError: (nodeId, error) => {
			logger.error("graph", "Node expansion failed via force worker", { nodeId, error }, "useGraphData");
			const store = useGraphStore.getState();
			store.setError(`Failed to expand node ${nodeId}: ${error}`);
		}
	});


	const loadEntity = useCallback(async (entityId: string) => {
		try {
			await service.loadEntityGraph(entityId);
		} catch (err) {
			logError("Failed to load entity in graph data hook", err, "useGraphData", "graph");
		}
	}, [service]);

	const loadEntityIntoGraph = useCallback(async (entityId: string) => {
		try {
			await service.loadEntityIntoGraph(entityId);
		} catch (err) {
			logError("Failed to load entity into graph in graph data hook", err, "useGraphData", "graph");
		}
	}, [service]);

	const loadEntityIntoRepository = useCallback(async (entityId: string) => {
		try {
			await service.loadEntityIntoRepository(entityId);
		} catch (err) {
			logError("Failed to load entity into repository in graph data hook", err, "useGraphData", "repository");
		}
	}, [service]);

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

		// Check if force worker is ready, with retry logic
		if (!forceWorker.isWorkerReady) {
			logger.warn("graph", "Force worker not ready initially, waiting for readiness", { nodeId }, "useGraphData");

			// Wait a short time for state propagation and retry
			let retryCount = 0;
			const maxRetries = 10;
			const retryDelay = 100; // 100ms

			while (!forceWorker.isWorkerReady && retryCount < maxRetries) {
				await new Promise(resolve => setTimeout(resolve, retryDelay));
				retryCount++;
				logger.warn("graph", "Retry checking worker readiness", {
					nodeId,
					retryCount,
					isReady: forceWorker.isWorkerReady,
					hasWorker: forceWorker.isWorkerReady,
					workerState: typeof forceWorker
				}, "useGraphData");
			}

			// If still not ready after retries, fall back to service
			if (!forceWorker.isWorkerReady) {
				logger.warn("graph", "Force worker not ready after retries, falling back to service", { nodeId, retriesUsed: retryCount }, "useGraphData");

				// Fallback to service
				store.setLoading(true);
				try {
					logger.warn("graph", "About to call service.expandNode", { nodeId, options }, "useGraphData");
					await service.expandNode(nodeId, options);
					logger.warn("graph", "service.expandNode completed", { nodeId }, "useGraphData");

				// Recalculate depths after expansion using first pinned node
				const pinnedNodes = Object.keys(store.pinnedNodes);
				const firstPinnedNodeId = pinnedNodes[0];
				if (firstPinnedNodeId) {
					store.calculateNodeDepths(firstPinnedNodeId);
				}

				logger.debug("graph", "Node expansion completed via service fallback", { nodeId }, "useGraphData");
			} catch (err) {
				logger.error("graph", "Service fallback expansion failed", {
					nodeId,
					error: err instanceof Error ? err.message : "Unknown error"
				}, "useGraphData");
				logError("Failed to expand node via service fallback", err, "useGraphData", "graph");
				store.setError(err instanceof Error ? err.message : "Failed to expand node");
			} finally {
				store.setLoading(false);
			}
			return;
		} else {
			logger.debug("graph", "Worker became ready after retries", { nodeId, retriesUsed: retryCount }, "useGraphData");
		}
	}

	// Get expansion settings for this entity type
		const expansionSettingsStore = useExpansionSettingsStore.getState();
		const expansionTarget = safeParseExpansionTarget(node.type);
		if (!expansionTarget) {
			logger.warn("graph", "Invalid node type for expansion settings", { nodeId, nodeType: node.type }, "useGraphData");
			return;
		}
		const expansionSettings = expansionSettingsStore.getSettings(expansionTarget);

		// Use force worker for expansion
		try {
			logger.debug("graph", "Starting node expansion via force worker", {
				nodeId,
				entityType: node.type,
				options,
				workerReady: forceWorker.isWorkerReady
			}, "useGraphData");

			forceWorker.expandNode(
				nodeId,
				node.entityId,
				node.type,
				options,
				expansionSettings
			);
		} catch (err) {
			logger.error("graph", "Force worker expansion failed", {
				nodeId,
				error: err instanceof Error ? err.message : "Unknown error"
			}, "useGraphData");
			logError("Failed to expand node via force worker", err, "useGraphData", "graph");
			store.setError(err instanceof Error ? err.message : "Failed to expand node");
		}
	}, [forceWorker, service]);

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

		logger.debug("graph", "expandAllNodesOfType called", {
			entityType,
			depth,
			limit,
			force
		}, "useGraphData");

		try {
			await service.expandAllNodesOfType(entityType, {
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

			logger.debug("graph", "expandAllNodesOfType completed successfully", {
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
	}, [service]);

	const search = useCallback(async (query: string, options?: Partial<SearchOptions>) => {
		const searchOptions: SearchOptions = {
			query,
			entityTypes: options?.entityTypes || ["works", "authors", "sources", "institutions"],
			includeExternalIds: options?.includeExternalIds ?? true,
			preferExternalIdResults: options?.preferExternalIdResults ?? false,
			limit: options?.limit || 20,
		};

		try {
			await service.searchAndVisualize(query, searchOptions);
		} catch (err) {
			logError("Failed to perform graph search operation", err, "useGraphData", "graph");
		}
	}, [service]);

	const loadAllCachedNodes = useCallback(() => {
		try {
			service.loadAllCachedNodes();
		} catch (err) {
			logError("Failed to load cached nodes in graph data hook", err, "useGraphData", "graph");
		}
	}, [service]);


	const clearGraph = useCallback(() => {
		const { clear } = useGraphStore.getState();
		clear();
	}, []);

	const hydrateNode = useCallback(async (nodeId: string) => {
		try {
			await service.hydrateNode(nodeId);
		} catch (err) {
			logError("Failed to hydrate node in graph data hook", err, "useGraphData", "graph");
		}
	}, [service]);

	return {
		loadEntity,
		loadEntityIntoGraph,
		loadEntityIntoRepository,
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