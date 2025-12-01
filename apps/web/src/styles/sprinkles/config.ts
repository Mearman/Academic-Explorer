/**
 * Core Sprinkles configuration for Academic Explorer
 * Provides atomic CSS utilities with full TypeScript support and Mantine theme integration
 *
 * NOTE: Using a temporary workaround for createSprinkles API mismatch
 * This provides basic atomic utilities that work while we investigate the API issue
 */

import { style } from '@vanilla-extract/css';
import { themeVars } from '../theme-vars.css';

/**
 * Basic atomic styles using individual style() calls
 * This approach works reliably with the current Vanilla Extract version
 */

// Display utilities
export const displayNone = style({ display: 'none' });
export const displayBlock = style({ display: 'block' });
export const displayFlex = style({ display: 'flex' });
export const displayGrid = style({ display: 'grid' });
export const displayInline = style({ display: 'inline' });
export const displayInlineBlock = style({ display: 'inline-block' });

// Flex utilities
export const flexDirectionRow = style({ flexDirection: 'row' });
export const flexDirectionColumn = style({ flexDirection: 'column' });
export const alignItemsCenter = style({ alignItems: 'center' });
export const alignItemsStart = style({ alignItems: 'flex-start' });
export const alignItemsEnd = style({ alignItems: 'flex-end' });
export const justifyContentCenter = style({ justifyContent: 'center' });
export const justifyContentBetween = style({ justifyContent: 'space-between' });
export const justifyContentStart = style({ justifyContent: 'flex-start' });
export const justifyContentEnd = style({ justifyContent: 'flex-end' });

// Spacing utilities - using Mantine theme variables
export const paddingXs = style({ padding: 'var(--mantine-spacing-xs)' });
export const paddingSm = style({ padding: 'var(--mantine-spacing-sm)' });
export const paddingMd = style({ padding: 'var(--mantine-spacing-md)' });
export const paddingLg = style({ padding: 'var(--mantine-spacing-lg)' });
export const paddingXl = style({ padding: 'var(--mantine-spacing-xl)' });

export const marginXs = style({ margin: 'var(--mantine-spacing-xs)' });
export const marginSm = style({ margin: 'var(--mantine-spacing-sm)' });
export const marginMd = style({ margin: 'var(--mantine-spacing-md)' });
export const marginLg = style({ margin: 'var(--mantine-spacing-lg)' });
export const marginXl = style({ margin: 'var(--mantine-spacing-xl)' });

export const gapXs = style({ gap: 'var(--mantine-spacing-xs)' });
export const gapSm = style({ gap: 'var(--mantine-spacing-sm)' });
export const gapMd = style({ gap: 'var(--mantine-spacing-md)' });
export const gapLg = style({ gap: 'var(--mantine-spacing-lg)' });

// Color utilities - using Mantine theme variables
export const colorPrimary = style({ color: 'var(--mantine-color-blue-6)' });
export const colorText = style({ color: 'var(--mantine-color-gray-9)' });
export const colorTextSecondary = style({ color: 'var(--mantine-color-gray-6)' });
export const colorTextMuted = style({ color: 'var(--mantine-color-gray-5)' });

export const backgroundColorPrimary = style({ backgroundColor: 'var(--mantine-color-white)' });
export const backgroundColorSurface = style({ backgroundColor: 'var(--mantine-color-gray-0)' });

// Typography utilities
export const fontSizeXs = style({ fontSize: 'var(--mantine-font-size-xs)' });
export const fontSizeSm = style({ fontSize: 'var(--mantine-font-size-sm)' });
export const fontSizeMd = style({ fontSize: 'var(--mantine-font-size-md)' });
export const fontSizeLg = style({ fontSize: 'var(--mantine-font-size-lg)' });
export const fontSizeXl = style({ fontSize: 'var(--mantine-font-size-xl)' });

export const fontWeightNormal = style({ fontWeight: '400' });
export const fontWeightMedium = style({ fontWeight: '500' });
export const fontWeightSemibold = style({ fontWeight: '600' });
export const fontWeightBold = style({ fontWeight: '700' });

export const textAlignLeft = style({ textAlign: 'left' });
export const textAlignCenter = style({ textAlign: 'center' });
export const textAlignRight = style({ textAlign: 'right' });

// Border utilities
export const borderSm = style({ borderWidth: '1px', borderStyle: 'solid' });
export const borderMd = style({ borderWidth: '2px', borderStyle: 'solid' });
export const borderNone = style({ borderWidth: '0', borderStyle: 'none' });

export const borderColorPrimary = style({ borderColor: 'var(--mantine-color-gray-3)' });
export const borderColorLight = style({ borderColor: 'var(--mantine-color-gray-2)' });

export const borderRadiusXs = style({ borderRadius: 'var(--mantine-radius-xs)' });
export const borderRadiusSm = style({ borderRadius: 'var(--mantine-radius-sm)' });
export const borderRadiusMd = style({ borderRadius: 'var(--mantine-radius-md)' });
export const borderRadiusLg = style({ borderRadius: 'var(--mantine-radius-lg)' });
export const borderRadiusXl = style({ borderRadius: 'var(--mantine-radius-xl)' });

// Interactive utilities
export const cursorPointer = style({ cursor: 'pointer' });
export const cursorDefault = style({ cursor: 'default' });
export const cursorNotAllowed = style({ cursor: 'not-allowed' });

export const transitionFast = style({ transition: 'all 0.15s ease' });
export const transitionNormal = style({ transition: 'all 0.2s ease' });
export const transitionSlow = style({ transition: 'all 0.3s ease' });

/**
 * Simple sprinkles-like function that combines multiple styles
 * This provides a similar API to what createSprinkles would give us
 */
