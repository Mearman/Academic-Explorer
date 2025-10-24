/**
 * Animated Graph Store
 * Extends the base graph store with animated position tracking and Web Worker integration
 * Uses React Context + useReducer pattern instead of Zustand store
 */

import React, {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
  type Reducer,
} from "react";
import { _useGraphStore } from "./graph-store";
import type { GraphNode, GraphLayout } from "@academic-explorer/graph";
import { logger } from "@academic-explorer/utils/logger";

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

type AnimatedGraphAction =
  | { type: "SET_ANIMATING"; payload: boolean }
  | { type: "SET_PAUSED"; payload: boolean }
  | { type: "SET_PROGRESS"; payload: number }
  | { type: "SET_ALPHA"; payload: number }
  | { type: "SET_ITERATION"; payload: number }
  | { type: "SET_FPS"; payload: number }
  | { type: "UPDATE_ANIMATED_POSITIONS"; payload: NodePosition[] }
  | { type: "UPDATE_STATIC_POSITIONS"; payload: NodePosition[] }
  | { type: "CLEAR_POSITIONS" }
  | { type: "START_ANIMATION" }
  | { type: "COMPLETE_ANIMATION"; payload: AnimationStats }
  | { type: "RESET_ANIMATION" }
  | { type: "REQUEST_RESTART" }
  | { type: "CLEAR_RESTART_REQUEST" }
  | { type: "SET_USE_ANIMATED_LAYOUT"; payload: boolean }
  | { type: "UPDATE_ANIMATION_CONFIG"; payload: Partial<AnimatedGraphState["animationConfig"]> }
  | { type: "SYNC_WITH_GRAPH_STORE"; payload: { nodes: Record<string, GraphNode>; currentLayout: GraphLayout; pinnedNodes: Record<string, boolean> } }
  | { type: "APPLY_POSITIONS_TO_GRAPH_STORE" };

const initialState: AnimatedGraphState = {
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
};

