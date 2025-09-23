/**
 * Animated Layout Provider Component
 * Provides animated layout functionality to existing graph components
 * Can be dropped into existing graph implementations
 */

import React, { useEffect, useMemo, useRef } from "react";
import { useAnimatedLayout } from "@academic-explorer/graph";
import { useAnimatedGraphStore, useRestartRequested, useClearRestartRequest } from "@/stores/animated-graph-store";
import { logger } from "@academic-explorer/shared-utils/logger";
import { AnimatedLayoutContext } from "./animated-layout-context";
import { useReactFlow } from "@xyflow/react";
import { useEventBus } from "@academic-explorer/graph";

interface AnimatedLayoutProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
  onLayoutChange?: () => void;
  containerDimensions?: { width: number; height: number };
  autoStartOnNodeChange?: boolean;
}

export const AnimatedLayoutProvider: React.FC<AnimatedLayoutProviderProps> = ({
	children,
	enabled = true,
	onLayoutChange,
	autoStartOnNodeChange = false,
}) => {
	// Unified event bus for cross-component communication
	const eventBus = useEventBus();

	// Use stable selector to prevent infinite loops in React 19
	const useAnimation = useAnimatedGraphStore((state) => state.useAnimatedLayout);

	// ReactFlow hooks for node tracking
	const { getNodes, getEdges } = useReactFlow();

	// Track previous node/edge counts for change detection
	const prevNodeCountRef = useRef(0);
	const prevEdgeCountRef = useRef(0);
	const autoTriggerTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

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
		useAnimation,
	});

	// Auto-start animation when significant node changes occur
	useEffect(() => {
		if (!autoStartOnNodeChange || !enabled || !useAnimation || !isWorkerReady) {
			return;
		}

		const checkNodeChanges = () => {
			const currentNodes = getNodes();
			const currentEdges = getEdges();
			const currentNodeCount = currentNodes.length;
			const currentEdgeCount = currentEdges.length;

			const nodeChange = currentNodeCount - prevNodeCountRef.current;
			const edgeChange = currentEdgeCount - prevEdgeCountRef.current;

			logger.debug("graph", "Auto-trigger: checking node/edge changes", {
				prevNodeCount: prevNodeCountRef.current,
				currentNodeCount,
				nodeChange,
				prevEdgeCount: prevEdgeCountRef.current,
				currentEdgeCount,
				edgeChange,
				isRunning,
			});

			// Trigger if any node/edge changes occurred (including removals)
			if (nodeChange !== 0 || edgeChange !== 0) {
				logger.debug("graph", "Auto-trigger: node/edge changes detected", {
					nodeChange,
					edgeChange,
					action: isRunning ? "reheat" : "start",
				});

				if (isRunning) {
					// If simulation is already running, reheat it (reset alpha)
					reheatLayout();
				} else {
					// If simulation is not running, start it
					applyLayout();
				}
			}

			// Update previous counts
			prevNodeCountRef.current = currentNodeCount;
			prevEdgeCountRef.current = currentEdgeCount;
		};

		// Debounce the check to avoid too frequent triggers
		if (autoTriggerTimeoutRef.current) {
			clearTimeout(autoTriggerTimeoutRef.current);
		}

		autoTriggerTimeoutRef.current = setTimeout(checkNodeChanges, 500);

		return () => {
			if (autoTriggerTimeoutRef.current) {
				clearTimeout(autoTriggerTimeoutRef.current);
			}
		};
	}, [
		autoStartOnNodeChange,
		enabled,
		useAnimation,
		isWorkerReady,
		isRunning,
		getNodes,
		getEdges,
		applyLayout,
		reheatLayout,
	]);

	// Listen for restart requests from components outside this provider
	useEffect(() => {
		if (restartRequested && enabled && useAnimation && isWorkerReady) {
			logger.debug("graph", "Restart request received from external component", {
				enabled,
				useAnimation,
				isWorkerReady,
				isRunning,
			});

			// Clear the request flag first to prevent multiple triggers
			clearRestartRequest();

			if (isRunning) {
				reheatLayout();
			} else {
				restartLayout();
			}
		}
	}, [restartRequested, enabled, useAnimation, isWorkerReady, isRunning, restartLayout, reheatLayout, clearRestartRequest]);

	// Listen for graph events for immediate auto-trigger
	useEffect(() => {
		if (!autoStartOnNodeChange || !enabled || !useAnimation || !isWorkerReady) {
			return;
		}

		const handleGraphEvent = (event: { type: string; payload?: unknown }) => {
			const { type: eventType } = event;

			// Only trigger on significant node/edge addition events
			if (
				eventType === "graph:bulk-nodes-added" ||
				eventType === "graph:bulk-edges-added" ||
				(eventType === "graph:node-added" && Math.random() < 0.1) // Throttle single node additions
			) {
				logger.debug("graph", "Auto-trigger: graph event received", {
					eventType,
					action: isRunning ? "reheat" : "start",
				});

				// Small delay to allow ReactFlow to update
				setTimeout(() => {
					if (isRunning) {
						reheatLayout();
					} else {
						applyLayout();
					}
				}, 100);
			}
		};

		const eventType = "graph:auto-trigger";
		// Use unified event bus for custom event types
		const unsubscribe = eventBus.on(eventType, (event) => {
			if (event.payload && typeof event.payload === "object" && "type" in event.payload) {
				if (typeof event.payload.type === "string") {
					handleGraphEvent({
						type: event.payload.type,
						payload: "payload" in event.payload ? event.payload.payload : undefined
					});
				}
			}
		});

		return () => { unsubscribe(); };
	}, [autoStartOnNodeChange, enabled, useAnimation, isWorkerReady, isRunning, applyLayout, reheatLayout, eventBus]);
	// Initial trigger: DISABLED - causing restart loops
	// Manual animation start via Start button is preferred
	// useEffect(() => {
	// 	if (!enabled || !useAnimation || !isWorkerReady || isRunning) {
	// 		return;
	// 	}

	// 	const currentNodes = getNodes();

	// 	// Start animation if we have nodes but animation isn't running
	// 	if (currentNodes.length > 0) {
	// 		setTimeout(() => {
	// 			applyLayout();
	// 		}, 500); // Small delay to ensure everything is ready
	// 	}
	// }, [enabled, useAnimation, isWorkerReady, isRunning, getNodes, applyLayout]);

	// Separate handler for bulk expansion events (independent of autoStartOnNodeChange)
	useEffect(() => {
		if (!enabled || !useAnimation || !isWorkerReady) {
			return;
		}

		const handleExpansionEvent = (event: { type: string; payload?: unknown }) => {
			const { type: eventType } = event;

			// Only respond to bulk expansion events, not individual node/position changes
			if (eventType === "graph:bulk-nodes-added" || eventType === "graph:bulk-edges-added") {
				logger.debug("graph", "Bulk expansion detected during simulation", {
					eventType,
					isRunning,
					action: isRunning ? "reheat" : "start",
				});

				// Small delay to allow ReactFlow to update
				setTimeout(() => {
					if (isRunning) {
						// During simulation: reheat alpha to apply new edge forces
						logger.debug("graph", "Reheating simulation for new edges");
						reheatLayout();
					} else {
						// Not running: start new simulation with expanded graph
						logger.debug("graph", "Starting simulation with expanded graph");
						applyLayout();
					}
				}, 100);
			}
		};

		// Listen directly for bulk graph events
		const unsubscribeBulkNodes = eventBus.on("graph:bulk-nodes-added", (event) => {
			handleExpansionEvent({
				type: "graph:bulk-nodes-added",
				payload: event.payload
			});
		});

		const unsubscribeBulkEdges = eventBus.on("graph:bulk-edges-added", (event) => {
			handleExpansionEvent({
				type: "graph:bulk-edges-added",
				payload: event.payload
			});
		});

		return () => {
			unsubscribeBulkNodes();
			unsubscribeBulkEdges();
		};
	}, [enabled, useAnimation, isWorkerReady, isRunning, applyLayout, reheatLayout, eventBus]);

	// No listener here - moved to GraphNavigation for store access

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
		performanceStats: {
			averageFPS: fps || 0,
			minFPS: fps || 0,
			maxFPS: fps || 0,
			frameCount: iteration || 0,
		},
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

	useEffect(() => {
		if (typeof window !== "undefined") {
			const animatedStoreState = useAnimatedGraphStore.getState();
			(window as any).__animatedGraphDebug = {
				isRunning,
				isAnimating,
				isWorkerReady,
				useAnimation,
				animationHistoryLength: animatedStoreState.animationHistory.length,
				restartRequested: animatedStoreState.restartRequested,
			};
		}
	}, [isRunning, isAnimating, isWorkerReady, useAnimation]);

	return (
		<AnimatedLayoutContext.Provider value={contextValue}>
			{children}
		</AnimatedLayoutContext.Provider>
	);
};
