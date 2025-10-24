/**
 * Topic-specific schemas and types for OpenAlex API using Zod
 */

import { z } from "zod"
import { BaseAutocompleteOptionsSchema } from "./common"
import { topicSchema } from "./schemas"
import { createSchemaTypeGuard } from "./utils"

/**
 * Type guard for Topic entities
 */
export const isTopic = createSchemaTypeGuard(topicSchema)

// ============================================================================
// TOPIC SCHEMAS
// ============================================================================

/**
 * Topic sort options
 */
export const TopicSortOptionSchema = z.enum([
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

export type TopicSortOption = z.infer<typeof TopicSortOptionSchema>

/**
 * Topic autocomplete options (extends base)
 */
export const TopicAutocompleteOptionsSchema = BaseAutocompleteOptionsSchema.extend({})

export type TopicAutocompleteOptions = z.infer<typeof TopicAutocompleteOptionsSchema>
