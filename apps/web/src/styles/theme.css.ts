import { createTheme, globalStyle } from "@vanilla-extract/css";

// Academic Explorer Design Tokens
export const [themeClass, vars] = createTheme({
  color: {
    // Primary colors - Academic blue palette
    primary: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
    },

    // Neutral grays
    gray: {
      50: "#f9fafb",
      100: "#f3f4f6",
      200: "#e5e7eb",
      300: "#d1d5db",
      400: "#9ca3af",
      500: "#6b7280",
      600: "#4b5563",
      700: "#374151",
      800: "#1f2937",
      900: "#111827",
    },

    // Semantic colors
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#3b82f6",

    // Academic entity colors (matching taxonomy definitions and test expectations)
    work: "#228be6", // Blue[5] for works/papers
    author: "#10b981", // Green[5] for authors
    source: "#8b5cf6", // Purple for sources/journals
    institution: "#f59e0b", // Orange for institutions
    concept: "#ec4899", // Pink for concepts
    topic: "#ef4444", // Red for topics
    publisher: "#14b8a6", // Teal for publishers
    funder: "#06b6d4", // Cyan for funders
    keyword: "#6b7280", // Gray for keywords

    // Background and surface colors (light mode defaults)
    background: {
      primary: "#ffffff",
      secondary: "#f9fafb",
      tertiary: "#f3f4f6",
    },

    // Text colors (light mode defaults)
    text: {
      primary: "#111827",
      secondary: "#4b5563",
      tertiary: "#6b7280",
      inverse: "#ffffff",
    },

    // Border colors (light mode defaults)
    border: {
      primary: "#e5e7eb",
      secondary: "#d1d5db",
    },

    // Code/Badge background colors
    codeBg: "#f3f4f6",
    codeText: "#111827",

    // Error state colors
    errorBg: {
      light: "#fee2e2",
      lighter: "#fef2f2",
    },
    errorBorder: "#fecaca",
    errorText: "#b91c1c",
    errorDetailsBg: "#f9fafb",

    // Code viewer (dark theme for JSON/code display)
    codeViewer: {
      bg: "#111827",
      headerBg: "#1f2937",
      border: "#374151",
      text: "#f3f4f6",
    },

    // Section styling
    sectionHeaderGradientStart: "#f9fafb",
    sectionHeaderGradientEnd: "#ffffff",

    // Badge colors
    badgeBg: "#f3f4f6",

    // Boolean badge colors
    trueBadgeBg: "#d1fae5",
    trueBadgeText: "#065f46",
    trueBadgeBorder: "#6ee7b7",
    falseBadgeBg: "#fee2e2",
    falseBadgeText: "#991b1b",
    falseBadgeBorder: "#fca5a5",

    // Number badge colors
    numberBadgeBg: "#dbeafe",
    numberBadgeText: "#1e40af",
    numberBadgeBorder: "#93c5fd",

    // Array item colors
    arrayItemGradientStart: "#f9fafb",
    arrayItemGradientEnd: "#f3f4f6",
    arrayItemBorder: "#e5e7eb",

    // Object array colors
    objectArrayBorder: "#a5b4fc",
    objectArrayBg: "#eef2ff80",
    objectArrayNumberBg: "#6366f1",

    // Object field colors
    objectFieldBorder: "#d8b4fe",
    objectFieldBg: "#faf5ff66",
    objectFieldLabel: "#7c3aed",
    objectFieldHoverBorder: "#c084fc",
  },

  space: {
    0: "0",
    1: "0.25rem", // 4px
    2: "0.5rem", // 8px
    3: "0.75rem", // 12px
    4: "1rem", // 16px
    5: "1.25rem", // 20px
    6: "1.5rem", // 24px
    8: "2rem", // 32px
    10: "2.5rem", // 40px
    12: "3rem", // 48px
    16: "4rem", // 64px
    20: "5rem", // 80px
  },

  fontSize: {
    xs: "0.75rem", // 12px
    sm: "0.875rem", // 14px
    md: "1rem", // 16px
    lg: "1.125rem", // 18px
    xl: "1.25rem", // 20px
    "2xl": "1.5rem", // 24px
    "3xl": "1.875rem", // 30px
    "4xl": "2.25rem", // 36px
  },

  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },

  lineHeight: {
    tight: "1.25",
    normal: "1.5",
    relaxed: "1.75",
  },

  borderRadius: {
    none: "0",
    sm: "0.125rem", // 2px
    md: "0.375rem", // 6px
    lg: "0.5rem", // 8px
    xl: "0.75rem", // 12px
    full: "9999px",
  },

  borderWidth: {
    0: "0",
    1: "1px",
    2: "2px",
    4: "4px",
  },

  shadow: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  },
});

