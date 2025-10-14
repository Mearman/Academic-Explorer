/**
 * Theme colors utility hook
 * Provides consistent access to theme colors across light and dark modes
 */

import { useMantineColorScheme, useMantineTheme } from "@mantine/core";
import { useMemo, useCallback } from "react";
import {
  getEntityColor as getTaxonomyColorName,
  detectEntityType,
} from "@academic-explorer/graph";

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
        author: theme.colors.green[5] || "#51cf66",
        source: theme.colors.purple[5] || "#c084fc",
        institution: theme.colors.orange[5] || "#ea580c",
        concept: theme.colors.pink[5] || "#f06595",
        topic: theme.colors.red[5] || "#fa5252",
        publisher: theme.colors.teal[5] || "#14b8a6",
        funder: theme.colors.cyan[5] || "#22b8cf",
      },

      // Entity to color name mapping for shade access
      entityColorNames: {
        work: "blue",
        author: "green",
        source: "purple",
        institution: "orange",
        concept: "pink",
        topic: "red",
        publisher: "teal",
        funder: "cyan",
      },
    }),
    [theme.colors, isDark],
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
        // Also support plural forms
        "works",
        "authors",
        "sources",
        "institutions",
        "concepts",
        "topics",
        "publishers",
        "funders",
      ];
      return validKeys.includes(key);
    },
    [colors],
  );

  // Entity color utilities - memoized to prevent React 19 infinite loops
  const getEntityColor = useCallback(
    (entityType: string | null | undefined): string => {
      // Handle undefined or null entity type
      if (!entityType) {
        return colors.primary;
      }

      // If entityType is already a detected entity type (like "works", "authors", etc.),
      // use it directly for color mapping
      const normalizedType = entityType.toLowerCase();
      if (isValidEntityColorKey(normalizedType)) {
        return colors.entity[normalizedType];
      }

      // If it's not a direct match, try to detect it as an OpenAlex ID
      try {
        const detectedType = detectEntityType(entityType);
        if (detectedType) {
          // Convert plural taxonomy key to singular color key
          const singularType = detectedType.replace(/s$/, "");
          if (isValidEntityColorKey(singularType)) {
            return colors.entity[singularType];
          }
        }
      } catch {
        // Ignore detection errors
      }

      return colors.primary;
    },
    [colors, isValidEntityColorKey],
  );
  const getEntityColorShade = useCallback(
    (entityType: string | null | undefined, shade: number = 5): string => {
      // Handle undefined or null entity type
      if (!entityType) {
        return getColor("blue", shade);
      }

      // If entityType is already a detected entity type, use it directly
      const normalizedType = entityType.toLowerCase();
      if (isValidEntityColorKey(normalizedType)) {
        // Convert plural to singular for color lookup
        const singularType = normalizedType.replace(
          /s$/,
          "",
        ) as keyof typeof colors.entityColorNames;
        const colorName = colors.entityColorNames[singularType];
        return getColor(colorName, shade);
      }

      // Fall back to detection if it's an OpenAlex ID
      try {
        const detectedType = detectEntityType(entityType);
        if (detectedType) {
          const taxonomyColorName = getTaxonomyColorName(detectedType);
          // Taxonomy color names directly map to Mantine palette names
          return getColor(taxonomyColorName, shade);
        }
      } catch {
        // Ignore detection errors
      }

      return getColor("blue", shade);
    },
    [colors, getColor, isValidEntityColorKey],
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
