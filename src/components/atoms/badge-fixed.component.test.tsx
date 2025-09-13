/**
 * Component tests for Badge atom (Fixed version without jest-dom matchers)
 * Tests React component rendering and behavior in isolation
 */

import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';

import type { BadgeVariant, SizeVariant } from '../types';

import { Badge } from './badge';

// Shared test utilities
const renderBadge = (props: Record<string, unknown> = {}) => {
  return render(<Badge data-testid="test-badge" {...props}>Test Badge</Badge>);
};

const getBadgeElement = () => screen.getByTestId('test-badge');

describe('Badge Basic Rendering', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should render with default props', () => {
    renderBadge();
    
    const badge = getBadgeElement();
    expect(badge).toBeTruthy();
    expect(badge.textContent).toBe('Test Badge');
    expect(badge.tagName).toBe('SPAN');
  });

  it('should render with custom className', () => {
    renderBadge({ className: 'custom-class' });
    
    const badge = getBadgeElement();
    expect(badge).toBeTruthy();
    expect(badge.className).toContain('custom-class');
  });

  it('should render with data-testid', () => {
    renderBadge({ 'data-testid': 'test-badge' });
    
    const badge = getBadgeElement();
    expect(badge).toBeTruthy();
    expect(badge.getAttribute('data-testid')).toBe('test-badge');
  });

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Badge ref={ref} data-testid="test-badge">Test</Badge>);
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current?.textContent).toBe('Test');
  });
});

describe('Badge Variants', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const variants = ['default', 'secondary', 'success', 'warning', 'error', 'info'] as const;

  variants.forEach(variant => {
    it(`should render with ${variant} variant`, () => {
      renderBadge({ variant, 'data-testid': `badge-${variant}` });
      
      const badge = screen.getByTestId(`badge-${variant}`);
      expect(badge).toBeTruthy();
      expect(badge.textContent).toBe('Test Badge');
    });
  });
});

describe('Badge Sizes', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

  sizes.forEach(size => {
    it(`should render with ${size} size`, () => {
      renderBadge({ size, 'data-testid': `badge-${size}` });
      
      const badge = screen.getByTestId(`badge-${size}`);
      expect(badge).toBeTruthy();
      expect(badge.textContent).toBe('Test Badge');
    });
  });
});

describe('Badge Pill Style', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should render with pill style when pill prop is true', () => {
    render(<Badge pill data-testid="pill-badge">Pill Badge</Badge>);
    
    const badge = screen.getByTestId('pill-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toBe('Pill Badge');
  });

  it('should not have pill style when pill prop is false', () => {
    render(<Badge pill={false} data-testid="regular-badge">Regular Badge</Badge>);
    
    const badge = screen.getByTestId('regular-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toBe('Regular Badge');
  });
});

describe('Badge Removable Functionality', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should render remove button when removable prop is true and onRemove is provided', () => {
    const onRemove = vi.fn();
    render(<Badge removable onRemove={onRemove} data-testid="removable-badge">Removable Badge</Badge>);
    
    const badge = screen.getByTestId('removable-badge');
    const removeButton = screen.getByRole('button', { name: 'Remove' });
    
    expect(badge).toBeTruthy();
    expect(removeButton).toBeTruthy();
    expect(removeButton.textContent).toBe('×');
  });

  it('should not render remove button when removable is true but onRemove is not provided', () => {
    render(<Badge removable data-testid="not-removable">Not Removable Badge</Badge>);
    
    const badge = screen.getByTestId('not-removable');
    const removeButton = screen.queryByRole('button', { name: 'Remove' });
    
    expect(badge).toBeTruthy();
    expect(removeButton).toBeNull();
  });

  it('should not render remove button when removable is false', () => {
    const onRemove = vi.fn();
    render(<Badge removable={false} onRemove={onRemove} data-testid="non-removable">Not Removable Badge</Badge>);
    
    const badge = screen.getByTestId('non-removable');
    const removeButton = screen.queryByRole('button', { name: 'Remove' });
    
    expect(badge).toBeTruthy();
    expect(removeButton).toBeNull();
  });
});

