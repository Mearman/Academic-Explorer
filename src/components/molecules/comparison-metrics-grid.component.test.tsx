/**
 * Unit tests for ComparisonMetricsGrid component
 */

import { MantineProvider } from '@mantine/core';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import type { ComparisonMetrics } from '@/hooks/use-comparison-data';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

import { ComparisonMetricsGrid } from './comparison-metrics-grid';

// Wrapper for Mantine components
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

// Mock metrics data
const mockAuthorMetrics1: ComparisonMetrics = {
  entityId: 'A123456789',
  entityName: 'John Smith',
  entityType: EntityType.AUTHOR,
  metrics: {
    citedByCount: {
      value: 2500,
      formatted: '2,500',
      isHighest: true,
      isLowest: false,
      rank: 1,
      percentile: 100
    },
    worksCount: {
      value: 150,
      formatted: '150',
      isHighest: false,
      isLowest: false,
      rank: 2,
      percentile: 67
    },
    hIndex: {
      value: 25,
      formatted: '25',
      isHighest: true,
      isLowest: false,
      rank: 1,
      percentile: 100
    }
  }
};

const mockAuthorMetrics2: ComparisonMetrics = {
  entityId: 'A987654321',
  entityName: 'Jane Doe',
  entityType: EntityType.AUTHOR,
  metrics: {
    citedByCount: {
      value: 1800,
      formatted: '1,800',
      isHighest: false,
      isLowest: true,
      rank: 2,
      percentile: 50
    },
    worksCount: {
      value: 220,
      formatted: '220',
      isHighest: true,
      isLowest: false,
      rank: 1,
      percentile: 100
    },
    hIndex: {
      value: 18,
      formatted: '18',
      isHighest: false,
      isLowest: true,
      rank: 2,
      percentile: 50
    }
  }
};

const mockWorkMetrics1: ComparisonMetrics = {
  entityId: 'W123456789',
  entityName: 'Machine Learning Applications',
  entityType: EntityType.WORK,
  metrics: {
    citedByCount: {
      value: 45,
      formatted: '45',
      isHighest: true,
      isLowest: false,
      rank: 1,
      percentile: 100
    },
    fwci: {
      value: 1.2,
      formatted: '1.2',
      isHighest: true,
      isLowest: false,
      rank: 1,
      percentile: 100
    },
    publicationYear: {
      value: 2023,
      formatted: '2023',
      isHighest: true,
      isLowest: false,
      rank: 1,
      percentile: 100
    }
  }
};

const mockWorkMetrics2: ComparisonMetrics = {
  entityId: 'W987654321',
  entityName: 'Data Science in Healthcare',
  entityType: EntityType.WORK,
  metrics: {
    citedByCount: {
      value: 28,
      formatted: '28',
      isHighest: false,
      isLowest: true,
      rank: 2,
      percentile: 50
    },
    fwci: {
      value: 0.8,
      formatted: '0.8',
      isHighest: false,
      isLowest: true,
      rank: 2,
      percentile: 50
    },
    publicationYear: {
      value: 2022,
      formatted: '2022',
      isHighest: false,
      isLowest: true,
      rank: 2,
      percentile: 50
    }
  }
};

