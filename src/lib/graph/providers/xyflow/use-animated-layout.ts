/**
 * Animated Layout Hook for ReactFlow
 * Integrates Web Worker-based animated force simulation with existing layout system
 */

import { useCallback, useEffect, useRef, useMemo } from "react";
import { useReactFlow } from "@xyflow/react";
import type { EntityType } from "../../types";
import type { GraphEdge, GraphNode } from "@/lib/graph/types";
import { logger } from "@/lib/logger";
import { useGraphStore } from "@/stores/graph-store";
import { useLayoutStore } from "@/stores/layout-store";
import { useAnimatedGraphStore } from "@/stores/animated-graph-store";
import { useBackgroundWorker } from "@/hooks/use-unified-background-worker";
import { localEventBus, GraphEventType } from "@/lib/graph/events";
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
		getAnimatedPositions: useAnimatedGraphStore.getState().getAnimatedPositions,
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
	const reheatLayoutRef = useRef<(() => void) | null>(null);

	// Animated force simulation hook
	const {
		startAnimation,
		stopAnimation,
		pauseAnimation,
		resumeAnimation,
		updateParameters: updateAnimationParameters,
		reheatAnimation,
		updateSimulationLinks,
		updateSimulationNodes,
		animationState: hookAnimationState,
		isWorkerReady,
	} = useBackgroundWorker({
		onPositionUpdate: useCallback((positions: NodePosition[]) => {

			// Update animated store with new positions
			storeMethodsRef.current.updateAnimatedPositions(positions);

			// Update ReactFlow nodes with new positions
			setNodes((currentNodes) => {

				return currentNodes.map((node) => {
					const position = positions.find((p) => p.id === node.id);
					if (position) {
						return {
							...node,
							position: { x: position.x, y: position.y },
						};
					}
					return node;
				});
			});

			onLayoutChange?.();
		}, [setNodes, onLayoutChange]),

		onAnimationComplete: useCallback((positions: NodePosition[], stats: { totalIterations: number; finalAlpha: number; reason: string }) => {
			// Update final positions in store
			storeMethodsRef.current.updateStaticPositions(positions);
			const statsWithDuration = { ...stats, duration: Date.now() };
			storeMethodsRef.current.completeAnimation(statsWithDuration);

			// CRITICAL: Apply final positions to React Flow nodes to prevent reset
			setNodes((currentNodes) => {
				console.log("🏁 FINAL POSITION UPDATE", {
					positionsLength: positions.length,
					nodesLength: currentNodes.length,
					firstFinalPosition: positions[0]
				});

				return currentNodes.map((node) => {
					const finalPosition = positions.find((p) => p.id === node.id);
					if (finalPosition) {
						console.log("🎯 SETTING FINAL POSITION", {
							nodeId: node.id,
							finalPosition: { x: finalPosition.x, y: finalPosition.y }
						});
						return {
							...node,
							position: { x: finalPosition.x, y: finalPosition.y },
						};
					}
					return node;
				});
			});

			// Apply positions to graph store for persistence
			storeMethodsRef.current.applyPositionsToGraphStore();

			// Auto-pin disabled to allow force parameter changes to work immediately
			// Users can manually pin specific nodes if desired
			logger.debug("graph", "Auto-pin disabled - nodes remain free to move on future parameter changes");

			// Auto-fit view removed - not currently used

			isLayoutRunningRef.current = false;
			logger.debug("graph", "Animated layout completed", {
				...stats,
				autoPinEnabled: autoPinOnLayoutStabilization,
			});
		}, [autoPinOnLayoutStabilization, setNodes]),

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


		// TEMP SAFETY CHECK: Don't start animation if React Flow has too few nodes
		if (nodes.length < 5) {
			console.log("⚠️ SKIPPING ANIMATION: React Flow has too few nodes", {
				reactFlowNodes: nodes.length,
				reactFlowEdges: edges.length,
				message: "Waiting for React Flow to sync with graph store"
			});
			return { animatedNodes: [], animatedLinks: [] };
		}

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

		const previousPositions = storeMethodsRef.current.getAnimatedPositions?.() || [];
		if (previousPositions.length > 0) {
			const positionMap = new Map(previousPositions.map((pos) => [pos.id, pos]));
			animatedNodes.forEach((node) => {
				const prior = positionMap.get(node.id);
				if (prior) {
					node.x = prior.x;
					node.y = prior.y;
					if (typeof node.fx === "number") node.fx = prior.x;
					if (typeof node.fy === "number") node.fy = prior.y;
				}
			});
		}

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
			logger.debug("graph", "Animated layout already running, forcing restart for manual trigger");
			// For manual triggers, we want to restart rather than skip
			// Stop current animation first
			void stopAnimation();
			isLayoutRunningRef.current = false;
			storeMethodsRef.current.resetAnimation();

			// Small delay to ensure cleanup, then continue with new animation
			setTimeout(() => {
				// Continue with the animation start logic below
				const { animatedNodes: retryAnimatedNodes, animatedLinks: retryAnimatedLinks } = prepareAnimationData();
				if (retryAnimatedNodes.length === 0) {
					logger.debug("graph", "No nodes for retried animated layout");
					return;
				}

				// Use the same config and start logic
				const retryConfig: ForceSimulationConfig = {
					...DEFAULT_FORCE_PARAMS,
					alphaDecay: 0.005,  // Much slower decay (was 0.03)
					velocityDecay: 0.05, // Less friction (was 0.1)
					maxIterations: 2000, // More iterations (was 1000)
				};

				const layoutOptions = currentLayout.options;
				const retryEnhancedConfig = {
					...retryConfig,
					linkDistance: layoutOptions?.linkDistance || DEFAULT_FORCE_PARAMS.linkDistance,
					linkStrength: layoutOptions?.linkStrength || DEFAULT_FORCE_PARAMS.linkStrength,
					chargeStrength: layoutOptions?.chargeStrength || DEFAULT_FORCE_PARAMS.chargeStrength,
					centerStrength: layoutOptions?.centerStrength || DEFAULT_FORCE_PARAMS.centerStrength,
					collisionRadius: layoutOptions?.collisionRadius || DEFAULT_FORCE_PARAMS.collisionRadius,
					collisionStrength: layoutOptions?.collisionStrength || DEFAULT_FORCE_PARAMS.collisionStrength,
					velocityDecay: layoutOptions?.velocityDecay || DEFAULT_FORCE_PARAMS.velocityDecay,
					alphaDecay: layoutOptions?.alphaDecay || retryConfig.alphaDecay,
					seed: layoutOptions?.seed || 0,
				};

				isLayoutRunningRef.current = true;
				storeMethodsRef.current.startAnimation();

				const retryPinnedNodeSet = new Set(Object.keys(pinnedNodes).filter(key => pinnedNodes[key]));

				console.log("🔄 RESTARTING ANIMATION AFTER CLEANUP", {
					animatedNodesLength: retryAnimatedNodes.length,
					animatedLinksLength: retryAnimatedLinks.length,
					pinnedNodeSetSize: retryPinnedNodeSet.size,
					retryEnhancedConfig,
				});

				void startAnimation({
					nodes: retryAnimatedNodes,
					links: retryAnimatedLinks,
					config: retryEnhancedConfig,
					pinnedNodes: retryPinnedNodeSet,
				});

			}, 100);

			return; // Exit early for restart case
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
		// TEMP: Override with slower parameters for visible animation
		const config: ForceSimulationConfig = {
			...DEFAULT_FORCE_PARAMS,
			alphaDecay: 0.005,  // Much slower decay (was 0.03)
			velocityDecay: 0.05, // Less friction (was 0.1)
			maxIterations: 2000, // More iterations (was 1000)
		};

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

		console.log("✅ startAnimation CALLED SUCCESSFULLY");
		logger.debug("graph", "startAnimation called successfully");
	}, [
		enabled,
		useAnimation,
		isWorkerReady,
		prepareAnimationData,
		pinnedNodes,
		currentLayout,
		startAnimation,
		reheatAnimation,
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
	const reheatLayout = useCallback((targetAlpha = 1.0) => {
		console.log("🔥 REHEAT ATTEMPT:", {
			isLayoutRunning: isLayoutRunningRef.current,
			enabled,
			useAnimation,
			isWorkerReady,
			canReheat: isLayoutRunningRef.current && enabled && useAnimation && isWorkerReady
		});

		if (isLayoutRunningRef.current && enabled && useAnimation && isWorkerReady) {
			console.log("🔥 REHEAT CONDITION PASSED! About to call reheat...");
			// CRITICAL: Use graph store data directly instead of ReactFlow's potentially stale getters
			// This ensures we get the most up-to-date nodes and edges including ones just added
			const storeNodes = useGraphStore.getState().nodes;
			const storeEdges = useGraphStore.getState().edges;

			// For reheat, use all nodes in the store (not just visible ones)
			// since we want to reheat the simulation that's currently running
			const allNodes = Object.values(storeNodes);
			const validNodes = allNodes.filter((node): node is GraphNode => node != null);
			const allEdges = Object.values(storeEdges);
			const validEdges = allEdges.filter((edge): edge is GraphEdge => edge != null);

			if (validNodes.length === 0) {
				console.log("🔥 REHEAT FAILED: No nodes in store", {
					storeNodeCount: Object.keys(storeNodes).length
				});
				logger.debug("graph", "No nodes for reheat layout");
				return;
			}

			// Convert graph store data to animation format (same as prepareAnimationData but with fresh data)
			function isEntityType(value: unknown): value is EntityType {
				return typeof value === "string" &&
					["works", "authors", "sources", "institutions", "publishers", "funders", "topics", "concepts"].includes(value);
			}

			const animatedNodes: ForceSimulationNode[] = validNodes.map((node) => {
				const isPinned = pinnedNodes[node.id] ?? false;
				const entityType = isEntityType(node.type) ? node.type : undefined;
				return {
					id: node.id,
					type: entityType,
					x: node.position.x,
					y: node.position.y,
					fx: isPinned ? node.position.x : undefined,
					fy: isPinned ? node.position.y : undefined,
				};
			});

			const animatedStorePositions = storeMethodsRef.current.getAnimatedPositions?.() || [];
			if (animatedStorePositions.length > 0) {
				const positionMap = new Map(animatedStorePositions.map((pos) => [pos.id, pos]));
				animatedNodes.forEach((node) => {
					const prior = positionMap.get(node.id);
					if (prior) {
						node.x = prior.x;
						node.y = prior.y;
						if (typeof node.fx === "number") node.fx = prior.x;
						if (typeof node.fy === "number") node.fy = prior.y;
					}
				});
			}

			// Convert edges without dropping intra-graph relationships
			const animatedLinks: ForceSimulationLink[] = validEdges.map((edge) => ({
				id: edge.id,
				source: edge.source,
				target: edge.target,
			}));

			// Get current configuration
			const layoutOptions = currentLayout.options;
			const config: ForceSimulationConfig = {
				...DEFAULT_FORCE_PARAMS,
				maxIterations: 2000,
				linkDistance: layoutOptions?.linkDistance || DEFAULT_FORCE_PARAMS.linkDistance,
				linkStrength: layoutOptions?.linkStrength || DEFAULT_FORCE_PARAMS.linkStrength,
				chargeStrength: layoutOptions?.chargeStrength || DEFAULT_FORCE_PARAMS.chargeStrength,
				centerStrength: layoutOptions?.centerStrength || DEFAULT_FORCE_PARAMS.centerStrength,
				collisionRadius: layoutOptions?.collisionRadius || DEFAULT_FORCE_PARAMS.collisionRadius,
				collisionStrength: layoutOptions?.collisionStrength || DEFAULT_FORCE_PARAMS.collisionStrength,
				velocityDecay: layoutOptions?.velocityDecay || 0.05,
				alphaDecay: layoutOptions?.alphaDecay || 0.005,
				seed: layoutOptions?.seed || 0,
			};

			const pinnedNodeSet = new Set(Object.keys(pinnedNodes).filter(key => pinnedNodes[key]));

			// Debug edge filtering
			const filteredOutEdges = validEdges.filter((edge) => {
				const sourceExists = animatedNodes.find((n) => n.id === edge.source);
				const targetExists = animatedNodes.find((n) => n.id === edge.target);
				return !sourceExists || !targetExists;
			});

			console.log("🔥 REHEAT CALLED!", {
				targetAlpha,
				nodeCount: animatedNodes.length,
				linkCount: animatedLinks.length,
				pinnedCount: pinnedNodeSet.size,
				storeNodeCount: Object.keys(storeNodes).length,
				storeEdgeCount: Object.keys(storeEdges).length,
				allNodeCount: validNodes.length,
				allEdgeCount: validEdges.length,
				filteredOutEdges: filteredOutEdges.length,
				filteredOutDetails: filteredOutEdges.map(edge => ({ id: edge.id, source: edge.source, target: edge.target })),
				edgeDetails: animatedLinks.map(link => ({ id: link.id, source: link.source, target: link.target }))
			});

			logger.debug("graph", "Reheating animated layout with fresh graph store data", {
				targetAlpha,
				nodeCount: animatedNodes.length,
				linkCount: animatedLinks.length,
				pinnedCount: pinnedNodeSet.size,
				storeNodeCount: Object.keys(storeNodes).length,
				storeEdgeCount: Object.keys(storeEdges).length,
				allNodeCount: allNodes.length,
				allEdgeCount: allEdges.length
			});

			console.log("🔥 CALLING reheatAnimation with:", {
				nodeCount: animatedNodes.length,
				linkCount: animatedLinks.length,
				targetAlpha
			});

			void reheatAnimation({
				nodes: animatedNodes,
				links: animatedLinks,
				config,
				pinnedNodes: pinnedNodeSet,
				alpha: targetAlpha
			});
		} else {
			// Start new layout if not running
			debouncedApplyLayout();
		}
	}, [enabled, useAnimation, isWorkerReady, currentLayout, pinnedNodes, reheatAnimation, debouncedApplyLayout]);

	// Update ref for use in event handlers
	useEffect(() => {
		reheatLayoutRef.current = reheatLayout;
	}, [reheatLayout]);

	// Use the same localEventBus instance as the graph store
	const eventBus = localEventBus;

	// Function to handle node addition and trigger immediate node update
	const handleNodeAddition = useCallback((eventType: string, addedNodeCount?: number) => {
		console.log(`🧩 ${eventType} node event received!`, {
			addedNodeCount,
			isLayoutRunning: isLayoutRunningRef.current,
			enabled,
			useAnimation,
			isWorkerReady
		});

		if (!enabled || !useAnimation || !isWorkerReady) {
			console.log("🧩 Skipping node update - conditions not met", {
				enabled,
				useAnimation,
				isWorkerReady
			});
			return;
		}

		const storeState = useGraphStore.getState();
		const storeNodes = storeState.nodes;
		const pinnedState = storeState.pinnedNodes;
		const allNodes = Object.values(storeNodes).filter((node): node is GraphNode => node != null);

		if (allNodes.length === 0) {
			console.log("🧩 No nodes available in store for node update");
			return;
		}

		if (!isLayoutRunningRef.current) {
			console.log(`🧩 STARTING/REHEATING due to ${eventType} - simulation not running`, {
				nodeCount: allNodes.length
			});
			setTimeout(() => {
				reheatLayoutRef.current?.();
			}, 0);
			return;
		}

		const pinnedIds = Object.keys(pinnedState).filter(id => pinnedState[id]);
		const animatedNodes: ForceSimulationNode[] = allNodes.map(node => {
			const pinned = pinnedState[node.id] ?? false;
			const x = node.position?.x ?? 0;
			const y = node.position?.y ?? 0;
			return {
				id: node.id,
				type: node.type,
				x,
				y,
				fx: pinned ? x : undefined,
				fy: pinned ? y : undefined,
			};
		});

		void updateSimulationNodes({
			nodes: animatedNodes,
			pinnedNodes: pinnedIds,
			alpha: 1.0
		});
	}, [enabled, useAnimation, isWorkerReady, updateSimulationNodes]);

	// Function to handle edge addition and trigger immediate link update
	const handleEdgeAddition = useCallback((eventType: string, newEdgeCount?: number) => {
		console.log(`🔗 ${eventType} event received!`, {
			newEdgeCount,
			isLayoutRunning: isLayoutRunningRef.current,
			enabled,
			useAnimation,
			isWorkerReady
		});

		if (enabled && useAnimation && isWorkerReady) {
			const storeNodes = useGraphStore.getState().nodes;
			const storeEdges = useGraphStore.getState().edges;
			const allEdges = Object.values(storeEdges).filter((edge): edge is GraphEdge => edge != null);

			// If simulation is running, use updateSimulationLinks for immediate inclusion
			if (isLayoutRunningRef.current) {
				console.log(`🔗 UPDATING LINKS IMMEDIATELY due to ${eventType} - simulation is running`, {
					newEdgeCount,
					edgeCount: allEdges.length
				});

				// Convert edges to simulation format
				const animatedLinks: ForceSimulationLink[] = allEdges.map((edge) => ({
					id: edge.id,
					source: edge.source,
					target: edge.target,
				}));

				// Use updateSimulationLinks to immediately include new links in current simulation
				void updateSimulationLinks({
					links: animatedLinks,
					alpha: 1.0  // Full alpha reset
				});
			} else if (Object.keys(storeNodes).length > 0 && allEdges.length > 0) {
				console.log(`🔗 STARTING ANIMATION due to ${eventType} - simulation not running but we have nodes and edges`, {
					nodeCount: Object.keys(storeNodes).length,
					edgeCount: allEdges.length,
					newEdgeCount
				});

				// Start simulation with all current edges (including the new ones)
				setTimeout(() => {
					reheatLayout(1.0);
				}, 0);
			} else {
				console.log(`🔗 Insufficient nodes/edges for simulation`, {
					nodeCount: Object.keys(storeNodes).length,
					edgeCount: allEdges.length,
					newEdgeCount
				});
			}
		} else {
			console.log(`🔗 Skipping update - conditions not met`, {
					enabled,
					useAnimation,
					isWorkerReady
				});
		}
	}, [enabled, useAnimation, isWorkerReady, reheatLayout, updateSimulationLinks]);

	// Debounced reheat to prevent rapid calls
	const debouncedReheat = useCallback((alpha = 1.0) => {
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

	// Initialize clean state on mount
	useEffect(() => {
		// Reset layout running state to ensure clean start
		isLayoutRunningRef.current = false;
		logger.debug("graph", "useAnimatedLayout initialized with clean state");
	}, []);

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

	// Listen for node addition events to trigger immediate node updates
	useEffect(() => {
		console.log("🧩 LISTENER: Setting up node addition listeners");
		const unsubscribeSingle = eventBus.on(GraphEventType.ANY_NODE_ADDED, () => {
			handleNodeAddition("ANY_NODE_ADDED", 1);
		});
		const unsubscribeBulk = eventBus.on(GraphEventType.BULK_NODES_ADDED, (event) => {
			let nodeCount: number | undefined;
			if (event && typeof event === "object" && "payload" in event) {
				const payload = (event as { payload?: unknown }).payload;
				if (payload && typeof payload === "object" && "nodes" in payload && Array.isArray((payload as { nodes?: unknown[] }).nodes)) {
					nodeCount = (payload as { nodes: unknown[] }).nodes.length;
				}
			}
			handleNodeAddition("BULK_NODES_ADDED", nodeCount);
		});

		return () => {
			unsubscribeSingle();
			unsubscribeBulk();
		};
	}, [eventBus, handleNodeAddition]);

	// Listen for BULK_EDGES_ADDED events (now after reheatLayout is defined)
	useEffect(() => {
		console.log("🔗 LISTENER: Setting up BULK_EDGES_ADDED listener");
		const unsubscribe = eventBus.on(GraphEventType.BULK_EDGES_ADDED, (event) => {
			console.log("🔗 LISTENER: BULK_EDGES_ADDED event received!", event);
			const payload = event.payload;
			const edgeCount = typeof payload === "object" && payload && "edges" in payload && Array.isArray((payload as { edges?: unknown }).edges)
				? (payload as { edges: unknown[] }).edges.length
				: 0;
			handleEdgeAddition("BULK_EDGES_ADDED", edgeCount);
		});
		console.log("🔗 LISTENER: BULK_EDGES_ADDED listener registered");

		// Check for existing edges when listener is first set up
		const currentEdges = useGraphStore.getState().edges;
		const existingEdgeCount = Object.keys(currentEdges).length;
		console.log("🔗 LISTENER: Checking for existing edges on setup", { existingEdgeCount });
		if (existingEdgeCount > 0) {
			console.log("🔗 LISTENER: Found existing edges, triggering handleEdgeAddition");
			handleEdgeAddition("EXISTING_EDGES_ON_SETUP", existingEdgeCount);
		}

		return unsubscribe;
	}, [eventBus, handleEdgeAddition]);

	// Listen for ANY_EDGE_ADDED events (single edge additions)
	useEffect(() => {
		console.log("🔗 LISTENER: Setting up ANY_EDGE_ADDED listener");
		const unsubscribe = eventBus.on(GraphEventType.ANY_EDGE_ADDED, (event) => {
			console.log("🔗 LISTENER: ANY_EDGE_ADDED event received!", event);
			handleEdgeAddition("ANY_EDGE_ADDED", 1);
		});
		console.log("🔗 LISTENER: ANY_EDGE_ADDED listener registered");
		return unsubscribe;
	}, [eventBus, handleEdgeAddition]);

	// Listen for FORCE_LAYOUT_RESTART events (strong reheat for settled simulations)
	useEffect(() => {
		console.log("🔥 LISTENER: Setting up FORCE_LAYOUT_RESTART listener");
		const unsubscribe = eventBus.on(GraphEventType.FORCE_LAYOUT_RESTART, (event) => {
			console.log("🔥 LISTENER: FORCE_LAYOUT_RESTART event received!", event);
			const payload = event.payload;
			const alpha = typeof payload === "object" && payload && "alpha" in payload
				? Number((payload as { alpha?: unknown }).alpha) || 1.0
				: 1.0;
			const reason = typeof payload === "object" && payload && "reason" in payload
				? String((payload as { reason?: unknown }).reason) || "force-restart"
				: "force-restart";

			console.log("🔥 LISTENER: Forcing strong layout reheat", { alpha, reason });
			reheatLayout(alpha);
		});
		console.log("🔥 LISTENER: FORCE_LAYOUT_RESTART listener registered");
		return unsubscribe;
	}, [eventBus, reheatLayout]);

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
