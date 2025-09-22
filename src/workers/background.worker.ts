/**
 * Background Worker with D3 Force Simulation Implementation
 * Uses ForceSimulationEngine for testable simulation logic
 * Supports deterministic seeded layouts and real-time position updates
 */

// IMMEDIATE TEST: Log when worker loads
console.log("🚨 WORKER FILE LOADED - NEW VERSION WITH FORCE ENGINE", Date.now());

import { z } from "zod";
import { WorkerEventType } from "@/lib/graph/events/types";
import { createLocalEventBus } from "@/lib/graph/events";
import { logger } from "@/lib/logger";
import type {
  ForceSimulationNode,
  ForceSimulationLink,
  ForceSimulationConfig,
  NodePosition
} from "@/lib/graph/events/enhanced-worker-types";
import { DEFAULT_FORCE_PARAMS } from "@/lib/graph/force-params";
import type { EntityType } from "@/lib/graph/types";
import { ForceSimulationEngine, type SimulationCallbacks } from "@/lib/graph/simulation/force-simulation-engine";

// Create worker event bus for cross-context communication
const workerEventBus = createLocalEventBus();

// Type guard for EntityType validation
function isValidEntityType(value: unknown): value is EntityType {
  return typeof value === "string" &&
    ["works", "authors", "sources", "institutions", "topics", "concepts", "publishers", "funders", "keywords"].includes(value);
}

// Worker state
let simulationEngine: ForceSimulationEngine | null = null;
let startTime = 0;
let lastProgressTime = 0;
let lastFpsTime = 0;
let frameCount = 0;
const PROGRESS_THROTTLE_MS = 16; // ~60fps
const FPS_CALCULATION_INTERVAL = 1000; // 1 second

// Create simulation engine with callbacks
function createSimulationEngine(): ForceSimulationEngine {
  const callbacks: SimulationCallbacks = {
    onProgress: (payload) => {
      const now = Date.now();

      if (payload.messageType === "tick") {
        console.log("🚀 WORKER emitProgress called", {
          messageType: payload.messageType,
          positionsLength: payload.positions?.length,
          timeSinceLastProgress: now - lastProgressTime,
          throttleMs: PROGRESS_THROTTLE_MS
        });
      }

      // Throttle progress updates except for important state changes
      if (payload.messageType === "tick" && (now - lastProgressTime) < PROGRESS_THROTTLE_MS) {
        console.log("⏭️ WORKER throttling tick event");
        return;
      }

      lastProgressTime = now;

      // Calculate FPS for tick messages
      let fps = 0;
      if (payload.messageType === "tick") {
        frameCount++;
        if (now - lastFpsTime >= FPS_CALCULATION_INTERVAL) {
          fps = Math.round((frameCount * 1000) / (now - lastFpsTime));
          frameCount = 0;
          lastFpsTime = now;
        }
      }

      const progress = payload.alpha ? Math.max(0, Math.min(1, 1 - payload.alpha)) : 1;

      const progressEvent = {
        type: WorkerEventType.FORCE_SIMULATION_PROGRESS,
        payload: {
          workerId: "background-worker",
          workerType: "force-animation" as const,
          messageType: payload.messageType,
          positions: payload.positions,
          alpha: payload.alpha,
          iteration: payload.iteration,
          progress,
          fps: fps || undefined,
          nodeCount: payload.nodeCount,
          linkCount: payload.linkCount,
          timestamp: now
        }
      };

      workerEventBus.emit(progressEvent);

      const message = {
        type: "PROGRESS",
        payload: {
          type: WorkerEventType.FORCE_SIMULATION_PROGRESS,
          ...progressEvent.payload
        }
      };

      if (payload.messageType === "tick") {
        console.log("📤 WORKER postMessage", { messageType: payload.messageType, payloadType: message.payload.type });
      }

      self.postMessage(message);
    },

    onComplete: (payload) => {
      const completeEvent = {
        type: WorkerEventType.FORCE_SIMULATION_COMPLETE,
        payload: {
          workerId: "background-worker",
          workerType: "force-animation" as const,
          positions: payload.positions,
          totalIterations: payload.totalIterations,
          finalAlpha: payload.finalAlpha,
          reason: payload.reason,
          timestamp: Date.now()
        }
      };

      workerEventBus.emit(completeEvent);

      self.postMessage({
        type: "SUCCESS",
        payload: {
          type: WorkerEventType.FORCE_SIMULATION_COMPLETE,
          ...completeEvent.payload
        }
      });
    },

    onError: (error, context) => {
      const errorPayload = {
        workerId: "background-worker",
        workerType: "force-animation" as const,
        error,
        context: {
          ...context,
          runtime: startTime > 0 ? Date.now() - startTime : 0
        },
        timestamp: Date.now()
      };

      logger.error("worker", "Force simulation error with context", errorPayload);

      workerEventBus.emit({
        type: WorkerEventType.FORCE_SIMULATION_ERROR,
        payload: errorPayload
      });

      self.postMessage({
        type: "ERROR",
        payload: `Force simulation error: ${error}. Context: ${JSON.stringify(errorPayload.context)}`
      });
    }
  };

  return new ForceSimulationEngine({
    callbacks,
    logger,
    config: DEFAULT_FORCE_PARAMS,
    progressThrottleMs: PROGRESS_THROTTLE_MS,
    fpsIntervalMs: FPS_CALCULATION_INTERVAL
  });
}


