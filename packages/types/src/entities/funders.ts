/**
 * Funder-specific schemas and types for OpenAlex API using Zod
 */

import { z } from "zod";
import { BaseAutocompleteOptionsSchema } from "./common";
import { funderSchema } from "./schemas";
import { createSchemaTypeGuard } from "./utils";

/**
 * Type guard for Funder entities
 */
export const isFunder = createSchemaTypeGuard(funderSchema);

// ============================================================================
// FUNDER SCHEMAS
// ============================================================================

/**
 * Funder sort options
 */
export const FunderSortOptionSchema = z.enum([
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

export type FunderSortOption = z.infer<typeof FunderSortOptionSchema>;

/**
 * Funder autocomplete options (extends base)
 */
export const FunderAutocompleteOptionsSchema =
  BaseAutocompleteOptionsSchema.extend({});

export type FunderAutocompleteOptions = z.infer<
  typeof FunderAutocompleteOptionsSchema
>;
