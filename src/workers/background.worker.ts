/**
 * Background Worker with D3 Force Simulation Implementation
 * Complete implementation of force-directed graph layout using D3
 * Supports deterministic seeded layouts and real-time position updates
 */

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum
} from "d3-force";
import { randomLcg } from "d3-random";
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

// Create worker event bus for cross-context communication
const workerEventBus = createLocalEventBus();

// Type extensions for D3 simulation nodes
interface D3SimulationNode extends SimulationNodeDatum {
  id: string;
  type?: string;
  fx?: number | null;
  fy?: number | null;
}

interface D3SimulationLink extends SimulationLinkDatum<D3SimulationNode> {
  id: string;
  source: string | D3SimulationNode;
  target: string | D3SimulationNode;
}

// Simulation state
let currentSimulation: Simulation<D3SimulationNode, D3SimulationLink> | null = null;
let simulationNodes: D3SimulationNode[] = [];
let simulationLinks: D3SimulationLink[] = [];
let simulationConfig: ForceSimulationConfig = DEFAULT_FORCE_PARAMS;
let isRunning = false;
let isPaused = false;
let iterationCount = 0;
let startTime = 0;
let lastProgressTime = 0;
let lastFpsTime = 0;
let frameCount = 0;
const PROGRESS_THROTTLE_MS = 16; // ~60fps
const FPS_CALCULATION_INTERVAL = 1000; // 1 second

// Performance tracking
interface PerformanceStats {
  totalIterations: number;
  finalAlpha: number;
  duration: number;
  averageFPS: number;
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
  type: z.enum(["FORCE_SIMULATION_STOP", "FORCE_SIMULATION_PAUSE", "FORCE_SIMULATION_RESUME", "FORCE_SIMULATION_UPDATE_PARAMETERS"]),
  config: forceSimulationConfigSchema.partial().optional(),
});

// Type guards using Zod
function isForceSimulationStartMessage(data: unknown): data is z.infer<typeof forceSimulationStartMessageSchema> {
  return forceSimulationStartMessageSchema.safeParse(data).success;
}

function isForceSimulationMessage(data: unknown): data is z.infer<typeof forceSimulationControlMessageSchema> {
  return forceSimulationControlMessageSchema.safeParse(data).success;
}

// Emit progress updates with throttling
function emitProgress(
  messageType: "started" | "tick" | "paused" | "resumed" | "parameters_updated",
  positions?: NodePosition[],
  force = false
) {
  const now = Date.now();

  // Throttle progress updates except for important state changes
  if (!force && messageType === "tick" && (now - lastProgressTime) < PROGRESS_THROTTLE_MS) {
    return;
  }

  lastProgressTime = now;

  // Calculate FPS for tick messages
  let fps = 0;
  if (messageType === "tick") {
    frameCount++;
    if (now - lastFpsTime >= FPS_CALCULATION_INTERVAL) {
      fps = Math.round((frameCount * 1000) / (now - lastFpsTime));
      frameCount = 0;
      lastFpsTime = now;
    }
  }

  const alpha = currentSimulation?.alpha() ?? 0;
  const progress = alpha > 0 ? Math.max(0, Math.min(1, 1 - alpha)) : 1;

  workerEventBus.emit({
    type: WorkerEventType.FORCE_SIMULATION_PROGRESS,
    payload: {
      workerId: "background-worker",
      workerType: "force-animation" as const,
      messageType,
      positions,
      alpha,
      iteration: iterationCount,
      progress,
      fps: fps || undefined,
      nodeCount: simulationNodes.length,
      linkCount: simulationLinks.length,
      timestamp: now
    }
  });
}

// Emit completion
function emitComplete(reason: "converged" | "max-iterations" | "stopped") {
  const positions: NodePosition[] = simulationNodes.map(node => ({
    id: node.id,
    x: node.x ?? 0,
    y: node.y ?? 0
  }));

  const stats: PerformanceStats = {
    totalIterations: iterationCount,
    finalAlpha: currentSimulation?.alpha() ?? 0,
    duration: Date.now() - startTime,
    averageFPS: frameCount > 0 ? Math.round((frameCount * 1000) / (Date.now() - startTime)) : 0
  };

  workerEventBus.emit({
    type: WorkerEventType.FORCE_SIMULATION_COMPLETE,
    payload: {
      workerId: "background-worker",
      workerType: "force-animation" as const,
      positions,
      totalIterations: stats.totalIterations,
      finalAlpha: stats.finalAlpha,
      reason,
      timestamp: Date.now()
    }
  });

  // Reset state
  isRunning = false;
  isPaused = false;
  iterationCount = 0;
}

