/**
 * Graph Visualization Constants
 * Centralized configuration for graph rendering and simulation
 *
 * This file eliminates magic numbers across graph visualization components,
 * making defaults discoverable, documented, and easy to maintain.
 * @module components/graph/constants
 */

// =============================================================================
// SIMULATION PARAMETERS
// =============================================================================

/**
 * D3 force simulation configuration
 */
export const SIMULATION = {
  /** Default random seed for deterministic layouts (reproducibility) */
  DEFAULT_SEED: 42,
  /** Cooldown time before simulation stops (ms) */
  COOLDOWN_TIME_MS: 3000,
  /** Alpha decay rate - how quickly simulation cools down (higher = faster stop) */
  ALPHA_DECAY: 0.02,
  /** Velocity decay rate - friction factor (higher = more damping) */
  VELOCITY_DECAY: 0.3,
  /** Initial position spread range (nodes placed within ±INITIAL_SPREAD/2) */
  INITIAL_POSITION_SPREAD: 400,
} as const;

// =============================================================================
// NODE RENDERING
// =============================================================================

/**
 * Node visual styling defaults
 */
export const NODE = {
  /** Default node radius */
  DEFAULT_SIZE: 6,
  /** Highlighted node radius */
  HIGHLIGHTED_SIZE: 8,
  /** Border width for highlighted nodes */
  HIGHLIGHTED_BORDER_WIDTH: 2,
  /** Opacity for non-highlighted nodes in highlight mode */
  DIMMED_OPACITY: 0.2,
  /** Full opacity for highlighted nodes */
  FULL_OPACITY: 1,
} as const;

// =============================================================================
// LINK/EDGE RENDERING
// =============================================================================

/**
 * Edge/link visual styling defaults
 */
export const LINK = {
  /** Default edge width */
  DEFAULT_WIDTH: 2,
  /** Edge width when highlighted in path mode */
  HIGHLIGHTED_WIDTH: 3,
  /** Default edge opacity */
  DEFAULT_OPACITY: 0.6,
  /** Edge opacity when highlighted */
  HIGHLIGHTED_OPACITY: 0.8,
  /** Opacity for non-highlighted edges in highlight mode */
  DIMMED_OPACITY: 0.1,
  /** Dash pattern for dashed edges (dash length, gap length) */
  DASH_PATTERN: 5,
  /** Arrow head length */
  ARROW_LENGTH: 8,
  /** Arrow head angle (radians) - forms 30° angle from edge line */
  ARROW_ANGLE: Math.PI / 6,
} as const;

// =============================================================================
// LABEL RENDERING
// =============================================================================

/**
 * Node label rendering configuration
 */
export const LABEL = {
  /** Minimum zoom scale to show labels */
  ZOOM_THRESHOLD: 1.5,
  /** Base font size at zoom threshold */
  BASE_FONT_SIZE: 10,
  /** Minimum font size to prevent labels becoming too small */
  MIN_FONT_SIZE: 3,
  /** Vertical offset from node center to label top */
  VERTICAL_OFFSET: 2,
} as const;

// =============================================================================
// LOADING ANIMATION (EXPANDING NODES)
// =============================================================================

/**
 * Spinning ring animation for loading/expanding nodes
 */
export const LOADING_RING = {
  /** Ring radius multiplier relative to node size */
  RADIUS_MULTIPLIER: 1.5,
  /** Ring stroke width multiplier relative to node size */
  WIDTH_MULTIPLIER: 0.3,
  /** Secondary ring width multiplier relative to primary */
  SECONDARY_WIDTH_RATIO: 0.6,
  /** Primary ring rotation period (ms) - full rotation */
  PRIMARY_ROTATION_PERIOD_MS: 1500,
  /** Secondary ring rotation period (ms) - faster for visual interest */
  SECONDARY_ROTATION_PERIOD_MS: 750,
  /** Primary ring arc length (radians) - 270° arc */
  PRIMARY_ARC_LENGTH: Math.PI * 1.5,
  /** Secondary ring arc length (radians) - 90° arc */
  SECONDARY_ARC_LENGTH: Math.PI * 0.5,
  /** Ring opacity */
  OPACITY: 0.8,
  /** Primary ring color (deep sky blue) */
  PRIMARY_COLOR: '#00bfff',
  /** Secondary ring color (white, for contrast) */
  SECONDARY_COLOR: '#ffffff',
} as const;

// =============================================================================
// TIMING
// =============================================================================

/**
 * Timing constants for animations and delays
 */
export const TIMING = {
  /** Delay before checking if graph ref is ready (ms) */
  GRAPH_REF_CHECK_DELAY_MS: 100,
  /** Delay before auto-fitting graph to view (ms) - allows simulation to settle */
  AUTO_FIT_DELAY_MS: 500,
  /** Animation duration for zoom-to-fit (ms) */
  ZOOM_TO_FIT_DURATION_MS: 400,
  /** Padding for zoom-to-fit (px) */
  ZOOM_TO_FIT_PADDING: 50,
} as const;

// =============================================================================
// CONTAINER
// =============================================================================

/**
 * Container sizing defaults
 */
export const CONTAINER = {
  /** Default container width when not specified */
  DEFAULT_WIDTH: 800,
  /** Default container height */
  DEFAULT_HEIGHT: 500,
} as const;
