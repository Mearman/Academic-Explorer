/**
 * Theme colors utility hook using shadcn theme system
 * Provides consistent access to shadcn theme colors across light and dark modes
 */

import { detectEntityType, getEntityColor as getTaxonomyColorName } from "@bibgraph/types";
import { useMantineColorScheme, useMantineTheme } from "@mantine/core";
import { useMemo, useCallback } from "react";

import { getAcademicEntityColors } from "@/styles/css-variable-resolver";

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
        return "light";
      }
    }
    return colorScheme;
  }, [colorScheme]);

  const isDark = resolvedColorScheme === "dark";

  // Get shadcn academic entity colors
  const shadcnEntityColors = getAcademicEntityColors();

  // Base color utilities - memoized to prevent React 19 infinite loops
  const getColor = useCallback(
    (color: string, shade: number = 6) => {
      if (color in theme.colors) {
        return theme.colors[color][shade] || color;
      }
      return color;
    },
    [theme.colors],
  );

  // Semantic colors using shadcn theme system - cached to prevent React 19 infinite loops
  const colors = useMemo(
    () => ({
      // Text colors using shadcn semantic colors
      text: {
        primary: isDark ? theme.colors.stone?.[0] ?? "#fafaf9" : theme.colors.stone?.[9] ?? "#0c0a09",
        secondary: isDark ? theme.colors.zinc?.[4] ?? "#a1a1aa" : theme.colors.zinc?.[5] ?? "#71717a",
        tertiary: isDark ? theme.colors.zinc?.[5] ?? "#71717a" : theme.colors.zinc?.[4] ?? "#a1a1aa",
        inverse: isDark ? theme.colors.stone?.[9] ?? "#0c0a09" : theme.colors.stone?.[0] ?? "#fafaf9",
      },

      // Background colors using shadcn semantic colors
      background: {
        primary: isDark ? theme.colors.slate?.[10] ?? "#020617" : theme.colors.slate?.[0] ?? "#f8fafc",
        secondary: isDark ? theme.colors.slate?.[9] ?? "#0f172a" : theme.colors.slate?.[1] ?? "#f1f5f9",
        tertiary: isDark ? theme.colors.slate?.[8] ?? "#1e293b" : theme.colors.slate?.[2] ?? "#e2e8f0",
        overlay: isDark ? "rgba(2, 6, 23, 0.8)" : "rgba(248, 250, 252, 0.95)",
        blur: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(241, 245, 249, 0.95)",
      },

      // Border colors using shadcn semantic colors
      border: {
        primary: isDark ? theme.colors.zinc?.[8] ?? "#27272a" : theme.colors.zinc?.[2] ?? "#e4e4e7",
        secondary: isDark ? theme.colors.zinc?.[7] ?? "#3f3f46" : theme.colors.zinc?.[3] ?? "#d4d4d8",
      },

      // Semantic colors using shadcn primary/secondary system
      primary: theme.colors.stone?.[6] ?? "#57534e",
      secondary: theme.colors.zinc?.[6] ?? "#52525b",
      success: theme.colors.emerald?.[6] ?? "#059669",
      warning: theme.colors.orange?.[6] ?? "#ea580c",
      error: theme.colors.red?.[6] ?? "#dc2626",
      info: theme.colors.sky?.[6] ?? "#0284c7",

      // Academic entity colors using shadcn palette mapping
      entity: {
        work: getColor(shadcnEntityColors.work, 6),
        author: getColor(shadcnEntityColors.author, 6),
        source: getColor(shadcnEntityColors.source, 6),
        institution: getColor(shadcnEntityColors.institution, 6),
        concept: getColor(shadcnEntityColors.concept, 6),
        topic: getColor(shadcnEntityColors.topic, 6),
        publisher: getColor(shadcnEntityColors.publisher, 6),
        funder: getColor(shadcnEntityColors.funder, 6),
      },

      // Entity to shadcn color name mapping for shade access
      entityColorNames: shadcnEntityColors,
    }),
    [theme.colors, isDark, shadcnEntityColors, getColor],
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
    [], // No dependencies needed - validKeys is static
  );

  // Entity color utilities - memoized to prevent React 19 infinite loops
  const getEntityColor = useCallback(
    (entityType: string | null | undefined): string => {
      // Handle undefined or null entity type
      if (!entityType) {
        return colors.primary;
      }

      // If entityType is already a detected entity type (like "works", "authors", etc.),
      // convert to singular for color mapping
      const normalizedType = entityType.toLowerCase();
      if (isValidEntityColorKey(normalizedType)) {
        // Convert plural to singular for color lookup
        const singularType = normalizedType.replace(
          /s$/,
          "",
        ) as keyof typeof colors.entity;
        return colors.entity[singularType];
      }

      // If it's not a direct match, try to detect it as an OpenAlex ID
      try {
        const detectedType = detectEntityType(entityType);
        if (detectedType) {
          // Convert plural taxonomy key to singular color key
          const singularType = detectedType.replace(/s$/, "");
          if (isValidEntityColorKey(singularType)) {
            return colors.entity[singularType as keyof typeof colors.entity];
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
    (entityType: string | null | undefined, shade: number = 6): string => {
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
          // Taxonomy color names directly map to shadcn palette names
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
    resolvedColorScheme,
  };
}
