/**
 * Storage Tier Manager
 * Manages data distribution and access across memory, localStorage, IndexedDB, static, and API tiers
 */

import { logger, logError } from "@/lib/logger";
import {
  StorageTier,
  EntityType,
  StorageTierInterface,
  StorageTierStats,
  CachePolicy
} from "./types";

interface TierAccessStats {
  hits: number;
  misses: number;
  lastAccess: number;
  averageResponseTime: number;
}

export class StorageTierManager {
  private tiers: Map<StorageTier, StorageTierInterface> = new Map();
  private accessStats: Map<StorageTier, TierAccessStats> = new Map();
  private policy: CachePolicy;

  constructor(policy: CachePolicy) {
    this.policy = policy;
    this.initializeStats();
  }

  private initializeStats(): void {
    Object.values(StorageTier).forEach(tier => {
      this.accessStats.set(tier, {
        hits: 0,
        misses: 0,
        lastAccess: 0,
        averageResponseTime: 0
      });
    });
  }

  /**
   * Register a storage tier implementation
   */
  registerTier(tier: StorageTier, implementation: StorageTierInterface): void {
    this.tiers.set(tier, implementation);
    logger.debug("cache", "Registered storage tier", { tier });
  }

  /**
   * Get entity fields with tier-aware optimization
   */
  async getEntityFields<T>(
    entityType: EntityType,
    entityId: string,
    fields: string[]
  ): Promise<{ data: Partial<T>; tier: StorageTier | null }> {
    const tierOrder = this.getOptimalTierOrder();
    const accumulatedData: Partial<T> = {};
    let sourceTier: StorageTier | null = null;
    let remainingFields = [...fields];

    for (const tier of tierOrder) {
      if (remainingFields.length === 0) break;

      const tierImpl = this.tiers.get(tier);
      if (!tierImpl) continue;

      const startTime = performance.now();

      try {
        const tierData = await tierImpl.getEntityFields<T>(entityType, entityId, remainingFields);
        const responseTime = performance.now() - startTime;

        if (tierData && Object.keys(tierData).length > 0) {
          Object.assign(accumulatedData, tierData);
          sourceTier = sourceTier || tier; // Record the first tier that provided data

          // Update remaining fields
          remainingFields = remainingFields.filter(field => !(field in tierData));

          // Update stats
          this.updateTierStats(tier, true, responseTime);

          // Promote hot data to faster tiers
          if (tier !== StorageTier.MEMORY && this.shouldPromoteData(entityType, entityId)) {
            void this.promoteToHotTier(entityType, entityId, Object.keys(tierData));
          }

          logger.debug("cache", "Retrieved entity fields from tier", {
            entityType,
            entityId,
            tier,
            fieldsFound: Object.keys(tierData),
            remainingFields,
            responseTime
          });
        } else {
          this.updateTierStats(tier, false, responseTime);
        }
      } catch (error) {
        this.updateTierStats(tier, false, performance.now() - startTime);
        logError(`Failed to get entity fields from ${tier}`, error, "StorageTierManager", "cache");
      }
    }

    return { data: accumulatedData, tier: sourceTier };
  }

  /**
   * Put entity fields with tier-appropriate storage
   */
  async putEntityFields<T>(
    entityType: EntityType,
    entityId: string,
    data: Partial<T>,
    preferredTier?: StorageTier
  ): Promise<void> {
    const targetTier = preferredTier || this.determineOptimalStorageTier(entityType, entityId, data);
    const tierImpl = this.tiers.get(targetTier);

    if (!tierImpl) {
      logger.warn("cache", "Target storage tier not available", { targetTier, entityType, entityId });
      return;
    }

    try {
      await tierImpl.putEntityFields(entityType, entityId, data);

      logger.debug("cache", "Stored entity fields to tier", {
        entityType,
        entityId,
        tier: targetTier,
        fields: Object.keys(data)
      });

      // Also store field coverage in faster tiers for quick lookup
      if (targetTier !== StorageTier.MEMORY) {
        await this.updateFieldCoverageIndex(entityType, entityId, Object.keys(data));
      }
    } catch (error) {
      logError(`Failed to store entity fields to ${targetTier}`, error, "StorageTierManager", "cache");
    }
  }

  /**
   * Get collection page with tier optimization
   */
  async getCollectionPage(queryKey: string, page: number): Promise<{
    entityIds: string[] | null;
    tier: StorageTier | null;
  }> {
    const tierOrder = this.getOptimalTierOrder();

    for (const tier of tierOrder) {
      const tierImpl = this.tiers.get(tier);
      if (!tierImpl) continue;

      try {
        const entityIds = await tierImpl.getCollectionPage(queryKey, page);
        if (entityIds) {
          this.updateTierStats(tier, true, 0);

          logger.debug("cache", "Retrieved collection page from tier", {
            queryKey,
            page,
            tier,
            entityCount: entityIds.length
          });

          return { entityIds, tier };
        }
      } catch (error) {
        logError(`Failed to get collection page from ${tier}`, error, "StorageTierManager", "cache");
      }
    }

    return { entityIds: null, tier: null };
  }

