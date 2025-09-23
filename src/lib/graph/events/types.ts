/**
 * Core event system types for multi-level graph/entity/node/edge events
 * Provides type-safe event handling with hierarchical event architecture
 */

import { z } from "zod";
import type { EntityType, GraphNode, GraphEdge } from "@/lib/graph/types";
import { RelationType } from "@/lib/graph/types";

// =============================================================================
// Event Type Enums
// =============================================================================

export enum GraphEventType {
  // Graph-wide operations
  ANY_NODE_ADDED = "graph:node-added",
  ANY_NODE_REMOVED = "graph:node-removed",
  ANY_EDGE_ADDED = "graph:edge-added",
  ANY_EDGE_REMOVED = "graph:edge-removed",

  // Layout and structural changes
  LAYOUT_CHANGED = "graph:layout-changed",
  GRAPH_CLEARED = "graph:cleared",
  FORCE_LAYOUT_RESTART = "graph:force-layout-restart",

  // Bulk operations
  BULK_NODES_ADDED = "graph:bulk-nodes-added",
  BULK_EDGES_ADDED = "graph:bulk-edges-added"
}

export enum EntityEventType {
  // Entity lifecycle
  ENTITY_EXPANDED = "entity:expanded",
  ENTITY_REMOVED = "entity:removed",
  ENTITY_SELECTED = "entity:selected",
  ENTITY_DATA_UPDATED = "entity:data-updated",

  // Entity relationships
  ENTITY_CONNECTIONS_UPDATED = "entity:connections-updated",

  // Catch-all for any entity event
  ANY = "entity:any"
}

export enum NodeEventType {
  // Node interactions
  NODE_SELECTED = "node:selected",
  NODE_DESELECTED = "node:deselected",
  NODE_HOVERED = "node:hovered",
  NODE_UNHOVERED = "node:unhovered",

  // Node state changes
  NODE_POSITION_CHANGED = "node:position-changed",
  NODE_STYLE_CHANGED = "node:style-changed",
  NODE_LOADING_STATE_CHANGED = "node:loading-state-changed",

  // Node lifecycle within graph visualization
  NODE_PINNED = "node:pinned",
  NODE_UNPINNED = "node:unpinned",
  NODE_VISIBILITY_CHANGED = "node:visibility-changed"
}

export enum EdgeEventType {
  // Edge lifecycle in visualization
  EDGE_ADDED = "edge:added",
  EDGE_REMOVED = "edge:removed",
  EDGE_SELECTED = "edge:selected",
  EDGE_DESELECTED = "edge:deselected",

  // Edge properties
  EDGE_WEIGHT_CHANGED = "edge:weight-changed",
  EDGE_STYLE_CHANGED = "edge:style-changed",
  EDGE_VISIBILITY_CHANGED = "edge:visibility-changed"
}

export enum WorkerEventType {
  // Worker lifecycle
  WORKER_READY = "worker:ready",
  WORKER_ERROR = "worker:error",
  WORKER_TERMINATED = "worker:terminated",

  // Data fetching worker events
  DATA_FETCH_PROGRESS = "worker:data-fetch-progress",
  DATA_FETCH_COMPLETE = "worker:data-fetch-complete",
  DATA_FETCH_ERROR = "worker:data-fetch-error",
  DATA_FETCH_CANCELLED = "worker:data-fetch-cancelled",

  // Force simulation worker events
  FORCE_SIMULATION_PROGRESS = "worker:force-simulation-progress",
  FORCE_SIMULATION_COMPLETE = "worker:force-simulation-complete",
  FORCE_SIMULATION_ERROR = "worker:force-simulation-error",
  FORCE_SIMULATION_STOPPED = "worker:force-simulation-stopped",

  // Custom force management events
  CUSTOM_FORCES_SYNCED = "worker:custom-forces-synced",
  CUSTOM_FORCE_ADDED = "worker:custom-force-added",
  CUSTOM_FORCE_REMOVED = "worker:custom-force-removed",
  CUSTOM_FORCE_UPDATED = "worker:custom-force-updated",
  CUSTOM_FORCE_ERROR = "worker:custom-force-error"
}

// =============================================================================
// Event Payload Interfaces
// =============================================================================

