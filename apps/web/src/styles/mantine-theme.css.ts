/**
 * Mantine Vanilla Extract Theme
 * Vanilla Extract theme classes for CSS variables integration
 */

import { createTheme, globalStyle } from "@vanilla-extract/css";

// Import the existing theme tokens to maintain continuity
import { vars, themeClass } from "./theme.css";

// Create a Vanilla Extract theme for CSS variables
export const [mantineThemeClass, mantineVars] = createTheme({
  // Extend the existing vars with new Mantine-specific variables
  color: {
    ...vars.color,
  },

  // Add Mantine-specific spacing and sizing
  spacing: {
    xs: "0.625rem",   // 10px
    sm: "0.75rem",    // 12px
    md: "1rem",       // 16px
    lg: "1.25rem",    // 20px
    xl: "2rem",       // 32px
  },

  // Mantine font sizes (in px for compatibility)
  fontSizes: {
    xs: "12px",
    sm: "14px",
    base: "16px",
    lg: "18px",
    xl: "20px",
    "2xl": "24px",
    "3xl": "30px",
    "4xl": "36px",
  },

  // Border radius
  radius: {
    xs: "0.125rem",   // 2px
    sm: "0.25rem",    // 4px
    md: "0.375rem",   // 6px
    lg: "0.5rem",     // 8px
    xl: "0.75rem",    // 12px
  },

  // Line heights
  lineHeights: {
    xs: "1",
    sm: "1.25",
    md: "1.5",
    lg: "1.75",
  },

  // Shell and layout spacing (from provided theme)
  shell: {
    padding: "1rem",  // 16px
  },

  // Header and navigation dimensions
  header: {
    height: "4rem",   // 64px
    padding: "1rem 2rem", // 16px 32px
  },

  // Navbar dimensions
  navbar: {
    width: "280px",
    padding: "0.75rem 1rem", // 12px 16px
  },

  // Container sizes (from provided theme)
  container: {
    xs: "540px",
    sm: "720px",
    md: "960px",
    lg: "1140px",
    xl: "1320px",
  },

  // Specific component spacing (from CONTAINER_SIZES)
  sectionSpacing: "5rem", // 80px

  // Action button sizing
  actionIcon: {
    sizes: {
      xs: "1rem",    // 16px
      sm: "1.25rem", // 20px
      md: "1.5rem",  // 24px
      lg: "1.875rem", // 30px
      xl: "2.25rem", // 36px
    },
  },
});

// Color constants for CSS variable mapping
const blueColors = ["#eff6ff", "#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e40af", "#1e3a8a"];

// Global styles for Mantine components integration
globalStyle(`${mantineThemeClass}`, {
  // Ensure proper integration with existing theme variables
  vars: {
    // Map Vanilla Extract variables to Mantine CSS variables
    "--mantine-color-body": vars.color.background.primary,
    "--mantine-color-text": vars.color.text.primary,
    "--mantine-color-default-border": vars.color.border.primary,
    "--mantine-color-default-hover": vars.color.background.secondary,

    // Map primary color
    "--mantine-primary-color-0": blueColors[0],
    "--mantine-primary-color-1": blueColors[1],
    "--mantine-primary-color-2": blueColors[2],
    "--mantine-primary-color-3": blueColors[3],
    "--mantine-primary-color-4": blueColors[4],
    "--mantine-primary-color-5": blueColors[5],
    "--mantine-primary-color-6": blueColors[6],
    "--mantine-primary-color-7": blueColors[7],
    "--mantine-primary-color-8": blueColors[8],
    "--mantine-primary-color-9": blueColors[9],
    "--mantine-primary-color-filled": blueColors[6],
    "--mantine-primary-color-light": blueColors[1],
    "--mantine-primary-color-light-hover": blueColors[2],
    "--mantine-primary-color-light-color": blueColors[7],
    "--mantine-primary-color-outline": blueColors[6],
    "--mantine-primary-color-contrast": "#ffffff",
  },
});

// Dark mode overrides
globalStyle(`[data-mantine-color-scheme="dark"] ${mantineThemeClass}`, {
  vars: {
    "--mantine-color-body": vars.color.background.primary,
    "--mantine-color-text": vars.color.text.primary,
    "--mantine-color-default-border": vars.color.border.primary,
    "--mantine-color-default-hover": vars.color.background.secondary,

    // Adjust dark mode primary colors
    "--mantine-primary-color-light": blueColors[1],
    "--mantine-primary-color-light-hover": blueColors[2],
    "--mantine-primary-color-light-color": blueColors[3],
  },
});