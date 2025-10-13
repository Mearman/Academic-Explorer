/**
 * Dexie integration helpers for Zustand stores
 * Provides reactive table wrappers and sync utilities
 */

import type { Table } from "dexie";

// ============================================================================
// DEXIE INTEGRATION HELPERS
// ============================================================================

/**
 * Dexie table wrapper with reactive updates
 */
export interface ReactiveTable<T> {
  add: (item: T) => Promise<number>;
  put: (item: T) => Promise<number>;
  get: (id: number | string) => Promise<T | undefined>;
  delete: (id: number | string) => Promise<void>;
  clear: () => Promise<void>;
  toArray: () => Promise<T[]>;
  where: (query: Partial<T>) => Promise<T[]>;
  count: () => Promise<number>;
}

/**
 * Create a reactive Dexie table wrapper
 */
export function createReactiveTable<T extends { id?: number | string }>(
  table: Table<T>,
): ReactiveTable<T> {
  return {
    add: (item) => table.add(item),
    put: (item) => table.put(item),
    get: (id) => table.get(id),
    delete: (id) => table.delete(id),
    clear: () => table.clear(),
    toArray: () => table.toArray(),
    where: (query) => table.where(query).toArray(),
    count: () => table.count(),
  };
}

/**
 * Dexie sync utilities for Zustand stores
 */
export interface DexieSyncOptions<T> {
  table: ReactiveTable<T>;
  syncInterval?: number;
  onSync?: (items: T[]) => void;
  onError?: (error: Error) => void;
}

export function createDexieSync<T>(options: DexieSyncOptions<T>) {
  const { table, syncInterval = 30000, onSync, onError } = options;
  let syncTimer: NodeJS.Timeout | null = null;

  const sync = async () => {
    try {
      const items = await table.toArray();
      onSync?.(items);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return {
    start: () => {
      if (syncTimer) return;
      syncTimer = setInterval(sync, syncInterval);
      void sync(); // Initial sync
    },

    stop: () => {
      if (syncTimer) {
        clearInterval(syncTimer);
        syncTimer = null;
      }
    },

    syncNow: sync,
  };
}

/**
 * Create a Dexie-backed store with automatic sync
 */
export interface DexieStoreOptions<T> {
  table: ReactiveTable<T>;
  syncInterval?: number;
  onError?: (error: Error) => void;
}

export function createDexieStore<T extends { id?: number | string }>(
  options: DexieStoreOptions<T>,
) {
  const { table, syncInterval = 30000, onError } = options;

  return {
    // CRUD operations
    async add(item: T): Promise<T> {
      const id = await table.add(item);
      return { ...item, id };
    },

    async update(item: T): Promise<T> {
      await table.put(item);
      return item;
    },

    async remove(id: number | string): Promise<void> {
      await table.delete(id);
    },

    async get(id: number | string): Promise<T | undefined> {
      return table.get(id);
    },

    async getAll(): Promise<T[]> {
      return table.toArray();
    },

    async find(query: Partial<T>): Promise<T[]> {
      return table.where(query);
    },

    async clear(): Promise<void> {
      await table.clear();
    },

    async count(): Promise<number> {
      return table.count();
    },

    // Sync utilities
    createSync(onSync: (items: T[]) => void) {
      return createDexieSync({
        table,
        syncInterval,
        onSync,
        onError,
      });
    },
  };
}
