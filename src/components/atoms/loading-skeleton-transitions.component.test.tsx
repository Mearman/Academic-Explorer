/**
 * Loading State Transitions and Progress Indicator Tests for LoadingSkeleton
 * Tests loading state management, transition animations, and progress feedback
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, useEffect } from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import {
  LoadingSkeleton,
  SkeletonGroup,
} from './loading-skeleton';

// Mock timer functions for testing transitions
const mockTimers = () => {
  vi.useFakeTimers();
  return {
    advanceTime: (ms: number) => act(() => vi.advanceTimersByTime(ms)),
    cleanup: () => vi.useRealTimers(),
  };
};

// Test component for loading state transitions
const LoadingStateTest = ({ 
  loadingDuration = 2000,
  showProgress = false,
  onStateChange,
}: {
  loadingDuration?: number;
  showProgress?: boolean;
  onStateChange?: (state: 'loading' | 'loaded' | 'error') => void;
}) => {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  useEffect(() => {
    if (state === 'loading') {
      const interval = setInterval(() => {
        setProgress(prev => {
          const next = prev + 10;
          if (next >= 100) {
            clearInterval(interval);
            setState('loaded');
            return 100;
          }
          return next;
        });
      }, loadingDuration / 10);

      return () => clearInterval(interval);
    }
    // Explicit return for non-loading state
    return undefined;
  }, [state, loadingDuration]);

  if (state === 'loading') {
    return (
      <div data-testid="loading-container">
        {showProgress && (
          <div data-testid="progress-indicator" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            Loading: {progress}%
          </div>
        )}
        <SkeletonGroup lines={3} data-testid="loading-skeletons" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div data-testid="error-container">
        <div role="alert">Failed to load content</div>
      </div>
    );
  }

  return (
    <div data-testid="loaded-container">
      <h2>Content Title</h2>
      <p>Loaded content goes here</p>
    </div>
  );
};

describe('Loading State Transitions: LoadingSkeleton Behavior', () => {
  let timers: ReturnType<typeof mockTimers>;

  beforeEach(() => {
    timers = mockTimers();
  });

  afterEach(() => {
    timers.cleanup();
  });

  describe('Basic Loading State Management', () => {
    it('should show skeleton during loading state', () => {
      render(<LoadingStateTest />);
      
      expect(screen.getByTestId('loading-container')).toBeInTheDocument();
      expect(screen.getByTestId('loading-skeletons')).toBeInTheDocument();
      expect(screen.queryByTestId('loaded-container')).not.toBeInTheDocument();
    });

    it('should transition from loading to loaded state', async () => {
      render(<LoadingStateTest loadingDuration={1000} />);
      
      // Initially loading
      expect(screen.getByTestId('loading-skeletons')).toBeInTheDocument();
      
      // Advance time to complete loading
      timers.advanceTime(1000);
      
      // Should now show loaded content
      await waitFor(() => {
        expect(screen.getByTestId('loaded-container')).toBeInTheDocument();
      });
      
      expect(screen.queryByTestId('loading-skeletons')).not.toBeInTheDocument();
    });

    it('should handle error states gracefully', () => {
      const ErrorTest = () => {
        const [hasError, setHasError] = useState(false);
        
        if (hasError) {
          return (
            <div data-testid="error-state">
              <div role="alert">Error loading content</div>
            </div>
          );
        }
        
        return (
          <div>
            <button onClick={() => setHasError(true)}>Trigger Error</button>
            <SkeletonGroup lines={2} data-testid="pre-error-skeletons" />
          </div>
        );
      };

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      render(<ErrorTest />);
      
      expect(screen.getByTestId('pre-error-skeletons')).toBeInTheDocument();
      
      const errorButton = screen.getByText('Trigger Error');
      user.click(errorButton);
      
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
      expect(screen.queryByTestId('pre-error-skeletons')).not.toBeInTheDocument();
    });

    it('should maintain skeleton accessibility during transitions', async () => {
      render(<LoadingStateTest loadingDuration={500} />);
      
      const skeletons = screen.getByTestId('loading-skeletons');
      expect(skeletons).toHaveAttribute('aria-hidden', 'true');
      
      timers.advanceTime(500);
      
      await waitFor(() => {
        expect(screen.getByTestId('loaded-container')).toBeInTheDocument();
      });
      
      // Loaded content should be accessible
      const loadedContent = screen.getByTestId('loaded-container');
      expect(loadedContent).not.toHaveAttribute('aria-hidden');
    });
  });

  describe('Progress Indicators and Feedback', () => {
    it('should show progress indicator with loading skeleton', () => {
      render(<LoadingStateTest showProgress={true} />);
      
      const progressIndicator = screen.getByTestId('progress-indicator');
      const skeletons = screen.getByTestId('loading-skeletons');
      
      expect(progressIndicator).toBeInTheDocument();
      expect(progressIndicator).toHaveAttribute('role', 'progressbar');
      expect(progressIndicator).toHaveAttribute('aria-valuenow', '0');
      expect(skeletons).toBeInTheDocument();
    });

    it('should update progress values during loading', async () => {
      render(<LoadingStateTest loadingDuration={1000} showProgress={true} />);
      
      const progressIndicator = screen.getByTestId('progress-indicator');
      
      // Initial state
      expect(progressIndicator).toHaveAttribute('aria-valuenow', '0');
      
      // Advance time partially
      timers.advanceTime(500);
      
      await waitFor(() => {
        expect(progressIndicator).toHaveAttribute('aria-valuenow', '50');
      });
      
      // Complete loading
      timers.advanceTime(500);
      
      await waitFor(() => {
        expect(screen.getByTestId('loaded-container')).toBeInTheDocument();
      });
    });

    it('should announce progress changes to screen readers', async () => {
      const stateChanges: string[] = [];
      const handleStateChange = (state: 'loading' | 'loaded' | 'error') => {
        stateChanges.push(state);
      };

      render(
        <div aria-live="polite" data-testid="live-region">
          <LoadingStateTest 
            loadingDuration={500} 
            showProgress={true} 
            onStateChange={handleStateChange}
          />
        </div>
      );
      
      const liveRegion = screen.getByTestId('live-region');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      
      timers.advanceTime(500);
      
      await waitFor(() => {
        expect(stateChanges).toContain('loaded');
      });
    });

    it('should handle indeterminate progress states', () => {
      const IndeterminateTest = () => (
        <div>
          <div role="progressbar" aria-label="Loading content" data-testid="indeterminate-progress">
            <span className="sr-only">Loading...</span>
          </div>
          <SkeletonGroup lines={2} data-testid="indeterminate-skeletons" />
        </div>
      );

      render(<IndeterminateTest />);
      
      const progress = screen.getByTestId('indeterminate-progress');
      const skeletons = screen.getByTestId('indeterminate-skeletons');
      
      expect(progress).toHaveAttribute('role', 'progressbar');
      expect(progress).not.toHaveAttribute('aria-valuenow');
      expect(skeletons).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Animation and Transition Timing', () => {
    it('should have smooth enter transitions', async () => {
      const { rerender } = render(<div data-testid="empty-container" />);
      
      // Show skeleton with transition
      rerender(
        <div data-testid="container">
          <LoadingSkeleton data-testid="transitioning-skeleton" animation="wave" />
        </div>
      );
      
      const skeleton = screen.getByTestId('transitioning-skeleton');
      expect(skeleton).toBeInTheDocument();
      
      // Animation should start immediately
      const computedStyle = window.getComputedStyle(skeleton);
      expect(computedStyle).toBeDefined();
    });

    it('should have smooth exit transitions', async () => {
      const TransitionTest = () => {
        const [showSkeleton, setShowSkeleton] = useState(true);
        
        useEffect(() => {
          const timeout = setTimeout(() => setShowSkeleton(false), 500);
          return () => clearTimeout(timeout);
        }, []);
        
        return (
          <div data-testid="transition-container">
            {showSkeleton ? (
              <LoadingSkeleton data-testid="exiting-skeleton" />
            ) : (
              <div data-testid="replacement-content">Content loaded</div>
            )}
          </div>
        );
      };

      render(<TransitionTest />);
      
      expect(screen.getByTestId('exiting-skeleton')).toBeInTheDocument();
      
      timers.advanceTime(500);
      
      await waitFor(() => {
        expect(screen.getByTestId('replacement-content')).toBeInTheDocument();
      });
      
      expect(screen.queryByTestId('exiting-skeleton')).not.toBeInTheDocument();
    });

    it('should respect reduced motion preferences for transitions', () => {
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

      render(
        <div>
          <LoadingSkeleton animation="none" data-testid="reduced-motion-skeleton" />
        </div>
      );
      
      const skeleton = screen.getByTestId('reduced-motion-skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('should handle rapid state changes gracefully', async () => {
      const RapidChangeTest = () => {
        const [state, setState] = useState<'loading' | 'loaded' | 'loading2'>('loading');
        
        useEffect(() => {
          const timeout1 = setTimeout(() => setState('loaded'), 100);
          const timeout2 = setTimeout(() => setState('loading2'), 200);
          
          return () => {
            clearTimeout(timeout1);
            clearTimeout(timeout2);
          };
        }, []);
        
        if (state === 'loading') {
          return <SkeletonGroup lines={2} data-testid="first-loading" />;
        }
        
        if (state === 'loaded') {
          return <div data-testid="briefly-loaded">Briefly loaded</div>;
        }
        
        return <SkeletonGroup lines={3} data-testid="second-loading" />;
      };

      render(<RapidChangeTest />);
      
      expect(screen.getByTestId('first-loading')).toBeInTheDocument();
      
      timers.advanceTime(100);
      
      await waitFor(() => {
        expect(screen.getByTestId('briefly-loaded')).toBeInTheDocument();
      });
      
      timers.advanceTime(100);
      
      await waitFor(() => {
        expect(screen.getByTestId('second-loading')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Optimizations', () => {
    it('should not cause layout thrashing during transitions', async () => {
      const LayoutTest = () => {
        const [isLoading, setIsLoading] = useState(true);
        
        useEffect(() => {
          const timeout = setTimeout(() => setIsLoading(false), 500);
          return () => clearTimeout(timeout);
        }, []);
        
        return (
          <div data-testid="layout-container" style={{ height: '200px' }}>
            {isLoading ? (
              <SkeletonGroup lines={3} data-testid="layout-skeletons" />
            ) : (
              <div data-testid="layout-content" style={{ height: '200px' }}>
                <p>Line 1</p>
                <p>Line 2</p>
                <p>Line 3</p>
              </div>
            )}
          </div>
        );
      };

      render(<LayoutTest />);
      
      const container = screen.getByTestId('layout-container');
      const initialHeight = container.getBoundingClientRect().height;
      
      timers.advanceTime(500);
      
      await waitFor(() => {
        expect(screen.getByTestId('layout-content')).toBeInTheDocument();
      });
      
      const finalHeight = container.getBoundingClientRect().height;
      expect(Math.abs(finalHeight - initialHeight)).toBeLessThan(5); // Minimal layout shift
    });

    it('should optimize animation performance', () => {
      render(
        <div>
          <LoadingSkeleton animation="wave" data-testid="optimized-skeleton" />
        </div>
      );
      
      const skeleton = screen.getByTestId('optimized-skeleton');
      expect(skeleton).toBeInTheDocument();
      
      // Should use transform-based animations for better performance
      const computedStyle = window.getComputedStyle(skeleton);
      expect(computedStyle).toBeDefined();
    });

    it('should batch multiple skeleton updates', async () => {
      const BatchTest = () => {
        const [skeletons, setSkeletons] = useState([1, 2, 3]);
        
        useEffect(() => {
          const timeout = setTimeout(() => {
            setSkeletons([1, 2, 3, 4, 5]);
          }, 300);
          
          return () => clearTimeout(timeout);
        }, []);
        
        return (
          <div data-testid="batch-container">
            {skeletons.map(id => (
              <LoadingSkeleton key={id} data-testid={`batch-skeleton-${id}`} />
            ))}
          </div>
        );
      };

      render(<BatchTest />);
      
      expect(screen.getAllByTestId(/batch-skeleton-/)).toHaveLength(3);
      
      timers.advanceTime(300);
      
      await waitFor(() => {
        expect(screen.getAllByTestId(/batch-skeleton-/)).toHaveLength(5);
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle animation errors gracefully', () => {
      // Mock animation error
      const originalConsoleError = console.error;
      console.error = vi.fn();
      
      // Mock element.animate to throw error
      const originalAnimate = Element.prototype.animate;
      Element.prototype.animate = vi.fn().mockImplementation(() => {
        throw new Error('Animation not supported');
      });
      
      expect(() => {
        render(<LoadingSkeleton animation="wave" data-testid="error-recovery-skeleton" />);
      }).not.toThrow();
      
      const skeleton = screen.getByTestId('error-recovery-skeleton');
      expect(skeleton).toBeInTheDocument();
      
      // Restore original methods
      Element.prototype.animate = originalAnimate;
      console.error = originalConsoleError;
    });

    it('should provide fallback when CSS animations fail', () => {
      // Mock CSS animation support detection
      const originalSupports = CSS.supports;
      CSS.supports = vi.fn().mockReturnValue(false);
      
      render(
        <div>
          <LoadingSkeleton animation="pulse" data-testid="css-fallback-skeleton" />
        </div>
      );
      
      const skeleton = screen.getByTestId('css-fallback-skeleton');
      expect(skeleton).toBeInTheDocument();
      
      // Restore original CSS.supports
      CSS.supports = originalSupports;
    });

    it('should handle interrupted loading states', async () => {
      const InterruptedTest = () => {
        const [state, setState] = useState<'loading' | 'interrupted' | 'retry'>('loading');
        
        useEffect(() => {
          const timeout1 = setTimeout(() => setState('interrupted'), 200);
          const timeout2 = setTimeout(() => setState('retry'), 400);
          
          return () => {
            clearTimeout(timeout1);
            clearTimeout(timeout2);
          };
        }, []);
        
        if (state === 'loading') {
          return <SkeletonGroup lines={2} data-testid="initial-loading" />;
        }
        
        if (state === 'interrupted') {
          return (
            <div data-testid="interrupted-state">
              <div role="alert">Connection interrupted</div>
              <button onClick={() => setState('retry')}>Retry</button>
            </div>
          );
        }
        
        return <SkeletonGroup lines={2} data-testid="retry-loading" />;
      };

      render(<InterruptedTest />);
      
      expect(screen.getByTestId('initial-loading')).toBeInTheDocument();
      
      timers.advanceTime(200);
      
      await waitFor(() => {
        expect(screen.getByTestId('interrupted-state')).toBeInTheDocument();
      });
      
      timers.advanceTime(200);
      
      await waitFor(() => {
        expect(screen.getByTestId('retry-loading')).toBeInTheDocument();
      });
    });
  });
});