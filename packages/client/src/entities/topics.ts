/**
 * OpenAlex Topics API
 * Provides methods for interacting with OpenAlex topics endpoint
 */

import type {
	Topic,
	TopicsFilters,
	Work,
	Author,
	OpenAlexResponse,
	QueryParams
} from "../types";
import { OpenAlexBaseClient } from "../client";

/**
 * TopicsApi provides methods for interacting with OpenAlex topics
 * Topics represent research areas, subjects, and academic fields
 */
export class TopicsApi {
	private client: OpenAlexBaseClient;

	constructor(client: OpenAlexBaseClient) {
		this.client = client;
	}

	/**
   * Get a single topic by its OpenAlex ID
   * @param id - The OpenAlex ID for the topic (e.g., 'T10138')
   * @param params - Optional query parameters for additional data
   * @returns Promise resolving to the topic object
   */
	async get(id: string, params: QueryParams = {}): Promise<Topic> {
		return this.client.getById<Topic>("topics", id, params);
	}

	/**
   * Get multiple topics with optional filtering and sorting
   * @param params - Query parameters for filtering, sorting, and pagination
   * @returns Promise resolving to paginated topics response
   */
	async getMultiple(params: QueryParams & TopicsFilters = {}): Promise<OpenAlexResponse<Topic>> {
		return this.client.getResponse<Topic>("topics", params);
	}

	/**
   * Search topics by name or keywords
   * @param query - Search query string
   * @param params - Optional additional query parameters
   * @returns Promise resolving to search results
   */
	async search(query: string, params: QueryParams & TopicsFilters = {}): Promise<OpenAlexResponse<Topic>> {
		return this.getMultiple({
			...params,
			search: query,
		});
	}

	/**
   * Get topics with specific filters applied
   * @param filters - Topic-specific filters
   * @param params - Optional additional query parameters
   * @returns Promise resolving to filtered topics response
   */
	async filters(filters: TopicsFilters, params: QueryParams = {}): Promise<OpenAlexResponse<Topic>> {
		return this.getMultiple({ ...params, ...filters });
	}

	/**
   * Get a random sample of topics
   * @param count - Number of random topics to return (default: 10, max: 50)
   * @param params - Optional query parameters
   * @returns Promise resolving to random topics
   */
	async randomSample(count = 10, params: QueryParams = {}): Promise<OpenAlexResponse<Topic>> {
		return this.getMultiple({
			...params,
			sample: Math.min(count, 50),
			per_page: Math.min(count, 50),
		});
	}

	/**
   * Get works associated with a topic
   * @param topicId - The OpenAlex ID for the topic
   * @param params - Optional query parameters for filtering and pagination
   * @returns Promise resolving to works in this topic
   */
	async getTopicWorks(topicId: string, params: QueryParams = {}): Promise<OpenAlexResponse<Work>> {
		return this.client.getResponse<Work>("works", {
			...params,
			filter: `topics.id:${topicId}`,
		});
	}

	/**
   * Get authors who have published in a topic
   * @param topicId - The OpenAlex ID for the topic
   * @param params - Optional query parameters for filtering and pagination
   * @returns Promise resolving to authors who work in this topic
   */
	async getTopicAuthors(topicId: string, params: QueryParams = {}): Promise<OpenAlexResponse<Author>> {
		return this.client.getResponse<Author>("authors", {
			...params,
			filter: `topics.id:${topicId}`,
		});
	}

	/**
   * Get subfields within the OpenAlex topic hierarchy
   * @param fieldId - Optional field ID to get subfields for a specific field
   * @param params - Optional query parameters
   * @returns Promise resolving to subfield topics
   */
	async getSubfields(fieldId?: string, params: QueryParams = {}): Promise<OpenAlexResponse<Topic>> {
		const filters: TopicsFilters = {};
		if (fieldId) {
			filters["field.id"] = fieldId;
		}

		return this.getMultiple({
			...params,
			...filters,
		});
	}

	/**
   * Get fields within the OpenAlex topic hierarchy
   * @param domainId - Optional domain ID to get fields for a specific domain
   * @param params - Optional query parameters
   * @returns Promise resolving to field topics
   */
	async getFields(domainId?: string, params: QueryParams = {}): Promise<OpenAlexResponse<Topic>> {
		const filters: TopicsFilters = {};
		if (domainId) {
			filters["domain.id"] = domainId;
		}

		// Fields are at a specific hierarchy level - this would need to be refined
		// based on OpenAlex's actual topic hierarchy implementation
		return this.getMultiple({
			...params,
			...filters,
		});
	}

	/**
   * Get domains (top-level topics) within the OpenAlex topic hierarchy
   * @param params - Optional query parameters
   * @returns Promise resolving to domain topics
   */
	async getDomains(params: QueryParams = {}): Promise<OpenAlexResponse<Topic>> {
		// Domains are at the highest level of the topic hierarchy
		// This would need to be refined based on OpenAlex's actual implementation
		return this.getMultiple({
			...params,
			sort: "cited_by_count:desc", // Sort by most cited domains
		});
	}

	/**
   * Stream all topics using cursor pagination
   * @param params - Query parameters for filtering
   * @param batchSize - Number of topics per batch (default: 200)
   * @returns Async generator yielding batches of topics
   */
	async *stream(
		params: QueryParams & TopicsFilters = {},
		batchSize = 200
	): AsyncGenerator<Topic[], void, unknown> {
		yield* this.client.stream<Topic>("topics", params, batchSize);
	}

	/**
   * Get all topics (use with caution for large datasets)
   * @param params - Query parameters for filtering
   * @param maxResults - Optional maximum number of results to return
   * @returns Promise resolving to all matching topics
   */
	async getAll(
		params: QueryParams & TopicsFilters = {},
		maxResults?: number
	): Promise<Topic[]> {
		return this.client.getAll<Topic>("topics", params, maxResults);
	}
}