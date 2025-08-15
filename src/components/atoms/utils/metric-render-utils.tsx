import React from 'react';

import * as styles from '../metric-badge.css';

export function renderIcon(icon?: React.ReactNode, compact?: boolean) {
  if (!icon || compact) return null;
  return <span className={styles.iconStyle}>{icon}</span>;
}

export function renderLabel(label?: string) {
  if (!label) return null;
  return <span className={styles.labelStyle}>{label}</span>;
}

export function renderTrendIcon(trendIcon: string | null, trend?: string) {
  if (!trendIcon || !trend) return null;
  return <span className={`${styles.trendIndicator} ${styles.trendVariants[trend]}`}>{trendIcon}</span>;
}

export function buildMetricClasses(
  size: string,
  variant: string,
  compact: boolean,
  inline: boolean,
  className?: string
): string {
  const classes = [styles.base, styles.sizeVariants[size], styles.variantStyles[variant]];
  if (compact) classes.push(styles.compactStyle);
  if (inline) classes.push(styles.inlineStyle);
  if (className) classes.push(className);
  return classes.join(' ');
}