'use client';

import { forwardRef } from 'react';
import * as styles from './status-indicator.css';
import type { StatusIndicatorProps } from '../types';

export const StatusIndicator = forwardRef<HTMLSpanElement, StatusIndicatorProps>(
  ({ 
    status, 
    size = 'md', 
    showLabel = true, 
    inline = false,
    className,
    'data-testid': testId,
    ...props 
  }, ref) => {
    const getStatusLabel = (status: string): string => {
      const labels = {
        active: 'Active',
        inactive: 'Inactive',
        deprecated: 'Deprecated',
        pending: 'Pending',
        verified: 'Verified',
      };
      return labels[status as keyof typeof labels] || status;
    };

    const baseClasses = [
      styles.base,
      !inline && styles.sizeVariants[size],
      !inline && styles.statusVariants[status],
      inline && styles.inlineStyle,
      className,
    ].filter(Boolean).join(' ');

    const dotClasses = [
      styles.dotStyle,
      styles.dotVariants[status],
    ].join(' ');

    return (
      <span
        ref={ref}
        className={baseClasses}
        data-testid={testId}
        role="status"
        aria-label={`Status: ${getStatusLabel(status)}`}
        {...props}
      >
        <span className={dotClasses} aria-hidden="true" />
        {showLabel && (
          <span className={styles.labelStyle}>
            {getStatusLabel(status)}
          </span>
        )}
      </span>
    );
  }
);

StatusIndicator.displayName = 'StatusIndicator';