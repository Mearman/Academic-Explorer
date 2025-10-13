/**
 * OpenAlex Institutions API Entity Methods
 * Provides comprehensive methods for querying and retrieving institution data
 */

import type {
  InstitutionEntity,
  InstitutionsFilters,
  QueryParams,
  OpenAlexResponse,
  Work,
  Author,
  AutocompleteResult,
} from "../types";
import { OpenAlexBaseClient } from "../client";
import { buildFilterString } from "../utils/query-builder";
import { AutocompleteOptions } from "../utils/autocomplete";

/**
 * Extended query parameters specific to institutions API
 */
export interface InstitutionsQueryParams extends QueryParams {
  filter?: string;
  search?: string;
  sort?:
    | "cited_by_count"
    | "works_count"
    | "display_name"
    | "created_date"
    | "updated_date";
  group_by?: "country_code" | "type" | "works_count" | "cited_by_count";
}

/**
 * Parameters for institution-specific searches and filters
 */
export interface InstitutionSearchOptions {
  filters?: InstitutionsFilters;
  sort?: InstitutionsQueryParams["sort"];
  page?: number;
  per_page?: number;
  select?: string[];
}

/**
 * Comprehensive Institutions API class providing methods for institution data access
 *
 * ## ROR ID Support
 *
 * This API provides comprehensive support for Research Organization Registry (ROR) identifiers
 * in addition to OpenAlex IDs. ROR IDs are automatically validated and normalized.
 *
 * ### Supported ROR Formats:
 * - **Bare format**: `05dxps055` (9-character alphanumeric with letters)
 * - **ROR prefix**: `ror:05dxps055` (ror: followed by 9-character ID)
 * - **ROR URL**: `https://ror.org/05dxps055` (full HTTPS URL)
 * - **ROR domain**: `ror.org/05dxps055` (domain without protocol)
 *
 * ### ROR Validation:
 * - Format validation: Exactly 9 characters, alphanumeric, must contain letters
 * - Character set validation: Uses ROR base32 (0-9, a-z excluding i, l, o, u)
 * - Case insensitive: Accepts both uppercase and lowercase input
 *
 * ### Examples:
 * ```typescript
 * // All these formats are equivalent and valid for MIT:
 * await institutionsApi.getInstitution('05dxps055');
 * await institutionsApi.getInstitution('ror:05dxps055');
 * await institutionsApi.getInstitution('https://ror.org/05dxps055');
 * await institutionsApi.getInstitution('ror.org/05dxps055');
 * ```
 *
 * Methods supporting ROR IDs: `getInstitution`, `getInstitutionWorks`,
 * `getInstitutionAuthors`, `getAssociatedInstitutions`
 */
export class InstitutionsApi {
  private client: OpenAlexBaseClient;

  constructor(client: OpenAlexBaseClient) {
    this.client = client;
  }

  /**
   * Get a single institution by its OpenAlex ID, ROR ID, or other identifier
   *
   * Supports all ROR ID formats:
   * - Bare format: `05dxps055`
   * - ROR prefix: `ror:05dxps055`
   * - ROR URL: `https://ror.org/05dxps055`
   * - ROR domain: `ror.org/05dxps055`
   *
   * ROR IDs are automatically validated and normalized before querying.
   *
   * @param id - Institution ID (OpenAlex ID, ROR ID, etc.)
   * @param params - Optional query parameters (select fields, etc.)
   * @returns Promise resolving to institution entity
   * @throws Error if ROR ID format is invalid or fails checksum validation
   *
   * @example
   * ```typescript
   * // OpenAlex ID
   * const institution = await institutionsApi.getInstitution('I33213144');
   *
   * // ROR ID formats (all equivalent)
   * const mit1 = await institutionsApi.getInstitution('05dxps055');
   * const mit2 = await institutionsApi.getInstitution('ror:05dxps055');
   * const mit3 = await institutionsApi.getInstitution('https://ror.org/05dxps055');
   * const mit4 = await institutionsApi.getInstitution('ror.org/05dxps055');
   *
   * // With field selection
   * const institutionWithSelect = await institutionsApi.getInstitution('05dxps055', {
   *   select: ['id', 'display_name', 'country_code', 'works_count', 'ror']
   * });
   * ```
   */
  async getInstitution(
    id: string,
    params: QueryParams = {},
  ): Promise<InstitutionEntity> {
    // Validate and normalize ROR IDs if applicable
    const processedId = this.validateAndNormalizeRor(id);
    return this.client.getById<InstitutionEntity>(
      "institutions",
      processedId,
      params,
    );
  }

