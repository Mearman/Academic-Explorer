/**
 * Utilities for working with static data
 */

import { staticDataProvider, type StaticEntityType } from "@/lib/api/static-data-provider";
import type { EntityType as OpenAlexEntityType } from "@/lib/openalex/types";

/**
 * Entity type mappings
 */
export const OPENALEX_TO_STATIC_TYPE_MAP: Partial<Record<OpenAlexEntityType, StaticEntityType>> = {
  "works": "works",
  "authors": "authors",
  "institutions": "institutions",
  "topics": "topics",
  "publishers": "publishers",
  "funders": "funders"
} as const;

export const STATIC_TO_OPENALEX_TYPE_MAP: Record<StaticEntityType, OpenAlexEntityType> = {
  "works": "works",
  "authors": "authors",
  "institutions": "institutions",
  "topics": "topics",
  "publishers": "publishers",
  "funders": "funders"
} as const;

/**
 * Check if an OpenAlex entity type has static data support
 */
export function hasStaticDataSupport(entityType: OpenAlexEntityType): boolean {
  return entityType in OPENALEX_TO_STATIC_TYPE_MAP;
}

/**
 * Convert OpenAlex entity type to static entity type
 */
export function toStaticEntityType(entityType: OpenAlexEntityType): StaticEntityType | null {
  return OPENALEX_TO_STATIC_TYPE_MAP[entityType] ?? null;
}

/**
 * Convert static entity type to OpenAlex entity type
 */
export function toOpenAlexEntityType(staticType: StaticEntityType): OpenAlexEntityType {
  return STATIC_TO_OPENALEX_TYPE_MAP[staticType];
}

/**
 * Clean OpenAlex ID (remove URL prefix)
 */
export function cleanOpenAlexId(id: string): string {
  return id.replace(/^https?:\/\/openalex\.org\//, "");
}

/**
 * Check if entity is available in static data
 */
export async function isAvailableInStaticData({
  entityType,
  entityId
}: {
  entityType: OpenAlexEntityType;
  entityId: string;
}): Promise<boolean> {
  const staticType = toStaticEntityType(entityType);
  if (!staticType) return false;

  return await staticDataProvider.hasEntity({ entityType: staticType, entityId: cleanOpenAlexId(entityId) });
}

/**
 * Get entity from static data
 */
export async function getFromStaticData({
  entityType,
  entityId
}: {
  entityType: OpenAlexEntityType;
  entityId: string;
}): Promise<unknown> {
  const staticType = toStaticEntityType(entityType);
  if (!staticType) return null;

  return await staticDataProvider.getEntity({ entityType: staticType, entityId: cleanOpenAlexId(entityId) });
}

/**
 * Get all available static entity IDs for a type
 */
export async function getAvailableStaticEntities(
  entityType: OpenAlexEntityType
): Promise<string[]> {
  const staticType = toStaticEntityType(entityType);
  if (!staticType) return [];

  return await staticDataProvider.listAvailableEntities(staticType);
}

/**
 * Get static data statistics
 */
export async function getStaticDataStatistics() {
  return await staticDataProvider.getStatistics();
}

/**
 * Get static data cache statistics
 */
export function getStaticDataCacheStats() {
  return staticDataProvider.getCacheStats();
}

/**
 * Clear static data cache
 */
export function clearStaticDataCache(): void {
  staticDataProvider.clearCache();
}

/**
 * Check if static data is available for any entity type
 */
export async function hasAnyStaticData(): Promise<boolean> {
  const stats = await getStaticDataStatistics();
  return Object.values(stats).some(stat => stat && stat.count > 0);
}

/**
 * Get total static entities count across all types
 */
export async function getTotalStaticEntitiesCount(): Promise<number> {
  const stats = await getStaticDataStatistics();
  return Object.values(stats).reduce((total, stat) => {
    return total + (stat?.count ?? 0);
  }, 0);
}

/**
 * Get static data summary for display
 */
/**
 * Type guard to check if string is a valid StaticEntityType
 */
function isStaticEntityType(type: string): type is StaticEntityType {
  return type in STATIC_TO_OPENALEX_TYPE_MAP;
}

export async function getStaticDataSummary(): Promise<{
  totalEntities: number;
  entityTypes: Array<{
    type: StaticEntityType;
    count: number;
    totalSize: number;
    sizeFormatted: string;
  }>;
  totalSize: number;
  totalSizeFormatted: string;
}> {
  const stats = await getStaticDataStatistics();

  const entityTypes = Object.entries(stats)
    .filter(([, stat]) => stat && stat.count > 0)
    .map(([type, stat]) => {
      if (!stat) {
        throw new Error(`Unexpected null stat for type ${type}`);
      }
      if (!isStaticEntityType(type)) {
        throw new Error(`Invalid entity type: ${type}`);
      }
      return {
        type,
        count: stat.count,
        totalSize: stat.totalSize,
        sizeFormatted: formatBytes(stat.totalSize)
      };
    });

  const totalEntities = entityTypes.reduce((sum, et) => sum + et.count, 0);
  const totalSize = entityTypes.reduce((sum, et) => sum + et.totalSize, 0);

  return {
    totalEntities,
    entityTypes,
    totalSize,
    totalSizeFormatted: formatBytes(totalSize)
  };
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}