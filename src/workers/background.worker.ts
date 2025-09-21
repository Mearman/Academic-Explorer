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
import { logger } from "@/lib/logger";
import { CustomForceManager } from "../lib/graph/custom-forces/manager";
import type { EnhancedSimulationNode } from "../lib/graph/custom-forces/types";
import { createUnifiedOpenAlexClient } from "@/lib/openalex/cached-client";
import type { ExpansionOptions } from "@/lib/entities";
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
import type { CustomForce, CustomForceConfig, CustomForceType } from "../lib/graph/custom-forces/types";

// Type for adding a new custom force (id is optional, will be generated)
type AddCustomForceData = Omit<CustomForce, "id"> & {
  id?: string;
};


// Type for worker message data that includes all possible force data

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
const activeExpansions = new Map<string, { nodeId: string; entityId: string; timestamp: number }>();

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

// Type guards for EventBridge payloads
function isValidCustomForceType(type: string): type is CustomForceType {
	return ["radial", "property-x", "property-y", "property-both", "cluster", "repulsion", "attraction", "orbit"].includes(type);
}

function isValidCustomForceConfig(config: unknown): config is CustomForceConfig {
	if (typeof config !== "object" || config === null) return false;
	if (!("type" in config) || typeof config.type !== "string") return false;

	// Basic validation - each config type must have a 'type' property
	// The CustomForceManager will do more detailed validation
	return isValidCustomForceType(config.type);
}
function isForceSimulationStartPayload(data: unknown): data is {
	nodes: WorkerNode[];
	links: WorkerLink[];
	config?: AnimationConfig;
	pinnedNodes?: Set<string>;
} {
	if (typeof data !== "object" || data === null) return false;
	if (!("nodes" in data) || !("links" in data)) return false;
	// TypeScript narrowing: after checks, we know data has these properties
	return Array.isArray(data.nodes) && Array.isArray(data.links);
}

function isUpdateParametersPayload(data: unknown): data is { config: AnimationConfig } {
	return typeof data === "object" && data !== null && "config" in data;
}

function isCustomForcesSyncPayload(data: unknown): data is { customForces: AddCustomForceData[] } {
	if (typeof data !== "object" || data === null) return false;
	if (!("customForces" in data)) return false;
	// TypeScript narrowing: after checks, we know data has customForces property
	return Array.isArray(data.customForces);
}

function isCustomForcePayload(data: unknown): data is { forceData: Record<string, unknown> } {
	return typeof data === "object" && data !== null && "forceData" in data;
}

function isExpandNodePayload(data: unknown): data is { expandRequest: ExpandNodeRequest } {
	return typeof data === "object" && data !== null && "expandRequest" in data;
}

function isCancelExpansionPayload(data: unknown): data is { requestId: string } {
	if (typeof data !== "object" || data === null) return false;
	if (!("requestId" in data)) return false;
	// TypeScript narrowing: after checks, we know data has requestId property
	return typeof data.requestId === "string";
}

// EventBridge message handlers - replaces self.onmessage
eventBridge.registerMessageHandler("FORCE_SIMULATION_START", (data) => {
	if (isForceSimulationStartPayload(data)) {
		startAnimatedSimulation({
			inputNodes: data.nodes,
			inputLinks: data.links,
			userConfig: data.config ?? {},
			pinnedNodes: data.pinnedNodes
		});
	}
});

eventBridge.registerMessageHandler("FORCE_SIMULATION_STOP", () => {
	stopSimulation();
});

eventBridge.registerMessageHandler("FORCE_SIMULATION_PAUSE", () => {
	pauseSimulation();
});

eventBridge.registerMessageHandler("FORCE_SIMULATION_RESUME", () => {
	resumeSimulation();
});

eventBridge.registerMessageHandler("FORCE_SIMULATION_UPDATE_PARAMETERS", (data) => {
	if (isUpdateParametersPayload(data)) {
		updateParameters(data.config ?? {});
	}
});

eventBridge.registerMessageHandler("CUSTOM_FORCES_SYNC", (data) => {
	if (isCustomForcesSyncPayload(data)) {
		syncCustomForces(data.customForces || []);
	}
});

