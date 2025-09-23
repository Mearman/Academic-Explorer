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
import { useUnifiedExecutionWorker } from "@/hooks/use-unified-execution-worker";
import { localEventBus, GraphEventType } from "@/lib/graph/events";
import { z } from "zod";

// Zod schemas for event payload validation
const NodesPayloadSchema = z.object({
	nodes: z.array(z.unknown()).optional(),
});

const EdgesPayloadSchema = z.object({
	edges: z.array(z.unknown()).optional(),
});

const ForceRestartPayloadSchema = z.object({
	alpha: z.unknown().optional(),
	reason: z.unknown().optional(),
});

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

	const { getNodes, getEdges, setNodes, getViewport, setViewport } = useReactFlow();
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
	const reheatLayoutRef = useRef<((targetAlpha?: number) => void) | null>(null);

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
	} = useUnifiedExecutionWorker({
 		onPositionUpdate: useCallback((positions: NodePosition[]) => {
 			// DEBUG: Log position updates to see if callback is working
 			console.log('🎯 LAYOUT onPositionUpdate called:', {
 				positionCount: positions.length,
 				samplePositions: positions.slice(0, 3).map(p => ({
 					id: p.id,
 					x: Number(p.x.toFixed(2)),
 					y: Number(p.y.toFixed(2))
 				})),
 				timestamp: Date.now(),
 				firstPositionChange: positions[0] ? {
 					id: positions[0].id,
 					x: positions[0].x,
 					y: positions[0].y
 				} : null
 			});

			// Update animated store with new positions
			storeMethodsRef.current.updateAnimatedPositions(positions);

 			// Update ReactFlow nodes with new positions - FORCE UPDATE FIX
 			setNodes((currentNodes) => {
 				console.log('🔄 LAYOUT setNodes called:', {
 					currentNodesCount: currentNodes.length,
 					positionsCount: positions.length,
 					sampleCurrentNode: currentNodes[0] ? {
 						id: currentNodes[0].id,
 						position: currentNodes[0].position
 					} : null
 				});

				const updatedNodes = currentNodes.map((node) => {
					const position = positions.find((p) => p.id === node.id);
					if (position) {
						const oldPos = { x: node.position.x, y: node.position.y };
						const newPos = { x: position.x, y: position.y };
						const moved = Math.abs(newPos.x - oldPos.x) > 0.1 || Math.abs(newPos.y - oldPos.y) > 0.1;

						if (moved) {
							console.log('📍 Node position change:', {
								id: node.id,
								from: oldPos,
								to: newPos,
								distance: Math.sqrt(Math.pow(newPos.x - oldPos.x, 2) + Math.pow(newPos.y - oldPos.y, 2)).toFixed(2)
							});
						}

						// CRITICAL DEBUG: Always log the actual position values being set
						if (node.id === positions[0]?.id) {
							console.log('🔍 CRITICAL - First node position details:', {
								nodeId: node.id,
								originalNodePosition: node.position,
								calculatedNewPosition: newPos,
								positionFromSimulation: position,
								willUpdate: !!position
							});
						}

						// FIX: Force ReactFlow to recognize position changes by creating new objects
						// ReactFlow may not detect position changes if objects are referentially equal
						return {
							...node,
							position: { x: position.x, y: position.y }, // Always create new position object
							// Force re-render by updating a changing property
							data: {
								...node.data,
								_animationFrame: Date.now(), // Unique value to force updates
							}
						};
					}
					return node;
				});

				return updatedNodes;
			});

 			// ENHANCED FIX: Force ReactFlow to process position changes by triggering multiple refresh mechanisms
 			// This ensures ReactFlow's internal transform calculations are refreshed for React 19
 			setTimeout(() => {
 				console.log('🔧 REACTFLOW ENHANCED FIX: Triggering refresh mechanisms');
 				try {
 					// Method 1: Viewport micro-adjustment
 					const currentViewport = getViewport();
 					console.log('🔧 Viewport before adjustment:', currentViewport);
					setViewport({
						x: currentViewport.x + 0.001,
						y: currentViewport.y + 0.001,
						zoom: currentViewport.zoom
					});
					setTimeout(() => setViewport(currentViewport), 1);

					// Method 2: Force ReactFlow to recalculate by triggering fitView
					setTimeout(() => {
						try {
							const reactFlowInstance = (window as any).__reactFlowInstance__;
							if (reactFlowInstance && reactFlowInstance.fitView) {
								reactFlowInstance.fitView({ padding: 0, duration: 0 });
							}
						} catch (e) {
							// Ignore fitView errors
						}
					}, 5);

					// Method 3: Force DOM re-calculation by triggering reflow
					setTimeout(() => {
						const nodes = document.querySelectorAll('.react-flow__node');
						nodes.forEach(node => {
							if (node instanceof HTMLElement) {
								// Force reflow by reading offsetHeight (doesn't break transforms)
								const _ = node.offsetHeight;
								// Also force style recalculation
								node.style.willChange = 'transform';
								requestAnimationFrame(() => {
									node.style.willChange = 'auto';
								});
							}
						});
					}, 10);

				} catch (error) {
					console.warn('ReactFlow refresh failed:', error);
				}
			}, 1);

			onLayoutChange?.();
		}, [setNodes, onLayoutChange, getViewport, setViewport]),

		onAnimationComplete: useCallback((positions: NodePosition[], stats: { totalIterations: number; finalAlpha: number; reason: string }) => {
			// Update final positions in store
			storeMethodsRef.current.updateStaticPositions(positions);
			const statsWithDuration = { ...stats, duration: Date.now() };
			storeMethodsRef.current.completeAnimation(statsWithDuration);

			// CRITICAL: Apply final positions to React Flow nodes to prevent reset
			setNodes((currentNodes) => {
				logger.debug("graph", "Final position update", {
					positionsLength: positions.length,
					nodesLength: currentNodes.length,
					firstFinalPosition: positions[0]
				});

				return currentNodes.map((node) => {
					const finalPosition = positions.find((p) => p.id === node.id);
					if (finalPosition) {
						logger.debug("graph", "Setting final position", {
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


		// TEMP SAFETY CHECK: Don't start animation if React Flow has no nodes
		// Reduced threshold to 1 to allow tests with minimal nodes to pass
		if (nodes.length < 1) {
			logger.debug("graph", "Skipping animation - no nodes available", {
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

			// TEMP: Add chaos for dramatic animation - random starting positions
			const chaos = Math.random() * 200 - 100; // Random offset ±100px

			return {
				id: node.id,
				type: entityType,
				x: node.position.x + chaos,
				y: node.position.y + chaos,
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

				logger.debug("graph", "Restarting animation after cleanup", {
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
		// TEMP: PREVENT PREMATURE CONVERGENCE - keep simulation active longer
		const config: ForceSimulationConfig = {
			...DEFAULT_FORCE_PARAMS,
			linkDistance: 150,
			linkStrength: 0.15,       // Slightly weaker to prevent instant equilibrium
			chargeStrength: -1500,    // Moderate repulsion
			centerStrength: 0.015,    // Moderate centering
			collisionRadius: 80,
			collisionStrength: 1.0,
			alphaDecay: 0.0005,       // MUCH slower alpha decay (was 0.002)
			velocityDecay: 0.4,       // More friction to prevent oscillation (was 0.02)
			maxIterations: 5000,      // Many more iterations before giving up
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
		logger.debug("graph", "Reheat attempt", {
			isLayoutRunning: isLayoutRunningRef.current,
			enabled,
			useAnimation,
			isWorkerReady,
			canReheat: isLayoutRunningRef.current && enabled && useAnimation && isWorkerReady
		});

		if (isLayoutRunningRef.current && enabled && useAnimation && isWorkerReady) {
			logger.debug("graph", "Reheat condition passed - calling reheat");
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
				logger.debug("graph", "Reheat failed - no nodes in store", {
					storeNodeCount: Object.keys(storeNodes).length
				});
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

			logger.debug("graph", "Reheat called with data", {
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

			logger.debug("graph", "Calling reheatAnimation", {
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
 	// Use ref to avoid re-registering event listeners on every render
 	const handleNodeAdditionRef = useRef<((eventType: string, addedNodeCount?: number) => void) | null>(null);
 	handleNodeAdditionRef.current = (eventType: string, addedNodeCount?: number) => {
 		logger.debug("graph", `${eventType} node event received`, {
 			addedNodeCount,
 			isLayoutRunning: isLayoutRunningRef.current,
 			enabled,
 			useAnimation,
 			isWorkerReady
 		});

 		if (!enabled || !useAnimation || !isWorkerReady) {
 			logger.debug("graph", "Skipping node update - conditions not met", {
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
 			logger.debug("graph", "No nodes available in store for node update");
 			return;
 		}

 		if (!isLayoutRunningRef.current) {
 			logger.debug("graph", `Starting/reheating due to ${eventType} - simulation not running`, {
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
 	};

 	// Function to handle edge addition and trigger immediate link update
 	// Use ref to avoid re-registering event listeners on every render
 	const handleEdgeAdditionRef = useRef<((eventType: string, newEdgeCount?: number) => void) | null>(null);
 	const edgeAdditionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

 	handleEdgeAdditionRef.current = (eventType: string, newEdgeCount?: number) => {
 		// Debounce edge additions to prevent rapid consecutive calls
 		if (edgeAdditionTimeoutRef.current) {
 			clearTimeout(edgeAdditionTimeoutRef.current);
 		}

 		edgeAdditionTimeoutRef.current = setTimeout(() => {
 			edgeAdditionTimeoutRef.current = null;
 		logger.debug("graph", `${eventType} edge event received`, {
 			newEdgeCount,
 			enabled,
 			useAnimation,
 			isWorkerReady
 		});

 		if (enabled && useAnimation && isWorkerReady) {
 			const storeNodes = useGraphStore.getState().nodes;
 			const storeEdges = useGraphStore.getState().edges;
 			const allEdges = Object.values(storeEdges).filter((edge): edge is GraphEdge => edge != null);

 			// If simulation is running, use updateSimulationLinks for immediate inclusion
 			// Use store state instead of ref to get accurate running status
 			const animatedState = useAnimatedGraphStore.getState();
 			const isSimulationRunning = animatedState.isAnimating && !animatedState.isPaused && animatedState.alpha > 0.001;

 			// FIXED: Use reheat when simulation exists (even if settled) rather than only when actively running
 			// This ensures new edges are properly incorporated into existing layouts
 			const hasActiveSimulation = animatedState.isAnimating && !animatedState.isPaused;

 			// DEBUG: Log simulation state for debugging edge addition issues
 			logger.debug("graph", "Edge addition - checking simulation state", {
 				isAnimating: animatedState.isAnimating,
 				isPaused: animatedState.isPaused,
 				alpha: animatedState.alpha,
 				isSimulationRunning,
 				hasActiveSimulation,
 				shouldUseReheat: hasActiveSimulation,
 				eventType,
 				newEdgeCount
 			});

 			// DIRECT SOLUTION: Always apply reheat when edges are detected (bypass broken event system)
 			// This ensures forces are applied even when the expansion->store pipeline is broken
 			if (hasActiveSimulation || allEdges.length > 0) {
 				logger.debug("graph", "🔥 DIRECT FIX: Forcing simulation update regardless of event system", {
 					hasActiveSimulation,
 					edgeCount: allEdges.length,
 					eventType
 				});
 				// Convert edges to simulation format
 				const animatedLinks: ForceSimulationLink[] = allEdges.map((edge) => ({
 					id: edge.id,
 					source: edge.source,
 					target: edge.target,
 				}));

				// Ensure all nodes referenced by edges are in the simulation
				const edgeNodeIds = new Set<string>();
				animatedLinks.forEach(link => {
					edgeNodeIds.add(typeof link.source === 'string' ? link.source : link.source.id);
					edgeNodeIds.add(typeof link.target === 'string' ? link.target : link.target.id);
				});

				// Get current simulation nodes from animated store (more accurate)
				const currentAnimatedPositions = storeMethodsRef.current.getAnimatedPositions?.() || [];
				const currentSimNodeIds = new Set(currentAnimatedPositions.map(pos => pos.id));

				const missingNodeIds = Array.from(edgeNodeIds).filter(id => !currentSimNodeIds.has(id));
				const missingNodes = Object.values(storeNodes).filter((node): node is GraphNode => {
					return node != null && missingNodeIds.includes(node.id);
				});

				logger.debug("graph", "Checking for missing nodes in simulation", {
					edgeNodeIds: Array.from(edgeNodeIds),
					currentSimNodeIds: Array.from(currentSimNodeIds),
					currentAnimatedPositionsCount: currentAnimatedPositions.length,
					missingNodeIds,
					missingNodeCount: missingNodes.length,
					allEdgeCount: animatedLinks.length
				});

				// For edge additions, use reheat instead of incremental updates to ensure all nodes and links are properly included
				logger.debug("graph", "Using reheat approach for edge addition to ensure proper force application", {
					nodeCount: Object.keys(storeNodes).length,
					linkCount: animatedLinks.length,
					simulationRunning: isSimulationRunning
				});

				// Get all nodes from store for reheat
				const allNodes = Object.values(storeNodes).filter((node): node is GraphNode => node != null);
				const pinnedState = useGraphStore.getState().pinnedNodes;

				const allAnimatedNodes: ForceSimulationNode[] = allNodes.map(node => {
					// Use current animated positions if available, otherwise use stored positions
					const existingPos = currentAnimatedPositions.find(pos => pos.id === node.id);
					const x = existingPos?.x ?? node.position?.x ?? 0;
					const y = existingPos?.y ?? node.position?.y ?? 0;
					const pinned = pinnedState[node.id] ?? false;
					return {
						id: node.id,
						type: node.type,
						x,
						y,
						fx: pinned ? x : undefined,
						fy: pinned ? y : undefined,
					};
				});

				const pinnedNodeSet = new Set(Object.keys(pinnedState).filter(id => pinnedState[id]));

				logger.debug("graph", "Reheating simulation with all current nodes and links", {
					nodeCount: allAnimatedNodes.length,
					linkCount: animatedLinks.length,
					pinnedCount: pinnedNodeSet.size,
					referenceEdges: animatedLinks.filter(link => {
						const sourceNode = allAnimatedNodes.find(n => n.id === link.source);
						const targetNode = allAnimatedNodes.find(n => n.id === link.target);
						return sourceNode && targetNode;
					}).length
				});

				// Use reheat with higher alpha to ensure reference edges take effect
				void reheatAnimation({
					nodes: allAnimatedNodes,
					links: animatedLinks,
					pinnedNodes: pinnedNodeSet,
					alpha: 0.8  // Higher alpha to ensure reference edges influence the layout
				});
 			} else if (Object.keys(storeNodes).length > 0 && allEdges.length > 0) {
 				logger.debug("graph", `Starting animation due to ${eventType} - simulation not running but we have nodes and edges`, {
 					nodeCount: Object.keys(storeNodes).length,
 					edgeCount: allEdges.length,
 					newEdgeCount
 				});

 				// Always trigger animation for edge additions, regardless of count
 				// This ensures auto-detected intra-graph edges don't get skipped
 				setTimeout(() => {
 					reheatLayoutRef.current?.(1.0);
 				}, 0);
 			} else {
 				logger.debug("graph", "Insufficient nodes/edges for simulation", {
 					nodeCount: Object.keys(storeNodes).length,
 					edgeCount: allEdges.length,
 					newEdgeCount
 				});
 			}
 		} else {
  			logger.debug("graph", "Skipping update - conditions not met", {
  				enabled,
  				useAnimation,
  				isWorkerReady
  			});
  		}
 		}, 100); // 100ms debounce for edge additions
 	};


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
 		logger.debug("graph", "Setting up node addition listeners");
 		const unsubscribeSingle = eventBus.on(GraphEventType.ANY_NODE_ADDED, () => {
 			handleNodeAdditionRef.current?.("ANY_NODE_ADDED", 1);
 		});
 		const unsubscribeBulk = eventBus.on(GraphEventType.BULK_NODES_ADDED, (event) => {
 			let nodeCount: number | undefined;
 			if (event && typeof event === "object" && "payload" in event) {
 				const payload = event.payload;
 				const parseResult = NodesPayloadSchema.safeParse(payload);
 				if (parseResult.success && parseResult.data.nodes) {
 					nodeCount = parseResult.data.nodes.length;
 				}
 			}
 			handleNodeAdditionRef.current?.("BULK_NODES_ADDED", nodeCount);
 		});

 		return () => {
 			unsubscribeSingle();
 			unsubscribeBulk();
 		};
 	}, [eventBus]);

 	// Listen for BULK_EDGES_ADDED events (now after reheatLayout is defined)
 	useEffect(() => {
 		logger.debug("graph", "Setting up BULK_EDGES_ADDED listener");
 		const unsubscribe = eventBus.on(GraphEventType.BULK_EDGES_ADDED, (event) => {
 			logger.debug("graph", "BULK_EDGES_ADDED event received", event);
 			const payload = event.payload;
 			let edgeCount = 0;
 			const parseResult = EdgesPayloadSchema.safeParse(payload);
 			if (parseResult.success && parseResult.data.edges) {
 				edgeCount = parseResult.data.edges.length;
 			}
 			handleEdgeAdditionRef.current?.("BULK_EDGES_ADDED", edgeCount);
 		});

 		return unsubscribe;
 	}, [eventBus]);

 	// Listen for ANY_EDGE_ADDED events (single edge additions)
 	useEffect(() => {
 		logger.debug("graph", "Setting up ANY_EDGE_ADDED listener");
 		const unsubscribe = eventBus.on(GraphEventType.ANY_EDGE_ADDED, (event) => {
 			logger.debug("graph", "ANY_EDGE_ADDED event received", event);
 			handleEdgeAdditionRef.current?.("ANY_EDGE_ADDED", 1);
 		});
 		return unsubscribe;
 	}, [eventBus]);

	// Listen for FORCE_LAYOUT_RESTART events (strong reheat for settled simulations)
	useEffect(() => {
		logger.debug("graph", "Setting up FORCE_LAYOUT_RESTART listener");
		const unsubscribe = eventBus.on(GraphEventType.FORCE_LAYOUT_RESTART, (event) => {
			logger.debug("graph", "FORCE_LAYOUT_RESTART event received", event);
			const payload = event.payload;
			let alpha = 1.0;
			let reason = "force-restart";
			const parseResult = ForceRestartPayloadSchema.safeParse(payload);
			if (parseResult.success) {
				if (parseResult.data.alpha !== undefined) {
					const alphaValue = Number(parseResult.data.alpha);
					if (!isNaN(alphaValue)) {
						alpha = alphaValue;
					}
				}
				if (parseResult.data.reason !== undefined) {
					const reasonRaw = parseResult.data.reason;
					if (typeof reasonRaw === "string" || typeof reasonRaw === "number") {
						const reasonValue = String(reasonRaw);
						if (reasonValue) {
							reason = reasonValue;
						}
					}
				}
			}

			logger.debug("graph", "Forcing strong layout reheat", { alpha, reason });
			reheatLayout(alpha);
		});
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
