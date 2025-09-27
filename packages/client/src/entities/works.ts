/**
 * OpenAlex Works API Entity Methods
 * Provides comprehensive methods for interacting with Works (academic papers) through the OpenAlex API
 */

import type {
	Work,
	WorksFilters,
	QueryParams,
	OpenAlexResponse,
	AutocompleteResult,
} from "../types";
import { OpenAlexBaseClient } from "../client";
import { buildFilterString } from "../utils/query-builder";

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
 * Options for autocomplete functionality
 */
export interface AutocompleteOptions {
  /** Number of results to return (default: 10, max: 50) */
  per_page?: number;
  /** Additional query parameters for filtering */
  filters?: Record<string, unknown>;
}

/**
 * Group by result for a single aggregation bucket
 */
export interface GroupByResult {
  key: string;
  key_display_name: string;
  count: number;
}

/**
 * Response structure for grouped Works API results
 */
export interface GroupedResponse<T> {
  results: T[];
  meta: {
    count: number;
    db_response_time_ms: number;
    page: number;
    per_page: number;
    groups_count?: number;
  };
  group_by: GroupByResult[];
}

/**
 * Options for grouping works
 */
export interface GroupWorksOptions {
  filters?: WorksFilters;
  sort?: "relevance_score" | "cited_by_count" | "publication_date" | "created_date";
  page?: number;
  per_page?: number;
  select?: string[];
  group_limit?: number;
}

/**
 * Works API class providing comprehensive methods for academic paper operations
 */
export class WorksApi {
	constructor(private client: OpenAlexBaseClient) {}

	/**
	 * Type guard to check if value is WorksFilters
	 */
	private isWorksFilters(value: unknown): value is WorksFilters {
		return typeof value === "object" && value !== null && !Array.isArray(value);
	}

	/**
	 * Validate and normalize PMID format
	 * Supports: pmid:12345678, PMID:12345678, 12345678 (bare numeric)
	 *
	 * @param id - Potential PMID string
	 * @returns Normalized PMID or null if invalid
	 *
	 * @private
	 */
	private validateAndNormalizePMID(id: string): string | null {
		// Remove whitespace
		const cleanId = id.trim();

		// Check for prefixed formats: pmid:12345678 or PMID:12345678
		const prefixMatch = cleanId.match(/^(?:pmid|PMID):(\d+)$/);
		if (prefixMatch) {
			const pmidNumber = prefixMatch[1];
			if (this.isValidPMIDNumber(pmidNumber)) {
				return `pmid:${pmidNumber}`;
			}
			return null;
		}

		// Check for bare numeric format: 12345678
		if (/^\d+$/.test(cleanId)) {
			if (this.isValidPMIDNumber(cleanId)) {
				return `pmid:${cleanId}`;
			}
			return null;
		}

		return null;
	}

	/**
	 * Validate PMID numeric component
	 * PMIDs are typically 1-8 digits, but can theoretically be longer
	 *
	 * @param pmidNumber - Numeric string to validate
	 * @returns True if valid PMID number
	 *
	 * @private
	 */
	private isValidPMIDNumber(pmidNumber: string): boolean {
		// Must be numeric
		if (!/^\d+$/.test(pmidNumber)) {
			return false;
		}

		// Reasonable length constraints (1-10 digits)
		// Most PMIDs are 8 digits, but allowing for future growth
		const length = pmidNumber.length;
		if (length < 1 || length > 10) {
			return false;
		}

		// Must not be all zeros or start with zero (except single zero)
		if (pmidNumber === "0" || (pmidNumber.length > 1 && pmidNumber.startsWith("0"))) {
			return false;
		}

		return true;
	}

