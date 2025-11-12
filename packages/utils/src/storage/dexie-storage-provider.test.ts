/**
 * Unit tests for bookmark storage operations
 * Tests use InMemoryStorageProvider for fast, isolated test execution
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InMemoryStorageProvider } from './in-memory-storage-provider.js';
import type { CatalogueStorageProvider } from './catalogue-storage-provider.js';
import { SPECIAL_LIST_IDS } from './catalogue-db.js';

describe('Bookmark Storage Operations', () => {
	let provider: CatalogueStorageProvider;

	beforeEach(() => {
		provider = new InMemoryStorageProvider();
	});

	afterEach(() => {
		// Clear storage for test isolation
		if (provider instanceof InMemoryStorageProvider) {
			provider.clear();
		}
	});

	describe('initializeSpecialLists()', () => {
		it('should create bookmarks list on initialization', async () => {
			await provider.initializeSpecialLists();

			const bookmarksList = await provider.getList(SPECIAL_LIST_IDS.BOOKMARKS);

			expect(bookmarksList).not.toBeNull();
			expect(bookmarksList?.id).toBe(SPECIAL_LIST_IDS.BOOKMARKS);
			expect(bookmarksList?.title).toBe('Bookmarks');
			expect(bookmarksList?.type).toBe('list');
			expect(bookmarksList?.isPublic).toBe(false);
			expect(bookmarksList?.tags).toContain('system');
		});

		it('should be idempotent - safe to call multiple times', async () => {
			await provider.initializeSpecialLists();
			await provider.initializeSpecialLists();
			await provider.initializeSpecialLists();

			const bookmarksList = await provider.getList(SPECIAL_LIST_IDS.BOOKMARKS);

			expect(bookmarksList).not.toBeNull();
			expect(bookmarksList?.id).toBe(SPECIAL_LIST_IDS.BOOKMARKS);
		});

		it('should create both bookmarks and history lists', async () => {
			await provider.initializeSpecialLists();

			const bookmarksList = await provider.getList(SPECIAL_LIST_IDS.BOOKMARKS);
			const historyList = await provider.getList(SPECIAL_LIST_IDS.HISTORY);

			expect(bookmarksList).not.toBeNull();
			expect(historyList).not.toBeNull();
			expect(bookmarksList?.id).toBe(SPECIAL_LIST_IDS.BOOKMARKS);
			expect(historyList?.id).toBe(SPECIAL_LIST_IDS.HISTORY);
		});
	});

	describe('addBookmark()', () => {
		it('should add bookmark with metadata', async () => {
			await provider.initializeSpecialLists();

			const entityRecordId = await provider.addBookmark({
				entityType: 'works',
				entityId: 'W2741809807',
				url: 'https://openalex.org/W2741809807',
				title: 'ML for Cultural Heritage',
				notes: 'Important for Chapter 3',
			});

			expect(entityRecordId).toBeTruthy();
			expect(typeof entityRecordId).toBe('string');

			const bookmarks = await provider.getBookmarks();
			expect(bookmarks).toHaveLength(1);
			expect(bookmarks[0].entityType).toBe('works');
			expect(bookmarks[0].entityId).toBe('W2741809807');
			expect(bookmarks[0].listId).toBe(SPECIAL_LIST_IDS.BOOKMARKS);
		});

		it('should store URL in notes field', async () => {
			await provider.initializeSpecialLists();

			await provider.addBookmark({
				entityType: 'authors',
				entityId: 'A123456789',
				url: 'https://openalex.org/A123456789',
			});

			const bookmarks = await provider.getBookmarks();
			expect(bookmarks[0].notes).toContain('URL: https://openalex.org/A123456789');
		});

		it('should append URL to user-provided notes', async () => {
			await provider.initializeSpecialLists();

			await provider.addBookmark({
				entityType: 'works',
				entityId: 'W999',
				url: 'https://example.com/work/W999',
				notes: 'Key reference paper',
			});

			const bookmarks = await provider.getBookmarks();
			expect(bookmarks[0].notes).toContain('Key reference paper');
			expect(bookmarks[0].notes).toContain('URL: https://example.com/work/W999');
		});

		it('should initialize special lists automatically if not done', async () => {
			// Don't call initializeSpecialLists() explicitly
			const entityRecordId = await provider.addBookmark({
				entityType: 'topics',
				entityId: 'T12345',
				url: 'https://openalex.org/T12345',
			});

			expect(entityRecordId).toBeTruthy();

			const bookmarksList = await provider.getList(SPECIAL_LIST_IDS.BOOKMARKS);
			expect(bookmarksList).not.toBeNull();
		});

		it('should support all entity types', async () => {
			await provider.initializeSpecialLists();

			const entityTypes = [
				'works',
				'authors',
				'sources',
				'institutions',
				'topics',
				'publishers',
				'funders',
			] as const;

			for (const entityType of entityTypes) {
				await provider.addBookmark({
					entityType,
					entityId: `${entityType.toUpperCase()}-123`,
					url: `https://openalex.org/${entityType.toUpperCase()}-123`,
				});
			}

			const bookmarks = await provider.getBookmarks();
			expect(bookmarks).toHaveLength(entityTypes.length);
		});
	});

	describe('isBookmarked()', () => {
		it('should correctly detect bookmarked entity', async () => {
			await provider.initializeSpecialLists();

			await provider.addBookmark({
				entityType: 'works',
				entityId: 'W2741809807',
				url: 'https://openalex.org/W2741809807',
			});

			const isBookmarked = await provider.isBookmarked('works', 'W2741809807');
			expect(isBookmarked).toBe(true);
		});

		it('should return false for non-bookmarked entity', async () => {
			await provider.initializeSpecialLists();

			const isBookmarked = await provider.isBookmarked('works', 'W9999999');
			expect(isBookmarked).toBe(false);
		});

		it('should distinguish between entity types', async () => {
			await provider.initializeSpecialLists();

			await provider.addBookmark({
				entityType: 'works',
				entityId: 'W123',
				url: 'https://openalex.org/W123',
			});

			// Same ID but different type should not be bookmarked
			const isWorkBookmarked = await provider.isBookmarked('works', 'W123');
			const isAuthorBookmarked = await provider.isBookmarked('authors', 'W123');

			expect(isWorkBookmarked).toBe(true);
			expect(isAuthorBookmarked).toBe(false);
		});

		it('should work with empty bookmarks list', async () => {
			await provider.initializeSpecialLists();

			const isBookmarked = await provider.isBookmarked('works', 'W123');
			expect(isBookmarked).toBe(false);
		});
	});

	describe('getBookmarks()', () => {
		it('should retrieve all bookmarks', async () => {
			await provider.initializeSpecialLists();

			await provider.addBookmark({
				entityType: 'works',
				entityId: 'W1',
				url: 'https://openalex.org/W1',
			});
			await provider.addBookmark({
				entityType: 'authors',
				entityId: 'A1',
				url: 'https://openalex.org/A1',
			});
			await provider.addBookmark({
				entityType: 'topics',
				entityId: 'T1',
				url: 'https://openalex.org/T1',
			});

			const bookmarks = await provider.getBookmarks();

			expect(bookmarks).toHaveLength(3);
			expect(bookmarks.map((b) => b.entityId)).toEqual(['W1', 'A1', 'T1']);
		});

		it('should return empty array when no bookmarks exist', async () => {
			await provider.initializeSpecialLists();

			const bookmarks = await provider.getBookmarks();

			expect(bookmarks).toEqual([]);
		});

		it('should initialize special lists automatically', async () => {
			// Don't call initializeSpecialLists() explicitly
			const bookmarks = await provider.getBookmarks();

			expect(Array.isArray(bookmarks)).toBe(true);
			expect(bookmarks).toHaveLength(0);
		});

		it('should return bookmarks sorted by position', async () => {
			await provider.initializeSpecialLists();

			// Add bookmarks in specific order
			await provider.addBookmark({
				entityType: 'works',
				entityId: 'W1',
				url: 'https://openalex.org/W1',
			});
			await provider.addBookmark({
				entityType: 'works',
				entityId: 'W2',
				url: 'https://openalex.org/W2',
			});
			await provider.addBookmark({
				entityType: 'works',
				entityId: 'W3',
				url: 'https://openalex.org/W3',
			});

			const bookmarks = await provider.getBookmarks();

			expect(bookmarks[0].position).toBeLessThan(bookmarks[1].position);
			expect(bookmarks[1].position).toBeLessThan(bookmarks[2].position);
		});
	});

	describe('removeBookmark()', () => {
		it('should remove bookmark by entity record ID', async () => {
			await provider.initializeSpecialLists();

			const entityRecordId = await provider.addBookmark({
				entityType: 'works',
				entityId: 'W123',
				url: 'https://openalex.org/W123',
			});

			let bookmarks = await provider.getBookmarks();
			expect(bookmarks).toHaveLength(1);

			await provider.removeBookmark(entityRecordId);

			bookmarks = await provider.getBookmarks();
			expect(bookmarks).toHaveLength(0);
		});

		it('should only remove specified bookmark', async () => {
			await provider.initializeSpecialLists();

			const recordId1 = await provider.addBookmark({
				entityType: 'works',
				entityId: 'W1',
				url: 'https://openalex.org/W1',
			});
			const recordId2 = await provider.addBookmark({
				entityType: 'works',
				entityId: 'W2',
				url: 'https://openalex.org/W2',
			});

			await provider.removeBookmark(recordId1);

			const bookmarks = await provider.getBookmarks();
			expect(bookmarks).toHaveLength(1);
			expect(bookmarks[0].id).toBe(recordId2);
			expect(bookmarks[0].entityId).toBe('W2');
		});

		it('should update bookmark status after removal', async () => {
			await provider.initializeSpecialLists();

			const entityRecordId = await provider.addBookmark({
				entityType: 'authors',
				entityId: 'A999',
				url: 'https://openalex.org/A999',
			});

			let isBookmarked = await provider.isBookmarked('authors', 'A999');
			expect(isBookmarked).toBe(true);

			await provider.removeBookmark(entityRecordId);

			isBookmarked = await provider.isBookmarked('authors', 'A999');
			expect(isBookmarked).toBe(false);
		});

		it('should throw error when removing non-existent bookmark', async () => {
			await provider.initializeSpecialLists();

			await expect(
				provider.removeBookmark('non-existent-id')
			).rejects.toThrow();
		});
	});

	describe('duplicate bookmark detection', () => {
		it('should prevent duplicate bookmarks for same entity', async () => {
			await provider.initializeSpecialLists();

			await provider.addBookmark({
				entityType: 'works',
				entityId: 'W123',
				url: 'https://openalex.org/W123',
			});

			// Attempt to add same entity again
			await expect(
				provider.addBookmark({
					entityType: 'works',
					entityId: 'W123',
					url: 'https://openalex.org/W123',
				})
			).rejects.toThrow('Entity already exists in list');
		});

		it('should allow same entity ID with different entity types', async () => {
			await provider.initializeSpecialLists();

			await provider.addBookmark({
				entityType: 'works',
				entityId: 'X123',
				url: 'https://openalex.org/W123',
			});

			// Different entity type but same ID - should be allowed
			const recordId = await provider.addBookmark({
				entityType: 'authors',
				entityId: 'X123',
				url: 'https://openalex.org/A123',
			});

			expect(recordId).toBeTruthy();

			const bookmarks = await provider.getBookmarks();
			expect(bookmarks).toHaveLength(2);
		});
	});

	describe('bookmark metadata validation', () => {
		it('should preserve all bookmark metadata fields', async () => {
			await provider.initializeSpecialLists();

			const beforeTimestamp = new Date();

			const entityRecordId = await provider.addBookmark({
				entityType: 'institutions',
				entityId: 'I987654',
				url: 'https://openalex.org/I987654',
				title: 'MIT',
				notes: 'Leading research institution',
			});

			const afterTimestamp = new Date();

			const bookmarks = await provider.getBookmarks();
			const bookmark = bookmarks[0];

			expect(bookmark.id).toBe(entityRecordId);
			expect(bookmark.entityType).toBe('institutions');
			expect(bookmark.entityId).toBe('I987654');
			expect(bookmark.listId).toBe(SPECIAL_LIST_IDS.BOOKMARKS);
			expect(bookmark.notes).toContain('Leading research institution');
			expect(bookmark.notes).toContain('URL: https://openalex.org/I987654');
			expect(bookmark.addedAt).toBeInstanceOf(Date);
			expect(bookmark.addedAt.getTime()).toBeGreaterThanOrEqual(beforeTimestamp.getTime());
			expect(bookmark.addedAt.getTime()).toBeLessThanOrEqual(afterTimestamp.getTime());
			expect(bookmark.position).toBeGreaterThan(0);
		});

		it('should handle bookmark without optional fields', async () => {
			await provider.initializeSpecialLists();

			const entityRecordId = await provider.addBookmark({
				entityType: 'funders',
				entityId: 'F555',
				url: 'https://openalex.org/F555',
				// No title or notes provided
			});

			const bookmarks = await provider.getBookmarks();
			const bookmark = bookmarks[0];

			expect(bookmark.id).toBe(entityRecordId);
			expect(bookmark.notes).toBe('URL: https://openalex.org/F555');
		});

		it('should handle special characters in URLs and notes', async () => {
			await provider.initializeSpecialLists();

			await provider.addBookmark({
				entityType: 'works',
				entityId: 'W999',
				url: 'https://example.com/path?query=value&param=123#fragment',
				notes: 'Contains special chars: <>&"\'',
			});

			const bookmarks = await provider.getBookmarks();

			expect(bookmarks[0].notes).toContain('https://example.com/path?query=value&param=123#fragment');
			expect(bookmarks[0].notes).toContain('Contains special chars: <>&"\'');
		});

		it('should handle very long notes', async () => {
			await provider.initializeSpecialLists();

			const longNotes = 'A'.repeat(1000);

			await provider.addBookmark({
				entityType: 'works',
				entityId: 'W888',
				url: 'https://openalex.org/W888',
				notes: longNotes,
			});

			const bookmarks = await provider.getBookmarks();

			expect(bookmarks[0].notes).toContain(longNotes);
			expect(bookmarks[0].notes?.length).toBeGreaterThan(1000);
		});
	});

	describe('integration with list operations', () => {
		it('should not allow manual deletion of bookmarks list', async () => {
			await provider.initializeSpecialLists();

			await expect(
				provider.deleteList(SPECIAL_LIST_IDS.BOOKMARKS)
			).rejects.toThrow('Cannot delete special system list');
		});

		it('should identify bookmarks list as special system list', async () => {
			const isSpecial = provider.isSpecialList(SPECIAL_LIST_IDS.BOOKMARKS);

			expect(isSpecial).toBe(true);
		});

		it('should exclude bookmarks list from non-system lists', async () => {
			await provider.initializeSpecialLists();

			// Create a regular user list
			await provider.createList({
				title: 'My Research Papers',
				type: 'bibliography',
			});

			const nonSystemLists = await provider.getNonSystemLists();

			expect(nonSystemLists).toHaveLength(1);
			expect(nonSystemLists[0].title).toBe('My Research Papers');
			expect(nonSystemLists.find((l) => l.id === SPECIAL_LIST_IDS.BOOKMARKS)).toBeUndefined();
		});

		it('should update list timestamp when bookmark added', async () => {
			await provider.initializeSpecialLists();

			const beforeList = await provider.getList(SPECIAL_LIST_IDS.BOOKMARKS);
			const beforeTimestamp = beforeList?.updatedAt;

			// Wait a moment to ensure timestamp difference
			await new Promise((resolve) => setTimeout(resolve, 10));

			await provider.addBookmark({
				entityType: 'works',
				entityId: 'W777',
				url: 'https://openalex.org/W777',
			});

			const afterList = await provider.getList(SPECIAL_LIST_IDS.BOOKMARKS);
			const afterTimestamp = afterList?.updatedAt;

			expect(beforeTimestamp).toBeTruthy();
			expect(afterTimestamp).toBeTruthy();
			expect(afterTimestamp!.getTime()).toBeGreaterThan(beforeTimestamp!.getTime());
		});

		it('should update list timestamp when bookmark removed', async () => {
			await provider.initializeSpecialLists();

			const entityRecordId = await provider.addBookmark({
				entityType: 'works',
				entityId: 'W666',
				url: 'https://openalex.org/W666',
			});

			const beforeList = await provider.getList(SPECIAL_LIST_IDS.BOOKMARKS);
			const beforeTimestamp = beforeList?.updatedAt;

			// Wait a moment to ensure timestamp difference
			await new Promise((resolve) => setTimeout(resolve, 10));

			await provider.removeBookmark(entityRecordId);

			const afterList = await provider.getList(SPECIAL_LIST_IDS.BOOKMARKS);
			const afterTimestamp = afterList?.updatedAt;

			expect(afterTimestamp!.getTime()).toBeGreaterThan(beforeTimestamp!.getTime());
		});
	});
});
