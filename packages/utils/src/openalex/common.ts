/**
 * Common utility types, responses, and query parameters for OpenAlex API
 */

import type { OpenAlexId } from "./base";
import type { EntityType } from "./entities";

// Response types
export interface OpenAlexResponse<T> {
  results: T[];
  meta: {
    count: number;
    db_response_time_ms: number;
    page: number;
    per_page: number;
    groups_count?: number;
  };
  group_by?: Array<{
    key: string;
    key_display_name: string;
    count: number;
    cited_by_count?: number;
    works_count?: number;
    h_index?: number;
  }>;
}

// Query parameters
export interface QueryParams extends Record<string, unknown> {
  filter?: string;
  search?: string;
  sort?: string;
  page?: number;
  per_page?: number;
  cursor?: string;
  select?: string[];
  sample?: number;
  seed?: number;
  group_by?: string;
  mailto?: string;
}

// Statistical endpoint parameters
export interface StatsParams {
  entity_type?: EntityType;
  timeframe?: "all" | "year" | "month";
  format?: "json" | "csv";
}

// Random sampling parameters
export interface SampleParams extends QueryParams {
  seed?: number;
  sample_size?: number;
}

// Grouping parameters
export interface GroupParams extends QueryParams {
  group_by?: string;
  group_limit?: number;
}

// Autocomplete types
export interface AutocompleteResult {
  id: OpenAlexId;
  display_name: string;
  hint?: string;
  cited_by_count?: number;
  works_count?: number;
  entity_type:
    | "work"
    | "author"
    | "source"
    | "institution"
    | "topic"
    | "publisher"
    | "funder"
    | "concept"
    | "keyword";
  external_id?: string;
  filter_key?: string;
}

// N-grams types
export interface NGram {
  ngram: string;
  ngram_tokens: number;
  ngram_count: number;
  work_count: number;
}

// Error types
export interface OpenAlexError {
  error: string;
  message: string;
  status_code?: number;
}

/**
 * Text Analysis Result - For /text endpoint
 */
export interface TextAnalysis {
  results: Array<{
    entity_type: "topic" | "concept" | "keyword";
    entity_id: OpenAlexId;
    display_name: string;
    score: number;
    confidence?: number;
  }>;
  meta: {
    count: number;
    processing_time_ms: number;
    text_length: number;
  };
}
