/**
 * Rate-limited OpenAlex client using simple time-based throttling
 * Provides additional rate limiting on top of the existing OpenAlex client
 */

import { OpenAlexClient, OpenAlexClientOptions } from "./openalex-client";
import { RATE_LIMIT_CONFIG } from "@/config/rate-limit";
import { logger } from "@/lib/logger";
import type {
	OpenAlexEntity,
	OpenAlexResponse,
	QueryParams,
	Work,
	Author,
	Source,
	InstitutionEntity,
	Topic,
	Publisher,
	Funder,
	Keyword,
	AutocompleteResult,
	EntityType,
} from "./types";

/**
 * Rate-limited wrapper for OpenAlex client using TanStack Pacer
 *
 * Provides additional rate limiting layer with sliding window approach
 * to ensure we never exceed OpenAlex API limits (10 req/sec, 100k req/day)
 */
export class RateLimitedOpenAlexClient {
	private readonly client: OpenAlexClient;
	private lastRequestTime = 0;
	private readonly minInterval: number;

	constructor(options: OpenAlexClientOptions = {}) {
		// Create underlying client with conservative settings
		this.client = new OpenAlexClient({
			...options,
			rateLimit: {
				requestsPerSecond: 8, // Conservative under 10 req/sec limit
				requestsPerDay: 95000, // Conservative under 100k req/day limit
				...options.rateLimit,
			},
		});

		// Calculate minimum interval between requests (in ms)
		this.minInterval = 1000 / RATE_LIMIT_CONFIG.openAlex.limit; // 125ms for 8 req/sec
	}

	/**
   * Simple rate limiting using time-based throttling
   */
	private async applyRateLimit(): Promise<void> {
		const now = Date.now();
		const timeSinceLastRequest = now - this.lastRequestTime;

		if (timeSinceLastRequest < this.minInterval) {
			const delay = this.minInterval - timeSinceLastRequest;
			await new Promise(resolve => setTimeout(resolve, delay));
		}

		this.lastRequestTime = Date.now();
	}

