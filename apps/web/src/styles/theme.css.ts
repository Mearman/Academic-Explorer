import { createTheme } from "@vanilla-extract/css";

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

    // Background and surface colors
    background: {
      primary: "#ffffff",
      secondary: "#f9fafb",
      tertiary: "#f3f4f6",
    },

    // Text colors
    text: {
      primary: "#111827",
      secondary: "#4b5563",
      tertiary: "#6b7280",
      inverse: "#ffffff",
    },
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
