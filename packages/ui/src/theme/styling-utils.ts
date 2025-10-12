import type { MantineTheme } from "@mantine/core";
import { colors, spacing, borderRadius, shadows, typography } from "./tokens";

/**
 * Theme tokens interface for styling utilities
 */
export interface ThemeTokens {
  colors: typeof colors;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
  typography: typeof typography;
}

/**
 * Creates sx functions for common UI sections (cards, badges, toolbars)
 * Each function returns a Mantine sx prop that can be used with theme-aware styling
 */
export function createSectionStyles(tokens: ThemeTokens) {
  return {
    /**
     * Card styling variants
     */
    card: {
      /**
       * Standard card with subtle shadow and border
       */
      standard: (theme: MantineTheme) => ({
        border: `1px solid ${theme.colors.gray[2]}`,
        borderRadius: tokens.borderRadius.md,
        boxShadow: tokens.shadows.sm,
        backgroundColor: theme.white,
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",

        "&:hover": {
          boxShadow: tokens.shadows.md,
          borderColor: theme.colors.gray[3],
        },
      }),

      /**
       * Elevated card with stronger shadow
       */
      elevated: (theme: MantineTheme) => ({
        border: `1px solid ${theme.colors.gray[2]}`,
        borderRadius: tokens.borderRadius.md,
        boxShadow: tokens.shadows.md,
        backgroundColor: theme.white,
        transition: "box-shadow 0.2s ease",

        "&:hover": {
          boxShadow: tokens.shadows.lg,
        },
      }),

      /**
       * Compact card for dense layouts
       */
      compact: (theme: MantineTheme) => ({
        border: `1px solid ${theme.colors.gray[2]}`,
        borderRadius: tokens.borderRadius.sm,
        boxShadow: tokens.shadows.xs,
        backgroundColor: theme.white,
        padding: tokens.spacing.sm,
      }),

      /**
       * Interactive card with hover effects
       */
      interactive: (theme: MantineTheme) => ({
        border: `1px solid ${theme.colors.gray[2]}`,
        borderRadius: tokens.borderRadius.md,
        boxShadow: tokens.shadows.sm,
        backgroundColor: theme.white,
        cursor: "pointer",
        transition: "all 0.2s ease",

        "&:hover": {
          boxShadow: tokens.shadows.md,
          borderColor: theme.colors.blue[3],
          transform: "translateY(-1px)",
        },

        "&:active": {
          transform: "translateY(0)",
          boxShadow: tokens.shadows.sm,
        },
      }),
    },

    /**
     * Badge styling variants
     */
    badge: {
      /**
       * Entity type badges with semantic colors
       */
      entity:
        (entityType: keyof typeof tokens.colors) => (theme: MantineTheme) => ({
          backgroundColor:
            tokens.colors[entityType]?.[1] || theme.colors.gray[1],
          color: tokens.colors[entityType]?.[7] || theme.colors.gray[7],
          border: `1px solid ${tokens.colors[entityType]?.[2] || theme.colors.gray[2]}`,
          fontSize: tokens.typography.fontSize.xs,
          fontWeight: tokens.typography.fontWeight.medium,
          borderRadius: tokens.borderRadius.sm,
          padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
        }),

      /**
       * Status badges (success, warning, error)
       */
      status:
        (status: "success" | "warning" | "error") => (theme: MantineTheme) => {
          const statusColors = {
            success: {
              bg: theme.colors.green[1],
              color: theme.colors.green[7],
              border: theme.colors.green[2],
            },
            warning: {
              bg: theme.colors.yellow[1],
              color: theme.colors.yellow[7],
              border: theme.colors.yellow[2],
            },
            error: {
              bg: theme.colors.red[1],
              color: theme.colors.red[7],
              border: theme.colors.red[2],
            },
          };

          const colors = statusColors[status];

          return {
            backgroundColor: colors.bg,
            color: colors.color,
            border: `1px solid ${colors.border}`,
            fontSize: tokens.typography.fontSize.xs,
            fontWeight: tokens.typography.fontWeight.medium,
            borderRadius: tokens.borderRadius.sm,
            padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
          };
        },

      /**
       * Metric badges for counts and statistics
       */
      metric: (theme: MantineTheme) => ({
        backgroundColor: theme.colors.blue[0],
        color: theme.colors.blue[6],
        border: `1px solid ${theme.colors.blue[1]}`,
        fontSize: tokens.typography.fontSize.xs,
        fontWeight: tokens.typography.fontWeight.semibold,
        fontFamily: "monospace",
        borderRadius: tokens.borderRadius.sm,
        padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
      }),
    },

    /**
     * Toolbar styling variants
     */
    toolbar: {
      /**
       * Standard toolbar with subtle background
       */
      standard: (theme: MantineTheme) => ({
        backgroundColor: theme.colors.gray[0],
        border: `1px solid ${theme.colors.gray[2]}`,
        borderRadius: tokens.borderRadius.md,
        padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
        boxShadow: tokens.shadows.xs,
      }),

      /**
       * Compact toolbar for space-constrained areas
       */
      compact: (theme: MantineTheme) => ({
        backgroundColor: theme.colors.gray[0],
        border: `1px solid ${theme.colors.gray[2]}`,
        borderRadius: tokens.borderRadius.sm,
        padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
      }),

      /**
       * Elevated toolbar with stronger shadow
       */
      elevated: (theme: MantineTheme) => ({
        backgroundColor: theme.white,
        border: `1px solid ${theme.colors.gray[2]}`,
        borderRadius: tokens.borderRadius.md,
        padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
        boxShadow: tokens.shadows.sm,
      }),

      /**
       * Action toolbar for bulk operations
       */
      action: (theme: MantineTheme) => ({
        backgroundColor: theme.white,
        border: `1px solid ${theme.colors.gray[2]}`,
        borderRadius: tokens.borderRadius.md,
        padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
        boxShadow: tokens.shadows.sm,
        borderBottom: `2px solid ${theme.colors.blue[3]}`,
      }),
    },
  };
}

