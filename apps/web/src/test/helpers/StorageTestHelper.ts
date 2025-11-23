/**
 * Storage Test Helper for E2E Tests
 * Provides utilities for managing test storage (IndexedDB, localStorage, sessionStorage)
 * Uses InMemoryStorageProvider for test isolation
 */

import { type Page } from '@playwright/test';

export interface BookmarkData {
  entityId: string;
  entityType: string;
  title?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface CatalogueData {
  listId: string;
  name: string;
  description?: string;
  entities: Array<{
    entityId: string;
    entityType: string;
  }>;
}

export class StorageTestHelper {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Clear all storage (IndexedDB, localStorage, sessionStorage)
   */
  async clearAllStorage(): Promise<void> {
    await this.clearIndexedDB();
    await this.clearLocalStorage();
    await this.clearSessionStorage();
  }

  /**
   * Clear IndexedDB databases
   */
  async clearIndexedDB(): Promise<void> {
    await this.page.evaluate(async () => {
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    });

    // Wait for deletion to complete
    await this.page.waitForTimeout(100);
  }

  /**
   * Clear localStorage
   */
  async clearLocalStorage(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.clear();
    });
  }

  /**
   * Clear sessionStorage
   */
  async clearSessionStorage(): Promise<void> {
    await this.page.evaluate(() => {
      sessionStorage.clear();
    });
  }

  /**
   * Get a value from localStorage
   * @param key - The storage key
   */
  async getLocalStorageItem(key: string): Promise<string | null> {
    return this.page.evaluate((k) => localStorage.getItem(k), key);
  }

  /**
   * Set a value in localStorage
   * @param key - The storage key
   * @param value - The value to store
   */
  async setLocalStorageItem(key: string, value: string): Promise<void> {
    await this.page.evaluate(
      ({ k, v }) => localStorage.setItem(k, v),
      { k: key, v: value }
    );
  }

  /**
   * Get a value from sessionStorage
   * @param key - The storage key
   */
  async getSessionStorageItem(key: string): Promise<string | null> {
    return this.page.evaluate((k) => sessionStorage.getItem(k), key);
  }

  /**
   * Set a value in sessionStorage
   * @param key - The storage key
   * @param value - The value to store
   */
  async setSessionStorageItem(key: string, value: string): Promise<void> {
    await this.page.evaluate(
      ({ k, v }) => sessionStorage.setItem(k, v),
      { k: key, v: value }
    );
  }

  /**
   * Seed bookmarks into storage
   * @param bookmarks - Array of bookmark data
   */
  async seedBookmarks(bookmarks: BookmarkData[]): Promise<void> {
    await this.page.evaluate((data) => {
      // Store bookmarks in localStorage (app-specific storage format)
      const existingBookmarks = localStorage.getItem('bookmarks');
      const bookmarksList = existingBookmarks ? JSON.parse(existingBookmarks) : [];

      for (const bookmark of data) {
        bookmarksList.push({
          id: `${bookmark.entityType}-${bookmark.entityId}`,
          entityId: bookmark.entityId,
          entityType: bookmark.entityType,
          title: bookmark.title ?? `Entity ${bookmark.entityId}`,
          tags: bookmark.tags ?? [],
          customFields: bookmark.customFields ?? {},
          createdAt: new Date().toISOString(),
        });
      }

      localStorage.setItem('bookmarks', JSON.stringify(bookmarksList));
    }, bookmarks);
  }

  /**
   * Seed a catalogue list into storage
   * @param catalogue - Catalogue data
   */
  async seedCatalogueList(catalogue: CatalogueData): Promise<void> {
    await this.page.evaluate((data) => {
      // Store catalogue in localStorage (app-specific storage format)
      const existingCatalogues = localStorage.getItem('catalogues');
      const cataloguesList = existingCatalogues ? JSON.parse(existingCatalogues) : [];

      cataloguesList.push({
        id: data.listId,
        name: data.name,
        description: data.description ?? '',
        entities: data.entities,
        createdAt: new Date().toISOString(),
      });

      localStorage.setItem('catalogues', JSON.stringify(cataloguesList));
    }, catalogue);
  }

  /**
   * Get all bookmarks from storage
   */
  async getBookmarks(): Promise<BookmarkData[]> {
    return this.page.evaluate(() => {
      const bookmarksStr = localStorage.getItem('bookmarks');
      return bookmarksStr ? JSON.parse(bookmarksStr) : [];
    });
  }

  /**
   * Get all catalogues from storage
   */
  async getCatalogues(): Promise<CatalogueData[]> {
    return this.page.evaluate(() => {
      const cataloguesStr = localStorage.getItem('catalogues');
      return cataloguesStr ? JSON.parse(cataloguesStr) : [];
    });
  }

  /**
   * Check if an entity is bookmarked
   * @param entityId - The entity ID
   * @param entityType - The entity type
   */
  async isBookmarked(entityId: string, entityType: string): Promise<boolean> {
    return this.page.evaluate(
      ({ id, type }) => {
        const bookmarksStr = localStorage.getItem('bookmarks');
        if (!bookmarksStr) return false;

        const bookmarks = JSON.parse(bookmarksStr);
        return bookmarks.some(
          (b: { entityId: string; entityType: string }) =>
            b.entityId === id && b.entityType === type
        );
      },
      { id: entityId, type: entityType }
    );
  }

  /**
   * Verify storage state matches expected values
   * @param expected - Expected storage state
   */
  async verifyStorageState(expected: Record<string, unknown>): Promise<boolean> {
    const actual = await this.page.evaluate(() => {
      const state: Record<string, string | null> = {};

      // Get all localStorage items
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          state[key] = localStorage.getItem(key);
        }
      }

      return state;
    });

    // Compare expected and actual
    for (const [key, value] of Object.entries(expected)) {
      const actualValue = actual[key];
      const expectedValue = typeof value === 'string' ? value : JSON.stringify(value);

      if (actualValue !== expectedValue) {
        return false;
      }
    }

    return true;
  }

  /**
   * Wait for storage to contain a specific key
   * @param key - The storage key to wait for
   * @param timeout - Maximum time to wait
   */
  async waitForStorageKey(key: string, timeout = 10000): Promise<void> {
    const startTime = Date.now();

    while (true) {
      const value = await this.getLocalStorageItem(key);
      if (value !== null) {
        return;
      }

      if (Date.now() - startTime > timeout) {
        throw new Error(`Storage key "${key}" not found within ${timeout}ms`);
      }

      await this.page.waitForTimeout(100);
    }
  }

  /**
   * Get the size of IndexedDB storage (in bytes)
   */
  async getIndexedDBSize(): Promise<number> {
    return this.page.evaluate(async () => {
      const estimate = await navigator.storage.estimate();
      return estimate.usage ?? 0;
    });
  }

  /**
   * Export all storage data (for debugging/inspection)
   */
  async exportStorageData(): Promise<{
    localStorage: Record<string, string>;
    sessionStorage: Record<string, string>;
    indexedDBDatabases: string[];
  }> {
    return this.page.evaluate(async () => {
      const localStorageData: Record<string, string> = {};
      const sessionStorageData: Record<string, string> = {};

      // Export localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          localStorageData[key] = localStorage.getItem(key) ?? '';
        }
      }

      // Export sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          sessionStorageData[key] = sessionStorage.getItem(key) ?? '';
        }
      }

      // Get IndexedDB database names
      const databases = await indexedDB.databases();
      const indexedDBDatabases = databases.map((db) => db.name ?? '').filter(Boolean);

      return {
        localStorage: localStorageData,
        sessionStorage: sessionStorageData,
        indexedDBDatabases,
      };
    });
  }
}
