/**
 * OpenAlex Query Builder Utilities
 *
 * This module provides comprehensive query building utilities for the OpenAlex API.
 * It handles filter conversion, parameter validation, and query string construction
 * following OpenAlex API conventions.
 *
 * @see https://docs.openalex.org/how-to-use-the-api/get-lists-of-entities/filter-entity-lists
 */

import type {
	EntityFilters,
	WorksFilters,
	AuthorsFilters,
	SourcesFilters,
	InstitutionsFilters,
	TopicsFilters,
	PublishersFilters,
	FundersFilters
} from "../types";

/**
 * Sort options for different entity types
 */
export interface SortOptions {
  /** Field to sort by */
  field: string;
  /** Sort direction */
  direction?: "asc" | "desc";
}

/**
 * Logical operators for combining filters
 */
export type LogicalOperator = "AND" | "OR" | "NOT";

/**
 * Complex filter expression that can contain nested logical operations
 */
export interface FilterExpression {
  operator?: LogicalOperator;
  conditions: Array<FilterCondition | FilterExpression>;
}

/**
 * Individual filter condition
 */
export interface FilterCondition {
  field: string;
  operator?: "=" | "!=" | ">" | ">=" | "<" | "<=" | "contains" | "starts_with";
  value: string | number | boolean | string[] | number[];
}

/**
 * Date range validation result
 */
export interface DateRangeValidation {
  isValid: boolean;
  error?: string;
  normalizedFrom?: string;
  normalizedTo?: string;
}

/**
 * Main QueryBuilder class for constructing OpenAlex API queries
 */
export class QueryBuilder<T extends EntityFilters = EntityFilters> {
	private filters: Partial<T>;
	private logicalOperator: LogicalOperator;

	constructor(initialFilters: Partial<T> = {}, operator: LogicalOperator = "AND") {
		this.filters = { ...initialFilters };
		this.logicalOperator = operator;
	}

	/**
   * Add a single filter condition
   *
   * @param field - The field name to filter on
   * @param value - The value to filter by
   * @param operator - The comparison operator (defaults to '=')
   * @returns This QueryBuilder instance for chaining
   *
   * @example
   * ```typescript
   * const query = new QueryBuilder<WorksFilters>()
   *   .addFilter('publication_year', 2023)
   *   .addFilter('is_oa', true);
   * ```
   */
	addFilter<K extends keyof T>(
		field: K,
		value: T[K],
		operator: "=" | "!=" | ">" | ">=" | "<" | "<=" = "="
	): this {
		if (value === undefined || value === null) {
			return this;
		}

		// Handle different operators for numeric and string values
		if (operator !== "=") {
			const operatorSymbol = operator === "!=" ? "!" : operator;
			this.filters[field] = `${operatorSymbol}${String(value)}` as T[K];
		} else {
			this.filters[field] = value;
		}

		return this;
	}

