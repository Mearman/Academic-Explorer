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
  ForceSimulationConfig,
  SimulationProgressEvent,
  SimulationCompleteEvent,
  SimulationErrorEvent,
} from "@academic-explorer/simulation";
import type { EntityType } from "@academic-explorer/graph";
import {
  ForceSimulationEngine,
  DEFAULT_FORCE_PARAMS,
} from "@academic-explorer/simulation";

// Create worker event bus for cross-context communication
const workerEventBus = createLocalEventBus();

// Type guard for EntityType validation
function isValidEntityType(value: unknown): value is EntityType {
  return (
    typeof value === "string" &&
    [
      "works",
      "authors",
      "sources",
      "institutions",
      "topics",
      "concepts",
      "publishers",
      "funders",
      "keywords",
    ].includes(value)
  );
}

// Helper to safely extract defined properties from Zod-validated config
// Handles exactOptionalPropertyTypes by only including properties with defined values
function extractDefinedProperties(
  config: Record<string, unknown>,
): Partial<ForceSimulationConfig> {
  const result: Partial<ForceSimulationConfig> = {};

  // Use object spreading to only include defined properties
  if (typeof config["alphaDecay"] === "number") {
    result.alphaDecay = config["alphaDecay"];
  }
  if (typeof config["velocityDecay"] === "number") {
    result.velocityDecay = config["velocityDecay"];
  }
  if (typeof config["maxIterations"] === "number") {
    result.maxIterations = config["maxIterations"];
  }
  if (typeof config["seed"] === "number") {
    result.seed = config["seed"];
  }
  if (typeof config["linkDistance"] === "number") {
    result.linkDistance = config["linkDistance"];
  }
  if (typeof config["linkStrength"] === "number") {
    result.linkStrength = config["linkStrength"];
  }
  if (typeof config["chargeStrength"] === "number") {
    result.chargeStrength = config["chargeStrength"];
  }
  if (typeof config["centerStrength"] === "number") {
    result.centerStrength = config["centerStrength"];
  }
  if (typeof config["collisionRadius"] === "number") {
    result.collisionRadius = config["collisionRadius"];
  }
  if (typeof config["collisionStrength"] === "number") {
    result.collisionStrength = config["collisionStrength"];
  }
  if (typeof config["targetFPS"] === "number") {
    result.targetFPS = config["targetFPS"];
  }
  if (typeof config["sendEveryNTicks"] === "number") {
    result.sendEveryNTicks = config["sendEveryNTicks"];
  }
  if (typeof config["enableOptimizations"] === "boolean") {
    result.enableOptimizations = config["enableOptimizations"];
  }
  if (typeof config["batchUpdates"] === "boolean") {
    result.batchUpdates = config["batchUpdates"];
  }

  return result;
}

// Helper to safely assign a numeric config value
function assignNumericConfig(
  result: Required<ForceSimulationConfig>,
  config: Record<string, unknown>,
  key: keyof ForceSimulationConfig,
) {
  if (config[key] !== undefined && typeof config[key] === "number") {
    (result as Record<string, unknown>)[key] = config[key];
  }
}

// Helper to safely assign a boolean config value
function assignBooleanConfig(
  result: Required<ForceSimulationConfig>,
  config: Record<string, unknown>,
  key: keyof ForceSimulationConfig,
) {
  if (config[key] !== undefined && typeof config[key] === "boolean") {
    (result as Record<string, unknown>)[key] = config[key];
  }
}

// Helper to create a ForceSimulationConfig with conditional spreads for exact optional types
function createSafeConfig(
  config: Record<string, unknown> | undefined,
): Required<ForceSimulationConfig> {
  if (!config) return DEFAULT_FORCE_PARAMS;

  const result: Required<ForceSimulationConfig> = { ...DEFAULT_FORCE_PARAMS };

  // Assign numeric properties
  const numericKeys: (keyof ForceSimulationConfig)[] = [
    "alphaDecay",
    "velocityDecay",
    "maxIterations",
    "seed",
    "linkDistance",
    "linkStrength",
    "chargeStrength",
    "centerStrength",
    "collisionRadius",
    "collisionStrength",
    "targetFPS",
    "sendEveryNTicks",
  ];

  numericKeys.forEach((key) => assignNumericConfig(result, config, key));

  // Assign boolean properties
  const booleanKeys: (keyof ForceSimulationConfig)[] = [
    "enableOptimizations",
    "batchUpdates",
  ];
  booleanKeys.forEach((key) => assignBooleanConfig(result, config, key));

  return result;
}

