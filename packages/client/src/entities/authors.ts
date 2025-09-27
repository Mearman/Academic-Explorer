/**
 * OpenAlex Authors API Entity Methods
 * Provides comprehensive methods for interacting with author entities
 */

import type {
	Author,
	AuthorsFilters,
	QueryParams,
	OpenAlexResponse,
	Work,
	OpenAlexId,
	AutocompleteResult
} from "../types";
import type { OpenAlexBaseClient } from "../client";
import { buildFilterString } from "../utils/query-builder";
import { AutocompleteApi } from "../utils/autocomplete";

/**
 * Extended filters for specific author query methods
 */
export interface AuthorWorksFilters extends AuthorsFilters {
  "publication_year"?: number | string;
  "cited_by_count"?: string | number;
  "is_oa"?: boolean;
  "type"?: string | string[];
  "primary_topic.id"?: string | string[];
}

export interface AuthorCollaboratorsFilters {
  "min_works"?: number;
  "from_publication_year"?: number;
  "to_publication_year"?: number;
}

/**
 * Grouping result for author statistics
 */
export interface GroupByResult {
  key: string;
  key_display_name: string;
  count: number;
}

/**
 * Grouped response specifically for Authors with statistics
 */
export interface GroupedResponse<T> extends Omit<OpenAlexResponse<T>, 'group_by'> {
  group_by: GroupByResult[];
}

/**
 * Options for grouping authors
 */
export interface AuthorGroupingOptions {
  filters?: AuthorsFilters;
  sort?: string;
  per_page?: number;
  page?: number;
}

/**
 * Options for author autocomplete queries
 */
export interface AutocompleteOptions extends Pick<QueryParams, 'per_page'> {
  /** Maximum number of autocomplete results to return (default: 25, max: 200) */
  per_page?: number;
}

/**
 * Authors API class providing comprehensive methods for author entity operations
 */
export class AuthorsApi {
	constructor(private client: OpenAlexBaseClient) {}

	/**
	 * Autocomplete authors based on partial name or query string
	 * Provides fast suggestions for author names with built-in debouncing and caching
	 * @param query - Search query string (e.g., partial author name)
	 * @param options - Optional parameters for autocomplete behavior
	 * @returns Promise resolving to array of autocomplete results
	 *
	 * @example
	 * ```typescript
	 * // Basic autocomplete
	 * const suggestions = await authorsApi.autocomplete('einstein');
	 *
	 * // Limit number of results
	 * const limitedSuggestions = await authorsApi.autocomplete('marie curie', {
	 *   per_page: 10
	 * });
	 * ```
	 */
	async autocomplete(query: string, options: AutocompleteOptions = {}): Promise<AutocompleteResult[]> {
		// Validate query parameter
		if (!query || typeof query !== 'string') {
			throw new Error('Query parameter is required and must be a non-empty string');
		}

		const trimmedQuery = query.trim();
		if (trimmedQuery.length === 0) {
			return [];
		}

		try {
			const endpoint = "autocomplete/authors";
			const queryParams: QueryParams & { q: string } = {
				q: trimmedQuery,
			};

			// Apply per_page limit if specified
			if (options.per_page !== undefined && options.per_page > 0) {
				queryParams.per_page = Math.min(options.per_page, 200); // Respect OpenAlex API limits
			}

			const response = await this.client.getResponse<AutocompleteResult>(endpoint, queryParams);

			return response.results.map(result => ({
				...result,
				entity_type: "author" as const,
			}));
		} catch (error: unknown) {
			// Log error but return empty array for graceful degradation
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			console.warn(`[AuthorsApi] Autocomplete failed for query "${query}": ${errorMessage}`);
			return [];
		}
	}

	/**
   * Get a single author by ID
   * @param id - Author ID (OpenAlex ID, ORCID, or other supported format)
   * @param params - Query parameters for field selection and additional options
   * @returns Promise resolving to Author entity
   *
   * @example
   * ```typescript
   * const author = await authorsApi.getAuthor('A2208157607');
   * const authorWithSelect = await authorsApi.getAuthor('A2208157607', {
   *   select: ['id', 'display_name', 'works_count', 'cited_by_count']
   * });
   * ```
   */
	async getAuthor(id: string, params: QueryParams = {}): Promise<Author> {
		return this.client.getById<Author>("authors", id, params);
	}

