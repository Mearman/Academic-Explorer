// Theme context utilities - simplified for global border radius application

// Border radius value mappings (matching Tailwind CSS)
export const radiusValues = {
  xs: "2px",   // rounded-sm
  sm: "4px",   // rounded (default)
  md: "6px",   // rounded-md
  lg: "8px",   // rounded-lg
  xl: "12px",  // rounded-xl
  "2xl": "16px", // rounded-2xl
  "3xl": "24px", // rounded-3xl
  full: "9999px", // rounded-full
} as const

// Simplified runtime theme overrides - only handles global border radius
// All component styling is now handled in theme definitions, not runtime overrides
export const createRuntimeThemeOverrides = (borderRadius: keyof typeof radiusValues) => ({
  mantine: {
    defaultRadius: borderRadius,
  },
  shadcn: {
    defaultRadius: borderRadius,
  },
  radix: {
    defaultRadius: borderRadius,
  },
})