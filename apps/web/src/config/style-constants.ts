/**
 * Style Constants
 * Centralized configuration for commonly used style values
 *
 * This file eliminates duplicated inline styles across components,
 * ensuring consistent visual appearance and making styling values
 * discoverable and maintainable.
 * @module config/style-constants
 */

import type { CSSProperties } from "react";

// =============================================================================
// BORDER STYLES
// =============================================================================

/**
 * Standard border style using Mantine's gray-3 color
 * Used for card, paper, and container borders throughout the app
 */
export const BORDER_STYLE_GRAY_3 = "1px solid var(--mantine-color-gray-3)";

/**
 * Lighter border style using Mantine's gray-2 color
 * Used for subtle dividers and secondary borders
 */
export const BORDER_STYLE_GRAY_2 = "1px solid var(--mantine-color-gray-2)";

/**
 * Border style using Mantine's default border color
 * Used for theme-aware borders that adapt to color scheme
 */
export const BORDER_STYLE_DEFAULT = "1px solid var(--mantine-color-default-border)";

// =============================================================================
// STYLE OBJECTS
// =============================================================================

/**
 * Standard card border style object
 * Use with Mantine's style prop: style={CARD_BORDER_STYLE}
 */
export const CARD_BORDER_STYLE: CSSProperties = {
	border: BORDER_STYLE_GRAY_3,
};

/**
 * Standard paper border style object
 * Use with Mantine's style prop: style={PAPER_BORDER_STYLE}
 */
export const PAPER_BORDER_STYLE: CSSProperties = {
	border: BORDER_STYLE_GRAY_3,
};

// =============================================================================
// SPACING VALUES
// =============================================================================

/**
 * Standard border radius for cards and containers
 */
export const BORDER_RADIUS_SM = 4;
export const BORDER_RADIUS_MD = 8;
export const BORDER_RADIUS_LG = 12;
export const BORDER_RADIUS_XL = 16;

// =============================================================================
// MANTINE THEME RADIUS MAP
// =============================================================================

/**
 * Maps Mantine theme border radius sizes to CSS pixel values
 * Used for components that need theme-aware border radius styling
 */
export const MANTINE_THEME_BORDER_RADIUS = {
	xs: "4px",
	sm: "8px",
	md: "16px",
	lg: "24px",
	xl: "32px",
} as const;

/**
 * Default border radius fallback value
 */
export const DEFAULT_THEME_BORDER_RADIUS = "16px";

// =============================================================================
// BUTTON SIZE CONSTANTS
// =============================================================================

/**
 * Default height for split buttons and compound button groups
 */
export const SPLIT_BUTTON_HEIGHT = 34;

/**
 * Default minimum width for split buttons
 */
export const SPLIT_BUTTON_MIN_WIDTH = 120;
