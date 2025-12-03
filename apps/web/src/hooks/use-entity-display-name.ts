/**
 * Hook to resolve entity display names from OpenAlex
 * Used primarily for sidebar components to show human-readable names
 */

import { cachedOpenAlex } from "@bibgraph/client";
import type { EntityType, OpenAlexEntity } from "@bibgraph/types";
import { logger } from "@bibgraph/utils";
import { useQuery } from "@tanstack/react-query";

interface UseEntityDisplayNameOptions {
  entityId: string;
  entityType: EntityType;
  enabled?: boolean;
}

interface UseEntityDisplayNameResult {
  displayName: string | null;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Fetches and returns the display_name for an OpenAlex entity
 * Uses minimal field selection to reduce bandwidth
 * @param root0
 * @param root0.entityId
 * @param root0.entityType
 * @param root0.enabled
 */
export const useEntityDisplayName = ({
  entityId,
  entityType,
  enabled = true,
}: UseEntityDisplayNameOptions): UseEntityDisplayNameResult => {
  // Skip for special entity IDs (search-, list-, etc.)
  const isSpecialId = entityId.startsWith("search-") || entityId.startsWith("list-");
  const shouldFetch = Boolean(enabled && !isSpecialId && entityId && entityType);

  const query = useQuery<string | null>({
    queryKey: ["entity-display-name", entityType, entityId] as const,
    queryFn: async (): Promise<string | null> => {
      logger.debug(
        "sidebar",
        "Fetching entity display name",
        { entityType, entityId },
        "useEntityDisplayName"
      );

      try {
        // Fetch only the display_name field to minimize bandwidth
        const result = await cachedOpenAlex.getById<OpenAlexEntity>({
          endpoint: entityType,
          id: entityId,
          params: {
            select: ["id", "display_name"],
          },
        });

        return result?.display_name ?? null;
      } catch (error) {
        logger.error(
          "sidebar",
          "Failed to fetch entity display name",
          { entityType, entityId, error },
          "useEntityDisplayName"
        );
        return null;
      }
    },
    enabled: shouldFetch,
    staleTime: 1000 * 60 * 60, // 1 hour - display names rarely change
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: 1, // Only retry once for display names
  });

  return {
    displayName: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
};

