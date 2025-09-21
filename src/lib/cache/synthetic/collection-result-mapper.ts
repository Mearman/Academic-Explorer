/**
 * Collection Result Mapper
 * Implements collection result mapping and pagination tracking across storage tiers
 * Maps filtered queries to entity ID lists with metadata
 */

import { logger } from "@/lib/logger";
import {
  CollectionResultMapping,
  CollectionMetadata,
  StorageTier,
  StorageTierInterface,
  EntityType,
  QueryParams,
  CachePolicy
} from "./types";

export class CollectionResultMapper implements StorageTierInterface {
  private memoryCollections = new Map<string, CollectionResultMapping[string]>();
  private policy: CachePolicy;

  constructor(policy: CachePolicy) {
    this.policy = policy;
  }

  /**
   * Get collection page with metadata validation
   */
  getCollectionPage(queryKey: string, page: number): Promise<string[] | null> {
    const collection = this.memoryCollections.get(queryKey);

    if (!collection) {
      return Promise.resolve(null);
    }

    // Check if collection is expired
    if (this.isCollectionExpired(collection.metadata)) {
      this.memoryCollections.delete(queryKey);
      logger.debug("cache", "Collection expired and removed from memory", { queryKey });
      return Promise.resolve(null);
    }

    const entityIds = collection.pages[page];
    if (entityIds) {
      logger.debug("cache", "Retrieved collection page from memory mapper", {
        queryKey,
        page,
        entityCount: entityIds.length
      });

      // Update last accessed time
      collection.metadata.lastFetched = new Date().toISOString();
    }

    return Promise.resolve(entityIds || null);
  }

  /**
   * Store collection page with metadata tracking
   */
  putCollectionPage(queryKey: string, page: number, entityIds: string[]): Promise<void> {
    let collection = this.memoryCollections.get(queryKey);

    if (!collection) {
      // Create new collection entry
      collection = {
        pages: {},
        metadata: {
          totalCount: 0, // Will be updated when we have full metadata
          lastFetched: new Date().toISOString(),
          ttl: this.getCollectionTTL(queryKey),
          isComplete: false,
          filters: this.extractFiltersFromQueryKey(queryKey),
          sort: this.extractSortFromQueryKey(queryKey)
        }
      };
    }

    // Store the page
    collection.pages[page] = entityIds;
    collection.metadata.lastFetched = new Date().toISOString();

    this.memoryCollections.set(queryKey, collection);

    logger.debug("cache", "Stored collection page in memory mapper", {
      queryKey,
      page,
      entityCount: entityIds.length,
      totalPages: Object.keys(collection.pages).length
    });

    // Clean up expired collections periodically
    if (Math.random() < 0.05) { // 5% chance
      this.cleanupExpiredCollections();
    }

    return Promise.resolve();
  }

  /**
   * Get collection metadata
   */
  getCollectionMetadata(queryKey: string): Promise<CollectionMetadata | null> {
    const collection = this.memoryCollections.get(queryKey);

    if (!collection) {
      return Promise.resolve(null);
    }

    // Check if collection is expired
    if (this.isCollectionExpired(collection.metadata)) {
      this.memoryCollections.delete(queryKey);
      return Promise.resolve(null);
    }

    return Promise.resolve(collection.metadata);
  }

  /**
   * Store or update collection metadata
   */
  putCollectionMetadata(queryKey: string, metadata: CollectionMetadata): Promise<void> {
    let collection = this.memoryCollections.get(queryKey);

    if (!collection) {
      collection = {
        pages: {},
        metadata
      };
    } else {
      // Merge metadata, preserving existing page data
      collection.metadata = {
        ...collection.metadata,
        ...metadata,
        lastFetched: new Date().toISOString()
      };
    }

    this.memoryCollections.set(queryKey, collection);

    logger.debug("cache", "Updated collection metadata in memory mapper", {
      queryKey,
      totalCount: metadata.totalCount,
      isComplete: metadata.isComplete
    });

    return Promise.resolve();
  }

  /**
   * Delete collection from mapper
   */
  deleteCollection(queryKey: string): Promise<void> {
    const deleted = this.memoryCollections.delete(queryKey);

    if (deleted) {
      logger.debug("cache", "Deleted collection from memory mapper", { queryKey });
    }

    return Promise.resolve();
  }

