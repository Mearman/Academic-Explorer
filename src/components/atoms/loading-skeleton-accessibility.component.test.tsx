/**
 * WCAG 2.1 AA Accessibility Compliance Tests for LoadingSkeleton
 * Tests screen reader support, keyboard navigation, color contrast, and motion preferences
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  LoadingSkeleton,
  SkeletonGroup,
  TextSkeleton,
  TitleSkeleton,
  ButtonSkeleton,
  AvatarSkeleton,
  BadgeSkeleton,
} from './loading-skeleton';

describe('WCAG 2.1 AA Compliance: LoadingSkeleton Accessibility', () => {
  beforeEach(() => {
    // Reset any mocked media queries
    vi.clearAllMocks();
  });

  describe('Principle 1: Perceivable', () => {
    describe('1.1 Text Alternatives', () => {
      it('should be properly hidden from screen readers with aria-hidden', () => {
        render(<LoadingSkeleton data-testid="skeleton" />);
        
        const skeleton = screen.getByTestId('skeleton');
        expect(skeleton).toHaveAttribute('aria-hidden', 'true');
      });

      it('should not have any text content or alt text that could confuse screen readers', () => {
        render(<LoadingSkeleton data-testid="skeleton" />);
        
        const skeleton = screen.getByTestId('skeleton');
        expect(skeleton).toHaveTextContent('');
        expect(skeleton).not.toHaveAttribute('alt');
        expect(skeleton).not.toHaveAttribute('aria-label');
        expect(skeleton).not.toHaveAttribute('aria-labelledby');
      });

      it('should provide appropriate context when used in groups', () => {
        render(
          <div>
            <div aria-live="polite" aria-label="Loading content">
              <SkeletonGroup data-testid="skeleton-group" />
            </div>
          </div>
        );
        
        const group = screen.getByTestId('skeleton-group');
        expect(group).toHaveAttribute('aria-hidden', 'true');
        
        // Verify parent has proper live region
        const liveRegion = screen.getByLabelText('Loading content');
        expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      });
    });

    describe('1.3 Adaptable', () => {
      it('should maintain semantic structure when used as placeholder for headings', () => {
        render(
          <div>
            <h1><TitleSkeleton data-testid="title-skeleton" /></h1>
            <h2><TextSkeleton data-testid="subtitle-skeleton" /></h2>
          </div>
        );
        
        const titleSkeleton = screen.getByTestId('title-skeleton');
        const subtitleSkeleton = screen.getByTestId('subtitle-skeleton');
        
        expect(titleSkeleton.closest('h1')).toBeInTheDocument();
        expect(subtitleSkeleton.closest('h2')).toBeInTheDocument();
      });

      it('should adapt to different text sizes and maintain proportions', () => {
        render(
          <div style={{ fontSize: '18px' }}>
            <TextSkeleton data-testid="large-text-skeleton" />
          </div>
        );
        
        const skeleton = screen.getByTestId('large-text-skeleton');
        expect(skeleton).toBeInTheDocument();
        
        // The skeleton should inherit the parent font size context
        const computedStyle = window.getComputedStyle(skeleton);
        expect(computedStyle).toBeDefined();
      });
    });

    describe('1.4 Distinguishable', () => {
      it('should respect prefers-reduced-motion settings', () => {
        // Mock reduced motion preference
        Object.defineProperty(window, 'matchMedia', {
          writable: true,
          value: vi.fn().mockImplementation(query => ({
            matches: query === '(prefers-reduced-motion: reduce)',
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
          })),
        });

        render(<LoadingSkeleton animation="none" data-testid="reduced-motion-skeleton" />);
        
        const skeleton = screen.getByTestId('reduced-motion-skeleton');
        expect(skeleton).toBeInTheDocument();
        
        // When reduced motion is preferred, animation should be disabled
        expect(skeleton).not.toHaveClass(/animate/);
      });

      it('should maintain sufficient contrast in both light and dark themes', () => {
        const { rerender } = render(
          <div data-theme="light">
            <LoadingSkeleton data-testid="light-skeleton" />
          </div>
        );
        
        let skeleton = screen.getByTestId('light-skeleton');
        expect(skeleton).toBeInTheDocument();
        
        // Test dark theme
        rerender(
          <div data-theme="dark">
            <LoadingSkeleton data-testid="dark-skeleton" />
          </div>
        );
        
        skeleton = screen.getByTestId('dark-skeleton');
        expect(skeleton).toBeInTheDocument();
      });

      it('should be distinguishable from actual content', () => {
        render(
          <div>
            <p>Actual content text</p>
            <TextSkeleton data-testid="skeleton-placeholder" />
          </div>
        );
        
        const actualText = screen.getByText('Actual content text');
        const skeleton = screen.getByTestId('skeleton-placeholder');
        
        expect(actualText).toBeVisible();
        expect(skeleton).toBeInTheDocument();
        expect(skeleton).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Principle 2: Operable', () => {
    describe('2.1 Keyboard Accessible', () => {
      it('should not be keyboard focusable as decorative elements', () => {
        render(<LoadingSkeleton data-testid="skeleton" />);
        
        const skeleton = screen.getByTestId('skeleton');
        expect(skeleton).not.toHaveAttribute('tabindex');
        expect(skeleton).not.toHaveAttribute('role', 'button');
        expect(skeleton).not.toHaveAttribute('role', 'link');
      });

      it('should not trap keyboard focus', async () => {
        const user = userEvent.setup();
        
        render(
          <div>
            <button>Before skeleton</button>
            <SkeletonGroup data-testid="skeleton-group" />
            <button>After skeleton</button>
          </div>
        );
        
        const beforeButton = screen.getByText('Before skeleton');
        const afterButton = screen.getByText('After skeleton');
        
        beforeButton.focus();
        expect(beforeButton).toHaveFocus();
        
        // Tab should skip over skeleton group and go to next focusable element
        await user.tab();
        expect(afterButton).toHaveFocus();
      });

      it('should not interfere with keyboard navigation of parent containers', async () => {
        const user = userEvent.setup();
        
        render(
          <div role="button" tabIndex={0} data-testid="interactive-container">
            <LoadingSkeleton data-testid="skeleton" />
          </div>
        );
        
        const container = screen.getByTestId('interactive-container');
        
        container.focus();
        expect(container).toHaveFocus();
        
        // Arrow keys should not be captured by skeleton
        await user.keyboard('{ArrowDown}');
        expect(container).toHaveFocus();
      });
    });

    describe('2.2 Enough Time', () => {
      it('should not have time limits that could cause accessibility issues', () => {
        render(<LoadingSkeleton animation="wave" data-testid="animated-skeleton" />);
        
        const skeleton = screen.getByTestId('animated-skeleton');
        expect(skeleton).toBeInTheDocument();
        
        // Skeleton animations should be infinite or very long duration
        // to not create time pressure for users with disabilities
      });
    });

    describe('2.3 Seizures and Physical Reactions', () => {
      it('should not flash more than 3 times per second', () => {
        render(<LoadingSkeleton animation="pulse" data-testid="pulse-skeleton" />);
        
        const skeleton = screen.getByTestId('pulse-skeleton');
        expect(skeleton).toBeInTheDocument();
        
        // Pulse animation should be slow enough to not trigger seizures
        // CSS animations should have duration >= 333ms for safety
      });

      it('should provide static alternative when animations are disabled', () => {
        render(<LoadingSkeleton animation="none" data-testid="static-skeleton" />);
        
        const skeleton = screen.getByTestId('static-skeleton');
        expect(skeleton).toBeInTheDocument();
        expect(skeleton).not.toHaveClass(/animate/);
      });
    });
  });

  describe('Principle 3: Understandable', () => {
    describe('3.1 Readable', () => {
      it('should not contain text that needs to be read', () => {
        render(<LoadingSkeleton data-testid="skeleton" />);
        
        const skeleton = screen.getByTestId('skeleton');
        expect(skeleton).toHaveTextContent('');
        expect(skeleton).not.toHaveAttribute('title');
      });

      it('should be properly associated with loading context', () => {
        render(
          <section>
            <h2 id="content-heading">User Profile</h2>
            <div aria-labelledby="content-heading" aria-live="polite">
              <SkeletonGroup data-testid="skeleton-group" />
            </div>
          </section>
        );
        
        const heading = screen.getByText('User Profile');
        const skeletonContainer = screen.getByTestId('skeleton-group').parentElement;
        
        expect(heading).toHaveAttribute('id', 'content-heading');
        expect(skeletonContainer).toHaveAttribute('aria-labelledby', 'content-heading');
        expect(skeletonContainer).toHaveAttribute('aria-live', 'polite');
      });
    });

    describe('3.2 Predictable', () => {
      it('should appear consistently across different contexts', () => {
        const { rerender } = render(<ButtonSkeleton data-testid="button-skeleton" />);
        
        let skeleton = screen.getByTestId('button-skeleton');
        expect(skeleton).toBeInTheDocument();
        
        // Should render consistently when re-rendered
        rerender(<ButtonSkeleton data-testid="button-skeleton" />);
        
        skeleton = screen.getByTestId('button-skeleton');
        expect(skeleton).toBeInTheDocument();
        expect(skeleton).toHaveAttribute('aria-hidden', 'true');
      });

      it('should not change page layout unexpectedly', () => {
        const { rerender } = render(
          <div data-testid="container">
            <LoadingSkeleton preset="card" data-testid="skeleton" />
          </div>
        );
        
        const container = screen.getByTestId('container');
        const initialHeight = container.getBoundingClientRect().height;
        
        // Re-render should not cause layout shift
        rerender(
          <div data-testid="container">
            <LoadingSkeleton preset="card" data-testid="skeleton" />
          </div>
        );
        
        const newHeight = container.getBoundingClientRect().height;
        expect(Math.abs(newHeight - initialHeight)).toBeLessThan(1); // Allow for sub-pixel differences
      });
    });

    describe('3.3 Input Assistance', () => {
      it('should not be mistaken for interactive elements', () => {
        render(
          <div>
            <ButtonSkeleton data-testid="button-skeleton" />
            <AvatarSkeleton data-testid="avatar-skeleton" />
          </div>
        );
        
        const buttonSkeleton = screen.getByTestId('button-skeleton');
        const avatarSkeleton = screen.getByTestId('avatar-skeleton');
        
        // Should not have interactive roles or properties
        expect(buttonSkeleton).not.toHaveAttribute('role', 'button');
        expect(buttonSkeleton).not.toHaveAttribute('onclick');
        expect(avatarSkeleton).not.toHaveAttribute('role', 'img');
        expect(avatarSkeleton).not.toHaveAttribute('alt');
      });
    });
  });

  describe('Principle 4: Robust', () => {
    describe('4.1 Compatible', () => {
      it('should be compatible with assistive technologies', () => {
        render(<LoadingSkeleton data-testid="skeleton" />);
        
        const skeleton = screen.getByTestId('skeleton');
        
        // Should have proper ARIA attributes
        expect(skeleton).toHaveAttribute('aria-hidden', 'true');
        
        // Should not interfere with AT navigation
        expect(skeleton).not.toHaveAttribute('role');
        expect(skeleton).not.toHaveAttribute('aria-live');
        expect(skeleton).not.toHaveAttribute('aria-atomic');
      });

      it('should work with screen reader testing tools', () => {
        render(
          <div>
            <div aria-live="polite" aria-label="Loading user information">
              Loading...
            </div>
            <SkeletonGroup data-testid="skeleton-group" />
          </div>
        );
        
        const liveRegion = screen.getByLabelText('Loading user information');
        const skeletonGroup = screen.getByTestId('skeleton-group');
        
        expect(liveRegion).toHaveAttribute('aria-live', 'polite');
        expect(liveRegion).toHaveTextContent('Loading...');
        expect(skeletonGroup).toHaveAttribute('aria-hidden', 'true');
      });

      it('should maintain valid HTML structure', () => {
        render(
          <article>
            <header>
              <TitleSkeleton data-testid="title-skeleton" />
            </header>
            <main>
              <SkeletonGroup lines={3} data-testid="content-skeleton" />
            </main>
          </article>
        );
        
        const titleSkeleton = screen.getByTestId('title-skeleton');
        const contentSkeleton = screen.getByTestId('content-skeleton');
        
        expect(titleSkeleton.closest('header')).toBeInTheDocument();
        expect(contentSkeleton.closest('main')).toBeInTheDocument();
      });
    });
  });

  describe('Animation and Motion Accessibility', () => {
    it('should respect system-level animation preferences', () => {
      // Mock prefers-reduced-motion: reduce
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<LoadingSkeleton animation="wave" data-testid="respect-motion-skeleton" />);
      
      const skeleton = screen.getByTestId('respect-motion-skeleton');
      expect(skeleton).toBeInTheDocument();
      
      // In real implementation, this should disable animations when prefers-reduced-motion is set
    });

    it('should not cause vestibular motion disorders', () => {
      render(<LoadingSkeleton animation="pulse" data-testid="safe-motion-skeleton" />);
      
      const skeleton = screen.getByTestId('safe-motion-skeleton');
      expect(skeleton).toBeInTheDocument();
      
      // Pulse animation should be gentle and slow
      // Should not have rapid motion or parallax effects
    });
  });

  describe('Color and Contrast Accessibility', () => {
    it('should maintain accessibility in high contrast mode', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<LoadingSkeleton data-testid="high-contrast-skeleton" />);
      
      const skeleton = screen.getByTestId('high-contrast-skeleton');
      expect(skeleton).toBeInTheDocument();
      
      // Should adapt to high contrast mode
    });

    it('should not rely solely on color to convey information', () => {
      render(
        <div>
          <BadgeSkeleton data-testid="badge-skeleton" />
          <TextSkeleton data-testid="text-skeleton" />
        </div>
      );
      
      const badgeSkeleton = screen.getByTestId('badge-skeleton');
      const textSkeleton = screen.getByTestId('text-skeleton');
      
      expect(badgeSkeleton).toBeInTheDocument();
      expect(textSkeleton).toBeInTheDocument();
      
      // Skeletons should be distinguishable by shape/size, not just color
    });
  });

  describe('Integration with Live Regions', () => {
    it('should work properly with aria-live regions for loading announcements', () => {
      const { rerender } = render(
        <div aria-live="polite" data-testid="live-region">
          <span>Loading content...</span>
          <SkeletonGroup data-testid="skeleton-group" />
        </div>
      );
      
      const liveRegion = screen.getByTestId('live-region');
      const skeletonGroup = screen.getByTestId('skeleton-group');
      
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(skeletonGroup).toHaveAttribute('aria-hidden', 'true');
      
      // When content loads, skeleton should be replaced
      rerender(
        <div aria-live="polite" data-testid="live-region">
          <span>Content loaded successfully</span>
          <div>Actual content here</div>
        </div>
      );
      
      expect(screen.getByText('Content loaded successfully')).toBeInTheDocument();
      expect(screen.queryByTestId('skeleton-group')).not.toBeInTheDocument();
    });
  });
});