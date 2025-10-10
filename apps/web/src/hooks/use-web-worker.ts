/**
 * Enhanced Web Worker Hook
 * Based on the ChatGPT document recommendations for modern worker management
 * Provides type-safe worker communication with progress tracking and error handling
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@academic-explorer/utils/logger";
import type {
  SimulationLink,
  NodePosition,
} from "@academic-explorer/simulation";
import type { GraphNode, GraphEdge } from "@academic-explorer/graph";

// Type guards for safe type checking
function isMetadataWithNodeId(
  metadata: unknown,
): metadata is { nodeId: string } {
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    "nodeId" in metadata &&
    typeof (metadata as { nodeId: unknown }).nodeId === "string"
  );
}

function isExpansionResult(result: unknown): result is {
  requestId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  links?: SimulationLink[];
  positions?: NodePosition[];
} {
  return (
    typeof result === "object" &&
    result !== null &&
    "requestId" in result &&
    typeof (result as { requestId: unknown }).requestId === "string" &&
    "nodes" in result &&
    Array.isArray((result as { nodes: unknown }).nodes) &&
    "edges" in result &&
    Array.isArray((result as { edges: unknown }).edges)
  );
}

export interface WebWorkerTaskSystem {
  submitTask: (task: WorkerRequest) => Promise<void>;
  getStats: () => WorkerStats;
  isWorkerReady: boolean;
  postMessage: (data: WorkerRequest) => string | null;
  terminate: () => void;
  isLoading: boolean;
  error: string | null;
  stats: WorkerStats;
  isWorkerAvailable: () => boolean;
  getWorker: () => Worker | null;
  // Computed properties
  isIdle: boolean;
  hasError: boolean;
  // Performance metrics
  averageResponseTime: number;
  totalMessages: number;
  errorRate: number;
}

export interface WorkerRequest {
  type: string;
  data?: unknown;
  options?: Record<string, unknown>;
  requestId?: string;
}

export interface WorkerResponse {
  type: "PROGRESS" | "SUCCESS" | "ERROR";
  requestId?: string;
  result?: unknown;
  progress?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface UseWebWorkerOptions {
  onMessage?: (data: WorkerResponse) => void;
  onError?: (error: ErrorEvent) => void;
  onProgress?: (progress: number, requestId?: string) => void;
  onSuccess?: (result: unknown, requestId?: string) => void;
  onExpansionProgress?: (nodeId: string, progress: number) => void;
  onExpansionComplete?: (result: {
    requestId: string;
    nodes: GraphNode[];
    edges: GraphEdge[];
  }) => void;
  onExpansionError?: (nodeId: string, error: string) => void;
  autoTerminate?: boolean; // Auto-terminate on unmount (default: true)
}

export interface WorkerStats {
  messagesReceived: number;
  messagesSent: number;
  errors: number;
  averageResponseTime: number;
  lastActivity: number;
}

interface UnifiedTask<T = unknown> {
  entityType: string;
  data?: T;
  requestId?: string;
}

interface _TaskSystem<T = unknown> {
  submitTask: (task: UnifiedTask<T>) => Promise<void>;
  getStats: () => WorkerStats;
  isWorkerReady: boolean;
  onExpansionProgress?: (nodeId: string, progress: number) => void;
  onExpansionComplete?: (result: {
    requestId: string;
    nodes: GraphNode[];
    edges: GraphEdge[];
    links?: SimulationLink[];
    positions?: NodePosition[];
  }) => void;
  onExpansionError?: (nodeId: string, error: string) => void;
}

export function useWebWorker(
  workerFactory: () => Worker,
  options: UseWebWorkerOptions = {},
): WebWorkerTaskSystem {
  const {
    onMessage,
    onError,
    onProgress,
    onSuccess,
    onExpansionProgress,
    onExpansionComplete,
    onExpansionError,
    autoTerminate = true,
  } = options;

  const workerRef = useRef<Worker | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<WorkerStats>({
    messagesReceived: 0,
    messagesSent: 0,
    errors: 0,
    averageResponseTime: 0,
    lastActivity: 0,
  });
  const [isWorkerReady, setIsWorkerReady] = useState(false);

  // Track pending requests for response time calculation
  const pendingRequests = useRef(new Map<string, number>());
  const responseTimes = useRef<number[]>([]);

  // Initialize worker
  useEffect(() => {
    let worker: Worker | null = null;

    try {
      worker = workerFactory();
      workerRef.current = worker;
      setIsWorkerReady(true);

      // Helper functions to reduce cognitive complexity
      const updateResponseTimeStats = (data: WorkerResponse) => {
        if (data.requestId && pendingRequests.current.has(data.requestId)) {
          const startTime = pendingRequests.current.get(data.requestId);
          if (startTime !== undefined) {
            const responseTime = Date.now() - startTime;
            responseTimes.current.push(responseTime);
            pendingRequests.current.delete(data.requestId);

            // Keep only last 100 response times for average calculation
            if (responseTimes.current.length > 100) {
              responseTimes.current = responseTimes.current.slice(-100);
            }

            const averageResponseTime =
              responseTimes.current.reduce((sum, time) => sum + time, 0) /
              responseTimes.current.length;
            setStats((prev) => ({ ...prev, averageResponseTime }));
          }
        }
      };

      const handleWorkerResponse = (data: WorkerResponse) => {
        switch (data.type) {
          case "PROGRESS":
            if (typeof data.progress === "number") {
              onProgress?.(data.progress, data.requestId);
              if (data.requestId && isMetadataWithNodeId(data.metadata)) {
                onExpansionProgress?.(data.metadata.nodeId, data.progress);
              }
            }
            break;

          case "SUCCESS":
            setError(null);
            setIsLoading(false);
            onSuccess?.(data.result, data.requestId);
            if (
              data.requestId &&
              onExpansionComplete &&
              isExpansionResult(data.result)
            ) {
              onExpansionComplete(data.result);
            }
            break;

          case "ERROR":
            setError(data.error ?? "Unknown worker error");
            setIsLoading(false);
            setStats((prev) => ({ ...prev, errors: prev.errors + 1 }));
            if (data.requestId && onExpansionError) {
              onExpansionError(data.requestId, data.error ?? "Unknown error");
            }
            break;
        }
      };

      // Setup message handler
      const messageHandler = (event: MessageEvent<WorkerResponse>) => {
        const { data } = event;

        setStats((prev) => ({
          ...prev,
          messagesReceived: prev.messagesReceived + 1,
          lastActivity: Date.now(),
        }));

        updateResponseTimeStats(data);
        handleWorkerResponse(data);

        // Call general message handler
        onMessage?.(data);
      };

      worker.onmessage = messageHandler;

      // Setup error handler
      const errorHandler = (errorEvent: ErrorEvent) => {
        const errorMessage = `Worker error: ${errorEvent.message}`;
        setError(errorMessage);
        setIsLoading(false);
        setStats((prev) => ({ ...prev, errors: prev.errors + 1 }));
        onError?.(errorEvent);

        logger.error("worker", "Worker error occurred", {
          message: errorEvent.message,
          filename: errorEvent.filename,
          lineno: errorEvent.lineno,
          colno: errorEvent.colno,
        });
      };

      worker.onerror = errorHandler;

      // Setup unhandled error handler
      const messageErrorHandler = (event: MessageEvent) => {
        const errorMessage =
          "Worker message error (serialization/deserialization failed)";
        setError(errorMessage);
        setIsLoading(false);
        setStats((prev) => ({ ...prev, errors: prev.errors + 1 }));

        logger.error("worker", "Worker message error", { event });
      };

      worker.onmessageerror = messageErrorHandler;

      logger.debug("worker", "Worker initialized successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create worker";
      setError(errorMessage);
      logger.error("worker", "Failed to initialize worker", {
        error: errorMessage,
      });
      setIsWorkerReady(false);
    }

    // Cleanup on unmount
    return () => {
      if (worker) {
        worker.onmessage = null;
        worker.onerror = null;
        worker.onmessageerror = null;
        if (autoTerminate) {
          worker.terminate();
          workerRef.current = null;
          logger.debug("worker", "Worker terminated on cleanup");
        }
        setIsWorkerReady(false);
      }
    };
  }, [
    workerFactory,
    onMessage,
    onError,
    onProgress,
    onSuccess,
    onExpansionProgress,
    onExpansionComplete,
    onExpansionError,
    autoTerminate,
  ]);

  // Post message to worker with automatic request ID generation
  const postMessage = useCallback((data: WorkerRequest) => {
    if (!workerRef.current) {
      const error = "Worker not available";
      setError(error);
      logger.warn("worker", "Attempted to post message to unavailable worker", {
        data,
      });
      return null;
    }

    try {
      // Generate request ID if not provided
      const requestId =
        data.requestId ??
        `req-${Date.now().toString()}-${Math.random().toString(36).substring(2)}`;
      const messageWithId: WorkerRequest = { ...data, requestId };

      // Track request timing
      pendingRequests.current.set(requestId, Date.now());

      setIsLoading(true);
      setError(null);
      workerRef.current.postMessage(messageWithId);

      setStats((prev) => ({
        ...prev,
        messagesSent: prev.messagesSent + 1,
        lastActivity: Date.now(),
      }));

      logger.debug("worker", "Message posted to worker", {
        entityType: data.type,
        requestId,
        hasData: !!data.data,
      });

      return requestId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to post message";
      setError(errorMessage);
      setIsLoading(false);
      logger.error("worker", "Failed to post message to worker", {
        error: errorMessage,
        data,
      });
      return null;
    }
  }, []);

  // Submit task to worker
  const submitTask = useCallback(
    async (task: WorkerRequest): Promise<void> => {
      const requestId = postMessage(task);
      if (!requestId) {
        throw new Error("Failed to submit task: worker not available");
      }
      // Wait for completion or error (simplified - in real impl, use promise from queue)
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Task timeout"));
        }, 30000);
        const checkStatus = () => {
          if (stats.averageResponseTime > 0) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkStatus, 100);
          }
        };
        checkStatus();
      });
    },
    [postMessage, stats.averageResponseTime],
  );

  // Get stats
  const getStats = useCallback(() => stats, [stats]);

  // Terminate worker manually
  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.onmessage = null;
      workerRef.current.onerror = null;
      workerRef.current.onmessageerror = null;
      workerRef.current.terminate();
      workerRef.current = null;
      setIsLoading(false);
      setError(null);
      setIsWorkerReady(false);

      // Clear pending requests
      pendingRequests.current.clear();

      logger.debug("worker", "Worker terminated manually");
    }
  }, []);

  // Check if worker is available
  const isWorkerAvailable = useCallback(() => {
    return workerRef.current !== null;
  }, []);

  // Get worker instance (for advanced usage)
  const getWorker = useCallback(() => {
    return workerRef.current;
  }, []);

  return {
    // TaskSystem methods
    submitTask,
    getStats,
    isWorkerReady,

    // Legacy
    postMessage,
    terminate,

    // State
    isLoading,
    error,
    stats,

    // Utilities
    isWorkerAvailable,
    getWorker,

    // Computed properties
    isIdle: !isLoading && !error,
    hasError: !!error,

    // Performance metrics
    averageResponseTime: stats.averageResponseTime,
    totalMessages: stats.messagesReceived + stats.messagesSent,
    errorRate: stats.messagesSent > 0 ? stats.errors / stats.messagesSent : 0,
  };
}
