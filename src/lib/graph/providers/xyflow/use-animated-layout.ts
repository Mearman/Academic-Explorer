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
  containerDimensions?: { width: number; height: number };
  useAnimation?: boolean;
}

export function useAnimatedLayout(options: UseAnimatedLayoutOptions = {}) {
  const {
    enabled = true,
    onLayoutChange,
    fitViewAfterLayout = true,
    containerDimensions,
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

  // Update refs when store methods change (should be rare)
  useEffect(() => {
    storeMethodsRef.current = {
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
    };
  });

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
    animationState: hookAnimationState,
    nodePositions,
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

      // Auto-pin all nodes if preference is enabled
      if (autoPinOnLayoutStabilization) {
        const graphStore = useGraphStore.getState();
        const currentNodes = getNodes();

        logger.info('graph', 'Auto-pinning all nodes after animated layout completion', {
          nodeCount: currentNodes.length,
          userPreference: true,
          reason: stats.reason
        });

        currentNodes.forEach(node => {
          graphStore.pinNode(node.id);
        });

        logger.info('graph', 'All nodes auto-pinned after animated layout completion', {
          pinnedCount: currentNodes.length,
          totalPinnedNodes: graphStore.pinnedNodes.size,
        });
      }

      // Auto-fit view if enabled
      if (fitViewAfterLayout) {
        setTimeout(() => {
          void fitView(FIT_VIEW_PRESETS.DEFAULT);
          logger.info('graph', 'Auto-fitted view after animated layout completion');
        }, 100);
      }

      isLayoutRunningRef.current = false;
      logger.info('graph', 'Animated layout completed', {
        ...stats,
        autoPinEnabled: autoPinOnLayoutStabilization,
      });
    }, [fitViewAfterLayout, fitView, autoPinOnLayoutStabilization, getNodes]),

    onError: useCallback((error: string) => {
      logger.error('graph', 'Animated layout error', { error });
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
      const isPinned = pinnedNodes.has(node.id);
      return {
        id: node.id,
        type: node.data?.type as EntityType | undefined,
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
      logger.info('graph', 'Animated layout skipped', {
        enabled,
        useAnimation,
        isWorkerReady,
      });
      return;
    }

    if (isLayoutRunningRef.current) {
      logger.warn('graph', 'Animated layout already running, skipping');
      return;
    }

    const { animatedNodes, animatedLinks } = prepareAnimationData();

    if (animatedNodes.length === 0) {
      logger.info('graph', 'No nodes for animated layout');
      return;
    }

    // Get optimal configuration based on graph size
    const config = getOptimalConfig(animatedNodes.length);

    // Use graph store's layout configuration if available
    const layoutOptions = currentLayout?.options;
    const enhancedConfig = {
      ...config,
      linkDistance: layoutOptions?.linkDistance ?? 100,
      linkStrength: layoutOptions?.linkStrength ?? 0.01,
      chargeStrength: layoutOptions?.chargeStrength ?? -1000,
      centerStrength: layoutOptions?.centerStrength ?? 0.01,
      collisionRadius: layoutOptions?.collisionRadius ?? 120,
      collisionStrength: layoutOptions?.collisionStrength ?? 1.0,
      velocityDecay: layoutOptions?.velocityDecay ?? 0.1,
      alphaDecay: layoutOptions?.alphaDecay ?? config.alphaDecay,
      seed: layoutOptions?.seed ?? 0, // For deterministic layouts
    };

    logger.info('graph', 'Starting animated force layout', {
      nodeCount: animatedNodes.length,
      linkCount: animatedLinks.length,
      pinnedCount: pinnedNodes.size,
      config: enhancedConfig,
      layoutType: currentLayout?.type,
      autoPinOnLayoutStabilization,
      usingGraphStoreConfig: !!layoutOptions,
    });

    isLayoutRunningRef.current = true;
    storeMethodsRef.current.startAnimation();

    // Start the animation
    startAnimation(animatedNodes, animatedLinks, enhancedConfig, pinnedNodes);
  }, [
    enabled,
    useAnimation,
    isWorkerReady,
    prepareAnimationData,
    getOptimalConfig,
    pinnedNodes,
    currentLayout,
    startAnimation,
  ]);

  // Stop layout
  const stopLayout = useCallback(() => {
    if (isLayoutRunningRef.current) {
      stopAnimation();
      isLayoutRunningRef.current = false;
      storeMethodsRef.current.resetAnimation();
      logger.info('graph', 'Animated layout stopped');
    }
  }, [stopAnimation]);

  // Pause layout
  const pauseLayout = useCallback(() => {
    if (isLayoutRunningRef.current && !animationState.isPaused) {
      pauseAnimation();
      logger.info('graph', 'Animated layout paused');
    }
  }, [pauseAnimation, animationState.isPaused]);

  // Resume layout
  const resumeLayout = useCallback(() => {
    if (isLayoutRunningRef.current && animationState.isPaused) {
      resumeAnimation();
      logger.info('graph', 'Animated layout resumed');
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
      logger.info('graph', 'Reheating animated layout', { alpha });
      restartLayout();
    } else {
      // Start new layout if not running
      applyAnimatedLayout();
    }
  }, [restartLayout, applyAnimatedLayout]);

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

    // Computed properties
    canPause: isLayoutRunningRef.current && !animationState.isPaused,
    canResume: isLayoutRunningRef.current && animationState.isPaused,
    canStop: isLayoutRunningRef.current,
    canRestart: !isLayoutRunningRef.current,
  };
}