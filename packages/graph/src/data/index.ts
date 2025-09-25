/**
 * Data layer exports - Phase 1 Core Data Models & Services
 */

export { GraphManager, type GraphManagerOptions, type GraphChangeEvent } from './graph-manager';
export {
  GraphRepository,
  IndexedDBAdapter,
  LocalStorageAdapter,
  createGraphRepository,
  type GraphSnapshot,
  type GraphHistoryEntry,
  type StorageAdapter,
} from './graph-repository';