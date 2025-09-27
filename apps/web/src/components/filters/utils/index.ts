/**
 * Filter utilities for the Academic Explorer application
 *
 * This module provides utilities for working with OpenAlex API filters,
 * including conversion from TypeScript filter objects to query strings.
 */

export {
  FilterBuilder,
  defaultFilterBuilder,
  strictFilterBuilder,
  filtersToQueryString,
  validateFilters,
  type FilterBuilderOptions,
  type FilterValidationResult
} from "./FilterBuilder";