eventBridge.registerMessageHandler("CUSTOM_FORCE_ADD", (data) => {
	if (isCustomForcePayload(data)) {
		const forceData = data.forceData;
		if (forceData &&
			"name" in forceData &&
			"type" in forceData &&
			"config" in forceData &&
			typeof forceData.name === "string" &&
			typeof forceData.type === "string" &&
			isValidCustomForceType(forceData.type) &&
			isValidCustomForceConfig(forceData.config)) {
			// We've verified this has the required properties for AddCustomForceData
			const addData: AddCustomForceData = {
				name: forceData.name,
				type: forceData.type,
				enabled: ("enabled" in forceData && typeof forceData.enabled === "boolean") ? forceData.enabled : true,
				strength: ("strength" in forceData && typeof forceData.strength === "number") ? forceData.strength : 0.5,
				priority: ("priority" in forceData && typeof forceData.priority === "number") ? forceData.priority : 0,
				config: forceData.config,
				...("id" in forceData && typeof forceData.id === "string" ? { id: forceData.id } : {})
			};
			addCustomForce(addData);
		}
	}
});

eventBridge.registerMessageHandler("CUSTOM_FORCE_REMOVE", (data) => {
	if (isCustomForcePayload(data) &&
		data.forceData &&
		"id" in data.forceData &&
		typeof data.forceData.id === "string") {
		removeCustomForce(data.forceData.id);
	}
});

eventBridge.registerMessageHandler("CUSTOM_FORCE_UPDATE", (data) => {
	if (isCustomForcePayload(data)) {
		const forceData = data.forceData;
		if (forceData &&
			"id" in forceData &&
			typeof forceData.id === "string") {
			try {
				// For update operations, extract id and pass remaining fields
				const { id, ...updates } = forceData;
				customForceManager?.updateForce(id, updates);
				eventBridge.emit(WorkerEventType.CUSTOM_FORCE_UPDATED, {
					workerId: "force-animation-worker",
					workerType: "force-animation" as const,
					forceId: id,
					timestamp: Date.now()
				}, "main");
			} catch (error) {
				eventBridge.emit(WorkerEventType.CUSTOM_FORCE_ERROR, {
					workerId: "force-animation-worker",
					workerType: "force-animation" as const,
					error: `Failed to update custom force: ${error instanceof Error ? error.message : "Unknown error"}`,
					forceId: typeof forceData.id === "string" ? forceData.id : String(forceData.id),
					timestamp: Date.now()
				}, "main");
			}
		}
	}
});

eventBridge.registerMessageHandler("DATA_FETCH_EXPAND_NODE", (data) => {
	if (isExpandNodePayload(data)) {
		const expandRequest = data.expandRequest; // Capture for use in catch
		void handleNodeExpansion(expandRequest).catch((error: unknown) => {
			// Note: logger is not available in worker context, emit error via EventBridge
			eventBridge.emit(WorkerEventType.DATA_FETCH_ERROR, {
				requestId: expandRequest.id,
				nodeId: expandRequest.nodeId,
				entityId: expandRequest.entityId,
				error: error instanceof Error ? error.message : "Unknown error",
				timestamp: Date.now()
			}, "main");
		});
	}
});

eventBridge.registerMessageHandler("DATA_FETCH_CANCEL_EXPANSION", (data) => {
	if (isCancelExpansionPayload(data)) {
		cancelExpansion(data.requestId);
	}
});

// Data fetching and expansion functions

/**
 * Expand relationships for an entity based on its type
 */
