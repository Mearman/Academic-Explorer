/**
 * React hook for data fetching Web Worker
 * Provides non-blocking API calls for graph expansion operations
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@/lib/logger";
import { useDataFetchingProgressStore } from "@/stores/data-fetching-progress-store";
import { eventBridge } from "@/lib/graph/events";
import { WorkerEventType, type WorkerEventPayloads, WorkerEventPayloadSchemas, parseWorkerEventPayload, isWorkerEventType } from "@/lib/graph/events/types";
import type { EntityType } from "@/lib/graph/types";
import type { ExpansionOptions } from "@/lib/entities";
import type { ExpansionSettings } from "@/lib/graph/types/expansion-settings";
import type {
	DataFetchingMessage,
	DataFetchingResponse,
	ExpandNodePayload,
	ExpandCompletePayload
} from "@/workers/data-fetching.worker";

// Type guards for worker message payloads
function isExpandCompletePayload(payload: unknown): payload is ExpandCompletePayload {
	if (typeof payload !== "object" || payload === null) return false;

	// Check if the payload has the required properties
	if (!("nodeId" in payload && "nodes" in payload && "edges" in payload)) {
		return false;
	}

	// Use array indexing to access properties without type assertions
	const hasValidNodeId = typeof payload["nodeId"] === "string";
	const hasValidNodes = Array.isArray(payload["nodes"]);
	const hasValidEdges = Array.isArray(payload["edges"]);

	return hasValidNodeId && hasValidNodes && hasValidEdges;
}

function isProgressPayload(payload: unknown): payload is { completed: number; total: number; stage: string } {
	if (typeof payload !== "object" || payload === null) return false;

	// Check if the payload has the required properties
	if (!("completed" in payload && "total" in payload && "stage" in payload)) {
		return false;
	}

	// Use array indexing to access properties without type assertions
	const hasValidCompleted = typeof payload["completed"] === "number";
	const hasValidTotal = typeof payload["total"] === "number";
	const hasValidStage = typeof payload["stage"] === "string";

	return hasValidCompleted && hasValidTotal && hasValidStage;
}

// Hook options
interface UseDataFetchingWorkerOptions {
  onExpandComplete?: (result: ExpandCompletePayload) => void;
  onExpandError?: (nodeId: string, error: string) => void;
  onProgress?: (nodeId: string, progress: { completed: number; total: number; stage: string }) => void;
}

// Hook return type
interface UseDataFetchingWorkerReturn {
  // State
  isWorkerReady: boolean;
  activeRequests: Set<string>;

  // Actions
  expandNode: (
    nodeId: string,
    entityId: string,
    entityType: EntityType,
    options?: ExpansionOptions,
    expansionSettings?: ExpansionSettings
  ) => Promise<void>;

  cancelExpansion: (nodeId: string) => void;
  cancelAllExpansions: () => void;

  // Stats
  getStats: () => {
    totalRequests: number;
    completedRequests: number;
    failedRequests: number;
    averageDuration: number;
  };
}

export function useDataFetchingWorker(options: UseDataFetchingWorkerOptions = {}): UseDataFetchingWorkerReturn {
	const { onExpandComplete, onExpandError, onProgress } = options;

	// Worker instance ref
	const workerRef = useRef<Worker | null>(null);
	const [isWorkerReady, setIsWorkerReady] = useState(false);

	// Progress store for UI updates - extract stable methods only
	const addRequest = useDataFetchingProgressStore((state) => state.addRequest);
	const updateProgress = useDataFetchingProgressStore((state) => state.updateProgress);
	const completeRequest = useDataFetchingProgressStore((state) => state.completeRequest);
	const failRequest = useDataFetchingProgressStore((state) => state.failRequest);
	const removeRequest = useDataFetchingProgressStore((state) => state.removeRequest);
	const setWorkerReady = useDataFetchingProgressStore((state) => state.setWorkerReady);
	const clearAll = useDataFetchingProgressStore((state) => state.clearAll);

	// Request tracking
	const [activeRequests, setActiveRequests] = useState<Set<string>>(new Set());
	const pendingRequestsRef = useRef<Map<string, {
    nodeId: string;
    resolve: () => void;
    reject: (error: Error) => void;
    timestamp: number;
    	}>>(new Map());

	// Statistics
	const statsRef = useRef({
		totalRequests: 0,
		completedRequests: 0,
		failedRequests: 0,
		totalDuration: 0,
	});

	// Handle EventBridge worker ready events
	const handleWorkerReady = useCallback((payload: WorkerEventPayloads[WorkerEventType.WORKER_READY]) => {
		if (payload.workerId === "data-fetching-worker") {
			logger.debug("graph", "Data fetching worker ready via EventBridge");
			setIsWorkerReady(true);
			setWorkerReady(true);
		}
	}, [setWorkerReady]);

	// Handle EventBridge worker error events
	const handleWorkerErrorEvent = useCallback((payload: WorkerEventPayloads[WorkerEventType.WORKER_ERROR]) => {
		if (payload.workerId === "data-fetching-worker") {
			logger.error("graph", "Data fetching worker error via EventBridge", { error: payload.error });
			setIsWorkerReady(false);
			setWorkerReady(false);
		}
	}, [setWorkerReady]);

	// Handle EventBridge data fetch progress events
	const handleDataFetchProgress = useCallback((payload: WorkerEventPayloads[WorkerEventType.DATA_FETCH_PROGRESS]) => {
		const request = pendingRequestsRef.current.get(payload.requestId);
		if (request) {
			updateProgress(request.nodeId, {
				completed: Math.round(payload.progress * 100),
				total: 100,
				stage: payload.currentStep
			});
		}
	}, [updateProgress]);

	// Handle EventBridge data fetch complete events
	const handleDataFetchComplete = useCallback((payload: WorkerEventPayloads[WorkerEventType.DATA_FETCH_COMPLETE]) => {
		const request = pendingRequestsRef.current.get(payload.requestId);
		if (request) {
			// Update statistics
			statsRef.current.completedRequests++;
			statsRef.current.totalDuration += (Date.now() - request.timestamp);

			// Clean up tracking
			pendingRequestsRef.current.delete(payload.requestId);
			setActiveRequests(prev => {
				const newSet = new Set(prev);
				newSet.delete(request.nodeId);
				return newSet;
			});

			// Update progress store
			completeRequest(request.nodeId);

			// Create ExpandCompletePayload for backward compatibility
			const completePayload: ExpandCompletePayload = {
				nodeId: payload.nodeId,
				nodes: payload.nodes,
				edges: payload.edges,
				statistics: payload.statistics
			};

			// Call completion callback
			onExpandComplete?.(completePayload);
			request.resolve();

			logger.debug("graph", "Node expansion completed via EventBridge", {
				nodeId: request.nodeId,
				nodesAdded: payload.nodes.length || 0,
				edgesAdded: payload.edges.length || 0,
				duration: payload.statistics?.duration || 0
			});
		}
	}, [completeRequest, onExpandComplete]);

	// Handle EventBridge data fetch error events
	const handleDataFetchError = useCallback((payload: WorkerEventPayloads[WorkerEventType.DATA_FETCH_ERROR]) => {
		const request = pendingRequestsRef.current.get(payload.requestId);
		if (request) {
			// Update statistics
			statsRef.current.failedRequests++;
			statsRef.current.totalDuration += (Date.now() - request.timestamp);

			// Clean up tracking
			pendingRequestsRef.current.delete(payload.requestId);
			setActiveRequests(prev => {
				const newSet = new Set(prev);
				newSet.delete(request.nodeId);
				return newSet;
			});

			// Update progress store
			failRequest(request.nodeId, payload.error);

			// Handle error
			onExpandError?.(request.nodeId, payload.error);
			request.reject(new Error(payload.error));

			logger.error("graph", "Node expansion failed via EventBridge", {
				nodeId: request.nodeId,
				error: payload.error
			});
		}
	}, [failRequest, onExpandError]);

	// Legacy message handler for old-style communication (can be removed after full migration)
	const handleWorkerMessage = useCallback((event: MessageEvent<DataFetchingResponse>) => {
		const { type, id, payload, error } = event.data;

		switch (type) {
			case "ready":
				if (error) {
					logger.error("graph", "Data fetching worker failed to initialize", { error });
					setIsWorkerReady(false);
					setWorkerReady(false);
				} else {
					logger.debug("graph", "Data fetching worker ready");
					setIsWorkerReady(true);
					setWorkerReady(true);
				}
				break;

			case "expandComplete":
				if (id && payload && isExpandCompletePayload(payload)) {
					const request = pendingRequestsRef.current.get(id);
					if (request) {
						// Update statistics
						statsRef.current.completedRequests++;
						statsRef.current.totalDuration += (Date.now() - request.timestamp);

						// Clean up tracking
						pendingRequestsRef.current.delete(id);
						setActiveRequests(prev => {
							const newSet = new Set(prev);
							newSet.delete(request.nodeId);
							return newSet;
						});

						// Update progress store
						completeRequest(request.nodeId);

						// Call completion callback
						onExpandComplete?.(payload);
						request.resolve();

						logger.debug("graph", "Node expansion completed via worker", {
							nodeId: request.nodeId,
							nodesAdded: payload.nodes.length || 0,
							edgesAdded: payload.edges.length || 0,
							duration: payload.statistics?.duration || 0
						});
					}
				}
				break;

			case "expandError":
				if (id) {
					const request = pendingRequestsRef.current.get(id);
					if (request) {
						// Update statistics
						statsRef.current.failedRequests++;
						statsRef.current.totalDuration += (Date.now() - request.timestamp);

						// Clean up tracking
						pendingRequestsRef.current.delete(id);
						setActiveRequests(prev => {
							const newSet = new Set(prev);
							newSet.delete(request.nodeId);
							return newSet;
						});

						// Update progress store with error
						const errorMessage = error || "Unknown expansion error";
						failRequest(request.nodeId, errorMessage);

						// Call error callback
						onExpandError?.(request.nodeId, errorMessage);
						request.reject(new Error(errorMessage));

						logger.error("graph", "Node expansion failed via worker", {
							nodeId: request.nodeId,
							error: errorMessage
						});
					}
				}
				break;

			case "progress":
				if (id && payload && isProgressPayload(payload)) {
					const request = pendingRequestsRef.current.get(id);
					if (request) {
						// Update progress store
						updateProgress(request.nodeId, payload);

						// Call progress callback
						onProgress?.(request.nodeId, payload);
					}
				}
				break;

			default:
				logger.warn("graph", "Unknown worker message type", { type });
		}
	}, [onExpandComplete, onExpandError, onProgress, completeRequest, failRequest, updateProgress, setWorkerReady]);

	// Handle worker errors
	const handleWorkerError = useCallback((error: ErrorEvent) => {
		logger.error("graph", "Data fetching worker error", {
			error: error.message,
			filename: error.filename,
			lineno: error.lineno
		});

		// Reject all pending requests
		pendingRequestsRef.current.forEach((request) => {
			request.reject(new Error(`Worker error: ${error.message}`));
			onExpandError?.(request.nodeId, `Worker error: ${error.message}`);
		});

		// Clear pending requests
		pendingRequestsRef.current.clear();
		setActiveRequests(new Set());

		// Update progress store
		clearAll();
		setWorkerReady(false);
		setIsWorkerReady(false);
	}, [onExpandError, clearAll, setWorkerReady]);

	// Initialize worker (only once)
	useEffect(() => {
		// Don't re-initialize if worker already exists
		if (workerRef.current) {
			return;
		}

		const currentPendingRequests = pendingRequestsRef.current;

		logger.debug("graph", "Initializing data fetching worker");

		try {
			workerRef.current = new Worker(
				new URL("../workers/data-fetching.worker.ts", import.meta.url),
				{ type: "module" }
			);

			// Keep legacy message listeners temporarily for debugging
			workerRef.current.addEventListener("message", handleWorkerMessage);
			workerRef.current.addEventListener("error", handleWorkerError);

			// Register worker with event bridge for cross-context communication
			eventBridge.registerWorker(workerRef.current, "data-fetching-worker");

		} catch (error) {
			logger.error("graph", "Failed to initialize data fetching worker", { error });
			onExpandError?.("worker-init", "Failed to initialize data fetching worker");
		}

		return () => {
			if (workerRef.current) {
				// Cancel all pending requests
				currentPendingRequests.forEach((request) => {
					request.reject(new Error("Worker terminated"));
				});

				workerRef.current.terminate();
				workerRef.current = null;
				setIsWorkerReady(false);

				// Clear progress store
				clearAll();
				setWorkerReady(false);
			}
		};
	}, [clearAll, handleWorkerMessage, onExpandError, setWorkerReady, handleWorkerError]); // Initialize only once, but include stable dependencies

	// Register EventBridge listeners for cross-context communication
	useEffect(() => {
		// Register handlers for worker events
		eventBridge.registerMessageHandler("data-fetching-worker-ready", (message) => {
			if (isWorkerEventType(message.eventType) && message.eventType === WorkerEventType.WORKER_READY && message.payload) {
				const payload = parseWorkerEventPayload(message.payload, WorkerEventType.WORKER_READY, WorkerEventPayloadSchemas[WorkerEventType.WORKER_READY]);
				if (payload) {
					handleWorkerReady(payload);
				}
			}
		});

		eventBridge.registerMessageHandler("data-fetching-worker-error", (message) => {
			if (isWorkerEventType(message.eventType) && message.eventType === WorkerEventType.WORKER_ERROR && message.payload) {
				const payload = parseWorkerEventPayload(message.payload, WorkerEventType.WORKER_ERROR, WorkerEventPayloadSchemas[WorkerEventType.WORKER_ERROR]);
				if (payload) {
					handleWorkerErrorEvent(payload);
				}
			}
		});

		eventBridge.registerMessageHandler("data-fetching-progress", (message) => {
			if (isWorkerEventType(message.eventType) && message.eventType === WorkerEventType.DATA_FETCH_PROGRESS && message.payload) {
				const payload = parseWorkerEventPayload(message.payload, WorkerEventType.DATA_FETCH_PROGRESS, WorkerEventPayloadSchemas[WorkerEventType.DATA_FETCH_PROGRESS]);
				if (payload) {
					handleDataFetchProgress(payload);
				}
			}
		});

		eventBridge.registerMessageHandler("data-fetching-complete", (message) => {
			if (isWorkerEventType(message.eventType) && message.eventType === WorkerEventType.DATA_FETCH_COMPLETE && message.payload) {
				const payload = parseWorkerEventPayload(message.payload, WorkerEventType.DATA_FETCH_COMPLETE, WorkerEventPayloadSchemas[WorkerEventType.DATA_FETCH_COMPLETE]);
				if (payload) {
					handleDataFetchComplete(payload);
				}
			}
		});

		eventBridge.registerMessageHandler("data-fetching-error", (message) => {
			if (isWorkerEventType(message.eventType) && message.eventType === WorkerEventType.DATA_FETCH_ERROR && message.payload) {
				const payload = parseWorkerEventPayload(message.payload, WorkerEventType.DATA_FETCH_ERROR, WorkerEventPayloadSchemas[WorkerEventType.DATA_FETCH_ERROR]);
				if (payload) {
					handleDataFetchError(payload);
				}
			}
		});

		logger.debug("graph", "Registered EventBridge listeners for data fetching worker");

		return () => {
			// Clean up event listeners
			eventBridge.unregisterMessageHandler("data-fetching-worker-ready");
			eventBridge.unregisterMessageHandler("data-fetching-worker-error");
			eventBridge.unregisterMessageHandler("data-fetching-progress");
			eventBridge.unregisterMessageHandler("data-fetching-complete");
			eventBridge.unregisterMessageHandler("data-fetching-error");

			logger.debug("graph", "Unregistered EventBridge listeners for data fetching worker");
		};
	}, [handleWorkerReady, handleWorkerErrorEvent, handleDataFetchProgress, handleDataFetchComplete, handleDataFetchError]);


	// Expand node via worker
	const expandNode = useCallback(async (
		nodeId: string,
		entityId: string,
		entityType: EntityType,
		options: ExpansionOptions = {},
		expansionSettings?: ExpansionSettings
	): Promise<void> => {
		if (!workerRef.current || !isWorkerReady) {
			throw new Error("Data fetching worker not ready");
		}

		if (activeRequests.has(nodeId)) {
			logger.warn("graph", "Node expansion already in progress", { nodeId });
			return;
		}

		// Generate unique request ID
		const requestId = `${nodeId}-${Date.now().toString()}-${Math.random().toString(36).substring(2, 11)}`;

		// Create promise for tracking completion
		return new Promise<void>((resolve, reject) => {
			// Track the request
			pendingRequestsRef.current.set(requestId, {
				nodeId,
				resolve,
				reject,
				timestamp: Date.now()
			});

			setActiveRequests(prev => new Set(prev).add(nodeId));
			statsRef.current.totalRequests++;

			// Add to progress store
			addRequest(nodeId, undefined, entityType);

			// Prepare payload
			const payload: ExpandNodePayload = {
				nodeId,
				entityId,
				entityType,
				options,
				expansionSettings
			};

			// Send message to worker
			const message: DataFetchingMessage = {
				type: "expandNode",
				id: requestId,
				payload
			};

			workerRef.current?.postMessage(message);

			logger.debug("graph", "Started node expansion via worker", {
				nodeId,
				entityId,
				entityType,
				requestId
			});
		});
	}, [isWorkerReady, activeRequests, addRequest]);

	// Cancel specific expansion
	const cancelExpansion = useCallback((nodeId: string) => {
		// Find request by nodeId
		const requestToCancel = Array.from(pendingRequestsRef.current.entries())
			.find(([, request]) => request.nodeId === nodeId);

		if (requestToCancel && workerRef.current) {
			const [requestId, request] = requestToCancel;

			// Send cancel message to worker
			const cancelMessage: DataFetchingMessage = {
				type: "cancel",
				id: requestId
			};
			workerRef.current.postMessage(cancelMessage);

			// Clean up tracking
			pendingRequestsRef.current.delete(requestId);
			setActiveRequests(prev => {
				const newSet = new Set(prev);
				newSet.delete(nodeId);
				return newSet;
			});

			// Remove from progress store
			removeRequest(nodeId);

			// Reject the promise
			request.reject(new Error("Expansion cancelled by user"));

			logger.debug("graph", "Cancelled node expansion", { nodeId, requestId });
		}
	}, [removeRequest]);

	// Cancel all expansions
	const cancelAllExpansions = useCallback(() => {
		pendingRequestsRef.current.forEach((request, requestId) => {
			if (workerRef.current) {
				const cancelMessage: DataFetchingMessage = {
					type: "cancel",
					id: requestId
				};
				workerRef.current.postMessage(cancelMessage);
			}

			request.reject(new Error("All expansions cancelled"));
		});

		pendingRequestsRef.current.clear();
		setActiveRequests(new Set());

		// Clear progress store
		clearAll();

		logger.debug("graph", "Cancelled all node expansions");
	}, [clearAll]);

	// Get statistics
	const getStats = useCallback(() => {
		const stats = statsRef.current;
		return {
			totalRequests: stats.totalRequests,
			completedRequests: stats.completedRequests,
			failedRequests: stats.failedRequests,
			averageDuration: stats.completedRequests
				? stats.totalDuration / stats.completedRequests
				: 0
		};
	}, []);

	return {
		isWorkerReady,
		activeRequests,
		expandNode,
		cancelExpansion,
		cancelAllExpansions,
		getStats,
	};
}