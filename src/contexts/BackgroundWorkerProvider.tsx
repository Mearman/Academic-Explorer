/**
 * Background Worker Provider
 * Provides centralized worker management and shared worker state across all components
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getBackgroundWorker, isWorkerReady as checkWorkerReady, terminateBackgroundWorker } from "@/lib/graph/worker-singleton";
import { eventBridge } from "@/lib/graph/events/event-bridge";
import { logger } from "@/lib/logger";
import { BackgroundWorkerContext, type BackgroundWorkerContextType } from "./contexts";

// Type guard for worker ready payload
function isWorkerReadyPayload(payload: unknown): payload is { workerType: string } {
  return typeof payload === "object" && payload !== null && "workerType" in payload;
}

export function BackgroundWorkerProvider({ children }: { children: React.ReactNode }) {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handlerRegistered = useRef(false);

  const getWorker = useCallback(async (): Promise<Worker> => {
    try {
      setError(null);
      setIsInitializing(true);
      logger.debug("worker", "BackgroundWorkerProvider.getWorker() called");

      const workerInstance = await getBackgroundWorker();
      logger.debug("worker", "BackgroundWorkerProvider received worker instance", { hasWorker: !!workerInstance });
      setWorker(workerInstance);
      setIsInitializing(false);

      return workerInstance;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown worker error";
      logger.error("worker", "Failed to get background worker", { error: errorMessage });
      setError(errorMessage);
      setIsInitializing(false);
      throw err;
    }
  }, []);

  const terminateWorker = useCallback(() => {
    logger.debug("worker", "Terminating background worker");
    terminateBackgroundWorker();
    setWorker(null);
    setIsWorkerReady(false);
    setIsInitializing(false);
    setError(null);
  }, []);

  useEffect(() => {
    // Only register the handler once
    if (handlerRegistered.current) return;

    logger.debug("worker", "BackgroundWorkerProvider registering EventBridge handler");

    const handleWorkerReady = (message: { eventType: string; payload: unknown }) => {
      const eventType = message.eventType;
      const payload = message.payload;
      logger.debug("worker", "BackgroundWorkerProvider EventBridge message received", {
        eventType,
        payload,
      });

      if (eventType === "worker:ready" && isWorkerReadyPayload(payload) && payload.workerType === "force-animation") {
        logger.debug("worker", "BackgroundWorkerProvider setting isWorkerReady to true");
        setIsWorkerReady(true);
        setIsInitializing(false);
      }
    };

    eventBridge.registerMessageHandler("background-worker-provider", handleWorkerReady);
    handlerRegistered.current = true;

    return () => {
      logger.debug("worker", "BackgroundWorkerProvider unregistering EventBridge handler");
      eventBridge.unregisterMessageHandler("background-worker-provider");
      handlerRegistered.current = false;
    };
  }, []);

  // Initialize worker on mount
  useEffect(() => {
    // Check if worker is already ready from singleton
    if (checkWorkerReady()) {
      logger.debug("worker", "Worker already ready from singleton, getting worker instance");
      setIsWorkerReady(true);
      // Still need to get the worker instance for context
      getWorker().catch((err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        logger.error("worker", "Failed to get ready worker instance", { error: errorMessage });
      });
      return;
    }

    // Initialize worker
    getWorker().catch((err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      logger.error("worker", "Failed to initialize worker on mount", { error: errorMessage });
    });
  }, [getWorker]);

  // Debug logging for state changes
  useEffect(() => {
    logger.debug("worker", "BackgroundWorkerProvider isWorkerReady state changed", { isWorkerReady });
  }, [isWorkerReady]);

  const contextValue: BackgroundWorkerContextType = useMemo(() => ({
    worker,
    isWorkerReady,
    isInitializing,
    error,
    getWorker,
    terminateWorker,
  }), [worker, isWorkerReady, isInitializing, error, getWorker, terminateWorker]);

  // Debug logging for context value changes
  useEffect(() => {
    logger.debug("worker", "BackgroundWorkerProvider context value changed", {
      hasWorker: !!worker,
      isWorkerReady,
      isInitializing,
      hasError: !!error
    });
  }, [worker, isWorkerReady, isInitializing, error]);

  return (
    <BackgroundWorkerContext.Provider value={contextValue}>
      {children}
    </BackgroundWorkerContext.Provider>
  );
}

// Export types for convenience
export type { BackgroundWorkerContextType };