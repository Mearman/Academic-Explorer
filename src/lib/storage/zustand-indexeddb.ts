/**
 * IndexedDB storage adapter for Zustand persistence
 * Uses the existing idb library for IndexedDB operations with fallback for non-browser environments
 */

import { StateStorage } from "zustand/middleware"
import { openDB, DBSchema, IDBPDatabase } from "idb"
import { logger } from "@/lib/logger"

interface ZustandDB extends DBSchema {
  "zustand-storage": {
    key: string;
    value: string;
  };
}

// Cache the database connection
let dbPromise: Promise<IDBPDatabase<ZustandDB>> | null = null;

// In-memory fallback for test environments
const memoryStorage = new Map<string, string>();

const isIndexedDBAvailable = (): boolean => {
  try {
    return typeof indexedDB !== "undefined";
  } catch {
    return false;
  }
};

const getDB = (): Promise<IDBPDatabase<ZustandDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<ZustandDB>("academic-explorer-zustand", 1, {
      upgrade(db) {
        db.createObjectStore("zustand-storage");
      },
    });
  }
  return dbPromise;
};

/**
 * Creates an IndexedDB storage adapter for Zustand persistence
 * Uses idb library for IndexedDB operations with fallback to memory storage in test environments
 */
export const createIndexedDBStorage = (): StateStorage => {
  const useIndexedDB = isIndexedDBAvailable();

  if (!useIndexedDB) {
    logger.debug("storage", "IndexedDB not available, using memory storage fallback");
  }

  return {
    getItem: async (name: string): Promise<string | null> => {
      if (!useIndexedDB) {
        const value = memoryStorage.get(name) || null;
        logger.debug("storage", "Retrieved item from memory storage", {
          name,
          hasValue: value !== null
        });
        return value;
      }

      try {
        const db = await getDB();
        const value = await db.get("zustand-storage", name);
        logger.debug("storage", "Retrieved item from IndexedDB", {
          name,
          hasValue: value !== undefined
        });
        return value || null;
      } catch (error) {
        logger.error("storage", "Failed to get item from IndexedDB", { name, error });
        return null;
      }
    },

    setItem: async (name: string, value: string): Promise<void> => {
      if (!useIndexedDB) {
        memoryStorage.set(name, value);
        logger.debug("storage", "Stored item in memory storage", {
          name,
          valueSize: value.length
        });
        return;
      }

      try {
        const db = await getDB();
        await db.put("zustand-storage", value, name);
        logger.debug("storage", "Stored item in IndexedDB", {
          name,
          valueSize: value.length
        });
      } catch (error) {
        logger.error("storage", "Failed to set item in IndexedDB", { name, error });
        throw error; // Re-throw to trigger Zustand error handling
      }
    },

    removeItem: async (name: string): Promise<void> => {
      if (!useIndexedDB) {
        memoryStorage.delete(name);
        logger.debug("storage", "Removed item from memory storage", { name });
        return;
      }

      try {
        const db = await getDB();
        await db.delete("zustand-storage", name);
        logger.debug("storage", "Removed item from IndexedDB", { name });
      } catch (error) {
        logger.error("storage", "Failed to remove item from IndexedDB", { name, error });
        throw error;
      }
    }
  };
};