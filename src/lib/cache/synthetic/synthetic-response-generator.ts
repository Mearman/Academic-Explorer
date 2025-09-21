/**
 * Synthetic Response Generator
 * Coordinates data from multiple storage tiers to generate optimized API responses
 * Implements surgical request optimization and response synthesis
 */

import { logger, logError } from "@/lib/logger";
import {
  EntityType,
  QueryParams,
  OptimizedRequestPlan,
  SurgicalRequest,
  MultiTierAvailabilityMatrix,
  StorageTier,
  CachePolicy,
  EntityFieldAccumulation,
  EntityFieldData
} from "./types";
import { StorageTierManager } from "./storage-tier-manager";
import { EntityFieldAccumulator } from "./entity-field-accumulator";
import { CollectionResultMapper } from "./collection-result-mapper";
import { OpenAlexResponse } from "@/lib/openalex/types";

export class SyntheticResponseGenerator {
  private tierManager: StorageTierManager;
  private fieldAccumulator: EntityFieldAccumulator;
  private collectionMapper: CollectionResultMapper;
  private policy: CachePolicy;

  constructor(
    tierManager: StorageTierManager,
    fieldAccumulator: EntityFieldAccumulator,
    collectionMapper: CollectionResultMapper,
    policy: CachePolicy
  ) {
    this.tierManager = tierManager;
    this.fieldAccumulator = fieldAccumulator;
    this.collectionMapper = collectionMapper;
    this.policy = policy;
  }

  /**
   * Analyze request and generate optimized execution plan
   */
  async optimizeRequest(
    entityType: EntityType,
    params: QueryParams
  ): Promise<OptimizedRequestPlan> {
    const startTime = performance.now();

    try {
      // Determine request type
      const isCollectionRequest = this.isCollectionRequest(params);

      if (isCollectionRequest) {
        return await this.optimizeCollectionRequest({ entityType, params });
      } else {
        return await this.optimizeSingleEntityRequest({ entityType, params });
      }
    } catch (error) {
      logError("Failed to optimize request", error, "SyntheticResponseGenerator", "cache");

      // Return fallback plan
      return {
        canSynthesize: false,
        requiredApiCalls: [{
          type: "full-collection",
          url: this.buildApiUrl({ entityType, params }),
          fields: params.select || [],
          estimatedCost: 5000, // Conservative estimate
          tier: StorageTier.API
        }],
        cachedData: {},
        estimatedSavings: {
          bandwidth: 0,
          requests: 0,
          latency: 0
        }
      };
    } finally {
      const responseTime = performance.now() - startTime;
      logger.debug("cache", "Request optimization completed", {
        entityType,
        responseTime,
        isCollection: this.isCollectionRequest(params)
      });
    }
  }

  /**
   * Synthesize response from optimized plan and additional API data
   */
  async synthesizeResponse<T>(
    plan: OptimizedRequestPlan,
    apiData?: OpenAlexResponse<T>,
    entityType?: EntityType
  ): Promise<OpenAlexResponse<T>> {
    const startTime = performance.now();

    try {
      if (!plan.canSynthesize) {
        // No cached data available, return API response as-is
        if (!apiData) {
          throw new Error("Cannot synthesize response without cached data or API data");
        }
        return apiData;
      }

      // Combine cached data with API data
      const synthesizedResults: T[] = [];
      const metadata = apiData?.meta || this.createDefaultMetadata();

      // If we have API data, merge it with cached data
      if (apiData?.results) {
        // Update caches with new API data
        if (entityType) {
          await this.updateCachesWithApiData({ entityType, apiResults: apiData.results });
        }

        synthesizedResults.push(...apiData.results);
      }

      // Add any cached data that wasn't in API response
      const cachedEntities = this.extractCachedEntities(plan.cachedData);
      // Filter to ensure type safety
      const typedCachedEntities = cachedEntities.filter((entity): entity is T => {
        return typeof entity === "object" && entity !== null;
      });
      synthesizedResults.push(...typedCachedEntities);

      const responseTime = performance.now() - startTime;

      logger.debug("cache", "Response synthesis completed", {
        entityType,
        cachedEntities: cachedEntities.length,
        apiEntities: apiData?.results?.length || 0,
        totalResults: synthesizedResults.length,
        responseTime
      });

      return {
        results: synthesizedResults,
        meta: metadata
      };

    } catch (error) {
      logError("Failed to synthesize response", error, "SyntheticResponseGenerator", "cache");

      // Fallback to API data
      if (apiData) {
        return apiData;
      }

      throw error;
    }
  }

