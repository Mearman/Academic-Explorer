/**
 * Common style constants for inline styles
 * Using Mantine theme variables for consistent cross-theme support
 */

// Font sizes
export const FONT_SIZE_12 = "12px";
export const FONT_SIZE_14 = "14px";
export const FONT_SIZE_16 = "16px";
export const FONT_SIZE_18 = "18px";
export const FONT_SIZE_20 = "20px";
export const FONT_SIZE_24 = "24px";
export const FONT_SIZE_32 = "32px";

// Font weights
export const FONT_WEIGHT_NORMAL = "400";
export const FONT_WEIGHT_MEDIUM = "500";
export const FONT_WEIGHT_SEMIBOLD = "600";
export const FONT_WEIGHT_BOLD = "700";

// Colors using Mantine theme variables (theme-agnostic)
export const COLOR_TEXT_PRIMARY = "var(--mantine-color-text)";
export const COLOR_TEXT_SECONDARY = "var(--mantine-color-dimmed)";
export const COLOR_TEXT_TERTIARY = "var(--mantine-color-dimmed)";
export const COLOR_GRAY_600 = "var(--mantine-color-gray-5)";
export const COLOR_GRAY_500 = "var(--mantine-color-gray-5)";
export const COLOR_GRAY_700 = "var(--mantine-color-gray-6)";
export const COLOR_BLUE_500 = "var(--mantine-color-blue-6)";
export const COLOR_GREEN_500 = "var(--mantine-color-green-6)";
export const COLOR_RED_500 = "var(--mantine-color-red-6)";
export const COLOR_YELLOW_500 = "var(--mantine-color-yellow-6)";
export const COLOR_AMBER_700 = "var(--mantine-color-yellow-7)";
export const COLOR_PURPLE_500 = "var(--mantine-color-violet-6)";
export const COLOR_CYAN_500 = "var(--mantine-color-cyan-6)";
export const COLOR_PINK_500 = "var(--mantine-color-pink-6)";

// Border radius
export const BORDER_RADIUS_SM = "6px";
export const BORDER_RADIUS_MD = "8px";
export const BORDER_RADIUS_LG = "12px";

// Spacing
export const PADDING_8 = "8px";
export const PADDING_12 = "12px";
export const PADDING_16 = "16px";
export const PADDING_20 = "20px";
export const PADDING_24 = "24px";

export const MARGIN_0 = { margin: 0 };
export const MARGIN_BOTTOM_4 = { marginBottom: "4px" };
export const MARGIN_BOTTOM_8 = { marginBottom: "8px" };
export const MARGIN_BOTTOM_16 = { marginBottom: "16px" };
export const MARGIN_BOTTOM_24 = { marginBottom: "24px" };

// Borders using Mantine theme variables
export const BORDER_DEFAULT = "1px solid var(--mantine-color-default-border)";
export const BORDER_STYLE = "1px solid var(--mantine-color-default-border)";
export const BORDER_ERROR = "1px solid var(--mantine-color-red-2)";
export const BORDER_WARNING = "1px solid var(--mantine-color-yellow-3)";
export const BORDER_GRAY_LIGHT = "1px solid var(--mantine-color-gray-3)";
export const BORDER_INPUT = "1px solid var(--mantine-color-gray-3)";

// Background colors using Mantine theme variables
export const BG_WHITE = "var(--mantine-color-body)";
export const BG_GRAY_50 = "var(--mantine-color-gray-0)";
export const BG_GRAY_100 = "var(--mantine-color-gray-1)";
export const BG_RED_50 = "var(--mantine-color-red-0)";
export const BG_YELLOW_50 = "var(--mantine-color-yellow-0)";

// Flexbox utilities
export const FLEX_JUSTIFY_SPACE_BETWEEN = "space-between";

// Common style objects
export const TEXT_SECONDARY_STYLE = {
  fontSize: FONT_SIZE_14,
  color: COLOR_TEXT_SECONDARY,
  margin: 0,
};

export const TEXT_TERTIARY_STYLE = {
  fontSize: FONT_SIZE_12,
  color: COLOR_TEXT_SECONDARY,
  margin: 0,
};

export const HEADING_STYLE = {
  fontSize: FONT_SIZE_16,
  fontWeight: FONT_WEIGHT_SEMIBOLD,
  color: COLOR_TEXT_PRIMARY,
  marginBottom: "8px",
};

export const CARD_STYLE = {
  backgroundColor: BG_WHITE,
  borderRadius: BORDER_RADIUS_LG,
  border: BORDER_DEFAULT,
  padding: PADDING_24,
};

export const SECTION_STYLE = {
  backgroundColor: BG_GRAY_50,
  borderRadius: BORDER_RADIUS_MD,
  border: BORDER_DEFAULT,
  padding: PADDING_20,
  marginBottom: PADDING_24,
};
