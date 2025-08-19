/**
 * Unit tests for ComparisonRankIndicator component
 */

import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { ComparisonRankIndicator } from './comparison-rank-indicator';

// Wrapper for Mantine components
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe('ComparisonRankIndicator', () => {
  describe('Rendering', () => {
    it('should render rank number', () => {
      render(
        <ComparisonRankIndicator rank={1} totalEntities={3} />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should render rank with total when showTotal is true', () => {
      render(
        <ComparisonRankIndicator 
          rank={2} 
          totalEntities={5} 
          showTotal={true}
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('2/5')).toBeInTheDocument();
    });

    it('should render percentile when provided', () => {
      render(
        <ComparisonRankIndicator 
          rank={1} 
          totalEntities={3} 
          percentile={100}
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('100th')).toBeInTheDocument();
    });
  });

  describe('Visual Variants', () => {
    it('should apply highest rank styling for rank 1', () => {
      render(
        <ComparisonRankIndicator rank={1} totalEntities={3} />,
        { wrapper: Wrapper }
      );
      
      const badge = screen.getByText('1').closest('[data-rank="1"]');
      expect(badge).toBeInTheDocument();
    });

    it('should apply lowest rank styling for last position', () => {
      render(
        <ComparisonRankIndicator rank={3} totalEntities={3} />,
        { wrapper: Wrapper }
      );
      
      const badge = screen.getByText('3').closest('[data-rank="3"]');
      expect(badge).toBeInTheDocument();
    });

    it('should apply middle rank styling for non-extreme positions', () => {
      render(
        <ComparisonRankIndicator rank={2} totalEntities={5} />,
        { wrapper: Wrapper }
      );
      
      const badge = screen.getByText('2').closest('[data-rank="2"]');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should render with small size', () => {
      render(
        <ComparisonRankIndicator 
          rank={1} 
          totalEntities={3} 
          size="sm"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should render with large size', () => {
      render(
        <ComparisonRankIndicator 
          rank={1} 
          totalEntities={3} 
          size="lg"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Interactive States', () => {
    it('should be clickable when onClick is provided', () => {
      const handleClick = vi.fn();
      
      render(
        <ComparisonRankIndicator 
          rank={1} 
          totalEntities={3} 
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
        <ComparisonRankIndicator rank={1} totalEntities={3} />,
        { wrapper: Wrapper }
      );
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single entity comparison', () => {
      render(
        <ComparisonRankIndicator rank={1} totalEntities={1} />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should handle large numbers', () => {
      render(
        <ComparisonRankIndicator 
          rank={99} 
          totalEntities={100} 
          showTotal={true}
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('99/100')).toBeInTheDocument();
    });

    it('should apply custom test id', () => {
      render(
        <ComparisonRankIndicator 
          rank={1} 
          totalEntities={3} 
          data-testid="custom-rank-indicator"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByTestId('custom-rank-indicator')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should provide meaningful aria-label', () => {
      render(
        <ComparisonRankIndicator rank={2} totalEntities={5} />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByLabelText(/ranked 2 out of 5/i)).toBeInTheDocument();
    });

    it('should include percentile in aria-label when provided', () => {
      render(
        <ComparisonRankIndicator 
          rank={1} 
          totalEntities={3} 
          percentile={100}
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByLabelText(/100th percentile/i)).toBeInTheDocument();
    });
  });
});