export const sprinkles = (styles: Record<string, boolean | string>) => {
  const classNames: string[] = [];

  // Display properties
  if (styles.display === 'none') classNames.push(displayNone);
  if (styles.display === 'block') classNames.push(displayBlock);
  if (styles.display === 'flex') classNames.push(displayFlex);
  if (styles.display === 'grid') classNames.push(displayGrid);

  // Flex properties
  if (styles.flexDirection === 'row') classNames.push(flexDirectionRow);
  if (styles.flexDirection === 'column') classNames.push(flexDirectionColumn);
  if (styles.alignItems === 'center') classNames.push(alignItemsCenter);
  if (styles.alignItems === 'flex-start') classNames.push(alignItemsStart);
  if (styles.alignItems === 'flex-end') classNames.push(alignItemsEnd);
  if (styles.justifyContent === 'center') classNames.push(justifyContentCenter);
  if (styles.justifyContent === 'space-between') classNames.push(justifyContentBetween);
  if (styles.justifyContent === 'flex-start') classNames.push(justifyContentStart);
  if (styles.justifyContent === 'flex-end') classNames.push(justifyContentEnd);

  // Spacing properties
  if (styles.padding === 'xs') classNames.push(paddingXs);
  if (styles.padding === 'sm') classNames.push(paddingSm);
  if (styles.padding === 'md') classNames.push(paddingMd);
  if (styles.padding === 'lg') classNames.push(paddingLg);
  if (styles.padding === 'xl') classNames.push(paddingXl);

  if (styles.margin === 'xs') classNames.push(marginXs);
  if (styles.margin === 'sm') classNames.push(marginSm);
  if (styles.margin === 'md') classNames.push(marginMd);
  if (styles.margin === 'lg') classNames.push(marginLg);
  if (styles.margin === 'xl') classNames.push(marginXl);

  if (styles.gap === 'xs') classNames.push(gapXs);
  if (styles.gap === 'sm') classNames.push(gapSm);
  if (styles.gap === 'md') classNames.push(gapMd);
  if (styles.gap === 'lg') classNames.push(gapLg);

  // Color properties
  if (styles.color === 'primary') classNames.push(colorPrimary);
  if (styles.color === 'text') classNames.push(colorText);
  if (styles.color === 'textSecondary') classNames.push(colorTextSecondary);
  if (styles.color === 'textMuted') classNames.push(colorTextMuted);

  if (styles.backgroundColor === 'primary') classNames.push(backgroundColorPrimary);
  if (styles.backgroundColor === 'surface') classNames.push(backgroundColorSurface);

  // Typography properties
  if (styles.fontSize === 'xs') classNames.push(fontSizeXs);
  if (styles.fontSize === 'sm') classNames.push(fontSizeSm);
  if (styles.fontSize === 'md') classNames.push(fontSizeMd);
  if (styles.fontSize === 'lg') classNames.push(fontSizeLg);
  if (styles.fontSize === 'xl') classNames.push(fontSizeXl);

  if (styles.fontWeight === 'normal') classNames.push(fontWeightNormal);
  if (styles.fontWeight === 'medium') classNames.push(fontWeightMedium);
  if (styles.fontWeight === 'semibold') classNames.push(fontWeightSemibold);
  if (styles.fontWeight === 'bold') classNames.push(fontWeightBold);

  if (styles.textAlign === 'left') classNames.push(textAlignLeft);
  if (styles.textAlign === 'center') classNames.push(textAlignCenter);
  if (styles.textAlign === 'right') classNames.push(textAlignRight);

  // Border properties
  if (styles.borderStyle === 'solid' && styles.borderWidth === '1px') classNames.push(borderSm);
  if (styles.borderStyle === 'solid' && styles.borderWidth === '2px') classNames.push(borderMd);
  if (styles.borderStyle === 'none') classNames.push(borderNone);

  if (styles.borderColor === 'primary') classNames.push(borderColorPrimary);
  if (styles.borderColor === 'light') classNames.push(borderColorLight);

  if (styles.borderRadius === 'xs') classNames.push(borderRadiusXs);
  if (styles.borderRadius === 'sm') classNames.push(borderRadiusSm);
  if (styles.borderRadius === 'md') classNames.push(borderRadiusMd);
  if (styles.borderRadius === 'lg') classNames.push(borderRadiusLg);
  if (styles.borderRadius === 'xl') classNames.push(borderRadiusXl);

  // Interactive properties
  if (styles.cursor === 'pointer') classNames.push(cursorPointer);
  if (styles.cursor === 'default') classNames.push(cursorDefault);
  if (styles.cursor === 'not-allowed') classNames.push(cursorNotAllowed);

  if (styles.transition === 'fast') classNames.push(transitionFast);
  if (styles.transition === 'normal') classNames.push(transitionNormal);
  if (styles.transition === 'slow') classNames.push(transitionSlow);

  return classNames.join(' ');
};

/**
 * Type definitions for the sprinkles function
 */
export type SprinklesProps = {
  display?: 'none' | 'block' | 'flex' | 'grid';
  flexDirection?: 'row' | 'column';
  alignItems?: 'center' | 'flex-start' | 'flex-end';
  justifyContent?: 'center' | 'space-between' | 'flex-start' | 'flex-end';
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  margin?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  gap?: 'xs' | 'sm' | 'md' | 'lg';
  color?: 'primary' | 'text' | 'textSecondary' | 'textMuted';
  backgroundColor?: 'primary' | 'surface';
  fontSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  borderStyle?: 'solid' | 'none';
  borderWidth?: '1px' | '2px';
  borderColor?: 'primary' | 'light';
  borderRadius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  cursor?: 'pointer' | 'default' | 'not-allowed';
  transition?: 'fast' | 'normal' | 'slow';
};

export type Sprinkles = SprinklesProps;