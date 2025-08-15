'use client';

import { forwardRef } from 'react';

import type { IconProps, EntityType } from '../types';

import * as styles from './icon.css';

// Emoji-based icon mapping for different entities and actions
const iconMap = {
  // Entity types
  work: '📄',
  author: '👨‍🔬',
  source: '📚',
  institution: '🏛️',
  publisher: '🏢',
  funder: '💰',
  topic: '🏷️',
  concept: '💡',
  keyword: '🔖',
  continent: '🌍',
  region: '🗺️',
  
  // Actions and states
  search: '🔍',
  filter: '🔽',
  sort: '↕️',
  download: '⬇️',
  upload: '⬆️',
  edit: '✏️',
  delete: '🗑️',
  save: '💾',
  copy: '📋',
  share: '🔗',
  print: '🖨️',
  refresh: '🔄',
  settings: '⚙️',
  help: '❓',
  info: 'ℹ️',
  warning: '⚠️',
  error: '❌',
  success: '✅',
  loading: '⏳',
  
  // Navigation
  back: '⬅️',
  forward: '➡️',
  up: '⬆️',
  down: '⬇️',
  home: '🏠',
  menu: '☰',
  close: '✖️',
  expand: '📖',
  collapse: '📕',
  
  // External links
  doi: '📄',
  orcid: '🔬',
  ror: '🏛️',
  wikidata: '🔗',
  wikipedia: '📖',
  website: '🌐',
  email: '✉️',
  
  // Metrics
  citation: '📊',
  publication: '📝',
  hindex: '📈',
  impact: '💥',
  trend_up: '📈',
  trend_down: '📉',
  trend_neutral: '➖',
  
  // Open access
  open_access: '🔓',
  closed_access: '🔒',
  gold: '🏆',
  green: '🌱',
  hybrid: '🔄',
  bronze: '🥉',
};

/**
 * Get colour CSS class for icon
 */
function getColorClass(colorProp?: string): string {
  if (!colorProp) return '';
  
  // Check if it's an entity type
  if (colorProp in styles.entityIconVariants) {
    return styles.entityIconVariants[colorProp as EntityType];
  }
  
  // Check if it's an action colour
  if (colorProp in styles.actionIconVariants) {
    return styles.actionIconVariants[colorProp as keyof typeof styles.actionIconVariants];
  }
  
  return '';
}

/**
 * Build CSS classes for icon
 */
function buildIconClasses(size: string, color?: string, className?: string): string {
  return [
    styles.base,
    styles.sizeVariants[size as keyof typeof styles.sizeVariants],
    getColorClass(color),
    className,
  ].filter(Boolean).join(' ');
}

export const Icon = forwardRef<HTMLSpanElement, IconProps>(
  ({ 
    name, 
    size = 'md', 
    color,
    className,
    'aria-label': ariaLabel,
    'data-testid': testId,
    ...props 
  }, ref) => {
    const iconSymbol = iconMap[name as keyof typeof iconMap] || '❓';
    const cssClasses = buildIconClasses(size, color, className);
    const customStyle = color && !getColorClass(color) ? { color } : undefined;

    return (
      <span
        ref={ref}
        className={cssClasses}
        style={customStyle}
        data-testid={testId}
        aria-label={ariaLabel || `${name} icon`}
        role="img"
        {...props}
      >
        {iconSymbol}
      </span>
    );
  }
);

Icon.displayName = 'Icon';