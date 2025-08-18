import { Anchor, Text } from '@mantine/core';
import { Link } from '@tanstack/react-router';
import React from 'react';

import { EntityType } from '@/lib/openalex/utils/entity-detection';

import { detectEntityType, buildEntityPath, buildExternalUrl } from './utils/entity-link-utils';

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

function renderFallback(entityId: string, displayName: string, size: string, weight?: number, color?: string, underline?: boolean, className?: string, fallbackToExternal?: boolean) {
  if (!fallbackToExternal) {
    return <Text size={size} fw={weight} c={color || 'dimmed'} className={className}>{displayName}</Text>;
  }
  const href = buildExternalUrl(entityId);
  return <Anchor href={href} target="_blank" rel="noopener noreferrer" size={size} fw={weight} c={color} td={underline ? 'underline' : 'none'} className={className}>{displayName}</Anchor>;
}

export function EntityLink({ entityId, displayName, entityType, size = 'sm', weight, color, underline = true, className, fallbackToExternal = true }: EntityLinkProps) {
  const detectedType = entityType || detectEntityType(entityId);
  
  if (!detectedType) {
    return renderFallback(entityId, displayName, size, weight, color, underline, className, fallbackToExternal);
  }

  const internalPath = buildEntityPath(detectedType, entityId);
  return <Anchor component={Link} to={internalPath} size={size} fw={weight} c={color} td={underline ? 'underline' : 'none'} className={className}>{displayName}</Anchor>;
}