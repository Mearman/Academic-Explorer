import { useEffect } from 'react';

import { useEntityGraphStore } from '@/stores/entity-graph-store';

/**
 * Hook to ensure entity graph store is hydrated from IndexedDB on app startup
 */
export function useEntityGraphHydration() {
  const { hydrateFromIndexedDB, isHydrated } = useEntityGraphStore();

  useEffect(() => {
    // Only hydrate once when the hook is first used
    if (!isHydrated) {
      console.log('[EntityGraphHydration] Hydrating entity graph store from IndexedDB');
      hydrateFromIndexedDB().catch(error => {
        console.error('[EntityGraphHydration] Failed to hydrate:', error);
      });
    }
  }, [hydrateFromIndexedDB, isHydrated]);
}