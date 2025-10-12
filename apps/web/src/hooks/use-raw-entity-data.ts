/**
 * Hook to fetch raw OpenAlex entity data on demand
 * Uses the proper cache system with Memory → IndexedDB → localStorage → API hierarchy
 */

import type { OpenAlexEntity, QueryParams } from "@academic-explorer/client";
import { cachedOpenAlex } from "@academic-explorer/client";
import { EntityDetectionService } from "@academic-explorer/graph";
import { logger } from "@academic-explorer/utils";
import { useQuery } from "@tanstack/react-query";
import type { EntityType } from "../config/cache";
import { ENTITY_CACHE_TIMES } from "../config/cache";
import { createRequestPipeline } from "@academic-explorer/client";

interface UseRawEntityDataOptions {
  entityId?: string | null;
  enabled?: boolean;
  queryParams?: QueryParams;
}

/**
 * Type guard to check if we have a valid entity type for the query
 */
function isValidEntityData(
  entityId: string | null | undefined,
  entityType: EntityType | null,
): entityType is EntityType {
  return !!entityId && !!entityType;
}

/**
 * Build OpenAlex API URL similar to the client's buildUrl method
 */
function buildOpenAlexUrl(endpoint: string, params: QueryParams = {}): string {
  const baseUrl = "https://api.openalex.org";
  const url = new URL(`${baseUrl}/${endpoint}`);

  // Add user email if available from cached client config
  const {userEmail} = cachedOpenAlex.getConfig();
  if (userEmail) {
    url.searchParams.set("mailto", userEmail);
  }

  // Build URL string first, then manually append select parameter to avoid encoding commas
  const selectValue = params.select;
  const otherParams = { ...params };
  delete otherParams.select;

  // Add other query parameters
  Object.entries(otherParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        url.searchParams.set(key, value.join(","));
      } else if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        url.searchParams.set(key, String(value));
      }
    }
  });

  // Get the base URL string
  let finalUrl = url.toString();

  // Manually append select parameter with unencoded commas if present
  if (selectValue !== undefined && selectValue !== null) {
    const selectString = Array.isArray(selectValue)
      ? selectValue.join(",")
      : String(selectValue);
    const separator = finalUrl.includes("?") ? "&" : "?";
    finalUrl = `${finalUrl}${separator}select=${selectString}`;
  }

  return finalUrl;
}

export const useRawEntityData = (options: UseRawEntityDataOptions) => {
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
    enabled && isValidEntityData(detectedEntityId, entityType);

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
        "Fetching raw entity data via pipeline",
        {
          entityType,
          entityId: detectedEntityId,
          queryParams,
        },
        "useRawEntityData",
      );

      try {
        // Create pipeline instance for this request
        const pipeline = createRequestPipeline({
          // Disable pipeline-level deduplication because higher-level request
          // services already handle it and returning synthetic dedupe responses
          // breaks consumers expecting actual entity payloads.
          enableDedupe: false,
        });

        // Build endpoint based on entity type
        const endpoint = `${entityType}/${encodeURIComponent(detectedEntityId)}`;
        const url = buildOpenAlexUrl(endpoint, queryParams);

        // Execute request through pipeline
        const response = await pipeline.execute(url);

        // Validate content-type before parsing JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          throw new Error(
            `Expected JSON response but got ${contentType || "unknown content-type"}. Response: ${text.substring(0, 200)}...`,
          );
        }

        const result: OpenAlexEntity = await response.json();

        logger.debug(
          "api",
          "Successfully fetched raw entity data via pipeline",
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
          "Failed to fetch raw entity data via pipeline",
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
