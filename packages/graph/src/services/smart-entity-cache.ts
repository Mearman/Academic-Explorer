/**
 * SmartEntityCache - Field-level caching with incremental saturation
 *
 * Provides intelligent caching for entity data with field-level granularity,
 * allowing entities to be progressively enriched with additional fields
 * without duplicate API requests.
 *
 * Features:
 * - Field-level caching and freshness tracking
 * - Incremental data saturation (progressive enrichment)
 * - Batch request optimization and deduplication
 * - Predictive field loading based on usage patterns
 * - Memory-efficient storage with expiration
 * - Comprehensive statistics and monitoring
 */

import type { EntityType } from '../types/core';

/**
 * Context information for cache operations and decision making
 */
export interface CacheContext {
  source?: string;
  priority?: 'low' | 'normal' | 'high';
  prefetch?: boolean;
  expectedFields?: string[];
  userAction?: 'click' | 'hover' | 'search' | 'expand';
}

/**
 * Cached entity with field-level metadata
 */
export interface CachedEntity {
  id: string;
  entityType: EntityType;

  // Core data storage
  data: Partial<Record<string, unknown>>;

  // Field-level metadata
  cachedFields: Set<string>;
  fieldTimestamps: Map<string, number>;

  // Entity metadata
  lastAccessed: number;
  accessCount: number;
  completenessScore: number;

  // Field dependencies - tracks which fields are commonly requested together
  fieldDependencies: Map<string, Set<string>>;

  // Validation metadata
  isStale: boolean;
  staleSince?: number;
  errors: Map<string, string>; // field -> error message
}

/**
 * Field request for batch operations
 */
export interface FieldRequest {
  id: string;
  entityType: EntityType;
  fields: string[];
  priority?: number;
  context?: CacheContext;
}

/**
 * Optimized batch request grouping related field requests
 */
export interface BatchRequest {
  entityType: EntityType;
  requests: Array<{
    id: string;
    fields: string[];
    priority: number;
  }>;
  totalFields: Set<string>;
  priority: number;
}

/**
 * Cache statistics for monitoring and optimization
 */
export interface CacheStats {
  // Basic metrics
  entityCount: number;
  totalMemoryUsage: number;
  hitRate: number;
  missRate: number;

  // Field-level metrics
  averageFieldsPerEntity: number;
  totalFieldsStored: number;
  staleFieldCount: number;

  // Performance metrics
  averageRetrievalTime: number;
  batchEfficiencyRatio: number;
  predictionAccuracy: number;

  // Access patterns
  topAccessedEntities: Array<{ id: string; accessCount: number }>;
  commonFieldPatterns: Array<{ fields: string[]; frequency: number }>;

  // Time-based metrics
  oldestEntity: number;
  newestEntity: number;
  averageEntityAge: number;
}

/**
 * Entity data type - flexible structure for OpenAlex entities
 */
export type EntityData = Record<string, unknown>;

/**
 * Data provider interface for fetching entity data
 */
export interface EntityDataProvider {
  fetchEntity(id: string, entityType: EntityType, fields?: string[]): Promise<EntityData>;
  fetchEntities(requests: Array<{ id: string; entityType: EntityType; fields?: string[] }>): Promise<Array<{ id: string; data: EntityData; error?: string }>>;
}

/**
 * Smart entity cache with field-level caching and incremental saturation
 */
export class SmartEntityCache {
  private cache = new Map<string, CachedEntity>();
  private dataProvider: EntityDataProvider;
  private defaultMaxAge: number;
  private maxCacheSize: number;

  // Performance tracking
  private stats = {
    hits: 0,
    misses: 0,
    fetchTime: 0,
    batchRequests: 0,
    predictedFields: 0,
    correctPredictions: 0,
  };

  // Field usage patterns for prediction
  private fieldUsagePatterns = new Map<string, Map<string, number>>(); // entityType -> field -> usage count
  private fieldCoOccurrence = new Map<string, Map<string, Set<string>>>(); // entityType -> field -> co-occurring fields

  constructor(
    dataProvider: EntityDataProvider,
    options: {
      defaultMaxAge?: number;
      maxCacheSize?: number;
    } = {}
  ) {
    this.dataProvider = dataProvider;
    this.defaultMaxAge = options.defaultMaxAge ?? 1000 * 60 * 15; // 15 minutes
    this.maxCacheSize = options.maxCacheSize ?? 10000;
  }

