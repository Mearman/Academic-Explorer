/**
 * Cache invalidation orchestration system
 * Coordinates clearing all cache layers when version changes are detected
 */

import { openDB } from "idb";
import { logger, logError } from "@/lib/logger";
import {
	getCurrentAppVersion,
	createAppMetadata,
	shouldInvalidateCache,
	logVersionComparison
} from "./version-manager";
import {
	getStoredAppMetadata,
	storeAppMetadata
} from "./metadata-store";

// localStorage keys used by the app
const LOCALSTORAGE_CACHE_KEY = "academic-explorer-cache";
const LOCALSTORAGE_PREFIX = "academic-explorer";

/**
 * Cache layer identifiers for logging
 */
export enum CacheLayer {
  MEMORY = "memory",
  LOCALSTORAGE = "localStorage",
  INDEXEDDB = "indexedDB",
  METADATA = "metadata"
}

/**
 * Results of cache invalidation operation
 */
export interface InvalidationResult {
  triggered: boolean;
  reason?: string;
  clearedLayers: CacheLayer[];
  errors: Array<{ layer: CacheLayer; error: string }>;
  oldVersion?: string;
  newVersion: string;
  timestamp: string;
}

/**
 * Clear memory cache (TanStack Query)
 * Note: This is handled by the persister's removeClient method
 */
function clearMemoryCache(): void {
	// Memory cache is managed by TanStack Query and will be cleared
	// when the persister's removeClient is called
	logger.debug("cache", "Memory cache will be cleared by persister");
}

/**
 * Clear localStorage cache entries
 */
function clearLocalStorageCache(): void {
	try {
		const clearedKeys: string[] = [];

		// Clear the main cache key
		if (localStorage.getItem(LOCALSTORAGE_CACHE_KEY)) {
			localStorage.removeItem(LOCALSTORAGE_CACHE_KEY);
			clearedKeys.push(LOCALSTORAGE_CACHE_KEY);
		}

		// Clear any other cache-related keys with the app prefix
		for (const key in localStorage) {
			if (key.startsWith(LOCALSTORAGE_PREFIX) && key !== LOCALSTORAGE_CACHE_KEY) {
				localStorage.removeItem(key);
				clearedKeys.push(key);
			}
		}

		if (clearedKeys.length > 0) {
			logger.debug("cache", "Cleared localStorage cache", { keys: clearedKeys });
		} else {
			logger.debug("cache", "No localStorage cache entries to clear");
		}
	} catch (error) {
		logError("Failed to clear localStorage cache", error, "CacheInvalidator", "storage");
		throw error;
	}
}

/**
 * Clear IndexedDB cache entries
 */
async function clearIndexedDBCache(): Promise<void> {
	const cacheDBName = "academic-explorer-cache";

	try {
		const db = await openDB(cacheDBName, 1, {
			upgrade(db) {
				if (!db.objectStoreNames.contains("cache")) {
					db.createObjectStore("cache");
				}
			},
		});

		const tx = db.transaction("cache", "readwrite");
		const store = tx.objectStore("cache");

		// Clear all cache entries
		await store.clear();
		await tx.done;

		logger.debug("cache", "Cleared IndexedDB cache", { dbName: cacheDBName });
	} catch (error) {
		logError("Failed to clear IndexedDB cache", error, "CacheInvalidator", "storage");
		throw error;
	}
}

/**
 * Clear all cache layers
 */
export async function clearAllCacheLayers(): Promise<{ clearedLayers: CacheLayer[]; errors: Array<{ layer: CacheLayer; error: string }> }> {
	const clearedLayers: CacheLayer[] = [];
	const errors: Array<{ layer: CacheLayer; error: string }> = [];

	// Clear memory cache
	try {
		clearMemoryCache();
		clearedLayers.push(CacheLayer.MEMORY);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		errors.push({ layer: CacheLayer.MEMORY, error: errorMessage });
	}

	// Clear localStorage cache
	try {
		clearLocalStorageCache();
		clearedLayers.push(CacheLayer.LOCALSTORAGE);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		errors.push({ layer: CacheLayer.LOCALSTORAGE, error: errorMessage });
	}

	// Clear IndexedDB cache
	try {
		await clearIndexedDBCache();
		clearedLayers.push(CacheLayer.INDEXEDDB);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		errors.push({ layer: CacheLayer.INDEXEDDB, error: errorMessage });
	}

	return { clearedLayers, errors };
}

