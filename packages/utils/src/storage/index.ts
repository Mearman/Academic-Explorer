/**
 * Storage utilities for persistent state management
 */

export {
  createHybridStorage,
  createIndexedDBStorage,
  defaultStorageConfig,
  type StorageConfig,
  type StateStorage
} from "./indexeddb-storage.js";