/**
 * Tracked store factory with Zustand, Immer, DevTools, and production guards
 * Provides reusable utilities for state management with persistence and debugging
 */

import type { StateCreator, StoreApi, UseBoundStore } from "zustand";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";
import { devtools } from "zustand/middleware";
import {
  createHybridStorage,
  createIndexedDBStorage,
  type StorageConfig,
} from "../storage/indexeddb-storage.js";
import { logger } from "../logger.js";
import { isDevelopment, isProduction } from "../environment/index.js";

// Re-export Zustand types for convenience
export type { StateCreator, StoreApi, UseBoundStore };

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate sequential IDs with optional prefix
 */
export function generateSequentialId(prefix = "id"): () => string {
  let counter = 0;
  return () => `${prefix}-${++counter}`;
}

/**
 * Filter manager for managing complex filter states
 */
export interface FilterManager<T> {
  filters: Partial<Record<keyof T, unknown>>;
  setFilter: <K extends keyof T>(key: K, value: unknown) => void;
  clearFilter: <K extends keyof T>(key: K) => void;
  clearAllFilters: () => void;
  hasActiveFilters: () => boolean;
  applyFilters: (items: T[]) => T[];
}

export function createFilterManager<T extends Record<string, unknown>>(
  initialFilters: Partial<Record<keyof T, unknown>> = {},
): FilterManager<T> {
  let currentFilters = { ...initialFilters };

  const manager = {
    get filters() {
      return { ...currentFilters };
    },

    setFilter: (key: keyof T, value: unknown) => {
      if (value === undefined) {
        delete currentFilters[key];
      } else {
        currentFilters[key] = value;
      }
    },

    clearFilter: (key: keyof T) => {
      delete currentFilters[key];
    },

    clearAllFilters: () => {
      currentFilters = {};
    },

    hasActiveFilters: () => Object.keys(currentFilters).length > 0,

    applyFilters: (items: T[]) => {
      if (!manager.hasActiveFilters()) return items;

      return items.filter((item) => {
        return Object.entries(currentFilters).every(([key, filterValue]) => {
          const itemValue = item[key];
          if (filterValue === undefined) return true;

          // Handle different filter types
          if (typeof filterValue === "function") {
            try {
              return Boolean(
                // eslint-disable-next-line no-type-assertions-plugin/no-type-assertions
                (filterValue as (value: unknown) => unknown)(itemValue),
              );
            } catch {
              return false;
            }
          }

          if (Array.isArray(filterValue)) {
            return filterValue.includes(itemValue);
          }

          if (
            typeof filterValue === "string" &&
            typeof itemValue === "string"
          ) {
            return itemValue.toLowerCase().includes(filterValue.toLowerCase());
          }

          return itemValue === filterValue;
        });
      });
    },
  };

  return manager;
}

/**
 * Pagination utilities for computing paged items
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface PagedResult<T> {
  items: T[];
  pagination: PaginationState & {
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export function computePagedItems<T>(
  items: T[],
  page: number,
  pageSize: number,
): PagedResult<T> {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return {
    items: items.slice(startIndex, endIndex),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

// ============================================================================
// STORE FACTORY
// ============================================================================

export interface TrackedStoreConfig<T, A = Record<string, any>> {
  name: string;
  initialState: T;
  persist?: {
    enabled: boolean;
    storage?: "hybrid" | "indexeddb" | "localstorage";
    config?: Partial<StorageConfig>;
    version?: number;
    partialize?: (state: T & A) => Partial<T>;
    migrate?: (persistedState: unknown, version: number) => T;
  };
  devtools?: boolean;
  productionGuards?: boolean;
}

export interface TrackedStoreResult<T, A> {
  useStore: UseBoundStore<StoreApi<T & A>>; // Zustand hook
  store: StoreApi<T & A>; // Zustand store API
  selectors: Record<string, (state: T) => unknown>;
  actions: A;
}

/**
 * Create a tracked Zustand store with Immer, DevTools, and production guards
 */
export function createTrackedStore<
  T extends object,
  A extends Record<string, any>,
>(
  config: TrackedStoreConfig<T, A>,
  actionsFactory: (
    set: (update: ((state: T & A) => T & A) | Partial<T & A>) => void,
    get: () => T & A,
  ) => A,
  selectorsFactory?: (state: T) => Record<string, (state: T) => unknown>,
): TrackedStoreResult<T, A> {
  const {
    name,
    initialState,
    persist: persistConfig,
    devtools: enableDevtools = isDevelopment(),
    productionGuards = true,
  } = config;

  // Production guards
  if (productionGuards && isProduction()) {
    // Disable devtools in production
    // Add any other production safety measures
  }

  // Create the base store creator
  const baseStoreCreator = (
    set: (update: ((state: T & A) => T & A) | Partial<T & A>) => void,
    get: () => T & A,
  ) => ({
    ...initialState,
    ...actionsFactory(set, get),
  });

  // Build middleware stack
  let storeCreator: any = immer(baseStoreCreator as any);

  // Add persistence if enabled
  if (persistConfig?.enabled) {
    const storageConfig: StorageConfig = {
      dbName: `${name}-store`,
      storeName: "state",
      version: persistConfig.version ?? 1,
      ...persistConfig.config,
    };

    let storage: any;
    switch (persistConfig.storage) {
      case "indexeddb":
        storage = createIndexedDBStorage(storageConfig, logger);
        break;
      case "localstorage":
        storage = createJSONStorage(() => localStorage);
        break;
      case "hybrid":
      default:
        storage = createHybridStorage(storageConfig, logger);
        break;
    }

    // Zustand v5 persist API - curried version
    storeCreator = persist(storeCreator, {
      name: `${name}-state`,
      storage,
      version: persistConfig.version ?? 1,
      partialize:
        persistConfig.partialize ?? ((state: T & A) => ({ ...state })),
      migrate: persistConfig.migrate,
    });
  }

  // Add devtools if enabled
  if (enableDevtools && isDevelopment()) {
    storeCreator = devtools(storeCreator, {
      name,
      enabled: true,
    });
  }

  // Create the store
  const useStore = create<T & A>(storeCreator);
  const store = useStore; // The store API is the same as the hook in Zustand

  // Create selectors
  const selectors = selectorsFactory ? selectorsFactory(initialState) : {};

  // Create actions using the store's set method
  const actions = actionsFactory(
    (update) => store.setState(update),
    () => store.getState(),
  );

  return {
    useStore,
    store,
    selectors,
    actions,
  };
}

// ============================================================================
// COMMON STORE PATTERNS
// ============================================================================

/**
 * Loading state pattern
 */
export interface LoadingState {
  loading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export function createLoadingState(): LoadingState {
  return {
    loading: false,
    error: null,
    setLoading: (loading: boolean) => ({ loading }),
    setError: (error: string | null) => ({ error }),
    reset: () => ({ loading: false, error: null }),
  };
}

/**
 * Async operation wrapper for stores
 */
export function createAsyncAction<T>(
  action: () => Promise<T>,
  onSuccess?: (result: T) => void,
  onError?: (error: Error) => void,
) {
  return async (
    set: (
      fn: (state: { loading: boolean; error: string | null }) => void,
    ) => void,
  ) => {
    set((state) => {
      state.loading = true;
      state.error = null;
    });

    try {
      const result = await action();
      set((state) => {
        state.loading = false;
        state.error = null;
      });
      onSuccess?.(result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      set((state) => {
        state.loading = false;
        state.error = err.message;
      });
      onError?.(err);
      throw err;
    }
  };
}
