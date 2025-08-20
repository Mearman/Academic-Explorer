/**
 * Entity Data Hook with Graph Tracking
 * 
 * Enhanced version of useEntityData that automatically records entity visits
 * and extracts relationships into the graph database system.
 */

import { useEffect, useCallback } from 'react';

import { recordEntityPageView, initializeGraphDatabase } from '@/lib/graph-entity-tracking';
import type { EntityType } from '@/lib/openalex/utils/entity-detection';

import { useEntityData, type UseEntityDataOptions, type EntityData } from './use-entity-data';

/**
 * Hook options with graph tracking configuration
 */
export interface UseEntityDataWithTrackingOptions extends UseEntityDataOptions {
  /** Whether to enable graph tracking (default: true) */
  enableTracking?: boolean;
  
  /** Source of the entity visit (for tracking) */
  visitSource?: 'direct' | 'link' | 'search' | 'related';
  
  /** Additional metadata for tracking */
  trackingMetadata?: Record<string, unknown>;
}

/**
 * Enhanced entity data hook that includes automatic graph tracking
 */
export function useEntityDataWithTracking<T extends EntityData = EntityData>(
  entityId: string | null | undefined,
  entityType?: EntityType,
  options: UseEntityDataWithTrackingOptions = {}
) {
  const {
    enableTracking = true,
    visitSource = 'direct',
    trackingMetadata,
    onSuccess: originalOnSuccess,
    ...dataOptions
  } = options;

  // Enhanced onSuccess callback that includes tracking
  const onSuccessWithTracking = useCallback(async (data: EntityData) => {
    // Call original onSuccess if provided
    if (originalOnSuccess) {
      originalOnSuccess(data);
    }

    // Record entity page view in graph database
    if (enableTracking && entityType) {
      try {
        await recordEntityPageView(
          data,
          entityType,
          visitSource,
          {
            source: 'useEntityDataWithTracking',
            timestamp: new Date().toISOString(),
            ...trackingMetadata,
          }
        );
      } catch (error) {
        console.error('[useEntityDataWithTracking] Failed to record entity page view:', error);
        // Don't throw - tracking errors shouldn't break the UI
      }
    }
  }, [originalOnSuccess, enableTracking, entityType, visitSource, trackingMetadata]);

  // Use the base hook with enhanced onSuccess
  const result = useEntityData<T>({
    entityId,
    entityType,
    options: {
      ...dataOptions,
      onSuccess: onSuccessWithTracking,
    }
  });

  // Initialize graph database on first load
  useEffect(() => {
    if (enableTracking) {
      initializeGraphDatabase().catch(error => {
        console.error('[useEntityDataWithTracking] Failed to initialize graph database:', error);
      });
    }
  }, [enableTracking]);

  return result;
}

/**
 * Specialized hooks with tracking enabled by default
 */

export function useWorkDataWithTracking(
  workId: string | null | undefined,
  options?: UseEntityDataWithTrackingOptions
) {
  return useEntityDataWithTracking(workId, 'W' as EntityType, options);
}

export function useAuthorDataWithTracking(
  authorId: string | null | undefined,
  options?: UseEntityDataWithTrackingOptions
) {
  return useEntityDataWithTracking(authorId, 'A' as EntityType, options);
}

export function useSourceDataWithTracking(
  sourceId: string | null | undefined,
  options?: UseEntityDataWithTrackingOptions
) {
  return useEntityDataWithTracking(sourceId, 'S' as EntityType, options);
}

export function useInstitutionDataWithTracking(
  institutionId: string | null | undefined,
  options?: UseEntityDataWithTrackingOptions
) {
  return useEntityDataWithTracking(institutionId, 'I' as EntityType, options);
}

export function usePublisherDataWithTracking(
  publisherId: string | null | undefined,
  options?: UseEntityDataWithTrackingOptions
) {
  return useEntityDataWithTracking(publisherId, 'P' as EntityType, options);
}

export function useFunderDataWithTracking(
  funderId: string | null | undefined,
  options?: UseEntityDataWithTrackingOptions
) {
  return useEntityDataWithTracking(funderId, 'F' as EntityType, options);
}

export function useTopicDataWithTracking(
  topicId: string | null | undefined,
  options?: UseEntityDataWithTrackingOptions
) {
  return useEntityDataWithTracking(topicId, 'T' as EntityType, options);
}

export function useConceptDataWithTracking(
  conceptId: string | null | undefined,
  options?: UseEntityDataWithTrackingOptions
) {
  return useEntityDataWithTracking(conceptId, 'C' as EntityType, options);
}

export function useContinentDataWithTracking(
  continentId: string | null | undefined,
  options?: UseEntityDataWithTrackingOptions
) {
  return useEntityDataWithTracking(continentId, 'CO' as EntityType, options);
}

export function useKeywordDataWithTracking(
  keywordId: string | null | undefined,
  options?: UseEntityDataWithTrackingOptions
) {
  return useEntityDataWithTracking(keywordId, 'K' as EntityType, options);
}

export function useRegionDataWithTracking(
  regionId: string | null | undefined,
  options?: UseEntityDataWithTrackingOptions
) {
  return useEntityDataWithTracking(regionId, 'R' as EntityType, options);
}