/**
 * Unified Execution Worker Hook
 * Provides the same API as the background worker but works with or without workers
 * Automatically falls back to main thread execution when workers are not available
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { logger } from "@academic-explorer/utils/logger";
import { createLocalEventBus } from "@academic-explorer/graph";
// import { useUnifiedTaskSystem } from "@academic-explorer/graph"; // Disabled - using stub implementation
import type {
  ForceSimulationConfig,
  ForceSimulationNode
} from "@academic-explorer/graph";
import type { SimulationLink, NodePosition } from "@academic-explorer/simulation/types";
import type { GraphNode, GraphEdge } from "@academic-explorer/graph";

// Type guards for safe event handling
function isEventWithPayload(event: unknown): event is { payload: Record<string, unknown> } {
  return typeof event === "object" &&
         event !== null &&
         "payload" in event &&
         typeof (event as { payload: unknown }).payload === "object" &&
         (event as { payload: unknown }).payload !== null;
}

function isPayloadWithResult(payload: Record<string, unknown>): payload is { result: unknown } {
  return "result" in payload;
}

function isPayloadWithError(payload: Record<string, unknown>): payload is { error: unknown; id?: string } {
  return "error" in payload;
}

// Reuse schemas from the original hook
const NodePositionSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
});

const ForceSimulationProgressSchema = z.object({
  id: z.string().optional(),
  entityType: z.literal("worker:force-simulation-progress").optional(),
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
  entityType: z.literal("worker:force-simulation-complete"),
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
  entityType: z.literal("FORCE_SIMULATION_CONTROL_ACK"),
  action: z.string(),
  status: z.string().optional(),
  timestamp: z.number().optional()
}).strict();

const ForceSimulationControlAckEnvelopeSchema = z.object({
  id: z.string().optional(),
  result: ForceSimulationControlAckSchema
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

interface UseUnifiedExecutionWorkerOptions {
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

  // Execution options
  executionMode?: "auto" | "worker" | "main-thread";
  enableWorkerFallback?: boolean;
  maxConcurrency?: number;
  progressThrottleMs?: number;
}

// TaskSystem interface and related types
interface TaskSubmission {
  id: string;
  payload: TaskPayload;
  priority?: number;
  timeout?: number;
}

interface TaskPayload {
  entityType: string;
  nodes?: ForceSimulationNode[];
  links?: SimulationLink[];
  config?: ForceSimulationConfig;
  pinnedNodes?: string[];
  alpha?: number;
}

interface SystemStats {
  queueLength: number;
  activeTasks: number;
  processing: boolean;
  maxConcurrency: number;
  strategyMode: string;
  supportsWorkers: boolean;
  initialized: boolean;
}

interface _TaskSystem {
  submitTask(task: TaskSubmission): Promise<string>;
  cancelTask(taskId: string): Promise<void>;
  getExecutionMode(): string;
  getStats(): Promise<SystemStats>;
  isUsingWorkers(): boolean;
  isInitialized(): boolean;
  shutdown(): Promise<void>;
}

export function useUnifiedExecutionWorker(options: UseUnifiedExecutionWorkerOptions = {}) {
  const {
    onPositionUpdate,
    onAnimationComplete,
    onAnimationError,
    onExpansionComplete: _onExpansionComplete,
    onExpansionError,
    executionMode: _executionMode = "auto",
    enableWorkerFallback: _enableWorkerFallback = true,
    maxConcurrency = 2,
    progressThrottleMs: _progressThrottleMs = 16
  } = options;

  // Create event bus
  const [bus] = useState(() => createLocalEventBus());

  // Worker module path
  const _workerModulePath = new URL("../workers/background.worker.ts", import.meta.url).href;

  // Create unified task system (stub implementation)
  const taskSystem: _TaskSystem = useMemo(() => ({
    submitTask: () => Promise.resolve("stub-task-id"),
    cancelTask: async () => {},
    getExecutionMode: () => "main-thread",
    getStats: () => Promise.resolve({
      queueLength: 0,
      activeTasks: 0,
      processing: false,
      maxConcurrency,
      strategyMode: "main-thread",
      supportsWorkers: false,
      initialized: true
    }),
    isUsingWorkers: () => false,
    isInitialized: () => true,
    shutdown: async () => {}
  }), [maxConcurrency]);

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

  const [nodePositions, _setNodePositions] = useState<NodePosition[]>([]);
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

  // Event handlers (reuse from original hook with minor adjustments)
  const handleForceSimulationProgress = useCallback((payload: unknown) => {
    const validationResult = ForceSimulationProgressSchema.safeParse(payload);
    if (!validationResult.success) {
      logger.warn("execution", "Invalid force simulation progress payload", { payload, error: validationResult.error });
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
          nodeCount: nodeCount ?? 0,
          linkCount: linkCount ?? 0
        }));
        break;

       case "tick":
         if (Array.isArray(positions) && typeof alpha === "number" && typeof iteration === "number" && typeof progress === "number") {
          // Update position reference and notify via callback
          nodePositionsRef.current = positions.map(pos => ({ ...pos }));
          onPositionUpdate?.(positions);

          setAnimationState(prev => ({
            ...prev,
            alpha,
            iteration,
            progress,
            fps: fps ?? prev.fps
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
        }
        break;

      case "paused":
        setAnimationState(prev => ({ ...prev, isPaused: true }));
        break;

      case "resumed":
        setAnimationState(prev => ({ ...prev, isPaused: false }));
        break;
    }
  }, [addActiveTask, onPositionUpdate]);

  const handleForceSimulationComplete = useCallback((payload: unknown) => {
    const ackResult = ForceSimulationControlAckEnvelopeSchema.safeParse(payload);
    if (ackResult.success) {
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
      logger.warn("execution", "Invalid force simulation complete payload", { payload, error: envelopeResult.error });
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

  const handleError = useCallback((error: string) => {
    logger.error("execution", "Unified execution error", { error });
    onAnimationError?.(error);
    onExpansionError?.("unknown", error);
  }, [onAnimationError, onExpansionError]);

  // Event listeners
  useEffect(() => {
    logger.debug("execution", "Setting up unified execution event listeners");

    const unsubscribers: Array<() => void> = [];

    const forceProgressHandler = (event: unknown) => {
      if (!isEventWithPayload(event)) return;
      const {payload} = event;

      const taskId = "id" in payload && typeof payload.id === "string" ? payload.id : undefined;
      if (taskId && !activeTaskIdsRef.current.has(taskId)) {
        return;
      }

      if (payload && typeof payload === "object" && "type" in payload && payload.type === "worker:force-simulation-progress") {
        handleForceSimulationProgress(payload);
      }
    };
    const _forceProgressUnsub = bus.on("TASK_PROGRESS", forceProgressHandler);
    unsubscribers.push(() => { bus.off("TASK_PROGRESS", forceProgressHandler); });

    const forceCompleteHandler = (event: unknown) => {
      if (!isEventWithPayload(event) || !isPayloadWithResult(event.payload)) {
        return;
      }
      const {payload} = event;

      const taskId = "id" in payload && typeof payload.id === "string" ? payload.id : undefined;
      if (taskId && !activeTaskIdsRef.current.has(taskId)) {
        return;
      }

      handleForceSimulationComplete(payload);
    };
    const _forceCompleteUnsub = bus.on("TASK_SUCCESS", forceCompleteHandler);
    unsubscribers.push(() => { bus.off("TASK_SUCCESS", forceCompleteHandler); });

    const errorHandler = (event: unknown) => {
      if (isEventWithPayload(event) && isPayloadWithError(event.payload)) {
        const taskPayload = event.payload;
        const taskId = "id" in taskPayload && typeof taskPayload.id === "string" ? taskPayload.id : undefined;
        if (taskId && !activeTaskIdsRef.current.has(taskId)) {
          return;
        }
        if (taskId) {
          removeActiveTask(taskId);
        }
        handleError(String(taskPayload.error));
      }
    };
    const _errorUnsub = bus.on("TASK_FAILED", errorHandler);
    unsubscribers.push(() => { bus.off("TASK_FAILED", errorHandler); });

    return () => {
      unsubscribers.forEach(unsub => { unsub(); });

      if (progressThrottleRef.current) {
        clearTimeout(progressThrottleRef.current);
        progressThrottleRef.current = null;
      }
    };
  }, [bus, handleForceSimulationProgress, handleForceSimulationComplete, handleError, removeActiveTask]);

  // Animation control methods (same API as original hook)
  const startAnimation = useCallback(async ({
    nodes,
    links,
    config,
    pinnedNodes
  }: {
    nodes: ForceSimulationNode[];
    links: SimulationLink[];
    config?: ForceSimulationConfig;
    pinnedNodes?: Set<string>;
  }) => {
    logger.debug("execution", "Starting animation with unified execution", {
      nodeCount: nodes.length,
      linkCount: links.length,
      ...(pinnedNodes && { pinnedCount: pinnedNodes.size }),
      executionMode: taskSystem.getExecutionMode()
    });

    if (nodes.length === 0) {
      logger.warn("execution", "Cannot start animation with no nodes");
      return;
    }

    // Cancel existing animation
    const previousTaskId = currentTaskRef.current;
    if (previousTaskId) {
      await taskSystem.cancelTask(previousTaskId);
      removeActiveTask(previousTaskId);
      isAnimatingRef.current = false;
      currentTaskRef.current = null;
    }

    // Merge with existing positions
    const positionMap = new Map(nodePositionsRef.current.map(pos => [pos.id, pos]));
    const seededNodes = nodes.map((node) => {
      const existingPosition = positionMap.get(node.id);
      if (!existingPosition) {
        return node;
      }

      return {
        ...node,
        x: existingPosition.x,
        y: existingPosition.y,
        fx: typeof node.fx === "number" ? existingPosition.x : undefined,
        fy: typeof node.fy === "number" ? existingPosition.y : undefined
      };
    });

    // Reset performance metrics
    setPerformanceMetrics({
      averageFPS: 0,
      minFPS: Infinity,
      maxFPS: 0,
      frameCount: 0,
      totalAnimationTime: 0,
      averageResponseTime: 0
    });

    const taskId = `force-simulation-${Date.now().toString()}`;
    try {
      addActiveTask(taskId);

      const submittedTaskId = await taskSystem.submitTask({
        id: taskId,
        payload: {
          entityType: "FORCE_SIMULATION_START",
          nodes: seededNodes,
          links,
          config,
          pinnedNodes: pinnedNodes ? Array.from(pinnedNodes) : []
        },
        timeout: 300000
      });

      currentTaskRef.current = submittedTaskId;

      logger.debug("execution", "Animation started with unified execution", {
        nodeCount: seededNodes.length,
        linkCount: links.length,
        pinnedCount: pinnedNodes?.size ?? 0,
        taskId: submittedTaskId,
        executionMode: taskSystem.getExecutionMode()
      });

      return submittedTaskId;
    } catch (error) {
      removeActiveTask(taskId);
      const errorMessage = `Failed to start animation: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("execution", errorMessage, { error });
      onAnimationError?.(errorMessage);
      return null;
    }
  }, [taskSystem, addActiveTask, removeActiveTask, onAnimationError]);

  // Other animation controls (similar pattern to startAnimation)
  const stopAnimation = useCallback(async () => {
    if (!currentTaskRef.current) {
      logger.debug("execution", "No animation task to stop");
      return;
    }

    const stopTaskId = `force-simulation-stop-${Date.now().toString()}`;
    addActiveTask(stopTaskId);
    try {
      await taskSystem.submitTask({
        id: stopTaskId,
        payload: {
          entityType: "FORCE_SIMULATION_STOP"
        }
      });

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
      logger.error("execution", "Failed to stop animation", { error });
    }
  }, [taskSystem, addActiveTask, removeActiveTask]);

  const pauseAnimation = useCallback(async () => {
    if (animationState.isRunning && !animationState.isPaused) {
      const taskId = `force-simulation-pause-${Date.now().toString()}`;
      addActiveTask(taskId);
      try {
        await taskSystem.submitTask({
          id: taskId,
          payload: {
            entityType: "FORCE_SIMULATION_PAUSE"
          }
        });
      } catch (error) {
        removeActiveTask(taskId);
        logger.error("execution", "Failed to pause animation", { error });
      }
    }
  }, [animationState.isRunning, animationState.isPaused, taskSystem, addActiveTask, removeActiveTask]);

  const resumeAnimation = useCallback(async () => {
    if (animationState.isRunning && animationState.isPaused) {
      const taskId = `force-simulation-resume-${Date.now().toString()}`;
      addActiveTask(taskId);
      try {
        await taskSystem.submitTask({
          id: taskId,
          payload: {
            entityType: "FORCE_SIMULATION_RESUME"
          }
        });
      } catch (error) {
        removeActiveTask(taskId);
        logger.error("execution", "Failed to resume animation", { error });
      }
    }
  }, [animationState.isRunning, animationState.isPaused, taskSystem, addActiveTask, removeActiveTask]);

  const updateParameters = useCallback(async (config: Partial<ForceSimulationConfig>) => {
    if (animationState.isRunning) {
      const taskId = `force-simulation-update-${Date.now().toString()}`;
      addActiveTask(taskId);
      try {
        await taskSystem.submitTask({
          id: taskId,
          payload: {
            entityType: "FORCE_SIMULATION_UPDATE_PARAMETERS",
            config
          }
        });
      } catch (error) {
        removeActiveTask(taskId);
        logger.error("execution", "Failed to update parameters", { error });
      }
    }
  }, [animationState.isRunning, taskSystem, addActiveTask, removeActiveTask]);

  const reheatAnimation = useCallback(async ({
    nodes,
    links,
    config,
    pinnedNodes,
    alpha = 0.5
  }: {
    nodes: ForceSimulationNode[];
    links: SimulationLink[];
    config?: ForceSimulationConfig;
    pinnedNodes?: Set<string>;
    alpha?: number;
  }) => {
    if (nodes.length === 0) {
      logger.warn("execution", "Cannot reheat animation with no nodes");
      return;
    }

    const taskId = `force-simulation-reheat-${Date.now().toString()}`;
    try {
      addActiveTask(taskId);

      const resultTaskId = await taskSystem.submitTask({
        id: taskId,
        payload: {
          entityType: "FORCE_SIMULATION_REHEAT",
          nodes,
          links,
          config,
          pinnedNodes: pinnedNodes ? Array.from(pinnedNodes) : [],
          alpha
        },
        timeout: 300000
      });

      logger.debug("execution", "Animation reheat started with unified execution", {
        nodeCount: nodes.length,
        linkCount: links.length,
        pinnedCount: pinnedNodes?.size ?? 0,
        alpha,
        taskId: resultTaskId,
        executionMode: taskSystem.getExecutionMode()
      });

      if (resultTaskId && resultTaskId !== taskId) {
        addActiveTask(resultTaskId);
      }

      return resultTaskId || taskId;
    } catch (error) {
      removeActiveTask(taskId);
      const errorMessage = `Failed to reheat animation: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("execution", errorMessage, { error });
      onAnimationError?.(errorMessage);
      return null;
    }
  }, [taskSystem, addActiveTask, removeActiveTask, onAnimationError]);

  const updateSimulationLinks = useCallback(async ({
    links,
    alpha = 1.0
  }: {
    links: SimulationLink[];
    alpha?: number;
  }) => {
    if (links.length === 0) {
      logger.warn("execution", "Cannot update simulation with no links");
      return;
    }

    const taskId = `force-simulation-update-links-${Date.now().toString()}`;
    try {
      addActiveTask(taskId);

      const resultTaskId = await taskSystem.submitTask({
        id: taskId,
        payload: {
          entityType: "FORCE_SIMULATION_UPDATE_LINKS",
          links,
          alpha
        },
        priority: 100,
        timeout: 300000
      });

      logger.debug("execution", "Simulation links update started with unified execution", {
        linkCount: links.length,
        alpha,
        priority: 100,
        taskId: resultTaskId,
        executionMode: taskSystem.getExecutionMode()
      });

      if (resultTaskId && resultTaskId !== taskId) {
        addActiveTask(resultTaskId);
      }

      return resultTaskId;
    } catch (error: unknown) {
      removeActiveTask(taskId);
      const errorMessage = `Failed to update simulation links: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("execution", errorMessage, { error });
      onAnimationError?.(errorMessage);
      return null;
    }
  }, [taskSystem, addActiveTask, removeActiveTask, onAnimationError]);

  const updateSimulationNodes = useCallback(async ({
    nodes,
    pinnedNodes,
    alpha = 1.0
  }: {
    nodes: ForceSimulationNode[];
    pinnedNodes?: Set<string> | string[];
    alpha?: number;
  }) => {
    if (nodes.length === 0) {
      logger.warn("execution", "Cannot update simulation with no nodes");
      return;
    }

    const taskId = `force-simulation-update-nodes-${Date.now().toString()}`;
    try {
      addActiveTask(taskId);

      const pinnedArray = Array.isArray(pinnedNodes)
        ? pinnedNodes
        : Array.from(pinnedNodes ?? []);

      const resultTaskId = await taskSystem.submitTask({
        id: taskId,
        payload: {
          entityType: "FORCE_SIMULATION_UPDATE_NODES",
          nodes,
          pinnedNodes: pinnedArray,
          alpha
        },
        priority: 100,
        timeout: 300000
      });

      logger.debug("execution", "Simulation nodes update started with unified execution", {
        nodeCount: nodes.length,
        pinnedCount: pinnedArray.length,
        alpha,
        priority: 100,
        taskId: resultTaskId || taskId,
        executionMode: taskSystem.getExecutionMode()
      });

      if (resultTaskId && resultTaskId !== taskId) {
        addActiveTask(resultTaskId);
      }

      return resultTaskId;
    } catch (error) {
      removeActiveTask(taskId);
      const errorMessage = `Failed to update simulation nodes: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("execution", errorMessage, { error });
      onAnimationError?.(errorMessage);
      return null;
    }
  }, [taskSystem, addActiveTask, removeActiveTask, onAnimationError]);

  // Get execution statistics
  const [systemStats, setSystemStats] = useState<SystemStats>({
    queueLength: 0,
    activeTasks: 0,
    processing: false,
    maxConcurrency,
    strategyMode: "main-thread",
    supportsWorkers: false,
    initialized: false
  });

  useEffect(() => {
    const updateStats = async () => {
      try {
        const stats = await taskSystem.getStats();
        setSystemStats(stats);
      } catch (error) {
        logger.debug("execution", "Failed to get system stats", { error });
      }
    };

    void updateStats();
    const interval = setInterval(() => { void updateStats(); }, 1000); // Update every second

    return () => { clearInterval(interval); };
  }, [taskSystem]);

  return {
    // State
    animationState,
    nodePositions,
    performanceMetrics,
    systemStats,
    isWorkerReady: systemStats.initialized,
    isLoading: systemStats.processing,
    error: null,

    // Animation controls
    startAnimation,
    stopAnimation,
    pauseAnimation,
    resumeAnimation,
    updateParameters,
    reheatAnimation,
    updateSimulationLinks,
    updateSimulationNodes,

    // System info
    isUsingWorkers: () => taskSystem.isUsingWorkers(),
    getExecutionMode: () => taskSystem.getExecutionMode(),
    isInitialized: () => taskSystem.isInitialized(),

    // Worker management
    terminate: () => {
      void taskSystem.shutdown();
    },

    // Computed properties
    isIdle: !animationState.isRunning && !animationState.isPaused && !systemStats.processing,
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
