/**
 * OpenAlex Autocomplete and Search API
 * Provides autocomplete functionality and advanced search across all OpenAlex entity types
 */

import type { AutocompleteResult, EntityType, QueryParams } from "../types";
import { OpenAlexBaseClient } from "../client";
import { logger } from "../internal/logger";

interface DebouncedPromiseCache {
  [key: string]: {
    promise: Promise<unknown>;
    timestamp: number;
  } | undefined;
}

/**
 * Type guard to check if a cached promise can be safely cast to the expected type
 */
function isValidCachedPromise<T>(
	promise: Promise<unknown>
): promise is Promise<T> {
	// Since we control the cache keys and functions, we can trust that
	// the same cache key always maps to the same promise type
	return promise instanceof Promise;
}

/**
 * AutocompleteApi provides methods for searching and autocompleting OpenAlex entities
 * with built-in debouncing for performance optimization
 */
export class AutocompleteApi {
	private client: OpenAlexBaseClient;
	private debounceCache: DebouncedPromiseCache = {};
	private readonly DEBOUNCE_DELAY = 300; // milliseconds
	private readonly CACHE_TTL = 30000; // 30 seconds

	constructor(client: OpenAlexBaseClient) {
		this.client = client;
	}

	/**
   * General autocomplete across entity types with debouncing
   * @param query - Search query string
   * @param entityType - Optional specific entity type to search
   * @returns Promise resolving to array of autocomplete results
   */
	async autocomplete(query: string, entityType?: EntityType): Promise<AutocompleteResult[]> {
		if (!query.trim()) {
			return [];
		}

		const cacheKey = `autocomplete_${query.trim().toLowerCase()}_${entityType || "all"}`;
		return this.executeWithDebounce(cacheKey, () => this.performAutocomplete(query, entityType));
	}

	/**
   * Work-specific autocomplete for papers, articles, and publications
   * @param query - Search query string
   * @returns Promise resolving to array of work autocomplete results
   */
	async autocompleteWorks(query: string): Promise<AutocompleteResult[]> {
		return this.autocomplete(query, "works");
	}

	/**
   * Author-specific autocomplete for researchers and academics
   * @param query - Search query string
   * @returns Promise resolving to array of author autocomplete results
   */
	async autocompleteAuthors(query: string): Promise<AutocompleteResult[]> {
		return this.autocomplete(query, "authors");
	}

	/**
   * Source-specific autocomplete for journals, conferences, and publications
   * @param query - Search query string
   * @returns Promise resolving to array of source autocomplete results
   */
	async autocompleteSources(query: string): Promise<AutocompleteResult[]> {
		return this.autocomplete(query, "sources");
	}

	/**
   * Institution-specific autocomplete for universities and research organizations
   * @param query - Search query string
   * @returns Promise resolving to array of institution autocomplete results
   */
	async autocompleteInstitutions(query: string): Promise<AutocompleteResult[]> {
		return this.autocomplete(query, "institutions");
	}

	/**
   * Topic-specific autocomplete for research topics and fields
   * @param query - Search query string
   * @returns Promise resolving to array of topic autocomplete results
   */
	async autocompleteTopics(query: string): Promise<AutocompleteResult[]> {
		return this.autocomplete(query, "topics");
	}

	/**
   * Cross-entity search across multiple entity types
   * @param query - Search query string
   * @param entityTypes - Optional array of entity types to search (defaults to all)
   * @returns Promise resolving to array of search results across entity types
   */
	async search(query: string, entityTypes?: EntityType[]): Promise<AutocompleteResult[]> {
		if (!query.trim()) {
			return [];
		}

		const types = entityTypes || ["works", "authors", "sources", "institutions", "topics"];
		const cacheKey = `search_${query.trim().toLowerCase()}_${types.join(",")}`;

		return this.executeWithDebounce(cacheKey, async () => {
			const promises = types.map(type =>
				this.performAutocomplete(query, type).catch((): AutocompleteResult[] => [])
			);

			const results = await Promise.all(promises);
			return results.flat().sort((a, b) => {
				// Sort by cited_by_count (descending), then by works_count (descending)
				const aCitations = a.cited_by_count || 0;
				const bCitations = b.cited_by_count || 0;
				if (aCitations !== bCitations) {
					return bCitations - aCitations;
				}

				const aWorks = a.works_count || 0;
				const bWorks = b.works_count || 0;
				return bWorks - aWorks;
			});
		});
	}

	/**
   * Advanced search with custom filters
   * @param query - Search query string
   * @param filters - Key-value pairs for additional search filters
   * @returns Promise resolving to array of filtered search results
   */
	async searchWithFilters(query: string, filters: Record<string, unknown>): Promise<AutocompleteResult[]> {
		if (!query.trim()) {
			return [];
		}

		const cacheKey = `search_filtered_${query.trim().toLowerCase()}_${JSON.stringify(filters)}`;

		return this.executeWithDebounce(cacheKey, async () => {
			// Determine which entity types to search based on filters
			const entityTypes = this.inferEntityTypesFromFilters(filters);

			const promises = entityTypes.map(async type => {
				try {
					const endpoint = `${type}/autocomplete`;
					const params: QueryParams & { q: string } = {
						q: query.trim(),
						...this.formatFiltersForEntityType(filters),
					};

					const response = await this.client.get<{ results: AutocompleteResult[] }>(endpoint, params);
					return response.results.map(result => ({
						...result,
						entity_type: this.mapEntityTypeToSingular(type),
					}));
				} catch {
					return [] satisfies AutocompleteResult[];
				}
			});

			const results = await Promise.all(promises);
			return results.flat();
		});
	}

