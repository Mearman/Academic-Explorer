import { EntityType, parseEntityIdentifier } from '@/lib/openalex/utils/entity-detection';

const PATH_MAP = {
  [EntityType.WORK]: 'works', [EntityType.AUTHOR]: 'authors', [EntityType.SOURCE]: 'sources',
  [EntityType.INSTITUTION]: 'institutions', [EntityType.CONCEPT]: 'concepts', [EntityType.TOPIC]: 'topics',
  [EntityType.PUBLISHER]: 'publishers', [EntityType.FUNDER]: 'funders',
} as const;

export function detectEntityType(entityId: string, providedType?: EntityType): EntityType | null {
  if (providedType) return providedType;
  try { 
    return parseEntityIdentifier(entityId).type; 
  } catch { 
    return null; 
  }
}

export function buildEntityPath(detectedType: EntityType, entityId: string): string {
  const cleanId = entityId.replace('https://openalex.org/', '');
  const pathSegment = PATH_MAP[detectedType] || 'entity';
  return `/${pathSegment}/${cleanId}`;
}

export function buildExternalUrl(entityId: string): string {
  return entityId.startsWith('http') ? entityId : `https://openalex.org/${entityId}`;
}