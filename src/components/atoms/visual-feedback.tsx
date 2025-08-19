import { Box, Text } from '@mantine/core';
import { useEffect, useState, useRef, useCallback } from 'react';

import * as styles from './visual-feedback.css';

export interface VisualFeedbackProps {
  children: React.ReactNode;
  className?: string;
  'data-testid'?: string;
  
  // Feedback types
  enableRipple?: boolean;
  enableHover?: boolean;
  enableFocus?: boolean;
  enablePress?: boolean;
  enableSuccess?: boolean;
  enableError?: boolean;
  enableLoading?: boolean;
  
  // Customization
  rippleColor?: string;
  rippleDuration?: number;
  hoverElevation?: boolean;
  pressScale?: number;
  
  // State management
  isSuccess?: boolean;
  isError?: boolean;
  isLoading?: boolean;
  isDisabled?: boolean;
  
  // Messages
  successMessage?: string;
  errorMessage?: string;
  loadingMessage?: string;
  
  // Callbacks
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface RippleEffect {
  id: string;
  x: number;
  y: number;
  size: number;
}

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration: number;
  timestamp: number;
}

/**
 * Hook for ripple effect management
 */
function useRippleEffect(
  enabled: boolean,
  _color: string = 'rgba(255, 255, 255, 0.3)',
  duration: number = 600
) {
  const [ripples, setRipples] = useState<RippleEffect[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const createRipple = useCallback((event: React.MouseEvent | MouseEvent) => {
    if (!enabled || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const newRipple: RippleEffect = {
      id: Date.now().toString(),
      x,
      y,
      size,
    };

    setRipples(prev => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, duration);
  }, [enabled, duration]);

  return {
    containerRef,
    ripples,
    createRipple,
  };
}

/**
 * Hook for toast notifications
 */
function useToastNotifications() {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = useCallback((
    type: ToastNotification['type'],
    message: string,
    duration: number = 4000
  ) => {
    const toast: ToastNotification = {
      id: Date.now().toString(),
      type,
      message,
      duration,
      timestamp: Date.now(),
    };

    setToasts(prev => [...prev, toast]);

    // Auto-remove toast
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
  };
}

/**
 * Hook for interaction states
 */
function useInteractionStates({
  onInteractionStart,
  onInteractionEnd,
}: {
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    onInteractionStart?.();
  }, [onInteractionStart]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setIsPressed(false);
    onInteractionEnd?.();
  }, [onInteractionEnd]);

  const handleFocusIn = useCallback(() => {
    setIsFocused(true);
    onInteractionStart?.();
  }, [onInteractionStart]);

  const handleFocusOut = useCallback(() => {
    setIsFocused(false);
    onInteractionEnd?.();
  }, [onInteractionEnd]);

  const handleMouseDown = useCallback(() => {
    setIsPressed(true);
    setIsActive(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
    setTimeout(() => setIsActive(false), 150);
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      setIsPressed(true);
      setIsActive(true);
    }
  }, []);

  const handleKeyUp = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      setIsPressed(false);
      setTimeout(() => setIsActive(false), 150);
    }
  }, []);

  return {
    isHovered,
    isFocused,
    isPressed,
    isActive,
    handlers: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocusIn,
      onBlur: handleFocusOut,
      onMouseDown: handleMouseDown,
      onMouseUp: handleMouseUp,
      onKeyDown: handleKeyDown,
      onKeyUp: handleKeyUp,
    },
  };
}

/**
 * Ripple component
 */
const Ripple = ({ ripple, color, duration }: {
  ripple: RippleEffect;
  color: string;
  duration: number;
}) => (
  <span
    className={styles.ripple}
    style={{
      left: ripple.x,
      top: ripple.y,
      width: ripple.size,
      height: ripple.size,
      backgroundColor: color,
      animationDuration: `${duration}ms`,
    }}
  />
);

/**
 * Helper function to get toast type style safely
 */