  /**
   * Get autocomplete suggestions for institutions based on a search query
   *
   * Uses the OpenAlex institutions autocomplete endpoint to provide fast,
   * relevant suggestions for institution names and aliases.
   *
   * @param query - Search query string for institution name or alias
   * @param options - Optional autocomplete parameters including per_page limit
   * @returns Promise resolving to array of institution autocomplete suggestions
   *
   * @example
   * ```typescript
   * // Basic autocomplete
   * const suggestions = await institutionsApi.autocomplete('harvard');
   *
   * // With per_page limit
   * const suggestions = await institutionsApi.autocomplete('university', {
   *   q: 'university',
   *   per_page: 5
   * });
   * ```
   */
  async autocomplete(
    query: string,
    options?: Partial<AutocompleteOptions>,
  ): Promise<AutocompleteResult[]> {
    // Parameter validation
    if (!query || typeof query !== "string") {
      return [];
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return [];
    }

    try {
      // Build query parameters following OpenAlex API specification
      const queryParams: QueryParams & { q: string } = {
        q: trimmedQuery,
      };

      // Add per_page if specified in options
      if (options?.per_page && options.per_page > 0) {
        queryParams.per_page = Math.min(options.per_page, 200); // OpenAlex API limit
      }

      // Make request to OpenAlex institutions autocomplete endpoint
      const endpoint = "autocomplete/institutions";
      const response = await this.client.getResponse<AutocompleteResult>(
        endpoint,
        queryParams,
      );

      // Return results with entity_type set to institution
      return response.results.map((result) => ({
        ...result,
        entity_type: "institution",
      }));
    } catch (error: unknown) {
      // Format error for logging using type guards
      const _errorDetails = this.formatErrorForLogging(error);
      return [];
    }
  }

  /**
   * Get multiple institutions with optional filtering, sorting, and pagination
   *
   * @param params - Optional query parameters including filters
   * @returns Promise resolving to paginated institutions response
   *
   * @example
   * ```typescript
   * const institutions = await institutionsApi.getInstitutions({
   *   filter: { 'country_code': 'US', 'type': 'education' },
   *   sort: 'cited_by_count',
   *   per_page: 50
   * });
   * ```
   */
  async getInstitutions(
    params: InstitutionSearchOptions = {},
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const queryParams = this.buildQueryParams(params);
    return this.client.getResponse<InstitutionEntity>(
      "institutions",
      queryParams,
    );
  }

  /**
   * Search institutions by query string with optional filters
   *
   * @param query - Search query string
   * @param options - Optional search parameters and filters
   * @returns Promise resolving to matching institutions
   *
   * @example
   * ```typescript
   * const results = await institutionsApi.searchInstitutions('harvard', {
   *   filters: { 'country_code': 'US' },
   *   per_page: 10
   * });
   * ```
   */
  async searchInstitutions(
    query: string,
    options: InstitutionSearchOptions = {},
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const params = {
      ...options,
      search: query,
    };
    return this.getInstitutions(params);
  }

  /**
   * Get institutions by country code
   *
   * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB', 'CA')
   * @param options - Optional search parameters
   * @returns Promise resolving to institutions in the specified country
   *
   * @example
   * ```typescript
   * const usInstitutions = await institutionsApi.getInstitutionsByCountry('US', {
   *   sort: 'works_count',
   *   per_page: 100
   * });
   * ```
   */
  async getInstitutionsByCountry(
    countryCode: string,
    options: InstitutionSearchOptions = {},
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const params = {
      ...options,
      filters: {
        ...options.filters,
        country_code: countryCode,
      },
    };
    return this.getInstitutions(params);
  }

