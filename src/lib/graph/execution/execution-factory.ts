/**
 * Execution Factory
 * Creates appropriate execution strategy based on environment capabilities
 */

import { logger } from "@/lib/logger";
import type { EventBus } from "@/lib/graph/events/unified-event-bus";
import type { ExecutionStrategy } from "./execution-strategy";
import { WorkerExecutionStrategy } from "./worker-execution-strategy";
import { MainThreadExecutionStrategy, SimpleTaskExecutorRegistry } from "./main-thread-execution-strategy";
import { createForceSimulationExecutor } from "./force-simulation-executor";

export interface ExecutionFactoryOptions {
  /**
   * Preferred execution mode
   * - "auto": Automatically detect best available mode
   * - "worker": Force worker mode (will fallback to main thread if workers not available)
   * - "main-thread": Force main thread mode
   */
  mode?: "auto" | "worker" | "main-thread";

  /**
   * Maximum concurrent tasks
   */
  maxConcurrency?: number;

  /**
   * Worker module path (required for worker mode)
   */
  workerModule?: string;

  /**
   * Whether to enable worker fallback when workers fail
   */
  enableWorkerFallback?: boolean;
}

/**
 * Detect if workers are available and functional
 */
export function detectWorkerSupport(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof Worker === "undefined") {
      logger.debug("execution", "Workers not available - no Worker constructor");
      resolve(false);
      return;
    }

    try {
      // Try to create a simple worker to test functionality
      const blob = new Blob(
        [`self.postMessage({ type: "test", success: true });`],
        { type: "application/javascript" }
      );
      const workerUrl = URL.createObjectURL(blob);
      const testWorker = new Worker(workerUrl);

      const timeout = setTimeout(() => {
        testWorker.terminate();
        URL.revokeObjectURL(workerUrl);
        logger.debug("execution", "Worker test timed out");
        resolve(false);
      }, 1000);

      testWorker.onmessage = (e) => {
        clearTimeout(timeout);
        testWorker.terminate();
        URL.revokeObjectURL(workerUrl);

        const success = e.data?.type === "test" && e.data?.success === true;
        logger.debug("execution", "Worker test completed", { success });
        resolve(success);
      };

      testWorker.onerror = () => {
        clearTimeout(timeout);
        testWorker.terminate();
        URL.revokeObjectURL(workerUrl);
        logger.debug("execution", "Worker test failed with error");
        resolve(false);
      };

    } catch (error) {
      logger.debug("execution", "Worker test failed with exception", { error });
      resolve(false);
    }
  });
}

/**
 * Create an execution strategy based on options and environment
 */
export async function createExecutionStrategy(
  bus: EventBus,
  options: ExecutionFactoryOptions = {}
): Promise<ExecutionStrategy> {
  const {
    mode = "auto",
    maxConcurrency = 2,
    workerModule,
    enableWorkerFallback = true
  } = options;

  logger.debug("execution", "Creating execution strategy", {
    mode,
    maxConcurrency,
    hasWorkerModule: !!workerModule,
    enableWorkerFallback
  });

  // Force main thread mode
  if (mode === "main-thread") {
    logger.debug("execution", "Using main thread execution strategy (forced)");
    return createMainThreadStrategy(bus, maxConcurrency);
  }

  // Auto or worker mode - check worker support
  const workersSupported = await detectWorkerSupport();

  if (!workersSupported) {
    if (mode === "worker") {
      logger.warn("execution", "Workers requested but not supported, falling back to main thread");
    } else {
      logger.debug("execution", "Workers not supported, using main thread");
    }
    return createMainThreadStrategy(bus, maxConcurrency);
  }

  // Workers are supported
  if (mode === "worker" || mode === "auto") {
    if (!workerModule) {
      logger.warn("execution", "Worker mode requested but no worker module provided, falling back to main thread");
      return createMainThreadStrategy(bus, maxConcurrency);
    }

    try {
      logger.debug("execution", "Using worker execution strategy");
      const workerStrategy = new WorkerExecutionStrategy(bus, {
        maxConcurrency,
        workerModule
      });

      // Test the worker strategy with a simple task if fallback is enabled
      if (enableWorkerFallback) {
        try {
          // TODO: Add worker validation if needed
          logger.debug("execution", "Worker strategy created successfully");
        } catch (error) {
          logger.warn("execution", "Worker strategy validation failed, falling back to main thread", { error });
          return createMainThreadStrategy(bus, maxConcurrency);
        }
      }

      return workerStrategy;

    } catch (error) {
      logger.error("execution", "Failed to create worker strategy", { error });

      if (enableWorkerFallback) {
        logger.debug("execution", "Falling back to main thread execution");
        return createMainThreadStrategy(bus, maxConcurrency);
      } else {
        throw error;
      }
    }
  }

  // Fallback to main thread
  logger.debug("execution", "Falling back to main thread execution");
  return createMainThreadStrategy(bus, maxConcurrency);
}

/**
 * Create a main thread execution strategy with pre-registered executors
 */
function createMainThreadStrategy(bus: EventBus, maxConcurrency: number): ExecutionStrategy {
  const registry = new SimpleTaskExecutorRegistry();

  // Register force simulation executor
  const forceSimulationExecutor = createForceSimulationExecutor();
  registry.register("FORCE_SIMULATION_START", forceSimulationExecutor);
  registry.register("FORCE_SIMULATION_STOP", forceSimulationExecutor);
  registry.register("FORCE_SIMULATION_PAUSE", forceSimulationExecutor);
  registry.register("FORCE_SIMULATION_RESUME", forceSimulationExecutor);
  registry.register("FORCE_SIMULATION_UPDATE_PARAMETERS", forceSimulationExecutor);
  registry.register("FORCE_SIMULATION_REHEAT", forceSimulationExecutor);
  registry.register("FORCE_SIMULATION_UPDATE_LINKS", forceSimulationExecutor);
  registry.register("FORCE_SIMULATION_UPDATE_NODES", forceSimulationExecutor);

  logger.debug("execution", "Registered force simulation executors", {
    registeredTypes: [
      "FORCE_SIMULATION_START",
      "FORCE_SIMULATION_STOP",
      "FORCE_SIMULATION_PAUSE",
      "FORCE_SIMULATION_RESUME",
      "FORCE_SIMULATION_UPDATE_PARAMETERS",
      "FORCE_SIMULATION_REHEAT",
      "FORCE_SIMULATION_UPDATE_LINKS",
      "FORCE_SIMULATION_UPDATE_NODES"
    ]
  });

  return new MainThreadExecutionStrategy(bus, {
    maxConcurrency,
    executorRegistry: registry
  });
}

/**
 * Execution modes for external configuration
 */
export const ExecutionMode = {
  AUTO: "auto" as const,
  WORKER: "worker" as const,
  MAIN_THREAD: "main-thread" as const
} as const;

export type ExecutionModeType = typeof ExecutionMode[keyof typeof ExecutionMode];