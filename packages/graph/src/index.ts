/**
 * @academic-explorer/graph
 *
 * UI-agnostic graph data logic that can be shared across CLI, SDK, and web app
 * Phase 1 implementation: Core Data Models & Services
 */

// Core types and interfaces
export * from "./types/core"
export * from "./types/expansion-settings"
export * from "./types/cache"

// Phase 1: Core Data Models & Services
export { GraphManager, type GraphManagerOptions, type GraphChangeEvent } from "./data/graph-manager"
export {
	EntityResolver,
	type IEntityResolver,
	type EntityExpansionOptions,
	type ExpansionResult,
} from "./services/entity-resolver-interface"
export {
	GraphRepository,
	IndexedDBAdapter,
	LocalStorageAdapter,
	createGraphRepository,
	type GraphSnapshot,
	type GraphHistoryEntry,
	type StorageAdapter,
} from "./data/graph-repository"

// Graph constants and configuration
export * from "./constants"

// Taxonomy definitions
export * from "./taxonomy/entity-taxa"

// Pure utility functions
export {
	calculateClosestAttachment,
	calculateArrowPosition,
	batchCalculateAttachments,
	type NodeBounds,
	type AttachmentPoint,
	type EdgeAttachment,
} from "./utils/edge-calculations"
export * from "./utils/node-helpers"
export * from "./utils/performance-config"

// Event system
export * from "./events"

// Hooks
export * from "./hooks"

// Providers and components
export * from "./providers"

// Entity detection service
export {
	EntityDetectionService,
	detectEntityType,
	normalizeIdentifier,
	isValidIdentifier,
	detectEntity,
	type DetectionResult,
} from "./services/entity-detection-service"

// Taxonomy utilities
export {
	getEntityColor,
	getEntityDisplayName,
	getEntityIcon,
	getEntityPlural,
	ENTITY_TAXONOMY,
	ENTITY_ICON_MAP,
	type Taxon,
} from "./taxonomy/entity-taxa"

// Force system
export * from "./forces"

// Services
export * from "./services"

// Smart Caching Services - Explicit exports for discoverability
export {
	SmartEntityCache,
	type CachedEntity,
	type CacheContext,
	type FieldRequest,
	type BatchRequest,
	type CacheStats,
	type EntityData,
	type EntityDataProvider,
} from "./services/smart-entity-cache"

// Contextual Field Selector Service - Interface only
// Implementation should be provided by applications

// Additional cache types from cache-types module
export type {
	CacheConfig,
	PreloadStrategy,
	CacheOperationResult,
	BatchOperationResult,
	CacheEvent,
	FieldDependency,
	CachePriority,
	EvictionPolicy,
	CacheWarmingStrategy,
	CacheInvalidationEvent,
	SmartCache,
	FieldUsagePattern,
	CacheHealth,
} from "./services/cache-types"

// Contextual cache context enum (alternative to interface)
export { CacheContext as ContextualCacheContext } from "./services/cache-types"

// Execution Strategy
export {
	BaseExecutionStrategy,
	MainThreadExecutionStrategy,
	SimpleTaskExecutorRegistry,
	createExecutionStrategy,
	detectWorkerSupport,
	ExecutionMode,
	type Task,
	type TaskResult,
	type TaskStats,
	type TaskExecutor,
} from "./services/execution-strategy"

// Force Simulation
export {
	createForceSimulationExecutor,
	type ForceSimulationTask,
	type ForceSimulationNode,
} from "./forces"
