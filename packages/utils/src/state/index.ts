/**
 * State management utilities and helpers
 */

// Core utilities
export { generateSequentialId } from "./createTrackedStore.js";
export {
  createFilterManager,
  type FilterManager,
} from "./createTrackedStore.js";
export {
  computePagedItems,
  type PaginationState,
  type PagedResult,
} from "./createTrackedStore.js";

// Store factory
export {
  createTrackedStore,
  type TrackedStoreConfig,
  type TrackedStoreResult,
  type StateCreator,
  type StoreApi,
} from "./createTrackedStore.js";

// Common patterns
export {
  createLoadingState,
  type LoadingState,
  createAsyncAction,
} from "./createTrackedStore.js";

// Dexie integration
export {
  createReactiveTable,
  createDexieSync,
  createDexieStore,
  type ReactiveTable,
  type DexieSyncOptions,
  type DexieStoreOptions,
} from "./dexieStore.js";