function expandEntityRelationships(
	params: {
		client: CachedOpenAlexClient;
		entityType: string;
		entityId: string;
		entityData: Record<string, unknown>;
		requestId: string;
		nodeId: string;
	}
): {
	nodes: Array<{ id: string; entityId: string; type: import("@/lib/graph/types").EntityType; label: string; data: unknown }>;
	edges: Array<{ id: string; source: string; target: string; type: string; label: string; data: unknown }>;
} {
	const { entityType, entityData } = params;
	const nodes: Array<{ id: string; entityId: string; type: import("@/lib/graph/types").EntityType; label: string; data: unknown }> = [];
	const edges: Array<{ id: string; source: string; target: string; type: string; label: string; data: unknown }> = [];

	try {
		// For now, only extract relationships from the existing entity data to avoid API complexity in worker
		// This is a safer approach that avoids the type safety issues with the OpenAlex client in worker context
		switch (entityType) {
			case "authors": {
				// Get author's institutions from affiliations
				if (entityData.affiliations && Array.isArray(entityData.affiliations)) {
					for (const affiliation of entityData.affiliations.slice(0, 5)) {
						if (typeof affiliation === "object" && affiliation !== null &&
							"institution" in affiliation && typeof affiliation.institution === "object" &&
							affiliation.institution !== null && "id" in affiliation.institution &&
							"display_name" in affiliation.institution) {
							const institution = affiliation.institution;
							const institutionId = typeof institution.id === "string" ?
								institution.id.replace("https://openalex.org/", "") : "";
							const institutionName = typeof institution.display_name === "string" ?
								institution.display_name : "Unknown Institution";

							if (institutionId) {
								nodes.push({
									id: institutionId,
									entityId: institutionId,
									type: "institutions",
									label: institutionName,
									data: institution
								});

								edges.push({
									id: `${params.entityId}-affiliated-${institutionId}`,
									source: params.nodeId,
									target: institutionId,
									type: RelationType.AFFILIATED,
									label: "affiliated with",
									data: affiliation
								});
							}
						}
					}
				}
				break;
			}

			case "works": {
				// For works, get authors from authorships
				if (entityData.authorships && Array.isArray(entityData.authorships)) {
					for (const authorship of entityData.authorships.slice(0, 5)) {
						if (typeof authorship === "object" && authorship !== null &&
							"author" in authorship && typeof authorship.author === "object" &&
							authorship.author !== null && "id" in authorship.author &&
							"display_name" in authorship.author) {
							const author = authorship.author;
							const authorId = typeof author.id === "string" ?
								author.id.replace("https://openalex.org/", "") : "";
							const authorName = typeof author.display_name === "string" ?
								author.display_name : "Unknown Author";

							if (authorId) {
								nodes.push({
									id: authorId,
									entityId: authorId,
									type: "authors",
									label: authorName,
									data: author
								});

								edges.push({
									id: `${authorId}-authored-${params.entityId}`,
									source: authorId,
									target: params.nodeId,
									type: RelationType.AUTHORED,
									label: "authored",
									data: authorship
								});
							}
						}
					}
				}

				// Get host venue/source
				if (entityData.primary_location && typeof entityData.primary_location === "object" &&
					entityData.primary_location !== null && "source" in entityData.primary_location &&
					typeof entityData.primary_location.source === "object" &&
					entityData.primary_location.source !== null && "id" in entityData.primary_location.source &&
					"display_name" in entityData.primary_location.source) {
					const source = entityData.primary_location.source;
					const sourceId = typeof source.id === "string" ?
						source.id.replace("https://openalex.org/", "") : "";
					const sourceName = typeof source.display_name === "string" ?
						source.display_name : "Unknown Source";

					if (sourceId) {
						nodes.push({
							id: sourceId,
							entityId: sourceId,
							type: "sources",
							label: sourceName,
							data: source
						});

						edges.push({
							id: `${params.entityId}-published_in-${sourceId}`,
							source: params.nodeId,
							target: sourceId,
							type: RelationType.PUBLISHED_IN,
							label: "published in",
							data: entityData.primary_location
						});
					}
				}
				break;
			}

			default:
				// For other entity types, no expansion for now
				break;
		}
	} catch (error) {
		// If expansion fails, emit error but continue with empty relationships
		eventBridge.emit(WorkerEventType.DATA_FETCH_ERROR, {
			requestId: params.requestId,
			nodeId: params.nodeId,
			entityId: params.entityId,
			error: error instanceof Error ? `Expansion error: ${error.message}` : "Unknown expansion error",
			timestamp: Date.now()
		}, "main");
	}

	return { nodes, edges };
}

