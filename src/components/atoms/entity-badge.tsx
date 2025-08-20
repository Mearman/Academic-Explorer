import { Badge } from '@mantine/core';
import { forwardRef } from 'react';

import { EntityBadgeProps, SizeVariant } from '../types';

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

// Simple color mapping for entity types using Mantine colors
const ENTITY_COLORS = {
  work: 'blue',
  author: 'green', 
  source: 'orange',
  institution: 'grape',
  publisher: 'red',
  funder: 'cyan',
  topic: 'orange',
  concept: 'lime',
  keyword: 'pink',
  continent: 'indigo',
  region: 'teal',
} as const;

interface EntityIconProps {
  entityType: keyof typeof ENTITY_ICONS; 
  size: SizeVariant; 
  showIcon: boolean; 
}

function EntityIcon(props: EntityIconProps) {
  const { entityType, size, showIcon } = props;
  if (!showIcon) return null;
  return (
    <Icon 
      name={ENTITY_ICONS[entityType]} 
      size={size} 
      aria-hidden="true"
    />
  );
}

export const EntityBadge = forwardRef<HTMLDivElement, EntityBadgeProps>(
  function EntityBadge(props, ref) {
    const { 
      entityType, 
      size = 'md', 
      showIcon = true, 
      className, 
      'data-testid': testId,
      ...restProps 
    } = props;
    const label = ENTITY_LABELS[entityType];
    const color = ENTITY_COLORS[entityType];

    return (
      <Badge
        ref={ref}
        size={size}
        color={color}
        variant="light"
        className={className}
        data-testid={testId}
        {...restProps}
      >
        <EntityIcon entityType={entityType} size={size} showIcon={showIcon} />
        {label}
      </Badge>
    );
  }
);

EntityBadge.displayName = 'EntityBadge';