	/**
   * Add multiple filters at once
   *
   * @param filters - Object containing filter field-value pairs
   * @returns This QueryBuilder instance for chaining
   *
   * @example
   * ```typescript
   * const query = new QueryBuilder<WorksFilters>()
   *   .addFilters({
   *     'publication_year': 2023,
   *     'is_oa': true,
   *     'has_doi': true
   *   });
   * ```
   */
	addFilters(filters: Partial<T>): this {
		Object.entries(filters).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				this.filters[key as keyof T] = value as T[keyof T];
			}
		});
		return this;
	}

	/**
   * Add a date range filter
   *
   * @param fromField - The 'from' date field name
   * @param toField - The 'to' date field name
   * @param fromDate - Start date (ISO string or YYYY-MM-DD)
   * @param toDate - End date (ISO string or YYYY-MM-DD)
   * @returns This QueryBuilder instance for chaining
   *
   * @example
   * ```typescript
   * const query = new QueryBuilder<WorksFilters>()
   *   .addDateRange('from_publication_date', 'to_publication_date', '2020-01-01', '2023-12-31');
   * ```
   */
	addDateRange<K extends keyof T>(
		fromField: K,
		toField: K,
		fromDate: string,
		toDate: string
	): this {
		const validation = validateDateRange(fromDate, toDate);
		if (!validation.isValid) {
			throw new Error(`Invalid date range: ${String(validation.error)}`);
		}

		if (validation.normalizedFrom) {
			this.filters[fromField] = validation.normalizedFrom as T[K];
		}
		if (validation.normalizedTo) {
			this.filters[toField] = validation.normalizedTo as T[K];
		}

		return this;
	}

	/**
   * Add a search filter for text fields
   *
   * @param field - The search field (usually ends with '.search')
   * @param query - The search query string
   * @returns This QueryBuilder instance for chaining
   *
   * @example
   * ```typescript
   * const query = new QueryBuilder<WorksFilters>()
   *   .addSearch('title.search', 'machine learning')
   *   .addSearch('display_name.search', 'neural networks');
   * ```
   */
	addSearch(field: keyof T, query: string): this {
		if (!query || query.trim().length === 0) {
			return this;
		}

		this.filters[field] = escapeFilterValue(query.trim()) as T[keyof T];
		return this;
	}

	/**
   * Set the logical operator for combining filters
   *
   * @param operator - The logical operator ('AND', 'OR', 'NOT')
   * @returns This QueryBuilder instance for chaining
   */
	setOperator(operator: LogicalOperator): this {
		this.logicalOperator = operator;
		return this;
	}

	/**
   * Build the final filters object
   *
   * @returns The constructed filters object
   */
	build(): Partial<T> {
		return { ...this.filters };
	}

	/**
   * Build the filter string for the OpenAlex API
   *
   * @returns The filter string ready for the API
   */
	buildFilterString(): string {
		return buildFilterString(this.filters);
	}

	/**
   * Reset all filters
   *
   * @returns This QueryBuilder instance for chaining
   */
	reset(): this {
		this.filters = {};
		this.logicalOperator = "AND";
		return this;
	}

	/**
   * Clone this QueryBuilder with the same filters
   *
   * @returns A new QueryBuilder instance with copied filters
   */
	clone(): QueryBuilder<T> {
		return new QueryBuilder<T>({ ...this.filters }, this.logicalOperator);
	}
}

/**
 * Convert a filters object to OpenAlex API filter string format
 *
 * @param filters - The filters object containing field-value pairs
 * @returns Formatted filter string for the OpenAlex API
 *
 * @example
 * ```typescript
 * const filters: WorksFilters = {
 *   'publication_year': 2023,
 *   'is_oa': true,
 *   'authorships.author.id': ['A1234', 'A5678']
 * };
 * const filterString = buildFilterString(filters);
 * // Result: "publication_year:2023,is_oa:true,authorships.author.id:A1234|A5678"
 * ```
 */
export function buildFilterString(filters: EntityFilters | Partial<EntityFilters> | null | undefined): string {
	if (!filters || Object.keys(filters).length === 0) {
		return "";
	}

	const filterParts: string[] = [];

	Object.entries(filters).forEach(([field, value]) => {
		if (value === undefined || value === null) {
			return;
		}

		let formattedValue: string;

		if (Array.isArray(value)) {
			// Handle array values with OR logic using pipe separator
			formattedValue = value
				.filter(v => v !== undefined && v !== null && String(v).trim() !== "")
				.map(v => escapeFilterValue(String(v)))
				.join("|");
		} else if (typeof value === "boolean") {
			formattedValue = value.toString();
		} else if (typeof value === "number") {
			formattedValue = value.toString();
		} else {
			formattedValue = escapeFilterValue(String(value));
		}

		if (formattedValue) {
			filterParts.push(`${field}:${formattedValue}`);
		}
	});

	return filterParts.join(",");
}

