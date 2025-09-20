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
}

const workerState: WorkerSingleton = {
  worker: null,
  isReady: false,
  isInitializing: false,
  readyCallbacks: new Set(),
  errorCallbacks: new Set(),
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

      // Send init message after EventBridge setup
      workerState.worker.postMessage({ type: "init" });

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
      // TODO: Set up EventBridge listener for WORKER_READY

      // For now, assume ready after a short delay
      setTimeout(onReady, 100);

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