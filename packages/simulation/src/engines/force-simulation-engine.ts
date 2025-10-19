import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
} from "d3-force";
import { randomLcg } from "d3-random";

import type {
  SimulationNode,
  SimulationLink,
  ForceSimulationConfig,
  NodePosition,
} from "../types/index.js";
import { DEFAULT_FORCE_PARAMS } from "../types/index.js";
import type {
  D3SimulationNode,
  D3SimulationLink,
} from "../utils/d3-force-utils.js";
import {
  setForceStrength,
  setForceDistance,
  setForceRadius,
  sanitizePosition,
} from "../utils/d3-force-utils.js";
import { SimulationEventEmitter } from "../events/index.js";

// Re-export default params from types
export { DEFAULT_FORCE_PARAMS } from "../types/index.js";

// Logger interface for dependency injection
export interface Logger {
  debug(
    category: string,
    message: string,
    context?: Record<string, unknown>,
  ): void;
  warn(
    category: string,
    message: string,
    context?: Record<string, unknown>,
  ): void;
  error(
    category: string,
    message: string,
    context?: Record<string, unknown>,
  ): void;
}

// No-op logger as default
const noopLogger: Logger = {
  debug: () => {},
  warn: () => {},
  error: () => {},
};

interface PendingUpdate {
  type: "links" | "nodes";
  links?: SimulationLink[];
  nodes?: SimulationNode[];
  pinnedNodes?: string[];
  alpha: number;
  timestamp: number;
}

export interface ForceSimulationEngineOptions {
  logger?: Logger;
  config?: ForceSimulationConfig;
  progressThrottleMs?: number;
  fpsIntervalMs?: number;
}

/**
 * Pure force simulation engine that works with D3-force without React dependencies
 * Provides framework-agnostic APIs for force-directed graph layout
 */
export class ForceSimulationEngine extends SimulationEventEmitter {
  private currentSimulation: Simulation<
    D3SimulationNode,
    D3SimulationLink
  > | null = null;
  private simulationNodes: D3SimulationNode[] = [];
  private simulationLinks: D3SimulationLink[] = [];
  private pendingLinks: SimulationLink[] = [];
  private pendingNodes: SimulationNode[] = [];
  private simulationConfig: ForceSimulationConfig;
  private readonly logger: Logger;
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

  constructor(options: ForceSimulationEngineOptions = {}) {
    super();

    const {
      logger = noopLogger,
      config = DEFAULT_FORCE_PARAMS,
      progressThrottleMs = 16,
      fpsIntervalMs = 1000,
    } = options;

    this.logger = logger;
    this.simulationConfig = config;
    this.progressThrottleMs = progressThrottleMs;
    this.fpsIntervalMs = fpsIntervalMs;
  }

  /** Get current simulation state for debugging */
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

  /** Start the force simulation with given nodes and links */
  start(params: {
    nodes: SimulationNode[];
    links: SimulationLink[];
    config?: ForceSimulationConfig;
    pinnedNodes?: string[];
  }) {
    const {
      nodes,
      links,
      config = DEFAULT_FORCE_PARAMS,
      pinnedNodes = [],
    } = params;

    if (this.currentSimulation) {
      this.currentSimulation.stop();
    }

    this.simulationConfig = { ...this.simulationConfig, ...config };

    const mergedNodes = this.mergePendingNodes(nodes);

    this.currentSimulation = this.createSimulation(
      mergedNodes,
      links,
      this.simulationConfig,
      pinnedNodes,
    );
    this.isRunning = true;
    this.isPaused = false;
    this.iterationCount = 0;
    this.startTime = Date.now();
    this.lastProgressTime = 0;
    this.lastFpsTime = this.startTime;
    this.frameCount = 0;

    if (this.pendingLinks.length > 0) {
      this.applyLinksImmediately(
        this.pendingLinks,
        this.simulationConfig,
        pinnedNodes,
      );
      this.pendingLinks = [];
    }

    this.emitProgress({
      messageType: "started",
      positions: this.collectPositions(),
      alpha: this.currentSimulation.alpha(),
      iteration: this.iterationCount,
      nodeCount: this.simulationNodes.length,
      linkCount: this.simulationLinks.length,
    });

    return this.currentSimulation;
  }