async function handleNodeExpansion(request: ExpandNodeRequest) {
	const { id: requestId, nodeId, entityId, entityType } = request;
	// Note: options and expansionSettings are available in request but not yet fully implemented

	// Track the expansion
	activeExpansions.set(requestId, { nodeId, entityId, timestamp: Date.now() });

	// Send progress update
	eventBridge.emit(WorkerEventType.DATA_FETCH_PROGRESS, {
		requestId,
		nodeId,
		entityId,
		progress: 0.1,
		currentStep: "Initializing expansion",
		timestamp: Date.now()
	}, "main");

	try {
		const startTime = Date.now();
		const client = initializeOpenAlexClient();

		// Send progress update
		eventBridge.emit(WorkerEventType.DATA_FETCH_PROGRESS, {
			requestId,
			nodeId,
			entityId,
			progress: 0.3,
			currentStep: "Fetching entity data",
			timestamp: Date.now()
		}, "main");

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

		// After validation, we can safely use entityData
		// We've validated that entityData has required fields (id and display_name)
		// For the worker context, we'll work with raw data to avoid type assertion issues
		if (typeof entityData !== "object" || entityData === null) {
			throw new Error(`Invalid entity data for ${entityType}:${entityId}`);
		}

		// Send progress update
		eventBridge.emit(WorkerEventType.DATA_FETCH_PROGRESS, {
			requestId,
			nodeId,
			entityId,
			progress: 0.6,
			currentStep: "Expanding relationships",
			timestamp: Date.now()
		}, "main");

		// Get relationships based on entity type
		const relationships = expandEntityRelationships({
			client,
			entityType,
			entityId,
			entityData,
			requestId,
			nodeId
		});

		// Send progress update
		eventBridge.emit(WorkerEventType.DATA_FETCH_PROGRESS, {
			requestId,
			nodeId,
			entityId,
			progress: 0.9,
			currentStep: "Finalizing results",
			timestamp: Date.now()
		}, "main");

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

		eventBridge.emit(WorkerEventType.DATA_FETCH_COMPLETE, {
			requestId: response.requestId,
			nodeId,
			entityId,
			nodes: response.nodes,
			edges: response.edges,
			statistics: response.statistics ? {
				nodesAdded: response.statistics.nodesFetched,
				edgesAdded: response.statistics.edgesFetched,
				apiCalls: 1, // We made one API call
				duration: response.statistics.duration
			} : undefined,
			timestamp: Date.now()
		}, "main");

	} catch (error) {
		eventBridge.emit(WorkerEventType.DATA_FETCH_ERROR, {
			requestId,
			nodeId,
			entityId,
			error: error instanceof Error ? error.message : "Unknown expansion error",
			timestamp: Date.now()
		}, "main");
	} finally {
		// Clean up tracking
		activeExpansions.delete(requestId);
	}
}

function cancelExpansion(requestId: string) {
	if (activeExpansions.has(requestId)) {
		const expansion = activeExpansions.get(requestId);
		if (expansion) {
			activeExpansions.delete(requestId);
			eventBridge.emit(WorkerEventType.DATA_FETCH_CANCELLED, {
				requestId,
				nodeId: expansion.nodeId,
				entityId: expansion.entityId,
				timestamp: Date.now()
			}, "main");
		}
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
			eventBridge.emit(WorkerEventType.CUSTOM_FORCE_ERROR, {
				workerId: "force-animation-worker",
				workerType: "force-animation" as const,
				error: `Failed to sync custom force: ${error instanceof Error ? error.message : "Unknown error"}`,
				timestamp: Date.now()
			}, "main");
		}
	}

	eventBridge.emit(WorkerEventType.CUSTOM_FORCES_SYNCED, {
		workerId: "force-animation-worker",
		workerType: "force-animation" as const,
		count: customForces.length,
		timestamp: Date.now()
	}, "main");
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
		eventBridge.emit(WorkerEventType.CUSTOM_FORCE_ADDED, {
			workerId: "force-animation-worker",
			workerType: "force-animation" as const,
			forceId,
			timestamp: Date.now()
		}, "main");
	} catch (error) {
		eventBridge.emit(WorkerEventType.CUSTOM_FORCE_ERROR, {
			workerId: "force-animation-worker",
			workerType: "force-animation" as const,
			error: `Failed to add custom force: ${error instanceof Error ? error.message : "Unknown error"}`,
			timestamp: Date.now()
		}, "main");
	}
}

function removeCustomForce(forceId: string) {
	if (!customForceManager) {
		return;
	}

	try {
		customForceManager.removeForce(forceId);
		eventBridge.emit(WorkerEventType.CUSTOM_FORCE_REMOVED, {
			workerId: "force-animation-worker",
			workerType: "force-animation" as const,
			forceId,
			timestamp: Date.now()
		}, "main");
	} catch (error) {
		eventBridge.emit(WorkerEventType.CUSTOM_FORCE_ERROR, {
			workerId: "force-animation-worker",
			workerType: "force-animation" as const,
			error: `Failed to remove custom force: ${error instanceof Error ? error.message : "Unknown error"}`,
			forceId,
			timestamp: Date.now()
		}, "main");
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

// Emit WORKER_READY event to notify main thread that worker is initialized
try {
	logger.debug("worker", "About to emit WORKER_READY event");
	eventBridge.emit(WorkerEventType.WORKER_READY, {
		workerId: "force-animation-worker",
		workerType: "force-animation" as const,
		timestamp: Date.now()
	}, "main"); // Target main context specifically like other worker events
	logger.debug("worker", "WORKER_READY event emitted successfully");
} catch (error) {
	logger.error("worker", "Failed to emit WORKER_READY event", { error });
}


