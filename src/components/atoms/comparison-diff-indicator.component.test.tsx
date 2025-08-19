/**
 * Unit tests for ComparisonDiffIndicator component
 */

import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { ComparisonDiffIndicator } from './comparison-diff-indicator';

// Wrapper for Mantine components
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe('ComparisonDiffIndicator', () => {
  describe('Positive Differences', () => {
    it('should render positive difference with up arrow', () => {
      render(
        <ComparisonDiffIndicator 
          difference={150}
          type="absolute"
          direction="higher"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('+150')).toBeInTheDocument();
      expect(screen.getByLabelText(/higher by 150/i)).toBeInTheDocument();
    });

    it('should render positive percentage difference', () => {
      render(
        <ComparisonDiffIndicator 
          difference={25.5}
          type="percentage"
          direction="higher"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('+25.5%')).toBeInTheDocument();
    });

    it('should render positive ratio difference', () => {
      render(
        <ComparisonDiffIndicator 
          difference={2.5}
          type="ratio"
          direction="higher"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('2.5×')).toBeInTheDocument();
    });
  });

  describe('Negative Differences', () => {
    it('should render negative difference with down arrow', () => {
      render(
        <ComparisonDiffIndicator 
          difference={-75}
          type="absolute"
          direction="lower"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('-75')).toBeInTheDocument();
      expect(screen.getByLabelText(/lower by 75/i)).toBeInTheDocument();
    });

    it('should render negative percentage difference', () => {
      render(
        <ComparisonDiffIndicator 
          difference={-12.3}
          type="percentage"
          direction="lower"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('-12.3%')).toBeInTheDocument();
    });
  });

  describe('Zero Differences', () => {
    it('should render zero difference with neutral styling', () => {
      render(
        <ComparisonDiffIndicator 
          difference={0}
          type="absolute"
          direction="equal"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByLabelText(/equal/i)).toBeInTheDocument();
    });

    it('should render zero percentage', () => {
      render(
        <ComparisonDiffIndicator 
          difference={0}
          type="percentage"
          direction="equal"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('Visual Styling', () => {
    it('should apply positive styling for higher values', () => {
      render(
        <ComparisonDiffIndicator 
          difference={100}
          type="absolute"
          direction="higher"
        />,
        { wrapper: Wrapper }
      );
      
      const indicator = screen.getByLabelText(/higher by 100/i);
      expect(indicator.closest('[data-direction="higher"]')).toBeInTheDocument();
    });

    it('should apply negative styling for lower values', () => {
      render(
        <ComparisonDiffIndicator 
          difference={-50}
          type="absolute"
          direction="lower"
        />,
        { wrapper: Wrapper }
      );
      
      const indicator = screen.getByLabelText(/lower by 50/i);
      expect(indicator.closest('[data-direction="lower"]')).toBeInTheDocument();
    });

    it('should apply neutral styling for equal values', () => {
      render(
        <ComparisonDiffIndicator 
          difference={0}
          type="absolute"
          direction="equal"
        />,
        { wrapper: Wrapper }
      );
      
      const indicator = screen.getByLabelText(/equal/i);
      expect(indicator.closest('[data-direction="equal"]')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should render with small size', () => {
      render(
        <ComparisonDiffIndicator 
          difference={50}
          type="absolute"
          direction="higher"
          size="sm"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('+50')).toBeInTheDocument();
    });

    it('should render with large size', () => {
      render(
        <ComparisonDiffIndicator 
          difference={100}
          type="absolute"
          direction="higher"
          size="lg"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('+100')).toBeInTheDocument();
    });
  });

  describe('Formatting Options', () => {
    it('should show compact format for large numbers', () => {
      render(
        <ComparisonDiffIndicator 
          difference={1250}
          type="absolute"
          direction="higher"
          format="compact"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('+1.3K')).toBeInTheDocument();
    });

    it('should show decimal places for percentage', () => {
      render(
        <ComparisonDiffIndicator 
          difference={33.333}
          type="percentage"
          direction="higher"
          decimalPlaces={2}
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('+33.33%')).toBeInTheDocument();
    });

    it('should round ratio to specified decimal places', () => {
      render(
        <ComparisonDiffIndicator 
          difference={1.6667}
          type="ratio"
          direction="higher"
          decimalPlaces={2}
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('1.67×')).toBeInTheDocument();
    });
  });

  describe('Interactive States', () => {
    it('should be clickable when onClick is provided', () => {
      const handleClick = vi.fn();
      
      render(
        <ComparisonDiffIndicator 
          difference={100}
          type="absolute"
          direction="higher"
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
        <ComparisonDiffIndicator 
          difference={100}
          type="absolute"
          direction="higher"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Labels and Context', () => {
    it('should display context label when provided', () => {
      render(
        <ComparisonDiffIndicator 
          difference={50}
          type="absolute"
          direction="higher"
          contextLabel="more citations"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('more citations')).toBeInTheDocument();
    });

    it('should display comparison target when provided', () => {
      render(
        <ComparisonDiffIndicator 
          difference={25}
          type="percentage"
          direction="higher"
          comparedTo="baseline"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByLabelText(/compared to baseline/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should provide meaningful aria-label', () => {
      render(
        <ComparisonDiffIndicator 
          difference={150}
          type="absolute"
          direction="higher"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByLabelText(/higher by 150/i)).toBeInTheDocument();
    });

    it('should include comparison context in aria-label', () => {
      render(
        <ComparisonDiffIndicator 
          difference={25}
          type="percentage"
          direction="higher"
          contextLabel="more citations"
          comparedTo="average"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByLabelText(/25% higher.*citations.*compared to average/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle very large numbers', () => {
      render(
        <ComparisonDiffIndicator 
          difference={1000000}
          type="absolute"
          direction="higher"
          format="compact"
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('+1.0M')).toBeInTheDocument();
    });

    it('should handle very small decimals', () => {
      render(
        <ComparisonDiffIndicator 
          difference={0.001}
          type="percentage"
          direction="higher"
          decimalPlaces={3}
        />,
        { wrapper: Wrapper }
      );
      
      expect(screen.getByText('+0.001%')).toBeInTheDocument();
    });
  });
});