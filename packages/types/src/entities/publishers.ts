/**
 * Publisher-specific schemas and types for OpenAlex API using Zod
 */

import { z } from "zod";
import { BaseAutocompleteOptionsSchema } from "./common";
import { publisherSchema } from "./schemas";
import { createSchemaTypeGuard } from "./utils";

/**
 * Type guard for Publisher entities
 */
export const isPublisher = createSchemaTypeGuard(publisherSchema);

// ============================================================================
// PUBLISHER SCHEMAS
// ============================================================================

/**
 * Publisher sort options
 */
export const PublisherSortOptionSchema = z.enum([
  "relevance_score:desc",
  "cited_by_count",
  "cited_by_count:desc",
  "works_count",
  "works_count:desc",
  "created_date",
  "created_date:desc",
  "updated_date",
  "updated_date:desc",
]);

export type PublisherSortOption = z.infer<typeof PublisherSortOptionSchema>;

/**
 * Publisher autocomplete options (extends base)
 */
export const PublisherAutocompleteOptionsSchema =
  BaseAutocompleteOptionsSchema.extend({});

export type PublisherAutocompleteOptions = z.infer<
  typeof PublisherAutocompleteOptionsSchema
>;
