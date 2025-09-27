/**
 * OpenAlex Sources API Entity Methods
 * Provides comprehensive methods for interacting with journal/conference sources
 */

import type { Source, SourcesFilters, QueryParams, OpenAlexResponse, Work, AutocompleteResult } from "../types";
import { OpenAlexBaseClient } from "../client";
import { buildFilterString } from "../utils/query-builder";
import { logger } from "../internal/logger";

export class SourcesApi {
	constructor(private client: OpenAlexBaseClient) {}

	/**
	 * Type guard to check if value is SourcesFilters
	 */
	private isSourcesFilters(value: unknown): value is SourcesFilters {
		return typeof value === "object" && value !== null && !Array.isArray(value);
	}

	/**
   * Get a single source/journal by ID
   * @param id - The OpenAlex source ID (e.g., 'S123456789') or URL
   * @param params - Additional query parameters (select fields, etc.)
   * @returns Promise resolving to the source data
   *
   * @example
   * ```typescript
   * const source = await sourcesApi.getSource('S4306400886');
   * logger.debug("api", source.display_name); // "Nature"
   * ```
   */
	async getSource(id: string, params: QueryParams = {}): Promise<Source> {
		return this.client.getById<Source>("sources", id, params);
	}

	/**
   * Get multiple sources with optional filters
   * @param params - Query parameters including filters, pagination, sorting
   * @returns Promise resolving to sources response with results and metadata
   *
   * @example
   * ```typescript
   * const response = await sourcesApi.getSources({
   *   filter: { 'is_oa': true, 'type': 'journal' },
   *   sort: 'cited_by_count:desc',
   *   per_page: 50
   * });
   * ```
   */
	async getSources(params: Omit<QueryParams, "filter"> & { filter?: SourcesFilters } = {}): Promise<OpenAlexResponse<Source>> {
		const queryParams = this.buildFilterParams(params);
		return this.client.getResponse<Source>("sources", queryParams);
	}

	/**
   * Search sources by display name and description
   * @param query - Search query string
   * @param filters - Optional additional filters to apply
   * @param params - Additional query parameters (pagination, sorting)
   * @returns Promise resolving to matching sources
   *
   * @example
   * ```typescript
   * const results = await sourcesApi.searchSources('nature science', {
   *   'is_oa': true,
   *   'country_code': 'US'
   * });
   * ```
   */
	async searchSources(
		query: string,
		filters: SourcesFilters = {},
		params: QueryParams = {}
	): Promise<OpenAlexResponse<Source>> {
		const searchFilters: SourcesFilters = {
			...filters,
			"default.search": query,
		};

		const { filter: _, ...paramsWithoutFilter } = params;
		const queryParams = this.buildFilterParams({
			...paramsWithoutFilter,
			filter: searchFilters,
		});
		return this.client.getResponse<Source>("sources", queryParams);
	}

	/**
   * Autocomplete sources by name/title for quick search suggestions
   * @param query - Search query string for autocomplete suggestions
   * @returns Promise resolving to array of source autocomplete results
   *
   * @example
   * ```typescript
   * const suggestions = await sourcesApi.autocomplete('nature');
   * logger.debug("api", `Found ${suggestions.length} source suggestions`);
   *
   * // Iterate through suggestions
   * suggestions.forEach(source => {
   *   logger.debug("api", `${source.display_name} (${source.cited_by_count} citations)`);
   * });
   * ```
   */
	async autocomplete(query: string): Promise<AutocompleteResult[]> {
		if (!query.trim()) {
			return [];
		}

		try {
			const endpoint = "autocomplete/sources";
			const queryParams: QueryParams & { q: string } = {
				q: query.trim(),
			};

			const response = await this.client.getResponse<AutocompleteResult>(endpoint, queryParams);

			return response.results.map(result => ({
				...result,
				entity_type: "source" as const,
			}));
		} catch (error: unknown) {
			// Log error but return empty array for graceful degradation
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			logger.warn(`Autocomplete failed for query "${query}": ${errorMessage}`, { query, error });
			return [];
		}
	}

	/**
   * Get sources published by a specific publisher
   * @param publisher - Publisher name or ID to filter by
   * @param params - Additional query parameters
   * @returns Promise resolving to sources from the publisher
   *
   * @example
   * ```typescript
   * const springerSources = await sourcesApi.getSourcesByPublisher('Springer');
   * ```
   */
	async getSourcesByPublisher(
		publisher: string,
		params: QueryParams = {}
	): Promise<OpenAlexResponse<Source>> {
		const filters: SourcesFilters = {
			publisher,
		};

		const { filter: _, ...paramsWithoutFilter } = params;
		const queryParams = this.buildFilterParams({
			...paramsWithoutFilter,
			filter: filters,
			sort: params.sort ?? "works_count:desc",
		});
		return this.client.getResponse<Source>("sources", queryParams);
	}

