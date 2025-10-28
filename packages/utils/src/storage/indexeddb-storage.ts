// @ts-nocheck - Dexie module resolution issues with TypeScript bundler mode
/**
 * Pure Dexie storage adapter
 * Simplified IndexedDB-only implementation replacing hybrid localStorage + IndexedDB approach
 */

import Dexie from "dexie"
import { GenericLogger } from "../logger.js"

// Generic storage interface compatible with various state management libraries
export interface StateStorage {
	getItem: (name: string) => string | null | Promise<string | null>
	setItem: (name: string, value: string) => void | Promise<void>
	removeItem: (name: string) => void | Promise<void>
}

// Storage configuration
export interface StorageConfig {
	dbName: string
	storeName: string
	version: number
}

// Dexie database class for key-value storage
class KeyValueDB extends Dexie {
	keyValueStore!: Dexie.Table<{ key: string; value: string }, string>

	constructor({
		dbName,
		storeName,
		version,
	}: {
		dbName: string
		storeName: string
		version: number
	}) {
		super(dbName)
		this.version(version).stores({
			[storeName]: "key,value",
		})
		this.keyValueStore = this.table(storeName)
	}
}

// Cache the database connection per configuration
const dbCache = new Map<string, Promise<KeyValueDB>>()

// In-memory fallback for test environments
const memoryStorage = new Map<string, string>()

const isIndexedDBAvailable = (): boolean => {
	try {
		return typeof indexedDB !== "undefined"
	} catch {
		return false
	}
}

const getDB = (config: StorageConfig): Promise<KeyValueDB> => {
	const cacheKey = `${config.dbName}-${config.version}`

	if (!dbCache.has(cacheKey)) {
		const dbPromise = Promise.resolve(
			new KeyValueDB({
				dbName: config.dbName,
				storeName: config.storeName,
				version: config.version,
			})
		)
		dbCache.set(cacheKey, dbPromise)
	}

	const cached = dbCache.get(cacheKey)
	if (!cached) {
		throw new Error(`Database cache corrupted for ${cacheKey}`)
	}
	return cached
}

/**
 * Creates a pure Dexie storage adapter for IndexedDB operations
 * Simplified from hybrid approach - no localStorage fallback
 */
export const createIndexedDBStorage = (
	config: StorageConfig,
	logger?: GenericLogger
): StateStorage => {
	const useIndexedDB = isIndexedDBAvailable()

	if (!useIndexedDB) {
		logger?.debug("storage", "IndexedDB not available, using memory storage fallback")
	}

	return {
		getItem: async (name: string): Promise<string | null> => {
			if (!useIndexedDB) {
				const value = memoryStorage.get(name) ?? null
				logger?.debug("storage", "Retrieved item from memory storage", { name })
				return value
			}

			try {
				const db = await getDB(config)
				const item = await db.keyValueStore.get({ key: name })
				const value = item?.value ?? null
				logger?.debug("storage", "Retrieved item from IndexedDB", { name })
				return value
			} catch (error) {
				logger?.error("storage", "Failed to get item from IndexedDB", {
					name,
					error,
				})
				return null
			}
		},

		setItem: async (name: string, value: string): Promise<void> => {
			if (!useIndexedDB) {
				memoryStorage.set(name, value)
				logger?.debug("storage", "Stored item in memory storage", {
					name,
					valueSize: value.length,
				})
				return
			}

			try {
				const db = await getDB(config)
				await db.keyValueStore.put({ key: name, value })
				logger?.debug("storage", "Stored item in IndexedDB", {
					name,
					valueSize: value.length,
				})
			} catch (error) {
				logger?.error("storage", "Failed to set item in IndexedDB", {
					name,
					error,
				})
				throw error // Re-throw to trigger error handling
			}
		},

		removeItem: async (name: string): Promise<void> => {
			if (!useIndexedDB) {
				memoryStorage.delete(name)
				logger?.debug("storage", "Removed item from memory storage", { name })
				return
			}

			try {
				const db = await getDB(config)
				await db.keyValueStore.delete(name)
				logger?.debug("storage", "Removed item from IndexedDB", { name })
			} catch (error) {
				logger?.error("storage", "Failed to remove item from IndexedDB", {
					name,
					error,
				})
				throw error
			}
		},
	}
}

// Export default configurations for common use cases
export const defaultStorageConfig: StorageConfig = {
	dbName: "app-storage",
	storeName: "app-storage",
	version: 1,
}
