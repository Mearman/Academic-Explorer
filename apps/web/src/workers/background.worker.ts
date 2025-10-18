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
import {
  type ForceSimulationNode as SchemaForceSimulationNode,
  type ForceSimulationReheatMessage,
  type ForceSimulationUpdateLinksMessage,
  type ForceSimulationUpdateNodesMessage,
  type ExecuteTaskMessage,
  type AnyForceSimulationControlMessage,
  isForceSimulationStartMessage,
  isForceSimulationControlMessage,
  isExecuteTaskMessage,
} from "@academic-explorer/utils/workers/messages";

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
    // Type guard to ensure we have a progress event
    if (event.type !== "progress") return;

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
    if (event.type !== "complete") return;
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
    if (event.type !== "error") return;
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

// Type aliases for clarity
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

// Note: Type guards are now imported from @academic-explorer/utils/workers/messages

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
  nodes: SchemaForceSimulationNode[],
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
function handleExecuteTaskMessage(data: ExecuteTaskMessage) {
  const actualPayload = data.payload;

  if (isForceSimulationStartMessage(actualPayload)) {
    currentSimulationTaskId = data.taskId;
    startSimulation({
      nodes: createValidatedNodes(actualPayload.nodes),
      links: validateLinks(actualPayload.links),
      config: createSafeConfig(actualPayload.config),
      pinnedNodes: actualPayload.pinnedNodes ?? [],
    });
  } else if (isForceSimulationControlMessage(actualPayload)) {
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
  const validatedNodes = createValidatedNodes(payload.nodes);
  reheatSimulation({
    nodes: validatedNodes,
    links: validateLinks(payload.links),
    config: createSafeConfig(payload.config),
    pinnedNodes: payload.pinnedNodes ?? [],
    alpha: payload.alpha,
  });
  sendControlAck(taskId, payload.type, {
    nodeCount: validatedNodes.length,
    linkCount: payload.links.length,
    alpha: payload.alpha,
  });
}

// Helper to handle update links messages
function handleUpdateLinksMessage(
  payload: ForceSimulationUpdateLinksMessage,
  taskId?: string,
) {
  updateSimulationLinks({
    links: validateLinks(payload.links),
    alpha: payload.alpha,
  });
  sendControlAck(taskId, payload.type, {
    linkCount: payload.links.length,
    alpha: payload.alpha,
  });
}

// Helper to handle update nodes messages
function handleUpdateNodesMessage(
  payload: ForceSimulationUpdateNodesMessage,
  taskId?: string,
) {
  const validatedNodes = createValidatedNodes(payload.nodes);
  updateSimulationNodes({
    nodes: validatedNodes,
    pinnedNodes: payload.pinnedNodes ?? [],
    alpha: payload.alpha,
  });
  sendControlAck(taskId, payload.type, {
    nodeCount: validatedNodes.length,
    alpha: payload.alpha,
    pinnedCount: payload.pinnedNodes?.length ?? 0,
  });
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
    } else if (isForceSimulationControlMessage(data)) {
      handleDirectForceSimulationMessage(
        data as AnyForceSimulationControlMessage,
      );
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
  const validatedNodes = createValidatedNodes(data.nodes);
  logger.debug("worker", "Worker calling reheatSimulation", {
    nodeCount: validatedNodes.length,
    linkCount: data.links.length,
    alpha: data.alpha,
    linkDetails: data.links.map((link) => ({
      id: link.id,
      source: link.source,
      target: link.target,
    })),
  });
  try {
    logger.debug("worker", "About to call reheatSimulation");
    reheatSimulation({
      nodes: validatedNodes,
      links: validateLinks(data.links),
      config: createSafeConfig(data.config),
      pinnedNodes: data.pinnedNodes ?? [],
      alpha: data.alpha,
    });
    logger.debug("worker", "ReheatSimulation call completed");
  } catch (error) {
    logger.error("worker", "Error calling reheatSimulation", { error });
  }
}

// Helper to handle direct update links messages
function handleDirectUpdateLinksMessage(
  data: ForceSimulationUpdateLinksMessage,
) {
  logger.debug("worker", "Worker received update links message", data);
  logger.debug("worker", "Worker calling updateSimulationLinks", {
    linkCount: data.links.length,
    alpha: data.alpha,
    linkDetails: data.links.slice(0, 3).map((link) => ({
      id: link.id,
      source: link.source,
      target: link.target,
    })),
  });
  try {
    logger.debug("worker", "About to call updateSimulationLinks");
    updateSimulationLinks({
      links: validateLinks(data.links),
      alpha: data.alpha,
    });
    logger.debug("worker", "UpdateSimulationLinks call completed");
  } catch (error) {
    logger.error("worker", "Error calling updateSimulationLinks", { error });
  }
}

// Helper to handle direct update nodes messages
function handleDirectUpdateNodesMessage(
  data: ForceSimulationUpdateNodesMessage,
) {
  logger.debug("worker", "Worker received update nodes message", data);
  try {
    const validatedNodes = createValidatedNodes(data.nodes);
    updateSimulationNodes({
      nodes: validatedNodes,
      pinnedNodes: data.pinnedNodes ?? [],
      alpha: data.alpha,
    });
  } catch (error) {
    logger.error("worker", "Error calling updateSimulationNodes", { error });
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
