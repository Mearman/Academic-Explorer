/**
 * Utilities for converting visual queries to OpenAlex API parameters
 */

import type { VisualQuery } from "./VisualQueryBuilder";

// Helper function to check if a group has chips
const hasChips = (group: VisualQuery["groups"][0]): boolean =>
  group.chips.length > 0;

// Helper function to convert field chips to filter parameters
const convertFieldChip = (
  chip: VisualQuery["groups"][0]["chips"][0],
): string | null => {
  if (chip.type !== "field" || !chip.field) return null;

  switch (chip.field) {
    case "display_name":
      return `display_name.search:${chip.label}`;
    case "publication_year":
      return `publication_year:${chip.label}`;
    default:
      // Add more field conversions as needed
      return null;
  }
};

// Helper function to process chips in a group
const processGroupChips = (group: VisualQuery["groups"][0]): string[] => {
  return group.chips
    .map(convertFieldChip)
    .filter((filter): filter is string => filter !== null);
};

// Helper function to combine filters with logical operator
const combineFilters = (filters: string[], operator: string): string => {
  return filters.join(`,${operator.toLowerCase()},`);
};

// Example of how to convert the visual query to OpenAlex API parameters
export function convertQueryToOpenAlexParams(
  query: VisualQuery,
): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  // Process each group that has chips
  const validGroups = query.groups.filter(hasChips);

  for (const group of validGroups) {
    const filters = processGroupChips(group);

    if (filters.length > 0) {
      const filterString = combineFilters(filters, group.operator);
      params.filter = filterString;
    }
  }

  return params;
}