// Zod schemas for type validation
const forceSimulationNodeSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  fx: z.number().optional(),
  fy: z.number().optional(),
});

const forceSimulationLinkSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
});

const forceSimulationConfigSchema = z.object({
  linkDistance: z.number().optional(),
  linkStrength: z.number().optional(),
  chargeStrength: z.number().optional(),
  centerStrength: z.number().optional(),
  collisionRadius: z.number().optional(),
  collisionStrength: z.number().optional(),
  velocityDecay: z.number().optional(),
  alphaDecay: z.number().optional(),
  maxIterations: z.number().optional(),
  seed: z.number().optional(),
});

const forceSimulationStartMessageSchema = z.object({
  type: z.literal("FORCE_SIMULATION_START"),
  nodes: z.array(forceSimulationNodeSchema),
  links: z.array(forceSimulationLinkSchema),
  config: forceSimulationConfigSchema.optional(),
  pinnedNodes: z.array(z.string()).optional(),
});

const forceSimulationControlMessageSchema = z.object({
  type: z.enum(["FORCE_SIMULATION_STOP", "FORCE_SIMULATION_PAUSE", "FORCE_SIMULATION_RESUME", "FORCE_SIMULATION_UPDATE_PARAMETERS", "FORCE_SIMULATION_REHEAT", "FORCE_SIMULATION_UPDATE_LINKS", "FORCE_SIMULATION_UPDATE_NODES"]),
  config: forceSimulationConfigSchema.partial().optional(),
});

const forceSimulationReheatMessageSchema = z.object({
  type: z.literal("FORCE_SIMULATION_REHEAT"),
  nodes: z.array(forceSimulationNodeSchema),
  links: z.array(forceSimulationLinkSchema),
  config: forceSimulationConfigSchema.optional(),
  pinnedNodes: z.array(z.string()).optional(),
  alpha: z.number().optional().default(1.0),
});

const forceSimulationUpdateLinksMessageSchema = z.object({
  type: z.literal("FORCE_SIMULATION_UPDATE_LINKS"),
  links: z.array(forceSimulationLinkSchema),
  alpha: z.number().optional().default(1.0), // Full alpha reset to restart current simulation
});

const forceSimulationUpdateNodesMessageSchema = z.object({
  type: z.literal("FORCE_SIMULATION_UPDATE_NODES"),
  nodes: z.array(forceSimulationNodeSchema),
  pinnedNodes: z.array(z.string()).optional(),
  alpha: z.number().optional().default(1.0),
});

// Schema for worker pool task wrapper
const executeTaskMessageSchema = z.object({
  type: z.literal("EXECUTE_TASK"),
  taskId: z.string(),
  payload: z.unknown()
});

// Type guards using Zod
function isForceSimulationStartMessage(data: unknown): data is z.infer<typeof forceSimulationStartMessageSchema> {
  return forceSimulationStartMessageSchema.safeParse(data).success;
}

function isForceSimulationMessage(data: unknown): data is z.infer<typeof forceSimulationControlMessageSchema> {
  return forceSimulationControlMessageSchema.safeParse(data).success;
}

