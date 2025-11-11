/**
 * IndexedDB storage provider implementation using Dexie
 * Wraps existing CatalogueService to implement the storage provider interface
 */

import type { CatalogueStorageProvider, CreateListParams, AddEntityParams, AddToHistoryParams, AddBookmarkParams, ListStats, BatchAddResult, ShareAccessResult } from './catalogue-storage-provider.js';
import type { CatalogueList, CatalogueEntity, EntityType } from './catalogue-db.js';
import { CatalogueService } from './catalogue-db.js';
import type { GenericLogger } from '../logger.js';

/**
 * Production storage provider using IndexedDB via Dexie
 * Delegates all operations to the existing CatalogueService
 */
export class DexieStorageProvider implements CatalogueStorageProvider {
	private catalogueService: CatalogueService;

	constructor(logger?: GenericLogger) {
		this.catalogueService = new CatalogueService(logger);
	}

	// ========== List Operations ==========

	async createList(params: CreateListParams): Promise<string> {
		return await this.catalogueService.createList(params);
	}

	async getList(listId: string): Promise<CatalogueList | null> {
		return await this.catalogueService.getList(listId);
	}

	async getAllLists(): Promise<CatalogueList[]> {
		return await this.catalogueService.getAllLists();
	}

	async updateList(
		listId: string,
		updates: Partial<Pick<CatalogueList, 'title' | 'description' | 'tags' | 'isPublic'>>
	): Promise<void> {
		return await this.catalogueService.updateList(listId, updates);
	}

	async deleteList(listId: string): Promise<void> {
		return await this.catalogueService.deleteList(listId);
	}

	// ========== Entity Operations ==========

	async addEntityToList(params: AddEntityParams): Promise<string> {
		return await this.catalogueService.addEntityToList({
			listId: params.listId,
			entityType: params.entityType,
			entityId: params.entityId,
			notes: params.notes,
			position: params.position,
		});
	}

	async getListEntities(listId: string): Promise<CatalogueEntity[]> {
		return await this.catalogueService.getListEntities(listId);
	}

	async removeEntityFromList(listId: string, entityRecordId: string): Promise<void> {
		return await this.catalogueService.removeEntityFromList(listId, entityRecordId);
	}

	async updateEntityNotes(entityRecordId: string, notes: string): Promise<void> {
		return await this.catalogueService.updateEntityNotes(entityRecordId, notes);
	}

	async addEntitiesToList(
		listId: string,
		entities: Array<{
			entityType: EntityType;
			entityId: string;
			notes?: string;
		}>
	): Promise<BatchAddResult> {
		const result = await this.catalogueService.addEntitiesToList(listId, entities);
		return {
			success: result.success,
			failed: result.failed,
		};
	}

	async reorderEntities(listId: string, orderedEntityIds: string[]): Promise<void> {
		return await this.catalogueService.reorderEntities(listId, orderedEntityIds);
	}

	// ========== Search & Stats ==========

	async searchLists(query: string): Promise<CatalogueList[]> {
		return await this.catalogueService.searchLists(query);
	}

	async getListStats(listId: string): Promise<ListStats> {
		const stats = await this.catalogueService.getListStats(listId);
		return {
			totalEntities: stats.totalEntities,
			entityCounts: stats.entityCounts,
		};
	}

	// ========== Sharing ==========

	async generateShareToken(listId: string): Promise<string> {
		return await this.catalogueService.generateShareToken(listId);
	}

	async getListByShareToken(shareToken: string): Promise<ShareAccessResult> {
		const result = await this.catalogueService.getListByShareToken(shareToken);
		return {
			list: result.list,
			valid: result.valid,
		};
	}

	// ========== Special Lists (Bookmarks & History) ==========

	async initializeSpecialLists(): Promise<void> {
		return await this.catalogueService.initializeSpecialLists();
	}

	isSpecialList(listId: string): boolean {
		return this.catalogueService.isSpecialList(listId);
	}

	async addBookmark(params: AddBookmarkParams): Promise<string> {
		return await this.catalogueService.addBookmark({
			entityType: params.entityType,
			entityId: params.entityId,
			url: params.url,
			title: params.title,
			notes: params.notes,
		});
	}

	async removeBookmark(entityRecordId: string): Promise<void> {
		return await this.catalogueService.removeBookmark(entityRecordId);
	}

	async getBookmarks(): Promise<CatalogueEntity[]> {
		return await this.catalogueService.getBookmarks();
	}

	async isBookmarked(entityType: EntityType, entityId: string): Promise<boolean> {
		return await this.catalogueService.isBookmarked(entityType, entityId);
	}

	async addToHistory(params: AddToHistoryParams): Promise<string> {
		return await this.catalogueService.addToHistory({
			entityType: params.entityType,
			entityId: params.entityId,
			url: params.url,
			title: params.title,
			timestamp: params.timestamp,
		});
	}

	async getHistory(): Promise<CatalogueEntity[]> {
		return await this.catalogueService.getHistory();
	}

	async clearHistory(): Promise<void> {
		return await this.catalogueService.clearHistory();
	}

	// ========== Additional Utilities ==========

	async getNonSystemLists(): Promise<CatalogueList[]> {
		return await this.catalogueService.getNonSystemLists();
	}
}
