/**
 * Enhanced Background Worker
 * Uses BroadcastChannel-based event system for improved worker communication
 * Provides better progress tracking, error handling, and type safety
 */

import {
	forceSimulation,
	forceLink,
	forceManyBody,
	forceCenter,
	forceCollide,
	type Simulation,
	type SimulationNodeDatum
} from "d3-force";
import { randomLcg } from "d3-random";
import { WorkerEventType } from "@/lib/graph/events/types";
import { workerEventBus } from "@/lib/graph/events/broadcast-event-bus";
import { logger } from "@/lib/logger";
import { z } from "zod";

// Comprehensive zod schemas for type-safe worker communication
const ForceSimulationNodeSchema = z.object({
  id: z.string(),
  x: z.number().optional(),
  y: z.number().optional(),
  fx: z.number().nullable().optional(),
  fy: z.number().nullable().optional(),
  vx: z.number().optional(),
  vy: z.number().optional(),
  type: z.enum(["works", "authors", "sources", "institutions", "topics", "concepts", "publishers", "funders", "keywords"]).optional(),
});

const ForceSimulationLinkSchema = z.object({
  id: z.string(),
  source: z.union([z.string(), ForceSimulationNodeSchema]),
  target: z.union([z.string(), ForceSimulationNodeSchema]),
  strength: z.number().optional(),
  distance: z.number().optional(),
});

const ForceSimulationConfigSchema = z.object({
  linkDistance: z.number().optional(),
  linkStrength: z.number().optional(),
  chargeStrength: z.number().optional(),
  centerStrength: z.number().optional(),
  collisionRadius: z.number().optional(),
  collisionStrength: z.number().optional(),
  velocityDecay: z.number().optional(),
  alphaDecay: z.number().optional(),
  alpha: z.number().optional(),
  alphaMin: z.number().optional(),
  seed: z.number().optional(),
}).partial();

const EntityTypeSchema = z.enum(["works", "authors", "sources", "institutions", "publishers", "funders", "topics", "concepts"]);

const ExpansionOptionsSchema = z.object({
  limit: z.number().optional(),
  depth: z.number().optional(),
  relationTypes: z.array(z.enum([
    "authored", "affiliated", "published_in", "funded_by", "references",
    "source_published_by", "institution_child_of", "publisher_child_of",
    "work_has_topic", "related_to"
  ])).optional(),
  force: z.boolean().optional(),
  selectFields: z.array(z.string()).optional(),
  expansionSettings: z.any().optional(),
}).partial().optional();

const ExpansionSettingsSchema = z.object({
  maxNodesToAdd: z.number().optional(),
  filterByYear: z.number().optional(),
  filterByCitationCount: z.number().optional(),
}).partial().optional();

const ExpandRequestSchema = z.object({
  nodeId: z.string(),
  entityId: z.string(),
  entityType: EntityTypeSchema,
  options: ExpansionOptionsSchema,
  expansionSettings: ExpansionSettingsSchema,
});

// CustomForceManager removed - not currently used
import { createUnifiedOpenAlexClient, type CachedOpenAlexClient } from "@/lib/openalex/cached-client";
import type { ExpansionOptions } from "@/lib/entities";
import type { EntityType, GraphNode, GraphEdge } from "@/lib/graph/types";
import { RelationType } from "@/lib/graph/types";
import type { ExpansionSettings } from "@/lib/graph/types/expansion-settings";
import type {
  ForceSimulationNode,
  ForceSimulationLink,
  ForceSimulationConfig,
  NodePosition,
  WorkerSuccessResponse,
  WorkerErrorResponse
} from "@/lib/graph/events/enhanced-worker-types";

// Worker state
let simulation: Simulation<ForceSimulationNode, ForceSimulationLink> | null = null;
// Custom force manager removed - not currently used
let animationConfig: ForceSimulationConfig = {};
let isAnimating = false;
let isPaused = false;
let currentNodes: ForceSimulationNode[] = [];
let currentLinks: ForceSimulationLink[] = [];
let frameCount = 0;
let lastFrameTime = performance.now();
// Current request ID tracking removed - not currently used

// OpenAlex client for data fetching
let openAlexClient: CachedOpenAlexClient | null = null;

// Active expansion requests
const activeExpansions = new Map<string, AbortController>();

