/**
 * Data Fetching Web Worker
 * Handles OpenAlex API calls in background to prevent UI blocking during graph expansion
 */

import { rateLimitedOpenAlex } from "@/lib/openalex/rate-limited-client";
import { EntityFactory, type ExpansionOptions } from "@/lib/entities";
import type { EntityType, GraphNode, GraphEdge } from "@/lib/graph/types";

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
  expansionSettings?: unknown;
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

// Initialize worker
async function initializeWorker() {
	try {
		// Pre-warm the rate-limited client
		// Note: getCachedStats method doesn't exist, using getStats instead
		rateLimitedOpenAlex.getStats();
		isReady = true;

		postMessage({
			type: "ready"
		} as DataFetchingResponse);
	} catch (error) {
		postMessage({
			type: "ready",
			error: error instanceof Error ? error.message : "Failed to initialize worker"
		} as DataFetchingResponse);
	}
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
		const entity = EntityFactory.create(entityType, rateLimitedOpenAlex);

		// Prepare context with abort signal
		const context = {
			entityId,
			entityType,
			client: rateLimitedOpenAlex,
			signal: abortController.signal
		};

		// Enhanced options with expansion settings
		const enhancedOptions = {
			...options,
			expansionSettings,
			onProgress: (progress: { completed: number; total: number; stage: string }) => {
				postMessage({
					type: "progress",
					id,
					payload: {
						nodeId,
						...progress
					}
				} as DataFetchingResponse);
			}
		};

		// Perform expansion
		const relatedData = await entity.expand(context, enhancedOptions);
		// Note: ExpansionResult doesn't have statistics property, using default
		apiCalls = 0; // Track API calls separately if needed

		// Clean up request tracking
		currentRequests.delete(id);

		// Send results back to main thread
		const response: ExpandCompletePayload = {
			nodeId,
			nodes: relatedData.nodes,
			edges: relatedData.edges,
			statistics: {
				nodesAdded: relatedData.nodes.length,
				edgesAdded: relatedData.edges.length,
				apiCalls,
				duration: Date.now() - startTime
			}
		};

		postMessage({
			type: "expandComplete",
			id,
			payload: response
		} as DataFetchingResponse);

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

		postMessage({
			type: "expandError",
			id,
			error: errorMessage,
			payload: {
				nodeId: payload.nodeId,
				duration: Date.now() - startTime,
				apiCalls
			}
		} as DataFetchingResponse);
	}
}

// Handle batch expansion (future feature)
function handleBatchExpand(id: string) {
	// Placeholder for batch expansion functionality
	postMessage({
		type: "expandError",
		id,
		error: "Batch expansion not yet implemented"
	} as DataFetchingResponse);
}

// Handle search requests (future feature)
function handleSearch(id: string) {
	// Placeholder for search functionality
	postMessage({
		type: "expandError",
		id,
		error: "Worker-based search not yet implemented"
	} as DataFetchingResponse);
}

// Cancel request
function cancelRequest(id: string) {
	const controller = currentRequests.get(id);
	if (controller) {
		controller.abort();
		currentRequests.delete(id);
	}
}

// Message handler
self.onmessage = async (event: MessageEvent<DataFetchingMessage>) => {
	const { type, id, payload } = event.data;

	if (!isReady && type !== "cancel") {
		postMessage({
			type: "expandError",
			id,
			error: "Worker not ready"
		} as DataFetchingResponse);
		return;
	}

	try {
		switch (type) {
			case "expandNode":
				await handleExpandNode(id, payload as ExpandNodePayload);
				break;

			case "batchExpand":
				handleBatchExpand(id);
				break;

			case "search":
				handleSearch(id);
				break;

			case "cancel":
				cancelRequest(id);
				break;

			default:
				postMessage({
					type: "expandError",
					id,
					error: `Unknown message type: ${type}`
				} as DataFetchingResponse);
		}
	} catch (error) {
		postMessage({
			type: "expandError",
			id,
			error: error instanceof Error ? error.message : "Worker processing error"
		} as DataFetchingResponse);
	}
};

// Handle worker errors
self.onerror = (error) => {
	const errorMessage = typeof error === "string" ? error :
		(error instanceof ErrorEvent ? error.message : "Unknown worker error");
	postMessage({
		type: "expandError",
		error: `Worker error: ${errorMessage}`
	} as DataFetchingResponse);
};

// Initialize the worker
initializeWorker();