// Helper to validate and ensure links have required properties
function validateLinks(links: unknown[]): ForceSimulationLink[] {
  return links.filter((link): link is ForceSimulationLink => {
    return (
      typeof link === "object" &&
      link !== null &&
      "id" in link &&
      typeof link.id === "string" &&
      "source" in link &&
      typeof link.source === "string" &&
      "target" in link &&
      typeof link.target === "string"
    );
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
    fpsIntervalMs: FPS_CALCULATION_INTERVAL,
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
        samplePosition: event.positions?.[0]
          ? {
              id: event.positions[0].id,
              x: Number(event.positions[0].x.toFixed(2)),
              y: Number(event.positions[0].y.toFixed(2)),
            }
          : null,
      });
    }

    // Throttle progress updates except for important state changes
    if (
      event.messageType === "tick" &&
      now - lastProgressTime < PROGRESS_THROTTLE_MS
    ) {
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

    const progress = event.alpha
      ? Math.max(0, Math.min(1, 1 - event.alpha))
      : 1;
    const progressEvent = createProgressEventPayload(event, fps, progress);

    workerEventBus.emit(progressEvent);

    const message = {
      type: "PROGRESS" as const,
      ...(currentSimulationTaskId && { taskId: currentSimulationTaskId }),
      payload: {
        type: WorkerEventType.FORCE_SIMULATION_PROGRESS,
        ...progressEvent.payload,
      },
    };

    if (event.messageType === "tick") {
      logger.debug("worker", "Worker postMessage", {
        messageType: event.messageType,
        payloadType: message.payload.type,
      });
    }

    self.postMessage(message);
  });

  engine.on("complete", (event) => {
    const completeEvent = createCompleteEventPayload(event);

    workerEventBus.emit(completeEvent);

    self.postMessage({
      type: "SUCCESS" as const,
      ...(currentSimulationTaskId && { taskId: currentSimulationTaskId }),
      payload: {
        type: WorkerEventType.FORCE_SIMULATION_COMPLETE,
        ...completeEvent.payload,
      },
    });

    currentSimulationTaskId = null;
  });

  engine.on("error", (event) => {
    const errorEvent = createErrorEventPayload(event);

    logger.error(
      "worker",
      "Force simulation error with context",
      errorEvent.payload,
    );

    workerEventBus.emit(errorEvent);

    self.postMessage({
      type: "ERROR" as const,
      ...(currentSimulationTaskId && { taskId: currentSimulationTaskId }),
      payload: `Force simulation error: ${event.message}. Context: ${JSON.stringify(errorEvent.payload.context)}`,
    });
  });

  return engine;
}

// Zod schemas for type validation
const forceSimulationNodeSchema = z.object({
  id: z.string(),
  entityType: z
    .enum([
      "works",
      "authors",
      "sources",
      "institutions",
      "topics",
      "concepts",
      "publishers",
      "funders",
      "keywords",
    ])
    .optional(),
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
  type: z.enum([
    "FORCE_SIMULATION_STOP",
    "FORCE_SIMULATION_PAUSE",
    "FORCE_SIMULATION_RESUME",
    "FORCE_SIMULATION_UPDATE_PARAMETERS",
    "FORCE_SIMULATION_REHEAT",
    "FORCE_SIMULATION_UPDATE_LINKS",
    "FORCE_SIMULATION_UPDATE_NODES",
  ]),
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

type ForceSimulationControlMessage = z.infer<
  typeof forceSimulationControlMessageSchema
>;
type ForceSimulationReheatMessage = z.infer<
  typeof forceSimulationReheatMessageSchema
>;
type ForceSimulationUpdateLinksMessage = z.infer<
  typeof forceSimulationUpdateLinksMessageSchema
>;
type ForceSimulationUpdateNodesMessage = z.infer<
  typeof forceSimulationUpdateNodesMessageSchema
>;

type AnyForceSimulationControlMessage =
  | ForceSimulationControlMessage
  | ForceSimulationReheatMessage
  | ForceSimulationUpdateLinksMessage
  | ForceSimulationUpdateNodesMessage;

type ForceSimulationControlAction = AnyForceSimulationControlMessage["type"];

function sendControlAck(
  taskId: string | undefined,
  action: ForceSimulationControlAction,
  extra: Record<string, unknown> = {},
) {
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
      ...extra,
    },
  });
}

