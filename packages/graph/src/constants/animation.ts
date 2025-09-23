/**
 * Graph animation and layout constants
 * Centralized configuration for consistent animations and timing across the graph system
 */

// Graph animation and layout constants
export const GRAPH_ANIMATION = {
	/**
	 * Standard fitView animation duration in milliseconds
	 * Used for smooth viewport transitions when fitting content to view
	 */
	FIT_VIEW_DURATION: 800,

	/**
	 * Padding values for different fitView contexts
	 */
	FIT_VIEW_PADDING: {
		/**
		 * Standard padding for most fitView operations (10% of viewport)
		 * Used for general layout adjustments and provider fitView calls
		 */
		DEFAULT: 0.1,

		/**
		 * Extra padding when showing connected nodes (30% of viewport)
		 * Used when centering on a node and showing its neighborhood
		 */
		NEIGHBORHOOD: 0.3,
	},

	/**
	 * Delay to avoid conflicting animations in milliseconds
	 * Must be greater than FIT_VIEW_DURATION to prevent overlapping viewport adjustments
	 * Used when manual centering needs to wait for automatic layout fitView to complete
	 */
	FIT_VIEW_CONFLICT_DELAY: 900,
} as const;

/**
 * Helper function to create consistent fitView options
 * Ensures all fitView calls across the application use the same defaults
 *
 * @param padding - Viewport padding (0-1 range, defaults to DEFAULT padding)
 * @param duration - Animation duration in milliseconds (defaults to standard duration)
 * @returns FitView options object compatible with ReactFlow fitView method
 */
export const createFitViewOptions = (
	padding: number = GRAPH_ANIMATION.FIT_VIEW_PADDING.DEFAULT,
	duration: number = GRAPH_ANIMATION.FIT_VIEW_DURATION,
) => ({
	padding,
	duration,
});

/**
 * Predefined fitView configurations for common use cases
 */
export const FIT_VIEW_PRESETS = {
	/**
	 * Standard fitView for general layout operations
	 */
	DEFAULT: createFitViewOptions(),

	/**
	 * Neighborhood fitView for showing connected nodes with extra padding
	 */
	NEIGHBORHOOD: createFitViewOptions(GRAPH_ANIMATION.FIT_VIEW_PADDING.NEIGHBORHOOD),
} as const;