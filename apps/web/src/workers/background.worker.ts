/**
 * Background Worker with D3 Force Simulation Implementation
 * Uses ForceSimulationEngine for testable simulation logic
 * Supports deterministic seeded layouts and real-time position updates
 */

// Log when worker loads
logger.debug("worker", "Background worker loaded and starting", {});
self.addEventListener("message", (e) => {
  logger.debug("worker", "Worker received message", { data: e.data });
});

import { z } from "zod";
import { WorkerEventType } from "@academic-explorer/graph";
import { createLocalEventBus } from "@academic-explorer/graph";
import { logger } from "@academic-explorer/utils/logger";
import type {
  SimulationNode as ForceSimulationNode,
  SimulationLink as ForceSimulationLink,
  ForceSimulationConfig
} from "@academic-explorer/simulation";
import type { EntityType } from "@academic-explorer/graph";
import { ForceSimulationEngine, DEFAULT_FORCE_PARAMS } from "@academic-explorer/simulation";

// Create worker event bus for cross-context communication
const workerEventBus = createLocalEventBus();

// Type guard for EntityType validation
function isValidEntityType(value: unknown): value is EntityType {
  return typeof value === "string" &&
    ["works", "authors", "sources", "institutions", "topics", "concepts", "publishers", "funders", "keywords"].includes(value);
}

// Helper to safely extract defined properties from Zod-validated config
// Handles exactOptionalPropertyTypes by only including properties with defined values
function extractDefinedProperties(config: Record<string, unknown>): Partial<ForceSimulationConfig> {
  const result: Partial<ForceSimulationConfig> = {};

  // Use object spreading to only include defined properties
  if (typeof config['alphaDecay'] === 'number') {
    result.alphaDecay = config['alphaDecay'];
  }
  if (typeof config['velocityDecay'] === 'number') {
    result.velocityDecay = config['velocityDecay'];
  }
  if (typeof config['maxIterations'] === 'number') {
    result.maxIterations = config['maxIterations'];
  }
  if (typeof config['seed'] === 'number') {
    result.seed = config['seed'];
  }
  if (typeof config['linkDistance'] === 'number') {
    result.linkDistance = config['linkDistance'];
  }
  if (typeof config['linkStrength'] === 'number') {
    result.linkStrength = config['linkStrength'];
  }
  if (typeof config['chargeStrength'] === 'number') {
    result.chargeStrength = config['chargeStrength'];
  }
  if (typeof config['centerStrength'] === 'number') {
    result.centerStrength = config['centerStrength'];
  }
  if (typeof config['collisionRadius'] === 'number') {
    result.collisionRadius = config['collisionRadius'];
  }
  if (typeof config['collisionStrength'] === 'number') {
    result.collisionStrength = config['collisionStrength'];
  }
  if (typeof config['targetFPS'] === 'number') {
    result.targetFPS = config['targetFPS'];
  }
  if (typeof config['sendEveryNTicks'] === 'number') {
    result.sendEveryNTicks = config['sendEveryNTicks'];
  }
  if (typeof config['enableOptimizations'] === 'boolean') {
    result.enableOptimizations = config['enableOptimizations'];
  }
  if (typeof config['batchUpdates'] === 'boolean') {
    result.batchUpdates = config['batchUpdates'];
  }

  return result;
}