  /**
   * Put collection page with tier-appropriate storage
   */
  async putCollectionPage(
    queryKey: string,
    page: number,
    entityIds: string[],
    preferredTier?: StorageTier
  ): Promise<void> {
    const targetTier = preferredTier || this.determineCollectionStorageTier(queryKey, entityIds);
    const tierImpl = this.tiers.get(targetTier);

    if (!tierImpl) {
      logger.warn("cache", "Target storage tier not available for collection", { targetTier, queryKey });
      return;
    }

    try {
      await tierImpl.putCollectionPage(queryKey, page, entityIds);

      logger.debug("cache", "Stored collection page to tier", {
        queryKey,
        page,
        tier: targetTier,
        entityCount: entityIds.length
      });
    } catch (error) {
      logError(`Failed to store collection page to ${targetTier}`, error, "StorageTierManager", "cache");
    }
  }

  /**
   * Promote data to faster storage tier
   */
  async promoteToHotTier(entityType: EntityType, entityId: string, fields: string[]): Promise<void> {
    try {
      // Get data from current location
      const { data } = await this.getEntityFields(entityType, entityId, fields);

      if (Object.keys(data).length > 0) {
        // Store in memory tier
        await this.putEntityFields(entityType, entityId, data, StorageTier.MEMORY);

        logger.debug("cache", "Promoted entity data to hot tier", {
          entityType,
          entityId,
          fields,
          targetTier: StorageTier.MEMORY
        });
      }
    } catch (error) {
      logError("Failed to promote data to hot tier", error, "StorageTierManager", "cache");
    }
  }

  /**
   * Demote data to slower storage tier
   */
  async demoteToColdTier(entityType: EntityType, entityId: string, fields: string[]): Promise<void> {
    try {
      // Get data from current location
      const { data } = await this.getEntityFields(entityType, entityId, fields);

      if (Object.keys(data).length > 0) {
        // Store in IndexedDB tier
        await this.putEntityFields(entityType, entityId, data, StorageTier.INDEXED_DB);

        // Remove from memory tier
        const memoryTier = this.tiers.get(StorageTier.MEMORY);
        if (memoryTier) {
          await memoryTier.deleteEntity(entityType, entityId);
        }

        logger.debug("cache", "Demoted entity data to cold tier", {
          entityType,
          entityId,
          fields,
          targetTier: StorageTier.INDEXED_DB
        });
      }
    } catch (error) {
      logError("Failed to demote data to cold tier", error, "StorageTierManager", "cache");
    }
  }

  /**
   * Get comprehensive storage tier statistics
   */
  async getStorageTierStats(): Promise<StorageTierStats> {
    // Initialize with default values for all tiers
    const stats: StorageTierStats = {
      [StorageTier.MEMORY]: { size: 0, entities: 0, fields: 0 },
      [StorageTier.LOCAL_STORAGE]: { size: 0, usage: 0, limit: 0 },
      [StorageTier.INDEXED_DB]: { size: 0, entities: 0, collections: 0 },
      [StorageTier.STATIC]: { size: 0, preloadedEntities: 0, preloadedCollections: 0 }
    };

    for (const [tier, tierImpl] of this.tiers) {
      try {
        const tierStats = await tierImpl.getStats();

        // Type-safe property access for each tier
        if (tier === StorageTier.MEMORY && tierStats[StorageTier.MEMORY]) {
          stats[StorageTier.MEMORY] = tierStats[StorageTier.MEMORY];
        } else if (tier === StorageTier.LOCAL_STORAGE && tierStats[StorageTier.LOCAL_STORAGE]) {
          stats[StorageTier.LOCAL_STORAGE] = tierStats[StorageTier.LOCAL_STORAGE];
        } else if (tier === StorageTier.INDEXED_DB && tierStats[StorageTier.INDEXED_DB]) {
          stats[StorageTier.INDEXED_DB] = tierStats[StorageTier.INDEXED_DB];
        } else if (tier === StorageTier.STATIC && tierStats[StorageTier.STATIC]) {
          stats[StorageTier.STATIC] = tierStats[StorageTier.STATIC];
        }
      } catch (error) {
        logError(`Failed to get stats for ${tier}`, error, "StorageTierManager", "cache");
      }
    }

    return stats;
  }