	/**
	 * Validate and normalize DOI format
	 * Supports: https://doi.org/10.xxxx/yyyy, doi:10.xxxx/yyyy, 10.xxxx/yyyy (bare DOI)
	 * Also handles crossref.org redirects: https://www.crossref.org/iPage?doi=10.xxxx/yyyy
	 *
	 * @param id - Potential DOI string
	 * @returns Normalized DOI or null if invalid
	 *
	 * @private
	 */
	private validateAndNormalizeDOI(id: string): string | null {
		// Remove whitespace
		const cleanId = id.trim();

		// Check for full DOI URL: https://doi.org/10.xxxx/yyyy
		const doiUrlMatch = cleanId.match(/^https?:\/\/(?:www\.)?doi\.org\/(.+)$/i);
		if (doiUrlMatch) {
			const doiString = doiUrlMatch[1];
			if (this.isValidDOIString(doiString)) {
				return `https://doi.org/${doiString}`;
			}
			return null;
		}

		// Check for crossref.org redirect: https://www.crossref.org/iPage?doi=10.xxxx/yyyy
		const crossrefMatch = cleanId.match(/^https?:\/\/(?:www\.)?crossref\.org\/iPage\?doi=(.+)$/i);
		if (crossrefMatch) {
			const doiString = decodeURIComponent(crossrefMatch[1]);
			if (this.isValidDOIString(doiString)) {
				return `https://doi.org/${doiString}`;
			}
			return null;
		}

		// Check for prefixed format: doi:10.xxxx/yyyy
		const prefixMatch = cleanId.match(/^doi:(.+)$/i);
		if (prefixMatch) {
			const doiString = prefixMatch[1];
			if (this.isValidDOIString(doiString)) {
				return `https://doi.org/${doiString}`;
			}
			return null;
		}

		// Check for bare DOI format: 10.xxxx/yyyy
		if (this.isValidDOIString(cleanId)) {
			return `https://doi.org/${cleanId}`;
		}

		return null;
	}

	/**
	 * Validate DOI string format
	 * DOIs follow the pattern: 10.registrant/suffix
	 *
	 * @param doiString - DOI string without protocol or domain
	 * @returns True if valid DOI format
	 *
	 * @private
	 */
	private isValidDOIString(doiString: string): boolean {
		// DOI must start with "10." followed by registrant code and suffix
		// Pattern: 10.{registrant}/{suffix}
		// Registrant: 4+ digits, Suffix: any characters including special chars
		const doiPattern = /^10\.\d{4,}\/\S+$/;

		if (!doiPattern.test(doiString)) {
			return false;
		}

		// Additional validation: ensure it's not just the minimal pattern
		// DOI must have meaningful content after the slash
		const parts = doiString.split('/');
		if (parts.length < 2 || parts[1].length === 0) {
			return false;
		}

		// Registrant code validation (after "10.")
		const registrantPart = parts[0].substring(3); // Remove "10."
		if (registrantPart.length < 4 || !/^\d+$/.test(registrantPart)) {
			return false;
		}

		return true;
	}

	/**
   * Get a single work by its OpenAlex ID, DOI, PMID, or other identifier
   *
   * @param id - The work ID (OpenAlex ID, DOI, PMID, etc.)
   * @param params - Optional query parameters
   * @returns Promise resolving to the Work entity
   *
   * @example
   * ```typescript
   * // OpenAlex ID
   * const work = await worksApi.getWork('W2741809807');
   *
   * // DOI - Multiple formats supported:
   * const workByDoi1 = await worksApi.getWork('https://doi.org/10.7717/peerj.4375');  // Full URL
   * const workByDoi2 = await worksApi.getWork('http://doi.org/10.7717/peerj.4375');   // HTTP variant
   * const workByDoi3 = await worksApi.getWork('doi:10.7717/peerj.4375');              // DOI prefix
   * const workByDoi4 = await worksApi.getWork('10.7717/peerj.4375');                  // Bare DOI
   *
   * // Crossref redirects also supported:
   * const workByDoi5 = await worksApi.getWork('https://www.crossref.org/iPage?doi=10.7717/peerj.4375');
   *
   * // PMID (PubMed ID) - multiple formats supported
   * const workByPmid1 = await worksApi.getWork('pmid:12345678');     // Lowercase prefix
   * const workByPmid2 = await worksApi.getWork('PMID:12345678');     // Uppercase prefix
   * const workByPmid3 = await worksApi.getWork('12345678');          // Bare numeric format
   * ```
   */
	async getWork(id: string, params: QueryParams = {}): Promise<Work> {
		// Validate and normalize DOI if applicable
		const normalizedDoi = this.validateAndNormalizeDOI(id);
		if (normalizedDoi) {
			return this.client.getById<Work>("works", normalizedDoi, params);
		}

		// Validate and normalize PMID if applicable
		const normalizedPmid = this.validateAndNormalizePMID(id);
		if (normalizedPmid) {
			return this.client.getById<Work>("works", normalizedPmid, params);
		}

		// For other identifiers (OpenAlex ID, etc.), pass through directly
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
			if (typeof params.filter === "string") {
				queryParams.filter = params.filter;
			} else if (this.isWorksFilters(params.filter)) {
				queryParams.filter = buildFilterString(params.filter);
			}
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
			sort: options.sort ?? (query.trim() ? "relevance_score:desc" : "publication_date"),
		};

