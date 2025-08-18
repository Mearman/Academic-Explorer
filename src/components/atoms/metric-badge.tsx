import { Badge, Group } from '@mantine/core';
import { forwardRef } from 'react';

import type { SizeVariant } from '../types';

// Simple metric value formatter
function formatMetricValue(value: number | string, format: 'number' | 'percentage' | 'currency' | 'compact'): string {
  if (typeof value === 'string') return value;
  
  switch (format) {
    case 'percentage':
      return `${value}%`;
    case 'currency':
      return `$${value.toLocaleString()}`;
    case 'compact':
      if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
      if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
      if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
      return value.toString();
    default:
      return value.toLocaleString();
  }
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

export const MetricBadge = forwardRef<HTMLDivElement, MetricBadgeProps>(
  ({ value, label, format = 'number', trend, variant = 'default', size = 'md', icon, className, compact = false, inline = true, 'data-testid': testId, ...props }, ref) => {
    const formattedValue = formatMetricValue(value, format);
    const color = VARIANT_COLORS[variant];
    const trendSymbol = trend ? TREND_SYMBOLS[trend] : null;

    return (
      <Group gap="xs" style={{ display: inline ? 'inline-flex' : 'flex' }} {...props}>
        <Badge
          ref={ref}
          color={color}
          variant="light"
          size={size}
          className={className}
          data-testid={testId}
        >
          {icon && icon}
          {formattedValue}
          {trendSymbol && ` ${trendSymbol}`}
        </Badge>
        {label && !compact && (
          <span style={{ fontSize: '0.875rem', color: 'var(--mantine-color-dimmed)' }}>
            {label}
          </span>
        )}
      </Group>
    );
  }
);

MetricBadge.displayName = 'MetricBadge';