const animatedGraphReducer: Reducer<AnimatedGraphState, AnimatedGraphAction> = (
  state,
  action
): AnimatedGraphState => {
  switch (action.type) {
    case "SET_ANIMATING": {
      const newState = { ...state, isAnimating: action.payload };
      if (action.payload) {
        newState.currentAnimationStart = Date.now();
        logger.debug("graph", "Animation started", {
          timestamp: newState.currentAnimationStart,
          config: newState.animationConfig,
        });
      } else {
        logger.debug("graph", "Animation stopped");
      }
      return newState;
    }

    case "SET_PAUSED":
      logger.debug("graph", action.payload ? "Animation paused" : "Animation resumed");
      return { ...state, isPaused: action.payload };

    case "SET_PROGRESS":
      return { ...state, progress: action.payload };

    case "SET_ALPHA":
      return { ...state, alpha: action.payload };

    case "SET_ITERATION":
      return { ...state, iteration: action.payload };

    case "SET_FPS":
      return { ...state, fps: action.payload };

    case "UPDATE_ANIMATED_POSITIONS": {
      const animatedPositions: Record<string, NodePosition | undefined> = {};
      const _cachedAnimatedPositionsArray = action.payload.map((pos) => ({ ...pos }));

      action.payload.forEach((pos) => {
        animatedPositions[pos.id] = { ...pos };
      });

      logger.debug("graph", "Updated animated positions", {
        count: action.payload.length,
        sample: action.payload.slice(0, 3),
      });

      return {
        ...state,
        animatedPositions,
        _cachedAnimatedPositionsArray,
      };
    }

    case "UPDATE_STATIC_POSITIONS": {
      const staticPositions: Record<string, NodePosition | undefined> = {};
      const _cachedStaticPositionsArray = action.payload.map((pos) => ({ ...pos }));

      action.payload.forEach((pos) => {
        staticPositions[pos.id] = { ...pos };
      });

      logger.debug("graph", "Updated static positions", {
        count: action.payload.length,
      });

      return {
        ...state,
        staticPositions,
        _cachedStaticPositionsArray,
      };
    }

    case "CLEAR_POSITIONS":
      logger.debug("graph", "Cleared all positions");
      return {
        ...state,
        animatedPositions: {},
        staticPositions: {},
        _cachedAnimatedPositionsArray: [] as NodePosition[],
        _cachedStaticPositionsArray: [] as NodePosition[],
      };

    case "START_ANIMATION":
      return {
        ...state,
        isAnimating: true,
        isPaused: false,
        progress: 0,
        alpha: 1,
        iteration: 0,
        currentAnimationStart: Date.now(),
      };

    case "COMPLETE_ANIMATION": {
      const duration = Date.now() - state.currentAnimationStart;
      const completedStats = { ...action.payload, duration };
      const newAnimationHistory = [...state.animationHistory, completedStats];

      // Keep only last 10 animation records
      if (newAnimationHistory.length > 10) {
        newAnimationHistory.splice(0, newAnimationHistory.length - 10);
      }

      // Move animated positions to static positions
      const staticPositions: Record<string, NodePosition | undefined> = {};
      const newStaticPositions: NodePosition[] = [];
      Object.entries(state.animatedPositions).forEach(([id, pos]) => {
        if (pos) {
          const newPos = { ...pos } as NodePosition;
          staticPositions[id] = newPos;
          newStaticPositions.push(newPos);
        }
      });

      logger.debug("graph", "Animation completed", {
        ...completedStats,
        duration: `${duration.toString()}ms`,
        historyCount: newAnimationHistory.length,
      });

      return {
        ...state,
        isAnimating: false,
        isPaused: false,
        progress: 1,
        animationHistory: newAnimationHistory,
        animatedPositions: {},
        staticPositions,
        _cachedStaticPositionsArray: newStaticPositions,
        _cachedAnimatedPositionsArray: [] as NodePosition[],
      };
    }

    case "RESET_ANIMATION":
      logger.debug("graph", "Animation reset");
      return {
        ...state,
        isAnimating: false,
        isPaused: false,
        progress: 0,
        alpha: 1,
        iteration: 0,
        fps: 0,
        animatedPositions: {},
        _cachedAnimatedPositionsArray: [] as NodePosition[],
      };

    case "REQUEST_RESTART":
      logger.debug(
        "graph",
        "Animation restart requested from external component"
      );
      return { ...state, restartRequested: true };

    case "CLEAR_RESTART_REQUEST":
      return { ...state, restartRequested: false };

    case "SET_USE_ANIMATED_LAYOUT":
      logger.debug("graph", `Animated layout ${action.payload ? "enabled" : "disabled"}`);
      return { ...state, useAnimatedLayout: action.payload };

    case "UPDATE_ANIMATION_CONFIG": {
      const newAnimationConfig = { ...state.animationConfig, ...action.payload };
      logger.debug("graph", "Animation config updated", {
        newConfig: newAnimationConfig,
      });
      return { ...state, animationConfig: newAnimationConfig };
    }

    case "SYNC_WITH_GRAPH_STORE": {
      try {
        // This action now requires the graph store state to be passed in payload
        const { nodes, currentLayout, pinnedNodes } = action.payload as {
          nodes: Record<string, GraphNode>
          currentLayout: GraphLayout
          pinnedNodes: Record<string, boolean>
        };

        const nodeArray = Object.values(nodes).filter(
          (node): node is NonNullable<typeof node> => Boolean(node),
        );

        // Extract current positions from graph store nodes
        const positions: NodePosition[] = nodeArray.map((node) => ({
          id: node.id,
          x: node.x,
          y: node.y,
        }));

        // Update static positions
        const staticPositions: Record<string, NodePosition | undefined> = {};
        positions.forEach((pos) => {
          staticPositions[pos.id] = { ...pos };
        });

        const _cachedStaticPositionsArray = positions.map((pos) => ({ ...pos }));

        logger.debug("graph", "Synced animated store with graph store", {
          nodeCount: nodeArray.length,
          positionCount: positions.length,
          layoutType: currentLayout.type,
          pinnedNodeCount: Object.keys(pinnedNodes).length,
        });

        return {
          ...state,
          staticPositions,
          _cachedStaticPositionsArray,
        };
      } catch (error) {
        logger.error("graph", "Failed to sync with graph store", { error });
        return state;
      }
    }

    case "APPLY_POSITIONS_TO_GRAPH_STORE": {
      try {
        const currentPositions = state.isAnimating
          ? state._cachedAnimatedPositionsArray
          : state._cachedStaticPositionsArray;

        if (currentPositions.length === 0) {
          logger.warn("graph", "No positions to apply to graph store");
          return state;
        }

        // This action now just stores the positions to be applied externally
        // The actual graph store update will be handled by the component
        logger.debug("graph", "Positions ready to apply to graph store", {
          positionCount: currentPositions.length,
        });

        return state;
      } catch (error) {
        logger.error("graph", "Failed to apply positions to graph store", { error });
        return state;
      }
    }

    default: {
      // TypeScript ensures we handle all cases
      const _exhaustiveCheck: never = action;
      return state;
    }
  }
};

