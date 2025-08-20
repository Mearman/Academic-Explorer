/**
 * Component tests for MetricDisplay molecule
 * Tests React component rendering and behavior in isolation
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { renderWithProviders } from '@/test/utils/test-providers';

import { MetricDisplay } from './metric-display';

describe('MetricDisplay Basic Rendering', () => {
  it('should render with required props', () => {
    renderWithProviders(<MetricDisplay label="Citations" value={42} data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    expect(metric).toBeInTheDocument();
    expect(screen.getByText('Citations')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should render with custom className', () => {
    renderWithProviders(<MetricDisplay label="Test" value={1} className="custom-metric" data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    expect(metric).toHaveClass('custom-metric');
  });

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    renderWithProviders(<MetricDisplay label="Test" value={1} ref={ref} />);
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('MetricDisplay Loading State', () => {
  it('should render loading state when loading prop is true', () => {
    renderWithProviders(<MetricDisplay label="Citations" value={42} loading data-testid="metric" />);
    
    const loadingElement = screen.getByTestId('metric');
    expect(loadingElement).toBeInTheDocument();
    // Loading state should render skeleton components
    expect(loadingElement.querySelector('[class*="Skeleton"]')).toBeInTheDocument();
  });

  it('should not render actual content when loading', () => {
    renderWithProviders(<MetricDisplay label="Citations" value={42} loading />);
    
    // Should not show the actual label and value when loading
    expect(screen.queryByText('Citations')).not.toBeInTheDocument();
    expect(screen.queryByText('42')).not.toBeInTheDocument();
  });

  it('should render normal content when not loading', () => {
    renderWithProviders(<MetricDisplay label="Citations" value={42} loading={false} />);
    
    expect(screen.getByText('Citations')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});

describe('MetricDisplay Layout and Size Variants', () => {
  const layouts = ['horizontal', 'vertical', 'compact'] as const;

  layouts.forEach(layout => {
    it(`should render with ${layout} layout`, () => {
      renderWithProviders(<MetricDisplay label="Test" value={1} layout={layout} data-testid="metric" />);
      
      const metric = screen.getByTestId('metric');
      expect(metric).toBeInTheDocument();
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('should default to horizontal layout', () => {
    renderWithProviders(<MetricDisplay label="Test" value={1} data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    expect(metric).toBeInTheDocument();
  });

  const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

  sizes.forEach(size => {
    it(`should render with ${size} size`, () => {
      renderWithProviders(<MetricDisplay label="Test" value={1} size={size} data-testid="metric" />);
      
      const metric = screen.getByTestId('metric');
      expect(metric).toBeInTheDocument();
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('should default to md size', () => {
    renderWithProviders(<MetricDisplay label="Test" value={1} data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    expect(metric).toBeInTheDocument();
  });
});

describe('MetricDisplay Variant Styles', () => {
  const variants = ['default', 'highlighted', 'muted'] as const;

  variants.forEach(variant => {
    it(`should render with ${variant} variant`, () => {
      renderWithProviders(<MetricDisplay label="Test" value={1} variant={variant} data-testid="metric" />);
      
      const metric = screen.getByTestId('metric');
      expect(metric).toBeInTheDocument();
    });
  });

  it('should default to default variant', () => {
    renderWithProviders(<MetricDisplay label="Test" value={1} data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    expect(metric).toBeInTheDocument();
  });
});

describe('MetricDisplay Clickable Functionality', () => {
  it('should be clickable when clickable prop is true', () => {
    const onClick = vi.fn();
    renderWithProviders(<MetricDisplay label="Test" value={1} clickable onClick={onClick} data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    expect(metric).toHaveAttribute('role', 'button');
    expect(metric).toHaveAttribute('tabIndex', '0');
    expect(metric).toHaveAttribute('aria-label', 'Test: 1');
  });

  it('should not be clickable when clickable prop is false', () => {
    renderWithProviders(<MetricDisplay label="Test" value={1} clickable={false} data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    expect(metric).not.toHaveAttribute('role');
    expect(metric).not.toHaveAttribute('tabIndex');
    expect(metric).not.toHaveAttribute('aria-label');
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithProviders(<MetricDisplay label="Test" value={1} clickable onClick={onClick} data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    await user.click(metric);
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should call onClick on Enter key press', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithProviders(<MetricDisplay label="Test" value={1} clickable onClick={onClick} data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    metric.focus();
    await user.keyboard('{Enter}');
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should call onClick on Space key press', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithProviders(<MetricDisplay label="Test" value={1} clickable onClick={onClick} data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    metric.focus();
    await user.keyboard(' ');
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('MetricDisplay Value Formatting', () => {
  it('should format numbers with compact format', () => {
    renderWithProviders(<MetricDisplay label="Citations" value={1500} format="compact" data-testid="metric" />);
    
    expect(screen.getByText('1.5K')).toBeInTheDocument();
  });

  it('should format numbers with percentage format', () => {
    renderWithProviders(<MetricDisplay label="Growth" value={25} format="percentage" data-testid="metric" />);
    
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('should format numbers with currency format', () => {
    renderWithProviders(<MetricDisplay label="Funding" value={1000} format="currency" data-testid="metric" />);
    
    expect(screen.getByText('$1,000')).toBeInTheDocument();
  });

  it('should handle string values unchanged', () => {
    renderWithProviders(<MetricDisplay label="Status" value="Active" data-testid="metric" />);
    
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should format large numbers correctly', () => {
    renderWithProviders(<MetricDisplay label="Population" value={1500000} format="compact" data-testid="metric" />);
    
    expect(screen.getByText('1.5M')).toBeInTheDocument();
  });

  it('should format billion numbers correctly', () => {
    renderWithProviders(<MetricDisplay label="GDP" value={1200000000} format="compact" data-testid="metric" />);
    
    expect(screen.getByText('1.2B')).toBeInTheDocument();
  });
});

describe('MetricDisplay Trend Display', () => {
  it('should display upward trend with symbol', () => {
    const trend = { direction: 'up' as const, value: 10 };
    renderWithProviders(<MetricDisplay label="Citations" value={100} trend={trend} data-testid="metric" />);
    
    // Trend symbols are inside badges and may have spaces around them
    expect(screen.getByText((content, _element) => {
      return content.includes('↗') && content.includes('10');
    })).toBeInTheDocument();
  });

  it('should display downward trend with symbol', () => {
    const trend = { direction: 'down' as const, value: 5 };
    renderWithProviders(<MetricDisplay label="Citations" value={95} trend={trend} data-testid="metric" />);
    
    expect(screen.getByText((content, _element) => {
      return content.includes('↘') && content.includes('5');
    })).toBeInTheDocument();
  });

  it('should display neutral trend with symbol', () => {
    const trend = { direction: 'neutral' as const };
    renderWithProviders(<MetricDisplay label="Citations" value={100} trend={trend} data-testid="metric" />);
    
    expect(screen.getByText((content, _element) => {
      return content.includes('→');
    })).toBeInTheDocument();
  });

  it('should display trend value when provided', () => {
    const trend = { direction: 'up' as const, value: 15 };
    renderWithProviders(<MetricDisplay label="Citations" value={100} trend={trend} data-testid="metric" />);
    
    expect(screen.getByText((content, _element) => {
      return content.includes('15');
    })).toBeInTheDocument();
  });
});

describe('MetricDisplay Accessories and Content', () => {
  it('should render accessories when provided', () => {
    const accessories = <span data-testid="accessories">Extra info</span>;
    renderWithProviders(
      <MetricDisplay 
        label="Citations" 
        value={42}
        accessories={accessories}
        data-testid="metric"
      />
    );
    
    expect(screen.getByTestId('accessories')).toBeInTheDocument();
    expect(screen.getByText('Extra info')).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    renderWithProviders(
      <MetricDisplay 
        label="Citations" 
        value={42}
        description="Total citation count"
        data-testid="metric"
      />
    );
    
    expect(screen.getByText('Total citation count')).toBeInTheDocument();
  });

  it('should render icon when provided', () => {
    renderWithProviders(
      <MetricDisplay 
        label="Citations" 
        value={42}
        icon="Chart"
        data-testid="metric"
      />
    );
    
    expect(screen.getByText('Chart')).toBeInTheDocument();
  });

  it('should handle minimal props correctly', () => {
    renderWithProviders(<MetricDisplay label="Test" value={1} data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    expect(metric).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});

describe('MetricDisplay Accessibility', () => {
  it('should have proper accessibility attributes for clickable metric', () => {
    const onClick = vi.fn();
    renderWithProviders(<MetricDisplay label="H-Index" value={25} clickable onClick={onClick} data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    expect(metric).toHaveAttribute('role', 'button');
    expect(metric).toHaveAttribute('tabIndex', '0');
    expect(metric).toHaveAttribute('aria-label', 'H-Index: 25');
  });

  it('should not have button role for non-clickable metric', () => {
    renderWithProviders(<MetricDisplay label="H-Index" value={25} data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    expect(metric).not.toHaveAttribute('role');
    expect(metric).not.toHaveAttribute('tabIndex');
    expect(metric).not.toHaveAttribute('aria-label');
  });

  it('should be keyboard accessible when clickable', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithProviders(<MetricDisplay label="Test" value={1} clickable onClick={onClick} data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    
    // Should be focusable
    await user.tab();
    expect(metric).toHaveFocus();
    
    // Should respond to keyboard events
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('MetricDisplay Complex Scenarios', () => {
  it('should render with all props combined', () => {
    const onClick = vi.fn();
    const trend = { direction: 'down' as const, value: 5 };
    const accessories = <span data-testid="accessories">Accessories</span>;

    renderWithProviders(
      <MetricDisplay
        label="Impact Factor"
        value={3.42}
        description="Journal impact factor"
        icon="Trend"
        format="number"
        layout="vertical"
        size="lg"
        variant="highlighted"
        trend={trend}
        clickable
        onClick={onClick}
        accessories={accessories}
        className="complex-metric"
        data-testid="complex-metric"
      />
    );

    const metric = screen.getByTestId('complex-metric');
    expect(metric).toBeInTheDocument();
    expect(metric).toHaveClass('complex-metric');
    expect(metric).toHaveAttribute('role', 'button');
    expect(metric).toHaveAttribute('aria-label', 'Impact Factor: 3.42');
    
    expect(screen.getByText('Impact Factor')).toBeInTheDocument();
    expect(screen.getByText('3.42')).toBeInTheDocument();
    expect(screen.getByText('Journal impact factor')).toBeInTheDocument();
    expect(screen.getByText('Trend')).toBeInTheDocument();
    expect(screen.getByText((content, _element) => {
      return content.includes('↘') && content.includes('5');
    })).toBeInTheDocument(); // Down trend symbol
    expect(screen.getByTestId('accessories')).toBeInTheDocument();
  });

  it('should handle loading state with full props', () => {
    renderWithProviders(
      <MetricDisplay
        label="Citations"
        value={42}
        loading
        clickable
        onClick={vi.fn()}
        className="loading-metric"
        data-testid="loading-metric"
      />
    );

    const metric = screen.getByTestId('loading-metric');
    expect(metric).toHaveClass('loading-metric');
    expect(metric.querySelector('[class*="Skeleton"]')).toBeInTheDocument();
  });
});

describe('MetricDisplay Error Handling', () => {
  it('should handle missing onClick gracefully', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MetricDisplay label="Test" value={1} clickable data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    
    expect(() => user.click(metric)).not.toThrow();
  });

  it('should handle undefined trend gracefully', () => {
    renderWithProviders(<MetricDisplay label="Test" value={1} trend={undefined} data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    expect(metric).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should handle zero value correctly', () => {
    renderWithProviders(<MetricDisplay label="Count" value={0} data-testid="metric" />);
    
    expect(screen.getByText('Count')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should handle string values correctly', () => {
    renderWithProviders(<MetricDisplay label="Status" value="Active" data-testid="metric" />);
    
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should pass through custom props', () => {
    renderWithProviders(<MetricDisplay label="Test" value={1} id="custom-id" title="Custom title" data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    expect(metric).toHaveAttribute('id', 'custom-id');
    expect(metric).toHaveAttribute('title', 'Custom title');
  });

  it('should have correct display name for debugging', () => {
    expect(MetricDisplay.displayName).toBe('MetricDisplay');
  });
});