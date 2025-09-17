/**
 * OpenAlex Works API Entity Methods
 * Provides comprehensive methods for interacting with Works (academic papers) through the OpenAlex API
 */

import {
	Work,
	WorksFilters,
	QueryParams,
	OpenAlexResponse,
} from "../types";
import { OpenAlexBaseClient } from "../client";

/**
 * Extended query parameters specific to Works API
 * Note: Uses string filter to maintain compatibility with base QueryParams
 */
export type WorksQueryParams = QueryParams;

/**
 * Options for searching works
 */
export interface SearchWorksOptions {
  filters?: WorksFilters;
  sort?: "relevance_score" | "cited_by_count" | "publication_date" | "created_date";
  page?: number;
  per_page?: number;
  select?: string[];
}

/**
 * Options for getting related works
 */
export interface RelatedWorksOptions {
  limit?: number;
  filters?: WorksFilters;
  select?: string[];
}

/**
 * Works API class providing comprehensive methods for academic paper operations
 */
export class WorksApi {
	constructor(private client: OpenAlexBaseClient) {}

	/**
   * Get a single work by its OpenAlex ID, DOI, or other identifier
   *
   * @param id - The work ID (OpenAlex ID, DOI, etc.)
   * @param params - Optional query parameters
   * @returns Promise resolving to the Work entity
   *
   * @example
   * ```typescript
   * const work = await worksApi.getWork('W2741809807');
   * const workByDoi = await worksApi.getWork('https://doi.org/10.7717/peerj.4375');
   * ```
   */
	async getWork(id: string, params: QueryParams = {}): Promise<Work> {
		return this.client.getById<Work>("works", id, params);
	}

	/**
   * Get multiple works with optional filtering and pagination
   *
   * @param params - Query parameters including filters, pagination, and selection
   * @returns Promise resolving to OpenAlexResponse containing works and metadata
   *
   * @example
   * ```typescript
   * const response = await worksApi.getWorks({
   *   filter: { 'publication_year': 2023, 'is_oa': true },
   *   sort: 'cited_by_count',
   *   per_page: 50
   * });
   * ```
   */
	async getWorks(params: WorksQueryParams = {}): Promise<OpenAlexResponse<Work>> {
		const queryParams: QueryParams = { ...params };

		// Convert filters object to filter string, if it's not already a string
		if (params.filter) {
			queryParams.filter = typeof params.filter === "string" ? params.filter : this.buildFilterString(params.filter as WorksFilters);
		}

		return this.client.getResponse<Work>("works", queryParams);
	}

	/**
   * Search works by query string with optional filters and sorting
   *
   * @param query - Search query string
   * @param options - Search options including filters, sorting, and pagination
   * @returns Promise resolving to search results
   *
   * @example
   * ```typescript
   * const results = await worksApi.searchWorks('machine learning', {
   *   filters: { 'publication_year': 2023 },
   *   sort: 'relevance_score',
   *   per_page: 25
   * });
   * ```
   */
	async searchWorks(
		query: string,
		options: SearchWorksOptions = {}
	): Promise<OpenAlexResponse<Work>> {
		const params: WorksQueryParams = {
			search: query,
			sort: options.sort || (query.trim() ? "relevance_score" : "publication_date"),
			page: options.page,
			per_page: options.per_page,
			select: options.select,
			filter: options.filters ? this.buildFilterString(options.filters) : undefined,
		};

		return this.getWorks(params);
	}

	/**
   * Get works by a specific author
   *
   * @param authorId - OpenAlex author ID or ORCID
   * @param params - Optional query parameters for filtering and pagination
   * @returns Promise resolving to works authored by the specified author
   *
   * @example
   * ```typescript
   * const authorWorks = await worksApi.getWorksByAuthor('A5017898742', {
   *   sort: 'cited_by_count',
   *   per_page: 20
   * });
   * ```
   */
	async getWorksByAuthor(
		authorId: string,
		params: WorksQueryParams = {}
	): Promise<OpenAlexResponse<Work>> {
		const filters: WorksFilters = {
			"authorships.author.id": authorId,
		};

		// Merge with existing filters if present
		const mergedFilter = this.mergeFilters(filters, params.filter);
		return this.getWorks({ ...params, filter: mergedFilter });
	}

