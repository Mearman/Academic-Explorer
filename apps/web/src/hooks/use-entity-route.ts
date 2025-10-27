/**
 * Real implementation of useEntityRoute hook for entity route pages
 * This replaces the stub in @academic-explorer/utils with actual data fetching
 */

import { useState, useCallback } from "react";
import { useParams, useSearch } from "@tanstack/react-router";
import type { EntityRouteConfig, UseEntityRouteOptions, UseEntityRouteResult } from "@academic-explorer/utils";
import { useRawEntityData } from "./use-raw-entity-data";
import { useGraphData } from "./use-graph-data";
import { useUserInteractions } from "./use-user-interactions";

export function useEntityRoute<T = unknown>(
  config: EntityRouteConfig,
  options: UseEntityRouteOptions = {}
): UseEntityRouteResult<T> {
  const params = useParams({ strict: false }) as Record<string, string>;
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");
  const [isLoadingRandom, setIsLoadingRandom] = useState(false);

  // Extract entity ID from params using the config's paramKey
  const rawId = params[config.paramKey] || "";
  // Safely clean the entity ID - handle undefined/null cases
  const cleanEntityId = rawId ? rawId.replace(/^https?:\/\/(?:.*?)openalex\.org\//, "") : "";

  // Fetch raw entity data using the real hook
  const rawEntityData = useRawEntityData({
    options: {
      entityId: cleanEntityId,
      enabled: !!cleanEntityId && !options.skipRandomEntity,
      queryParams: search as Record<string, string>,
    },
  });

  // Get graph data hooks
  const { loadEntity, loadEntityIntoGraph } = useGraphData();

  // Get user interactions
  const userInteractions = useUserInteractions();

  // Graph data - stub for now, will be implemented when needed
  const graphData = {
    data: null,
    isLoading: false,
    error: null,
  };

  // Mini graph data - stub for now, will be implemented when needed
  const miniGraphData = {
    data: rawEntityData.data,
    isLoading: rawEntityData.isLoading,
    error: rawEntityData.error,
  };

  // Wrap loadEntity to handle string parameter
  const wrappedLoadEntity = useCallback(
    (entity: unknown) => {
      if (typeof entity === "string") {
        loadEntity(entity);
      } else if (entity && typeof entity === "object" && "id" in entity) {
        loadEntity((entity as { id: string }).id);
      }
    },
    [loadEntity]
  );

  // Wrap loadEntityIntoGraph to handle string parameter
  const wrappedLoadEntityIntoGraph = useCallback(
    (entity: unknown) => {
      if (typeof entity === "string") {
        loadEntityIntoGraph(entity);
      } else if (entity && typeof entity === "object" && "id" in entity) {
        loadEntityIntoGraph((entity as { id: string }).id);
      }
    },
    [loadEntityIntoGraph]
  );

  return {
    cleanEntityId,
    entityType: config.entityType,
    viewMode,
    setViewMode,
    isLoadingRandom,
    graphData,
    miniGraphData,
    rawEntityData: {
      data: rawEntityData.data as T | undefined,
      isLoading: rawEntityData.isLoading,
      error: rawEntityData.error,
    },
    userInteractions,
    nodeCount: 0,
    loadEntity: wrappedLoadEntity,
    loadEntityIntoGraph: wrappedLoadEntityIntoGraph,
    routeSearch: search,
  };
}