  /**
   * Analyze multi-tier availability for entities and fields
   */
  async analyzeMultiTierAvailability({
    entityIds,
    fields,
    entityType
  }: {
    entityIds: string[];
    fields: string[];
    entityType: EntityType;
  }): Promise<MultiTierAvailabilityMatrix> {
    const entities: MultiTierAvailabilityMatrix["entities"] = {};

    for (const entityId of entityIds) {
      const tierCoverage: MultiTierAvailabilityMatrix["entities"][string] = {
        memory: [],
        localStorage: [],
        indexedDB: [],
        static: [],
        missing: []
      };

      // Check each storage tier for field availability
      for (const field of fields) {
        let found = false;

        // Check memory tier (field accumulator)
        const memoryCoverage = await this.fieldAccumulator.getFieldCoverage(entityType, entityId);
        if (memoryCoverage.includes(field)) {
          tierCoverage.memory.push(field);
          found = true;
        }

        // Check other tiers via tier manager
        if (!found) {
          const { tier } = await this.tierManager.getEntityFields(entityType, entityId, [field]);
          if (tier) {
            switch (tier) {
              case StorageTier.LOCAL_STORAGE:
                tierCoverage.localStorage.push(field);
                found = true;
                break;
              case StorageTier.INDEXED_DB:
                tierCoverage.indexedDB.push(field);
                found = true;
                break;
              case StorageTier.STATIC:
                tierCoverage.static.push(field);
                found = true;
                break;
            }
          }
        }

        if (!found) {
          tierCoverage.missing.push(field);
        }
      }

      entities[entityId] = tierCoverage;
    }

    // Determine optimal strategy
    const optimalStrategy = this.determineOptimalStrategy(entities);

    return {
      entities,
      optimalStrategy
    };
  }

  /**
   * Generate surgical requests for missing data
   */
  generateSurgicalRequests({
    availability,
    entityType,
    _params
  }: {
    availability: MultiTierAvailabilityMatrix;
    entityType: EntityType;
    _params: QueryParams;
  }): SurgicalRequest[] {
    const requests: SurgicalRequest[] = [];
    const entityIdsWithMissingFields = new Map<string, string[]>();

    // Group entities by missing fields
    for (const [entityId, coverage] of Object.entries(availability.entities)) {
      if (coverage.missing.length > 0) {
        entityIdsWithMissingFields.set(entityId, coverage.missing);
      }
    }

    if (entityIdsWithMissingFields.size === 0) {
      return requests; // No surgical requests needed
    }

    // Analyze field patterns to optimize requests
    const fieldFrequency = new Map<string, number>();
    const entityCount = entityIdsWithMissingFields.size;

    for (const missingFields of entityIdsWithMissingFields.values()) {
      for (const field of missingFields) {
        fieldFrequency.set(field, (fieldFrequency.get(field) || 0) + 1);
      }
    }

    // Strategy 1: If most entities are missing the same fields, use batch request
    const commonFields = Array.from(fieldFrequency.entries())
      .filter(([, count]) => count >= entityCount * 0.7) // 70% threshold
      .map(([field]) => field);

    if (commonFields.length > 0) {
      const entityIds = Array.from(entityIdsWithMissingFields.keys());
      requests.push({
        type: "batch-entities",
        url: this.buildBatchApiUrl({ entityType, entityIds, fields: commonFields }),
        entityIds,
        fields: commonFields,
        estimatedCost: this.estimateRequestCost({ entityCount: entityIds.length, fieldCount: commonFields.length }),
        tier: StorageTier.API
      });

      // Remove common fields from individual entity needs
      for (const [entityId, missingFields] of entityIdsWithMissingFields) {
        const remainingFields = missingFields.filter((f: string) => !commonFields.includes(f));
        if (remainingFields.length > 0) {
          entityIdsWithMissingFields.set(entityId, remainingFields);
        } else {
          entityIdsWithMissingFields.delete(entityId);
        }
      }
    }

    // Strategy 2: Individual requests for remaining missing fields
    for (const [entityId, missingFields] of entityIdsWithMissingFields) {
      if (missingFields.length > 0) {
        requests.push({
          type: "single-entity",
          url: this.buildSingleEntityApiUrl({ entityType, entityId, fields: missingFields }),
          entityIds: [entityId],
          fields: missingFields,
          estimatedCost: this.estimateRequestCost({ entityCount: 1, fieldCount: missingFields.length }),
          tier: StorageTier.API
        });
      }
    }

    logger.debug("cache", "Generated surgical requests", {
      entityType,
      totalRequests: requests.length,
      batchRequests: requests.filter(r => r.type === "batch-entities").length,
      singleRequests: requests.filter(r => r.type === "single-entity").length,
      totalCost: requests.reduce((sum, r) => sum + r.estimatedCost, 0)
    });

    return requests;
  }

  // Private helper methods