// Helper to create progress event payload
function createProgressEventPayload(
  event: SimulationProgressEvent,
  fps: number | undefined,
  progress: number,
) {
  return {
    type: WorkerEventType.FORCE_SIMULATION_PROGRESS,
    payload: {
      workerId: WORKER_ID,
      workerType: WORKER_TYPE,
      messageType: event.messageType,
      positions: event.positions,
      alpha: event.alpha,
      iteration: event.iteration,
      progress,
      ...(fps && { fps }),
      nodeCount: event.nodeCount,
      linkCount: event.linkCount,
      timestamp: Date.now(),
    },
  };
}

// Helper to create complete event payload
function createCompleteEventPayload(event: SimulationCompleteEvent) {
  return {
    type: WorkerEventType.FORCE_SIMULATION_COMPLETE,
    payload: {
      workerId: WORKER_ID,
      workerType: WORKER_TYPE,
      positions: event.positions,
      totalIterations: event.totalIterations,
      finalAlpha: event.finalAlpha,
      reason: event.reason,
      timestamp: Date.now(),
    },
  };
}

// Helper to create error event payload
function createErrorEventPayload(event: SimulationErrorEvent) {
  return {
    type: WorkerEventType.FORCE_SIMULATION_ERROR,
    payload: {
      workerId: WORKER_ID,
      workerType: WORKER_TYPE,
      error: event.message,
      context: {
        ...event.context,
        runtime: startTime > 0 ? Date.now() - startTime : 0,
      },
      timestamp: Date.now(),
    },
  };
}

// Schema for worker pool task wrapper
const executeTaskMessageSchema = z.object({
  type: z.literal("EXECUTE_TASK"),
  taskId: z.string(),
  payload: z.unknown(),
});

// Type guards using Zod
function isForceSimulationStartMessage(
  data: unknown,
): data is z.infer<typeof forceSimulationStartMessageSchema> {
  return forceSimulationStartMessageSchema.safeParse(data).success;
}

function isForceSimulationMessage(
  data: unknown,
): data is z.infer<typeof forceSimulationControlMessageSchema> {
  return forceSimulationControlMessageSchema.safeParse(data).success;
}

function isExecuteTaskMessage(
  data: unknown,
): data is z.infer<typeof executeTaskMessageSchema> {
  return executeTaskMessageSchema.safeParse(data).success;
}

// Constants for repeated strings
const WORKER_ID = "background-worker";
const WORKER_TYPE = "force-animation" as const;
const ERROR_TYPE = "ERROR" as const;
const NO_STACK_TRACE_MESSAGE = "No stack trace";

// Helper function to handle message processing errors
function handleMessageError(error: unknown, data: unknown): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack =
    error instanceof Error ? error.stack : NO_STACK_TRACE_MESSAGE;
  const errorContext = {
    messageData: JSON.stringify(data).substring(0, 200) + "...",
    messageType:
      typeof data === "object" && data && "type" in data
        ? String(data.type)
        : "unknown",
    errorStack,
    workerState: {
      hasSimulationEngine: !!simulationEngine,
    },
  };

  logger.error("worker", "Error handling worker message", {
    error: errorMessage,
    stack: errorStack,
    data,
    context: errorContext,
  });
  self.postMessage({
    type: ERROR_TYPE,
    payload: `Message handling error: ${errorMessage}. Context: ${JSON.stringify(errorContext)}`,
  });
}

// Helper to create validated nodes from raw data
function createValidatedNodes(
  nodes: z.infer<typeof forceSimulationNodeSchema>[],
): ForceSimulationNode[] {
  return nodes.map((node) => ({
    id: node.id,
    x: node.x ?? 0,
    y: node.y ?? 0,
    fx: node.fx ?? null,
    fy: node.fy ?? null,
    ...(isValidEntityType(node.entityType) && { entityType: node.entityType }),
  }));
}

// Helper to handle EXECUTE_TASK messages
function handleExecuteTaskMessage(
  data: z.infer<typeof executeTaskMessageSchema>,
) {
  const actualPayload = data.payload;

  if (isForceSimulationStartMessage(actualPayload)) {
    currentSimulationTaskId = data.taskId;
    startSimulation({
      nodes: createValidatedNodes(actualPayload.nodes),
      links: validateLinks(actualPayload.links),
      config: createSafeConfig(actualPayload.config),
      pinnedNodes: actualPayload.pinnedNodes ?? [],
    });
  } else if (isForceSimulationMessage(actualPayload)) {
    handleForceSimulationControlMessage(actualPayload, data.taskId);
  } else {
    logger.warn("worker", "Unknown task payload format", {
      taskId: data.taskId,
      payload: actualPayload,
    });
  }
}

