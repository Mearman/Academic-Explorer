import {
	debounce,
	uniqBy,
	sortBy,
	groupBy,
	omit,
	pick,
	isEmpty,
	isArray,
	isString
} from "lodash-es";

/**
 * Debounced search function for user input
 */
export const debouncedSearch = debounce((searchFn: (query: string) => void, query: string) => {
	searchFn(query);
}, 300);

/**
 * Remove duplicate items from an array by a specific key
 */
export function removeDuplicatesBy<T>(array: T[], key: keyof T): T[] {
	return uniqBy(array, key);
}

/**
 * Sort academic works by publication year (descending by default)
 */
export function sortByPublicationYear<T extends { publication_year?: number | null }>(
	works: T[],
	ascending = false
): T[] {
	const sorted = sortBy(works, (work) => work.publication_year ?? 0);
	return ascending ? sorted : sorted.reverse();
}

/**
 * Sort by citation count (descending by default)
 */
export function sortByCitationCount<T extends { cited_by_count?: number | null }>(
	works: T[],
	ascending = false
): T[] {
	const sorted = sortBy(works, (work) => work.cited_by_count ?? 0);
	return ascending ? sorted : sorted.reverse();
}

/**
 * Group works by publication year
 */
export function groupByPublicationYear<T extends { publication_year?: number | null }>(
	works: T[]
): Record<string, T[]> {
	return groupBy(works, (work) => work.publication_year?.toString() ?? "Unknown");
}

/**
 * Group works by first author
 */
export function groupByFirstAuthor<T extends {
  authorships?: Array<{
    author: { display_name?: string | null }
  }>
}>(works: T[]): Record<string, T[]> {
	return groupBy(works, (work) => {
		const firstAuthor = work.authorships?.[0]?.author?.display_name;
		return firstAuthor ?? "Unknown Author";
	});
}

/**
 * Extract safe properties from an object, omitting undefined/null values
 */
export function extractSafeProperties<T extends Record<string, unknown>, K extends keyof T>(
	obj: T,
	keys: K[]
): Pick<T, K> {
	return pick(obj, keys);
}

/**
 * Remove sensitive or unnecessary properties from API responses
 */
export function sanitizeApiResponse<T extends Record<string, unknown>>(
	obj: T,
	keysToOmit: (keyof T)[]
): Omit<T, keyof T> {
	return omit(obj, keysToOmit);
}

/**
 * Check if a search query is valid (not empty, not just whitespace)
 */
export function isValidSearchQuery(query: unknown): query is string {
	return isString(query) && !isEmpty(query.trim());
}

/**
 * Normalize search query (trim, lowercase)
 */
export function normalizeSearchQuery(query: string): string {
	return query.trim().toLowerCase();
}

/**
 * Check if an array contains valid data
 */
export function hasValidData<T>(data: unknown): data is T[] {
	return isArray(data) && !isEmpty(data);
}

/**
 * Get display name with fallback
 */
export function getDisplayName(item: {
  display_name?: string | null;
  title?: string | null;
  name?: string | null;
}): string {
	return item.display_name || item.title || item.name || "Untitled";
}

/**
 * Format large numbers (e.g., citation counts)
 */
export function formatLargeNumber(num: number | null | undefined): string {
	if (!num || num === 0) return "0";

	if (num >= 1000000) {
		return `${(num / 1000000).toFixed(1)}M`;
	}

	if (num >= 1000) {
		return `${(num / 1000).toFixed(1)}K`;
	}

	return num.toString();
}