/**
 * OpenAlex Publishers API
 * Provides methods for interacting with OpenAlex publishers endpoint
 */

import type {
	Publisher,
	PublishersFilters,
	Source,
	Work,
	OpenAlexResponse,
	QueryParams
} from "../types";
import { OpenAlexBaseClient } from "../client";

/**
 * PublishersApi provides methods for interacting with OpenAlex publishers
 * Publishers represent organizations that publish academic sources (journals, conferences, etc.)
 */
export class PublishersApi {
	private client: OpenAlexBaseClient;

	constructor(client: OpenAlexBaseClient) {
		this.client = client;
	}

	/**
   * Get a single publisher by its OpenAlex ID
   * @param id - The OpenAlex ID for the publisher (e.g., 'P4310320990')
   * @param params - Optional query parameters for additional data
   * @returns Promise resolving to the publisher object
   */
	async get(id: string, params: QueryParams = {}): Promise<Publisher> {
		return this.client.getById<Publisher>("publishers", id, params);
	}

	/**
   * Get multiple publishers with optional filtering and sorting
   * @param params - Query parameters for filtering, sorting, and pagination
   * @returns Promise resolving to paginated publishers response
   */
	async getMultiple(params: QueryParams & PublishersFilters = {}): Promise<OpenAlexResponse<Publisher>> {
		return this.client.getResponse<Publisher>("publishers", params);
	}

	/**
   * Search publishers by name
   * @param query - Search query string
   * @param params - Optional additional query parameters
   * @returns Promise resolving to search results
   */
	async search(query: string, params: QueryParams & PublishersFilters = {}): Promise<OpenAlexResponse<Publisher>> {
		return this.getMultiple({
			...params,
			search: query,
		});
	}

	/**
   * Get publishers with specific filters applied
   * @param filters - Publisher-specific filters
   * @param params - Optional additional query parameters
   * @returns Promise resolving to filtered publishers response
   */
	async filters(filters: PublishersFilters, params: QueryParams = {}): Promise<OpenAlexResponse<Publisher>> {
		return this.getMultiple({ ...params, ...filters });
	}

	/**
   * Get a random sample of publishers
   * @param count - Number of random publishers to return (default: 10, max: 50)
   * @param params - Optional query parameters
   * @returns Promise resolving to random publishers
   */
	async randomSample(count = 10, params: QueryParams = {}): Promise<OpenAlexResponse<Publisher>> {
		return this.getMultiple({
			...params,
			sample: Math.min(count, 50),
			per_page: Math.min(count, 50),
		});
	}

	/**
   * Get sources (journals, conferences) published by a publisher
   * @param publisherId - The OpenAlex ID for the publisher
   * @param params - Optional query parameters for filtering and pagination
   * @returns Promise resolving to sources published by this publisher
   */
	async getPublisherSources(publisherId: string, params: QueryParams = {}): Promise<OpenAlexResponse<Source>> {
		return this.client.getResponse<Source>("sources", {
			...params,
			filter: `host_organization_lineage:${publisherId}`,
		});
	}

	/**
   * Get works published by a publisher
   * @param publisherId - The OpenAlex ID for the publisher
   * @param params - Optional query parameters for filtering and pagination
   * @returns Promise resolving to works published by this publisher
   */
	async getPublisherWorks(publisherId: string, params: QueryParams = {}): Promise<OpenAlexResponse<Work>> {
		return this.client.getResponse<Work>("works", {
			...params,
			filter: `locations.source.host_organization_lineage:${publisherId}`,
		});
	}

	/**
   * Get child publishers (subsidiaries or imprints) of a parent publisher
   * @param parentPublisherId - The OpenAlex ID for the parent publisher
   * @param params - Optional query parameters for filtering and pagination
   * @returns Promise resolving to child publishers
   */
	async getChildPublishers(parentPublisherId: string, params: QueryParams = {}): Promise<OpenAlexResponse<Publisher>> {
		return this.getMultiple({
			...params,
			filter: `parent_publisher:${parentPublisherId}`,
		});
	}

	/**
   * Get publishers by country codes
   * @param countryCodes - Array of ISO country codes (e.g., ['US', 'GB'])
   * @param params - Optional query parameters
   * @returns Promise resolving to publishers from specified countries
   */
	async getByCountry(countryCodes: string[], params: QueryParams = {}): Promise<OpenAlexResponse<Publisher>> {
		return this.filters(
			{ "country_codes": countryCodes },
			params
		);
	}

	/**
   * Get publishers in a lineage hierarchy
   * @param lineageIds - Array of OpenAlex IDs representing the publisher lineage
   * @param params - Optional query parameters
   * @returns Promise resolving to publishers in the specified lineage
   */
	async getByLineage(lineageIds: string[], params: QueryParams = {}): Promise<OpenAlexResponse<Publisher>> {
		return this.filters(
			{ "lineage": lineageIds },
			params
		);
	}

	/**
   * Get top publishers by works count
   * @param limit - Maximum number of top publishers to return (default: 50)
   * @param params - Optional query parameters
   * @returns Promise resolving to top publishers by publication volume
   */
	async getTopByWorksCount(limit = 50, params: QueryParams = {}): Promise<OpenAlexResponse<Publisher>> {
		return this.getMultiple({
			...params,
			sort: "works_count:desc",
			per_page: Math.min(limit, 200),
		});
	}

	/**
   * Get top publishers by citations
   * @param limit - Maximum number of top publishers to return (default: 50)
   * @param params - Optional query parameters
   * @returns Promise resolving to top publishers by citation impact
   */
	async getTopByCitations(limit = 50, params: QueryParams = {}): Promise<OpenAlexResponse<Publisher>> {
		return this.getMultiple({
			...params,
			sort: "cited_by_count:desc",
			per_page: Math.min(limit, 200),
		});
	}

	/**
   * Stream all publishers using cursor pagination
   * @param params - Query parameters for filtering
   * @param batchSize - Number of publishers per batch (default: 200)
   * @returns Async generator yielding batches of publishers
   */
	async *stream(
		params: QueryParams & PublishersFilters = {},
		batchSize = 200
	): AsyncGenerator<Publisher[], void, unknown> {
		yield* this.client.stream<Publisher>("publishers", params, batchSize);
	}

	/**
   * Get all publishers (use with caution for large datasets)
   * @param params - Query parameters for filtering
   * @param maxResults - Optional maximum number of results to return
   * @returns Promise resolving to all matching publishers
   */
	async getAll(
		params: QueryParams & PublishersFilters = {},
		maxResults?: number
	): Promise<Publisher[]> {
		return this.client.getAll<Publisher>("publishers", params, maxResults);
	}
}