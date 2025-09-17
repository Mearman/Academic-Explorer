/**
 * Animated Layout Context
 * Provides context for accessing animated layout functions from child components
 */

import React from "react";

export const AnimatedLayoutContext = React.createContext<{
	// State
	isAnimating: boolean;
	isRunning: boolean;
	isWorkerReady: boolean;
	isPaused: boolean;
	progress: number;
	alpha: number;
	iteration: number;
	fps: number;
	performanceStats: any;
	useAnimation: boolean;

	// Actions
	applyLayout: () => void;
	restartLayout: () => void;
	stopLayout: () => void;
	pauseLayout: () => void;
	resumeLayout: () => void;
	reheatLayout: (alpha?: number) => void;

	// Computed properties
	canPause: boolean;
	canResume: boolean;
	canStop: boolean;
	canRestart: boolean;
		} | null>(null);

export const useAnimatedLayoutContext = () => {
	const context = React.useContext(AnimatedLayoutContext);
	if (!context) {
		throw new Error("useAnimatedLayoutContext must be used within AnimatedLayoutProvider");
	}
	return context;
};