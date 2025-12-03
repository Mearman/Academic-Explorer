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


// Re-export theme contracts for convenience
export type {
  ComponentLibrary,
  ColorScheme,
  ColorMode,
  BorderRadius,
} from '../theme-contracts';

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
 */