export interface GraphEventPayloads {
  [GraphEventType.ANY_NODE_ADDED]: {
    node: GraphNode;
    timestamp: number;
  };
  [GraphEventType.ANY_NODE_REMOVED]: {
    nodeId: string;
    entityId: string;
    entityType: EntityType;
    timestamp: number;
  };
  [GraphEventType.ANY_EDGE_ADDED]: {
    edge: GraphEdge;
    timestamp: number;
  };
  [GraphEventType.ANY_EDGE_REMOVED]: {
    edgeId: string;
    sourceEntityId: string;
    targetEntityId: string;
    relationType: RelationType;
    timestamp: number;
  };
  [GraphEventType.LAYOUT_CHANGED]: {
    layoutType: string;
    timestamp: number;
  };
  [GraphEventType.GRAPH_CLEARED]: {
    previousNodeCount: number;
    previousEdgeCount: number;
    timestamp: number;
  };
  [GraphEventType.FORCE_LAYOUT_RESTART]: {
    reason: string;
    alpha: number;
    timestamp: number;
  };
  [GraphEventType.BULK_NODES_ADDED]: {
    nodes: GraphNode[];
    timestamp: number;
  };
  [GraphEventType.BULK_EDGES_ADDED]: {
    edges: GraphEdge[];
    timestamp: number;
  };
}

export interface EntityEventPayloads {
  [EntityEventType.ENTITY_EXPANDED]: {
    entityId: string;
    entityType: EntityType;
    expansionData: {
      nodesAdded: GraphNode[];
      edgesAdded: GraphEdge[];
      depth: number;
      duration: number;
      apiCalls?: number;
    };
    timestamp: number;
  };
  [EntityEventType.ENTITY_REMOVED]: {
    entityId: string;
    entityType: EntityType;
    nodeId?: string; // May not have a node representation
    timestamp: number;
  };
  [EntityEventType.ENTITY_SELECTED]: {
    entityId: string;
    entityType: EntityType;
    nodeId?: string;
    timestamp: number;
  };
  [EntityEventType.ENTITY_DATA_UPDATED]: {
    entityId: string;
    entityType: EntityType;
    updatedFields: string[];
    newData: Record<string, unknown>;
    timestamp: number;
  };
  [EntityEventType.ENTITY_CONNECTIONS_UPDATED]: {
    entityId: string;
    entityType: EntityType;
    newConnections: Array<{
      targetEntityId: string;
      targetEntityType: EntityType;
      relationType: RelationType;
    }>;
    timestamp: number;
  };
  [EntityEventType.ANY]: {
    entityId: string;
    entityType: EntityType;
    eventType: Exclude<EntityEventType, EntityEventType.ANY>;
    payload: unknown;
    timestamp: number;
  };
}

export interface NodeEventPayloads {
  [NodeEventType.NODE_SELECTED]: {
    nodeId: string;
    entityId: string;
    entityType: EntityType;
    timestamp: number;
  };
  [NodeEventType.NODE_DESELECTED]: {
    nodeId: string;
    entityId: string;
    entityType: EntityType;
    timestamp: number;
  };
  [NodeEventType.NODE_HOVERED]: {
    nodeId: string;
    entityId: string;
    entityType: EntityType;
    timestamp: number;
  };
  [NodeEventType.NODE_UNHOVERED]: {
    nodeId: string;
    entityId: string;
    entityType: EntityType;
    timestamp: number;
  };
  [NodeEventType.NODE_POSITION_CHANGED]: {
    nodeId: string;
    entityId: string;
    entityType: EntityType;
    oldPosition: { x: number; y: number };
    newPosition: { x: number; y: number };
    timestamp: number;
  };
  [NodeEventType.NODE_STYLE_CHANGED]: {
    nodeId: string;
    entityId: string;
    entityType: EntityType;
    styleChanges: Record<string, unknown>;
    timestamp: number;
  };
  [NodeEventType.NODE_LOADING_STATE_CHANGED]: {
    nodeId: string;
    entityId: string;
    entityType: EntityType;
    isLoading: boolean;
    timestamp: number;
  };
  [NodeEventType.NODE_PINNED]: {
    nodeId: string;
    entityId: string;
    entityType: EntityType;
    timestamp: number;
  };
  [NodeEventType.NODE_UNPINNED]: {
    nodeId: string;
    entityId: string;
    entityType: EntityType;
    timestamp: number;
  };
  [NodeEventType.NODE_VISIBILITY_CHANGED]: {
    nodeId: string;
    entityId: string;
    entityType: EntityType;
    isVisible: boolean;
    timestamp: number;
  };
}