/**
 * Build sort parameter string for the OpenAlex API
 *
 * @param sorts - Array of sort options or a single sort option
 * @returns Formatted sort string for the API
 *
 * @example
 * ```typescript
 * const sortString = buildSortString([
 *   { field: 'publication_year', direction: 'desc' },
 *   { field: 'cited_by_count', direction: 'desc' }
 * ]);
 * // Result: "publication_year:desc,cited_by_count:desc"
 * ```
 */
export function buildSortString(sorts: SortOptions | SortOptions[] | null | undefined): string {
	if (!sorts) {
		return "";
	}

	const sortArray = Array.isArray(sorts) ? sorts : [sorts];

	return sortArray
		.filter(sort => sort.field)
		.map(sort => {
			const direction = sort.direction || "asc";
			return `${sort.field}:${direction}`;
		})
		.join(",");
}

/**
 * Build select parameter string for field selection
 *
 * @param fields - Array of field names to select
 * @returns Comma-separated field string
 *
 * @example
 * ```typescript
 * const selectString = buildSelectString(['id', 'display_name', 'publication_year']);
 * // Result: "id,display_name,publication_year"
 * ```
 */
export function buildSelectString(fields: string[]): string {
	if (!Array.isArray(fields) || fields.length === 0) {
		return "";
	}

	return fields
		.filter(field => field && field.trim().length > 0)
		.map(field => field.trim())
		.join(",");
}

/**
 * Validate a date range for OpenAlex API filters
 *
 * @param from - Start date string (ISO format or YYYY-MM-DD)
 * @param to - End date string (ISO format or YYYY-MM-DD)
 * @returns Validation result with normalized dates
 *
 * @example
 * ```typescript
 * const validation = validateDateRange('2020-01-01', '2023-12-31');
 * if (validation.isValid) {
 *   logger.info("general", 'Valid range:', validation.normalizedFrom, 'to', validation.normalizedTo);
 * }
 * ```
 */
export function validateDateRange(from: string, to: string): DateRangeValidation {
	if (!from || !to) {
		return {
			isValid: false,
			error: "Both from and to dates must be provided"
		};
	}

	// Normalize date strings to YYYY-MM-DD format
	const normalizeDate = (dateStr: string): string | null => {
		try {
			// First check if the date string matches expected patterns
			const trimmed = dateStr.trim();
			if (!trimmed || trimmed.length < 4) {
				return null; // Too short to be a valid date
			}

			// Strict validation: reject obviously invalid formats
			if (trimmed === "not-a-date" || !/\d/.test(trimmed)) {
				return null; // Contains no digits or is obviously invalid
			}

			const date = new Date(dateStr);
			if (isNaN(date.getTime())) {
				return null;
			}

			// Additional validation: check if the parsed date matches the input intent
			const isoString = date.toISOString().split("T")[0];

			// For strict validation, check if year-only inputs are acceptable
			if (trimmed.match(/^\d{4}$/)) {
				return null; // Reject year-only dates as incomplete
			}

			return isoString; // YYYY-MM-DD
		} catch {
			return null;
		}
	};

	const normalizedFrom = normalizeDate(from);
	const normalizedTo = normalizeDate(to);

	if (!normalizedFrom) {
		return {
			isValid: false,
			error: `Invalid 'from' date format: ${from}`
		};
	}

	if (!normalizedTo) {
		return {
			isValid: false,
			error: `Invalid 'to' date format: ${to}`
		};
	}

	// Check that from date is not after to date
	if (new Date(normalizedFrom) > new Date(normalizedTo)) {
		return {
			isValid: false,
			error: "Start date cannot be after end date"
		};
	}

	return {
		isValid: true,
		normalizedFrom,
		normalizedTo
	};
}

/**
 * Escape special characters in filter values for OpenAlex API
 *
 * @param value - The filter value to escape
 * @returns Escaped value safe for use in API queries
 *
 * @example
 * ```typescript
 * const escaped = escapeFilterValue('machine "learning" & AI');
 * // Handles quotes, special chars, etc.
 * ```
 */