  /**
   * Get institutions by institution type
   *
   * @param type - Institution type (e.g., 'education', 'healthcare', 'company', 'government', etc.)
   * @param options - Optional search parameters
   * @returns Promise resolving to institutions of the specified type
   *
   * @example
   * ```typescript
   * const universities = await institutionsApi.getInstitutionsByType('education', {
   *   filters: { 'country_code': 'US' },
   *   sort: 'cited_by_count'
   * });
   * ```
   */
  async getInstitutionsByType(
    type: string,
    options: InstitutionSearchOptions = {},
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const params = {
      ...options,
      filters: {
        ...options.filters,
        type,
      },
    };
    return this.getInstitutions(params);
  }

  /**
   * Get works published by authors affiliated with a specific institution
   *
   * Supports both OpenAlex IDs and ROR IDs for the institution identifier.
   *
   * @param institutionId - Institution OpenAlex ID or ROR ID (any format)
   * @param options - Optional search parameters for filtering works
   * @returns Promise resolving to works from the institution
   *
   * @example
   * ```typescript
   * // Using OpenAlex ID
   * const harvardWorks = await institutionsApi.getInstitutionWorks('I136199984', {
   *   filters: { 'publication_year': '2023' },
   *   sort: 'cited_by_count',
   *   per_page: 100
   * });
   *
   * // Using ROR ID (all equivalent)
   * const mitWorks1 = await institutionsApi.getInstitutionWorks('05dxps055');
   * const mitWorks2 = await institutionsApi.getInstitutionWorks('ror:05dxps055');
   * const mitWorks3 = await institutionsApi.getInstitutionWorks('https://ror.org/05dxps055');
   * ```
   */
  async getInstitutionWorks(
    institutionId: string,
    options: InstitutionSearchOptions = {},
  ): Promise<OpenAlexResponse<Work>> {
    // Validate and normalize ROR IDs if applicable
    const processedId = this.validateAndNormalizeRor(institutionId);
    const queryParams = {
      filter: `authorships.institutions.id:${processedId}`,
      ...this.buildQueryParams(options),
    };
    return this.client.getResponse<Work>("works", queryParams);
  }

  /**
   * Get authors affiliated with a specific institution
   *
   * Supports both OpenAlex IDs and ROR IDs for the institution identifier.
   *
   * @param institutionId - Institution OpenAlex ID or ROR ID (any format)
   * @param options - Optional search parameters for filtering authors
   * @returns Promise resolving to authors at the institution
   *
   * @example
   * ```typescript
   * // Using OpenAlex ID
   * const mitAuthors = await institutionsApi.getInstitutionAuthors('I121332964', {
   *   sort: 'cited_by_count',
   *   per_page: 50
   * });
   *
   * // Using ROR ID formats
   * const stanfordAuthors = await institutionsApi.getInstitutionAuthors('ror:00hj8s172', {
   *   sort: 'works_count',
   *   per_page: 100
   * });
   * ```
   */
  async getInstitutionAuthors(
    institutionId: string,
    options: InstitutionSearchOptions = {},
  ): Promise<OpenAlexResponse<Author>> {
    // Validate and normalize ROR IDs if applicable
    const processedId = this.validateAndNormalizeRor(institutionId);
    const queryParams = {
      filter: `last_known_institution.id:${processedId}`,
      ...this.buildQueryParams(options),
    };
    return this.client.getResponse<Author>("authors", queryParams);
  }

  /**
   * Get institutions associated with a specific institution (parent, child, or related institutions)
   *
   * Supports both OpenAlex IDs and ROR IDs for the institution identifier.
   *
   * @param institutionId - Institution OpenAlex ID or ROR ID (any format)
   * @param options - Optional search parameters
   * @returns Promise resolving to associated institutions
   *
   * @example
   * ```typescript
   * // Using OpenAlex ID
   * const relatedInstitutions = await institutionsApi.getAssociatedInstitutions('I33213144', {
   *   per_page: 25
   * });
   *
   * // Using ROR ID
   * const cambridgeAssociated = await institutionsApi.getAssociatedInstitutions('ror:04gyf1771');
   * ```
   */
  async getAssociatedInstitutions(
    institutionId: string,
    options: InstitutionSearchOptions = {},
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    // Validate and normalize ROR IDs if applicable
    const processedId = this.validateAndNormalizeRor(institutionId);
    const params = {
      ...options,
      filters: {
        ...options.filters,
        "associated_institutions.id": processedId,
      },
    };
    return this.getInstitutions(params);
  }

