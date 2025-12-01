/**
 * Dynamic theme utilities using @vanilla-extract/dynamic
 * Provides runtime theme switching and conditional styling capabilities
 */

import { assignInlineVars, setElementVars } from '@vanilla-extract/dynamic';
import { style } from '@vanilla-extract/css';
import { themeVars } from '../theme-vars.css';
import type { ComponentLibrary } from '../theme-contracts';

/**
 * Dynamic theme variables that can change at runtime
 * These enable runtime theme switching without page reload
 */

// Base dynamic theme contract
export const dynamicThemeVars = {
  // Component library context
  componentLibrary: themeVars.componentLibrary,

  // Colors that adapt to theme changes
  primaryColor: themeVars.primaryColor,
  primaryHover: themeVars.primaryColorHover,
  backgroundColor: themeVars.backgroundColor,
  surfaceColor: themeVars.surfaceColor,
  borderColor: themeVars.borderColor,
  textColor: themeVars.textColor,

  // Interactive colors
  hoverBackground: 'var(--hover-background)',
  activeBackground: 'var(--active-background)',
  selectedBackground: 'var(--selected-background)',

  // Component-specific
  cardBackground: themeVars.cardBackground,
  inputBackground: themeVars.inputBackground,
  buttonBackground: themeVars.buttonBackground,

  // Spacing that adapts to component library
  spacingUnit: themeVars.spacingUnit,
  spacingSm: themeVars.spacingSm,
  spacingMd: themeVars.spacingMd,
  spacingLg: themeVars.spacingLg,

  // Border radius that adapts to component library
  borderRadius: themeVars.borderRadius,
  borderRadiusSm: themeVars.borderRadiusSm,
  borderRadiusLg: themeVars.borderRadiusLg,
} as const;

/**
 * Component library-specific spacing values
 */
export const createDynamicSpacing = (library: ComponentLibrary) => {
  const spacingScales = {
    mantine: { xs: '4px', sm: '8px', md: '16px', lg: '24px' },
    shadcn: { xs: '4px', sm: '6px', md: '12px', lg: '20px' },
    radix: { xs: '2px', sm: '4px', md: '8px', lg: '16px' },
  };

  return spacingScales[library];
};

/**
 * Component library-specific border radius values
 */
export const createDynamicBorderRadius = (library: ComponentLibrary) => {
  const radiusScales = {
    mantine: { xs: '2px', sm: '4px', md: '6px', lg: '8px' },
    shadcn: { xs: '2px', sm: '6px', md: '8px', lg: '12px' },
    radix: { xs: '1px', sm: '2px', md: '4px', lg: '6px' },
  };

  return radiusScales[library];
};

/**
 * Dynamic interactive states using vanilla-extract/css
 * These automatically adapt when the user switches between themes
 */
export const interactiveStates = {
  // Base interactive style
  base: style({
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  }),

  // Disabled state
  disabled: style({
    cursor: 'not-allowed',
    opacity: '0.6',
    pointerEvents: 'none',
  }),

  // Selected state
  selected: style({
    backgroundColor: 'var(--selected-background)',
    borderColor: 'var(--mantine-color-blue-6)',
  }),

  // Hover state
  hoverable: style({
    ':hover': {
      backgroundColor: 'var(--hover-background)',
    },
  }),
};

/**
 * Dynamic color schemes that adapt to current theme
 */
export const colorSchemes = {
  light: style({
    vars: {
      '--text-primary': 'var(--mantine-color-gray-9)',
      '--text-secondary': 'var(--mantine-color-gray-6)',
      '--text-muted': 'var(--mantine-color-gray-5)',
      '--background-primary': 'var(--mantine-color-white)',
      '--background-secondary': 'var(--mantine-color-gray-0)',
      '--border-primary': 'var(--mantine-color-gray-3)',
    },
  }),

  dark: style({
    vars: {
      '--text-primary': 'var(--mantine-color-gray-0)',
      '--text-secondary': 'var(--mantine-color-gray-4)',
      '--text-muted': 'var(--mantine-color-gray-6)',
      '--background-primary': 'var(--mantine-color-dark-6)',
      '--background-secondary': 'var(--mantine-color-dark-7)',
      '--border-primary': 'var(--mantine-color-dark-4)',
    },
  }),
};

/**
 * Dynamic card styles that adapt to component library
 */
