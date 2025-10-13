/**
 * OpenAlex Sources API Entity Methods
 * Provides comprehensive methods for interacting with journal/conference sources
 *
 * ## ISSN Support
 *
 * This API provides comprehensive ISSN (International Standard Serial Number) support
 * with format validation, normalization, and checksum verification.
 *
 * ### Supported ISSN Formats:
 *
 * 1. **Standard Format**: `1234-5678`
 *    - The canonical 8-digit format with hyphen separator
 *    - Example: `0028-0836` (Nature)
 *
 * 2. **With Prefixes**: `ISSN 1234-5678`, `ISSN: 1234-5678`
 *    - Common prefixes used in citations and databases
 *    - Case insensitive: `issn 1234-5678`
 *    - Examples: `ISSN 0028-0836`, `ISSN: 2041-1723`
 *
 * 3. **Scheme Notation**: `issn:1234-5678`, `eissn:1234-5678`
 *    - URI-style scheme notation
 *    - Supports both print (issn:) and electronic (eissn:) variants
 *    - Examples: `issn:0028-0836`, `eissn:1476-4687`
 *
 * 4. **Bare Format**: `12345678`
 *    - 8-digit format without hyphen (automatically normalized)
 *    - Example: `00280836` → normalized to `0028-0836`
 *
 * 5. **Check Digit Variants**: `1234-567X`, `1234567X`
 *    - Handles X check digit (case insensitive)
 *    - Examples: `2041-172X`, `2041172x`
 *
 * ### ISSN Validation Features:
 *
 * - **Format Validation**: Ensures 8-digit structure with valid characters
 * - **Normalization**: Converts all formats to standard `1234-5678` format
 * - **Checksum Validation**: Optional verification of ISSN check digit
 * - **Case Handling**: Normalizes X check digit to uppercase
 * - **Error Handling**: Descriptive errors for invalid formats
 *
 * ### Integration Points:
 *
 * - `getSource()`: Auto-detects ISSN identifiers and resolves to sources
 * - `getSourcesByISSN()`: Direct ISSN search with format support
 * - Both methods support all ISSN format variations seamlessly
 *
 * @example ISSN Usage Examples
 * ```typescript
 * // Standard ISSN lookup
 * const nature = await sourcesApi.getSource('0028-0836');
 *
 * // Various format support
 * const sources = await sourcesApi.getSourcesByISSN('ISSN 1476-4687');
 * const eISSN = await sourcesApi.getSourcesByISSN('eissn:2041-1723');
 * const bare = await sourcesApi.getSourcesByISSN('00280836');
 *
 * // With checksum validation
 * const validated = await sourcesApi.getSourcesByISSN('2041-172X', {}, {
 *   validateChecksum: true
 * });
 *
 * // Error handling
 * try {
 *   await sourcesApi.getSource('invalid-issn');
 * } catch (error) {
 *   console.log(error.message); // "Invalid ISSN format: invalid-issn"
 * }
 * ```
 */

import type {
  Source,
  SourcesFilters,
  QueryParams,
  OpenAlexResponse,
  Work,
  AutocompleteResult,
} from "../types";
import { OpenAlexBaseClient } from "../client";
import { buildFilterString } from "../utils/query-builder";
import { logger } from "../internal/logger";

/**
 * Options for searching sources
 */
export interface SearchSourcesOptions {
  filters?: SourcesFilters;
  sort?:
    | "relevance_score:desc"
    | "cited_by_count"
    | "works_count"
    | "created_date";
  page?: number;
  per_page?: number;
  select?: string[];
}

export class SourcesApi {
  private readonly DEFAULT_SORT = "works_count:desc";
  private readonly WORKS_COUNT_DESC = this.DEFAULT_SORT;

  constructor(private client: OpenAlexBaseClient) {}

