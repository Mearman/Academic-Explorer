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

  // Border radius value mappings (matching Tailwind CSS)
  const radiusValues = {
    xs: "2px",   // rounded-sm
    sm: "4px",   // rounded (default)
    md: "6px",   // rounded-md
    lg: "8px",   // rounded-lg
    xl: "12px",  // rounded-xl
    "2xl": "16px", // rounded-2xl
    "3xl": "24px", // rounded-3xl
    full: "9999px", // rounded-full
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
              transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
              borderRadius: radiusValues[config.borderRadius],
              fontFamily: 'inherit',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              },
              '&:active': {
                transform: 'translateY(0)',
              },
            },
          },
        },
        Card: {
          styles: {
            root: {
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              borderRadius: radiusValues[config.borderRadius],
              backgroundColor: 'hsl(var(--shadcn-card))',
              border: '1px solid hsl(var(--shadcn-border))',
              transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              },
            },
          },
        },
        Input: {
          styles: {
            input: {
              fontSize: "14px",
              lineHeight: "1.5",
              minHeight: "40px", // h-10 in shadcn
              borderRadius: radiusValues[config.borderRadius],
              backgroundColor: 'hsl(var(--shadcn-background))',
              border: '1px solid hsl(var(--shadcn-border))',
              '&:focus': {
                borderColor: 'hsl(var(--shadcn-ring))',
                boxShadow: '0 0 0 3px hsl(var(--shadcn-ring) / 0.1)',
                outline: 'none',
              },
              '&:focus-visible': {
                outline: '2px solid hsl(var(--shadcn-ring))',
                outlineOffset: '2px',
              },
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
              fontFamily: 'inherit',
              // Radix is unstyled by default - minimal styling
              background: 'transparent',
              border: '1px solid transparent',
              cursor: 'pointer',
              '&:disabled': {
                opacity: '0.5',
                cursor: 'not-allowed',
              },
              '&:focus-visible': {
                outline: '2px solid hsl(var(--shadcn-ring))',
                outlineOffset: '2px',
              },
            },
          },
        },
        Card: {
          styles: {
            root: {
              // Radix is unstyled - absolutely minimal
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              borderRadius: radiusValues[config.borderRadius],
            },
          },
        },
        Input: {
          styles: {
            input: {
              fontSize: "14px",
              lineHeight: "1.5",
              minHeight: "32px", // More compact for Radix
              borderRadius: radiusValues[config.borderRadius],
              // Radix is unstyled - minimal browser defaults
              background: 'white',
              border: '1px solid #ccc',
              padding: '0 8px',
              '&:focus': {
                outline: '2px solid hsl(var(--shadcn-ring))',
                outlineOffset: '2px',
                borderColor: 'hsl(var(--shadcn-ring))',
              },
              '&:disabled': {
                opacity: '0.5',
                cursor: 'not-allowed',
                backgroundColor: '#f5f5f5',
              },
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