export const spacing = {
  xs: "0.25rem", // 4px
  sm: "0.5rem", // 8px
  md: "1rem", // 16px
  lg: "1.5rem", // 24px
  xl: "2rem", // 32px
  xxl: "3rem", // 48px
} as const;

export const colors = {
  // Primary blue palette
  blue: [
    "#eff6ff", // 50
    "#dbeafe", // 100
    "#bfdbfe", // 200
    "#93c5fd", // 300
    "#60a5fa", // 400
    "#3b82f6", // 500
    "#2563eb", // 600
    "#1d4ed8", // 700
    "#1e40af", // 800
    "#1e3a8a", // 900
  ] as const,

  // Neutral gray palette
  gray: [
    "#f9fafb", // 50
    "#f3f4f6", // 100
    "#e5e7eb", // 200
    "#d1d5db", // 300
    "#9ca3af", // 400
    "#6b7280", // 500
    "#4b5563", // 600
    "#374151", // 700
    "#1f2937", // 800
    "#111827", // 900
  ] as const,

  // Semantic colors for entities
  work: [
    "#eff6ff", // 50
    "#dbeafe", // 100
    "#bfdbfe", // 200
    "#93c5fd", // 300
    "#60a5fa", // 400
    "#3b82f6", // 500
    "#2563eb", // 600
    "#1d4ed8", // 700
    "#1e40af", // 800
    "#1e3a8a", // 900
  ] as const,

  author: [
    "#ecfdf5", // 50
    "#d1fae5", // 100
    "#a7f3d0", // 200
    "#6ee7b7", // 300
    "#34d399", // 400
    "#10b981", // 500
    "#059669", // 600
    "#047857", // 700
    "#065f46", // 800
    "#064e3b", // 900
  ] as const,

  source: [
    "#f3f4ff", // 50
    "#e2e8f0", // 100
    "#cbd5e1", // 200
    "#a855f7", // 300
    "#9333ea", // 400
    "#8b5cf6", // 500
    "#7c3aed", // 600
    "#6d28d9", // 700
    "#5b21b6", // 800
    "#4c1d95", // 900
  ] as const,

  institution: [
    "#fefce8", // 50
    "#fef3c7", // 100
    "#fde68a", // 200
    "#fcd34d", // 300
    "#fbbf24", // 400
    "#f59e0b", // 500
    "#d97706", // 600
    "#b45309", // 700
    "#92400e", // 800
    "#78350f", // 900
  ] as const,
} as const;

export const typography = {
  fontFamily: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
  fontSize: {
    xs: "0.75rem", // 12px
    sm: "0.875rem", // 14px
    md: "1rem", // 16px
    lg: "1.125rem", // 18px
    xl: "1.25rem", // 20px
    xxl: "1.5rem", // 24px
    xxxl: "2rem", // 32px
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const borderRadius = {
  xs: "0.125rem", // 2px
  sm: "0.25rem", // 4px
  md: "0.375rem", // 6px
  lg: "0.5rem", // 8px
  xl: "0.75rem", // 12px
  xxl: "1rem", // 16px
} as const;

export const shadows = {
  xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  sm: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
} as const;
