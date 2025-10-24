/**
 * Field type detection and value matching utilities for intelligent entity rendering
 */

export type FieldType =
	| "string"
	| "number"
	| "boolean"
	| "string[]"
	| "number[]"
	| "boolean[]"
	| "object"
	| "object[]"
	| "url"
	| "id"
	| "date"
	| "email"
	| "unknown"

// Regex patterns for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}/
const OPENALEX_ID_REGEX = /^[A-Z][a-z]+:[A-Z0-9]+$/
const DOI_REGEX = /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i
const ORCID_REGEX = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/
const ROR_REGEX = /^0[a-zA-Z0-9]{8}$/
const ISSN_REGEX = /^\d{4}-\d{3}[\dX]$/

/**
 * Detects the type of a field value
 */
export function detectFieldType(value: unknown): FieldType {
	if (value === null || value === undefined) return "unknown"

	if (Array.isArray(value)) return detectArrayType(value)
	if (typeof value === "object") return "object"
	if (typeof value === "string") return detectStringType(value)
	if (typeof value === "number") return "number"
	if (typeof value === "boolean") return "boolean"

	return "unknown"
}

/**
 * Detects the type of an array based on its first element
 */
function detectArrayType(value: unknown[]): FieldType {
	if (value.length === 0) return "unknown"

	const firstItem = value[0]
	if (typeof firstItem === "string") return "string[]"
	if (typeof firstItem === "number") return "number[]"
	if (typeof firstItem === "boolean") return "boolean[]"
	return "object[]"
}

/**
 * Detects the specific type of a string value
 */
function detectStringType(value: string): FieldType {
	if (isUrl(value)) return "url"
	if (isEmail(value)) return "email"
	if (isDate(value)) return "date"
	if (isId(value)) return "id"
	return "string"
}

/**
 * Value pattern matchers for special types
 */
export function isUrl(value: string): boolean {
	try {
		new URL(value)
		return true
	} catch {
		return false
	}
}

export function isEmail(value: string): boolean {
	return EMAIL_REGEX.test(value)
}

export function isDate(value: string): boolean {
	return DATE_REGEX.test(value) && !isNaN(Date.parse(value))
}

export function isId(value: string): boolean {
	// OpenAlex IDs start with entity type prefix
	return OPENALEX_ID_REGEX.test(value)
}

export function isDoi(value: string): boolean {
	return DOI_REGEX.test(value)
}

export function isOrcid(value: string): boolean {
	return ORCID_REGEX.test(value)
}

export function isRor(value: string): boolean {
	return ROR_REGEX.test(value)
}

export function isIssn(value: string): boolean {
	return ISSN_REGEX.test(value)
}

/**
 * Field priority for display ordering
 */
export type FieldPriority = "high" | "medium" | "low"

// Field priority constants
const HIGH_PRIORITY_FIELDS = new Set([
	"display_name",
	"title",
	"name",
	"id",
	"orcid",
	"doi",
	"ror",
	"works_count",
	"cited_by_count",
	"type",
	"publication_year",
	"topic_share",
])

const MEDIUM_PRIORITY_FIELDS = new Set([
	"abstract",
	"description",
	"publisher",
	"journal",
	"country_code",
	"city",
	"homepage_url",
	"summary_stats",
	"last_known_institutions",
])

export function getFieldPriority(fieldName: string): FieldPriority {
	if (HIGH_PRIORITY_FIELDS.has(fieldName)) return "high"
	if (MEDIUM_PRIORITY_FIELDS.has(fieldName)) return "low" // Changed from medium to low for better grouping
	return "medium"
}

/**
 * Field grouping for organizing related fields
 */
export type FieldGroup =
	| "header" // Title and primary identifiers
	| "metrics" // Counts and statistics
	| "identifiers" // IDs, DOIs, ORCIDs, etc.
	| "content" // Main content like abstract
	| "relationships" // Authors, institutions, affiliations
	| "metadata" // Dates, URLs, technical info
	| "temporal" // Time-based data like counts_by_year
	| "other" // Everything else

// Field group mappings
const FIELD_GROUP_MAPPINGS: Record<string, FieldGroup> = {
	// Header
	display_name: "header",
	title: "header",
	name: "header",

	// Metrics
	works_count: "metrics",
	cited_by_count: "metrics",
	summary_stats: "metrics",

	// Identifiers
	id: "identifiers",
	ids: "identifiers",
	orcid: "identifiers",
	doi: "identifiers",
	ror: "identifiers",
	issn: "identifiers",
	issn_l: "identifiers",

	// Content
	abstract: "content",
	description: "content",

	// Relationships
	authorships: "relationships",
	authors: "relationships",
	last_known_institutions: "relationships",
	affiliations: "relationships",
	institutions: "relationships",

	// Metadata
	type: "metadata",
	publisher: "metadata",
	country_code: "metadata",
	city: "metadata",
	homepage_url: "metadata",
	updated_date: "metadata",
	created_date: "metadata",

	// Temporal
	counts_by_year: "temporal",
	publication_year: "temporal",
	publication_date: "temporal",

	// Topics
	topic_share: "relationships",
	topics: "relationships",
}

export function getFieldGroup(fieldName: string): FieldGroup {
	return FIELD_GROUP_MAPPINGS[fieldName] || "other"
}

/**
 * Group fields by priority for organized display
 */
export function groupFields(entity: Record<string, unknown> | object): {
	high: [string, unknown][]
	medium: [string, unknown][]
	low: [string, unknown][]
} {
	const fields = Object.entries(entity)
	const grouped = {
		high: [] as [string, unknown][],
		medium: [] as [string, unknown][],
		low: [] as [string, unknown][],
	}

	for (const [fieldName, value] of fields) {
		const priority = getFieldPriority(fieldName)
		grouped[priority].push([fieldName, value])
	}

	return grouped
}

// Special field name mappings
const SPECIAL_FIELD_NAMES: Record<string, string> = {
	display_name: "Name",
	cited_by_count: "Citations",
	works_count: "Works",
	publication_year: "Publication Year",
	country_code: "Country",
	last_known_institutions: "Institutions",
	counts_by_year: "Citation History",
	summary_stats: "Statistics",
	x_concepts: "Concepts",
	topic_share: "Topic Share",
	is_oa: "Open Access",
	is_in_doaj: "DOAJ Listed",
	apc_usd: "APC Price (USD)",
	works_api_url: "API URL",
	ror: "ROR ID",
	issn_l: "ISSN-L",
	"2yr_mean_citedness": "2-Year Mean Citedness",
	i10_index: "i10 Index",
}

/**
 * Format field names for display
 */
export function formatFieldName(fieldName: string): string {
	// Handle special cases
	if (SPECIAL_FIELD_NAMES[fieldName]) return SPECIAL_FIELD_NAMES[fieldName]

	// Convert camelCase and snake_case to Title Case
	return fieldName
		.replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase
		.replace(/_/g, " ") // snake_case
		.replace(/\b\w/g, (l) => l.toUpperCase()) // Title case
}
