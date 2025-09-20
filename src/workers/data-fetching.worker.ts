/**
 * Data Fetching Web Worker
 * Handles OpenAlex API calls in background to prevent UI blocking during graph expansion
 */

import { createUnifiedOpenAlexClient } from "@/lib/openalex/cached-client";
import type { WorkerRequest, WorkerResponse } from "@/lib/openalex/cached-client";
import { EntityFactory, type ExpansionOptions } from "@/lib/entities";
import type { EntityType, GraphNode, GraphEdge } from "@/lib/graph/types";
import type { ExpansionSettings } from "@/lib/graph/types/expansion-settings";
import { eventBridge } from "@/lib/graph/events/event-bridge";
import { WorkerEventType } from "@/lib/graph/events/types";

// Message types for communication with main thread
export interface DataFetchingMessage {
  type: "expandNode" | "batchExpand" | "search" | "cancel";
  id: string; // Request ID for tracking
  payload?: unknown; // Optional for cancel messages
}

export interface ExpandNodePayload {
  nodeId: string;
  entityId: string;
  entityType: EntityType;
  options: ExpansionOptions;
  expansionSettings?: ExpansionSettings;
}

export interface DataFetchingResponse {
  type: "expandComplete" | "expandError" | "progress" | "ready";
  id?: string; // Request ID
  payload?: unknown;
  error?: string;
}

export interface ExpandCompletePayload {
  nodeId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  statistics?: {
    nodesAdded: number;
    edgesAdded: number;
    apiCalls: number;
    duration: number;
  };
}

// Worker state
let isReady = false;
const currentRequests = new Map<string, AbortController>();
const pendingApiRequests = new Map<string, AbortController>();

// Create unified client instance for worker (disable worker coordination to avoid recursion)
const unifiedClient = createUnifiedOpenAlexClient({
  cacheEnabled: true,
  rateLimitEnabled: true,
  workerEnabled: false, // Disable worker coordination in worker itself
  maxConcurrentRequests: 3
});

// Initialize worker
function initializeWorker() {
	try {
		// Pre-warm the unified client
		unifiedClient.getEnhancedMetrics();
		isReady = true;

		// Emit worker ready event via EventBridge
		eventBridge.emit(WorkerEventType.WORKER_READY, {
			workerId: "data-fetching-worker",
			workerType: "data-fetching" as const,
			timestamp: Date.now()
		}, "main");
	} catch (error) {
		// Emit worker error event via EventBridge
		eventBridge.emit(WorkerEventType.WORKER_ERROR, {
			workerId: "data-fetching-worker",
			workerType: "data-fetching" as const,
			error: error instanceof Error ? error.message : "Failed to initialize worker",
			timestamp: Date.now()
		}, "main");
	}
}

// Type guard for ExpandNodePayload
function isExpandNodePayload(payload: unknown): payload is ExpandNodePayload {
	if (typeof payload !== "object" || payload === null) {
		return false;
	}

	// Use type narrowing instead of type assertion
	if (!isRecord(payload)) {
		return false;
	}

	return (
		"nodeId" in payload && typeof payload.nodeId === "string" &&
		"entityId" in payload && typeof payload.entityId === "string" &&
		"entityType" in payload && typeof payload.entityType === "string" &&
		"options" in payload && typeof payload.options === "object" && payload.options !== null
	);
}

