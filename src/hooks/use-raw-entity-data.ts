/**
 * Hook to fetch raw OpenAlex entity data on demand
 * Uses the proper cache system with Memory → IndexedDB → localStorage → API hierarchy
 */

import { useOpenAlexEntity } from "@/lib/hooks/use-openalex-query";
import { EntityDetector } from "@/lib/graph/utils/entity-detection";
import type { OpenAlexEntity } from "@/lib/openalex/types";
import type { EntityType } from "@/config/cache";
import { ENTITY_CACHE_TIMES } from "@/config/cache";
import { logger } from "@/lib/logger";

interface UseRawEntityDataOptions {
  entityId?: string | null;
  enabled?: boolean;
}


/**
 * Type guard to check if we have a valid entity type for the query
 */
function isValidEntityData(entityId: string | null | undefined, entityType: EntityType | null): entityType is EntityType {
	return !!entityId && !!entityType;
}

export const useRawEntityData = (options: UseRawEntityDataOptions) => {
	const { entityId, enabled = true } = options;

	// Detect entity type from ID to use proper cache configuration
	let entityType: EntityType | null = null;
	let detectedEntityId: string | null = null;

	if (entityId) {
		const detector = new EntityDetector();
		const detection = detector.detectEntityIdentifier(entityId);

		if (!detection.entityType) {
			throw new Error(`Unable to detect entity type for: ${entityId}`);
		}

		// Since cache configuration now uses plural forms that match OpenAlex API endpoints,
		// we can use the detected entity type directly if it's a valid cache entity type
		if (detection.entityType && detection.entityType in ENTITY_CACHE_TIMES) {
			entityType = detection.entityType;
		} else {
			throw new Error(`Detected entity type "${detection.entityType}" is not a valid cache entity type`);
		}
		detectedEntityId = detection.normalizedId;
		logger.debug("cache", "Detected entity type for raw data cache", {
			entityId,
			detectedType: detection.entityType,
			cacheType: entityType
		}, "useRawEntityData");
	}

	// Always call the hook, but conditionally enable it
	const shouldFetch = enabled && isValidEntityData(detectedEntityId, entityType);

	const query = useOpenAlexEntity<OpenAlexEntity>(
		entityType || "works",   // Provide fallback type (won't be used when enabled=false)
		detectedEntityId || "",  // Provide fallback ID (won't be used when enabled=false)
		undefined,               // no params needed for raw data
		{
			enabled: shouldFetch,
			// Query options are already optimized per entity type in useOpenAlexEntity
		}
	);

	// Enhanced logging for cache behavior tracking
	if (query.data) {
		logger.debug("cache", "Raw entity data loaded from cache system", {
			entityId,
			entityType,
			fromCache: !query.isFetching,
			cacheStatus: query.status,
			dataAge: query.dataUpdatedAt ? Date.now() - query.dataUpdatedAt : undefined
		}, "useRawEntityData");
	}

	if (query.error) {
		logger.error("cache", "Failed to fetch raw entity data", {
			entityId,
			entityType,
			error: query.error instanceof Error ? query.error.message : "Unknown error"
		}, "useRawEntityData");
	}

	return query;
};