	/**
   * Get works affiliated with a specific institution
   *
   * @param institutionId - OpenAlex institution ID or ROR ID
   * @param params - Optional query parameters for filtering and pagination
   * @returns Promise resolving to works from the specified institution
   *
   * @example
   * ```typescript
   * const institutionWorks = await worksApi.getWorksByInstitution('I27837315', {
   *   filter: { 'publication_year': 2023 },
   *   sort: 'publication_date'
   * });
   * ```
   */
	async getWorksByInstitution(
		institutionId: string,
		params: WorksQueryParams = {}
	): Promise<OpenAlexResponse<Work>> {
		const filters: WorksFilters = {
			"authorships.institutions.id": institutionId,
		};

		// Merge with existing filters if present
		const mergedFilter = this.mergeFilters(filters, params.filter);
		return this.getWorks({ ...params, filter: mergedFilter });
	}

	/**
   * Get works published in a specific source (journal, conference, etc.)
   *
   * @param sourceId - OpenAlex source ID or ISSN
   * @param params - Optional query parameters for filtering and pagination
   * @returns Promise resolving to works from the specified source
   *
   * @example
   * ```typescript
   * const journalWorks = await worksApi.getWorksBySource('S137773608', {
   *   filter: { 'publication_year': '2020-2023' },
   *   sort: 'cited_by_count'
   * });
   * ```
   */
	async getWorksBySource(
		sourceId: string,
		params: WorksQueryParams = {}
	): Promise<OpenAlexResponse<Work>> {
		const filters: WorksFilters = {
			"primary_location.source.id": sourceId,
		};

		// Merge with existing filters if present
		const mergedFilter = this.mergeFilters(filters, params.filter);
		return this.getWorks({ ...params, filter: mergedFilter });
	}

	/**
   * Get works that cite a specific work
   *
   * @param workId - OpenAlex work ID of the cited work
   * @param params - Optional query parameters for filtering and pagination
   * @returns Promise resolving to works that cite the specified work
   *
   * @example
   * ```typescript
   * const citingWorks = await worksApi.getCitedWorks('W2741809807', {
   *   sort: 'publication_date',
   *   per_page: 100
   * });
   * ```
   */
	async getCitedWorks(
		workId: string,
		params: WorksQueryParams = {}
	): Promise<OpenAlexResponse<Work>> {
		const filters: WorksFilters = {
			"referenced_works": workId,
		};

		// Merge with existing filters if present
		const mergedFilter = this.mergeFilters(filters, params.filter);
		return this.getWorks({ ...params, filter: mergedFilter });
	}

	/**
   * Get works referenced by a specific work
   *
   * @param workId - OpenAlex work ID
   * @param options - Options for filtering and limiting results
   * @returns Promise resolving to referenced works
   *
   * @example
   * ```typescript
   * const references = await worksApi.getReferencedWorks('W2741809807', {
   *   limit: 50,
   *   select: ['id', 'display_name', 'publication_year', 'cited_by_count']
   * });
   * ```
   */
	async getReferencedWorks(
		workId: string,
		options: RelatedWorksOptions = {}
	): Promise<Work[]> {
		// First get the work to access its referenced_works array
		const work = await this.getWork(workId, { select: ["referenced_works"] });

		if (!("referenced_works" in work) || work.referenced_works.length === 0) {
			return [];
		}

		// Limit the number of references if specified
		const referencesToFetch = options.limit
			? work.referenced_works.slice(0, options.limit)
			: work.referenced_works;

		// Build filter to get all referenced works in one request
		const filters: WorksFilters = {
			"ids.openalex": referencesToFetch,
			...options.filters,
		};

		const response = await this.getWorks({
			filter: this.buildFilterString(filters),
			select: options.select,
			per_page: referencesToFetch.length,
		});

		return response.results;
	}

	/**
   * Get works related to a specific work (using OpenAlex's related works feature)
   *
   * @param workId - OpenAlex work ID
   * @param options - Options for filtering and limiting results
   * @returns Promise resolving to related works
   *
   * @example
   * ```typescript
   * const relatedWorks = await worksApi.getRelatedWorks('W2741809807', {
   *   limit: 20,
   *   filters: { 'is_oa': true }
   * });
   * ```
   */
	async getRelatedWorks(
		workId: string,
		options: RelatedWorksOptions = {}
	): Promise<Work[]> {
		// First get the work to access its related_works array
		const work = await this.getWork(workId, { select: ["related_works"] });

		if (!("related_works" in work) || work.related_works.length === 0) {
			return [];
		}

		// Limit the number of related works if specified
		const relatedToFetch = options.limit
			? work.related_works.slice(0, options.limit)
			: work.related_works;

		// Build filter to get all related works in one request
		const filters: WorksFilters = {
			"ids.openalex": relatedToFetch,
			...options.filters,
		};

		const response = await this.getWorks({
			filter: this.buildFilterString(filters),
			select: options.select,
			per_page: relatedToFetch.length,
		});

		return response.results;
	}

