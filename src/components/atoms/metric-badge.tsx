import { Badge, Group } from '@mantine/core';
import { forwardRef } from 'react';

import type { SizeVariant } from '../types';

// Format handlers for different metric types
const FORMAT_HANDLERS = {
  percentage: (value: number) => `${value}%`,
  currency: (value: number) => `$${value.toLocaleString()}`,
  compact: (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toString();
  },
  number: (value: number) => value.toLocaleString(),
} as const;

// Simple metric value formatter
function formatMetricValue(value: number | string, format: 'number' | 'percentage' | 'currency' | 'compact'): string {
  if (typeof value === 'string') return value;
  
  const handler = FORMAT_HANDLERS[format];
  return handler ? handler(value) : value.toLocaleString();
}

export interface MetricBadgeProps {
  value: number | string;
  label?: string;
  format?: 'number' | 'percentage' | 'currency' | 'compact';
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'muted';
  size?: SizeVariant;
  icon?: React.ReactNode;
  className?: string;
  compact?: boolean;
  inline?: boolean;
  'data-testid'?: string;
}

const VARIANT_COLORS = {
  default: 'gray',
  primary: 'blue',
  success: 'green',
  warning: 'yellow',
  error: 'red',
  muted: 'gray',
} as const;

const TREND_SYMBOLS = {
  up: '↗',
  down: '↘',
  neutral: '→',
} as const;

/**
 * Render badge content with optional icon and trend
 */
function renderBadgeContent(
  icon: React.ReactNode,
  formattedValue: string,
  trendSymbol: string | null
): React.ReactNode {
  return (
    <>
      {icon && icon}
      {formattedValue}
      {trendSymbol && ` ${trendSymbol}`}
    </>
  );
}

/**
 * Render label if conditions are met
 */
function renderLabel(label: string | undefined, compact: boolean): React.ReactNode {
  if (!label || compact) return null;
  
  return (
    <span style={{ fontSize: '0.875rem', color: 'var(--mantine-color-dimmed)' }}>
      {label}
    </span>
  );
}

export const MetricBadge = forwardRef<HTMLDivElement, MetricBadgeProps>(
  ({ 
    value, 
    label, 
    format = 'number', 
    trend, 
    variant = 'default', 
    size = 'md', 
    icon, 
    className, 
    compact = false, 
    inline = true, 
    'data-testid': testId, 
    ...props 
  }, ref) => {
    const formattedValue = formatMetricValue(value, format);
    const color = VARIANT_COLORS[variant];
    const trendSymbol = trend ? TREND_SYMBOLS[trend] : null;
    
    const badgeContent = renderBadgeContent(icon, formattedValue, trendSymbol);
    const labelElement = renderLabel(label, compact);

    return (
      <Group gap="xs" style={{ display: inline ? 'inline-flex' : 'flex' }} {...props}>
        <Badge
          ref={ref}
          color={color}
          variant="light"
          size={size}
          {...(className !== undefined && { className })}
          {...(testId !== undefined && { 'data-testid': testId })}
        >
          {badgeContent}
        </Badge>
        {labelElement}
      </Group>
    );
  }
);

MetricBadge.displayName = 'MetricBadge';