	/**
   * Get multiple authors with optional filtering and pagination
   * @param params - Query parameters including filters, sorting, and pagination
   * @returns Promise resolving to OpenAlexResponse containing authors
   *
   * @example
   * ```typescript
   * // Get authors with high citation counts
   * const authors = await authorsApi.getAuthors({
   *   filter: 'cited_by_count:>1000',
   *   sort: 'cited_by_count:desc',
   *   per_page: 50
   * });
   *
   * // Get authors from specific institution
   * const institutionAuthors = await authorsApi.getAuthors({
   *   filter: 'last_known_institution.id:I27837315'
   * });
   * ```
   */
	async getAuthors(params: QueryParams & { filter?: string | AuthorsFilters } = {}): Promise<OpenAlexResponse<Author>> {
		const processedParams = { ...params };

		// Convert filter object to string if needed
		if (processedParams.filter && typeof processedParams.filter === 'object') {
			processedParams.filter = buildFilterString(processedParams.filter);
		}

		return this.client.getResponse<Author>("authors", processedParams);
	}

	/**
   * Search authors by query string with optional filters
   * @param query - Search query string
   * @param filters - Optional AuthorsFilters for refined searching
   * @param params - Additional query parameters
   * @returns Promise resolving to OpenAlexResponse containing matching authors
   *
   * @example
   * ```typescript
   * // Search authors by name
   * const authors = await authorsApi.searchAuthors('einstein');
   *
   * // Search with filters
   * const authors = await authorsApi.searchAuthors('machine learning', {
   *   'works_count': '>10',
   *   'has_orcid': true
   * });
   * ```
   */
	async searchAuthors(
		query: string,
		filters: AuthorsFilters = {},
		params: QueryParams = {}
	): Promise<OpenAlexResponse<Author>> {
		// Build combined filters with search query
		const combinedFilters = {
			"default.search": query,
			...filters
		};

		// Call client.getResponse directly to match test expectations
		const requestParams: QueryParams = {
			filter: buildFilterString(combinedFilters)
		};

		// Only add additional params if they exist and are not empty
		Object.keys(params).forEach(key => {
			if (params[key] !== undefined && params[key] !== null) {
				requestParams[key] = params[key];
			}
		});

		return this.client.getResponse<Author>("authors", requestParams);
	}

	/**
   * Get authors affiliated with a specific institution
   * @param institutionId - Institution ID (OpenAlex ID or ROR)
   * @param params - Additional query parameters
   * @returns Promise resolving to OpenAlexResponse containing institution authors
   *
   * @example
   * ```typescript
   * // Get authors from MIT
   * const mitAuthors = await authorsApi.getAuthorsByInstitution('I27837315');
   *
   * // Get top cited authors from institution
   * const topAuthors = await authorsApi.getAuthorsByInstitution('I27837315', {
   *   sort: 'cited_by_count:desc',
   *   per_page: 20
   * });
   * ```
   */
	async getAuthorsByInstitution(
		institutionId: string,
		params: QueryParams = {}
	): Promise<OpenAlexResponse<Author>> {
		return this.getAuthors({
			...params,
			filter: `last_known_institution.id:${encodeURIComponent(institutionId)}`
		});
	}

	/**
   * Get authors from a specific country
   * @param countryCode - ISO 2-letter country code
   * @param params - Additional query parameters
   * @returns Promise resolving to OpenAlexResponse containing country authors
   *
   * @example
   * ```typescript
   * // Get authors from United States
   * const usAuthors = await authorsApi.getAuthorsByCountry('US');
   *
   * // Get most productive authors from UK
   * const ukAuthors = await authorsApi.getAuthorsByCountry('GB', {
   *   sort: 'works_count:desc',
   *   per_page: 100
   * });
   * ```
   */
	async getAuthorsByCountry(
		countryCode: string,
		params: QueryParams = {}
	): Promise<OpenAlexResponse<Author>> {
		return this.getAuthors({
			...params,
			filter: `last_known_institution.country_code:${countryCode.toUpperCase()}`
		});
	}

