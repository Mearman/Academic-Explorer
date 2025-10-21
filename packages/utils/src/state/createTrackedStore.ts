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

// Type guard to check if a value is a function
function isFunction(value: unknown): value is (arg: unknown) => unknown {
  return typeof value === "function";
}

function extractState<T extends object>({
  fullState,
  keys,
}: {
  fullState: T;
  keys: string[];
}): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in fullState) {
      result[key] = (fullState as Record<string, unknown>)[key];
    }
  }
  return result;
}

// Re-export Zustand types for convenience
export type { StateCreator, StoreApi, UseBoundStore };

// Type helpers for Zustand middleware compatibility
export type ZustandStoreWithMiddleware<T> = UseBoundStore<StoreApi<T>>;

// Minimal interface for store methods we need
interface StoreMethods<T> {
  setState: (
    partial: T | Partial<T> | ((state: T) => T | Partial<T>),
    replace?: boolean,
  ) => void;
  getState: () => T;
  subscribe: (listener: (state: T, prevState: T) => void) => () => void;
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
          if (isFunction(filterValue)) {
            try {
              return Boolean(filterValue(itemValue));
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
  // Note: useStore uses 'any' type due to Zustand middleware type transformations
  // that cannot be accurately represented in TypeScript's type system. This is a
  // documented limitation when working with complex third-party libraries.
  // The runtime behavior is correct and type-safe at runtime.
  useStore: any; // Hook that returns state with bound actions and supports selectors
  store: StoreMethods<T> & A; // Custom store with actions - properly typed
  selectors: Record<string, (state: T) => unknown>;
  actions: A;
}

/**
 * Create a simplified Zustand store with Immer and DevTools
 * Follows standard Zustand patterns for better type safety
 */
export function createStore<T extends object>(
  initialState: T,
  options: { name?: string; devtools?: boolean } = {},
): any {
  const { name, devtools: enableDevtools = false } = options;

  const storeCreator = () => ({
    ...initialState,
  });

  if (enableDevtools && name) {
    return create(devtools(immer(storeCreator), { name }));
  }

  return create(immer(storeCreator));
}

/**
 * Factory function for creating tracked stores with actions and selectors
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

  // Create the store with Zustand - follow standard pattern
  const useStore = (() => {
    // Note: Zustand middleware (immer, devtools) fundamentally transforms function signatures
    // in ways that TypeScript's generic system cannot perfectly express. We'll use proper typing
    // where possible and safe casts where necessary for middleware compatibility.

    // Type guard functions for Zustand middleware compatibility
    function isTypedSetFunction(fn: unknown): fn is (partial: Partial<T> | ((state: Draft<T>) => void), replace?: boolean) => void {
      return typeof fn === "function";
    }

    function isTypedGetFunction(fn: unknown): fn is () => T & A {
      return typeof fn === "function";
    }

    const storeCreator = (set: unknown, get: unknown) => {
      // Type-safe middleware casting with guards
      if (!isTypedSetFunction(set) || !isTypedGetFunction(get)) {
        throw new Error("Invalid middleware functions provided");
      }

      // Create actions with proper typing
      const actions = actionsFactory({
        set,
        get: () => get(),
      });

      return {
        ...initialState,
        ...actions,
      };
    };

    // Type-safe middleware composition
    function isStateCreator<T>(fn: unknown): fn is StateCreator<T> {
      return typeof fn === "function";
    }

    if (enableDevtools && name) {
      // Type-safe middleware composition
      const withDevtools = devtools(immer(storeCreator), { name });
      if (!isStateCreator<T & A>(withDevtools)) {
        throw new Error("Invalid devtools middleware configuration");
      }
      return create(withDevtools);
    }

    // Type-safe immer middleware
    const withImmer = immer(storeCreator);
    if (!isStateCreator<T & A>(withImmer)) {
      throw new Error("Invalid immer middleware configuration");
    }
    return create(withImmer);
  })();

  // Get actions from the store
  const actions = (() => {
    const fullState = useStore.getState();
    const extractedActions: Partial<A> = {};
    Object.keys(fullState as Record<string, unknown>).forEach((key) => {
      if (!(key in initialState)) {
        (extractedActions as Record<string, unknown>)[key] = (
          fullState as Record<string, unknown>
        )[key];
      }
    });
    return extractedActions as A;
  })();

  // Create selectors
  const selectors = selectorsFactory ? selectorsFactory(initialState) : {};

  // Create a store object
  const storeWithActions: StoreMethods<T> & A = {
    getState: () => {
      const fullState = useStore.getState();
      const keys = Object.keys(initialState);
      const extracted = extractState({ fullState: fullState as Record<string, unknown>, keys });
      return extracted as T;
    },
    setState: (partial, replace) => {
      if (isZustandStore(useStore)) {
        useStore.setState(partial, replace);
      }
    },

    // Create a type-safe adapter for the subscribe function
    subscribe: (listener: (state: T, prevState: T) => void) => {
      // Type guard function to validate state
      function isValidState(value: unknown): value is T {
        return value !== null && value !== undefined;
      }
      
      // Create an adapter that handles the unknown parameters
      const adapter = (unknownState: unknown, unknownPrevState: unknown): void => {
        // Validate parameters before calling listener
        if (isValidState(unknownState) && isValidState(unknownPrevState)) {
          listener(unknownState, unknownPrevState);
        }
      };
      
      if (useStore.subscribe && typeof useStore.subscribe === "function") {
        return useStore.subscribe(adapter);
      }
      return () => {};
    },
    ...actions,
  };

  return {
    useStore,
    store: storeWithActions,
    selectors,
    actions,
  };
}

// ============================================================================
// TYPE HELPERS
// ============================================================================

/**
 * Type assertion helper for store hooks
 * Since Zustand's complex typing can result in 'unknown' inference,
 * this helper provides a way to assert the correct types at runtime
 */
export function assertStoreHook<T>(hook: unknown): T {
  return hook as T;
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
