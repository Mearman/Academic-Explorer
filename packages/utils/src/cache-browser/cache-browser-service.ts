/**
 * Cache Browser Service - UI-agnostic service for browsing cached entities
 * Scans storage systems and provides metadata about cached OpenAlex entities
 */

import { openDB, IDBPDatabase } from 'idb';
import type { GenericLogger } from '../logger.js';
import type {
  CachedEntityMetadata,
  CacheBrowserStats,
  CacheBrowserFilters,
  CacheBrowserOptions,
  CacheBrowserResult,
  EntityType
} from './types.js';

export interface CacheBrowserConfig {
  // IndexedDB configuration
  dbName: string;
  version: number;
  
  // Storage locations to scan
  includeIndexedDB: boolean;
  includeLocalStorage: boolean;
  includeRepositoryStore: boolean;
  
  // Performance settings
  maxScanItems: number;
  batchSize: number;
}

// Default configuration
const DEFAULT_CONFIG: CacheBrowserConfig = {
  dbName: 'academic-explorer',
  version: 1,
  includeIndexedDB: true,
  includeLocalStorage: true,
  includeRepositoryStore: true,
  maxScanItems: 10000,
  batchSize: 100,
};

// Entity type detection patterns
const ENTITY_TYPE_PATTERNS: Record<EntityType, RegExp[]> = {
  works: [/^W\d+$/, /\/works\/W\d+/, /works-.*/, /work_/],
  authors: [/^A\d+$/, /\/authors\/A\d+/, /authors-.*/, /author_/],
  sources: [/^S\d+$/, /\/sources\/S\d+/, /sources-.*/, /source_/],
  institutions: [/^I\d+$/, /\/institutions\/I\d+/, /institutions-.*/, /institution_/],
  topics: [/^T\d+$/, /\/topics\/T\d+/, /topics-.*/, /topic_/],
  publishers: [/^P\d+$/, /\/publishers\/P\d+/, /publishers-.*/, /publisher_/],
  funders: [/^F\d+$/, /\/funders\/F\d+/, /funders-.*/, /funder_/],
  keywords: [/keyword/, /\/keywords\//, /keywords-.*/, /keyword_/],
  concepts: [/^C\d+$/, /\/concepts\/C\d+/, /concepts-.*/, /concept_/],
};

export class CacheBrowserService {
  private config: CacheBrowserConfig;
  private logger?: GenericLogger;
  private dbCache?: IDBPDatabase;

  constructor(config: Partial<CacheBrowserConfig> = {}, logger?: GenericLogger) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = logger;
  }

  /**
   * Browse cached entities with filtering and pagination
   */
  async browse(
    filters: Partial<CacheBrowserFilters> = {},
    options: Partial<CacheBrowserOptions> = {}
  ): Promise<CacheBrowserResult> {
    const startTime = Date.now();
    
    this.logger?.debug('cache-browser', 'Starting cache browse operation', { filters, options });

    try {
      // Merge with defaults
      const mergedFilters: CacheBrowserFilters = {
        searchQuery: '',
        entityTypes: new Set(Object.keys(ENTITY_TYPE_PATTERNS) as EntityType[]),
        storageLocations: new Set(['indexeddb', 'localstorage', 'repository']),
        ...filters,
      };

      const mergedOptions: CacheBrowserOptions = {
        includeRepositoryData: true,
        includeBasicInfo: true,
        sortBy: 'timestamp',
        sortDirection: 'desc',
        limit: 100,
        offset: 0,
        ...options,
      };

      // Collect entities from all sources
      const allEntities: CachedEntityMetadata[] = [];

      if (this.config.includeIndexedDB) {
        const indexedDBEntities = await this.scanIndexedDB(mergedFilters);
        allEntities.push(...indexedDBEntities);
      }

      if (this.config.includeLocalStorage) {
        const localStorageEntities = await this.scanLocalStorage(mergedFilters);
        allEntities.push(...localStorageEntities);
      }

      if (this.config.includeRepositoryStore) {
        const repositoryEntities = await this.scanRepositoryStore(mergedFilters);
        allEntities.push(...repositoryEntities);
      }

      // Apply filters and sorting
      const filteredEntities = this.applyFilters(allEntities, mergedFilters);
      const sortedEntities = this.applySorting(filteredEntities, mergedOptions);

      // Apply pagination
      const paginatedEntities = this.applyPagination(sortedEntities, mergedOptions);

      // Calculate statistics
      const stats = this.calculateStats(allEntities);

      const result: CacheBrowserResult = {
        entities: paginatedEntities,
        stats,
        hasMore: (mergedOptions.offset || 0) + paginatedEntities.length < sortedEntities.length,
        totalMatching: sortedEntities.length,
      };

      const duration = Date.now() - startTime;
      this.logger?.debug('cache-browser', 'Cache browse completed', {
        duration,
        totalFound: allEntities.length,
        filteredCount: sortedEntities.length,
        returnedCount: paginatedEntities.length,
      });

      return result;

    } catch (error) {
      this.logger?.error('cache-browser', 'Cache browse failed', { error });
      throw error;
    }
  }

  /**
   * Get cache statistics without full browse
   */
  async getStats(): Promise<CacheBrowserStats> {
    const allEntities = await this.getAllEntities();
    return this.calculateStats(allEntities);
  }

  /**
   * Clear cached entities based on filters
   */
  async clearCache(filters: Partial<CacheBrowserFilters> = {}): Promise<number> {
    this.logger?.debug('cache-browser', 'Starting cache clear operation', { filters });

    const entities = await this.getAllEntities();
    const filteredEntities = this.applyFilters(entities, {
      searchQuery: '',
      entityTypes: new Set(Object.keys(ENTITY_TYPE_PATTERNS) as EntityType[]),
      storageLocations: new Set(['indexeddb', 'localstorage']),
      ...filters,
    });

    let clearedCount = 0;

    // Clear from IndexedDB
    if (this.config.includeIndexedDB) {
      const indexedDBEntities = filteredEntities.filter(e => e.storageLocation === 'indexeddb');
      clearedCount += await this.clearFromIndexedDB(indexedDBEntities);
    }

    // Clear from localStorage
    if (this.config.includeLocalStorage) {
      const localStorageEntities = filteredEntities.filter(e => e.storageLocation === 'localstorage');
      clearedCount += await this.clearFromLocalStorage(localStorageEntities);
    }

    this.logger?.debug('cache-browser', 'Cache clear completed', { clearedCount });
    return clearedCount;
  }

  private async scanIndexedDB(filters: CacheBrowserFilters): Promise<CachedEntityMetadata[]> {
    if (!this.isIndexedDBAvailable()) {
      return [];
    }

    try {
      const db = await this.getDB();
      const entities: CachedEntityMetadata[] = [];

      // Scan all object stores that might contain entities
      const storeNames = Array.from(db.objectStoreNames);
      
      for (const storeName of storeNames) {
        try {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          let cursor = await store.openCursor();

          while (cursor && entities.length < this.config.maxScanItems) {
            const key = cursor.key as string;
            const value = cursor.value as unknown;

            const entityMetadata = this.extractEntityMetadata(
              key, 
              value, 
              'indexeddb',
              storeName
            );

            if (entityMetadata && this.matchesTypeFilter(entityMetadata, filters)) {
              entities.push(entityMetadata);
            }

            cursor = await cursor.continue();
          }

          await tx.done;
        } catch (error) {
          this.logger?.warn('cache-browser', `Failed to scan store ${storeName}`, { error });
        }
      }

      return entities;
    } catch (error) {
      this.logger?.error('cache-browser', 'IndexedDB scan failed', { error });
      return [];
    }
  }

  private async scanLocalStorage(filters: CacheBrowserFilters): Promise<CachedEntityMetadata[]> {
    if (!this.isLocalStorageAvailable()) {
      return [];
    }

    try {
      const entities: CachedEntityMetadata[] = [];

      for (let i = 0; i < localStorage.length && entities.length < this.config.maxScanItems; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        try {
          const value = localStorage.getItem(key);
          if (!value) continue;

          const entityMetadata = this.extractEntityMetadata(
            key,
            value,
            'localstorage'
          );

          if (entityMetadata && this.matchesTypeFilter(entityMetadata, filters)) {
            entities.push(entityMetadata);
          }
        } catch {
          // Skip invalid JSON entries
          continue;
        }
      }

      return entities;
    } catch (error) {
      this.logger?.error('cache-browser', 'localStorage scan failed', { error });
      return [];
    }
  }

  private async scanRepositoryStore(_filters: CacheBrowserFilters): Promise<CachedEntityMetadata[]> {
    // This would integrate with the repository store if available
    // For now, return empty array as repository store scanning would need
    // to be integrated at the application level
    this.logger?.debug('cache-browser', 'Repository store scanning not implemented yet');
    return [];
  }

  private extractEntityMetadata(
    key: string,
    value: unknown,
    storageLocation: CachedEntityMetadata['storageLocation'],
    _storeName?: string
  ): CachedEntityMetadata | null {
    try {
      // Detect entity type from key
      const entityType = this.detectEntityType(key);
      if (!entityType) {
        return null;
      }

      // Parse value if it's a string
      let parsedValue = value;
      if (typeof value === 'string') {
        try {
          parsedValue = JSON.parse(value);
        } catch {
          // Not JSON, treat as string
        }
      }

      // Extract basic info from parsed data
      const basicInfo = this.extractBasicInfo(parsedValue, entityType);
      const dataSize = this.calculateDataSize(value);
      
      // Try to extract entity ID
      const entityId = this.extractEntityId(key, parsedValue, entityType);

      return {
        id: entityId || key,
        type: entityType,
        label: basicInfo?.displayName || entityId || key,
        cacheTimestamp: Date.now(), // We don't have actual cache timestamp, use current time
        storageLocation,
        dataSize,
        basicInfo,
        externalIds: this.extractExternalIds(parsedValue),
      };

    } catch (error) {
      this.logger?.debug('cache-browser', 'Failed to extract metadata', { key, error });
      return null;
    }
  }

  private detectEntityType(key: string): EntityType | null {
    for (const [type, patterns] of Object.entries(ENTITY_TYPE_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(key)) {
          return type as EntityType;
        }
      }
    }
    return null;
  }

  private extractEntityId(key: string, value: unknown, type: EntityType): string | null {
    // Try to extract from parsed value first
    if (value && typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      if (typeof obj.id === 'string') {
        return obj.id;
      }
      if (typeof obj.display_name === 'string' && obj.display_name.startsWith(type.charAt(0).toUpperCase())) {
        return obj.display_name;
      }
    }

    // Extract from key using patterns
    const patterns = ENTITY_TYPE_PATTERNS[type];
    for (const pattern of patterns) {
      const match = key.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return null;
  }

  private extractBasicInfo(value: unknown, _type: EntityType): CachedEntityMetadata['basicInfo'] | undefined {
    if (!value || typeof value !== 'object' || value === null) {
      return undefined;
    }

    const obj = value as Record<string, unknown>;
    
    return {
      displayName: typeof obj.display_name === 'string' ? obj.display_name : undefined,
      description: typeof obj.description === 'string' ? obj.description : undefined,
      url: typeof obj.url === 'string' ? obj.url : undefined,
      citationCount: typeof obj.cited_by_count === 'number' ? obj.cited_by_count : undefined,
      worksCount: typeof obj.works_count === 'number' ? obj.works_count : undefined,
    };
  }

  private extractExternalIds(value: unknown): Record<string, string> | undefined {
    if (!value || typeof value !== 'object' || value === null) {
      return undefined;
    }

    const obj = value as Record<string, unknown>;
    const externalIds: Record<string, string> = {};

    // Common external ID fields
    const idFields = ['doi', 'orcid', 'ror', 'issn', 'isbn', 'pmid', 'pmcid', 'wikidata'];
    
    for (const field of idFields) {
      if (typeof obj[field] === 'string') {
        externalIds[field] = obj[field] as string;
      }
    }

    // Check for ids object
    if (obj.ids && typeof obj.ids === 'object' && obj.ids !== null) {
      const idsObj = obj.ids as Record<string, unknown>;
      for (const [key, value] of Object.entries(idsObj)) {
        if (typeof value === 'string') {
          externalIds[key] = value;
        }
      }
    }

    return Object.keys(externalIds).length > 0 ? externalIds : undefined;
  }

  private calculateDataSize(value: unknown): number {
    if (typeof value === 'string') {
      return new Blob([value]).size;
    }
    
    try {
      return new Blob([JSON.stringify(value)]).size;
    } catch {
      return 0;
    }
  }

  private matchesTypeFilter(entity: CachedEntityMetadata, filters: CacheBrowserFilters): boolean {
    return filters.entityTypes.has(entity.type) && 
           filters.storageLocations.has(entity.storageLocation);
  }

  private applyFilters(entities: CachedEntityMetadata[], filters: CacheBrowserFilters): CachedEntityMetadata[] {
    return entities.filter(entity => {
      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        if (!entity.label.toLowerCase().includes(query) &&
            !entity.id.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange) {
        if (entity.cacheTimestamp < filters.dateRange.start || 
            entity.cacheTimestamp > filters.dateRange.end) {
          return false;
        }
      }

      // Size range filter
      if (filters.sizeRange) {
        if (entity.dataSize < filters.sizeRange.min || 
            entity.dataSize > filters.sizeRange.max) {
          return false;
        }
      }

      return true;
    });
  }

  private applySorting(entities: CachedEntityMetadata[], options: CacheBrowserOptions): CachedEntityMetadata[] {
    return [...entities].sort((a, b) => {
      let comparison = 0;

      switch (options.sortBy) {
        case 'timestamp':
          comparison = a.cacheTimestamp - b.cacheTimestamp;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'label':
          comparison = a.label.localeCompare(b.label);
          break;
        case 'size':
          comparison = a.dataSize - b.dataSize;
          break;
        case 'lastAccessed':
          comparison = (a.lastAccessed || 0) - (b.lastAccessed || 0);
          break;
        default:
          comparison = a.label.localeCompare(b.label);
      }

      return options.sortDirection === 'desc' ? -comparison : comparison;
    });
  }

  private applyPagination(entities: CachedEntityMetadata[], options: CacheBrowserOptions): CachedEntityMetadata[] {
    const offset = options.offset || 0;
    const limit = options.limit || entities.length;
    return entities.slice(offset, offset + limit);
  }

  private calculateStats(entities: CachedEntityMetadata[]): CacheBrowserStats {
    const entitiesByType: Record<EntityType, number> = {
      works: 0,
      authors: 0,
      sources: 0,
      institutions: 0,
      topics: 0,
      publishers: 0,
      funders: 0,
      keywords: 0,
      concepts: 0,
    };

    const entitiesByStorage: Record<string, number> = {};
    let totalCacheSize = 0;
    let oldestEntry = Date.now();
    let newestEntry = 0;

    for (const entity of entities) {
      entitiesByType[entity.type]++;
      entitiesByStorage[entity.storageLocation] = (entitiesByStorage[entity.storageLocation] || 0) + 1;
      totalCacheSize += entity.dataSize;
      oldestEntry = Math.min(oldestEntry, entity.cacheTimestamp);
      newestEntry = Math.max(newestEntry, entity.cacheTimestamp);
    }

    return {
      totalEntities: entities.length,
      entitiesByType,
      entitiesByStorage,
      totalCacheSize,
      oldestEntry: entities.length > 0 ? oldestEntry : 0,
      newestEntry,
    };
  }

  private async getAllEntities(): Promise<CachedEntityMetadata[]> {
    const result = await this.browse({}, { limit: this.config.maxScanItems });
    return result.entities;
  }

  private async clearFromIndexedDB(entities: CachedEntityMetadata[]): Promise<number> {
    // Implementation for clearing IndexedDB entries
    // This would need to be implemented based on the specific storage structure
    this.logger?.debug('cache-browser', 'IndexedDB clearing not fully implemented', { count: entities.length });
    return 0;
  }

  private async clearFromLocalStorage(entities: CachedEntityMetadata[]): Promise<number> {
    let cleared = 0;
    for (const entity of entities) {
      try {
        localStorage.removeItem(entity.id);
        cleared++;
      } catch (error) {
        this.logger?.warn('cache-browser', 'Failed to clear localStorage item', { id: entity.id, error });
      }
    }
    return cleared;
  }

  private async getDB(): Promise<IDBPDatabase> {
    if (!this.dbCache) {
      this.dbCache = await openDB(this.config.dbName, this.config.version);
    }
    return this.dbCache;
  }

  private isIndexedDBAvailable(): boolean {
    try {
      return typeof indexedDB !== 'undefined';
    } catch {
      return false;
    }
  }

  private isLocalStorageAvailable(): boolean {
    try {
      return typeof localStorage !== 'undefined';
    } catch {
      return false;
    }
  }
}

// Export default instance
export const cacheBrowserService = new CacheBrowserService();