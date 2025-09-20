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

// Check if localStorage is available
const isLocalStorageAvailable = (): boolean => {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
};

/**
 * Creates a hybrid storage adapter that writes synchronously to localStorage
 * and asynchronously to IndexedDB for best performance and reliability
 */
export const createHybridStorage = (): StateStorage => {
  const useIndexedDB = isIndexedDBAvailable();
  const useLocalStorage = isLocalStorageAvailable();
  const writeQueue = new Set<string>();

  // Track storage statistics
  let localStorageWrites = 0;
  let indexedDBWrites = 0;
  let localStorageErrors = 0;
  let indexedDBErrors = 0;

  if (!useIndexedDB && !useLocalStorage) {
    logger.debug("storage", "Neither IndexedDB nor localStorage available, using memory storage fallback");
  }

  return {
    getItem: async (name: string): Promise<string | null> => {
      // Try IndexedDB first (larger capacity, authoritative source)
      if (useIndexedDB) {
        try {
          const db = await getDB();
          const value = await db.get("zustand-storage", name);
          if (value) {
            logger.debug("storage", "Retrieved item from IndexedDB", {
              name,
              hasValue: true,
              source: "indexeddb"
            });
            return value;
          }
        } catch (error) {
          logger.warn("storage", "IndexedDB read failed, falling back to localStorage", { name, error });
          indexedDBErrors++;
        }
      }

      // Fallback to localStorage
      if (useLocalStorage) {
        try {
          const value = localStorage.getItem(name);
          if (value !== null) {
            logger.debug("storage", "Retrieved item from localStorage", {
              name,
              hasValue: true,
              source: "localstorage"
            });
            return value;
          }
        } catch (error) {
          logger.warn("storage", "localStorage read failed", { name, error });
          localStorageErrors++;
        }
      }

      // Final fallback to memory storage (test environments)
      const value = memoryStorage.get(name) || null;
      if (value !== null) {
        logger.debug("storage", "Retrieved item from memory storage", {
          name,
          hasValue: true,
          source: "memory"
        });
      }
      return value;
    },

    setItem: (name: string, value: string): void => {
      // 1. Write to localStorage immediately (synchronous, fast)
      if (useLocalStorage) {
        try {
          localStorage.setItem(name, value);
          localStorageWrites++;
          logger.debug("storage", "Stored item in localStorage", {
            name,
            valueSize: value.length,
            totalWrites: localStorageWrites
          });
        } catch (error) {
          localStorageErrors++;
          logger.warn("storage", "localStorage write failed (quota exceeded?)", {
            name,
            error,
            valueSize: value.length,
            totalErrors: localStorageErrors
          });
        }
      } else {
        // Fallback to memory storage if localStorage unavailable
        memoryStorage.set(name, value);
        logger.debug("storage", "Stored item in memory storage", {
          name,
          valueSize: value.length
        });
      }

      // 2. Queue IndexedDB write (asynchronous, non-blocking)
      if (useIndexedDB && !writeQueue.has(name)) {
        writeQueue.add(name);

        queueMicrotask(() => {
          void (async () => {
            try {
              const db = await getDB();
              await db.put("zustand-storage", value, name);
              indexedDBWrites++;
              logger.debug("storage", "Background IndexedDB write completed", {
                name,
                valueSize: value.length,
                totalWrites: indexedDBWrites,
                queueSize: writeQueue.size
              });
            } catch (error) {
              indexedDBErrors++;

              // Handle specific IndexedDB errors
              if (error && typeof error === "object" && "name" in error) {
                const errorName = String(error.name);

                if (errorName === "QuotaExceededError") {
                  logger.warn("storage", "IndexedDB quota exceeded, data may not persist", {
                    name,
                    valueSize: value.length,
                    totalErrors: indexedDBErrors
                  });
                } else if (errorName === "VersionError") {
                  logger.warn("storage", "IndexedDB version conflict, database may need refresh", {
                    name,
                    totalErrors: indexedDBErrors
                  });
                } else if (errorName === "InvalidStateError") {
                  logger.warn("storage", "IndexedDB invalid state, database may be corrupted", {
                    name,
                    totalErrors: indexedDBErrors
                  });
                } else {
                  logger.error("storage", "IndexedDB background write failed", {
                    name,
                    error: errorName,
                    message: error && typeof error === "object" && "message" in error ? String(error.message) : "Unknown error",
                    totalErrors: indexedDBErrors
                  });
                }
              } else {
                logger.error("storage", "IndexedDB background write failed", {
                  name,
                  error: String(error),
                  totalErrors: indexedDBErrors
                });
              }
            } finally {
              writeQueue.delete(name);
            }
          })();
        });
      }
    },

    removeItem: (name: string): void => {
      // Remove from localStorage immediately
      if (useLocalStorage) {
        try {
          localStorage.removeItem(name);
          logger.debug("storage", "Removed item from localStorage", { name });
        } catch (error) {
          localStorageErrors++;
          logger.warn("storage", "localStorage remove failed", { name, error });
        }
      } else {
        // Fallback to memory storage
        memoryStorage.delete(name);
        logger.debug("storage", "Removed item from memory storage", { name });
      }

      // Queue IndexedDB removal (asynchronous)
      if (useIndexedDB) {
        queueMicrotask(() => {
          void (async () => {
            try {
              const db = await getDB();
              await db.delete("zustand-storage", name);
              logger.debug("storage", "Background IndexedDB delete completed", { name });
            } catch (error) {
              indexedDBErrors++;
              logger.error("storage", "IndexedDB background delete failed", { name, error });
            }
          })();
        });
      }
    }
  };
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