	/**
   * Get works authored by a specific author
   * @param authorId - Author ID
   * @param filters - Optional filters for works
   * @param params - Additional query parameters
   * @returns Promise resolving to OpenAlexResponse containing author's works
   *
   * @example
   * ```typescript
   * // Get all works by an author
   * const works = await authorsApi.getAuthorWorks('A2208157607');
   *
   * // Get recent open access works
   * const recentOA = await authorsApi.getAuthorWorks('A2208157607', {
   *   'publication_year': '>2020',
   *   'is_oa': true
   * });
   * ```
   */
	async getAuthorWorks(
		authorId: string,
		filters: AuthorWorksFilters = {},
		params: QueryParams = {}
	): Promise<OpenAlexResponse<Work>> {
		// Build combined filters with author ID
		const combinedFilters = {
			"authorships.author.id": authorId,
			...filters
		};

		return this.client.getResponse<Work>("works", {
			...params,
			filter: buildFilterString(combinedFilters)
		});
	}

	/**
   * Get research concepts associated with an author
   * @param authorId - Author ID
   * @param params - Additional query parameters
   * @returns Promise resolving to array of concepts with scores
   *
   * @example
   * ```typescript
   * const concepts = await authorsApi.getAuthorConcepts('A2208157607');
   * ```
   */
	async getAuthorConcepts(
		authorId: string,
		params: QueryParams = {}
	): Promise<Array<{ id: OpenAlexId; display_name: string; score: number; level: number }>> {
		const author = await this.getAuthor(authorId, {
			...params,
			select: ["x_concepts"]
		});

		return author.x_concepts ?? [];
	}

	/**
   * Get research topics associated with an author
   * @param authorId - Author ID
   * @param params - Additional query parameters
   * @returns Promise resolving to array of topics with counts
   *
   * @example
   * ```typescript
   * const topics = await authorsApi.getAuthorTopics('A2208157607');
   * ```
   */
	async getAuthorTopics(
		authorId: string,
		params: QueryParams = {}
	): Promise<Array<{
    id: OpenAlexId;
    display_name: string;
    count: number;
    subfield?: { id: OpenAlexId; display_name: string };
    field?: { id: OpenAlexId; display_name: string };
    domain?: { id: OpenAlexId; display_name: string };
  }>> {
		const author = await this.getAuthor(authorId, {
			...params,
			select: ["topics"]
		});

		return author.topics ?? [];
	}

	/**
   * Get frequent collaborators of an author
   * @param authorId - Author ID
   * @param filters - Optional filters for collaboration analysis
   * @param params - Additional query parameters
   * @returns Promise resolving to array of collaborator authors with collaboration stats
   *
   * @example
   * ```typescript
   * // Get all collaborators
   * const collaborators = await authorsApi.getAuthorCollaborators('A2208157607');
   *
   * // Get collaborators with minimum works threshold
   * const frequentCollaborators = await authorsApi.getAuthorCollaborators('A2208157607', {
   *   min_works: 3
   * });
   * ```
   */
	async getAuthorCollaborators(
		authorId: string,
		filters: AuthorCollaboratorsFilters = {},
		params: QueryParams = {}
	): Promise<Array<{
    author: Author;
    collaboration_count: number;
    first_collaboration_year?: number;
    last_collaboration_year?: number;
  }>> {
		// First, get all works by this author to analyze co-authorships
		const worksFilters: AuthorWorksFilters = {};
		if (filters.from_publication_year) {
			worksFilters["publication_year"] = `>=${filters.from_publication_year.toString()}`;
		}

		const works = await this.getAuthorWorks(authorId, worksFilters, {
			...params,
			select: ["authorships", "publication_year"],
			per_page: 200 // Get more works for better collaboration analysis
		});

		const collaboratorStats = new Map<string, {
      count: number;
      years: number[];
      author_info?: Author;
    }>();

		// Analyze co-authorships
		works.results.forEach(work => {
			const coauthorIds = work.authorships
				.map(auth => auth.author.id)
				.filter(id => id !== authorId);

			coauthorIds.forEach(coauthorId => {
				if (!collaboratorStats.has(coauthorId)) {
					collaboratorStats.set(coauthorId, {
						count: 0,
						years: []
					});
				}

				const stats = collaboratorStats.get(coauthorId);
				if (!stats) return;
				stats.count++;
				if (work.publication_year) {
					stats.years.push(work.publication_year);
				}
			});
		});

		// Filter by minimum works if specified
		const minWorks = filters.min_works ?? 1;
		const filteredCollaborators = Array.from(collaboratorStats.entries())
			.filter(([, stats]) => stats.count >= minWorks)
			.sort(([, a], [, b]) => b.count - a.count);

		// Get author details for top collaborators
		const collaboratorResults = await Promise.allSettled(
			filteredCollaborators.slice(0, 50).map(async ([collaboratorId, stats]) => {
				try {
					const collaboratorAuthor = await this.getAuthor(collaboratorId, {
						select: ["id", "display_name", "works_count", "cited_by_count"]
					});

					const result: {
						author: Author;
						collaboration_count: number;
						first_collaboration_year?: number;
						last_collaboration_year?: number;
					} = {
						author: collaboratorAuthor,
						collaboration_count: stats.count,
					};

					if (stats.years.length > 0) {
						result.first_collaboration_year = Math.min(...stats.years);
						result.last_collaboration_year = Math.max(...stats.years);
					}

					return result;
				} catch {
					// Skip authors that can't be fetched
					return null;
				}
			})
		);

		return collaboratorResults
			.filter((result): result is PromiseFulfilledResult<{
        author: Author;
        collaboration_count: number;
        first_collaboration_year?: number;
        last_collaboration_year?: number;
      }> =>
				result.status === "fulfilled" && result.value !== null
			)
			.map(result => result.value);
	}

