/**
 * Force Simulation Task Executor for Main Thread Execution
 * Handles force simulation tasks without workers using ForceSimulationEngine
 */

import { logger } from "@/lib/logger";
import { ForceSimulationEngine } from "@/lib/graph/simulation/force-simulation-engine";
import { DEFAULT_FORCE_PARAMS } from "@/lib/graph/force-params";
import { WorkerEventType } from "@/lib/graph/events/types";
import type { SimulationCallbacks } from "@/lib/graph/simulation/force-simulation-engine";
import type {
  ForceSimulationNode,
  ForceSimulationLink,
  ForceSimulationConfig,
  NodePosition
} from "@/lib/graph/events/enhanced-worker-types";
import type {
  TaskExecutor,
  ForceSimulationTask
} from "./execution-strategy";

/**
 * Create a force simulation task executor that runs on the main thread
 */
export function createForceSimulationExecutor(): TaskExecutor {
  let simulationEngine: ForceSimulationEngine | null = null;

  return async (payload: unknown, emit: (event: { type: string; payload?: unknown }) => void): Promise<unknown> => {
    logger.debug("execution", "Force simulation executor called", { payload });

    // Validate payload is a force simulation task
    if (!payload || typeof payload !== "object" || !("type" in payload)) {
      throw new Error("Invalid force simulation task payload");
    }

    const task = payload as ForceSimulationTask;

    // Create simulation engine with callbacks if needed
    if (!simulationEngine) {
      const callbacks: SimulationCallbacks = {
        onProgress: (progressPayload) => {
          logger.debug("execution", "Force simulation progress", progressPayload);

          emit({
            type: "PROGRESS",
            payload: {
              type: WorkerEventType.FORCE_SIMULATION_PROGRESS,
              workerId: "main-thread",
              workerType: "force-animation",
              messageType: progressPayload.messageType,
              positions: progressPayload.positions,
              alpha: progressPayload.alpha,
              iteration: progressPayload.iteration,
              progress: progressPayload.alpha ? Math.max(0, Math.min(1, 1 - progressPayload.alpha)) : 1,
              fps: progressPayload.fps,
              nodeCount: progressPayload.nodeCount,
              linkCount: progressPayload.linkCount,
              timestamp: Date.now()
            }
          });
        },

        onComplete: (completePayload) => {
          logger.debug("execution", "Force simulation complete", completePayload);

          emit({
            type: "PROGRESS",
            payload: {
              type: WorkerEventType.FORCE_SIMULATION_COMPLETE,
              workerId: "main-thread",
              workerType: "force-animation",
              positions: completePayload.positions,
              totalIterations: completePayload.totalIterations,
              finalAlpha: completePayload.finalAlpha,
              reason: completePayload.reason,
              timestamp: Date.now()
            }
          });
        },

        onError: (error, context) => {
          logger.error("execution", "Force simulation error", { error, context });

          emit({
            type: "PROGRESS",
            payload: {
              type: WorkerEventType.FORCE_SIMULATION_ERROR,
              workerId: "main-thread",
              workerType: "force-animation",
              error,
              context: {
                ...context,
                runtime: 0
              },
              timestamp: Date.now()
            }
          });
        }
      };

      simulationEngine = new ForceSimulationEngine({
        callbacks,
        logger,
        config: DEFAULT_FORCE_PARAMS,
        progressThrottleMs: 16,
        fpsIntervalMs: 1000
      });
    }

    // Handle different task types
    switch (task.type) {
      case "FORCE_SIMULATION_START": {
        logger.debug("execution", "Starting force simulation", {
          nodeCount: task.nodes.length,
          linkCount: task.links.length
        });

        const result = simulationEngine.start({
          nodes: task.nodes,
          links: task.links,
          config: task.config ?? DEFAULT_FORCE_PARAMS,
          pinnedNodes: task.pinnedNodes ?? []
        });

        return {
          type: "FORCE_SIMULATION_CONTROL_ACK",
          action: "FORCE_SIMULATION_START",
          status: "ok",
          timestamp: Date.now()
        };
      }

      case "FORCE_SIMULATION_STOP": {
        logger.debug("execution", "Stopping force simulation");
        simulationEngine.stop();

        return {
          type: "FORCE_SIMULATION_CONTROL_ACK",
          action: "FORCE_SIMULATION_STOP",
          status: "ok",
          timestamp: Date.now()
        };
      }

      case "FORCE_SIMULATION_PAUSE": {
        logger.debug("execution", "Pausing force simulation");
        simulationEngine.pause();

        return {
          type: "FORCE_SIMULATION_CONTROL_ACK",
          action: "FORCE_SIMULATION_PAUSE",
          status: "ok",
          timestamp: Date.now()
        };
      }

      case "FORCE_SIMULATION_RESUME": {
        logger.debug("execution", "Resuming force simulation");
        simulationEngine.resume();

        return {
          type: "FORCE_SIMULATION_CONTROL_ACK",
          action: "FORCE_SIMULATION_RESUME",
          status: "ok",
          timestamp: Date.now()
        };
      }

      case "FORCE_SIMULATION_UPDATE_PARAMETERS": {
        logger.debug("execution", "Updating force simulation parameters", {
          config: task.config
        });
        simulationEngine.updateParameters(task.config);

        return {
          type: "FORCE_SIMULATION_CONTROL_ACK",
          action: "FORCE_SIMULATION_UPDATE_PARAMETERS",
          status: "ok",
          timestamp: Date.now()
        };
      }

      case "FORCE_SIMULATION_REHEAT": {
        logger.debug("execution", "Reheating force simulation", {
          nodeCount: task.nodes.length,
          linkCount: task.links.length,
          alpha: task.alpha
        });

        simulationEngine.reheat({
          nodes: task.nodes,
          links: task.links,
          config: task.config ?? DEFAULT_FORCE_PARAMS,
          pinnedNodes: task.pinnedNodes ?? [],
          alpha: task.alpha ?? 1.0
        });

        return {
          type: "FORCE_SIMULATION_CONTROL_ACK",
          action: "FORCE_SIMULATION_REHEAT",
          status: "ok",
          nodeCount: task.nodes.length,
          linkCount: task.links.length,
          alpha: task.alpha ?? 1.0,
          timestamp: Date.now()
        };
      }

      case "FORCE_SIMULATION_UPDATE_LINKS": {
        logger.debug("execution", "Updating force simulation links", {
          linkCount: task.links.length,
          alpha: task.alpha
        });

        simulationEngine.updateLinks(task.links, task.alpha ?? 1.0);

        return {
          type: "FORCE_SIMULATION_CONTROL_ACK",
          action: "FORCE_SIMULATION_UPDATE_LINKS",
          status: "ok",
          linkCount: task.links.length,
          alpha: task.alpha ?? 1.0,
          timestamp: Date.now()
        };
      }

      case "FORCE_SIMULATION_UPDATE_NODES": {
        logger.debug("execution", "Updating force simulation nodes", {
          nodeCount: task.nodes.length,
          pinnedCount: task.pinnedNodes?.length ?? 0,
          alpha: task.alpha
        });

        simulationEngine.updateNodes(
          task.nodes,
          task.pinnedNodes ?? [],
          task.alpha ?? 1.0
        );

        return {
          type: "FORCE_SIMULATION_CONTROL_ACK",
          action: "FORCE_SIMULATION_UPDATE_NODES",
          status: "ok",
          nodeCount: task.nodes.length,
          pinnedCount: task.pinnedNodes?.length ?? 0,
          alpha: task.alpha ?? 1.0,
          timestamp: Date.now()
        };
      }

      default: {
        const unknownTask = task as { type: string };
        throw new Error(`Unknown force simulation task type: ${unknownTask.type}`);
      }
    }
  };
}