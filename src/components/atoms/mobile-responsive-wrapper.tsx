import { Box } from '@mantine/core';
import { useEffect, useState, useRef, useCallback as _useCallback } from 'react';

import { useResponsiveBreakpoint } from '@/hooks/use-responsive-breakpoint';
import { useViewportInfo } from '@/hooks/use-viewport-info';

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
  _adaptToOrientation?: boolean;
  adaptToSafeArea?: boolean;
  adaptToNotch?: boolean;
  
  // Callbacks
  onBreakpointChange?: (breakpoint: 'mobile' | 'tablet' | 'desktop') => void;
  onOrientationChange?: (orientation: 'portrait' | 'landscape') => void;
  onTouchStart?: (event: TouchEvent) => void;
  onTouchEnd?: (event: TouchEvent) => void;
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
        const _velocity = distance / deltaTime;

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
// Helper function to build CSS classes
const buildResponsiveClasses = (
  viewportInfo: ReturnType<typeof useViewportInfo>,
  prefersReducedMotion: boolean,
  props: {
    optimizeForTouch: boolean;
    enableGPUAcceleration: boolean;
    reducedMotionFallback: boolean;
    adaptToSafeArea: boolean;
    adaptToNotch: boolean;
    className?: string;
  }
) => {
  const {
    optimizeForTouch,
    enableGPUAcceleration,
    reducedMotionFallback,
    adaptToSafeArea,
    adaptToNotch,
    className,
  } = props;
  
  return [
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
};

// Helper function to build dynamic styles
const buildDynamicStyles = (
  adaptToSafeArea: boolean,
  safeAreaInsets: ReturnType<typeof useViewportInfo>['safeAreaInsets']
): React.CSSProperties => {
  if (!adaptToSafeArea) return {};
  
  return {
    paddingTop: safeAreaInsets.top || undefined,
    paddingRight: safeAreaInsets.right || undefined,
    paddingBottom: safeAreaInsets.bottom || undefined,
    paddingLeft: safeAreaInsets.left || undefined,
  };
};

// Helper function to build data attributes
const buildDataAttributes = (
  viewportInfo: ReturnType<typeof useViewportInfo>,
  testId?: string
) => {
  return {
    'data-testid': testId,
    'data-breakpoint': viewportInfo.breakpoint,
    'data-orientation': viewportInfo.orientation,
    'data-device-pixel-ratio': viewportInfo.devicePixelRatio,
    'data-has-notch': viewportInfo.hasNotch,
  };
};

// Hook for scroll bounce prevention
const useScrollBounceEffect = (
  preventScrollBounce: boolean,
  breakpoint: string
) => {
  useEffect(() => {
    if (preventScrollBounce && breakpoint === 'mobile') {
      document.body.style.overscrollBehavior = 'none';
      document.documentElement.style.overscrollBehavior = 'none';
      
      return () => {
        document.body.style.overscrollBehavior = '';
        document.documentElement.style.overscrollBehavior = '';
      };
    }
  }, [preventScrollBounce, breakpoint]);
};

export const MobileResponsiveWrapper = (props: MobileResponsiveWrapperProps) => {
  const {
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
    adaptToSafeArea = true,
    adaptToNotch = true,
    onBreakpointChange,
    onOrientationChange,
    onTouchStart,
    onTouchEnd,
  } = props;
  
  const viewportInfo = useViewportInfo(mobileBreakpoint, tabletBreakpoint);
  const prefersReducedMotion = useReducedMotion();
  const touchRef = useTouchGestures(
    enableTouchGestures && touchFeedback,
    onTouchStart,
    onTouchEnd
  );

  // Handle effects
  useEffect(() => {
    onBreakpointChange?.(viewportInfo.breakpoint);
  }, [viewportInfo.breakpoint, onBreakpointChange]);

  useEffect(() => {
    onOrientationChange?.(viewportInfo.orientation);
  }, [viewportInfo.orientation, onOrientationChange]);

  useScrollBounceEffect(preventScrollBounce, viewportInfo.breakpoint);

  // Build computed values
  const cssClasses = buildResponsiveClasses(viewportInfo, prefersReducedMotion, {
    optimizeForTouch,
    enableGPUAcceleration,
    reducedMotionFallback,
    adaptToSafeArea,
    adaptToNotch,
    className,
  });
  
  const dynamicStyles = buildDynamicStyles(adaptToSafeArea, viewportInfo.safeAreaInsets);
  const dataAttributes = buildDataAttributes(viewportInfo, testId);

  return (
    <Box
      ref={touchRef}
      className={cssClasses}
      style={dynamicStyles}
      {...dataAttributes}
    >
      {children}
    </Box>
  );
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
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
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

