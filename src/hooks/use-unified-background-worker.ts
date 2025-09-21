/**
 * Unified Background Worker Hook
 * Replaces the legacy background worker system with the new unified event system
 * Provides the same API for backward compatibility
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
  useEventBus,
  useWorkerPool,
  useTaskQueue,
  useTaskProgress
} from "@/lib/graph/events";
import type {
  ForceSimulationConfig,
  ForceSimulationNode,
  ForceSimulationLink,
  NodePosition
} from "@/lib/graph/events/enhanced-worker-types";
import type { EntityType, GraphNode, GraphEdge } from "@/lib/graph/types";
import type { ExpansionOptions } from "@/lib/entities";
import type { ExpansionSettings } from "@/lib/graph/types/expansion-settings";

// Zod schemas for worker message validation
const NodePositionSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
});

const ForceSimulationProgressSchema = z.object({
  type: z.literal("FORCE_SIMULATION_PROGRESS").optional(),
  requestId: z.string().optional(),
  messageType: z.string().optional(),
  alpha: z.number().optional(),
  iteration: z.number().optional(),
  nodeCount: z.number().optional(),
  linkCount: z.number().optional(),
  fps: z.number().optional(),
  progress: z.number().optional(),
  positions: z.array(NodePositionSchema).optional(),
});

const ForceSimulationCompleteSchema = z.object({
  type: z.literal("FORCE_SIMULATION_COMPLETE"),
  requestId: z.string().optional(),
  positions: z.array(NodePositionSchema),
  totalIterations: z.number(),
  finalAlpha: z.number(),
  reason: z.string(),
});

const DataFetchCompleteSchema = z.object({
  type: z.literal("DATA_FETCH_COMPLETE").optional(),
  requestId: z.string().optional(),
  nodeId: z.string().optional(),
  nodes: z.array(z.unknown()).optional(),
  edges: z.array(z.unknown()).optional(),
  statistics: z.unknown().optional(),
});

interface AnimationState {
  isRunning: boolean;
  isPaused: boolean;
  alpha: number;
  iteration: number;
  progress: number;
  fps: number;
  nodeCount: number;
  linkCount: number;
}

interface PerformanceMetrics {
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  frameCount: number;
  totalAnimationTime: number;
  averageResponseTime: number;
}

interface UseUnifiedBackgroundWorkerOptions {
  // Animation callbacks
  onPositionUpdate?: (positions: NodePosition[]) => void;
  onAnimationComplete?: (
    positions: NodePosition[],
    stats: { totalIterations: number; finalAlpha: number; reason: string }
  ) => void;
  onAnimationError?: (error: string) => void;

  // Data fetching callbacks
  onExpansionProgress?: (nodeId: string, progress: { completed: number; total: number; stage: string }) => void;
  onExpansionComplete?: (result: {
    requestId: string;
    nodes: GraphNode[];
    edges: GraphEdge[];
    statistics?: unknown
  }) => void;
  onExpansionError?: (nodeId: string, error: string) => void;

  // General options
  autoStart?: boolean;
  enableProgressThrottling?: boolean;
  progressThrottleMs?: number;
}

export function useUnifiedBackgroundWorker(options: UseUnifiedBackgroundWorkerOptions = {}) {
  const {
    onPositionUpdate,
    onAnimationComplete,
    onAnimationError,
    onExpansionComplete,
    onExpansionError,
    enableProgressThrottling = true,
    progressThrottleMs = 16 // ~60fps
  } = options;

  // Initialize unified event system
  const bus = useEventBus();
  const { workerPool, stats: workerStats } = useWorkerPool(bus, {
    size: 2,
    workerModule: new URL("../workers/background.worker.ts", import.meta.url).href
  });
  const { submitTask: submitQueueTask, stats: queueStats } = useTaskQueue(bus);

  // State management
  const [animationState, setAnimationState] = useState<AnimationState>({
    isRunning: false,
    isPaused: false,
    alpha: 1,
    iteration: 0,
    progress: 0,
    fps: 0,
    nodeCount: 0,
    linkCount: 0
  });

  const [nodePositions, setNodePositions] = useState<NodePosition[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    averageFPS: 0,
    minFPS: Infinity,
    maxFPS: 0,
    frameCount: 0,
    totalAnimationTime: 0,
    averageResponseTime: 0
  });

  // Refs for tracking
  const isAnimatingRef = useRef(false);
  const progressThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const animationStartTimeRef = useRef<number>(0);
  const currentTaskRef = useRef<string | null>(null);

  // Task progress tracking for current animation
  useTaskProgress(bus, currentTaskRef.current || "");

  // Event listeners for unified system
  useEffect(() => {
    logger.debug("worker", "Setting up unified worker event listeners");

    const unsubscribers: Array<() => void> = [];

    // Force simulation progress
    const forceProgressUnsub = bus.on("FORCE_SIMULATION_PROGRESS", (event) => {
      handleForceSimulationProgress(event.payload);
    });
    unsubscribers.push(() => { forceProgressUnsub(); });

    // Force simulation complete
    const forceCompleteUnsub = bus.on("FORCE_SIMULATION_COMPLETE", (event) => {
      handleForceSimulationComplete(event.payload);
    });
    unsubscribers.push(() => { forceCompleteUnsub(); });

    // Data fetch complete
    const dataCompleteUnsub = bus.on("DATA_FETCH_COMPLETE", (event) => {
      handleDataFetchComplete(event.payload);
    });
    unsubscribers.push(() => { dataCompleteUnsub(); });

    // Error handling
    const errorUnsub = bus.on("TASK_FAILED", (event) => {
      if (event.payload && typeof event.payload === "object" && "error" in event.payload) {
        handleError(String(event.payload.error));
      }
    });
    unsubscribers.push(() => { errorUnsub(); });

    return () => {
      unsubscribers.forEach(unsub => { unsub(); });

      // Clean up throttle
      if (progressThrottleRef.current) {
        clearTimeout(progressThrottleRef.current);
        progressThrottleRef.current = null;
      }
    };
  }, [bus]);

  // Event handlers
  const handleForceSimulationProgress = useCallback((payload: unknown) => {
    const validationResult = ForceSimulationProgressSchema.safeParse(payload);
    if (!validationResult.success) {
      logger.warn("worker", "Invalid force simulation progress payload", { payload, error: validationResult.error });
      return;
    }

    const { messageType, alpha, iteration, positions, fps, nodeCount, linkCount, progress } = validationResult.data;

    switch (messageType) {
      case "started":
        isAnimatingRef.current = true;
        animationStartTimeRef.current = Date.now();
        setAnimationState(prev => ({
          ...prev,
          isRunning: true,
          isPaused: false,
          nodeCount: nodeCount || 0,
          linkCount: linkCount || 0
        }));
        break;

      case "tick":
        if (positions && typeof alpha === "number" && typeof iteration === "number" && typeof progress === "number") {
          if (enableProgressThrottling && !progressThrottleRef.current) {
            setNodePositions(positions);
            onPositionUpdate?.(positions);

            setAnimationState(prev => ({
              ...prev,
              alpha,
              iteration,
              progress,
              fps: fps || prev.fps
            }));

            if (fps) {
              setPerformanceMetrics(prev => ({
                averageFPS: (prev.averageFPS * prev.frameCount + fps) / (prev.frameCount + 1),
                minFPS: Math.min(prev.minFPS, fps),
                maxFPS: Math.max(prev.maxFPS, fps),
                frameCount: prev.frameCount + 1,
                totalAnimationTime: Date.now() - animationStartTimeRef.current,
                averageResponseTime: prev.averageResponseTime
              }));
            }

            progressThrottleRef.current = setTimeout(() => {
              progressThrottleRef.current = null;
            }, progressThrottleMs);
          }
        }
        break;

      case "paused":
        setAnimationState(prev => ({ ...prev, isPaused: true }));
        break;

      case "resumed":
        setAnimationState(prev => ({ ...prev, isPaused: false }));
        break;
    }
  }, [onPositionUpdate, enableProgressThrottling, progressThrottleMs]);

  const handleForceSimulationComplete = useCallback((payload: unknown) => {
    const validationResult = ForceSimulationCompleteSchema.safeParse(payload);
    if (!validationResult.success) {
      logger.warn("worker", "Invalid force simulation complete payload", { payload, error: validationResult.error });
      return;
    }

    const { positions, totalIterations, finalAlpha, reason } = validationResult.data;

    isAnimatingRef.current = false;
    currentTaskRef.current = null;

    if (progressThrottleRef.current) {
      clearTimeout(progressThrottleRef.current);
      progressThrottleRef.current = null;
    }

    setNodePositions(positions);
    onPositionUpdate?.(positions);
    onAnimationComplete?.(positions, { totalIterations, finalAlpha, reason });

    setAnimationState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      progress: 1,
      alpha: finalAlpha
    }));

    setPerformanceMetrics(prev => ({
      ...prev,
      totalAnimationTime: Date.now() - animationStartTimeRef.current
    }));
  }, [onPositionUpdate, onAnimationComplete]);

  const handleDataFetchComplete = useCallback((payload: unknown) => {
    const validationResult = DataFetchCompleteSchema.safeParse(payload);
    if (!validationResult.success) {
      logger.warn("worker", "Invalid data fetch complete payload", { payload, error: validationResult.error });
      return;
    }

    const { requestId, nodes, edges, statistics } = validationResult.data;
    if (requestId && nodes && edges) {
      const validatedNodes = Array.isArray(nodes) && nodes.every((node): node is GraphNode =>
        typeof node === "object" && node !== null && "id" in node && "entityId" in node
      ) ? nodes : [];

      const validatedEdges = Array.isArray(edges) && edges.every((edge): edge is GraphEdge =>
        typeof edge === "object" && edge !== null && "id" in edge && "source" in edge && "target" in edge
      ) ? edges : [];

      onExpansionComplete?.({
        requestId,
        nodes: validatedNodes,
        edges: validatedEdges,
        statistics
      });
    }
  }, [onExpansionComplete]);

  const handleError = useCallback((error: string) => {
    logger.error("worker", "Unified worker error", { error });
    onAnimationError?.(error);
    onExpansionError?.("unknown", error);
  }, [onAnimationError, onExpansionError]);

  // Animation control methods
  const startAnimation = useCallback(async ({
    nodes,
    links,
    config,
    pinnedNodes
  }: {
    nodes: ForceSimulationNode[];
    links: ForceSimulationLink[];
    config?: ForceSimulationConfig;
    pinnedNodes?: Set<string>;
  }) => {
    if (nodes.length === 0) {
      logger.warn("worker", "Cannot start animation with no nodes");
      return;
    }

    if (isAnimatingRef.current) {
      logger.debug("worker", "Animation already running, skipping start request");
      return;
    }

    // Reset performance metrics
    setPerformanceMetrics({
      averageFPS: 0,
      minFPS: Infinity,
      maxFPS: 0,
      frameCount: 0,
      totalAnimationTime: 0,
      averageResponseTime: 0
    });

    try {
      const taskId = await submitQueueTask({
        id: `force-simulation-${Date.now().toString()}`,
        payload: {
          type: "FORCE_SIMULATION_START",
          nodes,
          links,
          config,
          pinnedNodes: pinnedNodes ? Array.from(pinnedNodes) : []
        },
        timeout: 300000 // 5 minutes
      });

      currentTaskRef.current = taskId;

      logger.debug("worker", "Unified animation started", {
        nodeCount: nodes.length,
        linkCount: links.length,
        pinnedCount: pinnedNodes?.size || 0,
        taskId
      });

      return taskId;
    } catch (error) {
      const errorMessage = `Failed to start animation: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("worker", errorMessage, { error });
      onAnimationError?.(errorMessage);
      return null;
    }
  }, [submitQueueTask, onAnimationError]);

  const stopAnimation = useCallback(async () => {
    if (!isAnimatingRef.current || !currentTaskRef.current) {
      logger.debug("worker", "No animation to stop");
      return;
    }

    try {
      await submitQueueTask({
        id: `force-simulation-stop-${Date.now().toString()}`,
        payload: {
          type: "FORCE_SIMULATION_STOP"
        }
      });

      isAnimatingRef.current = false;
      currentTaskRef.current = null;

      setAnimationState(prev => ({
        ...prev,
        isRunning: false,
        isPaused: false
      }));
    } catch (error) {
      logger.error("worker", "Failed to stop animation", { error });
    }
  }, [submitQueueTask]);

  const pauseAnimation = useCallback(async () => {
    if (animationState.isRunning && !animationState.isPaused) {
      try {
        await submitQueueTask({
          id: `force-simulation-pause-${Date.now().toString()}`,
          payload: {
            type: "FORCE_SIMULATION_PAUSE"
          }
        });
      } catch (error) {
        logger.error("worker", "Failed to pause animation", { error });
      }
    }
  }, [animationState.isRunning, animationState.isPaused, submitQueueTask]);

  const resumeAnimation = useCallback(async () => {
    if (animationState.isRunning && animationState.isPaused) {
      try {
        await submitQueueTask({
          id: `force-simulation-resume-${Date.now().toString()}`,
          payload: {
            type: "FORCE_SIMULATION_RESUME"
          }
        });
      } catch (error) {
        logger.error("worker", "Failed to resume animation", { error });
      }
    }
  }, [animationState.isRunning, animationState.isPaused, submitQueueTask]);

  const updateParameters = useCallback(async (config: Partial<ForceSimulationConfig>) => {
    if (animationState.isRunning) {
      try {
        await submitQueueTask({
          id: `force-simulation-update-${Date.now().toString()}`,
          payload: {
            type: "FORCE_SIMULATION_UPDATE_PARAMETERS",
            config
          }
        });
      } catch (error) {
        logger.error("worker", "Failed to update parameters", { error });
      }
    }
  }, [animationState.isRunning, submitQueueTask]);

  // Node expansion
  const expandNode = useCallback(async ({
    nodeId,
    entityId,
    entityType,
    options,
    expansionSettings
  }: {
    nodeId: string;
    entityId: string;
    entityType: EntityType;
    options?: ExpansionOptions;
    expansionSettings?: ExpansionSettings;
  }) => {
    try {
      const taskId = await submitQueueTask({
        id: `data-fetch-${nodeId}-${Date.now().toString()}`,
        payload: {
          type: "DATA_FETCH_EXPAND_NODE",
          nodeId,
          entityId,
          entityType,
          options,
          expansionSettings
        },
        timeout: 120000 // 2 minutes
      });

      logger.debug("worker", "Unified node expansion started", {
        nodeId,
        entityId,
        entityType,
        taskId
      });

      return taskId;
    } catch (error) {
      const errorMessage = `Failed to expand node: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("worker", errorMessage, { nodeId, error });
      onExpansionError?.(nodeId, errorMessage);
      return null;
    }
  }, [submitQueueTask, onExpansionError]);

  return {
    // State
    animationState,
    nodePositions,
    performanceMetrics,
    workerStats,
    queueStats,
    isWorkerReady: workerStats.totalWorkers > 0,
    isLoading: queueStats.processing,
    error: null, // Errors are handled via callbacks

    // Animation controls
    startAnimation,
    stopAnimation,
    pauseAnimation,
    resumeAnimation,
    updateParameters,

    // Data operations
    expandNode,

    // Worker management
    terminate: async () => {
      await workerPool.shutdown();
    },

    // Computed properties
    isIdle: !animationState.isRunning && !animationState.isPaused && !queueStats.processing,
    canPause: animationState.isRunning && !animationState.isPaused,
    canResume: animationState.isRunning && animationState.isPaused,
    canStop: animationState.isRunning || animationState.isPaused,

    // Performance insights
    performanceInsights: {
      ...performanceMetrics,
      isOptimal: performanceMetrics.averageFPS >= 30,
      hasFrameDrops: performanceMetrics.minFPS < 15,
      efficiency: performanceMetrics.frameCount > 0 ?
        (performanceMetrics.averageFPS / 60) * 100 : 0
    }
  };
}

// Export alias for compatibility with existing code
export const useBackgroundWorker = useUnifiedBackgroundWorker;