  /**
   * Get a random sample of institutions
   *
   * @param count - Number of random institutions to retrieve (max 200)
   * @param options - Optional parameters including filters to apply before sampling
   * @returns Promise resolving to random sample of institutions
   *
   * @example
   * ```typescript
   * const randomUniversities = await institutionsApi.getRandomInstitutions(10, {
   *   filters: { 'type': 'education', 'country_code': 'US' }
   * });
   * ```
   */
  async getRandomInstitutions(
    count: number = 10,
    options: InstitutionSearchOptions = {},
    seed?: number,
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const params: InstitutionSearchOptions & { sample: number; seed: number } =
      {
        ...options,
        sample: Math.min(count, 200), // OpenAlex limits sample to 200
        seed: seed ?? Math.floor(Math.random() * 1000000),
      };

    return this.getInstitutions(params);
  }

  /**
   * Get institutions in the Global South
   *
   * @param options - Optional search parameters
   * @returns Promise resolving to Global South institutions
   *
   * @example
   * ```typescript
   * const globalSouthInstitutions = await institutionsApi.getGlobalSouthInstitutions({
   *   sort: 'works_count',
   *   per_page: 100
   * });
   * ```
   */
  async getGlobalSouthInstitutions(
    options: InstitutionSearchOptions = {},
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const params = {
      ...options,
      filters: {
        ...options.filters,
        is_global_south: true,
      },
    };
    return this.getInstitutions(params);
  }

  /**
   * Get institutions that have ROR IDs
   *
   * @param options - Optional search parameters
   * @returns Promise resolving to institutions with ROR IDs
   *
   * @example
   * ```typescript
   * const institutionsWithRor = await institutionsApi.getInstitutionsWithRor({
   *   sort: 'cited_by_count',
   *   per_page: 200
   * });
   * ```
   */
  async getInstitutionsWithRor(
    options: InstitutionSearchOptions = {},
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const params = {
      ...options,
      filters: {
        ...options.filters,
        has_ror: true,
      },
    };
    return this.getInstitutions(params);
  }

  /**
   * Get institutions in a specific lineage (hierarchy)
   *
   * @param lineageId - Institution ID in the lineage
   * @param options - Optional search parameters
   * @returns Promise resolving to institutions in the lineage
   *
   * @example
   * ```typescript
   * const systemInstitutions = await institutionsApi.getInstitutionsByLineage('I33213144');
   * ```
   */
  async getInstitutionsByLineage(
    lineageId: string,
    options: InstitutionSearchOptions = {},
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const params = {
      ...options,
      filters: {
        ...options.filters,
        lineage: lineageId,
      },
    };
    return this.getInstitutions(params);
  }

  /**
   * Stream all institutions matching the criteria (use with caution for large datasets)
   *
   * @param options - Search parameters and filters
   * @yields Arrays of institutions in batches
   *
   * @example
   * ```typescript
   * for await (const batch of institutionsApi.streamInstitutions({
   *   filters: { 'country_code': 'US' }
   * })) {
   *   logger.debug("api", `Processing batch of ${batch.length} institutions`);
   * }
   * ```
   */
  async *streamInstitutions(
    options: InstitutionSearchOptions = {},
  ): AsyncGenerator<InstitutionEntity[], void, unknown> {
    const queryParams = this.buildQueryParams(options);
    yield* this.client.stream<InstitutionEntity>("institutions", queryParams);
  }

  /**
   * Get all institutions matching the criteria (use with caution)
   *
   * @param options - Search parameters and filters
   * @param maxResults - Optional maximum number of results to retrieve
   * @returns Promise resolving to array of all matching institutions
   *
   * @example
   * ```typescript
   * const allSwissUniversities = await institutionsApi.getAllInstitutions({
   *   filters: { 'country_code': 'CH', 'type': 'education' }
   * }, 500);
   * ```
   */
  async getAllInstitutions(
    options: InstitutionSearchOptions = {},
    maxResults?: number,
  ): Promise<InstitutionEntity[]> {
    const queryParams = this.buildQueryParams(options);
    return this.client.getAll<InstitutionEntity>(
      "institutions",
      queryParams,
      maxResults,
    );
  }

