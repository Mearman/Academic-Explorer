'use client';

import { forwardRef } from 'react';

import type { SizeVariant } from '../types';

import * as styles from './metric-badge.css';
import { renderIcon, renderLabel, renderTrendIcon, buildMetricClasses } from './utils/metric-render-utils';
import { formatMetricValue, TREND_ICONS } from './utils/metric-utils';

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

export const MetricBadge = forwardRef<HTMLSpanElement, MetricBadgeProps>(
  ({ value, label, format = 'number', trend, variant = 'default', size = 'md', icon, className, compact = false, inline = true, 'data-testid': testId, ...props }, ref) => {
    const formattedValue = formatMetricValue(value, format);
    const classes = buildMetricClasses(size, variant, compact, inline, className);
    const trendIcon = trend ? TREND_ICONS[trend] : null;

    return (
      <span ref={ref} className={classes} data-testid={testId} role="status" aria-label={label ? `${label}: ${formattedValue}` : `Value: ${formattedValue}`} {...props}>
        {renderIcon(icon, compact)}
        <span className={styles.valueStyle}>{formattedValue}</span>
        {renderLabel(label)}
        {renderTrendIcon(trendIcon, trend)}
      </span>
    );
  }
);

MetricBadge.displayName = 'MetricBadge';