/**
 * Storage utilities for persistent state management
 */

export {
	createIndexedDBStorage,
	defaultStorageConfig,
	type StorageConfig,
	type StateStorage,
} from "./indexeddb-storage"

export {
	userInteractionsService,
	type BookmarkRecord,
	type PageVisitRecord,
	type UserInteractionsService,
} from "./user-interactions-db"
