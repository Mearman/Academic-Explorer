/**
 * Utilities for converting visual queries to OpenAlex API parameters
 */

import type { VisualQuery } from './VisualQueryBuilder';

// Example of how to convert the visual query to OpenAlex API parameters
export function convertQueryToOpenAlexParams(query: VisualQuery): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  // This is a placeholder implementation
  // In a real application, you would convert the visual query structure
  // to actual OpenAlex API filter parameters

  for (const group of query.groups) {
    if (group.chips.length === 0) continue;

    const filters: string[] = [];

    for (const chip of group.chips) {
      if (chip.type === "field" && chip.field) {
        // Convert field chips to filter parameters
        // Example: display_name field becomes a search parameter
        if (chip.field === "display_name") {
          filters.push(`display_name.search:${chip.label}`);
        } else if (chip.field === "publication_year") {
          filters.push(`publication_year:${chip.label}`);
        }
        // Add more field conversions as needed
      }
    }

    if (filters.length > 0) {
      // Combine filters with the group's logical operator
      const filterString = filters.join(`,${group.operator.toLowerCase()},`);
      params.filter = filterString;
    }
  }

  return params;
}