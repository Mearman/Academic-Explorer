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
export const paddingNone = style({ padding: '0' });
export const padding24 = style({ padding: '24px' });

export const marginXs = style({ margin: 'var(--mantine-spacing-xs)' });
export const marginSm = style({ margin: 'var(--mantine-spacing-sm)' });
export const marginMd = style({ margin: 'var(--mantine-spacing-md)' });
export const marginLg = style({ margin: 'var(--mantine-spacing-lg)' });
export const marginXl = style({ margin: 'var(--mantine-spacing-xl)' });
export const marginNone = style({ margin: '0' });

export const gapXs = style({ gap: 'var(--mantine-spacing-xs)' });
export const gapSm = style({ gap: 'var(--mantine-spacing-sm)' });
export const gapMd = style({ gap: 'var(--mantine-spacing-md)' });
export const gapLg = style({ gap: 'var(--mantine-spacing-lg)' });
export const gapNone = style({ gap: '0' });

// Color utilities - using Mantine theme variables
export const colorPrimary = style({ color: 'var(--mantine-color-blue-6)' });
export const colorText = style({ color: 'var(--mantine-color-gray-9)' });
export const colorTextSecondary = style({ color: 'var(--mantine-color-gray-6)' });
export const colorTextMuted = style({ color: 'var(--mantine-color-gray-5)' });
export const colorError = style({ color: 'var(--mantine-color-red-6)' });
export const colorSuccess = style({ color: 'var(--mantine-color-green-6)' });
export const colorWarning = style({ color: 'var(--mantine-color-orange-6)' });
export const colorInherit = style({ color: 'inherit' });
export const colorDimmed = style({ color: 'var(--mantine-color-gray-4)' });
export const colorBlue = style({ color: 'var(--mantine-color-blue-6)' });
export const colorMutedSecondary = style({ color: 'var(--shadcn-muted-foreground)' });
export const colorDestructive = style({ color: 'var(--shadcn-destructive)' });

export const backgroundColorPrimary = style({ backgroundColor: 'var(--mantine-color-white)' });
export const backgroundColorSurface = style({ backgroundColor: 'var(--mantine-color-gray-0)' });
export const backgroundColorTertiary = style({ backgroundColor: 'var(--mantine-color-blue-0)' });
export const backgroundColorGray = style({ backgroundColor: 'var(--mantine-color-gray-0)' });
export const backgroundColorNone = style({ backgroundColor: 'transparent' });

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
export const borderNoneStyle = style({ borderWidth: '0', borderStyle: 'none' });
export const borderNone = style({ border: 'none' });

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
export const cursorGrab = style({ cursor: 'grab' });
export const cursorGrabbing = style({ cursor: 'grabbing' });
export const cursorHelp = style({ cursor: 'help' });
export const cursorResize = style({ cursor: 'ew-resize' });

export const userSelectNone = style({ userSelect: 'none' });

// Complex virtual table utilities

// Additional utilities for virtual table
export const top0 = style({ top: 0 });
export const left0 = style({ left: 0 });
export const paddingX8px = style({ padding: '0 8px' });

// Flex utilities for virtual table cells
export const flexAuto = style({ flex: '0 0 auto' });

// Border utilities for table cells
export const borderRightNone = style({ borderRight: 'none' });
export const borderTopNone = style({ borderTop: 'none' });
export const borderBottomNone = style({ borderBottom: 'none' });
export const borderRightGray3 = style({ borderRight: '1px solid var(--mantine-color-gray-3)' });
export const borderBottomGray3 = style({ borderBottom: '1px solid var(--mantine-color-gray-3)' });
export const backgroundColorGray0 = style({ backgroundColor: 'var(--mantine-color-gray-0)' });
export const backgroundColorTransparent = style({ backgroundColor: 'transparent' });