export interface EdgeEventPayloads {
  [EdgeEventType.EDGE_ADDED]: {
    edge: GraphEdge;
    sourceEntityId: string;
    targetEntityId: string;
    timestamp: number;
  };
  [EdgeEventType.EDGE_REMOVED]: {
    edgeId: string;
    sourceEntityId: string;
    targetEntityId: string;
    relationType: RelationType;
    timestamp: number;
  };
  [EdgeEventType.EDGE_SELECTED]: {
    edgeId: string;
    sourceEntityId: string;
    targetEntityId: string;
    relationType: RelationType;
    timestamp: number;
  };
  [EdgeEventType.EDGE_DESELECTED]: {
    edgeId: string;
    sourceEntityId: string;
    targetEntityId: string;
    relationType: RelationType;
    timestamp: number;
  };
  [EdgeEventType.EDGE_WEIGHT_CHANGED]: {
    edgeId: string;
    sourceEntityId: string;
    targetEntityId: string;
    relationType: RelationType;
    oldWeight?: number;
    newWeight?: number;
    timestamp: number;
  };
  [EdgeEventType.EDGE_STYLE_CHANGED]: {
    edgeId: string;
    sourceEntityId: string;
    targetEntityId: string;
    relationType: RelationType;
    styleChanges: Record<string, unknown>;
    timestamp: number;
  };
  [EdgeEventType.EDGE_VISIBILITY_CHANGED]: {
    edgeId: string;
    sourceEntityId: string;
    targetEntityId: string;
    relationType: RelationType;
    isVisible: boolean;
    timestamp: number;
  };
}

export interface WorkerEventPayloads {
  [WorkerEventType.WORKER_READY]: {
    workerId: string;
    workerType: "data-fetching" | "force-animation";
    timestamp: number;
  };
  [WorkerEventType.WORKER_ERROR]: {
    workerId: string;
    workerType: "data-fetching" | "force-animation";
    error: string;
    timestamp: number;
  };
  [WorkerEventType.WORKER_TERMINATED]: {
    workerId: string;
    workerType: "data-fetching" | "force-animation";
    timestamp: number;
  };
  [WorkerEventType.DATA_FETCH_PROGRESS]: {
    requestId: string;
    nodeId: string;
    entityId: string;
    progress: number; // 0-1
    currentStep: string;
    timestamp: number;
  };
  [WorkerEventType.DATA_FETCH_COMPLETE]: {
    requestId: string;
    nodeId: string;
    entityId: string;
    nodes: GraphNode[];
    edges: GraphEdge[];
    statistics?: {
      nodesAdded: number;
      edgesAdded: number;
      apiCalls: number;
      duration: number;
    };
    timestamp: number;
  };
  [WorkerEventType.DATA_FETCH_ERROR]: {
    requestId: string;
    nodeId: string;
    entityId: string;
    error: string;
    timestamp: number;
  };
  [WorkerEventType.DATA_FETCH_CANCELLED]: {
    requestId: string;
    nodeId: string;
    entityId: string;
    timestamp: number;
  };
  [WorkerEventType.FORCE_SIMULATION_PROGRESS]: {
    workerId: string;
    workerType: "force-animation";
    messageType?: string; // "tick", "started", "paused", "resumed", "parameters_updated"
    positions?: Array<{
      id: string;
      x: number;
      y: number;
    }>;
    alpha?: number;
    iteration?: number;
    progress?: number;
    fps?: number;
    nodeCount?: number;
    linkCount?: number;
    config?: unknown;
    wasPaused?: boolean;
    timestamp: number;
  };
  [WorkerEventType.FORCE_SIMULATION_COMPLETE]: {
    workerId: string;
    workerType: "force-animation";
    positions: Array<{
      id: string;
      x: number;
      y: number;
    }>;
    totalIterations: number;
    finalAlpha: number;
    reason: string;
    timestamp: number;
  };
  [WorkerEventType.FORCE_SIMULATION_ERROR]: {
    workerId: string;
    workerType: "force-animation";
    error: string;
    filename?: string;
    lineno?: number;
    timestamp: number;
  };
  [WorkerEventType.FORCE_SIMULATION_STOPPED]: {
    workerId: string;
    workerType: "force-animation";
    timestamp: number;
  };
  [WorkerEventType.CUSTOM_FORCES_SYNCED]: {
    workerId: string;
    workerType: "force-animation";
    count: number;
    timestamp: number;
  };
  [WorkerEventType.CUSTOM_FORCE_ADDED]: {
    workerId: string;
    workerType: "force-animation";
    forceId: string;
    timestamp: number;
  };
  [WorkerEventType.CUSTOM_FORCE_REMOVED]: {
    workerId: string;
    workerType: "force-animation";
    forceId: string;
    timestamp: number;
  };
  [WorkerEventType.CUSTOM_FORCE_UPDATED]: {
    workerId: string;
    workerType: "force-animation";
    forceId: string;
    timestamp: number;
  };
  [WorkerEventType.CUSTOM_FORCE_ERROR]: {
    workerId: string;
    workerType: "force-animation";
    error: string;
    forceId?: string;
    timestamp: number;
  };
}

