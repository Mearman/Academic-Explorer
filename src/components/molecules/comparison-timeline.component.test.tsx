/**
 * Unit tests for ComparisonTimeline component
 * Tests temporal visualization of comparison data with overlays and interactions
 */

import { MantineProvider } from '@mantine/core';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { EntityType } from '@/lib/openalex/utils/entity-detection';
import type { ComparisonEntity } from '@/stores/comparison-store';

import { ComparisonTimeline } from './comparison-timeline';

// Mock data utilities
const createMockEntity = (overrides: Partial<ComparisonEntity> = {}): ComparisonEntity => ({
  id: 'test-entity-1',
  type: EntityType.AUTHOR,
  addedAt: Date.now(),
  data: {
    id: 'A123456789',
    display_name: 'Test Author',
    works_count: 10,
    cited_by_count: 100,
    last_known_institutions: [],
    affiliations: [],
    created_date: '2020-01-01',
    updated_date: '2023-01-01'
  },
  ...overrides
});

// Test data
const mockTimelineData = [
  {
    entityId: 'entity-1',
    entityName: 'Author 1',
    dataPoints: [
      { year: 2020, value: 5, label: 'Publications: 5' },
      { year: 2021, value: 8, label: 'Publications: 8' },
      { year: 2022, value: 12, label: 'Publications: 12' },
      { year: 2023, value: 10, label: 'Publications: 10' }
    ]
  },
  {
    entityId: 'entity-2',
    entityName: 'Author 2',
    dataPoints: [
      { year: 2020, value: 3, label: 'Publications: 3' },
      { year: 2021, value: 6, label: 'Publications: 6' },
      { year: 2022, value: 9, label: 'Publications: 9' },
      { year: 2023, value: 15, label: 'Publications: 15' }
    ]
  }
];

// Wrapper for Mantine components
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

