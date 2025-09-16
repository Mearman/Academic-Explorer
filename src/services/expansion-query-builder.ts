/**
 * Expansion query builder service
 * Converts expansion settings to OpenAlex API query parameters
 */

import { logger } from "@/lib/logger";
import type {
	ExpansionSettings,
	SortCriteria,
	FilterCriteria
} from "@/lib/graph/types/expansion-settings";

export interface OpenAlexQueryParams {
  filter?: string;
  sort?: string;
  per_page?: number;
  select?: string[];
}

/**
 * Build OpenAlex query parameters from expansion settings
 */
function buildQueryParams(settings: ExpansionSettings, baseSelect?: string[]): OpenAlexQueryParams {
	const params: OpenAlexQueryParams = {};

	// Always use maximum per_page for efficiency, handle total limit separately
	params.per_page = 200; // OpenAlex maximum per page

	// Build sort string
	const sortString = buildSortString(settings.sorts ?? []);
	if (sortString) {
		params.sort = sortString;
	}

	// Build filter string
	const filterString = buildFilterString(settings.filters ?? []);
	if (filterString) {
		params.filter = filterString;
	}

	// Set select fields if provided
	if (baseSelect && baseSelect.length > 0) {
		params.select = baseSelect;
	}

	logger.debug("expansion", "Built query parameters from settings", {
		settings: settings.target,
		params
	}, "ExpansionQueryBuilder");

	return params;
}

/**
 * Build sort string for OpenAlex API
 * Format: "property1:direction1,property2:direction2"
 */
function buildSortString(sorts: SortCriteria[]): string | undefined {
	if (sorts.length === 0) {
		return undefined;
	}

	const sortedCriteria = sorts
		.sort((a, b) => a.priority - b.priority);

	const sortParts = sortedCriteria.map(sort =>
		`${sort.property}:${sort.direction}`
	);

	return sortParts.length > 0 ? sortParts.join(",") : undefined;
}

/**
 * Build filter string for OpenAlex API
 * Format: "property1:operator1:value1,property2:operator2:value2"
 */
function buildFilterString(filters: FilterCriteria[]): string | undefined {
	const enabledFilters = filters.filter(filter =>
		filter.enabled && filter.property
	);

	if (enabledFilters.length === 0) {
		return undefined;
	}

	const filterParts = enabledFilters
		.map(filter => buildSingleFilter(filter))
		.filter(part => part !== null);

	return filterParts.length > 0 ? filterParts.join(",") : undefined;
}

/**
 * Build a single filter expression
 */
function buildSingleFilter(filter: FilterCriteria): string | null {
	const { property, operator, value } = filter;

	try {
		switch (operator) {
			case "eq":
				return `${property}:${formatValue(value)}`;

			case "ne":
				return `${property}:!${formatValue(value)}`;

			case "gt":
				return `${property}:>${formatValue(value)}`;

			case "lt":
				return `${property}:<${formatValue(value)}`;

			case "gte":
				return `${property}:>=${formatValue(value)}`;

			case "lte":
				return `${property}:<=${formatValue(value)}`;

			case "contains":
				// For string contains, use partial matching
				return `${property}:${formatValue(value)}`;

			case "startswith":
				// OpenAlex doesn't have direct startswith, use contains
				return `${property}:${formatValue(value)}`;

			case "endswith":
				// OpenAlex doesn't have direct endswith, use contains
				return `${property}:${formatValue(value)}`;

			case "between":
				if (Array.isArray(value) && value.length === 2) {
					const [min, max] = value as [unknown, unknown];
					return `${property}:${formatValue(min)}-${formatValue(max)}`;
				}
				return null;

			case "in":
				if (Array.isArray(value)) {
					const formattedValues = value.map(v => formatValue(v));
					return `${property}:${formattedValues.join("|")}`;
				}
				return `${property}:${formatValue(value)}`;

			case "notin":
				if (Array.isArray(value)) {
					const formattedValues = value.map(v => formatValue(v));
					return `${property}:!${formattedValues.join("|")}`;
				}
				return `${property}:!${formatValue(value)}`;

			default:
				logger.warn("expansion", "Unknown filter operator", { operator }, "ExpansionQueryBuilder");
				return null;
		}
	} catch (error) {
		logger.warn("expansion", "Error building filter", { filter, error }, "ExpansionQueryBuilder");
		return null;
	}
}