// =============================================================================
// Event Handler Types
// =============================================================================

export type GraphEventHandler<T extends GraphEventType> = (payload: GraphEventPayloads[T]) => void | Promise<void>;
export type EntityEventHandler<T extends EntityEventType> = (payload: EntityEventPayloads[T]) => void | Promise<void>;
export type NodeEventHandler<T extends NodeEventType> = (payload: NodeEventPayloads[T]) => void | Promise<void>;
export type EdgeEventHandler<T extends EdgeEventType> = (payload: EdgeEventPayloads[T]) => void | Promise<void>;
export type WorkerEventHandler<T extends WorkerEventType> = (payload: WorkerEventPayloads[T]) => void | Promise<void>;

// =============================================================================
// Cross-Context Types
// =============================================================================

export type ExecutionContext = "main" | "worker" | "current";

export interface CrossContextMessage {
  type: "event" | "register-listener" | "remove-listener";
  eventType: string;
  payload?: unknown;
  listenerId?: string;
  sourceContext: ExecutionContext;
  targetContext?: ExecutionContext;
  timestamp: number;
}

export interface SerializedEvent {
  eventType: string;
  payload: string; // JSON serialized
  metadata: {
    sourceContext: ExecutionContext;
    targetContext?: ExecutionContext;
    timestamp: number;
  };
}

// =============================================================================
// Listener Options
// =============================================================================

export interface BaseListenerOptions {
  once?: boolean;           // Remove listener after first execution
  priority?: number;        // Higher numbers execute first (default: 0)
  condition?: (payload: unknown) => boolean;  // Additional condition check
  executeIn?: ExecutionContext; // NEW: Cross-context execution targeting
}

export type GraphListenerOptions = BaseListenerOptions;

export interface EntityListenerOptions extends BaseListenerOptions {
  // Additional entity-specific options can be added here in future
  readonly __type?: "entity";
}

export interface NodeListenerOptions extends BaseListenerOptions {
  // Additional node-specific options can be added here in future
  readonly __type?: "node";
}

export interface EdgeListenerOptions extends BaseListenerOptions {
  // Additional edge-specific options can be added here in future
  readonly __type?: "edge";
}

// =============================================================================
// Event Filters
// =============================================================================

// Entity filter: supports entity IDs and EntityType values
// Note: string includes EntityType values and arbitrary entity IDs
export type EntityFilter = string | string[];

export type NodeFilter =
  | string                   // Single node ID
  | string[]                // Multiple node IDs
  | { entityType: EntityType } // All nodes of entity type
  | { entityId: string }     // All nodes representing this entity

export type EdgeFilter =
  | string                   // Single edge ID
  | string[]                // Multiple edge IDs
  | RelationType            // All edges of this relation type
  | RelationType[]          // Multiple relation types
  | {
      sourceEntityType?: EntityType;
      targetEntityType?: EntityType;
      relationType?: RelationType;
    };

// =============================================================================
// Event System Interface
// =============================================================================

export interface EventSystemListener<TPayload = unknown> {
  id: string;
  handler: (payload: TPayload) => void | Promise<void>;
  options: BaseListenerOptions;
}

export interface EventEmitter<TEventType extends string, TPayload> {
  emit(eventType: TEventType, payload: TPayload): Promise<void>;
  on(eventType: TEventType, handler: (payload: TPayload) => void | Promise<void>, options?: BaseListenerOptions): string;
  off(listenerId: string): boolean;
  once(eventType: TEventType, handler: (payload: TPayload) => void | Promise<void>): string;
  removeAllListeners(eventType?: TEventType): void;
  getListenerCount(eventType: TEventType): number;
}

// =============================================================================
// Zod Validation Schemas for Cross-Context Communication
// =============================================================================

/**
 * Base event payload schema - all events must have a timestamp
 */
export const BaseEventPayloadSchema = z.object({
  timestamp: z.number()
});

// =============================================================================
// Zod Schema Generation Utilities
// =============================================================================

