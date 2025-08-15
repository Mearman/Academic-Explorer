'use client';

import { forwardRef } from 'react';

import { EntityBadgeProps } from '../types';

import { Badge } from './badge';
import { Icon } from './icon';
import * as styles from './badge.css';

const ENTITY_LABELS = {
  work: 'Work',
  author: 'Author',
  source: 'Source',
  institution: 'Institution',
  publisher: 'Publisher',
  funder: 'Funder',
  topic: 'Topic',
  concept: 'Concept',
  keyword: 'Keyword',
  continent: 'Continent',
  region: 'Region',
} as const;

const ENTITY_ICONS = {
  work: 'document',
  author: 'user',
  source: 'book-open',
  institution: 'building',
  publisher: 'briefcase',
  funder: 'currency-dollar',
  topic: 'tag',
  concept: 'light-bulb',
  keyword: 'hashtag',
  continent: 'globe',
  region: 'map',
} as const;

export const EntityBadge = forwardRef<HTMLSpanElement, EntityBadgeProps>(
  ({ 
    entityType, 
    size = 'md', 
    showIcon = true, 
    className, 
    'data-testid': testId,
    ...props 
  }, ref) => {
    const label = ENTITY_LABELS[entityType];
    const iconName = ENTITY_ICONS[entityType];
    
    const entityClasses = [
      styles.entityTypeVariants[entityType],
      className,
    ].filter(Boolean).join(' ');

    return (
      <Badge
        ref={ref}
        size={size}
        className={entityClasses}
        data-testid={testId}
        aria-label={`${label} entity type`}
        {...props}
      >
        {showIcon && (
          <Icon 
            name={iconName} 
            size={size} 
            aria-hidden="true"
          />
        )}
        {label}
      </Badge>
    );
  }
);

EntityBadge.displayName = 'EntityBadge';