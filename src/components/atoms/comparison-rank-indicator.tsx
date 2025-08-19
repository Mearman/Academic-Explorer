/**
 * Comparison rank indicator component
 * Shows rank position with visual styling and accessibility features
 */

import { Badge, UnstyledButton } from '@mantine/core';
import { forwardRef } from 'react';

import type { SizeVariant } from '../types';

export interface ComparisonRankIndicatorProps {
  /** Rank position (1 = highest) */
  rank: number;
  /** Total number of entities being compared */
  totalEntities: number;
  /** Optional percentile value */
  percentile?: number;
  /** Whether to show rank/total format */
  showTotal?: boolean;
  /** Size variant */
  size?: SizeVariant;
  /** Whether this is an interactive element */
  onClick?: () => void;
  /** Custom class name */
  className?: string;
  /** Test identifier */
  'data-testid'?: string;
}

/**
 * Get badge color based on rank position
 */
function getRankColor(rank: number, totalEntities: number): string {
  if (rank === 1) return 'green'; // Best performer
  if (rank === totalEntities) return 'orange'; // Lowest performer
  return 'blue'; // Middle performers
}

/**
 * Get badge variant based on rank position
 */
function getRankVariant(rank: number, totalEntities: number): 'filled' | 'light' | 'outline' {
  if (rank === 1) return 'filled'; // Highest visibility for best
  if (rank === totalEntities && totalEntities > 2) return 'outline'; // Lower emphasis for worst
  return 'light'; // Standard for middle
}

/**
 * Format percentile with ordinal suffix
 */
function formatPercentile(percentile: number): string {
  const suffix = getOrdinalSuffix(percentile);
  return `${percentile}${suffix}`;
}

/**
 * Get ordinal suffix for numbers (1st, 2nd, 3rd, 4th, etc.)
 */
function getOrdinalSuffix(num: number): string {
  const lastDigit = num % 10;
  const lastTwoDigits = num % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return 'th';
  }
  
  switch (lastDigit) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Generate accessible label for the rank indicator
 */
function getAriaLabel(rank: number, totalEntities: number, percentile?: number): string {
  let label = `Ranked ${rank} out of ${totalEntities}`;
  
  if (percentile !== undefined) {
    label += `, ${formatPercentile(percentile)} percentile`;
  }
  
  if (rank === 1) {
    label += ' (highest)';
  } else if (rank === totalEntities && totalEntities > 1) {
    label += ' (lowest)';
  }
  
  return label;
}

export const ComparisonRankIndicator = forwardRef<
  HTMLDivElement | HTMLButtonElement,
  ComparisonRankIndicatorProps
>(({ 
  rank, 
  totalEntities, 
  percentile, 
  showTotal = false,
  size = 'md',
  onClick,
  className,
  'data-testid': testId,
  ...props 
}, ref) => {
  const color = getRankColor(rank, totalEntities);
  const variant = getRankVariant(rank, totalEntities);
  const ariaLabel = getAriaLabel(rank, totalEntities, percentile);
  
  // Render content
  const content = (
    <Badge
      color={color}
      variant={variant}
      size={size}
      className={className}
      data-testid={testId}
      data-rank={rank}
      aria-label={ariaLabel}
      {...props}
    >
      {showTotal ? `${rank}/${totalEntities}` : rank}
      {percentile !== undefined && (
        <span style={{ marginLeft: '0.25rem', fontSize: '0.75em', opacity: 0.8 }}>
          {formatPercentile(percentile)}
        </span>
      )}
    </Badge>
  );
  
  // Wrap in button if clickable
  if (onClick) {
    return (
      <UnstyledButton
        ref={ref as React.Ref<HTMLButtonElement>}
        onClick={onClick}
        aria-label={`Click to view details for ${ariaLabel}`}
        style={{ borderRadius: 'var(--mantine-radius-sm)' }}
      >
        {content}
      </UnstyledButton>
    );
  }
  
  return (
    <div ref={ref as React.Ref<HTMLDivElement>}>
      {content}
    </div>
  );
});

ComparisonRankIndicator.displayName = 'ComparisonRankIndicator';