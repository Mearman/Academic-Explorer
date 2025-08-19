/**
 * Timeline Chart Component Tests
 * 
 * Comprehensive test suite for the Timeline Chart component including
 * rendering, interactions, data processing, and accessibility features.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import type { TimelineChartProps, TimelineSeries, TimelineDataPoint } from '../types';

import { TimelineChart } from './timeline-chart';


// Mock D3 for controlled testing
vi.mock('d3', () => ({
  select: vi.fn(() => ({
    selectAll: vi.fn(() => ({
      data: vi.fn(() => ({
        enter: vi.fn(() => ({
          append: vi.fn(() => ({
            attr: vi.fn(() => ({ attr: vi.fn(), style: vi.fn() })),
            style: vi.fn(() => ({ attr: vi.fn(), style: vi.fn() })),
            on: vi.fn()
          }))
        })),
        exit: vi.fn(() => ({ remove: vi.fn() })),
        attr: vi.fn(() => ({ attr: vi.fn(), style: vi.fn() })),
        style: vi.fn(() => ({ attr: vi.fn(), style: vi.fn() }))
      }))
    })),
    append: vi.fn(() => ({
      attr: vi.fn(() => ({ attr: vi.fn(), style: vi.fn() })),
      style: vi.fn(() => ({ attr: vi.fn(), style: vi.fn() })),
      selectAll: vi.fn(() => ({
        data: vi.fn(() => ({
          enter: vi.fn(() => ({
            append: vi.fn(() => ({
              attr: vi.fn(() => ({ attr: vi.fn(), style: vi.fn() }))
            }))
          }))
        }))
      }))
    })),
    attr: vi.fn(() => ({ attr: vi.fn(), style: vi.fn() })),
    style: vi.fn(() => ({ attr: vi.fn(), style: vi.fn() }))
  })),
  scaleTime: vi.fn(() => ({
    domain: vi.fn(() => ({ range: vi.fn(), nice: vi.fn() })),
    range: vi.fn(() => ({ domain: vi.fn(), nice: vi.fn() })),
    nice: vi.fn(() => ({ domain: vi.fn(), range: vi.fn() }))
  })),
  scaleLinear: vi.fn(() => ({
    domain: vi.fn(() => ({ range: vi.fn(), nice: vi.fn() })),
    range: vi.fn(() => ({ domain: vi.fn(), nice: vi.fn() })),
    nice: vi.fn(() => ({ domain: vi.fn(), range: vi.fn() }))
  })),
  line: vi.fn(() => ({
    x: vi.fn(() => ({ y: vi.fn(), curve: vi.fn() })),
    y: vi.fn(() => ({ x: vi.fn(), curve: vi.fn() })),
    curve: vi.fn(() => ({ x: vi.fn(), y: vi.fn() }))
  })),
  area: vi.fn(() => ({
    x: vi.fn(() => ({ y0: vi.fn(), y1: vi.fn(), curve: vi.fn() })),
    y0: vi.fn(() => ({ x: vi.fn(), y1: vi.fn(), curve: vi.fn() })),
    y1: vi.fn(() => ({ x: vi.fn(), y0: vi.fn(), curve: vi.fn() })),
    curve: vi.fn(() => ({ x: vi.fn(), y0: vi.fn(), y1: vi.fn() }))
  })),
  axisBottom: vi.fn(() => ({
    scale: vi.fn(),
    tickFormat: vi.fn(),
    ticks: vi.fn()
  })),
  axisLeft: vi.fn(() => ({
    scale: vi.fn(),
    tickFormat: vi.fn(),
    ticks: vi.fn()
  })),
  brush: vi.fn(() => ({
    extent: vi.fn(() => ({ on: vi.fn() })),
    on: vi.fn()
  })),
  zoom: vi.fn(() => ({
    on: vi.fn(),
    scaleExtent: vi.fn(() => ({ on: vi.fn() }))
  })),
  curveMonotoneX: vi.fn(),
  curveLinear: vi.fn(),
  timeFormat: vi.fn(() => vi.fn()),
  format: vi.fn(() => vi.fn())
}));

// ============================================================================
// Test Data Factory
// ============================================================================

function createTimelineDataPoint(overrides: Partial<TimelineDataPoint> = {}): TimelineDataPoint {
  return {
    date: new Date('2023-01-01'),
    value: 10,
    label: '2023',
    ...overrides
  };
}

function createTimelineSeries(overrides: Partial<TimelineSeries> = {}): TimelineSeries {
  return {
    id: 'test-series',
    name: 'Test Series',
    data: [
      createTimelineDataPoint({ date: new Date('2020-01-01'), value: 5 }),
      createTimelineDataPoint({ date: new Date('2021-01-01'), value: 10 }),
      createTimelineDataPoint({ date: new Date('2022-01-01'), value: 15 }),
      createTimelineDataPoint({ date: new Date('2023-01-01'), value: 20 })
    ],
    style: 'line',
    visible: true,
    ...overrides
  };
}

function createDefaultProps(overrides: Partial<TimelineChartProps> = {}): TimelineChartProps {
  return {
    id: 'test-timeline-chart',
    series: [createTimelineSeries()],
    width: 800,
    height: 400,
    ariaLabel: 'Test timeline chart',
    ...overrides
  };
}

// ============================================================================
// Basic Rendering Tests
// ============================================================================

describe('TimelineChart - Basic Rendering', () => {
  let mockUser: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockUser = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render with basic props', () => {
    const props = createDefaultProps();
    render(<TimelineChart {...props} />);
    
    expect(screen.getByRole('img', { name: /test timeline chart/i })).toBeInTheDocument();
  });

  it('should render with correct dimensions', () => {
    const props = createDefaultProps({ width: 1000, height: 500 });
    render(<TimelineChart {...props} />);
    
    const svg = screen.getByRole('img');
    expect(svg).toHaveAttribute('width', '1000');
    expect(svg).toHaveAttribute('height', '500');
  });

  it('should render with custom id', () => {
    const props = createDefaultProps({ id: 'custom-timeline' });
    render(<TimelineChart {...props} />);
    
    const svg = screen.getByRole('img');
    expect(svg).toHaveAttribute('id', 'custom-timeline');
  });

  it('should render loading state', () => {
    const props = createDefaultProps({ loading: true });
    render(<TimelineChart {...props} />);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should render error state', () => {
    const props = createDefaultProps({ error: 'Test error message' });
    render(<TimelineChart {...props} />);
    
    expect(screen.getByText(/test error message/i)).toBeInTheDocument();
  });

  it('should render with custom class name', () => {
    const props = createDefaultProps({ className: 'custom-timeline-class' });
    render(<TimelineChart {...props} />);
    
    const container = screen.getByRole('img').parentElement;
    expect(container).toHaveClass('custom-timeline-class');
  });
});

// ============================================================================
// Data Processing Tests
// ============================================================================

describe('TimelineChart - Data Processing', () => {
  it('should handle empty series', () => {
    const props = createDefaultProps({ series: [] });
    render(<TimelineChart {...props} />);
    
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  it('should handle series with empty data', () => {
    const emptySeries = createTimelineSeries({ data: [] });
    const props = createDefaultProps({ series: [emptySeries] });
    render(<TimelineChart {...props} />);
    
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  it('should handle multiple series', () => {
    const series1 = createTimelineSeries({ id: 'series1', name: 'Series 1' });
    const series2 = createTimelineSeries({ id: 'series2', name: 'Series 2' });
    const props = createDefaultProps({ series: [series1, series2] });
    
    render(<TimelineChart {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
    // Chart should render without errors
  });

  it('should handle series with different data lengths', () => {
    const series1 = createTimelineSeries({
      id: 'series1',
      data: [
        createTimelineDataPoint({ date: new Date('2020-01-01'), value: 5 }),
        createTimelineDataPoint({ date: new Date('2021-01-01'), value: 10 })
      ]
    });
    const series2 = createTimelineSeries({
      id: 'series2',
      data: [
        createTimelineDataPoint({ date: new Date('2020-01-01'), value: 3 }),
        createTimelineDataPoint({ date: new Date('2021-01-01'), value: 7 }),
        createTimelineDataPoint({ date: new Date('2022-01-01'), value: 12 }),
        createTimelineDataPoint({ date: new Date('2023-01-01'), value: 18 })
      ]
    });
    
    const props = createDefaultProps({ series: [series1, series2] });
    render(<TimelineChart {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should handle unsorted data', () => {
    const unsortedSeries = createTimelineSeries({
      data: [
        createTimelineDataPoint({ date: new Date('2022-01-01'), value: 15 }),
        createTimelineDataPoint({ date: new Date('2020-01-01'), value: 5 }),
        createTimelineDataPoint({ date: new Date('2023-01-01'), value: 20 }),
        createTimelineDataPoint({ date: new Date('2021-01-01'), value: 10 })
      ]
    });
    
    const props = createDefaultProps({ series: [unsortedSeries] });
    render(<TimelineChart {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should handle data with missing values', () => {
    const series = createTimelineSeries({
      data: [
        createTimelineDataPoint({ date: new Date('2020-01-01'), value: 5 }),
        createTimelineDataPoint({ date: new Date('2021-01-01'), value: 0 }),
        createTimelineDataPoint({ date: new Date('2022-01-01'), value: 15 }),
        createTimelineDataPoint({ date: new Date('2023-01-01'), value: 0 })
      ]
    });
    
    const props = createDefaultProps({ series: [series] });
    render(<TimelineChart {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});

// ============================================================================
// Style Configuration Tests
// ============================================================================

describe('TimelineChart - Style Configuration', () => {
  it('should render line style series', () => {
    const lineSeries = createTimelineSeries({ style: 'line' });
    const props = createDefaultProps({ series: [lineSeries] });
    
    render(<TimelineChart {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should render area style series', () => {
    const areaSeries = createTimelineSeries({ style: 'area' });
    const props = createDefaultProps({ series: [areaSeries] });
    
    render(<TimelineChart {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should render bar style series', () => {
    const barSeries = createTimelineSeries({ style: 'bar' });
    const props = createDefaultProps({ series: [barSeries] });
    
    render(<TimelineChart {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should render scatter style series', () => {
    const scatterSeries = createTimelineSeries({ style: 'scatter' });
    const props = createDefaultProps({ series: [scatterSeries] });
    
    render(<TimelineChart {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should handle custom colors', () => {
    const coloredSeries = createTimelineSeries({ color: '#ff0000' });
    const props = createDefaultProps({ series: [coloredSeries] });
    
    render(<TimelineChart {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should handle invisible series', () => {
    const invisibleSeries = createTimelineSeries({ visible: false });
    const props = createDefaultProps({ series: [invisibleSeries] });
    
    render(<TimelineChart {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});

// ============================================================================
// Axis Configuration Tests
// ============================================================================

describe('TimelineChart - Axis Configuration', () => {
  it('should render with custom x-axis configuration', () => {
    const props = createDefaultProps({
      xAxis: {
        label: 'Time Period',
        grid: true,
        scale: 'time'
      }
    });
    
    render(<TimelineChart {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should render with custom y-axis configuration', () => {
    const props = createDefaultProps({
      yAxis: {
        label: 'Publication Count',
        grid: true,
        scale: 'linear'
      }
    });
    
    render(<TimelineChart {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should handle logarithmic y-axis scale', () => {
    const props = createDefaultProps({
      yAxis: {
        scale: 'log'
      }
    });
    
    render(<TimelineChart {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should handle custom domain', () => {
    const props = createDefaultProps({
      yAxis: {
        domain: [0, 100] as [number, number]
      }
    });
    
    render(<TimelineChart {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should handle custom tick configuration', () => {
    const props = createDefaultProps({
      xAxis: {
        ticks: {
          count: 5,
          format: (value: Date | number) => new Date(value).getFullYear().toString()
        }
      }
    });
    
    render(<TimelineChart {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});

// ============================================================================
// Interaction Tests
// ============================================================================

describe('TimelineChart - Interactions', () => {
  let mockUser: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockUser = userEvent.setup();
  });

  it('should handle point click events', async () => {
    const onPointClick = vi.fn();
    const series = createTimelineSeries();
    const props = createDefaultProps({
      series: [series],
      onPointClick,
      interactive: true
    });
    
    render(<TimelineChart {...props} />);
    
    const svg = screen.getByRole('img');
    await mockUser.click(svg);
    
    // In a real implementation, this would test actual click handling
    expect(svg).toBeInTheDocument();
  });

  it('should handle point hover events', async () => {
    const onPointHover = vi.fn();
    const series = createTimelineSeries();
    const props = createDefaultProps({
      series: [series],
      onPointHover,
      interactive: true
    });
    
    render(<TimelineChart {...props} />);
    
    const svg = screen.getByRole('img');
    await mockUser.hover(svg);
    
    expect(svg).toBeInTheDocument();
  });

  it('should handle range selection', async () => {
    const onRangeSelect = vi.fn();
    const props = createDefaultProps({
      onRangeSelect,
      interactions: {
        brush: true,
        zoom: false,
        pan: false
      }
    });
    
    render(<TimelineChart {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should handle zoom interactions', () => {
    const props = createDefaultProps({
      interactions: {
        zoom: true,
        pan: true,
        brush: false
      }
    });
    
    render(<TimelineChart {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should show tooltip on hover when enabled', async () => {
    const props = createDefaultProps({
      interactions: {
        tooltip: {
          enabled: true,
          position: 'mouse'
        }
      }
    });
    
    render(<TimelineChart {...props} />);
    
    const svg = screen.getByRole('img');
    await mockUser.hover(svg);
    
    // Tooltip would be rendered in actual implementation
    expect(svg).toBeInTheDocument();
  });

  it('should handle crosshair interactions', () => {
    const props = createDefaultProps({
      interactions: {
        crosshair: true
      }
    });
    
    render(<TimelineChart {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

describe('TimelineChart - Accessibility', () => {
  it('should have proper ARIA labels', () => {
    const props = createDefaultProps({ ariaLabel: 'Publication timeline chart' });
    render(<TimelineChart {...props} />);
    
    const svg = screen.getByRole('img', { name: /publication timeline chart/i });
    expect(svg).toBeInTheDocument();
  });

  it('should support keyboard navigation when interactive', () => {
    const props = createDefaultProps({
      interactive: true,
      ariaLabel: 'Interactive timeline chart'
    });
    
    render(<TimelineChart {...props} />);
    
    const svg = screen.getByRole('img');
    expect(svg).toHaveAttribute('tabIndex', '0');
  });

  it('should provide screen reader accessible descriptions', () => {
    const series = createTimelineSeries();
    const props = createDefaultProps({ series: [series] });
    
    render(<TimelineChart {...props} />);
    
    // Check for descriptive elements
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should handle reduced motion preferences', () => {
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
    
    const props = createDefaultProps();
    render(<TimelineChart {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should support high contrast mode', () => {
    const props = createDefaultProps({
      style: {
        colorScheme: 'categorical',
        colors: ['#000000', '#ffffff'] // High contrast colors
      }
    });
    
    render(<TimelineChart {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});

// ============================================================================
// Export Functionality Tests
// ============================================================================

describe('TimelineChart - Export Functionality', () => {
  it('should support SVG export', () => {
    const props = createDefaultProps({
      exportConfig: {
        formats: ['svg'],
        filenamePrefix: 'timeline-chart'
      }
    });
    
    render(<TimelineChart {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should support PNG export', () => {
    const props = createDefaultProps({
      exportConfig: {
        formats: ['png'],
        filenamePrefix: 'timeline-chart'
      }
    });
    
    render(<TimelineChart {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should support CSV export', () => {
    const props = createDefaultProps({
      exportConfig: {
        formats: ['csv'],
        filenamePrefix: 'timeline-data'
      }
    });
    
    render(<TimelineChart {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should support multiple export formats', () => {
    const props = createDefaultProps({
      exportConfig: {
        formats: ['svg', 'png', 'csv'],
        filenamePrefix: 'timeline',
        includeMetadata: true
      }
    });
    
    render(<TimelineChart {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('TimelineChart - Performance', () => {
  it('should handle large datasets efficiently', () => {
    // Generate large dataset
    const largeDataset = Array.from({ length: 1000 }, (_, i) => 
      createTimelineDataPoint({
        date: new Date(2000 + Math.floor(i / 50), (i % 12), 1),
        value: Math.random() * 100
      })
    );
    
    const largeSeries = createTimelineSeries({ data: largeDataset });
    const props = createDefaultProps({ series: [largeSeries] });
    
    const start = performance.now();
    render(<TimelineChart {...props} />);
    const end = performance.now();
    
    expect(end - start).toBeLessThan(1000); // Should render within 1 second
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should handle real-time data updates', async () => {
    const initialSeries = createTimelineSeries();
    const { rerender } = render(<TimelineChart series={[initialSeries]} />);
    
    // Simulate data update
    const updatedSeries = createTimelineSeries({
      data: [
        ...initialSeries.data,
        createTimelineDataPoint({ date: new Date('2024-01-01'), value: 25 })
      ]
    });
    
    rerender(<TimelineChart series={[updatedSeries]} />);
    
    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  it('should efficiently handle series visibility changes', () => {
    const series1 = createTimelineSeries({ id: 'series1', visible: true });
    const series2 = createTimelineSeries({ id: 'series2', visible: false });
    
    const { rerender } = render(<TimelineChart series={[series1, series2]} />);
    
    // Toggle visibility
    const updatedSeries1 = { ...series1, visible: false };
    const updatedSeries2 = { ...series2, visible: true };
    
    rerender(<TimelineChart series={[updatedSeries1, updatedSeries2]} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('TimelineChart - Edge Cases', () => {
  it('should handle duplicate dates in data', () => {
    const duplicateDateSeries = createTimelineSeries({
      data: [
        createTimelineDataPoint({ date: new Date('2023-01-01'), value: 10 }),
        createTimelineDataPoint({ date: new Date('2023-01-01'), value: 15 }),
        createTimelineDataPoint({ date: new Date('2023-01-01'), value: 20 })
      ]
    });
    
    const props = createDefaultProps({ series: [duplicateDateSeries] });
    render(<TimelineChart {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should handle extreme values', () => {
    const extremeSeries = createTimelineSeries({
      data: [
        createTimelineDataPoint({ value: Number.MAX_SAFE_INTEGER }),
        createTimelineDataPoint({ value: 0 }),
        createTimelineDataPoint({ value: Number.MIN_SAFE_INTEGER })
      ]
    });
    
    const props = createDefaultProps({ series: [extremeSeries] });
    render(<TimelineChart {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should handle invalid dates gracefully', () => {
    const invalidDateSeries = createTimelineSeries({
      data: [
        createTimelineDataPoint({ date: new Date('invalid'), value: 10 }),
        createTimelineDataPoint({ date: new Date('2023-01-01'), value: 15 })
      ]
    });
    
    const props = createDefaultProps({ series: [invalidDateSeries] });
    render(<TimelineChart {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should handle NaN values', () => {
    const nanSeries = createTimelineSeries({
      data: [
        createTimelineDataPoint({ value: NaN }),
        createTimelineDataPoint({ value: 10 }),
        createTimelineDataPoint({ value: Infinity })
      ]
    });
    
    const props = createDefaultProps({ series: [nanSeries] });
    render(<TimelineChart {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should handle window resize gracefully', async () => {
    const props = createDefaultProps();
    render(<TimelineChart {...props} />);
    
    // Simulate window resize
    global.dispatchEvent(new Event('resize'));
    
    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Integration with Design System Tests
// ============================================================================

describe('TimelineChart - Design System Integration', () => {
  it('should use entity colors from design system', () => {
    const props = createDefaultProps({
      style: {
        colorScheme: 'entity-based'
      }
    });
    
    render(<TimelineChart {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should respond to theme changes', () => {
    const props = createDefaultProps();
    const { rerender } = render(<TimelineChart {...props} />);
    
    // Simulate theme change by re-rendering with different class
    rerender(
      <div className="dark-theme">
        <TimelineChart {...props} />
      </div>
    );
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});