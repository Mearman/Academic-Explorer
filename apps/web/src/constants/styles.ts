/**
 * Common style constants for inline styles
 * These should eventually be migrated to use the theme tokens from styles/theme.css.ts
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

// Colors
export const COLOR_TEXT_PRIMARY = "#1f2937";
export const COLOR_TEXT_SECONDARY = "#6b7280";
export const COLOR_TEXT_TERTIARY = "#4b5563";
export const COLOR_GRAY_600 = "#6b7280";
export const COLOR_GRAY_500 = "#6b7280";
export const COLOR_GRAY_700 = "#374151";
export const COLOR_BLUE_500 = "#3b82f6";
export const COLOR_GREEN_500 = "#10b981";
export const COLOR_RED_500 = "#ef4444";
export const COLOR_YELLOW_500 = "#f59e0b";
export const COLOR_AMBER_700 = "#92400e";
export const COLOR_PURPLE_500 = "#8b5cf6";
export const COLOR_CYAN_500 = "#06b6d4";
export const COLOR_PINK_500 = "#ec4899";

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

// Borders
export const BORDER_DEFAULT = "1px solid #e5e7eb";
export const BORDER_STYLE = "1px solid #e5e7eb";
export const BORDER_ERROR = "1px solid #fca5a5";
export const BORDER_WARNING = "1px solid #fbbf24";
export const BORDER_GRAY_LIGHT = "1px solid var(--mantine-color-gray-3)";
export const BORDER_INPUT = "1px solid #d1d5db";

// Background colors
export const BG_WHITE = "white";
export const BG_GRAY_50 = "#f9fafb";
export const BG_GRAY_100 = "#f3f4f6";
export const BG_RED_50 = "#fef2f2";
export const BG_YELLOW_50 = "#fef3c7";

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
