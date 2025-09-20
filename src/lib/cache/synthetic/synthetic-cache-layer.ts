/**
 * Synthetic Cache Layer
 * Main interface that coordinates all synthetic cache components
 * Provides the unified API for intelligent multi-tier caching and surgical optimization
 */

import { logger, logError } from "@/lib/logger";
import {
  EntityType,
  QueryParams,
  OptimizedRequestPlan,
  MultiTierAvailabilityMatrix,
  FieldCoverageByTier,
  MultiTierCacheStats,
  StorageTier,
  CachePolicy
} from "./types";
import { StorageTierManager } from "./storage-tier-manager";
import { EntityFieldAccumulator } from "./entity-field-accumulator";
import { CollectionResultMapper } from "./collection-result-mapper";
import { SyntheticResponseGenerator } from "./synthetic-response-generator";
import { OpenAlexResponse } from "@/lib/openalex/types";

export interface SyntheticCacheLayer {
  // Multi-tier entity data methods
  getEntityFields<T>(type: EntityType, id: string, fields: string[]): Promise<Partial<T>>;
  putEntityFields<T>(type: EntityType, id: string, data: Partial<T>, tier?: StorageTier): Promise<void>;
  getFieldCoverage(type: EntityType, id: string): Promise<FieldCoverageByTier>;

  // Multi-tier collection cache methods
  getCollectionPage(queryKey: string, page: number): Promise<string[] | null>;
  putCollectionPage(queryKey: string, page: number, entityIds: string[], tier?: StorageTier): Promise<void>;
  getCollectionMetadata(queryKey: string): Promise<unknown>;

  // Multi-tier synthetic response engine
  analyzeMultiTierAvailability(entityIds: string[], fields: string[]): Promise<MultiTierAvailabilityMatrix>;
  optimizeRequest(entityType: EntityType, params: QueryParams): Promise<OptimizedRequestPlan>;
  synthesizeResponse<T>(plan: OptimizedRequestPlan, additionalData?: OpenAlexResponse<T>, entityType?: EntityType): Promise<OpenAlexResponse<T>>;

  // Storage tier management
  promoteToHotTier(type: EntityType, id: string, fields: string[]): Promise<void>;
  demoteToColdTier(type: EntityType, id: string, fields: string[]): Promise<void>;
  getStorageTierStats(): Promise<MultiTierCacheStats>;

  // Tier-aware cache coordination
  invalidateEntity(type: EntityType, id: string, tiers?: StorageTier[]): Promise<void>;
  invalidateCollection(queryKey: string, tiers?: StorageTier[]): Promise<void>;
  getCacheStats(): Promise<MultiTierCacheStats>;

  // Utility methods
  generateQueryKey(entityType: EntityType, params: QueryParams): string;
  clear(): Promise<void>;
}

export class SyntheticCacheLayerImpl implements SyntheticCacheLayer {
  private tierManager: StorageTierManager;
  private fieldAccumulator: EntityFieldAccumulator;
  private collectionMapper: CollectionResultMapper;
  private responseGenerator: SyntheticResponseGenerator;
  private policy: CachePolicy;

  constructor(policy: CachePolicy) {
    this.policy = policy;
    this.tierManager = new StorageTierManager(policy);
    this.fieldAccumulator = new EntityFieldAccumulator(policy);
    this.collectionMapper = new CollectionResultMapper(policy);
    this.responseGenerator = new SyntheticResponseGenerator(
      this.tierManager,
      this.fieldAccumulator,
      this.collectionMapper,
      policy
    );

    this.initializeStorageTiers();
  }

  /**
   * Type guard for collection stats object
   */
  private isCollectionStatsObject(value: unknown): value is { collections?: number } {
    return typeof value === "object" && value !== null && "collections" in value;
  }

  /**
   * Initialize storage tier registrations
   */
  private initializeStorageTiers(): void {
    // Register field accumulator as memory tier
    this.tierManager.registerTier(StorageTier.MEMORY, this.fieldAccumulator);

    logger.debug("cache", "Synthetic cache layer initialized with storage tiers");
  }

