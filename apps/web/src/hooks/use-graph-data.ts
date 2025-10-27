/**
 * React hook for graph data operations
 * Provides a clean interface for loading and manipulating graph data
 * Works with or without visualization worker for maximum compatibility
 */

import { createGraphDataService } from "../services/graph-data-service";
import { useGraphStore, graphStore } from "@/stores/graph-store";
import type {
  EntityType,
  ExpansionOptions,
  SearchOptions,
} from "@academic-explorer/graph";
import { logError, logger } from "@academic-explorer/utils/logger";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

export function useGraphData() {
  const queryClient = useQueryClient();
  const service = useMemo(
    () => createGraphDataService(queryClient),
    [queryClient],
  );
  const { isLoading, error } = useGraphStore();

  // CRITICAL: No worker dependency to prevent infinite loops
  // All operations use the service directly for maximum stability

  const loadEntity = useCallback(
    async (entityId: string) => {
      try {
        await service.loadEntityGraph(entityId);
      } catch (err) {
        logError(
          logger,
          "Failed to load entity in graph data hook",
          err,
          "useGraphData",
          "graph",
        );
      }
    },
    [service],
  );

  const loadEntityIntoGraph = useCallback(
    async (entityId: string) => {
      try {
        await service.loadEntityIntoGraph(entityId);
      } catch (err) {
        logError(
          logger,
          "Failed to load entity into graph in graph data hook",
          err,
          "useGraphData",
          "graph",
        );
      }
    },
    [service],
  );

  const loadEntityIntoRepository = useCallback(
    async (entityId: string) => {
      try {
        await service.loadEntityIntoRepository(entityId);
      } catch (err) {
        logError(
          logger,
          "Failed to load entity into repository in graph data hook",
          err,
          "useGraphData",
          "repository",
        );
      }
    },
    [service],
  );

  const expandNode = useCallback(
    async ({
      nodeId,
      options,
    }: {
      nodeId: string;
      options?: Partial<ExpansionOptions>;
    }) => {
      logger.debug("graph", "useGraphData.expandNode called", {
        nodeId,
        options,
      });

      try {
        const store = graphStore.getState();

        // Get the node to expand
        const node = store.nodes[nodeId];
        logger.debug("graph", "Node found, expanding via service", {
          nodeId,
          nodeType: node.entityType,
        });

        // Direct service call - no worker dependency
        graphStore.setLoading(true);
        try {
          await service.expandNode({ nodeId, options });

          // Recalculate depths after expansion using first pinned node
          const pinnedNodes = Object.keys(store.pinnedNodes);
          const firstPinnedNodeId = pinnedNodes[0];
          if (firstPinnedNodeId) {
            graphStore.calculateNodeDepths();
          }

          logger.debug(
            "graph",
            "Node expansion completed via service",
            { nodeId },
            "useGraphData",
          );
        } catch (err) {
          logger.error(
            "graph",
            "Service expansion failed",
            {
              nodeId,
              error: err instanceof Error ? err.message : "Unknown error",
            },
            "useGraphData",
          );
          logError(
            logger,
            "Failed to expand node via service",
            err,
            "useGraphData",
            "graph",
          );
          graphStore.setError(
            err instanceof Error ? err.message : "Failed to expand node",
          );
        } finally {
          graphStore.setLoading(false);
        }
      } catch (error) {
        logger.error(
          "graph",
          "useGraphData.expandNode ERROR",
          {
            nodeId,
            error: error instanceof Error ? error.message : String(error),
          },
          "useGraphData",
        );
      }
    },
    [service],
  );

  const expandAllNodesOfType = useCallback(
    async ({
      entityType,
      options,
    }: {
      entityType: EntityType;
      options?: {
        depth?: number;
        limit?: number;
        force?: boolean;
      };
    }) => {
      const store = graphStore.getState();
      graphStore.setLoading(true);

      // Use default depth if store doesn't have traversalDepth
      const depth = options?.depth ?? (store.traversalDepth || 2);
      const limit = options?.limit ?? 10;
      const force = options?.force ?? true;

      // logger.debug("graph", "expandAllNodesOfType called", {
      // 	entityType,
      // 	depth,
      // 	limit,
      // 	force
      // }, "useGraphData");

      try {
        await service.expandAllNodesOfType(entityType, {
          depth,
          limit,
          force,
        });

        // Optionally recalculate depths if the method exists
        const pinnedNodes = Object.keys(store.pinnedNodes);
        const firstPinnedNodeId = pinnedNodes[0];
        if (firstPinnedNodeId) {
          graphStore.calculateNodeDepths();
        }

        // logger.debug("graph", "expandAllNodesOfType completed successfully", {
        // 	entityType
        // }, "useGraphData");
      } catch (err) {
        // logger.error("graph", "expandAllNodesOfType failed", {
        // 	entityType,
        // 	error: err instanceof Error ? err.message : "Unknown error"
        // }, "useGraphData");
        // logError(logger, "Failed to expand all nodes of type in graph data hook", err, "useGraphData", "graph");
        graphStore.setError(
          err instanceof Error
            ? err.message
            : `Failed to expand all ${entityType} nodes`,
        );
      } finally {
        graphStore.setLoading(false);
      }
    },
    [service],
  );

  const search = useCallback(
    async (query: string, options?: Partial<SearchOptions>) => {
      const searchOptions: SearchOptions = {
        query,
        entityTypes: options?.entityTypes ?? [
          "works",
          "authors",
          "sources",
          "institutions",
        ],
        includeExternalIds: options?.includeExternalIds ?? true,
        preferExternalIdResults: options?.preferExternalIdResults ?? false,
        limit: options?.limit ?? 20,
      };

      try {
        await service.searchAndVisualize({ query, options: searchOptions });
      } catch (err) {
        logError(
          logger,
          "Failed to perform graph search operation",
          err,
          "useGraphData",
          "graph",
        );
      }
    },
    [service],
  );

  const loadAllCachedNodes = useCallback(() => {
    try {
      service.loadAllCachedNodes();
    } catch (err) {
      logError(
        logger,
        "Failed to load cached nodes in graph data hook",
        err,
        "useGraphData",
        "graph",
      );
    }
  }, [service]);

  const clearGraph = useCallback(() => {
    graphStore.clear();
  }, []);

  const hydrateNode = useCallback(
    async (nodeId: string) => {
      try {
        await service.hydrateNode(nodeId);
      } catch {
        // logError(logger, "Failed to hydrate node in graph data hook", err, "useGraphData", "graph");
      }
    },
    [service],
  );

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