/**
 * Type guard to ensure array has at least one element for Zod enum
 */
function isNonEmptyArray<T>(arr: T[]): arr is [T, ...T[]] {
  return arr.length > 0;
}

/**
 * Utility function to create Zod enum from TypeScript enum values
 * Ensures single source of truth for enum definitions
 */
export function createZodEnumFromEnum(enumObject: Record<string, string>) {
  const values = Object.values(enumObject);
  if (!isNonEmptyArray(values)) {
    throw new Error("Enum must have at least one value");
  }
  return z.enum(values);
}

/**
 * Utility function to create Zod enum from union type values
 * Ensures single source of truth for union type definitions
 */
export function createZodEnumFromUnion<T extends string>(values: readonly T[]) {
  const valueArray = [...values];
  if (!isNonEmptyArray(valueArray)) {
    throw new Error("Union type values must have at least one value");
  }
  return z.enum(valueArray);
}

// EntityType schema - generated from the union type values
// Note: EntityType is defined as a union type in OpenAlex types, not an enum
// so we maintain the values in a const array to avoid duplication
const ENTITY_TYPE_VALUES = ["works", "authors", "sources", "institutions", "topics", "concepts", "publishers", "funders", "keywords"] as const;
const EntityTypeSchema = createZodEnumFromUnion(ENTITY_TYPE_VALUES);

// RelationType schema - generated from the enum
const RelationTypeSchema = createZodEnumFromEnum(RelationType);

// WorkerEventType schema - generated from the enum
const WorkerEventTypeSchema = createZodEnumFromEnum(WorkerEventType);

// ExternalIdentifier types - keep in sync with the interface in types.ts
const EXTERNAL_IDENTIFIER_TYPES = ["doi", "orcid", "issn_l", "ror", "wikidata"] as const;

// ExternalIdentifier schema - generated from the const array
const ExternalIdentifierSchema = z.object({
  type: createZodEnumFromUnion(EXTERNAL_IDENTIFIER_TYPES),
  value: z.string(),
  url: z.string()
});

// Graph Node and Edge schemas for validation
const GraphNodeSchema = z.object({
  id: z.string(),
  type: EntityTypeSchema,
  label: z.string(),
  entityId: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  externalIds: z.array(ExternalIdentifierSchema),
  entityData: z.record(z.string(), z.unknown()).optional()
});

const GraphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: RelationTypeSchema,
  label: z.string().optional(),
  weight: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

// Graph Event Payload Schemas
export const GraphEventPayloadSchemas = {
  [GraphEventType.ANY_NODE_ADDED]: BaseEventPayloadSchema.extend({
    node: GraphNodeSchema
  }),
  [GraphEventType.ANY_NODE_REMOVED]: BaseEventPayloadSchema.extend({
    nodeId: z.string(),
    entityId: z.string(),
    entityType: EntityTypeSchema
  }),
  [GraphEventType.ANY_EDGE_ADDED]: BaseEventPayloadSchema.extend({
    edge: GraphEdgeSchema
  }),
  [GraphEventType.ANY_EDGE_REMOVED]: BaseEventPayloadSchema.extend({
    edgeId: z.string(),
    sourceEntityId: z.string(),
    targetEntityId: z.string(),
    relationType: RelationTypeSchema
  }),
  [GraphEventType.LAYOUT_CHANGED]: BaseEventPayloadSchema.extend({
    layoutType: z.string()
  }),
  [GraphEventType.GRAPH_CLEARED]: BaseEventPayloadSchema.extend({
    previousNodeCount: z.number(),
    previousEdgeCount: z.number()
  }),
  [GraphEventType.FORCE_LAYOUT_RESTART]: BaseEventPayloadSchema.extend({
    reason: z.string(),
    alpha: z.number()
  }),
  [GraphEventType.BULK_NODES_ADDED]: BaseEventPayloadSchema.extend({
    nodes: z.array(GraphNodeSchema)
  }),
  [GraphEventType.BULK_EDGES_ADDED]: BaseEventPayloadSchema.extend({
    edges: z.array(GraphEdgeSchema)
  })
};