// Mock the D3 timeline chart since it requires DOM manipulation
vi.mock('@/components/atoms/d3-timeline-chart', () => ({
  D3TimelineChart: ({ data, onPointHover, onPointClick, ...props }: any) => (
    <div 
      data-testid="d3-timeline-chart" 
      {...props}
    >
      {data.map((series: any, index: number) => (
        <div key={series.entityId} data-testid={`timeline-series-${index}`}>
          <div data-testid="series-name">{series.entityName}</div>
          {series.dataPoints.map((point: any, pointIndex: number) => (
            <div 
              key={`${series.entityId}-${point.year}-${pointIndex}`}
              data-testid={`data-point-${series.entityId}-${point.year}`}
              onClick={() => onPointClick?.(point, series)}
              onMouseEnter={() => onPointHover?.(point, series)}
              style={{ cursor: 'pointer' }}
            >
              {point.year}: {point.value}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}));

describe('ComparisonTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render timeline chart with data', () => {
      render(
        <ComparisonTimeline 
          data={mockTimelineData}
          metric="works_count"
          title="Publication Timeline"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByTestId('d3-timeline-chart')).toBeInTheDocument();
      expect(screen.getByText('Publication Timeline')).toBeInTheDocument();
    });

    it('should render all entity series', () => {
      render(
        <ComparisonTimeline 
          data={mockTimelineData}
          metric="works_count"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByTestId('timeline-series-0')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-series-1')).toBeInTheDocument();
      expect(screen.getAllByText('Author 1')).toHaveLength(2); // Chart + Legend
      expect(screen.getAllByText('Author 2')).toHaveLength(2); // Chart + Legend
    });

    it('should display metric description when provided', () => {
      render(
        <ComparisonTimeline 
          data={mockTimelineData}
          metric="works_count"
          description="Number of published works over time"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('Number of published works over time')).toBeInTheDocument();
    });
  });

  describe('Interactive Features', () => {
    it('should handle point hover events', () => {
      const handlePointHover = vi.fn();
      
      render(
        <ComparisonTimeline 
          data={mockTimelineData}
          metric="works_count"
          onPointHover={handlePointHover}
        />,
        { wrapper: Wrapper }
      );
      
      const dataPoint = screen.getByTestId('data-point-entity-1-2020');
      fireEvent.mouseEnter(dataPoint);
      
      expect(handlePointHover).toHaveBeenCalledTimes(1);
    });

    it('should handle point click events', () => {
      const handlePointClick = vi.fn();
      
      render(
        <ComparisonTimeline 
          data={mockTimelineData}
          metric="works_count"
          onPointClick={handlePointClick}
        />,
        { wrapper: Wrapper }
      );
      
      const dataPoint = screen.getByTestId('data-point-entity-1-2021');
      fireEvent.click(dataPoint);
      
      expect(handlePointClick).toHaveBeenCalledTimes(1);
    });

    it('should handle entity selection', () => {
      const handleEntitySelect = vi.fn();
      
      render(
        <ComparisonTimeline 
          data={mockTimelineData}
          metric="works_count"
          showEntitySelector={true}
          onEntitySelect={handleEntitySelect}
        />,
        { wrapper: Wrapper }
      );
      
      // Look for entity selector
      const entitySelector = screen.getByLabelText(/select entities to display/i);
      expect(entitySelector).toBeInTheDocument();
    });
  });

  describe('Layout Options', () => {
    it('should render in overlay layout', () => {
      render(
        <ComparisonTimeline 
          data={mockTimelineData}
          metric="works_count"
          layout="overlay"
        />,
        { wrapper: Wrapper }
      );
      
      const chart = screen.getByTestId('d3-timeline-chart');
      expect(chart).toHaveAttribute('data-layout', 'overlay');
    });

    it('should render in stacked layout', () => {
      render(
        <ComparisonTimeline 
          data={mockTimelineData}
          metric="works_count"
          layout="stacked"
        />,
        { wrapper: Wrapper }
      );
      
      const chart = screen.getByTestId('d3-timeline-chart');
      expect(chart).toHaveAttribute('data-layout', 'stacked');
    });

    it('should render in separate layout', () => {
      render(
        <ComparisonTimeline 
          data={mockTimelineData}
          metric="works_count"
          layout="separate"
        />,
        { wrapper: Wrapper }
      );
      
      const chart = screen.getByTestId('d3-timeline-chart');
      expect(chart).toHaveAttribute('data-layout', 'separate');
    });
  });

  describe('Data Visualization Options', () => {
    it('should show trend lines when enabled', () => {
      render(
        <ComparisonTimeline 
          data={mockTimelineData}
          metric="works_count"
          showTrendLines={true}
        />,
        { wrapper: Wrapper }
      );
      
      const chart = screen.getByTestId('d3-timeline-chart');
      expect(chart).toHaveAttribute('data-show-trend-lines', 'true');
    });

    it('should show confidence intervals when enabled', () => {
      render(
        <ComparisonTimeline 
          data={mockTimelineData}
          metric="works_count"
          showConfidenceIntervals={true}
        />,
        { wrapper: Wrapper }
      );
      
      const chart = screen.getByTestId('d3-timeline-chart');
      expect(chart).toHaveAttribute('data-show-confidence-intervals', 'true');
    });

    it('should animate transitions when enabled', () => {
      render(
        <ComparisonTimeline 
          data={mockTimelineData}
          metric="works_count"
          animate={true}
        />,
        { wrapper: Wrapper }
      );
      
      const chart = screen.getByTestId('d3-timeline-chart');
      expect(chart).toHaveAttribute('data-animate', 'true');
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading skeleton when loading', () => {
      render(
        <ComparisonTimeline 
          data={[]}
          metric="works_count"
          loading={true}
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('Loading timeline data...')).toBeInTheDocument();
      expect(screen.queryByTestId('d3-timeline-chart')).not.toBeInTheDocument();
    });

    it('should show error message when error occurs', () => {
      render(
        <ComparisonTimeline 
          data={[]}
          metric="works_count"
          error="Failed to load timeline data"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('Failed to load timeline data')).toBeInTheDocument();
      expect(screen.queryByTestId('d3-timeline-chart')).not.toBeInTheDocument();
    });

    it('should show empty state when no data', () => {
      render(
        <ComparisonTimeline 
          data={[]}
          metric="works_count"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('No Timeline Data')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to small screens', () => {
      render(
        <ComparisonTimeline 
          data={mockTimelineData}
          metric="works_count"
          size="sm"
        />,
        { wrapper: Wrapper }
      );
      
      const chart = screen.getByTestId('d3-timeline-chart');
      expect(chart).toHaveAttribute('data-size', 'sm');
    });

    it('should adapt to large screens', () => {
      render(
        <ComparisonTimeline 
          data={mockTimelineData}
          metric="works_count"
          size="lg"
        />,
        { wrapper: Wrapper }
      );
      
      const chart = screen.getByTestId('d3-timeline-chart');
      expect(chart).toHaveAttribute('data-size', 'lg');
    });
  });

  describe('Accessibility', () => {
    it('should provide meaningful labels', () => {
      render(
        <ComparisonTimeline 
          data={mockTimelineData}
          metric="works_count"
          title="Publication Timeline"
        />,
        { wrapper: Wrapper }
      );
      
      // The chart should have an accessible label
      const chart = screen.getByTestId('d3-timeline-chart');
      expect(chart).toHaveAttribute('aria-label');
      expect(chart.getAttribute('aria-label')).toMatch(/timeline/i);
    });

    it('should support keyboard navigation', () => {
      render(
        <ComparisonTimeline 
          data={mockTimelineData}
          metric="works_count"
          showEntitySelector={true}
        />,
        { wrapper: Wrapper }
      );
      
      const chart = screen.getByTestId('d3-timeline-chart');
      expect(chart).toHaveAttribute('tabIndex', '0');
    });

    it('should provide screen reader descriptions', () => {
      render(
        <ComparisonTimeline 
          data={mockTimelineData}
          metric="works_count"
          title="Publication Timeline"
        />,
        { wrapper: Wrapper }
      );
      
      // Check that the aria-label contains descriptive information
      const chart = screen.getByTestId('d3-timeline-chart');
      const ariaLabel = chart.getAttribute('aria-label');
      expect(ariaLabel).toMatch(/timeline/i);
      expect(ariaLabel).toMatch(/entities/i);
    });
  });

  describe('Export Functionality', () => {
    it('should show export options when enabled', () => {
      render(
        <ComparisonTimeline 
          data={mockTimelineData}
          metric="works_count"
          showExportOptions={true}
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByLabelText(/export timeline/i)).toBeInTheDocument();
    });

    it('should handle export callbacks', () => {
      const handleExport = vi.fn();
      
      render(
        <ComparisonTimeline 
          data={mockTimelineData}
          metric="works_count"
          showExportOptions={true}
          onExport={handleExport}
        />,
        { wrapper: Wrapper }
      );
      
      const exportButton = screen.getByLabelText(/export timeline/i);
      fireEvent.click(exportButton);
      
      expect(handleExport).toHaveBeenCalledWith('svg', expect.arrayContaining([
        expect.objectContaining({
          entityId: 'entity-1',
          entityName: 'Author 1',
          dataPoints: expect.any(Array)
        }),
        expect.objectContaining({
          entityId: 'entity-2',
          entityName: 'Author 2',
          dataPoints: expect.any(Array)
        })
      ]));
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom class names', () => {
      render(
        <ComparisonTimeline 
          data={mockTimelineData}
          metric="works_count"
          className="custom-timeline"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByTestId('d3-timeline-chart').closest('.custom-timeline')).toBeInTheDocument();
    });

    it('should apply custom test id', () => {
      render(
        <ComparisonTimeline 
          data={mockTimelineData}
          metric="works_count"
          data-testid="custom-timeline"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByTestId('custom-timeline')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single entity timeline', () => {
      const singleEntityData = [mockTimelineData[0]];
      
      render(
        <ComparisonTimeline 
          data={singleEntityData}
          metric="works_count"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByTestId('timeline-series-0')).toBeInTheDocument();
      expect(screen.queryByTestId('timeline-series-1')).not.toBeInTheDocument();
    });

    it('should handle missing data points', () => {
      const sparseData = [{
        entityId: 'entity-1',
        entityName: 'Author 1',
        dataPoints: [
          { year: 2020, value: 5, label: 'Publications: 5' },
          // Missing 2021, 2022
          { year: 2023, value: 10, label: 'Publications: 10' }
        ]
      }];
      
      render(
        <ComparisonTimeline 
          data={sparseData}
          metric="works_count"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByTestId('data-point-entity-1-2020')).toBeInTheDocument();
      expect(screen.getByTestId('data-point-entity-1-2023')).toBeInTheDocument();
    });

    it('should handle very large datasets', () => {
      const largeData = Array.from({ length: 10 }, (_, i) => ({
        entityId: `entity-${i}`,
        entityName: `Entity ${i}`,
        dataPoints: Array.from({ length: 20 }, (_, year) => ({
          year: 2000 + year,
          value: Math.random() * 100,
          label: `Value: ${Math.random() * 100}`
        }))
      }));
      
      render(
        <ComparisonTimeline 
          data={largeData}
          metric="works_count"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByTestId('d3-timeline-chart')).toBeInTheDocument();
    });
  });
});