	/**
   * Get only open access sources
   * @param params - Additional query parameters
   * @returns Promise resolving to open access sources
   *
   * @example
   * ```typescript
   * const oaSources = await sourcesApi.getOpenAccessSources({
   *   sort: 'cited_by_count:desc',
   *   per_page: 100
   * });
   * ```
   */
	async getOpenAccessSources(params: QueryParams = {}): Promise<OpenAlexResponse<Source>> {
		const filters: SourcesFilters = {
			"is_oa": true,
		};

		const { filter: _, ...paramsWithoutFilter } = params;
		const queryParams = this.buildFilterParams({
			...paramsWithoutFilter,
			filter: filters,
			sort: params.sort ?? "works_count:desc",
		});
		return this.client.getResponse<Source>("sources", queryParams);
	}

	/**
   * Get sources by country code
   * @param countryCode - Two-letter ISO country code (e.g., 'US', 'GB', 'DE')
   * @param params - Additional query parameters
   * @returns Promise resolving to sources from the specified country
   *
   * @example
   * ```typescript
   * const ukSources = await sourcesApi.getSourcesByCountry('GB', {
   *   filter: { 'type': 'journal' },
   *   sort: 'cited_by_count:desc'
   * });
   * ```
   */
	async getSourcesByCountry(
		countryCode: string,
		params: Omit<QueryParams, "filter"> & { filter?: SourcesFilters } = {}
	): Promise<OpenAlexResponse<Source>> {
		const filters: SourcesFilters = {
			...params.filter,
			"country_code": countryCode,
		};

		const { filter: _, ...paramsWithoutFilter } = params;
		const queryParams = this.buildFilterParams({
			...paramsWithoutFilter,
			filter: filters,
			sort: params["sort"] ?? "works_count:desc",
		});
		return this.client.getResponse<Source>("sources", queryParams);
	}

	/**
   * Get works published in a specific source
   * @param sourceId - The source ID to get works for
   * @param params - Additional query parameters for works filtering
   * @returns Promise resolving to works published in this source
   *
   * @example
   * ```typescript
   * const natureWorks = await sourcesApi.getSourceWorks('S4306400886', {
   *   filter: { 'publication_year': 2023 },
   *   sort: 'cited_by_count:desc',
   *   per_page: 25
   * });
   * ```
   */
	async getSourceWorks(
		sourceId: string,
		params: QueryParams = {}
	): Promise<OpenAlexResponse<Work>> {
		const worksParams = {
			...params,
			filter: `primary_location.source.id:${sourceId}`,
		};

		return this.client.getResponse<Work>("works", worksParams);
	}

	/**
   * Get citation statistics for a source
   * @param sourceId - The source ID to get statistics for
   * @param params - Additional parameters (select fields, etc.)
   * @returns Promise resolving to source with citation statistics
   *
   * @example
   * ```typescript
   * const stats = await sourcesApi.getSourceStats('S4306400886', {
   *   select: ['id', 'display_name', 'cited_by_count', 'works_count', 'summary_stats', 'counts_by_year']
   * });
   * ```
   */
	async getSourceStats(sourceId: string, params: QueryParams = {}): Promise<Source> {
		const statsParams = {
			...params,
			select: params.select ?? [
				"id",
				"display_name",
				"cited_by_count",
				"works_count",
				"summary_stats",
				"counts_by_year",
				"is_oa",
				"type",
				"publisher",
				"country_code",
			],
		};

		return this.getSource(sourceId, statsParams);
	}

	/**
   * Get a random sample of sources
   * @param count - Number of random sources to return (max 10,000)
   * @param filters - Optional filters to apply to the random sample
   * @param seed - Optional seed for reproducible random results
   * @returns Promise resolving to random sources
   *
   * @example
   * ```typescript
   * const randomOAJournals = await sourcesApi.getRandomSources(50, {
   *   'is_oa': true,
   *   'type': 'journal'
   * }, 42);
   * ```
   */
	async getRandomSources(
		count: number,
		filters: SourcesFilters = {},
		seed?: number
	): Promise<OpenAlexResponse<Source>> {
		if (count > 10000) {
			throw new Error("Random sample size cannot exceed 10,000");
		}

		const params: Omit<QueryParams, "filter"> & { filter?: SourcesFilters } = {
			filter: filters,
			sample: count,
			per_page: count,
		};

		if (seed !== undefined) {
			params["seed"] = seed;
		}

		const queryParams = this.buildFilterParams(params);
		return this.client.getResponse<Source>("sources", queryParams);
	}

	/**
   * Get sources that are indexed in DOAJ (Directory of Open Access Journals)
   * @param params - Additional query parameters
   * @returns Promise resolving to DOAJ-indexed sources
   *
   * @example
   * ```typescript
   * const doajSources = await sourcesApi.getDOAJSources({
   *   sort: 'works_count:desc',
   *   per_page: 100
   * });
   * ```
   */
	async getDOAJSources(params: QueryParams = {}): Promise<OpenAlexResponse<Source>> {
		const filters: SourcesFilters = {
			"is_in_doaj": true,
		};

		return this.getSources({
			...params,
			filter: filters,
			sort: params.sort ?? "works_count:desc",
		});
	}

