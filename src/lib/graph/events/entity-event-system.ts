/**
 * Entity-level event system
 * Handles events on OpenAlex entities regardless of node representation
 */

import { logger } from "@/lib/logger";
import { CrossContextEventProxy } from "./context-proxy";
import {
  EntityEventType,
  EntityEventPayloads,
  EntityEventHandler,
  EntityListenerOptions,
  EntityFilter,
  EntityEventPayloadSchemas
} from "./types";
import type { EntityType, GraphNode, GraphEdge, RelationType } from "@/lib/graph/types";

export class EntityEventSystem extends CrossContextEventProxy<EntityEventType, EntityEventPayloads[EntityEventType]> {
  private static instance: EntityEventSystem | null = null;

  private constructor() {
    super("entity-events", EntityEventPayloadSchemas);
    logger.debug("general", "EntityEventSystem initialized");
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EntityEventSystem {
    if (!EntityEventSystem.instance) {
      EntityEventSystem.instance = new EntityEventSystem();
    }
    return EntityEventSystem.instance;
  }

  /**
   * Emit entity-level events with proper typing
   */
  async emitEntityEvent<T extends EntityEventType>(
    eventType: T,
    payload: EntityEventPayloads[T]
  ): Promise<void> {
    await this.emit(eventType, payload);
  }

  /**
   * Register entity event listener with filtering and cross-context support
   */
  onEntityEvent<T extends EntityEventType>(
    entityFilter: EntityFilter,
    eventType: T,
    handler: EntityEventHandler<T>,
    options?: EntityListenerOptions
  ): string {
    // Create filtering wrapper with proper type guards
    const filteredHandler = (payload: EntityEventPayloads[EntityEventType]) => {
      // Type guard for entity event payload
      if (!this.isEntityEventPayload(payload, eventType)) {
        logger.warn("general", "Invalid entity event payload", { eventType, payload });
        return;
      }

      const typedPayload = payload;

      // Apply entity filtering
      if (!this.matchesEntityFilter(typedPayload, entityFilter)) {
        return;
      }

      // Call original handler with properly typed payload
      return this.callEntityHandler(handler, typedPayload, eventType);
    };

    return this.on(eventType, filteredHandler, options);
  }

  // =============================================================================
  // Convenience Methods for Common Entity Events
  // =============================================================================

  /**
   * Emit entity expanded event
   */
  async emitEntityExpanded(
    entityId: string,
    entityType: EntityType,
    expansionData: {
      nodesAdded: GraphNode[];
      edgesAdded: GraphEdge[];
      depth: number;
      duration: number;
      apiCalls?: number;
    }
  ): Promise<void> {
    await this.emitEntityEvent(EntityEventType.ENTITY_EXPANDED, {
      entityId,
      entityType,
      expansionData,
      timestamp: Date.now()
    });
  }

  /**
   * Emit entity removed event
   */
  async emitEntityRemoved(entityId: string, entityType: EntityType, nodeId?: string): Promise<void> {
    await this.emitEntityEvent(EntityEventType.ENTITY_REMOVED, {
      entityId,
      entityType,
      nodeId,
      timestamp: Date.now()
    });
  }

  /**
   * Emit entity selected event
   */
  async emitEntitySelected(entityId: string, entityType: EntityType, nodeId?: string): Promise<void> {
    await this.emitEntityEvent(EntityEventType.ENTITY_SELECTED, {
      entityId,
      entityType,
      nodeId,
      timestamp: Date.now()
    });
  }

  /**
   * Emit entity data updated event
   */
  async emitEntityDataUpdated(
    entityId: string,
    entityType: EntityType,
    updatedFields: string[],
    newData: Record<string, unknown>
  ): Promise<void> {
    await this.emitEntityEvent(EntityEventType.ENTITY_DATA_UPDATED, {
      entityId,
      entityType,
      updatedFields,
      newData,
      timestamp: Date.now()
    });
  }

  /**
   * Emit entity connections updated event
   */
  async emitEntityConnectionsUpdated(
    entityId: string,
    entityType: EntityType,
    newConnections: Array<{
      targetEntityId: string;
      targetEntityType: EntityType;
      relationType: RelationType;
    }>
  ): Promise<void> {
    await this.emitEntityEvent(EntityEventType.ENTITY_CONNECTIONS_UPDATED, {
      entityId,
      entityType,
      newConnections,
      timestamp: Date.now()
    });
  }

  // =============================================================================
  // Entity Filtering Logic
  // =============================================================================

  /**
   * Check if event payload matches entity filter
   */
  private matchesEntityFilter(
    payload: EntityEventPayloads[EntityEventType],
    filter: EntityFilter
  ): boolean {
    const entityId = payload.entityId;
    const entityType = payload.entityType;

    if (typeof filter === "string") {
      // Single entity ID
      return entityId === filter;
    }

    if (Array.isArray(filter)) {
      if (filter.length === 0) return true;

      // Check if first element is string (entity IDs) or EntityType
      const firstElement = filter[0];
      if (typeof firstElement === "string") {
        // Array of entity IDs
        return filter.includes(entityId);
      } else {
        // Array of entity types
        return filter.includes(entityType);
      }
    }

    if (typeof filter === "string" && this.isEntityType(filter)) {
      // Single entity type
      return entityType === filter;
    }

    return false;
  }

  /**
   * Type guard to check if string is EntityType
   */
  private isEntityType(value: string): value is EntityType {
    const entityTypes: readonly string[] = [
      "works", "authors", "sources", "institutions",
      "topics", "concepts", "publishers", "funders", "keywords"
    ];
    return entityTypes.includes(value);
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  /**
   * Get statistics about entity event listeners
   */
  getListenerStats(): Record<EntityEventType, number> {
    const stats = {
      [EntityEventType.ENTITY_EXPANDED]: 0,
      [EntityEventType.ENTITY_REMOVED]: 0,
      [EntityEventType.ENTITY_SELECTED]: 0,
      [EntityEventType.ENTITY_DATA_UPDATED]: 0,
      [EntityEventType.ENTITY_CONNECTIONS_UPDATED]: 0,
      [EntityEventType.ANY]: 0,
    };

    for (const eventType of Object.values(EntityEventType)) {
      stats[eventType] = this.getTotalListenerCount(eventType);
    }

    return stats;
  }

  /**
   * Type guard for entity event payloads
   */
  private isEntityEventPayload<T extends EntityEventType>(
    payload: unknown,
    _eventType: T
  ): payload is EntityEventPayloads[T] {
    // Type guard - check if payload has required EntityEvent properties
    if (!payload || typeof payload !== "object") {
      return false;
    }

    // Type-safe property checks
    const hasEntityId = "entityId" in payload && typeof payload.entityId === "string";
    const hasEntityType = "entityType" in payload && typeof payload.entityType === "string";
    const hasTimestamp = "timestamp" in payload && typeof payload.timestamp === "number";

    return hasEntityId && hasEntityType && hasTimestamp;
  }

  /**
   * Safely call entity handler with proper typing
   */
  private callEntityHandler<T extends EntityEventType>(
    handler: EntityEventHandler<T>,
    payload: EntityEventPayloads[T],
    eventType: T
  ): void | Promise<void> {
    try {
      return handler(payload);
    } catch (error) {
      logger.error("general", `Error in entity event handler for ${eventType}`, {
        error: error instanceof Error ? error.message : "Unknown error",
        entityId: payload.entityId,
        entityType: payload.entityType
      });
    }
  }

  /**
   * Clean up all entity event listeners
   */
  cleanup(): void {
    super.cleanup();
    logger.debug("general", "EntityEventSystem cleaned up");
  }

  /**
   * Reset singleton instance (primarily for testing)
   */
  static resetInstance(): void {
    if (EntityEventSystem.instance) {
      EntityEventSystem.instance.cleanup();
      EntityEventSystem.instance = null;
    }
  }
}

// Export singleton instance
export const entityEventSystem = EntityEventSystem.getInstance();