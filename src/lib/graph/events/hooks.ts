/**
 * React hooks for cross-context event system
 * Provides declarative API for event handling with context targeting
 */

import { useEffect, useRef } from "react";
import { logger } from "@/lib/logger";
import { graphEventSystem } from "./graph-event-system";
import { entityEventSystem } from "./entity-event-system";
import {
  GraphEventType,
  GraphEventHandler,
  GraphListenerOptions,
  EntityEventType,
  EntityEventHandler,
  EntityListenerOptions,
  EntityFilter
} from "./types";

// =============================================================================
// Graph Event Hooks
// =============================================================================

/**
 * React hook for listening to graph-level events with cross-context support
 */
export function useGraphEventListener<T extends GraphEventType>(
  eventType: T,
  handler: GraphEventHandler<T>,
  options?: GraphListenerOptions
): void {
  const handlerRef = useRef(handler);
  const listenerIdRef = useRef<string | null>(null);

  // Update handler ref when handler changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    // Register listener with stable reference
    const stableHandler: GraphEventHandler<T> = (...args) => {
      return handlerRef.current(...args);
    };

    listenerIdRef.current = graphEventSystem.onGraphEvent(eventType, stableHandler, options);

    logger.debug("general", `Registered graph event listener for ${eventType}`, {
      listenerId: listenerIdRef.current,
      executeIn: options?.executeIn || "current"
    });

    return () => {
      if (listenerIdRef.current) {
        graphEventSystem.off(listenerIdRef.current);
        logger.debug("general", `Unregistered graph event listener for ${eventType}`, {
          listenerId: listenerIdRef.current
        });
      }
    };
  }, [eventType, options]);
}

// =============================================================================
// Entity Event Hooks
// =============================================================================

/**
 * React hook for listening to entity-level events with filtering and cross-context support
 */
export function useEntityEventListener<T extends EntityEventType>(
  entityFilter: EntityFilter,
  eventType: T,
  handler: EntityEventHandler<T>,
  options?: EntityListenerOptions
): void {
  const handlerRef = useRef(handler);
  const listenerIdRef = useRef<string | null>(null);

  // Update handler ref when handler changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    // Register listener with stable reference
    const stableHandler: EntityEventHandler<T> = (...args) => {
      return handlerRef.current(...args);
    };

    listenerIdRef.current = entityEventSystem.onEntityEvent(
      entityFilter,
      eventType,
      stableHandler,
      options
    );

    logger.debug("general", `Registered entity event listener for ${eventType}`, {
      listenerId: listenerIdRef.current,
      entityFilter: Array.isArray(entityFilter) ? `[${String(entityFilter.length)} items]` : entityFilter,
      executeIn: options?.executeIn || "current"
    });

    return () => {
      if (listenerIdRef.current) {
        entityEventSystem.off(listenerIdRef.current);
        logger.debug("general", `Unregistered entity event listener for ${eventType}`, {
          listenerId: listenerIdRef.current
        });
      }
    };
  }, [
    entityFilter,
    eventType,
    options
  ]);
}

// =============================================================================
// Convenience Hooks
// =============================================================================

/**
 * Hook for listening to entity expansion events with cross-context support
 */
export function useEntityExpansionListener(
  entityFilter: EntityFilter,
  handler: EntityEventHandler<typeof EntityEventType.ENTITY_EXPANDED>,
  options?: EntityListenerOptions
): void {
  useEntityEventListener(entityFilter, EntityEventType.ENTITY_EXPANDED, handler, options);
}

/**
 * Hook for listening to entity selection events
 */
export function useEntitySelectionListener(
  entityFilter: EntityFilter,
  handler: EntityEventHandler<typeof EntityEventType.ENTITY_SELECTED>,
  options?: EntityListenerOptions
): void {
  useEntityEventListener(entityFilter, EntityEventType.ENTITY_SELECTED, handler, options);
}

/**
 * Hook for listening to any entity event
 */
export function useAnyEntityEventListener(
  entityFilter: EntityFilter,
  handler: EntityEventHandler<typeof EntityEventType.ANY>,
  options?: EntityListenerOptions
): void {
  useEntityEventListener(entityFilter, EntityEventType.ANY, handler, options);
}

/**
 * Hook for listening to graph node additions
 */
export function useNodeAddedListener(
  handler: GraphEventHandler<typeof GraphEventType.ANY_NODE_ADDED>,
  options?: GraphListenerOptions
): void {
  useGraphEventListener(GraphEventType.ANY_NODE_ADDED, handler, options);
}

/**
 * Hook for listening to graph node removals
 */
export function useNodeRemovedListener(
  handler: GraphEventHandler<typeof GraphEventType.ANY_NODE_REMOVED>,
  options?: GraphListenerOptions
): void {
  useGraphEventListener(GraphEventType.ANY_NODE_REMOVED, handler, options);
}

/**
 * Hook for listening to bulk node additions
 */
export function useBulkNodesAddedListener(
  handler: GraphEventHandler<typeof GraphEventType.BULK_NODES_ADDED>,
  options?: GraphListenerOptions
): void {
  useGraphEventListener(GraphEventType.BULK_NODES_ADDED, handler, options);
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Hook for one-time entity expansion callback
 */
export function useEntityExpansionCallback(
  entityId: string,
  callback: () => void,
  options?: {
    executeIn?: EntityListenerOptions["executeIn"];
    timeout?: number;
  }
): void {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update callback ref
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEntityEventListener(
    entityId,
    EntityEventType.ENTITY_EXPANDED,
    () => {
      callbackRef.current();
    },
    {
      once: true,
      executeIn: options?.executeIn || "main"
    }
  );

  // Optional timeout
  useEffect(() => {
    if (options?.timeout) {
      timeoutRef.current = setTimeout(() => {
        logger.warn("general", `Entity expansion callback timed out for ${entityId}`, {
          timeout: options.timeout
        });
      }, options.timeout);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [entityId, options?.timeout]);
}

/**
 * Hook for conditional entity operations
 */
export function useConditionalEntityAction(
  entityFilter: EntityFilter,
  eventType: EntityEventType,
  condition: (payload: Parameters<EntityEventHandler<EntityEventType>>[0]) => boolean,
  action: () => void | Promise<void>,
  options?: EntityListenerOptions
): void {
  const actionRef = useRef(action);

  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  useEntityEventListener(
    entityFilter,
    eventType,
    async (payload) => {
      if (condition(payload)) {
        await actionRef.current();
      }
    },
    options
  );
}

// =============================================================================
// Debug Hooks
// =============================================================================

/**
 * Hook to get event system debug information
 */
export function useEventSystemDebug(): {
  graphEvents: Record<string, unknown>;
  entityEvents: Record<string, unknown>;
} {
  return {
    graphEvents: graphEventSystem.getDebugInfo(),
    entityEvents: entityEventSystem.getDebugInfo()
  };
}