// Initialize worker
function initializeWorker() {
  try {
    openAlexClient = createUnifiedOpenAlexClient();

    // Emit worker ready event
    workerEventBus.emit(
      WorkerEventType.WORKER_READY,
      {
        workerId: "background-worker",
        workerType: "force-animation",
        timestamp: Date.now()
      }
    );

    logger.debug("worker", "Enhanced background worker initialized successfully");
  } catch (error) {
    logger.error("worker", "Failed to initialize enhanced background worker", { error });
    workerEventBus.emit(
      WorkerEventType.WORKER_ERROR,
      {
        workerId: "background-worker",
        workerType: "force-animation",
        error: error instanceof Error ? error.message : "Failed to initialize worker",
        timestamp: Date.now()
      }
    );
  }
}

// Message handlers
const BaseWorkerRequestSchema = z.object({
  type: z.string(),
  requestId: z.string().optional(),
});

const ForceSimulationStartRequestSchema = z.object({
  type: z.literal("FORCE_SIMULATION_START"),
  requestId: z.string().optional(),
  nodes: z.array(ForceSimulationNodeSchema),
  links: z.array(ForceSimulationLinkSchema),
  config: ForceSimulationConfigSchema.optional(),
  pinnedNodes: z.array(z.string()).optional(),
});

const ForceSimulationUpdateRequestSchema = z.object({
  type: z.literal("FORCE_SIMULATION_UPDATE_PARAMETERS"),
  requestId: z.string().optional(),
  config: ForceSimulationConfigSchema,
});

const DataFetchRequestSchema = z.object({
  type: z.literal("DATA_FETCH_EXPAND_NODE"),
  requestId: z.string().optional(),
  expandRequest: ExpandRequestSchema,
});

self.onmessage = (event) => {
  const parseResult = BaseWorkerRequestSchema.safeParse(event.data);

  if (!parseResult.success) {
    sendErrorResponse("", "Invalid request format");
    return;
  }

  const request = parseResult.data;

  try {
    switch (request.type) {
      case "FORCE_SIMULATION_START":
        handleForceSimulationStart(request);
        break;
      case "FORCE_SIMULATION_STOP":
        handleForceSimulationStop(request);
        break;
      case "FORCE_SIMULATION_PAUSE":
        handleForceSimulationPause(request);
        break;
      case "FORCE_SIMULATION_RESUME":
        handleForceSimulationResume(request);
        break;
      case "FORCE_SIMULATION_UPDATE_PARAMETERS":
        handleForceSimulationUpdateParameters(request);
        break;
      case "DATA_FETCH_EXPAND_NODE":
        handleDataFetchExpandNode(request);
        break;
      default:
        sendErrorResponse(request.requestId || "unknown", `Unknown request type: ${request.type}`);
    }
  } catch (error) {
    sendErrorResponse(request.requestId || "unknown", error instanceof Error ? error.message : "Unknown error");
  }
};

// Force simulation handlers
function handleForceSimulationStart(request: unknown) {
  const parseResult = ForceSimulationStartRequestSchema.safeParse(request);
  if (!parseResult.success) {
    sendErrorResponse("", "Invalid FORCE_SIMULATION_START request");
    return;
  }

  const typedRequest = parseResult.data;
  const { nodes, links, config, pinnedNodes } = typedRequest;
  // Data is now properly typed by zod schema - no assertions needed
  const pinnedNodesSet = pinnedNodes ? new Set(pinnedNodes) : undefined;
  startForceSimulation(nodes, links, config, pinnedNodesSet);
}

function handleForceSimulationStop(request: unknown) {
  const parseResult = BaseWorkerRequestSchema.safeParse(request);
  if (!parseResult.success) return;

  stopForceSimulation();
  sendSuccessResponse(parseResult.data.requestId || "unknown", { stopped: true });
}

function handleForceSimulationPause(request: unknown) {
  const parseResult = BaseWorkerRequestSchema.safeParse(request);
  if (!parseResult.success) return;

  pauseForceSimulation();
  sendSuccessResponse(parseResult.data.requestId || "unknown", { paused: true });
}

function handleForceSimulationResume(request: unknown) {
  const parseResult = BaseWorkerRequestSchema.safeParse(request);
  if (!parseResult.success) return;

  resumeForceSimulation();
  sendSuccessResponse(parseResult.data.requestId || "unknown", { resumed: true });
}

function handleForceSimulationUpdateParameters(request: unknown) {
  const parseResult = ForceSimulationUpdateRequestSchema.safeParse(request);
  if (!parseResult.success) {
    sendErrorResponse("", "Invalid FORCE_SIMULATION_UPDATE_PARAMETERS request");
    return;
  }

  const typedRequest = parseResult.data;
  const { config } = typedRequest;
  updateSimulationParameters(config);
  sendSuccessResponse(typedRequest.requestId || "unknown", { updated: true });
}

