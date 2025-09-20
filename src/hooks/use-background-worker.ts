/**
 * React hook for background worker operations
 * Handles data fetching, graph expansion, and animated D3 force simulation using Web Workers
 * Provides smooth, real-time animation streaming while keeping UI responsive
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@/lib/logger";
import type { EntityType, GraphNode, GraphEdge } from "@/lib/graph/types";
import type { ExpansionOptions } from "@/lib/entities";
import type { ExpansionSettings } from "@/lib/graph/types/expansion-settings";
import { getConfigByGraphSize } from "@/lib/graph/utils/performance-config";
import { useBackgroundWorkerContext, useEventBridge } from "@/contexts/hooks";
import { WorkerEventType, type WorkerEventPayloads, WorkerEventPayloadSchemas, parseWorkerEventPayload, isWorkerEventType } from "@/lib/graph/events/types";

// Types matching the worker interfaces
interface NodePosition {
  id: string;
  x: number;
  y: number;
}

interface AnimatedNode {
  id: string;
  type?: EntityType;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface AnimatedLink {
  id: string;
  source: string;
  target: string;
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

interface AnimationState {
  isRunning: boolean;
  isPaused: boolean;
  alpha: number;
  iteration: number;
  progress: number;
  fps: number;
  nodeCount: number;
  linkCount: number;
}

interface WorkerMessage {
  type: string;
  positions?: NodePosition[];
  alpha?: number;
  iteration?: number;
  progress?: number;
  fps?: number;
  totalIterations?: number;
  finalAlpha?: number;
  reason?: string;
  nodeCount?: number;
  linkCount?: number;
  config?: AnimationConfig;
  error?: string;
  filename?: string;
  lineno?: number;
  wasPaused?: boolean;
  // Data fetching properties
  requestId?: string;
  nodeId?: string;
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  statistics?: {
    duration: number;
    nodesFetched: number;
    edgesFetched: number;
  };
  currentStep?: string;
}

interface UseBackgroundWorkerOptions {
  onPositionUpdate?: (positions: NodePosition[]) => void;
  onComplete?: (positions: NodePosition[], stats: { totalIterations: number; finalAlpha: number; reason: string }) => void;
  onError?: (error: string) => void;
  autoStart?: boolean;
  // Data fetching callbacks
  onExpansionProgress?: (nodeId: string, progress: { completed: number; total: number; stage: string }) => void;
  onExpansionComplete?: (result: { requestId: string; nodes: GraphNode[]; edges: GraphEdge[]; statistics?: unknown }) => void;
  onExpansionError?: (nodeId: string, error: string) => void;
}

export function useBackgroundWorker(options: UseBackgroundWorkerOptions = {}) {
	const {
		onPositionUpdate,
		onComplete,
		onError,
		onExpansionProgress,
		onExpansionComplete,
		onExpansionError,
	} = options;

	// Use the context providers for worker management
	const { worker, isWorkerReady, getWorker } = useBackgroundWorkerContext();
	const { registerHandler, unregisterHandler, emit } = useEventBridge();
	const workerRef = useRef<Worker | null>(worker);

	// Debug tracking for isWorkerReady state changes
	useEffect(() => {
		logger.debug("worker", "useBackgroundWorker isWorkerReady state changed", { isWorkerReady });
	}, [isWorkerReady]);

	// Keep workerRef in sync with the context worker
	useEffect(() => {
		workerRef.current = worker;
	}, [worker]);

	// Animation state
	const [animationState, setAnimationState] = useState<AnimationState>({
		isRunning: false,
		isPaused: false,
		alpha: 1,
		iteration: 0,
		progress: 0,
		fps: 0,
		nodeCount: 0,
		linkCount: 0,
	});

	// Current positions
	const [nodePositions, setNodePositions] = useState<NodePosition[]>([]);

	// Performance stats
	const [performanceStats, setPerformanceStats] = useState({
		averageFPS: 0,
		minFPS: Infinity,
		maxFPS: 0,
		frameCount: 0,
	});

	// Handle worker messages
	const handleWorkerMessage = useCallback((event: MessageEvent<WorkerMessage>) => {
		const data = event.data;

		// Filter out EventBridge cross-context messages - these are handled by EventBridge
		// Only process direct worker messages for force animation control
		if (data && typeof data === "object" && "type" in data && data.type === "event") {
			// This is an EventBridge cross-context message, ignore it
			logger.debug("graph", "Filtered out EventBridge message", { messageType: data.type });
			return;
		}

		// Debug: Log unrecognized message types to understand what's getting through
		if (data && typeof data === "object" && "type" in data && !["ready", "started", "tick", "complete", "stopped", "paused", "resumed", "error", "expansion_progress", "expansion_complete", "expansion_error", "expansion_cancelled"].includes(data.type)) {
			logger.debug("graph", "Unrecognized message structure", {
				type: data.type,
				keys: Object.keys(data),
				fullMessage: data
			});
		}

		const { type, positions, alpha, iteration, progress, fps, totalIterations, finalAlpha, reason, nodeCount, linkCount, config } = data;

		switch (type) {
			case "started":
				setAnimationState(prev => ({
					...prev,
					isRunning: true,
					isPaused: false,
					nodeCount: nodeCount || 0,
					linkCount: linkCount || 0,
				}));

				logger.debug("graph", "Force animation started", {
					nodeCount,
					linkCount,
					config,
				});
				break;

			case "tick":
				if (positions && typeof alpha === "number" && typeof iteration === "number" && typeof progress === "number") {
					// Update positions
					setNodePositions(positions);
					onPositionUpdate?.(positions);

					// Update animation state
					setAnimationState(prev => ({
						...prev,
						alpha,
						iteration,
						progress,
						fps: fps || prev.fps,
					}));

					// Update performance stats
					if (fps) {
						setPerformanceStats(prev => ({
							averageFPS: (prev.averageFPS * prev.frameCount + fps) / (prev.frameCount + 1),
							minFPS: Math.min(prev.minFPS, fps),
							maxFPS: Math.max(prev.maxFPS, fps),
							frameCount: prev.frameCount + 1,
						}));
					}

					logger.debug("graph", `Animation tick ${String(iteration)}`, {
						alpha: alpha.toFixed(4),
						progress: `${(progress * 100).toFixed(1)}%`,
						fps: fps?.toFixed(1),
					});
				}
				break;

			case "complete":
				if (positions && typeof totalIterations === "number" && typeof finalAlpha === "number" && reason) {
					setNodePositions(positions);
					onPositionUpdate?.(positions);
					onComplete?.(positions, { totalIterations, finalAlpha, reason });

					setAnimationState(prev => ({
						...prev,
						isRunning: false,
						isPaused: false,
						progress: 1,
						alpha: finalAlpha,
					}));

					// Use current performance stats from state callback
					setPerformanceStats(currentStats => {
						logger.debug("graph", "Force animation completed", {
							totalIterations,
							finalAlpha: finalAlpha.toFixed(4),
							reason,
							averageFPS: currentStats.averageFPS.toFixed(1),
						});
						return currentStats; // Return unchanged stats
					});
				}
				break;

			case "stopped":
				setAnimationState(prev => ({
					...prev,
					isRunning: false,
					isPaused: false,
				}));
				logger.debug("graph", "Force animation stopped");
				break;

			case "paused":
				setAnimationState(prev => ({
					...prev,
					isPaused: true,
				}));
				logger.debug("graph", "Force animation paused");
				break;

			case "resumed":
				setAnimationState(prev => ({
					...prev,
					isPaused: false,
				}));
				logger.debug("graph", "Force animation resumed");
				break;

			case "parameters_updated":
				logger.debug("graph", "Force parameters updated", {
					config,
					wasPaused: event.data.wasPaused,
				});
				break;

			case "error": {
				const errorMessage = `Worker error: ${event.data.error ?? "Unknown error"}`;
				logger.error("graph", "Force animation worker error", event.data);
				onError?.(errorMessage);
				break;
			}

			case "expansion_progress":
				if (data.nodeId && typeof data.progress === "number" && data.currentStep) {
					onExpansionProgress?.(data.nodeId, {
						completed: Math.round(data.progress * 100),
						total: 100,
						stage: data.currentStep
					});
				}
				break;

			case "expansion_complete":
				if (data.requestId && data.nodes && data.edges) {
					onExpansionComplete?.({
						requestId: data.requestId,
						nodes: data.nodes,
						edges: data.edges,
						statistics: data.statistics
					});
				}
				break;

			case "expansion_error":
				if (data.nodeId && data.error) {
					onExpansionError?.(data.nodeId, data.error);
				}
				break;

			case "expansion_cancelled":
				logger.debug("graph", "Node expansion cancelled", { requestId: data.requestId });
				break;

			default:
				logger.warn("graph", "Unknown worker message type", { type });
		}
	}, [onPositionUpdate, onComplete, onError, onExpansionProgress, onExpansionComplete, onExpansionError]);

	// Handle worker errors
	const handleWorkerError = useCallback((error: ErrorEvent) => {
		const errorMessage = `Worker error: ${error.message}`;
		logger.error("graph", "Force animation worker error", { error: error.message, filename: error.filename, lineno: error.lineno });
		onError?.(errorMessage);
	}, [onError]);

	// EventBridge handlers for new event system
	// Note: Worker ready handling is now managed by BackgroundWorkerProvider

	const handleWorkerErrorEvent = useCallback((payload: WorkerEventPayloads[WorkerEventType.WORKER_ERROR]) => {
		if (payload.workerType === "force-animation") {
			const errorMessage = `Worker error: ${payload.error}`;
			logger.error("graph", "Force animation worker error via EventBridge", payload);
			onError?.(errorMessage);
		}
	}, [onError]);

	const handleForceSimulationProgress = useCallback((payload: WorkerEventPayloads[WorkerEventType.FORCE_SIMULATION_PROGRESS]) => {
		const { messageType, positions, alpha, iteration, progress, fps, nodeCount, linkCount, config, wasPaused } = payload;

		switch (messageType) {
			case "started":
				setAnimationState(prev => ({
					...prev,
					isRunning: true,
					isPaused: false,
					nodeCount: nodeCount || 0,
					linkCount: linkCount || 0,
				}));

				logger.debug("graph", "Force animation started via EventBridge", {
					nodeCount,
					linkCount,
					config,
				});
				break;

			case "tick":
				if (positions && typeof alpha === "number" && typeof iteration === "number" && typeof progress === "number") {
					// Update positions
					setNodePositions(positions);
					onPositionUpdate?.(positions);

					// Update animation state
					setAnimationState(prev => ({
						...prev,
						alpha,
						iteration,
						progress,
						fps: fps || prev.fps,
					}));

					// Update performance stats
					if (fps) {
						setPerformanceStats(prev => ({
							averageFPS: (prev.averageFPS * prev.frameCount + fps) / (prev.frameCount + 1),
							minFPS: Math.min(prev.minFPS, fps),
							maxFPS: Math.max(prev.maxFPS, fps),
							frameCount: prev.frameCount + 1,
						}));
					}

					logger.debug("graph", `Animation tick ${String(iteration)} via EventBridge`, {
						alpha: alpha.toFixed(4),
						progress: `${(progress * 100).toFixed(1)}%`,
						fps: fps?.toFixed(1),
					});
				}
				break;

			case "paused":
				setAnimationState(prev => ({
					...prev,
					isPaused: true,
				}));
				logger.debug("graph", "Force animation paused via EventBridge");
				break;

			case "resumed":
				setAnimationState(prev => ({
					...prev,
					isPaused: false,
				}));
				logger.debug("graph", "Force animation resumed via EventBridge");
				break;

			case "parameters_updated":
				logger.debug("graph", "Force parameters updated via EventBridge", {
					config,
					wasPaused,
				});
				break;

			default:
				logger.warn("graph", "Unknown force simulation progress message type", { messageType });
		}
	}, [onPositionUpdate]);

	const handleForceSimulationComplete = useCallback((payload: WorkerEventPayloads[WorkerEventType.FORCE_SIMULATION_COMPLETE]) => {
		const { positions, totalIterations, finalAlpha, reason } = payload;

		setNodePositions(positions);
		onPositionUpdate?.(positions);
		onComplete?.(positions, { totalIterations, finalAlpha, reason });

		setAnimationState(prev => ({
			...prev,
			isRunning: false,
			isPaused: false,
			progress: 1,
			alpha: finalAlpha,
		}));

		// Use current performance stats from state callback
		setPerformanceStats(currentStats => {
			logger.debug("graph", "Force animation completed via EventBridge", {
				totalIterations,
				finalAlpha: finalAlpha.toFixed(4),
				reason,
				averageFPS: currentStats.averageFPS.toFixed(1),
			});
			return currentStats; // Return unchanged stats
		});
	}, [onPositionUpdate, onComplete]);

	const handleForceSimulationStopped = useCallback((payload: WorkerEventPayloads[WorkerEventType.FORCE_SIMULATION_STOPPED]) => {
		if (payload.workerType === "force-animation") {
			setAnimationState(prev => ({
				...prev,
				isRunning: false,
				isPaused: false,
			}));
			logger.debug("graph", "Force animation stopped via EventBridge");
		}
	}, [emit]);

	const handleForceSimulationError = useCallback((payload: WorkerEventPayloads[WorkerEventType.FORCE_SIMULATION_ERROR]) => {
		if (payload.workerType === "force-animation") {
			const errorMessage = `Worker error: ${payload.error}`;
			logger.error("graph", "Force animation worker error via EventBridge", payload);
			onError?.(errorMessage);
		}
	}, [onError]);

	// Set up EventBridge listeners for this hook instance
	useEffect(() => {
		logger.debug("graph", "Setting up EventBridge listeners for useBackgroundWorker hook");

		// Set up event listeners when worker is available
		if (worker) {
			worker.addEventListener("message", handleWorkerMessage);
			worker.addEventListener("error", handleWorkerError);
		}

		// Register EventBridge listeners using the context
		registerHandler({ handlerId: "force-animation-worker-error", handler: (message) => {
			if (isWorkerEventType(message.eventType) && message.eventType === WorkerEventType.WORKER_ERROR && message.payload) {
				const payload = parseWorkerEventPayload(message.payload, WorkerEventType.WORKER_ERROR, WorkerEventPayloadSchemas[WorkerEventType.WORKER_ERROR]);
				if (payload) {
					handleWorkerErrorEvent(payload);
				}
			}
		}});

		registerHandler({ handlerId: "force-animation-progress", handler: (message) => {
			if (isWorkerEventType(message.eventType) && message.eventType === WorkerEventType.FORCE_SIMULATION_PROGRESS && message.payload) {
				const payload = parseWorkerEventPayload(message.payload, WorkerEventType.FORCE_SIMULATION_PROGRESS, WorkerEventPayloadSchemas[WorkerEventType.FORCE_SIMULATION_PROGRESS]);
				if (payload) {
					handleForceSimulationProgress(payload);
				}
			}
		}});

		registerHandler({ handlerId: "force-animation-complete", handler: (message) => {
			if (isWorkerEventType(message.eventType) && message.eventType === WorkerEventType.FORCE_SIMULATION_COMPLETE && message.payload) {
				const payload = parseWorkerEventPayload(message.payload, WorkerEventType.FORCE_SIMULATION_COMPLETE, WorkerEventPayloadSchemas[WorkerEventType.FORCE_SIMULATION_COMPLETE]);
				if (payload) {
					handleForceSimulationComplete(payload);
				}
			}
		}});

		registerHandler({ handlerId: "force-animation-stopped", handler: (message) => {
			if (isWorkerEventType(message.eventType) && message.eventType === WorkerEventType.FORCE_SIMULATION_STOPPED && message.payload) {
				const payload = parseWorkerEventPayload(message.payload, WorkerEventType.FORCE_SIMULATION_STOPPED, WorkerEventPayloadSchemas[WorkerEventType.FORCE_SIMULATION_STOPPED]);
				if (payload) {
					handleForceSimulationStopped(payload);
				}
			}
		}});

		registerHandler({ handlerId: "force-animation-simulation-error", handler: (message) => {
			if (isWorkerEventType(message.eventType) && message.eventType === WorkerEventType.FORCE_SIMULATION_ERROR && message.payload) {
				const payload = parseWorkerEventPayload(message.payload, WorkerEventType.FORCE_SIMULATION_ERROR, WorkerEventPayloadSchemas[WorkerEventType.FORCE_SIMULATION_ERROR]);
				if (payload) {
					handleForceSimulationError(payload);
				}
			}
		}});

		return () => {
			// Unregister EventBridge listeners for this hook instance
			unregisterHandler("force-animation-worker-error");
			unregisterHandler("force-animation-progress");
			unregisterHandler("force-animation-complete");
			unregisterHandler("force-animation-stopped");
			unregisterHandler("force-animation-simulation-error");

			// Remove event listeners for this hook instance
			if (worker) {
				worker.removeEventListener("message", handleWorkerMessage);
				worker.removeEventListener("error", handleWorkerError);
			}
		};
	}, [worker, handleWorkerMessage, handleWorkerError, registerHandler, unregisterHandler, handleWorkerErrorEvent, handleForceSimulationProgress, handleForceSimulationComplete, handleForceSimulationStopped, handleForceSimulationError]);

	// Start animation
	const startAnimation = useCallback((
		nodes: AnimatedNode[],
		links: AnimatedLink[],
		config?: AnimationConfig,
		pinnedNodes?: Set<string>
	) => {
		if (!workerRef.current || !isWorkerReady) {
			logger.error("graph", "Worker not ready for animation start");
			onError?.("Animation worker not ready");
			return;
		}

		if (nodes.length === 0) {
			logger.warn("graph", "Cannot start animation with no nodes");
			return;
		}

		// Reset performance stats
		setPerformanceStats({
			averageFPS: 0,
			minFPS: Infinity,
			maxFPS: 0,
			frameCount: 0,
		});

		logger.debug("graph", "Starting animated force simulation", {
			nodeCount: nodes.length,
			linkCount: links.length,
			pinnedCount: pinnedNodes ? pinnedNodes.size : 0,
			config,
		});

		emit({ eventType: "FORCE_SIMULATION_START", payload: {
			nodes,
			links,
			config,
			pinnedNodes,
		}, target: "worker" });
	}, [emit, onError, isWorkerReady]);

	// Stop animation
	const stopAnimation = useCallback(() => {
		if (workerRef.current) {
			emit({ eventType: "FORCE_SIMULATION_STOP", payload: {}, target: "worker" });
		}
	}, [emit]);

	// Pause animation
	const pauseAnimation = useCallback(() => {
		if (workerRef.current) {
			// Use state callback to check current animation state without dependency
			setAnimationState(current => {
				if (current.isRunning && !current.isPaused) {
					emit({ eventType: "FORCE_SIMULATION_PAUSE", payload: {}, target: "worker" });
				}
				return current; // Return unchanged state
			});
		}
	}, [emit]);

	// Resume animation
	const resumeAnimation = useCallback(() => {
		if (workerRef.current) {
			// Use state callback to check current animation state without dependency
			setAnimationState(current => {
				if (current.isRunning && current.isPaused) {
					emit({ eventType: "FORCE_SIMULATION_RESUME", payload: {}, target: "worker" });
				}
				return current; // Return unchanged state
			});
		}
	}, [emit]);

	// Update parameters during animation
	const updateParameters = useCallback((config: AnimationConfig) => {
		if (workerRef.current && isWorkerReady) {
			// Use state callback to check if animation is running
			setAnimationState(current => {
				if (current.isRunning) {
					emit({ eventType: "FORCE_SIMULATION_UPDATE_PARAMETERS", payload: {
						config,
					}, target: "worker" });
					logger.debug("graph", "Updating force parameters during animation", { config });
				} else {
					logger.debug("graph", "Animation not running, ignoring parameter update");
				}
				return current; // Return unchanged state
			});
		}
	}, [isWorkerReady]);

	// Get optimal configuration based on graph size using performance utilities
	const getOptimalConfig = useCallback((nodeCount: number, edgeCount: number = 0, pinnedNodeCount: number = 0): AnimationConfig => {
		const config = getConfigByGraphSize(nodeCount, edgeCount, pinnedNodeCount);

		return {
			targetFPS: config.targetFPS,
			sendEveryNTicks: config.sendEveryNTicks,
			alphaDecay: config.alphaDecay,
			maxIterations: config.maxIterations,
			linkDistance: config.linkDistance,
			linkStrength: config.linkStrength,
			chargeStrength: config.chargeStrength,
			centerStrength: config.centerStrength,
			collisionRadius: config.collisionRadius,
			collisionStrength: config.collisionStrength,
			velocityDecay: config.velocityDecay,
		};
	}, []);

	// Reset positions
	const resetPositions = useCallback(() => {
		setNodePositions([]);
		setAnimationState(prev => ({
			...prev,
			alpha: 1,
			iteration: 0,
			progress: 0,
		}));
	}, []);

	// Node expansion methods
	const expandNode = useCallback((
		nodeId: string,
		entityId: string,
		entityType: EntityType,
		options?: ExpansionOptions,
		expansionSettings?: ExpansionSettings
	): void => {
		if (!workerRef.current || !isWorkerReady) {
			logger.warn("graph", "Force animation worker not ready for expandNode", {
				nodeId,
				hasWorker: !!workerRef.current,
				isWorkerReady
			});
			onExpansionError?.(nodeId, "Worker not ready");
			return;
		}

		// Generate unique request ID
		const requestId = `${nodeId}-${Date.now().toString()}-${Math.random().toString(36).substring(2, 11)}`;

		// Send expansion request to worker
		emit({ eventType: "DATA_FETCH_EXPAND_NODE", payload: {
			expandRequest: {
				id: requestId,
				nodeId,
				entityId,
				entityType,
				options,
				expansionSettings
			}
		}, target: "worker" });

		logger.debug("graph", "Started node expansion via force worker", {
			nodeId,
			entityId,
			entityType,
			requestId
		});
	}, [isWorkerReady]);

	const cancelExpansion = useCallback((requestId: string) => {
		if (workerRef.current && isWorkerReady) {
			emit({ eventType: "DATA_FETCH_CANCEL_EXPANSION", payload: {
				requestId
			}, target: "worker" });
			logger.debug("graph", "Cancelled node expansion", { requestId });
		}
	}, [isWorkerReady]);

	return {
		// State
		animationState,
		nodePositions,
		performanceStats,
		isWorkerReady,
		worker,

		// Actions
		startAnimation,
		stopAnimation,
		pauseAnimation,
		resumeAnimation,
		updateParameters,
		resetPositions,
		getOptimalConfig,

		// Data fetching actions
		expandNode,
		cancelExpansion,

		// Computed properties
		isIdle: !animationState.isRunning && !animationState.isPaused,
		canPause: animationState.isRunning && !animationState.isPaused,
		canResume: animationState.isRunning && animationState.isPaused,
		canStop: animationState.isRunning || animationState.isPaused,
	};
}