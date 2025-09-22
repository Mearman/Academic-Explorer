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
  useTaskQueue,
  useTaskProgress
} from "@/lib/graph/events";
import { getGlobalWorkerPool } from "@/lib/graph/worker-pool-singleton";
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
  id: z.string().optional(),
  type: z.literal("worker:force-simulation-progress").optional(),
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
  type: z.literal("worker:force-simulation-complete"),
  requestId: z.string().optional(),
  positions: z.array(NodePositionSchema),
  totalIterations: z.number(),
  finalAlpha: z.number(),
  reason: z.string(),
});

const ForceSimulationCompleteEnvelopeSchema = z.object({
  id: z.string().optional(),
  result: ForceSimulationCompleteSchema
});

const ForceSimulationControlAckSchema = z.object({
  type: z.literal("FORCE_SIMULATION_CONTROL_ACK"),
  action: z.string(),
  status: z.string().optional(),
  timestamp: z.number().optional()
}).passthrough();

const ForceSimulationControlAckEnvelopeSchema = z.object({
  id: z.string().optional(),
  result: ForceSimulationControlAckSchema
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

  // Use global worker pool singleton to prevent multiple instances
  const { bus, workerPool } = getGlobalWorkerPool();
  const workerStats = workerPool.getStats();
  const {
    submitTask: submitQueueTask,
    cancelTask: cancelQueueTask,
    stats: queueStats
  } = useTaskQueue(bus, { maxConcurrency: 2 }); // Allow 2 concurrent tasks for immediate updates

  // Get the worker module path from the global pool
  const workerModulePath = new URL("../workers/background.worker.ts", import.meta.url).href;

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
  const nodePositionsRef = useRef<NodePosition[]>([]);
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
  const activeTaskIdsRef = useRef<Set<string>>(new Set());

  const addActiveTask = useCallback((taskId: string | null | undefined) => {
    if (!taskId) return;
    activeTaskIdsRef.current.add(taskId);
  }, []);

  const removeActiveTask = useCallback((taskId: string | null | undefined) => {
    if (!taskId) return;
    activeTaskIdsRef.current.delete(taskId);
  }, []);

  // Task progress tracking for current animation
  useTaskProgress(bus, currentTaskRef.current || "");

  // Event handlers
  const handleForceSimulationProgress = useCallback((payload: unknown) => {
    // DEBUG: Remove in production
    const validationResult = ForceSimulationProgressSchema.safeParse(payload);
    if (!validationResult.success) {
      logger.warn("worker", "Invalid force simulation progress payload", { payload, error: validationResult.error });
      return;
    }

    const { messageType, alpha, iteration, positions, fps, nodeCount, linkCount, progress, id } = validationResult.data;

    if (id) {
      addActiveTask(id);
    }

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
        if (Array.isArray(positions) && typeof alpha === "number" && typeof iteration === "number" && typeof progress === "number") {
          if (true) { // TEMP: disable throttling
            setNodePositions(positions);
            nodePositionsRef.current = positions.map(pos => ({ ...pos }));
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
  }, [addActiveTask, onPositionUpdate, enableProgressThrottling, progressThrottleMs]);

  const handleForceSimulationComplete = useCallback((payload: unknown) => {
    const ackResult = ForceSimulationControlAckEnvelopeSchema.safeParse(payload);
    if (ackResult.success && ackResult.data.result.type === "FORCE_SIMULATION_CONTROL_ACK") {
      const ackId = ackResult.data.id;
      if (ackId) {
        removeActiveTask(ackId);
        if (currentTaskRef.current === ackId) {
          currentTaskRef.current = null;
        }
      }
      return;
    }

    const envelopeResult = ForceSimulationCompleteEnvelopeSchema.safeParse(payload);
    if (!envelopeResult.success) {
      logger.warn("worker", "Invalid force simulation complete payload", { payload, error: envelopeResult.error });
      return;
    }

    const { id, result } = envelopeResult.data;

    if (id) {
      removeActiveTask(id);
      if (currentTaskRef.current === id) {
        currentTaskRef.current = null;
      }
    }

    const { positions, totalIterations, finalAlpha, reason } = result;

    isAnimatingRef.current = false;
    if (!id) {
      currentTaskRef.current = null;
    }

    if (progressThrottleRef.current) {
      clearTimeout(progressThrottleRef.current);
      progressThrottleRef.current = null;
    }

    if (Array.isArray(positions)) {
      setNodePositions(positions);
      nodePositionsRef.current = positions.map(pos => ({ ...pos }));
      onPositionUpdate?.(positions);
      onAnimationComplete?.(positions, { totalIterations, finalAlpha, reason });
    }

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
  }, [onPositionUpdate, onAnimationComplete, removeActiveTask]);

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

  // Event listeners for unified system
  useEffect(() => {
    logger.debug("worker", "Setting up unified worker event listeners");

    const unsubscribers: Array<() => void> = [];

    const forceProgressUnsub = bus.on("TASK_PROGRESS", (event) => {
      const payload = event.payload as Record<string, unknown> | undefined;
      if (!payload) return;

      const taskId = typeof payload.id === "string" ? payload.id : undefined;
      if (taskId && !activeTaskIdsRef.current.has(taskId)) {
        return;
      }

      if (payload && typeof payload === "object" && "type" in payload && payload.type === "worker:force-simulation-progress") {
        handleForceSimulationProgress(payload);
      }
    });
    unsubscribers.push(() => { forceProgressUnsub(); });

    const forceCompleteUnsub = bus.on("TASK_SUCCESS", (event) => {
      const payload = event.payload as Record<string, unknown> | undefined;
      if (!payload || typeof payload !== "object" || !("result" in payload)) {
        return;
      }

      const taskId = typeof payload.id === "string" ? payload.id : undefined;
      if (taskId && !activeTaskIdsRef.current.has(taskId)) {
        return;
      }

      handleForceSimulationComplete(payload);
    });
    unsubscribers.push(() => { forceCompleteUnsub(); });

    const dataCompleteUnsub = bus.on("DATA_FETCH_COMPLETE", (event) => {
      handleDataFetchComplete(event.payload);
    });
    unsubscribers.push(() => { dataCompleteUnsub(); });

    const errorUnsub = bus.on("TASK_FAILED", (event) => {
      if (event.payload && typeof event.payload === "object" && "error" in event.payload) {
        const taskPayload = event.payload as { id?: string; error?: unknown };
        const taskId = typeof taskPayload.id === "string" ? taskPayload.id : undefined;
        if (taskId && !activeTaskIdsRef.current.has(taskId)) {
          return;
        }
        if (taskId) {
          removeActiveTask(taskId);
        }
        handleError(String(taskPayload.error));
      }
    });
    unsubscribers.push(() => { errorUnsub(); });

    const debugMessageUnsub = bus.on("TASK_PROGRESS", (event) => {
      const payload = event.payload;
      if (payload && typeof payload === "object" && "type" in payload && payload.type === "debug") {
        // Debug channel - no-op
      }
    });
    unsubscribers.push(() => { debugMessageUnsub(); });

    return () => {
      unsubscribers.forEach(unsub => { unsub(); });

      if (progressThrottleRef.current) {
        clearTimeout(progressThrottleRef.current);
        progressThrottleRef.current = null;
      }
    };
  }, [bus, handleForceSimulationProgress, handleForceSimulationComplete, handleDataFetchComplete, handleError, removeActiveTask]);

  const waitForTaskCompletion = useCallback((taskId: string) => {
    let cleanup = () => {};

    const promise = new Promise<void>((resolve, reject) => {
      let settled = false;

      cleanup = () => {
        if (settled) return;
        settled = true;
        completeUnsub();
        failedUnsub();
        cancelledUnsub();
      };

      const handleCompletion = (event: { payload?: unknown }) => {
        if (settled) return;
        const payload = event.payload;
        if (payload && typeof payload === "object" && "id" in payload && (payload as { id: string }).id === taskId) {
          cleanup();
          resolve();
        }
      };

      const handleFailure = (event: { payload?: unknown }) => {
        if (settled) return;
        const payload = event.payload;
        if (payload && typeof payload === "object" && "id" in payload && (payload as { id: string }).id === taskId) {
          const errorMessage = (payload as { error?: string }).error ?? "Task failed";
          cleanup();
          reject(new Error(errorMessage));
        }
      };

      const handleCancelled = (event: { payload?: unknown }) => {
        if (settled) return;
        const payload = event.payload;
        if (payload && typeof payload === "object" && "id" in payload && (payload as { id: string }).id === taskId) {
          cleanup();
          resolve();
        }
      };

      const completeUnsub = bus.on("TASK_COMPLETED", handleCompletion);
      const failedUnsub = bus.on("TASK_FAILED", handleFailure);
      const cancelledUnsub = bus.on("TASK_CANCELLED", handleCancelled);
    });

    return {
      promise,
      cleanup: () => cleanup()
    };
  }, [bus]);

  // Animation control methods
  const stopAnimation = useCallback(async () => {
    if (!currentTaskRef.current) {
      logger.debug("worker", "No animation task to stop");
      return;
    }

    const stopTaskId = `force-simulation-stop-${Date.now().toString()}`;
    addActiveTask(stopTaskId);
    try {
      await submitQueueTask({
        id: stopTaskId,
        payload: {
          type: "FORCE_SIMULATION_STOP"
        },
        workerModule: workerModulePath
      });

      const { promise: stopPromise } = waitForTaskCompletion(stopTaskId);

      try {
        await stopPromise;
      } catch (stopError) {
        logger.error("worker", "Stop animation task failed", { stopTaskId, error: stopError });
      }

      removeActiveTask(stopTaskId);

      const previousTaskId = currentTaskRef.current;
      if (previousTaskId) {
        removeActiveTask(previousTaskId);
      }
      isAnimatingRef.current = false;
      currentTaskRef.current = null;

      setAnimationState(prev => ({
        ...prev,
        isRunning: false,
        isPaused: false
      }));
    } catch (error) {
      removeActiveTask(stopTaskId);
      logger.error("worker", "Failed to stop animation", { error });
    }
  }, [submitQueueTask, workerModulePath, waitForTaskCompletion, removeActiveTask, addActiveTask]);

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
    if (!nodes || nodes.length === 0) {
      logger.warn("worker", "Cannot start animation with no nodes");
      return;
    }

    const previousTaskId = currentTaskRef.current;
    if (previousTaskId) {
      logger.debug("worker", "Cancelling existing animation before starting new one", {
        currentTaskId: previousTaskId
      });

      const { promise: completionPromise, cleanup: cleanupWait } = waitForTaskCompletion(previousTaskId);
      const cancelled = cancelQueueTask(previousTaskId);
      if (cancelled) {
        try {
          await completionPromise;
        } catch (cancelError) {
          logger.error("worker", "Previous animation cancellation failed", {
            taskId: previousTaskId,
            error: cancelError
          });
        }
        removeActiveTask(previousTaskId);
      } else {
        cleanupWait();
      }

      isAnimatingRef.current = false;
      currentTaskRef.current = null;
    }

    // Merge incoming nodes with latest known positions so we preserve the current layout state
    const positionMap = new Map(nodePositionsRef.current.map(pos => [pos.id, pos]));
    const seededNodes = nodes.map((node) => {
      const existingPosition = positionMap.get(node.id);
      if (!existingPosition) {
        return node;
      }

      const seededNode: ForceSimulationNode = {
        ...node,
        x: existingPosition.x,
        y: existingPosition.y
      };

      if (typeof seededNode.fx === "number") {
        seededNode.fx = existingPosition.x;
      }
      if (typeof seededNode.fy === "number") {
        seededNode.fy = existingPosition.y;
      }

      return seededNode;
    });

    // Reset performance metrics for the fresh run
    setPerformanceMetrics({
      averageFPS: 0,
      minFPS: Infinity,
      maxFPS: 0,
      frameCount: 0,
      totalAnimationTime: 0,
      averageResponseTime: 0
    });

    try {
      const taskId = `force-simulation-${Date.now().toString()}`;
      addActiveTask(taskId);
      const submittedTaskId = await submitQueueTask({
        id: taskId,
        payload: {
          type: "FORCE_SIMULATION_START",
          nodes: seededNodes,
          links,
          config,
          pinnedNodes: pinnedNodes ? Array.from(pinnedNodes) : []
        },
        workerModule: workerModulePath,
        timeout: 300000 // 5 minutes
      });

      currentTaskRef.current = submittedTaskId;

      logger.debug("worker", "Unified animation started", {
        nodeCount: seededNodes.length,
        linkCount: links?.length || 0,
        pinnedCount: pinnedNodes?.size || 0,
        taskId: submittedTaskId
      });

      return submittedTaskId;
    } catch (error) {
      removeActiveTask(taskId);
      const errorMessage = `Failed to start animation: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("worker", errorMessage, { error });
      onAnimationError?.(errorMessage);
      return null;
    }
  }, [submitQueueTask, cancelQueueTask, nodePositionsRef, workerModulePath, waitForTaskCompletion, addActiveTask, removeActiveTask, onAnimationError]);

  const pauseAnimation = useCallback(async () => {
    if (animationState.isRunning && !animationState.isPaused) {
      const taskId = `force-simulation-pause-${Date.now().toString()}`;
      addActiveTask(taskId);
      try {
        await submitQueueTask({
          id: taskId,
          payload: {
            type: "FORCE_SIMULATION_PAUSE"
          },
          workerModule: workerModulePath
        });
      } catch (error) {
        removeActiveTask(taskId);
        logger.error("worker", "Failed to pause animation", { error });
      }
    }
  }, [animationState.isRunning, animationState.isPaused, submitQueueTask, addActiveTask]);

  const resumeAnimation = useCallback(async () => {
    if (animationState.isRunning && animationState.isPaused) {
      const taskId = `force-simulation-resume-${Date.now().toString()}`;
      addActiveTask(taskId);
      try {
        await submitQueueTask({
          id: taskId,
          payload: {
            type: "FORCE_SIMULATION_RESUME"
          },
          workerModule: workerModulePath
        });
      } catch (error) {
        removeActiveTask(taskId);
        logger.error("worker", "Failed to resume animation", { error });
      }
    }
  }, [animationState.isRunning, animationState.isPaused, submitQueueTask, addActiveTask]);

  const updateParameters = useCallback(async (config: Partial<ForceSimulationConfig>) => {
    if (animationState.isRunning) {
      const taskId = `force-simulation-update-${Date.now().toString()}`;
      addActiveTask(taskId);
      try {
        await submitQueueTask({
          id: taskId,
          payload: {
            type: "FORCE_SIMULATION_UPDATE_PARAMETERS",
            config
          },
          workerModule: workerModulePath
        });
      } catch (error) {
        removeActiveTask(taskId);
        logger.error("worker", "Failed to update parameters", { error });
      }
    }
  }, [animationState.isRunning, submitQueueTask, addActiveTask]);

  const reheatAnimation = useCallback(async ({
    nodes,
    links,
    config,
    pinnedNodes,
    alpha = 0.5
  }: {
    nodes: ForceSimulationNode[];
    links: ForceSimulationLink[];
    config?: ForceSimulationConfig;
    pinnedNodes?: Set<string>;
    alpha?: number;
  }) => {
    if (!nodes || nodes.length === 0) {
      logger.warn("worker", "Cannot reheat animation with no nodes");
      return;
    }

    try {
      const taskId = `force-simulation-reheat-${Date.now().toString()}`;
      addActiveTask(taskId);
      console.log("🎯 reheatAnimation payload creation:", {
        taskId,
        linkCount: links.length,
        nodeCount: nodes.length,
        alpha,
        linkDetails: links.slice(0, 3).map(link => ({ id: link.id, source: link.source, target: link.target }))
      });

      const resultTaskId = await submitQueueTask({
        id: taskId,
        payload: {
          type: "FORCE_SIMULATION_REHEAT",
          nodes,
          links,
          config,
          pinnedNodes: pinnedNodes ? Array.from(pinnedNodes) : [],
          alpha
        },
        workerModule: workerModulePath,
        timeout: 300000 // 5 minutes
      });

      logger.debug("worker", "Unified animation reheat started", {
        nodeCount: nodes?.length || 0,
        linkCount: links?.length || 0,
        pinnedCount: pinnedNodes?.size || 0,
        alpha,
        taskId
      });

      if (resultTaskId && resultTaskId !== taskId) {
        addActiveTask(resultTaskId);
      }

      return resultTaskId ?? taskId;
    } catch (error) {
      removeActiveTask(taskId);
      const errorMessage = `Failed to reheat animation: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("worker", errorMessage, { error });
      onAnimationError?.(errorMessage);
      return null;
    }
  }, [submitQueueTask, addActiveTask, onAnimationError]);

  // Update simulation links dynamically during running simulation
  const updateSimulationLinks = useCallback(async ({
    links,
    alpha = 1.0
  }: {
    links: ForceSimulationLink[];
    alpha?: number;
  }) => {
    if (!links || links.length === 0) {
      logger.warn("worker", "Cannot update simulation with no links");
      return;
    }

    try {
      const taskId = `force-simulation-update-links-${Date.now().toString()}`;
      addActiveTask(taskId);
      console.log("🔗 updateSimulationLinks using HIGH PRIORITY task for immediate execution:", {
        taskId,
        linkCount: links.length,
        alpha,
        linkDetails: links.slice(0, 3).map(link => ({ id: link.id, source: link.source, target: link.target }))
      });

      // Use HIGH PRIORITY (100) to ensure immediate execution even with busy workers
      const resultTaskId = await submitQueueTask({
        id: taskId,
        payload: {
          type: "FORCE_SIMULATION_UPDATE_LINKS",
          links,
          alpha
        },
        workerModule: workerModulePath,
        priority: 100, // HIGH PRIORITY for immediate execution
        timeout: 300000 // 5 minutes - same as other operations
      });

      logger.debug("worker", "High priority simulation links update started", {
        linkCount: links?.length || 0,
        alpha,
        priority: 100,
        taskId: resultTaskId
      });

      if (resultTaskId && resultTaskId !== taskId) {
        addActiveTask(resultTaskId);
      }

      console.log("🔗 HIGH PRIORITY TASK SUBMITTED - should execute immediately!");
      return resultTaskId;
    } catch (error: unknown) {
      removeActiveTask(taskId);
      const errorMessage = `Failed to update simulation links: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("worker", errorMessage, { error });
      onAnimationError?.(errorMessage);
      return null;
    }
  }, [submitQueueTask, addActiveTask, onAnimationError]);

  const updateSimulationNodes = useCallback(async ({
    nodes,
    pinnedNodes,
    alpha = 1.0
  }: {
    nodes: ForceSimulationNode[];
    pinnedNodes?: Set<string> | string[];
    alpha?: number;
  }) => {
    if (!nodes || nodes.length === 0) {
      logger.warn("worker", "Cannot update simulation with no nodes");
      return;
    }

    try {
      const taskId = `force-simulation-update-nodes-${Date.now().toString()}`;
      addActiveTask(taskId);

      const pinnedArray = Array.isArray(pinnedNodes)
        ? pinnedNodes
        : Array.from(pinnedNodes ?? []);

      const resultTaskId = await submitQueueTask({
        id: taskId,
        payload: {
          type: "FORCE_SIMULATION_UPDATE_NODES",
          nodes,
          pinnedNodes: pinnedArray,
          alpha
        },
        workerModule: workerModulePath,
        priority: 100,
        timeout: 300000
      });

      logger.debug("worker", "High priority simulation nodes update started", {
        nodeCount: nodes.length,
        pinnedCount: pinnedArray.length,
        alpha,
        priority: 100,
        taskId: resultTaskId ?? taskId
      });

      if (resultTaskId && resultTaskId !== taskId) {
        addActiveTask(resultTaskId);
      }

      return resultTaskId;
    } catch (error) {
      removeActiveTask(taskId);
      const errorMessage = `Failed to update simulation nodes: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("worker", errorMessage, { error });
      onAnimationError?.(errorMessage);
      return null;
    }
  }, [submitQueueTask, addActiveTask, onAnimationError]);

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
        workerModule: workerModulePath,
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
    reheatAnimation,
    updateSimulationLinks,
    updateSimulationNodes,

    // Data operations
    expandNode,

    // Worker management
    terminate: () => {
      workerPool.shutdown();
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
