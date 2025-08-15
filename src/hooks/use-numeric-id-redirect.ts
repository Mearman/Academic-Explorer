import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

import { EntityType, TYPE_TO_PREFIX, ENTITY_ENDPOINTS } from '@/lib/openalex/utils/entity-detection';

/**
 * Hook to handle redirection of numeric IDs to their proper prefixed format within the same route
 * 
 * @param id - The route parameter ID
 * @param entityType - The expected entity type for this route
 * @returns boolean indicating if redirect is in progress
 * 
 * @example
 * ```typescript
 * function WorksPage() {
 *   const { id } = Route.useParams();
 *   const isRedirecting = useNumericIdRedirect(id, EntityType.WORK);
 *   
 *   if (isRedirecting) return <LoadingSkeleton />;
 *   // ... rest of component
 * }
 * ```
 */
export function useNumericIdRedirect(id: string | undefined, entityType: EntityType): boolean {
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;

    // Check if ID is numeric (7-10 digits without prefix)
    if (/^\d{7,10}$/.test(id)) {
      // Get the appropriate prefix for this entity type
      const prefix = TYPE_TO_PREFIX[entityType];
      const endpoint = ENTITY_ENDPOINTS[entityType];
      
      if (prefix && endpoint) {
        // Create full OpenAlex ID and redirect to same route with prefix
        const fullId = `${prefix}${id}`;
        
        // Use explicit route paths instead of dynamic construction
        const routeMap: Record<EntityType, string> = {
          [EntityType.WORK]: '/works/$id',
          [EntityType.AUTHOR]: '/authors/$id',
          [EntityType.SOURCE]: '/sources/$id',
          [EntityType.INSTITUTION]: '/institutions/$id',
          [EntityType.PUBLISHER]: '/publishers/$id',
          [EntityType.FUNDER]: '/funders/$id',
          [EntityType.TOPIC]: '/topics/$id',
          [EntityType.CONCEPT]: '/concepts/$id',
          [EntityType.KEYWORD]: '/keywords/$id',
          [EntityType.CONTINENT]: '/continents/$id',
          [EntityType.REGION]: '/regions/$id',
        };
        
        const routePath = routeMap[entityType];
        if (routePath) {
          // Navigate using TanStack Router which respects basepath
          navigate({ 
            to: routePath.replace('$id', fullId),
            replace: true 
          });
        }
      }
    }
  }, [id, entityType, navigate]);

  // Return true if we're in the process of redirecting
  return id ? /^\d{7,10}$/.test(id) : false;
}