  /**
   * Type guard to check if value is SourcesFilters
   */
  private isSourcesFilters(value: unknown): value is SourcesFilters {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  /**
   * ISSN Validation and Normalization Utilities
   *
   * These private methods provide comprehensive ISSN handling capabilities:
   * - Format detection and validation
   * - Normalization to standard format
   * - Checksum verification (optional)
   * - Error handling and logging
   *
   * All methods follow the ISSN standard (ISO 3297) for validation.
   */

  /**
   * Validates if a string matches a valid ISSN format
   * Supports formats: 1234-5678, ISSN 1234-5678, issn:1234-5678, 12345678
   * @param issn - The ISSN string to validate
   * @returns True if the format is valid (before checksum validation)
   */
  private isValidISSNFormat(issn: string): boolean {
    if (!issn || typeof issn !== "string") {
      return false;
    }

    // Remove common prefixes and normalize - handle various prefix formats
    const normalized = issn
      .trim()
      .toLowerCase()
      .replace(/^(issn[:\s]*|eissn[:\s]*)/i, "")
      .trim();

    // Check for standard ISSN format (with hyphen) or bare 8-digit format
    const standardFormat = /^\d{4}-\d{3}[\dxX]$/.test(normalized);
    const bareFormat = /^\d{7}[\dxX]$/.test(normalized);

    return standardFormat || bareFormat;
  }

  /**
   * Normalizes ISSN to standard format (1234-5678)
   * @param issn - The ISSN string to normalize
   * @returns Normalized ISSN or null if invalid format
   */
  private normalizeISSN(issn: string): string | null {
    if (!this.isValidISSNFormat(issn)) {
      return null;
    }

    // Remove prefixes and normalize case - handle various prefix formats
    const cleaned = issn
      .trim()
      .toLowerCase()
      .replace(/^(issn[:\s]*|eissn[:\s]*)/i, "")
      .trim()
      .replace(/[^\d\-x]/gi, "")
      .toUpperCase();

    // Add hyphen if missing (bare 8-digit format)
    if (/^\d{7}[\dX]$/.test(cleaned)) {
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    }

    // Already in standard format
    if (/^\d{4}-\d{3}[\dX]$/.test(cleaned)) {
      return cleaned;
    }

    return null;
  }

  /**
   * Validates ISSN checksum digit
   * @param issn - Normalized ISSN (1234-5678 format)
   * @returns True if checksum is valid
   */
  private validateISSNChecksum(issn: string): boolean {
    const normalized = this.normalizeISSN(issn);
    if (!normalized) {
      return false;
    }

    // Remove hyphen for calculation
    const digits = normalized.replace("-", "");

    // Calculate checksum for first 7 digits
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      sum += parseInt(digits[i]) * (8 - i);
    }

    const remainder = sum % 11;
    const expectedCheckDigit =
      remainder === 0
        ? "0"
        : remainder === 1
          ? "X"
          : (11 - remainder).toString();

    const actualCheckDigit = digits[7];
    return actualCheckDigit === expectedCheckDigit;
  }

  /**
   * Detects if a string is a potential ISSN identifier
   * @param id - The identifier to check
   * @returns True if it looks like an ISSN
   */
  private isISSNIdentifier(id: string): boolean {
    if (!id || typeof id !== "string") {
      return false;
    }

    // Check for explicit ISSN prefixes
    if (/^(issn[:\s]*|eissn[:\s]*)/i.test(id.trim())) {
      return true;
    }

    // Check for ISSN format patterns (but exclude OpenAlex IDs)
    if (id.startsWith("S") && /^S\d+$/.test(id)) {
      return false; // OpenAlex source ID
    }

    return this.isValidISSNFormat(id);
  }

  /**
   * Validates and normalizes an ISSN with full validation
   * @param issn - The ISSN to validate
   * @param options - Validation options
   * @returns Normalized ISSN if valid, null otherwise
   */
  private validateAndNormalizeISSN(
    issn: string,
    options: { validateChecksum?: boolean } = {},
  ): string | null {
    const normalized = this.normalizeISSN(issn);
    if (!normalized) {
      logger.warn("issn", `Invalid ISSN format: ${issn}`);
      return null;
    }

    // Optionally validate checksum
    if (options.validateChecksum && !this.validateISSNChecksum(normalized)) {
      logger.warn(
        "issn",
        `Invalid ISSN checksum: ${issn} (normalized: ${normalized})`,
      );
      return null;
    }

    return normalized;
  }