describe('ComparisonMetricsGrid', () => {
  describe('Empty State', () => {
    it('should render empty state when no metrics provided', () => {
      render(
        <ComparisonMetricsGrid metrics={[]} />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText(/no metrics to compare/i)).toBeInTheDocument();
    });

    it('should render empty state when single entity provided', () => {
      render(
        <ComparisonMetricsGrid metrics={[mockAuthorMetrics1]} />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText(/add more entities to compare/i)).toBeInTheDocument();
    });
  });

  describe('Author Metrics Display', () => {
    it('should render author comparison grid', () => {
      render(
        <ComparisonMetricsGrid 
          metrics={[mockAuthorMetrics1, mockAuthorMetrics2]} 
        />,
        { wrapper: Wrapper }
      );
      
      // Check entity names
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      
      // Check metric values
      expect(screen.getByText('2,500')).toBeInTheDocument();
      expect(screen.getByText('1,800')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('220')).toBeInTheDocument();
    });

    it('should show author-specific metrics', () => {
      render(
        <ComparisonMetricsGrid 
          metrics={[mockAuthorMetrics1, mockAuthorMetrics2]} 
        />,
        { wrapper: Wrapper }
      );
      
      // Should show author-specific metrics
      expect(screen.getByText(/citations/i)).toBeInTheDocument();
      expect(screen.getByText(/works/i)).toBeInTheDocument();
      expect(screen.getByText(/h.index/i)).toBeInTheDocument();
    });

    it('should display rank indicators when enabled', () => {
      render(
        <ComparisonMetricsGrid 
          metrics={[mockAuthorMetrics1, mockAuthorMetrics2]}
          showRanks={true}
        />,
        { wrapper: Wrapper }
      );
      
      // Should show rank badges
      expect(screen.getAllByText('1')).toHaveLength(2); // Two metrics ranked #1
      expect(screen.getAllByText('2')).toHaveLength(2); // Two metrics ranked #2
    });
  });

  describe('Work Metrics Display', () => {
    it('should render work comparison grid', () => {
      render(
        <ComparisonMetricsGrid 
          metrics={[mockWorkMetrics1, mockWorkMetrics2]} 
        />,
        { wrapper: Wrapper }
      );
      
      // Check entity names
      expect(screen.getByText('Machine Learning Applications')).toBeInTheDocument();
      expect(screen.getByText('Data Science in Healthcare')).toBeInTheDocument();
      
      // Check metric values
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('28')).toBeInTheDocument();
    });

    it('should show work-specific metrics', () => {
      render(
        <ComparisonMetricsGrid 
          metrics={[mockWorkMetrics1, mockWorkMetrics2]} 
        />,
        { wrapper: Wrapper }
      );
      
      // Should show work-specific metrics
      expect(screen.getByText(/citations/i)).toBeInTheDocument();
      expect(screen.getByText(/fwci/i)).toBeInTheDocument();
      expect(screen.getByText(/publication year/i)).toBeInTheDocument();
    });
  });

  describe('Layout Options', () => {
    it('should render in table layout by default', () => {
      render(
        <ComparisonMetricsGrid 
          metrics={[mockAuthorMetrics1, mockAuthorMetrics2]} 
        />,
        { wrapper: Wrapper }
      );
      
      // Should render as table
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should render in cards layout when specified', () => {
      render(
        <ComparisonMetricsGrid 
          metrics={[mockAuthorMetrics1, mockAuthorMetrics2]}
          layout="cards"
        />,
        { wrapper: Wrapper }
      );
      
      // Should render as cards (no table)
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('should render in compact layout when specified', () => {
      render(
        <ComparisonMetricsGrid 
          metrics={[mockAuthorMetrics1, mockAuthorMetrics2]}
          layout="compact"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });
  });

  describe('Sorting and Ordering', () => {
    it('should sort by metric when sort option selected', () => {
      render(
        <ComparisonMetricsGrid 
          metrics={[mockAuthorMetrics1, mockAuthorMetrics2]}
          sortBy="citedByCount"
          sortOrder="desc"
        />,
        { wrapper: Wrapper }
      );
      
      // John Smith (2,500 citations) should appear before Jane Doe (1,800)
      const entities = screen.getAllByText(/John Smith|Jane Doe/);
      expect(entities[0]).toHaveTextContent('John Smith');
    });

    it('should sort in ascending order when specified', () => {
      render(
        <ComparisonMetricsGrid 
          metrics={[mockAuthorMetrics1, mockAuthorMetrics2]}
          sortBy="citedByCount"
          sortOrder="asc"
        />,
        { wrapper: Wrapper }
      );
      
      // Jane Doe (1,800 citations) should appear before John Smith (2,500)
      const entities = screen.getAllByText(/John Smith|Jane Doe/);
      expect(entities[0]).toHaveTextContent('Jane Doe');
    });
  });

  describe('Interactive Features', () => {
    it('should call onEntityClick when entity is clicked', () => {
      const handleEntityClick = vi.fn();
      
      render(
        <ComparisonMetricsGrid 
          metrics={[mockAuthorMetrics1, mockAuthorMetrics2]}
          onEntityClick={handleEntityClick}
        />,
        { wrapper: Wrapper }
      );
      
      const entityButton = screen.getByText('John Smith').closest('button');
      expect(entityButton).toBeInTheDocument();
      
      fireEvent.click(entityButton!);
      expect(handleEntityClick).toHaveBeenCalledWith('A123456789');
    });

    it('should call onMetricClick when metric is clicked', () => {
      const handleMetricClick = vi.fn();
      
      render(
        <ComparisonMetricsGrid 
          metrics={[mockAuthorMetrics1, mockAuthorMetrics2]}
          onMetricClick={handleMetricClick}
        />,
        { wrapper: Wrapper }
      );
      
      const metricButton = screen.getByText('2,500').closest('button');
      expect(metricButton).toBeInTheDocument();
      
      fireEvent.click(metricButton!);
      expect(handleMetricClick).toHaveBeenCalledWith('A123456789', 'citedByCount');
    });
  });

  describe('Highlighting and Emphasis', () => {
    it('should emphasize extreme values when enabled', () => {
      render(
        <ComparisonMetricsGrid 
          metrics={[mockAuthorMetrics1, mockAuthorMetrics2]}
          emphasizeExtremes={true}
        />,
        { wrapper: Wrapper }
      );
      
      // Should emphasize highest and lowest values
      expect(screen.getByText('2,500')).toBeInTheDocument();
      expect(screen.getByText('1,800')).toBeInTheDocument();
    });

    it('should highlight selected entity when specified', () => {
      render(
        <ComparisonMetricsGrid 
          metrics={[mockAuthorMetrics1, mockAuthorMetrics2]}
          highlightedEntity="A123456789"
        />,
        { wrapper: Wrapper }
      );
      
      // Should highlight John Smith's row/card
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render with small size', () => {
      render(
        <ComparisonMetricsGrid 
          metrics={[mockAuthorMetrics1, mockAuthorMetrics2]}
          size="sm"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });

    it('should render with large size', () => {
      render(
        <ComparisonMetricsGrid 
          metrics={[mockAuthorMetrics1, mockAuthorMetrics2]}
          size="lg"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should provide meaningful table headers', () => {
      render(
        <ComparisonMetricsGrid 
          metrics={[mockAuthorMetrics1, mockAuthorMetrics2]} 
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByRole('columnheader', { name: /entity/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /citations/i })).toBeInTheDocument();
    });

    it('should provide row and column labels for screen readers', () => {
      render(
        <ComparisonMetricsGrid 
          metrics={[mockAuthorMetrics1, mockAuthorMetrics2]} 
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByRole('table')).toHaveAttribute('aria-label');
    });
  });

  describe('Loading and Error States', () => {
    it('should render loading state when specified', () => {
      render(
        <ComparisonMetricsGrid 
          metrics={[]}
          loading={true}
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should render error state when specified', () => {
      render(
        <ComparisonMetricsGrid 
          metrics={[]}
          error="Failed to load metrics"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText(/failed to load metrics/i)).toBeInTheDocument();
    });
  });
});