// Emit error
function emitError(error: string) {
  workerEventBus.emit({
    type: WorkerEventType.FORCE_SIMULATION_ERROR,
    payload: {
      workerId: "background-worker",
      workerType: "force-animation" as const,
      error,
      timestamp: Date.now()
    }
  });
}

// Create and configure D3 simulation
function createSimulation(
  nodes: ForceSimulationNode[],
  links: ForceSimulationLink[],
  config: ForceSimulationConfig,
  pinnedNodes: string[] = []
): Simulation<D3SimulationNode, D3SimulationLink> {
  // Convert to D3 format
  simulationNodes = nodes.map(node => {
    const isPinned = pinnedNodes.includes(node.id);
    return {
      id: node.id,
      type: node.type,
      x: node.x ?? Math.random() * 800 - 400,
      y: node.y ?? Math.random() * 600 - 300,
      fx: isPinned ? (node.fx ?? node.x) : undefined,
      fy: isPinned ? (node.fy ?? node.y) : undefined
    };
  });

  simulationLinks = links.map(link => ({
    id: link.id,
    source: link.source,
    target: link.target
  }));

  // Create simulation with deterministic seeded random
  const seed = config.seed ?? 0x12345678;
  const rng = randomLcg(seed);

  const simulation = forceSimulation<D3SimulationNode, D3SimulationLink>(simulationNodes)
    .randomSource(rng)
    .alphaDecay(config.alphaDecay ?? DEFAULT_FORCE_PARAMS.alphaDecay)
    .velocityDecay(config.velocityDecay ?? DEFAULT_FORCE_PARAMS.velocityDecay);

  // Configure forces
  simulation
    .force("link", forceLink<D3SimulationNode, D3SimulationLink>(simulationLinks)
      .id(d => d.id)
      .distance(config.linkDistance ?? DEFAULT_FORCE_PARAMS.linkDistance)
      .strength(config.linkStrength ?? DEFAULT_FORCE_PARAMS.linkStrength)
    )
    .force("charge", forceManyBody()
      .strength(config.chargeStrength ?? DEFAULT_FORCE_PARAMS.chargeStrength)
    )
    .force("center", forceCenter(0, 0)
      .strength(config.centerStrength ?? DEFAULT_FORCE_PARAMS.centerStrength)
    )
    .force("collision", forceCollide()
      .radius(config.collisionRadius ?? DEFAULT_FORCE_PARAMS.collisionRadius)
      .strength(config.collisionStrength ?? DEFAULT_FORCE_PARAMS.collisionStrength)
    );

  return simulation;
}

// Update simulation parameters
function updateSimulationParameters(config: Partial<ForceSimulationConfig>) {
  if (!currentSimulation) return;

  simulationConfig = { ...simulationConfig, ...config };

  // Update forces with new parameters
  if (config.linkDistance !== undefined || config.linkStrength !== undefined) {
    const linkForce = currentSimulation.force("link");
    if (linkForce && typeof linkForce === "function" && "distance" in linkForce && "strength" in linkForce) {
      if (config.linkDistance !== undefined && "distance" in linkForce) {
        linkForce.distance(config.linkDistance);
      }
      if (config.linkStrength !== undefined && "strength" in linkForce) {
        linkForce.strength(config.linkStrength);
      }
    }
  }

  if (config.chargeStrength !== undefined) {
    const chargeForce = currentSimulation.force("charge");
    if (chargeForce && typeof chargeForce === "function" && "strength" in chargeForce) {
      chargeForce.strength(config.chargeStrength);
    }
  }

  if (config.centerStrength !== undefined) {
    const centerForce = currentSimulation.force("center");
    if (centerForce && typeof centerForce === "function" && "strength" in centerForce) {
      centerForce.strength(config.centerStrength);
    }
  }

  if (config.collisionRadius !== undefined || config.collisionStrength !== undefined) {
    const collisionForce = currentSimulation.force("collision");
    if (collisionForce && typeof collisionForce === "function" && "radius" in collisionForce && "strength" in collisionForce) {
      if (config.collisionRadius !== undefined && "radius" in collisionForce) {
        collisionForce.radius(config.collisionRadius);
      }
      if (config.collisionStrength !== undefined && "strength" in collisionForce) {
        collisionForce.strength(config.collisionStrength);
      }
    }
  }

  if (config.alphaDecay !== undefined) {
    currentSimulation.alphaDecay(config.alphaDecay);
  }

  if (config.velocityDecay !== undefined) {
    currentSimulation.velocityDecay(config.velocityDecay);
  }

  emitProgress("parameters_updated", undefined, true);
}

