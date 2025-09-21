/**
 * Enhanced Web Worker Hook
 * Based on the ChatGPT document recommendations for modern worker management
 * Provides type-safe worker communication with progress tracking and error handling
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@/lib/logger";

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
  autoTerminate?: boolean; // Auto-terminate on unmount (default: true)
}

export interface WorkerStats {
  messagesReceived: number;
  messagesSent: number;
  errors: number;
  averageResponseTime: number;
  lastActivity: number;
}

export function useWebWorker(
  workerFactory: () => Worker,
  options: UseWebWorkerOptions = {}
) {
  const {
    onMessage,
    onError,
    onProgress,
    onSuccess,
    autoTerminate = true
  } = options;

  const workerRef = useRef<Worker | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<WorkerStats>({
    messagesReceived: 0,
    messagesSent: 0,
    errors: 0,
    averageResponseTime: 0,
    lastActivity: 0
  });

  // Track pending requests for response time calculation
  const pendingRequests = useRef(new Map<string, number>());
  const responseTimes = useRef<number[]>([]);

  // Initialize worker
  useEffect(() => {
    let worker: Worker | null = null;

    try {
      worker = workerFactory();
      workerRef.current = worker;

      // Setup message handler
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const data = event.data;

        setStats(prev => ({
          ...prev,
          messagesReceived: prev.messagesReceived + 1,
          lastActivity: Date.now()
        }));

        // Calculate response time if requestId is present
        if (data.requestId && pendingRequests.current.has(data.requestId)) {
          const startTime = pendingRequests.current.get(data.requestId);
          if (startTime !== undefined) {
            const responseTime = Date.now() - startTime;
            responseTimes.current.push(responseTime);
            pendingRequests.current.delete(data.requestId);
          }

          // Keep only last 100 response times for average calculation
          if (responseTimes.current.length > 100) {
            responseTimes.current = responseTimes.current.slice(-100);
          }

          const averageResponseTime = responseTimes.current.reduce((sum, time) => sum + time, 0) / responseTimes.current.length;
          setStats(prev => ({ ...prev, averageResponseTime }));
        }

        // Handle different response types
        switch (data.type) {
          case "PROGRESS":
            if (typeof data.progress === "number") {
              onProgress?.(data.progress, data.requestId);
            }
            break;

          case "SUCCESS":
            setError(null);
            setIsLoading(false);
            onSuccess?.(data.result, data.requestId);
            break;

          case "ERROR":
            setError(data.error || "Unknown worker error");
            setIsLoading(false);
            setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
            break;
        }

        // Call general message handler
        onMessage?.(data);
      };

      // Setup error handler
      worker.onerror = (errorEvent: ErrorEvent) => {
        const errorMessage = `Worker error: ${errorEvent.message}`;
        setError(errorMessage);
        setIsLoading(false);
        setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
        onError?.(errorEvent);

        logger.error("worker", "Worker error occurred", {
          message: errorEvent.message,
          filename: errorEvent.filename,
          lineno: errorEvent.lineno,
          colno: errorEvent.colno
        });
      };

      // Setup unhandled error handler
      worker.onmessageerror = (event: MessageEvent) => {
        const errorMessage = "Worker message error (serialization/deserialization failed)";
        setError(errorMessage);
        setIsLoading(false);
        setStats(prev => ({ ...prev, errors: prev.errors + 1 }));

        logger.error("worker", "Worker message error", { event });
      };

      logger.debug("worker", "Worker initialized successfully");

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create worker";
      setError(errorMessage);
      logger.error("worker", "Failed to initialize worker", { error: errorMessage });
    }

    // Cleanup on unmount
    return () => {
      if (worker && autoTerminate) {
        worker.terminate();
        workerRef.current = null;
        logger.debug("worker", "Worker terminated on cleanup");
      }
    };
  }, [workerFactory, onMessage, onError, onProgress, onSuccess, autoTerminate]);

  // Post message to worker with automatic request ID generation
  const postMessage = useCallback((data: WorkerRequest) => {
    if (!workerRef.current) {
      const error = "Worker not available";
      setError(error);
      logger.warn("worker", "Attempted to post message to unavailable worker", { data });
      return null;
    }

    try {
      // Generate request ID if not provided
      const requestId = data.requestId || `req-${Date.now().toString()}-${Math.random().toString(36).substring(2)}`;
      const messageWithId: WorkerRequest = { ...data, requestId };

      // Track request timing
      pendingRequests.current.set(requestId, Date.now());

      setIsLoading(true);
      setError(null);
      workerRef.current.postMessage(messageWithId);

      setStats(prev => ({
        ...prev,
        messagesSent: prev.messagesSent + 1,
        lastActivity: Date.now()
      }));

      logger.debug("worker", "Message posted to worker", {
        type: data.type,
        requestId,
        hasData: !!data.data
      });

      return requestId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to post message";
      setError(errorMessage);
      setIsLoading(false);
      logger.error("worker", "Failed to post message to worker", { error: errorMessage, data });
      return null;
    }
  }, []);

  // Terminate worker manually
  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setIsLoading(false);
      setError(null);

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
    // Core functionality
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
    errorRate: stats.messagesSent > 0 ? stats.errors / stats.messagesSent : 0
  };
}