/**
 * Unified event system exports
 * Provides unified API for cross-context events, task queues, and resource coordination
 */

// Legacy types (deprecated - use unified system)
export type {
  // Event payloads
  GraphEventPayloads,
  EntityEventPayloads,
  NodeEventPayloads,
  EdgeEventPayloads,

  // Event handlers
  GraphEventHandler,
  EntityEventHandler,
  NodeEventHandler,
  EdgeEventHandler,

  // Listener options
  GraphListenerOptions,
  EntityListenerOptions,
  NodeListenerOptions,
  EdgeListenerOptions,

  // Filters
  EntityFilter,
  NodeFilter,
  EdgeFilter,

  // Cross-context types
  ExecutionContext,
  CrossContextMessage,
  SerializedEvent,
  BaseListenerOptions,
  EventSystemListener,
  EventEmitter
} from "./types";

// Enhanced worker types
export type * from "./enhanced-worker-types";

// UNIFIED EVENT SYSTEM (NEW)
// Core unified components
export {
  EventBus,
  createLocalEventBus,
  createCrossTabEventBus,
  localEventBus,
  crossTabEventBus
} from "./unified-event-bus";

export {
  TaskQueue,
  TaskStatus,
  createTaskQueue
} from "./unified-task-queue";

export {
  WorkerPool,
  createWorkerPool
} from "./worker-pool";

export {
  ResourceCoordinator,
  createResourceCoordinator
} from "./resource-coordinator";

export {
  QueuedResourceCoordinator,
  createQueuedResourceCoordinator
} from "./queued-resource-coordinator";

// Unified types
export type {
  EventHandler,
  BusEvent
} from "./unified-event-bus";

export type {
  TaskDescriptor,
  TaskResult,
  TaskProgress
} from "./unified-task-queue";

export type {
  PoolWorker,
  WorkerPoolOptions,
  PoolTask
} from "./worker-pool";

export type {
  ResourceOptions,
  ControlMessage,
  LeaderStatus
} from "./resource-coordinator";

export type {
  QueuedTaskMessage,
  QueuedTask,
  QueueCoordinatorOptions
} from "./queued-resource-coordinator";

// Unified React hooks
export {
  useEventBus,
  useEventListener,
  useTaskQueue,
  useWorkerPool,
  useQueuedResourceCoordinator,
  useTaskProgress,
  useCrossTabEvent,
  useEventSubscriptions
} from "../../../hooks/use-unified-event-system";


// Export event type enums for easy access
export {
  GraphEventType,
  EntityEventType,
  NodeEventType,
  EdgeEventType
} from "./types";