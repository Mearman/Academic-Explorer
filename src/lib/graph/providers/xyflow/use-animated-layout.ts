/**
 * Animated Layout Hook for ReactFlow
 * Integrates Web Worker-based animated force simulation with existing layout system
 */

import { useCallback, useEffect, useRef, useMemo } from "react";
import { useReactFlow } from "@xyflow/react";
import type { EntityType } from "../../types";
import { logger } from "@/lib/logger";
import { useGraphStore } from "@/stores/graph-store";
import { useLayoutStore } from "@/stores/layout-store";
import { useAnimatedGraphStore } from "@/stores/animated-graph-store";
import { useBackgroundWorker } from "@/hooks/use-unified-background-worker";
// FIT_VIEW_PRESETS removed - not currently used
import { DEFAULT_FORCE_PARAMS } from "../../force-params";
import type { ForceSimulationConfig, ForceSimulationLink, ForceSimulationNode } from "@/lib/graph/events/enhanced-worker-types";

// Import the position type
interface NodePosition {
  id: string;
  x: number;
  y: number;
}

// Extended node interface for animated simulation
interface UseAnimatedLayoutOptions {
  enabled?: boolean;
  onLayoutChange?: () => void;
  fitViewAfterLayout?: boolean;
  useAnimation?: boolean;
}