  /**
   * Get entity data ensuring specified fields are available
   */
  async getEntity(id: string, requiredFields: string[], context: CacheContext = {}): Promise<EntityData> {
    const startTime = performance.now();

    try {
      // Ensure required fields are cached
      await this.ensureFields(id, requiredFields, context);

      // Retrieve from cache
      const cached = this.cache.get(id);
      if (!cached) {
        throw new Error(`Entity ${id} not found in cache after ensure operation`);
      }

      // Update access tracking
      cached.lastAccessed = Date.now();
      cached.accessCount++;

      // Track field usage patterns
      this.updateFieldUsagePatterns(cached.entityType, requiredFields);

      // Extract requested fields
      const result: EntityData = {};
      for (const field of requiredFields) {
        if (cached.cachedFields.has(field)) {
          result[field] = cached.data[field];
        }
      }

      this.stats.hits++;
      return result;

    } finally {
      this.stats.fetchTime += performance.now() - startTime;
    }
  }

  /**
   * Ensure specified fields are available in cache for entity
   */
  async ensureFields(id: string, fields: string[], context: CacheContext = {}): Promise<void> {
    const cached = this.cache.get(id);
    const missingFields = this.getMissingFields(cached, fields);

    if (missingFields.length === 0) {
      return; // All fields already cached
    }

    // Detect entity type if not cached
    let entityType: EntityType;
    if (cached) {
      entityType = cached.entityType;
    } else {
      // Try to detect entity type from ID format
      entityType = this.detectEntityType(id);
    }

    // Predict additional fields that might be needed
    const predictedFields = context.prefetch !== false
      ? this.predictNextFields(id, entityType, context)
      : [];

    const allFieldsToFetch = Array.from(new Set([...missingFields, ...predictedFields]));

    try {
      // Fetch missing data
      const entityData = await this.dataProvider.fetchEntity(id, entityType, allFieldsToFetch);

      // Merge into cache
      this.mergeCachedData(id, entityData, allFieldsToFetch, entityType);

      this.stats.predictedFields += predictedFields.length;
      this.stats.correctPredictions += predictedFields.filter(field =>
        Object.prototype.hasOwnProperty.call(entityData, field) && entityData[field] != null
      ).length;

    } catch (error) {
      // Store error information
      const entity = this.getOrCreateCachedEntity(id, entityType);
      for (const field of missingFields) {
        entity.errors.set(field, error instanceof Error ? error.message : String(error));
      }

      this.log('error', `Failed to fetch fields ${missingFields.join(', ')} for ${id}:`, error);
      throw error;
    }
  }

  /**
   * Batch ensure fields for multiple entities
   */
  async batchEnsureFields(requests: FieldRequest[]): Promise<void> {
    if (requests.length === 0) return;

    // Optimize batch requests
    const batchRequests = this.optimizeBatchRequests(requests);
    this.stats.batchRequests++;

    // Process each optimized batch
    for (const batch of batchRequests) {
      const fetchRequests = batch.requests.map(req => ({
        id: req.id,
        entityType: batch.entityType,
        fields: req.fields,
      }));

      try {
        const results = await this.dataProvider.fetchEntities(fetchRequests);

        // Process results
        for (const result of results) {
          if (result.error) {
            const entity = this.getOrCreateCachedEntity(result.id, batch.entityType);
            const request = batch.requests.find(r => r.id === result.id);
            if (request) {
              for (const field of request.fields) {
                entity.errors.set(field, result.error);
              }
            }
            continue;
          }

          const request = batch.requests.find(r => r.id === result.id);
          if (request) {
            this.mergeCachedData(result.id, result.data, request.fields, batch.entityType);
          }
        }

      } catch (error) {
        this.log('error', `Batch request failed for ${batch.entityType}:`, error);

        // Mark all fields as errored
        for (const request of batch.requests) {
          const entity = this.getOrCreateCachedEntity(request.id, batch.entityType);
          for (const field of request.fields) {
            entity.errors.set(field, error instanceof Error ? error.message : String(error));
          }
        }
      }
    }
  }

  /**
   * Get fields that are missing from cache
   */
  getMissingFields(cached: CachedEntity | undefined, required: string[]): string[] {
    if (!cached) {
      return [...required];
    }

    const missing: string[] = [];
    const now = Date.now();

    for (const field of required) {
      if (!cached.cachedFields.has(field)) {
        missing.push(field);
      } else {
        // Check if field is stale
        const timestamp = cached.fieldTimestamps.get(field);
        if (timestamp && (now - timestamp) > this.defaultMaxAge) {
          missing.push(field);
        }
      }
    }

    return missing;
  }

