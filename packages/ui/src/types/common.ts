import { ReactNode } from 'react';

/**
 * Base props that all components should support
 */
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
  'data-testid'?: string;
}

/**
 * Props for components that support forwarded refs
 */
export interface ForwardedRefProps<T = HTMLElement> extends BaseComponentProps {
  ref?: React.Ref<T>;
}

/**
 * Common size variants used across components
 */
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Common color variants
 */
export type Color = 'blue' | 'green' | 'red' | 'orange' | 'yellow' | 'purple' | 'pink' | 'gray';

/**
 * Common variant types
 */
export type Variant = 'filled' | 'light' | 'outline' | 'transparent' | 'subtle';

/**
 * Loading state interface
 */
export interface LoadingState {
  isLoading: boolean;
  loadingText?: string;
}

/**
 * Error state interface
 */
export interface ErrorState {
  hasError: boolean;
  error?: Error | string;
  onRetry?: () => void;
}