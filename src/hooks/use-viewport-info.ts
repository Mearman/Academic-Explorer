import { useState, useEffect, useCallback } from 'react';

export interface ViewportInfo {
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
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
}

/**
 * Hook to detect viewport changes and device characteristics
 */
export function useViewportInfo(
  mobileBreakpoint: number,
  tabletBreakpoint: number
): ViewportInfo {
  const [viewportInfo, setViewportInfo] = useState<ViewportInfo>(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const breakpoint = width < mobileBreakpoint ? 'mobile' : width < tabletBreakpoint ? 'tablet' : 'desktop';
    
    return {
      width,
      height,
      breakpoint,
      orientation: height > width ? 'portrait' : 'landscape',
      devicePixelRatio: window.devicePixelRatio || 1,
      hasNotch: false, // Will be detected
      safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
      isMobile: breakpoint === 'mobile',
      isTablet: breakpoint === 'tablet',
      isDesktop: breakpoint === 'desktop',
      isTouchDevice: 'ontouchstart' in window,
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
      isMobile: breakpoint === 'mobile',
      isTablet: breakpoint === 'tablet',
      isDesktop: breakpoint === 'desktop',
      isTouchDevice: 'ontouchstart' in window,
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