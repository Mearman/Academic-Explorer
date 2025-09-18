/**
 * Hybrid persister for TanStack Query
 * Provides optimized multi-tier storage: Memory → localStorage → IndexedDB
 * localStorage is checked first for speed, then IndexedDB for bulk storage
 */

import { openDB } from "idb";
import { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { CACHE_CONFIG } from "@/config/cache";
import { logError, logger } from "@/lib/logger";

// localStorage storage limits and configuration
const LOCALSTORAGE_KEY = "academic-explorer-cache";
const LOCALSTORAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB conservative limit
const LOCALSTORAGE_COMPRESSION_THRESHOLD = 50 * 1024; // 50KB - compress larger items

// Safe property accessor for unknown objects
function getObjectProperty(obj: unknown, prop: string): unknown {
	return obj !== null && typeof obj === "object" && Object.prototype.hasOwnProperty.call(obj, prop)
		? (obj as Record<string, unknown>)[prop]
		: undefined
}

// Type guard for PersistedClient with optional metadata
function isPersistedClientData(obj: unknown): obj is PersistedClient & { timestamp?: number; version?: string } {
	if (!obj || typeof obj !== "object") return false

	// Check for required PersistedClient properties
	const clientState = getObjectProperty(obj, "clientState")
	if (!clientState || typeof clientState !== "object") return false

	// Validate optional metadata properties
	const timestamp = getObjectProperty(obj, "timestamp")
	if (timestamp !== undefined && typeof timestamp !== "number") return false

	const version = getObjectProperty(obj, "version")
	if (version !== undefined && typeof version !== "string") return false

	return true
}

// Simpler type guard for PersistedClient with timestamp
function isPersistedClientWithTimestamp(obj: unknown): obj is PersistedClient & { timestamp?: number } {
	if (!obj || typeof obj !== "object") return false

	// Check for required PersistedClient properties
	const clientState = getObjectProperty(obj, "clientState")
	if (!clientState || typeof clientState !== "object") return false

	// Validate optional timestamp
	const timestamp = getObjectProperty(obj, "timestamp")
	if (timestamp !== undefined && typeof timestamp !== "number") return false

	return true
}

/**
 * Create a hybrid persister that uses localStorage first, then IndexedDB
 * Provides optimized multi-tier storage: Memory → localStorage → IndexedDB
 * localStorage is checked first for speed, then IndexedDB for bulk storage
 */
export function createHybridPersister(dbName = "academic-explorer-cache"): Persister {
	const dbVersion = 1;

	const openDatabase = async () => {
		return openDB(dbName, dbVersion, {
			upgrade(db) {
				if (!db.objectStoreNames.contains("cache")) {
					db.createObjectStore("cache");
				}
			},
		});
	};

	// Check if localStorage is available
	const isLocalStorageAvailable = (): boolean => {
		try {
			const test = "__test__";
			localStorage.setItem(test, test);
			localStorage.removeItem(test);
			return true;
		} catch {
			return false;
		}
	};

	// Get current localStorage usage
	const getLocalStorageUsage = (): number => {
		try {
			let total = 0;
			for (const key in localStorage) {
				if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
					const value: string | null = localStorage.getItem(key);
					if (value !== null) {
						total += (value.length + key.length);
					}
				}
			}
			return total * 2; // UTF-16 characters are 2 bytes
		} catch {
			return 0;
		}
	};

	// Compress data if over threshold
	const maybeCompress = (data: string): string => {
		if (data.length > LOCALSTORAGE_COMPRESSION_THRESHOLD) {
			// Simple compression placeholder - in production might use LZ-string
			logger.debug("cache", "Data size over compression threshold, storing uncompressed", {
				size: data.length,
				threshold: LOCALSTORAGE_COMPRESSION_THRESHOLD
			});
		}
		return data;
	};

	return {
		persistClient: async (client: PersistedClient) => {
			try {
				// Add timestamp for cache management
				const persistedData = {
					...client,
					timestamp: Date.now(),
					version: "1.0", // For future schema migrations
				};

				const serializedData = JSON.stringify(persistedData);
				const dataSize = new Blob([serializedData]).size;

				// Try localStorage first if available and data fits
				if (isLocalStorageAvailable() && dataSize < LOCALSTORAGE_MAX_SIZE) {
					const currentUsage = getLocalStorageUsage();

					if (currentUsage + dataSize < LOCALSTORAGE_MAX_SIZE) {
						try {
							const compressedData = maybeCompress(serializedData);
							localStorage.setItem(LOCALSTORAGE_KEY, compressedData);
							logger.debug("cache", "Persisted query client to localStorage", {
								size: dataSize,
								usage: currentUsage + dataSize,
								limit: LOCALSTORAGE_MAX_SIZE
							});
							return;
						} catch (error) {
							logger.warn("cache", "localStorage persistence failed, falling back to IndexedDB", { error });
							// Clear localStorage item if it was partially written
							try { localStorage.removeItem(LOCALSTORAGE_KEY); } catch { /* Ignore cleanup errors */ }
						}
					} else {
						logger.debug("cache", "localStorage full, using IndexedDB for persistence", {
							currentUsage,
							dataSize,
							limit: LOCALSTORAGE_MAX_SIZE
						});
					}
				}

				// Fall back to IndexedDB for larger data or if localStorage failed
				const db = await openDatabase();
				const tx = db.transaction("cache", "readwrite");
				const store = tx.objectStore("cache");
				await store.put(persistedData, "queryClient");
				await tx.done;

				logger.debug("cache", "Persisted query client to IndexedDB", { size: dataSize });

			} catch (error) {
				logError("Failed to persist query client", error, "CachePersister", "storage");
				// Don't throw - persistence failure shouldn't break the app
			}
		},

		restoreClient: async (): Promise<PersistedClient | undefined> => {
			try {
				// First, try localStorage (fast synchronous access)
				if (isLocalStorageAvailable()) {
					try {
						const stored = localStorage.getItem(LOCALSTORAGE_KEY);
						if (stored) {
							const parsed = JSON.parse(stored) as unknown

							// Validate parsed data structure
							if (!isPersistedClientData(parsed)) {
								logger.warn("cache", "Invalid localStorage cache structure, clearing", { keys: Object.keys(parsed as Record<string, unknown>) });
								localStorage.removeItem(LOCALSTORAGE_KEY);
								throw new Error("Invalid cache structure");
							}

							// Check if cache is expired
							if (parsed.timestamp) {
								const age = Date.now() - parsed.timestamp;
								if (age > CACHE_CONFIG.maxAge) {
									logger.debug("cache", "localStorage cache expired, clearing", { age, maxAge: CACHE_CONFIG.maxAge });
									localStorage.removeItem(LOCALSTORAGE_KEY);
								} else {
									// Remove metadata and return
									const { version, ...clientData } = parsed;
									logger.debug("cache", "Restored query client from localStorage", { age });
									return clientData;
								}
							}
						}
					} catch (error) {
						logger.warn("cache", "localStorage restore failed, trying IndexedDB", { error });
						// Clear corrupted localStorage item
						try { localStorage.removeItem(LOCALSTORAGE_KEY); } catch { /* Ignore cleanup errors */ }
					}
				}

				// Fall back to IndexedDB
				const db = await openDatabase();
				const tx = db.transaction("cache", "readonly");
				const store = tx.objectStore("cache");
				const data = await store.get("queryClient") as unknown;

				// Validate persisted data structure
				if (!isPersistedClientData(data)) {
					if (data) {
						logger.warn("cache", "Invalid IndexedDB cache structure, clearing");
						const delTx = db.transaction("cache", "readwrite");
						const delStore = delTx.objectStore("cache");
						await delStore.delete("queryClient");
						await delTx.done;
					}
					return undefined;
				}

				const persistedData = data;

				// Check if cache is expired (based on maxAge)
				if (persistedData.timestamp) {
					const age = Date.now() - persistedData.timestamp;
					if (age > CACHE_CONFIG.maxAge) {
						logger.debug("cache", "IndexedDB cache expired, clearing old data", { age, maxAge: CACHE_CONFIG.maxAge });
						const delTx = db.transaction("cache", "readwrite");
						const delStore = delTx.objectStore("cache");
						await delStore.delete("queryClient");
						await delTx.done;
						return undefined;
					}
				}

				// Remove our metadata before returning to TanStack Query
				const { version, ...clientData } = persistedData;

				logger.debug("cache", "Restored query client from IndexedDB", {
					age: persistedData.timestamp ? Date.now() - persistedData.timestamp : 0
				});
				return clientData;
			} catch (error) {
				logError("Failed to restore query client", error, "CachePersister", "storage");
				return undefined;
			}
		},

		removeClient: async () => {
			try {
				// Clear localStorage
				if (isLocalStorageAvailable()) {
					try {
						localStorage.removeItem(LOCALSTORAGE_KEY);
					} catch (error) {
						logger.warn("cache", "Failed to remove localStorage item", { error });
					}
				}

				// Clear IndexedDB
				const db = await openDatabase();
				const tx = db.transaction("cache", "readwrite");
				const store = tx.objectStore("cache");
				await store.delete("queryClient");
				await tx.done;

				logger.debug("cache", "Removed query client from all storage layers");
			} catch (error) {
				logError("Failed to remove persisted client", error, "CachePersister", "storage");
			}
		},
	};
}


