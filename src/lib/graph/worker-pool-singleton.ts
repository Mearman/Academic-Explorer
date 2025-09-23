/**
 * Global Worker Pool Singleton
 * Ensures only one worker pool exists across the entire application
 */

import { EventBus, createLocalEventBus } from "@/lib/graph/events";
import { WorkerPool, createWorkerPool } from "@/lib/graph/events";
import { logger } from "@/lib/logger";

interface WorkerPoolSingleton {
  bus: EventBus;
  workerPool: WorkerPool;
  isInitialized: boolean;
}

let globalWorkerPoolSingleton: WorkerPoolSingleton | null = null;

/**
 * Get or create the global worker pool singleton
 */
export function getGlobalWorkerPool(): WorkerPoolSingleton {
  if (!globalWorkerPoolSingleton) {
    logger.debug("workerpool", "Creating global worker pool singleton");

    const bus = createLocalEventBus();
    const workerModulePath = new URL("../../workers/background.worker.ts", import.meta.url).href;
    const workerPool = createWorkerPool(bus, {
      size: 2,
      workerModule: workerModulePath
    });

    globalWorkerPoolSingleton = {
      bus,
      workerPool,
      isInitialized: true
    };

    logger.debug("workerpool", "Global worker pool singleton created successfully");
  }

  return globalWorkerPoolSingleton;
}

/**
 * Cleanup the global worker pool (for testing or app shutdown)
 */
export function destroyGlobalWorkerPool(): void {
  if (globalWorkerPoolSingleton) {
    logger.debug("workerpool", "Destroying global worker pool singleton");
    globalWorkerPoolSingleton.workerPool.shutdown();
    globalWorkerPoolSingleton.bus.destroy();
    globalWorkerPoolSingleton = null;
  }
}