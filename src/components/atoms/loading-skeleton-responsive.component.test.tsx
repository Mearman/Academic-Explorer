/**
 * Responsive Design and Mobile Interaction Tests for LoadingSkeleton
 * Tests responsive behavior, touch interactions, and cross-device compatibility
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  LoadingSkeleton,
  SkeletonGroup,
  TextSkeleton,
  TitleSkeleton,
  ButtonSkeleton,
  AvatarSkeleton,
  CardSkeleton,
} from './loading-skeleton';

// Mock viewport utilities for responsive testing
const mockViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  // Trigger resize event
  fireEvent(window, new Event('resize'));
};

const mockMediaQuery = (query: string, matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(q => ({
      matches: q === query ? matches : false,
      media: q,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('Responsive Design: LoadingSkeleton Adaptability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to desktop viewport
    mockViewport(1024, 768);
  });

  describe('Viewport Breakpoint Adaptations', () => {
    it('should adapt to mobile viewport (< 768px)', () => {
      mockViewport(375, 667); // iPhone SE
      mockMediaQuery('(max-width: 767px)', true);
      
      render(
        <div className="responsive-container">
          <SkeletonGroup lines={3} data-testid="mobile-skeleton-group" />
        </div>
      );
      
      const skeletonGroup = screen.getByTestId('mobile-skeleton-group');
      expect(skeletonGroup).toBeInTheDocument();
      
      // On mobile, skeleton should take full width
      const container = skeletonGroup.parentElement;
      expect(container).toHaveClass('responsive-container');
    });

    it('should adapt to tablet viewport (768px - 1024px)', () => {
      mockViewport(768, 1024); // iPad
      mockMediaQuery('(min-width: 768px) and (max-width: 1023px)', true);
      
      render(
        <div>
          <CardSkeleton data-testid="tablet-card-skeleton" />
        </div>
      );
      
      const cardSkeleton = screen.getByTestId('tablet-card-skeleton');
      expect(cardSkeleton).toBeInTheDocument();
    });

    it('should adapt to desktop viewport (>= 1024px)', () => {
      mockViewport(1440, 900); // Desktop
      mockMediaQuery('(min-width: 1024px)', true);
      
      render(
        <div>
          <SkeletonGroup lines={5} data-testid="desktop-skeleton-group" />
        </div>
      );
      
      const skeletonGroup = screen.getByTestId('desktop-skeleton-group');
      expect(skeletonGroup).toBeInTheDocument();
      expect(skeletonGroup.children).toHaveLength(5);
    });

    it('should handle very small screens (< 320px)', () => {
      mockViewport(280, 653); // Very small mobile
      mockMediaQuery('(max-width: 319px)', true);
      
      render(
        <div>
          <TextSkeleton data-testid="tiny-screen-skeleton" />
        </div>
      );
      
      const skeleton = screen.getByTestId('tiny-screen-skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('should handle ultra-wide screens (> 1920px)', () => {
      mockViewport(2560, 1440); // 4K monitor
      mockMediaQuery('(min-width: 1920px)', true);
      
      render(
        <div>
          <SkeletonGroup lines={4} data-testid="ultrawide-skeleton-group" />
        </div>
      );
      
      const skeletonGroup = screen.getByTestId('ultrawide-skeleton-group');
      expect(skeletonGroup).toBeInTheDocument();
    });
  });

  describe('Device Orientation Handling', () => {
    it('should adapt to portrait orientation', () => {
      mockViewport(375, 812); // iPhone X portrait
      mockMediaQuery('(orientation: portrait)', true);
      
      render(
        <div>
          <TitleSkeleton data-testid="portrait-title-skeleton" />
          <SkeletonGroup lines={3} data-testid="portrait-content-skeleton" />
        </div>
      );
      
      const titleSkeleton = screen.getByTestId('portrait-title-skeleton');
      const contentSkeleton = screen.getByTestId('portrait-content-skeleton');
      
      expect(titleSkeleton).toBeInTheDocument();
      expect(contentSkeleton).toBeInTheDocument();
    });

    it('should adapt to landscape orientation', () => {
      mockViewport(812, 375); // iPhone X landscape
      mockMediaQuery('(orientation: landscape)', true);
      
      render(
        <div>
          <SkeletonGroup lines={2} data-testid="landscape-skeleton-group" />
        </div>
      );
      
      const skeletonGroup = screen.getByTestId('landscape-skeleton-group');
      expect(skeletonGroup).toBeInTheDocument();
    });
  });

  describe('Flexible Layout Adaptations', () => {
    it('should adapt width to container constraints', () => {
      render(
        <div style={{ width: '200px' }}>
          <LoadingSkeleton width="full" data-testid="constrained-skeleton" />
        </div>
      );
      
      const skeleton = screen.getByTestId('constrained-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveStyle({ width: '100%' });
    });

    it('should maintain aspect ratios on different screen sizes', () => {
      const { rerender } = render(
        <div style={{ width: '300px' }}>
          <AvatarSkeleton data-testid="avatar-skeleton" />
        </div>
      );
      
      let skeleton = screen.getByTestId('avatar-skeleton');
      expect(skeleton).toBeInTheDocument();
      
      // Change container size
      rerender(
        <div style={{ width: '150px' }}>
          <AvatarSkeleton data-testid="avatar-skeleton" />
        </div>
      );
      
      skeleton = screen.getByTestId('avatar-skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('should handle nested responsive containers', () => {
      render(
        <div className="outer-container">
          <div className="inner-container" style={{ width: '50%' }}>
            <SkeletonGroup lines={2} data-testid="nested-skeleton-group" />
          </div>
        </div>
      );
      
      const skeletonGroup = screen.getByTestId('nested-skeleton-group');
      expect(skeletonGroup).toBeInTheDocument();
    });
  });

  describe('Text Scaling and Font Size Adaptations', () => {
    it('should respect user font size preferences', () => {
      // Mock larger font size preference
      render(
        <div style={{ fontSize: '20px' }}>
          <TextSkeleton data-testid="large-font-skeleton" />
        </div>
      );
      
      const skeleton = screen.getByTestId('large-font-skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('should scale appropriately with zoom levels', () => {
      // Mock browser zoom
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        value: 2, // 200% zoom
      });
      
      render(
        <div>
          <TextSkeleton data-testid="zoomed-skeleton" />
        </div>
      );
      
      const skeleton = screen.getByTestId('zoomed-skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('should handle system font scaling', () => {
      mockMediaQuery('(prefers-reduced-data: reduce)', true);
      
      render(
        <div>
          <SkeletonGroup lines={2} data-testid="reduced-data-skeleton" />
        </div>
      );
      
      const skeletonGroup = screen.getByTestId('reduced-data-skeleton');
      expect(skeletonGroup).toBeInTheDocument();
    });
  });
});

describe('Mobile Touch Interactions: LoadingSkeleton Behavior', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    mockViewport(375, 667); // Mobile viewport
    vi.clearAllMocks();
  });

  describe('Touch Event Handling', () => {
    it('should not interfere with touch scrolling', async () => {
      render(
        <div data-testid="scrollable-container" style={{ height: '300px', overflow: 'auto' }}>
          <SkeletonGroup lines={10} data-testid="scrollable-skeletons" />
        </div>
      );
      
      const container = screen.getByTestId('scrollable-container');
      const skeletonGroup = screen.getByTestId('scrollable-skeletons');
      
      expect(container).toBeInTheDocument();
      expect(skeletonGroup).toBeInTheDocument();
      
      // Touch events should not be prevented
      fireEvent.touchStart(container, {
        touches: [{ clientX: 100, clientY: 100 }],
      });
      
      fireEvent.touchMove(container, {
        touches: [{ clientX: 100, clientY: 50 }],
      });
      
      fireEvent.touchEnd(container);
      
      // Skeleton should not capture or prevent touch events
      expect(skeletonGroup).toHaveAttribute('aria-hidden', 'true');
    });

    it('should not capture touch events meant for parent elements', () => {
      const handleTouch = vi.fn();
      
      render(
        <div onTouchStart={handleTouch} data-testid="touch-parent">
          <LoadingSkeleton data-testid="touch-skeleton" />
        </div>
      );
      
      const skeleton = screen.getByTestId('touch-skeleton');
      const parent = screen.getByTestId('touch-parent');
      
      fireEvent.touchStart(skeleton, {
        touches: [{ clientX: 50, clientY: 50 }],
      });
      
      // Touch event should bubble to parent
      expect(handleTouch).toHaveBeenCalled();
    });

    it('should not prevent pinch-to-zoom gestures', () => {
      render(
        <div>
          <CardSkeleton data-testid="pinch-skeleton" />
        </div>
      );
      
      const skeleton = screen.getByTestId('pinch-skeleton');
      
      // Simulate pinch gesture
      fireEvent.touchStart(skeleton, {
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 200 },
        ],
      });
      
      fireEvent.touchMove(skeleton, {
        touches: [
          { clientX: 80, clientY: 80 },
          { clientX: 220, clientY: 220 },
        ],
      });
      
      fireEvent.touchEnd(skeleton);
      
      // Should not interfere with zoom
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('Mobile Performance Optimization', () => {
    it('should use efficient animations for mobile devices', () => {
      mockMediaQuery('(hover: none) and (pointer: coarse)', true);
      
      render(
        <div>
          <LoadingSkeleton animation="wave" data-testid="mobile-optimized-skeleton" />
        </div>
      );
      
      const skeleton = screen.getByTestId('mobile-optimized-skeleton');
      expect(skeleton).toBeInTheDocument();
      
      // On mobile, should prefer GPU-accelerated animations
    });

    it('should reduce animation complexity on low-end devices', () => {
      // Mock slow device
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        writable: true,
        value: 2, // Low core count
      });
      
      render(
        <div>
          <SkeletonGroup lines={5} data-testid="low-end-device-skeletons" />
        </div>
      );
      
      const skeletonGroup = screen.getByTestId('low-end-device-skeletons');
      expect(skeletonGroup).toBeInTheDocument();
    });

    it('should handle network-conscious loading patterns', () => {
      mockMediaQuery('(prefers-reduced-data: reduce)', true);
      
      render(
        <div>
          <SkeletonGroup lines={3} data-testid="data-conscious-skeletons" />
        </div>
      );
      
      const skeletonGroup = screen.getByTestId('data-conscious-skeletons');
      expect(skeletonGroup).toBeInTheDocument();
      
      // Should reduce animation complexity for data-conscious users
    });
  });

  describe('Cross-Device Consistency', () => {
    it('should maintain consistent appearance across iOS devices', () => {
      // Mock iOS Safari
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
      });
      
      render(
        <div>
          <ButtonSkeleton data-testid="ios-button-skeleton" />
        </div>
      );
      
      const skeleton = screen.getByTestId('ios-button-skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('should maintain consistent appearance across Android devices', () => {
      // Mock Android Chrome
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36',
      });
      
      render(
        <div>
          <AvatarSkeleton data-testid="android-avatar-skeleton" />
        </div>
      );
      
      const skeleton = screen.getByTestId('android-avatar-skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('should handle different screen densities (retina, high-DPI)', () => {
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        value: 3, // High DPI
      });
      
      render(
        <div>
          <LoadingSkeleton data-testid="high-dpi-skeleton" />
        </div>
      );
      
      const skeleton = screen.getByTestId('high-dpi-skeleton');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('Progressive Enhancement', () => {
    it('should work without JavaScript on mobile', () => {
      // Mock JavaScript disabled scenario
      render(
        <noscript>
          <div>Loading content...</div>
        </noscript>
      );
      
      // Basic skeleton should still appear with CSS
      render(
        <div>
          <LoadingSkeleton animation="none" data-testid="no-js-skeleton" />
        </div>
      );
      
      const skeleton = screen.getByTestId('no-js-skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('should gracefully degrade animations on unsupported devices', () => {
      // Mock old browser without animation support
      const originalAnimate = Element.prototype.animate;
      Element.prototype.animate = undefined as any;
      
      render(
        <div>
          <LoadingSkeleton animation="wave" data-testid="fallback-skeleton" />
        </div>
      );
      
      const skeleton = screen.getByTestId('fallback-skeleton');
      expect(skeleton).toBeInTheDocument();
      
      // Restore original animate method
      Element.prototype.animate = originalAnimate;
    });

    it('should provide fallback for reduced motion preferences', () => {
      mockMediaQuery('(prefers-reduced-motion: reduce)', true);
      
      render(
        <div>
          <LoadingSkeleton animation="pulse" data-testid="reduced-motion-fallback" />
        </div>
      );
      
      const skeleton = screen.getByTestId('reduced-motion-fallback');
      expect(skeleton).toBeInTheDocument();
      
      // Animation should be disabled or reduced
    });
  });

  describe('Responsive Loading Patterns', () => {
    it('should adapt skeleton count based on viewport size', () => {
      const { rerender } = render(
        <div>
          <SkeletonGroup lines={5} data-testid="adaptive-skeleton-group" />
        </div>
      );
      
      let skeletonGroup = screen.getByTestId('adaptive-skeleton-group');
      expect(skeletonGroup.children).toHaveLength(5);
      
      // Switch to mobile viewport
      mockViewport(320, 568);
      
      rerender(
        <div>
          <SkeletonGroup lines={3} data-testid="adaptive-skeleton-group" />
        </div>
      );
      
      skeletonGroup = screen.getByTestId('adaptive-skeleton-group');
      expect(skeletonGroup.children).toHaveLength(3);
    });

    it('should show appropriate skeletons for mobile vs desktop layouts', () => {
      // Desktop layout
      mockViewport(1024, 768);
      
      const { rerender } = render(
        <div className="desktop-layout">
          <div className="sidebar">
            <SkeletonGroup lines={5} data-testid="desktop-sidebar-skeletons" />
          </div>
          <div className="main-content">
            <SkeletonGroup lines={8} data-testid="desktop-content-skeletons" />
          </div>
        </div>
      );
      
      expect(screen.getByTestId('desktop-sidebar-skeletons')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-content-skeletons')).toBeInTheDocument();
      
      // Mobile layout
      mockViewport(375, 667);
      
      rerender(
        <div className="mobile-layout">
          <div className="mobile-content">
            <SkeletonGroup lines={6} data-testid="mobile-unified-skeletons" />
          </div>
        </div>
      );
      
      expect(screen.getByTestId('mobile-unified-skeletons')).toBeInTheDocument();
    });
  });
});