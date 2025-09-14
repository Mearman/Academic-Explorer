/**
 * IndexedDB persister for TanStack Query
 * Provides persistent storage for query cache across browser sessions
 */

import { deleteDB, openDB } from 'idb';
import { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { CACHE_CONFIG } from '@/config/cache';

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
        console.error('Failed to persist query client:', error);
        // Don't throw - persistence failure shouldn't break the app
      }
    },

    restoreClient: async (): Promise<PersistedClient | undefined> => {
      try {
        const db = await openDatabase();
        const tx = db.transaction('cache', 'readonly');
        const store = tx.objectStore('cache');
        const data = await store.get('queryClient') as PersistedClient & { timestamp?: number; version?: string } | undefined;

        if (!data) {
          return undefined;
        }

        // Check if cache is expired (based on maxAge)
        if (data.timestamp) {
          const age = Date.now() - data.timestamp;
          if (age > CACHE_CONFIG.maxAge) {
            console.info('Cache expired, clearing old data');
            const delTx = db.transaction('cache', 'readwrite');
            const delStore = delTx.objectStore('cache');
            await delStore.delete('queryClient');
            await delTx.done;
            return undefined;
          }
        }

        // Remove our metadata before returning to TanStack Query
        const { timestamp, version, ...clientData } = data;
        return clientData as PersistedClient;
      } catch (error) {
        console.error('Failed to restore query client:', error);
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
        console.error('Failed to remove persisted client:', error);
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
    const data = await store.get('queryClient') as PersistedClient & { timestamp?: number } | undefined;

    if (!data) {
      return {
        exists: false,
        size: 0,
        age: 0,
        queryCount: 0,
      };
    }

    const age = data.timestamp ? Date.now() - data.timestamp : 0;
    const queryCount = data.clientState?.queries?.length || 0;

    // Estimate size (rough approximation)
    const estimatedSize = new Blob([JSON.stringify(data)]).size;

    return {
      exists: true,
      size: estimatedSize,
      age,
      queryCount,
      isExpired: age > CACHE_CONFIG.maxAge,
    };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
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
      console.info('Cleared expired cache');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to clear expired cache:', error);
    return false;
  }
}