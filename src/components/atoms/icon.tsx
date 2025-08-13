'use client';

import { forwardRef } from 'react';
import * as styles from './icon.css';
import type { IconProps, EntityType } from '../types';

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
    
    const getColorClass = (colorProp?: string) => {
      if (!colorProp) return '';
      
      // Check if it's an entity type
      if (colorProp in styles.entityIconVariants) {
        return styles.entityIconVariants[colorProp as EntityType];
      }
      
      // Check if it's an action colour
      if (colorProp in styles.actionIconVariants) {
        return styles.actionIconVariants[colorProp as keyof typeof styles.actionIconVariants];
      }
      
      // Return empty string for custom colours (handled via style prop)
      return '';
    };

    const baseClasses = [
      styles.base,
      styles.sizeVariants[size],
      getColorClass(color),
      className,
    ].filter(Boolean).join(' ');

    const customStyle = color && !getColorClass(color) ? { color } : undefined;

    return (
      <span
        ref={ref}
        className={baseClasses}
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