// Helper to handle force simulation control messages
function handleForceSimulationControlMessage(
  payload: AnyForceSimulationControlMessage,
  taskId?: string,
) {
  switch (payload.type) {
    case "FORCE_SIMULATION_STOP":
      stopSimulation();
      sendControlAck(taskId, payload.type);
      break;
    case "FORCE_SIMULATION_PAUSE":
      pauseSimulation();
      sendControlAck(taskId, payload.type);
      break;
    case "FORCE_SIMULATION_RESUME":
      resumeSimulation();
      sendControlAck(taskId, payload.type);
      break;
    case "FORCE_SIMULATION_UPDATE_PARAMETERS":
      if (payload.config) {
        const definedConfig = extractDefinedProperties(payload.config);
        updateSimulationParameters(definedConfig);
      }
      sendControlAck(taskId, payload.type);
      break;
    case "FORCE_SIMULATION_REHEAT":
      handleReheatMessage(payload as ForceSimulationReheatMessage, taskId);
      break;
    case "FORCE_SIMULATION_UPDATE_LINKS":
      handleUpdateLinksMessage(
        payload as ForceSimulationUpdateLinksMessage,
        taskId,
      );
      break;
    case "FORCE_SIMULATION_UPDATE_NODES":
      handleUpdateNodesMessage(
        payload as ForceSimulationUpdateNodesMessage,
        taskId,
      );
      break;
    default:
      logger.warn("worker", "Unknown simulation control message in task", {
        payload,
      });
      self.postMessage({
        type: ERROR_TYPE,
        taskId,
        payload: `Unknown control message: ${String((payload as AnyForceSimulationControlMessage).type)}`,
      });
  }
}

// Helper to handle reheat messages
function handleReheatMessage(
  payload: ForceSimulationReheatMessage,
  taskId?: string,
) {
  if (forceSimulationReheatMessageSchema.safeParse(payload).success) {
    const reheatData = forceSimulationReheatMessageSchema.parse(payload);
    const validatedNodes = createValidatedNodes(reheatData.nodes);
    reheatSimulation({
      nodes: validatedNodes,
      links: validateLinks(reheatData.links),
      config: createSafeConfig(reheatData.config),
      pinnedNodes: reheatData.pinnedNodes ?? [],
      alpha: reheatData.alpha,
    });
    sendControlAck(taskId, payload.type, {
      nodeCount: validatedNodes.length,
      linkCount: reheatData.links.length,
      alpha: reheatData.alpha,
    });
  } else {
    logger.warn("worker", "Invalid reheat payload in task", { payload });
    self.postMessage({
      type: ERROR_TYPE,
      taskId,
      payload: "Invalid reheat payload",
    });
  }
}

// Helper to handle update links messages
function handleUpdateLinksMessage(
  payload: ForceSimulationUpdateLinksMessage,
  taskId?: string,
) {
  if (forceSimulationUpdateLinksMessageSchema.safeParse(payload).success) {
    const updateLinksPayload =
      forceSimulationUpdateLinksMessageSchema.parse(payload);
    updateSimulationLinks({
      links: validateLinks(updateLinksPayload.links),
      alpha: updateLinksPayload.alpha,
    });
    sendControlAck(taskId, payload.type, {
      linkCount: updateLinksPayload.links.length,
      alpha: updateLinksPayload.alpha,
    });
  } else {
    logger.warn("worker", "Invalid link update payload in task", { payload });
    self.postMessage({
      type: ERROR_TYPE,
      taskId,
      payload: "Invalid link update payload",
    });
  }
}

// Helper to handle update nodes messages
function handleUpdateNodesMessage(
  payload: ForceSimulationUpdateNodesMessage,
  taskId?: string,
) {
  if (forceSimulationUpdateNodesMessageSchema.safeParse(payload).success) {
    const updateNodesPayload =
      forceSimulationUpdateNodesMessageSchema.parse(payload);
    const validatedNodes = createValidatedNodes(updateNodesPayload.nodes);
    updateSimulationNodes({
      nodes: validatedNodes,
      pinnedNodes: updateNodesPayload.pinnedNodes ?? [],
      alpha: updateNodesPayload.alpha,
    });
    sendControlAck(taskId, payload.type, {
      nodeCount: validatedNodes.length,
      alpha: updateNodesPayload.alpha,
      pinnedCount: updateNodesPayload.pinnedNodes?.length ?? 0,
    });
  } else {
    logger.warn("worker", "Invalid node update payload in task", { payload });
    self.postMessage({
      type: ERROR_TYPE,
      taskId,
      payload: "Invalid node update payload",
    });
  }
}

