import { Box } from '@mantine/core';
import { useEffect, useState, useRef, useCallback } from 'react';

import * as styles from './mobile-responsive-wrapper.css';

export interface MobileResponsiveWrapperProps {
  children: React.ReactNode;
  className?: string;
  'data-testid'?: string;
  
  // Responsive behavior
  mobileBreakpoint?: number;
  tabletBreakpoint?: number;
  
  // Touch interactions
  enableTouchGestures?: boolean;
  preventScrollBounce?: boolean;
  optimizeForTouch?: boolean;
  touchFeedback?: boolean;
  
  // Performance
  enableGPUAcceleration?: boolean;
  reducedMotionFallback?: boolean;
  
  // Viewport adaptation
  adaptToOrientation?: boolean;
  adaptToSafeArea?: boolean;
  adaptToNotch?: boolean;
  
  // Callbacks
  onBreakpointChange?: (breakpoint: 'mobile' | 'tablet' | 'desktop') => void;
  onOrientationChange?: (orientation: 'portrait' | 'landscape') => void;
  onTouchStart?: (event: TouchEvent) => void;
  onTouchEnd?: (event: TouchEvent) => void;
}

interface ViewportInfo {
  width: number;
  height: number;
  breakpoint: 'mobile' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
  devicePixelRatio: number;
  hasNotch: boolean;
  safeAreaInsets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

/**
 * Hook to detect viewport changes and device characteristics
 */
function useViewportInfo(
  mobileBreakpoint: number,
  tabletBreakpoint: number
): ViewportInfo {
  const [viewportInfo, setViewportInfo] = useState<ViewportInfo>(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      width,
      height,
      breakpoint: width < mobileBreakpoint ? 'mobile' : width < tabletBreakpoint ? 'tablet' : 'desktop',
      orientation: height > width ? 'portrait' : 'landscape',
      devicePixelRatio: window.devicePixelRatio || 1,
      hasNotch: false, // Will be detected
      safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
    };
  });

  const detectSafeAreaInsets = useCallback(() => {
    const computedStyle = getComputedStyle(document.documentElement);
    
    return {
      top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
      right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0', 10),
      bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
      left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0', 10),
    };
  }, []);

  const detectNotch = useCallback(() => {
    const safeAreaInsets = detectSafeAreaInsets();
    return safeAreaInsets.top > 20; // Typical status bar height
  }, [detectSafeAreaInsets]);

  const updateViewportInfo = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const breakpoint = width < mobileBreakpoint ? 'mobile' : width < tabletBreakpoint ? 'tablet' : 'desktop';
    const orientation = height > width ? 'portrait' : 'landscape';
    const safeAreaInsets = detectSafeAreaInsets();
    const hasNotch = detectNotch();

    setViewportInfo({
      width,
      height,
      breakpoint,
      orientation,
      devicePixelRatio: window.devicePixelRatio || 1,
      hasNotch,
      safeAreaInsets,
    });
  }, [mobileBreakpoint, tabletBreakpoint, detectSafeAreaInsets, detectNotch]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateViewportInfo, 100); // Debounce
    };

    const handleOrientationChange = () => {
      // Delay to allow viewport to settle
      setTimeout(updateViewportInfo, 300);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Initial detection
    updateViewportInfo();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      clearTimeout(timeoutId);
    };
  }, [updateViewportInfo]);

  return viewportInfo;
}

/**
 * Hook for touch gesture detection
 */
function useTouchGestures(
  enabled: boolean,
  onTouchStart?: (event: TouchEvent) => void,
  onTouchEnd?: (event: TouchEvent) => void
) {
  const elementRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    if (!enabled || !elementRef.current) return;

    const element = elementRef.current;

    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      
      onTouchStart?.(event);
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (touchStartRef.current) {
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStartRef.current.x;
        const deltaY = touch.clientY - touchStartRef.current.y;
        const deltaTime = Date.now() - touchStartRef.current.time;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const velocity = distance / deltaTime;

        // Simple tap detection
        if (distance < 10 && deltaTime < 300) {
          element.classList.add(styles.touchFeedback);
          setTimeout(() => {
            element.classList.remove(styles.touchFeedback);
          }, 150);
        }

        touchStartRef.current = null;
      }
      
      onTouchEnd?.(event);
    };

    const handleTouchCancel = () => {
      touchStartRef.current = null;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [enabled, onTouchStart, onTouchEnd]);

  return elementRef;
}

/**
 * Hook to detect reduced motion preference
 */
function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * Mobile-responsive wrapper component with touch optimization
 */
