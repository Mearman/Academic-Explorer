/**
 * Comparison metric value component
 * Displays a metric value with rank indicators and difference comparisons
 */

import { Group, Stack, Text, UnstyledButton, Box } from '@mantine/core';
import { forwardRef } from 'react';

import type { MetricComparison } from '@/hooks/use-comparison-data';

import type { SizeVariant } from '../types';

import { ComparisonDiffIndicator } from './comparison-diff-indicator';
import { ComparisonRankIndicator } from './comparison-rank-indicator';

export interface ComparisonMetricValueProps {
  /** The metric comparison data */
  metric: MetricComparison;
  /** Label for the metric */
  label?: string;
  /** Whether to show rank indicator */
  showRank?: boolean;
  /** Whether to show percentile in rank */
  showPercentile?: boolean;
  /** Total number of entities for rank calculation */
  totalEntities?: number;
  /** Whether to show difference indicator */
  showDifference?: boolean;
  /** Value to compare against (for difference calculation) */
  comparisonValue?: number;
  /** Type of difference to show */
  differenceType?: 'absolute' | 'percentage' | 'ratio';
  /** Layout orientation */
  layout?: 'horizontal' | 'vertical' | 'compact';
  /** Whether to emphasize extreme values (highest/lowest) */
  emphasizeExtreme?: boolean;
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
 * Calculate difference between metric value and comparison value
 */
function calculateDifference(
  metricValue: number,
  comparisonValue: number,
  type: 'absolute' | 'percentage' | 'ratio'
): { difference: number; direction: 'higher' | 'lower' | 'equal' } {
  if (metricValue === comparisonValue) {
    return { difference: 0, direction: 'equal' };
  }
  
  let difference: number;
  const direction = metricValue > comparisonValue ? 'higher' : 'lower';
  
  switch (type) {
    case 'percentage':
      difference = ((metricValue - comparisonValue) / comparisonValue) * 100;
      break;
    case 'ratio':
      difference = metricValue / comparisonValue;
      break;
    case 'absolute':
    default:
      difference = metricValue - comparisonValue;
      break;
  }
  
  return { difference, direction };
}

/**
 * Get text size based on size variant
 */
function getTextSize(size: SizeVariant): string {
  switch (size) {
    case 'xs': return 'xs';
    case 'sm': return 'sm';
    case 'md': return 'md';
    case 'lg': return 'lg';
    case 'xl': return 'xl';
    default: return 'md';
  }
}

/**
 * Get value text size (larger than regular text)
 */
function getValueTextSize(size: SizeVariant): string {
  switch (size) {
    case 'xs': return 'sm';
    case 'sm': return 'md';
    case 'md': return 'lg';
    case 'lg': return 'xl';
    case 'xl': return 'xl';
    default: return 'lg';
  }
}

/**
 * Generate accessible label for the metric value
 */
function getAriaLabel(
  metric: MetricComparison,
  label?: string,
  showRank?: boolean,
  totalEntities?: number,
  showDifference?: boolean,
  comparisonValue?: number,
  differenceType?: ComparisonMetricValueProps['differenceType']
): string {
  let ariaLabel = '';
  
  if (label) {
    ariaLabel += `${label}: `;
  }
  
  ariaLabel += metric.formatted;
  
  if (showRank && totalEntities) {
    ariaLabel += `, ranked ${metric.rank} out of ${totalEntities}`;
    if (metric.isHighest) {
      ariaLabel += ' (highest)';
    } else if (metric.isLowest) {
      ariaLabel += ' (lowest)';
    }
  }
  
  if (showDifference && comparisonValue !== undefined) {
    const { difference, direction } = calculateDifference(
      metric.value,
      comparisonValue,
      differenceType || 'absolute'
    );
    
    if (direction !== 'equal') {
      const absValue = Math.abs(difference);
      const suffix = differenceType === 'percentage' ? '%' : differenceType === 'ratio' ? ' times' : '';
      ariaLabel += `, ${absValue}${suffix} ${direction}`;
    }
  }
  
  return ariaLabel;
}

export const ComparisonMetricValue = forwardRef<
  HTMLDivElement | HTMLButtonElement,
  ComparisonMetricValueProps
>(({ 
  metric,
  label,
  showRank = false,
  showPercentile = false,
  totalEntities,
  showDifference = false,
  comparisonValue,
  differenceType = 'absolute',
  layout = 'horizontal',
  emphasizeExtreme = false,
  size = 'md',
  onClick,
  className,
  'data-testid': testId,
  ...props 
}, ref) => {
  const textSize = getTextSize(size);
  const valueTextSize = getValueTextSize(size);
  const shouldEmphasize = emphasizeExtreme && (metric.isHighest || metric.isLowest);
  
  const ariaLabel = getAriaLabel(
    metric,
    label,
    showRank,
    totalEntities,
    showDifference,
    comparisonValue,
    differenceType
  );
  
  // Calculate difference if needed
  let diffData: { difference: number; direction: 'higher' | 'lower' | 'equal' } | null = null;
  if (showDifference && comparisonValue !== undefined) {
    diffData = calculateDifference(metric.value, comparisonValue, differenceType);
  }
  
  // Render main value
  const valueElement = (
    <Text
      size={valueTextSize}
      fw={shouldEmphasize ? 'bold' : 'normal'}
      c={shouldEmphasize ? (metric.isHighest ? 'green' : 'orange') : undefined}
      data-testid={`${testId || 'metric'}-value`}
    >
      {metric.formatted}
    </Text>
  );
  
  // Render rank indicator
  const rankElement = showRank && totalEntities ? (
    <ComparisonRankIndicator
      rank={metric.rank}
      totalEntities={totalEntities}
      percentile={showPercentile ? metric.percentile : undefined}
      size={size}
    />
  ) : null;
  
  // Render difference indicator
  const diffElement = diffData ? (
    <ComparisonDiffIndicator
      difference={diffData.difference}
      type={differenceType}
      direction={diffData.direction}
      size={size}
    />
  ) : null;
  
  // Render label
  const labelElement = label ? (
    <Text
      size={textSize}
      c="dimmed"
      fw={layout === 'compact' ? 'normal' : 'normal'}
    >
      {label}
    </Text>
  ) : null;
  
  // Compose layout
  let content: React.ReactNode;
  
  switch (layout) {
    case 'vertical':
      content = (
        <Stack gap="xs" align="center">
          {labelElement}
          {valueElement}
          <Group gap="xs">
            {rankElement}
            {diffElement}
          </Group>
        </Stack>
      );
      break;
      
    case 'compact':
      content = (
        <Group gap="xs" wrap="nowrap">
          {valueElement}
          {labelElement}
          {rankElement}
          {diffElement}
        </Group>
      );
      break;
      
    case 'horizontal':
    default:
      content = (
        <Group gap="md" justify="space-between" wrap="nowrap">
          <Box>
            {labelElement}
            {valueElement}
          </Box>
          <Group gap="xs">
            {rankElement}
            {diffElement}
          </Group>
        </Group>
      );
      break;
  }
  
  // Wrap in button if clickable
  if (onClick) {
    return (
      <UnstyledButton
        ref={ref as React.Ref<HTMLButtonElement>}
        onClick={onClick}
        className={className}
        aria-label={`Click to view details for ${ariaLabel}`}
        style={{ 
          borderRadius: 'var(--mantine-radius-sm)',
          padding: 'var(--mantine-spacing-xs)',
          width: '100%'
        }}
        data-testid={testId}
        {...props}
      >
        {content}
      </UnstyledButton>
    );
  }
  
  return (
    <Box
      ref={ref as React.Ref<HTMLDivElement>}
      className={className}
      aria-label={ariaLabel}
      data-testid={testId}
      {...props}
    >
      {content}
    </Box>
  );
});

ComparisonMetricValue.displayName = 'ComparisonMetricValue';