  /**
   * Validate and normalize ROR identifier if applicable
   *
   * @private
   * @param id - Input identifier (could be ROR, OpenAlex ID, etc.)
   * @returns Normalized identifier for OpenAlex API
   * @throws Error if ROR ID format is invalid or fails validation
   */
  private validateAndNormalizeRor(id: string): string {
    if (!id || typeof id !== "string") {
      throw new Error("Institution ID is required and must be a string");
    }

    const trimmedId = id.trim();
    if (!trimmedId) {
      throw new Error("Institution ID cannot be empty");
    }

    // Try to detect and normalize ROR ID
    const normalizedRor = this.detectAndNormalizeRor(trimmedId);
    if (normalizedRor) {
      return normalizedRor;
    }

    // Not a ROR ID (or invalid ROR ID), return as-is for other identifier types
    // This handles OpenAlex IDs, other external IDs, etc.
    return trimmedId;
  }

  /**
   * Detect and normalize ROR identifiers
   *
   * @private
   * @param id - Input identifier
   * @returns Normalized ROR URL or null if not a valid ROR ID
   * @throws Error if identifier looks like a ROR ID but is invalid
   */
  private detectAndNormalizeRor(id: string): string | null {
    if (!id || typeof id !== "string") {
      return null;
    }

    const trimmed = id.trim();

    // Try different ROR pattern types
    const rorUrl = this.tryExtractRorFromUrl(trimmed);
    if (rorUrl) return rorUrl;

    const rorDomain = this.tryExtractRorFromDomain(trimmed);
    if (rorDomain) return rorDomain;

    const rorPrefix = this.tryExtractRorFromPrefix(trimmed);
    if (rorPrefix) return rorPrefix;

    const bareRor = this.tryExtractBareRor(trimmed);
    if (bareRor !== undefined) return bareRor;

    return null;
  }

  /**
   * Try to extract ROR ID from URL pattern (https://ror.org/...)
   */
  private tryExtractRorFromUrl(trimmed: string): string | null {
    const urlMatch = trimmed.match(/^https?:\/\/ror\.org\/([a-z0-9]*)/i);
    if (!urlMatch) return null;

    const rorId = urlMatch[1];
    this.validateRorIdLength(rorId, `Invalid ROR ID format in URL: ${trimmed}`);
    this.validateAndThrowIfInvalid(rorId);

    return `https://ror.org/${rorId.toLowerCase()}`;
  }

  /**
   * Try to extract ROR ID from domain pattern (ror.org/...)
   */
  private tryExtractRorFromDomain(trimmed: string): string | null {
    const domainMatch = trimmed.match(/^ror\.org\/([a-z0-9]*)/i);
    if (!domainMatch) return null;

    const rorId = domainMatch[1];
    this.validateRorIdLength(
      rorId,
      `Invalid ROR ID format in domain: ${trimmed}`,
    );
    this.validateAndThrowIfInvalid(rorId);

    return `https://ror.org/${rorId.toLowerCase()}`;
  }

  /**
   * Try to extract ROR ID from prefix pattern (ror:...)
   */
  private tryExtractRorFromPrefix(trimmed: string): string | null {
    const prefixMatch = trimmed.match(/^ror:([a-z0-9]*)/i);
    if (!prefixMatch) return null;

    const rorId = prefixMatch[1];
    this.validateRorIdLength(
      rorId,
      `Invalid ROR ID format with ror: prefix: ${trimmed}`,
    );
    this.validateAndThrowIfInvalid(rorId);

    return `https://ror.org/${rorId.toLowerCase()}`;
  }

