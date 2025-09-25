/**
 * @academic-explorer/graph
 *
 * UI-agnostic graph data logic that can be shared across CLI, SDK, and web app
 * Phase 1 implementation: Core Data Models & Services
 */

// Core types and interfaces
export * from "./types";

// Phase 1: Core Data Models & Services
export { GraphManager, type GraphManagerOptions, type GraphChangeEvent } from './data/graph-manager';
export { EntityResolver, type IEntityResolver, type EntityExpansionOptions, type ExpansionResult } from './services/entity-resolver-interface';
export {
  GraphRepository,
  IndexedDBAdapter,
  LocalStorageAdapter,
  createGraphRepository,
  type GraphSnapshot,
  type GraphHistoryEntry,
  type StorageAdapter,
} from './data/graph-repository';

// Graph constants and configuration
export * from "./constants";

// Pure utility functions
export * from "./utils";

// Event system
export * from "./events";

// Hooks
export * from "./hooks";

// Providers and components
export * from "./providers";

// Force system
export * from "./forces";

// Services
export * from "./services";