  /**
   * Get entity fields with multi-tier optimization
   */
  async getEntityFields<T>(
    type: EntityType,
    id: string,
    fields: string[]
  ): Promise<Partial<T>> {
    try {
      const { data } = await this.tierManager.getEntityFields<T>(type, id, fields);

      logger.debug("cache", "Retrieved entity fields via synthetic cache", {
        entityType: type,
        entityId: id,
        requestedFields: fields,
        foundFields: Object.keys(data)
      });

      return data;
    } catch (error) {
      logError("Failed to get entity fields", error, "SyntheticCacheLayer", "cache");
      return {};
    }
  }

  /**
   * Store entity fields with tier-appropriate placement
   */
  async putEntityFields<T>(
    type: EntityType,
    id: string,
    data: Partial<T>,
    tier?: StorageTier
  ): Promise<void> {
    try {
      await this.tierManager.putEntityFields(type, id, data, tier);

      logger.debug("cache", "Stored entity fields via synthetic cache", {
        entityType: type,
        entityId: id,
        fields: Object.keys(data),
        targetTier: tier
      });
    } catch (error) {
      logError("Failed to store entity fields", error, "SyntheticCacheLayer", "cache");
    }
  }

  /**
   * Get comprehensive field coverage across all tiers
   */
  async getFieldCoverage(type: EntityType, id: string): Promise<FieldCoverageByTier> {
    try {
      // Get coverage from field accumulator (memory tier)
      const memoryCoverage = await this.fieldAccumulator.getFieldCoverageByTier(type, id);

      // Get coverage from other tiers via tier manager
      const otherTiersCoverage = {
        localStorage: [],
        indexedDB: [],
        static: []
      };

      // Note: This would need to be implemented based on actual storage tier implementations
      // For now, we'll return the memory coverage

      return {
        memory: memoryCoverage.memory,
        localStorage: otherTiersCoverage.localStorage,
        indexedDB: otherTiersCoverage.indexedDB,
        static: otherTiersCoverage.static,
        total: [
          ...memoryCoverage.memory,
          ...otherTiersCoverage.localStorage,
          ...otherTiersCoverage.indexedDB,
          ...otherTiersCoverage.static
        ]
      };
    } catch (error) {
      logError("Failed to get field coverage", error, "SyntheticCacheLayer", "cache");
      return {
        memory: [],
        localStorage: [],
        indexedDB: [],
        static: [],
        total: []
      };
    }
  }

  /**
   * Get collection page with multi-tier lookup
   */
  async getCollectionPage(queryKey: string, page: number): Promise<string[] | null> {
    try {
      const { entityIds } = await this.tierManager.getCollectionPage(queryKey, page);
      return entityIds;
    } catch (error) {
      logError("Failed to get collection page", error, "SyntheticCacheLayer", "cache");
      return null;
    }
  }

  /**
   * Store collection page with tier-appropriate placement
   */
  async putCollectionPage(
    queryKey: string,
    page: number,
    entityIds: string[],
    tier?: StorageTier
  ): Promise<void> {
    try {
      await this.tierManager.putCollectionPage(queryKey, page, entityIds, tier);

      logger.debug("cache", "Stored collection page via synthetic cache", {
        queryKey,
        page,
        entityCount: entityIds.length,
        targetTier: tier
      });
    } catch (error) {
      logError("Failed to store collection page", error, "SyntheticCacheLayer", "cache");
    }
  }

  /**
   * Get collection metadata
   */
  async getCollectionMetadata(queryKey: string): Promise<unknown> {
    try {
      return await this.collectionMapper.getCollectionMetadata(queryKey);
    } catch (error) {
      logError("Failed to get collection metadata", error, "SyntheticCacheLayer", "cache");
      return null;
    }
  }

