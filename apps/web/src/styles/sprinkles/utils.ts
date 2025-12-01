/**
 * Utility functions for Vanilla Extract Sprinkles
 * Provides helper functions for common styling patterns and migrations
 */

import { sprinkles } from './config';
import type { Sprinkles } from './config';
import type { ComponentLibrary } from '../theme-contracts';

/**
 * Migration utilities - convert common.css.ts patterns to sprinkles
 */

// Spacing utilities
export const spacingUtils = {
  // Convert gap classes
  gap: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => sprinkles({ gap: size }),

  // Convert margin classes
  margin: {
    top: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => sprinkles({ marginTop: size }),
    right: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => sprinkles({ marginRight: size }),
    bottom: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => sprinkles({ marginBottom: size }),
    left: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => sprinkles({ marginLeft: size }),
    x: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => sprinkles({ marginX: size }),
    y: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => sprinkles({ marginY: size }),
    all: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => sprinkles({ margin: size }),
  },

  // Convert padding classes
  padding: {
    top: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => sprinkles({ paddingTop: size }),
    right: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => sprinkles({ paddingRight: size }),
    bottom: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => sprinkles({ paddingBottom: size }),
    left: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => sprinkles({ paddingLeft: size }),
    x: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => sprinkles({ paddingX: size }),
    y: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => sprinkles({ paddingY: size }),
    all: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => sprinkles({ padding: size }),
  },
};

/**
 * Layout utilities for common flex and grid patterns
 */
