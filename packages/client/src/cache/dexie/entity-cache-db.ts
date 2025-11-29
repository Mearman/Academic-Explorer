/**
 * Dexie-based entity cache database
 * Provides persistent browser storage for OpenAlex entity data
 */

import Dexie from "dexie";

import type { StaticEntityType } from "../../internal/static-data-utils";

// Constants
const DB_NAME = "bibgraph-entity-cache";
const DB_VERSION = 1;

/**
 * Cached entity record structure
 */
export interface CachedEntityRecord {
  /** Composite key: entityType:entityId */
  id: string;
  /** Entity type (author, work, etc.) */
  entityType: StaticEntityType;
  /** Entity ID (e.g., A123, W456) */
  entityId: string;
  /** Serialized entity data */
  data: string;
  /** When the entity was cached */
  cachedAt: number;
  /** When the entity was last accessed */
  lastAccessedAt: number;
  /** Number of times this entity has been accessed */
  accessCount: number;
  /** Size of the cached data in bytes */
  dataSize: number;
  /** Optional TTL in milliseconds (null = no expiration) */
  ttl: number | null;
}

/**
 * Cache metadata for statistics (renamed to avoid conflict with disk-writer.ts)
 */
export interface EntityCacheMetadata {
  id: string;
  key: string;
  value: string | number;
  updatedAt: number;
}

/**
 * Dexie database class for entity caching
 */
class EntityCacheDB extends Dexie {
  entities!: Dexie.Table<CachedEntityRecord, string>;
  metadata!: Dexie.Table<EntityCacheMetadata, string>;

  constructor() {
    super(DB_NAME);

    this.version(DB_VERSION).stores({
      // Primary key is composite id, with indexes for common queries
      entities: "id, entityType, entityId, cachedAt, lastAccessedAt, [entityType+entityId]",
      // Metadata for cache statistics
      metadata: "id, key",
    });
  }
}

// Singleton instance (lazily initialized)
let dbInstance: EntityCacheDB | null = null;

/**
 * Check if IndexedDB is available in the current environment
 */
export function isIndexedDBAvailable(): boolean {
  try {
    // Check for browser environment
    if (typeof globalThis === "undefined" || !("indexedDB" in globalThis)) {
      return false;
    }
    // Additional check for indexedDB availability
    return globalThis.indexedDB !== null && globalThis.indexedDB !== undefined;
  } catch {
    return false;
  }
}

/**
 * Get the database instance (lazy initialization)
 */
export function getEntityCacheDB(): EntityCacheDB | null {
  if (!isIndexedDBAvailable()) {
    return null;
  }

  if (!dbInstance) {
    try {
      dbInstance = new EntityCacheDB();
    } catch (error) {
      console.error("Failed to initialize entity cache database:", error);
      return null;
    }
  }

  return dbInstance;
}

/**
 * Close the database connection
 */
export function closeEntityCacheDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Delete the entire entity cache database
 */
export async function deleteEntityCacheDB(): Promise<void> {
  closeEntityCacheDB();
  if (isIndexedDBAvailable()) {
    await Dexie.delete(DB_NAME);
  }
}

/**
 * Generate a composite cache key
 */
export function generateCacheKey(entityType: StaticEntityType, entityId: string): string {
  return `${entityType}:${entityId}`;
}

export { EntityCacheDB };
