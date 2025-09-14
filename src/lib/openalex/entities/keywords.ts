/**
 * OpenAlex Keywords API Entity Methods
 * Provides methods for interacting with Keywords (research keywords) through the OpenAlex API
 */

import {
	Keyword,
	KeywordsFilters,
	QueryParams,
	OpenAlexResponse,
} from "../types";
import { OpenAlexBaseClient } from "../client";
import { buildFilterString } from "../utils/query-builder";

/**
 * Extended query parameters specific to Keywords API
 * Note: Uses string filter to maintain compatibility with base QueryParams
 */
export type KeywordsQueryParams = QueryParams;

/**
 * Options for searching keywords
 */
export interface SearchKeywordsOptions {
  filters?: KeywordsFilters;
  sort?: "relevance_score" | "cited_by_count" | "works_count" | "created_date";
  page?: number;
  per_page?: number;
  select?: string[];
}

/**
 * Keywords API class providing methods for keyword operations
 */
export class KeywordsApi {
	constructor(private client: OpenAlexBaseClient) {}

	/**
   * Get a single keyword by its OpenAlex ID
   *
   * @param id - The keyword ID
   * @param params - Additional query parameters
   * @returns Promise resolving to a keyword
   *
   * @example
   * ```typescript
   * const keyword = await keywordsApi.getKeyword('K123456789');
   * ```
   */
	async getKeyword(id: string, params: QueryParams = {}): Promise<Keyword> {
		return this.client.getById<Keyword>("keywords", id, params);
	}

	/**
   * Get a list of keywords with optional filtering and pagination
   *
   * @param params - Query parameters for filtering and pagination
   * @returns Promise resolving to a paginated response of keywords
   *
   * @example
   * ```typescript
   * const response = await keywordsApi.getKeywords({
   *   filter: { 'works_count': '>100' },
   *   page: 1,
   *   per_page: 25
   * });
   * ```
   */
	async getKeywords(params: KeywordsQueryParams = {}): Promise<OpenAlexResponse<Keyword>> {
		return this.client.getResponse<Keyword>("keywords", params);
	}

	/**
   * Search for keywords using text search
   *
   * @param query - Search query string
   * @param options - Search options including filters and pagination
   * @returns Promise resolving to search results
   *
   * @example
   * ```typescript
   * const results = await keywordsApi.searchKeywords('machine learning', {
   *   sort: 'cited_by_count',
   *   per_page: 10
   * });
   * ```
   */
	async searchKeywords(
		query: string,
		options: SearchKeywordsOptions = {}
	): Promise<OpenAlexResponse<Keyword>> {
		const { filters = {}, sort = "relevance_score", page = 1, per_page = 25, select } = options;

		const params: KeywordsQueryParams = {
			search: query,
			filter: filters ? buildFilterString(filters) : undefined,
			sort,
			page,
			per_page,
			select,
		};

		return this.getKeywords(params);
	}

	/**
   * Get keywords by minimum works count
   *
   * @param minWorksCount - Minimum number of works for keywords
   * @param params - Additional query parameters
   * @returns Promise resolving to filtered keywords
   *
   * @example
   * ```typescript
   * const popularKeywords = await keywordsApi.getKeywordsByWorksCount(100, {
   *   sort: 'works_count',
   *   per_page: 50
   * });
   * ```
   */
	async getKeywordsByWorksCount(
		minWorksCount: number,
		params: KeywordsQueryParams = {}
	): Promise<OpenAlexResponse<Keyword>> {
		const filters: KeywordsFilters = {
			"works_count": `>=${minWorksCount}`,
		};

		return this.getKeywords({
			...params,
			filter: buildFilterString(filters),
		});
	}

	/**
   * Get random keywords
   *
   * @param params - Query parameters
   * @returns Promise resolving to random keywords
   *
   * @example
   * ```typescript
   * const randomKeywords = await keywordsApi.getRandomKeywords({
   *   per_page: 10,
   *   select: ['id', 'display_name', 'works_count']
   * });
   * ```
   */
	async getRandomKeywords(params: KeywordsQueryParams = {}): Promise<OpenAlexResponse<Keyword>> {
		return this.getKeywords({
			...params,
			sort: "random",
		});
	}

