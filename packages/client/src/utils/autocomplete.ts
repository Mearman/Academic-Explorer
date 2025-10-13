/**
 * OpenAlex Autocomplete API Base Infrastructure
 * Provides shared types and base class for autocomplete functionality across all OpenAlex entity types
 */

import { OpenAlexBaseClient } from "../client";
import { logger } from "../internal/logger";
import { isRecord } from "../internal/type-helpers";
import type { AutocompleteResult, EntityType, QueryParams } from "../types";

/**
 * Autocomplete request options interface
 */
export interface AutocompleteOptions {
  /** Search query string */
  q: string;
  /** Number of results to return per page (max 200) */
  per_page?: number;
  /** Response format (currently only 'json' supported) */
  format?: "json";
}

/**
 * Autocomplete API response format matching OpenAlex API structure
 */
export interface AutocompleteResponse<T = AutocompleteResult> {
  /** Array of autocomplete results */
  results: T[];
  /** Metadata about the request */
  meta?: {
    /** Total number of results available */
    count?: number;
    /** Current page number */
    page?: number;
    /** Number of results per page */
    per_page?: number;
  };
}

interface DebouncedPromiseCache {
  [key: string]:
    | {
        promise: Promise<unknown>;
        timestamp: number;
      }
    | undefined;
}

/**
 * Type guard to check if a cached promise can be safely cast to the expected type
 */
function isValidCachedPromise<T>(
  promise: Promise<unknown>,
): promise is Promise<T> {
  // Since we control the cache keys and functions, we can trust that
  // the same cache key always maps to the same promise type
  return promise instanceof Promise;
}

/**
 * Base AutocompleteApi class providing shared autocomplete logic and utilities
 * Designed to be extended by entity-specific implementations
 */
export class BaseAutocompleteApi {
  protected client: OpenAlexBaseClient;
  private debounceCache: DebouncedPromiseCache = {};
  protected readonly DEBOUNCE_DELAY = 300; // milliseconds
  protected readonly CACHE_TTL = 30000; // 30 seconds

  constructor(client: OpenAlexBaseClient) {
    this.client = client;
  }

  /**
   * Core autocomplete method for making requests to OpenAlex autocomplete endpoints
   * @param endpoint - The autocomplete endpoint path
   * @param options - Autocomplete request options
   * @returns Promise resolving to autocomplete response
   */
  protected async makeAutocompleteRequest<T = AutocompleteResult>(
    endpoint: string,
    options: AutocompleteOptions,
  ): Promise<AutocompleteResponse<T>> {
    const params: QueryParams & AutocompleteOptions = {
      ...options,
      q: options.q.trim(),
      per_page: options.per_page ?? 25,
      format: options.format ?? "json",
    };

    try {
      return await this.client.get<AutocompleteResponse<T>>(endpoint, params);
    } catch (error: unknown) {
      const errorDetails = this.formatErrorForLogging(error);
      logger.warn(
        `[AutocompleteApi] Request failed for endpoint "${endpoint}"`,
        {
          endpoint,
          options,
          error: errorDetails,
        },
      );
      // Return empty response on error
      return { results: [] };
    }
  }

  /**
   * General autocomplete with debouncing for any entity type
   * @param query - Search query string
   * @param entityType - Specific entity type to search
   * @returns Promise resolving to array of autocomplete results
   */
  protected async autocomplete(
    query: string,
    entityType: EntityType,
  ): Promise<AutocompleteResult[]> {
    if (!query.trim()) {
      return [];
    }

    const cacheKey = `autocomplete_${query.trim().toLowerCase()}_${entityType}`;
    return this.executeWithDebounce(cacheKey, () =>
      this.performAutocomplete(query, entityType),
    );
  }

  /**
   * Cross-entity search across multiple entity types
   * @param query - Search query string
   * @param entityTypes - Array of entity types to search
   * @returns Promise resolving to array of search results across entity types
   */
  protected async searchMultipleTypes(
    query: string,
    entityTypes: EntityType[],
  ): Promise<AutocompleteResult[]> {
    if (!query.trim()) {
      return [];
    }

    const cacheKey = `search_${query.trim().toLowerCase()}_${entityTypes.join(",")}`;

    return this.executeWithDebounce(cacheKey, async () => {
      const promises = entityTypes.map((type) =>
        this.performAutocomplete(query, type).catch(
          (): AutocompleteResult[] => [],
        ),
      );

      const results = await Promise.all(promises);
      return this.sortAutocompleteResults(results.flat());
    });
  }