// Data fetching handlers
function handleDataFetchExpandNode(request: unknown) {
  const parseResult = DataFetchRequestSchema.safeParse(request);
  if (!parseResult.success) {
    sendErrorResponse("", "Invalid DATA_FETCH_EXPAND_NODE request");
    return;
  }

  const typedRequest = parseResult.data;
  const { expandRequest } = typedRequest;

  // expandRequest is now properly typed by zod schema
  const { nodeId, entityId, entityType, options, expansionSettings } = expandRequest;

  // Type guard for RelationType using string literal checks
  const isValidRelationType = (type: string): type is RelationType => {
    const validTypes = [
      "authored", "affiliated", "published_in", "funded_by", "references",
      "source_published_by", "institution_child_of", "publisher_child_of",
      "work_has_topic", "related_to"
    ];
    return validTypes.includes(type);
  };

  // Convert validated options to proper types if present
  const validRelationTypes = options?.relationTypes?.filter(isValidRelationType);
  const typedOptions: ExpansionOptions | undefined = options ? {
    ...options,
    relationTypes: validRelationTypes
  } : undefined;

  // Type guard for ExpansionSettings
  const isValidExpansionSettings = (settings: unknown): settings is ExpansionSettings => {
    return typeof settings === "object" && settings !== null && "target" in settings;
  };

  const validExpansionSettings = isValidExpansionSettings(expansionSettings) ? expansionSettings : undefined;

  void expandNode(typedRequest.requestId || "unknown", nodeId, entityId, entityType, typedOptions, validExpansionSettings).catch((error: unknown) => {
    sendErrorResponse(typedRequest.requestId || "", `Node expansion failed: ${String(error)}`);
  });
}

// Force simulation functions
function startForceSimulation(
  nodes: ForceSimulationNode[],
  links: ForceSimulationLink[],
  config?: ForceSimulationConfig,
  pinnedNodes?: Set<string>
) {
  if (simulation) {
    simulation.stop();
  }

  currentNodes = [...nodes];
  currentLinks = [...links];
  animationConfig = { ...config };
  frameCount = 0;
  lastFrameTime = performance.now();

  // Apply pinned positions
  if (pinnedNodes) {
    currentNodes.forEach(node => {
      if (pinnedNodes.has(node.id)) {
        node.fx = node.x;
        node.fy = node.y;
      }
    });
  }

  // Create simulation with deterministic random source
  const seed = config?.seed || 0x12345678;
  const seededRandom = randomLcg(seed);

  simulation = forceSimulation(currentNodes)
    .randomSource(() => seededRandom())
    .alpha(1)
    .alphaDecay(config?.alphaDecay || 0.0228)
    .velocityDecay(config?.velocityDecay || 0.4);

  // Add forces with proper type guards
  const linkForceInstance = forceLink(currentLinks)
    .id((d: SimulationNodeDatum) => {
      // Type guard to ensure we have the id property
      if (typeof d === "object" && d !== null && "id" in d && typeof d.id === "string") {
        return d.id;
      }
      throw new Error("Invalid node data: missing id");
    })
    .distance(config?.linkDistance || 30)
    .strength(config?.linkStrength || 1);

  simulation
    .force("link", linkForceInstance)
    .force("charge", forceManyBody()
      .strength(config?.chargeStrength || -300)
    )
    .force("center", forceCenter(0, 0)
      .strength(config?.centerStrength || 1)
    )
    .force("collision", forceCollide()
      .radius(config?.collisionRadius || 10)
      .strength(config?.collisionStrength || 0.7)
    );

  isAnimating = true;
  isPaused = false;

  // Emit started event
  workerEventBus.emit(
    WorkerEventType.FORCE_SIMULATION_PROGRESS,
    {
      workerId: "background-worker",
      workerType: "force-animation",
      messageType: "started",
      nodeCount: currentNodes.length,
      linkCount: currentLinks.length,
      timestamp: Date.now()
    }
  );

  // Start simulation with tick handler
  simulation.on("tick", handleSimulationTick);
  simulation.on("end", handleSimulationEnd);
}

