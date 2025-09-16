/**
 * Animated Layout Provider Component
 * Provides animated layout functionality to existing graph components
 * Can be dropped into existing graph implementations
 */

import React, { useEffect, useMemo } from "react";
import { useAnimatedLayout } from "@/lib/graph/providers/xyflow/use-animated-layout";
import { useAnimatedGraphStore } from "@/stores/animated-graph-store";
import { logger } from "@/lib/logger";
import { AnimatedLayoutContext } from "./animated-layout-context";

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
	autoStartOnNodeChange = false,
}) => {
	// Use stable selector to prevent infinite loops in React 19
	const useAnimation = useAnimatedGraphStore((state) => state.useAnimatedLayout);

	const {
		isRunning,
		isAnimating,
		applyLayout,
		isWorkerReady,
	} = useAnimatedLayout({
		enabled: enabled && useAnimation,
		onLayoutChange,
		fitViewAfterLayout,
		useAnimation,
	});

	// Auto-start animation when significant node changes occur
	// Remove applyLayout from dependencies to prevent infinite loops
	useEffect(() => {
		if (!autoStartOnNodeChange || !enabled || !useAnimation || !isWorkerReady || isRunning) {
			return;
		}

		// We could implement node change detection here
		// For now, this is a placeholder for future enhancement
		logger.debug("graph", "Auto-start animation conditions checked", {
			autoStartOnNodeChange,
			enabled,
			useAnimation,
			isWorkerReady,
			isRunning,
		});
	}, [autoStartOnNodeChange, enabled, useAnimation, isWorkerReady, isRunning]);

	// Create stable context value to prevent unnecessary re-renders
	const contextValue = useMemo(() => ({
		isAnimating,
		isRunning,
		isWorkerReady,
		applyLayout,
		useAnimation,
	}), [isAnimating, isRunning, isWorkerReady, applyLayout, useAnimation]);

	logger.debug("graph", "AnimatedLayoutProvider render", {
		enabled,
		useAnimation,
		isWorkerReady,
		isRunning,
	});

	return (
		<AnimatedLayoutContext.Provider value={contextValue}>
			{children}
		</AnimatedLayoutContext.Provider>
	);
};