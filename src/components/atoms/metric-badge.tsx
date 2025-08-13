'use client';

import { forwardRef } from 'react';
import { formatNumber } from '@/lib/openalex/utils/transformers';
import * as styles from './metric-badge.css';
import type { SizeVariant } from '../types';

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
    const formatValue = (val: number | string): string => {
      if (typeof val === 'string') return val;
      
      switch (format) {
        case 'percentage':
          return `${val.toFixed(1)}%`;
        case 'currency':
          return new Intl.NumberFormat('en-GB', { 
            style: 'currency', 
            currency: 'GBP' 
          }).format(val);
        case 'compact':
          return formatNumber(val);
        case 'number':
        default:
          return val.toLocaleString('en-GB');
      }
    };

    const getTrendIcon = (trendType?: string) => {
      switch (trendType) {
        case 'up': return '↗';
        case 'down': return '↘';
        case 'neutral': return '→';
        default: return null;
      }
    };

    const baseClasses = [
      styles.base,
      styles.sizeVariants[size],
      styles.variantStyles[variant],
      compact && styles.compactStyle,
      inline && styles.inlineStyle,
      className,
    ].filter(Boolean).join(' ');

    const content = compact ? (
      <>
        <span className={styles.valueStyle}>{formatValue(value)}</span>
        {label && <span className={styles.labelStyle}>{label}</span>}
        {trend && (
          <span className={`${styles.trendIndicator} ${styles.trendVariants[trend]}`}>
            {getTrendIcon(trend)}
          </span>
        )}
      </>
    ) : (
      <>
        {icon && <span className={styles.iconStyle}>{icon}</span>}
        <span className={styles.valueStyle}>{formatValue(value)}</span>
        {label && <span className={styles.labelStyle}>{label}</span>}
        {trend && (
          <span className={`${styles.trendIndicator} ${styles.trendVariants[trend]}`}>
            {getTrendIcon(trend)}
          </span>
        )}
      </>
    );

    return (
      <span
        ref={ref}
        className={baseClasses}
        data-testid={testId}
        role="status"
        aria-label={label ? `${label}: ${formatValue(value)}` : `Value: ${formatValue(value)}`}
        {...props}
      >
        {content}
      </span>
    );
  }
);

MetricBadge.displayName = 'MetricBadge';