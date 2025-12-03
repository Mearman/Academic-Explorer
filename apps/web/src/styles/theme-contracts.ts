import type { ShadcnPalette } from "./shadcn-colors";

// Theme dimension types
export type ComponentLibrary = "mantine" | "shadcn" | "radix";
export type ColorScheme = ShadcnPalette;
export type ColorMode = "light" | "dark" | "auto";
export type BorderRadius = "xs" | "sm" | "md" | "lg" | "xl";

// Re-export the theme variables and contract from the .css.ts file

// Theme configuration type
export interface ThemeConfig {
  componentLibrary: ComponentLibrary;
  colorScheme: ColorScheme;
  colorMode: ColorMode;
  borderRadius: BorderRadius;
}