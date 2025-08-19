/**
 * Unit tests for ComparisonSummary component
 */

import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import type { ComparisonAnalysis } from '@/hooks/use-comparison-data';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

import { ComparisonSummary } from './comparison-summary';

// Wrapper for Mantine components
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

// Mock analysis data
const mockAuthorAnalysis: ComparisonAnalysis = {
  entityType: EntityType.AUTHOR,
  entityCount: 3,
  summary: {
    totalEntities: 3,
    hasCompleteData: true,
    averageCitations: 2100,
    medianCitations: 1800
  },
  topPerformers: {
    citedByCount: 'A123456789',
    worksCount: 'A987654321',
    hIndex: 'A123456789'
  },
  spreads: {
    citedByCount: {
      min: 950,
      max: 3200,
      range: 2250,
      mean: 2100,
      median: 1800,
      ratio: 3.37
    },
    worksCount: {
      min: 95,
      max: 220,
      range: 125,
      mean: 155,
      median: 150,
      ratio: 2.32
    }
  },
  insights: [
    {
      type: 'leader',
      entityId: 'A123456789',
      message: 'John Smith leads in citations with 3,200 citations.',
      confidence: 1.0,
      data: { metric: 'citedByCount', value: 3200 }
    },
    {
      type: 'outlier',
      entityId: 'A123456789',
      message: 'John Smith has significantly more citations than others.',
      confidence: 0.8,
      data: { ratio: 3.37 }
    },
    {
      type: 'statistical',
      message: 'High variability in citations detected with coefficient of variation of 1.5.',
      confidence: 0.7,
      data: { coefficient: 1.5, range: 2250 }
    }
  ]
};

const mockWorkAnalysis: ComparisonAnalysis = {
  entityType: EntityType.WORK,
  entityCount: 2,
  summary: {
    totalEntities: 2,
    hasCompleteData: true,
    averageCitations: 36.5,
    medianCitations: 36.5
  },
  topPerformers: {
    citedByCount: 'W123456789',
    fwci: 'W123456789'
  },
  spreads: {
    citedByCount: {
      min: 28,
      max: 45,
      range: 17,
      mean: 36.5,
      median: 36.5,
      ratio: 1.61
    }
  },
  insights: [
    {
      type: 'temporal',
      message: 'Works span 1 years (2022-2023), showing evolution over time.',
      confidence: 0.9,
      data: { yearRange: 1, earliestYear: 2022, latestYear: 2023 }
    }
  ]
};