// Dark mode theme overrides using Mantine's color scheme data attribute
// Mantine applies [data-mantine-color-scheme] to the <html> element
// themeClass is on a descendant <div>, so we use a descendant selector
globalStyle(`[data-mantine-color-scheme="dark"] ${themeClass}`, {
  vars: {
    // Override background colors for dark mode
    [vars.color.background.primary]: "#1a1b1e",
    [vars.color.background.secondary]: "#25262b",
    [vars.color.background.tertiary]: "#2c2e33",

    // Override text colors for dark mode
    [vars.color.text.primary]: "#c1c2c5",
    [vars.color.text.secondary]: "#909296",
    [vars.color.text.tertiary]: "#5c5f66",
    [vars.color.text.inverse]: "#1a1b1e",

    // Override border colors for dark mode
    [vars.color.border.primary]: "#373a40",
    [vars.color.border.secondary]: "#2c2e33",

    // Override code/badge colors for dark mode
    [vars.color.codeBg]: "#2c2e33",
    [vars.color.codeText]: "#c1c2c5",

    // Override error state colors for dark mode
    [vars.color.errorBg.light]: "#42212180",
    [vars.color.errorBg.lighter]: "#31151580",
    [vars.color.errorBorder]: "#cc4c4c",
    [vars.color.errorText]: "#ff6b6b",
    [vars.color.errorDetailsBg]: "#25262b",

    // Code viewer colors stay dark-themed in dark mode (minimal change)
    [vars.color.codeViewer.bg]: "#0d1117",
    [vars.color.codeViewer.headerBg]: "#161b22",
    [vars.color.codeViewer.border]: "#30363d",
    [vars.color.codeViewer.text]: "#f0f6fc",

    // Section header gradient for dark mode (subtle)
    [vars.color.sectionHeaderGradientStart]: "#25262b",
    [vars.color.sectionHeaderGradientEnd]: "#1a1b1e",

    // Badge colors for dark mode
    [vars.color.badgeBg]: "#2c2e33",

    // Boolean badges for dark mode
    [vars.color.trueBadgeBg]: "#0a3d2c",
    [vars.color.trueBadgeText]: "#6ee7b7",
    [vars.color.trueBadgeBorder]: "#065f46",
    [vars.color.falseBadgeBg]: "#3d0a0a",
    [vars.color.falseBadgeText]: "#fca5a5",
    [vars.color.falseBadgeBorder]: "#991b1b",

    // Number badge for dark mode
    [vars.color.numberBadgeBg]: "#1e3a5f",
    [vars.color.numberBadgeText]: "#93c5fd",
    [vars.color.numberBadgeBorder]: "#1e40af",

    // Array item colors for dark mode
    [vars.color.arrayItemGradientStart]: "#2c2e33",
    [vars.color.arrayItemGradientEnd]: "#25262b",
    [vars.color.arrayItemBorder]: "#373a40",

    // Object array colors for dark mode
    [vars.color.objectArrayBorder]: "#4c4f82",
    [vars.color.objectArrayBg]: "#2c2e5580",
    [vars.color.objectArrayNumberBg]: "#4c4f82",

    // Object field colors for dark mode
    [vars.color.objectFieldBorder]: "#6b4f9e",
    [vars.color.objectFieldBg]: "#3a2d5066",
    [vars.color.objectFieldLabel]: "#c084fc",
    [vars.color.objectFieldHoverBorder]: "#a855f7",
  },
});

// Global styles
export const globalStyles = {
  "*": {
    boxSizing: "border-box",
  },

  "html, body": {
    margin: 0,
    padding: 0,
    fontFamily: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
    fontSize: vars.fontSize.md,
    lineHeight: vars.lineHeight.normal,
    color: vars.color.text.primary,
    backgroundColor: vars.color.background.primary,
  },

  "h1, h2, h3, h4, h5, h6": {
    fontWeight: vars.fontWeight.semibold,
    lineHeight: vars.lineHeight.tight,
    margin: 0,
  },

  p: {
    margin: 0,
  },

  a: {
    color: vars.color.primary[600],
    textDecoration: "none",
  },

  "a:hover": {
    color: vars.color.primary[700],
    textDecoration: "underline",
  },
};