  /** Stop the simulation */
  stop() {
    if (this.currentSimulation && this.isRunning) {
      this.currentSimulation.stop();
      this.pendingUpdates = [];
      this.isRunning = false;
      this.emitComplete({
        reason: "stopped",
        positions: this.collectPositions(),
        totalIterations: this.iterationCount,
        finalAlpha: this.currentSimulation.alpha(),
      });
    }
  }

  /** Pause the simulation */
  pause() {
    if (this.currentSimulation && this.isRunning && !this.isPaused) {
      this.currentSimulation.stop();
      this.isPaused = true;
      this.emitProgress({
        messageType: "paused",
        positions: this.collectPositions(),
        alpha: this.currentSimulation.alpha(),
        iteration: this.iterationCount,
        nodeCount: this.simulationNodes.length,
        linkCount: this.simulationLinks.length,
      });
    }
  }

  /** Resume the simulation */
  resume() {
    if (this.currentSimulation && this.isRunning && this.isPaused) {
      this.isPaused = false;
      this.currentSimulation.restart();
      this.emitProgress({
        messageType: "resumed",
        positions: this.collectPositions(),
        alpha: this.currentSimulation.alpha(),
        iteration: this.iterationCount,
        nodeCount: this.simulationNodes.length,
        linkCount: this.simulationLinks.length,
      });
    }
  }

  /** Update force parameters */
  updateParameters(config: Partial<ForceSimulationConfig>) {
    if (!this.currentSimulation) return;

    this.simulationConfig = { ...this.simulationConfig, ...config };

    this.updateLinkForce(config);
    this.updateChargeForce(config);
    this.updateCenterForce(config);
    this.updateCollisionForce(config);
    this.updateSimulationParameters(config);

    this.emitProgress({
      messageType: "parameters_updated",
      positions: this.collectPositions(),
      alpha: this.currentSimulation.alpha(),
      iteration: this.iterationCount,
      nodeCount: this.simulationNodes.length,
      linkCount: this.simulationLinks.length,
    });
  }