export const transitionFast = style({ transition: 'all 0.15s ease' });
export const transitionNormal = style({ transition: 'all 0.2s ease' });
export const transitionSlow = style({ transition: 'all 0.3s ease' });

// Sizing utilities
export const widthFull = style({ width: '100%' });
export const heightFull = style({ height: '100%' });
export const minWidth0 = style({ minWidth: '0' });
export const maxWidth100 = style({ maxWidth: '100%' });

export const minWidth300 = style({ minWidth: '300px' });
export const minWidth80 = style({ minWidth: '80px' });
export const minWidth120 = style({ minWidth: '120px' });
export const minWidth100 = style({ minWidth: '100px' });

export const minHeight400 = style({ minHeight: '400px' });

export const flex1 = style({ flex: '1' });

// Positioning utilities
export const positionRelative = style({ position: 'relative' });
export const positionAbsolute = style({ position: 'absolute' });

// Overflow utilities
export const overflowAuto = style({ overflow: 'auto' });
export const overflowHidden = style({ overflow: 'hidden' });
export const overflowXAuto = style({ overflowX: 'auto' });
export const overflowYAuto = style({ overflowY: 'auto' });
export const overflowScroll = style({ overflow: 'scroll' });

// Opacity utilities
export const opacity30 = style({ opacity: '0.3' });

// Border utilities for EntityDetailLayout
export const borderSecondary = style({
  borderBottom: `1px solid var(--mantine-color-gray-3)`,
});
export const borderBottomSecondary = style({
  borderBottom: `1px solid var(--mantine-color-gray-3)`,
});

