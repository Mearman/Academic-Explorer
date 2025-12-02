/**
 * Catalogue List Graph Data Source
 *
 * Wraps a catalogue list (bookmarks, history, or custom list) as a graph data source.
 * Fetches entity data from OpenAlex API and extracts relationships.
 *
 * @module lib/graph-sources/catalogue-list-source
 */

import {
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
  CatalogueStorageProvider,
  CatalogueList,
} from '@bibgraph/utils';

/**
 * Fetch entity data from OpenAlex API based on entity type
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
        logger.debug('catalogue-list-source', `Unsupported entity type: ${entityType}`);
        return null;
    }
  } catch (error) {
    logger.debug('catalogue-list-source', `Failed to fetch ${entityType} ${entityId}`, { error });
    return null;
  }
}

/**
 * Create a graph data source from a catalogue list
 */
export function createCatalogueListSource(
  storage: CatalogueStorageProvider,
  listId: string,
  listInfo: CatalogueList
): GraphDataSource {
  const sourceId = `catalogue:${listId}`;

  return {
    id: sourceId,
    label: listInfo.title,
    category: 'catalogue' as GraphSourceCategory,
    description: listInfo.description,

    async getEntities(): Promise<GraphSourceEntity[]> {
      const entities = await storage.getListEntities(listId);
      const results: GraphSourceEntity[] = [];

      // Fetch entity data in parallel
      const fetchPromises = entities.map(async (entity) => {
        const entityData = await fetchEntityData(entity.entityType, entity.entityId);
        if (!entityData) return null;

        const normalizedId = normalizeOpenAlexId(entity.entityId);
        const label = extractEntityLabel(entity.entityType, normalizedId, entityData);
        const relationships = extractRelationships(entity.entityType, entityData);

        return {
          entityType: entity.entityType,
          entityId: normalizedId,
          label,
          entityData: {
            ...entityData,
            // Include catalogue metadata
            _catalogueNotes: entity.notes,
            _catalogueAddedAt: entity.addedAt,
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
      const entities = await storage.getListEntities(listId);
      return entities.length;
    },

    async isAvailable(): Promise<boolean> {
      try {
        const list = await storage.getList(listId);
        return list !== null;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Create a graph data source specifically for bookmarks
 */
export function createBookmarksSource(storage: CatalogueStorageProvider): GraphDataSource {
  return {
    id: 'catalogue:bookmarks',
    label: 'Bookmarks',
    category: 'catalogue' as GraphSourceCategory,
    description: 'Your bookmarked entities',

    async getEntities(): Promise<GraphSourceEntity[]> {
      const bookmarks = await storage.getBookmarks();
      const results: GraphSourceEntity[] = [];

      const fetchPromises = bookmarks.map(async (entity) => {
        const entityData = await fetchEntityData(entity.entityType, entity.entityId);
        if (!entityData) return null;

        const normalizedId = normalizeOpenAlexId(entity.entityId);
        const label = extractEntityLabel(entity.entityType, normalizedId, entityData);
        const relationships = extractRelationships(entity.entityType, entityData);

        return {
          entityType: entity.entityType,
          entityId: normalizedId,
          label,
          entityData: {
            ...entityData,
            _catalogueNotes: entity.notes,
            _catalogueAddedAt: entity.addedAt,
          },
          sourceId: 'catalogue:bookmarks',
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
      const bookmarks = await storage.getBookmarks();
      return bookmarks.length;
    },

    async isAvailable(): Promise<boolean> {
      return true; // Bookmarks are always available
    },
  };
}

/**
 * Create a graph data source specifically for history
 */
export function createHistorySource(storage: CatalogueStorageProvider): GraphDataSource {
  return {
    id: 'catalogue:history',
    label: 'History',
    category: 'catalogue' as GraphSourceCategory,
    description: 'Recently viewed entities',

    async getEntities(): Promise<GraphSourceEntity[]> {
      const history = await storage.getHistory();
      const results: GraphSourceEntity[] = [];

      const fetchPromises = history.map(async (entity) => {
        const entityData = await fetchEntityData(entity.entityType, entity.entityId);
        if (!entityData) return null;

        const normalizedId = normalizeOpenAlexId(entity.entityId);
        const label = extractEntityLabel(entity.entityType, normalizedId, entityData);
        const relationships = extractRelationships(entity.entityType, entityData);

        return {
          entityType: entity.entityType,
          entityId: normalizedId,
          label,
          entityData: {
            ...entityData,
            _catalogueNotes: entity.notes,
            _catalogueAddedAt: entity.addedAt,
          },
          sourceId: 'catalogue:history',
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
      const history = await storage.getHistory();
      return history.length;
    },

    async isAvailable(): Promise<boolean> {
      return true; // History is always available
    },
  };
}

/**
 * Create a graph data source specifically for graph list (persistent working set)
 * T032: Graph list as a graph data source
 */
export function createGraphListSource(storage: CatalogueStorageProvider): GraphDataSource {
  return {
    id: 'catalogue:graph-list',
    label: 'Graph List',
    category: 'catalogue' as GraphSourceCategory,
    description: 'Persistent graph working set with provenance tracking',

    async getEntities(): Promise<GraphSourceEntity[]> {
      const graphNodes = await storage.getGraphList();
      const results: GraphSourceEntity[] = [];

      const fetchPromises = graphNodes.map(async (node) => {
        // Fetch full entity data to extract relationships
        const entityData = await fetchEntityData(node.entityType, node.entityId);
        if (!entityData) {
          // If fetch fails, still return node with basic info but no relationships
          return {
            entityType: node.entityType,
            entityId: normalizeOpenAlexId(node.entityId),
            label: node.label,
            entityData: {
              _graphListProvenance: node.provenance,
              _graphListAddedAt: node.addedAt,
            },
            sourceId: 'catalogue:graph-list',
            relationships: [],
          } satisfies GraphSourceEntity;
        }

        const normalizedId = normalizeOpenAlexId(node.entityId);
        const label = extractEntityLabel(node.entityType, normalizedId, entityData);
        const relationships = extractRelationships(node.entityType, entityData);

        return {
          entityType: node.entityType,
          entityId: normalizedId,
          label,
          entityData: {
            ...entityData,
            // Include graph list metadata
            _graphListProvenance: node.provenance,
            _graphListAddedAt: node.addedAt,
          },
          sourceId: 'catalogue:graph-list',
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
      return await storage.getGraphListSize();
    },

    async isAvailable(): Promise<boolean> {
      return true; // Graph list is always available
    },
  };
}