  private updateLinkForce(config: Partial<ForceSimulationConfig>) {
    if (!this.currentSimulation) return;

    if (
      config.linkDistance !== undefined ||
      config.linkStrength !== undefined
    ) {
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
  }

  private updateChargeForce(config: Partial<ForceSimulationConfig>) {
    if (!this.currentSimulation) return;

    if (config.chargeStrength !== undefined) {
      const chargeForce = this.currentSimulation.force("charge");
      if (chargeForce) {
        setForceStrength({
          force: chargeForce,
          strength: config.chargeStrength,
        });
      }
    }
  }

  private updateCenterForce(config: Partial<ForceSimulationConfig>) {
    if (!this.currentSimulation) return;

    if (config.centerStrength !== undefined) {
      const centerForce = this.currentSimulation.force("center");
      if (centerForce) {
        setForceStrength({
          force: centerForce,
          strength: config.centerStrength,
        });
      }
    }
  }

  private updateCollisionForce(config: Partial<ForceSimulationConfig>) {
    if (!this.currentSimulation) return;

    if (
      config.collisionRadius !== undefined ||
      config.collisionStrength !== undefined
    ) {
      const collisionForce = this.currentSimulation.force("collision");
      if (collisionForce) {
        if (config.collisionRadius !== undefined) {
          setForceRadius({
            force: collisionForce,
            radius: config.collisionRadius,
          });
        }
        if (config.collisionStrength !== undefined) {
          setForceStrength({
            force: collisionForce,
            strength: config.collisionStrength,
          });
        }
      }
    }
  }

  private updateSimulationParameters(config: Partial<ForceSimulationConfig>) {
    if (!this.currentSimulation) return;

    if (config.alphaDecay !== undefined) {
      this.currentSimulation.alphaDecay(config.alphaDecay);
    }

    if (config.velocityDecay !== undefined) {
      this.currentSimulation.velocityDecay(config.velocityDecay);
    }
  }

  /** Reheat simulation with new data */
  reheat(params: {
    nodes: SimulationNode[];
    links: SimulationLink[];
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
    const d3Nodes = this.mergeNodesIntoSimulation({ nodes, pinnedNodes });
    const d3Links = this.mapLinksToSimulation({ links, nodes: d3Nodes });

    this.simulationLinks = d3Links;

    const linkForce = forceLink<D3SimulationNode, D3SimulationLink>(d3Links)
      .id((d) => d.id)
      .distance(config.linkDistance ?? DEFAULT_FORCE_PARAMS.linkDistance)
      .strength(config.linkStrength ?? DEFAULT_FORCE_PARAMS.linkStrength);

    this.currentSimulation.force("link", linkForce);

    if (config.chargeStrength !== undefined) {
      const chargeForce = this.currentSimulation.force("charge");
      if (chargeForce) {
        setForceStrength({
          force: chargeForce,
          strength: config.chargeStrength,
        });
      }
    }

    this.resetSimulation(alpha);
  }

  /** Update links in the simulation */
  updateLinks(links: SimulationLink[], alpha = 1.0) {
    if (links.length === 0) {
      return;
    }

    if (!this.currentSimulation) {
      this.pendingLinks = links.map((link) => ({ ...link }));
      return;
    }

    this.queuePendingUpdate({
      type: "links",
      links: links.map((link) => ({ ...link })),
      alpha,
      timestamp: Date.now(),
    });

    const applied = this.applyPendingUpdates();
    if (!applied) {
      this.currentSimulation.alpha(alpha).restart();
    }
  }

  /** Update nodes in the simulation */
  updateNodes(
    nodes: SimulationNode[],
    pinnedNodes: Set<string> | string[] = [],
    alpha = 1.0,
  ) {
    if (nodes.length === 0) {
      return;
    }

    const pinnedArray = Array.isArray(pinnedNodes)
      ? pinnedNodes
      : Array.from(pinnedNodes);

    if (!this.currentSimulation) {
      this.pendingNodes = nodes.map((node) => ({ ...node }));
      return;
    }

    this.queuePendingUpdate({
      type: "nodes",
      nodes: nodes.map((node) => ({ ...node })),
      pinnedNodes: [...pinnedArray],
      alpha,
      timestamp: Date.now(),
    });

    const applied = this.applyPendingUpdates();
    if (!applied) {
      this.currentSimulation.alpha(alpha).restart();
    }
  }

  /** Force advance simulation by given iterations (for testing) */
  tick(iterations = 1) {
    if (!this.currentSimulation) return;
    for (let i = 0; i < iterations; i += 1) {
      this.currentSimulation.tick();
    }
  }

  /** Get current node positions */
  getPositions(): NodePosition[] {
    return this.collectPositions();
  }

  /** Get current simulation configuration */
  getConfig(): ForceSimulationConfig {
    return { ...this.simulationConfig };
  }

  private collectPositions(): NodePosition[] {
    return this.simulationNodes.map((node) => ({
      id: node.id,
      x: sanitizePosition(node.x, 0),
      y: sanitizePosition(node.y, 0),
    }));
  }

  private mergePendingNodes(nodes: SimulationNode[]): SimulationNode[] {
    if (this.pendingNodes.length === 0) {
      return nodes;
    }

    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
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
    this.logger.debug("simulation", "Applying pending updates", {
      hasSimulation: !!this.currentSimulation,
      pendingUpdatesCount: this.pendingUpdates.length,
      pendingUpdateTypes: this.pendingUpdates.map((u) => u.type),
    });

    if (!this.currentSimulation || this.pendingUpdates.length === 0) {
      return false;
    }

    let applied = false;

    for (const update of this.pendingUpdates) {
      if (update.type === "links" && update.links) {
        this.applyLinksImmediately(update.links, this.simulationConfig);
        this.currentSimulation.alpha(update.alpha).restart();
        applied = true;
      } else if (update.type === "nodes" && update.nodes) {
        this.applyNodesImmediately({
          nodes: update.nodes,
          pinnedNodes: update.pinnedNodes ?? [],
          alpha: update.alpha,
        });
        applied = true;
      }
    }

    this.pendingUpdates = [];
    return applied;
  }

  private applyLinksImmediately(
    links: SimulationLink[],
    config: ForceSimulationConfig,
    pinnedNodes: string[] = [],
  ) {
    if (!this.currentSimulation) {
      this.logger.warn(
        "simulation",
        "Cannot apply links - no current simulation",
      );
      return;
    }

    const d3Links = this.mapLinksToSimulation({
      links,
      nodes: this.simulationNodes,
    });
    this.simulationLinks = d3Links;

    const linkForce = forceLink<D3SimulationNode, D3SimulationLink>(d3Links)
      .id((d) => d.id)
      .distance(config.linkDistance ?? DEFAULT_FORCE_PARAMS.linkDistance)
      .strength(config.linkStrength ?? DEFAULT_FORCE_PARAMS.linkStrength);

    this.currentSimulation.force("link", linkForce);

    if (pinnedNodes.length > 0) {
      const pinnedSet = new Set(pinnedNodes);
      this.simulationNodes.forEach((node) => {
        if (pinnedSet.has(node.id)) {
          node.fx = node.x ?? 0;
          node.fy = node.y ?? 0;
        }
      });
    }
  }

  private applyNodesImmediately({
    nodes,
    pinnedNodes,
    alpha,
  }: {
    nodes: SimulationNode[];
    pinnedNodes: string[];
    alpha: number;
  }) {
    if (!this.currentSimulation) {
      return;
    }

    const pinnedSet = new Set(pinnedNodes);
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));

    const updated = this.simulationNodes.map((existing) => {
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
        if (incoming.type !== undefined) {
          existing.type = incoming.type;
        }

        if (pinnedSet.has(existing.id)) {
          const fx = incoming.fx ?? incoming.x ?? existing.x ?? 0;
          const fy = incoming.fy ?? incoming.y ?? existing.y ?? 0;
          existing.fx = fx;
          existing.fy = fy;
        } else {
          existing.fx = null;
          existing.fy = null;
        }

        nodeMap.delete(existing.id);
      }

      return existing;
    });