	/**
   * Stream all keywords using cursor pagination
   *
   * @param params - Query parameters for filtering
   * @yields Batches of keywords
   *
   * @example
   * ```typescript
   * for await (const keywordBatch of keywordsApi.streamKeywords({ filter: { 'works_count': '>10' } })) {
   *   console.log(`Processing ${keywordBatch.length} keywords`);
   * }
   * ```
   */
	async *streamKeywords(params: KeywordsQueryParams = {}): AsyncGenerator<Keyword[], void, unknown> {
		yield* this.client.stream<Keyword>("keywords", params);
	}

	/**
   * Get all keywords (use with caution for large datasets)
   *
   * @param params - Query parameters for filtering
   * @param maxResults - Maximum number of results to return
   * @returns Promise resolving to array of all matching keywords
   *
   * @example
   * ```typescript
   * const allKeywords = await keywordsApi.getAllKeywords({
   *   filter: { 'works_count': '>1000' }
   * }, 500);
   * ```
   */
	async getAllKeywords(
		params: KeywordsQueryParams = {},
		maxResults?: number
	): Promise<Keyword[]> {
		return this.client.getAll<Keyword>("keywords", params, maxResults);
	}

	/**
   * Get keywords statistics
   *
   * @param params - Query parameters for filtering
   * @returns Promise resolving to aggregated statistics
   *
   * @example
   * ```typescript
   * const stats = await keywordsApi.getKeywordsStats({
   *   filter: { 'works_count': '>100' }
   * });
   * ```
   */
	async getKeywordsStats(params: KeywordsQueryParams = {}): Promise<{
    count: number;
    total_works: number;
    total_citations: number;
    avg_works_per_keyword: number;
    avg_citations_per_keyword: number;
  }> {
		const response = await this.getKeywords({
			...params,
			per_page: 1, // We only need the meta information
		});

		// For more detailed stats, we might need to aggregate from a sample
		const sampleSize = Math.min(1000, response.meta.count);
		const sample = await this.getKeywords({
			...params,
			per_page: sampleSize,
		});

		const totalWorks = sample.results.reduce((sum, keyword) => sum + keyword.works_count, 0);
		const totalCitations = sample.results.reduce((sum, keyword) => sum + keyword.cited_by_count, 0);

		return {
			count: response.meta.count,
			total_works: totalWorks,
			total_citations: totalCitations,
			avg_works_per_keyword: totalWorks / sample.results.length,
			avg_citations_per_keyword: totalCitations / sample.results.length,
		};
	}

	/**
   * Get trending keywords by year range
   *
   * @param fromYear - Start year
   * @param toYear - End year (optional, defaults to current year)
   * @param params - Additional query parameters
   * @returns Promise resolving to trending keywords
   *
   * @example
   * ```typescript
   * const trending = await keywordsApi.getTrendingKeywords(2020, 2023, {
   *   per_page: 20,
   *   sort: 'works_count'
   * });
   * ```
   */
	async getTrendingKeywords(
		fromYear: number,
		toYear: number = new Date().getFullYear(),
		params: KeywordsQueryParams = {}
	): Promise<OpenAlexResponse<Keyword>> {
		const filters: KeywordsFilters = {
			"from_created_date": `${fromYear}-01-01`,
			"to_created_date": `${toYear}-12-31`,
			"works_count": ">10", // Filter out very rare keywords
		};

		return this.getKeywords({
			...params,
			filter: buildFilterString(filters),
			sort: "works_count",
		});
	}

	/**
   * Get highly cited keywords
   *
   * @param params - Additional query parameters
   * @returns Promise resolving to highly cited keywords
   *
   * @example
   * ```typescript
   * const highlyCited = await keywordsApi.getHighlyCitedKeywords({
   *   per_page: 25,
   *   select: ['id', 'display_name', 'cited_by_count', 'works_count']
   * });
   * ```
   */
	async getHighlyCitedKeywords(params: KeywordsQueryParams = {}): Promise<OpenAlexResponse<Keyword>> {
		const filters: KeywordsFilters = {
			"cited_by_count": ">1000",
		};

		return this.getKeywords({
			...params,
			filter: buildFilterString(filters),
			sort: "cited_by_count",
		});
	}
}