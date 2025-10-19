/**
 * Simplified Zustand store factory
 * Removed persistence middleware - use pure Dexie stores for data persistence
 */

import type { StateCreator, StoreApi, UseBoundStore } from "zustand";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { Draft } from "immer";

// Type guard to check if an object is a Zustand store with required methods
function isZustandStore(obj: unknown): obj is {
  setState: (partial: unknown, replace?: boolean) => void;
  getState: () => unknown;
} {
  if (obj === null || typeof obj !== "object") {
    return false;
  }

  return (
    "setState" in obj &&
    "getState" in obj &&
    typeof obj.setState === "function" &&
    typeof obj.getState === "function"
  );
}

// Re-export Zustand types for convenience
export type { StateCreator, StoreApi, UseBoundStore };

// Minimal interface for store methods we need
interface StoreMethods<T> {
  setState: (
    partial: Partial<T> | ((state: Draft<T>) => void),
    replace?: boolean,
  ) => void;
  getState: () => T;
}

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
  setFilter: <K extends keyof T>(params: { key: K; value: unknown }) => void;
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

    setFilter: ({ key, value }: { key: keyof T; value: unknown }) => {
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

export function computePagedItems<T>({
  items,
  page,
  pageSize,
}: {
  items: T[];
  page: number;
  pageSize: number;
}): PagedResult<T> {
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

export interface TrackedStoreConfig<T> {
  name: string;
  initialState: T;
  devtools?: boolean;
}

export interface TrackedStoreResult<T, A> {
  useStore: unknown; // Store object with getState, setState, subscribe, and actions
  store: unknown; // Zustand store
  selectors: Record<string, (state: T) => unknown>;
  actions: A;
}

/**
 * Create a simplified Zustand store with Immer and DevTools
 * Removed persistence - use pure Dexie stores for data persistence
 */
export function createTrackedStore<
  T extends object,
  A extends Record<string, unknown>,
>({
  config,
  actionsFactory,
  selectorsFactory,
}: {
  config: TrackedStoreConfig<T>;
  actionsFactory: ({
    set,
    get,
  }: {
    set: (
      partial: Partial<T> | ((state: Draft<T>) => void),
      replace?: boolean,
    ) => void;
    get: () => T;
  }) => A;
  selectorsFactory?: (state: T) => Record<string, (state: T) => unknown>;
}): TrackedStoreResult<T, A> {
  const { name, initialState, devtools: enableDevtools = false } = config;

  // Create the base store creator
  const baseStoreCreator = () => ({
    ...initialState,
  });

  // Create the store with middleware (removed persist)
  const useStore = (() => {
    if (enableDevtools) {
      return create(devtools(immer(baseStoreCreator), { name }));
    }

    return create(immer(baseStoreCreator));
  })();

  // Create selectors
  const selectors = selectorsFactory ? selectorsFactory(initialState) : {};

  // Save the original getState
  const originalGetState = useStore.getState;

  // Create actions using the store hook methods
  const actions = actionsFactory({
    set: (
      partial: Partial<T> | ((state: Draft<T>) => void),
      replace?: boolean,
    ) => {
      if (replace === true) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        useStore.setState(partial as any, true);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        useStore.setState(partial as any);
      }
    },
    get: originalGetState,
  });

  // Create a custom hook that returns state with actions bound
  const useStoreWithActions = () => {
    return originalGetState();
  };

  // Create a store object with actions, getState, setState, and subscribe methods
  const storeWithActions = {
    getState: originalGetState,
    setState: useStore.setState,
    subscribe: useStore.subscribe,
    ...actions,
  };

  return {
    useStore: storeWithActions,
    store: storeWithActions,
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
export function createAsyncAction<T>({
  action,
  onSuccess,
  onError,
}: {
  action: () => Promise<T>;
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
}) {
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