	/**
   * Get a random sample of authors
   * @param count - Number of random authors to return (max 200)
   * @param params - Additional query parameters
   * @returns Promise resolving to OpenAlexResponse containing random authors
   *
   * @example
   * ```typescript
   * // Get 10 random authors
   * const randomAuthors = await authorsApi.getRandomAuthors(10);
   *
   * // Get random authors with high citation counts
   * const randomCitedAuthors = await authorsApi.getRandomAuthors(20, {
   *   filter: 'cited_by_count:>100'
   * });
   * ```
   */
	async getRandomAuthors(
		count: number = 25,
		params: QueryParams & { filter?: string } = {}
	): Promise<OpenAlexResponse<Author>> {
		// Ensure count is within reasonable bounds
		const sampleSize = Math.min(Math.max(count, 1), 200);

		return this.getAuthors({
			...params,
			sample: sampleSize,
			seed: Math.floor(Math.random() * 1000000) // Random seed for variety
		});
	}

	/**
   * Get authors with ORCID identifiers
   * @param params - Additional query parameters
   * @returns Promise resolving to OpenAlexResponse containing authors with ORCIDs
   *
   * @example
   * ```typescript
   * const authorsWithOrcid = await authorsApi.getAuthorsWithOrcid();
   * ```
   */
	async getAuthorsWithOrcid(params: QueryParams = {}): Promise<OpenAlexResponse<Author>> {
		return this.getAuthors({
			...params,
			filter: "has_orcid:true"
		});
	}

	/**
   * Get most cited authors globally or with filters
   * @param limit - Number of authors to return
   * @param filters - Optional filters to refine search
   * @param params - Additional query parameters
   * @returns Promise resolving to OpenAlexResponse containing most cited authors
   *
   * @example
   * ```typescript
   * // Get top 100 most cited authors
   * const topAuthors = await authorsApi.getMostCitedAuthors(100);
   *
   * // Get most cited authors from a specific field
   * const topMLAuthors = await authorsApi.getMostCitedAuthors(50, {
   *   'x_concepts.id': 'C119857082' // Machine learning concept ID
   * });
   * ```
   */
	async getMostCitedAuthors(
		limit: number = 50,
		filters: AuthorsFilters = {},
		params: QueryParams = {}
	): Promise<OpenAlexResponse<Author>> {
		const authorsParams: QueryParams & { filter?: string } = {
			...params,
			sort: "cited_by_count:desc",
			per_page: Math.min(limit, 200)
		};

		const filterString = buildFilterString(filters);
		if (filterString) {
			authorsParams.filter = filterString;
		}

		return this.getAuthors(authorsParams);
	}

