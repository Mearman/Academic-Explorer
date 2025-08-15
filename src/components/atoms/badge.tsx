'use client';

import { forwardRef } from 'react';

import { BadgeProps } from '../types';

import * as styles from './badge.css';

function buildBadgeClasses(
  variant: keyof typeof styles.variantStyles, 
  size: keyof typeof styles.sizeVariants, 
  pill: boolean, 
  removable: boolean, 
  className?: string
) {
  return [
    styles.base,
    styles.sizeVariants[size],
    styles.variantStyles[variant],
    pill && styles.pillStyle,
    removable && styles.removableStyle,
    className,
  ].filter(Boolean).join(' ');
}

function RemoveButton({ onRemove }: { onRemove: () => void }) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
  };

  return (
    <button
      type="button"
      className={styles.removeButton}
      onClick={handleClick}
      aria-label="Remove"
      tabIndex={0}
    >
      ×
    </button>
  );
}

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
    const baseClasses = buildBadgeClasses(variant, size, pill, removable, className);

    return (
      <span
        ref={ref}
        className={baseClasses}
        data-testid={testId}
        role="status"
        {...props}
      >
        {children}
        {removable && onRemove && <RemoveButton onRemove={onRemove} />}
      </span>
    );
  }
);

Badge.displayName = 'Badge';