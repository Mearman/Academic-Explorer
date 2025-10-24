/**
 * Source-specific schemas and types for OpenAlex API using Zod
 */

import { z } from "zod"
import { BaseAutocompleteOptionsSchema } from "./common"
import { sourceSchema } from "./schemas"
import { createSchemaTypeGuard } from "./utils"

/**
 * Type guard for Source entities
 */
export const isSource = createSchemaTypeGuard(sourceSchema)

// ============================================================================
// SOURCE SCHEMAS
// ============================================================================

/**
 * Source sort options
 */
export const SourceSortOptionSchema = z.enum([
	"relevance_score:desc",
	"cited_by_count",
	"cited_by_count:desc",
	"works_count",
	"works_count:desc",
	"created_date",
	"created_date:desc",
	"updated_date",
	"updated_date:desc",
])

export type SourceSortOption = z.infer<typeof SourceSortOptionSchema>

/**
 * Source autocomplete options (extends base)
 */
export const SourceAutocompleteOptionsSchema = BaseAutocompleteOptionsSchema.extend({})

export type SourceAutocompleteOptions = z.infer<typeof SourceAutocompleteOptionsSchema>