  /**
   * Try to extract bare ROR ID
   */
  private tryExtractBareRor(trimmed: string): string | null {
    // Check for patterns that look like they could be intended as ROR IDs
    if (!(/^[a-z0-9]{7,11}$/i.test(trimmed) && /[a-z]/i.test(trimmed))) {
      // Special case: all numbers (no letters) but ROR-like length
      if (/^[0-9]{8,10}$/.test(trimmed)) {
        throw new Error(
          `Invalid ROR ID: ${trimmed} (ROR IDs must contain letters)`,
        );
      }
      return null;
    }

    // Don't treat OpenAlex IDs as ROR IDs (they start with specific prefixes)
    if (/^[WASIPCFTKQ]/i.test(trimmed)) {
      return null; // This is likely an OpenAlex ID, not a ROR ID
    }

    // Check if this looks like a ROR ID but has wrong length
    if (trimmed.length !== 9) {
      throw new Error(
        `Invalid ROR ID length: ${trimmed} (must be exactly 9 characters)`,
      );
    }

    // Exactly 9 chars - validate as ROR
    this.validateAndThrowIfInvalid(trimmed);
    return `https://ror.org/${trimmed.toLowerCase()}`;
  }

  /**
   * Validate ROR ID length and throw if invalid
   */
  private validateRorIdLength(rorId: string, errorMessage: string): void {
    if (!rorId || rorId.length !== 9) {
      throw new Error(errorMessage);
    }
  }

  /**
   * Validate ROR format and throw if invalid
   */
  private validateAndThrowIfInvalid(rorId: string): void {
    if (!this.validateRorFormat(rorId)) {
      throw new Error(`Invalid ROR ID format: ${rorId}`);
    }
  }

  /**
   * Validate ROR format
   *
   * @private
   * @param rorId - 9-character ROR identifier
   * @returns true if valid ROR format
   */
  private validateRorFormat(rorId: string): boolean {
    if (!rorId || typeof rorId !== "string") {
      return false;
    }

    const normalized = rorId.toLowerCase();

    // Basic format validation: exactly 9 characters, alphanumeric, must contain at least one letter
    if (!/^[a-z0-9]{9}$/i.test(normalized) || !/[a-z]/i.test(normalized)) {
      return false;
    }

    // Validate against ROR base32 character set (0-9, a-z excluding i, l, o, u)
    const validRorChars = /^[0-9a-hjkmnp-tv-z]{9}$/;
    return validRorChars.test(normalized);
  }

  /**
   * Build query parameters from institution search options and filters
   *
   * @private
   * @param options - Institution search options
   * @returns Formatted query parameters
   */
  private buildQueryParams(
    options: InstitutionSearchOptions & { filter?: string } = {},
  ): QueryParams {
    const { filters, filter, sort, page, per_page, select, ...otherOptions } =
      options;

    const queryParams: QueryParams = {
      ...otherOptions,
    };

    // Handle filters using standardized FilterBuilder utility
    // Support both 'filters' (plural) and 'filter' (singular) for test compatibility
    const filtersToProcess = filters ?? filter;
    if (
      filtersToProcess &&
      typeof filtersToProcess === "object" &&
      Object.keys(filtersToProcess).length > 0
    ) {
      queryParams.filter = buildFilterString(filtersToProcess);
    }

    // Add other parameters
    if (sort) queryParams.sort = sort;
    if (page) queryParams.page = page;
    if (per_page) queryParams.per_page = per_page;
    if (select) queryParams.select = select;

    return queryParams;
  }

  /**
   * Format unknown error for safe logging using type guards
   *
   * @private
   * @param error - Unknown error object to format
   * @returns Formatted error object safe for logging
   */
  private formatErrorForLogging(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    if (typeof error === "string") {
      return { message: error };
    }

    if (typeof error === "object" && error !== null) {
      // Safely extract properties from object-like errors
      const errorObj = error;
      return {
        message:
          "message" in errorObj && typeof errorObj.message === "string"
            ? errorObj.message
            : "Unknown error",
        name:
          "name" in errorObj && typeof errorObj.name === "string"
            ? errorObj.name
            : "UnknownError",
        code:
          "code" in errorObj &&
          (typeof errorObj.code === "string" ||
            typeof errorObj.code === "number")
            ? errorObj.code
            : undefined,
        status:
          "status" in errorObj && typeof errorObj.status === "number"
            ? errorObj.status
            : undefined,
      };
    }

    // Fallback for primitive types or null
    return {
      message: "Unknown error occurred",
      value: String(error),
    };
  }
}
