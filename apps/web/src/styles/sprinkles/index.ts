/**
 * Sprinkles CSS-in-JS styles
 */

export * from './config';

// Dynamic theme exports (temporary fallback utilities)
export type {
  DynamicThemeConfig,
  InteractiveStateProps,
  CardProps,
  ButtonProps,
} from './dynamic-theme';
export {
  dynamicThemeVars,
  interactiveStates,
  colorSchemes,
  createDynamicSpacing,
  createDynamicBorderRadius,
  createCardStyles,
  createButtonStyles,
  applyDynamicTheme,
  applyColorModeTheme as applyColorModeThemeDynamic,
  applyInteractiveProperties as applyInteractivePropertiesDynamic,
  initializeRuntimeTheme as initializeRuntimeThemeDynamic,
  updateRuntimeTheme as updateRuntimeThemeDynamic,
  getCurrentRuntimeTheme as getCurrentRuntimeThemeDynamic,
  createThemeValue as createThemeValueDynamic,
  getComponentLibraryTheme as getComponentLibraryThemeDynamic,
} from './dynamic-theme';

// Runtime theme exports (primary implementation)
export type {
  RuntimeThemeConfig,
} from './runtime-theme';
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