/**
 * Format a value for use in OpenAlex filters
 */
function formatValue(value: unknown): string {
	if (value === null || value === undefined) {
		return "";
	}

	if (typeof value === "string") {
		// Escape special characters and spaces
		return value.replace(/[,:|]/g, "\\$&");
	}

	if (typeof value === "boolean") {
		return value ? "true" : "false";
	}

	if (typeof value === "number") {
		return value.toString();
	}

	if (value instanceof Date) {
		return value.getFullYear().toString();
	}

	// Convert everything else to string safely
	if (typeof value === "object") {
		return JSON.stringify(value);
	}

	// For primitive types that can be safely stringified
	if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}

	// Fallback for any other type - return empty string to avoid [object Object]
	return "";
}

/**
 * Validate expansion settings for OpenAlex compatibility
 */
function validateSettings(settings: ExpansionSettings): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	// Validate limit
	if (settings.limit !== undefined) {
		if (settings.limit < 0) {
			errors.push("Limit must be 0 (unlimited) or greater");
		}
		if (settings.limit > 10000) {
			errors.push("Limit cannot exceed 10000 for performance reasons");
		}
	}

	// Validate sorts
	for (const sort of settings.sorts ?? []) {
		if (!sort.property) {
			errors.push("Sort criteria must have a property");
		}
		if (!["asc", "desc"].includes(sort.direction)) {
			errors.push(`Invalid sort direction: ${sort.direction}`);
		}
		if (sort.priority < 1) {
			errors.push("Sort priority must be 1 or greater");
		}
	}

	// Check for duplicate sort properties
	const sorts = settings.sorts ?? [];
	const sortProperties = sorts.map(s => s.property);
	const uniqueSortProperties = new Set(sortProperties);
	if (sortProperties.length !== uniqueSortProperties.size) {
		errors.push("Duplicate sort properties are not allowed");
	}

	// Validate filters
	for (const filter of settings.filters ?? []) {
		if (!filter.property) {
			errors.push("Filter criteria must have a property");
		}

		if (filter.operator === "between" && (!Array.isArray(filter.value) || filter.value.length !== 2)) {
			errors.push("Between filter must have exactly 2 values");
		}

		if (["in", "notin"].includes(filter.operator) && filter.value !== null && filter.value !== undefined) {
			if (!Array.isArray(filter.value) && typeof filter.value !== "string" && typeof filter.value !== "number") {
				errors.push(`Filter operator ${filter.operator} requires array, string, or number value`);
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Get example query string for preview
 */
function getQueryPreview(settings: ExpansionSettings): string {
	const params = buildQueryParams(settings);
	const parts: string[] = [];

	if (params.sort) {
		parts.push(`sort=${params.sort}`);
	}
	if (params.filter) {
		parts.push(`filter=${params.filter}`);
	}
	if (params.per_page) {
		parts.push(`per_page=${params.per_page.toString()}`);
	}

	return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/**
 * Merge additional filters with expansion settings filters
 */
function mergeFilters(baseFilters: string | undefined, additionalFilters: FilterCriteria[]): string | undefined {
	const additionalFilterString = buildFilterString(additionalFilters);

	if (!baseFilters && !additionalFilterString) {
		return undefined;
	}

	if (!baseFilters) {
		return additionalFilterString;
	}

	if (!additionalFilterString) {
		return baseFilters;
	}

	return `${baseFilters},${additionalFilterString}`;
}

/**
 * Create a copy of settings with modified filters (useful for context-specific queries)
 */
function withAdditionalFilters(settings: ExpansionSettings, additionalFilters: FilterCriteria[]): ExpansionSettings {
	return {
		...settings,
		filters: [...(settings.filters ?? []), ...additionalFilters]
	};
}

/**
 * Create a copy of settings with modified sort (useful for fallback sorting)
 */
function withFallbackSort(settings: ExpansionSettings, fallbackSort: SortCriteria): ExpansionSettings {
	// Only add fallback if no sorts are defined
	if ((settings.sorts ?? []).length > 0) {
		return settings;
	}

	return {
		...settings,
		sorts: [{ ...fallbackSort, priority: 1 }]
	};
}

// Export object with all functions
export const ExpansionQueryBuilder = {
	buildQueryParams,
	validateSettings,
	getQueryPreview,
	mergeFilters,
	withAdditionalFilters,
	withFallbackSort
} as const;