// Entity Event Payload Schemas
export const EntityEventPayloadSchemas = {
  [EntityEventType.ENTITY_EXPANDED]: BaseEventPayloadSchema.extend({
    entityId: z.string(),
    entityType: EntityTypeSchema,
    expansionData: z.object({
      nodesAdded: z.array(GraphNodeSchema),
      edgesAdded: z.array(GraphEdgeSchema),
      depth: z.number(),
      duration: z.number(),
      apiCalls: z.number().optional()
    })
  }),
  [EntityEventType.ENTITY_REMOVED]: BaseEventPayloadSchema.extend({
    entityId: z.string(),
    entityType: EntityTypeSchema,
    nodeId: z.string().optional()
  }),
  [EntityEventType.ENTITY_SELECTED]: BaseEventPayloadSchema.extend({
    entityId: z.string(),
    entityType: EntityTypeSchema,
    nodeId: z.string().optional()
  }),
  [EntityEventType.ENTITY_DATA_UPDATED]: BaseEventPayloadSchema.extend({
    entityId: z.string(),
    entityType: EntityTypeSchema,
    updatedFields: z.array(z.string()),
    newData: z.record(z.string(), z.unknown())
  }),
  [EntityEventType.ENTITY_CONNECTIONS_UPDATED]: BaseEventPayloadSchema.extend({
    entityId: z.string(),
    entityType: EntityTypeSchema,
    newConnections: z.array(z.object({
      targetEntityId: z.string(),
      targetEntityType: EntityTypeSchema,
      relationType: RelationTypeSchema
    }))
  }),
  [EntityEventType.ANY]: BaseEventPayloadSchema.extend({
    entityId: z.string(),
    entityType: EntityTypeSchema,
    eventType: z.string(),
    payload: z.unknown()
  })
};

// Node Event Payload Schemas
export const NodeEventPayloadSchemas = {
  [NodeEventType.NODE_SELECTED]: BaseEventPayloadSchema.extend({
    nodeId: z.string(),
    entityId: z.string(),
    entityType: EntityTypeSchema
  }),
  [NodeEventType.NODE_DESELECTED]: BaseEventPayloadSchema.extend({
    nodeId: z.string(),
    entityId: z.string(),
    entityType: EntityTypeSchema
  }),
  [NodeEventType.NODE_HOVERED]: BaseEventPayloadSchema.extend({
    nodeId: z.string(),
    entityId: z.string(),
    entityType: EntityTypeSchema
  }),
  [NodeEventType.NODE_UNHOVERED]: BaseEventPayloadSchema.extend({
    nodeId: z.string(),
    entityId: z.string(),
    entityType: EntityTypeSchema
  }),
  [NodeEventType.NODE_POSITION_CHANGED]: BaseEventPayloadSchema.extend({
    nodeId: z.string(),
    entityId: z.string(),
    entityType: EntityTypeSchema,
    oldPosition: z.object({ x: z.number(), y: z.number() }),
    newPosition: z.object({ x: z.number(), y: z.number() })
  }),
  [NodeEventType.NODE_STYLE_CHANGED]: BaseEventPayloadSchema.extend({
    nodeId: z.string(),
    entityId: z.string(),
    entityType: EntityTypeSchema,
    styleChanges: z.record(z.string(), z.unknown())
  }),
  [NodeEventType.NODE_LOADING_STATE_CHANGED]: BaseEventPayloadSchema.extend({
    nodeId: z.string(),
    entityId: z.string(),
    entityType: EntityTypeSchema,
    isLoading: z.boolean()
  }),
  [NodeEventType.NODE_PINNED]: BaseEventPayloadSchema.extend({
    nodeId: z.string(),
    entityId: z.string(),
    entityType: EntityTypeSchema
  }),
  [NodeEventType.NODE_UNPINNED]: BaseEventPayloadSchema.extend({
    nodeId: z.string(),
    entityId: z.string(),
    entityType: EntityTypeSchema
  }),
  [NodeEventType.NODE_VISIBILITY_CHANGED]: BaseEventPayloadSchema.extend({
    nodeId: z.string(),
    entityId: z.string(),
    entityType: EntityTypeSchema,
    isVisible: z.boolean()
  })
};

