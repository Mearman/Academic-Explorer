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
import { createUnifiedOpenAlexClient } from "@/lib/openalex/cached-client";
import { EntityFactory, type ExpansionOptions } from "@/lib/entities";
import type { EntityType, GraphNode, GraphEdge } from "@/lib/graph/types";
import { RelationType } from "@/lib/graph/types";
import type { ExpansionSettings } from "@/lib/graph/types/expansion-settings";

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

// Type for worker message data that includes all possible force data
type CustomForceMessageData = AddCustomForceData | UpdateCustomForceData;

// Data fetching interfaces
interface ExpandNodeRequest {
  id: string;
  nodeId: string;
  entityId: string;
  entityType: EntityType;
  options?: ExpansionOptions;
  expansionSettings?: ExpansionSettings;
}

interface DataFetchingResponse {
  requestId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  statistics?: {
    duration: number;
    nodesFetched: number;
    edgesFetched: number;
  };
}

interface WorkerMessage {
  type: "start" | "stop" | "pause" | "resume" | "update_parameters" | "sync_custom_forces" | "add_custom_force" | "remove_custom_force" | "update_custom_force" | "expand_node" | "cancel_expansion";
  nodes?: WorkerNode[];
  links?: WorkerLink[];
  config?: AnimationConfig;
  pinnedNodes?: Set<string>;
  customForces?: AddCustomForceData[];
  forceData?: CustomForceMessageData;
  // Data fetching properties
  expandRequest?: ExpandNodeRequest;
  requestId?: string;
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

// Data fetching state
let openAlexClient: ReturnType<typeof createUnifiedOpenAlexClient> | null = null;
const activeExpansions = new Map<string, { nodeId: string; timestamp: number }>();

// Initialize OpenAlex client
function initializeOpenAlexClient() {
  if (!openAlexClient) {
    openAlexClient = createUnifiedOpenAlexClient({
      cacheEnabled: true,
      rateLimitEnabled: true,
      maxConcurrentRequests: 3, // Lower concurrency in worker
    });
  }
  return openAlexClient;
}

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
		setTimeout: ({ callback: _callback, ms: _ms }: { callback: () => void; ms: number }): number => {
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
			scheduleFrame: (callback) => workerGlobal.setTimeout({ callback, ms: 16 }),
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

	// Filter out EventBridge cross-context messages - these are handled by EventBridge
	// Only process direct worker messages for force simulation control
	// Filter out EventBridge cross-context messages
	// Validate we have a proper message with type field
	if (!data || typeof data !== "object" || !("type" in data)) {
		return;
	}

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
				startAnimatedSimulation({
					inputNodes: newNodes,
					inputLinks: newLinks,
					userConfig: config,
					pinnedNodes
				});
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
				// For add operations, forceData should be AddCustomForceData
				// Check required properties for add operation
				if ("name" in forceData &&
					"type" in forceData &&
					"config" in forceData &&
					typeof forceData.name === "string" &&
					typeof forceData.type === "string" &&
					typeof forceData.config === "object") {
					// We've verified this has the required properties for AddCustomForceData
					const addData: AddCustomForceData = {
						name: forceData.name,
						type: forceData.type,
						enabled: ("enabled" in forceData && typeof forceData.enabled === "boolean") ? forceData.enabled : true,
						strength: ("strength" in forceData && typeof forceData.strength === "number") ? forceData.strength : 0.5,
						priority: ("priority" in forceData && typeof forceData.priority === "number") ? forceData.priority : 0,
						config: forceData.config,
						...(forceData.id && typeof forceData.id === "string" && { id: forceData.id })
					};
					addCustomForce(addData);
				}
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
		case "expand_node":
			if (data.expandRequest) {
				const expandRequest = data.expandRequest; // Capture for use in catch
				void handleNodeExpansion(expandRequest).catch((error: unknown) => {
					// Note: logger is not available in worker context, post error message instead
					self.postMessage({
						type: "expansion_error",
						requestId: expandRequest.id,
						nodeId: expandRequest.nodeId,
						error: error instanceof Error ? error.message : "Unknown error"
					});
				});
			}
			break;
		case "cancel_expansion":
			if (data.requestId) {
				cancelExpansion(data.requestId);
			}
			break;
	}
};

