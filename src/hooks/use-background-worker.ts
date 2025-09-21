/**
 * Enhanced Background Worker Hook
 * Leverages the new BroadcastChannel-based event system for improved worker communication
 * Provides better progress tracking, error handling, and type safety
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { useWebWorker } from "./use-web-worker";
import { workerEventBus } from "@/lib/graph/events/broadcast-event-bus";
import type {
  ForceSimulationConfig,
  ForceSimulationNode,
  ForceSimulationLink,
  NodePosition
} from "@/lib/graph/events/enhanced-worker-types";
import type { EntityType, GraphNode, GraphEdge } from "@/lib/graph/types";
import type { ExpansionOptions } from "@/lib/entities";
import type { ExpansionSettings } from "@/lib/graph/types/expansion-settings";
import { WorkerEventType } from "@/lib/graph/events/types";

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

const ForceSimulationStoppedSchema = z.object({
  type: z.literal("FORCE_SIMULATION_STOPPED").optional(),
  requestId: z.string().optional(),
  workerType: z.string().optional(),
});

const ForceSimulationErrorSchema = z.object({
  type: z.literal("FORCE_SIMULATION_ERROR").optional(),
  requestId: z.string().optional(),
  workerType: z.string().optional(),
  error: z.string(),
});

const DataFetchProgressSchema = z.object({
  type: z.literal("DATA_FETCH_PROGRESS").optional(),
  requestId: z.string().optional(),
  nodeId: z.string(),
  progress: z.number(),
  status: z.string().optional(),
  currentStep: z.string().optional(),
});

const DataFetchCompleteSchema = z.object({
  type: z.literal("DATA_FETCH_COMPLETE").optional(),
  requestId: z.string().optional(),
  nodeId: z.string().optional(),
  nodes: z.array(z.unknown()).optional(), // Will be validated separately as GraphNode[]
  edges: z.array(z.unknown()).optional(), // Will be validated separately as GraphEdge[]
  statistics: z.unknown().optional(), // Will be validated separately
});

const DataFetchErrorSchema = z.object({
  type: z.literal("DATA_FETCH_ERROR").optional(),
  requestId: z.string().optional(),
  nodeId: z.string(),
  error: z.string(),
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

interface UseEnhancedBackgroundWorkerOptions {
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

export function useEnhancedBackgroundWorker(options: UseEnhancedBackgroundWorkerOptions = {}) {
  const {
    onPositionUpdate,
    onAnimationComplete,
    onAnimationError,
    onExpansionProgress,
    onExpansionComplete,
    onExpansionError,
    enableProgressThrottling = true,
    progressThrottleMs = 16 // ~60fps
  } = options;

  const workerFactory = useCallback(
    () => new Worker(new URL("../workers/background.worker.ts", import.meta.url), { type: "module" }),
    []
  );

  const handleWorkerMessage = useCallback((data: unknown) => {
    if (data && typeof data === "object" && "type" in data) {
      const descriptor = Object.getOwnPropertyDescriptor(data, "type");
      const typeValue: unknown = descriptor?.value;
      logger.debug("worker", "Direct worker message received (legacy)", {
        type: typeof typeValue === "string" ? typeValue : String(typeValue),
      });
    }
  }, []);

  const handleWorkerError = useCallback((error: ErrorEvent) => {
    const errorMessage = `Enhanced worker error: ${error.message}`;
    logger.error("worker", "Enhanced worker error", {
      error: error.message,
      filename: error.filename,
      lineno: error.lineno
    });
    onAnimationError?.(errorMessage);
  }, [onAnimationError]);

  // Worker management using the enhanced useWebWorker hook
  const {
    postMessage,
    isLoading,
    error: workerError,
    isWorkerAvailable,
    terminate
  } = useWebWorker({
    workerFactory,
    options: {
      onMessage: handleWorkerMessage,
      onError: handleWorkerError,
    },
  });

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
  const eventListenerIds = useRef<string[]>([]);

  // BroadcastChannel event handlers
  const handleForceSimulationProgress = useCallback((payload: unknown) => {
    // Validate the payload using zod schema
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
          // Throttle position updates to prevent excessive re-renders
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

            // Update performance metrics
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

            // Schedule next update
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

      case "parameters_updated":
        logger.debug("worker", "Force parameters updated via enhanced system", payload);
        break;
    }
  }, [onPositionUpdate, enableProgressThrottling, progressThrottleMs]);

  const handleForceSimulationComplete = useCallback((payload: unknown) => {
    // Validate the payload using zod schema
    const validationResult = ForceSimulationCompleteSchema.safeParse(payload);
    if (!validationResult.success) {
      logger.warn("worker", "Invalid force simulation complete payload", { payload, error: validationResult.error });
      return;
    }

    const { positions, totalIterations, finalAlpha, reason } = validationResult.data;

    isAnimatingRef.current = false;
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

    // Update final performance metrics
    setPerformanceMetrics(prev => ({
      ...prev,
      totalAnimationTime: Date.now() - animationStartTimeRef.current
    }));
  }, [onPositionUpdate, onAnimationComplete]);

  const handleForceSimulationStopped = useCallback((payload: unknown) => {
    // Validate the payload using zod schema
    const validationResult = ForceSimulationStoppedSchema.safeParse(payload);
    if (!validationResult.success) {
      logger.warn("worker", "Invalid force simulation stopped payload", { payload, error: validationResult.error });
      return;
    }

    const { workerType } = validationResult.data;
    if (workerType === "force-animation") {
      isAnimatingRef.current = false;
      if (progressThrottleRef.current) {
        clearTimeout(progressThrottleRef.current);
        progressThrottleRef.current = null;
      }

      setAnimationState(prev => ({
        ...prev,
        isRunning: false,
        isPaused: false
      }));
    }
  }, []);

  const handleForceSimulationError = useCallback((payload: unknown) => {
    // Validate the payload using zod schema
    const validationResult = ForceSimulationErrorSchema.safeParse(payload);
    if (!validationResult.success) {
      logger.warn("worker", "Invalid force simulation error payload", { payload, error: validationResult.error });
      return;
    }

    const { workerType, error } = validationResult.data;
    if (workerType === "force-animation") {
      const errorMessage = `Enhanced force simulation error: ${error}`;
      logger.error("worker", "Force simulation error via enhanced system", validationResult.data);
      onAnimationError?.(errorMessage);
    }
  }, [onAnimationError]);

  const handleDataFetchProgress = useCallback((payload: unknown) => {
    // Validate the payload using zod schema
    const validationResult = DataFetchProgressSchema.safeParse(payload);
    if (!validationResult.success) {
      logger.warn("worker", "Invalid data fetch progress payload", { payload, error: validationResult.error });
      return;
    }

    const { nodeId, progress, currentStep } = validationResult.data;
    if (nodeId && typeof progress === "number" && currentStep) {
      onExpansionProgress?.(nodeId, {
        completed: Math.round(progress * 100),
        total: 100,
        stage: currentStep
      });
    }
  }, [onExpansionProgress]);

  const handleDataFetchComplete = useCallback((payload: unknown) => {
    // Validate the payload using zod schema
    const validationResult = DataFetchCompleteSchema.safeParse(payload);
    if (!validationResult.success) {
      logger.warn("worker", "Invalid data fetch complete payload", { payload, error: validationResult.error });
      return;
    }

    const { requestId, nodes, edges, statistics } = validationResult.data;
    if (requestId && nodes && edges) {
      // Validate arrays contain expected types
      const validatedNodes = Array.isArray(nodes) && nodes.every((node): node is GraphNode =>
        typeof node === "object" && node !== null && "id" in node && "entityId" in node
      ) ? nodes : [];

      const validatedEdges = Array.isArray(edges) && edges.every((edge): edge is GraphEdge =>
        typeof edge === "object" && edge !== null && "id" in edge && "source" in edge && "target" in edge
      ) ? edges : [];

      // Callback with validated data structure
      onExpansionComplete?.({
        requestId,
        nodes: validatedNodes,
        edges: validatedEdges,
        statistics
      });
    }
  }, [onExpansionComplete]);

  const handleDataFetchError = useCallback((payload: unknown) => {
    // Validate the payload using zod schema
    const validationResult = DataFetchErrorSchema.safeParse(payload);
    if (!validationResult.success) {
      logger.warn("worker", "Invalid data fetch error payload", { payload, error: validationResult.error });
      return;
    }

    const { nodeId, error } = validationResult.data;
    if (nodeId && error) {
      onExpansionError?.(nodeId, error);
    }
  }, [onExpansionError]);

  useEffect(() => {
    logger.debug("worker", "Setting up enhanced worker event listeners");

    const workerReadyId = workerEventBus.listen(WorkerEventType.WORKER_READY, (payload: unknown) => {
      if (payload && typeof payload === "object" && "workerType" in payload && payload.workerType === "force-animation") {
        logger.debug("worker", "Enhanced worker ready via BroadcastChannel", payload);
      }
    });

    const forceProgressId = workerEventBus.listen(WorkerEventType.FORCE_SIMULATION_PROGRESS, handleForceSimulationProgress);
    const forceCompleteId = workerEventBus.listen(WorkerEventType.FORCE_SIMULATION_COMPLETE, handleForceSimulationComplete);
    const forceStoppedId = workerEventBus.listen(WorkerEventType.FORCE_SIMULATION_STOPPED, handleForceSimulationStopped);
    const forceErrorId = workerEventBus.listen(WorkerEventType.FORCE_SIMULATION_ERROR, handleForceSimulationError);
    const dataProgressId = workerEventBus.listen(WorkerEventType.DATA_FETCH_PROGRESS, handleDataFetchProgress);
    const dataCompleteId = workerEventBus.listen(WorkerEventType.DATA_FETCH_COMPLETE, handleDataFetchComplete);
    const dataErrorId = workerEventBus.listen(WorkerEventType.DATA_FETCH_ERROR, handleDataFetchError);

    eventListenerIds.current = [
      workerReadyId,
      forceProgressId,
      forceCompleteId,
      forceStoppedId,
      forceErrorId,
      dataProgressId,
      dataCompleteId,
      dataErrorId
    ];

    return () => {
      eventListenerIds.current.forEach(id => {
        workerEventBus.removeListener(id);
      });
      eventListenerIds.current = [];

      if (progressThrottleRef.current) {
        clearTimeout(progressThrottleRef.current);
        progressThrottleRef.current = null;
      }
    };
  }, [
    handleForceSimulationProgress,
    handleForceSimulationComplete,
    handleForceSimulationStopped,
    handleForceSimulationError,
    handleDataFetchProgress,
    handleDataFetchComplete,
    handleDataFetchError
  ]);

  // Enhanced animation control methods
  const startAnimation = useCallback((
    nodes: ForceSimulationNode[],
    links: ForceSimulationLink[],
    config?: ForceSimulationConfig,
    pinnedNodes?: Set<string>
  ) => {
    if (!isWorkerAvailable()) {
      logger.error("worker", "Enhanced worker not available for animation start");
      onAnimationError?.("Enhanced animation worker not ready");
      return;
    }

    if (nodes.length === 0) {
      logger.warn("worker", "Cannot start animation with no nodes");
      return;
    }

    if (isAnimatingRef.current) {
      logger.debug("worker", "Enhanced animation already running, skipping start request");
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

    const requestId = postMessage({
      type: "FORCE_SIMULATION_START",
      nodes,
      links,
      config,
      pinnedNodes: pinnedNodes ? Array.from(pinnedNodes) : undefined
    });

    logger.debug("worker", "Enhanced animation started", {
      nodeCount: nodes.length,
      linkCount: links.length,
      pinnedCount: pinnedNodes?.size || 0,
      requestId
    });
  }, [isWorkerAvailable, onAnimationError, postMessage]);

  const stopAnimation = useCallback(() => {
    if (!isAnimatingRef.current) {
      logger.debug("worker", "No enhanced animation to stop");
      return;
    }

    postMessage({
      type: "FORCE_SIMULATION_STOP"
    });
  }, [postMessage]);

  const pauseAnimation = useCallback(() => {
    if (animationState.isRunning && !animationState.isPaused) {
      postMessage({
        type: "FORCE_SIMULATION_PAUSE"
      });
    }
  }, [animationState.isRunning, animationState.isPaused, postMessage]);

  const resumeAnimation = useCallback(() => {
    if (animationState.isRunning && animationState.isPaused) {
      postMessage({
        type: "FORCE_SIMULATION_RESUME"
      });
    }
  }, [animationState.isRunning, animationState.isPaused, postMessage]);

  const updateParameters = useCallback((config: Partial<ForceSimulationConfig>) => {
    if (animationState.isRunning) {
      postMessage({
        type: "FORCE_SIMULATION_UPDATE_PARAMETERS",
        config
      });
    }
  }, [animationState.isRunning, postMessage]);

  // Enhanced node expansion
  const expandNode = useCallback((
    nodeId: string,
    entityId: string,
    entityType: EntityType,
    options?: ExpansionOptions,
    expansionSettings?: ExpansionSettings
  ) => {
    if (!isWorkerAvailable()) {
      logger.warn("worker", "Enhanced worker not ready for expandNode", {
        nodeId,
        hasWorker: isWorkerAvailable()
      });
      onExpansionError?.(nodeId, "Enhanced worker not ready");
      return null;
    }

    const requestId = postMessage({
      type: "DATA_FETCH_EXPAND_NODE",
      expandRequest: {
        nodeId,
        entityId,
        entityType,
        options,
        expansionSettings
      }
    });

    logger.debug("worker", "Enhanced node expansion started", {
      nodeId,
      entityId,
      entityType,
      requestId
    });

    return requestId;
  }, [isWorkerAvailable, onExpansionError, postMessage]);

  return {
    // State
    animationState,
    nodePositions,
    performanceMetrics,
    isWorkerReady: isWorkerAvailable(),
    isLoading,
    error: workerError,

    // Animation controls
    startAnimation,
    stopAnimation,
    pauseAnimation,
    resumeAnimation,
    updateParameters,

    // Data operations
    expandNode,

    // Worker management
    terminate,

    // Computed properties
    isIdle: !animationState.isRunning && !animationState.isPaused && !isLoading,
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
export const useBackgroundWorker = useEnhancedBackgroundWorker;