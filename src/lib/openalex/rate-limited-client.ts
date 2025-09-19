/**
 * Rate-limited OpenAlex client using simple time-based throttling
 * Provides additional rate limiting on top of the existing OpenAlex client
 */

import { OpenAlexClient, OpenAlexClientOptions } from "./openalex-client";
import { RATE_LIMIT_CONFIG } from "@/config/rate-limit";
import { logger } from "@/lib/logger";
import { staticDataProvider } from "@/lib/api/static-data-provider";
import { toStaticEntityType, cleanOpenAlexId } from "@/lib/utils/static-data-utils";
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
	EntityTypeMap,
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
				logger.debug("api", `Retrying operation (attempt ${String(attempt + 2)}/${String(maxRetries + 1)})`, {
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
		if (this.hasStatusCode(error)) {
			return [429, 502, 503, 504].includes(error.statusCode);
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

	/**
	 * Type guard to check if an error has a status code property
	 */
	private isObjectWithStatusCode(obj: unknown): obj is Record<string, unknown> {
		return obj !== null && typeof obj === "object" && "statusCode" in obj;
	}

	/**
	 * Type guard to check if an error has a status code
	 */
	private hasStatusCode(error: unknown): error is { statusCode: number } {
		if (!this.isObjectWithStatusCode(error)) {
			return false;
		}
		return typeof error.statusCode === "number";
	}

	/**
	 * Type guard to validate QueryParams
	 */
	private isValidQueryParams(params: QueryParams | undefined): params is QueryParams {
		return params !== undefined && params !== null && typeof params === "object";
	}

	// Type guard to check if unknown data is an OpenAlex entity
	private isOpenAlexEntity(data: unknown): data is OpenAlexEntity {
		return (
			data !== null &&
			typeof data === "object" &&
			"id" in data &&
			typeof data.id === "string"
		);
	}

	// Type guard for Work
	private isWork(data: unknown): data is Work {
		return this.isOpenAlexEntity(data);
	}

	// Type guard for Author
	private isAuthor(data: unknown): data is Author {
		return this.isOpenAlexEntity(data);
	}

	// Type guard for InstitutionEntity
	private isInstitution(data: unknown): data is InstitutionEntity {
		return this.isOpenAlexEntity(data);
	}

	// Type guard for Topic
	private isTopic(data: unknown): data is Topic {
		return this.isOpenAlexEntity(data);
	}

	// Type guard for Publisher
	private isPublisher(data: unknown): data is Publisher {
		return this.isOpenAlexEntity(data);
	}

	// Type guard for Funder
	private isFunder(data: unknown): data is Funder {
		return this.isOpenAlexEntity(data);
	}

	// Entity retrieval methods with rate limiting and static data fallback
	public async getEntity(id: string): Promise<OpenAlexEntity> {
		try {
			// First, try static data if available
			const entityType = this.detectEntityType(id);
			if (entityType) {
				const staticType = toStaticEntityType(entityType);
				if (staticType) {
					const staticEntity = await staticDataProvider.getEntity({ entityType: staticType, entityId: cleanOpenAlexId(id) });
					if (this.isOpenAlexEntity(staticEntity)) {
						logger.debug("static-data", "Served entity from static data", { id, entityType });
						return staticEntity;
					}
				}
			}

			// Fallback to API with rate limiting
			logger.debug("api", "Fetching entity from API", { id, entityType });
			return await this.withRateLimit(() => this.client.getEntity(id));
		} catch (error) {
			logger.error("api", "Failed to get entity", { id, error });
			throw error;
		}
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

	// Works API with rate limiting and static data fallback
	public async getWork(id: string, params?: QueryParams): Promise<Work> {
		try {
			// Try static data first (only for simple gets without complex params)
			if (!params || Object.keys(params).length === 0) {
				const staticWork = await staticDataProvider.getEntity({ entityType: "works", entityId: cleanOpenAlexId(id) });
				if (this.isWork(staticWork)) {
					logger.debug("static-data", "Served work from static data", { id });
					return staticWork;
				}
			}

			// Fallback to API with rate limiting
			logger.debug("api", "Fetching work from API", { id, params });
			return await this.withRateLimit(() => this.client.works.getWork(id, params));
		} catch (error) {
			logger.error("api", "Failed to get work", { id, params, error });
			throw error;
		}
	}

	public async getWorks(params?: QueryParams): Promise<OpenAlexResponse<Work>> {
		return this.withRateLimit(() => this.client.works.getWorks(params));
	}

	public async searchWorks(query: string, params?: Record<string, unknown>): Promise<OpenAlexResponse<Work>> {
		return this.withRateLimit(() => this.client.works.searchWorks(query, params));
	}

	// Authors API with rate limiting and static data fallback
	public async getAuthor(id: string, params?: QueryParams): Promise<Author> {
		try {
			// Try static data first (only for simple gets without complex params)
			if (!params || Object.keys(params).length === 0) {
				const staticAuthor = await staticDataProvider.getEntity({ entityType: "authors", entityId: cleanOpenAlexId(id) });
				if (this.isAuthor(staticAuthor)) {
					logger.debug("static-data", "Served author from static data", { id });
					return staticAuthor;
				}
			}

			// Fallback to API with rate limiting
			logger.debug("api", "Fetching author from API", { id, params });
			return await this.withRateLimit(() => this.client.authors.getAuthor(id, params));
		} catch (error) {
			logger.error("api", "Failed to get author", { id, params, error });
			throw error;
		}
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

	// Institutions API with rate limiting and static data fallback
	public async getInstitution(id: string, params?: QueryParams): Promise<InstitutionEntity> {
		try {
			// Try static data first (only for simple gets without complex params)
			if (!params || Object.keys(params).length === 0) {
				const staticInstitution = await staticDataProvider.getEntity({ entityType: "institutions", entityId: cleanOpenAlexId(id) });
				if (this.isInstitution(staticInstitution)) {
					logger.debug("static-data", "Served institution from static data", { id });
					return staticInstitution;
				}
			}

			// Fallback to API with rate limiting
			logger.debug("api", "Fetching institution from API", { id, params });
			return await this.withRateLimit(() => this.client.institutions.getInstitution(id, params));
		} catch (error) {
			logger.error("api", "Failed to get institution", { id, params, error });
			throw error;
		}
	}

	public async getInstitutions(params?: Record<string, unknown>): Promise<OpenAlexResponse<InstitutionEntity>> {
		return this.withRateLimit(() => this.client.institutions.getInstitutions(params));
	}

	public async searchInstitutions(query: string, params?: Record<string, unknown>): Promise<OpenAlexResponse<InstitutionEntity>> {
		return this.withRateLimit(() => this.client.institutions.searchInstitutions(query, params));
	}

	// Topics API with rate limiting and static data fallback
	public async getTopic(id: string, params?: QueryParams): Promise<Topic> {
		try {
			// Try static data first (only for simple gets without complex params)
			if (!params || Object.keys(params).length === 0) {
				const staticTopic = await staticDataProvider.getEntity({ entityType: "topics", entityId: cleanOpenAlexId(id) });
				if (this.isTopic(staticTopic)) {
					logger.debug("static-data", "Served topic from static data", { id });
					return staticTopic;
				}
			}

			// Fallback to API with rate limiting
			logger.debug("api", "Fetching topic from API", { id, params });
			return await this.withRateLimit(() => this.client.topics.get(id, params));
		} catch (error) {
			logger.error("api", "Failed to get topic", { id, params, error });
			throw error;
		}
	}

	public async getTopics(params?: Record<string, unknown>): Promise<OpenAlexResponse<Topic>> {
		return this.withRateLimit(() => this.client.topics.getMultiple(params));
	}

	// Publishers API with rate limiting and static data fallback
	public async getPublisher(id: string, params?: Record<string, unknown>): Promise<Publisher> {
		try {
			// Try static data first (only for simple gets without complex params)
			if (!params || Object.keys(params).length === 0) {
				const staticPublisher = await staticDataProvider.getEntity({ entityType: "publishers", entityId: cleanOpenAlexId(id) });
				if (this.isPublisher(staticPublisher)) {
					logger.debug("static-data", "Served publisher from static data", { id });
					return staticPublisher;
				}
			}

			// Fallback to API with rate limiting
			logger.debug("api", "Fetching publisher from API", { id, params });
			return await this.withRateLimit(() => this.client.publishers.get(id, params));
		} catch (error) {
			logger.error("api", "Failed to get publisher", { id, params, error });
			throw error;
		}
	}

	public async getPublishers(params?: Record<string, unknown>): Promise<OpenAlexResponse<Publisher>> {
		return this.withRateLimit(() => this.client.publishers.getMultiple(params));
	}

	// Funders API with rate limiting and static data fallback
	public async getFunder(id: string, params?: Record<string, unknown>): Promise<Funder> {
		try {
			// Try static data first (only for simple gets without complex params)
			if (!params || Object.keys(params).length === 0) {
				const staticFunder = await staticDataProvider.getEntity({ entityType: "funders", entityId: cleanOpenAlexId(id) });
				if (this.isFunder(staticFunder)) {
					logger.debug("static-data", "Served funder from static data", { id });
					return staticFunder;
				}
			}

			// Fallback to API with rate limiting
			logger.debug("api", "Fetching funder from API", { id, params });
			return await this.withRateLimit(() => this.client.funders.get(id, params));
		} catch (error) {
			logger.error("api", "Failed to get funder", { id, params, error });
			throw error;
		}
	}

	public async getFunders(params?: Record<string, unknown>): Promise<OpenAlexResponse<Funder>> {
		return this.withRateLimit(() => this.client.funders.getMultiple(params));
	}

	// Keywords API with rate limiting
	public async getKeyword(id: string, params?: QueryParams): Promise<Keyword> {
		const validParams = this.isValidQueryParams(params) ? params : {};
		return this.withRateLimit(() => this.client.keywords.getKeyword(id, validParams));
	}

	public async getKeywords(params?: QueryParams): Promise<OpenAlexResponse<Keyword>> {
		const validParams = this.isValidQueryParams(params) ? params : {};
		return this.withRateLimit(() => this.client.keywords.getKeywords(validParams));
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
	public async *stream<T extends EntityType>(
		entityType: T,
		params: QueryParams = {}
	): AsyncGenerator<EntityTypeMap[T][], void, unknown> {
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

	// Static data utility methods

	/**
   * Get static data statistics
   */
	public async getStaticDataStats() {
		return await staticDataProvider.getStatistics();
	}

	/**
   * Clear static data cache
   */
	public clearStaticCache(): void {
		staticDataProvider.clearCache();
	}

	/**
   * Check if entity is available in static data
   */
	public async hasStaticEntity(entityType: EntityType, id: string): Promise<boolean> {
		const staticType = toStaticEntityType(entityType);
		if (!staticType) return false;

		return await staticDataProvider.hasEntity({ entityType: staticType, entityId: cleanOpenAlexId(id) });
	}

	/**
   * Get static data cache statistics
   */
	public getStaticCacheStats() {
		return staticDataProvider.getCacheStats();
	}
}

/**
 * Create a rate-limited OpenAlex client instance
 */
export function createRateLimitedOpenAlexClient(options?: OpenAlexClientOptions): RateLimitedOpenAlexClient {
	return new RateLimitedOpenAlexClient(options);
}

/**
 * Type guard to check if environment variable is a non-empty string
 */
function isValidEmailEnv(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

/**
 * Default rate-limited client instance
 * Configured with conservative rate limits for production use
 * Starts with environment variable email, can be updated dynamically via updateOpenAlexEmail()
 */
export const rateLimitedOpenAlex = new RateLimitedOpenAlexClient({
	userEmail: isValidEmailEnv(import.meta.env.VITE_OPENALEX_EMAIL)
		? import.meta.env.VITE_OPENALEX_EMAIL
		: undefined,
	rateLimit: {
		requestsPerSecond: 8,  // Conservative under 10 req/sec
		requestsPerDay: 95000, // Conservative under 100k req/day
	},
});

/**
 * Update the email configuration for the global OpenAlex client
 * This should be called when the user updates their email in settings
 */
export function updateOpenAlexEmail(email: string | undefined): void {
	rateLimitedOpenAlex.updateConfig({
		userEmail: email && email.trim().length > 0 ? email.trim() : undefined,
	});

	logger.debug("api", "Updated OpenAlex client email configuration", {
		hasEmail: !!(email && email.trim().length > 0),
		emailLength: email?.trim().length || 0
	}, "RateLimitedOpenAlexClient");
}

/**
 * Initialize OpenAlex client with stored email from settings
 * This should be called after the settings store is hydrated
 */
export function initializeOpenAlexClientEmail(): void {
	// This will be called from the settings store after hydration
	// to apply any stored email configuration
}