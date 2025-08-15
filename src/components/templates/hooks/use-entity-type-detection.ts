import { useMemo } from 'react';

import type { OpenAlexEntity } from '@/lib/openalex/types';
import { detectEntityType, EntityType as OpenAlexEntityType } from '@/lib/openalex/utils/entity-detection';
import type { EntityType } from '@/types/entity-graph';

export function useEntityTypeDetection(entity: OpenAlexEntity | null | undefined) {
  return useMemo(() => {
    if (!entity?.id) return null;
    
    try {
      return detectEntityType(entity.id) as EntityType;
    } catch {
      // Fallback: try to determine from entity structure
      if ('authorships' in entity) return OpenAlexEntityType.WORK;
      if ('affiliations' in entity && !('authorships' in entity)) return OpenAlexEntityType.AUTHOR;
      if ('is_oa' in entity && 'is_in_doaj' in entity) return OpenAlexEntityType.SOURCE;
      if ('type' in entity && 'geo' in entity) return OpenAlexEntityType.INSTITUTION;
      if ('hierarchy_level' in entity) return OpenAlexEntityType.PUBLISHER;
      if ('grants_count' in entity) return OpenAlexEntityType.FUNDER;
      if ('subfield' in entity) return OpenAlexEntityType.TOPIC;
      if ('level' in entity) return OpenAlexEntityType.CONCEPT;
      
      return OpenAlexEntityType.WORK; // Default fallback
    }
  }, [entity]);
}

const ENTITY_TYPE_TO_ENDPOINT_MAP: Record<EntityType, string> = {
  'work': 'works',
  'author': 'authors',
  'source': 'sources',
  'institution': 'institutions',
  'publisher': 'publishers',
  'funder': 'funders',
  'topic': 'topics',
  'concept': 'concepts',
  'keyword': 'keywords',
  'continent': 'continents',
  'region': 'regions',
} as const;

export function getEntityEndpointFromType(type: EntityType): string {
  return ENTITY_TYPE_TO_ENDPOINT_MAP[type] || 'entity';
}