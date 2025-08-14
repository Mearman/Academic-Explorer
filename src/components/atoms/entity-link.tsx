import React from 'react';
import { Link } from '@tanstack/react-router';
import { Anchor, Text } from '@mantine/core';
import { EntityType, detectEntityType } from '@/lib/openalex/utils/entity-detection';

interface EntityLinkProps {
  entityId: string;
  displayName: string;
  entityType?: EntityType;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  weight?: number;
  color?: string;
  underline?: boolean;
  className?: string;
  fallbackToExternal?: boolean;
}

/**
 * EntityLink component creates internal links to other entities within the platform
 * Automatically detects entity type from ID if not provided
 */
export function EntityLink({
  entityId,
  displayName,
  entityType,
  size = 'sm',
  weight,
  color,
  underline = true,
  className,
  fallbackToExternal = true
}: EntityLinkProps) {
  // Detect entity type if not provided
  const detectedType = entityType || detectEntityType(entityId);
  
  // Generate internal route path
  const getInternalPath = (type: EntityType, id: string): string => {
    const cleanId = id.replace('https://openalex.org/', '');
    
    switch (type) {
      case EntityType.WORK:
        return `/works/${cleanId}`;
      case EntityType.AUTHOR:
        return `/authors/${cleanId}`;
      case EntityType.SOURCE:
        return `/sources/${cleanId}`;
      case EntityType.INSTITUTION:
        return `/institutions/${cleanId}`;
      case EntityType.CONCEPT:
        return `/concepts/${cleanId}`;
      case EntityType.TOPIC:
        return `/topics/${cleanId}`;
      case EntityType.PUBLISHER:
        return `/publishers/${cleanId}`;
      case EntityType.FUNDER:
        return `/funders/${cleanId}`;
      default:
        return `/entity/${cleanId}`;
    }
  };

  // Handle unknown entity types
  if (!detectedType) {
    if (fallbackToExternal) {
      return (
        <Anchor
          href={entityId.startsWith('http') ? entityId : `https://openalex.org/${entityId}`}
          target="_blank"
          rel="noopener noreferrer"
          size={size}
          fw={weight}
          c={color}
          td={underline ? 'underline' : 'none'}
          className={className}
        >
          {displayName}
        </Anchor>
      );
    } else {
      return (
        <Text
          size={size}
          fw={weight}
          c={color || 'dimmed'}
          className={className}
        >
          {displayName}
        </Text>
      );
    }
  }

  const internalPath = getInternalPath(detectedType, entityId);

  return (
    <Anchor
      component={Link}
      to={internalPath}
      size={size}
      fw={weight}
      c={color}
      td={underline ? 'underline' : 'none'}
      className={className}
    >
      {displayName}
    </Anchor>
  );
}