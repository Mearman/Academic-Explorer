/**
 * React hook for data fetching Web Worker
 * Provides non-blocking API calls for graph expansion operations
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@/lib/logger";
import { useDataFetchingProgressStore } from "@/stores/data-fetching-progress-store";
import type { EntityType } from "@/lib/graph/types";
import type { ExpansionOptions } from "@/lib/entities";
import type {
	DataFetchingMessage,
	DataFetchingResponse,
	ExpandNodePayload,
	ExpandCompletePayload
} from "@/workers/data-fetching.worker";

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
    expansionSettings?: any
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

	// Progress store for UI updates
	const progressStore = useDataFetchingProgressStore();

	// Request tracking
	const [activeRequests, setActiveRequests] = useState<Set<string>>(new Set());
	const pendingRequestsRef = useRef<Map<string, {
    nodeId: string;
    resolve: (value: void) => void;
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

	// Initialize worker
	useEffect(() => {
		logger.info("graph", "Initializing data fetching worker");

		try {
			workerRef.current = new Worker(
				new URL("../workers/data-fetching.worker.ts", import.meta.url),
				{ type: "module" }
			);

			workerRef.current.addEventListener("message", handleWorkerMessage);
			workerRef.current.addEventListener("error", handleWorkerError);

		} catch (error) {
			logger.error("graph", "Failed to initialize data fetching worker", { error });
			onExpandError?.("worker-init", "Failed to initialize data fetching worker");
		}

		return () => {
			if (workerRef.current) {
				// Cancel all pending requests
				pendingRequestsRef.current.forEach((request, id) => {
					request.reject(new Error("Worker terminated"));
				});

				workerRef.current.terminate();
				workerRef.current = null;
				setIsWorkerReady(false);

				// Clear progress store
				progressStore.clearAll();
				progressStore.setWorkerReady(false);
			}
		};
	}, [onExpandError]);

	// Handle worker messages
	const handleWorkerMessage = useCallback((event: MessageEvent<DataFetchingResponse>) => {
		const { type, id, payload, error } = event.data;

		switch (type) {
			case "ready":
				if (error) {
					logger.error("graph", "Data fetching worker failed to initialize", { error });
					setIsWorkerReady(false);
					progressStore.setWorkerReady(false);
				} else {
					logger.info("graph", "Data fetching worker ready");
					setIsWorkerReady(true);
					progressStore.setWorkerReady(true);
				}
				break;

			case "expandComplete":
				if (id && payload) {
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
						progressStore.completeRequest(request.nodeId);

						// Call completion callback
						onExpandComplete?.(payload as ExpandCompletePayload);
						request.resolve();

						logger.info("graph", "Node expansion completed via worker", {
							nodeId: request.nodeId,
							nodesAdded: payload.nodes?.length || 0,
							edgesAdded: payload.edges?.length || 0,
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
						progressStore.failRequest(request.nodeId, errorMessage);

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
				if (id && payload) {
					const request = pendingRequestsRef.current.get(id);
					if (request) {
						const progressData = {
							completed: payload.completed,
							total: payload.total,
							stage: payload.stage
						};

						// Update progress store
						progressStore.updateProgress(request.nodeId, progressData);

						// Call progress callback
						onProgress?.(request.nodeId, progressData);
					}
				}
				break;

			default:
				logger.warn("graph", "Unknown worker message type", { type });
		}
	}, [onExpandComplete, onExpandError, onProgress]);

	// Handle worker errors
	const handleWorkerError = useCallback((error: ErrorEvent) => {
		logger.error("graph", "Data fetching worker error", {
			error: error.message,
			filename: error.filename,
			lineno: error.lineno
		});

		// Reject all pending requests
		pendingRequestsRef.current.forEach((request, id) => {
			request.reject(new Error(`Worker error: ${error.message}`));
			onExpandError?.(request.nodeId, `Worker error: ${error.message}`);
		});

		// Clear tracking
		pendingRequestsRef.current.clear();
		setActiveRequests(new Set());
		setIsWorkerReady(false);
	}, [onExpandError]);

	// Expand node via worker
	const expandNode = useCallback(async (
		nodeId: string,
		entityId: string,
		entityType: EntityType,
		options: ExpansionOptions = {},
		expansionSettings?: any
	): Promise<void> => {
		if (!workerRef.current || !isWorkerReady) {
			throw new Error("Data fetching worker not ready");
		}

		if (activeRequests.has(nodeId)) {
			logger.warn("graph", "Node expansion already in progress", { nodeId });
			return;
		}

		// Generate unique request ID
		const requestId = `${nodeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
			progressStore.addRequest(nodeId, undefined, entityType);

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

			logger.info("graph", "Started node expansion via worker", {
				nodeId,
				entityId,
				entityType,
				requestId
			});
		});
	}, [isWorkerReady, activeRequests]);

	// Cancel specific expansion
	const cancelExpansion = useCallback((nodeId: string) => {
		// Find request by nodeId
		const requestToCancel = Array.from(pendingRequestsRef.current.entries())
			.find(([_, request]) => request.nodeId === nodeId);

		if (requestToCancel && workerRef.current) {
			const [requestId, request] = requestToCancel;

			// Send cancel message to worker
			workerRef.current.postMessage({
				type: "cancel",
				id: requestId
			} as DataFetchingMessage);

			// Clean up tracking
			pendingRequestsRef.current.delete(requestId);
			setActiveRequests(prev => {
				const newSet = new Set(prev);
				newSet.delete(nodeId);
				return newSet;
			});

			// Remove from progress store
			progressStore.removeRequest(nodeId);

			// Reject the promise
			request.reject(new Error("Expansion cancelled by user"));

			logger.info("graph", "Cancelled node expansion", { nodeId, requestId });
		}
	}, [progressStore]);

	// Cancel all expansions
	const cancelAllExpansions = useCallback(() => {
		pendingRequestsRef.current.forEach((request, requestId) => {
			if (workerRef.current) {
				workerRef.current.postMessage({
					type: "cancel",
					id: requestId
				} as DataFetchingMessage);
			}

			request.reject(new Error("All expansions cancelled"));
		});

		pendingRequestsRef.current.clear();
		setActiveRequests(new Set());

		// Clear progress store
		progressStore.clearAll();

		logger.info("graph", "Cancelled all node expansions");
	}, [progressStore]);

	// Get statistics
	const getStats = useCallback(() => {
		const stats = statsRef.current;
		return {
			totalRequests: stats.totalRequests,
			completedRequests: stats.completedRequests,
			failedRequests: stats.failedRequests,
			averageDuration: stats.completedRequests > 0
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