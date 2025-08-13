'use client';

import { forwardRef } from 'react';
import { Icon } from '../atoms/icon';
import { LoadingSkeleton } from '../atoms/loading-skeleton';
import { formatNumber } from '@/lib/openalex/utils/transformers';
import * as styles from './metric-display.css';
import type { SizeVariant } from '../types';

export interface MetricDisplayProps {
  label: string;
  value: number | string;
  description?: string;
  icon?: string;
  format?: 'number' | 'percentage' | 'currency' | 'compact';
  layout?: 'horizontal' | 'vertical' | 'compact';
  size?: SizeVariant;
  variant?: 'default' | 'highlighted' | 'muted';
  trend?: {
    direction: 'up' | 'down' | 'neutral';
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

export const MetricDisplay = forwardRef<HTMLDivElement, MetricDisplayProps>(
  ({ 
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

    const getTrendIcon = (direction: string): string => {
      switch (direction) {
        case 'up': return 'trend_up';
        case 'down': return 'trend_down';
        case 'neutral': return 'trend_neutral';
        default: return 'trend_neutral';
      }
    };

    // Map size to available CSS variants
    const mapSize = (size: SizeVariant): 'sm' | 'md' | 'lg' => {
      if (size === 'xs') return 'sm';
      if (size === 'xl') return 'lg';
      if (size === 'sm') return 'sm';
      if (size === 'md') return 'md';
      if (size === 'lg') return 'lg';
      return 'md'; // default fallback
    };

    const baseClasses = [
      styles.base,
      styles.layoutVariants[layout],
      styles.sizeVariants[mapSize(size)],
      styles.variantStyles[variant],
      clickable && styles.clickableStyle,
      loading && styles.loadingStyle,
      className,
    ].filter(Boolean).join(' ');

    const handleClick = () => {
      if (clickable && onClick) {
        onClick();
      }
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (clickable && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onClick?.();
      }
    };

    if (loading) {
      return (
        <div
          ref={ref}
          className={baseClasses}
          data-testid={testId}
          {...props}
        >
          {icon && layout !== 'compact' && (
            <div className={styles.iconContainer}>
              <LoadingSkeleton shape="circle" width="24px" height="24px" />
            </div>
          )}
          <div className={styles.contentContainer}>
            <LoadingSkeleton preset="text" width="60%" />
            <LoadingSkeleton preset="title" width="40%" />
            {description && (
              <LoadingSkeleton preset="text" width="80%" />
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={baseClasses}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={clickable ? 0 : undefined}
        role={clickable ? 'button' : undefined}
        aria-label={clickable ? `${label}: ${formatValue(value)}` : undefined}
        data-testid={testId}
        {...props}
      >
        {icon && layout !== 'compact' && (
          <div className={styles.iconContainer}>
            <Icon 
              name={icon} 
              size={size === 'sm' ? 'sm' : 'md'} 
              aria-hidden="true" 
            />
          </div>
        )}
        
        <div className={styles.contentContainer}>
          <div className={styles.labelStyle}>
            {icon && layout === 'compact' && (
              <Icon name={icon} size="sm" aria-hidden="true" />
            )}
            {label}
          </div>
          
          <div className={styles.valueContainer}>
            <span className={styles.valueStyle}>
              {formatValue(value)}
            </span>
            
            {trend && (
              <div className={`${styles.trendContainer} ${styles.trendVariants[trend.direction]}`}>
                <Icon 
                  name={getTrendIcon(trend.direction)} 
                  size="sm" 
                  aria-hidden="true" 
                />
                {trend.value && (
                  <span className={styles.changeValueStyle}>
                    {typeof trend.value === 'number' ? 
                      trend.value.toFixed(1) : 
                      trend.value
                    }
                    {trend.label && <span> {trend.label}</span>}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {description && (
            <div className={styles.descriptionStyle}>
              {description}
            </div>
          )}
          
          {accessories && (
            <div className={styles.accessoryContainer}>
              {accessories}
            </div>
          )}
        </div>
      </div>
    );
  }
);

MetricDisplay.displayName = 'MetricDisplay';