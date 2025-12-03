import { createTheme, style } from "@vanilla-extract/css";

import type { ComponentLibrary } from "./theme-contracts";
import { baseThemeContract } from "./theme-vars.css";

// Component library-specific spacing and design tokens
const componentLibraries = {
  mantine: {
    spacing: {
      unit: "1px",
      sm: "8px",
      md: "16px",
      lg: "24px",
    },
    borders: {
      radius: "6px", // Mantine's default border radius
      radiusSm: "4px",
      radiusLg: "8px",
    },
    shadows: {
      sm: "0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)",
      md: "0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)",
      lg: "0 10px 25px rgba(0, 0, 0, 0.15), 0 6px 10px rgba(0, 0, 0, 0.08)",
    },
  },
  shadcn: {
    spacing: {
      unit: "1px",
      sm: "6px", // Tighter spacing than Mantine
      md: "12px",
      lg: "20px",
    },
    borders: {
      radius: "8px", // shadcn's rounded-lg default
      radiusSm: "6px",
      radiusLg: "12px",
    },
    shadows: {
      sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
      lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    },
  },
  radix: {
    spacing: {
      unit: "1px",
      sm: "4px", // More minimal spacing
      md: "8px",
      lg: "16px",
    },
    borders: {
      radius: "4px", // Radix typically uses smaller radius
      radiusSm: "2px",
      radiusLg: "6px",
    },
    shadows: {
      sm: "0 1px 3px rgba(0, 0, 0, 0.1)",
      md: "0 2px 8px rgba(0, 0, 0, 0.1)",
      lg: "0 4px 12px rgba(0, 0, 0, 0.15)",
    },
  },
} as const;

// Export the component libraries for use in other files
export { componentLibraries };

// Component library themes
export const mantineTheme = createTheme(baseThemeContract, {
  colors: {
    primary: "var(--mantine-color-blue-6)",
    primaryHover: "var(--mantine-color-blue-7)",
    primaryLight: "var(--mantine-color-blue-0)",
    background: "var(--mantine-color-white)",
    backgroundHover: "var(--mantine-color-gray-0)",
    surface: "var(--mantine-color-white)",
    border: "var(--mantine-color-gray-3)",
    text: "var(--mantine-color-gray-9)",
    textSecondary: "var(--mantine-color-gray-6)",
    textMuted: "var(--mantine-color-gray-5)",
    card: "var(--mantine-color-white)",
    input: "var(--mantine-color-white)",
    button: "var(--mantine-color-blue-6)",
    buttonHover: "var(--mantine-color-blue-7)",
  },
  ...componentLibraries.mantine,
});

export const shadcnTheme = createTheme(baseThemeContract, {
  colors: {
    primary: "var(--mantine-color-blue-6)",
    primaryHover: "var(--mantine-color-blue-7)",
    primaryLight: "var(--mantine-color-blue-0)",
    background: "var(--mantine-color-white)",
    backgroundHover: "var(--mantine-color-gray-0)",
    surface: "var(--mantine-color-white)",
    border: "var(--mantine-color-gray-3)",
    text: "var(--mantine-color-gray-9)",
    textSecondary: "var(--mantine-color-gray-6)",
    textMuted: "var(--mantine-color-gray-5)",
    card: "var(--mantine-color-gray-0)",
    input: "var(--mantine-color-white)",
    button: "var(--mantine-color-blue-6)",
    buttonHover: "var(--mantine-color-blue-7)",
  },
  ...componentLibraries.shadcn,
});

export const radixTheme = createTheme(baseThemeContract, {
  colors: {
    primary: "var(--mantine-color-blue-6)",
    primaryHover: "var(--mantine-color-blue-7)",
    primaryLight: "var(--mantine-color-blue-0)",
    background: "var(--mantine-color-white)",
    backgroundHover: "var(--mantine-color-gray-0)",
    surface: "var(--mantine-color-white)",
    border: "var(--mantine-color-gray-3)",
    text: "var(--mantine-color-gray-9)",
    textSecondary: "var(--mantine-color-gray-6)",
    textMuted: "var(--mantine-color-gray-5)",
    card: "var(--mantine-color-white)",
    input: "var(--mantine-color-white)",
    button: "var(--mantine-color-blue-6)",
    buttonHover: "var(--mantine-color-blue-7)",
  },
  ...componentLibraries.radix,
});

// Component-specific style adaptations
export const mantineButton = style({
  // Mantine button characteristics
  fontWeight: 600,
  textTransform: "none",
  letterSpacing: "0.025em",
  transition: "all 0.2s ease",
});

export const shadcnButton = style({
  // shadcn/ui button characteristics
  fontWeight: 500,
  transition: "all 0.15s ease-in-out",
  // More subtle hover effects
});

export const radixButton = style({
  // Radix button characteristics
  fontWeight: 400,
  transition: "all 0.1s ease",
  // Minimal, utilitarian approach
});

// Card styles
export const mantineCard = style({
  // Mantine card characteristics
  boxShadow: "var(--shadow-md)",
  border: "1px solid var(--border)",
});

export const shadcnCard = style({
  // shadcn/ui card characteristics
  boxShadow: "var(--shadow-sm)",
  border: "1px solid var(--border)",
  backgroundColor: "var(--card)",
});

export const radixCard = style({
  // Radix card characteristics
  boxShadow: "var(--shadow-sm)",
  border: "1px solid var(--border)",
  backgroundColor: "var(--surface)",
});

// Input styles
export const mantineInput = style({
  // Mantine input characteristics
  fontSize: "14px",
  lineHeight: "1.5",
  minHeight: "36px",
  padding: "6px 12px",
});

export const shadcnInput = style({
  // shadcn/ui input characteristics
  fontSize: "14px",
  lineHeight: "1.5",
  minHeight: "40px", // Slightly larger
  padding: "8px 12px",
});

export const radixInput = style({
  // Radix input characteristics
  fontSize: "14px",
  lineHeight: "1.5",
  minHeight: "32px", // More compact
  padding: "4px 8px",
});

// Helper function to get component library theme
export const getComponentLibraryTheme = (library: ComponentLibrary) => {
  switch (library) {
    case "mantine":
      return mantineTheme;
    case "shadcn":
      return shadcnTheme;
    case "radix":
      return radixTheme;
    default:
      return mantineTheme;
  }
};

// Helper function to get button class for component library
export const getButtonClass = (library: ComponentLibrary) => {
  switch (library) {
    case "mantine":
      return mantineButton;
    case "shadcn":
      return shadcnButton;
    case "radix":
      return radixButton;
    default:
      return mantineButton;
  }
};

// Helper function to get card class for component library
export const getCardClass = (library: ComponentLibrary) => {
  switch (library) {
    case "mantine":
      return mantineCard;
    case "shadcn":
      return shadcnCard;
    case "radix":
      return radixCard;
    default:
      return mantineCard;
  }
};

// Helper function to get input class for component library
export const getInputClass = (library: ComponentLibrary) => {
  switch (library) {
    case "mantine":
      return mantineInput;
    case "shadcn":
      return shadcnInput;
    case "radix":
      return radixInput;
    default:
      return mantineInput;
  }
};