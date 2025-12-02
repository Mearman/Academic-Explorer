/**
 * Configuration constants for cursor-centered zoom behavior in 3D graph visualization.
 *
 * These values control zoom sensitivity, distance limits, and animation timing.
 * All values are named constants per Constitution Principle XVII (No Magic Numbers).
 */

/**
 * Zoom behavior configuration
 */
export const ZOOM_CONFIG = {
	/** Zoom speed multiplier per wheel delta unit */
	WHEEL_ZOOM_SENSITIVITY: 0.001,

	/** Minimum distance from camera to zoom target (prevents entering geometry) */
	MIN_ZOOM_DISTANCE: 50,

	/** Maximum distance from camera to zoom target (keeps graph visible) */
	MAX_ZOOM_DISTANCE: 2000,

	/** Distance to project cursor ray when no node intersection occurs */
	FALLBACK_INTERSECTION_DISTANCE: 300,

	/** Duration of smooth zoom animation in milliseconds */
	ZOOM_ANIMATION_DURATION_MS: 150,

	/** RAF throttle interval - approximately 60fps */
	THROTTLE_INTERVAL_MS: 16,
} as const;

/**
 * Feature flags for zoom behavior
 */
export const ZOOM_FEATURE_FLAGS = {
	/** Enable cursor-centered zoom (vs orbit-center zoom) */
	ENABLE_CURSOR_CENTERED_ZOOM: true,

	/** Preserve keyboard zoom shortcuts (+/-, arrows) */
	PRESERVE_KEYBOARD_ZOOM: true,

	/** Enable debug logging for zoom operations */
	LOG_ZOOM_OPERATIONS: false,
} as const;

export type ZoomConfig = typeof ZOOM_CONFIG;
export type ZoomFeatureFlags = typeof ZOOM_FEATURE_FLAGS;