// Context definition
interface AnimatedGraphContextValue {
  state: AnimatedGraphState;
  dispatch: Dispatch<AnimatedGraphAction>;
}

const AnimatedGraphContext = createContext<AnimatedGraphContextValue | null>(null);

// Provider component
interface AnimatedGraphProviderProps {
  children: ReactNode;
}

export const AnimatedGraphProvider: React.FC<AnimatedGraphProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(animatedGraphReducer, initialState);

  return (
    <AnimatedGraphContext.Provider value={{ state, dispatch }}>
      {children}
    </AnimatedGraphContext.Provider>
  );
};

// Custom hooks for accessing state and actions
export const useAnimatedGraphState = (): AnimatedGraphState => {
  const context = useContext(AnimatedGraphContext);
  if (!context) {
    throw new Error("useAnimatedGraphState must be used within AnimatedGraphProvider");
  }
  return context.state;
};

export const useAnimatedGraphActions = (): Dispatch<AnimatedGraphAction> => {
  const context = useContext(AnimatedGraphContext);
  if (!context) {
    throw new Error("useAnimatedGraphActions must be used within AnimatedGraphProvider");
  }
  return context.dispatch;
};

export const useAnimatedGraphStore = (): AnimatedGraphContextValue => {
  const context = useContext(AnimatedGraphContext);
  if (!context) {
    throw new Error("useAnimatedGraphStore must be used within AnimatedGraphProvider");
  }
  return context;
};


// Individual hooks for specific state properties (maintain compatibility with existing code)
export const useIsAnimating = (): boolean => useAnimatedGraphState().isAnimating;
export const useIsPaused = (): boolean => useAnimatedGraphState().isPaused;
export const useAnimationProgress = (): number => useAnimatedGraphState().progress;
export const useAnimationAlpha = (): number => useAnimatedGraphState().alpha;
export const useAnimationIteration = (): number => useAnimatedGraphState().iteration;
export const useAnimationFPS = (): number => useAnimatedGraphState().fps;

export const useAnimationConfig = () => useAnimatedGraphState().animationConfig;
export const useUseAnimatedLayout = (): boolean => useAnimatedGraphState().useAnimatedLayout;

// Hook creators for actions (maintain compatibility with existing code)
export const useUpdateAnimationConfig = () => {
  const dispatch = useAnimatedGraphActions();
  return (config: Partial<AnimatedGraphState["animationConfig"]>) => {
    dispatch({ type: "UPDATE_ANIMATION_CONFIG", payload: config });
  };
};

export const useSetUseAnimatedLayout = () => {
  const dispatch = useAnimatedGraphActions();
  return (use: boolean) => {
    dispatch({ type: "SET_USE_ANIMATED_LAYOUT", payload: use });
  };
};

// Position tracking hooks (maintain compatibility with existing code)
export const useGetNodePosition = () => {
  const state = useAnimatedGraphState();
  return (nodeId: string): NodePosition | undefined => {
    // Prefer animated positions when animating, otherwise use static
    if (state.isAnimating && state.animatedPositions[nodeId]) {
      return state.animatedPositions[nodeId];
    }
    return state.staticPositions[nodeId];
  };
};

