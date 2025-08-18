import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

import { PaneDivider } from './pane-divider';

describe('PaneDivider Component', () => {
  const mockContainerRef = { current: document.createElement('div') };
  const mockOnDrag = vi.fn();
  const mockOnDragStart = vi.fn();
  const mockOnDragEnd = vi.fn();
  const mockOnCollapseLeft = vi.fn();
  const mockOnCollapseRight = vi.fn();

  const defaultProps = {
    onDrag: mockOnDrag,
    onDragStart: mockOnDragStart,
    onDragEnd: mockOnDragEnd,
    leftCollapsed: false,
    rightCollapsed: false,
    leftCollapsible: true,
    rightCollapsible: true,
    containerRef: mockContainerRef,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock getBoundingClientRect for the container
    mockContainerRef.current.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      right: 1000,
      width: 1000,
      height: 600,
      top: 0,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('should render divider with proper accessibility attributes', () => {
      render(<PaneDivider {...defaultProps} />);

      const divider = screen.getByRole('separator');
      expect(divider).toBeInTheDocument();
      expect(divider).toHaveAttribute('aria-orientation', 'vertical');
      expect(divider).toHaveAttribute('aria-label', 'Resize panels');
      expect(divider).toHaveAttribute('tabIndex', '0');
    });

    test('should render divider handle', () => {
      const { container } = render(<PaneDivider {...defaultProps} />);

      const handle = container.querySelector('[class*="dividerHandle"]');
      expect(handle).toBeInTheDocument();
    });

    test('should render collapse buttons when panes are collapsible and not collapsed', () => {
      render(
        <PaneDivider
          {...defaultProps}
          onCollapseLeft={mockOnCollapseLeft}
          onCollapseRight={mockOnCollapseRight}
        />
      );

      const leftCollapseButton = screen.getByLabelText('Collapse left panel');
      const rightCollapseButton = screen.getByLabelText('Collapse right panel');

      expect(leftCollapseButton).toBeInTheDocument();
      expect(rightCollapseButton).toBeInTheDocument();
      expect(leftCollapseButton).toHaveAttribute('title', 'Collapse left panel (Cmd+[)');
      expect(rightCollapseButton).toHaveAttribute('title', 'Collapse right panel (Cmd+])');
    });

    test('should not render collapse buttons when panes are not collapsible', () => {
      render(
        <PaneDivider
          {...defaultProps}
          leftCollapsible={false}
          rightCollapsible={false}
        />
      );

      const leftCollapseButton = screen.queryByLabelText('Collapse left panel');
      const rightCollapseButton = screen.queryByLabelText('Collapse right panel');

      expect(leftCollapseButton).not.toBeInTheDocument();
      expect(rightCollapseButton).not.toBeInTheDocument();
    });

    test('should not render left collapse button when left pane is collapsed', () => {
      render(
        <PaneDivider
          {...defaultProps}
          leftCollapsed={true}
          onCollapseLeft={mockOnCollapseLeft}
          onCollapseRight={mockOnCollapseRight}
        />
      );

      const leftCollapseButton = screen.queryByLabelText('Collapse left panel');
      const rightCollapseButton = screen.getByLabelText('Collapse right panel');

      expect(leftCollapseButton).not.toBeInTheDocument();
      expect(rightCollapseButton).toBeInTheDocument();
    });

    test('should not render right collapse button when right pane is collapsed', () => {
      render(
        <PaneDivider
          {...defaultProps}
          rightCollapsed={true}
          onCollapseLeft={mockOnCollapseLeft}
          onCollapseRight={mockOnCollapseRight}
        />
      );

      const leftCollapseButton = screen.getByLabelText('Collapse left panel');
      const rightCollapseButton = screen.queryByLabelText('Collapse right panel');

      expect(leftCollapseButton).toBeInTheDocument();
      expect(rightCollapseButton).not.toBeInTheDocument();
    });
  });

  describe('Mouse Drag Functionality', () => {
    test('should initiate drag on left mouse button down', () => {
      render(<PaneDivider {...defaultProps} />);

      const divider = screen.getByRole('separator');
      
      fireEvent.mouseDown(divider, { button: 0 });

      expect(mockOnDragStart).toHaveBeenCalledTimes(1);
    });

    test('should not initiate drag on non-left mouse button', () => {
      render(<PaneDivider {...defaultProps} />);

      const divider = screen.getByRole('separator');
      
      fireEvent.mouseDown(divider, { button: 1 }); // Middle button
      fireEvent.mouseDown(divider, { button: 2 }); // Right button

      expect(mockOnDragStart).not.toHaveBeenCalled();
    });

    test('should handle mouse move during drag', () => {
      render(<PaneDivider {...defaultProps} />);

      const divider = screen.getByRole('separator');
      
      // Start drag
      fireEvent.mouseDown(divider, { button: 0 });

      // Simulate mouse move
      fireEvent.mouseMove(document, { clientX: 600 });

      expect(mockOnDrag).toHaveBeenCalledWith(600, expect.any(Object));
    });

    test('should handle mouse up during drag', () => {
      render(<PaneDivider {...defaultProps} />);

      const divider = screen.getByRole('separator');
      
      // Start drag
      fireEvent.mouseDown(divider, { button: 0 });

      // End drag
      fireEvent.mouseUp(document);

      expect(mockOnDragEnd).toHaveBeenCalledTimes(1);
    });

    test('should prevent default on mouse down', () => {
      render(<PaneDivider {...defaultProps} />);

      const divider = screen.getByRole('separator');
      const mockEvent = { 
        button: 0, 
        preventDefault: vi.fn() 
      };
      
      fireEvent.mouseDown(divider, mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    test('should set body cursor and disable text selection during drag', () => {
      render(<PaneDivider {...defaultProps} />);

      const divider = screen.getByRole('separator');
      
      // Start drag
      fireEvent.mouseDown(divider, { button: 0 });

      expect(document.body.style.cursor).toBe('col-resize');
      expect(document.body.style.userSelect).toBe('none');
    });

    test('should restore body styles after drag ends', () => {
      render(<PaneDivider {...defaultProps} />);

      const divider = screen.getByRole('separator');
      
      // Start drag
      fireEvent.mouseDown(divider, { button: 0 });
      
      // End drag
      fireEvent.mouseUp(document);

      expect(document.body.style.cursor).toBe('');
      expect(document.body.style.userSelect).toBe('');
    });

    test('should not handle mouse move when not dragging', () => {
      render(<PaneDivider {...defaultProps} />);

      // Simulate mouse move without starting drag
      fireEvent.mouseMove(document, { clientX: 600 });

      expect(mockOnDrag).not.toHaveBeenCalled();
    });

    test('should handle missing container ref gracefully', () => {
      const emptyContainerRef = { current: null };
      
      render(
        <PaneDivider
          {...defaultProps}
          containerRef={emptyContainerRef}
        />
      );

      const divider = screen.getByRole('separator');
      
      expect(() => {
        fireEvent.mouseDown(divider, { button: 0 });
        fireEvent.mouseMove(document, { clientX: 600 });
      }).not.toThrow();
    });
  });

  describe('Collapse Button Functionality', () => {
    test('should call onCollapseLeft when left collapse button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <PaneDivider
          {...defaultProps}
          onCollapseLeft={mockOnCollapseLeft}
        />
      );

      const leftCollapseButton = screen.getByLabelText('Collapse left panel');
      await user.click(leftCollapseButton);

      expect(mockOnCollapseLeft).toHaveBeenCalledTimes(1);
    });

    test('should call onCollapseRight when right collapse button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <PaneDivider
          {...defaultProps}
          onCollapseRight={mockOnCollapseRight}
        />
      );

      const rightCollapseButton = screen.getByLabelText('Collapse right panel');
      await user.click(rightCollapseButton);

      expect(mockOnCollapseRight).toHaveBeenCalledTimes(1);
    });

    test('should stop propagation when collapse buttons are clicked', async () => {
      const user = userEvent.setup();
      const mockDividerClick = vi.fn();
      
      render(
        <div onClick={mockDividerClick}>
          <PaneDivider
            {...defaultProps}
            onCollapseLeft={mockOnCollapseLeft}
            onCollapseRight={mockOnCollapseRight}
          />
        </div>
      );

      const leftCollapseButton = screen.getByLabelText('Collapse left panel');
      await user.click(leftCollapseButton);

      expect(mockOnCollapseLeft).toHaveBeenCalledTimes(1);
      expect(mockDividerClick).not.toHaveBeenCalled();
    });

    test('should not render or call collapse functions when they are not provided', () => {
      render(
        <PaneDivider
          {...defaultProps}
          onCollapseLeft={undefined}
          onCollapseRight={undefined}
        />
      );

      const leftCollapseButton = screen.queryByLabelText('Collapse left panel');
      const rightCollapseButton = screen.queryByLabelText('Collapse right panel');

      expect(leftCollapseButton).not.toBeInTheDocument();
      expect(rightCollapseButton).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Accessibility', () => {
    test('should handle left arrow key to collapse left pane', async () => {
      const user = userEvent.setup();
      
      render(
        <PaneDivider
          {...defaultProps}
          onCollapseLeft={mockOnCollapseLeft}
        />
      );

      const divider = screen.getByRole('separator');
      divider.focus();
      
      await user.keyboard('{ArrowLeft}');

      expect(mockOnCollapseLeft).toHaveBeenCalledTimes(1);
    });

    test('should handle right arrow key to collapse right pane', async () => {
      const user = userEvent.setup();
      
      render(
        <PaneDivider
          {...defaultProps}
          onCollapseRight={mockOnCollapseRight}
        />
      );

      const divider = screen.getByRole('separator');
      divider.focus();
      
      await user.keyboard('{ArrowRight}');

      expect(mockOnCollapseRight).toHaveBeenCalledTimes(1);
    });

    test('should not call collapse functions on arrow keys when not collapsible', async () => {
      const user = userEvent.setup();
      
      render(
        <PaneDivider
          {...defaultProps}
          leftCollapsible={false}
          rightCollapsible={false}
          onCollapseLeft={mockOnCollapseLeft}
          onCollapseRight={mockOnCollapseRight}
        />
      );

      const divider = screen.getByRole('separator');
      divider.focus();
      
      await user.keyboard('{ArrowLeft}');
      await user.keyboard('{ArrowRight}');

      expect(mockOnCollapseLeft).not.toHaveBeenCalled();
      expect(mockOnCollapseRight).not.toHaveBeenCalled();
    });

    test('should not call collapse functions when callbacks are not provided', async () => {
      const user = userEvent.setup();
      
      render(
        <PaneDivider
          {...defaultProps}
          onCollapseLeft={undefined}
          onCollapseRight={undefined}
        />
      );

      const divider = screen.getByRole('separator');
      divider.focus();
      
      expect(() => {
        user.keyboard('{ArrowLeft}');
        user.keyboard('{ArrowRight}');
      }).not.toThrow();
    });

    test('should ignore other keys', async () => {
      const user = userEvent.setup();
      
      render(
        <PaneDivider
          {...defaultProps}
          onCollapseLeft={mockOnCollapseLeft}
          onCollapseRight={mockOnCollapseRight}
        />
      );

      const divider = screen.getByRole('separator');
      divider.focus();
      
      await user.keyboard('{ArrowUp}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Space}');
      await user.keyboard('{Enter}');

      expect(mockOnCollapseLeft).not.toHaveBeenCalled();
      expect(mockOnCollapseRight).not.toHaveBeenCalled();
    });
  });

  describe('Event Listener Management', () => {
    test('should add event listeners when dragging starts', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      
      render(<PaneDivider {...defaultProps} />);

      const divider = screen.getByRole('separator');
      fireEvent.mouseDown(divider, { button: 0 });

      expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
    });

    test('should remove event listeners when dragging ends', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      render(<PaneDivider {...defaultProps} />);

      const divider = screen.getByRole('separator');
      fireEvent.mouseDown(divider, { button: 0 });
      fireEvent.mouseUp(document);

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
    });

    test('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { unmount } = render(<PaneDivider {...defaultProps} />);

      const divider = screen.getByRole('separator');
      fireEvent.mouseDown(divider, { button: 0 });

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
    });

    test('should handle multiple rapid mouse events gracefully', () => {
      render(<PaneDivider {...defaultProps} />);

      const divider = screen.getByRole('separator');
      
      // Rapid mouse events
      fireEvent.mouseDown(divider, { button: 0 });
      fireEvent.mouseMove(document, { clientX: 100 });
      fireEvent.mouseMove(document, { clientX: 200 });
      fireEvent.mouseMove(document, { clientX: 300 });
      fireEvent.mouseUp(document);

      expect(mockOnDragStart).toHaveBeenCalledTimes(1);
      expect(mockOnDrag).toHaveBeenCalledTimes(3);
      expect(mockOnDragEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should prevent mouse move events during drag', () => {
      render(<PaneDivider {...defaultProps} />);

      const divider = screen.getByRole('separator');
      const mockEvent = { 
        clientX: 500, 
        preventDefault: vi.fn() 
      };
      
      fireEvent.mouseDown(divider, { button: 0 });
      fireEvent.mouseMove(document, mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    test('should handle container getBoundingClientRect returning null', () => {
      mockContainerRef.current.getBoundingClientRect = vi.fn().mockReturnValue(null);
      
      render(<PaneDivider {...defaultProps} />);

      const divider = screen.getByRole('separator');
      
      expect(() => {
        fireEvent.mouseDown(divider, { button: 0 });
        fireEvent.mouseMove(document, { clientX: 500 });
      }).not.toThrow();
    });

    test('should handle very rapid mouse movements', () => {
      render(<PaneDivider {...defaultProps} />);

      const divider = screen.getByRole('separator');
      
      fireEvent.mouseDown(divider, { button: 0 });

      // Simulate very rapid movements
      for (let i = 0; i < 100; i++) {
        fireEvent.mouseMove(document, { clientX: i * 10 });
      }

      fireEvent.mouseUp(document);

      expect(mockOnDrag).toHaveBeenCalledTimes(100);
      expect(mockOnDragEnd).toHaveBeenCalledTimes(1);
    });

    test('should handle mouse leave during drag', () => {
      render(<PaneDivider {...defaultProps} />);

      const divider = screen.getByRole('separator');
      
      fireEvent.mouseDown(divider, { button: 0 });
      fireEvent.mouseLeave(document);
      fireEvent.mouseMove(document, { clientX: 500 });

      // Should still track movements even after mouse leave
      expect(mockOnDrag).toHaveBeenCalledWith(500, expect.any(Object));
    });

    test('should handle window blur during drag', () => {
      render(<PaneDivider {...defaultProps} />);

      const divider = screen.getByRole('separator');
      
      fireEvent.mouseDown(divider, { button: 0 });
      fireEvent.blur(window);
      fireEvent.mouseMove(document, { clientX: 500 });

      // Should still work after window blur
      expect(mockOnDrag).toHaveBeenCalledWith(500, expect.any(Object));
    });
  });

  describe('Visual States', () => {
    test('should apply correct CSS classes', () => {
      const { container } = render(<PaneDivider {...defaultProps} />);

      const divider = container.querySelector('[class*="divider"]');
      const handle = container.querySelector('[class*="dividerHandle"]');

      expect(divider).toHaveClass(expect.stringMatching(/divider/));
      expect(handle).toHaveClass(expect.stringMatching(/dividerHandle/));
    });

    test('should apply correct CSS classes to collapse buttons', () => {
      const { container } = render(
        <PaneDivider
          {...defaultProps}
          onCollapseLeft={mockOnCollapseLeft}
          onCollapseRight={mockOnCollapseRight}
        />
      );

      const leftButton = container.querySelector('[class*="collapseButtonVariants"][class*="left"]');
      const rightButton = container.querySelector('[class*="collapseButtonVariants"][class*="right"]');

      expect(leftButton).toBeInTheDocument();
      expect(rightButton).toBeInTheDocument();
    });
  });
});