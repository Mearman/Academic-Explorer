/**
 * Common utility types, responses, and query parameters for OpenAlex API
 */

import { z } from "zod";
import type { OpenAlexId } from "./base";
import type { EntityType } from "./entities";

// Response types - schema-based types
export const OpenAlexResponseSchema = <T extends z.ZodTypeAny>(
  resultSchema: T,
) =>
  z.object({
    results: z.array(resultSchema),
    meta: z.object({
      count: z.number(),
      db_response_time_ms: z.number(),
      page: z.number(),
      per_page: z.number(),
      groups_count: z.number().optional(),
    }),
    group_by: z
      .array(
        z.object({
          key: z.string(),
          key_display_name: z.string(),
          count: z.number(),
          cited_by_count: z.number().optional(),
          works_count: z.number().optional(),
          h_index: z.number().optional(),
        }),
      )
      .optional(),
  });

export type OpenAlexResponse<T> = {
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
};

// Query parameters - schema-based types
export const QueryParamsSchema = z
  .object({
    filter: z.string().optional(),
    search: z.string().optional(),
    sort: z.string().optional(),
    page: z.number().optional(),
    per_page: z.number().optional(),
    cursor: z.string().optional(),
    select: z.array(z.string()).optional(),
    sample: z.number().optional(),
    seed: z.number().optional(),
    group_by: z.string().optional(),
    mailto: z.string().optional(),
  })
  .catchall(z.unknown());

export type QueryParams = z.infer<typeof QueryParamsSchema>;

// Statistical endpoint parameters - schema-based types
export const StatsParamsSchema = z.object({
  entity_type: z.string().optional(),
  timeframe: z.enum(["all", "year", "month"]).optional(),
  format: z.enum(["json", "csv"]).optional(),
});

export type StatsParams = z.infer<typeof StatsParamsSchema>;

// Random sampling parameters - schema-based types
export const SampleParamsSchema = QueryParamsSchema.extend({
  seed: z.number().optional(),
  sample_size: z.number().optional(),
});

export type SampleParams = z.infer<typeof SampleParamsSchema>;

// Grouping parameters - schema-based types
export const GroupParamsSchema = QueryParamsSchema.extend({
  group_by: z.string().optional(),
  group_limit: z.number().optional(),
});

export type GroupParams = z.infer<typeof GroupParamsSchema>;

// Autocomplete types - schema-based types
export const AutocompleteResultSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  hint: z.string().optional(),
  cited_by_count: z.number().optional(),
  works_count: z.number().optional(),
  entity_type: z.enum([
    "work",
    "author",
    "source",
    "institution",
    "topic",
    "publisher",
    "funder",
    "concept",
    "keyword",
  ]),
  external_id: z.string().optional(),
  filter_key: z.string().optional(),
});

export type AutocompleteResult = z.infer<typeof AutocompleteResultSchema>;

// N-grams types - schema-based types
export const NGramSchema = z.object({
  ngram: z.string(),
  ngram_tokens: z.number(),
  ngram_count: z.number(),
  work_count: z.number(),
});

export type NGram = z.infer<typeof NGramSchema>;

// Error types - schema-based types
export const OpenAlexErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  status_code: z.number().optional(),
});

export type OpenAlexError = z.infer<typeof OpenAlexErrorSchema>;

/**
 * Text Analysis Result - For /text endpoint - schema-based types
 */
export const TextAnalysisSchema = z.object({
  results: z.array(
    z.object({
      entity_type: z.enum(["topic", "concept", "keyword"]),
      entity_id: z.string(),
      display_name: z.string(),
      score: z.number(),
      confidence: z.number().optional(),
    }),
  ),
  meta: z.object({
    count: z.number(),
    processing_time_ms: z.number(),
    text_length: z.number(),
  }),
});

export type TextAnalysis = z.infer<typeof TextAnalysisSchema>;

/**
 * Base autocomplete options schema
 */
export const BaseAutocompleteOptionsSchema = z.object({
  per_page: z.number().min(1).max(200).optional(),
});

export type BaseAutocompleteOptions = z.infer<
  typeof BaseAutocompleteOptionsSchema
>;

/**
 * Generic grouped response schema factory
 */
export function createGroupedResponseSchema<T>(itemSchema: z.ZodType<T>) {
  return z.object({
    results: z.array(itemSchema),
    meta: z.any(), // meta schema is complex, using any for now
    group_by: z.array(
      z.object({
        key: z.string(),
        key_display_name: z.string(),
        count: z.number().min(0),
      }),
    ),
    next: z.string().optional(),
    previous: z.string().optional(),
  });
}

/**
 * Generic grouped response type
 */
export type GroupedResponse<T> = z.infer<
  ReturnType<typeof createGroupedResponseSchema<T>>
>;