/**
 * Main cache invalidation check and execution
 * This should be called during application initialization
 */
export async function checkAndInvalidateCache(): Promise<InvalidationResult> {
	const currentVersion = getCurrentAppVersion();
	const timestamp = new Date().toISOString();

	try {
		// Get stored metadata
		const storedMetadata = await getStoredAppMetadata();

		// Check if cache should be invalidated
		const { shouldInvalidate, reason } = shouldInvalidateCache(storedMetadata, currentVersion);

		// Log version comparison
		logVersionComparison(storedMetadata, currentVersion, shouldInvalidate, reason);

		if (!shouldInvalidate) {
			return {
				triggered: false,
				clearedLayers: [],
				errors: [],
				newVersion: currentVersion,
				timestamp
			};
		}

		// Perform cache invalidation
		logger.warn("cache", "Starting cache invalidation", { reason, currentVersion });

		const { clearedLayers, errors } = await clearAllCacheLayers();

		// Update metadata with new version
		const newMetadata = createAppMetadata();

		// Preserve installation time if it exists
		if (storedMetadata?.installationTime) {
			newMetadata.installationTime = storedMetadata.installationTime;
		}

		await storeAppMetadata(newMetadata);

		const result: InvalidationResult = {
			triggered: true,
			reason,
			clearedLayers,
			errors,
			oldVersion: storedMetadata?.version,
			newVersion: currentVersion,
			timestamp
		};

		if (errors.length > 0) {
			logger.error("cache", "Cache invalidation completed with errors", {
				clearedLayers: clearedLayers.length,
				errors: errors.length,
				errorDetails: errors
			});
		} else {
			logger.debug("cache", "Cache invalidation completed successfully", {
				reason,
				clearedLayers,
				oldVersion: storedMetadata?.version,
				newVersion: currentVersion
			});
		}

		return result;

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		logError("Cache invalidation failed", error, "CacheInvalidator", "storage");

		return {
			triggered: true,
			reason: "Cache invalidation failed",
			clearedLayers: [],
			errors: [{ layer: CacheLayer.METADATA, error: errorMessage }],
			newVersion: currentVersion,
			timestamp
		};
	}
}

/**
 * Force cache invalidation (for manual clearing or debugging)
 */
export async function forceInvalidateCache(reason = "Manual invalidation"): Promise<InvalidationResult> {
	const currentVersion = getCurrentAppVersion();
	const timestamp = new Date().toISOString();

	logger.warn("cache", "Forcing cache invalidation", { reason });

	try {
		const { clearedLayers, errors } = await clearAllCacheLayers();

		// Update metadata
		const newMetadata = createAppMetadata();
		await storeAppMetadata(newMetadata);

		const result: InvalidationResult = {
			triggered: true,
			reason,
			clearedLayers,
			errors,
			newVersion: currentVersion,
			timestamp
		};

		logger.debug("cache", "Forced cache invalidation completed", {
			clearedLayers,
			errors: errors.length
		});

		return result;

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		logError("Forced cache invalidation failed", error, "CacheInvalidator", "storage");

		return {
			triggered: true,
			reason: "Forced invalidation failed",
			clearedLayers: [],
			errors: [{ layer: CacheLayer.METADATA, error: errorMessage }],
			newVersion: currentVersion,
			timestamp
		};
	}
}

/**
 * Get invalidation history and statistics
 */
export async function getCacheInvalidationStats(): Promise<{
  lastInvalidation?: string;
  currentVersion: string;
  installationAge?: number;
  timeSinceLastInvalidation?: number;
}> {
	const currentVersion = getCurrentAppVersion();

	try {
		const metadata = await getStoredAppMetadata();

		if (!metadata) {
			return { currentVersion };
		}

		const now = Date.now();
		const lastInvalidationTime = new Date(metadata.lastCacheInvalidation).getTime();
		const installationTime = new Date(metadata.installationTime).getTime();

		return {
			lastInvalidation: metadata.lastCacheInvalidation,
			currentVersion,
			installationAge: now - installationTime,
			timeSinceLastInvalidation: now - lastInvalidationTime,
		};
	} catch (error) {
		logError("Failed to get cache invalidation stats", error, "CacheInvalidator", "storage");
		return { currentVersion };
	}
}