		if (options.page !== undefined) params.page = options.page;
		if (options.per_page !== undefined) params.per_page = options.per_page;
		if (options.select !== undefined) params.select = options.select;
		if (options.filters) params.filter = buildFilterString(options.filters);

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

		// Check if referenced_works array is empty
		if (work.referenced_works.length === 0) {
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

		const queryParams: WorksQueryParams = {
			filter: buildFilterString(filters),
			per_page: referencesToFetch.length,
		};
		if (options.select !== undefined) {
			queryParams.select = options.select;
		}

		const response = await this.getWorks(queryParams);

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

		// Check if related_works array is empty
		if (work.related_works.length === 0) {
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

		const queryParams: WorksQueryParams = {
			filter: buildFilterString(filters),
			per_page: relatedToFetch.length,
		};
		if (options.select !== undefined) {
			queryParams.select = options.select;
		}

		const response = await this.getWorks(queryParams);

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
			if (typeof params.filter === "string") {
				queryParams.filter = params.filter;
			} else if (this.isWorksFilters(params.filter)) {
				queryParams.filter = buildFilterString(params.filter);
			}
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
   *   logger.debug("api", `Processing batch of ${worksBatch.length} works`);
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
		queryParams.per_page ??= batchSize;

		// Convert filters if provided
		if (params.filter) {
			if (typeof params.filter === "string") {
				queryParams.filter = params.filter;
			} else if (this.isWorksFilters(params.filter)) {
				queryParams.filter = buildFilterString(params.filter);
			}
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
			if (typeof params.filter === "string") {
				queryParams.filter = params.filter;
			} else if (this.isWorksFilters(params.filter)) {
				queryParams.filter = buildFilterString(params.filter);
			}
		}

		return this.client.getAll<Work>("works", queryParams, maxResults);
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
				const newFilterString = buildFilterString(newFilters);
				return `${newFilterString},${existingFilters}`;
			} else {
				// If existing filters are an object, merge them
				Object.assign(mergedFilters, existingFilters, newFilters); // New filters override existing ones
			}
		}