export const useGetAllPositions = (): NodePosition[] => {
  const state = useAnimatedGraphState();
  // Return appropriate position set based on animation state
  // Use cached arrays to prevent new object creation on each call (React 19 compatibility)
  if (state.isAnimating) {
    return state._cachedAnimatedPositionsArray.map((pos) => ({ ...pos }));
  }
  return state._cachedStaticPositionsArray.map((pos) => ({ ...pos }));
};

export const useGetAnimatedPositions = (): NodePosition[] => {
  const state = useAnimatedGraphState();
  return state._cachedAnimatedPositionsArray.map((pos) => ({ ...pos }));
};

export const useUpdateAnimatedPositions = () => {
  const dispatch = useAnimatedGraphActions();
  return (positions: NodePosition[]) => {
    dispatch({ type: "UPDATE_ANIMATED_POSITIONS", payload: positions });
  };
};

export const useUpdateStaticPositions = () => {
  const dispatch = useAnimatedGraphActions();
  return (positions: NodePosition[]) => {
    dispatch({ type: "UPDATE_STATIC_POSITIONS", payload: positions });
  };
};

export const useClearPositions = () => {
  const dispatch = useAnimatedGraphActions();
  return () => {
    dispatch({ type: "CLEAR_POSITIONS" });
  };
};

export const useApplyPositionsToGraphStore = () => {
  const dispatch = useAnimatedGraphActions();
  return () => {
    dispatch({ type: "APPLY_POSITIONS_TO_GRAPH_STORE" });
  };
};

export const useSyncWithGraphStore = () => {
  const dispatch = useAnimatedGraphActions();
  return () => {
    dispatch({ type: "SYNC_WITH_GRAPH_STORE" });
  };
};

// Communication for restart requests from components outside AnimatedLayoutProvider
export const useRestartRequested = (): boolean => useAnimatedGraphState().restartRequested;

export const useRequestRestart = () => {
  const dispatch = useAnimatedGraphActions();
  return () => {
    dispatch({ type: "REQUEST_RESTART" });
  };
};

export const useClearRestartRequest = () => {
  const dispatch = useAnimatedGraphActions();
  return () => {
    dispatch({ type: "CLEAR_RESTART_REQUEST" });
  };
};

// Animation lifecycle hooks
export const useStartAnimation = () => {
  const dispatch = useAnimatedGraphActions();
  return () => {
    dispatch({ type: "START_ANIMATION" });
  };
};

export const useCompleteAnimation = () => {
  const dispatch = useAnimatedGraphActions();
  return (stats: AnimationStats) => {
    dispatch({ type: "COMPLETE_ANIMATION", payload: stats });
  };
};

export const useResetAnimation = () => {
  const dispatch = useAnimatedGraphActions();
  return () => {
    dispatch({ type: "RESET_ANIMATION" });
  };
};

// Animation state setter hooks
export const useSetAnimating = () => {
  const dispatch = useAnimatedGraphActions();
  return (animating: boolean) => {
    dispatch({ type: "SET_ANIMATING", payload: animating });
  };
};

export const useSetPaused = () => {
  const dispatch = useAnimatedGraphActions();
  return (paused: boolean) => {
    dispatch({ type: "SET_PAUSED", payload: paused });
  };
};

export const useSetProgress = () => {
  const dispatch = useAnimatedGraphActions();
  return (progress: number) => {
    dispatch({ type: "SET_PROGRESS", payload: progress });
  };
};

export const useSetAlpha = () => {
  const dispatch = useAnimatedGraphActions();
  return (alpha: number) => {
    dispatch({ type: "SET_ALPHA", payload: alpha });
  };
};

export const useSetIteration = () => {
  const dispatch = useAnimatedGraphActions();
  return (iteration: number) => {
    dispatch({ type: "SET_ITERATION", payload: iteration });
  };
};

export const useSetFPS = () => {
  const dispatch = useAnimatedGraphActions();
  return (fps: number) => {
    dispatch({ type: "SET_FPS", payload: fps });
  };
};