export const layoutUtils = {
  // Flex layouts
  flex: {
    center: () => sprinkles({ display: 'flex', alignItems: 'center', justifyContent: 'center' }),
    start: () => sprinkles({ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start' }),
    end: () => sprinkles({ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }),
    between: () => sprinkles({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }),
    around: () => sprinkles({ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }),
    evenly: () => sprinkles({ display: 'flex', alignItems: 'center', justifyContent: 'space-evenly' }),
    column: () => sprinkles({ display: 'flex', flexDirection: 'column' }),
    columnCenter: () => sprinkles({ display: 'flex', flexDirection: 'column', alignItems: 'center' }),
    wrap: () => sprinkles({ display: 'flex', flexWrap: 'wrap' }),
    grow: () => sprinkles({ flex: '1' }),
    shrink: () => sprinkles({ flexShrink: '1' }),
    basisAuto: () => sprinkles({ flexBasis: 'auto' }),
    basisFull: () => sprinkles({ flexBasis: '100%' }),
  },

  // Grid layouts
  grid: {
    '1col': () => sprinkles({ display: 'grid', gridTemplateColumns: '1' }),
    '2col': () => sprinkles({ display: 'grid', gridTemplateColumns: '2' }),
    '3col': () => sprinkles({ display: 'grid', gridTemplateColumns: '3' }),
    '4col': () => sprinkles({ display: 'grid', gridTemplateColumns: '4' }),
    autoFit: () => sprinkles({ display: 'grid', gridTemplateColumns: 'auto' }),
  },
};

/**
 * Text utilities for common typography patterns
 */
export const textUtils = {
  // Text alignment
  align: {
    left: () => sprinkles({ textAlign: 'left' }),
    center: () => sprinkles({ textAlign: 'center' }),
    right: () => sprinkles({ textAlign: 'right' }),
    justify: () => sprinkles({ textAlign: 'justify' }),
  },

  // Text decoration
  decoration: {
    none: () => sprinkles({ textDecoration: 'none' }),
    underline: () => sprinkles({ textDecoration: 'underline' }),
    lineThrough: () => sprinkles({ textDecoration: 'line-through' }),
  },

  // Text transformation
  transform: {
    uppercase: () => sprinkles({ textTransform: 'uppercase' }),
    lowercase: () => sprinkles({ textTransform: 'lowercase' }),
    capitalize: () => sprinkles({ textTransform: 'capitalize' }),
    none: () => sprinkles({ textTransform: 'none' }),
  },

  // Font weights
  weight: {
    thin: () => sprinkles({ fontWeight: '100' }),
    light: () => sprinkles({ fontWeight: '300' }),
    normal: () => sprinkles({ fontWeight: '400' }),
    medium: () => sprinkles({ fontWeight: '500' }),
    semibold: () => sprinkles({ fontWeight: '600' }),
    bold: () => sprinkles({ fontWeight: '700' }),
    extrabold: () => sprinkles({ fontWeight: '800' }),
  },

  // Font sizes
  size: {
    xs: () => sprinkles({ fontSize: 'xs' }),
    sm: () => sprinkles({ fontSize: 'sm' }),
    md: () => sprinkles({ fontSize: 'md' }),
    lg: () => sprinkles({ fontSize: 'lg' }),
    xl: () => sprinkles({ fontSize: 'xl' }),
  },
};

/**
 * Color utilities for semantic color mapping
 */
export const colorUtils = {
  // Text colors
  text: {
    primary: () => sprinkles({ color: 'text' }),
    secondary: () => sprinkles({ color: 'textSecondary' }),
    muted: () => sprinkles({ color: 'textMuted' }),
    dimmed: () => sprinkles({ color: 'textDimmed' }),
    success: () => sprinkles({ color: 'success' }),
    warning: () => sprinkles({ color: 'warning' }),
    error: () => sprinkles({ color: 'error' }),
    primaryColor: () => sprinkles({ color: 'primary' }),
  },

  // Background colors
  background: {
    primary: () => sprinkles({ backgroundColor: 'background' }),
    secondary: () => sprinkles({ backgroundColor: 'backgroundHover' }),
    surface: () => sprinkles({ backgroundColor: 'surface' }),
    primaryLight: () => sprinkles({ backgroundColor: 'primaryLight' }),
  },

  // Border colors
  border: {
    primary: () => sprinkles({ borderColor: 'border' }),
    light: () => sprinkles({ borderColor: 'borderLight' }),
    primaryColor: () => sprinkles({ borderColor: 'primary' }),
  },
};

/**
 * Interactive utilities for hover, focus, and cursor states
 */
export const interactiveUtils = {
  // Cursor types
  cursor: {
    pointer: () => sprinkles({ cursor: 'pointer' }),
    default: () => sprinkles({ cursor: 'default' }),
    grab: () => sprinkles({ cursor: 'grab' }),
    grabbing: () => sprinkles({ cursor: 'grabbing' }),
    help: () => sprinkles({ cursor: 'help' }),
    notAllowed: () => sprinkles({ cursor: 'not-allowed' }),
    text: () => sprinkles({ cursor: 'text' }),
    resize: (direction: 'col' | 'row') => sprinkles({ cursor: direction === 'col' ? 'col-resize' : 'row-resize' }),
  },

  // Hover effects
  hover: {
    background: () => sprinkles({ ':hover': { backgroundColor: 'backgroundHover' } }),
    opacity: () => sprinkles({ ':hover': { opacity: '75' } }),
    elevate: () => sprinkles({
      ':hover': { transform: 'translateY(-1px)' },
      transition: 'all 0.2s ease'
    }),
  },

  // Focus states
  focus: {
    outline: () => sprinkles({ ':focus': { outline: '2px solid var(--mantine-color-blue-6)' } }),
    ring: () => sprinkles({ ':focus': { outline: 'none' }, ':focus-visible': { outline: '2px solid var(--mantine-color-blue-6)', outlineOffset: '2px' } }),
  },

  // Disabled states
  disabled: {
    opacity: () => sprinkles({ opacity: '50', cursor: 'not-allowed', pointerEvents: 'none' }),
  },
};

/**
 * Sizing utilities for common width/height patterns
 */
export const sizingUtils = {
  // Width utilities
  width: {
    auto: () => sprinkles({ width: 'auto' }),
    full: () => sprinkles({ width: 'full' }),
    screen: () => sprinkles({ width: 'screen' }),
    none: () => sprinkles({ width: 'none' }),
    custom: (value: number | string) => sprinkles({ width: typeof value === 'number' ? `${value}px` : value }),
  },

  // Height utilities
  height: {
    auto: () => sprinkles({ height: 'auto' }),
    full: () => sprinkles({ height: 'full' }),
    screen: () => sprinkles({ height: 'screen' }),
    none: () => sprinkles({ height: 'none' }),
    custom: (value: number | string) => sprinkles({ height: typeof value === 'number' ? `${value}px` : value }),
  },

  // Minimum/Maximum utilities
  minWidth: {
    none: () => sprinkles({ minWidth: 'none' }),
    custom: (value: number | string) => sprinkles({ minWidth: typeof value === 'number' ? `${value}px` : value }),
  },

  minHeight: {
    none: () => sprinkles({ minHeight: 'none' }),
    custom: (value: number | string) => sprinkles({ minHeight: typeof value === 'number' ? `${value}px` : value }),
  },
};

/**
 * Position utilities for positioning elements
 */
export const positionUtils = {
  // Position types
  position: {
    static: () => sprinkles({ position: 'static' }),
    relative: () => sprinkles({ position: 'relative' }),
    absolute: () => sprinkles({ position: 'absolute' }),
    fixed: () => sprinkles({ position: 'fixed' }),
    sticky: () => sprinkles({ position: 'sticky' }),
  },

  // Z-index utilities
  zIndex: {
    auto: () => sprinkles({ zIndex: 'auto' }),
    base: () => sprinkles({ zIndex: '1' }),
    above: () => sprinkles({ zIndex: '10' }),
    modal: () => sprinkles({ zIndex: '100' }),
    tooltip: () => sprinkles({ zIndex: '1000' }),
  },

  // Offset utilities
  top: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => sprinkles({ top: size }),
  right: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => sprinkles({ right: size }),
  bottom: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => sprinkles({ bottom: size }),
  left: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => sprinkles({ left: size }),
};

/**
 * Border utilities for borders and border radius
 */
export const borderUtils = {
  // Border radius
  radius: {
    none: () => sprinkles({ borderRadius: 'none' }),
    xs: () => sprinkles({ borderRadius: 'xs' }),
    sm: () => sprinkles({ borderRadius: 'sm' }),
    md: () => sprinkles({ borderRadius: 'md' }),
    lg: () => sprinkles({ borderRadius: 'lg' }),
    xl: () => sprinkles({ borderRadius: 'xl' }),
    full: () => sprinkles({ borderRadius: '50%' }), // Circle
    custom: (value: number) => sprinkles({ borderRadius: `${value}px` }),
  },

  // Border styles
  border: {
    none: () => sprinkles({ borderWidth: '0', borderStyle: 'none' }),
    all: (color?: string, width: '1px' | '2px' = '1px') =>
      sprinkles({ borderWidth: width, borderStyle: 'solid', borderColor: color as any }),
    top: (color?: string, width: '1px' | '2px' = '1px') =>
      sprinkles({ borderTopWidth: width, borderTopStyle: 'solid', borderColor: color as any }),
    right: (color?: string, width: '1px' | '2px' = '1px') =>
      sprinkles({ borderRightWidth: width, borderRightStyle: 'solid', borderColor: color as any }),
    bottom: (color?: string, width: '1px' | '2px' = '1px') =>
      sprinkles({ borderBottomWidth: width, borderBottomStyle: 'solid', borderColor: color as any }),
    left: (color?: string, width: '1px' | '2px' = '1px') =>
      sprinkles({ borderLeftWidth: width, borderLeftStyle: 'solid', borderColor: color as any }),
  },
};

/**
 * Migration helper - convert inline style objects to sprinkles
 * This helps migrate from the old inline style pattern to sprinkles
 */
export const migrateInlineStyles = (styles: Record<string, any>): Sprinkles => {
  const sprinklesProps: Record<string, any> = {};

  // Map common style properties to sprinkles properties
  const styleMap: Record<string, string> = {
    display: 'display',
    flexDirection: 'flexDirection',
    alignItems: 'alignItems',
    justifyContent: 'justifyContent',
    flexWrap: 'flexWrap',
    flex: 'flex',
    flexGrow: 'flexGrow',
    flexShrink: 'flexShrink',
    flexBasis: 'flexBasis',
    gap: 'gap',
    columnGap: 'columnGap',
    rowGap: 'rowGap',
    margin: 'margin',
    marginTop: 'marginTop',
    marginRight: 'marginRight',
    marginBottom: 'marginBottom',
    marginLeft: 'marginLeft',
    marginX: 'marginX',
    marginY: 'marginY',
    padding: 'padding',
    paddingTop: 'paddingTop',
    paddingRight: 'paddingRight',
    paddingBottom: 'paddingBottom',
    paddingLeft: 'paddingLeft',
    paddingX: 'paddingX',
    paddingY: 'paddingY',
    width: 'width',
    height: 'height',
    minWidth: 'minWidth',
    maxWidth: 'maxWidth',
    minHeight: 'minHeight',
    maxHeight: 'maxHeight',
    position: 'position',
    top: 'top',
    right: 'right',
    bottom: 'bottom',
    left: 'left',
    zIndex: 'zIndex',
    overflow: 'overflow',
    overflowX: 'overflowX',
    overflowY: 'overflowY',
    opacity: 'opacity',
    cursor: 'cursor',
    userSelect: 'userSelect',
    pointerEvents: 'pointerEvents',
    transition: 'transition',
    transform: 'transform',
  };

  Object.entries(styles).forEach(([key, value]) => {
    const sprinklesKey = styleMap[key];
    if (sprinklesKey && value !== undefined) {
      sprinklesProps[sprinklesKey] = value;
    }
  });

  return sprinklesProps as Sprinkles;
};

/**
 * Component library specific utilities
 */
export const componentLibraryUtils = {
  getSpacingScale: (library: ComponentLibrary) => {
    const scales = {
      mantine: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' },
      shadcn: { xs: '4px', sm: '6px', md: '12px', lg: '20px', xl: '28px' },
      radix: { xs: '2px', sm: '4px', md: '8px', lg: '16px', xl: '24px' },
    };
    return scales[library];
  },

  getBorderRadiusScale: (library: ComponentLibrary) => {
    const scales = {
      mantine: { xs: '2px', sm: '4px', md: '6px', lg: '8px', xl: '12px' },
      shadcn: { xs: '2px', sm: '6px', md: '8px', lg: '12px', xl: '16px' },
      radix: { xs: '1px', sm: '2px', md: '4px', lg: '6px', xl: '8px' },
    };
    return scales[library];
  },
};

/**
 * Export all utilities for easy importing
 */
export const utils = {
  spacing: spacingUtils,
  layout: layoutUtils,
  text: textUtils,
  color: colorUtils,
  interactive: interactiveUtils,
  sizing: sizingUtils,
  position: positionUtils,
  border: borderUtils,
  componentLibrary: componentLibraryUtils,
};