/**
 * Hook for comparing OpenAlex data versions
 * Temporarily available during November 2025 transition period
 */

import { useQuery } from "@tanstack/react-query";
import { client } from "@academic-explorer/client";
import type { Work } from "@academic-explorer/types";
import { settingsStoreInstance } from "@/stores/settings-store";

interface VersionComparisonData {
  currentVersion: '1' | '2' | undefined;
  referencesCount: { v1?: number; v2?: number; difference: number };
  locationsCount: { v1?: number; v2?: number; difference: number };
  hasComparison: boolean;
}

/**
 * Compare metadata between v1 and v2 for a specific work
 * Only active during the November 2025 transition period
 */
export function useVersionComparison(
  workId: string | undefined,
  enabled: boolean = true,
): {
  comparison: VersionComparisonData | null;
  isLoading: boolean;
  error: Error | null;
} {
  const queryResult = useQuery({
    queryKey: ['version-comparison', workId],
    queryFn: async (): Promise<VersionComparisonData | null> => {
      if (!workId) return null;

      // Get current version setting
      const settings = await settingsStoreInstance.getSettings();
      const currentVersion = settings.dataVersion;

      // Fetch work with both versions for comparison
      const fetchWorkWithVersion = async (version: '1' | '2' | undefined) => {
        try {
          return await client.getWork(workId, {
            select: ['id', 'referenced_works_count', 'locations_count'],
            dataVersion: version,
          });
        } catch (error) {
          console.warn(`Failed to fetch work with version ${version}:`, error);
          return null;
        }
      };

      const [workV1, workV2] = await Promise.all([
        fetchWorkWithVersion('1'),
        fetchWorkWithVersion('2'),
      ]);

      if (!workV1 && !workV2) {
        return null;
      }

      const referencesV1 = (workV1 as Work | null)?.referenced_works_count ?? 0;
      const referencesV2 = (workV2 as Work | null)?.referenced_works_count ?? 0;
      const locationsV1 = (workV1 as Work | null)?.locations_count ?? 0;
      const locationsV2 = (workV2 as Work | null)?.locations_count ?? 0;

      return {
        currentVersion,
        referencesCount: {
          v1: referencesV1,
          v2: referencesV2,
          difference: referencesV2 - referencesV1,
        },
        locationsCount: {
          v1: locationsV1,
          v2: locationsV2,
          difference: locationsV2 - locationsV1,
        },
        hasComparison: Boolean(workV1 && workV2),
      };
    },
    enabled: enabled && Boolean(workId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    comparison: queryResult.data ?? null,
    isLoading: queryResult.isLoading,
    error: queryResult.error as Error | null,
  };
}
