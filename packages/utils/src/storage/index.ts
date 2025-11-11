/**
 * Storage utilities for persistent state management
 */

export {
	createIndexedDBStorage,
	defaultStorageConfig,
	type StorageConfig,
	type StateStorage,
} from "./indexeddb-storage.js"

export {
	userInteractionsService,
	type BookmarkRecord,
	type PageVisitRecord,
	type UserInteractionsService,
} from "./user-interactions-db.js"

// Storage Provider Interface and Types
export type {
	CatalogueStorageProvider,
	CreateListParams,
	AddEntityParams,
	AddToHistoryParams,
	AddBookmarkParams,
	ListStats,
	BatchAddResult,
	ShareAccessResult,
	StorageProviderFactory,
} from './catalogue-storage-provider.js';

// Catalogue types from database
export type {
	CatalogueList,
	CatalogueEntity,
	CatalogueShareRecord,
	EntityType,
	ListType,
} from './catalogue-db.js';

export { SPECIAL_LIST_IDS, catalogueEventEmitter } from './catalogue-db.js';

// Storage Provider Implementations
export { DexieStorageProvider } from './dexie-storage-provider.js';
export { InMemoryStorageProvider } from './in-memory-storage-provider.js';
