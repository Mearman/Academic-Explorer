/**
 * OpenAlex Funders API
 * Provides methods for interacting with OpenAlex funders endpoint
 */

import {
	Funder,
	FundersFilters,
	Work,
	Institution,
	OpenAlexResponse,
	QueryParams
} from "../types";
import { OpenAlexBaseClient } from "../client";

/**
 * FundersApi provides methods for interacting with OpenAlex funders
 * Funders represent organizations that provide funding for research and academic work
 */
export class FundersApi {
	private client: OpenAlexBaseClient;

	constructor(client: OpenAlexBaseClient) {
		this.client = client;
	}

	/**
   * Get a single funder by its OpenAlex ID
   * @param id - The OpenAlex ID for the funder (e.g., 'F4320306076')
   * @param params - Optional query parameters for additional data
   * @returns Promise resolving to the funder object
   */
	async get(id: string, params: QueryParams = {}): Promise<Funder> {
		return this.client.getById<Funder>("funders", id, params);
	}

	/**
   * Get multiple funders with optional filtering and sorting
   * @param params - Query parameters for filtering, sorting, and pagination
   * @returns Promise resolving to paginated funders response
   */
	async getMultiple(params: QueryParams & FundersFilters = {}): Promise<OpenAlexResponse<Funder>> {
		return this.client.getResponse<Funder>("funders", params);
	}

	/**
   * Search funders by name or description
   * @param query - Search query string
   * @param params - Optional additional query parameters
   * @returns Promise resolving to search results
   */
	async search(query: string, params: QueryParams & FundersFilters = {}): Promise<OpenAlexResponse<Funder>> {
		return this.getMultiple({
			...params,
			search: query,
		});
	}

	/**
   * Get funders with specific filters applied
   * @param filters - Funder-specific filters
   * @param params - Optional additional query parameters
   * @returns Promise resolving to filtered funders response
   */
	async filters(filters: FundersFilters, params: QueryParams = {}): Promise<OpenAlexResponse<Funder>> {
		return this.getMultiple({ ...params, ...filters });
	}

	/**
   * Get a random sample of funders
   * @param count - Number of random funders to return (default: 10, max: 50)
   * @param params - Optional query parameters
   * @returns Promise resolving to random funders
   */
	async randomSample(count = 10, params: QueryParams = {}): Promise<OpenAlexResponse<Funder>> {
		return this.getMultiple({
			...params,
			sample: Math.min(count, 50),
			per_page: Math.min(count, 50),
		});
	}

	/**
   * Get grants associated with a funder
   * Note: This returns works that were funded by the funder, as OpenAlex doesn't have a separate grants entity
   * @param funderId - The OpenAlex ID for the funder
   * @param params - Optional query parameters for filtering and pagination
   * @returns Promise resolving to works funded by this funder (representing grants)
   */
	async getFunderGrants(funderId: string, params: QueryParams = {}): Promise<OpenAlexResponse<Work>> {
		return this.client.getResponse<Work>("works", {
			...params,
			filter: `grants.funder:${funderId}`,
		});
	}

	/**
   * Get works funded by a funder
   * @param funderId - The OpenAlex ID for the funder
   * @param params - Optional query parameters for filtering and pagination
   * @returns Promise resolving to works funded by this funder
   */
	async getFunderWorks(funderId: string, params: QueryParams = {}): Promise<OpenAlexResponse<Work>> {
		return this.client.getResponse<Work>("works", {
			...params,
			filter: `grants.funder:${funderId}`,
		});
	}

	/**
   * Get institutions that have received funding from a funder
   * @param funderId - The OpenAlex ID for the funder
   * @param params - Optional query parameters for filtering and pagination
   * @returns Promise resolving to institutions funded by this funder
   */
	async getFunderInstitutions(funderId: string, params: QueryParams = {}): Promise<OpenAlexResponse<Institution>> {
		return this.client.getResponse<Institution>("institutions", {
			...params,
			filter: `works_count:>0`, // Get institutions with works, then filter by funder in practice
		});
	}