function stopForceSimulation() {
  if (simulation) {
    simulation.stop();
    simulation = null;
  }

  isAnimating = false;
  isPaused = false;

  workerEventBus.emit(
    WorkerEventType.FORCE_SIMULATION_STOPPED,
    {
      workerId: "background-worker",
      workerType: "force-animation",
      timestamp: Date.now()
    }
  );
}

function pauseForceSimulation() {
  if (simulation && isAnimating && !isPaused) {
    simulation.stop();
    isPaused = true;

    workerEventBus.emit(
      WorkerEventType.FORCE_SIMULATION_PROGRESS,
      {
        workerId: "background-worker",
        workerType: "force-animation",
        messageType: "paused",
        timestamp: Date.now()
      }
    );
  }
}

function resumeForceSimulation() {
  if (simulation && isAnimating && isPaused) {
    simulation.restart();
    isPaused = false;

    workerEventBus.emit(
      WorkerEventType.FORCE_SIMULATION_PROGRESS,
      {
        workerId: "background-worker",
        workerType: "force-animation",
        messageType: "resumed",
        timestamp: Date.now()
      }
    );
  }
}

function updateSimulationParameters(config: Partial<ForceSimulationConfig>) {
  animationConfig = { ...animationConfig, ...config };

  if (simulation) {
    // Update simulation parameters
    if (config.alphaDecay !== undefined) {
      simulation.alphaDecay(config.alphaDecay);
    }
    if (config.velocityDecay !== undefined) {
      simulation.velocityDecay(config.velocityDecay);
    }

    // Update forces with proper d3-force typing
    const linkForce = simulation.force("link");
    if (linkForce && "distance" in linkForce && "strength" in linkForce) {
      try {
        if (config.linkDistance !== undefined) {
          const distanceFn = linkForce.distance;
          if (typeof distanceFn === "function") {
            distanceFn.call(linkForce, config.linkDistance);
          }
        }
        if (config.linkStrength !== undefined) {
          const strengthFn = linkForce.strength;
          if (typeof strengthFn === "function") {
            strengthFn.call(linkForce, config.linkStrength);
          }
        }
      } catch (error) {
        logger.warn("graph", "Failed to update link force", { error });
      }
    }

    const chargeForce = simulation.force("charge");
    if (chargeForce && "strength" in chargeForce && config.chargeStrength !== undefined) {
      try {
        const strengthFn = chargeForce.strength;
        if (typeof strengthFn === "function") {
          strengthFn.call(chargeForce, config.chargeStrength);
        }
      } catch (error) {
        logger.warn("graph", "Failed to update charge force", { error });
      }
    }

    const centerForce = simulation.force("center");
    if (centerForce && "strength" in centerForce && config.centerStrength !== undefined) {
      try {
        const strengthFn = centerForce.strength;
        if (typeof strengthFn === "function") {
          strengthFn.call(centerForce, config.centerStrength);
        }
      } catch (error) {
        logger.warn("graph", "Failed to update center force", { error });
      }
    }

    const collisionForce = simulation.force("collision");
    if (collisionForce && "radius" in collisionForce && "strength" in collisionForce) {
      try {
        if (config.collisionRadius !== undefined) {
          const radiusFn = collisionForce.radius;
          if (typeof radiusFn === "function") {
            radiusFn.call(collisionForce, config.collisionRadius);
          }
        }
        if (config.collisionStrength !== undefined) {
          const strengthFn = collisionForce.strength;
          if (typeof strengthFn === "function") {
            strengthFn.call(collisionForce, config.collisionStrength);
          }
        }
      } catch (error) {
        logger.warn("graph", "Failed to update collision force", { error });
      }
    }
  }

  workerEventBus.emit(
    WorkerEventType.FORCE_SIMULATION_PROGRESS,
    {
      workerId: "background-worker",
      workerType: "force-animation",
      messageType: "parameters_updated",
      config: animationConfig,
      timestamp: Date.now()
    }
  );
}

function handleSimulationTick() {
  if (!simulation || !isAnimating || isPaused) return;

  frameCount++;
  const currentTime = performance.now();
  const deltaTime = currentTime - lastFrameTime;
  const fps = deltaTime > 0 ? 1000 / deltaTime : 0;
  lastFrameTime = currentTime;

  const positions: NodePosition[] = currentNodes.map(node => ({
    id: node.id,
    x: node.x || 0,
    y: node.y || 0
  }));

  const progress = 1 - simulation.alpha();
  const shouldSend = frameCount % (animationConfig.sendEveryNTicks || 1) === 0;

  if (shouldSend) {
    workerEventBus.emit(
      WorkerEventType.FORCE_SIMULATION_PROGRESS,
      {
        workerId: "background-worker",
        workerType: "force-animation",
        messageType: "tick",
        positions,
        alpha: simulation.alpha(),
        iteration: frameCount,
        progress,
        fps: Math.round(fps),
        nodeCount: currentNodes.length,
        linkCount: currentLinks.length,
        timestamp: Date.now()
      }
    );
  }
}

