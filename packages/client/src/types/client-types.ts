/**
 * Client-specific types only
 * All entity types should be imported directly from @academic-explorer/types where needed
 */

// Core client types
export type {
  OpenAlexId,
  OpenAlexError,
  OpenAlexResponse,
  OpenAlexQueryParams as QueryParams,
  AutocompleteResult,
} from "@academic-explorer/types/entities";

// Client-specific types
export interface AutocompleteOptions {
  limit?: number;
}

/**
 * OpenAlex Data Version parameter
 * - undefined: Uses v2 (default)
 * - '1': Explicitly request v1 (temporary, deprecated Dec 2025)
 * - '2': Explicitly request v2
 */
export type DataVersion = '1' | '2' | undefined;

/**
 * OpenAlex API query parameters for Walden support
 */
export interface OpenAlexQueryParams {
  /** Request Data Version 1 (temporary support through Nov 2025) */
  'data-version'?: '1';
  /** Include xpac works (190M non-traditional outputs) */
  include_xpac?: boolean;
}

export type { OpenAlexClientConfig } from "../client";