// Text utilities
export const textBreak = style({ wordBreak: 'break-word' });
export const textBreakAll = style({ wordBreak: 'break-all' });
export const textMonospace = style({ fontFamily: 'monospace' });
export const textUppercase = style({ textTransform: 'uppercase' });
export const textCapitalize = style({ textTransform: 'capitalize' });
export const textNoDecoration = style({ textDecoration: 'none' });
export const textLowercase = style({ textTransform: 'lowercase' });
export const textEllipsis = style({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
export const codeDisplay = style({
  fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
  whiteSpace: 'pre',
  lineHeight: 1.6,
});

// Grid layout utilities for ColorSchemeSelector and similar components
export const gridLayout2 = style({ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' });
export const gridLayout3 = style({ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' });
export const gridLayout4 = style({ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' });
export const gridLayoutAuto = style({ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' });
export const gridGapXs = style({ gap: 'var(--mantine-spacing-xs)' });
export const gridGapSm = style({ gap: 'var(--mantine-spacing-sm)' });
export const gridGapMd = style({ gap: 'var(--mantine-spacing-md)' });

// Menu item recipe for theme dropdown items
export const menuItemBase = style({
  display: 'flex',
  alignItems: 'center',
  padding: '6px 8px',
  borderRadius: 'var(--mantine-radius-sm)',
  transition: 'all 0.2s ease',
  cursor: 'pointer',
});

export const menuItemSelected = style({
  backgroundColor: 'var(--mantine-color-blue-light)',
});

// Color swatch recipe for theme selector components
export const colorSwatchBase = style({
  borderRadius: 'var(--mantine-radius-xs)',
  border: '1px solid var(--mantine-color-gray-3)',
  flexShrink: 0,
});

export const colorSwatchXs = style({
  width: 6,
  height: 6,
});

export const colorSwatchSm = style({
  width: 12,
  height: 12,
});

export const colorSwatchMd = style({
  width: 16,
  height: 16,
});

export const colorSwatchLg = style({
  width: 20,
  height: 20,
});

export const colorSwatchSelected = style({
  boxShadow: '0 0 0 2px var(--mantine-color-blue-6)',
});

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
  if (styles.padding === 'none') classNames.push(paddingNone);
  if (styles.padding === '24px') classNames.push(padding24);

  if (styles.margin === 'xs') classNames.push(marginXs);
  if (styles.margin === 'sm') classNames.push(marginSm);
  if (styles.margin === 'md') classNames.push(marginMd);
  if (styles.margin === 'lg') classNames.push(marginLg);
  if (styles.margin === 'xl') classNames.push(marginXl);
  if (styles.margin === 'none') classNames.push(marginNone);

  if (styles.gap === 'xs') classNames.push(gapXs);
  if (styles.gap === 'sm') classNames.push(gapSm);
  if (styles.gap === 'md') classNames.push(gapMd);
  if (styles.gap === 'lg') classNames.push(gapLg);
  if (styles.gap === 'none') classNames.push(gapNone);

  // Color properties
  if (styles.color === 'primary') classNames.push(colorPrimary);
  if (styles.color === 'text') classNames.push(colorText);
  if (styles.color === 'textSecondary') classNames.push(colorTextSecondary);
  if (styles.color === 'textMuted') classNames.push(colorTextMuted);
  if (styles.color === 'error') classNames.push(colorError);
  if (styles.color === 'success') classNames.push(colorSuccess);
  if (styles.color === 'warning') classNames.push(colorWarning);
  if (styles.color === 'inherit') classNames.push(colorInherit);
  if (styles.color === 'dimmed') classNames.push(colorDimmed);
  if (styles.color === 'blue') classNames.push(colorBlue);
  if (styles.color === 'mutedSecondary') classNames.push(colorMutedSecondary);
  if (styles.color === 'destructive') classNames.push(colorDestructive);

  if (styles.backgroundColor === 'primary') classNames.push(backgroundColorPrimary);
  if (styles.backgroundColor === 'surface') classNames.push(backgroundColorSurface);
  if (styles.backgroundColor === 'tertiary') classNames.push(backgroundColorTertiary);
  if (styles.backgroundColor === 'gray') classNames.push(backgroundColorGray);
  if (styles.backgroundColor === 'gray0') classNames.push(backgroundColorGray0);
  if (styles.backgroundColor === 'transparent') classNames.push(backgroundColorTransparent);
  if (styles.backgroundColor === 'none') classNames.push(backgroundColorNone);

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
  if (styles.borderColor === 'gray3') classNames.push(borderRightGray3);

  if (styles.borderRadius === 'xs') classNames.push(borderRadiusXs);
  if (styles.borderRadius === 'sm') classNames.push(borderRadiusSm);
  if (styles.borderRadius === 'md') classNames.push(borderRadiusMd);
  if (styles.borderRadius === 'lg') classNames.push(borderRadiusLg);
  if (styles.borderRadius === 'xl') classNames.push(borderRadiusXl);

  // Interactive properties
  if (styles.cursor === 'pointer') classNames.push(cursorPointer);
  if (styles.cursor === 'default') classNames.push(cursorDefault);
  if (styles.cursor === 'not-allowed') classNames.push(cursorNotAllowed);
  if (styles.cursor === 'grab') classNames.push(cursorGrab);
  if (styles.cursor === 'grabbing') classNames.push(cursorGrabbing);
  if (styles.cursor === 'help') classNames.push(cursorHelp);
  if (styles.cursor === 'resize') classNames.push(cursorResize);

  if (styles.userSelect === 'none') classNames.push(userSelectNone);

  if (styles.transition === 'fast') classNames.push(transitionFast);
  if (styles.transition === 'normal') classNames.push(transitionNormal);
  if (styles.transition === 'slow') classNames.push(transitionSlow);

  // Sizing properties
  if (styles.width === 'full') classNames.push(widthFull);
  if (styles.height === 'full') classNames.push(heightFull);
  if (styles.minWidth === '0') classNames.push(minWidth0);
  if (styles.minWidth === '300px') classNames.push(minWidth300);
  if (styles.minWidth === '80px') classNames.push(minWidth80);
  if (styles.minWidth === '120px') classNames.push(minWidth120);
  if (styles.minWidth === '100px') classNames.push(minWidth100);
  if (styles.maxWidth === '100%') classNames.push(maxWidth100);
  if (styles.minHeight === '400px') classNames.push(minHeight400);

  // Positioning properties
  if (styles.position === 'relative') classNames.push(positionRelative);
  if (styles.position === 'absolute') classNames.push(positionAbsolute);
  if (styles.top === '0') classNames.push(top0);
  if (styles.left === '0') classNames.push(left0);

  // Overflow properties
  if (styles.overflow === 'auto') classNames.push(overflowAuto);
  if (styles.overflow === 'hidden') classNames.push(overflowHidden);
  if (styles.overflow === 'scroll') classNames.push(overflowScroll);
  if (styles.overflowX === 'auto') classNames.push(overflowXAuto);
  if (styles.overflowY === 'auto') classNames.push(overflowYAuto);

  // Opacity properties
  if (styles.opacity === '0.3') classNames.push(opacity30);

  // Text properties
  if (styles.wordBreak === 'break-word') classNames.push(textBreak);
  if (styles.wordBreak === 'break-all') classNames.push(textBreakAll);
  if (styles.fontFamily === 'monospace') classNames.push(textMonospace);
  if (styles.codeDisplay) classNames.push(codeDisplay);
  if (styles.textTransform === 'uppercase') classNames.push(textUppercase);
  if (styles.textTransform === 'capitalize') classNames.push(textCapitalize);
  if (styles.textTransform === 'lowercase') classNames.push(textLowercase);
  if (styles.textDecoration === 'none') classNames.push(textNoDecoration);

  // Grid layout properties
  if (styles.gridColumns === '2') classNames.push(gridLayout2);
  if (styles.gridColumns === '3') classNames.push(gridLayout3);
  if (styles.gridColumns === '4') classNames.push(gridLayout4);
  if (styles.gridColumns === 'auto') classNames.push(gridLayoutAuto);
  if (styles.gridGap === 'xs') classNames.push(gridGapXs);
  if (styles.gridGap === 'sm') classNames.push(gridGapSm);
  if (styles.gridGap === 'md') classNames.push(gridGapMd);

  // Menu item properties
  if (styles.menuItem) {
    classNames.push(menuItemBase);
    if (styles.menuItemSelected) classNames.push(menuItemSelected);
  }

  // Color swatch properties
  if (styles.colorSwatch) {
    classNames.push(colorSwatchBase);
    if (styles.colorSwatchSize === 'xs') classNames.push(colorSwatchXs);
    if (styles.colorSwatchSize === 'sm') classNames.push(colorSwatchSm);
    if (styles.colorSwatchSize === 'md') classNames.push(colorSwatchMd);
    if (styles.colorSwatchSize === 'lg') classNames.push(colorSwatchLg);
    if (styles.colorSwatchSelected) classNames.push(colorSwatchSelected);
  }

  // Border properties
  if (styles.borderTop === 'none') classNames.push(borderTopNone);
  if (styles.borderBottom === 'none') classNames.push(borderBottomNone);
  if (styles.borderBottomSecondary) classNames.push(borderBottomSecondary);
  if (styles.border === 'none') classNames.push(borderNone);
  if (styles.borderSecondary) classNames.push(borderSecondary);

  // Flex properties
  if (styles.flex === '1') classNames.push(flex1);
  if (styles.flex === 'auto') classNames.push(flexAuto);

  // Boolean properties for specific table utilities
  if (styles.paddingX8px) classNames.push(paddingX8px);
  if (styles.borderBottomGray3) classNames.push(borderBottomGray3);
  if (styles.borderRightGray3) classNames.push(borderRightGray3);

  return classNames.join(' ');
};

/**
 * Type definitions for the sprinkles function
 * Using a more flexible Record type to avoid strict type mismatches
 */
export type SprinklesProps = Record<string, string | number | boolean>;

export type Sprinkles = SprinklesProps;