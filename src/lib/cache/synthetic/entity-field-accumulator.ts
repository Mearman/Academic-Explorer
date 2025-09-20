/**
 * Entity Field Accumulator
 * Implements field-level entity data accumulation across storage tiers
 * Builds complete entity data from partial API requests over time
 */

import { logger } from "@/lib/logger";
import {
  EntityType,
  EntityFieldData,
  StorageTier,
  StorageTierInterface,
  FieldCoverageByTier,
  CachePolicy
} from "./types";

export class EntityFieldAccumulator implements StorageTierInterface {
  private memoryCache = new Map<string, EntityFieldData>();
  private policy: CachePolicy;

  constructor(policy: CachePolicy) {
    this.policy = policy;
  }

  /**
   * Get entity fields with field-level precision
   */
  getEntityFields<T>(
    entityType: EntityType,
    entityId: string,
    fields: string[]
  ): Promise<Partial<T>> {
    const cacheKey = this.getCacheKey(entityType, entityId);
    const cachedEntity = this.memoryCache.get(cacheKey);

    if (!cachedEntity) {
      return {};
    }

    // Check TTL for each field
    const result: Partial<T> = {};
    const now = Date.now();

    for (const field of fields) {
      if (field in cachedEntity) {
        const fieldSource = cachedEntity._metadata.fieldSources[field];
        const fieldTTL = this.getFieldTTL(entityType, field);

        // Check if field is still valid
        if (fieldSource && (now - new Date(fieldSource).getTime()) < fieldTTL) {
          // Safely assign the field to result
          Object.assign(result, { [field]: cachedEntity[field] });
        } else {
          // Field expired, remove it
          const updatedEntity = { ...cachedEntity };
          const { [field]: removedField, ...remainingFields } = updatedEntity;
          const { [field]: removedSource, ...remainingSources } = updatedEntity._metadata.fieldSources;
          updatedEntity._metadata.fieldSources = remainingSources;
          Object.assign(cachedEntity, remainingFields);
          cachedEntity._metadata.fieldSources = remainingSources;
          logger.debug("cache", "Field expired and removed from memory cache", {
            entityType,
            entityId,
            field,
            age: now - new Date(fieldSource || 0).getTime(),
            ttl: fieldTTL
          });
        }
      }
    }

    // Update access time if we found any data
    if (Object.keys(result).length > 0) {
      cachedEntity._metadata.lastUpdated = new Date().toISOString();
    }

    logger.debug("cache", "Retrieved entity fields from memory accumulator", {
      entityType,
      entityId,
      requestedFields: fields,
      foundFields: Object.keys(result),
      missingFields: fields.filter(f => !(f in result))
    });

    return Promise.resolve(result);
  }

  /**
   * Accumulate entity fields with metadata tracking
   */
  putEntityFields<T>(
    entityType: EntityType,
    entityId: string,
    data: Partial<T>
  ): Promise<void> {
    const cacheKey = this.getCacheKey(entityType, entityId);
    const now = new Date().toISOString();

    // Get existing entity data or create new
    let entityData = this.memoryCache.get(cacheKey);
    if (!entityData) {
      entityData = {
        _metadata: {
          lastUpdated: now,
          ttl: this.getDefaultTTL(entityType),
          fieldSources: {},
          tier: StorageTier.MEMORY
        }
      };
    }

    // Accumulate new fields
    const newFields: string[] = [];
    const updatedFields: string[] = [];

    Object.entries(data).forEach(([field, value]) => {
      if (field === "_metadata") return; // Skip metadata

      const isNewField = !(field in entityData);

      entityData[field] = value;
      entityData._metadata.fieldSources[field] = now;
      entityData._metadata.lastUpdated = now;

      if (isNewField) {
        newFields.push(field);
      } else {
        updatedFields.push(field);
      }
    });

    // Store updated entity
    this.memoryCache.set(cacheKey, entityData);

    logger.debug("cache", "Accumulated entity fields in memory", {
      entityType,
      entityId,
      newFields,
      updatedFields,
      totalFields: Object.keys(entityData).filter(k => k !== "_metadata").length
    });

    // Clean up expired entries periodically
    if (Math.random() < 0.01) { // 1% chance
      void this.cleanupExpiredEntries();
    }

    return Promise.resolve();
  }

  /**
   * Delete entity from accumulator
   */
  deleteEntity(entityType: EntityType, entityId: string): Promise<void> {
    const cacheKey = this.getCacheKey(entityType, entityId);
    const deleted = this.memoryCache.delete(cacheKey);

    if (deleted) {
      logger.debug("cache", "Deleted entity from memory accumulator", { entityType, entityId });
    }

    return Promise.resolve();
  }

  /**
   * Get field coverage for an entity
   */
  getFieldCoverage(entityType: EntityType, entityId: string): Promise<string[]> {
    const cacheKey = this.getCacheKey(entityType, entityId);
    const entityData = this.memoryCache.get(cacheKey);

    if (!entityData) {
      return [];
    }

    // Return only non-expired fields
    const now = Date.now();
    const validFields: string[] = [];

    Object.keys(entityData).forEach(field => {
      if (field === "_metadata") return;

      const fieldSource = entityData._metadata.fieldSources[field];
      const fieldTTL = this.getFieldTTL(entityType, field);

      if (fieldSource && (now - new Date(fieldSource).getTime()) < fieldTTL) {
        validFields.push(field);
      }
    });

    return Promise.resolve(validFields);
  }