	/**
   * Execute function with debouncing to prevent excessive API calls
   */
	private async executeWithDebounce<T>(
		cacheKey: string,
		fn: () => Promise<T>
	): Promise<T> {
		const now = Date.now();
		const cached = this.debounceCache[cacheKey];

		if (cached && (now - cached.timestamp < this.DEBOUNCE_DELAY)) {
			// Type guard ensures safe return of cached promise
			if (isValidCachedPromise<T>(cached.promise)) {
				return cached.promise;
			}
		}

		// Clean up expired cache entries
		this.cleanupCache();

		const promise = fn();
		this.debounceCache[cacheKey] = {
			promise: promise,
			timestamp: now,
		};

		return promise;
	}

	/**
   * Perform the actual autocomplete request
   */
	private async performAutocomplete(query: string, entityType?: EntityType): Promise<AutocompleteResult[]> {
		try {
			const trimmedQuery = query.trim();

			if (entityType) {
				// Use specific entity autocomplete endpoint
				const endpoint = `autocomplete/${entityType}`;
				const queryParams: QueryParams & { q: string } = {
					q: trimmedQuery,
				};
				const response = await this.client.get<{ results: AutocompleteResult[] }>(endpoint, queryParams);

				return response.results.map(result => ({
					...result,
					entity_type: this.mapEntityTypeToSingular(entityType),
				}));
			} else {
				// Search across all entity types
				return await this.search(trimmedQuery);
			}
		} catch (error) {
			logger.warn(`[AutocompleteApi] Autocomplete failed for query "${query}"`, { query, error });
			return [];
		}
	}

	/**
   * Map plural entity type to singular form for AutocompleteResult
   */
	private mapEntityTypeToSingular(entityType: EntityType): AutocompleteResult["entity_type"] {
		const mapping: Record<EntityType, AutocompleteResult["entity_type"]> = {
			"works": "work",
			"authors": "author",
			"sources": "source",
			"institutions": "institution",
			"topics": "topic",
			"concepts": "concept",
			"publishers": "publisher",
			"funders": "funder",
			"keywords": "keyword",
		};

		return mapping[entityType];
	}

	/**
   * Infer which entity types to search based on filter keys
   */
	private inferEntityTypesFromFilters(filters: Record<string, unknown>): EntityType[] {
		const allTypes: EntityType[] = ["works", "authors", "sources", "institutions", "topics"];

		// If no specific entity filters, search all types
		const filterKeys = Object.keys(filters);
		if (filterKeys.length === 0) {
			return allTypes;
		}

		const entityTypes = new Set<EntityType>();

		// Check for entity-specific filter patterns
		for (const key of filterKeys) {
			if (key.startsWith("authorships.") || key.includes("author")) {
				entityTypes.add("works");
				entityTypes.add("authors");
			}
			if (key.startsWith("host_venue.") || key.includes("source")) {
				entityTypes.add("sources");
			}
			if (key.includes("institution")) {
				entityTypes.add("institutions");
				entityTypes.add("works");
			}
			if (key.includes("topic") || key.includes("concept")) {
				entityTypes.add("topics");
			}
			if (key.includes("funder")) {
				entityTypes.add("funders");
			}
			if (key.includes("publisher")) {
				entityTypes.add("publishers");
			}
		}

		return entityTypes.size > 0 ? Array.from(entityTypes) : allTypes;
	}

	/**
   * Format filters for specific entity type endpoints
   */
	private formatFiltersForEntityType(
		filters: Record<string, unknown>
	): Record<string, unknown> {
		// OpenAlex autocomplete endpoints might not support all filters
		// Return basic filters that are commonly supported
		const basicFilters: Record<string, unknown> = {};

		if (filters["from_publication_date"]) {
			basicFilters["from_publication_date"] = filters["from_publication_date"];
		}
		if (filters["to_publication_date"]) {
			basicFilters["to_publication_date"] = filters["to_publication_date"];
		}
		if (filters["is_oa"] !== undefined) {
			basicFilters["is_oa"] = filters["is_oa"];
		}

		return basicFilters;
	}

	/**
   * Clean up expired cache entries
   */
	private cleanupCache(): void {
		const now = Date.now();
		const freshCache: DebouncedPromiseCache = {};

		for (const [key, value] of Object.entries(this.debounceCache)) {
			if (value && now - value.timestamp <= this.CACHE_TTL) {
				freshCache[key] = value;
			}
		}

		this.debounceCache = freshCache;
	}

	/**
   * Clear all cached autocomplete results
   */
	public clearCache(): void {
		this.debounceCache = {};
	}

	/**
   * Get cache statistics for debugging
   */
	public getCacheStats(): {
    cacheSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
    } {
		const entries = Object.values(this.debounceCache);
		const validEntries = entries.filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);
		const timestamps = validEntries.map(entry => entry.timestamp);

		return {
			cacheSize: entries.length,
			oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
			newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null,
		};
	}
}