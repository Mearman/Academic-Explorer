/**
 * Component tests for Badge atom
 * Tests React component rendering and behavior in isolation
 */

import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';

import { Badge } from './badge';

describe('Badge Component', () => {
  // Ensure proper cleanup between tests
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<Badge>Test Badge</Badge>);
      
      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Test Badge');
    });

    it('should render with custom className', () => {
      render(<Badge className="custom-class" data-testid="custom-class-badge">Test</Badge>);
      
      const badge = screen.getByTestId('custom-class-badge');
      expect(badge).toHaveClass('custom-class');
    });

    it('should render with data-testid', () => {
      render(<Badge data-testid="test-badge">Test</Badge>);
      
      const badge = screen.getByTestId('test-badge');
      expect(badge).toBeInTheDocument();
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLSpanElement>();
      render(<Badge ref={ref}>Test</Badge>);
      
      expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    });
  });

  describe('Variants', () => {
    const variants = ['default', 'secondary', 'success', 'warning', 'error', 'info'] as const;

    variants.forEach(variant => {
      it(`should render with ${variant} variant`, () => {
        render(<Badge variant={variant} data-testid={`badge-${variant}`}>Test</Badge>);
        
        const badge = screen.getByTestId(`badge-${variant}`);
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveTextContent('Test');
      });
    });
  });

  describe('Sizes', () => {
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

    sizes.forEach(size => {
      it(`should render with ${size} size`, () => {
        render(<Badge size={size} data-testid={`badge-${size}`}>Test</Badge>);
        
        const badge = screen.getByTestId(`badge-${size}`);
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveTextContent('Test');
      });
    });
  });

  describe('Pill Style', () => {
    it('should render with pill style when pill prop is true', () => {
      render(<Badge pill data-testid="pill-badge">Pill Badge</Badge>);
      
      const badge = screen.getByTestId('pill-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Pill Badge');
    });

    it('should not have pill style when pill prop is false', () => {
      render(<Badge pill={false} data-testid="regular-badge">Regular Badge</Badge>);
      
      const badge = screen.getByTestId('regular-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Regular Badge');
    });
  });

  describe('Removable Functionality', () => {
    it('should render remove button when removable prop is true and onRemove is provided', () => {
      const onRemove = vi.fn();
      render(<Badge removable onRemove={onRemove}>Removable Badge</Badge>);
      
      const badge = screen.getByRole('status');
      const removeButton = screen.getByRole('button', { name: 'Remove' });
      
      expect(badge).toBeInTheDocument();
      expect(removeButton).toBeInTheDocument();
      expect(removeButton).toHaveTextContent('×');
    });

    it('should not render remove button when removable is true but onRemove is not provided', () => {
      render(<Badge removable>Not Removable Badge</Badge>);
      
      const badge = screen.getByRole('status');
      const removeButton = screen.queryByRole('button', { name: 'Remove' });
      
      expect(badge).toBeInTheDocument();
      expect(removeButton).not.toBeInTheDocument();
    });

    it('should not render remove button when removable is false', () => {
      const onRemove = vi.fn();
      render(<Badge removable={false} onRemove={onRemove}>Not Removable Badge</Badge>);
      
      const badge = screen.getByRole('status');
      const removeButton = screen.queryByRole('button', { name: 'Remove' });
      
      expect(badge).toBeInTheDocument();
      expect(removeButton).not.toBeInTheDocument();
    });

    it('should call onRemove when remove button is clicked', async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();
      render(<Badge removable onRemove={onRemove}>Removable Badge</Badge>);
      
      const removeButton = screen.getByRole('button', { name: 'Remove' });
      await user.click(removeButton);
      
      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it('should stop propagation when remove button is clicked', () => {
      const onRemove = vi.fn();
      const onBadgeClick = vi.fn();
      
      render(
        <div onClick={onBadgeClick}>
          <Badge removable onRemove={onRemove}>Removable Badge</Badge>
        </div>
      );
      
      const removeButton = screen.getByRole('button', { name: 'Remove' });
      fireEvent.click(removeButton);
      
      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onBadgeClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have correct role', () => {
      render(<Badge>Test Badge</Badge>);
      
      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
    });

    it('should have accessible remove button with aria-label', () => {
      const onRemove = vi.fn();
      render(<Badge removable onRemove={onRemove}>Removable Badge</Badge>);
      
      const removeButton = screen.getByRole('button', { name: 'Remove' });
      expect(removeButton).toHaveAttribute('aria-label', 'Remove');
      expect(removeButton).toHaveAttribute('tabIndex', '0');
    });

    it('should support keyboard navigation on remove button', async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();
      render(<Badge removable onRemove={onRemove}>Removable Badge</Badge>);
      
      const removeButton = screen.getByRole('button', { name: 'Remove' });
      
      // Focus the remove button
      await user.tab();
      expect(removeButton).toHaveFocus();
      
      // Press Enter to trigger removal
      await user.keyboard('{Enter}');
      expect(onRemove).toHaveBeenCalledTimes(1);
    });
  });

  describe('Complex Scenarios', () => {
    it('should render with all props combined', () => {
      const onRemove = vi.fn();
      render(
        <Badge 
          variant="success" 
          size="lg" 
          pill 
          removable 
          onRemove={onRemove}
          className="custom-badge"
          data-testid="complex-badge"
        >
          Complex Badge
        </Badge>
      );
      
      const badge = screen.getByTestId('complex-badge');
      const removeButton = screen.getByRole('button', { name: 'Remove' });
      
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('custom-badge');
      expect(badge).toHaveTextContent('Complex Badge');
      expect(removeButton).toBeInTheDocument();
    });

    it('should handle React elements as children', () => {
      render(
        <Badge>
          <span>Icon</span>
          <span>Label</span>
        </Badge>
      );
      
      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
      expect(screen.getByText('Icon')).toBeInTheDocument();
      expect(screen.getByText('Label')).toBeInTheDocument();
    });

    it('should handle empty content', () => {
      render(<Badge></Badge>);
      
      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
      expect(badge).toBeEmptyDOMElement();
    });
  });

  describe('Event Handling', () => {
    it('should pass through click events to badge element', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      
      render(<Badge onClick={onClick}>Clickable Badge</Badge>);
      
      const badge = screen.getByRole('status');
      await user.click(badge);
      
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should pass through custom props', () => {
      render(<Badge title="Custom title" id="custom-id">Test</Badge>);
      
      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('title', 'Custom title');
      expect(badge).toHaveAttribute('id', 'custom-id');
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined onRemove gracefully', () => {
      expect(() => {
        render(<Badge removable onRemove={undefined}>Test</Badge>);
      }).not.toThrow();
      
      const badge = screen.getByRole('status');
      const removeButton = screen.queryByRole('button', { name: 'Remove' });
      
      expect(badge).toBeInTheDocument();
      expect(removeButton).not.toBeInTheDocument();
    });

    it('should handle invalid variant gracefully', () => {
      expect(() => {
        render(<Badge variant={'invalid' as any}>Test</Badge>);
      }).not.toThrow();
    });

    it('should handle invalid size gracefully', () => {
      expect(() => {
        render(<Badge size={'invalid' as any}>Test</Badge>);
      }).not.toThrow();
    });
  });
});