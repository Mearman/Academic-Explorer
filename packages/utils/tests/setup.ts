/**
 * Test setup utilities for storage provider testing
 * Provides helpers for creating test storage instances
 */

import { InMemoryStorageProvider } from '../src/storage/in-memory-storage-provider.js';

/**
 * Create a fresh InMemoryStorageProvider instance for testing
 *
 * @example
 * ```typescript
 * describe('My Test Suite', () => {
 *   let storage: InMemoryStorageProvider;
 *
 *   beforeEach(() => {
 *     storage = createTestStorageProvider();
 *   });
 *
 *   afterEach(() => {
 *     storage.clear();
 *   });
 *
 *   it('should create a list', async () => {
 *     const listId = await storage.createList({
 *       title: 'Test List',
 *       type: 'list',
 *     });
 *     expect(listId).toBeDefined();
 *   });
 * });
 * ```
 */
export function createTestStorageProvider(): InMemoryStorageProvider {
	return new InMemoryStorageProvider();
}

/**
 * Create a test storage provider with pre-initialized special lists
 *
 * @example
 * ```typescript
 * const storage = await createTestStorageProviderWithSpecialLists();
 * const bookmarks = await storage.getBookmarks();
 * expect(bookmarks).toEqual([]);
 * ```
 */
export async function createTestStorageProviderWithSpecialLists(): Promise<InMemoryStorageProvider> {
	const storage = new InMemoryStorageProvider();
	await storage.initializeSpecialLists();
	return storage;
}
