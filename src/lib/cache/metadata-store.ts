/**
 * Application metadata storage for version tracking and cache management
 * Provides version-aware storage separate from query cache data
 */

import { openDB, type IDBPDatabase } from "idb";
import { logger, logError } from "@/lib/logger";
import type { AppMetadata } from "./version-manager";

const DB_NAME = "academic-explorer-metadata";
const DB_VERSION = 1;
const METADATA_STORE = "app_metadata";
const METADATA_KEY = "current";

/**
 * Database connection for metadata storage
 */
let dbConnection: IDBPDatabase | null = null;

/**
 * Initialize the metadata database
 */
async function openMetadataDB(): Promise<IDBPDatabase> {
	if (dbConnection) {
		return dbConnection;
	}

	try {
		dbConnection = await openDB(DB_NAME, DB_VERSION, {
			upgrade(db) {
				// Create metadata store if it doesn't exist
				if (!db.objectStoreNames.contains(METADATA_STORE)) {
					db.createObjectStore(METADATA_STORE);
					logger.info("cache", "Created app metadata store", { dbName: DB_NAME });
				}
			},
		});

		return dbConnection;
	} catch (error) {
		logError("Failed to open metadata database", error, "MetadataStore", "storage");
		throw error;
	}
}

/**
 * Store application metadata
 */
export async function storeAppMetadata(metadata: AppMetadata): Promise<void> {
	try {
		const db = await openMetadataDB();
		const tx = db.transaction(METADATA_STORE, "readwrite");
		const store = tx.objectStore(METADATA_STORE);

		await store.put(metadata, METADATA_KEY);
		await tx.done;

		logger.info("cache", "Stored app metadata", {
			version: metadata.version,
			timestamp: metadata.lastCacheInvalidation
		});
	} catch (error) {
		logError("Failed to store app metadata", error, "MetadataStore", "storage");
		throw error;
	}
}

/**
 * Retrieve stored application metadata
 */
export async function getStoredAppMetadata(): Promise<AppMetadata | null> {
	try {
		const db = await openMetadataDB();
		const tx = db.transaction(METADATA_STORE, "readonly");
		const store = tx.objectStore(METADATA_STORE);

		const metadata = await store.get(METADATA_KEY) as AppMetadata | undefined;
		await tx.done;

		if (metadata) {
			logger.debug("cache", "Retrieved stored app metadata", {
				version: metadata.version,
				installationTime: metadata.installationTime
			});
		} else {
			logger.debug("cache", "No stored app metadata found");
		}

		return metadata || null;
	} catch (error) {
		logError("Failed to retrieve app metadata", error, "MetadataStore", "storage");
		return null;
	}
}

/**
 * Clear stored application metadata
 */
export async function clearAppMetadata(): Promise<void> {
	try {
		const db = await openMetadataDB();
		const tx = db.transaction(METADATA_STORE, "readwrite");
		const store = tx.objectStore(METADATA_STORE);

		await store.delete(METADATA_KEY);
		await tx.done;

		logger.info("cache", "Cleared app metadata");
	} catch (error) {
		logError("Failed to clear app metadata", error, "MetadataStore", "storage");
		throw error;
	}
}

/**
 * Update the last cache invalidation timestamp
 */
export async function updateLastInvalidationTime(): Promise<void> {
	try {
		const metadata = await getStoredAppMetadata();
		if (metadata) {
			metadata.lastCacheInvalidation = new Date().toISOString();
			await storeAppMetadata(metadata);
		}
	} catch (error) {
		logError("Failed to update last invalidation time", error, "MetadataStore", "storage");
	}
}

/**
 * Get metadata storage statistics
 */
export async function getMetadataStats(): Promise<{
  exists: boolean;
  version?: string;
  age?: number;
  installationAge?: number;
  lastInvalidation?: string;
  error?: string;
}> {
	try {
		const metadata = await getStoredAppMetadata();

		if (!metadata) {
			return { exists: false };
		}

		const now = Date.now();
		const lastInvalidationTime = new Date(metadata.lastCacheInvalidation).getTime();
		const installationTime = new Date(metadata.installationTime).getTime();

		return {
			exists: true,
			version: metadata.version,
			age: now - lastInvalidationTime,
			installationAge: now - installationTime,
			lastInvalidation: metadata.lastCacheInvalidation,
		};
	} catch (error) {
		return {
			exists: false,
			error: error instanceof Error ? error.message : "Unknown error"
		};
	}
}

/**
 * Close the metadata database connection
 */
export function closeMetadataDB(): void {
	if (dbConnection) {
		dbConnection.close();
		dbConnection = null;
		logger.debug("cache", "Closed metadata database connection");
	}
}