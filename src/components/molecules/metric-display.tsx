import { Card, Group, Stack, Text, Badge, Skeleton } from '@mantine/core';
import React, { forwardRef } from 'react';

import type { MetricFormat, TrendDirection } from '@/lib/metric-formatting';

import type { SizeVariant } from '../types';

export interface MetricDisplayProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'className'> {
  label: string;
  value: number | string;
  description?: string;
  icon?: string;
  format?: MetricFormat;
  layout?: 'horizontal' | 'vertical' | 'compact';
  size?: SizeVariant;
  variant?: 'default' | 'highlighted' | 'muted';
  trend?: {
    direction: TrendDirection;
    value?: number | string;
    label?: string;
  };
  loading?: boolean;
  clickable?: boolean;
  onClick?: () => void;
  accessories?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

// Simple metric value formatter
interface FormatMetricValueParams {
  value: number | string;
  format: MetricFormat;
}

function formatMetricValue(params: FormatMetricValueParams): string {
  const { value, format } = params;
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

const TREND_SYMBOLS = {
  up: '↗',
  down: '↘',
  neutral: '→',
} as const;

const VARIANT_COLORS = {
  default: 'gray',
  highlighted: 'blue',
  muted: 'gray',
} as const;

export const MetricDisplay = forwardRef<HTMLDivElement, MetricDisplayProps>(
  (props, ref) => {
    const { 
      label,
      value,
      description,
      icon,
      format = 'number',
      layout = 'horizontal',
      size = 'md',
      variant = 'default',
      trend,
      loading = false,
      clickable = false,
      onClick,
      accessories,
      className,
      'data-testid': testId,
      ...restProps 
    } = props;
    const formattedValue = formatMetricValue({ value, format });
    const trendSymbol = trend ? TREND_SYMBOLS[trend.direction] : null;
    const color = VARIANT_COLORS[variant];

    if (loading) {
      return (
        <Card
          ref={ref}
          className={className}
          data-testid={testId}
          withBorder
          padding={size}
          {...restProps}
        >
          <Stack gap="xs">
            <Skeleton height="1rem" width="60%" />
            <Skeleton height="2rem" width="80%" />
            {description && <Skeleton height="0.875rem" width="100%" />}
          </Stack>
        </Card>
      );
    }

    const CardComponent = clickable ? Card : Card;
    const cardProps = clickable ? {
      onClick,
      style: { cursor: 'pointer' },
      onKeyDown: (e: React.KeyboardEvent) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          onClick();
        }
      },
      tabIndex: 0,
      role: 'button',
      'aria-label': `${label}: ${formattedValue}`,
    } : {};

    return (
      <CardComponent
        ref={ref}
        className={className}
        data-testid={testId}
        withBorder
        padding={size}
        style={{
          backgroundColor: variant === 'highlighted' ? 'var(--mantine-color-blue-0)' : undefined,
          opacity: variant === 'muted' ? 0.8 : undefined,
          ...cardProps.style,
        }}
        {...cardProps}
        {...restProps}
      >
        {layout === 'vertical' ? (
          <Stack align="center" gap="xs">
            {icon && <Text size="lg">{icon}</Text>}
            <Text size="sm" c="dimmed" ta="center">{label}</Text>
            <Group gap="xs" justify="center">
              <Text size="xl" fw="bold" c={color}>
                {formattedValue}
              </Text>
              {trend && (
                <Badge size="sm" color={trend.direction === 'up' ? 'green' : trend.direction === 'down' ? 'red' : 'gray'}>
                  {trendSymbol} {trend.value && formatMetricValue({ value: trend.value, format })}
                </Badge>
              )}
            </Group>
            {description && <Text size="xs" c="dimmed" ta="center">{description}</Text>}
            {accessories}
          </Stack>
        ) : layout === 'compact' ? (
          <Group gap="xs" justify="space-between">
            <Group gap="xs">
              {icon && <Text size="sm">{icon}</Text>}
              <Text size="sm" c="dimmed">{label}</Text>
            </Group>
            <Group gap="xs">
              <Text size="md" fw="bold" c={color}>{formattedValue}</Text>
              {trend && <Text size="xs">{trendSymbol}</Text>}
            </Group>
          </Group>
        ) : (
          <Stack gap="xs">
            <Group justify="space-between" align="flex-start">
              <Group gap="sm">
                {icon && <Text size="lg">{icon}</Text>}
                <Stack gap="xs">
                  <Text size="sm" c="dimmed">{label}</Text>
                  <Group gap="xs">
                    <Text size="xl" fw="bold" c={color}>
                      {formattedValue}
                    </Text>
                    {trend && (
                      <Badge size="sm" color={trend.direction === 'up' ? 'green' : trend.direction === 'down' ? 'red' : 'gray'}>
                        {trendSymbol} {trend.value && formatMetricValue({ value: trend.value, format })}
                      </Badge>
                    )}
                  </Group>
                </Stack>
              </Group>
              {accessories}
            </Group>
            {description && <Text size="xs" c="dimmed">{description}</Text>}
          </Stack>
        )}
      </CardComponent>
    );
  }
);

MetricDisplay.displayName = 'MetricDisplay';