// Start simulation
function startSimulation(params: {
  nodes: ForceSimulationNode[];
  links: ForceSimulationLink[];
  config?: ForceSimulationConfig;
  pinnedNodes?: string[];
}) {
  const {
    nodes,
    links,
    config = DEFAULT_FORCE_PARAMS,
    pinnedNodes = []
  } = params;
  try {
    // Stop any existing simulation
    if (currentSimulation) {
      currentSimulation.stop();
    }

    // Store configuration
    simulationConfig = config;

    // Create new simulation
    currentSimulation = createSimulation(nodes, links, config, pinnedNodes);

    // Initialize state
    isRunning = true;
    isPaused = false;
    iterationCount = 0;
    startTime = Date.now();
    lastProgressTime = 0;
    lastFpsTime = startTime;
    frameCount = 0;

    // Emit started event
    emitProgress("started", undefined, true);

    // Set up tick handler
    currentSimulation.on("tick", () => {
      if (!isRunning || isPaused) return;

      iterationCount++;

      // Create position update
      const positions: NodePosition[] = simulationNodes.map(node => ({
        id: node.id,
        x: node.x ?? 0,
        y: node.y ?? 0
      }));

      // Emit progress
      emitProgress("tick", positions);

      // Check for convergence or max iterations
      const alpha = currentSimulation?.alpha() ?? 0;
      const maxIterations = config.maxIterations ?? 1000;

      if (alpha < 0.001) {
        currentSimulation?.stop();
        emitComplete("converged");
      } else if (iterationCount >= maxIterations) {
        currentSimulation?.stop();
        emitComplete("max-iterations");
      }
    });

    // Set up end handler
    currentSimulation.on("end", () => {
      if (isRunning && !isPaused) {
        emitComplete("converged");
      }
    });

    logger.debug("worker", "Force simulation started", {
      nodeCount: nodes.length,
      linkCount: links.length,
      pinnedCount: pinnedNodes.length,
      config
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("worker", "Failed to start force simulation", { error: errorMessage });
    emitError(`Failed to start simulation: ${errorMessage}`);
  }
}

// Stop simulation
function stopSimulation() {
  if (currentSimulation && isRunning) {
    currentSimulation.stop();
    emitComplete("stopped");
    logger.debug("worker", "Force simulation stopped");
  }
}

// Pause simulation
function pauseSimulation() {
  if (currentSimulation && isRunning && !isPaused) {
    currentSimulation.stop();
    isPaused = true;
    emitProgress("paused", undefined, true);
    logger.debug("worker", "Force simulation paused");
  }
}

// Resume simulation
function resumeSimulation() {
  if (currentSimulation && isRunning && isPaused) {
    isPaused = false;
    currentSimulation.restart();
    emitProgress("resumed", undefined, true);
    logger.debug("worker", "Force simulation resumed");
  }
}

// Message handling
self.onmessage = (e: MessageEvent) => {
  const data: unknown = e.data;

  try {
    if (isForceSimulationStartMessage(data)) {
      startSimulation({
        nodes: data.nodes,
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

        default:
          logger.warn("worker", "Unknown simulation message type", { type: data.type });
      }
    } else {
      logger.warn("worker", "Unknown message type", { data });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("worker", "Error handling worker message", { error: errorMessage, data });
    emitError(`Message handling error: ${errorMessage}`);
  }
};

// Initialize worker
function initializeWorker() {
  try {
    // Emit worker ready event
    workerEventBus.emit({
      type: WorkerEventType.WORKER_READY,
      payload: {
        workerId: "background-worker",
        workerType: "force-animation",
        timestamp: Date.now()
      }
    });

    logger.debug("worker", "D3 Force simulation worker initialized successfully");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("worker", "Failed to initialize D3 force simulation worker", { error: errorMessage });
    workerEventBus.emit({
      type: WorkerEventType.WORKER_ERROR,
      payload: {
        workerId: "background-worker",
        workerType: "force-animation",
        error: errorMessage,
        timestamp: Date.now()
      }
    });
  }
}

// Handle worker termination
self.addEventListener("beforeunload", () => {
  if (currentSimulation) {
    currentSimulation.stop();
  }
});

// Initialize worker on startup
try {
  initializeWorker();
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  workerEventBus.emit({
    type: WorkerEventType.WORKER_ERROR,
    payload: {
      workerId: "background-worker",
      workerType: "force-animation",
      error: errorMessage,
      timestamp: Date.now()
    }
  });
}