  /**
   * Execute function with debouncing to prevent excessive API calls
   */
  protected async executeWithDebounce<T>(
    cacheKey: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const now = Date.now();
    const cached = this.debounceCache[cacheKey];

    if (
      cached &&
      now - cached.timestamp < this.DEBOUNCE_DELAY &&
      isValidCachedPromise<T>(cached.promise)
    ) {
      return cached.promise;
    }

    // Clean up expired cache entries
    this.cleanupCache();

    const promise = fn();
    this.debounceCache[cacheKey] = {
      promise,
      timestamp: now,
    };

    return promise;
  }

  /**
   * Perform general autocomplete request without entity type specification
   * Calls the /autocomplete endpoint which returns results across all entity types
   */
  protected async performGeneralAutocomplete(
    query: string,
  ): Promise<AutocompleteResult[]> {
    try {
      const endpoint = "autocomplete";
      const options: AutocompleteOptions = {
        q: query.trim(),
      };

      const response = await this.makeAutocompleteRequest(endpoint, options);

      return response.results;
    } catch (error: unknown) {
      const errorDetails = this.formatErrorForLogging(error);
      logger.warn(
        `[AutocompleteApi] General autocomplete failed for query "${query}"`,
        { query, error: errorDetails },
      );
      return [];
    }
  }

  /**
   * Perform autocomplete request for a specific entity type
   */
  protected async performAutocomplete(
    query: string,
    entityType: EntityType,
  ): Promise<AutocompleteResult[]> {
    try {
      const endpoint = `autocomplete/${entityType}`;
      const options: AutocompleteOptions = {
        q: query.trim(),
      };

      const response = await this.makeAutocompleteRequest(endpoint, options);

      return response.results.map((result) => ({
        ...result,
        entity_type: this.mapEntityTypeToSingular(entityType),
      }));
    } catch (error: unknown) {
      const errorDetails = this.formatErrorForLogging(error);
      logger.warn(
        `[AutocompleteApi] Autocomplete failed for query "${query}"`,
        { query, entityType, error: errorDetails },
      );
      return [];
    }
  }

  /**
   * Sort autocomplete results by relevance (cited_by_count, then works_count)
   */
  protected sortAutocompleteResults(
    results: AutocompleteResult[],
  ): AutocompleteResult[] {
    return results.sort((a, b) => {
      // Sort by cited_by_count (descending), then by works_count (descending)
      const aCitations = a.cited_by_count ?? 0;
      const bCitations = b.cited_by_count ?? 0;
      if (aCitations !== bCitations) {
        return bCitations - aCitations;
      }

      const aWorks = a.works_count ?? 0;
      const bWorks = b.works_count ?? 0;
      return bWorks - aWorks;
    });
  }

  /**
   * Map plural entity type to singular form for AutocompleteResult
   */
  protected mapEntityTypeToSingular(
    entityType: EntityType,
  ): AutocompleteResult["entity_type"] {
    const mapping: Record<EntityType, AutocompleteResult["entity_type"]> = {
      works: "work",
      authors: "author",
      sources: "source",
      institutions: "institution",
      topics: "topic",
      concepts: "concept",
      publishers: "publisher",
      funders: "funder",
      keywords: "keyword",
    };

    return mapping[entityType];
  }

  /**
   * Validate autocomplete options
   */
  protected validateAutocompleteOptions(options: AutocompleteOptions): void {
    if (!options.q?.trim()) {
      throw new Error("Query string is required and cannot be empty");
    }

    if (
      options.per_page !== undefined &&
      (options.per_page < 1 || options.per_page > 200)
    ) {
      throw new Error("per_page must be between 1 and 200");
    }

    if (options.format !== undefined && options.format !== "json") {
      throw new Error("Only json format is currently supported");
    }
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
    const validEntries = entries.filter(
      (entry): entry is NonNullable<typeof entry> => entry !== undefined,
    );
    const timestamps = validEntries.map((entry) => entry.timestamp);

    return {
      cacheSize: entries.length,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null,
    };
  }

  /**
   * Format unknown error for safe logging using type guards
   */
  protected formatErrorForLogging(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    if (typeof error === "string") {
      return { message: error };
    }

    if (isRecord(error)) {
      // Safely extract properties from object-like errors
      return {
        message:
          "message" in error && typeof error.message === "string"
            ? error.message
            : "Unknown error",
        name:
          "name" in error && typeof error.name === "string"
            ? error.name
            : "UnknownError",
        code:
          typeof error.code === "string" || typeof error.code === "number"
            ? error.code
            : undefined,
        status: typeof error.status === "number" ? error.status : undefined,
      };
    }

    // Fallback for primitive types or null
    return {
      message: "Unknown error occurred",
      value: String(error),
    };
  }
}

