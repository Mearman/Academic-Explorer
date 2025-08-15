'use client';

import { forwardRef } from 'react';

import { EntityBadgeProps, SizeVariant } from '../types';

import { Badge } from './badge';
import * as styles from './badge.css';
import { Icon } from './icon';

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

function buildEntityClasses(entityType: keyof typeof styles.entityTypeVariants, className?: string) {
  return [
    styles.entityTypeVariants[entityType],
    className,
  ].filter(Boolean).join(' ');
}

function EntityIcon({ entityType, size, showIcon }: { 
  entityType: keyof typeof ENTITY_ICONS; 
  size: SizeVariant; 
  showIcon: boolean; 
}) {
  if (!showIcon) return null;
  return (
    <Icon 
      name={ENTITY_ICONS[entityType]} 
      size={size} 
      aria-hidden="true"
    />
  );
}

export const EntityBadge = forwardRef<HTMLSpanElement, EntityBadgeProps>(
  function EntityBadge({ 
    entityType, 
    size = 'md', 
    showIcon = true, 
    className, 
    'data-testid': testId,
    ...props 
  }, ref) {
    const label = ENTITY_LABELS[entityType];
    const entityClasses = buildEntityClasses(entityType, className);

    return (
      <Badge
        ref={ref}
        size={size}
        className={entityClasses}
        data-testid={testId}
        aria-label={`${label} entity type`}
        {...props}
      >
        <EntityIcon entityType={entityType} size={size} showIcon={showIcon} />
        {label}
      </Badge>
    );
  }
);

EntityBadge.displayName = 'EntityBadge';