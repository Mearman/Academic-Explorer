/**
 * Work-specific schemas and types for OpenAlex API using Zod
 */

import { z } from "zod"
import { BaseAutocompleteOptionsSchema } from "./common"
import { workSchema } from "./schemas"
import { createSchemaTypeGuard } from "./utils"

/**
 * Type guard for Work entities
 */
export const isWork = createSchemaTypeGuard(workSchema)

// ============================================================================
// WORK SCHEMAS
// ============================================================================

/**
 * Work sort options
 */
export const WorkSortOptionSchema = z.enum([
	"relevance_score:desc",
	"cited_by_count",
	"cited_by_count:desc",
	"publication_date",
	"publication_date:desc",
	"created_date",
	"created_date:desc",
	"updated_date",
	"updated_date:desc",
])

export type WorkSortOption = z.infer<typeof WorkSortOptionSchema>

/**
 * Work autocomplete options (extends base)
 */
export const WorkAutocompleteOptionsSchema = BaseAutocompleteOptionsSchema.extend({})

export type WorkAutocompleteOptions = z.infer<typeof WorkAutocompleteOptionsSchema>