	/**
   * Rate-limited wrapper for any client method call with enhanced error handling
   */
	private async withRateLimit<T>(operation: () => Promise<T>): Promise<T> {
		const maxRetries = 3;
		let lastError: unknown;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				// Apply rate limiting before each attempt
				await this.applyRateLimit();

				const result = await operation();
				return result;
			} catch (error) {
				lastError = error;

				// If this is not a retryable error or we've exhausted retries, throw
				if (!this.isRetryableError(error) || attempt === maxRetries) {
					break;
				}

				// Log retry attempt
				logger.info("api", `Retrying operation (attempt ${String(attempt + 2)}/${String(maxRetries + 1)})`, {
					error: error instanceof Error ? error.message : String(error)
				}, "RateLimitedOpenAlexClient");
			}
		}

		// If we get here, all retries failed
		throw lastError;
	}

	/**
   * Check if an error is retryable
   */
	private isRetryableError(error: unknown): boolean {
		// Retry 429 (rate limit), 502 (bad gateway), 503 (service unavailable), 504 (gateway timeout)
		if (error && typeof error === "object" && "statusCode" in error) {
			const statusCode = error.statusCode as number;
			return [429, 502, 503, 504].includes(statusCode);
		}

		// Retry network errors
		if (error instanceof Error) {
			const errorMessage = error.message.toLowerCase();
			return errorMessage.includes("network") ||
						 errorMessage.includes("timeout") ||
						 errorMessage.includes("connection");
		}

		return false;
	}

	// Entity retrieval methods with rate limiting
	public async getEntity(id: string): Promise<OpenAlexEntity> {
		return this.withRateLimit(() => this.client.getEntity(id));
	}

	public async getEntities(ids: string[]): Promise<OpenAlexEntity[]> {
		// For multiple entities, we need to apply rate limiting to each request
		// but batch them efficiently to avoid overwhelming the rate limiter
		const batchSize = 5; // Process in small batches
		const results: OpenAlexEntity[] = [];

		for (let i = 0; i < ids.length; i += batchSize) {
			const batch = ids.slice(i, i + batchSize);
			const batchPromises = batch.map(id =>
				this.withRateLimit(() => this.client.getEntity(id).catch((error: unknown) => {
					logger.warn("api", `Failed to fetch entity ${id}`, { id, error: String(error) }, "RateLimitedOpenAlexClient");
					return null;
				}))
			);

			const batchResults = await Promise.all(batchPromises);
			results.push(...batchResults.filter(result => result !== null));
		}

		return results;
	}

	// Works API with rate limiting
	public async getWork(id: string, params?: QueryParams): Promise<Work> {
		return this.withRateLimit(() => this.client.works.getWork(id, params));
	}

	public async getWorks(params?: QueryParams): Promise<OpenAlexResponse<Work>> {
		return this.withRateLimit(() => this.client.works.getWorks(params));
	}

	public async searchWorks(query: string, params?: Record<string, unknown>): Promise<OpenAlexResponse<Work>> {
		return this.withRateLimit(() => this.client.works.searchWorks(query, params));
	}

	// Authors API with rate limiting
	public async getAuthor(id: string, params?: QueryParams): Promise<Author> {
		return this.withRateLimit(() => this.client.authors.getAuthor(id, params));
	}

	public async getAuthors(params?: QueryParams): Promise<OpenAlexResponse<Author>> {
		return this.withRateLimit(() => this.client.authors.getAuthors(params));
	}

	public async searchAuthors(query: string, params?: Record<string, unknown>): Promise<OpenAlexResponse<Author>> {
		return this.withRateLimit(() => this.client.authors.searchAuthors(query, params));
	}

	// Sources API with rate limiting
	public async getSource(id: string, params?: QueryParams): Promise<Source> {
		return this.withRateLimit(() => this.client.sources.getSource(id, params));
	}

	public async getSources(params?: Record<string, unknown>): Promise<OpenAlexResponse<Source>> {
		return this.withRateLimit(() => this.client.sources.getSources(params));
	}

	public async searchSources(query: string, params?: Record<string, unknown>): Promise<OpenAlexResponse<Source>> {
		return this.withRateLimit(() => this.client.sources.searchSources(query, params));
	}

	// Institutions API with rate limiting
	public async getInstitution(id: string, params?: QueryParams): Promise<InstitutionEntity> {
		return this.withRateLimit(() => this.client.institutions.getInstitution(id, params));
	}

	public async getInstitutions(params?: Record<string, unknown>): Promise<OpenAlexResponse<InstitutionEntity>> {
		return this.withRateLimit(() => this.client.institutions.getInstitutions(params));
	}

	public async searchInstitutions(query: string, params?: Record<string, unknown>): Promise<OpenAlexResponse<InstitutionEntity>> {
		return this.withRateLimit(() => this.client.institutions.searchInstitutions(query, params));
	}

	// Topics API with rate limiting
	public async getTopic(id: string, params?: QueryParams): Promise<Topic> {
		return this.withRateLimit(() => this.client.topics.get(id, params));
	}

	public async getTopics(params?: Record<string, unknown>): Promise<OpenAlexResponse<Topic>> {
		return this.withRateLimit(() => this.client.topics.getMultiple(params));
	}

	// Publishers API with rate limiting
	public async getPublisher(id: string, params?: Record<string, unknown>): Promise<Publisher> {
		return this.withRateLimit(() => this.client.publishers.get(id, params));
	}

	public async getPublishers(params?: Record<string, unknown>): Promise<OpenAlexResponse<Publisher>> {
		return this.withRateLimit(() => this.client.publishers.getMultiple(params));
	}

	// Funders API with rate limiting
	public async getFunder(id: string, params?: Record<string, unknown>): Promise<Funder> {
		return this.withRateLimit(() => this.client.funders.get(id, params));
	}

	public async getFunders(params?: Record<string, unknown>): Promise<OpenAlexResponse<Funder>> {
		return this.withRateLimit(() => this.client.funders.getMultiple(params));
	}

	// Keywords API with rate limiting
	public async getKeyword(id: string, params?: QueryParams): Promise<Keyword> {
		return this.withRateLimit(() => this.client.keywords.getKeyword(id, params as QueryParams));
	}

	public async getKeywords(params?: QueryParams): Promise<OpenAlexResponse<Keyword>> {
		return this.withRateLimit(() => this.client.keywords.getKeywords(params as QueryParams));
	}


	// Autocomplete with rate limiting
	public async autocomplete(query: string, entityType?: EntityType): Promise<AutocompleteResult[]> {
		return this.withRateLimit(() => this.client.autocomplete.autocomplete(query, entityType));
	}

	public async autocompleteWorks(query: string): Promise<AutocompleteResult[]> {
		return this.withRateLimit(() => this.client.autocomplete.autocompleteWorks(query));
	}

	public async autocompleteAuthors(query: string): Promise<AutocompleteResult[]> {
		return this.withRateLimit(() => this.client.autocomplete.autocompleteAuthors(query));
	}

	public async autocompleteSources(query: string): Promise<AutocompleteResult[]> {
		return this.withRateLimit(() => this.client.autocomplete.autocompleteSources(query));
	}

	public async autocompleteInstitutions(query: string): Promise<AutocompleteResult[]> {
		return this.withRateLimit(() => this.client.autocomplete.autocompleteInstitutions(query));
	}

	public async autocompleteTopics(query: string): Promise<AutocompleteResult[]> {
		return this.withRateLimit(() => this.client.autocomplete.autocompleteTopics(query));
	}

	// Note: autocompletePublishers and autocompleteFunders may not be available in all API versions

	// Cross-entity search with rate limiting
	public async searchAll(
		query: string,
		options: {
      entityTypes?: EntityType[];
      limit?: number;
      page?: number;
    } = {}
	): Promise<{
    works: Work[];
    authors: Author[];
    sources: Source[];
    institutions: InstitutionEntity[];
    topics: Topic[];
    publishers: Publisher[];
    funders: Funder[];
    keywords: Keyword[];
  }> {
		return this.withRateLimit(() => this.client.searchAll(query, options));
	}

	// Utility methods
	public detectEntityType(id: string): EntityType | null {
		return this.client.detectEntityType(id);
	}

	public isValidOpenAlexId(id: string): boolean {
		return this.client.isValidOpenAlexId(id);
	}

	public updateConfig(config: Partial<OpenAlexClientOptions>): void {
		this.client.updateConfig(config);
	}

	public getStats(): {
    rateLimit: {
      requestsToday: number;
      requestsRemaining: number;
      dailyResetTime: Date;
    };
    entityCounts?: {
      works?: number;
      authors?: number;
      sources?: number;
      institutions?: number;
      topics?: number;
      publishers?: number;
      funders?: number;
    };
    } {
		return this.client.getStats();
	}

	// Streaming with rate limiting (more complex to implement properly)
	public async *stream<T = OpenAlexEntity>(
		entityType: EntityType,
		params: QueryParams = {}
	): AsyncGenerator<T[], void, unknown> {
		// For streaming, we need to apply rate limiting to each batch
		const originalStream = this.client.stream<T>(entityType, params);

		for await (const batch of originalStream) {
			// Apply rate limiting before yielding each batch
			yield await this.withRateLimit(() => Promise.resolve(batch));
		}
	}

	/**
   * Get the underlying client for advanced operations
   * Use with caution as this bypasses rate limiting
   */
	public getUnderlyingClient(): OpenAlexClient {
		return this.client;
	}

	/**
   * Get rate limiter statistics
   */
	public getRateLimiterStats(): {
    limit: number;
    window: number;
    windowType: string;
    } {
		return {
			limit: RATE_LIMIT_CONFIG.openAlex.limit,
			window: RATE_LIMIT_CONFIG.openAlex.window,
			windowType: RATE_LIMIT_CONFIG.openAlex.windowType,
		};
	}
}

/**
 * Create a rate-limited OpenAlex client instance
 */
export function createRateLimitedOpenAlexClient(options?: OpenAlexClientOptions): RateLimitedOpenAlexClient {
	return new RateLimitedOpenAlexClient(options);
}

/**
 * Default rate-limited client instance
 * Configured with conservative rate limits for production use
 */
export const rateLimitedOpenAlex = new RateLimitedOpenAlexClient({
	userEmail: (import.meta.env.VITE_OPENALEX_EMAIL as string) || undefined,
	rateLimit: {
		requestsPerSecond: 8,  // Conservative under 10 req/sec
		requestsPerDay: 95000, // Conservative under 100k req/day
	},
});