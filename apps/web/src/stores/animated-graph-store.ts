/**
 * Animated Graph Store
 * Extends the base graph store with animated position tracking and Web Worker integration
 * Uses shared createTrackedStore abstraction for DRY compliance
 */

import { createStore } from "@academic-explorer/utils/state";
import { useGraphStore, graphStore } from "./graph-store";
import type { GraphNode } from "@academic-explorer/graph";
import { logger } from "@academic-explorer/utils/logger";
import type { Draft } from "immer";

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
}

interface AnimatedGraphActions {
  // Animation state setters
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
  updateAnimationConfig: (
    config: Partial<AnimatedGraphState["animationConfig"]>,
  ) => void;

  // Integration with base graph store
  syncWithGraphStore: () => void;
  applyPositionsToGraphStore: () => void;

  // Index signature to satisfy constraint
  [key: string]: (...args: never[]) => void;
}

export const useAnimatedGraphStore = createStore({
  isAnimating: false,
  isPaused: false,
  progress: 0,
  alpha: 1,
  iteration: 0,
  fps: 0,

  animatedPositions: {},
  staticPositions: {},
  _cachedAnimatedPositionsArray: [] as NodePosition[],
  _cachedStaticPositionsArray: [] as NodePosition[],
  animationHistory: [] as AnimationStats[],
  currentAnimationStart: 0,

  useAnimatedLayout: true, // Default to using animated layout
  restartRequested: false, // Communication flag for restart requests
  animationConfig: {
    targetFPS: 60,
    alphaDecay: 0.02,
    maxIterations: 1000,
    autoStart: false,
  },

  // Animation state setters
  setAnimating: function (animating) {
    this.isAnimating = animating;
    if (animating) {
      this.currentAnimationStart = Date.now();
      logger.debug("graph", "Animation started", {
        timestamp: this.currentAnimationStart,
        config: this.animationConfig,
      });
    } else {
      logger.debug("graph", "Animation stopped");
    }
  },

  setPaused: function (paused) {
    this.isPaused = paused;
    logger.debug("graph", paused ? "Animation paused" : "Animation resumed");
  },

  setProgress: function (progress) {
    this.progress = progress;
  },

  setAlpha: function (alpha) {
    this.alpha = alpha;
  },

  setIteration: function (iteration) {
    this.iteration = iteration;
  },

  setFPS: function (fps) {
    this.fps = fps;
  },

  // Position management
  updateAnimatedPositions: function (positions) {
    // Clear existing animated positions
    this.animatedPositions = {};

    // Add new positions
    positions.forEach((pos) => {
      this.animatedPositions[pos.id] = { ...pos };
    });

    // Update cached array for React 19 compatibility
    this._cachedAnimatedPositionsArray = positions.map((pos) => ({
      ...pos,
    }));

    logger.debug("graph", "Updated animated positions", {
      count: positions.length,
      sample: positions.slice(0, 3),
    });
  },

  updateStaticPositions: function (positions) {
    // Clear existing static positions
    this.staticPositions = {};

    // Add new positions
    positions.forEach((pos) => {
      this.staticPositions[pos.id] = { ...pos };
    });

    // Update cached array for React 19 compatibility
    this._cachedStaticPositionsArray = positions.map((pos) => ({
      ...pos,
    }));

    logger.debug("graph", "Updated static positions", {
      count: positions.length,
    });
  },

  getNodePosition: function (nodeId) {
    // Prefer animated positions when animating, otherwise use static
    if (this.isAnimating && this.animatedPositions[nodeId]) {
      return this.animatedPositions[nodeId];
    }
    return this.staticPositions[nodeId];
  },

  getAnimatedPositions: function () {
    return this._cachedAnimatedPositionsArray.map((pos) => ({ ...pos }));
  },

  getAllPositions: function () {
    // Return appropriate position set based on animation state
    // Use cached arrays to prevent new object creation on each call (React 19 compatibility)
    if (this.isAnimating) {
      return this._cachedAnimatedPositionsArray;
    }
    return this._cachedStaticPositionsArray;
  },

  clearPositions: function () {
    this.animatedPositions = {};
    this.staticPositions = {};
    // Clear cached arrays for React 19 compatibility
    this._cachedAnimatedPositionsArray = [] as NodePosition[];
    this._cachedStaticPositionsArray = [] as NodePosition[];
    logger.debug("graph", "Cleared all positions");
  },

  // Animation lifecycle
  startAnimation: function () {
    this.isAnimating = true;
    this.isPaused = false;
    this.progress = 0;
    this.alpha = 1;
    this.iteration = 0;
    this.currentAnimationStart = Date.now();
  },

  completeAnimation: function (stats) {
    const duration = Date.now() - this.currentAnimationStart;
    const completedStats = { ...stats, duration };

    this.isAnimating = false;
    this.isPaused = false;
    this.progress = 1;
    this.animationHistory.push(completedStats);

    // Keep only last 10 animation records
    if (this.animationHistory.length > 10) {
      this.animationHistory.splice(0, this.animationHistory.length - 10);
    }

    // Move animated positions to static positions
    this.staticPositions = {};
    const newStaticPositions: NodePosition[] = [];
    Object.entries(this.animatedPositions).forEach(([id, pos]) => {
      if (pos) {
        const newPos = { ...pos } as NodePosition;
        this.staticPositions[id] = newPos;
        newStaticPositions.push(newPos);
      }
    });
    this.animatedPositions = {};
    // Update cached arrays for React 19 compatibility
    this._cachedStaticPositionsArray = newStaticPositions;
    this._cachedAnimatedPositionsArray = [] as NodePosition[];

    logger.debug("graph", "Animation completed", {
      ...completedStats,
      duration: `${duration.toString()}ms`,
      historyCount: this.animationHistory.length,
    });
  },

  resetAnimation: function () {
    this.isAnimating = false;
    this.isPaused = false;
    this.progress = 0;
    this.alpha = 1;
    this.iteration = 0;
    this.fps = 0;
    this.animatedPositions = {};
    // Clear cached array for React 19 compatibility
    this._cachedAnimatedPositionsArray = [] as NodePosition[];
    logger.debug("graph", "Animation reset");
  },

  // Communication for restart requests from components outside AnimatedLayoutProvider
  requestRestart: function () {
    this.restartRequested = true;
    logger.debug(
      "graph",
      "Animation restart requested from external component",
    );
  },

  clearRestartRequest: function () {
    this.restartRequested = false;
  },

  // Configuration
  setUseAnimatedLayout: function (use) {
    this.useAnimatedLayout = use;
    logger.debug("graph", `Animated layout ${use ? "enabled" : "disabled"}`);
  },

  updateAnimationConfig: function (config) {
    Object.assign(this.animationConfig, config);
    logger.debug("graph", "Animation config updated", {
      newConfig: this.animationConfig,
    });
  },

  // Integration with base graph store
  syncWithGraphStore: function () {
    const nodes = Object.values(graphStore.getState().nodes).filter(
      (node): node is NonNullable<typeof node> => Boolean(node),
    );

    // Extract current positions from graph store nodes
    const positions: NodePosition[] = nodes.map((node: GraphNode) => ({
      id: node.id,
      x: node.x,
      y: node.y,
    }));

    // Update static positions
    this.staticPositions = {};
    positions.forEach((pos) => {
      this.staticPositions[pos.id] = { ...pos };
    });
    // Update cached array for React 19 compatibility
    this._cachedStaticPositionsArray = positions.map((pos) => ({
      ...pos,
    }));

    logger.debug("graph", "Synced animated store with graph store", {
      nodeCount: nodes.length,
      positionCount: positions.length,
      layoutType: graphStore.getState().currentLayout.type,
      pinnedNodeCount: Object.keys(graphStore.getState().pinnedNodes).length,
    });
  },

  applyPositionsToGraphStore: function () {
    const graphStoreState = graphStore.getState();
    const currentPositions = this.getAllPositions();

    if (currentPositions.length === 0) {
      logger.warn("graph", "No positions to apply to graph store");
      return;
    }

    // Update graph store nodes with current positions
    currentPositions.forEach((pos) => {
      graphStore.getState().updateNode(pos.id, {
        x: pos.x,
        y: pos.y,
      });
    });

    logger.debug("graph", "Applied positions to graph store", {
      appliedCount: currentPositions.length,
    });
  },
});

