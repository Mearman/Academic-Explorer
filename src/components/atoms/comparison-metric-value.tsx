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
  
  const direction = metricValue > comparisonValue ? 'higher' : 'lower';
  const difference = calculateDifferenceValue(metricValue, comparisonValue, type);
  
  return { difference, direction };
}

/**
 * Calculate the numerical difference based on type
 */
function calculateDifferenceValue(
  metricValue: number,
  comparisonValue: number,
  type: 'absolute' | 'percentage' | 'ratio'
): number {
  switch (type) {
    case 'percentage':
      return ((metricValue - comparisonValue) / comparisonValue) * 100;
    case 'ratio':
      return metricValue / comparisonValue;
    case 'absolute':
    default:
      return metricValue - comparisonValue;
  }
}

/**
 * Size configuration mapping
 */
const SIZE_CONFIG = {
  xs: { text: 'xs', value: 'sm' },
  sm: { text: 'sm', value: 'md' },
  md: { text: 'md', value: 'lg' },
  lg: { text: 'lg', value: 'xl' },
  xl: { text: 'xl', value: 'xl' },
} as const;

/**
 * Get text size based on size variant
 */
function getTextSize(size: SizeVariant): string {
  return SIZE_CONFIG[size]?.text ?? SIZE_CONFIG.md.text;
}

/**
 * Get value text size (larger than regular text)
 */
function getValueTextSize(size: SizeVariant): string {
  return SIZE_CONFIG[size]?.value ?? SIZE_CONFIG.md.value;
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
  const parts: string[] = [];
  
  // Base value
  if (label) {
    parts.push(`${label}: ${metric.formatted}`);
  } else {
    parts.push(metric.formatted);
  }
  
  // Rank information
  if (showRank && totalEntities) {
    let rankText = `ranked ${metric.rank} out of ${totalEntities}`;
    if (metric.isHighest) {
      rankText += ' (highest)';
    } else if (metric.isLowest) {
      rankText += ' (lowest)';
    }
    parts.push(rankText);
  }
  
  // Difference information
  if (showDifference && comparisonValue !== undefined) {
    const { difference, direction } = calculateDifference(
      metric.value,
      comparisonValue,
      differenceType || 'absolute'
    );
    
    if (direction !== 'equal') {
      const absValue = Math.abs(difference);
      const suffix = differenceType === 'percentage' ? '%' : differenceType === 'ratio' ? ' times' : '';
      parts.push(`${absValue}${suffix} ${direction}`);
    }
  }
  
  return parts.join(', ');
}

/**
 * Render value element with emphasis styling
 */
function renderValueElement(
  metric: MetricComparison,
  shouldEmphasize: boolean,
  valueTextSize: string,
  testId?: string
) {
  return (
    <Text
      size={valueTextSize}
      fw={shouldEmphasize ? 'bold' : 'normal'}
      c={shouldEmphasize ? (metric.isHighest ? 'green' : 'orange') : undefined}
      data-testid={`${testId || 'metric'}-value`}
    >
      {metric.formatted}
    </Text>
  );
}

/**
 * Render label element
 */
function renderLabelElement(label: string | undefined, textSize: string, layout: string) {
  if (!label) return null;
  
  return (
    <Text
      size={textSize}
      c="dimmed"
      fw={layout === 'compact' ? 'normal' : 'normal'}
    >
      {label}
    </Text>
  );
}

/**
 * Render rank element if conditions are met
 */
function renderRankElement(
  showRank: boolean,
  totalEntities: number | undefined,
  metric: MetricComparison,
  showPercentile: boolean,
  size: SizeVariant
) {
  if (!showRank || !totalEntities) return null;
  
  return (
    <ComparisonRankIndicator
      rank={metric.rank}
      totalEntities={totalEntities}
      percentile={showPercentile ? metric.percentile : undefined}
      size={size}
    />
  );
}

/**
 * Render difference element if data exists
 */
function renderDiffElement(
  diffData: { difference: number; direction: 'higher' | 'lower' | 'equal' } | null,
  differenceType: ComparisonMetricValueProps['differenceType'],
  size: SizeVariant
) {
  if (!diffData) return null;
  
  return (
    <ComparisonDiffIndicator
      difference={diffData.difference}
      type={differenceType}
      direction={diffData.direction}
      size={size}
    />
  );
}

/**
 * Compose layout based on layout type
 */
function composeLayout(
  layout: ComparisonMetricValueProps['layout'],
  labelElement: React.ReactNode,
  valueElement: React.ReactNode,
  rankElement: React.ReactNode,
  diffElement: React.ReactNode
): React.ReactNode {
  switch (layout) {
    case 'vertical':
      return (
        <Stack gap="xs" align="center">
          {labelElement}
          {valueElement}
          <Group gap="xs">
            {rankElement}
            {diffElement}
          </Group>
        </Stack>
      );
      
    case 'compact':
      return (
        <Group gap="xs" wrap="nowrap">
          {valueElement}
          {labelElement}
          {rankElement}
          {diffElement}
        </Group>
      );
      
    case 'horizontal':
    default:
      return (
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
  }
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
  const diffData = showDifference && comparisonValue !== undefined
    ? calculateDifference(metric.value, comparisonValue, differenceType)
    : null;
  
  // Render elements
  const valueElement = renderValueElement(metric, shouldEmphasize, valueTextSize, testId);
  const labelElement = renderLabelElement(label, textSize, layout);
  const rankElement = renderRankElement(showRank, totalEntities, metric, showPercentile, size);
  const diffElement = renderDiffElement(diffData, differenceType, size);
  
  // Compose layout
  const content = composeLayout(layout, labelElement, valueElement, rankElement, diffElement);
  
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