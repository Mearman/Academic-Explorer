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

export type { OpenAlexClientConfig } from "../client";