/**
 * Hook for tracking graph and simulation activity
 * Focuses on graph operations, force simulation, and data fetching
 */

import { useEffect, useCallback, useRef } from "react";
import { useAppActivityStore } from "@/stores/app-activity-store";
import { workerEventBus, broadcastEventBus } from "@/lib/graph/events/broadcast-event-bus";
import { graphEventSystem } from "@/lib/graph/events";
import {
  GraphEventType,
  EntityEventType,
  WorkerEventType
} from "@/lib/graph/events/types";
import { logger } from "@/lib/logger";

// Type guards for better type safety
const GRAPH_EVENT_VALUES: readonly string[] = Object.values(GraphEventType);
const ENTITY_EVENT_VALUES: readonly string[] = Object.values(EntityEventType);
const WORKER_EVENT_VALUES: readonly string[] = Object.values(WorkerEventType);

function isGraphEventType(eventType: string): eventType is GraphEventType {
  return GRAPH_EVENT_VALUES.includes(eventType);
}

function isEntityEventType(eventType: string): eventType is EntityEventType {
  return ENTITY_EVENT_VALUES.includes(eventType);
}

function isWorkerEventType(eventType: string): eventType is WorkerEventType {
  return WORKER_EVENT_VALUES.includes(eventType);
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Hook to track graph and simulation activity
 */
export function useGraphActivityTracker() {
  const { addEvent } = useAppActivityStore();
  const handlerIdRef = useRef<string | null>(null);
  const graphListenerIdsRef = useRef<string[]>([]);

  // Event bridge message handler focused on graph/simulation events
  const handleGraphEvent = useCallback((event: { type: string; payload?: unknown }) => {
    let eventType: string = "unknown";
    try {
      eventType = event.type;
      const { payload } = event;

      // Debug logging to see all events
      logger.debug("ui", "Activity tracker received event", {
        eventType,
        payloadKeys: payload && typeof payload === "object" ? Object.keys(payload) : "non-object",
        allGraphEventTypes: Object.values(GraphEventType),
        isGraphEvent: isGraphEventType(eventType)
      }, "GraphActivityTracker");

      // Handle graph structure events
      if (isGraphEventType(eventType)) {
        const graphPayload = isRecordObject(payload) ? payload : {};

        let description = "";
        let duration: number | undefined;

        switch (eventType) {
          case GraphEventType.ANY_NODE_ADDED:
            description = "Added node to graph";
            break;
          case GraphEventType.ANY_NODE_REMOVED:
            description = "Removed node from graph";
            break;
          case GraphEventType.BULK_NODES_ADDED:
            description = "Added multiple nodes to graph";
            break;
          case GraphEventType.ANY_EDGE_ADDED:
            description = "Added edge to graph";
            break;
          case GraphEventType.BULK_EDGES_ADDED:
            description = "Added multiple edges to graph";
            break;
          case GraphEventType.GRAPH_CLEARED:
            description = "Graph cleared";
            break;
          default:
            description = `Graph event: ${eventType}`;
        }

        addEvent({
          type: "system",
          category: "data",
          event: eventType,
          description,
          severity: "info",
          duration,
          metadata: {
            data: {
              eventType,
              graphOperation: true,
              payload: graphPayload,
            },
          },
        });
      }

      // Handle entity expansion events
      else if (isEntityEventType(eventType) && eventType === EntityEventType.ENTITY_EXPANDED) {
        const entityPayload = isRecordObject(payload) ? payload : {};
        const description = "Entity expanded with related data";

        addEvent({
          type: "user",
          category: "data",
          event: eventType,
          description,
          severity: "info",
          metadata: {
            data: {
              eventType,
              expansion: true,
              payload: entityPayload,
            },
          },
        });
      }

      // Handle worker events (force simulation & data fetching)
      else if (isWorkerEventType(eventType)) {
        const workerPayload = isRecordObject(payload) ? payload : {};

        let description = "";
        let severity: "info" | "warning" | "error" | "debug" = "info";
        let duration: number | undefined;

        switch (eventType) {
          case WorkerEventType.FORCE_SIMULATION_PROGRESS:
            description = "Force simulation progress";
            severity = "debug";
            break;
          case WorkerEventType.FORCE_SIMULATION_COMPLETE:
            description = "Force simulation completed";
            break;
          case WorkerEventType.FORCE_SIMULATION_ERROR:
            description = "Force simulation error";
            severity = "error";
            break;
          case WorkerEventType.DATA_FETCH_PROGRESS:
            description = "Data fetch progress";
            severity = "debug";
            break;
          case WorkerEventType.DATA_FETCH_COMPLETE:
            description = "Data fetch completed";
            break;
          case WorkerEventType.DATA_FETCH_ERROR:
            description = "Data fetch error";
            severity = "error";
            break;
          default:
            description = `Worker event: ${eventType}`;
        }

        addEvent({
          type: "system",
          category: "background",
          event: eventType,
          description,
          severity,
          duration,
          metadata: {
            data: {
              eventType,
              simulation: eventType.includes("simulation"),
              dataFetch: eventType.includes("fetch"),
              payload: workerPayload,
            },
          },
        });
      }
    } catch (error) {
      logger.error("ui", "Failed to process graph event", {
        eventType,
        error: error instanceof Error ? error.message : "Unknown error",
      }, "GraphActivityTracker");
    }
  }, [addEvent]);

  // Direct graph event handler for GraphEventSystem
  const handleDirectGraphEvent = useCallback((params: { eventType: GraphEventType; payload: Record<string, unknown> }) => {
    const { eventType, payload } = params;
    try {
      logger.debug("ui", "Activity tracker received direct graph event", {
        eventType,
        payloadKeys: payload && typeof payload === "object" ? Object.keys(payload) : "non-object"
      }, "GraphActivityTracker");

      let description = "";
      let duration: number | undefined;

      switch (eventType) {
        case GraphEventType.ANY_NODE_ADDED:
          description = "Added node to graph";
          break;
        case GraphEventType.ANY_NODE_REMOVED:
          description = "Removed node from graph";
          break;
        case GraphEventType.BULK_NODES_ADDED:
          description = "Added multiple nodes to graph";
          break;
        case GraphEventType.ANY_EDGE_ADDED:
          description = "Added edge to graph";
          break;
        case GraphEventType.BULK_EDGES_ADDED:
          description = "Added multiple edges to graph";
          break;
        case GraphEventType.GRAPH_CLEARED:
          description = "Graph cleared";
          break;
        default:
          description = `Graph event: ${eventType}`;
      }

      addEvent({
        type: "system",
        category: "data",
        event: eventType,
        description,
        severity: "info",
        duration,
        metadata: {
          data: {
            eventType,
            graphOperation: true,
            payload,
          },
        },
      });

    } catch (error) {
      logger.error("ui", "Failed to process direct graph event", {
        eventType,
        error: error instanceof Error ? error.message : "Unknown error",
      }, "GraphActivityTracker");
    }
  }, [addEvent]);

  // Set up event bridge listener
  useEffect(() => {
    const handlerId = `graph-activity-tracker-${Date.now().toString()}`;
    handlerIdRef.current = handlerId;

    const eventType = "graph:activity-tracker";
    // Use raw event bus for custom event types
    broadcastEventBus.listen(eventType, handleGraphEvent);

    // Log initial setup
    addEvent({
      type: "system",
      category: "lifecycle",
      event: "activity_tracker_started",
      description: "Graph activity tracking started",
      severity: "info",
      metadata: {
        data: {
          handlerId,
          trackingTypes: ["graph", "simulation", "data-fetch"],
        },
      },
    });

    logger.debug("ui", "Graph activity tracker registered", { handlerId }, "GraphActivityTracker");

    return () => {
      if (handlerIdRef.current) {
        workerEventBus.removeListener(handlerIdRef.current);

        addEvent({
          type: "system",
          category: "lifecycle",
          event: "activity_tracker_stopped",
          description: "Graph activity tracking stopped",
          severity: "info",
          metadata: {
            data: {
              handlerId: handlerIdRef.current,
            },
          },
        });

        logger.debug("ui", "Graph activity tracker unregistered", { handlerId: handlerIdRef.current }, "GraphActivityTracker");
        handlerIdRef.current = null;
      }
    };
  }, [handleGraphEvent, addEvent]);

  // Set up direct graph event listeners
  useEffect(() => {
    const listenerIds: string[] = [];

    // Register for all graph events we want to track
    const graphEventTypes = [
      GraphEventType.ANY_NODE_ADDED,
      GraphEventType.ANY_NODE_REMOVED,
      GraphEventType.ANY_EDGE_ADDED,
      GraphEventType.ANY_EDGE_REMOVED,
      GraphEventType.BULK_NODES_ADDED,
      GraphEventType.BULK_EDGES_ADDED,
      GraphEventType.GRAPH_CLEARED,
      GraphEventType.LAYOUT_CHANGED
    ];

    for (const eventType of graphEventTypes) {
      const listenerId = graphEventSystem.onGraphEvent(eventType, (payload) => {
        handleDirectGraphEvent({
          eventType,
          payload: isRecordObject(payload) ? payload : {}
        });
      });
      listenerIds.push(listenerId);
    }

    graphListenerIdsRef.current = listenerIds;

    logger.debug("ui", "Graph activity tracker registered direct listeners", {
      listenerCount: listenerIds.length,
      eventTypes: graphEventTypes
    }, "GraphActivityTracker");

    return () => {
      // Clean up all graph event listeners
      for (const listenerId of graphListenerIdsRef.current) {
        graphEventSystem.off(listenerId);
      }
      graphListenerIdsRef.current = [];

      logger.debug("ui", "Graph activity tracker unregistered direct listeners", {
        listenerCount: listenerIds.length
      }, "GraphActivityTracker");
    };
  }, [handleDirectGraphEvent]);

  return {
    // Expose any manual tracking methods if needed
    isTracking: handlerIdRef.current !== null,
  };
}