import { useCallback, useMemo, useRef, useState } from "react";
import { logger } from "@/lib/logger";
import { useWebWorker, type WorkerRequest, type WorkerResponse } from "./use-web-worker";
import { workerEventBus } from "@/lib/graph/events/broadcast-event-bus";
import { WorkerEventType, isWorkerEventType } from "@/lib/graph/events/types";
import type {
  ForceSimulationConfig,
  ForceSimulationLink,
  ForceSimulationNode,
  NodePosition
} from "@/lib/graph/events/enhanced-worker-types";
import type { EntityType, GraphEdge, GraphNode } from "@/lib/graph/types";
import type { ExpansionOptions } from "@/lib/entities";
import type { ExpansionSettings } from "@/lib/graph/types/expansion-settings";

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

interface WorkerStats {
  messagesReceived: number;
  messagesSent: number;
  errors: number;
  averageResponseTime: number;
  lastActivity: number;
}

export interface UseEnhancedBackgroundWorkerOptions {
  onPositionUpdate?: (positions: NodePosition[]) => void;
  onAnimationComplete?: (
    positions: NodePosition[],
    stats: { totalIterations: number; finalAlpha: number; reason: string }
  ) => void;
  onAnimationError?: (error: string) => void;
  onExpansionProgress?: (nodeId: string, progress: { completed: number; total: number; stage: string }) => void;
  onExpansionComplete?: (result: {
    requestId: string;
    nodes: GraphNode[];
    edges: GraphEdge[];
    statistics?: unknown;
  }) => void;
  onExpansionError?: (nodeId: string, error: string) => void;
  autoStart?: boolean;
  enableProgressThrottling?: boolean;
  progressThrottleMs?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isGraphNodeArray(value: unknown): value is GraphNode[] {
  return Array.isArray(value) && value.every(item => isRecord(item) && typeof item.id === "string");
}

function isGraphEdgeArray(value: unknown): value is GraphEdge[] {
  return Array.isArray(value) && value.every(item => isRecord(item) && typeof item.id === "string");
}

function toNodePositions(value: unknown): NodePosition[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(item => {
      if (isRecord(item) && typeof item.id === "string") {
        const x = typeof item.x === "number" ? item.x : 0;
        const y = typeof item.y === "number" ? item.y : 0;
        return { id: item.id, x, y } satisfies NodePosition;
      }
      return null;
    })
    .filter((pos): pos is NodePosition => pos !== null);
}

function createRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
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
    progressThrottleMs = 16
  } = options;

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
  const [workerStats, setWorkerStats] = useState<WorkerStats>({
    messagesReceived: 0,
    messagesSent: 0,
    errors: 0,
    averageResponseTime: 0,
    lastActivity: 0
  });
  const [isWorkerReady, setIsWorkerReady] = useState(false);

  const lastProgressDispatchRef = useRef<number>(0);
  const lastTickTimestampRef = useRef<number>(0);

  const handleForceProgress = useCallback(
    (message: WorkerResponse) => {
      const payload = isRecord(message.payload) ? message.payload : undefined;
      if (!payload) {
        return;
      }

      const messageType = typeof payload.messageType === "string" ? payload.messageType : "tick";
      const now = Date.now();

      if (enableProgressThrottling && progressThrottleMs > 0 && messageType === "tick") {
        if (now - lastProgressDispatchRef.current < progressThrottleMs) {
          return;
        }
        lastProgressDispatchRef.current = now;
      }

      if (messageType === "paused") {
        setAnimationState(prev => ({
          ...prev,
          isRunning: false,
          isPaused: true
        }));
        return;
      }

      if (messageType === "resumed") {
        setAnimationState(prev => ({
          ...prev,
          isRunning: true,
          isPaused: false
        }));
        return;
      }

      if (messageType === "parameters_updated") {
        return;
      }

      if (messageType === "started") {
        setAnimationState(prev => ({
          ...prev,
          isRunning: true,
          isPaused: false,
          nodeCount: typeof payload.nodeCount === "number" ? payload.nodeCount : prev.nodeCount,
          linkCount: typeof payload.linkCount === "number" ? payload.linkCount : prev.linkCount
        }));
        return;
      }

      const positions = toNodePositions(payload.positions);
      if (positions.length > 0) {
        setNodePositions(positions);
        onPositionUpdate?.(positions);
      }

      const fps = typeof payload.fps === "number" ? payload.fps : animationState.fps;
      const progress = typeof payload.progress === "number" ? payload.progress : animationState.progress;
      const iteration = typeof payload.iteration === "number" ? payload.iteration : animationState.iteration;
      const alpha = typeof payload.alpha === "number" ? payload.alpha : animationState.alpha;
      const nodeCount = typeof payload.nodeCount === "number" ? payload.nodeCount : animationState.nodeCount;
      const linkCount = typeof payload.linkCount === "number" ? payload.linkCount : animationState.linkCount;

      setAnimationState({
        isRunning: true,
        isPaused: false,
        alpha,
        iteration,
        progress,
        fps,
        nodeCount,
        linkCount
      });

      setPerformanceMetrics(prev => {
        const frameCount = prev.frameCount + 1;
        const newMin = frameCount === 1 ? fps : Math.min(prev.minFPS, fps);
        const newMax = Math.max(prev.maxFPS, fps);
        const averageFPS = ((prev.averageFPS * prev.frameCount) + fps) / frameCount;
        const totalAnimationTime = prev.totalAnimationTime + Math.max(0, now - lastTickTimestampRef.current);
        lastTickTimestampRef.current = now;
        return {
          averageFPS,
          minFPS: newMin,
          maxFPS: newMax,
          frameCount,
          totalAnimationTime,
          averageResponseTime: prev.averageResponseTime
        };
      });
    },
    [animationState, enableProgressThrottling, onPositionUpdate, progressThrottleMs]
  );

  const handleForceComplete = useCallback(
    (message: WorkerResponse) => {
      const payload = isRecord(message.payload) ? message.payload : undefined;
      const positions = toNodePositions(payload?.positions);
      if (positions.length > 0) {
        setNodePositions(positions);
      }

      setAnimationState(prev => ({
        ...prev,
        isRunning: false,
        isPaused: false
      }));

      onAnimationComplete?.(positions, {
        totalIterations: typeof payload?.totalIterations === "number" ? payload.totalIterations : animationState.iteration,
        finalAlpha: typeof payload?.finalAlpha === "number" ? payload.finalAlpha : animationState.alpha,
        reason: typeof payload?.reason === "string" ? payload.reason : "completed"
      });
    },
    [animationState.alpha, animationState.iteration, onAnimationComplete]
  );

  const handleWorkerMessage = useCallback((message: WorkerResponse) => {
    setWorkerStats(prev => ({
      ...prev,
      messagesReceived: prev.messagesReceived + 1,
      lastActivity: Date.now()
    }));

    const eventName = message.event;
    if (typeof eventName === "string") {
      workerEventBus.emitUnknown(eventName, message.payload ?? {});
    }

    if (!eventName || !isWorkerEventType(eventName)) {
      return;
    }

    switch (eventName) {
      case WorkerEventType.WORKER_READY:
        setIsWorkerReady(true);
        break;
      case WorkerEventType.FORCE_SIMULATION_PROGRESS:
        handleForceProgress(message);
        break;
      case WorkerEventType.FORCE_SIMULATION_COMPLETE:
        handleForceComplete(message);
        break;
      case WorkerEventType.FORCE_SIMULATION_ERROR:
      case WorkerEventType.WORKER_ERROR: {
        const payload = isRecord(message.payload) ? message.payload : undefined;
        const errorMessage = typeof message.error === "string"
          ? message.error
          : typeof payload?.error === "string"
            ? payload.error
            : "Worker error";
        setAnimationState(prev => ({ ...prev, isRunning: false, isPaused: false }));
        onAnimationError?.(errorMessage);
        break;
      }
      case WorkerEventType.DATA_FETCH_PROGRESS: {
        const payload = isRecord(message.payload) ? message.payload : undefined;
        if (payload && typeof payload.nodeId === "string") {
          const stage = typeof payload.currentStep === "string" ? payload.currentStep : "progress";
          const amount = typeof payload.progress === "number" ? payload.progress : 0;
          onExpansionProgress?.(payload.nodeId, {
            completed: Math.round(amount * 100),
            total: 100,
            stage
          });
        }
        break;
      }
      case WorkerEventType.DATA_FETCH_COMPLETE: {
        const payload = isRecord(message.payload) ? message.payload : undefined;
        if (payload && typeof payload.nodeId === "string") {
          const nodes = isGraphNodeArray(payload.nodes) ? payload.nodes : [];
          const edges = isGraphEdgeArray(payload.edges) ? payload.edges : [];
          onExpansionComplete?.({
            requestId: typeof payload.requestId === "string" ? payload.requestId : message.requestId ?? "",
            nodes,
            edges,
            statistics: payload.statistics
          });
        }
        break;
      }
      case WorkerEventType.DATA_FETCH_ERROR: {
        const payload = isRecord(message.payload) ? message.payload : undefined;
        if (payload && typeof payload.nodeId === "string") {
          const errorMessage = typeof payload.error === "string" ? payload.error : message.error ?? "Unknown error";
          onExpansionError?.(payload.nodeId, errorMessage);
        }
        break;
      }
      default:
        break;
    }
  }, [handleForceComplete, handleForceProgress, onAnimationError, onExpansionComplete, onExpansionError, onExpansionProgress]);

  const handleWorkerError = useCallback((error: ErrorEvent) => {
    setWorkerStats(prev => ({
      ...prev,
      errors: prev.errors + 1,
      lastActivity: Date.now()
    }));
    onAnimationError?.(error.message || "Worker error");
  }, [onAnimationError]);

  const { postMessage, terminate, isLoading, error } = useWebWorker(
    () => new Worker(new URL("../workers/background.worker.ts", import.meta.url), { type: "module" }),
    {
      onMessage: handleWorkerMessage,
      onError: handleWorkerError
    }
  );

  const sendMessage = useCallback((request: WorkerRequest) => {
    setWorkerStats(prev => ({
      ...prev,
      messagesSent: prev.messagesSent + 1
    }));
    postMessage(request);
  }, [postMessage]);

  const startAnimation = useCallback((
    nodes: ForceSimulationNode[],
    links: ForceSimulationLink[],
    config?: ForceSimulationConfig,
    pinnedNodes?: Set<string>
  ) => {
    const requestId = createRequestId();
    logger.debug("worker", "Starting force simulation", { requestId, nodeCount: nodes.length, linkCount: links.length });
    sendMessage({
      type: "FORCE_SIMULATION_START",
      requestId,
      nodes,
      links,
      config,
      pinnedNodes: pinnedNodes ? Array.from(pinnedNodes) : []
    });
    setAnimationState(prev => ({ ...prev, isRunning: true, isPaused: false }));
    return requestId;
  }, [sendMessage]);

  const stopAnimation = useCallback(() => {
    if (!animationState.isRunning) {
      return;
    }
    sendMessage({ type: "FORCE_SIMULATION_STOP" });
    setAnimationState(prev => ({ ...prev, isRunning: false, isPaused: false }));
  }, [animationState.isRunning, sendMessage]);

  const pauseAnimation = useCallback(() => {
    if (!animationState.isRunning || animationState.isPaused) {
      return;
    }
    sendMessage({ type: "FORCE_SIMULATION_PAUSE" });
    setAnimationState(prev => ({ ...prev, isPaused: true }));
  }, [animationState.isPaused, animationState.isRunning, sendMessage]);

  const resumeAnimation = useCallback(() => {
    if (!animationState.isPaused) {
      return;
    }
    sendMessage({ type: "FORCE_SIMULATION_RESUME" });
    setAnimationState(prev => ({ ...prev, isPaused: false, isRunning: true }));
  }, [animationState.isPaused, sendMessage]);

  const updateParameters = useCallback((config: Partial<ForceSimulationConfig>) => {
    if (!animationState.isRunning) {
      return;
    }
    sendMessage({
      type: "FORCE_SIMULATION_UPDATE_PARAMETERS",
      config
    });
  }, [animationState.isRunning, sendMessage]);

  const expandNode = useCallback((
    nodeId: string,
    entityId: string,
    entityType: EntityType,
    options?: ExpansionOptions,
    expansionSettings?: ExpansionSettings
  ) => {
    if (!isWorkerReady) {
      throw new Error("Worker not ready");
    }

    const requestId = createRequestId();
    sendMessage({
      type: "DATA_FETCH_EXPAND_NODE",
      requestId,
      expandRequest: {
        nodeId,
        entityId,
        entityType,
        options,
        expansionSettings
      }
    });
    return requestId;
  }, [isWorkerReady, sendMessage]);

  const performanceInsights = useMemo(() => ({
    ...performanceMetrics,
    isOptimal: performanceMetrics.averageFPS >= 30,
    hasFrameDrops: performanceMetrics.minFPS < 15,
    efficiency: performanceMetrics.frameCount > 0 ? (performanceMetrics.averageFPS / 60) * 100 : 0
  }), [performanceMetrics]);

  return {
    animationState,
    nodePositions,
    performanceMetrics,
    workerStats,
    isWorkerReady,
    isLoading,
    error,
    startAnimation,
    stopAnimation,
    pauseAnimation,
    resumeAnimation,
    updateParameters,
    expandNode,
    terminate,
    isIdle: !animationState.isRunning && !animationState.isPaused && !isLoading,
    canPause: animationState.isRunning && !animationState.isPaused,
    canResume: animationState.isRunning && animationState.isPaused,
    canStop: animationState.isRunning || animationState.isPaused,
    performanceInsights
  };
}

export const useBackgroundWorker = useEnhancedBackgroundWorker;
