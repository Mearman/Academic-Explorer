'use client';

import { forwardRef } from 'react';

import type { StatusIndicatorProps } from '../types';

import * as styles from './status-indicator.css';

const STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive', 
  deprecated: 'Deprecated',
  pending: 'Pending',
  verified: 'Verified',
} as const;

export const StatusIndicator = forwardRef<HTMLSpanElement, StatusIndicatorProps>(
  ({ status, size = 'md', showLabel = true, inline = false, className, 'data-testid': testId, ...props }, ref) => {
    const label = STATUS_LABELS[status] || status;
    const classes = [styles.base];
    if (!inline) {
      classes.push(styles.sizeVariants[size], styles.statusVariants[status]);
    } else {
      classes.push(styles.inlineStyle);
    }
    if (className) classes.push(className);

    return (
      <span ref={ref} className={classes.join(' ')} data-testid={testId} role="status" aria-label={`Status: ${label}`} {...props}>
        <span className={`${styles.dotStyle} ${styles.dotVariants[status]}`} aria-hidden="true" />
        {showLabel && <span className={styles.labelStyle}>{label}</span>}
      </span>
    );
  }
);

StatusIndicator.displayName = 'StatusIndicator';