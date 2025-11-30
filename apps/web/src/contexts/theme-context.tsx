import React, { createContext, useContext, useEffect, useState } from "react";
import { MantineProvider, createTheme, type MantineTheme } from "@mantine/core";
import { useColorScheme, useHotkeys, useLocalStorage } from "@mantine/hooks";

import { shadcnMantineTheme } from "@/styles/shadcn-mantine-theme";

import type { ShadcnPalette } from '@/styles/shadcn-colors'

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
  colorMode: "light",
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
    setConfig(defaultThemeConfig);
  };

  // Border radius value mappings
  const radiusValues = {
    xs: "2px",
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px",
  } as const;

  // Keyboard shortcuts for theme switching
  useHotkeys([
    ["mod+K", () => setColorMode(config.colorMode === "light" ? "dark" : "light")],
    ["mod+Shift+K", () => setColorMode("auto")],
  ]);

  // Component library theme overrides
  const componentLibraryOverrides = {
    mantine: {
      components: {
        Button: {
          styles: {
            root: {
              fontWeight: 600,
              textTransform: "none",
              letterSpacing: "0.025em",
              transition: "all 0.2s ease",
              borderRadius: radiusValues[config.borderRadius],
            },
          },
        },
        Card: {
          styles: {
            root: {
              boxShadow: "var(--mantine-shadow-md)",
              borderRadius: radiusValues[config.borderRadius],
            },
          },
        },
        Input: {
          styles: {
            input: {
              fontSize: "14px",
              lineHeight: "1.5",
              minHeight: "36px",
              borderRadius: radiusValues[config.borderRadius],
            },
          },
        },
      },
    },
    shadcn: {
      components: {
        Button: {
          styles: {
            root: {
              fontWeight: 500,
              transition: "all 0.15s ease-in-out",
              borderRadius: radiusValues[config.borderRadius],
            },
          },
        },
        Card: {
          styles: {
            root: {
              boxShadow: "var(--mantine-shadow-sm)",
              borderRadius: radiusValues[config.borderRadius],
            },
          },
        },
        Input: {
          styles: {
            input: {
              fontSize: "14px",
              lineHeight: "1.5",
              minHeight: "40px",
              borderRadius: radiusValues[config.borderRadius],
            },
          },
        },
      },
    },
    radix: {
      components: {
        Button: {
          styles: {
            root: {
              fontWeight: 400,
              transition: "all 0.1s ease",
              borderRadius: radiusValues[config.borderRadius],
            },
          },
        },
        Card: {
          styles: {
            root: {
              boxShadow: "var(--mantine-shadow-sm)",
              borderRadius: radiusValues[config.borderRadius],
            },
          },
        },
        Input: {
          styles: {
            input: {
              fontSize: "14px",
              lineHeight: "1.5",
              minHeight: "32px",
              borderRadius: radiusValues[config.borderRadius],
            },
          },
        },
      },
    },
  };

  // Generate Mantine theme based on current configuration
  const generateMantineTheme = (): MantineTheme => {
    const libraryOverrides = componentLibraryOverrides[config.componentLibrary];

    return createTheme({
      ...shadcnMantineTheme,
      primaryColor: config.colorScheme,
      focusRing: "auto" as const,
      // Apply component library specific overrides
      components: {
        ...shadcnMantineTheme.components,
        ...libraryOverrides.components,
      },
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

  const mantineTheme = generateMantineTheme();

  // Determine the effective color scheme
  const effectiveColorScheme = config.colorMode === 'auto' ? systemColorMode : config.colorMode;

  return (
    <ThemeContext.Provider value={contextValue}>
      <MantineProvider
        theme={mantineTheme}
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