/**
 * Institution-specific schemas and types for OpenAlex API using Zod
 */

import { z } from "zod"
import { BaseAutocompleteOptionsSchema } from "./common"
import { institutionSchema } from "./schemas"
import { createSchemaTypeGuard } from "./utils"

/**
 * Type guard for Institution entities
 */
export const isInstitution = createSchemaTypeGuard(institutionSchema)

// ============================================================================
// INSTITUTION SCHEMAS
// ============================================================================

/**
 * Institution sort options
 */
export const InstitutionSortOptionSchema = z.enum([
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

export type InstitutionSortOption = z.infer<typeof InstitutionSortOptionSchema>

/**
 * Institution autocomplete options (extends base)
 */
export const InstitutionAutocompleteOptionsSchema = BaseAutocompleteOptionsSchema.extend({})

export type InstitutionAutocompleteOptions = z.infer<typeof InstitutionAutocompleteOptionsSchema>