// Edge Event Payload Schemas
export const EdgeEventPayloadSchemas = {
  [EdgeEventType.EDGE_ADDED]: BaseEventPayloadSchema.extend({
    edge: GraphEdgeSchema,
    sourceEntityId: z.string(),
    targetEntityId: z.string()
  }),
  [EdgeEventType.EDGE_REMOVED]: BaseEventPayloadSchema.extend({
    edgeId: z.string(),
    sourceEntityId: z.string(),
    targetEntityId: z.string(),
    relationType: RelationTypeSchema
  }),
  [EdgeEventType.EDGE_SELECTED]: BaseEventPayloadSchema.extend({
    edgeId: z.string(),
    sourceEntityId: z.string(),
    targetEntityId: z.string(),
    relationType: RelationTypeSchema
  }),
  [EdgeEventType.EDGE_DESELECTED]: BaseEventPayloadSchema.extend({
    edgeId: z.string(),
    sourceEntityId: z.string(),
    targetEntityId: z.string(),
    relationType: RelationTypeSchema
  }),
  [EdgeEventType.EDGE_WEIGHT_CHANGED]: BaseEventPayloadSchema.extend({
    edgeId: z.string(),
    sourceEntityId: z.string(),
    targetEntityId: z.string(),
    relationType: RelationTypeSchema,
    oldWeight: z.number().optional(),
    newWeight: z.number().optional()
  }),
  [EdgeEventType.EDGE_STYLE_CHANGED]: BaseEventPayloadSchema.extend({
    edgeId: z.string(),
    sourceEntityId: z.string(),
    targetEntityId: z.string(),
    relationType: RelationTypeSchema,
    styleChanges: z.record(z.string(), z.unknown())
  }),
  [EdgeEventType.EDGE_VISIBILITY_CHANGED]: BaseEventPayloadSchema.extend({
    edgeId: z.string(),
    sourceEntityId: z.string(),
    targetEntityId: z.string(),
    relationType: RelationTypeSchema,
    isVisible: z.boolean()
  })
};

// Worker Event Payload Schemas
export const WorkerEventPayloadSchemas = {
  [WorkerEventType.WORKER_READY]: BaseEventPayloadSchema.extend({
    workerId: z.string(),
    workerType: z.enum(["data-fetching", "force-animation"])
  }),
  [WorkerEventType.WORKER_ERROR]: BaseEventPayloadSchema.extend({
    workerId: z.string(),
    workerType: z.enum(["data-fetching", "force-animation"]),
    error: z.string()
  }),
  [WorkerEventType.WORKER_TERMINATED]: BaseEventPayloadSchema.extend({
    workerId: z.string(),
    workerType: z.enum(["data-fetching", "force-animation"])
  }),
  [WorkerEventType.DATA_FETCH_PROGRESS]: BaseEventPayloadSchema.extend({
    requestId: z.string(),
    nodeId: z.string(),
    entityId: z.string(),
    progress: z.number().min(0).max(1),
    currentStep: z.string()
  }),
  [WorkerEventType.DATA_FETCH_COMPLETE]: BaseEventPayloadSchema.extend({
    requestId: z.string(),
    nodeId: z.string(),
    entityId: z.string(),
    nodes: z.array(GraphNodeSchema),
    edges: z.array(GraphEdgeSchema),
    statistics: z.object({
      nodesAdded: z.number(),
      edgesAdded: z.number(),
      apiCalls: z.number(),
      duration: z.number()
    }).optional()
  }),
  [WorkerEventType.DATA_FETCH_ERROR]: BaseEventPayloadSchema.extend({
    requestId: z.string(),
    nodeId: z.string(),
    entityId: z.string(),
    error: z.string()
  }),
  [WorkerEventType.DATA_FETCH_CANCELLED]: BaseEventPayloadSchema.extend({
    requestId: z.string(),
    nodeId: z.string(),
    entityId: z.string()
  }),
  [WorkerEventType.FORCE_SIMULATION_PROGRESS]: BaseEventPayloadSchema.extend({
    workerId: z.string(),
    workerType: z.literal("force-animation"),
    messageType: z.string().optional(),
    positions: z.array(z.object({
      id: z.string(),
      x: z.number(),
      y: z.number()
    })).optional(),
    alpha: z.number().optional(),
    iteration: z.number().optional(),
    progress: z.number().optional(),
    fps: z.number().optional(),
    nodeCount: z.number().optional(),
    linkCount: z.number().optional(),
    config: z.unknown().optional(),
    wasPaused: z.boolean().optional()
  }),
  [WorkerEventType.FORCE_SIMULATION_COMPLETE]: BaseEventPayloadSchema.extend({
    workerId: z.string(),
    workerType: z.literal("force-animation"),
    positions: z.array(z.object({
      id: z.string(),
      x: z.number(),
      y: z.number()
    })),
    totalIterations: z.number(),
    finalAlpha: z.number(),
    reason: z.string()
  }),
  [WorkerEventType.FORCE_SIMULATION_ERROR]: BaseEventPayloadSchema.extend({
    workerId: z.string(),
    workerType: z.literal("force-animation"),
    error: z.string(),
    filename: z.string().optional(),
    lineno: z.number().optional()
  }),
  [WorkerEventType.FORCE_SIMULATION_STOPPED]: BaseEventPayloadSchema.extend({
    workerId: z.string(),
    workerType: z.literal("force-animation")
  }),
  [WorkerEventType.CUSTOM_FORCES_SYNCED]: BaseEventPayloadSchema.extend({
    workerId: z.string(),
    workerType: z.literal("force-animation"),
    count: z.number()
  }),
  [WorkerEventType.CUSTOM_FORCE_ADDED]: BaseEventPayloadSchema.extend({
    workerId: z.string(),
    workerType: z.literal("force-animation"),
    forceId: z.string()
  }),
  [WorkerEventType.CUSTOM_FORCE_REMOVED]: BaseEventPayloadSchema.extend({
    workerId: z.string(),
    workerType: z.literal("force-animation"),
    forceId: z.string()
  }),
  [WorkerEventType.CUSTOM_FORCE_UPDATED]: BaseEventPayloadSchema.extend({
    workerId: z.string(),
    workerType: z.literal("force-animation"),
    forceId: z.string()
  }),
  [WorkerEventType.CUSTOM_FORCE_ERROR]: BaseEventPayloadSchema.extend({
    workerId: z.string(),
    workerType: z.literal("force-animation"),
    error: z.string(),
    forceId: z.string().optional()
  })
};

