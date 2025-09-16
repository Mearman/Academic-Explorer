/**
 * Animated Layout Provider Component
 * Provides animated layout functionality to existing graph components
 * Can be dropped into existing graph implementations
 */

import React, { useEffect, useCallback } from 'react';
import { useAnimatedLayout } from '@/lib/graph/providers/xyflow/use-animated-layout';
import { useAnimatedGraphStore } from '@/stores/animated-graph-store';
import { logger } from '@/lib/logger';

interface AnimatedLayoutProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
  onLayoutChange?: () => void;
  fitViewAfterLayout?: boolean;
  containerDimensions?: { width: number; height: number };
  autoStartOnNodeChange?: boolean;
  nodeChangeThreshold?: number; // Minimum number of new nodes to trigger auto-start
}

export const AnimatedLayoutProvider: React.FC<AnimatedLayoutProviderProps> = ({
  children,
  enabled = true,
  onLayoutChange,
  fitViewAfterLayout = true,
  containerDimensions,
  autoStartOnNodeChange = false,
  nodeChangeThreshold = 5,
}) => {
  const animatedStore = useAnimatedGraphStore();
  const useAnimation = animatedStore.useAnimatedLayout;

  const {
    isRunning,
    isAnimating,
    applyLayout,
    isWorkerReady,
  } = useAnimatedLayout({
    enabled: enabled && useAnimation,
    onLayoutChange,
    fitViewAfterLayout,
    containerDimensions,
    useAnimation,
  });

  // Enhanced layout change handler
  const handleLayoutChange = useCallback(() => {
    onLayoutChange?.();

    // Log animation progress periodically
    if (isAnimating) {
      const state = animatedStore;
      if (state.iteration % 50 === 0) { // Log every 50 iterations
        logger.debug('graph', 'Animation progress update', {
          iteration: state.iteration,
          alpha: state.alpha.toFixed(4),
          progress: `${(state.progress * 100).toFixed(1)}%`,
          fps: state.fps.toFixed(1),
        });
      }
    }
  }, [onLayoutChange, isAnimating, animatedStore]);

  // Auto-start animation when significant node changes occur
  useEffect(() => {
    if (!autoStartOnNodeChange || !enabled || !useAnimation || !isWorkerReady || isRunning) {
      return;
    }

    // We could implement node change detection here
    // For now, this is a placeholder for future enhancement
    logger.debug('graph', 'Auto-start animation conditions checked', {
      autoStartOnNodeChange,
      enabled,
      useAnimation,
      isWorkerReady,
      isRunning,
    });
  }, [autoStartOnNodeChange, enabled, useAnimation, isWorkerReady, isRunning, applyLayout]);

  // Provide layout functions to children via context if needed
  const providerValue = {
    isAnimating,
    isRunning,
    isWorkerReady,
    applyLayout,
    useAnimation,
  };

  logger.debug('graph', 'AnimatedLayoutProvider render', {
    enabled,
    useAnimation,
    isWorkerReady,
    isRunning,
  });

  return (
    <>
      {children}
    </>
  );
};

// Context for accessing animated layout functions from child components
export const AnimatedLayoutContext = React.createContext<{
  isAnimating: boolean;
  isRunning: boolean;
  isWorkerReady: boolean;
  applyLayout: () => void;
  useAnimation: boolean;
} | null>(null);

export const useAnimatedLayoutContext = () => {
  const context = React.useContext(AnimatedLayoutContext);
  if (!context) {
    throw new Error('useAnimatedLayoutContext must be used within AnimatedLayoutProvider');
  }
  return context;
};