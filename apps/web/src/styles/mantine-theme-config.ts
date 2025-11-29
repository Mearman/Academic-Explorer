/**
 * Mantine theme configuration
 * Contains theme tokens and utilities that are compatible with both Mantine and Vanilla Extract
 */

// Define proper type for Mantine colors
type MantineColorTuple = readonly [string, string, string, string, string, string, string, string, string, string, ...string[]];

// Extended color palette for use in Mantine configuration
const darkColors: MantineColorTuple = ["#d1d5db", "#9ca3af", "#6b7280", "#4b5563", "#374151", "#1f2937", "#111827", "#030712", "#000000", "#000000"];
const orangeColors: MantineColorTuple = ["#fff7ed", "#ffedd5", "#fed7aa", "#fdba74", "#fb923c", "#f97316", "#ea580c", "#c2410c", "#9a3412", "#7c2d12"];
const redColors: MantineColorTuple = ["#fef2f2", "#fee2e2", "#fecaca", "#fca5a5", "#f87171", "#ef4444", "#dc2626", "#b91c1c", "#991b1b", "#7f1d1d"];
const greenColors: MantineColorTuple = ["#f0fdf4", "#dcfce7", "#bbf7d0", "#86efac", "#4ade80", "#22c55e", "#16a34a", "#15803d", "#166534", "#14532d"];
const tealColors: MantineColorTuple = ["#f0fdfa", "#ccfbf1", "#99f6e4", "#5eead4", "#2dd4bf", "#14b8a6", "#0d9488", "#0f766e", "#115e59", "#134e4a"];
const blueColors: MantineColorTuple = ["#eff6ff", "#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e40af", "#1e3a8a"];
const cyanColors: MantineColorTuple = ["#ecfeff", "#cffafe", "#a5f3fc", "#67e8f9", "#22d3ee", "#06b6d4", "#0891b2", "#0e7490", "#155e75", "#164e63"];
const purpleColors: MantineColorTuple = ["#faf5ff", "#f3e8ff", "#e9d5ff", "#d8b4fe", "#c084fc", "#a855f7", "#9333ea", "#7c3aed", "#6b21a8", "#581c87"];
const pinkColors: MantineColorTuple = ["#fdf2f8", "#fce7f3", "#fbcfe8", "#f9a8d4", "#f472b6", "#ec4899", "#db2777", "#be185d", "#9d174d", "#831843"];
const limeColors: MantineColorTuple = ["#f7fee7", "#ecfccb", "#d9f99d", "#bef264", "#a3e635", "#84cc16", "#65a30d", "#4d7c0f", "#365314", "#1a2e05"];
const indigoColors: MantineColorTuple = ["#eef2ff", "#e0e7ff", "#c7d2fe", "#a5b4fc", "#818cf8", "#6366f1", "#4f46e5", "#4338ca", "#3730a3", "#312e81"];
const grayColors: MantineColorTuple = ["#f9fafb", "#f3f4f6", "#e5e7eb", "#d1d5db", "#9ca3af", "#6b7280", "#4b5563", "#374151", "#1f2937", "#111827"];

// Additional neutral color palettes for enhanced theming
const zincColors: MantineColorTuple = ["#fafafa", "#f4f4f5", "#e4e4e7", "#d4d4d8", "#a1a1aa", "#71717a", "#52525b", "#3f3f46", "#27272a", "#18181b"];
const slateColors: MantineColorTuple = ["#f8fafc", "#f1f5f9", "#e2e8f0", "#cbd5e1", "#94a3b8", "#64748b", "#475569", "#334155", "#1e293b", "#0f172a"];
const stoneColors: MantineColorTuple = ["#fafaf9", "#f5f5f4", "#e7e5e4", "#d6d3d1", "#a8a29e", "#78716c", "#57534e", "#44403c", "#292524", "#1c1917"];
const neutralColors: MantineColorTuple = ["#fafafa", "#f5f5f5", "#e5e5e5", "#d4d4d4", "#a3a3a3", "#737373", "#525252", "#404040", "#262626", "#171717"];

// Additional semantic colors
const amberColors: MantineColorTuple = ["#fffbeb", "#fef3c7", "#fde68a", "#fcd34d", "#fbbf24", "#f59e0b", "#d97706", "#b45309", "#92400e", "#78350f"];
const emeraldColors: MantineColorTuple = ["#ecfdf5", "#d1fae5", "#a7f3d0", "#6ee7b7", "#34d399", "#10b981", "#059669", "#047857", "#065f46", "#064e3b"];
const roseColors: MantineColorTuple = ["#fff1f2", "#ffe4e6", "#fecdd3", "#fda4af", "#fb7185", "#f43f5e", "#e11d48", "#be123c", "#9f1239", "#881337"];
const violetColors: MantineColorTuple = ["#f5f3ff", "#ede9fe", "#ddd6fe", "#c4b5fd", "#a78bfa", "#8b5cf6", "#7c3aed", "#6d28d9", "#5b21b6", "#4c1d95"];

// Export theme utilities for use in Mantine configuration
export const getMantineThemeTokens = () => ({
  colors: {
    dark: darkColors,
    gray: grayColors,
    red: redColors,
    pink: pinkColors,
    grape: purpleColors,
    violet: violetColors,
    indigo: indigoColors,
    blue: blueColors,
    cyan: cyanColors,
    teal: tealColors,
    green: greenColors,
    lime: limeColors,
    yellow: orangeColors,
    orange: orangeColors,
    // Additional color options
    zinc: zincColors,
    slate: slateColors,
    stone: stoneColors,
    neutral: neutralColors,
    amber: amberColors,
    emerald: emeraldColors,
    rose: roseColors,
  },
  spacing: {
    xs: "0.625rem",
    sm: "0.75rem",
    md: "1rem",
    lg: "1.25rem",
    xl: "2rem",
  },
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
  radius: {
    xs: "2px",
    sm: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
  },
  lineHeights: {
    xs: "1",
    sm: "1.25",
    md: "1.5",
    lg: "1.75",
  },
  breakpoints: {
    xs: "36em",
    sm: "48em",
    md: "62em",
    lg: "75em",
    xl: "88em",
  },
});

// Export colors for use in other files
export const extendedColors = {
  dark: darkColors,
  orange: orangeColors,
  red: redColors,
  green: greenColors,
  teal: tealColors,
  blue: blueColors,
  cyan: cyanColors,
  purple: purpleColors,
  pink: pinkColors,
  lime: limeColors,
  indigo: indigoColors,
  gray: grayColors,
  // Additional neutral colors
  zinc: zincColors,
  slate: slateColors,
  stone: stoneColors,
  neutral: neutralColors,
  // Additional semantic colors
  amber: amberColors,
  emerald: emeraldColors,
  rose: roseColors,
  violet: violetColors,
};

// Export entity color function for backward compatibility
export const getEntityMantineColor = (entityType: string): string => {
  const entityColors: Record<string, string> = {
    work: blueColors[5],
    author: greenColors[5],
    source: purpleColors[5],
    institution: orangeColors[5],
    concept: pinkColors[5],
    topic: redColors[5],
    publisher: tealColors[5],
    funder: cyanColors[5],
    keyword: grayColors[5],
  };

  return entityColors[entityType] || blueColors[5];
};