  /**
   * Get a single source/journal by ID or ISSN
   * @param id - The OpenAlex source ID (e.g., 'S123456789'), URL, or ISSN identifier
   * @param params - Additional query parameters (select fields, etc.)
   * @returns Promise resolving to the source data
   *
   * @example
   * ```typescript
   * // Get by OpenAlex ID
   * const source = await sourcesApi.getSource('S4306400886');
   * logger.debug("api", source.display_name); // "Nature"
   *
   * // Get by ISSN (various formats supported)
   * const sourceByISSN = await sourcesApi.getSource('0028-0836');
   * const sourceByISSNPrefix = await sourcesApi.getSource('ISSN 0028-0836');
   * const sourceByISSNColon = await sourcesApi.getSource('issn:0028-0836');
   * const sourceByBareISSN = await sourcesApi.getSource('00280836');
   * ```
   */
  async getSource(id: string, params: QueryParams = {}): Promise<Source> {
    // Check if the ID is an ISSN identifier
    if (this.isISSNIdentifier(id)) {
      // Try to get source by ISSN
      const normalizedISSN = this.validateAndNormalizeISSN(id, {
        validateChecksum: false,
      });
      if (normalizedISSN) {
        logger.debug("issn", `Resolving ISSN ${id} as ${normalizedISSN}`);

        // Search for source by ISSN
        const response = await this.getSourcesByISSN(normalizedISSN, {
          ...params,
          per_page: 1,
        });

        if (response.results.length > 0) {
          return response.results[0];
        } else {
          throw new Error(`No source found for ISSN: ${normalizedISSN}`);
        }
      } else {
        throw new Error(`Invalid ISSN format: ${id}`);
      }
    }

    // Use standard ID-based lookup for OpenAlex IDs and URLs
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
  async getSources(
    params: Omit<QueryParams, "filter"> & { filter?: SourcesFilters } = {},
  ): Promise<OpenAlexResponse<Source>> {
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
    options: SearchSourcesOptions = {},
  ): Promise<OpenAlexResponse<Source>> {
    const params: QueryParams = {
      search: query,
      sort:
        options.sort ?? (query.trim() ? "relevance_score:desc" : "works_count"),
    };

    if (options.page !== undefined) params.page = options.page;
    if (options.per_page !== undefined) params.per_page = options.per_page;
    if (options.select !== undefined) params.select = options.select;
    if (options.filters) params.filter = buildFilterString(options.filters);

    return this.client.getResponse<Source>("sources", params);
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

      const response = await this.client.getResponse<AutocompleteResult>(
        endpoint,
        queryParams,
      );

      return response.results.map((result) => ({
        ...result,
        entity_type: "source",
      }));
    } catch (error: unknown) {
      // Log error but return empty array for graceful degradation
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.warn(`Autocomplete failed for query "${query}": ${errorMessage}`, {
        query,
        error,
      });
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
    params: QueryParams = {},
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
  async getOpenAccessSources(
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Source>> {
    const filters: SourcesFilters = {
      is_oa: true,
    };

    const { filter: _, ...paramsWithoutFilter } = params;
    const queryParams = this.buildFilterParams({
      ...paramsWithoutFilter,
      filter: filters,
      sort: params.sort ?? this.WORKS_COUNT_DESC,
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
    params: Omit<QueryParams, "filter"> & { filter?: SourcesFilters } = {},
  ): Promise<OpenAlexResponse<Source>> {
    const filters: SourcesFilters = {
      ...params.filter,
      country_code: countryCode,
    };

    const { filter: _, ...paramsWithoutFilter } = params;
    const queryParams = this.buildFilterParams({
      ...paramsWithoutFilter,
      filter: filters,
      sort: params.sort ?? this.WORKS_COUNT_DESC,
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
    params: QueryParams = {},
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
  async getSourceStats(
    sourceId: string,
    params: QueryParams = {},
  ): Promise<Source> {
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
    seed?: number,
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
  async getDOAJSources(
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Source>> {
    const filters: SourcesFilters = {
      is_in_doaj: true,
    };

    return this.getSources({
      ...params,
      filter: filters,
      sort: params.sort ?? this.WORKS_COUNT_DESC,
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
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Source>> {
    const filters: SourcesFilters = {
      type,
    };

    return this.getSources({
      ...params,
      filter: filters,
      sort: params.sort ?? this.WORKS_COUNT_DESC,
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
    params: QueryParams = {},
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
      sort: params.sort ?? this.WORKS_COUNT_DESC,
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
    filters: SourcesFilters = {},
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
    batchSize = 200,
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
   * Get sources by ISSN identifier with comprehensive format support
   * @param issn - ISSN identifier supporting multiple formats:
   *   - Standard: '1234-5678'
   *   - With prefix: 'ISSN 1234-5678', 'ISSN: 1234-5678'
   *   - With scheme: 'issn:1234-5678', 'eissn:1234-5678'
   *   - Bare format: '12345678'
   *   - Case insensitive: 'issn 1234-567x' (X check digit)
   * @param params - Additional query parameters
   * @param options - ISSN validation options
   * @returns Promise resolving to sources matching the ISSN
   *
   * @example
   * ```typescript
   * // Standard format
   * const sources1 = await sourcesApi.getSourcesByISSN('0028-0836');
   *
   * // With ISSN prefix
   * const sources2 = await sourcesApi.getSourcesByISSN('ISSN 0028-0836');
   *
   * // With colon notation
   * const sources3 = await sourcesApi.getSourcesByISSN('issn:0028-0836');
   *
   * // Bare 8-digit format
   * const sources4 = await sourcesApi.getSourcesByISSN('00280836');
   *
   * // Electronic ISSN format
   * const sources5 = await sourcesApi.getSourcesByISSN('eissn:1476-4687');
   *
   * // With checksum validation
   * const sources6 = await sourcesApi.getSourcesByISSN('0028-0836', {}, { validateChecksum: true });
   *
   * // Case insensitive with X check digit
   * const sources7 = await sourcesApi.getSourcesByISSN('issn 2041-172x');
   * ```
   */
  async getSourcesByISSN(
    issn: string,
    params: QueryParams = {},
    options: { validateChecksum?: boolean } = {},
  ): Promise<OpenAlexResponse<Source>> {
    // Validate and normalize the ISSN
    const normalizedISSN = this.validateAndNormalizeISSN(issn, options);
    if (!normalizedISSN) {
      throw new Error(`Invalid ISSN format: ${issn}`);
    }

    logger.debug(
      "issn",
      `Searching for sources with ISSN: ${normalizedISSN} (from input: ${issn})`,
    );

    const filters: SourcesFilters = {
      "ids.issn": normalizedISSN,
    };

    return this.getSources({
      ...params,
      filter: filters,
    });
  }

  /**
   * Validate ISSN format and optionally verify checksum
   * @param issn - ISSN to validate
   * @param options - Validation options
   * @returns Validation result with normalized ISSN if valid
   *
   * @example
   * ```typescript
   * // Basic format validation
   * const result1 = await sourcesApi.validateISSN('0028-0836');
   * logger.debug("api", result1); // { isValid: true, normalized: '0028-0836', format: 'standard' }
   *
   * // With checksum validation
   * const result2 = await sourcesApi.validateISSN('ISSN 2041-172X', { validateChecksum: true });
   * logger.debug("api", result2); // { isValid: true, normalized: '2041-172X', format: 'with_prefix', checksumValid: true }
   *
   * // Invalid format
   * const result3 = await sourcesApi.validateISSN('invalid');
   * logger.debug("api", result3); // { isValid: false, error: 'Invalid ISSN format' }
   * ```
   */
  validateISSN(
    issn: string,
    options: { validateChecksum?: boolean } = {},
  ): {
    isValid: boolean;
    normalized?: string;
    format?:
      | "standard"
      | "with_prefix"
      | "scheme_notation"
      | "bare"
      | "unknown";
    checksumValid?: boolean;
    error?: string;
  } {
    if (!issn || typeof issn !== "string") {
      return { isValid: false, error: "ISSN must be a non-empty string" };
    }

    const trimmed = issn.trim();

    // Determine format type
    let format:
      | "standard"
      | "with_prefix"
      | "scheme_notation"
      | "bare"
      | "unknown" = "unknown";
    if (/^\d{4}-\d{3}[\dxX]$/.test(trimmed)) {
      format = "standard";
    } else if (/^(ISSN|EISSN)[:\s]/i.test(trimmed)) {
      format = /:/i.test(trimmed) ? "scheme_notation" : "with_prefix";
    } else if (/^\d{7}[\dxX]$/.test(trimmed)) {
      format = "bare";
    }

    // Validate and normalize
    const normalized = this.validateAndNormalizeISSN(issn, {
      validateChecksum: false,
    });
    if (!normalized) {
      return { isValid: false, error: "Invalid ISSN format" };
    }

    const result = {
      isValid: true,
      normalized,
      format,
    };

    // Optional checksum validation
    if (options.validateChecksum) {
      return {
        ...result,
        checksumValid: this.validateISSNChecksum(normalized),
      };
    }

    return result;
  }

  /**
   * Get sources for multiple ISSNs in a single request
   * @param issns - Array of ISSN identifiers (any supported format)
   * @param params - Additional query parameters
   * @param options - ISSN validation options
   * @returns Promise resolving to sources matching any of the ISSNs
   *
   * @example
   * ```typescript
   * // Multiple ISSN lookup with different formats
   * const sources = await sourcesApi.getSourcesByMultipleISSNs([
   *   '0028-0836',           // Nature
   *   'ISSN 2041-1723',      // Nature Communications
   *   'eissn:1476-4687',     // Nature Biotechnology
   *   '2045212X'             // Scientific Reports (bare format)
   * ]);
   *
   * logger.debug("api", `Found ${sources.results.length} sources`);
   *
   * // With validation options
   * const validatedSources = await sourcesApi.getSourcesByMultipleISSNs([
   *   '0028-0836',
   *   '2041-172X'
   * ], {}, { validateChecksum: true });
   * ```
   */
  async getSourcesByMultipleISSNs(
    issns: string[],
    params: QueryParams = {},
    options: { validateChecksum?: boolean } = {},
  ): Promise<OpenAlexResponse<Source>> {
    if (!Array.isArray(issns) || issns.length === 0) {
      throw new Error("ISSN array must be non-empty");
    }

    // Validate and normalize all ISSNs
    const normalizedISSNs: string[] = [];
    const invalidISSNs: string[] = [];

    for (const issn of issns) {
      const normalized = this.validateAndNormalizeISSN(issn, options);
      if (normalized) {
        normalizedISSNs.push(normalized);
      } else {
        invalidISSNs.push(issn);
      }
    }

    if (invalidISSNs.length > 0) {
      logger.warn("issn", `Invalid ISSNs found: ${invalidISSNs.join(", ")}`);
    }

    if (normalizedISSNs.length === 0) {
      throw new Error(`No valid ISSNs found in: ${issns.join(", ")}`);
    }

    logger.debug(
      "issn",
      `Searching for sources with ISSNs: ${normalizedISSNs.join(", ")}`,
    );

    // Use OR filter for multiple ISSNs - pass as array for proper handling
    const filters: SourcesFilters = {
      "ids.issn": normalizedISSNs,
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
  private buildFilterParams(
    params: Omit<QueryParams, "filter"> & { filter?: SourcesFilters },
  ): QueryParams {
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
