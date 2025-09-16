/**
 * Animated Graph Store
 * Extends the base graph store with animated position tracking and Web Worker integration
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";
import { useGraphStore } from "./graph-store";
import type { GraphNode } from "@/lib/graph/types";
import { logger } from "@/lib/logger";

// Enable Immer MapSet plugin for Map and Set support
enableMapSet();

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
  animatedPositions: Map<string, NodePosition>;
  staticPositions: Map<string, NodePosition>;

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
  clearPositions: () => void;

  // Animation lifecycle
  startAnimation: () => void;
  completeAnimation: (stats: AnimationStats) => void;
  resetAnimation: () => void;

  // Configuration
  setUseAnimatedLayout: (use: boolean) => void;
  updateAnimationConfig: (config: Partial<AnimatedGraphState['animationConfig']>) => void;

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

      animatedPositions: new Map(),
      staticPositions: new Map(),
      animationHistory: [],
      currentAnimationStart: 0,

      useAnimatedLayout: true, // Default to using animated layout
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
            logger.info('graph', 'Animation started', {
              timestamp: state.currentAnimationStart,
              config: state.animationConfig
            });
          } else {
            logger.info('graph', 'Animation stopped');
          }
        });
      },

      setPaused: (paused) => {
        set((state) => {
          state.isPaused = paused;
          logger.info('graph', paused ? 'Animation paused' : 'Animation resumed');
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
          state.animatedPositions.clear();

          // Add new positions
          positions.forEach(pos => {
            state.animatedPositions.set(pos.id, { ...pos });
          });

          logger.debug('graph', 'Updated animated positions', {
            count: positions.length,
            sample: positions.slice(0, 3)
          });
        });
      },

      updateStaticPositions: (positions) => {
        set((state) => {
          // Clear existing static positions
          state.staticPositions.clear();

          // Add new positions
          positions.forEach(pos => {
            state.staticPositions.set(pos.id, { ...pos });
          });

          logger.info('graph', 'Updated static positions', {
            count: positions.length
          });
        });
      },

      getNodePosition: (nodeId) => {
        const state = get();
        // Prefer animated positions when animating, otherwise use static
        if (state.isAnimating && state.animatedPositions.has(nodeId)) {
          return state.animatedPositions.get(nodeId);
        }
        return state.staticPositions.get(nodeId);
      },

      getAllPositions: () => {
        const state = get();
        // Return appropriate position set based on animation state
        const positions = state.isAnimating ? state.animatedPositions : state.staticPositions;
        return Array.from(positions.values());
      },

      clearPositions: () => {
        set((state) => {
          state.animatedPositions.clear();
          state.staticPositions.clear();
          logger.info('graph', 'Cleared all positions');
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
          state.staticPositions.clear();
          state.animatedPositions.forEach((pos, id) => {
            state.staticPositions.set(id, { ...pos });
          });
          state.animatedPositions.clear();

          logger.info('graph', 'Animation completed', {
            ...completedStats,
            duration: `${duration}ms`,
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
          state.animatedPositions.clear();
          logger.info('graph', 'Animation reset');
        });
      },

      // Configuration
      setUseAnimatedLayout: (use) => {
        set((state) => {
          state.useAnimatedLayout = use;
          logger.info('graph', `Animated layout ${use ? 'enabled' : 'disabled'}`);
        });
      },

      updateAnimationConfig: (config) => {
        set((state) => {
          Object.assign(state.animationConfig, config);
          logger.info('graph', 'Animation config updated', {
            newConfig: state.animationConfig
          });
        });
      },

      // Integration with base graph store
      syncWithGraphStore: () => {
        const graphStore = useGraphStore.getState();
        const nodes = Array.from(graphStore.nodes.values());

        set((state) => {
          // Extract current positions from graph store nodes
          const positions: NodePosition[] = nodes.map(node => ({
            id: node.id,
            x: node.position?.x || 0,
            y: node.position?.y || 0,
          }));

          // Update static positions
          state.staticPositions.clear();
          positions.forEach(pos => {
            state.staticPositions.set(pos.id, { ...pos });
          });

          logger.info('graph', 'Synced animated store with graph store', {
            nodeCount: nodes.length,
            positionCount: positions.length,
            layoutType: graphStore.currentLayout?.type,
            pinnedNodeCount: graphStore.pinnedNodes.size,
          });
        });
      },

      applyPositionsToGraphStore: () => {
        const state = get();
        const graphStore = useGraphStore.getState();
        const currentPositions = state.getAllPositions();

        if (currentPositions.length === 0) {
          logger.warn('graph', 'No positions to apply to graph store');
          return;
        }

        // Update graph store nodes with current positions
        currentPositions.forEach(pos => {
          const node = graphStore.nodes.get(pos.id);
          if (node) {
            graphStore.updateNode(pos.id, {
              position: { x: pos.x, y: pos.y }
            });
          }
        });

        logger.info('graph', 'Applied positions to graph store', {
          appliedCount: currentPositions.length
        });
      },
    })),
    {
      name: 'animated-graph-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist configuration, not runtime state
      partialize: (state) => ({
        useAnimatedLayout: state.useAnimatedLayout,
        animationConfig: state.animationConfig,
        animationHistory: state.animationHistory.slice(-5), // Keep last 5
      }),
    }
  )
);

// Convenience hooks for specific store slices
export const useAnimationState = () => useAnimatedGraphStore((state) => ({
  isAnimating: state.isAnimating,
  isPaused: state.isPaused,
  progress: state.progress,
  alpha: state.alpha,
  iteration: state.iteration,
  fps: state.fps,
}));

export const useAnimationConfig = () => useAnimatedGraphStore((state) => ({
  config: state.animationConfig,
  useAnimatedLayout: state.useAnimatedLayout,
  updateConfig: state.updateAnimationConfig,
  setUseAnimatedLayout: state.setUseAnimatedLayout,
}));

// Individual stable hooks to avoid object recreation
export const usePositionTrackingActions = () => useAnimatedGraphStore((state) => ({
  updateAnimatedPositions: state.updateAnimatedPositions,
  updateStaticPositions: state.updateStaticPositions,
  applyPositionsToGraphStore: state.applyPositionsToGraphStore,
}));

export const usePositionTracking = () => useAnimatedGraphStore((state) => ({
  getNodePosition: state.getNodePosition,
  getAllPositions: state.getAllPositions,
  updateAnimatedPositions: state.updateAnimatedPositions,
  updateStaticPositions: state.updateStaticPositions,
  clearPositions: state.clearPositions,
  syncWithGraphStore: state.syncWithGraphStore,
  applyPositionsToGraphStore: state.applyPositionsToGraphStore,
}));