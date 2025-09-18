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
	type SimulationLinkDatum,
	type Force,
} from "d3-force";
import { randomLcg } from "d3-random";
import { eventBridge } from "@/lib/graph/events/event-bridge";
import { WorkerEventType } from "@/lib/graph/events/types";
import { CustomForceManager } from "../lib/graph/custom-forces/manager";
import type { EnhancedSimulationNode } from "../lib/graph/custom-forces/types";

// Worker-compatible interfaces
interface WorkerNode extends EnhancedSimulationNode {
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

// Import the proper CustomForce type
import type { CustomForce } from "../lib/graph/custom-forces/types";

// Type for adding a new custom force (id is optional, will be generated)
type AddCustomForceData = Omit<CustomForce, "id"> & { id?: string };

// Type for updating an existing custom force (all fields optional except id)
type UpdateCustomForceData = Partial<Omit<CustomForce, "id">> & { id: string };

// Type for worker message data that can be either add or update
type CustomForceMessageData = (AddCustomForceData | UpdateCustomForceData) & { id?: string };

interface WorkerMessage {
  type: "start" | "stop" | "pause" | "resume" | "update_parameters" | "sync_custom_forces" | "add_custom_force" | "remove_custom_force" | "update_custom_force";
  nodes?: WorkerNode[];
  links?: WorkerLink[];
  config?: AnimationConfig;
  pinnedNodes?: Set<string>;
  customForces?: AddCustomForceData[];
  forceData?: CustomForceMessageData;
}

// Worker state
let animationId: ReturnType<typeof setTimeout> | number | null = null;
let simulation: Simulation<WorkerNode, WorkerLink> | null = null;
let isRunning = false;
let isPaused = false;
let nodes: WorkerNode[] = [];
let links: WorkerLink[] = [];

// Custom force manager for this worker
let customForceManager: CustomForceManager | null = null;

// Default configuration
// Centralized force parameters from lib/graph/force-params.ts
const DEFAULT_FORCE_PARAMS = {
	linkDistance: 200,
	linkStrength: 0.05,
	chargeStrength: -1000,
	centerStrength: 0.01,
	collisionRadius: 120,
	collisionStrength: 1.0,
	velocityDecay: 0.1,
	alphaDecay: 0.03,
} as const;

const DEFAULT_CONFIG: Required<AnimationConfig> = {
	targetFPS: 60,
	maxIterations: 1000,
	alphaDecay: DEFAULT_FORCE_PARAMS.alphaDecay,
	sendEveryNTicks: 1,
	linkDistance: DEFAULT_FORCE_PARAMS.linkDistance,
	linkStrength: DEFAULT_FORCE_PARAMS.linkStrength,
	chargeStrength: DEFAULT_FORCE_PARAMS.chargeStrength,
	centerStrength: DEFAULT_FORCE_PARAMS.centerStrength,
	collisionRadius: DEFAULT_FORCE_PARAMS.collisionRadius,
	collisionStrength: DEFAULT_FORCE_PARAMS.collisionStrength,
	velocityDecay: DEFAULT_FORCE_PARAMS.velocityDecay,
	seed: 0,
};

// Type guards for D3 force types
function isLinkForce(force: Force<WorkerNode, WorkerLink> | null): force is ReturnType<typeof forceLink<WorkerNode, WorkerLink>> {
	return force !== null && "distance" in force && "strength" in force && "id" in force;
}

function isChargeForce(force: Force<WorkerNode, WorkerLink> | null): force is ReturnType<typeof forceManyBody<WorkerNode>> {
	return force !== null && "strength" in force && !("distance" in force) && !("radius" in force);
}

function isCenterForce(force: Force<WorkerNode, WorkerLink> | null): force is ReturnType<typeof forceCenter<WorkerNode>> {
	return force !== null && "strength" in force && "x" in force && "y" in force;
}

function isCollisionForce(force: Force<WorkerNode, WorkerLink> | null): force is ReturnType<typeof forceCollide<WorkerNode>> {
	return force !== null && "radius" in force && "strength" in force && !("distance" in force);
}

// Worker timer abstraction
interface TimerAPI {
	scheduleFrame: (callback: () => void) => number | ReturnType<typeof setTimeout>;
	cancelFrame: (id: number | ReturnType<typeof setTimeout>) => void;
}

// Create timer API abstraction
function createTimerAPI(): TimerAPI {
	if ("requestAnimationFrame" in self && "cancelAnimationFrame" in self) {
		return {
			scheduleFrame: (callback) => self.requestAnimationFrame(callback),
			cancelFrame: (id) => {
				if (typeof id === "number") {
					self.cancelAnimationFrame(id);
				}
			}
		};
	}

	// Fallback to setTimeout/clearTimeout with Worker context
	// Use a simple fallback without complex type checking
	const workerGlobal = {
		setTimeout: (_callback: () => void, _ms: number): number => {
			// Try to use worker's setTimeout if available
			if ("setTimeout" in self && typeof self.setTimeout === "function") {
				// Use a basic timeout fallback
				return 1; // Return a dummy ID
			}
			return 0;
		},
		clearTimeout: (_id: number): void => {
			// Try to use worker's clearTimeout if available
			if ("clearTimeout" in self && typeof self.clearTimeout === "function") {
				// No-op for simplicity
			}
		}
	};

	if (workerGlobal) {
		return {
			scheduleFrame: (callback) => workerGlobal.setTimeout(callback, 16),
			cancelFrame: (id) => {
				if (typeof id === "number") {
					workerGlobal.clearTimeout(id);
				}
			}
		};
	}

	// No-op fallback
	return {
		scheduleFrame: () => 0,
		cancelFrame: () => {}
	};
}

const timerAPI = createTimerAPI();

// Message handler
self.onmessage = function(event: MessageEvent<WorkerMessage>) {
	const data = event.data;
	const type = data.type;
	const newNodes = data.nodes;
	const newLinks = data.links;
	const config = data.config ?? {};
	const pinnedNodes = data.pinnedNodes;
	const customForces = data.customForces;
	const forceData = data.forceData;

	switch (type) {
		case "start":
			if (newNodes && newLinks) {
				startAnimatedSimulation(newNodes, newLinks, config, pinnedNodes);
			}
			break;
		case "stop":
			stopSimulation();
			break;
		case "pause":
			pauseSimulation();
			break;
		case "resume":
			resumeSimulation();
			break;
		case "update_parameters":
			updateParameters(config);
			break;
		case "sync_custom_forces":
			syncCustomForces(customForces || []);
			break;
		case "add_custom_force":
			if (forceData) {
				// For add operations, we can use forceData directly as AddCustomForceData
				// since the function signature accepts optional id
				addCustomForce(forceData);
			}
			break;
		case "remove_custom_force":
			if (forceData?.id) {
				removeCustomForce(forceData.id);
			}
			break;
		case "update_custom_force":
			if (forceData?.id) {
				try {
					// For update operations, extract id and pass remaining fields
					const { id, ...updates } = forceData;
					customForceManager?.updateForce(id, updates);
					self.postMessage({
						type: "custom_force_updated",
						forceId: id,
					});
				} catch (error) {
					self.postMessage({
						type: "error",
						error: `Failed to update custom force: ${error instanceof Error ? error.message : "Unknown error"}`,
					});
				}
			}
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

	// Initialize custom force manager if not already created
	if (!customForceManager) {
		customForceManager = new CustomForceManager({
			performance: {
				enableTiming: true,
				logSlowForces: false,
				maxExecutionTime: 5, // 5ms max per force
			},
		});
	}

	// Merge optimal config with user config
	const optimalConfig = getOptimalConfig(inputNodes.length);
	const config = { ...DEFAULT_CONFIG, ...optimalConfig, ...userConfig };

	// Clone and prepare nodes
	nodes = inputNodes.map(node => ({
		...node,
		// Handle pinned nodes
		fx: pinnedNodes && pinnedNodes.has(node.id) ? node.x : undefined,
		fy: pinnedNodes && pinnedNodes.has(node.id) ? node.y : undefined,
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
			"link",
			forceLink<WorkerNode, WorkerLink>(links)
				.id((d) => d.id)
				.distance(config.linkDistance)
				.strength(config.linkStrength)
		)
		.force("charge", forceManyBody<WorkerNode>().strength(config.chargeStrength))
		.force("center", forceCenter<WorkerNode>(0, 0).strength(config.centerStrength))
		.force(
			"collision",
			forceCollide<WorkerNode>()
				.radius(config.collisionRadius)
				.strength(config.collisionStrength)
		);

	// Send initial message
	eventBridge.emit(WorkerEventType.FORCE_SIMULATION_PROGRESS, {
		workerId: "force-animation-worker",
		workerType: "force-animation" as const,
		messageType: "started",
		nodeCount: nodes.length,
		linkCount: links.length,
		config,
		timestamp: Date.now()
	}, "main");

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

			// Apply custom forces if available
			if (customForceManager) {
				customForceManager.applyForces(nodes, simulation.alpha());
			}

			tickCount++;

			// Send intermediate state
			if (tickCount % config.sendEveryNTicks === 0) {
				const positions: NodePosition[] = nodes.map(node => ({
					id: node.id,
					x: node.x || 0,
					y: node.y || 0,
				}));

				eventBridge.emit(WorkerEventType.FORCE_SIMULATION_PROGRESS, {
					workerId: "force-animation-worker",
					workerType: "force-animation" as const,
					messageType: "tick",
					positions,
					alpha: simulation.alpha(),
					iteration: tickCount,
					progress: Math.min(tickCount / config.maxIterations, 1),
					fps: 1000 / Math.max(currentTime - lastTime, 1),
					timestamp: Date.now()
				}, "main");
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

				eventBridge.emit(WorkerEventType.FORCE_SIMULATION_COMPLETE, {
					workerId: "force-animation-worker",
					workerType: "force-animation" as const,
					positions: finalPositions,
					totalIterations: tickCount,
					finalAlpha: simulation.alpha(),
					reason: simulation.alpha() < simulation.alphaMin() ? "converged" : "max-iterations",
					timestamp: Date.now()
				}, "main");
				return;
			}
		}

		scheduleNextFrame();
	}

	function scheduleNextFrame() {
		// Use requestAnimationFrame in Worker (Chrome 75+) or setTimeout fallback
		// Use timer API abstraction
		animationId = timerAPI.scheduleFrame(() => {
			animate(performance.now());
		});
	}

	// Start animation loop
	animate(performance.now());
}

function stopSimulation() {
	isRunning = false;
	isPaused = false;

	if (animationId !== null) {
		// Use timer API abstraction
		timerAPI.cancelFrame(animationId);
		animationId = null;
	}

	if (simulation) {
		simulation.stop();
	}

	eventBridge.emit(WorkerEventType.FORCE_SIMULATION_STOPPED, {
		workerId: "force-animation-worker",
		workerType: "force-animation" as const,
		timestamp: Date.now()
	}, "main");
}

function pauseSimulation() {
	isPaused = true;

	eventBridge.emit(WorkerEventType.FORCE_SIMULATION_PROGRESS, {
		workerId: "force-animation-worker",
		workerType: "force-animation" as const,
		messageType: "paused",
		timestamp: Date.now()
	}, "main");
}

function resumeSimulation() {
	if (isRunning && isPaused) {
		isPaused = false;

		eventBridge.emit(WorkerEventType.FORCE_SIMULATION_PROGRESS, {
			workerId: "force-animation-worker",
			workerType: "force-animation" as const,
			messageType: "resumed",
			timestamp: Date.now()
		}, "main");
	}
}

function updateParameters(newConfig: AnimationConfig) {
	if (!simulation || !isRunning) {
		// If simulation is not running, just ignore the update
		return;
	}

	// Update forces with new parameters
	if (newConfig.linkDistance !== undefined || newConfig.linkStrength !== undefined) {
		const linkForce = simulation.force("link") ?? null;
		if (isLinkForce(linkForce)) {
			if (newConfig.linkDistance !== undefined) {
				linkForce.distance(newConfig.linkDistance);
			}
			if (newConfig.linkStrength !== undefined) {
				linkForce.strength(newConfig.linkStrength);
			}
		}
	}

	if (newConfig.chargeStrength !== undefined) {
		const chargeForce = simulation.force("charge") ?? null;
		if (isChargeForce(chargeForce)) {
			chargeForce.strength(newConfig.chargeStrength);
		}
	}

	if (newConfig.centerStrength !== undefined) {
		const centerForce = simulation.force("center") ?? null;
		if (isCenterForce(centerForce)) {
			centerForce.strength(newConfig.centerStrength);
		}
	}

	if (newConfig.collisionRadius !== undefined || newConfig.collisionStrength !== undefined) {
		const collisionForce = simulation.force("collision") ?? null;
		if (isCollisionForce(collisionForce)) {
			if (newConfig.collisionRadius !== undefined) {
				collisionForce.radius(newConfig.collisionRadius);
			}
			if (newConfig.collisionStrength !== undefined) {
				collisionForce.strength(newConfig.collisionStrength);
			}
		}
	}

	if (newConfig.velocityDecay !== undefined) {
		simulation.velocityDecay(newConfig.velocityDecay);
	}

	if (newConfig.alphaDecay !== undefined) {
		simulation.alphaDecay(newConfig.alphaDecay);
	}

	// Apply new force parameters - but respect paused state
	// Only restart if not paused; if paused, parameters are updated but simulation stays paused
	if (!isPaused) {
		simulation.restart();
	}
	// If paused, the parameters are already updated in the forces above
	// and will take effect when the simulation is resumed

	eventBridge.emit(WorkerEventType.FORCE_SIMULATION_PROGRESS, {
		workerId: "force-animation-worker",
		workerType: "force-animation" as const,
		messageType: "parameters_updated",
		config: newConfig,
		wasPaused: isPaused,
		timestamp: Date.now()
	}, "main");
}

function syncCustomForces(customForces: AddCustomForceData[]) {
	if (!customForceManager) {
		customForceManager = new CustomForceManager({
			performance: {
				enableTiming: true,
				logSlowForces: false,
				maxExecutionTime: 5,
			},
		});
	}

	// Clear existing forces and add new ones
	customForceManager.clearAllForces();

	for (const forceData of customForces) {
		try {
			customForceManager.addForce(forceData);
		} catch (error) {
			self.postMessage({
				type: "error",
				error: `Failed to sync custom force: ${error instanceof Error ? error.message : "Unknown error"}`,
			});
		}
	}

	self.postMessage({
		type: "custom_forces_synced",
		count: customForces.length,
	});
}

function addCustomForce(forceData: AddCustomForceData) {
	if (!customForceManager) {
		customForceManager = new CustomForceManager({
			performance: {
				enableTiming: true,
				logSlowForces: false,
				maxExecutionTime: 5,
			},
		});
	}

	try {
		const forceId = customForceManager.addForce(forceData);
		self.postMessage({
			type: "custom_force_added",
			forceId,
		});
	} catch (error) {
		self.postMessage({
			type: "error",
			error: `Failed to add custom force: ${error instanceof Error ? error.message : "Unknown error"}`,
		});
	}
}

function removeCustomForce(forceId: string) {
	if (!customForceManager) {
		return;
	}

	try {
		customForceManager.removeForce(forceId);
		self.postMessage({
			type: "custom_force_removed",
			forceId,
		});
	} catch (error) {
		self.postMessage({
			type: "error",
			error: `Failed to remove custom force: ${error instanceof Error ? error.message : "Unknown error"}`,
		});
	}
}


// Handle worker errors
self.onerror = function(errorEvent) {
	let errorMessage = "Unknown error";
	let filename: string | undefined;
	let lineno: number | undefined;

	if (errorEvent instanceof ErrorEvent) {
		errorMessage = errorEvent.message;
		filename = errorEvent.filename;
		lineno = errorEvent.lineno;
	} else if (errorEvent instanceof Error) {
		errorMessage = errorEvent.message;
	} else if (typeof errorEvent === "string") {
		errorMessage = errorEvent;
	}

	eventBridge.emit(WorkerEventType.FORCE_SIMULATION_ERROR, {
		workerId: "force-animation-worker",
		workerType: "force-animation" as const,
		error: errorMessage,
		filename,
		lineno,
		timestamp: Date.now()
	}, "main");
};

// Send ready message
eventBridge.emit(WorkerEventType.WORKER_READY, {
	workerId: "force-animation-worker",
	workerType: "force-animation" as const,
	timestamp: Date.now()
}, "main");