    // Add new nodes
    for (const node of nodeMap.values()) {
      const fallbackX = node.x ?? Math.random() * 800 - 400;
      const fallbackY = node.y ?? Math.random() * 600 - 300;
      const newNode: D3SimulationNode = {
        id: node.id,
        x: fallbackX,
        y: fallbackY,
        fx: pinnedSet.has(node.id) ? (node.fx ?? fallbackX) : null,
        fy: pinnedSet.has(node.id) ? (node.fy ?? fallbackY) : null,
      };

      if (node.type !== undefined) {
        newNode.type = node.type;
      }

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

  private mergeNodesIntoSimulation({
    nodes,
    pinnedNodes,
  }: {
    nodes: SimulationNode[];
    pinnedNodes: string[];
  }) {
    const pinnedSet = new Set(pinnedNodes);

    this.simulationNodes = nodes.map((node) => {
      const isPinned = pinnedSet.has(node.id);
      const x = node.x ?? Math.random() * 800 - 400;
      const y = node.y ?? Math.random() * 600 - 300;

      const d3Node: D3SimulationNode = {
        id: node.id,
        x,
        y,
        fx: isPinned ? (node.fx ?? x) : null,
        fy: isPinned ? (node.fy ?? y) : null,
      };

      if (node.type !== undefined) {
        d3Node.type = node.type;
      }

      return d3Node;
    });

    return this.simulationNodes;
  }

  private mapLinksToSimulation({
    links,
    nodes,
  }: {
    links: SimulationLink[];
    nodes: D3SimulationNode[];
  }): D3SimulationLink[] {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));