// Simple wrapper functions that delegate to the ForceSimulationEngine
function startSimulation(params: {
  nodes: ForceSimulationNode[];
  links: ForceSimulationLink[];
  config?: ForceSimulationConfig;
  pinnedNodes?: string[];
}) {
  simulationEngine ??= createSimulationEngine();

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
  simulationEngine ??= createSimulationEngine();

  simulationEngine.reheat(params);
}

function updateSimulationLinks(params: {
  links: ForceSimulationLink[];
  alpha?: number;
}) {
  simulationEngine ??= createSimulationEngine();

  simulationEngine.updateLinks(params.links, params.alpha);
}

function updateSimulationNodes(params: {
  nodes: ForceSimulationNode[];
  pinnedNodes?: string[];
  alpha?: number;
}) {
  simulationEngine ??= createSimulationEngine();

  simulationEngine.updateNodes(
    params.nodes,
    params.pinnedNodes ?? [],
    params.alpha,
  );
}

// Message handling
self.onmessage = (e: MessageEvent) => {
  const { data } = e;

  logger.debug("worker", "Received message", {
    entityType:
      data && typeof data === "object" && "type" in data
        ? data.type
        : "unknown",
    hasTaskId: data && typeof data === "object" && "taskId" in data,
    hasPayload: data && typeof data === "object" && "payload" in data,
  });

  try {
    // Handle worker pool task wrapper format
    if (isExecuteTaskMessage(data)) {
      handleExecuteTaskMessage(data);
    }
    // Handle direct message format (for backwards compatibility)
    else if (isForceSimulationStartMessage(data)) {
      startSimulation({
        nodes: createValidatedNodes(data.nodes),
        links: validateLinks(data.links),
        config: createSafeConfig(data.config),
        pinnedNodes: data.pinnedNodes ?? [],
      });
    } else if (isForceSimulationMessage(data)) {
      handleDirectForceSimulationMessage(data);
    } else {
      logger.warn("worker", "Unknown message type", { data });
    }
  } catch (error: unknown) {
    handleMessageError(error, data);
  }
};

// Helper to handle direct force simulation messages (backwards compatibility)
function handleDirectForceSimulationMessage(
  data: AnyForceSimulationControlMessage,
) {
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
      handleDirectReheatMessage(data as ForceSimulationReheatMessage);
      break;
    case "FORCE_SIMULATION_UPDATE_LINKS":
      handleDirectUpdateLinksMessage(data as ForceSimulationUpdateLinksMessage);
      break;
    case "FORCE_SIMULATION_UPDATE_NODES":
      handleDirectUpdateNodesMessage(data as ForceSimulationUpdateNodesMessage);
      break;
    default:
      logger.warn("worker", "Unknown simulation message type", {
        entityType: (data as AnyForceSimulationControlMessage).type,
      });
  }
}

// Helper to handle direct reheat messages
function handleDirectReheatMessage(data: ForceSimulationReheatMessage) {
  logger.debug("worker", "Worker received reheat message", data);
  if (forceSimulationReheatMessageSchema.safeParse(data).success) {
    const reheatData = forceSimulationReheatMessageSchema.parse(data);
    const validatedNodes = createValidatedNodes(reheatData.nodes);
    logger.debug("worker", "Worker calling reheatSimulation", {
      nodeCount: validatedNodes.length,
      linkCount: reheatData.links.length,
      alpha: reheatData.alpha,
      linkDetails: reheatData.links.map((link) => ({
        id: link.id,
        source: link.source,
        target: link.target,
      })),
    });
    try {
      logger.debug("worker", "About to call reheatSimulation");
      reheatSimulation({
        nodes: validatedNodes,
        links: validateLinks(reheatData.links),
        config: createSafeConfig(reheatData.config),
        pinnedNodes: reheatData.pinnedNodes ?? [],
        alpha: reheatData.alpha,
      });
      logger.debug("worker", "ReheatSimulation call completed");
    } catch (error) {
      logger.error("worker", "Error calling reheatSimulation", { error });
    }
  } else {
    logger.error("worker", "Worker reheat message validation failed", {
      error: forceSimulationReheatMessageSchema.safeParse(data).error,
    });
  }
}

