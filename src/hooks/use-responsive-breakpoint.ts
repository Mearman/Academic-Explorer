import { useViewportInfo } from './use-viewport-info';

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