// Type inference from Zod schemas
export type InferredGraphEventPayloads = {
  [K in keyof typeof GraphEventPayloadSchemas]: z.infer<typeof GraphEventPayloadSchemas[K]>;
};

export type InferredEntityEventPayloads = {
  [K in keyof typeof EntityEventPayloadSchemas]: z.infer<typeof EntityEventPayloadSchemas[K]>;
};

export type InferredNodeEventPayloads = {
  [K in keyof typeof NodeEventPayloadSchemas]: z.infer<typeof NodeEventPayloadSchemas[K]>;
};

export type InferredEdgeEventPayloads = {
  [K in keyof typeof EdgeEventPayloadSchemas]: z.infer<typeof EdgeEventPayloadSchemas[K]>;
};

export type InferredWorkerEventPayloads = {
  [K in keyof typeof WorkerEventPayloadSchemas]: z.infer<typeof WorkerEventPayloadSchemas[K]>;
};

/**
 * Safe payload parser using Zod schemas
 * Returns typed result or null if validation fails
 */
export function parseEventPayloadWithSchema<T extends z.ZodType>(
  payload: unknown,
  schema: T
): z.infer<T> | null {
  const result = schema.safeParse(payload);
  return result.success ? result.data : null;
}


/**
 * Parse and validate payload, throwing on failure
 * Returns typed payload or throws error
 */
export function parseValidEventPayload<TPayload>(
  payload: unknown,
  schema: z.ZodType<TPayload>
): TPayload {
  return schema.parse(payload);
}

/**
 * Create a type-safe validated handler using Zod schema
 * Returns a handler that validates unknown payloads and calls the typed handler
 */
export function createZodValidatedHandler<T>(
  handler: (payload: T) => void | Promise<void>,
  schema: z.ZodType<T>
): (payload: unknown) => void | Promise<void> {
  return (payload: unknown) => {
    const result = schema.safeParse(payload);
    if (result.success) {
      // result.data is properly typed as T
      return handler(result.data);
    }
    // Invalid payload is ignored (validation logging can be added here if needed)
  };
}

/**
 * Type guard to check if eventType is a valid WorkerEventType
 */
export function isWorkerEventType(eventType: string): eventType is WorkerEventType {
  return WorkerEventTypeSchema.safeParse(eventType).success;
}

/**
 * Type-safe payload parser that validates and narrows type
 * Uses Zod schema validation to ensure type safety without assertions
 */
function isValidPayload<T extends WorkerEventType>(
  data: unknown,
  _eventType: T
): data is WorkerEventPayloads[T] {
  // Type guard that relies on the Zod schema validation already performed
  return data !== null && data !== undefined;
}

export function parseWorkerEventPayload<T extends WorkerEventType>(
  payload: unknown,
  eventType: T,
  schema: z.ZodType
): WorkerEventPayloads[T] | null {
  const result = schema.safeParse(payload);
  // Use type guard approach instead of type assertion
  if (result.success && isValidPayload(result.data, eventType)) {
    return result.data;
  }
  return null;
}

// Export the WorkerEventType schema for external use
export { WorkerEventTypeSchema };

