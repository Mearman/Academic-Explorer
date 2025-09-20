/**
 * Background Worker Provider
 * Provides centralized worker management and shared worker state across all components
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getBackgroundWorker, isWorkerReady as checkWorkerReady, terminateBackgroundWorker } from "@/lib/graph/worker-singleton";
import { eventBridge } from "@/lib/graph/events/event-bridge";
import { logger } from "@/lib/logger";
import { BackgroundWorkerContext, type BackgroundWorkerContextType } from "./contexts";
import type { CrossContextMessage } from "@/lib/graph/events/types";

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

  // Log that the provider is mounting
  logger.debug("worker", "BackgroundWorkerProvider mounting");

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
    logger.debug("worker", "BackgroundWorkerProvider useEffect running", {
      handlerRegistered: handlerRegistered.current
    });

    // Only register the handler once
    if (handlerRegistered.current) {
      logger.debug("worker", "BackgroundWorkerProvider handler already registered, skipping");
      return;
    }

    logger.debug("worker", "BackgroundWorkerProvider registering EventBridge handler");

    const handleWorkerReady = (message: CrossContextMessage) => {
      const eventType = message.eventType;
      const payload = message.payload;
      logger.debug("worker", "BackgroundWorkerProvider EventBridge message received", {
        eventType,
        payload,
        currentWorkerState: { hasWorker: !!worker, isReady: isWorkerReady }
      });

      if (eventType === "worker:ready") {
        logger.debug("worker", "BackgroundWorkerProvider received worker:ready event", {
          payload,
          isValidPayload: isWorkerReadyPayload(payload),
          workerType: isWorkerReadyPayload(payload) ? payload.workerType : "invalid"
        });

        if (isWorkerReadyPayload(payload) && payload.workerType === "force-animation") {
          logger.debug("worker", "BackgroundWorkerProvider setting isWorkerReady to true");
          setIsWorkerReady(true);
          setIsInitializing(false);

          // Also get the worker instance if we don't have it
          if (!worker) {
            logger.debug("worker", "BackgroundWorkerProvider getting worker instance after ready event");
            getWorker().catch((err: unknown) => {
              const errorMessage = err instanceof Error ? err.message : "Unknown error";
              logger.error("worker", "Failed to get worker instance after ready event", { error: errorMessage });
            });
          }
        }
      }
    };

    eventBridge.registerMessageHandler("background-worker-provider", handleWorkerReady);
    handlerRegistered.current = true;

    // Immediately check if worker is already ready (race condition fallback)
    if (checkWorkerReady()) {
      logger.debug("worker", "BackgroundWorkerProvider found worker already ready after EventBridge registration");
      setIsWorkerReady(true);
      setIsInitializing(false);

      // Get the worker instance if we don't have it
      if (!worker) {
        logger.debug("worker", "BackgroundWorkerProvider getting worker instance after finding ready state");
        getWorker().catch((err: unknown) => {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          logger.error("worker", "Failed to get worker instance after finding ready state", { error: errorMessage });
        });
      }
    }

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