const getToastTypeStyle = (type: string): string => {
  const typeKey = `toast${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof styles;
  return styles[typeKey] || '';
};

/**
 * Toast notification component
 */
const Toast = ({ 
  toast, 
  onRemove 
}: { 
  toast: ToastNotification; 
  onRemove: (id: string) => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const handleClick = () => {
    onRemove(toast.id);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRemove(toast.id);
    }
  };

  return (
    <div
      className={`${styles.toast} ${getToastTypeStyle(toast.type)}`}
      role="alert"
      aria-live="polite"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <Text className={styles.toastMessage}>
        {toast.message}
      </Text>
      <button
        className={styles.toastCloseButton}
        onClick={handleClick}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};

/**
 * Loading indicator component
 */
const LoadingIndicator = ({ message }: { message?: string }) => (
  <div className={styles.loadingIndicator}>
    <div className={styles.loadingSpinner} />
    {message && (
      <Text className={styles.loadingMessage}>
        {message}
      </Text>
    )}
  </div>
);

/**
 * Success indicator component
 */
const SuccessIndicator = ({ message }: { message?: string }) => (
  <div className={styles.successIndicator}>
    <div className={styles.successIcon}>✓</div>
    {message && (
      <Text className={styles.successMessage}>
        {message}
      </Text>
    )}
  </div>
);

/**
 * Error indicator component
 */
const ErrorIndicator = ({ message }: { message?: string }) => (
  <div className={styles.errorIndicator}>
    <div className={styles.errorIcon}>✕</div>
    {message && (
      <Text className={styles.errorMessage}>
        {message}
      </Text>
    )}
  </div>
);

/**
 * Progress bar component
 */
const ProgressBar = ({ 
  progress, 
  animated = true 
}: { 
  progress: number;
  animated?: boolean;
}) => (
  <div className={styles.progressContainer}>
    <div
      className={`${styles.progressBar} ${animated ? styles.progressAnimated : ''}`}
      style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    />
  </div>
);

/**
 * Main visual feedback component
 */
export const VisualFeedback = ({
  children,
  className,
  'data-testid': testId,
  enableRipple = true,
  enableHover = true,
  enableFocus = true,
  enablePress = true,
  enableSuccess = true,
  enableError = true,
  enableLoading = true,
  rippleColor = 'rgba(255, 255, 255, 0.3)',
  rippleDuration = 600,
  hoverElevation = true,
  pressScale = 0.98,
  isSuccess = false,
  isError = false,
  isLoading = false,
  isDisabled = false,
  successMessage,
  errorMessage,
  loadingMessage,
  onInteractionStart,
  onInteractionEnd,
  onSuccess,
  onError,
}: VisualFeedbackProps) => {
  const rippleEffect = useRippleEffect(enableRipple, rippleColor, rippleDuration);
  const { toasts, addToast, removeToast } = useToastNotifications();
  const interactionStates = useInteractionStates({
    onInteractionStart,
    onInteractionEnd,
  });

  // Handle state changes
  useEffect(() => {
    if (isSuccess && enableSuccess && successMessage) {
      addToast('success', successMessage);
      onSuccess?.();
    }
  }, [isSuccess, enableSuccess, successMessage, addToast, onSuccess]);

  useEffect(() => {
    if (isError && enableError && errorMessage) {
      addToast('error', errorMessage);
      onError?.(errorMessage);
    }
  }, [isError, enableError, errorMessage, addToast, onError]);

  // Build CSS classes
  const cssClasses = [
    styles.feedbackContainer,
    enableHover && interactionStates.isHovered ? styles.hovered : '',
    enableFocus && interactionStates.isFocused ? styles.focused : '',
    enablePress && interactionStates.isPressed ? styles.pressed : '',
    hoverElevation && interactionStates.isHovered ? styles.elevated : '',
    isLoading ? styles.loading : '',
    isSuccess ? styles.success : '',
    isError ? styles.error : '',
    isDisabled ? styles.disabled : '',
    className,
  ].filter(Boolean).join(' ');

  // Interaction handlers
  const handleClick = (event: React.MouseEvent) => {
    if (isDisabled) return;
    
    if (enableRipple) {
      rippleEffect.createRipple(event);
    }
  };

  const combinedHandlers = {
    ...interactionStates.handlers,
    onClick: handleClick,
  };

  return (
    <>
      <Box
        ref={rippleEffect.containerRef}
        className={cssClasses}
        data-testid={testId}
        data-interaction-state={
          isLoading ? 'loading' :
          isSuccess ? 'success' :
          isError ? 'error' :
          isDisabled ? 'disabled' :
          'default'
        }
        style={{
          transform: enablePress && interactionStates.isPressed 
            ? `scale(${pressScale})` 
            : undefined,
        }}
        {...combinedHandlers}
      >
        {children}

        {/* Ripple effects */}
        {enableRipple && rippleEffect.ripples.map(ripple => (
          <Ripple
            key={ripple.id}
            ripple={ripple}
            color={rippleColor}
            duration={rippleDuration}
          />
        ))}

        {/* State overlays */}
        {isLoading && enableLoading && (
          <div className={styles.overlay}>
            <LoadingIndicator message={loadingMessage} />
          </div>
        )}

        {isSuccess && enableSuccess && (
          <div className={styles.overlay}>
            <SuccessIndicator message={successMessage} />
          </div>
        )}

        {isError && enableError && (
          <div className={styles.overlay}>
            <ErrorIndicator message={errorMessage} />
          </div>
        )}
      </Box>

      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div className={styles.toastContainer}>
          {toasts.map(toast => (
            <Toast
              key={toast.id}
              toast={toast}
              onRemove={removeToast}
            />
          ))}
        </div>
      )}
    </>
  );
};

/**
 * Feedback button component with enhanced interactions
 */
export const FeedbackButton = ({
  children,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  isSuccess = false,
  isError = false,
  successMessage = 'Success!',
  errorMessage = 'Error occurred',
  loadingMessage = 'Loading...',
  onClick,
  disabled = false,
  ...props
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
  successMessage?: string;
  errorMessage?: string;
  loadingMessage?: string;
  onClick?: () => void;
  disabled?: boolean;
  [key: string]: any;
}) => {
  const [internalLoading, setInternalLoading] = useState(false);

  const handleClick = async () => {
    if (disabled || isLoading || internalLoading) return;

    setInternalLoading(true);
    try {
      await onClick?.();
    } finally {
      setInternalLoading(false);
    }
  };

  // Helper function to get variant style safely
  const getVariantStyle = (variant: string): string => {
    const variantKey = `button${variant.charAt(0).toUpperCase() + variant.slice(1)}` as keyof typeof styles;
    return styles[variantKey] || '';
  };

  // Helper function to get size style safely
  const getSizeStyle = (size: string): string => {
    const sizeKey = `buttonSize${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof typeof styles;
    return styles[sizeKey] || '';
  };

  const buttonClasses = [
    styles.feedbackButton,
    getVariantStyle(variant),
    getSizeStyle(size),
  ].join(' ');

  return (
    <VisualFeedback
      isLoading={isLoading || internalLoading}
      isSuccess={isSuccess}
      isError={isError}
      isDisabled={disabled}
      successMessage={successMessage}
      errorMessage={errorMessage}
      loadingMessage={loadingMessage}
      enableRipple
      enableHover
      enablePress
      hoverElevation
    >
      <button
        className={buttonClasses}
        onClick={handleClick}
        disabled={disabled || isLoading || internalLoading}
        {...props}
      >
        {children}
      </button>
    </VisualFeedback>
  );
};