		return buildFilterString(mergedFilters);
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
			if (typeof params.filter === "string") {
				queryParams.filter = params.filter;
			} else if (this.isWorksFilters(params.filter)) {
				queryParams.filter = buildFilterString(params.filter);
			}
		}

		return this.client.getResponse<Work>("works", queryParams);
	}

	/**
   * Get statistical aggregations for works grouped by a specific field
   *
   * @param groupBy - Field to group works by (e.g., 'publication_year', 'authorships.institutions.country_code')
   * @param filters - Optional filters to apply before grouping
   * @returns Promise resolving to grouped statistical results
   *
   * @example
   * ```typescript
   * const yearStats = await worksApi.getStats('publication_year', {
   *   'authorships.author.id': 'A5017898742',
   *   'is_oa': true
   * });
   * ```
   */
	async getStats(
		groupBy: string,
		filters?: WorksFilters
	): Promise<GroupedResponse<Work>> {
		const queryParams: QueryParams = {
			per_page: 0, // Only aggregation data, no individual works
			group_by: groupBy,
		};

		// Convert filters if provided
		if (filters) {
			queryParams.filter = buildFilterString(filters);
		}

		const response = await this.client.getResponse<Work>("works", queryParams);

		// Ensure group_by data exists for typed response
		if (!response.group_by) {
			throw new Error(`No grouping data returned for field: ${groupBy}`);
		}

		return response as GroupedResponse<Work>;
	}

	/**
   * Get works grouped by a specific field with full work data
   *
   * @param field - Field to group works by (e.g., 'publication_year', 'type', 'primary_location.source.id')
   * @param options - Options for filtering, pagination, and field selection
   * @returns Promise resolving to grouped works with metadata
   *
   * @example
   * ```typescript
   * const worksByYear = await worksApi.getWorksGroupedBy('publication_year', {
   *   filters: { 'authorships.author.id': 'A5017898742' },
   *   per_page: 50,
   *   select: ['id', 'display_name', 'publication_year', 'cited_by_count']
   * });
   * ```
   */
	async getWorksGroupedBy(
		field: string,
		options: GroupWorksOptions = {}
	): Promise<GroupedResponse<Work>> {
		const queryParams: QueryParams = {
			group_by: field,
			per_page: options.per_page ?? 25, // Default to showing some works
		};

		// Add optional parameters
		if (options.page !== undefined) queryParams.page = options.page;
		if (options.sort !== undefined) queryParams.sort = options.sort;
		if (options.select !== undefined) queryParams.select = options.select;
		if (options.group_limit !== undefined) queryParams.group_limit = options.group_limit;

		// Convert filters if provided
		if (options.filters) {
			queryParams.filter = buildFilterString(options.filters);
		}

		const response = await this.client.getResponse<Work>("works", queryParams);

		// Ensure group_by data exists for typed response
		if (!response.group_by) {
			throw new Error(`No grouping data returned for field: ${field}`);
		}

		return response as GroupedResponse<Work>;
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
   * Autocomplete works based on a search query
   * Uses the OpenAlex autocomplete endpoint for fast, typeahead-style search results
   *
   * @param query - Search query string (minimum 1 character)
   * @param options - Optional autocomplete parameters
   * @returns Promise resolving to array of autocomplete results
   *
   * @example
   * ```typescript
   * const suggestions = await worksApi.autocomplete('machine learning', {
   *   per_page: 20
   * });
   * ```
   */
	async autocomplete(
		query: string,
		options: AutocompleteOptions = {}
	): Promise<AutocompleteResult[]> {
		// Validate query parameter
		if (typeof query !== "string") {
			throw new Error("Query must be a string");
		}

		const trimmedQuery = query.trim();
		if (trimmedQuery.length === 0) {
			return [];
		}

		try {
			// Build query parameters
			const queryParams: QueryParams & { q: string } = {
				q: trimmedQuery,
			};

			// Add optional parameters
			if (options.per_page !== undefined) {
				if (options.per_page < 1 || options.per_page > 50) {
					throw new Error("per_page must be between 1 and 50");
				}
				queryParams.per_page = options.per_page;
			}

			// Add additional filters if provided
			if (options.filters) {
				Object.assign(queryParams, options.filters);
			}

			// Make request to OpenAlex autocomplete endpoint
			const response = await this.client.getResponse<AutocompleteResult>(
				"autocomplete/works",
				queryParams
			);

			// Map results to ensure consistent entity_type
			return response.results.map(result => ({
				...result,
				entity_type: "work" as const,
			}));
		} catch (error: unknown) {
			// Enhanced error handling
			if (error instanceof Error) {
				throw new Error(`Works autocomplete failed: ${error.message}`);
			}
			throw new Error("Works autocomplete failed with unknown error");
		}
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
	// defaultClient is always defined from the import
	return new WorksApi(defaultClient);
}