// Helper to create a ForceSimulationConfig with conditional spreads for exact optional types
function createSafeConfig(config: Record<string, unknown> | undefined): Required<ForceSimulationConfig> {
  if (!config) return DEFAULT_FORCE_PARAMS;

  const result: Required<ForceSimulationConfig> = { ...DEFAULT_FORCE_PARAMS };

  // Only override properties that are present and of the correct type
  if (config['alphaDecay'] !== undefined && typeof config['alphaDecay'] === 'number') {
    result.alphaDecay = config['alphaDecay'];
  }
  if (config['velocityDecay'] !== undefined && typeof config['velocityDecay'] === 'number') {
    result.velocityDecay = config['velocityDecay'];
  }
  if (config['maxIterations'] !== undefined && typeof config['maxIterations'] === 'number') {
    result.maxIterations = config['maxIterations'];
  }
  if (config['seed'] !== undefined && typeof config['seed'] === 'number') {
    result.seed = config['seed'];
  }
  if (config['linkDistance'] !== undefined && typeof config['linkDistance'] === 'number') {
    result.linkDistance = config['linkDistance'];
  }
  if (config['linkStrength'] !== undefined && typeof config['linkStrength'] === 'number') {
    result.linkStrength = config['linkStrength'];
  }
  if (config['chargeStrength'] !== undefined && typeof config['chargeStrength'] === 'number') {
    result.chargeStrength = config['chargeStrength'];
  }
  if (config['centerStrength'] !== undefined && typeof config['centerStrength'] === 'number') {
    result.centerStrength = config['centerStrength'];
  }
  if (config['collisionRadius'] !== undefined && typeof config['collisionRadius'] === 'number') {
    result.collisionRadius = config['collisionRadius'];
  }
  if (config['collisionStrength'] !== undefined && typeof config['collisionStrength'] === 'number') {
    result.collisionStrength = config['collisionStrength'];
  }
  if (config['targetFPS'] !== undefined && typeof config['targetFPS'] === 'number') {
    result.targetFPS = config['targetFPS'];
  }
  if (config['sendEveryNTicks'] !== undefined && typeof config['sendEveryNTicks'] === 'number') {
    result.sendEveryNTicks = config['sendEveryNTicks'];
  }
  if (config['enableOptimizations'] !== undefined && typeof config['enableOptimizations'] === 'boolean') {
    result.enableOptimizations = config['enableOptimizations'];
  }
  if (config['batchUpdates'] !== undefined && typeof config['batchUpdates'] === 'boolean') {
    result.batchUpdates = config['batchUpdates'];
  }

  return result;
}

// Helper to validate and ensure links have required properties
function validateLinks(links: unknown[]): ForceSimulationLink[] {
  return links.filter((link): link is ForceSimulationLink => {
    return typeof link === 'object' &&
           link !== null &&
           'id' in link && typeof link.id === 'string' &&
           'source' in link && typeof link.source === 'string' &&
           'target' in link && typeof link.target === 'string';
  });
}

// Worker state
let simulationEngine: ForceSimulationEngine | null = null;
let startTime = 0;
let lastProgressTime = 0;
let lastFpsTime = 0;
let frameCount = 0;
let currentSimulationTaskId: string | null = null;
const PROGRESS_THROTTLE_MS = 16; // ~60fps
const FPS_CALCULATION_INTERVAL = 1000; // 1 second

// Create simulation engine with event listeners
function createSimulationEngine(): ForceSimulationEngine {
  const engine = new ForceSimulationEngine({
    logger,
    config: DEFAULT_FORCE_PARAMS,
    progressThrottleMs: PROGRESS_THROTTLE_MS,
    fpsIntervalMs: FPS_CALCULATION_INTERVAL
  });

  // Set up event listeners
  engine.on("progress", (event) => {
    const now = Date.now();

    if (event.messageType === "tick") {
      logger.debug("worker", "Sending progress update", {
        messageType: event.messageType,
        positionsLength: event.positions?.length,
        alpha: event.alpha,
        iteration: event.iteration,
        timeSinceLastProgress: now - lastProgressTime,
        throttleMs: PROGRESS_THROTTLE_MS,
        samplePosition: event.positions?.[0] ? {
          id: event.positions[0].id,
          x: Number(event.positions[0].x.toFixed(2)),
          y: Number(event.positions[0].y.toFixed(2))
        } : null
      });
    }

    // Throttle progress updates except for important state changes
    if (event.messageType === "tick" && (now - lastProgressTime) < PROGRESS_THROTTLE_MS) {
      logger.debug("worker", "Throttling tick event");
      return;
    }

    lastProgressTime = now;

    // Calculate FPS for tick messages
    let fps = 0;
    if (event.messageType === "tick") {
      frameCount++;
      if (now - lastFpsTime >= FPS_CALCULATION_INTERVAL) {
        fps = Math.round((frameCount * 1000) / (now - lastFpsTime));
        frameCount = 0;
        lastFpsTime = now;
      }
    }

    const progress = event.alpha ? Math.max(0, Math.min(1, 1 - event.alpha)) : 1;

    const progressEvent = {
      type: WorkerEventType.FORCE_SIMULATION_PROGRESS,
      payload: {
        workerId: "background-worker",
        workerType: "force-animation" as const,
        messageType: event.messageType,
        positions: event.positions,
        alpha: event.alpha,
        iteration: event.iteration,
        progress,
        ...(fps && { fps }),
        nodeCount: event.nodeCount,
        linkCount: event.linkCount,
        timestamp: now
      }
    };

    workerEventBus.emit(progressEvent);

    const message = {
      type: "PROGRESS" as const,
      ...(currentSimulationTaskId && { taskId: currentSimulationTaskId }),
      payload: {
        type: WorkerEventType.FORCE_SIMULATION_PROGRESS,
        ...progressEvent.payload
      }
    };

    if (event.messageType === "tick") {
      logger.debug("worker", "Worker postMessage", { messageType: event.messageType, payloadType: message.payload.type });
    }

    self.postMessage(message);
  });

  engine.on("complete", (event) => {
    const completeEvent = {
      type: WorkerEventType.FORCE_SIMULATION_COMPLETE,
      payload: {
        workerId: "background-worker",
        workerType: "force-animation" as const,
        positions: event.positions,
        totalIterations: event.totalIterations,
        finalAlpha: event.finalAlpha,
        reason: event.reason,
        timestamp: Date.now()
      }
    };

    workerEventBus.emit(completeEvent);

    self.postMessage({
      type: "SUCCESS" as const,
      ...(currentSimulationTaskId && { taskId: currentSimulationTaskId }),
      payload: {
        type: WorkerEventType.FORCE_SIMULATION_COMPLETE,
        ...completeEvent.payload
      }
    });

    currentSimulationTaskId = null;
  });

  engine.on("error", (event) => {
    const errorPayload = {
      workerId: "background-worker",
      workerType: "force-animation" as const,
      error: event.message,
      context: {
        ...event.context,
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
      type: "ERROR" as const,
      ...(currentSimulationTaskId && { taskId: currentSimulationTaskId }),
      payload: `Force simulation error: ${event.message}. Context: ${JSON.stringify(errorPayload.context)}`
    });
  });

  return engine;
}