  private async optimizeCollectionRequest({
    entityType,
    params
  }: {
    entityType: EntityType;
    params: QueryParams;
  }): Promise<OptimizedRequestPlan> {
    const queryKey = this.collectionMapper.generateQueryKey(entityType, params);
    const requestedFields = params.select || [];
    const page = params.page || 1;

    // Check if we have this collection page cached
    const cachedEntityIds = await this.collectionMapper.getCollectionPage(queryKey, page);

    if (!cachedEntityIds) {
      // No cached collection data - need full API request
      return {
        canSynthesize: false,
        requiredApiCalls: [{
          type: "full-collection",
          url: this.buildApiUrl({ entityType, params }),
          fields: requestedFields,
          estimatedCost: 5000, // Estimate for full collection request
          tier: StorageTier.API
        }],
        cachedData: {},
        estimatedSavings: {
          bandwidth: 0,
          requests: 0,
          latency: 0
        }
      };
    }

    // Analyze field availability for cached entities
    const availability = await this.analyzeMultiTierAvailability({
      entityIds: cachedEntityIds,
      fields: requestedFields,
      entityType
    });

    // Generate surgical requests for missing data
    const surgicalRequests = this.generateSurgicalRequests({ availability, entityType, _params: params });

    // Calculate estimated savings
    const fullRequestCost = 5000;
    const surgicalCost = surgicalRequests.reduce((sum, req) => sum + req.estimatedCost, 0);
    const bandwidthSavings = Math.max(0, fullRequestCost - surgicalCost);

    return {
      canSynthesize: true,
      requiredApiCalls: surgicalRequests,
      cachedData: await this.buildCachedDataMap({ availability, entityType }),
      estimatedSavings: {
        bandwidth: bandwidthSavings,
        requests: surgicalRequests.length === 0 ? 1 : Math.max(0, 1 - surgicalRequests.length),
        latency: bandwidthSavings > 0 ? 100 : 0 // Estimate 100ms savings for cached data
      }
    };
  }

  private async optimizeSingleEntityRequest({
    entityType,
    params
  }: {
    entityType: EntityType;
    params: QueryParams;
  }): Promise<OptimizedRequestPlan> {
    const entityId = this.extractEntityIdFromParams(params);
    if (!entityId) {
      throw new Error("Cannot extract entity ID from single entity request");
    }

    const requestedFields = params.select || [];

    // Analyze field availability
    const availability = await this.analyzeMultiTierAvailability({
      entityIds: [entityId],
      fields: requestedFields,
      entityType
    });

    // Generate surgical requests
    const surgicalRequests = this.generateSurgicalRequests({ availability, entityType, _params: params });

    // Calculate savings
    const fullRequestCost = 1000; // Estimate for single entity request
    const surgicalCost = surgicalRequests.reduce((sum, req) => sum + req.estimatedCost, 0);
    const bandwidthSavings = Math.max(0, fullRequestCost - surgicalCost);

    return {
      canSynthesize: surgicalRequests.length < requestedFields.length, // Can synthesize if we have some cached data
      requiredApiCalls: surgicalRequests,
      cachedData: await this.buildCachedDataMap({ availability, entityType }),
      estimatedSavings: {
        bandwidth: bandwidthSavings,
        requests: surgicalRequests.length === 0 ? 1 : 0,
        latency: bandwidthSavings > 0 ? 50 : 0
      }
    };
  }

  private isCollectionRequest(params: QueryParams): boolean {
    // Collection requests typically have filters, pagination, or no specific entity ID
    return !!(params.filter || params.page || params.per_page);
  }

  private determineOptimalStrategy(entities: MultiTierAvailabilityMatrix["entities"]): MultiTierAvailabilityMatrix["optimalStrategy"] {
    const tierCounts = {
      memory: 0,
      localStorage: 0,
      indexedDB: 0,
      static: 0,
      api: 0
    };

    let totalFields = 0;

    for (const coverage of Object.values(entities)) {
      tierCounts.memory += coverage.memory.length;
      tierCounts.localStorage += coverage.localStorage.length;
      tierCounts.indexedDB += coverage.indexedDB.length;
      tierCounts.static += coverage.static.length;
      tierCounts.api += coverage.missing.length;

      totalFields += coverage.memory.length + coverage.localStorage.length +
                     coverage.indexedDB.length + coverage.static.length + coverage.missing.length;
    }

    if (totalFields === 0) return "memory";

    // Determine strategy based on field coverage thresholds

    if (tierCounts.memory > totalFields * 0.5) return "memory";
    if (tierCounts.localStorage > totalFields * 0.3) return "localStorage";
    if (tierCounts.static > totalFields * 0.3) return "static";
    if (tierCounts.indexedDB > totalFields * 0.3) return "indexedDB";
    if (tierCounts.api > totalFields * 0.5) return "api";

    return "mixed";
  }

