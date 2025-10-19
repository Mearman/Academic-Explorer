/**
 * Animated Layout Provider Component
 * Provides animated layout functionality to existing graph components
 * Can be dropped into existing graph implementations
 */

import React, { useEffect, useMemo, useRef, useCallback } from "react";
import {
  animatedGraphStore,
  useRestartRequested,
  useClearRestartRequest,
} from "@/stores/animated-graph-store";
import { logger } from "@academic-explorer/utils/logger";
import { AnimatedLayoutContext } from "./animated-layout-context";
import { useReactFlow } from "@xyflow/react";
import { useEventBus } from "@/hooks/use-unified-event-system";
import { useUnifiedExecutionWorker } from "@/hooks/use-unified-execution-worker";

// Common constants
const GRAPH_LOGGER_NAME = "graph";
const EVENT_BULK_NODES_ADDED = "graph:bulk-nodes-added";
const EVENT_BULK_EDGES_ADDED = "graph:bulk-edges-added";
const EVENT_NODE_ADDED = "graph:node-added";

interface AnimatedLayoutProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
  onLayoutChange?: () => void;
  containerDimensions?: { width: number; height: number };
  autoStartOnNodeChange?: boolean;
}

export const AnimatedLayoutProvider: React.FC<AnimatedLayoutProviderProps> = ({
  children,
  enabled = true,
  onLayoutChange,
  autoStartOnNodeChange = false,
}) => {
  // Unified event bus for cross-component communication
  const eventBus = useEventBus();

  // Use stable selector to prevent infinite loops in React 19
  const useAnimation = animatedGraphStore((state) => state.useAnimatedLayout);

  // ReactFlow hooks for node tracking
  const { getNodes, getEdges } = useReactFlow();

  // Track previous node/edge counts for change detection
  const prevNodeCountRef = useRef(0);
  const prevEdgeCountRef = useRef(0);
  const autoTriggerTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Communication for restart requests from components outside this provider
  const restartRequested = useRestartRequested();
  const clearRestartRequest = useClearRestartRequest();

  // Use the unified execution worker for animation
  const unifiedWorker = useUnifiedExecutionWorker(
    onLayoutChange ? { onPositionUpdate: onLayoutChange } : {},
  );

  // Access properties individually with type assertions to avoid unsafe assignments
  const animationState = unifiedWorker.animationState as {
    isRunning: boolean;
    isPaused: boolean;
    alpha: number;
    iteration: number;
    progress: number;
    fps: number;
    nodeCount: number;
    linkCount: number;
  };
  const isWorkerReady = unifiedWorker.isWorkerReady as boolean;
  const _startAnimation = unifiedWorker.startAnimation;
  const { stopAnimation } = unifiedWorker;
  const { pauseAnimation } = unifiedWorker;
  const { resumeAnimation } = unifiedWorker;
  const _reheatAnimation = unifiedWorker.reheatAnimation;
  const _updateSimulationParameters = unifiedWorker.updateParameters;
  const { canPause } = unifiedWorker;
  const { canResume } = unifiedWorker;
  const { canStop } = unifiedWorker;
  const { isIdle } = unifiedWorker;

  // Extract animation state properties safely
  const { isRunning } = animationState;
  const { isPaused } = animationState;
  const { alpha } = animationState;
  const { iteration } = animationState;
  const { progress } = animationState;
  const { fps } = animationState;

  const isAnimating = isRunning && !isPaused;

  // Create layout management functions with mock implementations
  // These functions expect different parameters than the unified worker provides
  const applyLayout = useCallback(() => {
    logger.debug(GRAPH_LOGGER_NAME, "Apply layout called but not implemented");
  }, []);

  const stopLayout = useCallback(() => {
    void stopAnimation();
  }, [stopAnimation]);

  const pauseLayout = useCallback(() => {
    void pauseAnimation();
  }, [pauseAnimation]);

  const resumeLayout = useCallback(() => {
    void resumeAnimation();
  }, [resumeAnimation]);

  const reheatLayout = useCallback(() => {
    logger.debug(GRAPH_LOGGER_NAME, "Reheat layout called but not implemented");
  }, []);

  const updateParameters = useCallback((params: unknown) => {
    logger.debug(GRAPH_LOGGER_NAME, "Update parameters called", { params });
  }, []);

  const restartLayout = useCallback(() => {
    logger.debug(
      GRAPH_LOGGER_NAME,
      "Restart layout called but not implemented",
    );
  }, []);
  const canRestart = isIdle;

  // Auto-start animation when significant node changes occur
  useEffect(() => {
    if (!autoStartOnNodeChange || !enabled || !useAnimation || !isWorkerReady) {
      return;
    }

    const checkNodeChanges = () => {
      const currentNodes = getNodes();
      const currentEdges = getEdges();
      const currentNodeCount = currentNodes.length;
      const currentEdgeCount = currentEdges.length;

      const nodeChange = currentNodeCount - prevNodeCountRef.current;
      const edgeChange = currentEdgeCount - prevEdgeCountRef.current;

      logger.debug(
        GRAPH_LOGGER_NAME,
        "Auto-trigger: checking node/edge changes",
        {
          prevNodeCount: prevNodeCountRef.current,
          currentNodeCount,
          nodeChange,
          prevEdgeCount: prevEdgeCountRef.current,
          currentEdgeCount,
          edgeChange,
          isRunning,
        },
      );

      // Trigger if any node/edge changes occurred (including removals)
      if (nodeChange !== 0 || edgeChange !== 0) {
        logger.debug(
          GRAPH_LOGGER_NAME,
          "Auto-trigger: node/edge changes detected",
          {
            nodeChange,
            edgeChange,
            action: isRunning ? "reheat" : "start",
          },
        );

        if (isRunning) {
          // If simulation is already running, reheat it (reset alpha)
          reheatLayout();
        } else {
          // If simulation is not running, start it
          applyLayout();
        }
      }

      // Update previous counts
      prevNodeCountRef.current = currentNodeCount;
      prevEdgeCountRef.current = currentEdgeCount;
    };

    // Debounce the check to avoid too frequent triggers
    if (autoTriggerTimeoutRef.current) {
      clearTimeout(autoTriggerTimeoutRef.current);
    }

    autoTriggerTimeoutRef.current = setTimeout(checkNodeChanges, 500);

    return () => {
      if (autoTriggerTimeoutRef.current) {
        clearTimeout(autoTriggerTimeoutRef.current);
      }
    };
  }, [
    autoStartOnNodeChange,
    enabled,
    useAnimation,
    isWorkerReady,
    isRunning,
    getNodes,
    getEdges,
    applyLayout,
    reheatLayout,
  ]);

  // Listen for restart requests from components outside this provider
  useEffect(() => {
    if (restartRequested && enabled && useAnimation && isWorkerReady) {
      logger.debug(
        "graph",
        "Restart request received from external component",
        {
          enabled,
          useAnimation,
          isWorkerReady,
          isRunning,
        },
      );

      // Clear the request flag first to prevent multiple triggers
      clearRestartRequest();

      if (isRunning) {
        reheatLayout();
      } else {
        restartLayout();
      }
    }
  }, [
    restartRequested,
    enabled,
    useAnimation,
    isWorkerReady,
    isRunning,
    restartLayout,
    reheatLayout,
    clearRestartRequest,
  ]);

  // Listen for graph events for immediate auto-trigger
  useEffect(() => {
    if (!autoStartOnNodeChange || !enabled || !useAnimation || !isWorkerReady) {
      return;
    }

    const handleGraphEvent = (event: {
      entityType: string;
      payload?: unknown;
    }) => {
      const { entityType: eventType } = event;

      // Only trigger on significant node/edge addition events
      if (
        eventType === EVENT_BULK_NODES_ADDED ||
        eventType === EVENT_BULK_EDGES_ADDED ||
        (eventType === EVENT_NODE_ADDED && Math.random() < 0.1) // Throttle single node additions
      ) {
        logger.debug(GRAPH_LOGGER_NAME, "Auto-trigger: graph event received", {
          eventType,
          action: isRunning ? "reheat" : "start",
        });

        // Small delay to allow ReactFlow to update
        setTimeout(() => {
          if (isRunning) {
            reheatLayout();
          } else {
            applyLayout();
          }
        }, 100);
      }
    };

    const eventType = "graph:auto-trigger";
    // Use unified event bus for custom event types
    const handler = (event: { payload?: unknown }) => {
      if (
        event.payload &&
        typeof event.payload === "object" &&
        "type" in event.payload &&
        typeof event.payload.type === "string"
      ) {
        handleGraphEvent({
          entityType: event.payload.type,
          payload:
            "payload" in event.payload ? event.payload.payload : undefined,
        });
      }
    };

    const _listenerId = eventBus.on(eventType, handler);

    return () => {
      eventBus.off(eventType, handler);
    };
  }, [
    autoStartOnNodeChange,
    enabled,
    useAnimation,
    isWorkerReady,
    isRunning,
    applyLayout,
    reheatLayout,
    eventBus,
  ]);
  // Initial trigger: DISABLED - causing restart loops
  // Manual animation start via Start button is preferred
  // useEffect(() => {
  // 	if (!enabled || !useAnimation || !isWorkerReady || isRunning) {
  // 		return;
  // 	}

  // 	const currentNodes = getNodes();

  // 	// Start animation if we have nodes but animation isn't running
  // 	if (currentNodes.length > 0) {
  // 		setTimeout(() => {
  // 			applyLayout();
  // 		}, 500); // Small delay to ensure everything is ready
  // 	}
  // }, [enabled, useAnimation, isWorkerReady, isRunning, getNodes, applyLayout]);

  // Separate handler for bulk expansion events (independent of autoStartOnNodeChange)
  useEffect(() => {
    if (!enabled || !useAnimation || !isWorkerReady) {
      return;
    }

    const handleExpansionEvent = (event: {
      entityType: string;
      payload?: unknown;
    }) => {
      const { entityType: eventType } = event;

      // Only respond to bulk expansion events, not individual node/position changes
      if (
        eventType === EVENT_BULK_NODES_ADDED ||
        eventType === EVENT_BULK_EDGES_ADDED
      ) {
        logger.debug(
          GRAPH_LOGGER_NAME,
          "Bulk expansion detected during simulation",
          {
            eventType,
            isRunning,
            action: isRunning ? "reheat" : "start",
          },
        );

        // Small delay to allow ReactFlow to update
        setTimeout(() => {
          if (isRunning) {
            // During simulation: reheat alpha to apply new edge forces
            logger.debug(
              GRAPH_LOGGER_NAME,
              "Reheating simulation for new edges",
            );
            reheatLayout();
          } else {
            // Not running: start new simulation with expanded graph
            logger.debug(
              GRAPH_LOGGER_NAME,
              "Starting simulation with expanded graph",
            );
            applyLayout();
          }
        }, 100);
      }
    };

    // Listen directly for bulk graph events
    const bulkNodesHandler = (event: { payload?: unknown }) => {
      handleExpansionEvent({
        entityType: EVENT_BULK_NODES_ADDED,
        payload: event.payload,
      });
    };

    const bulkEdgesHandler = (event: { payload?: unknown }) => {
      handleExpansionEvent({
        entityType: EVENT_BULK_EDGES_ADDED,
        payload: event.payload,
      });
    };

    const _bulkNodesListenerId = eventBus.on(
      EVENT_BULK_NODES_ADDED,
      bulkNodesHandler,
    );
    const _bulkEdgesListenerId = eventBus.on(
      EVENT_BULK_EDGES_ADDED,
      bulkEdgesHandler,
    );

    return () => {
      eventBus.off(EVENT_BULK_NODES_ADDED, bulkNodesHandler);
      eventBus.off(EVENT_BULK_EDGES_ADDED, bulkEdgesHandler);
    };
  }, [
    enabled,
    useAnimation,
    isWorkerReady,
    isRunning,
    applyLayout,
    reheatLayout,
    eventBus,
  ]);

  // No listener here - moved to GraphNavigation for store access

  // Create stable context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      // State
      isAnimating,
      isRunning,
      isWorkerReady,
      isPaused,
      progress,
      alpha,
      iteration,
      fps,
      performanceStats: {
        averageFPS: fps || 0,
        minFPS: fps || 0,
        maxFPS: fps || 0,
        frameCount: iteration || 0,
      },
      useAnimation,

      // Actions
      applyLayout,
      restartLayout,
      stopLayout,
      pauseLayout,
      resumeLayout,
      reheatLayout,
      updateParameters,

      // Computed properties
      canPause,
      canResume,
      canStop,
      canRestart,
    }),
    [
      isAnimating,
      isRunning,
      isWorkerReady,
      isPaused,
      progress,
      alpha,
      iteration,
      fps,
      useAnimation,
      applyLayout,
      restartLayout,
      stopLayout,
      pauseLayout,
      resumeLayout,
      reheatLayout,
      updateParameters,
      canPause,
      canResume,
      canStop,
      canRestart,
    ],
  );

  logger.debug(GRAPH_LOGGER_NAME, "AnimatedLayoutProvider render", {
    enabled,
    useAnimation,
    isWorkerReady,
    isRunning,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const animatedStoreState = animatedGraphStore.getState();
      (
        window as Window & { __animatedGraphDebug?: unknown }
      ).__animatedGraphDebug = {
        isRunning,
        isAnimating,
        isWorkerReady,
        useAnimation,
        animationHistoryLength: animatedStoreState.animationHistory.length,
        restartRequested: animatedStoreState.restartRequested,
      };
    }
  }, [isRunning, isAnimating, isWorkerReady, useAnimation]);

  return (
    <AnimatedLayoutContext.Provider value={contextValue}>
      {children}
    </AnimatedLayoutContext.Provider>
  );
};