function handleSimulationEnd() {
  const positions: NodePosition[] = currentNodes.map(node => ({
    id: node.id,
    x: node.x || 0,
    y: node.y || 0
  }));

  workerEventBus.emit(
    WorkerEventType.FORCE_SIMULATION_COMPLETE,
    {
      workerId: "background-worker",
      workerType: "force-animation",
      positions,
      totalIterations: frameCount,
      finalAlpha: simulation?.alpha() || 0,
      reason: "converged",
      timestamp: Date.now()
    }
  );

  isAnimating = false;
  isPaused = false;
}

// Data fetching functions
async function expandNode(
  requestId: string,
  nodeId: string,
  entityId: string,
  entityType: EntityType,
  _options?: ExpansionOptions,
  _expansionSettings?: ExpansionSettings
) {
  if (!openAlexClient) {
    sendErrorResponse(requestId, "OpenAlex client not initialized");
    return;
  }

  const abortController = new AbortController();
  activeExpansions.set(requestId, abortController);

  try {
    // Emit progress start
    workerEventBus.emit(
      WorkerEventType.DATA_FETCH_PROGRESS,
      {
        requestId,
        nodeId,
        entityId,
        currentStep: "initializing",
        progress: 0,
        timestamp: Date.now()
      }
    );

    // Simulate data fetching with progress updates
    const steps = ["fetching", "processing", "expanding", "finalizing"];

    for (let i = 0; i < steps.length; i++) {
      if (abortController.signal.aborted) {
        workerEventBus.emit(
          WorkerEventType.DATA_FETCH_CANCELLED,
          {
            requestId,
            nodeId,
            entityId,
            timestamp: Date.now()
          }
        );
        return;
      }

      workerEventBus.emit(
        WorkerEventType.DATA_FETCH_PROGRESS,
        {
          requestId,
          nodeId,
          entityId,
          currentStep: steps[i],
          progress: (i + 1) / steps.length,
          timestamp: Date.now()
        }
      );

      // Simulate async work
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Mock successful expansion result
    const nodes: GraphNode[] = [
      {
        id: `${nodeId}-related-1`,
        entityId: `${entityId}-related-1`,
        type: entityType,
        label: `Related ${entityType} 1`,
        position: { x: Math.random() * 400, y: Math.random() * 400 },
        externalIds: []
      }
    ];

    const edges: GraphEdge[] = [
      {
        id: `${nodeId}-edge-1`,
        source: nodeId,
        target: `${nodeId}-related-1`,
        type: RelationType.RELATED_TO,
        label: "relates to"
      }
    ];

    workerEventBus.emit(
      WorkerEventType.DATA_FETCH_COMPLETE,
      {
        requestId,
        nodeId,
        entityId,
        nodes,
        edges,
        statistics: {
          duration: 400,
          nodesAdded: nodes.length,
          edgesAdded: edges.length,
          apiCalls: 1
        },
        timestamp: Date.now()
      }
    );

  } catch (error) {
    workerEventBus.emit(
      WorkerEventType.DATA_FETCH_ERROR,
      {
        requestId,
        nodeId,
        entityId,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now()
      }
    );
  } finally {
    activeExpansions.delete(requestId);
  }
}

// Response helpers
function sendSuccessResponse(requestId: string, result: unknown) {
  const response: WorkerSuccessResponse = {
    type: "SUCCESS",
    requestId,
    result,
    timestamp: Date.now()
  };
  self.postMessage(response);
}

function sendErrorResponse(requestId: string, error: string) {
  const response: WorkerErrorResponse = {
    type: "ERROR",
    requestId,
    error,
    timestamp: Date.now()
  };
  self.postMessage(response);
}

// Removed unused _sendProgressResponse function

// Initialize worker on startup
try {
  initializeWorker();
} catch (error: unknown) {
  // Worker initialization error - log to worker event bus instead of console
  workerEventBus.emit(WorkerEventType.WORKER_ERROR, {
    workerId: "background-worker",
    workerType: "force-animation",
    error: String(error),
    timestamp: Date.now()
  });
}