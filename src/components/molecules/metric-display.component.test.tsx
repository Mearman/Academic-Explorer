/**
 * Component tests for MetricDisplay molecule
 * Tests React component rendering and behavior in isolation
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import type { MetricFormat, TrendDirection } from '@/lib/metric-formatting';

import type { SizeVariant } from '../types';

import { MetricDisplay } from './metric-display';

// Type interfaces for mock components
interface LoadingStateProps {
  icon?: string;
  layout: 'horizontal' | 'vertical' | 'compact';
  description?: string;
  className: string;
  'data-testid'?: string;
}

interface MetricContentProps {
  label: string;
  value: number | string;
  format: MetricFormat;
  icon?: string;
  layout: 'horizontal' | 'vertical' | 'compact';
  size: SizeVariant;
  description?: string;
  trend?: {
    direction: TrendDirection;
    value?: number | string;
    label?: string;
  };
  accessories?: React.ReactNode;
}

// Mock dependencies
vi.mock('@/lib/metric-formatting', () => ({
  mapSizeVariant: (size: string) => size,
}));

// Mock child components
vi.mock('./metric-display/loading-state', () => ({
  LoadingState: React.forwardRef<HTMLDivElement, LoadingStateProps>(({ icon, layout, description, className, 'data-testid': testId, ...props }, ref) => (
    <div 
      ref={ref}
      className={className}
      data-testid={testId}
      data-loading="true"
      data-icon={icon}
      data-layout={layout}
      data-description={description}
      {...props}
    >
      Loading...
    </div>
  )),
}));

vi.mock('./metric-display/metric-content', () => ({
  MetricContent: ({ label, value, format, icon, layout, size, description, trend, accessories }: MetricContentProps) => (
    <div 
      data-testid="metric-content"
      data-label={label}
      data-value={value}
      data-format={format}
      data-icon={icon}
      data-layout={layout}
      data-size={size}
      data-description={description}
      data-trend={trend ? JSON.stringify(trend) : undefined}
    >
      <span>{label}: {value}</span>
      {accessories}
    </div>
  ),
}));

describe('MetricDisplay Basic Rendering', () => {
  it('should render with required props', () => {
    render(<MetricDisplay label="Citations" value={42} data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    const content = screen.getByTestId('metric-content');
    
    expect(metric).toBeInTheDocument();
    expect(content).toBeInTheDocument();
    expect(content).toHaveAttribute('data-label', 'Citations');
    expect(content).toHaveAttribute('data-value', '42');
  });

  it('should render with custom className', () => {
    render(<MetricDisplay label="Test" value={1} className="custom-metric" data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    expect(metric).toHaveClass('custom-metric');
  });

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<MetricDisplay label="Test" value={1} ref={ref} />);
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('MetricDisplay Loading State', () => {
  it('should render loading state when loading prop is true', () => {
    render(<MetricDisplay label="Citations" value={42} loading data-testid="metric" />);
    
    const loadingElement = screen.getByTestId('metric');
    expect(loadingElement).toHaveAttribute('data-loading', 'true');
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should pass props to loading state component', () => {
    render(
      <MetricDisplay 
        label="Citations" 
        value={42} 
        loading 
        icon="chart"
        description="Citation count"
        data-testid="metric" 
      />
    );
    
    const loadingElement = screen.getByTestId('metric');
    expect(loadingElement).toHaveAttribute('data-icon', 'chart');
    expect(loadingElement).toHaveAttribute('data-description', 'Citation count');
  });

  it('should not render metric content when loading', () => {
    render(<MetricDisplay label="Citations" value={42} loading />);
    
    expect(screen.queryByTestId('metric-content')).not.toBeInTheDocument();
  });
});

describe('MetricDisplay Layout and Size Variants', () => {
  const layouts = ['horizontal', 'vertical', 'compact'] as const;

  layouts.forEach(layout => {
    it(`should render with ${layout} layout`, () => {
      render(<MetricDisplay label="Test" value={1} layout={layout} data-testid="metric" />);
      
      const content = screen.getByTestId('metric-content');
      expect(content).toHaveAttribute('data-layout', layout);
    });
  });

  it('should default to horizontal layout', () => {
    render(<MetricDisplay label="Test" value={1} data-testid="metric" />);
    
    const content = screen.getByTestId('metric-content');
    expect(content).toHaveAttribute('data-layout', 'horizontal');
  });

  const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

  sizes.forEach(size => {
    it(`should render with ${size} size`, () => {
      render(<MetricDisplay label="Test" value={1} size={size} data-testid="metric" />);
      
      const content = screen.getByTestId('metric-content');
      expect(content).toHaveAttribute('data-size', size);
    });
  });

  it('should default to md size', () => {
    render(<MetricDisplay label="Test" value={1} data-testid="metric" />);
    
    const content = screen.getByTestId('metric-content');
    expect(content).toHaveAttribute('data-size', 'md');
  });
});

describe('MetricDisplay Variant Styles', () => {
  const variants = ['default', 'highlighted', 'muted'] as const;

  variants.forEach(variant => {
    it(`should render with ${variant} variant`, () => {
      render(<MetricDisplay label="Test" value={1} variant={variant} data-testid="metric" />);
      
      const metric = screen.getByTestId('metric');
      expect(metric).toBeInTheDocument();
    });
  });

  it('should default to default variant', () => {
    render(<MetricDisplay label="Test" value={1} data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    expect(metric).toBeInTheDocument();
  });
});

describe('MetricDisplay Clickable Functionality', () => {
  it('should be clickable when clickable prop is true', () => {
    const onClick = vi.fn();
    render(<MetricDisplay label="Test" value={1} clickable onClick={onClick} data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    expect(metric).toHaveAttribute('role', 'button');
    expect(metric).toHaveAttribute('tabIndex', '0');
    expect(metric).toHaveAttribute('aria-label', 'Test: 1');
  });

  it('should not be clickable when clickable prop is false', () => {
    render(<MetricDisplay label="Test" value={1} clickable={false} data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    expect(metric).not.toHaveAttribute('role');
    expect(metric).not.toHaveAttribute('tabIndex');
    expect(metric).not.toHaveAttribute('aria-label');
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<MetricDisplay label="Test" value={1} clickable onClick={onClick} data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    await user.click(metric);
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should call onClick on Enter key press', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<MetricDisplay label="Test" value={1} clickable onClick={onClick} data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    metric.focus();
    await user.keyboard('{Enter}');
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should call onClick on Space key press', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<MetricDisplay label="Test" value={1} clickable onClick={onClick} data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    metric.focus();
    await user.keyboard(' ');
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('MetricDisplay Content Props', () => {
  it('should pass all content props to MetricContent', () => {
    const trend = { direction: 'up' as const, value: '+10%', label: 'increased' };
    const accessories = <span data-testid="accessories">Extra info</span>;

    render(
      <MetricDisplay 
        label="Citations" 
        value={42}
        description="Total citations"
        icon="chart"
        format="compact"
        trend={trend}
        accessories={accessories}
        data-testid="metric"
      />
    );
    
    const content = screen.getByTestId('metric-content');
    expect(content).toHaveAttribute('data-label', 'Citations');
    expect(content).toHaveAttribute('data-value', '42');
    expect(content).toHaveAttribute('data-description', 'Total citations');
    expect(content).toHaveAttribute('data-icon', 'chart');
    expect(content).toHaveAttribute('data-format', 'compact');
    expect(content).toHaveAttribute('data-trend', JSON.stringify(trend));
    expect(screen.getByTestId('accessories')).toBeInTheDocument();
  });

  it('should handle optional props correctly', () => {
    render(<MetricDisplay label="Test" value={1} data-testid="metric" />);
    
    // Component should render without errors even with minimal props
    const metric = screen.getByTestId('metric');
    expect(metric).toBeInTheDocument();
    
    // Should contain label and value (they are combined in the component)
    expect(screen.getByText('Test: 1')).toBeInTheDocument();
  });
});

describe('MetricDisplay Accessibility', () => {
  it('should have proper accessibility attributes for clickable metric', () => {
    const onClick = vi.fn();
    render(<MetricDisplay label="H-Index" value={25} clickable onClick={onClick} data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    expect(metric).toHaveAttribute('role', 'button');
    expect(metric).toHaveAttribute('tabIndex', '0');
    expect(metric).toHaveAttribute('aria-label', 'H-Index: 25');
  });

  it('should not have button role for non-clickable metric', () => {
    render(<MetricDisplay label="H-Index" value={25} data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    expect(metric).not.toHaveAttribute('role');
    expect(metric).not.toHaveAttribute('tabIndex');
    expect(metric).not.toHaveAttribute('aria-label');
  });

  it('should be keyboard accessible when clickable', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<MetricDisplay label="Test" value={1} clickable onClick={onClick} data-testid="metric" />);
    
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
    const trend = { direction: 'down' as const, value: '-5%' };
    const accessories = <span>Accessories</span>;

    render(
      <MetricDisplay
        label="Impact Factor"
        value={3.42}
        description="Journal impact factor"
        icon="trending-up"
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
    const content = screen.getByTestId('metric-content');

    expect(metric).toBeInTheDocument();
    expect(metric).toHaveClass('complex-metric');
    expect(metric).toHaveAttribute('role', 'button');
    expect(metric).toHaveAttribute('aria-label', 'Impact Factor: 3.42');
    expect(content).toHaveAttribute('data-label', 'Impact Factor');
    expect(content).toHaveAttribute('data-value', '3.42');
    expect(content).toHaveAttribute('data-layout', 'vertical');
    expect(content).toHaveAttribute('data-size', 'lg');
  });

  it('should handle loading state with full props', () => {
    render(
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
    expect(metric).toHaveAttribute('data-loading', 'true');
    expect(screen.queryByTestId('metric-content')).not.toBeInTheDocument();
  });
});

describe('MetricDisplay Error Handling', () => {
  it('should handle missing onClick gracefully', async () => {
    const user = userEvent.setup();
    render(<MetricDisplay label="Test" value={1} clickable data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    
    expect(() => user.click(metric)).not.toThrow();
  });

  it('should handle undefined trend gracefully', () => {
    render(<MetricDisplay label="Test" value={1} trend={undefined} data-testid="metric" />);
    
    // Component should render without errors when trend is undefined
    const metric = screen.getByTestId('metric');
    expect(metric).toBeInTheDocument();
    
    // Should contain label and value (they are combined in the component)
    expect(screen.getByText('Test: 1')).toBeInTheDocument();
  });

  it('should handle zero value correctly', () => {
    render(<MetricDisplay label="Count" value={0} data-testid="metric" />);
    
    const content = screen.getByTestId('metric-content');
    expect(content).toHaveAttribute('data-value', '0');
  });

  it('should handle string values correctly', () => {
    render(<MetricDisplay label="Status" value="Active" data-testid="metric" />);
    
    const content = screen.getByTestId('metric-content');
    expect(content).toHaveAttribute('data-value', 'Active');
  });

  it('should pass through custom props', () => {
    render(<MetricDisplay label="Test" value={1} id="custom-id" title="Custom title" data-testid="metric" />);
    
    const metric = screen.getByTestId('metric');
    expect(metric).toHaveAttribute('id', 'custom-id');
    expect(metric).toHaveAttribute('title', 'Custom title');
  });
});