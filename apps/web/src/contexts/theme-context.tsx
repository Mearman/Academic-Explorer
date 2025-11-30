import React, { createContext, useContext, useEffect, useState } from "react";
import { MantineProvider, createTheme, type MantineTheme } from "@mantine/core";
import { useColorScheme, useHotkeys, useLocalStorage } from "@mantine/hooks";

import { shadcnMantineTheme } from "@/styles/shadcn-mantine-theme";

type ComponentLibrary = 'mantine' | 'shadcn' | 'radix'
type ColorScheme = 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'neutral'
type ColorMode = 'light' | 'dark' | 'auto'

interface ThemeConfig {
  componentLibrary: ComponentLibrary
  colorScheme: ColorScheme
  colorMode: ColorMode
}

// Theme context interface
interface ThemeContextType {
  config: ThemeConfig;
  setComponentLibrary: (library: ComponentLibrary) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setColorMode: (mode: ColorMode | "auto") => void;
  resetTheme: () => void;
}

// Create theme context
const ThemeContext = createContext<ThemeContextType | null>(null);

// Default theme configuration
const defaultThemeConfig: ThemeConfig = {
  componentLibrary: "mantine",
  colorScheme: "blue",
  colorMode: "light",
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

  const resetTheme = () => {
    setConfig(defaultThemeConfig);
  };

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
              borderRadius: "6px",
            },
          },
        },
        Card: {
          styles: {
            root: {
              boxShadow: "var(--mantine-shadow-md)",
              borderRadius: "8px",
            },
          },
        },
        Input: {
          styles: {
            input: {
              fontSize: "14px",
              lineHeight: "1.5",
              minHeight: "36px",
              borderRadius: "6px",
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
              borderRadius: "8px",
            },
          },
        },
        Card: {
          styles: {
            root: {
              boxShadow: "var(--mantine-shadow-sm)",
              borderRadius: "12px",
            },
          },
        },
        Input: {
          styles: {
            input: {
              fontSize: "14px",
              lineHeight: "1.5",
              minHeight: "40px",
              borderRadius: "8px",
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
              borderRadius: "4px",
            },
          },
        },
        Card: {
          styles: {
            root: {
              boxShadow: "var(--mantine-shadow-sm)",
              borderRadius: "6px",
            },
          },
        },
        Input: {
          styles: {
            input: {
              fontSize: "14px",
              lineHeight: "1.5",
              minHeight: "32px",
              borderRadius: "4px",
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
    resetTheme,
  };

  const mantineTheme = generateMantineTheme();

  return (
    <ThemeContext.Provider value={contextValue}>
      <MantineProvider theme={mantineTheme} defaultColorScheme={config.colorMode}>
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