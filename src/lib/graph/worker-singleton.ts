/**
 * Background Worker Singleton
 * Ensures only one worker instance exists across the entire application
 */

import { eventBridge } from "@/lib/graph/events/event-bridge";
import { logger } from "@/lib/logger";

interface WorkerSingleton {
  worker: Worker | null;
  isReady: boolean;
  isInitializing: boolean;
  readyCallbacks: Set<() => void>;
  errorCallbacks: Set<(error: string) => void>;
  stateChangeCallbacks: Set<(isReady: boolean) => void>;
}

const workerState: WorkerSingleton = {
  worker: null,
  isReady: false,
  isInitializing: false,
  readyCallbacks: new Set(),
  errorCallbacks: new Set(),
  stateChangeCallbacks: new Set(),
};

/**
 * Get or create the singleton worker instance
 */
export function getBackgroundWorker(): Promise<Worker> {
  return new Promise((resolve, reject) => {
    // If worker is ready, return it immediately
    if (workerState.worker && workerState.isReady) {
      resolve(workerState.worker);
      return;
    }

    // If worker exists but not ready, wait for it
    if (workerState.worker && workerState.isInitializing) {
      const onReady = () => {
        workerState.readyCallbacks.delete(onReady);
        if (workerState.worker) {
          resolve(workerState.worker);
        }
      };
      workerState.readyCallbacks.add(onReady);
      return;
    }

    // Create new worker
    try {
      workerState.isInitializing = true;
      workerState.worker = new Worker(
        new URL("../../workers/background.worker.ts", import.meta.url),
        { type: "module" }
      );

      // Set up event listeners
      workerState.worker.addEventListener("error", (error) => {
        logger.error("graph", "Background worker error", { error: error.message });
        workerState.errorCallbacks.forEach(callback => { callback(error.message); });
      });

      // Register with EventBridge
      eventBridge.registerWorker(workerState.worker, "force-animation-worker");

      // Worker initialization is now handled via EventBridge
      // The worker will send WORKER_READY event when initialized

      // Set up ready callback
      const onReady = () => {
        workerState.isReady = true;
        workerState.isInitializing = false;
        workerState.readyCallbacks.delete(onReady);

        if (workerState.worker) {
          resolve(workerState.worker);
        }

        // Notify all waiting callbacks
        workerState.readyCallbacks.forEach(callback => { callback(); });
        workerState.readyCallbacks.clear();
      };

      workerState.readyCallbacks.add(onReady);

      // Listen for worker ready via EventBridge
      const handleWorkerReady = (message: unknown) => {
        // Type guard to check if message has the expected structure
        function isMessageWithEventType(msg: unknown): msg is { eventType: unknown; payload?: unknown } {
          return msg !== null && typeof msg === "object" && "eventType" in msg;
        }

        if (!isMessageWithEventType(message)) {
          return;
        }

        // Extract eventType safely
        const eventType = message.eventType;
        if (typeof eventType !== "string") {
          return;
        }

        // Extract worker type from payload if present
        let workerType: string | undefined;
        if (message.payload && typeof message.payload === "object" && message.payload !== null) {
          const payload = message.payload;
          if ("workerType" in payload) {
            const payloadWorkerType = payload.workerType;
            if (typeof payloadWorkerType === "string") {
              workerType = payloadWorkerType;
            }
          }
        }

        logger.debug("graph", "EventBridge message received", {
          eventType,
          payload: message.payload,
          fullMessage: message
        });
        if (eventType === "worker:ready" && workerType === "force-animation") {
          logger.debug("graph", "Worker ready event received via EventBridge");
          clearTimeout(fallbackTimeout);
          onReady();
          eventBridge.unregisterMessageHandler("worker-singleton-ready");
        }
      };

      logger.debug("graph", "Registering EventBridge message handler for worker-singleton-ready");
      eventBridge.registerMessageHandler("worker-singleton-ready", handleWorkerReady);
      logger.debug("graph", "EventBridge message handler registered successfully");

      // Fallback timeout in case EventBridge doesn't work
      const fallbackTimeout = setTimeout(() => {
        logger.warn("graph", "Worker ready event not received, using fallback timeout");
        eventBridge.unregisterMessageHandler("worker-singleton-ready");
        onReady();
      }, 5000);

    } catch (error) {
      workerState.isInitializing = false;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("graph", "Failed to create background worker", { error: errorMessage });
      reject(new Error(`Failed to create worker: ${errorMessage}`));
    }
  });
}

/**
 * Check if worker is ready
 */
export function isWorkerReady(): boolean {
  return workerState.isReady;
}

/**
 * Clean up the singleton worker
 */
export function terminateBackgroundWorker(): void {
  if (workerState.worker) {
    workerState.worker.terminate();
    workerState.worker = null;
  }

  workerState.isReady = false;
  workerState.isInitializing = false;
  workerState.readyCallbacks.clear();
  workerState.errorCallbacks.clear();
}