/**
 * Progress feedback component
 */
export const ProgressFeedback = ({
  progress,
  message,
  showPercentage = true,
  animated = true,
  variant = 'default',
}: {
  progress: number;
  message?: string;
  showPercentage?: boolean;
  animated?: boolean;
  variant?: 'default' | 'success' | 'error' | 'warning';
}) => {
  // Helper function to get progress variant style safely
  const getProgressVariantStyle = (variant: string): string => {
    const variantKey = `progress${variant.charAt(0).toUpperCase() + variant.slice(1)}` as keyof typeof styles;
    return styles[variantKey] || '';
  };

  const progressClasses = [
    styles.progressFeedback,
    getProgressVariantStyle(variant),
  ].join(' ');

  return (
    <div className={progressClasses}>
      {message && (
        <Text className={styles.progressLabel}>
          {message}
          {showPercentage && ` (${Math.round(progress)}%)`}
        </Text>
      )}
      <ProgressBar progress={progress} animated={animated} />
    </div>
  );
};

/**
 * Micro-interaction component for small feedback elements
 */
export const MicroInteraction = ({
  children,
  trigger = 'hover',
  animation = 'bounce',
  duration = 300,
  delay = 0,
}: {
  children: React.ReactNode;
  trigger?: 'hover' | 'focus' | 'click' | 'auto';
  animation?: 'bounce' | 'shake' | 'pulse' | 'glow' | 'rotate';
  duration?: number;
  delay?: number;
}) => {
  const [isTriggered, setIsTriggered] = useState(false);

  useEffect(() => {
    if (trigger === 'auto') {
      const timer = setTimeout(() => {
        setIsTriggered(true);
        setTimeout(() => setIsTriggered(false), duration);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [trigger, duration, delay]);

  // Helper function to get animation style safely
  const getAnimationStyle = (animation: string): string => {
    const animationKey = `animation${animation.charAt(0).toUpperCase() + animation.slice(1)}` as keyof typeof styles;
    return styles[animationKey] || '';
  };

  const microClasses = [
    styles.microInteraction,
    getAnimationStyle(animation),
    isTriggered ? styles.triggered : '',
  ].join(' ');

  const handlers = {
    ...(trigger === 'hover' && {
      onMouseEnter: () => setIsTriggered(true),
      onMouseLeave: () => setIsTriggered(false),
    }),
    ...(trigger === 'focus' && {
      onFocus: () => setIsTriggered(true),
      onBlur: () => setIsTriggered(false),
    }),
    ...(trigger === 'click' && {
      onClick: () => {
        setIsTriggered(true);
        setTimeout(() => setIsTriggered(false), duration);
      },
    }),
  };

  return (
    <span
      className={microClasses}
      style={{ animationDuration: `${duration}ms` }}
      {...handlers}
    >
      {children}
    </span>
  );
};