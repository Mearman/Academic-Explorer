/**
 * Hook to fetch raw OpenAlex entity data on demand
 * Uses the proper cache system with Memory → IndexedDB → localStorage → API hierarchy
 */

import type { OpenAlexEntity, QueryParams } from "@academic-explorer/types";
import { cachedOpenAlex } from "@academic-explorer/client";
import { EntityDetectionService } from "@academic-explorer/graph";
import { logger } from "@academic-explorer/utils";
import { useQuery } from "@tanstack/react-query";
import type { EntityType } from "../config/cache";
import { ENTITY_CACHE_TIMES } from "../config/cache";

interface UseRawEntityDataOptions {
  entityId?: string | null;
  enabled?: boolean;
  queryParams?: QueryParams;
}

/**
 * Type guard to check if we have a valid entity type for the query
 */
function isValidEntityData(data: {
  entityId: string | null | undefined;
  entityType: EntityType | null;
}): data is { entityId: string; entityType: EntityType } {
  return !!data.entityId && !!data.entityType;
}

export const useRawEntityData = ({
  options,
}: {
  options: UseRawEntityDataOptions;
}) => {
  const { entityId, enabled = true, queryParams = {} } = options;

  // Detect entity type from ID to use proper cache configuration
  let entityType: EntityType | null = null;
  let detectedEntityId: string | null = null;

  if (entityId) {
    const detection = EntityDetectionService.detectEntity(entityId);

    if (!detection?.entityType) {
      throw new Error(`Unable to detect entity type for: ${entityId}`);
    }

    // Since cache configuration now uses plural forms that match OpenAlex API endpoints,
    // we can use the detected entity type directly if it's a valid cache entity type
    const { entityType: detectedType } = detection;
    if (detectedType in ENTITY_CACHE_TIMES) {
      entityType = detectedType;
    } else {
      throw new Error(
        `Detected entity type "${detection.entityType}" is not a valid cache entity type`,
      );
    }
    detectedEntityId = detection.normalizedId;
    logger.debug(
      "cache",
      "Detected entity type for raw data cache",
      {
        entityId,
        detectedType: detection.entityType,
        cacheType: entityType,
      },
      "useRawEntityData",
    );
  }

  // Always call the hook, but conditionally enable it
  const shouldFetch =
    enabled && isValidEntityData({ entityId: detectedEntityId, entityType });

  // Serialize queryParams for use in queryKey to ensure proper cache invalidation
  const queryParamsKey = JSON.stringify(queryParams);

  const query = useQuery({
    queryKey: ["raw-entity", entityType, detectedEntityId, queryParamsKey],
    queryFn: async () => {
      if (!entityType || !detectedEntityId) {
        throw new Error("Entity type and ID required for fetching");
      }

      logger.debug(
        "api",
        "Fetching raw entity data via cached client",
        {
          entityType,
          entityId: detectedEntityId,
          queryParams,
        },
        "useRawEntityData",
      );

      try {
        // Use the cached client which provides multi-tier caching
        const result = await cachedOpenAlex.getById<OpenAlexEntity>({
          endpoint: entityType,
          id: detectedEntityId,
          params: queryParams,
        });

        logger.debug(
          "api",
          "Successfully fetched raw entity data via cached client",
          {
            entityType,
            entityId: detectedEntityId,
            hasData: !!result,
          },
          "useRawEntityData",
        );

        return result;
      } catch (error) {
        logger.error(
          "api",
          "Failed to fetch raw entity data via cached client",
          {
            entityType,
            entityId: detectedEntityId,
            error: error instanceof Error ? error.message : "Unknown error",
          },
          "useRawEntityData",
        );
        throw error;
      }
    },
    enabled: shouldFetch,
    staleTime: entityType
      ? ENTITY_CACHE_TIMES[entityType].stale
      : ENTITY_CACHE_TIMES.works.stale,
    gcTime: entityType
      ? ENTITY_CACHE_TIMES[entityType].gc
      : ENTITY_CACHE_TIMES.works.gc,
  });

  return {
    ...query,
    // Add convenience properties
    entityType,
    entityId: detectedEntityId,
  };
};