// Data fetching and expansion functions
async function handleNodeExpansion(request: ExpandNodeRequest) {
	const { id: requestId, nodeId, entityId, entityType } = request;
	// Note: options and expansionSettings are available in request but not yet fully implemented

	// Track the expansion
	activeExpansions.set(requestId, { nodeId, timestamp: Date.now() });

	// Send progress update
	self.postMessage({
		type: "expansion_progress",
		requestId,
		nodeId,
		progress: 0.1,
		currentStep: "Initializing expansion"
	});

	try {
		const startTime = Date.now();
		const client = initializeOpenAlexClient();

		// Send progress update
		self.postMessage({
			type: "expansion_progress",
			requestId,
			nodeId,
			progress: 0.3,
			currentStep: "Fetching entity data"
		});

		// Create entity and perform expansion
		// Use the OpenAlex client to fetch entity data first, then create entity
		const entityData = await client.getById(entityType, entityId);
		// Validate the entity data has the required OpenAlex structure
		if (!entityData || typeof entityData !== "object") {
			throw new Error(`Invalid entity data received for ${entityType}:${entityId}`);
		}
		// Validate that entityData has the required OpenAlex structure
		if (!("id" in entityData) || typeof entityData.id !== "string" || !entityData.id.startsWith("https://openalex.org/")) {
			throw new Error(`Invalid OpenAlex entity structure for ${entityType}:${entityId}`);
		}
		// Additional validation for display_name which is required by all OpenAlex entities
		if (!("display_name" in entityData) || typeof entityData.display_name !== "string") {
			throw new Error(`Missing display_name for ${entityType}:${entityId}`);
		}

		// After validation, we can safely use entityData as OpenAlexEntity
		// We've validated that entityData has required fields (id and display_name)
		const validatedEntityData = entityData as import("@/lib/openalex/types").OpenAlexEntity;
		const entity = EntityFactory.createFromData(validatedEntityData, client);

		if (!entity) {
			throw new Error(`Failed to create entity for ${entityType}:${entityId}`);
		}

		// Send progress update
		self.postMessage({
			type: "expansion_progress",
			requestId,
			nodeId,
			progress: 0.6,
			currentStep: "Expanding relationships"
		});

		// Get relationships - for now we'll use a simplified approach
		// TODO: Implement proper relationship expansion
		// For now, return empty relationships as a placeholder
		// TODO: Implement proper relationship expansion using the entity
		const relationships: {
			nodes: Array<{ id: string; entityId: string; type: import("@/lib/graph/types").EntityType; label: string; data: unknown }>;
			edges: Array<{ id: string; source: string; target: string; type: string; label: string; data: unknown }>;
		} = {
			nodes: [],
			edges: []
		};

		// Send progress update
		self.postMessage({
			type: "expansion_progress",
			requestId,
			nodeId,
			progress: 0.9,
			currentStep: "Finalizing results"
		});

		// Convert to graph format
		const nodes: GraphNode[] = relationships.nodes.map((node) => ({
			id: node.id,
			entityId: node.entityId,
			type: node.type,
			label: node.label,
			data: node.data,
			position: { x: 0, y: 0 },
			externalIds: []
		}));

		const edges: GraphEdge[] = relationships.edges.map((edge) => {
			// Validate edge type using RelationType enum values
			const edgeType = edge.type || RelationType.RELATED_TO;

			// Use type predicate function without type assertions
			function isValidRelationType(type: string): type is RelationType {
				// Create a list of valid values without type assertion
				const validValues: string[] = Object.values(RelationType);
				return validValues.includes(type);
			}

			const relationType = isValidRelationType(edgeType) ? edgeType : RelationType.RELATED_TO;

			return {
				id: edge.id,
				source: edge.source,
				target: edge.target,
				type: relationType,
				label: edge.label,
				data: edge.data
			};
		});

		const duration = Date.now() - startTime;

		// Send completion message
		const response: DataFetchingResponse = {
			requestId,
			nodes,
			edges,
			statistics: {
				duration,
				nodesFetched: nodes.length,
				edgesFetched: edges.length
			}
		};

		self.postMessage({
			type: "expansion_complete",
			...response
		});

	} catch (error) {
		self.postMessage({
			type: "expansion_error",
			requestId,
			nodeId,
			error: error instanceof Error ? error.message : "Unknown expansion error"
		});
	} finally {
		// Clean up tracking
		activeExpansions.delete(requestId);
	}
}

function cancelExpansion(requestId: string) {
	if (activeExpansions.has(requestId)) {
		activeExpansions.delete(requestId);
		self.postMessage({
			type: "expansion_cancelled",
			requestId
		});
	}
}

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

function startAnimatedSimulation({
	inputNodes,
	inputLinks,
	userConfig,
	pinnedNodes
}: {
	inputNodes: WorkerNode[];
	inputLinks: WorkerLink[];
	userConfig: AnimationConfig;
	pinnedNodes?: Set<string>;
}) {
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