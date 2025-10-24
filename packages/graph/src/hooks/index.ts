/**
 * Hook Exports and Event Subscriptions
 * Re-exports hooks from the application that need to be accessible from the graph package
 */

// Hook for unified event system (stub - actual implementation in app)
export function useEventBus(_channelName?: string): unknown {
	throw new Error("useEventBus hook not available in graph package - use from application layer")
}

// Hook for event subscriptions (stub)
export function useEventSubscriptions(
	_bus: unknown,
	_subscriptions: Array<{
		eventType: string
		handler: unknown
	}>
): void {
	throw new Error(
		"useEventSubscriptions hook not available in graph package - use from application layer"
	)
}

// Hook for animated layout context (stub)
export function useAnimatedLayout(): {
	isAnimating: boolean
	isRunning: boolean
	isWorkerReady: boolean
	isPaused: boolean
	progress: number
	alpha: number
	iteration: number
	fps: number
	performanceStats: {
		averageFPS: number
		minFPS: number
		maxFPS: number
		frameCount: number
	}
	useAnimation: boolean
	applyLayout: () => void
	restartLayout: () => void
	stopLayout: () => void
	pauseLayout: () => void
	resumeLayout: () => void
	reheatLayout: (alpha?: number) => void
	updateParameters: (
		newParams: Partial<{
			linkDistance: number
			linkStrength: number
			chargeStrength: number
			centerStrength: number
			collisionRadius: number
			collisionStrength: number
			velocityDecay: number
			alphaDecay: number
		}>
	) => void
	canPause: boolean
	canResume: boolean
	canStop: boolean
	canRestart: boolean
} {
	throw new Error(
		"useAnimatedLayout hook not available in graph package - use from application layer"
	)
}

// Hook for unified task system (stub)
export function useUnifiedTaskSystem(): unknown {
	throw new Error(
		"useUnifiedTaskSystem hook not available in graph package - use from application layer"
	)
}