    return links.map((link) => {
      const sourceId =
        typeof link.source === "string" ? link.source : link.source.id;
      const targetId =
        typeof link.target === "string" ? link.target : link.target.id;

      const sourceNode = nodeById.get(sourceId);
      const targetNode = nodeById.get(targetId);

      return {
        id: link.id,
        source: sourceNode ?? sourceId,
        target: targetNode ?? targetId,
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
    nodes: SimulationNode[],
    links: SimulationLink[],
    config: ForceSimulationConfig,
    pinnedNodes: string[],
  ) {
    try {
      const d3Nodes = this.mergeNodesIntoSimulation({ nodes, pinnedNodes });
      const d3Links = this.mapLinksToSimulation({
        links,
        nodes: this.simulationNodes,
      });

      this.simulationLinks = d3Links;

      const seed = config.seed ?? DEFAULT_FORCE_PARAMS.seed;
      const rng = randomLcg(seed);

      const simulation = forceSimulation<D3SimulationNode, D3SimulationLink>(
        d3Nodes,
      )
        .randomSource(rng)
        .alphaDecay(config.alphaDecay ?? DEFAULT_FORCE_PARAMS.alphaDecay)
        .velocityDecay(
          config.velocityDecay ?? DEFAULT_FORCE_PARAMS.velocityDecay,
        );

      const linkForce = forceLink<D3SimulationNode, D3SimulationLink>(d3Links)
        .id((d) => d.id)
        .distance(config.linkDistance ?? DEFAULT_FORCE_PARAMS.linkDistance)
        .strength(config.linkStrength ?? DEFAULT_FORCE_PARAMS.linkStrength);
      simulation.force("link", linkForce);

      const chargeForce = forceManyBody().strength(
        config.chargeStrength ?? DEFAULT_FORCE_PARAMS.chargeStrength,
      );
      simulation.force("charge", chargeForce);

      const centerForce = forceCenter(0, 0).strength(
        config.centerStrength ?? DEFAULT_FORCE_PARAMS.centerStrength,
      );
      simulation.force("center", centerForce);

      const collisionForce = forceCollide()
        .radius(config.collisionRadius ?? DEFAULT_FORCE_PARAMS.collisionRadius)
        .strength(
          config.collisionStrength ?? DEFAULT_FORCE_PARAMS.collisionStrength,
        );
      simulation.force("collision", collisionForce);

      simulation.on("tick", () => {
        this.handleTick(config);
      });
      simulation.on("end", () => {
        if (this.isRunning && !this.isPaused) {
          this.emitComplete({
            reason: "converged",
            positions: this.collectPositions(),
            totalIterations: this.iterationCount,
            finalAlpha: this.currentSimulation?.alpha() ?? 0,
          });
        }
      });

      return simulation;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error("simulation", "Failed to create D3 simulation", {
        error: message,
      });
      this.emitError({
        message: "Failed to create D3 simulation",
        context: { error: message },
      });
      throw error;
    }
  }

  private handleTick(config: ForceSimulationConfig) {
    if (!this.isRunning || this.isPaused || !this.currentSimulation) {
      return;
    }

    this.applyPendingUpdates();

    this.iterationCount += 1;

    const now = Date.now();
    const shouldEmitProgress =
      now - this.lastProgressTime >= this.progressThrottleMs;

    if (shouldEmitProgress) {
      this.lastProgressTime = now;
      this.frameCount += 1;

      const delta = now - this.lastFpsTime;
      let fps: number | undefined;
      if (delta >= this.fpsIntervalMs) {
        fps = this.frameCount * (1000 / this.fpsIntervalMs);
        this.lastFpsTime = now;
        this.frameCount = 0;
      }

      const positions = this.collectPositions();
      const progressPayload: {
        messageType: "tick";
        positions: NodePosition[];
        alpha: number;
        iteration: number;
        nodeCount: number;
        linkCount: number;
        fps?: number;
      } = {
        messageType: "tick",
        positions,
        alpha: this.currentSimulation.alpha(),
        iteration: this.iterationCount,
        nodeCount: this.simulationNodes.length,
        linkCount: this.simulationLinks.length,
      };

      if (fps !== undefined) {
        progressPayload.fps = fps;
      }

      this.emitProgress(progressPayload);
    }

    const alpha = this.currentSimulation.alpha();
    const maxIterations =
      config.maxIterations ?? DEFAULT_FORCE_PARAMS.maxIterations;

    if (alpha < 0.001) {
      this.currentSimulation.stop();
      this.emitComplete({
        reason: "converged",
        positions: this.collectPositions(),
        totalIterations: this.iterationCount,
        finalAlpha: alpha,
      });
      this.isRunning = false;
    } else if (this.iterationCount >= maxIterations) {
      this.currentSimulation.stop();
      this.emitComplete({
        reason: "max-iterations",
        positions: this.collectPositions(),
        totalIterations: this.iterationCount,
        finalAlpha: alpha,
      });
      this.isRunning = false;
    }
  }
}
