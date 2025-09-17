/**
 * React hook for animated D3 force simulation using Web Workers
 * Provides smooth, real-time animation streaming while keeping UI responsive
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@/lib/logger";
import type { EntityType } from "@/lib/graph/types";
import { getConfigByGraphSize } from "@/lib/graph/utils/performance-config";

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
}

interface UseAnimatedForceSimulationOptions {
  onPositionUpdate?: (positions: NodePosition[]) => void;
  onComplete?: (positions: NodePosition[], stats: { totalIterations: number; finalAlpha: number; reason: string }) => void;
  onError?: (error: string) => void;
  autoStart?: boolean;
}

export function useAnimatedForceSimulation(options: UseAnimatedForceSimulationOptions = {}) {
	const {
		onPositionUpdate,
		onComplete,
		onError,
	} = options;

	// Worker ref
	const workerRef = useRef<Worker | null>(null);
	const [isWorkerReady, setIsWorkerReady] = useState(false);

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
		const { type, positions, alpha, iteration, progress, fps, totalIterations, finalAlpha, reason, nodeCount, linkCount, config } = event.data;

		switch (type) {
			case "ready":
				setIsWorkerReady(true);
				logger.info("graph", "Force animation worker ready");
				break;

			case "started":
				setAnimationState(prev => ({
					...prev,
					isRunning: true,
					isPaused: false,
					nodeCount: nodeCount || 0,
					linkCount: linkCount || 0,
				}));

				logger.info("graph", "Force animation started", {
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
						logger.info("graph", "Force animation completed", {
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
				logger.info("graph", "Force animation stopped");
				break;

			case "paused":
				setAnimationState(prev => ({
					...prev,
					isPaused: true,
				}));
				logger.info("graph", "Force animation paused");
				break;

			case "resumed":
				setAnimationState(prev => ({
					...prev,
					isPaused: false,
				}));
				logger.info("graph", "Force animation resumed");
				break;

			case "parameters_updated":
				logger.info("graph", "Force parameters updated", {
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

			default:
				logger.warn("graph", "Unknown worker message type", { type });
		}
	}, [onPositionUpdate, onComplete, onError]);

	// Handle worker errors
	const handleWorkerError = useCallback((error: ErrorEvent) => {
		const errorMessage = `Worker error: ${error.message}`;
		logger.error("graph", "Force animation worker error", { error: error.message, filename: error.filename, lineno: error.lineno });
		onError?.(errorMessage);
	}, [onError]);

	// Initialize worker
	useEffect(() => {
		logger.info("graph", "Initializing animated force simulation worker");

		try {
			workerRef.current = new Worker(
				new URL("../workers/force-animation.worker.ts", import.meta.url),
				{ type: "module" }
			);

			workerRef.current.addEventListener("message", handleWorkerMessage);
			workerRef.current.addEventListener("error", handleWorkerError);

		} catch (error) {
			logger.error("graph", "Failed to initialize force animation worker", { error });
			onError?.("Failed to initialize Web Worker for force simulation");
		}

		return () => {
			if (workerRef.current) {
				workerRef.current.terminate();
				workerRef.current = null;
				setIsWorkerReady(false);
			}
		};
	}, [handleWorkerMessage, handleWorkerError, onError]);

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

		logger.info("graph", "Starting animated force simulation", {
			nodeCount: nodes.length,
			linkCount: links.length,
			pinnedCount: pinnedNodes ? pinnedNodes.size : 0,
			config,
		});

		workerRef.current.postMessage({
			type: "start",
			nodes,
			links,
			config,
			pinnedNodes,
		});
	}, [onError, isWorkerReady]);

	// Stop animation
	const stopAnimation = useCallback(() => {
		if (workerRef.current) {
			workerRef.current.postMessage({ type: "stop" });
		}
	}, []);

	// Pause animation
	const pauseAnimation = useCallback(() => {
		if (workerRef.current) {
			// Use state callback to check current animation state without dependency
			setAnimationState(current => {
				if (current.isRunning && !current.isPaused) {
					workerRef.current?.postMessage({ type: "pause" });
				}
				return current; // Return unchanged state
			});
		}
	}, []);

	// Resume animation
	const resumeAnimation = useCallback(() => {
		if (workerRef.current) {
			// Use state callback to check current animation state without dependency
			setAnimationState(current => {
				if (current.isRunning && current.isPaused) {
					workerRef.current?.postMessage({ type: "resume" });
				}
				return current; // Return unchanged state
			});
		}
	}, []);

	// Update parameters during animation
	const updateParameters = useCallback((config: AnimationConfig) => {
		if (workerRef.current && isWorkerReady) {
			// Use state callback to check if animation is running
			setAnimationState(current => {
				if (current.isRunning) {
					workerRef.current?.postMessage({
						type: "update_parameters",
						config,
					});
					logger.info("graph", "Updating force parameters during animation", { config });
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

	return {
		// State
		animationState,
		nodePositions,
		performanceStats,
		isWorkerReady,

		// Actions
		startAnimation,
		stopAnimation,
		pauseAnimation,
		resumeAnimation,
		updateParameters,
		resetPositions,
		getOptimalConfig,

		// Computed properties
		isIdle: !animationState.isRunning && !animationState.isPaused,
		canPause: animationState.isRunning && !animationState.isPaused,
		canResume: animationState.isRunning && animationState.isPaused,
		canStop: animationState.isRunning || animationState.isPaused,
	};
}