/**
 * Helper to create CSS custom properties from theme tokens
 * Useful for CSS-in-JS solutions or global stylesheets
 */
export function withThemeVariables(tokens: ThemeTokens) {
  return {
    /**
     * Convert tokens to CSS custom properties
     */
    toCSSVariables: (prefix = "--ae") => {
      const variables: Record<string, string> = {};

      // Colors
      Object.entries(tokens.colors).forEach(([colorName, colorArray]) => {
        if (Array.isArray(colorArray)) {
          colorArray.forEach((color, index) => {
            variables[`${prefix}-color-${colorName}-${index * 100}`] = color;
          });
        }
      });

      // Spacing
      Object.entries(tokens.spacing).forEach(([key, value]) => {
        variables[`${prefix}-spacing-${key}`] = value;
      });

      // Border radius
      Object.entries(tokens.borderRadius).forEach(([key, value]) => {
        variables[`${prefix}-radius-${key}`] = value;
      });

      // Shadows
      Object.entries(tokens.shadows).forEach(([key, value]) => {
        variables[`${prefix}-shadow-${key}`] = value;
      });

      // Typography
      Object.entries(tokens.typography.fontSize).forEach(([key, value]) => {
        variables[`${prefix}-font-size-${key}`] = value;
      });

      Object.entries(tokens.typography.fontWeight).forEach(([key, value]) => {
        variables[`${prefix}-font-weight-${key}`] = value.toString();
      });

      Object.entries(tokens.typography.lineHeight).forEach(([key, value]) => {
        variables[`${prefix}-line-height-${key}`] = value.toString();
      });

      variables[`${prefix}-font-family`] = tokens.typography.fontFamily;

      return variables;
    },

    /**
     * Apply CSS variables to a DOM element
     */
    applyToElement: (element: HTMLElement, prefix = "--ae") => {
      const variables = withThemeVariables(tokens).toCSSVariables(prefix);
      Object.entries(variables).forEach(([key, value]) => {
        element.style.setProperty(key, value);
      });
    },

    /**
     * Get a CSS variable reference
     */
    var: (path: string, prefix = "--ae") => `var(${prefix}-${path})`,
  };
}

// Export the styling utilities with the current tokens
export const sectionStyles = createSectionStyles({
  colors,
  spacing,
  borderRadius,
  shadows,
  typography,
});

export const themeVariables = withThemeVariables({
  colors,
  spacing,
  borderRadius,
  shadows,
  typography,
});