function isExecuteTaskMessage(data: unknown): data is z.infer<typeof executeTaskMessageSchema> {
  return executeTaskMessageSchema.safeParse(data).success;
}

// Simple wrapper functions that delegate to the ForceSimulationEngine
function startSimulation(params: {
  nodes: ForceSimulationNode[];
  links: ForceSimulationLink[];
  config?: ForceSimulationConfig;
  pinnedNodes?: string[];
}) {
  if (!simulationEngine) {
    simulationEngine = createSimulationEngine();
  }

  startTime = Date.now();
  simulationEngine.start(params);
}

function stopSimulation() {
  simulationEngine?.stop();
}

function pauseSimulation() {
  simulationEngine?.pause();
}

function resumeSimulation() {
  simulationEngine?.resume();
}

function updateSimulationParameters(config: Partial<ForceSimulationConfig>) {
  simulationEngine?.updateParameters(config);
}

function reheatSimulation(params: {
  nodes: ForceSimulationNode[];
  links: ForceSimulationLink[];
  config: ForceSimulationConfig;
  pinnedNodes?: string[];
  alpha?: number;
}) {
  if (!simulationEngine) {
    simulationEngine = createSimulationEngine();
  }

  simulationEngine.reheat(params);
}

function updateSimulationLinks(params: {
  links: ForceSimulationLink[];
  alpha?: number;
}) {
  if (!simulationEngine) {
    simulationEngine = createSimulationEngine();
  }

  simulationEngine.updateLinks(params.links, params.alpha);
}

function updateSimulationNodes(params: {
  nodes: ForceSimulationNode[];
  pinnedNodes?: string[];
  alpha?: number;
}) {
  if (!simulationEngine) {
    simulationEngine = createSimulationEngine();
  }

  simulationEngine.updateNodes(params.nodes, params.pinnedNodes ?? [], params.alpha);
}






