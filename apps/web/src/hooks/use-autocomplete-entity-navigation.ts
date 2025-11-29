import type { EntityType } from "@bibgraph/types";
import { useCallback } from "react";

import { AUTOCOMPLETE_ENTITY_TYPES } from "@/components/EntityTypeFilter";

/**
 * Hook for navigating between autocomplete entity type routes.
 *
 * Handles the logic for:
 * - Single type selection → dedicated route (e.g., /autocomplete/works)
 * - Multiple types → general route with types param
 * - All/no types → general route without types param
 *
 * @param query - Current search query to preserve during navigation
 * @returns Callback to handle entity type selection changes
 */
export function useAutocompleteEntityNavigation(query: string) {
  return useCallback(
    (types: EntityType[]) => {
      // If no types or all types selected, go to general autocomplete
      if (
        types.length === 0 ||
        types.length === AUTOCOMPLETE_ENTITY_TYPES.length
      ) {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        window.location.hash = params.toString()
          ? `/autocomplete?${params.toString()}`
          : "/autocomplete";
        return;
      }

      // If single type selected, navigate to that type's route
      if (types.length === 1) {
        const entityType = types[0];
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        window.location.hash = params.toString()
          ? `/autocomplete/${entityType}?${params.toString()}`
          : `/autocomplete/${entityType}`;
        return;
      }

      // Multiple types selected - go to general with types param
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      params.set("types", types.join(","));
      window.location.hash = `/autocomplete?${params.toString()}`;
    },
    [query]
  );
}
