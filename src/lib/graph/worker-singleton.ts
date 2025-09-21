/**
 * Background Worker Singleton
 * Ensures only one worker instance exists across the entire application
 */

import { WorkerEventType } from "@/lib/graph/events/types";
import { logger } from "@/lib/logger";
import type { WorkerResponse } from "@/hooks/use-web-worker";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

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
    let messageListener: ((event: MessageEvent<WorkerResponse>) => void) | null = null;

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

        if (workerState.worker) {
          messageListener = (event: MessageEvent<WorkerResponse>) => {
            const data = event.data;
            if (!data) {
              return;
            }

            if (data.type === "READY" || data.event === WorkerEventType.WORKER_READY) {
              logger.debug("graph", "Worker ready message received", { event: data.event, type: data.type });
              onReady();
            }

            if (data.type === "ERROR" || data.event === WorkerEventType.WORKER_ERROR) {
              const payload = isRecord(data.payload) ? data.payload : undefined;
              const errorMessage = typeof data.error === "string"
                ? data.error
                : typeof payload?.error === "string"
                  ? payload.error
                  : "Worker error";
              logger.error("graph", "Background worker error", { error: errorMessage });
              workerState.errorCallbacks.forEach(callback => { callback(errorMessage); });
            }
          };

          workerState.worker.addEventListener("message", messageListener);
          workerState.worker.addEventListener("error", (error) => {
            const errorMessage = error?.message ?? "Unknown worker error";
            logger.error("graph", "Background worker error", { error: errorMessage });
            workerState.errorCallbacks.forEach(callback => { callback(errorMessage); });
          });
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
      if (readyTimeout !== null) {
        clearTimeout(readyTimeout);
      }
      if (workerState.worker && messageListener) {
        workerState.worker.removeEventListener("message", messageListener);
      }
      workerState.readyCallbacks.delete(onReady);
    }

    workerState.readyCallbacks.add(onReady);

    // Timeout for readiness failure (emit error instead of fallback resolve)
    readyTimeout = setTimeout(() => {
      logger.error("graph", "Worker not ready after timeout - EventBridge failure");
      cleanup();
      workerState.worker?.terminate();
      workerState.worker = null;
      workerState.isReady = false;
      workerState.isInitializing = false;
      workerState.readyCallbacks.clear();
      workerState.errorCallbacks.forEach(callback => { callback("Worker initialization timeout"); });

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