describe('ComparisonSummary', () => {
  describe('Empty State', () => {
    it('should render empty state when no analysis provided', () => {
      render(
        <ComparisonSummary analysis={null} />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText(/no comparison data available/i)).toBeInTheDocument();
    });
  });

  describe('Author Analysis Display', () => {
    it('should render author comparison summary', () => {
      render(
        <ComparisonSummary analysis={mockAuthorAnalysis} />,
        { wrapper: Wrapper }
      );
      
      // Check basic info
      expect(screen.getByText(/comparing 3 authors/i)).toBeInTheDocument();
      expect(screen.getByText(/2,100/)).toBeInTheDocument(); // Average citations
      expect(screen.getByText(/1,800/)).toBeInTheDocument(); // Median citations
    });

    it('should display summary statistics', () => {
      render(
        <ComparisonSummary analysis={mockAuthorAnalysis} />,
        { wrapper: Wrapper }
      );
      
      // Check statistics
      expect(screen.getByText(/average citations/i)).toBeInTheDocument();
      expect(screen.getByText(/median citations/i)).toBeInTheDocument();
      expect(screen.getByText(/citation range/i)).toBeInTheDocument();
    });

    it('should show top performers section', () => {
      render(
        <ComparisonSummary analysis={mockAuthorAnalysis} />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText(/top performers/i)).toBeInTheDocument();
      expect(screen.getByText(/citations leader/i)).toBeInTheDocument();
      expect(screen.getByText(/works leader/i)).toBeInTheDocument();
    });

    it('should display insights when available', () => {
      render(
        <ComparisonSummary analysis={mockAuthorAnalysis} />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText(/key insights/i)).toBeInTheDocument();
      expect(screen.getByText(/John Smith leads in citations/i)).toBeInTheDocument();
      expect(screen.getByText(/High variability in citations/i)).toBeInTheDocument();
    });
  });

  describe('Work Analysis Display', () => {
    it('should render work comparison summary', () => {
      render(
        <ComparisonSummary analysis={mockWorkAnalysis} />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText(/comparing 2 works/i)).toBeInTheDocument();
      expect(screen.getByText(/36.5/)).toBeInTheDocument(); // Average citations
    });

    it('should show temporal insights for works', () => {
      render(
        <ComparisonSummary analysis={mockWorkAnalysis} />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText(/evolution over time/i)).toBeInTheDocument();
    });
  });

  describe('Visual Styles', () => {
    it('should render compact layout when specified', () => {
      render(
        <ComparisonSummary 
          analysis={mockAuthorAnalysis} 
          layout="compact"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText(/comparing 3 authors/i)).toBeInTheDocument();
    });

    it('should render detailed layout by default', () => {
      render(
        <ComparisonSummary analysis={mockAuthorAnalysis} />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText(/key insights/i)).toBeInTheDocument();
      expect(screen.getByText(/top performers/i)).toBeInTheDocument();
    });

    it('should render with small size', () => {
      render(
        <ComparisonSummary 
          analysis={mockAuthorAnalysis} 
          size="sm"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText(/comparing 3 authors/i)).toBeInTheDocument();
    });
  });

  describe('Interactive Features', () => {
    it('should call onInsightClick when insight is clicked', () => {
      const handleInsightClick = vi.fn();
      
      render(
        <ComparisonSummary 
          analysis={mockAuthorAnalysis}
          onInsightClick={handleInsightClick}
        />,
        { wrapper: Wrapper }
      );
      
      const insightButton = screen.getByText(/John Smith leads in citations/i).closest('button');
      expect(insightButton).toBeInTheDocument();
      
      insightButton?.click();
      expect(handleInsightClick).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'leader',
          entityId: 'A123456789'
        })
      );
    });

    it('should call onTopPerformerClick when top performer is clicked', () => {
      const handleTopPerformerClick = vi.fn();
      
      render(
        <ComparisonSummary 
          analysis={mockAuthorAnalysis}
          onTopPerformerClick={handleTopPerformerClick}
        />,
        { wrapper: Wrapper }
      );
      
      // Find and click a top performer link
      const performerButton = screen.getByText(/citations leader/i).closest('button');
      expect(performerButton).toBeInTheDocument();
      
      performerButton?.click();
      expect(handleTopPerformerClick).toHaveBeenCalledWith('A123456789', 'citedByCount');
    });
  });

  describe('Data Quality Indicators', () => {
    it('should show complete data indicator when all data is available', () => {
      render(
        <ComparisonSummary analysis={mockAuthorAnalysis} />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText(/complete data/i)).toBeInTheDocument();
    });

    it('should show incomplete data warning when data is missing', () => {
      const incompleteAnalysis = {
        ...mockAuthorAnalysis,
        summary: {
          ...mockAuthorAnalysis.summary,
          hasCompleteData: false
        }
      };
      
      render(
        <ComparisonSummary analysis={incompleteAnalysis} />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText(/incomplete data/i)).toBeInTheDocument();
    });
  });

  describe('Insight Categorization', () => {
    it('should group insights by type', () => {
      render(
        <ComparisonSummary analysis={mockAuthorAnalysis} />,
        { wrapper: Wrapper }
      );
      
      // Should display different types of insights
      expect(screen.getByText(/leaders/i)).toBeInTheDocument();
      expect(screen.getByText(/outliers/i)).toBeInTheDocument();
      expect(screen.getByText(/statistics/i)).toBeInTheDocument();
    });

    it('should show confidence indicators for insights', () => {
      render(
        <ComparisonSummary 
          analysis={mockAuthorAnalysis}
          showConfidence={true}
        />,
        { wrapper: Wrapper }
      );
      
      // Should show confidence percentages
      expect(screen.getByText(/100%/)).toBeInTheDocument();
      expect(screen.getByText(/80%/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should provide meaningful labels for summary sections', () => {
      render(
        <ComparisonSummary analysis={mockAuthorAnalysis} />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByLabelText(/comparison summary/i)).toBeInTheDocument();
    });

    it('should provide semantic structure for insights', () => {
      render(
        <ComparisonSummary analysis={mockAuthorAnalysis} />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByRole('list')).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('should render loading state when specified', () => {
      render(
        <ComparisonSummary 
          analysis={null}
          loading={true}
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText(/loading summary/i)).toBeInTheDocument();
    });

    it('should render error state when specified', () => {
      render(
        <ComparisonSummary 
          analysis={null}
          error="Failed to generate analysis"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText(/failed to generate analysis/i)).toBeInTheDocument();
    });
  });
});