  /**
   * Invalidate entity across all tiers
   */
  async invalidateEntity(entityType: EntityType, entityId: string, tiers?: StorageTier[]): Promise<void> {
    const targetTiers = tiers || Object.values(StorageTier);

    for (const tier of targetTiers) {
      const tierImpl = this.tiers.get(tier);
      if (tierImpl) {
        try {
          await tierImpl.deleteEntity(entityType, entityId);
        } catch (error) {
          logError(`Failed to invalidate entity in ${tier}`, error, "StorageTierManager", "cache");
        }
      }
    }

    logger.debug("cache", "Invalidated entity across tiers", { entityType, entityId, tiers: targetTiers });
  }

  /**
   * Invalidate collection across all tiers
   */
  async invalidateCollection(queryKey: string, tiers?: StorageTier[]): Promise<void> {
    const targetTiers = tiers || Object.values(StorageTier);

    for (const tier of targetTiers) {
      const tierImpl = this.tiers.get(tier);
      if (tierImpl) {
        try {
          await tierImpl.deleteCollection(queryKey);
        } catch (error) {
          logError(`Failed to invalidate collection in ${tier}`, error, "StorageTierManager", "cache");
        }
      }
    }

    logger.debug("cache", "Invalidated collection across tiers", { queryKey, tiers: targetTiers });
  }

  // Private helper methods

  private getOptimalTierOrder(): StorageTier[] {
    // Prioritize faster tiers first
    return [
      StorageTier.MEMORY,
      StorageTier.LOCAL_STORAGE,
      StorageTier.STATIC,
      StorageTier.INDEXED_DB
      // API tier is handled separately by request optimizer
    ];
  }

  private determineOptimalStorageTier<T>(
    entityType: EntityType,
    entityId: string,
    data: Partial<T>
  ): StorageTier {
    const dataSize = this.estimateDataSize(data);

    // Small, frequently accessed data goes to memory
    if (dataSize < 10 * 1024) { // 10KB
      return StorageTier.MEMORY;
    }

    // Medium data goes to localStorage
    if (dataSize < 100 * 1024) { // 100KB
      return StorageTier.LOCAL_STORAGE;
    }

    // Large data goes to IndexedDB
    return StorageTier.INDEXED_DB;
  }

  private determineCollectionStorageTier(queryKey: string, entityIds: string[]): StorageTier {
    const estimatedSize = entityIds.length * 50; // Rough estimate

    if (estimatedSize < 5 * 1024) { // 5KB
      return StorageTier.LOCAL_STORAGE;
    }

    return StorageTier.INDEXED_DB;
  }

  private shouldPromoteData(_entityType: EntityType, _entityId: string): boolean {
    // Simple heuristic: promote if accessed recently
    const accessThreshold = this.policy.tierPreferences.hotDataThreshold;
    const stats = this.accessStats.get(StorageTier.MEMORY);

    return stats ? (Date.now() - stats.lastAccess) < accessThreshold : false;
  }

  private updateTierStats(tier: StorageTier, hit: boolean, responseTime: number): void {
    const stats = this.accessStats.get(tier);
    if (stats) {
      if (hit) {
        stats.hits++;
      } else {
        stats.misses++;
      }
      stats.lastAccess = Date.now();
      stats.averageResponseTime = (stats.averageResponseTime + responseTime) / 2;
    }
  }

  private async updateFieldCoverageIndex(
    entityType: EntityType,
    entityId: string,
    fields: string[]
  ): Promise<void> {
    // Store field coverage information in localStorage for quick lookup
    const memoryTier = this.tiers.get(StorageTier.LOCAL_STORAGE);
    if (memoryTier) {
      try {
        const coverageKey = `coverage:${entityType}:${entityId}`;
        const existingCoverage = await memoryTier.getEntityFields(entityType, coverageKey, ["fields"]) || {};

        function isStringArray(value: unknown): value is string[] {
          return Array.isArray(value) && value.every(item => typeof item === "string");
        }

        const existingFields: string[] = (existingCoverage && typeof existingCoverage === "object" && "fields" in existingCoverage && isStringArray(existingCoverage.fields)) ? existingCoverage.fields : [];
        const updatedFields = [...new Set([...existingFields, ...fields])];

        await memoryTier.putEntityFields(entityType, coverageKey, { fields: updatedFields });
      } catch (error) {
        // Field coverage update is not critical
        logger.warn("cache", "Failed to update field coverage index", { entityType, entityId, error });
      }
    }
  }

  private estimateDataSize<T>(data: Partial<T>): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // Fallback estimation
      return Object.keys(data).length * 100; // Rough estimate
    }
  }
}