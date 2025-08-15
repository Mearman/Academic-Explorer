'use client';

import { forwardRef } from 'react';

import { BadgeProps } from '../types';

import * as styles from './badge.css';

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge({ 
    children, 
    variant = 'default', 
    size = 'md', 
    pill = false, 
    removable = false, 
    onRemove, 
    className, 
    'data-testid': testId,
    ...props 
  }, ref) {
    const handleRemove = (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove?.();
    };

    const baseClasses = [
      styles.base,
      styles.sizeVariants[size],
      styles.variantStyles[variant],
      pill && styles.pillStyle,
      removable && styles.removableStyle,
      className,
    ].filter(Boolean).join(' ');

    return (
      <span
        ref={ref}
        className={baseClasses}
        data-testid={testId}
        role="status"
        {...props}
      >
        {children}
        {removable && onRemove && (
          <button
            type="button"
            className={styles.removeButton}
            onClick={handleRemove}
            aria-label="Remove"
            tabIndex={0}
          >
            ×
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';