	/**
   * Get sources by publication type (journal, conference, repository, etc.)
   * @param type - Source type to filter by
   * @param params - Additional query parameters
   * @returns Promise resolving to sources of the specified type
   *
   * @example
   * ```typescript
   * const conferences = await sourcesApi.getSourcesByType('conference', {
   *   sort: 'cited_by_count:desc',
   *   per_page: 50
   * });
   * ```
   */
	async getSourcesByType(
		type: string,
		params: QueryParams = {}
	): Promise<OpenAlexResponse<Source>> {
		const filters: SourcesFilters = {
			type,
		};

		return this.getSources({
			...params,
			filter: filters,
			sort: params.sort ?? "works_count:desc",
		});
	}

	/**
   * Get sources with APC (Article Processing Charge) information
   * @param minAPC - Minimum APC price in USD (optional)
   * @param maxAPC - Maximum APC price in USD (optional)
   * @param params - Additional query parameters
   * @returns Promise resolving to sources with APC information
   *
   * @example
   * ```typescript
   * const expensiveJournals = await sourcesApi.getSourcesWithAPC(2000, 5000, {
   *   sort: 'apc_usd:desc',
   *   per_page: 25
   * });
   * ```
   */
	async getSourcesWithAPC(
		minAPC?: number,
		maxAPC?: number,
		params: QueryParams = {}
	): Promise<OpenAlexResponse<Source>> {
		const filters: SourcesFilters = {};

		if (minAPC !== undefined && maxAPC !== undefined) {
			filters["apc_usd"] = `${minAPC.toString()}-${maxAPC.toString()}`;
		} else if (minAPC !== undefined) {
			filters["apc_usd"] = `>${minAPC.toString()}`;
		} else if (maxAPC !== undefined) {
			filters["apc_usd"] = `<${maxAPC.toString()}`;
		}

		return this.getSources({
			...params,
			filter: filters,
			sort: params.sort ?? "apc_usd:desc",
		});
	}

	/**
   * Get the most cited sources in a given time period
   * @param year - Publication year to focus on (optional)
   * @param limit - Number of top sources to return
   * @param filters - Additional filters to apply
   * @returns Promise resolving to top cited sources
   *
   * @example
   * ```typescript
   * const topSources2023 = await sourcesApi.getTopCitedSources(2023, 25, {
   *   'type': 'journal',
   *   'is_oa': true
   * });
   * ```
   */
	async getTopCitedSources(
		year?: number,
		limit = 25,
		filters: SourcesFilters = {}
	): Promise<OpenAlexResponse<Source>> {
		const combinedFilters = { ...filters };

		const params: Omit<QueryParams, "filter"> & { filter?: SourcesFilters } = {
			filter: combinedFilters,
			sort: "cited_by_count:desc",
			per_page: limit,
		};

		return this.getSources(params);
	}

	/**
   * Stream all sources matching the given criteria
   * Use this for large-scale data processing
   * @param filters - Filters to apply
   * @param batchSize - Number of sources per batch
   * @returns AsyncGenerator yielding batches of sources
   *
   * @example
   * ```typescript
   * for await (const batch of sourcesApi.streamSources({ 'is_oa': true })) {
   *   logger.debug("api", `Processing ${batch.length} open access sources...`);
   *   // Process batch
   * }
   * ```
   */
	async *streamSources(
		filters: SourcesFilters = {},
		batchSize = 200
	): AsyncGenerator<Source[], void, unknown> {
		const queryParams: QueryParams = {};
		const filterString = buildFilterString(filters);
		// Only add filter if it's not empty
		if (filterString) {
			queryParams.filter = filterString;
		}
		yield* this.client.stream<Source>("sources", queryParams, batchSize);
	}

	/**
   * Get sources by ISSN identifier
   * @param issn - ISSN identifier (can be ISSN-L or regular ISSN)
   * @param params - Additional query parameters
   * @returns Promise resolving to sources matching the ISSN
   *
   * @example
   * ```typescript
   * const sourceByISSN = await sourcesApi.getSourcesByISSN('0028-0836');
   * ```
   */
	async getSourcesByISSN(
		issn: string,
		params: QueryParams = {}
	): Promise<OpenAlexResponse<Source>> {
		const filters: SourcesFilters = {
			"ids.issn": issn,
		};

		return this.getSources({
			...params,
			filter: filters,
		});
	}

	/**
   * Build filter parameters for API requests
   * Converts SourcesFilters object to query string format using standardized FilterBuilder
   * @private
   */
	private buildFilterParams(params: Omit<QueryParams, "filter"> & { filter?: SourcesFilters }): QueryParams {
		const { filter, ...otherParams } = params;
		const result: QueryParams = { ...otherParams };

		// Convert filters object to filter string, if it's not already a string
		if (filter) {
			if (typeof filter === "string") {
				result.filter = filter;
			} else if (this.isSourcesFilters(filter)) {
				const filterString = buildFilterString(filter);
				// Only add filter if it's not empty
				if (filterString) {
					result.filter = filterString;
				}
			}
		}

		return result;
	}
}