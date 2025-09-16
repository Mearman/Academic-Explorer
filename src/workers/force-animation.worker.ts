/**
 * Animated Force Simulation Web Worker
 * Provides real-time streaming of D3 force simulation updates for smooth animation
 */

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';
import { randomLcg } from 'd3-random';

// Worker-compatible interfaces
interface WorkerNode extends SimulationNodeDatum {
  id: string;
  type?: string;
  fx?: number | null;
  fy?: number | null;
}

interface WorkerLink extends SimulationLinkDatum<WorkerNode> {
  id: string;
  source: string | WorkerNode;
  target: string | WorkerNode;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
}

interface AnimationConfig {
  targetFPS?: number;
  maxIterations?: number;
  alphaDecay?: number;
  sendEveryNTicks?: number;
  linkDistance?: number;
  linkStrength?: number;
  chargeStrength?: number;
  centerStrength?: number;
  collisionRadius?: number;
  collisionStrength?: number;
  velocityDecay?: number;
  seed?: number;
}

interface WorkerMessage {
  type: 'start' | 'stop' | 'pause' | 'resume';
  nodes?: WorkerNode[];
  links?: WorkerLink[];
  config?: AnimationConfig;
  pinnedNodes?: Set<string>;
}

// Worker state
let animationId: number | null = null;
let simulation: Simulation<WorkerNode, WorkerLink> | null = null;
let isRunning = false;
let isPaused = false;
let nodes: WorkerNode[] = [];
let links: WorkerLink[] = [];

// Default configuration
const DEFAULT_CONFIG: Required<AnimationConfig> = {
  targetFPS: 60,
  maxIterations: 1000,
  alphaDecay: 0.02,
  sendEveryNTicks: 1,
  linkDistance: 100,
  linkStrength: 0.01,
  chargeStrength: -1000,
  centerStrength: 0.01,
  collisionRadius: 120,
  collisionStrength: 1.0,
  velocityDecay: 0.1,
  seed: 0,
};

// Message handler
self.onmessage = function(event: MessageEvent<WorkerMessage>) {
  const { type, nodes: newNodes, links: newLinks, config = {}, pinnedNodes } = event.data;

  switch (type) {
    case 'start':
      if (newNodes && newLinks) {
        startAnimatedSimulation(newNodes, newLinks, config, pinnedNodes);
      }
      break;
    case 'stop':
      stopSimulation();
      break;
    case 'pause':
      pauseSimulation();
      break;
    case 'resume':
      resumeSimulation();
      break;
  }
};

function getOptimalConfig(nodeCount: number): Partial<AnimationConfig> {
  if (nodeCount < 100) {
    // Smooth animation for small graphs
    return {
      targetFPS: 60,
      sendEveryNTicks: 1,
      alphaDecay: 0.01,
    };
  } else if (nodeCount < 500) {
    // Balanced performance for medium graphs
    return {
      targetFPS: 30,
      sendEveryNTicks: 2,
      alphaDecay: 0.02,
    };
  } else {
    // Performance optimized for large graphs
    return {
      targetFPS: 15,
      sendEveryNTicks: 4,
      alphaDecay: 0.05,
    };
  }
}

