/**
 * Unit tests for ComparisonMetricValue component
 */

import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import type { MetricComparison } from '@/hooks/use-comparison-data';

import { ComparisonMetricValue } from './comparison-metric-value';

// Wrapper for Mantine components
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

// Mock metric comparison data
const mockMetricHighest: MetricComparison = {
  value: 2500,
  formatted: '2,500',
  isHighest: true,
  isLowest: false,
  rank: 1,
  percentile: 100
};

const mockMetricMiddle: MetricComparison = {
  value: 1800,
  formatted: '1,800',
  isHighest: false,
  isLowest: false,
  rank: 2,
  percentile: 67
};

const mockMetricLowest: MetricComparison = {
  value: 950,
  formatted: '950',
  isHighest: false,
  isLowest: true,
  rank: 3,
  percentile: 33
};

describe('ComparisonMetricValue', () => {
  describe('Basic Rendering', () => {
    it('should render metric value', () => {
      render(
        <ComparisonMetricValue 
          metric={mockMetricHighest}
          label="Citations"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('2,500')).toBeInTheDocument();
      expect(screen.getByText('Citations')).toBeInTheDocument();
    });

    it('should render without label', () => {
      render(
        <ComparisonMetricValue metric={mockMetricHighest} />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('2,500')).toBeInTheDocument();
    });

    it('should render rank indicator', () => {
      render(
        <ComparisonMetricValue 
          metric={mockMetricHighest}
          showRank={true}
          totalEntities={3}
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Rank Display', () => {
    it('should show rank for highest performer', () => {
      render(
        <ComparisonMetricValue 
          metric={mockMetricHighest}
          showRank={true}
          totalEntities={3}
        />,
        { wrapper: Wrapper }
      );
      
      const rankIndicator = screen.getByLabelText(/ranked 1 out of 3.*highest/i);
      expect(rankIndicator).toBeInTheDocument();
    });

    it('should show rank for middle performer', () => {
      render(
        <ComparisonMetricValue 
          metric={mockMetricMiddle}
          showRank={true}
          totalEntities={3}
        />,
        { wrapper: Wrapper }
      );
      
      const rankIndicator = screen.getByLabelText(/ranked 2 out of 3/i);
      expect(rankIndicator).toBeInTheDocument();
    });

    it('should show rank for lowest performer', () => {
      render(
        <ComparisonMetricValue 
          metric={mockMetricLowest}
          showRank={true}
          totalEntities={3}
        />,
        { wrapper: Wrapper }
      );
      
      const rankIndicator = screen.getByLabelText(/ranked 3 out of 3.*lowest/i);
      expect(rankIndicator).toBeInTheDocument();
    });

    it('should show percentile when requested', () => {
      render(
        <ComparisonMetricValue 
          metric={mockMetricHighest}
          showRank={true}
          showPercentile={true}
          totalEntities={3}
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText(/100th/)).toBeInTheDocument();
    });
  });

  describe('Difference Display', () => {
    it('should show difference when comparison value provided', () => {
      render(
        <ComparisonMetricValue 
          metric={mockMetricHighest}
          showDifference={true}
          comparisonValue={2000}
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('+500')).toBeInTheDocument();
    });

    it('should show negative difference', () => {
      render(
        <ComparisonMetricValue 
          metric={mockMetricLowest}
          showDifference={true}
          comparisonValue={1200}
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('-250')).toBeInTheDocument();
    });

    it('should show zero difference', () => {
      render(
        <ComparisonMetricValue 
          metric={mockMetricMiddle}
          showDifference={true}
          comparisonValue={1800}
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should show percentage difference when requested', () => {
      render(
        <ComparisonMetricValue 
          metric={mockMetricHighest}
          showDifference={true}
          comparisonValue={2000}
          differenceType="percentage"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('+25.0%')).toBeInTheDocument();
    });

    it('should show ratio difference when requested', () => {
      render(
        <ComparisonMetricValue 
          metric={mockMetricHighest}
          showDifference={true}
          comparisonValue={1250}
          differenceType="ratio"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('2.0×')).toBeInTheDocument();
    });
  });

  describe('Layout Variants', () => {
    it('should render in horizontal layout', () => {
      render(
        <ComparisonMetricValue 
          metric={mockMetricHighest}
          label="Citations"
          layout="horizontal"
          showRank={true}
          totalEntities={3}
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('2,500')).toBeInTheDocument();
      expect(screen.getByText('Citations')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should render in vertical layout', () => {
      render(
        <ComparisonMetricValue 
          metric={mockMetricHighest}
          label="Citations"
          layout="vertical"
          showRank={true}
          totalEntities={3}
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('2,500')).toBeInTheDocument();
      expect(screen.getByText('Citations')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should render in compact layout', () => {
      render(
        <ComparisonMetricValue 
          metric={mockMetricHighest}
          label="Cit"
          layout="compact"
          showRank={true}
          totalEntities={3}
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('2,500')).toBeInTheDocument();
      expect(screen.getByText('Cit')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should render with small size', () => {
      render(
        <ComparisonMetricValue 
          metric={mockMetricHighest}
          size="sm"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('2,500')).toBeInTheDocument();
    });

    it('should render with large size', () => {
      render(
        <ComparisonMetricValue 
          metric={mockMetricHighest}
          size="lg"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('2,500')).toBeInTheDocument();
    });
  });

  describe('Interactive States', () => {
    it('should be clickable when onClick is provided', () => {
      const handleClick = vi.fn();
      
      render(
        <ComparisonMetricValue 
          metric={mockMetricHighest}
          onClick={handleClick}
        />,
        { wrapper: Wrapper }
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      
      button.click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not be clickable when onClick is not provided', () => {
      render(
        <ComparisonMetricValue metric={mockMetricHighest} />,
        { wrapper: Wrapper }
      );
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Emphasis Styling', () => {
    it('should emphasize highest performer', () => {
      render(
        <ComparisonMetricValue 
          metric={mockMetricHighest}
          emphasizeExtreme={true}
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByTestId(/metric-value/)).toHaveStyle({
        fontWeight: 'bold'
      });
    });

    it('should emphasize lowest performer', () => {
      render(
        <ComparisonMetricValue 
          metric={mockMetricLowest}
          emphasizeExtreme={true}
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByTestId(/metric-value/)).toHaveStyle({
        fontWeight: 'bold'
      });
    });

    it('should not emphasize middle performers', () => {
      render(
        <ComparisonMetricValue 
          metric={mockMetricMiddle}
          emphasizeExtreme={true}
        />,
        { wrapper: Wrapper }
      );
      
      const valueElement = screen.getByTestId(/metric-value/);
      expect(valueElement).not.toHaveStyle({
        fontWeight: 'bold'
      });
    });
  });

  describe('Accessibility', () => {
    it('should provide meaningful aria-label', () => {
      render(
        <ComparisonMetricValue 
          metric={mockMetricHighest}
          label="Citations"
          showRank={true}
          totalEntities={3}
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByLabelText(/citations.*2,500.*ranked 1/i)).toBeInTheDocument();
    });

    it('should include difference in aria-label when shown', () => {
      render(
        <ComparisonMetricValue 
          metric={mockMetricHighest}
          label="Citations"
          showDifference={true}
          comparisonValue={2000}
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByLabelText(/citations.*2,500.*500 higher/i)).toBeInTheDocument();
    });
  });

  describe('Custom Formatting', () => {
    it('should apply custom formatters', () => {
      const customFormatter = (value: number) => `${value} items`;
      
      render(
        <ComparisonMetricValue 
          metric={{
            ...mockMetricHighest,
            formatted: customFormatter(mockMetricHighest.value)
          }}
          label="Custom"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('2500 items')).toBeInTheDocument();
    });
  });
});