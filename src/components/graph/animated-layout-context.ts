/**
 * Animated Layout Context
 * Provides context for accessing animated layout functions from child components
 */

import React from "react";

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
		throw new Error("useAnimatedLayoutContext must be used within AnimatedLayoutProvider");
	}
	return context;
};