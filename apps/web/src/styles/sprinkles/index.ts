/**
 * Vanilla Extract Sprinkles Public API
 * Central export point for all sprinkles functionality
 */

// Core sprinkles configuration
export { sprinkles } from './config';
export type { Sprinkles } from './config';

// Dynamic theming integration
export {
  createDynamicSpacing,
  createDynamicBorderRadius,
  interactiveStates,
  colorSchemes,
  createCardStyles,
  createButtonStyles,
  applyDynamicTheme,
} from './dynamic-theme';
export type {
  DynamicThemeConfig,
  InteractiveStateProps,
  CardProps,
  ButtonProps,
} from './dynamic-theme';

// Runtime theme application
export {
  applyRuntimeTheme,
  applyColorModeTheme,
  applyInteractiveProperties,
  initializeRuntimeTheme,
  updateRuntimeTheme,
  getCurrentRuntimeTheme,
  createThemeValue,
  getComponentLibraryTheme,
} from './runtime-theme';
export type {
  RuntimeThemeConfig,
} from './runtime-theme';

// Utility functions and helpers
export {
  spacingUtils,
  layoutUtils,
  textUtils,
  colorUtils,
  interactiveUtils,
  sizingUtils,
  positionUtils,
  borderUtils,
  migrateInlineStyles,
  componentLibraryUtils,
  utils,
} from './utils';

// Re-export theme contracts for convenience
export type {
  ComponentLibrary,
  ColorScheme,
  ColorMode,
  BorderRadius,
} from '../theme-contracts';

/**
 * Default export - the main sprinkles function
 */
export { sprinkles as default } from './config';

/**
 * Quick start examples for developers:
 *
 * Basic usage:
 * ```tsx
 * import { sprinkles } from '@/styles/sprinkles';
 *
 * <div className={sprinkles({ display: 'flex', gap: 'md', padding: 'lg' })}>
 *   Content
 * </div>
 * ```
 *
 * With React hooks:
 * ```tsx
 * import { useSprinkles } from '@/hooks/use-sprinkles';
 *
 * const MyComponent = () => {
 *   const { sprinkles } = useSprinkles();
 *   return <div className={sprinkles({ display: 'flex', gap: 'md' })} />;
 * };
 * ```
 *
 * With utilities:
 * ```tsx
 * import { utils } from '@/styles/sprinkles';
 *
 * <div className={utils.layout.flex.center()}>
 *   <div className={utils.spacing.padding.all('md')}>
 *     Content
 *   </div>
 * </div>
 * ```
 */