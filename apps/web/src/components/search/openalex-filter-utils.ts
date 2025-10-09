/**
 * Utilities for OpenAlex filter processing and validation
 */

import type { OpenAlexFilterState } from "./OpenAlexFilters";

// Default filter state for convenience
export const DEFAULT_OPENALEX_FILTERS: OpenAlexFilterState = {
  fromPublicationDate: null,
  toPublicationDate: null,
  minCitationCount: "",
  maxCitationCount: "",
  openAccessStatus: null,
};

// Utility function to convert filters to OpenAlex API format
export function convertToOpenAlexAPIFilters(
  filters: OpenAlexFilterState,
): Record<string, unknown> {
  const apiFilters: Record<string, unknown> = {};

  // Convert date filters
  if (filters.fromPublicationDate) {
    apiFilters["from_publication_date"] = filters.fromPublicationDate
      .toISOString()
      .split("T")[0];
  }

  if (filters.toPublicationDate) {
    apiFilters["to_publication_date"] = filters.toPublicationDate
      .toISOString()
      .split("T")[0];
  }

  // Convert citation count filters
  if (filters.minCitationCount !== "" && filters.maxCitationCount !== "") {
    // Both min and max specified - use range format
    apiFilters["cited_by_count"] =
      `${filters.minCitationCount}-${filters.maxCitationCount}`;
  } else if (filters.minCitationCount !== "") {
    // Only min specified - use >= format
    apiFilters["cited_by_count"] = `>=${filters.minCitationCount}`;
  } else if (filters.maxCitationCount !== "") {
    // Only max specified - use <= format
    apiFilters["cited_by_count"] = `<=${filters.maxCitationCount}`;
  }

  // Convert open access filter
  if (filters.openAccessStatus && filters.openAccessStatus !== "") {
    apiFilters["is_oa"] = filters.openAccessStatus === "true";
  }

  return apiFilters;
}

// Utility function to validate filter state
export function validateOpenAlexFilters(filters: OpenAlexFilterState): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate date range
  if (
    filters.fromPublicationDate &&
    filters.toPublicationDate &&
    filters.fromPublicationDate > filters.toPublicationDate
  ) {
    errors.push("Publication start date must be before end date");
  }

  // Validate citation count range
  const minCitations =
    typeof filters.minCitationCount === "number"
      ? filters.minCitationCount
      : parseInt(String(filters.minCitationCount));
  const maxCitations =
    typeof filters.maxCitationCount === "number"
      ? filters.maxCitationCount
      : parseInt(String(filters.maxCitationCount));

  if (
    !isNaN(minCitations) &&
    !isNaN(maxCitations) &&
    minCitations > maxCitations
  ) {
    errors.push("Minimum citation count must be less than or equal to maximum");
  }

  if (!isNaN(minCitations) && minCitations < 0) {
    errors.push("Citation count cannot be negative");
  }

  if (!isNaN(maxCitations) && maxCitations < 0) {
    errors.push("Citation count cannot be negative");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
