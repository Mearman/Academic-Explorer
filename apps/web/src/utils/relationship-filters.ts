/**
 * Utility functions for filtering relationship sections
 * Used by entity detail pages to filter displayed relationships
 *
 * @module relationship-filters
 * @see specs/016-entity-relationship-viz/spec.md (User Story 3)
 */

import type { RelationshipSection } from '@/types/relationship';
import { RelationType } from '@academic-explorer/graph';

export type EdgeDirectionFilter = 'outbound' | 'inbound' | 'both';

/**
 * Filter relationship sections by relationship type
 *
 * @param sections - All relationship sections
 * @param types - Allowed relationship types (empty array = show all)
 * @returns Filtered sections containing only specified types
 */
export function filterByType(
  sections: RelationshipSection[],
  types: RelationType[]
): RelationshipSection[] {
  // Empty array means show all types
  if (types.length === 0) {
    return sections;
  }

  // Filter to only sections whose type is in the allowed list
  return sections.filter((section) => types.includes(section.type));
}

/**
 * Filter relationship sections by direction
 *
 * @param sections - All relationship sections
 * @param direction - Direction filter ('inbound', 'outbound', or 'both')
 * @returns Filtered sections matching the specified direction
 */
export function filterByDirection(
  sections: RelationshipSection[],
  direction: EdgeDirectionFilter
): RelationshipSection[] {
  if (direction === 'both') {
    return sections;
  }

  return sections.filter((section) => section.direction === direction);
}

/**
 * Combined filter function
 * Applies both type and direction filters
 *
 * @param sections - All relationship sections
 * @param options - Filter options
 * @returns Filtered sections
 */
export function filterRelationshipSections(
  sections: RelationshipSection[],
  options: {
    types?: RelationType[];
    direction?: EdgeDirectionFilter;
  }
): RelationshipSection[] {
  let filtered = sections;

  if (options.types && options.types.length > 0) {
    filtered = filterByType(filtered, options.types);
  }

  if (options.direction && options.direction !== 'both') {
    filtered = filterByDirection(filtered, options.direction);
  }

  return filtered;
}
