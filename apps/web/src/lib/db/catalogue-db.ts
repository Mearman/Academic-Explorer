/**
 * Dexie database schema for catalogue feature
 *
 * Provides IndexedDB storage for catalogue lists and entities with
 * optimized indexing for common query patterns.
 *
 * Feature: 004-fix-failing-tests
 * Created: 2025-11-11
 */

import Dexie, { type Table } from 'dexie';
import type { CatalogueList, CatalogueEntity } from '../../types/catalogue';

/**
 * Catalogue database class extending Dexie
 *
 * Schema v1:
 * - catalogueLists: id (primary), shareToken (indexed), updatedAt (indexed)
 * - catalogueEntities: id (primary), listId (indexed), [listId+position] (compound index)
 */
class CatalogueDatabase extends Dexie {
  catalogueLists!: Table<CatalogueList, string>;
  catalogueEntities!: Table<CatalogueEntity, string>;

  constructor() {
    super('AcademicExplorerCatalogue');
    this.version(1).stores({
      catalogueLists: 'id, shareToken, updatedAt',
      catalogueEntities: 'id, listId, [listId+position]',
    });
  }
}

/**
 * Singleton instance of catalogue database
 */
export const catalogueDb = new CatalogueDatabase();