	/**
   * Get most productive authors (by works count)
   * @param limit - Number of authors to return
   * @param filters - Optional filters to refine search
   * @param params - Additional query parameters
   * @returns Promise resolving to OpenAlexResponse containing most productive authors
   *
   * @example
   * ```typescript
   * const productiveAuthors = await authorsApi.getMostProductiveAuthors(100);
   * ```
   */
	async getMostProductiveAuthors(
		limit: number = 50,
		filters: AuthorsFilters = {},
		params: QueryParams = {}
	): Promise<OpenAlexResponse<Author>> {
		const authorsParams: QueryParams & { filter?: string } = {
			...params,
			sort: "works_count:desc",
			per_page: Math.min(limit, 200)
		};

		const filterString = buildFilterString(filters);
		if (filterString) {
			authorsParams.filter = filterString;
		}

		return this.getAuthors(authorsParams);
	}

	/**
   * Stream all authors matching the given criteria
   * Useful for processing large datasets
   * @param params - Query parameters for filtering
   * @param batchSize - Number of authors per batch
   * @returns AsyncGenerator yielding batches of authors
   *
   * @example
   * ```typescript
   * // Process all authors from an institution
   * for await (const authorBatch of authorsApi.streamAuthors({
   *   filter: 'last_known_institution.id:I27837315'
   * })) {
   *   for (const author of authorBatch) {
   *     logger.debug("api", `Processing ${author.display_name}`);
   *   }
   * }
   * ```
   */
	async *streamAuthors(
		params: QueryParams & { filter?: string } = {},
		batchSize: number = 200
	): AsyncGenerator<Author[], void, unknown> {
		yield* this.client.stream<Author>("authors", params, batchSize);
	}

	/**
   * Get statistical aggregations for authors grouped by a specific field
   * @param groupBy - Field to group by (e.g., 'last_known_institution.country_code', 'publication_year', 'topics.id')
   * @param filters - Optional filters to apply before grouping
   * @returns Promise resolving to array of GroupByResult with statistics
   *
   * @example
   * ```typescript
   * // Get author counts by country
   * const countryStats = await authorsApi.getStats('last_known_institution.country_code', {
   *   'cited_by_count': '>100'
   * });
   *
   * // Get author counts by institution
   * const institutionStats = await authorsApi.getStats('last_known_institution.id', {
   *   'works_count': '>10'
   * });
   * ```
   */
	async getStats(
		groupBy: string,
		filters: AuthorsFilters = {}
	): Promise<GroupByResult[]> {
		const params: QueryParams & { filter?: string } = {
			group_by: groupBy,
			per_page: 0 // Only get grouping stats, no individual results
		};

		const filterString = buildFilterString(filters);
		if (filterString) {
			params.filter = filterString;
		}

		const response = await this.client.getResponse<Author>("authors", params);

		return response.group_by || [];
	}

	/**
   * Get authors grouped by a specific field with full author data
   * @param field - Field to group by
   * @param options - Additional options for filtering and pagination
   * @returns Promise resolving to GroupedResponse containing grouped authors
   *
   * @example
   * ```typescript
   * // Get authors grouped by country with full data
   * const authorsByCountry = await authorsApi.getAuthorsGroupedBy('last_known_institution.country_code', {
   *   filters: { 'cited_by_count': '>500' },
   *   per_page: 25
   * });
   *
   * // Get authors grouped by institution
   * const authorsByInstitution = await authorsApi.getAuthorsGroupedBy('last_known_institution.id', {
   *   filters: { 'has_orcid': true },
   *   sort: 'cited_by_count:desc'
   * });
   * ```
   */
	async getAuthorsGroupedBy(
		field: string,
		options: AuthorGroupingOptions = {}
	): Promise<GroupedResponse<Author>> {
		const { filters = {}, sort, per_page = 25, page } = options;

		const params: QueryParams & { filter?: string } = {
			group_by: field,
			per_page,
			...(sort && { sort }),
			...(page && { page })
		};

		const filterString = buildFilterString(filters);
		if (filterString) {
			params.filter = filterString;
		}

		const response = await this.client.getResponse<Author>("authors", params);

		// Transform the response to match GroupedResponse type
		return {
			...response,
			group_by: response.group_by || []
		} as GroupedResponse<Author>;
	}
}