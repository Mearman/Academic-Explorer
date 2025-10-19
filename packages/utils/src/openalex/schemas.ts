/**
 * Zod schemas for OpenAlex API response validation
 * Provides type-safe validation of API responses
 */

import { z } from "zod";

// Base schemas for common structures
export const openAlexIdSchema = z
  .string()
  .regex(/^https:\/\/openalex\.org\/[A-Z]\d+$/);

export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// Counts by year schema
export const countsByYearSchema = z.object({
  year: z.number().int(),
  cited_by_count: z.number().int().min(0),
  works_count: z.number().int().min(0),
});

// Meta schema for API responses
export const metaSchema = z.object({
  count: z.number().int().min(0),
  db_response_time_ms: z.number().min(0),
  page: z.number().int().min(1),
  per_page: z.number().int().min(1).max(200),
  groups_count: z.number().int().min(0).optional(),
});

// Group by schema for aggregated responses
export const groupBySchema = z.object({
  key: z.string(),
  key_display_name: z.string(),
  count: z.number().int().min(0),
  cited_by_count: z.number().int().min(0).optional(),
  works_count: z.number().int().min(0).optional(),
  h_index: z.number().int().min(0).optional(),
});

// Base entity schema
export const baseEntitySchema = z.object({
  id: openAlexIdSchema,
  display_name: z.string(),
  cited_by_count: z.number().int().min(0),
  counts_by_year: z.array(countsByYearSchema),
  updated_date: dateStringSchema,
  created_date: dateStringSchema,
});

// Work schema (simplified for validation)
export const workSchema = baseEntitySchema.extend({
  doi: z.string().optional(),
  title: z.string(),
  publication_year: z.number().int(),
  publication_date: dateStringSchema.optional(),
  authorships: z.array(
    z.object({
      author_position: z.string(),
      author: z.object({
        id: openAlexIdSchema.optional(),
        display_name: z.string(),
        orcid: z.string().optional(),
      }),
      institutions: z
        .array(
          z.object({
            id: openAlexIdSchema.optional(),
            display_name: z.string(),
            ror: z.string().optional(),
            country_code: z.string().optional(),
            type: z.string().optional(),
          }),
        )
        .optional(),
    }),
  ),
  host_venue: z
    .object({
      id: openAlexIdSchema.optional(),
      display_name: z.string().optional(),
      publisher: z.string().optional(),
      issn_l: z.string().optional(),
      issn: z.array(z.string()).optional(),
      type: z.string(),
    })
    .optional(),
  type: z.string(),
  open_access: z
    .object({
      is_oa: z.boolean(),
      oa_status: z.string(),
      oa_url: z.string().optional(),
    })
    .optional(),
  cited_by_api_url: z.string(),
  abstract_inverted_index: z
    .record(z.string(), z.array(z.number().int()))
    .optional(),
});

// Concept schema
export const conceptSchema = baseEntitySchema.extend({
  wikidata: z.string().optional(),
  level: z.number().int().min(0).max(5),
  description: z.string().optional(),
  works_count: z.number().int().min(0),
  summary_stats: z
    .object({
      "2yr_mean_citedness": z.number().min(0),
      h_index: z.number().int().min(0),
      i10_index: z.number().int().min(0),
    })
    .optional(),
  ids: z.object({
    openalex: openAlexIdSchema,
    wikidata: z.string().optional(),
    mag: z.string().optional(),
    wikipedia: z.string().optional(),
    umls_cui: z.array(z.string()).optional(),
  }),
  image_url: z.string().optional(),
  image_thumbnail_url: z.string().optional(),
  international: z
    .object({
      display_name: z.record(z.string(), z.string()),
      description: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  ancestors: z
    .array(
      z.object({
        id: openAlexIdSchema,
        wikidata: z.string().optional(),
        display_name: z.string(),
        level: z.number().int().min(0).max(5),
      }),
    )
    .optional(),
  related_concepts: z
    .array(
      z.object({
        id: openAlexIdSchema,
        wikidata: z.string().optional(),
        display_name: z.string(),
        level: z.number().int().min(0).max(5),
        score: z.number().min(0),
      }),
    )
    .optional(),
  works_api_url: z.string(),
});

// Author schema (simplified)
export const authorSchema = baseEntitySchema.extend({
  orcid: z.string().optional(),
  display_name_alternatives: z.array(z.string()).optional(),
  works_count: z.number().int().min(0),
  works_api_url: z.string(),
  cited_by_count: z.number().int().min(0),
  last_known_institution: z
    .object({
      id: openAlexIdSchema.optional(),
      display_name: z.string(),
      ror: z.string().optional(),
      country_code: z.string().optional(),
      type: z.string().optional(),
    })
    .optional(),
});

// Institution schema (simplified)
export const institutionSchema = baseEntitySchema.extend({
  ror: z.string().optional(),
  country_code: z.string().optional(),
  type: z.string().optional(),
  homepage_url: z.string().optional(),
  image_url: z.string().optional(),
  image_thumbnail_url: z.string().optional(),
  display_name_acronyms: z.array(z.string()).optional(),
  display_name_alternatives: z.array(z.string()).optional(),
  works_count: z.number().int().min(0),
  works_api_url: z.string(),
  cited_by_count: z.number().int().min(0),
});

// Generic OpenAlex response schema
export const openAlexResponseSchema = <T extends z.ZodTypeAny>(
  resultSchema: T,
) =>
  z.object({
    results: z.array(resultSchema),
    meta: metaSchema,
    group_by: z.array(groupBySchema).optional(),
  });

// Schema for basic API validation (non-null, object structure)
export const apiResponseSchema = z.unknown().refine((data) => {
  if (data === null || data === undefined) {
    throw new Error("Received null or undefined response from API");
  }
  return true;
});

// Schema for static data validation
export const staticDataSchema = z.unknown();

// Specific response schemas
export const workResponseSchema = openAlexResponseSchema(workSchema);
export const authorResponseSchema = openAlexResponseSchema(authorSchema);
export const institutionResponseSchema =
  openAlexResponseSchema(institutionSchema);