export const MobileResponsiveWrapper = ({
  children,
  className,
  'data-testid': testId,
  mobileBreakpoint = 768,
  tabletBreakpoint = 1024,
  enableTouchGestures = true,
  preventScrollBounce = true,
  optimizeForTouch = true,
  touchFeedback = true,
  enableGPUAcceleration = true,
  reducedMotionFallback = true,
  adaptToOrientation = true,
  adaptToSafeArea = true,
  adaptToNotch = true,
  onBreakpointChange,
  onOrientationChange,
  onTouchStart,
  onTouchEnd,
}: MobileResponsiveWrapperProps) => {
  const viewportInfo = useViewportInfo(mobileBreakpoint, tabletBreakpoint);
  const prefersReducedMotion = useReducedMotion();
  const touchRef = useTouchGestures(
    enableTouchGestures && touchFeedback,
    onTouchStart,
    onTouchEnd
  );

  // Notify parent of breakpoint changes
  useEffect(() => {
    onBreakpointChange?.(viewportInfo.breakpoint);
  }, [viewportInfo.breakpoint, onBreakpointChange]);

  // Notify parent of orientation changes
  useEffect(() => {
    onOrientationChange?.(viewportInfo.orientation);
  }, [viewportInfo.orientation, onOrientationChange]);

  // Apply scroll bounce prevention on mobile Safari
  useEffect(() => {
    if (preventScrollBounce && viewportInfo.breakpoint === 'mobile') {
      document.body.style.overscrollBehavior = 'none';
      document.documentElement.style.overscrollBehavior = 'none';
      
      return () => {
        document.body.style.overscrollBehavior = '';
        document.documentElement.style.overscrollBehavior = '';
      };
    }
  }, [preventScrollBounce, viewportInfo.breakpoint]);

  // Build CSS classes based on configuration
  const cssClasses = [
    styles.responsiveContainer,
    styles[viewportInfo.breakpoint],
    styles[viewportInfo.orientation],
    optimizeForTouch && viewportInfo.breakpoint === 'mobile' ? styles.touchOptimized : '',
    enableGPUAcceleration ? styles.gpuAccelerated : '',
    prefersReducedMotion && reducedMotionFallback ? styles.reducedMotion : '',
    adaptToSafeArea && viewportInfo.hasNotch ? styles.safeAreaAdapted : '',
    adaptToNotch && viewportInfo.hasNotch ? styles.notchAdapted : '',
    className,
  ].filter(Boolean).join(' ');

  // Dynamic styles based on viewport
  const dynamicStyles: React.CSSProperties = {
    ...(adaptToSafeArea && {
      paddingTop: viewportInfo.safeAreaInsets.top || undefined,
      paddingRight: viewportInfo.safeAreaInsets.right || undefined,
      paddingBottom: viewportInfo.safeAreaInsets.bottom || undefined,
      paddingLeft: viewportInfo.safeAreaInsets.left || undefined,
    }),
  };

  return (
    <Box
      ref={touchRef}
      className={cssClasses}
      style={dynamicStyles}
      data-testid={testId}
      data-breakpoint={viewportInfo.breakpoint}
      data-orientation={viewportInfo.orientation}
      data-device-pixel-ratio={viewportInfo.devicePixelRatio}
      data-has-notch={viewportInfo.hasNotch}
    >
      {children}
    </Box>
  );
};

/**
 * Hook for responsive component behavior
 */
export const useResponsiveBreakpoint = (
  mobileBreakpoint = 768,
  tabletBreakpoint = 1024
) => {
  const viewportInfo = useViewportInfo(mobileBreakpoint, tabletBreakpoint);
  
  return {
    isMobile: viewportInfo.breakpoint === 'mobile',
    isTablet: viewportInfo.breakpoint === 'tablet',
    isDesktop: viewportInfo.breakpoint === 'desktop',
    breakpoint: viewportInfo.breakpoint,
    orientation: viewportInfo.orientation,
    isPortrait: viewportInfo.orientation === 'portrait',
    isLandscape: viewportInfo.orientation === 'landscape',
    viewport: viewportInfo,
  };
};

/**
 * Touch-optimized button wrapper
 */
export const TouchOptimizedButton = ({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  className,
  ...props
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  [key: string]: any;
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const { isMobile } = useResponsiveBreakpoint();
  
  const handleTouchStart = () => {
    if (!disabled) {
      setIsPressed(true);
    }
  };
  
  const handleTouchEnd = () => {
    setIsPressed(false);
  };
  
  const handleClick = () => {
    if (!disabled) {
      onClick?.();
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
    styles.touchButton,
    getVariantStyle(variant),
    getSizeStyle(size),
    isMobile ? styles.mobileButton : '',
    isPressed ? styles.buttonPressed : '',
    disabled ? styles.buttonDisabled : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      className={buttonClasses}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * Swipe gesture detector
 */
export const useSwipeGesture = (
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  threshold = 50
) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
      };
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Determine swipe direction
      if (Math.max(absDeltaX, absDeltaY) > threshold) {
        if (absDeltaX > absDeltaY) {
          // Horizontal swipe
          if (deltaX > 0) {
            onSwipeRight?.();
          } else {
            onSwipeLeft?.();
          }
        } else {
          // Vertical swipe
          if (deltaY > 0) {
            onSwipeDown?.();
          } else {
            onSwipeUp?.();
          }
        }
      }

      touchStartRef.current = null;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold]);

  return elementRef;
};