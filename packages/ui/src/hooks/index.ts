/**
 * UI Hooks
 *
 * Custom React hooks for UI functionality
 */

// Accessibility hooks
export {
  useLiveRegion,
  useKeyboardNavigation,
  useFocusTrap,
  useAriaAttributes,
  useScreenReader,
  useHighContrast,
  useReducedMotion,
  useFocusManagement,
} from './useAccessibility';

// Async operation hook
export {
  useAsyncOperation,
  type AsyncOperationState,
  type AsyncOperationResult,
  type UseAsyncOperationOptions,
} from './use-async-operation';