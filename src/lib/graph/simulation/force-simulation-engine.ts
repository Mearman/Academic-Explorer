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

import { logger as defaultLogger } from "@/lib/logger";
import { z } from "zod";

// Zod schemas for D3 objects

const D3LinkSourceTargetSchema = z.object({
  id: z.string().optional(),
}).loose();

import { DEFAULT_FORCE_PARAMS } from "@/lib/graph/force-params";
import { setForceStrength, setForceDistance, setForceRadius } from "./d3-force-utils";

import type {
  ForceSimulationNode,
  ForceSimulationLink,
  ForceSimulationConfig,
  NodePosition,
} from "@/lib/graph/events/enhanced-worker-types";
import type { EntityType } from "@/lib/graph/types";

// D3 types used internally
export interface D3SimulationNode extends SimulationNodeDatum {
  id: string;
  type?: string;
  fx?: number | null;
  fy?: number | null;
}

export interface D3SimulationLink extends SimulationLinkDatum<D3SimulationNode> {
  id: string;
  source: string | D3SimulationNode;
  target: string | D3SimulationNode;
}

export interface SimulationCallbacks {
  onProgress: (payload: {
    messageType: "started" | "tick" | "paused" | "resumed" | "parameters_updated";
    positions?: NodePosition[];
    alpha?: number;
    iteration?: number;
    fps?: number;
    nodeCount?: number;
    linkCount?: number;
  }) => void;
  onComplete: (payload: {
    reason: "converged" | "max-iterations" | "stopped";
    positions: NodePosition[];
    totalIterations: number;
    finalAlpha: number;
  }) => void;
  onError: (message: string, context?: Record<string, unknown>) => void;
  onDebug?: (message: string, context?: Record<string, unknown>) => void;
}

interface PendingUpdate {
  type: "links" | "nodes";
  links?: ForceSimulationLink[];
  nodes?: ForceSimulationNode[];
  pinnedNodes?: string[];
  alpha: number;
  timestamp: number;
}

export interface ForceSimulationEngineOptions {
  logger?: typeof defaultLogger;
  callbacks: SimulationCallbacks;
  config?: ForceSimulationConfig;
  progressThrottleMs?: number;
  fpsIntervalMs?: number;
}

const isValidEntityType = (value: unknown): value is EntityType => (
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
    "keywords"
  ].includes(value)
);

export class ForceSimulationEngine {
  private currentSimulation: Simulation<D3SimulationNode, D3SimulationLink> | null = null;
  private simulationNodes: D3SimulationNode[] = [];
  private simulationLinks: D3SimulationLink[] = [];
  private pendingLinks: ForceSimulationLink[] = [];
  private pendingNodes: ForceSimulationNode[] = [];
  private simulationConfig: ForceSimulationConfig;
  private readonly callbacks: SimulationCallbacks;
  private readonly logger: typeof defaultLogger;
  private readonly progressThrottleMs: number;
  private readonly fpsIntervalMs: number;

  private isRunning = false;
  private isPaused = false;
  private iterationCount = 0;
  private startTime = 0;
  private lastProgressTime = 0;
  private lastFpsTime = 0;
  private frameCount = 0;
  private pendingUpdates: PendingUpdate[] = [];

  constructor(options: ForceSimulationEngineOptions) {
    const {
      callbacks,
      logger = defaultLogger,
      config = DEFAULT_FORCE_PARAMS,
      progressThrottleMs = 16,
      fpsIntervalMs = 1000,
    } = options;

    this.callbacks = callbacks;
    this.logger = logger;
    this.simulationConfig = config;
    this.progressThrottleMs = progressThrottleMs;
    this.fpsIntervalMs = fpsIntervalMs;
  }

