/**
 * Background Worker Singleton
 * Ensures only one worker instance exists across the entire application
 */

import { WorkerEventType } from "@/lib/graph/events/types";
import { workerEventBus } from "@/lib/graph/events/broadcast-event-bus";
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
  // If worker is ready, return it immediately
  if (workerState.worker && workerState.isReady) {
    return Promise.resolve(workerState.worker);
  }

  // If worker exists but is still initializing, wait for it
  if (workerState.worker && workerState.isInitializing) {
    return new Promise((resolve) => {
      const onReady = () => {
        workerState.readyCallbacks.delete(onReady);
        if (workerState.worker) {
          resolve(workerState.worker);
        }
      };
      workerState.readyCallbacks.add(onReady);
    });
  }

  workerState.isInitializing = true;

  return new Promise((resolve, reject) => {
    const initializeWorker = async () => {
      try {
        // Prefer Vite/Nx worker constructor import for dev compatibility
        const importedWorkerModule = await import("../../workers/background.worker.ts?worker").catch(() => null);

        // Type guard for worker module
        const hasWorkerConstructor = (
          module: unknown
        ): module is { default: { new (): Worker } } => {
          return (
            module !== null &&
            typeof module === "object" &&
            "default" in module &&
            typeof module.default === "function"
          );
        };

        if (hasWorkerConstructor(importedWorkerModule)) {
          workerState.worker = new importedWorkerModule.default();
        } else {
          workerState.worker = new Worker(
            new URL("../../workers/background.worker.ts", import.meta.url),
            { type: "module" }
          );
        }
      } catch (error) {
        workerState.isInitializing = false;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.error("graph", "Failed to create background worker", { error: errorMessage });
        reject(new Error(`Failed to create worker: ${errorMessage}`));
        return;
      }
    };

    void initializeWorker();

    let readyTimeout: ReturnType<typeof setTimeout> | null = null;
    let hasResolved = false;

    const onReady = () => {
      if (hasResolved) {
        return;
      }
      hasResolved = true;
      cleanup();
      workerState.isReady = true;
      workerState.isInitializing = false;

      if (workerState.worker) {
        resolve(workerState.worker);
      }

      workerState.readyCallbacks.forEach(callback => { callback(); });
      workerState.readyCallbacks.clear();
    };

    function cleanup() {
      if (readyListenerId) {
        workerEventBus.removeListener(readyListenerId);
      }
      if (readyTimeout !== null) {
        clearTimeout(readyTimeout);
      }
      workerState.readyCallbacks.delete(onReady);
    }

    workerState.readyCallbacks.add(onReady);

    if (workerState.worker) {
      workerState.worker.addEventListener("error", (error) => {
        const errorMessage = error?.message ?? "Unknown worker error";
        logger.error("graph", "Background worker error", { error: errorMessage });
        workerState.errorCallbacks.forEach(callback => { callback(errorMessage); });
      });
    }

    // Worker will communicate via BroadcastChannel instead of direct messages

    // Worker will emit ready event via BroadcastChannel

    // Listen for worker ready via BroadcastChannel
    let readyListenerId: string | null = null;

    const handleWorkerReady = (payload: unknown) => {
      logger.debug("graph", "Worker ready event received via BroadcastChannel", { payload });

      // Type guard for worker ready payload
      if (
        payload &&
        typeof payload === "object" &&
        "workerType" in payload &&
        payload.workerType === "force-animation"
      ) {
        logger.debug("graph", "Worker ready event confirmed");
        onReady();
      }
    };

    logger.debug("graph", "Registering BroadcastChannel listener for worker ready");
    readyListenerId = workerEventBus.listen(WorkerEventType.WORKER_READY, handleWorkerReady);
    logger.debug("graph", "BroadcastChannel listener registered successfully");

    // Timeout for readiness failure (emit error instead of fallback resolve)
    readyTimeout = setTimeout(() => {
      logger.error("graph", "Worker not ready after timeout - BroadcastChannel communication failure");
      cleanup();
      workerState.worker?.terminate();
      workerState.worker = null;
      workerState.isReady = false;
      workerState.isInitializing = false;
      workerState.readyCallbacks.clear();

      workerEventBus.emit(
        WorkerEventType.WORKER_ERROR,
        {
          workerId: "background-worker",
          workerType: "force-animation",
          error: "Worker initialization timeout",
          timestamp: Date.now()
        }
      );

      reject(new Error("Worker readiness timeout"));
    }, 10000); // Longer timeout for better reliability
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