// Message handling
self.onmessage = (e: MessageEvent) => {
  const data: unknown = e.data;

  try {
    // Handle worker pool task wrapper format
    if (isExecuteTaskMessage(data)) {
      logger.debug("worker", "Received EXECUTE_TASK message", {
        taskId: data.taskId,
        payloadType: typeof data.payload
      });

      // Extract the actual payload and process it
      const actualPayload = data.payload;

      if (isForceSimulationStartMessage(actualPayload)) {
        const validatedNodes = actualPayload.nodes.map(node => ({
          ...node,
          type: isValidEntityType(node.type) ? node.type : undefined
        }));
        startSimulation({
          nodes: validatedNodes,
          links: actualPayload.links,
          config: actualPayload.config ?? DEFAULT_FORCE_PARAMS,
          pinnedNodes: actualPayload.pinnedNodes ?? []
        });
      } else if (isForceSimulationMessage(actualPayload)) {
        switch (actualPayload.type) {
          case "FORCE_SIMULATION_STOP":
            stopSimulation();
            break;
          case "FORCE_SIMULATION_PAUSE":
            pauseSimulation();
            break;
          case "FORCE_SIMULATION_RESUME":
            resumeSimulation();
            break;
          case "FORCE_SIMULATION_UPDATE_PARAMETERS":
            if (actualPayload.config) {
              updateSimulationParameters(actualPayload.config);
            }
            break;
          case "FORCE_SIMULATION_UPDATE_LINKS":
            if (forceSimulationUpdateLinksMessageSchema.safeParse(actualPayload).success) {
              const updateLinksPayload = forceSimulationUpdateLinksMessageSchema.parse(actualPayload);
              updateSimulationLinks({
                links: updateLinksPayload.links,
                alpha: updateLinksPayload.alpha ?? 1.0
              });
            } else {
              logger.warn("worker", "Invalid link update payload in task", { actualPayload });
            }
            break;
          case "FORCE_SIMULATION_UPDATE_NODES":
            if (forceSimulationUpdateNodesMessageSchema.safeParse(actualPayload).success) {
              const updateNodesPayload = forceSimulationUpdateNodesMessageSchema.parse(actualPayload);
              const validatedNodes = updateNodesPayload.nodes.map(node => ({
                ...node,
                type: isValidEntityType(node.type) ? node.type : undefined
              }));
              updateSimulationNodes({
                nodes: validatedNodes,
                pinnedNodes: updateNodesPayload.pinnedNodes ?? [],
                alpha: updateNodesPayload.alpha ?? 1.0
              });
            } else {
              logger.warn("worker", "Invalid node update payload in task", { actualPayload });
            }
            break;
          default:
            logger.warn("worker", "Unknown simulation control message in task", { actualPayload });
        }
      } else {
        logger.warn("worker", "Unknown task payload format", {
          taskId: data.taskId,
          payload: actualPayload
        });
      }
    }
    // Handle direct message format (for backwards compatibility)
    else if (isForceSimulationStartMessage(data)) {
      startSimulation({
        nodes: data.nodes as ForceSimulationNode[],
        links: data.links,
        config: data.config ?? DEFAULT_FORCE_PARAMS,
        pinnedNodes: data.pinnedNodes ?? []
      });
    } else if (isForceSimulationMessage(data)) {
      switch (data.type) {
        case "FORCE_SIMULATION_STOP":
          stopSimulation();
          break;

        case "FORCE_SIMULATION_PAUSE":
          pauseSimulation();
          break;

        case "FORCE_SIMULATION_RESUME":
          resumeSimulation();
          break;

        case "FORCE_SIMULATION_UPDATE_PARAMETERS":
          if (data.config) {
            updateSimulationParameters(data.config);
          }
          break;

        case "FORCE_SIMULATION_REHEAT":
          // Handle reheat with updated data
          console.log("🔥 WORKER RECEIVED REHEAT MESSAGE!", data);
          if (forceSimulationReheatMessageSchema.safeParse(data).success) {
            const reheatData = forceSimulationReheatMessageSchema.parse(data);
            // Convert nodes to proper ForceSimulationNode format with type guard
            const validatedNodes = reheatData.nodes.map(node => ({
              ...node,
              type: isValidEntityType(node.type) ? node.type : undefined
            }));
            console.log("🔥 WORKER CALLING reheatSimulation with data:", {
              nodeCount: validatedNodes.length,
              linkCount: reheatData.links.length,
              alpha: reheatData.alpha,
              linkDetails: reheatData.links.map(link => ({ id: link.id, source: link.source, target: link.target }))
            });
            try {
              console.log("🔥 ABOUT TO CALL reheatSimulation");
              reheatSimulation({
                nodes: validatedNodes,
                links: reheatData.links,
                config: reheatData.config ?? DEFAULT_FORCE_PARAMS,
                pinnedNodes: reheatData.pinnedNodes ?? [],
                alpha: reheatData.alpha ?? 1.0
              });
              console.log("🔥 reheatSimulation CALL COMPLETED");
            } catch (error) {
              console.log("🔥 ERROR CALLING reheatSimulation:", error);
            }
          } else {
            console.log("🔥 WORKER REHEAT MESSAGE VALIDATION FAILED!", forceSimulationReheatMessageSchema.safeParse(data).error);
          }
          break;

        case "FORCE_SIMULATION_UPDATE_LINKS":
          // Handle dynamic link updates during running simulation
          console.log("🔗 WORKER RECEIVED UPDATE_LINKS MESSAGE!", data);
          if (forceSimulationUpdateLinksMessageSchema.safeParse(data).success) {
            const updateData = forceSimulationUpdateLinksMessageSchema.parse(data);
            console.log("🔗 WORKER CALLING updateSimulationLinks with data:", {
              linkCount: updateData.links.length,
              alpha: updateData.alpha,
              linkDetails: updateData.links.slice(0, 3).map(link => ({ id: link.id, source: link.source, target: link.target }))
            });
            try {
              console.log("🔗 ABOUT TO CALL updateSimulationLinks");
              updateSimulationLinks({
                links: updateData.links,
                alpha: updateData.alpha ?? 1.0
              });
              console.log("🔗 updateSimulationLinks CALL COMPLETED");
            } catch (error) {
              console.log("🔗 ERROR CALLING updateSimulationLinks:", error);
            }
          } else {
            console.log("🔗 WORKER UPDATE_LINKS MESSAGE VALIDATION FAILED!", forceSimulationUpdateLinksMessageSchema.safeParse(data).error);
          }
          break;

        case "FORCE_SIMULATION_UPDATE_NODES":
          console.log("🧩 WORKER RECEIVED UPDATE_NODES MESSAGE!", data);
          if (forceSimulationUpdateNodesMessageSchema.safeParse(data).success) {
            const updateData = forceSimulationUpdateNodesMessageSchema.parse(data);
            try {
              const validatedNodes = updateData.nodes.map(node => ({
                ...node,
                type: isValidEntityType(node.type) ? node.type : undefined
              }));
              updateSimulationNodes({
                nodes: validatedNodes,
                pinnedNodes: updateData.pinnedNodes ?? [],
                alpha: updateData.alpha ?? 1.0
              });
            } catch (error) {
              console.log("🧩 ERROR CALLING updateSimulationNodes:", error);
            }
          } else {
            console.log("🧩 WORKER UPDATE_NODES MESSAGE VALIDATION FAILED!", forceSimulationUpdateNodesMessageSchema.safeParse(data).error);
          }
          break;

        default:
          logger.warn("worker", "Unknown simulation message type", { type: data.type });
      }
    } else {
      logger.warn("worker", "Unknown message type", { data });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    const errorContext = {
      messageData: JSON.stringify(data).substring(0, 200) + '...',
      messageType: typeof data === 'object' && data && 'type' in data ? String(data.type) : 'unknown',
      errorStack,
      workerState: {
        hasSimulationEngine: !!simulationEngine
      }
    };

    logger.error("worker", "Error handling worker message", {
      error: errorMessage,
      stack: errorStack,
      data,
      context: errorContext
    });
    self.postMessage({
      type: "ERROR",
      payload: `Message handling error: ${errorMessage}. Context: ${JSON.stringify(errorContext)}`
    });
  }
};

// Initialize worker
function initializeWorker() {
  try {
    // Emit worker ready event via both event bus (for worker context) and postMessage (for main thread)
    const readyEvent = {
      type: WorkerEventType.WORKER_READY,
      payload: {
        workerId: "background-worker",
        workerType: "force-animation",
        timestamp: Date.now()
      }
    };

    // Emit via event bus for worker context
    workerEventBus.emit(readyEvent);

    // Post message to main thread
    self.postMessage(readyEvent);

    logger.debug("worker", "D3 Force simulation worker initialized successfully");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    const errorContext = {
      initializationPhase: 'worker_setup',
      errorStack,
      workerState: {
        hasSimulationEngine: !!simulationEngine
      }
    };

    logger.error("worker", "Failed to initialize D3 force simulation worker", {
      error: errorMessage,
      stack: errorStack,
      context: errorContext
    });

    const errorEvent = {
      type: WorkerEventType.WORKER_ERROR,
      payload: {
        workerId: "background-worker",
        workerType: "force-animation",
        error: `Worker initialization failed: ${errorMessage}`,
        context: errorContext,
        timestamp: Date.now()
      }
    };

    workerEventBus.emit(errorEvent);
    // Send error to TaskQueue in expected format
    self.postMessage({
      type: "ERROR",
      payload: `Worker initialization failed: ${errorMessage}. Context: ${JSON.stringify(errorContext)}`
    });
  }
}

// Handle worker termination
self.addEventListener("beforeunload", () => {
  if (simulationEngine) {
    simulationEngine.stop();
  }
});

// Initialize worker on startup
try {
  initializeWorker();
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : 'No stack trace';
  const errorContext = {
    initializationPhase: 'global_init',
    errorStack,
    workerEnvironment: {
      hasSimulationEngine: !!simulationEngine,
      hasLogger: typeof logger !== 'undefined',
      hasEventBus: !!workerEventBus
    }
  };

  const errorEvent = {
    type: WorkerEventType.WORKER_ERROR,
    payload: {
      workerId: "background-worker",
      workerType: "force-animation",
      error: `Global worker initialization failed: ${errorMessage}`,
      context: errorContext,
      timestamp: Date.now()
    }
  };

  workerEventBus.emit(errorEvent);
  // Send error to TaskQueue in expected format
  self.postMessage({
    type: "ERROR",
    payload: `Global worker initialization failed: ${errorMessage}. Context: ${JSON.stringify(errorContext)}`
  });
}
