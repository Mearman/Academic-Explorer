'use client';

import React, { forwardRef } from 'react';

import { mapSizeVariant } from '@/lib/metric-formatting';
import type { MetricFormat, TrendDirection } from '@/lib/metric-formatting';

import type { SizeVariant } from '../types';

import { LoadingState } from './metric-display/loading-state';
import { MetricContent } from './metric-display/metric-content';
import * as styles from './metric-display.css';

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

// Handle interaction events
function createEventHandlers(clickable: boolean, onClick?: () => void) {
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

  return { handleClick, handleKeyDown };
}

// Build CSS classes
function buildCssClasses(
  layout: 'horizontal' | 'vertical' | 'compact',
  size: SizeVariant,
  variant: 'default' | 'highlighted' | 'muted',
  clickable: boolean,
  loading: boolean,
  className?: string
): string {
  return [
    styles.base,
    styles.layoutVariants[layout],
    styles.sizeVariants[mapSizeVariant(size)],
    styles.variantStyles[variant],
    clickable && styles.clickableStyle,
    loading && styles.loadingStyle,
    className,
  ].filter(Boolean).join(' ');
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
    const { handleClick, handleKeyDown } = createEventHandlers(clickable, onClick);
    const baseClasses = buildCssClasses(layout, size, variant, clickable, loading, className);

    if (loading) {
      return (
        <LoadingState
          ref={ref}
          icon={icon}
          layout={layout}
          description={description}
          className={baseClasses}
          data-testid={testId}
          {...props}
        />
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
        aria-label={clickable ? `${label}: ${value}` : undefined}
        data-testid={testId}
        {...props}
      >
        <MetricContent
          label={label}
          value={value}
          format={format}
          icon={icon}
          layout={layout}
          size={size}
          description={description}
          trend={trend}
          accessories={accessories}
        />
      </div>
    );
  }
);

MetricDisplay.displayName = 'MetricDisplay';