// Zod schemas for type validation
const forceSimulationNodeSchema = z.object({
  id: z.string(),
  entityType: z.enum(["works", "authors", "sources", "institutions", "topics", "concepts", "publishers", "funders", "keywords"]).optional(),
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

type ForceSimulationControlAction = z.infer<typeof forceSimulationControlMessageSchema>["type"];

function sendControlAck(taskId: string | undefined, action: ForceSimulationControlAction, extra: Record<string, unknown> = {}) {
  if (!taskId) {
    return;
  }

  self.postMessage({
    type: "SUCCESS" as const,
    taskId,
    payload: {
      type: "FORCE_SIMULATION_CONTROL_ACK",
      action,
      status: "ok",
      timestamp: Date.now(),
      ...extra
    }
  });
}

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
    const {data} = e;

    logger.debug("worker", "Received message", {
      entityType: data && typeof data === "object" && "type" in data ? data.type : "unknown",
      hasTaskId: data && typeof data === "object" && "taskId" in data,
      hasPayload: data && typeof data === "object" && "payload" in data
    });

    try {
      // Handle worker pool task wrapper format
      if (isExecuteTaskMessage(data)) {
        logger.debug("worker", "Processing EXECUTE_TASK", {
          taskId: data.taskId,
          payloadType: data.payload && typeof data.payload === "object" && "type" in data.payload ? data.payload.type : "unknown"
        });

        logger.debug("worker", "Received EXECUTE_TASK message", {
          taskId: data.taskId,
          payloadType: typeof data.payload
        });

      // Extract the actual payload and process it
      const actualPayload = data.payload;

      if (isForceSimulationStartMessage(actualPayload)) {
        const validatedNodes = actualPayload.nodes.map(node => ({
          id: node.id,
          x: node.x ?? 0,
          y: node.y ?? 0,
          fx: node.fx ?? null,
          fy: node.fy ?? null,
          ...(isValidEntityType(node.entityType) && { entityType: node.entityType })
        }));
        currentSimulationTaskId = data.taskId;
        startSimulation({
          nodes: validatedNodes,
          links: validateLinks(actualPayload.links ?? []),
          config: createSafeConfig(actualPayload.config),
          pinnedNodes: actualPayload.pinnedNodes ?? []
        });
      } else if (isForceSimulationMessage(actualPayload)) {
        switch (actualPayload.type) {
          case "FORCE_SIMULATION_STOP":
            stopSimulation();
            sendControlAck(data.taskId, actualPayload.type);
            break;
          case "FORCE_SIMULATION_PAUSE":
            pauseSimulation();
            sendControlAck(data.taskId, actualPayload.type);
            break;
          case "FORCE_SIMULATION_RESUME":
            resumeSimulation();
            sendControlAck(data.taskId, actualPayload.type);
            break;
          case "FORCE_SIMULATION_UPDATE_PARAMETERS":
            if (actualPayload.config) {
              const definedConfig = extractDefinedProperties(actualPayload.config);
              updateSimulationParameters(definedConfig);
            }
            sendControlAck(data.taskId, actualPayload.type);
            break;
          case "FORCE_SIMULATION_REHEAT":
            if (forceSimulationReheatMessageSchema.safeParse(actualPayload).success) {
              const reheatData = forceSimulationReheatMessageSchema.parse(actualPayload);
              const validatedNodes = reheatData.nodes.map(node => ({
                id: node.id,
                x: node.x ?? 0,
                y: node.y ?? 0,
                fx: node.fx ?? null,
                fy: node.fy ?? null,
                ...(isValidEntityType(node.entityType) && { entityType: node.entityType })
              }));
              reheatSimulation({
                nodes: validatedNodes,
                links: validateLinks(reheatData.links ?? []),
                config: createSafeConfig(reheatData.config),
                pinnedNodes: reheatData.pinnedNodes ?? [],
                alpha: reheatData.alpha ?? 1.0
              });
              sendControlAck(data.taskId, actualPayload.type, {
                nodeCount: validatedNodes.length,
                linkCount: reheatData.links.length,
                alpha: reheatData.alpha ?? 1.0
              });
            } else {
              logger.warn("worker", "Invalid reheat payload in task", { actualPayload });
              self.postMessage({
                type: "ERROR" as const,
                taskId: data.taskId,
                payload: "Invalid reheat payload"
              });
            }
            break;
          case "FORCE_SIMULATION_UPDATE_LINKS":
            if (forceSimulationUpdateLinksMessageSchema.safeParse(actualPayload).success) {
              const updateLinksPayload = forceSimulationUpdateLinksMessageSchema.parse(actualPayload);
              updateSimulationLinks({
                links: validateLinks(updateLinksPayload.links ?? []),
                alpha: updateLinksPayload.alpha ?? 1.0
              });
              sendControlAck(data.taskId, actualPayload.type, {
                linkCount: updateLinksPayload.links.length,
                alpha: updateLinksPayload.alpha ?? 1.0
              });
            } else {
              logger.warn("worker", "Invalid link update payload in task", { actualPayload });
              self.postMessage({
                type: "ERROR" as const,
                taskId: data.taskId,
                payload: "Invalid link update payload"
              });
            }
            break;
          case "FORCE_SIMULATION_UPDATE_NODES":
            if (forceSimulationUpdateNodesMessageSchema.safeParse(actualPayload).success) {
              const updateNodesPayload = forceSimulationUpdateNodesMessageSchema.parse(actualPayload);
              const validatedNodes = updateNodesPayload.nodes.map(node => ({
                id: node.id,
                x: node.x ?? 0,
                y: node.y ?? 0,
                fx: node.fx ?? null,
                fy: node.fy ?? null,
                ...(isValidEntityType(node.entityType) && { entityType: node.entityType })
              }));
              updateSimulationNodes({
                nodes: validatedNodes,
                pinnedNodes: updateNodesPayload.pinnedNodes ?? [],
                alpha: updateNodesPayload.alpha ?? 1.0
              });
              sendControlAck(data.taskId, actualPayload.type, {
                nodeCount: validatedNodes.length,
                alpha: updateNodesPayload.alpha ?? 1.0,
                pinnedCount: updateNodesPayload.pinnedNodes?.length ?? 0
              });
            } else {
              logger.warn("worker", "Invalid node update payload in task", { actualPayload });
              self.postMessage({
                type: "ERROR" as const,
                taskId: data.taskId,
                payload: "Invalid node update payload"
              });
            }
            break;
          default:
            logger.warn("worker", "Unknown simulation control message in task", { actualPayload });
            self.postMessage({
              type: "ERROR" as const,
              taskId: data.taskId,
              payload: `Unknown control message: ${String(actualPayload.type)}`
            });
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
        nodes: data.nodes.map(node => ({
          id: node.id,
          x: node.x ?? 0,
          y: node.y ?? 0,
          fx: node.fx ?? null,
          fy: node.fy ?? null
        })),
        links: validateLinks(data.links ?? []),
        config: createSafeConfig(data.config),
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
            const definedConfig = extractDefinedProperties(data.config);
            updateSimulationParameters(definedConfig);
          }
          break;

        case "FORCE_SIMULATION_REHEAT":
          // Handle reheat with updated data
          logger.debug("worker", "Worker received reheat message", data);
          if (forceSimulationReheatMessageSchema.safeParse(data).success) {
            const reheatData = forceSimulationReheatMessageSchema.parse(data);
            // Convert nodes to proper ForceSimulationNode format with type guard
            const validatedNodes = reheatData.nodes.map(node => ({
              id: node.id,
              x: node.x ?? 0,
              y: node.y ?? 0,
              fx: node.fx ?? null,
              fy: node.fy ?? null,
              ...(isValidEntityType(node.entityType) && { entityType: node.entityType })
            }));
            logger.debug("worker", "Worker calling reheatSimulation", {
              nodeCount: validatedNodes.length,
              linkCount: reheatData.links.length,
              alpha: reheatData.alpha,
              linkDetails: reheatData.links.map(link => ({ id: link.id, source: link.source, target: link.target }))
            });
            try {
              logger.debug("worker", "About to call reheatSimulation");
              reheatSimulation({
                nodes: validatedNodes,
                links: validateLinks(reheatData.links ?? []),
                config: createSafeConfig(reheatData.config),
                pinnedNodes: reheatData.pinnedNodes ?? [],
                alpha: reheatData.alpha ?? 1.0
              });
              logger.debug("worker", "ReheatSimulation call completed");
            } catch (error) {
              logger.error("worker", "Error calling reheatSimulation", { error });
            }
          } else {
            logger.error("worker", "Worker reheat message validation failed", { error: forceSimulationReheatMessageSchema.safeParse(data).error });
          }
          break;

        case "FORCE_SIMULATION_UPDATE_LINKS":
          // Handle dynamic link updates during running simulation
          logger.debug("worker", "Worker received update links message", data);
          if (forceSimulationUpdateLinksMessageSchema.safeParse(data).success) {
            const updateData = forceSimulationUpdateLinksMessageSchema.parse(data);
            logger.debug("worker", "Worker calling updateSimulationLinks", {
              linkCount: updateData.links.length,
              alpha: updateData.alpha,
              linkDetails: updateData.links.slice(0, 3).map(link => ({ id: link.id, source: link.source, target: link.target }))
            });
            try {
              logger.debug("worker", "About to call updateSimulationLinks");
              updateSimulationLinks({
                links: validateLinks(updateData.links ?? []),
                alpha: updateData.alpha ?? 1.0
              });
              logger.debug("worker", "UpdateSimulationLinks call completed");
            } catch (error) {
              logger.error("worker", "Error calling updateSimulationLinks", { error });
            }
          } else {
            logger.error("worker", "Worker update links message validation failed", { error: forceSimulationUpdateLinksMessageSchema.safeParse(data).error });
          }
          break;

        case "FORCE_SIMULATION_UPDATE_NODES":
          logger.debug("worker", "Worker received update nodes message", data);
          if (forceSimulationUpdateNodesMessageSchema.safeParse(data).success) {
            const updateData = forceSimulationUpdateNodesMessageSchema.parse(data);
            try {
              const validatedNodes = updateData.nodes.map(node => ({
                id: node.id,
                x: node.x ?? 0,
                y: node.y ?? 0,
                fx: node.fx ?? null,
                fy: node.fy ?? null,
                ...(isValidEntityType(node.entityType) && { entityType: node.entityType })
              }));
              updateSimulationNodes({
                nodes: validatedNodes,
                pinnedNodes: updateData.pinnedNodes ?? [],
                alpha: updateData.alpha ?? 1.0
              });
            } catch (error) {
              logger.error("worker", "Error calling updateSimulationNodes", { error });
            }
          } else {
            logger.error("worker", "Worker update nodes message validation failed", { error: forceSimulationUpdateNodesMessageSchema.safeParse(data).error });
          }
          break;

        default:
          logger.warn("worker", "Unknown simulation message type", { entityType: data.type });
      }
    } else {
      logger.warn("worker", "Unknown message type", { data });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "No stack trace";
    const errorContext = {
      messageData: JSON.stringify(data).substring(0, 200) + "...",
      messageType: typeof data === "object" && data && "type" in data ? String(data.type) : "unknown",
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
    const errorStack = error instanceof Error ? error.stack : "No stack trace";
    const errorContext = {
      initializationPhase: "worker_setup",
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
  const errorStack = error instanceof Error ? error.stack : "No stack trace";
  const errorContext = {
    initializationPhase: "global_init",
    errorStack,
    workerEnvironment: {
      hasSimulationEngine: !!simulationEngine,
      hasLogger: typeof logger !== "undefined",
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
