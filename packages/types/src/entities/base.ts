/**
 * Base types and common structures for OpenAlex API
 */

import { z } from "zod"

// Base types
export type OpenAlexId = string
export type DOI = string
export type ORCID = string
export type RORId = string
export type ISSNId = string
export type WikidataId = string

// Filter utility types
export type DateString = string // ISO 8601 date string (e.g., "2023-01-15")
export type NumericFilter = string | number // Supports comparison operators like ">100", ">=50", etc.

// Common ID structures - schema-based types
export const BaseIdsSchema = z.object({
	openalex: z.string(),
	wikidata: z.string().optional(),
	wikipedia: z.string().optional(),
	mag: z.string().optional(),
})

export type BaseIds = z.infer<typeof BaseIdsSchema>

export const WorkIdsSchema = BaseIdsSchema.extend({
	doi: z.string().optional(),
	pmid: z.string().optional(),
	pmcid: z.string().optional(),
})

export type WorkIds = z.infer<typeof WorkIdsSchema>

export const AuthorIdsSchema = BaseIdsSchema.extend({
	orcid: z.string().optional(),
	scopus: z.string().optional(),
	twitter: z.string().optional(),
})

export type AuthorIds = z.infer<typeof AuthorIdsSchema>

export const SourceIdsSchema = BaseIdsSchema.extend({
	issn_l: z.string().optional(),
	issn: z.array(z.string()).optional(),
	fatcat: z.string().optional(),
})

export type SourceIds = z.infer<typeof SourceIdsSchema>

export const InstitutionIdsSchema = BaseIdsSchema.extend({
	ror: z.string().optional(),
	grid: z.string().optional(),
})

export type InstitutionIds = z.infer<typeof InstitutionIdsSchema>

export const ConceptIdsSchema = BaseIdsSchema.extend({
	umls_aui: z.array(z.string()).optional(),
	umls_cui: z.array(z.string()).optional(),
})

export type ConceptIds = z.infer<typeof ConceptIdsSchema>

export const TopicIdsSchema = z.object({
	openalex: z.string(),
	wikipedia: z.string().optional(),
})

export type TopicIds = z.infer<typeof TopicIdsSchema>

export const PublisherIdsSchema = z.object({
	openalex: z.string(),
	ror: z.string().optional(),
	wikidata: z.string().optional(),
})

export type PublisherIds = z.infer<typeof PublisherIdsSchema>

export const FunderIdsSchema = z.object({
	openalex: z.string(),
	ror: z.string().optional(),
	wikidata: z.string().optional(),
	crossref: z.string().optional(),
	doi: z.string().optional(),
})

export type FunderIds = z.infer<typeof FunderIdsSchema>

export const KeywordIdsSchema = z.object({
	openalex: z.string(),
	wikipedia: z.string().optional(),
	wikidata: z.string().optional(),
})

export type KeywordIds = z.infer<typeof KeywordIdsSchema>

// Common concept and topic structures - schema-based types
export const ConceptItemSchema = z.object({
	id: z.string(),
	wikidata: z.string().optional(),
	display_name: z.string(),
	level: z.number(),
	score: z.number(),
})

export type ConceptItem = z.infer<typeof ConceptItemSchema>

export const TopicItemSchema = z.object({
	id: z.string(),
	display_name: z.string(),
	count: z.number(),
	subfield: z
		.object({
			id: z.string(),
			display_name: z.string(),
		})
		.optional(),
	field: z
		.object({
			id: z.string(),
			display_name: z.string(),
		})
		.optional(),
	domain: z
		.object({
			id: z.string(),
			display_name: z.string(),
		})
		.optional(),
})

export type TopicItem = z.infer<typeof TopicItemSchema>

// Common summary statistics structure - schema-based types
export const SummaryStatsSchema = z.object({
	"2yr_mean_citedness": z.number(),
	h_index: z.number(),
	i10_index: z.number(),
})

export type SummaryStats = z.infer<typeof SummaryStatsSchema>

// APC (Article Processing Charge) structures - schema-based types
export const APCInfoSchema = z.object({
	value: z.number(),
	currency: z.string(),
	value_usd: z.number(),
	provenance: z.string(),
})

export type APCInfo = z.infer<typeof APCInfoSchema>

export const APCPriceSchema = z.object({
	price: z.number(),
	currency: z.string(),
})

export type APCPrice = z.infer<typeof APCPriceSchema>

// Utility type for making all fields except id optional (for partial hydration)
export type PartialExceptId<T> = {
	id: T extends { id: infer U } ? U : never
} & Partial<Omit<T, "id">>