  /**
   * Check if entity has specific fields
   */
  async hasFields(entityType: EntityType, entityId: string, fields: string[]): Promise<boolean> {
    const availableFields = await this.getFieldCoverage(entityType, entityId);
    return fields.every(field => availableFields.includes(field));
  }

  /**
   * Get field coverage organized by tier (for this accumulator, only memory)
   */
  async getFieldCoverageByTier(entityType: EntityType, entityId: string): Promise<FieldCoverageByTier> {
    const memoryFields = await this.getFieldCoverage(entityType, entityId);

    return {
      memory: memoryFields,
      localStorage: [],
      indexedDB: [],
      static: [],
      total: memoryFields
    };
  }

  /**
   * Merge field data from multiple entities (useful for collection processing)
   */
  async mergeEntityFields<T>(
    entityType: EntityType,
    entityFieldMap: Map<string, Partial<T>>
  ): Promise<void> {
    for (const [entityId, fieldData] of entityFieldMap) {
      await this.putEntityFields(entityType, entityId, fieldData);
    }

    logger.debug("cache", "Merged entity fields from collection", {
      entityType,
      entityCount: entityFieldMap.size,
      totalFields: Array.from(entityFieldMap.values())
        .reduce((sum, data) => sum + Object.keys(data).length, 0)
    });
  }

  /**
   * Get entities that have accumulated enough fields for optimization
   */
  getWellPopulatedEntities(entityType: EntityType, minFields = 5): Array<{
    entityId: string;
    fieldCount: number;
    fields: string[];
  }> {
    const wellPopulated: Array<{
      entityId: string;
      fieldCount: number;
      fields: string[];
    }> = [];

    for (const [cacheKey, entityData] of this.memoryCache) {
      if (!cacheKey.startsWith(`${entityType}:`)) continue;

      const entityId = cacheKey.replace(`${entityType}:`, "");
      const fields = Object.keys(entityData).filter(k => k !== "_metadata");

      if (fields.length >= minFields) {
        wellPopulated.push({
          entityId,
          fieldCount: fields.length,
          fields
        });
      }
    }

    return wellPopulated.sort((a, b) => b.fieldCount - a.fieldCount);
  }

  /**
   * Get memory usage statistics
   */
  getStats(): Promise<Record<string, unknown>> {
    const entities = this.memoryCache.size;
    let totalFields = 0;
    let totalSize = 0;

    for (const entityData of this.memoryCache.values()) {
      const fields = Object.keys(entityData).filter(k => k !== "_metadata");
      totalFields += fields.length;
      totalSize += this.estimateEntitySize(entityData);
    }

    return Promise.resolve({
      [StorageTier.MEMORY]: {
        size: totalSize,
        entities,
        fields: totalFields
      }
    });
  }

  /**
   * Clear all accumulated data
   */
  clear(): Promise<void> {
    const entityCount = this.memoryCache.size;
    this.memoryCache.clear();

    logger.debug("cache", "Cleared entity field accumulator", { entityCount });

    return Promise.resolve();
  }

  // Collection operations (not directly used by accumulator but required by interface)
  getCollectionPage(): Promise<string[] | null> {
    return Promise.resolve(null); // EntityFieldAccumulator doesn't handle collections
  }

  async putCollectionPage(): Promise<void> {
    // No-op: EntityFieldAccumulator doesn't handle collections
  }

  getCollectionMetadata(): Promise<unknown> {
    return Promise.resolve(null); // EntityFieldAccumulator doesn't handle collections
  }

  async putCollectionMetadata(): Promise<void> {
    // No-op: EntityFieldAccumulator doesn't handle collections
  }

  async deleteCollection(): Promise<void> {
    // No-op: EntityFieldAccumulator doesn't handle collections
  }

  // Private helper methods

  private getCacheKey(entityType: EntityType, entityId: string): string {
    return `${entityType}:${entityId}`;
  }

  private getFieldTTL(entityType: EntityType, field: string): number {
    return this.policy.entityTTL[entityType]?.[field] ||
           this.policy.entityTTL[entityType]?.["default"] ||
           24 * 60 * 60 * 1000; // Default 24 hours
  }

  private getDefaultTTL(entityType: EntityType): number {
    return this.policy.entityTTL[entityType]?.["default"] || 24 * 60 * 60 * 1000;
  }

  private cleanupExpiredEntries(): Promise<void> {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [cacheKey, entityData] of this.memoryCache) {
      const lastUpdated = new Date(entityData._metadata.lastUpdated).getTime();
      const maxAge = entityData._metadata.ttl;

      if (now - lastUpdated > maxAge) {
        toDelete.push(cacheKey);
      }
    }

    toDelete.forEach(key => this.memoryCache.delete(key));

    if (toDelete.length > 0) {
      logger.debug("cache", "Cleaned up expired entities from memory accumulator", {
        deletedCount: toDelete.length,
        remainingCount: this.memoryCache.size
      });
    }

    return Promise.resolve();
  }

  private estimateEntitySize(entityData: EntityFieldData): number {
    try {
      return new Blob([JSON.stringify(entityData)]).size;
    } catch {
      // Fallback estimation
      return Object.keys(entityData).length * 100;
    }
  }
}