import { useMemo } from 'react';

import { detectEntityType, EntityType as OpenAlexEntityType } from '@/lib/openalex/utils/entity-detection';
import type { EntityType } from '@/types/entity-graph';

export function useEntityTypeDetection(entity: any) {
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
  }, [entity?.id]);
}

export function getEntityEndpointFromType(type: EntityType): string {
  switch (type) {
    case 'work': return 'works';
    case 'author': return 'authors';
    case 'source': return 'sources';
    case 'institution': return 'institutions';
    case 'publisher': return 'publishers';
    case 'funder': return 'funders';
    case 'topic': return 'topics';
    case 'concept': return 'concepts';
    case 'keyword': return 'keywords';
    case 'continent': return 'continents';
    case 'region': return 'regions';
    default: return 'entity';
  }
}