  /**
   * Generate normalized query key from parameters
   */
  generateQueryKey(entityType: EntityType, params: QueryParams): string {
    // Normalize parameters for consistent keying
    const normalizedParams: Record<string, unknown> = {};

    // Sort and normalize filters
    if (params.filter) {
      const sortedFilters = Object.keys(params.filter)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          if (params.filter && key in params.filter) {
            acc[key] = params.filter[key];
          }
          return acc;
        }, {});
      normalizedParams.filter = sortedFilters;
    }

    // Include sort if specified
    if (params.sort) {
      normalizedParams.sort = params.sort;
    }

    // Include select fields for cache key uniqueness
    if (params.select) {
      normalizedParams.select = Array.isArray(params.select)
        ? params.select.sort().join(",")
        : params.select;
    }

    // Create deterministic key
    const keyParts = [
      entityType,
      Object.entries(normalizedParams)
        .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
        .join("|")
    ].filter(Boolean);

    return keyParts.join("|");
  }

  /**
   * Check if query key matches collection pattern
   */
  matchesCollection(queryKey: string, entityType: EntityType, filters: Record<string, unknown>): boolean {
    const collection = this.memoryCollections.get(queryKey);
    if (!collection) return false;

    // Check entity type match
    if (!queryKey.startsWith(entityType)) return false;

    // Check filter match
    const collectionFilters = collection.metadata.filters;
    return this.filtersMatch(collectionFilters, filters);
  }

  /**
   * Get all available pages for a collection
   */
  getAvailablePages(queryKey: string): number[] {
    const collection = this.memoryCollections.get(queryKey);
    if (!collection) return [];

    return Object.keys(collection.pages)
      .map(Number)
      .sort((a, b) => a - b);
  }

  /**
   * Get total entity count across all cached pages
   */
  getCachedEntityCount(queryKey: string): number {
    const collection = this.memoryCollections.get(queryKey);
    if (!collection) return 0;

    const pages = collection.pages;
    return Object.keys(pages)
      .reduce((total: number, pageKey: string) => {
        const pageNum = parseInt(pageKey, 10);
        const entityIds = pages[pageNum];
        return Array.isArray(entityIds) ? total + entityIds.length : total;
      }, 0);
  }

  /**
   * Check if collection is complete (all pages cached)
   */
  isCollectionComplete(queryKey: string): boolean {
    const collection = this.memoryCollections.get(queryKey);
    if (!collection) return false;

    return collection.metadata.isComplete;
  }

  /**
   * Mark collection as complete
   */
  markCollectionComplete(queryKey: string, totalCount: number): Promise<void> {
    const collection = this.memoryCollections.get(queryKey);
    if (collection) {
      collection.metadata.isComplete = true;
      collection.metadata.totalCount = totalCount;
      collection.metadata.lastFetched = new Date().toISOString();

      logger.debug("cache", "Marked collection as complete", {
        queryKey,
        totalCount,
        cachedPages: Object.keys(collection.pages).length
      });
    }

    return Promise.resolve();
  }

  /**
   * Get collections that can benefit from static data generation
   */
  getPopularCollections(minAccess = 5): Array<{
    queryKey: string;
    metadata: CollectionMetadata;
    pageCount: number;
    entityCount: number;
  }> {
    const popular: Array<{
      queryKey: string;
      metadata: CollectionMetadata;
      pageCount: number;
      entityCount: number;
    }> = [];

    // Simple heuristic: collections with multiple pages are likely popular
    for (const [queryKey, collection] of this.memoryCollections) {
      const pageCount = Object.keys(collection.pages).length;
      const entityCount = this.getCachedEntityCount(queryKey);

      if (pageCount >= minAccess || entityCount >= 50) {
        popular.push({
          queryKey,
          metadata: collection.metadata,
          pageCount,
          entityCount
        });
      }
    }

    return popular.sort((a, b) => b.entityCount - a.entityCount);
  }

  /**
   * Get memory usage statistics
   */
  getStats(): Promise<Record<string, unknown>> {
    const collections = this.memoryCollections.size;

    let totalEntities = 0;
    let totalSize = 0;

    for (const [queryKey, collection] of this.memoryCollections.entries()) {
      totalEntities += this.getCachedEntityCount(queryKey);
      totalSize += this.estimateCollectionSize(collection);
    }

    return Promise.resolve({
      [StorageTier.MEMORY]: {
        size: totalSize,
        entities: totalEntities,
        collections
      }
    });
  }

  /**
   * Clear all collections
   */
  clear(): Promise<void> {
    const collectionCount = this.memoryCollections.size;
    this.memoryCollections.clear();

    logger.debug("cache", "Cleared collection result mapper", { collectionCount });

    return Promise.resolve();
  }

  // Entity operations (not directly used by collection mapper but required by interface)
  getEntityFields<T>(_entityType: EntityType, _entityId: string, _fields: string[]): Promise<Partial<T>> {
    return Promise.resolve({}); // CollectionResultMapper doesn't handle entity fields
  }

  putEntityFields(): Promise<void> {
    // No-op: CollectionResultMapper doesn't handle entity fields
    return Promise.resolve();
  }

  deleteEntity(): Promise<void> {
    // No-op: CollectionResultMapper doesn't handle entity fields
    return Promise.resolve();
  }

  getFieldCoverage(): Promise<string[]> {
    return Promise.resolve([]); // CollectionResultMapper doesn't handle entity fields
  }

  hasFields(): Promise<boolean> {
    return Promise.resolve(false); // CollectionResultMapper doesn't handle entity fields
  }

  // Private helper methods

  private isCollectionExpired(metadata: CollectionMetadata): boolean {
    const now = Date.now();
    const lastFetched = new Date(metadata.lastFetched).getTime();
    return (now - lastFetched) > metadata.ttl;
  }

  private getCollectionTTL(queryKey: string): number {
    // Extract entity type from query key
    const entityTypePart = queryKey.split("|")[0];
    if (!entityTypePart) {
      return 24 * 60 * 60 * 1000; // Default 24 hours
    }

    // Check if it's a valid EntityType using type guard
    if (this.isValidEntityType(entityTypePart)) {
      return this.policy.collectionTTL[entityTypePart] || 24 * 60 * 60 * 1000;
    }

    return 24 * 60 * 60 * 1000; // Default 24 hours
  }

  private isValidEntityType(value: string): value is EntityType {
    const validEntityTypes = ["works", "authors", "sources", "institutions", "topics", "publishers", "funders"];
    return validEntityTypes.includes(value);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private extractFiltersFromQueryKey(queryKey: string): Record<string, unknown> {
    try {
      const filterPart = queryKey.split("|").find(part => part.startsWith("filter:"));
      if (filterPart) {
        const filterJson = filterPart.replace("filter:", "");
        const parsed: unknown = JSON.parse(filterJson);
        if (this.isRecord(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      logger.warn("cache", "Failed to extract filters from query key", { queryKey, error });
    }
    return {};
  }

  private extractSortFromQueryKey(queryKey: string): string | undefined {
    const sortPart = queryKey.split("|").find(part => part.startsWith("sort:"));
    if (sortPart) {
      try {
        const parsed: unknown = JSON.parse(sortPart.replace("sort:", ""));
        if (typeof parsed === "string") {
          return parsed;
        }
      } catch (error) {
        logger.warn("cache", "Failed to extract sort from query key", { queryKey, error });
      }
    }
    return undefined;
  }

  private filtersMatch(filters1: Record<string, unknown>, filters2: Record<string, unknown>): boolean {
    const keys1 = Object.keys(filters1).sort();
    const keys2 = Object.keys(filters2).sort();

    if (keys1.length !== keys2.length) return false;

    return keys1.every(key => {
      return JSON.stringify(filters1[key]) === JSON.stringify(filters2[key]);
    });
  }

  private cleanupExpiredCollections(): void {
    const toDelete: string[] = [];

    for (const [queryKey, collection] of this.memoryCollections) {
      if (this.isCollectionExpired(collection.metadata)) {
        toDelete.push(queryKey);
      }
    }

    toDelete.forEach(key => this.memoryCollections.delete(key));

    if (toDelete.length > 0) {
      logger.debug("cache", "Cleaned up expired collections from memory mapper", {
        deletedCount: toDelete.length,
        remainingCount: this.memoryCollections.size
      });
    }
  }

  private estimateCollectionSize(collection: CollectionResultMapping[string]): number {
    try {
      return new Blob([JSON.stringify(collection)]).size;
    } catch {
      // Fallback estimation
      const pageCount = Object.keys(collection.pages).length;
      const avgEntitiesPerPage = Object.values(collection.pages)
        .reduce((sum: number, entities: string[]) => sum + entities.length, 0) / Math.max(pageCount, 1);
      return pageCount * avgEntitiesPerPage * 50; // 50 bytes per entity ID estimate
    }
  }
}