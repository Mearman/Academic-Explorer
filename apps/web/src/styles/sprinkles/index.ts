/**
 * Vanilla Extract Sprinkles Public API
 * Central export point for all sprinkles functionality
 */

// Core sprinkles configuration
export type { Sprinkles } from './config';
export { sprinkles } from './config';

// Dynamic theming integration
export type {
  ButtonProps,
  CardProps,
  DynamicThemeConfig,
  InteractiveStateProps,
} from './dynamic-theme';
export {
  applyDynamicTheme,
  colorSchemes,
  createButtonStyles,
  createCardStyles,
  createDynamicBorderRadius,
  createDynamicSpacing,
  interactiveStates,
} from './dynamic-theme';

// Runtime theme application
export type {
  RuntimeThemeConfig,
} from './runtime-theme';
export {
  applyColorModeTheme,
  applyInteractiveProperties,
  applyRuntimeTheme,
  createThemeValue,
  getComponentLibraryTheme,
  getCurrentRuntimeTheme,
  initializeRuntimeTheme,
  updateRuntimeTheme,
} from './runtime-theme';


// Re-export theme contracts for convenience
export type {
  BorderRadius,
  ColorMode,
  ColorScheme,
  ComponentLibrary,
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