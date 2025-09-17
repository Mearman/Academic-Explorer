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
import { useAnimatedForceSimulation } from "@/hooks/use-animated-force-simulation";
import { FIT_VIEW_PRESETS } from "../../constants";
import { DEFAULT_FORCE_PARAMS } from "../../force-params";

// Import the position type
interface NodePosition {
  id: string;
  x: number;
  y: number;
}

// Extended node interface for animated simulation
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
		fitViewAfterLayout = true,
		useAnimation = true,
	} = options;

	const { getNodes, getEdges, setNodes, fitView } = useReactFlow();

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

	// Animated force simulation hook
	const {
		startAnimation,
		stopAnimation,
		pauseAnimation,
		resumeAnimation,
		updateParameters: updateAnimationParameters,
		animationState: hookAnimationState,
		performanceStats,
		getOptimalConfig,
		isWorkerReady,
	} = useAnimatedForceSimulation({
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

		onComplete: useCallback((positions: NodePosition[], stats: { totalIterations: number; finalAlpha: number; reason: string }) => {
			// Update final positions in store
			storeMethodsRef.current.updateStaticPositions(positions);
			const statsWithDuration = { ...stats, duration: Date.now() };
			storeMethodsRef.current.completeAnimation(statsWithDuration);

			// Apply positions to graph store for persistence
			storeMethodsRef.current.applyPositionsToGraphStore();

			// Auto-pin disabled to allow force parameter changes to work immediately
			// Users can manually pin specific nodes if desired
			logger.debug("graph", "Auto-pin disabled - nodes remain free to move on future parameter changes");

			// Auto-fit view if enabled
			if (fitViewAfterLayout) {
				setTimeout(() => {
					void fitView(FIT_VIEW_PRESETS.DEFAULT);
					logger.info("graph", "Auto-fitted view after animated layout completion");
				}, 100);
			}

			isLayoutRunningRef.current = false;
			logger.info("graph", "Animated layout completed", {
				...stats,
				autoPinEnabled: autoPinOnLayoutStabilization,
			});
		}, [fitViewAfterLayout, fitView, autoPinOnLayoutStabilization]),

		onError: useCallback((error: string) => {
			logger.error("graph", "Animated layout error", { error });
			isLayoutRunningRef.current = false;
			storeMethodsRef.current.resetAnimation();
		}, []),
	});

	// Sync animation state between hook and store using refs to prevent infinite loops
	useEffect(() => {
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

		const animatedNodes: AnimatedNode[] = nodes.map((node) => {
			const isPinned = pinnedNodes[node.id] ?? false;
			return {
				id: node.id,
				type: node.data.entityType as EntityType | undefined,
				x: node.position.x,
				y: node.position.y,
				fx: isPinned ? node.position.x : undefined,
				fy: isPinned ? node.position.y : undefined,
			};
		});

		const animatedLinks: AnimatedLink[] = edges
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
		if (!enabled || !useAnimation || !isWorkerReady) {
			logger.info("graph", "Animated layout skipped", {
				enabled,
				useAnimation,
				isWorkerReady,
			});
			return;
		}

		if (isLayoutRunningRef.current) {
			logger.warn("graph", "Animated layout already running, skipping");
			return;
		}

		const { animatedNodes, animatedLinks } = prepareAnimationData();

		if (animatedNodes.length === 0) {
			logger.info("graph", "No nodes for animated layout");
			return;
		}

		// Get optimal configuration based on graph size
		const config = getOptimalConfig(animatedNodes.length);

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

		logger.info("graph", "Starting animated force layout", {
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
		startAnimation(animatedNodes, animatedLinks, enhancedConfig, pinnedNodeSet);
	}, [
		enabled,
		useAnimation,
		isWorkerReady,
		prepareAnimationData,
		getOptimalConfig,
		pinnedNodes,
		currentLayout,
		startAnimation,
		autoPinOnLayoutStabilization,
	]);

	// Stop layout
	const stopLayout = useCallback(() => {
		if (isLayoutRunningRef.current) {
			stopAnimation();
			isLayoutRunningRef.current = false;
			storeMethodsRef.current.resetAnimation();
			logger.info("graph", "Animated layout stopped");
		}
	}, [stopAnimation]);

	// Pause layout
	const pauseLayout = useCallback(() => {
		if (isLayoutRunningRef.current && !animationState.isPaused) {
			pauseAnimation();
			logger.info("graph", "Animated layout paused");
		}
	}, [pauseAnimation, animationState.isPaused]);

	// Resume layout
	const resumeLayout = useCallback(() => {
		if (isLayoutRunningRef.current && animationState.isPaused) {
			resumeAnimation();
			logger.info("graph", "Animated layout resumed");
		}
	}, [resumeAnimation, animationState.isPaused]);

	// Restart layout
	const restartLayout = useCallback(() => {
		stopLayout();
		setTimeout(() => {
			applyAnimatedLayout();
		}, 100);
	}, [stopLayout, applyAnimatedLayout]);

	// Reheat simulation (add energy to running simulation)
	const reheatLayout = useCallback((alpha = 0.3) => {
		if (isLayoutRunningRef.current) {
			// For animated simulation, we restart with higher energy
			logger.info("graph", "Reheating animated layout", { alpha });
			restartLayout();
		} else {
			// Start new layout if not running
			applyAnimatedLayout();
		}
	}, [restartLayout, applyAnimatedLayout]);

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
			updateAnimationParameters(newParams);
			logger.info("graph", "Updating force parameters", { newParams });
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
		performanceStats,
		isWorkerReady,

		// Actions
		applyLayout: applyAnimatedLayout,
		stopLayout,
		pauseLayout,
		resumeLayout,
		restartLayout,
		reheatLayout,
		updateParameters,

		// Computed properties
		canPause: isLayoutRunningRef.current && !animationState.isPaused,
		canResume: isLayoutRunningRef.current && animationState.isPaused,
		canStop: isLayoutRunningRef.current,
		canRestart: !isLayoutRunningRef.current,
	};
}