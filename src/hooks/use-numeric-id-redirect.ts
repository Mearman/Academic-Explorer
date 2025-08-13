import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
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
        navigate({ 
          to: `/${endpoint}/$id` as const, 
          params: { id: fullId },
          replace: true 
        });
      }
    }
  }, [id, entityType, navigate]);

  // Return true if we're in the process of redirecting
  return id ? /^\d{7,10}$/.test(id) : false;
}