// Helper type guard for Record
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Handle expand node request
async function handleExpandNode(id: string, payload: ExpandNodePayload) {
	const startTime = Date.now();
	let apiCalls = 0;

	try {
		const { nodeId, entityId, entityType, options, expansionSettings } = payload;

		// Create abort controller for this request
		const abortController = new AbortController();
		currentRequests.set(id, abortController);

		// Validate entity type
		if (!EntityFactory.isSupported(entityType)) {
			throw new Error(`Entity type ${entityType} not supported for expansion`);
		}

		// Create entity instance
		const entity = EntityFactory.create(entityType, unifiedClient);

		// Prepare context with abort signal
		const context = {
			entityId,
			entityType,
			client: unifiedClient,
			signal: abortController.signal
		};

		// Enhanced options with expansion settings
		const enhancedOptions = {
			...options,
			expansionSettings,
			onProgress: (progress: { completed: number; total: number; stage: string }) => {
				// Emit progress event via EventBridge
				eventBridge.emit(WorkerEventType.DATA_FETCH_PROGRESS, {
					requestId: id,
					nodeId,
					entityId: payload.entityId,
					progress: progress.completed / progress.total,
					currentStep: progress.stage,
					timestamp: Date.now()
				}, "main");
			}
		};

		// Perform expansion
		const relatedData = await entity.expand(context, enhancedOptions);
		// Note: ExpansionResult doesn't have statistics property, using default
		apiCalls = 0; // Track API calls separately if needed

		// Clean up request tracking
		currentRequests.delete(id);

		// Emit completion event via EventBridge
		eventBridge.emit(WorkerEventType.DATA_FETCH_COMPLETE, {
			requestId: id,
			nodeId,
			entityId: payload.entityId,
			nodes: relatedData.nodes,
			edges: relatedData.edges,
			statistics: {
				nodesAdded: relatedData.nodes.length,
				edgesAdded: relatedData.edges.length,
				apiCalls,
				duration: Date.now() - startTime
			},
			timestamp: Date.now()
		}, "main");

	} catch (error) {
		// Clean up request tracking
		currentRequests.delete(id);

		// Handle different error types
		let errorMessage = "Unknown error occurred during expansion";

		if (error instanceof Error) {
			errorMessage = error.message;
		}

		if (error && typeof error === "object" && "name" in error && error.name === "AbortError") {
			errorMessage = "Expansion was cancelled";
		}

		// Emit error event via EventBridge
		eventBridge.emit(WorkerEventType.DATA_FETCH_ERROR, {
			requestId: id,
			nodeId: payload.nodeId,
			entityId: payload.entityId,
			error: errorMessage,
			timestamp: Date.now()
		}, "main");
	}
}

// Handle batch expansion (future feature)
function handleBatchExpand(id: string) {
	// Emit error event via EventBridge for unimplemented feature
	eventBridge.emit(WorkerEventType.WORKER_ERROR, {
		workerId: "data-fetching-worker",
		workerType: "data-fetching" as const,
		error: `Batch expansion not yet implemented (request: ${id})`,
		timestamp: Date.now()
	}, "main");
}

// Handle search requests (future feature)
function handleSearch(id: string) {
	// Emit error event via EventBridge for unimplemented feature
	eventBridge.emit(WorkerEventType.WORKER_ERROR, {
		workerId: "data-fetching-worker",
		workerType: "data-fetching" as const,
		error: `Worker-based search not yet implemented (request: ${id})`,
		timestamp: Date.now()
	}, "main");
}

// Cancel request
function cancelRequest(id: string) {
	// Try canceling graph expansion request
	const expandController = currentRequests.get(id);
	if (expandController) {
		expandController.abort();
		currentRequests.delete(id);
		return;
	}

	// Try canceling API request
	const apiController = pendingApiRequests.get(id);
	if (apiController) {
		apiController.abort();
		pendingApiRequests.delete(id);
	}
}

// Type guard to check if message is a WorkerRequest
function isWorkerRequest(data: unknown): data is WorkerRequest {
	return typeof data === "object" &&
	       data !== null &&
	       "type" in data &&
	       ["api-call", "batch-call", "background-fetch"].includes(data.type);
}

