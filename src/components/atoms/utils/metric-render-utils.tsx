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

type TrendType = 'up' | 'down' | 'neutral';

function isTrendType(value: string): value is TrendType {
  return ['up', 'down', 'neutral'].includes(value);
}

export function renderTrendIcon(trendIcon: string | null, trend?: string) {
  if (!trendIcon || !trend || !isTrendType(trend)) return null;
  return <span className={`${styles.trendIndicator} ${styles.trendVariants[trend]}`}>{trendIcon}</span>;
}

type SizeType = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type VariantType = 'default' | 'success' | 'warning' | 'error' | 'primary' | 'muted';

function isSizeType(value: string): value is SizeType {
  return ['xs', 'sm', 'md', 'lg', 'xl'].includes(value);
}

function isVariantType(value: string): value is VariantType {
  return ['default', 'success', 'warning', 'error', 'primary', 'muted'].includes(value);
}

export function buildMetricClasses(
  size: string,
  variant: string,
  compact: boolean,
  inline: boolean,
  className?: string
): string {
  const classes = [styles.base];
  
  if (isSizeType(size)) {
    classes.push(styles.sizeVariants[size]);
  }
  
  if (isVariantType(variant)) {
    classes.push(styles.variantStyles[variant]);
  }
  
  if (compact) classes.push(styles.compactStyle);
  if (inline) classes.push(styles.inlineStyle);
  if (className) classes.push(className);
  return classes.join(' ');
}