/**
 * Complete AutocompleteApi implementation extending the base class
 * Provides entity-specific autocomplete methods for backward compatibility
 */
export class CompleteAutocompleteApi extends BaseAutocompleteApi {
  /**
   * General autocomplete using the /autocomplete endpoint (single API call)
   * This is faster than searching multiple entity types separately
   * @param query - Search query string
   * @param options - Optional autocomplete options
   * @returns Promise resolving to array of autocomplete results across all entity types
   *
   * @example
   * ```typescript
   * // Fast general autocomplete (single API call)
   * const results = await api.autocompleteGeneral("hello world");
   *
   * // With options
   * const results = await api.autocompleteGeneral("machine learning", { per_page: 10 });
   * ```
   */
  async autocompleteGeneral(
    query: string,
    options: Omit<AutocompleteOptions, "q"> = {},
  ): Promise<AutocompleteResult[]> {
    if (!query.trim()) {
      return [];
    }

    const cacheKey = `autocomplete_general_${query.trim().toLowerCase()}`;

    return this.executeWithDebounce(cacheKey, async () => {
      try {
        const endpoint = "autocomplete";
        const requestOptions: AutocompleteOptions = {
          q: query.trim(),
          ...options,
        };

        const response = await this.makeAutocompleteRequest(
          endpoint,
          requestOptions,
        );
        return this.sortAutocompleteResults(response.results);
      } catch (error: unknown) {
        const errorDetails = this.formatErrorForLogging(error);
        logger.warn(
          `[AutocompleteApi] General autocomplete failed for query "${query}"`,
          { query, error: errorDetails },
        );
        return [];
      }
    });
  }

  /**
   * General autocomplete across entity types with debouncing
   * @param query - Search query string
   * @param entityType - Optional specific entity type to search
   * @returns Promise resolving to array of autocomplete results
   *
   * @example
   * ```typescript
   * // Search all entity types (makes 5 API calls)
   * const results = await api.autocomplete("hello world");
   *
   * // Search specific entity type (makes 1 API call)
   * const authorResults = await api.autocomplete("john doe", "authors");
   * ```
   */
  async autocomplete(
    query: string,
    entityType?: EntityType,
  ): Promise<AutocompleteResult[]> {
    if (!query.trim()) {
      return [];
    }

    if (entityType) {
      return super.autocomplete(query, entityType);
    } else {
      // Search across all entity types
      const allTypes: EntityType[] = [
        "works",
        "authors",
        "sources",
        "institutions",
        "topics",
      ];
      return this.searchMultipleTypes(query, allTypes);
    }
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
  async search(
    query: string,
    entityTypes?: EntityType[],
  ): Promise<AutocompleteResult[]> {
    if (!query.trim()) {
      return [];
    }

    const types = entityTypes ?? [
      "works",
      "authors",
      "sources",
      "institutions",
      "topics",
    ];
    return this.searchMultipleTypes(query, types);
  }

  /**
   * Advanced search with custom filters
   * @param query - Search query string
   * @param filters - Key-value pairs for additional search filters
   * @returns Promise resolving to array of filtered search results
   */
  async searchWithFilters(
    query: string,
    filters: Record<string, unknown>,
  ): Promise<AutocompleteResult[]> {
    if (!query.trim()) {
      return [];
    }

    const cacheKey = `search_filtered_${query.trim().toLowerCase()}_${JSON.stringify(filters)}`;

    return this.executeWithDebounce(cacheKey, async () => {
      // Determine which entity types to search based on filters
      const entityTypes = this.inferEntityTypesFromFilters(filters);

      const promises = entityTypes.map(async (type) => {
        try {
          const endpoint = `${type}/autocomplete`;
          const params: AutocompleteOptions = {
            q: query.trim(),
            ...this.formatFiltersForEntityType(filters),
          };

          const response = await this.makeAutocompleteRequest(endpoint, params);
          return response.results.map((result) => ({
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
   * Infer which entity types to search based on filter keys
   */
  private inferEntityTypesFromFilters(
    filters: Record<string, unknown>,
  ): EntityType[] {
    const allTypes: EntityType[] = [
      "works",
      "authors",
      "sources",
      "institutions",
      "topics",
    ];

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
    filters: Record<string, unknown>,
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
}

// Export the complete implementation as AutocompleteApi for backward compatibility
export { CompleteAutocompleteApi as AutocompleteApi };