  /**
   * Merge new data into cached entity
   */
  mergeCachedData(id: string, newData: EntityData, fields: string[], entityType: EntityType): void {
    const entity = this.getOrCreateCachedEntity(id, entityType);
    const now = Date.now();

    // Merge data and update field metadata
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(newData, field)) {
        entity.data[field] = newData[field];
        entity.cachedFields.add(field);
        entity.fieldTimestamps.set(field, now);
        entity.errors.delete(field); // Clear any previous errors
      }
    }

    // Update completeness and metadata
    entity.completenessScore = this.calculateCompleteness(entity);
    entity.isStale = false;
    entity.staleSince = undefined;

    // Enforce cache size limit
    this.enforceMaxCacheSize();
  }

  /**
   * Calculate completeness score for entity
   */
  calculateCompleteness(entity: CachedEntity, _context: CacheContext = {}): number {
    // Base completeness on number of cached fields
    const totalFields = entity.cachedFields.size;

    if (totalFields === 0) return 0;

    // Weight by field importance (basic implementation)
    const importantFields = this.getImportantFields(entity.entityType);
    const importantFieldsPresent = importantFields.filter(field =>
      entity.cachedFields.has(field)
    ).length;

    // Combine field count and important field coverage
    const fieldCountScore = Math.min(totalFields / 20, 1); // Cap at 20 fields for full score
    const importantFieldScore = importantFieldsPresent / importantFields.length;

    return (fieldCountScore * 0.6) + (importantFieldScore * 0.4);
  }

  /**
   * Predict next fields that might be requested
   */
  predictNextFields(id: string, entityType: EntityType, _context: CacheContext = {}): string[] {
    const cached = this.cache.get(id);
    const predictions: string[] = [];

    // Get field co-occurrence patterns
    const coOccurrence = this.fieldCoOccurrence.get(entityType);
    if (!coOccurrence || !cached) return predictions;

    // Find fields that commonly co-occur with already cached fields
    const fieldScores = new Map<string, number>();

    Array.from(cached.cachedFields).forEach(cachedField => {
      const relatedFields = coOccurrence.get(cachedField);
      if (relatedFields) {
        Array.from(relatedFields).forEach(field => {
          if (!cached.cachedFields.has(field)) {
            fieldScores.set(field, (fieldScores.get(field) ?? 0) + 1);
          }
        });
      }
    });

    // Sort by score and return top predictions
    const sortedPredictions = Array.from(fieldScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) // Limit to top 5 predictions
      .map(([field]) => field);

    return sortedPredictions;
  }

  /**
   * Optimize batch requests by grouping and deduplicating
   */
  optimizeBatchRequests(requests: FieldRequest[]): BatchRequest[] {
    const batches = new Map<EntityType, Map<string, FieldRequest>>();

    // Group by entity type and deduplicate by entity ID
    for (const request of requests) {
      if (!batches.has(request.entityType)) {
        batches.set(request.entityType, new Map());
      }

      const entityBatch = batches.get(request.entityType);
      if (!entityBatch) continue; // Should never happen due to check above;
      const existing = entityBatch.get(request.id);

      if (existing) {
        // Merge field lists and use higher priority
        existing.fields = Array.from(new Set([...existing.fields, ...request.fields]));
        existing.priority = Math.max(existing.priority ?? 0, request.priority ?? 0);
      } else {
        entityBatch.set(request.id, { ...request });
      }
    }

    // Convert to BatchRequest format
    const result: BatchRequest[] = [];
    Array.from(batches.entries()).forEach(([entityType, entityBatch]) => {
      const batchRequests = Array.from(entityBatch.values()).map(req => ({
        id: req.id,
        fields: this.getMissingFields(this.cache.get(req.id), req.fields),
        priority: req.priority ?? 0,
      })).filter(req => req.fields.length > 0); // Only include requests with missing fields

      if (batchRequests.length > 0) {
        const allFields = new Set<string>();
        let maxPriority = 0;

        for (const req of batchRequests) {
          req.fields.forEach(field => allFields.add(field));
          maxPriority = Math.max(maxPriority, req.priority);
        }

        result.push({
          entityType,
          requests: batchRequests,
          totalFields: allFields,
          priority: maxPriority,
        });
      }
    });

    // Sort by priority
    return result.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Invalidate stale fields across all entities
   */
  invalidateStaleFields(maxAge: number = this.defaultMaxAge): void {
    const now = Date.now();
    let invalidatedCount = 0;

    Array.from(this.cache.values()).forEach(entity => {
      const staleBefore = entity.cachedFields.size;

      Array.from(entity.fieldTimestamps.entries()).forEach(([field, timestamp]) => {
        if ((now - timestamp) > maxAge) {
          entity.cachedFields.delete(field);
          entity.fieldTimestamps.delete(field);
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete entity.data[field];
          entity.errors.delete(field);
        }
      });

      const staleAfter = entity.cachedFields.size;
      if (staleBefore !== staleAfter) {
        entity.isStale = entity.cachedFields.size === 0;
        if (entity.isStale) {
          entity.staleSince = now;
        }
        entity.completenessScore = this.calculateCompleteness(entity);
        invalidatedCount += staleBefore - staleAfter;
      }
    });

    this.log('debug', `Invalidated ${invalidatedCount} stale fields`);
  }

  /**
   * Invalidate specific fields for an entity
   */
  invalidateFields(id: string, fields: string[]): void {
    const entity = this.cache.get(id);
    if (!entity) return;

    for (const field of fields) {
      entity.cachedFields.delete(field);
      entity.fieldTimestamps.delete(field);
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete entity.data[field];
      entity.errors.delete(field);
    }

    entity.completenessScore = this.calculateCompleteness(entity);
    entity.isStale = entity.cachedFields.size === 0;
    if (entity.isStale) {
      entity.staleSince = Date.now();
    }
  }

  /**
   * Force refresh specific fields for an entity
   */
  async refreshFields(id: string, fields: string[]): Promise<void> {
    this.invalidateFields(id, fields);
    await this.ensureFields(id, fields);
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): CacheStats {
    const entities = Array.from(this.cache.values());
    const now = Date.now();

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    const fieldCounts = entities.map(e => e.cachedFields.size);
    const avgFields = fieldCounts.length > 0
      ? fieldCounts.reduce((a, b) => a + b, 0) / fieldCounts.length
      : 0;

    const staleCount = entities.reduce((count, entity) => {
      return count + Array.from(entity.fieldTimestamps.values()).filter(timestamp =>
        (now - timestamp) > this.defaultMaxAge
      ).length;
    }, 0);

    const entityAges = entities.map(e => now - e.lastAccessed);
    const avgAge = entityAges.length > 0
      ? entityAges.reduce((a, b) => a + b, 0) / entityAges.length
      : 0;

    return {
      entityCount: entities.length,
      totalMemoryUsage: this.calculateMemoryUsage(),
      hitRate,
      missRate: 1 - hitRate,
      averageFieldsPerEntity: avgFields,
      totalFieldsStored: fieldCounts.reduce((a, b) => a + b, 0),
      staleFieldCount: staleCount,
      averageRetrievalTime: this.stats.fetchTime / Math.max(totalRequests, 1),
      batchEfficiencyRatio: this.stats.batchRequests > 0 ? totalRequests / this.stats.batchRequests : 0,
      predictionAccuracy: this.stats.predictedFields > 0 ? this.stats.correctPredictions / this.stats.predictedFields : 0,
      topAccessedEntities: entities
        .sort((a, b) => b.accessCount - a.accessCount)
        .slice(0, 10)
        .map(e => ({ id: e.id, accessCount: e.accessCount })),
      commonFieldPatterns: this.getCommonFieldPatterns(),
      oldestEntity: Math.min(...entityAges),
      newestEntity: Math.max(...entityAges),
      averageEntityAge: avgAge,
    };
  }

  /**
   * Clear cache completely
   */
  clear(): void {
    this.cache.clear();
    this.fieldUsagePatterns.clear();
    this.fieldCoOccurrence.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      fetchTime: 0,
      batchRequests: 0,
      predictedFields: 0,
      correctPredictions: 0,
    };
  }

  /**
   * Remove specific entity from cache
   */
  evict(id: string): boolean {
    return this.cache.delete(id);
  }

  // Private helper methods

  private getOrCreateCachedEntity(id: string, entityType: EntityType): CachedEntity {
    let entity = this.cache.get(id);

    if (!entity) {
      entity = {
        id,
        entityType,
        data: {},
        cachedFields: new Set(),
        fieldTimestamps: new Map(),
        lastAccessed: Date.now(),
        accessCount: 0,
        completenessScore: 0,
        fieldDependencies: new Map(),
        isStale: false,
        errors: new Map(),
      };

      this.cache.set(id, entity);
    }

    return entity;
  }

  private detectEntityType(id: string): EntityType {
    // Basic entity type detection from OpenAlex ID format
    const prefix = id.charAt(0).toLowerCase();
    switch (prefix) {
      case 'w': return 'works';
      case 'a': return 'authors';
      case 's': return 'sources';
      case 'i': return 'institutions';
      case 'p': return 'publishers';
      case 'f': return 'funders';
      case 't': return 'topics';
      case 'c': return 'concepts';
      case 'k': return 'keywords';
      default: return 'works'; // fallback
    }
  }

  private getImportantFields(entityType: EntityType): string[] {
    // Define important fields by entity type
    const importantFieldsByType: Record<EntityType, string[]> = {
      works: ['id', 'display_name', 'publication_year', 'authorships', 'cited_by_count', 'doi'],
      authors: ['id', 'display_name', 'works_count', 'cited_by_count', 'orcid', 'affiliations'],
      sources: ['id', 'display_name', 'issn_l', 'host_organization', 'works_count'],
      institutions: ['id', 'display_name', 'country_code', 'works_count', 'ror'],
      publishers: ['id', 'display_name', 'country_codes', 'works_count'],
      funders: ['id', 'display_name', 'country_code', 'works_count'],
      topics: ['id', 'display_name', 'works_count', 'field', 'domain'],
      concepts: ['id', 'display_name', 'works_count', 'level'],
      keywords: ['id', 'display_name', 'works_count'],
    };

    return importantFieldsByType[entityType] || [];
  }

  private updateFieldUsagePatterns(entityType: EntityType, fields: string[]): void {
    // Update usage patterns for prediction
    if (!this.fieldUsagePatterns.has(entityType)) {
      this.fieldUsagePatterns.set(entityType, new Map());
    }

    if (!this.fieldCoOccurrence.has(entityType)) {
      this.fieldCoOccurrence.set(entityType, new Map());
    }

    const usage = this.fieldUsagePatterns.get(entityType);
    const coOccur = this.fieldCoOccurrence.get(entityType);

    if (!usage || !coOccur) {
      return; // Should never happen due to initialization above
    }

    // Update usage counts
    for (const field of fields) {
      usage.set(field, (usage.get(field) ?? 0) + 1);

      if (!coOccur.has(field)) {
        coOccur.set(field, new Set());
      }

      // Track co-occurrence
      const coOccurSet = coOccur.get(field);
      if (!coOccurSet) continue; // Should never happen due to initialization above
      for (const otherField of fields) {
        if (field !== otherField) {
          coOccurSet.add(otherField);
        }
      }
    }
  }

  private getCommonFieldPatterns(): Array<{ fields: string[]; frequency: number }> {
    // Analyze field co-occurrence patterns
    const patterns = new Map<string, number>();

    Array.from(this.fieldCoOccurrence.entries()).forEach(([_entityType, coOccur]) => {
      Array.from(coOccur.entries()).forEach(([field, relatedFields]) => {
        if (relatedFields.size > 0) {
          const pattern = [field, ...Array.from(relatedFields)].sort().join(',');
          patterns.set(pattern, (patterns.get(pattern) ?? 0) + 1);
        }
      });
    });

    return Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pattern, frequency]) => ({
        fields: pattern.split(','),
        frequency,
      }));
  }

  private enforceMaxCacheSize(): void {
    if (this.cache.size <= this.maxCacheSize) return;

    // Remove least recently accessed entities
    const entities = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    const toRemove = entities.slice(0, this.cache.size - this.maxCacheSize);
    for (const [id] of toRemove) {
      this.cache.delete(id);
    }

    this.log('debug', `Evicted ${toRemove.length} entities to enforce cache size limit`);
  }

  private calculateMemoryUsage(): number {
    // Rough estimate of memory usage
    let totalSize = 0;

    Array.from(this.cache.values()).forEach(entity => {
      totalSize += JSON.stringify(entity.data).length;
      totalSize += entity.cachedFields.size * 20; // Rough estimate for Set overhead
      totalSize += entity.fieldTimestamps.size * 30; // Rough estimate for Map overhead
    });

    return totalSize;
  }

  private log(level: 'debug' | 'warn' | 'error', message: string, ...args: unknown[]): void {
    // Simple logging implementation - can be replaced with proper logger
    // Suppress console usage in production builds
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      const prefix = `[SmartEntityCache] ${timestamp} [${level.toUpperCase()}]`;

      switch (level) {
        case 'debug':
          // eslint-disable-next-line no-console
          console.debug(prefix, message, ...args);
          break;
        case 'warn':
          // eslint-disable-next-line no-console
          console.warn(prefix, message, ...args);
          break;
        case 'error':
          // eslint-disable-next-line no-console
          console.error(prefix, message, ...args);
          break;
      }
    }
  }
}