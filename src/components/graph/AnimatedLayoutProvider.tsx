/**
 * Animated Layout Provider Component
 * Provides animated layout functionality to existing graph components
 * Can be dropped into existing graph implementations
 */

import React, { useEffect, useMemo } from "react";
import { useAnimatedLayout } from "@/lib/graph/providers/xyflow/use-animated-layout";
import { useAnimatedGraphStore, useRestartRequested, useClearRestartRequest } from "@/stores/animated-graph-store";
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

	// Communication for restart requests from components outside this provider
	const restartRequested = useRestartRequested();
	const clearRestartRequest = useClearRestartRequest();

	const {
		isRunning,
		isAnimating,
		isPaused,
		progress,
		alpha,
		iteration,
		fps,
		performanceStats,
		isWorkerReady,
		applyLayout,
		stopLayout,
		pauseLayout,
		resumeLayout,
		restartLayout,
		reheatLayout,
		updateParameters,
		canPause,
		canResume,
		canStop,
		canRestart,
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

	// Listen for restart requests from components outside this provider
	useEffect(() => {
		if (restartRequested && enabled && useAnimation && isWorkerReady) {
			logger.info("graph", "Restart request received from external component", {
				enabled,
				useAnimation,
				isWorkerReady,
				isRunning,
			});

			// Clear the request flag first to prevent multiple triggers
			clearRestartRequest();

			// Restart the animation
			restartLayout();
		}
	}, [restartRequested, enabled, useAnimation, isWorkerReady, isRunning, restartLayout, clearRestartRequest]);

	// Create stable context value to prevent unnecessary re-renders
	const contextValue = useMemo(() => ({
		// State
		isAnimating,
		isRunning,
		isWorkerReady,
		isPaused,
		progress,
		alpha,
		iteration,
		fps,
		performanceStats,
		useAnimation,

		// Actions
		applyLayout,
		restartLayout,
		stopLayout,
		pauseLayout,
		resumeLayout,
		reheatLayout,
		updateParameters,

		// Computed properties
		canPause,
		canResume,
		canStop,
		canRestart,
	}), [
		isAnimating,
		isRunning,
		isWorkerReady,
		isPaused,
		progress,
		alpha,
		iteration,
		fps,
		performanceStats,
		useAnimation,
		applyLayout,
		restartLayout,
		stopLayout,
		pauseLayout,
		resumeLayout,
		reheatLayout,
		updateParameters,
		canPause,
		canResume,
		canStop,
		canRestart,
	]);

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