export function escapeFilterValue(value: string): string {
	if (!value || typeof value !== "string") {
		return "";
	}

	// OpenAlex API specific escaping rules:
	// 1. Handle quotes by surrounding with double quotes if contains spaces/special chars
	// 2. Escape existing quotes
	// 3. Handle special characters that might break queries

	let escaped = value.trim();

	// If the value contains spaces, commas, or special characters, wrap in quotes
	const needsQuoting = /[\s,|:()&"']/.test(escaped);

	if (needsQuoting) {
		// Escape existing quotes
		escaped = escaped.replace(/"/g, '\\"');
		// Wrap in quotes
		escaped = `"${escaped}"`;
	}

	return escaped;
}

/**
 * Create a new QueryBuilder instance for Works entities
 *
 * @param filters - Initial filters (optional)
 * @returns QueryBuilder configured for Works
 */
export function createWorksQuery(filters?: Partial<WorksFilters>): QueryBuilder<WorksFilters> {
	return new QueryBuilder<WorksFilters>(filters);
}

/**
 * Create a new QueryBuilder instance for Authors entities
 *
 * @param filters - Initial filters (optional)
 * @returns QueryBuilder configured for Authors
 */
export function createAuthorsQuery(filters?: Partial<AuthorsFilters>): QueryBuilder<AuthorsFilters> {
	return new QueryBuilder<AuthorsFilters>(filters);
}

/**
 * Create a new QueryBuilder instance for Sources entities
 *
 * @param filters - Initial filters (optional)
 * @returns QueryBuilder configured for Sources
 */
export function createSourcesQuery(filters?: Partial<SourcesFilters>): QueryBuilder<SourcesFilters> {
	return new QueryBuilder<SourcesFilters>(filters);
}

/**
 * Create a new QueryBuilder instance for Institutions entities
 *
 * @param filters - Initial filters (optional)
 * @returns QueryBuilder configured for Institutions
 */
export function createInstitutionsQuery(filters?: Partial<InstitutionsFilters>): QueryBuilder<InstitutionsFilters> {
	return new QueryBuilder<InstitutionsFilters>(filters);
}

/**
 * Create a new QueryBuilder instance for Topics entities
 *
 * @param filters - Initial filters (optional)
 * @returns QueryBuilder configured for Topics
 */
export function createTopicsQuery(filters?: Partial<TopicsFilters>): QueryBuilder<TopicsFilters> {
	return new QueryBuilder<TopicsFilters>(filters);
}

/**
 * Create a new QueryBuilder instance for Publishers entities
 *
 * @param filters - Initial filters (optional)
 * @returns QueryBuilder configured for Publishers
 */
export function createPublishersQuery(filters?: Partial<PublishersFilters>): QueryBuilder<PublishersFilters> {
	return new QueryBuilder<PublishersFilters>(filters);
}

/**
 * Create a new QueryBuilder instance for Funders entities
 *
 * @param filters - Initial filters (optional)
 * @returns QueryBuilder configured for Funders
 */
export function createFundersQuery(filters?: Partial<FundersFilters>): QueryBuilder<FundersFilters> {
	return new QueryBuilder<FundersFilters>(filters);
}

// Common sort field constants for convenience
export const SORT_FIELDS = {
	CITED_BY_COUNT: "cited_by_count",
	WORKS_COUNT: "works_count",
	PUBLICATION_YEAR: "publication_year",
	PUBLICATION_DATE: "publication_date",
	CREATED_DATE: "created_date",
	UPDATED_DATE: "updated_date",
	DISPLAY_NAME: "display_name",
	RELEVANCE_SCORE: "relevance_score"
} as const;

// Common field selection presets
export const SELECT_PRESETS = {
	MINIMAL: ["id", "display_name"],
	BASIC: ["id", "display_name", "cited_by_count"],
	WORKS_DETAILED: [
		"id", "doi", "display_name", "publication_year", "publication_date",
		"cited_by_count", "is_oa", "primary_location", "authorships"
	],
	AUTHORS_DETAILED: [
		"id", "display_name", "orcid", "works_count", "cited_by_count",
		"last_known_institution", "affiliations"
	]
} as const;