  /**
   * Analyze field availability across all storage tiers
   */
  async analyzeMultiTierAvailability(
    entityIds: string[],
    fields: string[]
  ): Promise<MultiTierAvailabilityMatrix> {
    try {
      // This would need the entity type - for now we'll use a default approach
      const entityType: EntityType = "works"; // Would need to be passed in or inferred
      return await this.responseGenerator.analyzeMultiTierAvailability(entityIds, fields, entityType);
    } catch (error) {
      logError("Failed to analyze multi-tier availability", error, "SyntheticCacheLayer", "cache");

      // Return empty availability matrix
      const entities: MultiTierAvailabilityMatrix["entities"] = {};
      entityIds.forEach(id => {
        entities[id] = {
          memory: [],
          localStorage: [],
          indexedDB: [],
          static: [],
          missing: fields
        };
      });

      return {
        entities,
        optimalStrategy: "api"
      };
    }
  }

  /**
   * Generate optimized request plan
   */
  async optimizeRequest(entityType: EntityType, params: QueryParams): Promise<OptimizedRequestPlan> {
    try {
      return await this.responseGenerator.optimizeRequest(entityType, params);
    } catch (error) {
      logError("Failed to optimize request", error, "SyntheticCacheLayer", "cache");

      // Return fallback plan
      return {
        canSynthesize: false,
        requiredApiCalls: [],
        cachedData: {},
        estimatedSavings: {
          bandwidth: 0,
          requests: 0,
          latency: 0
        }
      };
    }
  }

  /**
   * Synthesize response from cached and API data
   */
  async synthesizeResponse<T>(
    plan: OptimizedRequestPlan,
    additionalData?: OpenAlexResponse<T>,
    entityType?: EntityType
  ): Promise<OpenAlexResponse<T>> {
    try {
      return await this.responseGenerator.synthesizeResponse(plan, additionalData, entityType);
    } catch (error) {
      logError("Failed to synthesize response", error, "SyntheticCacheLayer", "cache");

      // Return API data as fallback
      if (additionalData) {
        return additionalData;
      }

      throw new Error("Cannot synthesize response without cached data or API data");
    }
  }

  /**
   * Promote entity data to faster storage tier
   */
  async promoteToHotTier(type: EntityType, id: string, fields: string[]): Promise<void> {
    try {
      await this.tierManager.promoteToHotTier(type, id, fields);
    } catch (error) {
      logError("Failed to promote to hot tier", error, "SyntheticCacheLayer", "cache");
    }
  }

  /**
   * Demote entity data to slower storage tier
   */
  async demoteToColdTier(type: EntityType, id: string, fields: string[]): Promise<void> {
    try {
      await this.tierManager.demoteToColdTier(type, id, fields);
    } catch (error) {
      logError("Failed to demote to cold tier", error, "SyntheticCacheLayer", "cache");
    }
  }

  /**
   * Get comprehensive storage tier statistics
   */
  async getStorageTierStats(): Promise<MultiTierCacheStats> {
    try {
      const tierStats = await this.tierManager.getStorageTierStats();
      const collectionMapperStats = await this.collectionMapper.getStats();

      // Combine stats from all components
      // Safely access collections stats with type guard
      const memoryStats = collectionMapperStats[StorageTier.MEMORY];
      const collectionStats = this.isCollectionStatsObject(memoryStats) ? memoryStats : undefined;

      return {
        overall: {
          totalEntities: tierStats[StorageTier.MEMORY]?.entities ?? 0,
          totalFields: tierStats[StorageTier.MEMORY]?.fields ?? 0,
          totalCollections: collectionStats?.collections ?? 0,
          cacheHitRate: 0, // Would need to be calculated from access patterns
          surgicalRequestCount: 0 // Would need to be tracked
        },
        tiers: tierStats
      };
    } catch (error) {
      logError("Failed to get storage tier stats", error, "SyntheticCacheLayer", "cache");

      return {
        overall: {
          totalEntities: 0,
          totalFields: 0,
          totalCollections: 0,
          cacheHitRate: 0,
          surgicalRequestCount: 0
        },
        tiers: {
          [StorageTier.MEMORY]: { size: 0, entities: 0, fields: 0 },
          [StorageTier.LOCAL_STORAGE]: { size: 0, usage: 0, limit: 0 },
          [StorageTier.INDEXED_DB]: { size: 0, entities: 0, collections: 0 },
          [StorageTier.STATIC]: { size: 0, preloadedEntities: 0, preloadedCollections: 0 }
        }
      };
    }
  }

