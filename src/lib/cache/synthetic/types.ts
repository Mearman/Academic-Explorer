/**
 * Core types and interfaces for the synthetic response cache system
 * Defines the storage tier abstraction and data organization strategies
 */

export enum StorageTier {
  MEMORY = 'memory',
  LOCAL_STORAGE = 'localStorage',
  INDEXED_DB = 'indexedDB',
  STATIC = 'static',
  API = 'api'
}

export type EntityType = 'works' | 'authors' | 'sources' | 'institutions' | 'topics' | 'publishers' | 'funders';

export interface EntityFieldMetadata {
  lastUpdated: string;
  ttl: number;
  source: string; // Which request populated this field
  tier: StorageTier;
}

export interface EntityFieldData {
  [fieldName: string]: unknown;
  _metadata: {
    lastUpdated: string;
    ttl: number;
    fieldSources: { [field: string]: string };
    tier: StorageTier;
  };
}

export interface EntityFieldAccumulation {
  [entityType: string]: {
    [entityId: string]: EntityFieldData;
  };
}

export interface CollectionMetadata {
  totalCount: number;
  lastFetched: string;
  ttl: number;
  isComplete: boolean;
  filters: Record<string, unknown>;
  sort?: string;
}

export interface CollectionPage {
  [pageNum: number]: string[]; // entity IDs for this page
}

export interface CollectionResultMapping {
  [queryKey: string]: {
    pages: CollectionPage;
    metadata: CollectionMetadata;
  };
}

export interface FieldCoverageByTier {
  memory: string[];
  localStorage: string[];
  indexedDB: string[];
  static: string[];
  total: string[];
}

export interface MultiTierAvailabilityMatrix {
  entities: {
    [entityId: string]: {
      memory: string[];
      localStorage: string[];
      indexedDB: string[];
      static: string[];
      missing: string[];
    };
  };
  optimalStrategy: 'memory' | 'localStorage' | 'indexedDB' | 'static' | 'api' | 'mixed';
}

export interface SurgicalRequest {
  type: 'single-entity' | 'batch-entities' | 'full-collection';
  url: string;
  entityIds?: string[];
  fields: string[];
  estimatedCost: number; // bytes
  tier: StorageTier;
}

export interface OptimizedRequestPlan {
  canSynthesize: boolean;
  requiredApiCalls: SurgicalRequest[];
  cachedData: EntityFieldAccumulation;
  estimatedSavings: {
    bandwidth: number; // bytes saved
    requests: number;  // API calls saved
    latency: number;   // estimated ms saved
  };
}

export interface StorageTierStats {
  [StorageTier.MEMORY]: {
    size: number;
    entities: number;
    fields: number;
  };
  [StorageTier.LOCAL_STORAGE]: {
    size: number;
    usage: number;
    limit: number;
  };
  [StorageTier.INDEXED_DB]: {
    size: number;
    entities: number;
    collections: number;
  };
  [StorageTier.STATIC]: {
    size: number;
    preloadedEntities: number;
    preloadedCollections: number;
  };
}

export interface MultiTierCacheStats {
  overall: {
    totalEntities: number;
    totalFields: number;
    totalCollections: number;
    cacheHitRate: number;
    surgicalRequestCount: number;
  };
  tiers: StorageTierStats;
}

// Base interfaces for storage tier implementations
export interface StorageTierInterface {
  // Entity field operations
  getEntityFields<T>(entityType: EntityType, entityId: string, fields: string[]): Promise<Partial<T>>;
  putEntityFields<T>(entityType: EntityType, entityId: string, data: Partial<T>): Promise<void>;
  deleteEntity(entityType: EntityType, entityId: string): Promise<void>;

  // Field coverage operations
  getFieldCoverage(entityType: EntityType, entityId: string): Promise<string[]>;
  hasFields(entityType: EntityType, entityId: string, fields: string[]): Promise<boolean>;

  // Collection operations
  getCollectionPage(queryKey: string, page: number): Promise<string[] | null>;
  putCollectionPage(queryKey: string, page: number, entityIds: string[]): Promise<void>;
  getCollectionMetadata(queryKey: string): Promise<CollectionMetadata | null>;
  putCollectionMetadata(queryKey: string, metadata: CollectionMetadata): Promise<void>;
  deleteCollection(queryKey: string): Promise<void>;

  // Storage management
  clear(): Promise<void>;
  getStats(): Promise<Partial<StorageTierStats>>;
}

// Request optimization types
export type RequestStrategy = 'memory-only' | 'storage-only' | 'api-fallback' | 'surgical-api' | 'hybrid';

export interface QueryParams {
  select?: string[];
  filter?: Record<string, unknown>;
  sort?: string;
  page?: number;
  per_page?: number;
  [key: string]: unknown;
}

export interface CachePolicy {
  entityTTL: {
    [entityType: string]: {
      [field: string]: number; // TTL in milliseconds
    };
  };
  collectionTTL: {
    [entityType: string]: number; // TTL in milliseconds
  };
  tierPreferences: {
    hotDataThreshold: number; // access frequency for memory promotion
    warmDataThreshold: number; // access frequency for localStorage
    coldDataArchival: number; // age threshold for IndexedDB
  };
}