function startAnimatedSimulation(
  inputNodes: WorkerNode[],
  inputLinks: WorkerLink[],
  userConfig: AnimationConfig,
  pinnedNodes?: Set<string>
) {
  // Stop any existing simulation
  stopSimulation();

  // Merge optimal config with user config
  const optimalConfig = getOptimalConfig(inputNodes.length);
  const config = { ...DEFAULT_CONFIG, ...optimalConfig, ...userConfig };

  // Clone and prepare nodes
  nodes = inputNodes.map(node => ({
    ...node,
    // Handle pinned nodes
    fx: pinnedNodes?.has(node.id) ? node.x : undefined,
    fy: pinnedNodes?.has(node.id) ? node.y : undefined,
  }));

  // Clone links
  links = [...inputLinks];

  // Create deterministic random source
  const random = randomLcg(config.seed);

  // Create simulation
  simulation = forceSimulation<WorkerNode>(nodes)
    .randomSource(random)
    .velocityDecay(config.velocityDecay)
    .alpha(1)
    .alphaDecay(config.alphaDecay)
    .alphaTarget(0)
    .stop(); // We'll control ticking manually

  // Configure forces
  simulation
    .force(
      'link',
      forceLink<WorkerNode, WorkerLink>(links)
        .id((d) => d.id)
        .distance(config.linkDistance)
        .strength(config.linkStrength)
    )
    .force('charge', forceManyBody<WorkerNode>().strength(config.chargeStrength))
    .force('center', forceCenter<WorkerNode>(0, 0).strength(config.centerStrength))
    .force(
      'collision',
      forceCollide<WorkerNode>()
        .radius(config.collisionRadius)
        .strength(config.collisionStrength)
    );

  // Send initial message
  self.postMessage({
    type: 'started',
    nodeCount: nodes.length,
    linkCount: links.length,
    config,
  });

  // Start animation loop
  isRunning = true;
  isPaused = false;
  let tickCount = 0;
  const targetInterval = 1000 / config.targetFPS;
  let lastTime = 0;

  function animate(currentTime: number) {
    if (!isRunning || !simulation) return;

    if (isPaused) {
      // Continue animation loop but don't tick simulation
      scheduleNextFrame();
      return;
    }

    // Throttle to target FPS
    if (currentTime - lastTime >= targetInterval) {
      // Run simulation tick
      simulation.tick();
      tickCount++;

      // Send intermediate state
      if (tickCount % config.sendEveryNTicks === 0) {
        const positions: NodePosition[] = nodes.map(node => ({
          id: node.id,
          x: node.x || 0,
          y: node.y || 0,
        }));

        self.postMessage({
          type: 'tick',
          positions,
          alpha: simulation.alpha(),
          iteration: tickCount,
          progress: Math.min(tickCount / config.maxIterations, 1),
          fps: 1000 / Math.max(currentTime - lastTime, 1),
        });
      }

      lastTime = currentTime;

      // Check stopping conditions
      if (
        simulation.alpha() < simulation.alphaMin() ||
        tickCount >= config.maxIterations
      ) {
        stopSimulation();

        const finalPositions: NodePosition[] = nodes.map(node => ({
          id: node.id,
          x: node.x || 0,
          y: node.y || 0,
        }));

        self.postMessage({
          type: 'complete',
          positions: finalPositions,
          totalIterations: tickCount,
          finalAlpha: simulation.alpha(),
          reason: simulation.alpha() < simulation.alphaMin() ? 'converged' : 'max-iterations',
        });
        return;
      }
    }

    scheduleNextFrame();
  }

  function scheduleNextFrame() {
    // Use requestAnimationFrame in Worker (Chrome 75+) or setTimeout fallback
    if ('requestAnimationFrame' in self) {
      animationId = self.requestAnimationFrame(animate);
    } else {
      animationId = setTimeout(() => animate(performance.now()), 16);
    }
  }

  // Start animation loop
  animate(performance.now());
}

function stopSimulation() {
  isRunning = false;
  isPaused = false;

  if (animationId !== null) {
    if ('cancelAnimationFrame' in self) {
      self.cancelAnimationFrame(animationId);
    } else {
      clearTimeout(animationId);
    }
    animationId = null;
  }

  if (simulation) {
    simulation.stop();
  }

  self.postMessage({
    type: 'stopped',
  });
}

function pauseSimulation() {
  isPaused = true;

  self.postMessage({
    type: 'paused',
  });
}

function resumeSimulation() {
  if (isRunning && isPaused) {
    isPaused = false;

    self.postMessage({
      type: 'resumed',
    });
  }
}

// Handle worker errors
self.onerror = function(error) {
  self.postMessage({
    type: 'error',
    error: error.message,
    filename: error.filename,
    lineno: error.lineno,
  });
};

// Send ready message
self.postMessage({
  type: 'ready',
});