describe('Badge Removable Interactions', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should call onRemove when remove button is clicked', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<Badge removable onRemove={onRemove} data-testid="click-removable">Removable Badge</Badge>);
    
    const removeButton = screen.getByRole('button', { name: 'Remove' });
    await user.click(removeButton);
    
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('should stop propagation when remove button is clicked', () => {
    const onRemove = vi.fn();
    const onBadgeClick = vi.fn();
    
    render(
      <div onClick={onBadgeClick}>
        <Badge removable onRemove={onRemove} data-testid="propagation-test">Removable Badge</Badge>
      </div>
    );
    
    const removeButton = screen.getByRole('button', { name: 'Remove' });
    fireEvent.click(removeButton);
    
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onBadgeClick).not.toHaveBeenCalled();
  });
});

describe('Badge Accessibility', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should have correct role', () => {
    render(<Badge data-testid="role-badge">Test Badge</Badge>);
    
    const badge = screen.getByTestId('role-badge');
    expect(badge.getAttribute('role')).toBe('status');
  });

  it('should have accessible remove button with aria-label', () => {
    const onRemove = vi.fn();
    render(<Badge removable onRemove={onRemove} data-testid="accessible-badge">Removable Badge</Badge>);
    
    const removeButton = screen.getByRole('button', { name: 'Remove' });
    expect(removeButton.getAttribute('aria-label')).toBe('Remove');
    expect(removeButton.getAttribute('tabIndex')).toBe('0');
  });

  it('should support keyboard navigation on remove button', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<Badge removable onRemove={onRemove} data-testid="keyboard-badge">Removable Badge</Badge>);
    
    const removeButton = screen.getByRole('button', { name: 'Remove' });
    
    // Focus the remove button
    await user.tab();
    expect(document.activeElement).toBe(removeButton);
    
    // Press Enter to trigger removal
    await user.keyboard('{Enter}');
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

describe('Badge Complex Scenarios', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

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
    
    expect(badge).toBeTruthy();
    expect(badge.className).toContain('custom-badge');
    expect(badge.textContent).toContain('Complex Badge');
    expect(removeButton).toBeTruthy();
  });

  it('should handle React elements as children', () => {
    render(
      <Badge data-testid="react-children">
        <span>Icon</span>
        <span>Label</span>
      </Badge>
    );
    
    const badge = screen.getByTestId('react-children');
    expect(badge).toBeTruthy();
    expect(screen.getByText('Icon')).toBeTruthy();
    expect(screen.getByText('Label')).toBeTruthy();
  });

  it('should handle empty content', () => {
    render(<Badge data-testid="empty-badge"></Badge>);
    
    const badge = screen.getByTestId('empty-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toBe('');
  });
});

describe('Badge Event Handling', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should pass through click events to badge element', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    
    render(<Badge onClick={onClick} data-testid="clickable-badge">Clickable Badge</Badge>);
    
    const badge = screen.getByTestId('clickable-badge');
    await user.click(badge);
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should pass through custom props', () => {
    render(<Badge title="Custom title" id="custom-id" data-testid="props-badge">Test</Badge>);
    
    const badge = screen.getByTestId('props-badge');
    expect(badge.getAttribute('title')).toBe('Custom title');
    expect(badge.getAttribute('id')).toBe('custom-id');
  });
});

describe('Badge Error Handling', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should handle undefined onRemove gracefully', () => {
    expect(() => {
      render(<Badge removable data-testid="undefined-remove">Test</Badge>);
    }).not.toThrow();
    
    const badge = screen.getByTestId('undefined-remove');
    const removeButton = screen.queryByRole('button', { name: 'Remove' });
    
    expect(badge).toBeTruthy();
    expect(removeButton).toBeNull();
  });

  it('should handle invalid variant gracefully', () => {
    expect(() => {
      render(<Badge variant={'invalid' as BadgeVariant} data-testid="invalid-variant">Test</Badge>);
    }).not.toThrow();
    
    const badge = screen.getByTestId('invalid-variant');
    expect(badge).toBeTruthy();
  });

  it('should handle invalid size gracefully', () => {
    expect(() => {
      render(<Badge size={'invalid' as SizeVariant} data-testid="invalid-size">Test</Badge>);
    }).not.toThrow();
    
    const badge = screen.getByTestId('invalid-size');
    expect(badge).toBeTruthy();
  });
});