	/**
   * Get a random sample of works
   *
   * @param count - Number of random works to retrieve (max 10,000)
   * @param params - Optional query parameters for filtering the sample
   * @returns Promise resolving to random works
   *
   * @example
   * ```typescript
   * const randomWorks = await worksApi.getRandomWorks(10, {
   *   filter: { 'is_oa': true, 'has_abstract': true },
   *   select: ['id', 'display_name', 'abstract_inverted_index']
   * });
   * ```
   */
	async getRandomWorks(
		count: number,
		params: WorksQueryParams = {}
	): Promise<Work[]> {
		if (count > 10000) {
			throw new Error("Maximum sample size is 10,000 works");
		}

		const queryParams: QueryParams = {
			...params,
			sample: count,
			seed: Math.floor(Math.random() * 1000000), // Random seed for reproducibility within session
		};

		// Convert filters if provided
		if (params.filter) {
			queryParams.filter = typeof params.filter === "string" ? params.filter : this.buildFilterString(params.filter as WorksFilters);
		}

		const response = await this.client.getResponse<Work>("works", queryParams);
		return response.results;
	}

	/**
   * Stream all works matching criteria using cursor pagination
   *
   * @param params - Query parameters for filtering
   * @param batchSize - Number of works per batch (default: 200)
   * @returns AsyncGenerator yielding batches of works
   *
   * @example
   * ```typescript
   * for await (const worksBatch of worksApi.streamWorks({
   *   filter: { 'publication_year': 2023 }
   * })) {
   *   logger.info("api", `Processing batch of ${worksBatch.length} works`);
   *   // Process works batch
   * }
   * ```
   */
	async *streamWorks(
		params: WorksQueryParams = {},
		batchSize = 200
	): AsyncGenerator<Work[], void, unknown> {
		const queryParams: QueryParams = { ...params };

		// Only set per_page if not already provided in params
		if (!queryParams.per_page) {
			queryParams.per_page = batchSize;
		}

		// Convert filters if provided
		if (params.filter) {
			queryParams.filter = typeof params.filter === "string" ? params.filter : this.buildFilterString(params.filter as WorksFilters);
		}

		yield* this.client.stream<Work>("works", queryParams, queryParams.per_page);
	}

	/**
   * Get all works matching criteria (use with caution for large result sets)
   *
   * @param params - Query parameters for filtering
   * @param maxResults - Maximum number of results to return
   * @returns Promise resolving to all matching works
   *
   * @example
   * ```typescript
   * const allWorks = await worksApi.getAllWorks({
   *   filter: { 'authorships.author.id': 'A5017898742' }
   * }, 1000);
   * ```
   */
	async getAllWorks(
		params: WorksQueryParams = {},
		maxResults?: number
	): Promise<Work[]> {
		const queryParams: QueryParams = { ...params };

		// Convert filters if provided
		if (params.filter) {
			queryParams.filter = typeof params.filter === "string" ? params.filter : this.buildFilterString(params.filter as WorksFilters);
		}

		return this.client.getAll<Work>("works", queryParams, maxResults);
	}