  private async buildCachedDataMap({
    availability,
    entityType
  }: {
    availability: MultiTierAvailabilityMatrix;
    entityType: EntityType;
  }): Promise<EntityFieldAccumulation> {
    const cachedData: EntityFieldAccumulation = {};

    // Initialize the entity type if it doesn't exist
    if (!cachedData[entityType]) {
      cachedData[entityType] = {};
    }

    for (const [entityId, coverage] of Object.entries(availability.entities)) {
      const allCachedFields = [
        ...coverage.memory,
        ...coverage.localStorage,
        ...coverage.indexedDB,
        ...coverage.static
      ];

      if (allCachedFields.length > 0) {
        const { data } = await this.tierManager.getEntityFields(entityType, entityId, allCachedFields);
        if (Object.keys(data).length > 0 && cachedData[entityType]) {
          // Convert to EntityFieldData format
          const entityFieldData: EntityFieldData = {
            ...data,
            _metadata: {
              lastUpdated: new Date().toISOString(),
              ttl: 24 * 60 * 60 * 1000, // 24 hours
              fieldSources: {},
              tier: StorageTier.MEMORY
            }
          };
          cachedData[entityType][entityId] = entityFieldData;
        }
      }
    }

    return cachedData;
  }

  private extractCachedEntities(cachedData: EntityFieldAccumulation): unknown[] {
    const entities: unknown[] = [];

    // Extract entities from the nested structure [entityType][entityId]
    for (const entityTypeData of Object.values(cachedData)) {
      for (const entityData of Object.values(entityTypeData)) {
        if (typeof entityData === "object" && entityData !== null) {
          entities.push(entityData);
        }
      }
    }

    return entities;
  }

  private async updateCachesWithApiData({
    entityType,
    apiResults
  }: {
    entityType: EntityType;
    apiResults: unknown[];
  }): Promise<void> {
    for (const result of apiResults) {
      const entityId = this.extractEntityId(result);
      if (entityId && this.isValidEntityData(result)) {
        await this.fieldAccumulator.putEntityFields(entityType, entityId, result);
      }
    }
  }

  private extractEntityId(entity: unknown): string | null {
    if (this.isEntityWithId(entity)) {
      if (typeof entity.id === "string" || typeof entity.id === "number") {
        return String(entity.id);
      }
    }
    return null;
  }

  private isEntityWithId(entity: unknown): entity is Record<string, unknown> & { id: unknown } {
    return typeof entity === "object" && entity !== null && "id" in entity;
  }

  private isValidEntityData(entity: unknown): entity is Record<string, unknown> {
    return typeof entity === "object" && entity !== null;
  }

  private extractEntityIdFromParams(params: QueryParams): string | null {
    // This would be used for single entity requests like /works/W123
    // Implementation depends on how entity IDs are passed in params
    if (params.id && typeof params.id === "string") {
      return params.id;
    }
    return null;
  }

  private buildApiUrl({
    entityType,
    params
  }: {
    entityType: EntityType;
    params: QueryParams;
  }): string {
    const baseUrl = `https://api.openalex.org/${entityType}`;
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          searchParams.set(key, value.join(","));
        } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          searchParams.set(key, String(value));
        }
      }
    });

    return `${baseUrl}?${searchParams.toString()}`;
  }

  private buildBatchApiUrl({
    entityType,
    entityIds,
    fields
  }: {
    entityType: EntityType;
    entityIds: string[];
    fields: string[];
  }): string {
    const searchParams = new URLSearchParams({
      filter: `id:${entityIds.join("|")}`,
      select: fields.join(",")
    });

    return `https://api.openalex.org/${entityType}?${searchParams.toString()}`;
  }

  private buildSingleEntityApiUrl({
    entityType,
    entityId,
    fields
  }: {
    entityType: EntityType;
    entityId: string;
    fields: string[];
  }): string {
    const searchParams = new URLSearchParams({
      select: fields.join(",")
    });

    return `https://api.openalex.org/${entityType}/${entityId}?${searchParams.toString()}`;
  }

  private estimateRequestCost({
    entityCount,
    fieldCount
  }: {
    entityCount: number;
    fieldCount: number;
  }): number {
    // Simple cost estimation based on entity and field count
    const baseEntityCost = 100; // bytes per entity
    const fieldCost = 50; // bytes per field
    return entityCount * (baseEntityCost + fieldCount * fieldCost);
  }

  private createDefaultMetadata(): { count: number; db_response_time_ms: number; page: number; per_page: number; groups_count?: number | undefined; } {
    return {
      count: 0,
      db_response_time_ms: 0,
      page: 1,
      per_page: 25
    };
  }
}