  /**
   * Invalidate entity across specified tiers
   */
  async invalidateEntity(type: EntityType, id: string, tiers?: StorageTier[]): Promise<void> {
    try {
      await this.tierManager.invalidateEntity(type, id, tiers);
    } catch (error) {
      logError("Failed to invalidate entity", error, "SyntheticCacheLayer", "cache");
    }
  }

  /**
   * Invalidate collection across specified tiers
   */
  async invalidateCollection(queryKey: string, tiers?: StorageTier[]): Promise<void> {
    try {
      await this.tierManager.invalidateCollection(queryKey, tiers);
    } catch (error) {
      logError("Failed to invalidate collection", error, "SyntheticCacheLayer", "cache");
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  async getCacheStats(): Promise<MultiTierCacheStats> {
    return this.getStorageTierStats();
  }

  /**
   * Generate normalized query key
   */
  generateQueryKey(entityType: EntityType, params: QueryParams): string {
    return this.collectionMapper.generateQueryKey(entityType, params);
  }

  /**
   * Clear all cached data across all tiers
   */
  async clear(): Promise<void> {
    try {
      await Promise.all([
        this.fieldAccumulator.clear(),
        this.collectionMapper.clear()
      ]);

      logger.debug("cache", "Cleared all synthetic cache data");
    } catch (error) {
      logError("Failed to clear synthetic cache", error, "SyntheticCacheLayer", "cache");
    }
  }
}

/**
 * Create default cache policy
 */
export function createDefaultCachePolicy(): CachePolicy {
  return {
    entityTTL: {
      works: {
        id: 30 * 24 * 60 * 60 * 1000, // 30 days
        display_name: 7 * 24 * 60 * 60 * 1000, // 7 days
        publication_year: 30 * 24 * 60 * 60 * 1000, // 30 days
        cited_by_count: 24 * 60 * 60 * 1000, // 1 day (changes frequently)
        default: 7 * 24 * 60 * 60 * 1000 // 7 days
      },
      authors: {
        id: 30 * 24 * 60 * 60 * 1000, // 30 days
        display_name: 7 * 24 * 60 * 60 * 1000, // 7 days
        cited_by_count: 24 * 60 * 60 * 1000, // 1 day
        works_count: 24 * 60 * 60 * 1000, // 1 day
        default: 7 * 24 * 60 * 60 * 1000 // 7 days
      },
      // Add other entity types as needed
      sources: { default: 7 * 24 * 60 * 60 * 1000 },
      institutions: { default: 7 * 24 * 60 * 60 * 1000 },
      topics: { default: 7 * 24 * 60 * 60 * 1000 },
      publishers: { default: 7 * 24 * 60 * 60 * 1000 },
      funders: { default: 7 * 24 * 60 * 60 * 1000 }
    },
    collectionTTL: {
      works: 24 * 60 * 60 * 1000, // 1 day
      authors: 24 * 60 * 60 * 1000, // 1 day
      sources: 24 * 60 * 60 * 1000, // 1 day
      institutions: 24 * 60 * 60 * 1000, // 1 day
      topics: 24 * 60 * 60 * 1000, // 1 day
      publishers: 24 * 60 * 60 * 1000, // 1 day
      funders: 24 * 60 * 60 * 1000 // 1 day
    },
    tierPreferences: {
      hotDataThreshold: 5 * 60 * 1000, // 5 minutes for memory promotion
      warmDataThreshold: 60 * 60 * 1000, // 1 hour for localStorage
      coldDataArchival: 24 * 60 * 60 * 1000 // 1 day for IndexedDB archival
    }
  };
}

/**
 * Create and initialize synthetic cache layer
 */
export function createSyntheticCacheLayer(policy?: CachePolicy): SyntheticCacheLayer {
  const cachePolicy = policy || createDefaultCachePolicy();
  return new SyntheticCacheLayerImpl(cachePolicy);
}