  /** For testing */
  getDebugState() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      iterationCount: this.iterationCount,
      nodeCount: this.simulationNodes.length,
      linkCount: this.simulationLinks.length,
      pendingUpdates: [...this.pendingUpdates],
      pendingLinks: [...this.pendingLinks],
      pendingNodes: [...this.pendingNodes],
    };
  }

  start(params: {
    nodes: ForceSimulationNode[];
    links: ForceSimulationLink[];
    config?: ForceSimulationConfig;
    pinnedNodes?: string[];
  }) {
    const { nodes, links, config = DEFAULT_FORCE_PARAMS, pinnedNodes = [] } = params;

    if (this.currentSimulation) {
      this.currentSimulation.stop();
    }

    if (config) {
      this.simulationConfig = config;
    }

    const mergedNodes = this.mergePendingNodes(nodes);

    this.currentSimulation = this.createSimulation(mergedNodes, links, config, pinnedNodes);
    this.isRunning = true;
    this.isPaused = false;
    this.iterationCount = 0;
    this.startTime = Date.now();
    this.lastProgressTime = 0;
    this.lastFpsTime = this.startTime;
    this.frameCount = 0;

    if (this.pendingLinks.length > 0) {
      this.applyLinksImmediately(this.pendingLinks, config, pinnedNodes);
      this.pendingLinks = [];
    }

    this.emitProgress("started", undefined, true);

    return this.currentSimulation;
  }

  stop() {
    if (this.currentSimulation && this.isRunning) {
      this.currentSimulation.stop();
      this.pendingUpdates = [];
      this.isRunning = false;
      this.callbacks.onComplete({
        reason: "stopped",
        positions: this.collectPositions(),
        totalIterations: this.iterationCount,
        finalAlpha: this.currentSimulation.alpha()
      });
    }
  }

  pause() {
    if (this.currentSimulation && this.isRunning && !this.isPaused) {
      this.currentSimulation.stop();
      this.isPaused = true;
      this.emitProgress("paused", undefined, true);
    }
  }

  resume() {
    if (this.currentSimulation && this.isRunning && this.isPaused) {
      this.isPaused = false;
      this.currentSimulation.restart();
      this.emitProgress("resumed", undefined, true);
    }
  }

  updateParameters(config: Partial<ForceSimulationConfig>) {
    if (!this.currentSimulation) return;

    this.simulationConfig = { ...this.simulationConfig, ...config };

    if (config.linkDistance !== undefined || config.linkStrength !== undefined) {
      const linkForce = this.currentSimulation.force("link");
      if (linkForce) {
        if (config.linkDistance !== undefined) {
          setForceDistance({ force: linkForce, distance: config.linkDistance });
        }
        if (config.linkStrength !== undefined) {
          setForceStrength({ force: linkForce, strength: config.linkStrength });
        }
      }
    }

    if (config.chargeStrength !== undefined) {
      const chargeForce = this.currentSimulation.force("charge");
      if (chargeForce) {
        setForceStrength({ force: chargeForce, strength: config.chargeStrength });
      }
    }

    if (config.centerStrength !== undefined) {
      const centerForce = this.currentSimulation.force("center");
      if (centerForce) {
        setForceStrength({ force: centerForce, strength: config.centerStrength });
      }
    }

    if (config.collisionRadius !== undefined || config.collisionStrength !== undefined) {
      const collisionForce = this.currentSimulation.force("collision");
      if (collisionForce) {
        if (config.collisionRadius !== undefined) {
          setForceRadius({ force: collisionForce, radius: config.collisionRadius });
        }
        if (config.collisionStrength !== undefined) {
          setForceStrength({ force: collisionForce, strength: config.collisionStrength });
        }
      }
    }

    if (config.alphaDecay !== undefined) {
      this.currentSimulation.alphaDecay(config.alphaDecay);
    }

    if (config.velocityDecay !== undefined) {
      this.currentSimulation.velocityDecay(config.velocityDecay);
    }

    this.emitProgress("parameters_updated", undefined, true);
  }

  reheat(params: {
    nodes: ForceSimulationNode[];
    links: ForceSimulationLink[];
    config: ForceSimulationConfig;
    pinnedNodes?: string[];
    alpha?: number;
  }) {
    if (!this.currentSimulation) {
      this.start(params);
      return;
    }

    const { nodes, links, config, pinnedNodes = [], alpha = 1.0 } = params;

    this.simulationConfig = config;
    const d3Nodes = this.mergeNodesIntoSimulation(nodes, pinnedNodes);
    const d3Links = this.mapLinksToSimulation(links, d3Nodes);

    this.simulationLinks = d3Links;

    const linkForce = forceLink<D3SimulationNode, D3SimulationLink>(d3Links)
      .id(d => d.id)
      .distance(config.linkDistance ?? DEFAULT_FORCE_PARAMS.linkDistance)
      .strength(config.linkStrength ?? DEFAULT_FORCE_PARAMS.linkStrength);

    this.currentSimulation.force("link", linkForce);

    if (config.chargeStrength !== undefined) {
      const chargeForce = this.currentSimulation.force("charge");
      if (chargeForce) {
        setForceStrength({ force: chargeForce, strength: config.chargeStrength });
      }
    }

    this.resetSimulation(alpha);
  }

  updateLinks(links: ForceSimulationLink[], alpha = 1.0) {
    if (!links || links.length === 0) {
      return;
    }

    if (!this.currentSimulation) {
      this.pendingLinks = links.map(link => ({ ...link }));
      return;
    }

    this.queuePendingUpdate({
      type: "links",
      links: links.map(link => ({ ...link })),
      alpha,
      timestamp: Date.now()
    });

    const applied = this.applyPendingUpdates();
    if (!applied) {
      this.currentSimulation.alpha(alpha).restart();
    }
  }

  updateNodes(nodes: ForceSimulationNode[], pinnedNodes: Set<string> | string[] = [], alpha = 1.0) {
    if (!nodes || nodes.length === 0) {
      return;
    }

    const pinnedArray = Array.isArray(pinnedNodes) ? pinnedNodes : Array.from(pinnedNodes);

    if (!this.currentSimulation) {
      this.pendingNodes = nodes.map(node => ({ ...node }));
      return;
    }

    this.queuePendingUpdate({
      type: "nodes",
      nodes: nodes.map(node => ({ ...node })),
      pinnedNodes: [...pinnedArray],
      alpha,
      timestamp: Date.now()
    });

    const applied = this.applyPendingUpdates();
    if (!applied) {
      this.currentSimulation.alpha(alpha).restart();
    }
  }

  /** Allows tests to force-advance simulation ticks */
  tick(iterations = 1) {
    if (!this.currentSimulation) return;
    for (let i = 0; i < iterations; i += 1) {
      this.currentSimulation.tick();
    }
  }

  private emitProgress(
    messageType: "started" | "tick" | "paused" | "resumed" | "parameters_updated",
    positions?: NodePosition[]  ,
    force = false
  ) {
    const now = Date.now();

    if (
      !force &&
      messageType === "tick" &&
      (now - this.lastProgressTime) < this.progressThrottleMs
    ) {
      return;
    }

    this.lastProgressTime = now;

    if (messageType === "tick") {
      this.frameCount += 1;
      const delta = now - this.lastFpsTime;
      if (delta >= this.fpsIntervalMs) {
        this.lastFpsTime = now;
        this.frameCount = 0;
      }
    }

    const payload: {
      messageType: "started" | "tick" | "paused" | "resumed" | "parameters_updated";
      positions?: NodePosition[];
      alpha?: number;
      iteration?: number;
      fps?: number;
      nodeCount?: number;
      linkCount?: number;
    } = {
      messageType,
      positions,
      alpha: this.currentSimulation?.alpha(),
      iteration: this.iterationCount,
      fps: undefined,
      nodeCount: this.simulationNodes.length,
      linkCount: this.simulationLinks.length,
    };

    if (messageType === "tick" && this.frameCount > 0) {
      payload.fps = this.frameCount * (1000 / this.fpsIntervalMs);
    }

    this.callbacks.onProgress(payload);
  }

  private emitComplete(reason: "converged" | "max-iterations" | "stopped") {
    const payload = {
      reason,
      positions: this.collectPositions(),
      totalIterations: this.iterationCount,
      finalAlpha: this.currentSimulation?.alpha() ?? 0,
    };

    this.callbacks.onComplete(payload);
  }

  private emitError(message: string, context?: Record<string, unknown>) {
    this.callbacks.onError(message, context);
  }

  private collectPositions(): NodePosition[] {
    return this.simulationNodes.map(node => ({
      id: node.id,
      x: Number.isFinite(node.x ?? 0) ? (node.x ?? 0) : 0,
      y: Number.isFinite(node.y ?? 0) ? (node.y ?? 0) : 0,
    }));
  }

  private mergePendingNodes(nodes: ForceSimulationNode[]): ForceSimulationNode[] {
    if (this.pendingNodes.length === 0) {
      return nodes;
    }

    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    for (const pending of this.pendingNodes) {
      nodeMap.set(pending.id, pending);
    }
    this.pendingNodes = [];
    return Array.from(nodeMap.values());
  }

  private queuePendingUpdate(update: PendingUpdate) {
    this.pendingUpdates.push(update);
  }

  private applyPendingUpdates(): boolean {
    this.logger.debug("graph", "Applying pending updates", {
      hasSimulation: !!this.currentSimulation,
      pendingUpdatesCount: this.pendingUpdates.length,
      pendingUpdateTypes: this.pendingUpdates.map(u => u.type)
    });

    if (!this.currentSimulation || this.pendingUpdates.length === 0) {
      this.logger.debug("graph", "No updates to apply", {
        hasSimulation: !!this.currentSimulation,
        pendingUpdatesCount: this.pendingUpdates.length
      });
      return false;
    }

    let applied = false;

    for (const update of this.pendingUpdates) {
      if (update.type === "links" && update.links) {
        this.logger.debug("graph", "Processing links update", {
          linksCount: update.links.length,
          alpha: update.alpha,
          alphaBefore: this.currentSimulation.alpha()
        });

        this.applyLinksImmediately(update.links, this.simulationConfig);
        this.currentSimulation.alpha(update.alpha).restart();

        this.logger.debug("graph", "Links applied and simulation restarted", {
          alphaAfter: this.currentSimulation.alpha(),
          targetAlpha: update.alpha,
          simulationNodes: this.currentSimulation.nodes().length,
          isRunning: this.isRunning
        });
        applied = true;
      } else if (update.type === "nodes" && update.nodes) {
        this.logger.debug("graph", "Processing nodes update", {
          nodesCount: update.nodes.length
        });
        this.applyNodesImmediately(update.nodes, update.pinnedNodes ?? [], update.alpha);
        applied = true;
      }
    }

    this.pendingUpdates = [];
    this.logger.debug("graph", "Pending updates applied", { applied });

    return applied;
  }

  private applyLinksImmediately(
    links: ForceSimulationLink[],
    config: ForceSimulationConfig,
    pinnedNodes: string[] = []
  ) {
    if (!this.currentSimulation) {
      this.logger.warn("graph", "Cannot apply links - no current simulation");
      return;
    }

    this.logger.debug("graph", "Starting link application", {
      inputLinksCount: links.length,
      simulationNodesCount: this.simulationNodes.length,
      inputLinks: links.slice(0, 3).map(l => ({ id: l.id, source: l.source, target: l.target })),
      availableNodeIds: this.simulationNodes.slice(0, 5).map(n => n.id)
    });

    const d3Links = this.mapLinksToSimulation(links, this.simulationNodes);
    this.simulationLinks = d3Links;

    this.logger.debug("graph", "Links mapped to simulation", {
      d3LinksCount: d3Links.length,
      d3Links: d3Links.slice(0, 3).map(l => ({
        id: l.id,
        source: typeof l.source === "string" ? l.source : (() => {
          const parseResult = D3LinkSourceTargetSchema.safeParse(l.source);
          return parseResult.success ? (parseResult.data.id ?? "object") : "object";
        })(),
        target: typeof l.target === "string" ? l.target : (() => {
          const parseResult = D3LinkSourceTargetSchema.safeParse(l.target);
          return parseResult.success ? (parseResult.data.id ?? "object") : "object";
        })()
      }))
    });

    const linkForce = forceLink<D3SimulationNode, D3SimulationLink>(d3Links)
      .id(d => d.id)
      .distance(config.linkDistance ?? DEFAULT_FORCE_PARAMS.linkDistance)
      .strength(config.linkStrength ?? DEFAULT_FORCE_PARAMS.linkStrength);

    this.currentSimulation.force("link", linkForce);
    this.logger.debug("graph", "Link force applied to simulation", {
      linkDistance: config.linkDistance ?? DEFAULT_FORCE_PARAMS.linkDistance,
      linkStrength: config.linkStrength ?? DEFAULT_FORCE_PARAMS.linkStrength,
      currentAlpha: this.currentSimulation.alpha(),
      simulationState: {
        nodes: this.currentSimulation.nodes().length,
        alpha: this.currentSimulation.alpha(),
        alphaMin: this.currentSimulation.alphaMin(),
        alphaDecay: this.currentSimulation.alphaDecay()
      }
    });

    if (pinnedNodes.length > 0) {
      const pinnedSet = new Set(pinnedNodes);
      this.simulationNodes.forEach(node => {
        if (pinnedSet.has(node.id)) {
          node.fx = node.x ?? 0;
          node.fy = node.y ?? 0;
        }
      });
    }
  }

  private applyNodesImmediately(nodes: ForceSimulationNode[], pinnedNodes: string[], alpha: number) {
    if (!this.currentSimulation) {
      return;
    }

    const pinnedSet = new Set(pinnedNodes);

    const nodeMap = new Map(nodes.map(node => [node.id, node]))

    const updated = this.simulationNodes.map(existing => {
      const incoming = nodeMap.get(existing.id);
      if (incoming) {
        if (typeof incoming.x === "number") existing.x = incoming.x;
        if (typeof incoming.y === "number") existing.y = incoming.y;
        if (typeof incoming.vx === "number") {
          Object.assign(existing, { vx: incoming.vx });
        }
        if (typeof incoming.vy === "number") {
          Object.assign(existing, { vy: incoming.vy });
        }
        existing.type = incoming.type ?? existing.type;

        if (pinnedSet.has(existing.id)) {
          const fx = incoming.fx ?? incoming.x ?? existing.x ?? 0;
          const fy = incoming.fy ?? incoming.y ?? existing.y ?? 0;
          existing.fx = fx;
          existing.fy = fy;
        } else {
          existing.fx = undefined;
          existing.fy = undefined;
        }

        nodeMap.delete(existing.id);
      }

      return existing;
    });

    for (const node of nodeMap.values()) {
      const fallbackX = node.x ?? (Math.random() * 800 - 400);
      const fallbackY = node.y ?? (Math.random() * 600 - 300);
      const newNode: D3SimulationNode = {
        id: node.id,
        type: node.type,
        x: fallbackX,
        y: fallbackY,
        fx: pinnedSet.has(node.id) ? (node.fx ?? fallbackX) : undefined,
        fy: pinnedSet.has(node.id) ? (node.fy ?? fallbackY) : undefined
      };

      if (typeof node.vx === "number") {
        Object.assign(newNode, { vx: node.vx });
      }
      if (typeof node.vy === "number") {
        Object.assign(newNode, { vy: node.vy });
      }

      updated.push(newNode);
    }

    this.simulationNodes = updated;
    this.currentSimulation.nodes(this.simulationNodes);
    this.currentSimulation.alpha(alpha).restart();
  }

  private mergeNodesIntoSimulation(nodes: ForceSimulationNode[], pinnedNodes: string[]) {
    const pinnedSet = new Set(pinnedNodes);

    const nodeMap = new Map<string, ForceSimulationNode>();
    nodes.forEach(node => nodeMap.set(node.id, node));

    this.simulationNodes = nodes.map(node => {
      const isPinned = pinnedSet.has(node.id);
      return {
        id: node.id,
        type: isValidEntityType(node.type) ? node.type : undefined,
        x: node.x ?? Math.random() * 800 - 400,
        y: node.y ?? Math.random() * 600 - 300,
        fx: isPinned ? (node.fx ?? node.x) : undefined,
        fy: isPinned ? (node.fy ?? node.y) : undefined
      };
    });

    return this.simulationNodes;
  }

  private mapLinksToSimulation(
    links: ForceSimulationLink[],
    nodes: D3SimulationNode[]
  ): D3SimulationLink[] {
    const nodeById = new Map(nodes.map(node => [node.id, node]));

    return links.map(link => {
      const sourceId = typeof link.source === "string"
        ? link.source
        : (() => {
            const parseResult = D3LinkSourceTargetSchema.safeParse(link.source);
            return parseResult.success ? (parseResult.data.id ?? "unknown-source") : "unknown-source";
          })();
      const targetId = typeof link.target === "string"
        ? link.target
        : (() => {
            const parseResult = D3LinkSourceTargetSchema.safeParse(link.target);
            return parseResult.success ? (parseResult.data.id ?? "unknown-target") : "unknown-target";
          })();

      const sourceNode = nodeById.get(sourceId);
      const targetNode = nodeById.get(targetId);

      return {
        id: link.id,
        source: sourceNode ?? sourceId,
        target: targetNode ?? targetId
      };
    });
  }

  private resetSimulation(alpha: number) {
    if (!this.currentSimulation) return;

    this.iterationCount = 0;
    this.isPaused = false;
    this.isRunning = true;
    this.startTime = Date.now();
    this.lastProgressTime = 0;
    this.lastFpsTime = this.startTime;
    this.frameCount = 0;

    this.currentSimulation.alpha(alpha).restart();
  }

  private createSimulation(
    nodes: ForceSimulationNode[],
    links: ForceSimulationLink[],
    config: ForceSimulationConfig,
    pinnedNodes: string[]
  ) {
    try {
      const d3Nodes = this.mergeNodesIntoSimulation(nodes, pinnedNodes);
      const d3Links = this.mapLinksToSimulation(links, this.simulationNodes);

      this.simulationLinks = d3Links;

      const seed = config.seed ?? 0x12345678;
      const rng = randomLcg(seed);

      const simulation = forceSimulation<D3SimulationNode, D3SimulationLink>(d3Nodes)
        .randomSource(rng)
        .alphaDecay(config.alphaDecay ?? DEFAULT_FORCE_PARAMS.alphaDecay)
        .velocityDecay(config.velocityDecay ?? DEFAULT_FORCE_PARAMS.velocityDecay);

      const linkForce = forceLink<D3SimulationNode, D3SimulationLink>(d3Links)
        .id(d => d.id)
        .distance(config.linkDistance ?? DEFAULT_FORCE_PARAMS.linkDistance)
        .strength(config.linkStrength ?? DEFAULT_FORCE_PARAMS.linkStrength);
      simulation.force("link", linkForce);

      const chargeForce = forceManyBody()
        .strength(config.chargeStrength ?? DEFAULT_FORCE_PARAMS.chargeStrength);
      simulation.force("charge", chargeForce);

      const centerForce = forceCenter(0, 0)
        .strength(config.centerStrength ?? DEFAULT_FORCE_PARAMS.centerStrength);
      simulation.force("center", centerForce);

      const collisionForce = forceCollide()
        .radius(config.collisionRadius ?? DEFAULT_FORCE_PARAMS.collisionRadius)
        .strength(config.collisionStrength ?? DEFAULT_FORCE_PARAMS.collisionStrength);
      simulation.force("collision", collisionForce);

      simulation.on("tick", () => { this.handleTick(config); });
      simulation.on("end", () => {
        if (this.isRunning && !this.isPaused) {
          this.emitComplete("converged");
        }
      });

      return simulation;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error("graph", "Failed to create D3 simulation", { error: message });
      throw error;
    }
  }

  private handleTick(config: ForceSimulationConfig) {
    if (!this.isRunning || this.isPaused || !this.currentSimulation) {
      return;
    }

    this.applyPendingUpdates();

    this.iterationCount += 1;

    const positions = this.collectPositions();
    this.emitProgress("tick", positions);

    const alpha = this.currentSimulation.alpha();
    const maxIterations = config.maxIterations ?? 1000;

    if (alpha < 0.001) {
      this.currentSimulation.stop();
      this.emitComplete("converged");
      this.isRunning = false;
    } else if (this.iterationCount >= maxIterations) {
      this.currentSimulation.stop();
      this.emitComplete("max-iterations");
      this.isRunning = false;
    }
  }
}