	/**
   * Get funders by country
   * @param countryCode - ISO country code (e.g., 'US', 'GB')
   * @param params - Optional query parameters
   * @returns Promise resolving to funders from the specified country
   */
	async getByCountry(countryCode: string, params: QueryParams = {}): Promise<OpenAlexResponse<Funder>> {
		return this.filters(
			{ "country_code": countryCode },
			params
		);
	}

	/**
   * Get funders by multiple countries
   * @param countryCodes - Array of ISO country codes (e.g., ['US', 'GB', 'CA'])
   * @param params - Optional query parameters
   * @returns Promise resolving to funders from the specified countries
   */
	async getByCountries(countryCodes: string[], params: QueryParams = {}): Promise<OpenAlexResponse<Funder>> {
		return this.filters(
			{ "country_code": countryCodes },
			params
		);
	}

	/**
   * Get funders by research topics
   * @param topicIds - Array of topic OpenAlex IDs
   * @param params - Optional query parameters
   * @returns Promise resolving to funders that fund research in specified topics
   */
	async getByTopics(topicIds: string[], params: QueryParams = {}): Promise<OpenAlexResponse<Funder>> {
		return this.filters(
			{ "topics.id": topicIds },
			params
		);
	}

	/**
   * Get top funders by grants count
   * @param limit - Maximum number of top funders to return (default: 50)
   * @param params - Optional query parameters
   * @returns Promise resolving to top funders by number of grants awarded
   */
	async getTopByGrantsCount(limit = 50, params: QueryParams = {}): Promise<OpenAlexResponse<Funder>> {
		return this.getMultiple({
			...params,
			sort: "grants_count:desc",
			per_page: Math.min(limit, 200),
		});
	}

	/**
   * Get top funders by works count
   * @param limit - Maximum number of top funders to return (default: 50)
   * @param params - Optional query parameters
   * @returns Promise resolving to top funders by number of funded works
   */
	async getTopByWorksCount(limit = 50, params: QueryParams = {}): Promise<OpenAlexResponse<Funder>> {
		return this.getMultiple({
			...params,
			sort: "works_count:desc",
			per_page: Math.min(limit, 200),
		});
	}

	/**
   * Get top funders by citations
   * @param limit - Maximum number of top funders to return (default: 50)
   * @param params - Optional query parameters
   * @returns Promise resolving to top funders by citation impact of funded works
   */
	async getTopByCitations(limit = 50, params: QueryParams = {}): Promise<OpenAlexResponse<Funder>> {
		return this.getMultiple({
			...params,
			sort: "cited_by_count:desc",
			per_page: Math.min(limit, 200),
		});
	}

	/**
   * Get funding statistics for a funder over time
   * @param funderId - The OpenAlex ID for the funder
   * @param params - Optional query parameters
   * @returns Promise resolving to the funder with year-over-year statistics
   */
	async getFundingStats(funderId: string, params: QueryParams = {}): Promise<Funder> {
		return this.get(funderId, {
			...params,
			// Request additional statistics fields if available
		});
	}

	/**
   * Stream all funders using cursor pagination
   * @param params - Query parameters for filtering
   * @param batchSize - Number of funders per batch (default: 200)
   * @returns Async generator yielding batches of funders
   */
	async *stream(
		params: QueryParams & FundersFilters = {},
		batchSize = 200
	): AsyncGenerator<Funder[], void, unknown> {
		yield* this.client.stream<Funder>("funders", params, batchSize);
	}

	/**
   * Get all funders (use with caution for large datasets)
   * @param params - Query parameters for filtering
   * @param maxResults - Optional maximum number of results to return
   * @returns Promise resolving to all matching funders
   */
	async getAll(
		params: QueryParams & FundersFilters = {},
		maxResults?: number
	): Promise<Funder[]> {
		return this.client.getAll<Funder>("funders", params, maxResults);
	}
}