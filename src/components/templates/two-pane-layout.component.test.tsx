import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

import { TwoPaneLayout } from './two-pane-layout';

// Mock localStorage for state persistence testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock ResizeObserver for drag testing
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe('TwoPaneLayout Component', () => {
  const defaultProps = {
    leftPane: <div data-testid="left-content">Left Pane Content</div>,
    rightPane: <div data-testid="right-content">Right Pane Content</div>,
  };

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('should render both panes with default props', () => {
      render(<TwoPaneLayout {...defaultProps} />);

      expect(screen.getByTestId('left-content')).toBeInTheDocument();
      expect(screen.getByTestId('right-content')).toBeInTheDocument();
    });

    test('should render with custom titles when showHeaders is true', () => {
      render(
        <TwoPaneLayout
          {...defaultProps}
          showHeaders={true}
          leftTitle="Data Panel"
          rightTitle="Visualisation Panel"
        />
      );

      expect(screen.getByText('Data Panel')).toBeInTheDocument();
      expect(screen.getByText('Visualisation Panel')).toBeInTheDocument();
    });

    test('should render with custom mobile tab labels', () => {
      render(
        <TwoPaneLayout
          {...defaultProps}
          showMobileTabs={true}
          mobileTabLabels={{ left: 'Info', right: 'Chart' }}
        />
      );

      // These tabs should be hidden on desktop but present in DOM
      expect(screen.getByText('Info')).toBeInTheDocument();
      expect(screen.getByText('Chart')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    test('should show mobile tabs container on mobile viewport', () => {
      // Mock a mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600, // Mobile width
      });

      render(<TwoPaneLayout {...defaultProps} showMobileTabs={true} />);

      const mobileTabContainer = screen.getByRole('tablist', { hidden: true });
      expect(mobileTabContainer).toBeInTheDocument();
    });

    test('should handle mobile tab switching', async () => {
      const user = userEvent.setup();
      
      render(
        <TwoPaneLayout
          {...defaultProps}
          showMobileTabs={true}
          mobileTabLabels={{ left: 'Details', right: 'Graph' }}
        />
      );

      const leftTab = screen.getByText('Details');
      const rightTab = screen.getByText('Graph');

      // Left tab should be active by default
      expect(leftTab).toHaveClass('activeMobileTab');
      expect(rightTab).not.toHaveClass('activeMobileTab');

      // Click right tab
      await user.click(rightTab);

      expect(rightTab).toHaveClass('activeMobileTab');
      expect(leftTab).not.toHaveClass('activeMobileTab');
    });
  });

  describe('Collapse/Expand Functionality', () => {
    test('should toggle left pane collapse', async () => {
      const user = userEvent.setup();
      
      render(
        <TwoPaneLayout
          {...defaultProps}
          leftCollapsible={true}
          rightCollapsible={true}
        />
      );

      const leftPane = screen.getByTestId('left-content').closest('[class*="pane"]');
      
      // Should be visible initially
      expect(leftPane).not.toHaveClass('collapsedPane');

      // Find and click the left collapse button
      const divider = screen.getByRole('separator');
      expect(divider).toBeInTheDocument();
      
      const collapseButton = divider.querySelector('button[aria-label="Collapse left panel"]');
      expect(collapseButton).toBeInTheDocument();

      if (collapseButton) {
        await user.click(collapseButton);
        
        await waitFor(() => {
          expect(leftPane).toHaveClass('collapsedPane');
        });
      }
    });

    test('should toggle right pane collapse', async () => {
      const user = userEvent.setup();
      
      render(
        <TwoPaneLayout
          {...defaultProps}
          leftCollapsible={true}
          rightCollapsible={true}
        />
      );

      const rightPane = screen.getByTestId('right-content').closest('[class*="pane"]');
      
      // Should be visible initially
      expect(rightPane).not.toHaveClass('collapsedPane');

      // Find and click the right collapse button
      const divider = screen.getByRole('separator');
      const collapseButton = divider.querySelector('button[aria-label="Collapse right panel"]');
      expect(collapseButton).toBeInTheDocument();

      if (collapseButton) {
        await user.click(collapseButton);
        
        await waitFor(() => {
          expect(rightPane).toHaveClass('collapsedPane');
        });
      }
    });

    test('should expand collapsed pane when clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TwoPaneLayout
          {...defaultProps}
          leftCollapsed={true}
          persistState={false}
        />
      );

      const leftPane = screen.getByTestId('left-content').closest('[class*="pane"]');
      
      // Should be collapsed initially
      expect(leftPane).toHaveClass('collapsedPane');

      // Click on the collapsed pane to expand
      if (leftPane) {
        await user.click(leftPane);
        
        await waitFor(() => {
          expect(leftPane).not.toHaveClass('collapsedPane');
        });
      }
    });

    test('should not show collapse buttons when collapsible is false', () => {
      render(
        <TwoPaneLayout
          {...defaultProps}
          leftCollapsible={false}
          rightCollapsible={false}
        />
      );

      const divider = screen.getByRole('separator');
      
      const leftCollapseButton = divider.querySelector('button[aria-label="Collapse left panel"]');
      const rightCollapseButton = divider.querySelector('button[aria-label="Collapse right panel"]');
      
      expect(leftCollapseButton).not.toBeInTheDocument();
      expect(rightCollapseButton).not.toBeInTheDocument();
    });
  });

  describe('Drag Resize Functionality', () => {
    test('should initiate drag on mousedown', () => {
      render(<TwoPaneLayout {...defaultProps} />);

      const divider = screen.getByRole('separator');
      
      fireEvent.mouseDown(divider, { button: 0 });

      // Should add visual feedback for dragging
      expect(document.querySelector('[style*="col-resize"]')).toBeInTheDocument();
    });

    test('should handle drag resize', () => {
      const { container } = render(<TwoPaneLayout {...defaultProps} />);

      const divider = screen.getByRole('separator');
      
      // Mock container getBoundingClientRect
      const mockRect = {
        left: 0,
        right: 1000,
        width: 1000,
        height: 600,
        top: 0,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      };

      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(mockRect);

      // Start drag
      fireEvent.mouseDown(divider, { button: 0 });

      // Simulate drag to 70% position
      fireEvent.mouseMove(document, { clientX: 700 });

      // The panes should adjust their widths accordingly
      const leftPane = screen.getByTestId('left-content').closest('[class*="pane"]');
      const rightPane = screen.getByTestId('right-content').closest('[class*="pane"]');

      expect(leftPane).toHaveStyle({ width: expect.stringContaining('%') });
      expect(rightPane).toHaveStyle({ width: expect.stringContaining('%') });
    });

    test('should stop dragging on mouseup', () => {
      render(<TwoPaneLayout {...defaultProps} />);

      const divider = screen.getByRole('separator');
      
      // Start drag
      fireEvent.mouseDown(divider, { button: 0 });
      
      // Stop drag
      fireEvent.mouseUp(document);

      // Visual feedback should be removed
      expect(document.querySelector('[style*="col-resize"]')).not.toBeInTheDocument();
    });

    test('should respect minimum pane sizes during drag', () => {
      const { container } = render(
        <TwoPaneLayout {...defaultProps} minPaneSize={300} />
      );

      const divider = screen.getByRole('separator');
      
      // Mock container with 1000px width
      const mockRect = {
        left: 0,
        right: 1000,
        width: 1000,
        height: 600,
        top: 0,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      };

      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(mockRect);

      // Start drag
      fireEvent.mouseDown(divider, { button: 0 });

      // Try to drag to an extreme position (should be clamped)
      fireEvent.mouseMove(document, { clientX: 100 }); // Too far left

      const leftPane = screen.getByTestId('left-content').closest('[class*="pane"]') as HTMLElement | null;
      
      // Left pane should not go below minimum (30% of 1000px = 300px minimum)
      const leftPaneStyle = leftPane?.style?.width;
      if (leftPaneStyle) {
        const widthPercent = parseFloat(leftPaneStyle.replace('%', ''));
        expect(widthPercent).toBeGreaterThanOrEqual(30); // 300px / 1000px = 30%
      }
    });
  });

  describe('State Persistence', () => {
    test('should persist pane state to localStorage', async () => {
      const user = userEvent.setup();
      
      render(
        <TwoPaneLayout
          {...defaultProps}
          persistState={true}
          stateKey="test-layout"
        />
      );

      // Collapse left pane
      const divider = screen.getByRole('separator');
      const collapseButton = divider.querySelector('button[aria-label="Collapse left panel"]');
      
      if (collapseButton) {
        await user.click(collapseButton);

        await waitFor(() => {
          expect(localStorageMock.getItem('pane-layout-test-layout')).toBeTruthy();
        });

        const savedState = JSON.parse(localStorageMock.getItem('pane-layout-test-layout') || '{}');
        expect(savedState.leftCollapsed).toBe(true);
      }
    });

    test('should restore state from localStorage', () => {
      // Pre-populate localStorage with collapsed state
      const savedState = {
        leftWidth: 70,
        rightWidth: 30,
        leftCollapsed: true,
        rightCollapsed: false,
      };
      localStorageMock.setItem('pane-layout-test-restore', JSON.stringify(savedState));

      render(
        <TwoPaneLayout
          {...defaultProps}
          persistState={true}
          stateKey="test-restore"
        />
      );

      const leftPane = screen.getByTestId('left-content').closest('[class*="pane"]');
      expect(leftPane).toHaveClass('collapsedPane');
    });

    test('should not persist state when persistState is false', async () => {
      const user = userEvent.setup();
      
      render(
        <TwoPaneLayout
          {...defaultProps}
          persistState={false}
          stateKey="test-no-persist"
        />
      );

      // Collapse left pane
      const divider = screen.getByRole('separator');
      const collapseButton = divider.querySelector('button[aria-label="Collapse left panel"]');
      
      if (collapseButton) {
        await user.click(collapseButton);

        // Wait a bit to ensure no persistence happens
        await new Promise(resolve => setTimeout(resolve, 150));

        expect(localStorageMock.getItem('pane-layout-test-no-persist')).toBe(null);
      }
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('should toggle left pane with Cmd+[', () => {
      render(<TwoPaneLayout {...defaultProps} />);

      const leftPane = screen.getByTestId('left-content').closest('[class*="pane"]');
      
      // Should be visible initially
      expect(leftPane).not.toHaveClass('collapsedPane');

      // Press Cmd+[
      fireEvent.keyDown(window, { key: '[', metaKey: true });

      expect(leftPane).toHaveClass('collapsedPane');
    });

    test('should toggle right pane with Cmd+]', () => {
      render(<TwoPaneLayout {...defaultProps} />);

      const rightPane = screen.getByTestId('right-content').closest('[class*="pane"]');
      
      // Should be visible initially
      expect(rightPane).not.toHaveClass('collapsedPane');

      // Press Cmd+]
      fireEvent.keyDown(window, { key: ']', metaKey: true });

      expect(rightPane).toHaveClass('collapsedPane');
    });

    test('should reset layout with Cmd+\\', () => {
      render(
        <TwoPaneLayout
          {...defaultProps}
          leftCollapsed={true}
          rightCollapsed={false}
          persistState={false}
        />
      );

      const leftPane = screen.getByTestId('left-content').closest('[class*="pane"]');
      
      // Should be collapsed initially
      expect(leftPane).toHaveClass('collapsedPane');

      // Press Cmd+\
      fireEvent.keyDown(window, { key: '\\', metaKey: true });

      expect(leftPane).not.toHaveClass('collapsedPane');
    });

    test('should work with Ctrl modifier on non-Mac platforms', () => {
      render(<TwoPaneLayout {...defaultProps} />);

      const leftPane = screen.getByTestId('left-content').closest('[class*="pane"]');
      
      // Press Ctrl+[
      fireEvent.keyDown(window, { key: '[', ctrlKey: true });

      expect(leftPane).toHaveClass('collapsedPane');
    });

    test('should handle keyboard navigation on divider', async () => {
      const user = userEvent.setup();
      
      render(<TwoPaneLayout {...defaultProps} />);

      const divider = screen.getByRole('separator');
      
      // Focus divider
      divider.focus();
      
      // Press Arrow Left to collapse left pane
      await user.keyboard('{ArrowLeft}');

      const leftPane = screen.getByTestId('left-content').closest('[class*="pane"]');
      expect(leftPane).toHaveClass('collapsedPane');

      // Press Arrow Right to collapse right pane
      await user.keyboard('{ArrowRight}');

      const rightPane = screen.getByTestId('right-content').closest('[class*="pane"]');
      expect(rightPane).toHaveClass('collapsedPane');
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA attributes', () => {
      render(
        <TwoPaneLayout
          {...defaultProps}
          showHeaders={true}
          leftTitle="Data Panel"
          rightTitle="Visualisation Panel"
        />
      );

      const divider = screen.getByRole('separator');
      expect(divider).toHaveAttribute('aria-orientation', 'vertical');
      expect(divider).toHaveAttribute('aria-label', 'Resize panels');
      expect(divider).toHaveAttribute('tabIndex', '0');
    });

    test('should have proper button labels for collapse functionality', () => {
      render(<TwoPaneLayout {...defaultProps} />);

      const divider = screen.getByRole('separator');
      
      const leftCollapseButton = divider.querySelector('button[aria-label="Collapse left panel"]');
      const rightCollapseButton = divider.querySelector('button[aria-label="Collapse right panel"]');
      
      expect(leftCollapseButton).toHaveAttribute('title', 'Collapse left panel (Cmd+[)');
      expect(rightCollapseButton).toHaveAttribute('title', 'Collapse right panel (Cmd+])');
    });

    test('should have proper focus management for collapsed panes', () => {
      render(
        <TwoPaneLayout
          {...defaultProps}
          leftCollapsed={true}
          persistState={false}
        />
      );

      const leftPane = screen.getByTestId('left-content').closest('[class*="pane"]');
      
      expect(leftPane).toHaveAttribute('role', 'button');
      expect(leftPane).toHaveAttribute('tabIndex', '0');
      expect(leftPane).toHaveAttribute('aria-label', 'Expand left panel');
    });
  });

  describe('Custom Actions and Headers', () => {
    test('should render custom actions in pane headers', () => {
      const leftActions = <button data-testid="left-action">Left Action</button>;
      const rightActions = <button data-testid="right-action">Right Action</button>;

      render(
        <TwoPaneLayout
          {...defaultProps}
          showHeaders={true}
          leftTitle="Data Panel"
          rightTitle="Visualisation Panel"
          leftActions={leftActions}
          rightActions={rightActions}
        />
      );

      expect(screen.getByTestId('left-action')).toBeInTheDocument();
      expect(screen.getByTestId('right-action')).toBeInTheDocument();
    });

    test('should not render headers when showHeaders is false', () => {
      render(
        <TwoPaneLayout
          {...defaultProps}
          showHeaders={false}
          leftTitle="Data Panel"
          rightTitle="Visualisation Panel"
        />
      );

      expect(screen.queryByText('Data Panel')).not.toBeInTheDocument();
      expect(screen.queryByText('Visualisation Panel')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle zero minPaneSize gracefully', () => {
      expect(() => {
        render(<TwoPaneLayout {...defaultProps} minPaneSize={0} />);
      }).not.toThrow();
    });

    test('should handle very large minPaneSize', () => {
      expect(() => {
        render(<TwoPaneLayout {...defaultProps} minPaneSize={10000} />);
      }).not.toThrow();
    });

    test('should handle invalid localStorage data', () => {
      localStorageMock.setItem('pane-layout-test-invalid', 'invalid-json');

      expect(() => {
        render(
          <TwoPaneLayout
            {...defaultProps}
            persistState={true}
            stateKey="test-invalid"
          />
        );
      }).not.toThrow();
    });

    test('should handle missing container reference during drag', () => {
      const { container } = render(<TwoPaneLayout {...defaultProps} />);

      const divider = screen.getByRole('separator');
      
      // Mock getBoundingClientRect to return null (edge case)  
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(null as unknown as DOMRect);

      expect(() => {
        fireEvent.mouseDown(divider, { button: 0 });
        fireEvent.mouseMove(document, { clientX: 500 });
      }).not.toThrow();
    });
  });

  describe('Performance Considerations', () => {
    test('should debounce localStorage updates', async () => {
      const user = userEvent.setup();
      const setItemSpy = vi.spyOn(localStorageMock, 'setItem');
      
      render(
        <TwoPaneLayout
          {...defaultProps}
          persistState={true}
          stateKey="test-debounce"
        />
      );

      // Rapid state changes
      const divider = screen.getByRole('separator');
      const collapseButton = divider.querySelector('button[aria-label="Collapse left panel"]');
      
      if (collapseButton) {
        await user.click(collapseButton);
        await user.click(collapseButton);
        await user.click(collapseButton);

        // Should not call setItem immediately for each change
        expect(setItemSpy).not.toHaveBeenCalled();

        // Wait for debounce timeout
        await waitFor(() => {
          expect(setItemSpy).toHaveBeenCalledTimes(1);
        }, { timeout: 200 });
      }
    });

    test('should cleanup event listeners on unmount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(<TwoPaneLayout {...defaultProps} />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });
});