/**
 * Cache-based Graph Data Sources
 *
 * Provides graph data sources from the IndexedDB and memory caches.
 * Since entities are already cached, fetching their data is instant.
 *
 * @module lib/graph-sources/cache-source
 */

import {
  cachedOpenAlex,
  getAuthorById,
  getWorkById,
  getInstitutionById,
  getSourceById,
  getTopicById,
  getFunderById,
  getPublisherById,
} from '@bibgraph/client';
import type { EntityType } from '@bibgraph/types';
import {
  extractRelationships,
  extractEntityLabel,
  normalizeOpenAlexId,
  logger,
} from '@bibgraph/utils';
import type {
  GraphDataSource,
  GraphSourceCategory,
  GraphSourceEntity,
} from '@bibgraph/utils';

/**
 * Map StaticEntityType to EntityType
 * StaticEntityType is a subset used by the cache
 */
function staticToEntityType(staticType: string): EntityType | null {
  const validTypes: EntityType[] = [
    'works', 'authors', 'sources', 'institutions',
    'topics', 'publishers', 'funders', 'concepts',
    'keywords', 'domains', 'fields', 'subfields',
  ];
  return validTypes.includes(staticType as EntityType) ? (staticType as EntityType) : null;
}

/**
 * Fetch entity data - will be a cache hit since we're loading from cache
 */
async function fetchEntityData(
  entityType: EntityType,
  entityId: string
): Promise<Record<string, unknown> | null> {
  try {
    switch (entityType) {
      case 'works':
        return await getWorkById(entityId) as unknown as Record<string, unknown>;
      case 'authors':
        return await getAuthorById(entityId) as unknown as Record<string, unknown>;
      case 'institutions':
        return await getInstitutionById(entityId) as unknown as Record<string, unknown>;
      case 'sources':
        return await getSourceById(entityId) as unknown as Record<string, unknown>;
      case 'topics':
        return await getTopicById(entityId) as unknown as Record<string, unknown>;
      case 'funders':
        return await getFunderById(entityId) as unknown as Record<string, unknown>;
      case 'publishers':
        return await getPublisherById(entityId) as unknown as Record<string, unknown>;
      default:
        return null;
    }
  } catch (error) {
    logger.debug('cache-source', `Failed to fetch ${entityType} ${entityId}`, { error });
    return null;
  }
}

/**
 * Create a graph data source from the IndexedDB cache
 */
export function createIndexedDBCacheSource(): GraphDataSource {
  const sourceId = 'cache:indexeddb';

  return {
    id: sourceId,
    label: 'IndexedDB Cache',
    category: 'cache' as GraphSourceCategory,
    description: 'Entities cached in browser IndexedDB (persistent)',

    async getEntities(): Promise<GraphSourceEntity[]> {
      const entries = await cachedOpenAlex.enumerateIndexedDBEntities();
      const results: GraphSourceEntity[] = [];

      // Process in batches to avoid overwhelming the browser
      const batchSize = 50;
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);

        const fetchPromises = batch.map(async (entry) => {
          const entityType = staticToEntityType(entry.entityType);
          if (!entityType) return null;

          const entityData = await fetchEntityData(entityType, entry.entityId);
          if (!entityData) return null;

          const normalizedId = normalizeOpenAlexId(entry.entityId);
          const label = extractEntityLabel(entityType, normalizedId, entityData);
          const relationships = extractRelationships(entityType, entityData);

          return {
            entityType,
            entityId: normalizedId,
            label,
            entityData: {
              ...entityData,
              _cachedAt: entry.cachedAt,
              _lastAccessedAt: entry.lastAccessedAt,
              _accessCount: entry.accessCount,
            },
            sourceId,
            relationships,
          } satisfies GraphSourceEntity;
        });

        const fetched = await Promise.all(fetchPromises);
        for (const result of fetched) {
          if (result) results.push(result);
        }
      }

      return results;
    },

    async getEntityCount(): Promise<number> {
      const entries = await cachedOpenAlex.enumerateIndexedDBEntities();
      return entries.length;
    },

    async isAvailable(): Promise<boolean> {
      try {
        // Check if IndexedDB is available
        return typeof indexedDB !== 'undefined';
      } catch {
        return false;
      }
    },
  };
}

/**
 * Create a graph data source from the memory cache
 */
export function createMemoryCacheSource(): GraphDataSource {
  const sourceId = 'cache:memory';

  return {
    id: sourceId,
    label: 'Memory Cache',
    category: 'cache' as GraphSourceCategory,
    description: 'Entities cached in memory (session only)',

    async getEntities(): Promise<GraphSourceEntity[]> {
      const entries = cachedOpenAlex.enumerateMemoryCacheEntities();
      const results: GraphSourceEntity[] = [];

      const fetchPromises = entries.map(async (entry) => {
        const entityType = staticToEntityType(entry.entityType);
        if (!entityType) return null;

        const entityData = await fetchEntityData(entityType, entry.entityId);
        if (!entityData) return null;

        const normalizedId = normalizeOpenAlexId(entry.entityId);
        const label = extractEntityLabel(entityType, normalizedId, entityData);
        const relationships = extractRelationships(entityType, entityData);

        return {
          entityType,
          entityId: normalizedId,
          label,
          entityData: {
            ...entityData,
            _cachedAt: entry.cachedAt,
            _accessCount: entry.accessCount,
          },
          sourceId,
          relationships,
        } satisfies GraphSourceEntity;
      });

      const fetched = await Promise.all(fetchPromises);
      for (const result of fetched) {
        if (result) results.push(result);
      }

      return results;
    },

    async getEntityCount(): Promise<number> {
      return cachedOpenAlex.getMemoryCacheSize();
    },

    async isAvailable(): Promise<boolean> {
      return true; // Memory cache is always available
    },
  };
}

/**
 * Create a graph data source from the static cache (GitHub Pages)
 */
export function createStaticCacheSource(): GraphDataSource {
  const sourceId = 'cache:static';

  return {
    id: sourceId,
    label: 'Static Cache',
    category: 'cache' as GraphSourceCategory,
    description: 'Pre-cached entities from static files',

    async getEntities(): Promise<GraphSourceEntity[]> {
      const entries = await cachedOpenAlex.enumerateStaticCacheEntities();
      const results: GraphSourceEntity[] = [];

      // Process in batches
      const batchSize = 50;
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);

        const fetchPromises = batch.map(async (entry) => {
          const entityType = staticToEntityType(entry.entityType);
          if (!entityType) return null;

          const entityData = await fetchEntityData(entityType, entry.entityId);
          if (!entityData) return null;

          const normalizedId = normalizeOpenAlexId(entry.entityId);
          const label = extractEntityLabel(entityType, normalizedId, entityData);
          const relationships = extractRelationships(entityType, entityData);

          return {
            entityType,
            entityId: normalizedId,
            label,
            entityData,
            sourceId,
            relationships,
          } satisfies GraphSourceEntity;
        });

        const fetched = await Promise.all(fetchPromises);
        for (const result of fetched) {
          if (result) results.push(result);
        }
      }

      return results;
    },

    async getEntityCount(): Promise<number> {
      const entries = await cachedOpenAlex.enumerateStaticCacheEntities();
      return entries.length;
    },

    async isAvailable(): Promise<boolean> {
      const config = cachedOpenAlex.getStaticCacheTierConfig();
      return config.gitHubPages.isConfigured || config.localStatic.isAvailable;
    },
  };
}
