/**
 * Common style constants for inline styles
 * Now using shadcn theme variables for consistent theming
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

// Colors using shadcn theme variables
export const COLOR_TEXT_PRIMARY = "var(--shadcn-foreground)";
export const COLOR_TEXT_SECONDARY = "var(--shadcn-muted-foreground)";
export const COLOR_TEXT_TERTIARY = "var(--shadcn-muted-foreground)";
export const COLOR_GRAY_600 = "var(--shadcn-zinc-500)";
export const COLOR_GRAY_500 = "var(--shadcn-zinc-500)";
export const COLOR_GRAY_700 = "var(--shadcn-zinc-600)";
export const COLOR_BLUE_500 = "var(--shadcn-blue)";
export const COLOR_GREEN_500 = "var(--shadcn-green)";
export const COLOR_RED_500 = "var(--shadcn-red)";
export const COLOR_YELLOW_500 = "var(--shadcn-amber)";
export const COLOR_AMBER_700 = "var(--shadcn-amber-700)";
export const COLOR_PURPLE_500 = "var(--shadcn-violet)";
export const COLOR_CYAN_500 = "var(--shadcn-cyan)";
export const COLOR_PINK_500 = "var(--shadcn-pink)";

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

// Borders using shadcn theme variables
export const BORDER_DEFAULT = "1px solid var(--shadcn-border)";
export const BORDER_STYLE = "1px solid var(--shadcn-border)";
export const BORDER_ERROR = "1px solid var(--shadcn-red-200)";
export const BORDER_WARNING = "1px solid var(--shadcn-amber-300)";
export const BORDER_GRAY_LIGHT = "1px solid var(--shadcn-zinc-300)";
export const BORDER_INPUT = "1px solid var(--shadcn-zinc-300)";

// Background colors using shadcn theme variables
export const BG_WHITE = "var(--shadcn-background)";
export const BG_GRAY_50 = "var(--shadcn-gray-50)";
export const BG_GRAY_100 = "var(--shadcn-gray-100)";
export const BG_RED_50 = "var(--shadcn-red-50)";
export const BG_YELLOW_50 = "var(--shadcn-amber-50)";

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