export const createCardStyles = (library: ComponentLibrary, elevated: boolean = false) => {
  const baseStyle = {
    padding: 'var(--spacing-md)',
    borderRadius: 'var(--border-radius-lg)',
    border: '1px solid var(--border-primary)',
  };

  const libraryStyles = {
    mantine: {
      boxShadow: elevated
        ? '0 10px 25px rgba(0, 0, 0, 0.15), 0 6px 10px rgba(0, 0, 0, 0.08)'
        : '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
      backgroundColor: 'var(--background-primary)',
    },
    shadcn: {
      boxShadow: elevated
        ? '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
        : '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px 0 rgb(0 0 0 / 0.06)',
      backgroundColor: 'hsl(var(--shadcn-card))',
      border: '1px solid hsl(var(--shadcn-border))',
      transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    radix: {
      boxShadow: elevated
        ? '0 4px 12px rgba(0, 0, 0, 0.15)'
        : '0 1px 3px rgba(0, 0, 0, 0.1)',
      backgroundColor: 'transparent',
      border: 'none',
    },
  };

  return style({
    ...baseStyle,
    ...libraryStyles[library],
  });
};

/**
 * Dynamic button styles that adapt to component library
 */
export const createButtonStyles = (
  library: ComponentLibrary,
  variant: 'solid' | 'subtle' | 'outline' | 'ghost' = 'solid',
  size: 'xs' | 'sm' | 'md' | 'lg' = 'md'
) => {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--spacing-sm)',
    borderRadius: 'var(--border-radius-md)',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    border: '1px solid transparent',
    textDecoration: 'none',
  };

  const libraryStyles = {
    mantine: {
      fontWeight: '600',
      letterSpacing: '0.025em',
      textTransform: 'none',
    },
    shadcn: {
      transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
      ':hover': {
        transform: 'translateY(-1px)',
      },
      ':active': {
        transform: 'translateY(0)',
      },
    },
    radix: {
      fontWeight: '400',
      background: 'transparent',
      padding: 'var(--spacing-xs) var(--spacing-sm)',
    },
  };

  const sizeStyles = {
    xs: { minHeight: '28px', padding: '0 var(--spacing-sm)', fontSize: 'var(--mantine-font-size-xs)' },
    sm: { minHeight: '32px', padding: '0 var(--spacing-md)', fontSize: 'var(--mantine-font-size-xs)' },
    md: { minHeight: '36px', padding: '0 var(--spacing-lg)', fontSize: 'var(--mantine-font-size-sm)' },
    lg: { minHeight: '44px', padding: '0 var(--spacing-xl)', fontSize: 'var(--mantine-font-size-md)' },
  };

  return style({
    ...baseStyle,
    ...libraryStyles[library],
    ...sizeStyles[size],
  });
};

/**
 * Utility function to apply dynamic theme variables to an element
 * This can be used in components to apply theme-aware styles dynamically
 */
export const applyDynamicTheme = (element: HTMLElement, themeConfig: {
  componentLibrary: ComponentLibrary;
  colorMode: 'light' | 'dark';
  colorScheme: string;
}) => {
  const spacing = createDynamicSpacing(themeConfig.componentLibrary);
  const borderRadius = createDynamicBorderRadius(themeConfig.componentLibrary);

  return assignInlineVars({
    [themeVars.componentLibrary]: themeConfig.componentLibrary,
    [themeVars.spacingUnit]: spacing.md,
    [themeVars.spacingSm]: spacing.sm,
    [themeVars.spacingMd]: spacing.md,
    [themeVars.spacingLg]: spacing.lg,
    [themeVars.borderRadius]: borderRadius.md,
    [themeVars.borderRadiusSm]: borderRadius.sm,
    [themeVars.borderRadiusLg]: borderRadius.lg,
  });
};

/**
 * Export type definitions for TypeScript support
 */
export type DynamicThemeConfig = {
  componentLibrary: ComponentLibrary;
  colorMode: 'light' | 'dark';
  colorScheme: string;
};

export type InteractiveStateProps = {
  disabled?: boolean;
  selected?: boolean;
  hoverable?: boolean;
};

export type CardProps = {
  library?: ComponentLibrary;
  elevated?: boolean;
};

export type ButtonProps = {
  library?: ComponentLibrary;
  variant?: 'solid' | 'subtle' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
};