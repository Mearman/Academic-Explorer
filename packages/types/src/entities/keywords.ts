/**
 * Keyword-specific schemas and types for OpenAlex API using Zod
 */

import { z } from "zod"
import { BaseAutocompleteOptionsSchema } from "./common"
import { keywordSchema } from "./schemas"
import { createSchemaTypeGuard } from "./utils"

/**
 * Type guard for Keyword entities
 */
export const isKeyword = createSchemaTypeGuard(keywordSchema)

// ============================================================================
// KEYWORD SCHEMAS
// ============================================================================

/**
 * Keyword sort options
 */
export const KeywordSortOptionSchema = z.enum([
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

export type KeywordSortOption = z.infer<typeof KeywordSortOptionSchema>

/**
 * Keyword autocomplete options (extends base)
 */
export const KeywordAutocompleteOptionsSchema = BaseAutocompleteOptionsSchema.extend({})

export type KeywordAutocompleteOptions = z.infer<typeof KeywordAutocompleteOptionsSchema>
