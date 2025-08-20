/**
 * Comparison difference indicator component
 * Shows the difference between values with visual indicators and formatting
 */

import { Badge, Group, UnstyledButton, Text } from '@mantine/core';
import { forwardRef } from 'react';

import type { SizeVariant } from '../types';

import { Icon } from './icon';

export interface ComparisonDiffIndicatorProps {
  /** The difference value (positive = higher, negative = lower) */
  difference: number;
  /** Type of difference being shown */
  type: 'absolute' | 'percentage' | 'ratio';
  /** Direction of the difference */
  direction: 'higher' | 'lower' | 'equal';
  /** Number format preference */
  format?: 'standard' | 'compact';
  /** Number of decimal places to show */
  decimalPlaces?: number;
  /** Size variant */
  size?: SizeVariant;
  /** Context label describing what is being compared */
  contextLabel?: string;
  /** What this value is being compared to */
  comparedTo?: string;
  /** Whether this is an interactive element */
  onClick?: () => void;
  /** Custom class name */
  className?: string;
  /** Test identifier */
  'data-testid'?: string;
}

/**
 * Get icon name based on direction
 */
function getDirectionIcon(direction: ComparisonDiffIndicatorProps['direction']): string {
  switch (direction) {
    case 'higher': return 'trending-up';
    case 'lower': return 'trending-down';
    case 'equal': return 'minus';
  }
}

/**
 * Get color based on direction
 */
function getDirectionColor(direction: ComparisonDiffIndicatorProps['direction']): string {
  switch (direction) {
    case 'higher': return 'green';
    case 'lower': return 'red';
    case 'equal': return 'gray';
  }
}

/**
 * Get badge variant based on direction
 */
function getBadgeVariant(direction: ComparisonDiffIndicatorProps['direction']): 'filled' | 'light' | 'outline' {
  switch (direction) {
    case 'higher': return 'light';
    case 'lower': return 'light';
    case 'equal': return 'outline';
  }
}

/**
 * Format value based on type
 */
interface FormatValueByTypeParams {
  absValue: number;
  type: ComparisonDiffIndicatorProps['type'];
  decimalPlaces: number;
}

function formatValueByType(params: FormatValueByTypeParams): string {
  const { absValue, type, decimalPlaces } = params;
  switch (type) {
    case 'percentage':
      return `${absValue.toFixed(decimalPlaces)}%`;
    case 'ratio':
      return `${absValue.toFixed(decimalPlaces)}×`;
    case 'absolute':
    default:
      return absValue.toLocaleString(undefined, {
        maximumFractionDigits: decimalPlaces
      });
  }
}

/**
 * Format value in compact notation
 */
function formatCompactValue(absValue: number): string {
  if (absValue >= 1000000) {
    return `${(absValue / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${(absValue / 1000).toFixed(1)}K`;
  }
  return absValue.toString();
}

/**
 * Add sign prefix to formatted value
 */
interface AddSignPrefixParams {
  difference: number;
  formattedValue: string;
}

function addSignPrefix(params: AddSignPrefixParams): string {
  const { difference, formattedValue } = params;
  if (difference > 0) return `+${formattedValue}`;
  if (difference < 0) return `-${formattedValue}`;
  return formattedValue;
}

/**
 * Format the difference value based on type and options
 */
interface FormatDifferenceParams {
  difference: number;
  type: ComparisonDiffIndicatorProps['type'];
  format?: ComparisonDiffIndicatorProps['format'];
  decimalPlaces?: number;
}

function formatDifference(params: FormatDifferenceParams): string {
  const { difference, type, format = 'standard', decimalPlaces = 1 } = params;
  const absValue = Math.abs(difference);
  
  let formattedValue: string;
  
  if (type === 'absolute' && format === 'compact' && absValue >= 1000) {
    formattedValue = formatCompactValue(absValue);
  } else {
    formattedValue = formatValueByType({ absValue, type, decimalPlaces });
  }
  
  return addSignPrefix({ difference, formattedValue });
}

/**
 * Generate accessible label for the difference indicator
 */
interface GetAriaLabelParams {
  difference: number;
  type: ComparisonDiffIndicatorProps['type'];
  direction: ComparisonDiffIndicatorProps['direction'];
  contextLabel?: string;
  comparedTo?: string;
}

function getAriaLabel(params: GetAriaLabelParams): string {
  const { difference, type, direction, contextLabel, comparedTo } = params;
  const absValue = Math.abs(difference);
  let label = '';
  
  switch (direction) {
    case 'higher':
      label = `${absValue}${type === 'percentage' ? '%' : type === 'ratio' ? ' times' : ''} higher`;
      break;
    case 'lower':
      label = `${absValue}${type === 'percentage' ? '%' : type === 'ratio' ? ' times' : ''} lower`;
      break;
    case 'equal':
      label = 'Equal value';
      break;
  }
  
  if (contextLabel) {
    label += ` ${contextLabel}`;
  }
  
  if (comparedTo) {
    label += ` compared to ${comparedTo}`;
  }
  
  return label;
}

export const ComparisonDiffIndicator = forwardRef<
  HTMLDivElement | HTMLButtonElement,
  ComparisonDiffIndicatorProps
>((props, ref) => {
  const { 
    difference,
    type,
    direction,
    format = 'standard',
    decimalPlaces = 1,
    size = 'md',
    contextLabel,
    comparedTo,
    onClick,
    className,
    'data-testid': testId,
    ...restProps 
  } = props;
  const iconName = getDirectionIcon(direction);
  const color = getDirectionColor(direction);
  const variant = getBadgeVariant(direction);
  const formattedDifference = formatDifference({ difference, type, format, decimalPlaces });
  const ariaLabel = getAriaLabel({ difference, type, direction, contextLabel, comparedTo });
  
  // Render content
  const content = (
    <Group gap="xs" wrap="nowrap">
      <Badge
        color={color}
        variant={variant}
        size={size}
        className={className}
        data-testid={testId}
        data-direction={direction}
        aria-label={ariaLabel}
        leftSection={<Icon name={iconName} size="xs" />}
        {...restProps}
      >
        {formattedDifference}
      </Badge>
      
      {contextLabel && (
        <Text 
          size={size === 'sm' ? 'xs' : size === 'lg' ? 'sm' : 'xs'} 
          c="dimmed"
        >
          {contextLabel}
        </Text>
      )}
    </Group>
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

ComparisonDiffIndicator.displayName = 'ComparisonDiffIndicator';