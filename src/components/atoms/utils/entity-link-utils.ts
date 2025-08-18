// Simple utility functions for entity links (simplified from complex utils)

export function getEntityUrl(entityId: string): string {
  return entityId.startsWith('http') ? entityId : `/${entityId}`;
}

export function getEntityDisplayName(entityId: string, displayName?: string): string {
  return displayName || entityId;
}

export function buildEntityLinkProps(entityId: string, displayName?: string) {
  return {
    to: getEntityUrl(entityId),
    children: getEntityDisplayName(entityId, displayName),
  };
}

export function detectEntityType(entityId: string): string | null {
  if (entityId.startsWith('W')) return 'works';
  if (entityId.startsWith('A')) return 'authors';
  if (entityId.startsWith('S')) return 'sources';
  if (entityId.startsWith('I')) return 'institutions';
  if (entityId.startsWith('P')) return 'publishers';
  if (entityId.startsWith('F')) return 'funders';
  if (entityId.startsWith('T')) return 'topics';
  if (entityId.startsWith('C')) return 'concepts';
  return null;
}

export function buildEntityPath(entityId: string, entityType?: string): string {
  const type = entityType || detectEntityType(entityId);
  return type ? `/${type}/${entityId}` : `/${entityId}`;
}

export function buildExternalUrl(entityId: string, _?: unknown): string {
  return entityId.startsWith('http') ? entityId : `https://openalex.org/${entityId}`;
}