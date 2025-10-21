/**
 * Query parameter utilities
 */

import type { QueryParams } from "@academic-explorer/types/entities";

/**
 * Convert typed query parameters to base QueryParams
 * This is a generic utility for converting specific query param types to the base type
 */
export function toQueryParams<T extends Record<string, unknown>>(
  params: T,
): QueryParams {
  const result: QueryParams = {};

  // Copy all properties
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  });

  return result;
}
