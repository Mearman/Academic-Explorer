/**
 * Toast Notification System
 *
 * Provides a flexible toast notification system with different
 * variants, positioning, and auto-dismiss functionality.
 */

import { notifications, NotificationData } from '@mantine/notifications';
import {
  IconCheck,
  IconAlertTriangle,
  IconInfoCircle,
  IconX,
  IconLoader,
} from '@tabler/icons-react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning' | 'loading';

export interface ToastOptions extends Omit<NotificationData, 'message'> {
  variant?: ToastVariant;
  autoClose?: number | boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const DEFAULT_AUTO_CLOSE = 5000;
const LOADING_AUTO_CLOSE = false;

/**
 * Get notification configuration for variant
 */
const getNotificationConfig = (variant: ToastVariant = 'info') => {
  const configs = {
    success: {
      color: 'green',
      icon: <IconCheck size={20} />,
      autoClose: DEFAULT_AUTO_CLOSE,
    },
    error: {
      color: 'red',
      icon: <IconX size={20} />,
      autoClose: DEFAULT_AUTO_CLOSE,
    },
    warning: {
      color: 'orange',
      icon: <IconAlertTriangle size={20} />,
      autoClose: DEFAULT_AUTO_CLOSE,
    },
    info: {
      color: 'blue',
      icon: <IconInfoCircle size={20} />,
      autoClose: DEFAULT_AUTO_CLOSE,
    },
    loading: {
      color: 'blue',
      icon: <IconLoader size={20} className="rotate" />,
      autoClose: LOADING_AUTO_CLOSE,
      loading: true,
    },
  };

  return configs[variant] || configs.info;
};

/**
 * Show a success toast notification
 */
export const showSuccessToast = (
  message: string,
  options?: Omit<ToastOptions, 'variant'>
): string => {
  const config = getNotificationConfig('success');
  return notifications.show({
    message,
    ...config,
    ...options,
  });
};

/**
 * Show an error toast notification
 */
export const showErrorToast = (
  message: string,
  options?: Omit<ToastOptions, 'variant'>
): string => {
  const config = getNotificationConfig('error');
  return notifications.show({
    message,
    ...config,
    ...options,
  });
};

/**
 * Show a warning toast notification
 */
export const showWarningToast = (
  message: string,
  options?: Omit<ToastOptions, 'variant'>
): string => {
  const config = getNotificationConfig('warning');
  return notifications.show({
    message,
    ...config,
    ...options,
  });
};

/**
 * Show an info toast notification
 */
export const showInfoToast = (
  message: string,
  options?: Omit<ToastOptions, 'variant'>
): string => {
  const config = getNotificationConfig('info');
  return notifications.show({
    message,
    ...config,
    ...options,
  });
};

/**
 * Show a loading toast notification
 */
export const showLoadingToast = (
  message: string,
  options?: Omit<ToastOptions, 'variant'>
): string => {
  const config = getNotificationConfig('loading');
  return notifications.show({
    message,
    ...config,
    ...options,
  });
};

/**
 * Show a custom toast with specific configuration
 */
export const showToast = (
  title: string,
  message: string,
  variant: ToastVariant = 'info',
  options?: Omit<ToastOptions, 'variant'>
): string => {
  const config = getNotificationConfig(variant);
  return notifications.show({
    title,
    message,
    ...config,
    ...options,
  });
};

/**
 * Hide a specific toast notification
 */
export const hideToast = (id: string): void => {
  notifications.hide(id);
};

/**
 * Hide all toast notifications
 */
export const hideAllToasts = (): void => {
  notifications.clean();
};

/**
 * Toast utility class for common application scenarios
 */
export class ToastManager {
  private static toastIds: string[] = [];

  /**
   * Show operation success toast
   */
  static showOperationSuccess(operation: string, details?: string): string {
    const message = details ? `${operation}: ${details}` : operation;
    const id = showSuccessToast(message);
    this.toastIds.push(id);
    return id;
  }

  /**
   * Show operation error toast
   */
  static showOperationError(operation: string, error?: string | Error): string {
    const errorMessage = error instanceof Error ? error.message : error || 'Unknown error';
    const message = `${operation} failed: ${errorMessage}`;
    const id = showErrorToast(message, {
      autoClose: 8000, // Show errors longer
    });
    this.toastIds.push(id);
    return id;
  }

  /**
   * Show operation loading toast
   */
  static showOperationLoading(operation: string): string {
    const message = `${operation}...`;
    const id = showLoadingToast(message);
    this.toastIds.push(id);
    return id;
  }

  /**
   * Update loading toast to success
   */
  static updateLoadingToSuccess(loadingId: string, operation: string, details?: string): void {
    notifications.update({
      id: loadingId,
      color: 'green',
      icon: <IconCheck size={20} />,
      message: details ? `${operation}: ${details}` : operation,
      loading: false,
      autoClose: DEFAULT_AUTO_CLOSE,
    });
  }

  /**
   * Update loading toast to error
   */
  static updateLoadingToError(loadingId: string, operation: string, error?: string | Error): void {
    const errorMessage = error instanceof Error ? error.message : error || 'Unknown error';
    const message = `${operation} failed: ${errorMessage}`;
    notifications.update({
      id: loadingId,
      color: 'red',
      icon: <IconX size={20} />,
      message,
      loading: false,
      autoClose: 8000,
    });
  }

  /**
   * Show network error toast
   */
  static showNetworkError(error: string = 'Network error occurred. Please check your connection.'): string {
    return showErrorToast(error, {
      title: 'Network Error',
      autoClose: 10000,
    });
  }

  /**
   * Show validation error toast
   */
  static showValidationError(errors: string[]): string {
    const message = `Please fix the following errors: ${errors.join(', ')}`;
    return showWarningToast(message, {
      title: 'Validation Error',
      autoClose: 10000,
    });
  }

  /**
   * Show permission error toast
   */
  static showPermissionError(action: string): string {
    const message = `You don't have permission to ${action}.`;
    return showWarningToast(message, {
      title: 'Permission Denied',
      autoClose: 8000,
    });
  }

  /**
   * Clear all toasts managed by this instance
   */
  static clearAll(): void {
    this.toastIds.forEach((id) => {
      hideToast(id);
    });
    this.toastIds = [];
  }
}

/**
 * React hook for toast management
 */
export const useToast = () => {
  return {
    success: showSuccessToast,
    error: showErrorToast,
    warning: showWarningToast,
    info: showInfoToast,
    loading: showLoadingToast,
    hide: hideToast,
    clearAll: hideAllToasts,
    manager: ToastManager,
  };
};

// No default export - use named exports from the class declaration above