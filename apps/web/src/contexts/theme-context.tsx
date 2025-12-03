import { MantineProvider, createTheme, type MantineTheme } from "@mantine/core";
import { useColorScheme, useHotkeys, useLocalStorage } from "@mantine/hooks";
import React, { createContext, useContext, useEffect, useState } from "react";

import type { ShadcnPalette } from '@/styles/shadcn-colors'
import { createRuntimeThemeOverrides, radiusValues } from "@/styles/theme-context-utils";
import { mantineTheme, shadcnTheme, radixTheme } from "@/styles/themes";

type ComponentLibrary = 'mantine' | 'shadcn' | 'radix'
type ColorScheme = ShadcnPalette
type ColorMode = 'light' | 'dark' | 'auto'
type BorderRadius = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface ThemeConfig {
  componentLibrary: ComponentLibrary
  colorScheme: ColorScheme
  colorMode: ColorMode
  borderRadius: BorderRadius
}

// Theme context interface
interface ThemeContextType {
  config: ThemeConfig;
  setComponentLibrary: (library: ComponentLibrary) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setColorMode: (mode: ColorMode | "auto") => void;
  setBorderRadius: (radius: BorderRadius) => void;
  resetTheme: () => void;
}

// Create theme context
const ThemeContext = createContext<ThemeContextType | null>(null);

// Default theme configuration
const defaultThemeConfig: ThemeConfig = {
  componentLibrary: "mantine",
  colorScheme: "blue",
  colorMode: "auto",
  borderRadius: "md",
};

// Theme provider component
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorMode = useColorScheme();
  const [config, setConfig] = useLocalStorage<ThemeConfig>({
    key: "theme-config",
    defaultValue: defaultThemeConfig,
    getInitialValueInEffect: true,
  });

  
  // Theme setters
  const setComponentLibrary = (library: ComponentLibrary) => {
    setConfig((prev) => ({
      ...prev,
      componentLibrary: library,
    }));
  };

  const setColorScheme = (scheme: ColorScheme) => {
    setConfig((prev) => ({
      ...prev,
      colorScheme: scheme,
    }));
  };

  const setColorMode = (mode: ColorMode) => {
    setConfig((prev) => ({
      ...prev,
      colorMode: mode,
    }));
  };

  const setBorderRadius = (radius: BorderRadius) => {
    setConfig((prev) => ({
      ...prev,
      borderRadius: radius,
    }));
  };

  const resetTheme = () => {
    // Remove user preferences from localStorage to revert to defaults
    localStorage.removeItem("theme-config");
    setConfig(defaultThemeConfig);
  };

  // Keyboard shortcuts for theme switching
  useHotkeys([
    ["mod+K", () => setColorMode(config.colorMode === "light" ? "dark" : "light")],
    ["mod+Shift+K", () => setColorMode("auto")],
  ]);

  // Runtime theme overrides for global border radius
  const runtimeThemeOverrides = createRuntimeThemeOverrides(config.borderRadius);

  // Get base theme based on component library selection
  const getBaseTheme = () => {
    switch (config.componentLibrary) {
      case 'mantine':
        return mantineTheme
      case 'shadcn':
        return shadcnTheme
      case 'radix':
        return radixTheme
      default:
        return mantineTheme
    }
  }

  // Generate Mantine theme based on current configuration
  const generateMantineTheme = (): MantineTheme => {
    const baseTheme = getBaseTheme()

    return createTheme({
      ...baseTheme,
      primaryColor: config.colorScheme,
      focusRing: "auto" as const,
      defaultRadius: config.borderRadius, // Apply border radius globally
      // NO component-level overrides - handled in theme definitions
    }) as MantineTheme;
  };

  const contextValue: ThemeContextType = {
    config,
    setComponentLibrary,
    setColorScheme,
    setColorMode,
    setBorderRadius,
    resetTheme,
  };

  const currentMantineTheme = generateMantineTheme();

  // Determine the effective color scheme
  const effectiveColorScheme = config.colorMode === 'auto' ? systemColorMode : config.colorMode;

  return (
    <ThemeContext.Provider value={contextValue}>
      <MantineProvider
        theme={currentMantineTheme}
        defaultColorScheme={effectiveColorScheme}
        forceColorScheme={effectiveColorScheme}
      >
        {children}
      </MantineProvider>
    </ThemeContext.Provider>
  );
}

// Hook to use theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// Export theme context for use in components
export { ThemeContext };