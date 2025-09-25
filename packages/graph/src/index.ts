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

// Pure utility functions (excluding DetectionResult to avoid conflicts)
export {
  calculateClosestAttachment,
  calculateArrowPosition,
  batchCalculateAttachments,
  type NodeBounds,
  type AttachmentPoint,
  type EdgeAttachment
} from "./utils/edge-calculations";
export * from "./utils/node-helpers";
export * from "./utils/performance-config";

// Export DetectionResult from utils with explicit alias
export {
  EntityDetector,
  type DetectionResult as UtilsDetectionResult
} from "./utils/entity-detection";

// Event system
export * from "./events";

// Hooks
export * from "./hooks";

// Providers and components
export * from "./providers";

// Entity detection utilities (explicitly exported for convenience)
export {
  EntityDetectionService,
  detectEntityType,
  normalizeIdentifier,
  isValidIdentifier,
  detectEntity,
  type DetectionResult as ServiceDetectionResult,
} from './services/entity-detection-service';

// Force system
export * from "./forces";

// Services
export * from "./services";