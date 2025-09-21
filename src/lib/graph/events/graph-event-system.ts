/**
 * Graph-level event system
 * Handles events that affect the entire graph structure
 */

import { logger } from "@/lib/logger";
import { BaseEventEmitter } from "./base-event-emitter";
import {
  GraphEventType,
  GraphEventPayloads,
  GraphEventHandler,
  GraphListenerOptions,
  // GraphEventPayloadSchemas removed - not currently used
} from "./types";
import type { GraphNode, GraphEdge, RelationType, EntityType } from "@/lib/graph/types";

export class GraphEventSystem extends BaseEventEmitter<GraphEventType, GraphEventPayloads[GraphEventType]> {
  private static instance: GraphEventSystem | null = null;

  private constructor() {
    super();
    logger.debug("general", "GraphEventSystem initialized");
  }

  /**
   * Get singleton instance
   */
  static getInstance(): GraphEventSystem {
    if (!GraphEventSystem.instance) {
      GraphEventSystem.instance = new GraphEventSystem();
    }
    return GraphEventSystem.instance;
  }

  /**
   * Emit graph-level events with proper typing
   */
  async emitGraphEvent<T extends GraphEventType>(
    eventType: T,
    payload: GraphEventPayloads[T]
  ): Promise<void> {
    await this.emit(eventType, payload);
  }

  /**
   * Register graph event listener with proper typing and cross-context support
   */
  onGraphEvent<T extends GraphEventType>(
    eventType: T,
    handler: GraphEventHandler<T>,
    options?: GraphListenerOptions
  ): string {
    // Type-safe handler wrapper
    const typedHandler = (payload: GraphEventPayloads[GraphEventType]) => {
      // Type guard to ensure proper typing
      if (this.isValidGraphEventPayload(payload, eventType)) {
        return handler(payload);
      }
      logger.warn("general", "Invalid graph event payload", { eventType, payload });
    };
    return this.on(eventType, typedHandler, options);
  }

  // =============================================================================
  // Convenience Methods for Common Graph Events
  // =============================================================================

  /**
   * Emit node added event
   */
  async emitNodeAdded(node: GraphNode): Promise<void> {
    await this.emitGraphEvent(GraphEventType.ANY_NODE_ADDED, {
      node,
      timestamp: Date.now()
    });
  }

  /**
   * Emit node removed event
   */
  async emitNodeRemoved(nodeId: string, entityId: string, entityType: EntityType): Promise<void> {
    await this.emitGraphEvent(GraphEventType.ANY_NODE_REMOVED, {
      nodeId,
      entityId,
      entityType,
      timestamp: Date.now()
    });
  }

  /**
   * Emit edge added event
   */
  async emitEdgeAdded(edge: GraphEdge): Promise<void> {
    await this.emitGraphEvent(GraphEventType.ANY_EDGE_ADDED, {
      edge,
      timestamp: Date.now()
    });
  }

  /**
   * Emit edge removed event
   */
  async emitEdgeRemoved(
    edgeId: string,
    sourceEntityId: string,
    targetEntityId: string,
    relationType: RelationType
  ): Promise<void> {
    await this.emitGraphEvent(GraphEventType.ANY_EDGE_REMOVED, {
      edgeId,
      sourceEntityId,
      targetEntityId,
      relationType,
      timestamp: Date.now()
    });
  }

  /**
   * Emit bulk nodes added event
   */
  async emitBulkNodesAdded(nodes: GraphNode[]): Promise<void> {
    await this.emitGraphEvent(GraphEventType.BULK_NODES_ADDED, {
      nodes,
      timestamp: Date.now()
    });
  }

  /**
   * Emit bulk edges added event
   */
  async emitBulkEdgesAdded(edges: GraphEdge[]): Promise<void> {
    await this.emitGraphEvent(GraphEventType.BULK_EDGES_ADDED, {
      edges,
      timestamp: Date.now()
    });
  }

  /**
   * Emit layout changed event
   */
  async emitLayoutChanged(layoutType: string): Promise<void> {
    await this.emitGraphEvent(GraphEventType.LAYOUT_CHANGED, {
      layoutType,
      timestamp: Date.now()
    });
  }

  /**
   * Emit graph cleared event
   */
  async emitGraphCleared(previousNodeCount: number, previousEdgeCount: number): Promise<void> {
    await this.emitGraphEvent(GraphEventType.GRAPH_CLEARED, {
      previousNodeCount,
      previousEdgeCount,
      timestamp: Date.now()
    });
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  /**
   * Get statistics about graph event listeners
   */
  getListenerStats(): Record<GraphEventType, number> {
    const stats = {
      [GraphEventType.ANY_NODE_ADDED]: 0,
      [GraphEventType.ANY_NODE_REMOVED]: 0,
      [GraphEventType.ANY_EDGE_ADDED]: 0,
      [GraphEventType.ANY_EDGE_REMOVED]: 0,
      [GraphEventType.LAYOUT_CHANGED]: 0,
      [GraphEventType.GRAPH_CLEARED]: 0,
      [GraphEventType.BULK_NODES_ADDED]: 0,
      [GraphEventType.BULK_EDGES_ADDED]: 0,
    };

    for (const eventType of Object.values(GraphEventType)) {
      stats[eventType] = this.getListenerCount(eventType);
    }

    return stats;
  }

  /**
   * Type guard for graph event payloads
   */
  private isValidGraphEventPayload<T extends GraphEventType>(
    payload: unknown,
    _eventType: T
  ): payload is GraphEventPayloads[T] {
    if (!payload || typeof payload !== "object") {
      return false;
    }

    return (
      "timestamp" in payload &&
      typeof payload.timestamp === "number"
    );
  }

  /**
   * Clean up all graph event listeners
   */
  cleanup(): void {
    this.removeAllListeners();
    logger.debug("general", "GraphEventSystem cleaned up");
  }

  /**
   * Reset singleton instance (primarily for testing)
   */
  static resetInstance(): void {
    if (GraphEventSystem.instance) {
      GraphEventSystem.instance.cleanup();
      GraphEventSystem.instance = null;
    }
  }
}

// Export singleton instance
export const graphEventSystem = GraphEventSystem.getInstance();