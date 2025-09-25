/**
 * Hook for tracking graph and simulation activity
 * Uses the unified event system for improved tracking
 */

import { useEffect, useCallback, useRef, useMemo } from "react";
import { useAppActivityStore } from "@/stores/app-activity-store";
import { useEventBus, useEventSubscriptions } from "@/hooks/use-unified-event-system";
import {
  GraphEventType,
  EntityEventType,
  WorkerEventType
} from "@academic-explorer/graph";
import { logger } from "@academic-explorer/utils/logger";

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
 * Hook to track graph and simulation activity using unified event system
 */
export function useGraphActivityTracker() {
  const { addEvent } = useAppActivityStore();
  const bus = useEventBus("academic-explorer-activity");
  const trackingActiveRef = useRef(false);

  // Unified event handler for all activity events
  const handleUnifiedEvent = useCallback((event: { type: string; payload?: unknown }) => {
    let eventType: string = "unknown";
    try {
      eventType = event.type;
      const { payload } = event;

      // Debug logging to see all events
      logger.debug("ui", "Unified activity tracker received event", {
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
          entityType: "system",
          category: "data",
          event: eventType,
          description,
          severity: "info",
          duration: duration ?? 0,
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
          entityType: "user",
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
          case "data-fetch-progress":
            description = "Data fetch progress";
            severity = "debug";
            break;
          case "data-fetch-complete":
            description = "Data fetch completed";
            break;
          case "data-fetch-error":
            description = "Data fetch error";
            severity = "error";
            break;
          default:
            description = `Worker event: ${eventType}`;
        }

        addEvent({
          entityType: "system",
          category: "background",
          event: eventType,
          description,
          severity,
          duration: duration ?? 0,
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

  // Set up unified event subscriptions (memoized to prevent unnecessary re-renders)
  const eventSubscriptions = useMemo(() => [
    // Graph structure events
    { eventType: GraphEventType.ANY_NODE_ADDED, handler: handleUnifiedEvent },
    { eventType: GraphEventType.ANY_NODE_REMOVED, handler: handleUnifiedEvent },
    { eventType: GraphEventType.ANY_EDGE_ADDED, handler: handleUnifiedEvent },
    { eventType: GraphEventType.ANY_NODE_REMOVED, handler: handleUnifiedEvent },
    { eventType: GraphEventType.BULK_NODES_ADDED, handler: handleUnifiedEvent },
    { eventType: GraphEventType.BULK_EDGES_ADDED, handler: handleUnifiedEvent },
    { eventType: GraphEventType.GRAPH_CLEARED, handler: handleUnifiedEvent },
    // Entity events
    { eventType: EntityEventType.ENTITY_EXPANDED, handler: handleUnifiedEvent },

    // Worker/Task events
    { eventType: "TASK_PROGRESS", handler: handleUnifiedEvent },
    { eventType: "TASK_COMPLETED", handler: handleUnifiedEvent },
    { eventType: "TASK_FAILED", handler: handleUnifiedEvent },
    { eventType: "FORCE_SIMULATION_PROGRESS", handler: handleUnifiedEvent },
    { eventType: "FORCE_SIMULATION_COMPLETE", handler: handleUnifiedEvent },
    { eventType: "DATA_FETCH_COMPLETE", handler: handleUnifiedEvent },
    { eventType: "QUEUE_TASK_ASSIGNED", handler: handleUnifiedEvent },
    { eventType: "QUEUE_TASK_COMPLETED", handler: handleUnifiedEvent }
  ], [handleUnifiedEvent]);

  useEventSubscriptions(bus, eventSubscriptions);

  // Lifecycle tracking
  useEffect(() => {
    if (!trackingActiveRef.current) {
      trackingActiveRef.current = true;

      // Log initial setup
      addEvent({
        entityType: "system",
        category: "lifecycle",
        event: "activity_tracker_started",
        description: "Unified graph activity tracking started",
        severity: "info",
        metadata: {
          data: {
            trackingTypes: ["graph", "tasks", "simulation", "data-fetch"],
            unifiedSystem: true,
            eventCount: eventSubscriptions.length
          },
        },
      });

      logger.debug("ui", "Unified graph activity tracker started", {
        eventCount: eventSubscriptions.length,
        trackingTypes: ["graph", "tasks", "simulation", "data-fetch"]
      }, "GraphActivityTracker");
    }

    return () => {
      if (trackingActiveRef.current) {
        trackingActiveRef.current = false;

        addEvent({
          entityType: "system",
          category: "lifecycle",
          event: "activity_tracker_stopped",
          description: "Unified graph activity tracking stopped",
          severity: "info",
          metadata: {
            data: {
              unifiedSystem: true
            },
          },
        });

        logger.debug("ui", "Unified graph activity tracker stopped", {}, "GraphActivityTracker");
      }
    };
  }, [addEvent, eventSubscriptions.length]);

  return {
    // Expose any manual tracking methods if needed
    isTracking: trackingActiveRef.current,
  };
}
