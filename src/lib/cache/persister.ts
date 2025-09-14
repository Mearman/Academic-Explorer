/**
 * Hybrid persister for TanStack Query
 * Provides optimized multi-tier storage: Memory → localStorage → IndexedDB
 * localStorage is checked first for speed, then IndexedDB for bulk storage
 */

import { openDB } from 'idb';
import { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { CACHE_CONFIG } from '@/config/cache';
import { logError, logger } from '@/lib/logger';

// localStorage storage limits and configuration
const LOCALSTORAGE_KEY = 'academic-explorer-cache';
const LOCALSTORAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB conservative limit
const LOCALSTORAGE_COMPRESSION_THRESHOLD = 50 * 1024; // 50KB - compress larger items

/**
 * Create an IndexedDB persister for TanStack Query
 * Uses idb library for simplified IndexedDB access
 */
export function createIDBPersister(dbName = 'academic-explorer-cache'): Persister {
  const dbVersion = 1;

  const openDatabase = async () => {
    return openDB(dbName, dbVersion, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache');
        }
      },
    });
  };

  return {
    persistClient: async (client: PersistedClient) => {
      try {
        // Add timestamp for cache management
        const persistedData = {
          ...client,
          timestamp: Date.now(),
          version: '1.0', // For future schema migrations
        };

        const db = await openDatabase();
        const tx = db.transaction('cache', 'readwrite');
        const store = tx.objectStore('cache');
        await store.put(persistedData, 'queryClient');
        await tx.done;
      } catch (error) {
        logError('Failed to persist query client', error, 'CachePersister', 'storage');
        // Don't throw - persistence failure shouldn't break the app
      }
    },

    restoreClient: async (): Promise<PersistedClient | undefined> => {
      try {
        const db = await openDatabase();
        const tx = db.transaction('cache', 'readonly');
        const store = tx.objectStore('cache');
        const data = await store.get('queryClient');

        // Type guard for persisted data
        if (!data || typeof data !== 'object') {
          return undefined;
        }

        const persistedData = data as PersistedClient & { timestamp?: number; version?: string };

        // Check if cache is expired (based on maxAge)
        if (persistedData.timestamp) {
          const age = Date.now() - persistedData.timestamp;
          if (age > CACHE_CONFIG.maxAge) {
            logger.info('cache', 'Cache expired, clearing old data', { age, maxAge: CACHE_CONFIG.maxAge });
            const delTx = db.transaction('cache', 'readwrite');
            const delStore = delTx.objectStore('cache');
            await delStore.delete('queryClient');
            await delTx.done;
            return undefined;
          }
        }

        // Remove our metadata before returning to TanStack Query
        const { timestamp, version, ...clientData } = persistedData;

        // Validate that clientData has the required PersistedClient structure
        if (!clientData.clientState) {
          return undefined;
        }

        return clientData;
      } catch (error) {
        logError('Failed to restore query client', error, 'CachePersister', 'storage');
        return undefined;
      }
    },

    removeClient: async () => {
      try {
        const db = await openDatabase();
        const tx = db.transaction('cache', 'readwrite');
        const store = tx.objectStore('cache');
        await store.delete('queryClient');
        await tx.done;
      } catch (error) {
        logError('Failed to remove persisted client', error, 'CachePersister', 'storage');
      }
    },
  };
}

/**
 * Get cache statistics from IndexedDB
 */
export async function getCacheStats(dbName = 'academic-explorer-cache') {
  try {
    const db = await openDB(dbName, 1);
    const tx = db.transaction('cache', 'readonly');
    const store = tx.objectStore('cache');
    const data = await store.get('queryClient');

    // Type guard for persisted data
    if (!data || typeof data !== 'object') {
      return {
        exists: false,
        size: 0,
        age: 0,
        queryCount: 0,
      };
    }

    const persistedData = data as PersistedClient & { timestamp?: number };

    const age = persistedData.timestamp ? Date.now() - persistedData.timestamp : 0;
    const queryCount = persistedData.clientState?.queries?.length || 0;

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
    logError('Failed to get cache stats', error, 'CachePersister', 'storage');
    return {
      exists: false,
      size: 0,
      age: 0,
      queryCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clear expired cache entries
 */
export async function clearExpiredCache(dbName = 'academic-explorer-cache') {
  try {
    const stats = await getCacheStats(dbName);

    if (stats.isExpired) {
      const db = await openDB(dbName, 1);
      const tx = db.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      await store.delete('queryClient');
      await tx.done;
      logger.info('cache', 'Cleared expired cache', { dbName });
      return true;
    }

    return false;
  } catch (error) {
    logError('Failed to clear expired cache', error, 'CachePersister', 'storage');
    return false;
  }
}