export function useAnimatedLayout(options: UseAnimatedLayoutOptions = {}) {
	const {
		enabled = true,
		onLayoutChange,
		// fitViewAfterLayout removed - not currently used
		useAnimation = true,
	} = options;

	const { getNodes, getEdges, setNodes } = useReactFlow();
	// fitView removed - not currently used

	// Stable individual selectors to avoid infinite loops
	const pinnedNodes = useGraphStore((state) => state.pinnedNodes);
	const currentLayout = useGraphStore((state) => state.currentLayout);
	const autoPinOnLayoutStabilization = useLayoutStore((state) => state.autoPinOnLayoutStabilization);

	// Get individual store methods using stable selectors
	const isAnimating = useAnimatedGraphStore((state) => state.isAnimating);
	const isPaused = useAnimatedGraphStore((state) => state.isPaused);
	const progress = useAnimatedGraphStore((state) => state.progress);
	const alpha = useAnimatedGraphStore((state) => state.alpha);
	const iteration = useAnimatedGraphStore((state) => state.iteration);
	const fps = useAnimatedGraphStore((state) => state.fps);

	// Use refs to store methods and prevent circular dependencies
	const storeMethodsRef = useRef({
		startAnimation: useAnimatedGraphStore.getState().startAnimation,
		completeAnimation: useAnimatedGraphStore.getState().completeAnimation,
		resetAnimation: useAnimatedGraphStore.getState().resetAnimation,
		setAnimating: useAnimatedGraphStore.getState().setAnimating,
		setPaused: useAnimatedGraphStore.getState().setPaused,
		setProgress: useAnimatedGraphStore.getState().setProgress,
		setAlpha: useAnimatedGraphStore.getState().setAlpha,
		setIteration: useAnimatedGraphStore.getState().setIteration,
		setFPS: useAnimatedGraphStore.getState().setFPS,
		updateAnimatedPositions: useAnimatedGraphStore.getState().updateAnimatedPositions,
		updateStaticPositions: useAnimatedGraphStore.getState().updateStaticPositions,
		applyPositionsToGraphStore: useAnimatedGraphStore.getState().applyPositionsToGraphStore,
	});

	// Store methods are stable in Zustand, no need to update refs
	// This useEffect was causing infinite loops by running on every render

	// Create stable animation state object
	const animationState = useMemo(() => ({
		isAnimating,
		isPaused,
		progress,
		alpha,
		iteration,
		fps,
	}), [isAnimating, isPaused, progress, alpha, iteration, fps]);

	// Animation control refs
	const isLayoutRunningRef = useRef(false);
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
	const applyDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
	const prevNodeCountRef = useRef(0);

	// Animated force simulation hook
	const {
		startAnimation,
		stopAnimation,
		pauseAnimation,
		resumeAnimation,
		updateParameters: updateAnimationParameters,
		animationState: hookAnimationState,
		isWorkerReady,
	} = useBackgroundWorker({
		onPositionUpdate: useCallback((positions: NodePosition[]) => {
			// Update animated store with new positions
			storeMethodsRef.current.updateAnimatedPositions(positions);

			// Update ReactFlow nodes with new positions
			setNodes((currentNodes) =>
				currentNodes.map((node) => {
					const position = positions.find((p) => p.id === node.id);
					if (position) {
						return {
							...node,
							position: { x: position.x, y: position.y },
						};
					}
					return node;
				})
			);

			onLayoutChange?.();
		}, [setNodes, onLayoutChange]),

		// onComplete: useCallback((positions: NodePosition[], stats: { totalIterations: number; finalAlpha: number; reason: string }) => {
		//	// Update final positions in store
		//	storeMethodsRef.current.updateStaticPositions(positions);
		//	const statsWithDuration = { ...stats, duration: Date.now() };
		//	storeMethodsRef.current.completeAnimation(statsWithDuration);
		//
		//	// Apply positions to graph store for persistence
		//	storeMethodsRef.current.applyPositionsToGraphStore();
		//
		//	// Auto-pin disabled to allow force parameter changes to work immediately
		//	// Users can manually pin specific nodes if desired
		//	logger.debug("graph", "Auto-pin disabled - nodes remain free to move on future parameter changes");
		//
		//	// Auto-fit view if enabled
		//	if (fitViewAfterLayout) {
		//		setTimeout(() => {
		//			void fitView(FIT_VIEW_PRESETS.DEFAULT);
		//			logger.debug("graph", "Auto-fitted view after animated layout completion");
		//		}, 100);
		//	}
		//
		//	isLayoutRunningRef.current = false;
		//	logger.debug("graph", "Animated layout completed", {
		//		...stats,
		//		autoPinEnabled: autoPinOnLayoutStabilization,
		//	});
		// }, [fitViewAfterLayout, fitView, autoPinOnLayoutStabilization]),

		onAnimationError: useCallback((error: string) => {
			logger.error("graph", "Animated layout error", { error });
			isLayoutRunningRef.current = false;
			storeMethodsRef.current.resetAnimation();
		}, []),
	});

	// Sync animation state between hook and store using refs to prevent infinite loops
	useEffect(() => {
		logger.debug("graph", "SYNC: Updating global store with hook state", {
			iteration: hookAnimationState.iteration,
			alpha: hookAnimationState.alpha,
			fps: hookAnimationState.fps,
			progress: hookAnimationState.progress,
			isRunning: hookAnimationState.isRunning,
			isPaused: hookAnimationState.isPaused
		});

		storeMethodsRef.current.setAnimating(hookAnimationState.isRunning);
		storeMethodsRef.current.setPaused(hookAnimationState.isPaused);
		storeMethodsRef.current.setProgress(hookAnimationState.progress);
		storeMethodsRef.current.setAlpha(hookAnimationState.alpha);
		storeMethodsRef.current.setIteration(hookAnimationState.iteration);
		storeMethodsRef.current.setFPS(hookAnimationState.fps);
	}, [
		hookAnimationState.isRunning,
		hookAnimationState.isPaused,
		hookAnimationState.progress,
		hookAnimationState.alpha,
		hookAnimationState.iteration,
		hookAnimationState.fps,
	]);

	// Convert ReactFlow data to animation format
	const prepareAnimationData = useCallback(() => {
		const nodes = getNodes();
		const edges = getEdges();

		function isEntityType(value: unknown): value is EntityType {
			return typeof value === "string" &&
				["works", "authors", "sources", "institutions", "publishers", "funders", "topics", "concepts"].includes(value);
		}

		const animatedNodes: ForceSimulationNode[] = nodes.map((node) => {
			const isPinned = pinnedNodes[node.id] ?? false;
			const entityType = isEntityType(node.data.entityType) ? node.data.entityType : undefined;
			return {
				id: node.id,
				type: entityType,
				x: node.position.x,
				y: node.position.y,
				fx: isPinned ? node.position.x : undefined,
				fy: isPinned ? node.position.y : undefined,
			};
		});

		const animatedLinks: ForceSimulationLink[] = edges
			.filter((edge) => {
				const sourceExists = animatedNodes.find((n) => n.id === edge.source);
				const targetExists = animatedNodes.find((n) => n.id === edge.target);
				return sourceExists && targetExists;
			})
			.map((edge) => ({
				id: edge.id,
				source: edge.source,
				target: edge.target,
			}));

		return { animatedNodes, animatedLinks };
	}, [getNodes, getEdges, pinnedNodes]);

	// Apply animated layout
	const applyAnimatedLayout = useCallback(() => {

		logger.debug("graph", "applyAnimatedLayout called", {
			enabled,
			useAnimation,
			isWorkerReady,
			isLayoutRunning: isLayoutRunningRef.current,
		});

		if (!enabled || !useAnimation || !isWorkerReady) {
			logger.debug("graph", "Animated layout skipped", {
				enabled,
				useAnimation,
				isWorkerReady,
			});
			return;
		}

		if (isLayoutRunningRef.current) {
			logger.debug("graph", "Animated layout already running, skipping");
			return;
		}

		const { animatedNodes, animatedLinks } = prepareAnimationData();

		logger.debug("graph", "Prepared animation data", {
			nodeCount: animatedNodes.length,
			linkCount: animatedLinks.length,
		});

		if (animatedNodes.length === 0) {
			logger.debug("graph", "No nodes for animated layout");
			return;
		}

		// Get optimal configuration based on graph size
		const config: ForceSimulationConfig = DEFAULT_FORCE_PARAMS;

		// Use graph store's layout configuration if available
		const layoutOptions = currentLayout.options;
		const enhancedConfig = {
			...config,
			linkDistance: layoutOptions?.linkDistance || DEFAULT_FORCE_PARAMS.linkDistance,
			linkStrength: layoutOptions?.linkStrength || DEFAULT_FORCE_PARAMS.linkStrength,
			chargeStrength: layoutOptions?.chargeStrength || DEFAULT_FORCE_PARAMS.chargeStrength,
			centerStrength: layoutOptions?.centerStrength || DEFAULT_FORCE_PARAMS.centerStrength,
			collisionRadius: layoutOptions?.collisionRadius || DEFAULT_FORCE_PARAMS.collisionRadius,
			collisionStrength: layoutOptions?.collisionStrength || DEFAULT_FORCE_PARAMS.collisionStrength,
			velocityDecay: layoutOptions?.velocityDecay || DEFAULT_FORCE_PARAMS.velocityDecay,
			alphaDecay: layoutOptions?.alphaDecay || config.alphaDecay,
			seed: layoutOptions?.seed || 0, // For deterministic layouts
		};

		logger.debug("graph", "Starting animated force layout", {
			nodeCount: animatedNodes.length,
			linkCount: animatedLinks.length,
			pinnedCount: Object.keys(pinnedNodes).length,
			config: enhancedConfig,
			layoutType: currentLayout.type,
			autoPinOnLayoutStabilization,
			usingGraphStoreConfig: !!layoutOptions,
		});

		isLayoutRunningRef.current = true;
		storeMethodsRef.current.startAnimation();

		// Start the animation
		const pinnedNodeSet = new Set(Object.keys(pinnedNodes).filter(key => pinnedNodes[key]));

		logger.debug("graph", "About to call startAnimation", {
			pinnedNodeSetSize: pinnedNodeSet.size,
			startAnimationFunction: typeof startAnimation,
		});

		void startAnimation({
			nodes: animatedNodes,
			links: animatedLinks,
			config: enhancedConfig,
			pinnedNodes: pinnedNodeSet,
		});
		logger.debug("graph", "startAnimation called successfully");
	}, [
		enabled,
		useAnimation,
		isWorkerReady,
		prepareAnimationData,
		pinnedNodes,
		currentLayout,
		startAnimation,
		autoPinOnLayoutStabilization,
	]);

	// Stop layout
	const stopLayout = useCallback(() => {
		if (isLayoutRunningRef.current) {
			void stopAnimation();
			isLayoutRunningRef.current = false;
			storeMethodsRef.current.resetAnimation();
			logger.debug("graph", "Animated layout stopped");
		}
	}, [stopAnimation]);

	// Pause layout
	const pauseLayout = useCallback(() => {
		// Use state callback to check current pause state without dependency
		const currentPauseState = useAnimatedGraphStore.getState().isPaused;
		logger.debug("graph", "pauseLayout called", {
			isRunning: isLayoutRunningRef.current,
			isPaused: currentPauseState,
			willPause: isLayoutRunningRef.current && !currentPauseState,
			callStack: new Error().stack?.split("\n").slice(0, 5).join("\n")
		});
		if (isLayoutRunningRef.current && !currentPauseState) {
			void pauseAnimation();
			logger.debug("graph", "Animated layout paused");
		}
	}, [pauseAnimation]);

	// Resume layout
	const resumeLayout = useCallback(() => {
		// Use state callback to check current pause state without dependency
		const currentPauseState = useAnimatedGraphStore.getState().isPaused;
		if (isLayoutRunningRef.current && currentPauseState) {
			void resumeAnimation();
			logger.debug("graph", "Animated layout resumed");
		}
	}, [resumeAnimation]);

	// Debounced apply layout to prevent rapid consecutive calls
	const debouncedApplyLayout = useCallback(() => {
		if (applyDebounceTimerRef.current) {
			clearTimeout(applyDebounceTimerRef.current);
		}
		applyDebounceTimerRef.current = setTimeout(() => {
			applyAnimatedLayout();
			applyDebounceTimerRef.current = null;
		}, 100); // 100ms debounce to prevent race conditions
	}, [applyAnimatedLayout]);

	// Restart layout
	const restartLayout = useCallback(() => {
		stopLayout();
		setTimeout(() => {
			applyAnimatedLayout();
		}, 100);
	}, [stopLayout, applyAnimatedLayout]);

	// Reheat simulation (add energy to running simulation)
	const reheatLayout = useCallback((targetAlpha = 0.3) => {
		if (isLayoutRunningRef.current) {
			// For animated simulation, we restart with higher energy
			logger.debug("graph", "Reheating animated layout", { targetAlpha });
			restartLayout(); // Restarts with full alpha=1 for strong reheat
		} else {
			// Start new layout if not running
			debouncedApplyLayout();
		}
	}, [restartLayout, debouncedApplyLayout]);

	// Debounced reheat to prevent rapid calls
	const debouncedReheat = useCallback((alpha = 0.3) => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}
		debounceTimerRef.current = setTimeout(() => {
			reheatLayout(alpha);
			debounceTimerRef.current = null;
		}, 500); // 500ms debounce to prevent excessive restarts
	}, [reheatLayout]);

	// Update force parameters during animation
	const updateParameters = useCallback((newParams: Partial<{
		linkDistance: number;
		linkStrength: number;
		chargeStrength: number;
		centerStrength: number;
		collisionRadius: number;
		collisionStrength: number;
		velocityDecay: number;
		alphaDecay: number;
	}>) => {
		if (isLayoutRunningRef.current && enabled && useAnimation && isWorkerReady) {
			// Update the worker with new parameters
			void updateAnimationParameters(newParams);
			logger.debug("graph", "Updating force parameters", { newParams });
		} else {
			logger.debug("graph", "Cannot update parameters - animation not running", {
				isRunning: isLayoutRunningRef.current,
				enabled,
				useAnimation,
				isWorkerReady,
			});
		}
	}, [enabled, useAnimation, isWorkerReady, updateAnimationParameters]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			stopLayout();
		};
	}, [stopLayout]);

	// Auto-start animation when graph loads (nodes added) and not already animating
	useEffect(() => {
		const currentNodeCount = getNodes().length;
		if (currentNodeCount > prevNodeCountRef.current &&
			currentNodeCount > 0 &&
			!isAnimating &&
			enabled &&
			useAnimation &&
			isWorkerReady) {
			// Auto-reheat/start initial simulation
			logger.debug("graph", "Auto-starting layout on graph load", { nodeCount: currentNodeCount });
			debouncedApplyLayout();
		}
		prevNodeCountRef.current = currentNodeCount;
	}, [getNodes, isAnimating, enabled, useAnimation, isWorkerReady, debouncedApplyLayout]);

	// Auto-sync positions with graph store when not animating (REMOVED - causing infinite loop)
	// This sync will be handled manually when needed to avoid React 19 + Zustand + Immer loops
	// useEffect(() => {
	//   if (!animationState.isAnimating) {
	//     positionTracking.syncWithGraphStore();
	//   }
	// }, [animationState.isAnimating, positionTracking]);

	return {
		// State
		isRunning: isLayoutRunningRef.current,
		isAnimating: animationState.isAnimating,
		isPaused: animationState.isPaused,
		progress: animationState.progress,
		alpha: animationState.alpha,
		iteration: animationState.iteration,
		fps: animationState.fps,
		isWorkerReady,

		// Actions
		applyLayout: applyAnimatedLayout,
		stopLayout,
		pauseLayout,
		resumeLayout,
		restartLayout,
		reheatLayout: debouncedReheat, // Use debounced version
		updateParameters,

		// Computed properties
		canPause: isLayoutRunningRef.current && !animationState.isPaused,
		canResume: isLayoutRunningRef.current && animationState.isPaused,
		canStop: isLayoutRunningRef.current,
		canRestart: !isLayoutRunningRef.current,
	};
}
