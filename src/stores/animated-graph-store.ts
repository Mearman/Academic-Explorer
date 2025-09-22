/**
 * Animated Graph Store
 * Extends the base graph store with animated position tracking and Web Worker integration
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useGraphStore } from "./graph-store";
import type { GraphNode } from "@/lib/graph/types";
import { createHybridStorage } from "@/lib/storage/zustand-indexeddb";
import { logger } from "@/lib/logger";

interface NodePosition {
  id: string;
  x: number;
  y: number;
}

interface AnimationStats {
  totalIterations: number;
  finalAlpha: number;
  reason: string;
  duration: number;
}

interface AnimatedGraphState {
  // Animation state
  isAnimating: boolean;
  isPaused: boolean;
  progress: number;
  alpha: number;
  iteration: number;
  fps: number;

  // Position tracking
  animatedPositions: Record<string, NodePosition | undefined>;
  staticPositions: Record<string, NodePosition | undefined>;
  // Cached arrays for React 19 compatibility (stable references)
  _cachedAnimatedPositionsArray: NodePosition[];
  _cachedStaticPositionsArray: NodePosition[];

  // Animation history and stats
  animationHistory: AnimationStats[];
  currentAnimationStart: number;

  // Configuration
  useAnimatedLayout: boolean;
  animationConfig: {
    targetFPS: number;
    alphaDecay: number;
    maxIterations: number;
    autoStart: boolean;
  };

  // Communication for restart requests from components outside AnimatedLayoutProvider
  restartRequested: boolean;

  // Actions
  setAnimating: (animating: boolean) => void;
  setPaused: (paused: boolean) => void;
  setProgress: (progress: number) => void;
  setAlpha: (alpha: number) => void;
  setIteration: (iteration: number) => void;
  setFPS: (fps: number) => void;

  // Position management
  updateAnimatedPositions: (positions: NodePosition[]) => void;
  updateStaticPositions: (positions: NodePosition[]) => void;
  getNodePosition: (nodeId: string) => NodePosition | undefined;
  getAllPositions: () => NodePosition[];
  getAnimatedPositions: () => NodePosition[];
  clearPositions: () => void;

  // Animation lifecycle
  startAnimation: () => void;
  completeAnimation: (stats: AnimationStats) => void;
  resetAnimation: () => void;

  // Communication for restart requests
  requestRestart: () => void;
  clearRestartRequest: () => void;

  // Configuration
  setUseAnimatedLayout: (use: boolean) => void;
  updateAnimationConfig: (config: Partial<AnimatedGraphState["animationConfig"]>) => void;

  // Integration with base graph store
  syncWithGraphStore: () => void;
  applyPositionsToGraphStore: () => void;
}

export const useAnimatedGraphStore = create<AnimatedGraphState>()(
	persist(
		immer((set, get) => ({
			// Initial state
			isAnimating: false,
			isPaused: false,
			progress: 0,
			alpha: 1,
			iteration: 0,
			fps: 0,

			animatedPositions: {},
			staticPositions: {},
			_cachedAnimatedPositionsArray: [],
			_cachedStaticPositionsArray: [],
			animationHistory: [],
			currentAnimationStart: 0,

			useAnimatedLayout: true, // Default to using animated layout
			restartRequested: false, // Communication flag for restart requests
			animationConfig: {
				targetFPS: 60,
				alphaDecay: 0.02,
				maxIterations: 1000,
				autoStart: false,
			},

			// Actions
			setAnimating: (animating) => {
				set((state) => {
					state.isAnimating = animating;
					if (animating) {
						state.currentAnimationStart = Date.now();
						logger.debug("graph", "Animation started", {
							timestamp: state.currentAnimationStart,
							config: state.animationConfig
						});
					} else {
						logger.debug("graph", "Animation stopped");
					}
				});
			},

			setPaused: (paused) => {
				set((state) => {
					state.isPaused = paused;
					logger.debug("graph", paused ? "Animation paused" : "Animation resumed");
				});
			},

			setProgress: (progress) => {
				set((state) => {
					state.progress = progress;
				});
			},

			setAlpha: (alpha) => {
				set((state) => {
					state.alpha = alpha;
				});
			},

			setIteration: (iteration) => {
				set((state) => {
					state.iteration = iteration;
				});
			},

			setFPS: (fps) => {
				set((state) => {
					state.fps = fps;
				});
			},

			// Position management
			updateAnimatedPositions: (positions) => {
				set((state) => {
					// Clear existing animated positions
					state.animatedPositions = {};

					// Add new positions
					positions.forEach(pos => {
						state.animatedPositions[pos.id] = { ...pos };
					});

					// Update cached array for React 19 compatibility
					state._cachedAnimatedPositionsArray = positions.map(pos => ({ ...pos }));

					logger.debug("graph", "Updated animated positions", {
						count: positions?.length || 0,
						sample: positions.slice(0, 3)
					});
				});
			},

			updateStaticPositions: (positions) => {
				set((state) => {
					// Clear existing static positions
					state.staticPositions = {};

					// Add new positions
					positions.forEach(pos => {
						state.staticPositions[pos.id] = { ...pos };
					});

					// Update cached array for React 19 compatibility
					state._cachedStaticPositionsArray = positions.map(pos => ({ ...pos }));

					logger.debug("graph", "Updated static positions", {
						count: positions?.length || 0
					});
				});
			},

			getNodePosition: (nodeId) => {
				const state = get();
				// Prefer animated positions when animating, otherwise use static
				if (state.isAnimating && state.animatedPositions[nodeId]) {
					return state.animatedPositions[nodeId];
				}
				return state.staticPositions[nodeId];
			},

			getAnimatedPositions: () => {
				const state = get();
				return (state._cachedAnimatedPositionsArray || []).map(pos => ({ ...pos }));
			},

			getAllPositions: () => {
				const state = get();
				// Return appropriate position set based on animation state
				// Use cached arrays to prevent new object creation on each call (React 19 compatibility)
				if (state.isAnimating) {
					return state._cachedAnimatedPositionsArray || [];
				}
				return state._cachedStaticPositionsArray || [];
			},

			clearPositions: () => {
				set((state) => {
					state.animatedPositions = {};
					state.staticPositions = {};
					// Clear cached arrays for React 19 compatibility
					state._cachedAnimatedPositionsArray = [];
					state._cachedStaticPositionsArray = [];
					logger.debug("graph", "Cleared all positions");
				});
			},

			// Animation lifecycle
			startAnimation: () => {
				set((state) => {
					state.isAnimating = true;
					state.isPaused = false;
					state.progress = 0;
					state.alpha = 1;
					state.iteration = 0;
					state.currentAnimationStart = Date.now();
				});
			},

			completeAnimation: (stats) => {
				set((state) => {
					const duration = Date.now() - state.currentAnimationStart;
					const completedStats = { ...stats, duration };

					state.isAnimating = false;
					state.isPaused = false;
					state.progress = 1;
					state.animationHistory.push(completedStats);

					// Keep only last 10 animation records
					if (state.animationHistory.length > 10) {
						state.animationHistory.splice(0, state.animationHistory.length - 10);
					}

					// Move animated positions to static positions
					state.staticPositions = {};
					const newStaticPositions: NodePosition[] = [];
					Object.entries(state.animatedPositions).forEach(([id, pos]) => {
						if (pos) {
							const newPos = { ...pos };
							state.staticPositions[id] = newPos;
							newStaticPositions.push(newPos);
						}
					});
					state.animatedPositions = {};
					// Update cached arrays for React 19 compatibility
					state._cachedStaticPositionsArray = newStaticPositions;
					state._cachedAnimatedPositionsArray = [];

					logger.debug("graph", "Animation completed", {
						...completedStats,
						duration: `${duration.toString()}ms`,
						historyCount: state.animationHistory.length
					});
				});
			},

			resetAnimation: () => {
				set((state) => {
					state.isAnimating = false;
					state.isPaused = false;
					state.progress = 0;
					state.alpha = 1;
					state.iteration = 0;
					state.fps = 0;
					state.animatedPositions = {};
					// Clear cached array for React 19 compatibility
					state._cachedAnimatedPositionsArray = [];
					logger.debug("graph", "Animation reset");
				});
			},

			// Communication for restart requests from components outside AnimatedLayoutProvider
			requestRestart: () => {
				set((state) => {
					state.restartRequested = true;
					logger.debug("graph", "Animation restart requested from external component");
				});
			},

			clearRestartRequest: () => {
				set((state) => {
					state.restartRequested = false;
				});
			},

			// Configuration
			setUseAnimatedLayout: (use) => {
				set((state) => {
					state.useAnimatedLayout = use;
					logger.debug("graph", `Animated layout ${use ? "enabled" : "disabled"}`);
				});
			},

			updateAnimationConfig: (config) => {
				set((state) => {
					Object.assign(state.animationConfig, config);
					logger.debug("graph", "Animation config updated", {
						newConfig: state.animationConfig
					});
				});
			},

			// Integration with base graph store
			syncWithGraphStore: () => {
				const graphStore = useGraphStore.getState();
				const nodes = Object.values(graphStore.nodes).filter((node): node is NonNullable<typeof node> => node != null);

				set((state) => {
					// Extract current positions from graph store nodes
					const positions: NodePosition[] = nodes.map((node: GraphNode) => ({
						id: node.id,
						x: node.position.x,
						y: node.position.y,
					}));

					// Update static positions
					state.staticPositions = {};
					positions.forEach(pos => {
						state.staticPositions[pos.id] = { ...pos };
					});
					// Update cached array for React 19 compatibility
					state._cachedStaticPositionsArray = positions.map(pos => ({ ...pos }));

					logger.debug("graph", "Synced animated store with graph store", {
						nodeCount: nodes.length,
						positionCount: positions.length,
						layoutType: graphStore.currentLayout.type,
						pinnedNodeCount: Object.keys(graphStore.pinnedNodes).length,
					});
				});
			},

			applyPositionsToGraphStore: () => {
				const state = get();
				const graphStore = useGraphStore.getState();
				const currentPositions = state.getAllPositions();

				if (!currentPositions || currentPositions.length === 0) {
					logger.warn("graph", "No positions to apply to graph store");
					return;
				}

				// Update graph store nodes with current positions
				currentPositions.forEach(pos => {
					const node = graphStore.nodes[pos.id];
					if (node) {
						graphStore.updateNode(pos.id, {
							position: { x: pos.x, y: pos.y }
						});
					}
				});

				logger.debug("graph", "Applied positions to graph store", {
					appliedCount: currentPositions.length
				});
			},
		})),
		{
			name: "animated-graph-store",
			storage: createJSONStorage(() => createHybridStorage()),
			// Only persist configuration, not runtime state
			partialize: (state) => ({
				useAnimatedLayout: state.useAnimatedLayout,
				animationConfig: state.animationConfig,
				animationHistory: state.animationHistory.slice(-5), // Keep last 5
			}),
		}
	)
);

// Individual stable selectors to avoid object recreation (React 19 + Zustand compatibility)
export const useIsAnimating = () => useAnimatedGraphStore((state) => state.isAnimating);
export const useIsPaused = () => useAnimatedGraphStore((state) => state.isPaused);
export const useAnimationProgress = () => useAnimatedGraphStore((state) => state.progress);
export const useAnimationAlpha = () => useAnimatedGraphStore((state) => state.alpha);
export const useAnimationIteration = () => useAnimatedGraphStore((state) => state.iteration);
export const useAnimationFPS = () => useAnimatedGraphStore((state) => state.fps);

export const useAnimationConfig = () => useAnimatedGraphStore((state) => state.animationConfig);
export const useUseAnimatedLayout = () => useAnimatedGraphStore((state) => state.useAnimatedLayout);
export const useUpdateAnimationConfig = () => useAnimatedGraphStore((state) => state.updateAnimationConfig);
export const useSetUseAnimatedLayout = () => useAnimatedGraphStore((state) => state.setUseAnimatedLayout);

// Position tracking selectors
export const useGetNodePosition = () => useAnimatedGraphStore((state) => state.getNodePosition);
export const useGetAllPositions = () => useAnimatedGraphStore((state) => state.getAllPositions);
export const useGetAnimatedPositions = () => useAnimatedGraphStore((state) => state.getAnimatedPositions);
export const useUpdateAnimatedPositions = () => useAnimatedGraphStore((state) => state.updateAnimatedPositions);
export const useUpdateStaticPositions = () => useAnimatedGraphStore((state) => state.updateStaticPositions);
export const useClearPositions = () => useAnimatedGraphStore((state) => state.clearPositions);
export const useApplyPositionsToGraphStore = () => useAnimatedGraphStore((state) => state.applyPositionsToGraphStore);
export const useSyncWithGraphStore = () => useAnimatedGraphStore((state) => state.syncWithGraphStore);

// Communication for restart requests from components outside AnimatedLayoutProvider
export const useRestartRequested = () => useAnimatedGraphStore((state) => state.restartRequested);
export const useRequestRestart = () => useAnimatedGraphStore((state) => state.requestRestart);
export const useClearRestartRequest = () => useAnimatedGraphStore((state) => state.clearRestartRequest);