// Helper to handle direct update links messages
function handleDirectUpdateLinksMessage(
  data: ForceSimulationUpdateLinksMessage,
) {
  logger.debug("worker", "Worker received update links message", data);
  if (forceSimulationUpdateLinksMessageSchema.safeParse(data).success) {
    const updateData = forceSimulationUpdateLinksMessageSchema.parse(data);
    logger.debug("worker", "Worker calling updateSimulationLinks", {
      linkCount: updateData.links.length,
      alpha: updateData.alpha,
      linkDetails: updateData.links.slice(0, 3).map((link) => ({
        id: link.id,
        source: link.source,
        target: link.target,
      })),
    });
    try {
      logger.debug("worker", "About to call updateSimulationLinks");
      updateSimulationLinks({
        links: validateLinks(updateData.links),
        alpha: updateData.alpha,
      });
      logger.debug("worker", "UpdateSimulationLinks call completed");
    } catch (error) {
      logger.error("worker", "Error calling updateSimulationLinks", { error });
    }
  } else {
    logger.error("worker", "Worker update links message validation failed", {
      error: forceSimulationUpdateLinksMessageSchema.safeParse(data).error,
    });
  }
}

// Helper to handle direct update nodes messages
function handleDirectUpdateNodesMessage(
  data: ForceSimulationUpdateNodesMessage,
) {
  logger.debug("worker", "Worker received update nodes message", data);
  if (forceSimulationUpdateNodesMessageSchema.safeParse(data).success) {
    const updateData = forceSimulationUpdateNodesMessageSchema.parse(data);
    try {
      const validatedNodes = createValidatedNodes(updateData.nodes);
      updateSimulationNodes({
        nodes: validatedNodes,
        pinnedNodes: updateData.pinnedNodes ?? [],
        alpha: updateData.alpha,
      });
    } catch (error) {
      logger.error("worker", "Error calling updateSimulationNodes", { error });
    }
  } else {
    logger.error("worker", "Worker update nodes message validation failed", {
      error: forceSimulationUpdateNodesMessageSchema.safeParse(data).error,
    });
  }
}

// Initialize worker
function initializeWorker() {
  try {
    // Emit worker ready event via both event bus (for worker context) and postMessage (for main thread)
    const readyEvent = {
      type: WorkerEventType.WORKER_READY,
      payload: {
        workerId: WORKER_ID,
        workerType: WORKER_TYPE,
        timestamp: Date.now(),
      },
    };

    // Emit via event bus for worker context
    workerEventBus.emit(readyEvent);

    // Post message to main thread
    self.postMessage(readyEvent);

    logger.debug(
      "worker",
      "D3 Force simulation worker initialized successfully",
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack =
      error instanceof Error ? error.stack : NO_STACK_TRACE_MESSAGE;
    const errorContext = {
      initializationPhase: "worker_setup",
      errorStack,
      workerState: {
        hasSimulationEngine: !!simulationEngine,
      },
    };

    logger.error("worker", "Failed to initialize D3 force simulation worker", {
      error: errorMessage,
      stack: errorStack,
      context: errorContext,
    });

    const errorEvent = {
      type: WorkerEventType.WORKER_ERROR,
      payload: {
        workerId: WORKER_ID,
        workerType: WORKER_TYPE,
        error: `Worker initialization failed: ${errorMessage}`,
        context: errorContext,
        timestamp: Date.now(),
      },
    };

    workerEventBus.emit(errorEvent);
    // Send error to TaskQueue in expected format
    self.postMessage({
      type: "ERROR",
      payload: `Worker initialization failed: ${errorMessage}. Context: ${JSON.stringify(errorContext)}`,
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
      hasEventBus: !!workerEventBus,
    },
  };

  const errorEvent = {
    type: WorkerEventType.WORKER_ERROR,
    payload: {
      workerId: "background-worker",
      workerType: "force-animation",
      error: `Global worker initialization failed: ${errorMessage}`,
      context: errorContext,
      timestamp: Date.now(),
    },
  };

  workerEventBus.emit(errorEvent);
  // Send error to TaskQueue in expected format
  self.postMessage({
    type: "ERROR",
    payload: `Global worker initialization failed: ${errorMessage}. Context: ${JSON.stringify(errorContext)}`,
  });
}
