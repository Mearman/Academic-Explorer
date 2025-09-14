/**
 * React hook for graph data operations
 * Provides a clean interface for loading and manipulating graph data
 */

import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GraphDataService } from "@/services/graph-data-service";
import { useGraphStore } from "@/stores/graph-store";
import { logger, logError } from "@/lib/logger";
import type { SearchOptions } from "@/lib/graph/types";

export function useGraphData() {
	const queryClient = useQueryClient();
	const service = useRef(new GraphDataService(queryClient));
	const { isLoading, error } = useGraphStore();

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
		store.setLoading(true);

		// Use traversal depth from store if not specified
		const depth = options?.depth ?? store.traversalDepth;
		const limit = options?.limit ?? 10;
		const force = options?.force ?? true; // Default to force expansion for consistent behavior

		logger.info("graph", "expandNode called", {
			nodeId,
			depth,
			limit,
			force
		}, "useGraphData");

		try {
			await service.current.expandNode(nodeId, {
				depth,
				limit,
				force
			});

			// Recalculate depths after expansion using first pinned node
			const pinnedNodes = Array.from(store.pinnedNodes);
			const firstPinnedNodeId = pinnedNodes[0];
			if (firstPinnedNodeId) {
				store.calculateNodeDepths(firstPinnedNodeId);
			}

			logger.info("graph", "expandNode completed successfully", {
				nodeId
			}, "useGraphData");
		} catch (err) {
			logger.error("graph", "expandNode failed", {
				nodeId,
				error: err instanceof Error ? err.message : "Unknown error"
			}, "useGraphData");
			logError("Failed to expand node in graph data hook", err, "useGraphData", "graph");
			store.setError(err instanceof Error ? err.message : "Failed to expand node");
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

	const loadAllCachedNodes = useCallback(async () => {
		try {
			await service.current.loadAllCachedNodes();
		} catch (err) {
			logError("Failed to load cached nodes in graph data hook", err, "useGraphData", "graph");
		}
	}, []);


	const clearGraph = useCallback(() => {
		const { clear } = useGraphStore.getState();
		clear();
	}, []);

	return {
		loadEntity,
		loadEntityIntoGraph,
		loadAllCachedNodes,
		expandNode,
		search,
		clearGraph,
		isLoading,
		error,
	};
}