/**
 * Get cache statistics from IndexedDB
 */
export async function getCacheStats(dbName = "academic-explorer-cache") {
	try {
		const db = await openDB(dbName, 1);
		const tx = db.transaction("cache", "readonly");
		const store = tx.objectStore("cache");
		const data = await store.get("queryClient") as unknown;

		// Validate persisted data structure
		if (!isPersistedClientWithTimestamp(data)) {
			return {
				exists: false,
				size: 0,
				age: 0,
				queryCount: 0,
			};
		}

		const persistedData = data;

		const age = persistedData.timestamp ? Date.now() - persistedData.timestamp : 0;
		const queryCount = persistedData.clientState.queries.length || 0;

		// Estimate size (rough approximation)
		const estimatedSize = new Blob([JSON.stringify(persistedData)]).size;

		return {
			exists: true,
			size: estimatedSize,
			age,
			queryCount,
			isExpired: age > CACHE_CONFIG.maxAge,
		};
	} catch (error) {
		logError("Failed to get cache stats", error, "CachePersister", "storage");
		return {
			exists: false,
			size: 0,
			age: 0,
			queryCount: 0,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Clear expired cache entries
 */
export async function clearExpiredCache(dbName = "academic-explorer-cache") {
	try {
		const stats = await getCacheStats(dbName);

		if (stats.isExpired) {
			const db = await openDB(dbName, 1);
			const tx = db.transaction("cache", "readwrite");
			const store = tx.objectStore("cache");
			await store.delete("queryClient");
			await tx.done;
			logger.debug("cache", "Cleared expired cache", { dbName });
			return true;
		}

		return false;
	} catch (error) {
		logError("Failed to clear expired cache", error, "CachePersister", "storage");
		return false;
	}
}