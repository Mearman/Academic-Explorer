/**
 * Theme colors utility hook
 * Provides consistent access to theme colors across light and dark modes
 */

import { useMantineColorScheme, useMantineTheme } from "@mantine/core";
import { useMemo, useCallback } from "react";
import { getEntityColor as getTaxonomyColorName } from "@academic-explorer/graph";

export function useThemeColors() {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  // Resolve the actual color scheme when colorScheme is 'auto'
  const resolvedColorScheme = useMemo(() => {
    if (colorScheme === "auto") {
      try {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      } catch {
        return "light"; // Fallback to light mode if matchMedia fails
      }
    }
    return colorScheme;
  }, [colorScheme]);

  const isDark = resolvedColorScheme === "dark";

  // Base color utilities - memoized to prevent React 19 infinite loops
  const getColor = useCallback(
    (color: string, shade: number = 5) => {
      if (color in theme.colors) {
        return theme.colors[color][shade] || color;
      }
      return color;
    },
    [theme.colors],
  );

  // Semantic colors that adapt to light/dark mode - cached to prevent React 19 infinite loops
  const colors = useMemo(
    () => ({
      // Text colors - using Mantine CSS variables for better theme integration
      text: {
        primary: "var(--mantine-color-text)",
        secondary: isDark ? theme.colors.gray[3] : theme.colors.gray[6],
        tertiary: isDark ? theme.colors.gray[4] : theme.colors.gray[5],
        inverse: isDark ? theme.colors.gray[9] : theme.colors.gray[0],
      },

      // Background colors - using Mantine CSS variables for better theme integration
      background: {
        primary: "var(--mantine-color-body)",
        secondary: isDark ? theme.colors.gray[8] : theme.colors.gray[0],
        tertiary: isDark ? theme.colors.gray[7] : theme.colors.gray[1],
        overlay: isDark ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.95)",
        blur: isDark ? "rgba(31, 41, 55, 0.95)" : "rgba(255, 255, 255, 0.95)",
      },

      // Border colors - using Mantine CSS variables for better theme integration
      border: {
        primary: "var(--mantine-color-default-border)",
        secondary: isDark ? theme.colors.gray[6] : theme.colors.gray[3],
      },

      // Semantic colors
      primary: theme.colors.blue[5],
      success: theme.colors.green[5] || "#10b981",
      warning: theme.colors.yellow[5] || "#f59e0b",
      error: theme.colors.red[5] || "#ef4444",
      info: theme.colors.blue[5],

      // Academic entity colors
      entity: {
        work: theme.colors.blue[5],
        author: "#10b981",
        source: "#8b5cf6",
        institution: "#f59e0b",
        concept: theme.colors.red[5],
        topic: theme.colors.red[5],
        publisher: theme.colors.cyan[5],
        funder: theme.colors.pink[5],
      },
    }),
    [theme.colors, isDark],
  );

  // Cached color map to prevent new objects on each render
  // Maps taxonomy color names to theme color palette names for getEntityColorShade
  const colorMap = useMemo(
    () => ({
      // Taxonomy color name -> Mantine color palette name
      blue: "blue", // works
      green: "author", // authors
      purple: "source", // sources
      orange: "institution", // institutions
      teal: "teal", // publishers
      cyan: "cyan", // funders
      red: "red", // topics
      pink: "pink", // concepts
      gray: "gray", // keywords
      // Also map entity types directly for convenience (for getEntityColorShade)
      work: "blue",
      works: "blue",
      author: "author",
      authors: "author",
      source: "source",
      sources: "source",
      institution: "institution",
      institutions: "institution",
      concept: "pink",
      concepts: "pink",
      topic: "red",
      topics: "red",
      publisher: "teal",
      publishers: "teal",
      funder: "cyan",
      funders: "cyan",
      keyword: "gray",
      keywords: "gray",
    }),
    [],
  );

  // Type guard for valid entity color keys
  const isValidEntityColorKey = useCallback(
    (key: string): key is keyof typeof colors.entity => {
      const validKeys = [
        "work",
        "author",
        "source",
        "institution",
        "concept",
        "topic",
        "publisher",
        "funder",
      ];
      return validKeys.includes(key);
    },
    [colors],
  );

  // Entity color utilities - memoized to prevent React 19 infinite loops
  const getEntityColor = useCallback(
    (entityType: string): string => {
      try {
        // Get the taxonomy color name for this entity type
        const taxonomyColorName = getTaxonomyColorName(entityType as any);
        // Map the taxonomy color name to the actual CSS color
        const themeColorKey = colorMap[taxonomyColorName];
        if (themeColorKey && colors.entity[themeColorKey]) {
          return colors.entity[themeColorKey];
        }
      } catch {
        // Fall back to direct mapping if taxonomy lookup fails
        const normalizedType = entityType.toLowerCase();
        if (isValidEntityColorKey(normalizedType)) {
          return colors.entity[normalizedType];
        }
      }

      return colors.primary;
    },
    [colors, isValidEntityColorKey, colorMap],
  );

  const getEntityColorShade = useCallback(
    (entityType: string, shade: number = 5): string => {
      try {
        // Get the taxonomy color name for this entity type
        const taxonomyColorName = getTaxonomyColorName(entityType as any);
        // For shades, we need to map taxonomy color names to Mantine palette names
        const paletteMap: Record<string, string> = {
          blue: "blue",
          green: "author", // authors use custom "author" palette
          purple: "source", // sources use custom "source" palette
          orange: "institution", // institutions use custom "institution" palette
          teal: "teal",
          cyan: "cyan",
          red: "red",
          pink: "pink",
          gray: "gray",
        };
        const paletteName = paletteMap[taxonomyColorName] || "blue";
        return getColor(paletteName, shade);
      } catch {
        // Fall back to direct mapping if taxonomy lookup fails
        const normalizedType = entityType.toLowerCase();
        const paletteName = colorMap[normalizedType] || "blue";
        return getColor(paletteName, shade);
      }
    },
    [getColor, colorMap],
  );

  return {
    colors,
    getColor,
    getEntityColor,
    getEntityColorShade,
    isDark,
    theme,
  };
}