// Handle WorkerRequest API calls
async function handleWorkerRequest(request: WorkerRequest): Promise<void> {
	const startTime = Date.now();
	let response: WorkerResponse;

	try {
		const { payload } = request;
		const { endpoint, params, entityType } = payload;

		// Create abort controller for this request
		const abortController = new AbortController();
		pendingApiRequests.set(request.id, abortController);

		let result: unknown;
		switch (request.type) {
			case "api-call":
				if (endpoint && entityType) {
					// Use the unified client for the API call
					result = await unifiedClient.getResponse(endpoint, params);
				} else {
					throw new Error("Missing endpoint or entityType for API call");
				}
				break;

			case "batch-call":
				if (endpoint) {
					result = await unifiedClient.getResponse(endpoint, params);
				} else {
					throw new Error("Missing endpoint for batch call");
				}
				break;

			case "background-fetch":
				if (endpoint) {
					result = await unifiedClient.getResponse(endpoint, params);
				} else {
					throw new Error("Missing endpoint for background fetch");
				}
				break;

			default:
				throw new Error(`Unknown request type: ${String(request.type)}`);
		}

		const duration = Date.now() - startTime;
		response = {
			id: request.id,
			success: true,
			data: result,
			statistics: {
				duration,
				retries: 0, // Will be tracked by the unified client
				bandwidth: 0 // Will be calculated by the unified client
			}
		};

		pendingApiRequests.delete(request.id);
		self.postMessage(response);

	} catch (error) {
		const duration = Date.now() - startTime;
		response = {
			id: request.id,
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
			statistics: {
				duration,
				retries: 0,
				bandwidth: 0
			}
		};

		pendingApiRequests.delete(request.id);
		self.postMessage(response);
	}
}

// Message handler for both DataFetchingMessage and WorkerRequest
self.onmessage = async (event: MessageEvent<DataFetchingMessage | WorkerRequest>) => {
	const data = event.data;

	// Handle WorkerRequest (for unified client API calls)
	if (isWorkerRequest(data)) {
		await handleWorkerRequest(data);
		return;
	}

	// Handle legacy DataFetchingMessage (for graph expansion)
	const { type, id, payload } = data as DataFetchingMessage;

	if (!isReady && type !== "cancel") {
		// Emit error event via EventBridge for worker not ready
		eventBridge.emit(WorkerEventType.WORKER_ERROR, {
			workerId: "data-fetching-worker",
			workerType: "data-fetching" as const,
			error: `Worker not ready (request: ${id})`,
			timestamp: Date.now()
		}, "main");
		return;
	}

	try {
		switch (type) {
			case "expandNode": {
				if (!isExpandNodePayload(payload)) {
					// Emit error event via EventBridge for invalid payload
					eventBridge.emit(WorkerEventType.WORKER_ERROR, {
						workerId: "data-fetching-worker",
						workerType: "data-fetching" as const,
						error: `Invalid payload for expandNode operation (request: ${id})`,
						timestamp: Date.now()
					}, "main");
					return;
				}
				await handleExpandNode(id, payload);
				break;
			}

			case "batchExpand":
				handleBatchExpand(id);
				break;

			case "search":
				handleSearch(id);
				break;

			case "cancel":
				cancelRequest(id);
				break;

			default: {
				// Emit error event via EventBridge for unknown message type
				eventBridge.emit(WorkerEventType.WORKER_ERROR, {
					workerId: "data-fetching-worker",
					workerType: "data-fetching" as const,
					error: `Unknown message type: ${String(type)} (request: ${id})`,
					timestamp: Date.now()
				}, "main");
				break;
			}
		}
	} catch (error) {
		// Emit error event via EventBridge for processing error
		eventBridge.emit(WorkerEventType.WORKER_ERROR, {
			workerId: "data-fetching-worker",
			workerType: "data-fetching" as const,
			error: error instanceof Error ? error.message : "Worker processing error",
			timestamp: Date.now()
		}, "main");
	}
};

// Handle worker errors
self.onerror = (error) => {
	const errorMessage = typeof error === "string" ? error :
		(error instanceof ErrorEvent ? error.message : "Unknown worker error");

	// Emit error event via EventBridge for worker error
	eventBridge.emit(WorkerEventType.WORKER_ERROR, {
		workerId: "data-fetching-worker",
		workerType: "data-fetching" as const,
		error: `Worker error: ${errorMessage}`,
		timestamp: Date.now()
	}, "main");
};

// Initialize the worker
initializeWorker();