export const animatedGraphStore = useAnimatedGraphStore;

// Individual stable selectors to avoid object recreation (React 19 + Zustand compatibility)
export const useIsAnimating = () =>
  useAnimatedGraphStore((state) => state.isAnimating);
export const useIsPaused = () =>
  useAnimatedGraphStore((state) => state.isPaused);
export const useAnimationProgress = () =>
  useAnimatedGraphStore((state) => state.progress);
export const useAnimationAlpha = () =>
  useAnimatedGraphStore((state) => state.alpha);
export const useAnimationIteration = () =>
  useAnimatedGraphStore((state) => state.iteration);
export const useAnimationFPS = () =>
  useAnimatedGraphStore((state) => state.fps);

export const useAnimationConfig = () =>
  useAnimatedGraphStore((state) => state.animationConfig);
export const useUseAnimatedLayout = () =>
  useAnimatedGraphStore((state) => state.useAnimatedLayout);
export const useUpdateAnimationConfig = () =>
  useAnimatedGraphStore((state) => state.updateAnimationConfig);
export const useSetUseAnimatedLayout = () =>
  useAnimatedGraphStore((state) => state.setUseAnimatedLayout);

// Position tracking selectors
export const useGetNodePosition = () =>
  useAnimatedGraphStore((state) => state.getNodePosition);
export const useGetAllPositions = () =>
  useAnimatedGraphStore((state) => state.getAllPositions);
export const useGetAnimatedPositions = () =>
  useAnimatedGraphStore((state) => state.getAnimatedPositions);
export const useUpdateAnimatedPositions = () =>
  useAnimatedGraphStore((state) => state.updateAnimatedPositions);
export const useUpdateStaticPositions = () =>
  useAnimatedGraphStore((state) => state.updateStaticPositions);
export const useClearPositions = () =>
  useAnimatedGraphStore((state) => state.clearPositions);
export const useApplyPositionsToGraphStore = () =>
  useAnimatedGraphStore((state) => state.applyPositionsToGraphStore);
export const useSyncWithGraphStore = () =>
  useAnimatedGraphStore((state) => state.syncWithGraphStore);

// Communication for restart requests from components outside AnimatedLayoutProvider
export const useRestartRequested = () =>
  useAnimatedGraphStore((state) => state.restartRequested);
export const useRequestRestart = () =>
  useAnimatedGraphStore((state) => state.requestRestart);
export const useClearRestartRequest = () =>
  useAnimatedGraphStore((state) => state.clearRestartRequest);
