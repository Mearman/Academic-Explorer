/**
 * Cross-context event system exports
 * Provides unified API for graph, entity, node, and edge events
 */

// Core types
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

// Enhanced event system classes
export { BaseEventEmitter } from "./base-event-emitter";
export { BroadcastEventBus, WorkerEventBus, workerEventBus } from "./broadcast-event-bus";
export { MessageChannelCoordinator } from "./message-channel-coordinator";

// Specialized event systems
export { GraphEventSystem, graphEventSystem } from "./graph-event-system";
export { EntityEventSystem, entityEventSystem } from "./entity-event-system";

// React hooks
export {
  // Core hooks
  useGraphEventListener,
  useEntityEventListener,

  // Convenience hooks
  useEntityExpansionListener,
  useEntitySelectionListener,
  useAnyEntityEventListener,
  useNodeAddedListener,
  useNodeRemovedListener,
  useBulkNodesAddedListener,

  // Utility hooks
  useEntityExpansionCallback,
  useConditionalEntityAction,

  // Debug hooks
  useEventSystemDebug
} from "./hooks";

// Export event type enums for easy access
export {
  GraphEventType,
  EntityEventType,
  NodeEventType,
  EdgeEventType
} from "./types";