	/**
   * Build OpenAlex filter string from filters object
   *
   * @param filters - WorksFilters object
   * @returns Formatted filter string for OpenAlex API
   *
   * @private
   */
	private buildFilterString(filters: WorksFilters): string {
		const filterParts: string[] = [];

		Object.entries(filters).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				if (Array.isArray(value)) {
					// Handle array values (OR logic)
					filterParts.push(`${key}:${value.join("|")}`);
				} else if (typeof value === "boolean") {
					// Handle boolean values
					filterParts.push(`${key}:${String(value)}`);
				} else {
					// Handle string/number values
					filterParts.push(`${key}:${String(value)}`);
				}
			}
		});

		return filterParts.join(",");
	}

	/**
   * Merge new filters with existing filters, handling both string and object formats
   *
   * @param newFilters - New filters to add
   * @param existingFilters - Existing filters (can be string or object)
   * @returns Merged filter string
   *
   * @private
   */
	private mergeFilters(newFilters: WorksFilters, existingFilters?: string | WorksFilters): string {
		// Start with new filters
		const mergedFilters: WorksFilters = { ...newFilters };

		// Merge with existing filters if present
		if (existingFilters) {
			if (typeof existingFilters === "string") {
				// If existing filters are a string, append them to the new filter string
				const newFilterString = this.buildFilterString(newFilters);
				return `${newFilterString},${existingFilters}`;
			} else {
				// If existing filters are an object, merge them
				Object.assign(mergedFilters, existingFilters, newFilters); // New filters override existing ones
			}
		}

		return this.buildFilterString(mergedFilters);
	}

	/**
   * Get works statistics and aggregations
   *
   * @param params - Query parameters for filtering
   * @param groupBy - Field to group results by
   * @returns Promise resolving to aggregated results
   *
   * @example
   * ```typescript
   * const stats = await worksApi.getWorksStats({
   *   filter: { 'authorships.author.id': 'A5017898742' }
   * }, 'publication_year');
   * ```
   */
	async getWorksStats(
		params: WorksQueryParams = {},
		groupBy?: string
	): Promise<OpenAlexResponse<Work>> {
		const queryParams: QueryParams = {
			...params,
			per_page: 0, // We only want the aggregation metadata
		};

		if (groupBy) {
			queryParams.group_by = groupBy;
		}

		// Convert filters if provided
		if (params.filter) {
			queryParams.filter = typeof params.filter === "string" ? params.filter : this.buildFilterString(params.filter as WorksFilters);
		}

		return this.client.getResponse<Work>("works", queryParams);
	}

	/**
   * Get works by publication year range
   *
   * @param startYear - Start year (inclusive)
   * @param endYear - End year (inclusive)
   * @param params - Additional query parameters
   * @returns Promise resolving to works in the specified year range
   *
   * @example
   * ```typescript
   * const recentWorks = await worksApi.getWorksByYearRange(2020, 2023, {
   *   filter: { 'is_oa': true },
   *   sort: 'cited_by_count'
   * });
   * ```
   */
	async getWorksByYearRange(
		startYear: number,
		endYear: number,
		params: WorksQueryParams = {}
	): Promise<OpenAlexResponse<Work>> {
		const filters: WorksFilters = {
			"publication_year": `${String(startYear)}-${String(endYear)}`,
		};

		// Merge with existing filters if present
		const mergedFilter = this.mergeFilters(filters, params.filter);
		return this.getWorks({ ...params, filter: mergedFilter });
	}

	/**
   * Get open access works only
   *
   * @param params - Optional query parameters for additional filtering
   * @returns Promise resolving to open access works
   *
   * @example
   * ```typescript
   * const oaWorks = await worksApi.getOpenAccessWorks({
   *   filter: { 'publication_year': 2023 },
   *   sort: 'cited_by_count'
   * });
   * ```
   */
	async getOpenAccessWorks(params: WorksQueryParams = {}): Promise<OpenAlexResponse<Work>> {
		const filters: WorksFilters = {
			"is_oa": true,
		};

		// Merge with existing filters if present
		const mergedFilter = this.mergeFilters(filters, params.filter);
		return this.getWorks({ ...params, filter: mergedFilter });
	}

	/**
   * Get highly cited works (top percentile)
   *
   * @param minCitations - Minimum number of citations
   * @param params - Optional query parameters for additional filtering
   * @returns Promise resolving to highly cited works
   *
   * @example
   * ```typescript
   * const highlyCited = await worksApi.getHighlyCitedWorks(100, {
   *   filter: { 'publication_year': '2020-2023' }
   * });
   * ```
   */
	async getHighlyCitedWorks(
		minCitations: number,
		params: WorksQueryParams = {}
	): Promise<OpenAlexResponse<Work>> {
		const filters: WorksFilters = {
			"cited_by_count": `>${String(minCitations)}`,
		};

		// Merge with existing filters if present
		const mergedFilter = this.mergeFilters(filters, params.filter);
		return this.getWorks({ ...params, filter: mergedFilter, sort: "cited_by_count" });
	}
}

/**
 * Create a default Works API instance using the default client
 * Import this lazily to avoid circular dependencies
 */
export async function createDefaultWorksApi(): Promise<WorksApi> {
	// Using dynamic import for lazy loading and avoiding circular dependencies
	const { defaultClient } = await import("../client");
	return new WorksApi(defaultClient as never);
}