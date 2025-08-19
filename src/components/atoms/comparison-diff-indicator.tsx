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
 * Format the difference value based on type and options
 */
function formatDifference(
  difference: number,
  type: ComparisonDiffIndicatorProps['type'],
  format: ComparisonDiffIndicatorProps['format'] = 'standard',
  decimalPlaces: number = 1
): string {
  const absValue = Math.abs(difference);
  let formattedValue: string;
  
  switch (type) {
    case 'percentage':
      formattedValue = `${absValue.toFixed(decimalPlaces)}%`;
      break;
      
    case 'ratio':
      formattedValue = `${absValue.toFixed(decimalPlaces)}×`;
      break;
      
    case 'absolute':
    default:
      if (format === 'compact' && absValue >= 1000) {
        if (absValue >= 1000000) {
          formattedValue = `${(absValue / 1000000).toFixed(1)}M`;
        } else if (absValue >= 1000) {
          formattedValue = `${(absValue / 1000).toFixed(1)}K`;
        } else {
          formattedValue = absValue.toString();
        }
      } else {
        formattedValue = absValue.toLocaleString(undefined, {
          maximumFractionDigits: decimalPlaces
        });
      }
      break;
  }
  
  // Add sign prefix
  if (difference > 0) {
    return `+${formattedValue}`;
  } else if (difference < 0) {
    return `-${formattedValue}`;
  } else {
    return formattedValue;
  }
}

/**
 * Generate accessible label for the difference indicator
 */
function getAriaLabel(
  difference: number,
  type: ComparisonDiffIndicatorProps['type'],
  direction: ComparisonDiffIndicatorProps['direction'],
  contextLabel?: string,
  comparedTo?: string
): string {
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
>(({ 
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
  ...props 
}, ref) => {
  const iconName = getDirectionIcon(direction);
  const color = getDirectionColor(direction);
  const variant = getBadgeVariant(direction);
  const formattedDifference = formatDifference(difference, type, format, decimalPlaces);
  const ariaLabel = getAriaLabel(difference, type, direction, contextLabel, comparedTo);
  
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
        {...props}
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