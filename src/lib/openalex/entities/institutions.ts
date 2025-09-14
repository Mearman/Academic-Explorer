/**
 * OpenAlex Institutions API Entity Methods
 * Provides comprehensive methods for querying and retrieving institution data
 */

import { InstitutionEntity, InstitutionsFilters, QueryParams, OpenAlexResponse, Work, Author } from '../types';
import { OpenAlexBaseClient } from '../client';

/**
 * Extended query parameters specific to institutions API
 */
export interface InstitutionsQueryParams extends QueryParams {
  filter?: string;
  search?: string;
  sort?: 'cited_by_count' | 'works_count' | 'display_name' | 'created_date' | 'updated_date';
  group_by?: 'country_code' | 'type' | 'works_count' | 'cited_by_count';
}

/**
 * Parameters for institution-specific searches and filters
 */
export interface InstitutionSearchOptions {
  filters?: InstitutionsFilters;
  sort?: InstitutionsQueryParams['sort'];
  page?: number;
  per_page?: number;
  select?: string[];
}

/**
 * Comprehensive Institutions API class providing methods for institution data access
 */
export class InstitutionsApi {
  private client: OpenAlexBaseClient;

  constructor(client: OpenAlexBaseClient) {
    this.client = client;
  }

  /**
   * Get a single institution by its OpenAlex ID, ROR ID, or other identifier
   *
   * @param id - Institution ID (OpenAlex ID, ROR ID, etc.)
   * @param params - Optional query parameters (select fields, etc.)
   * @returns Promise resolving to institution entity
   *
   * @example
   * ```typescript
   * const institution = await institutionsApi.getInstitution('I33213144');
   * const institutionWithSelect = await institutionsApi.getInstitution('I33213144', {
   *   select: ['id', 'display_name', 'country_code', 'works_count']
   * });
   * ```
   */
  async getInstitution(id: string, params: QueryParams = {}): Promise<InstitutionEntity> {
    return this.client.getById<InstitutionEntity>('institutions', id, params);
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
  async getInstitutions(params: InstitutionSearchOptions = {}): Promise<OpenAlexResponse<InstitutionEntity>> {
    const queryParams = this.buildQueryParams(params);
    return this.client.getResponse<InstitutionEntity>('institutions', queryParams);
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
    options: InstitutionSearchOptions = {}
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const params = {
      ...options,
      search: query
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
    options: InstitutionSearchOptions = {}
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const params = {
      ...options,
      filters: {
        ...options.filters,
        'country_code': countryCode
      }
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
    options: InstitutionSearchOptions = {}
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const params = {
      ...options,
      filters: {
        ...options.filters,
        'type': type
      }
    };
    return this.getInstitutions(params);
  }

  /**
   * Get works published by authors affiliated with a specific institution
   *
   * @param institutionId - Institution OpenAlex ID
   * @param options - Optional search parameters for filtering works
   * @returns Promise resolving to works from the institution
   *
   * @example
   * ```typescript
   * const harvardWorks = await institutionsApi.getInstitutionWorks('I136199984', {
   *   filters: { 'publication_year': '2023' },
   *   sort: 'cited_by_count',
   *   per_page: 100
   * });
   * ```
   */
  async getInstitutionWorks(
    institutionId: string,
    options: InstitutionSearchOptions = {}
  ): Promise<OpenAlexResponse<Work>> {
    const queryParams = {
      filter: `authorships.institutions.id:${institutionId}`,
      ...this.buildQueryParams(options)
    };
    return this.client.getResponse<Work>('works', queryParams);
  }

  /**
   * Get authors affiliated with a specific institution
   *
   * @param institutionId - Institution OpenAlex ID
   * @param options - Optional search parameters for filtering authors
   * @returns Promise resolving to authors at the institution
   *
   * @example
   * ```typescript
   * const mitAuthors = await institutionsApi.getInstitutionAuthors('I121332964', {
   *   sort: 'cited_by_count',
   *   per_page: 50
   * });
   * ```
   */
  async getInstitutionAuthors(
    institutionId: string,
    options: InstitutionSearchOptions = {}
  ): Promise<OpenAlexResponse<Author>> {
    const queryParams = {
      filter: `last_known_institution.id:${institutionId}`,
      ...this.buildQueryParams(options)
    };
    return this.client.getResponse<Author>('authors', queryParams);
  }

  /**
   * Get institutions associated with a specific institution (parent, child, or related institutions)
   *
   * @param institutionId - Institution OpenAlex ID
   * @param options - Optional search parameters
   * @returns Promise resolving to associated institutions
   *
   * @example
   * ```typescript
   * const relatedInstitutions = await institutionsApi.getAssociatedInstitutions('I33213144', {
   *   per_page: 25
   * });
   * ```
   */
  async getAssociatedInstitutions(
    institutionId: string,
    options: InstitutionSearchOptions = {}
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const params = {
      ...options,
      filters: {
        ...options.filters,
        'associated_institutions.id': institutionId
      }
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
    seed?: number
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const params: InstitutionSearchOptions & { sample: number; seed: number } = {
      ...options,
      sample: Math.min(count, 200), // OpenAlex limits sample to 200
      seed: seed !== undefined ? seed : Math.floor(Math.random() * 1000000),
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
    options: InstitutionSearchOptions = {}
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const params = {
      ...options,
      filters: {
        ...options.filters,
        'is_global_south': true
      }
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
    options: InstitutionSearchOptions = {}
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const params = {
      ...options,
      filters: {
        ...options.filters,
        'has_ror': true
      }
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
    options: InstitutionSearchOptions = {}
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const params = {
      ...options,
      filters: {
        ...options.filters,
        'lineage': lineageId
      }
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
   *   console.log(`Processing batch of ${batch.length} institutions`);
   * }
   * ```
   */
  async *streamInstitutions(
    options: InstitutionSearchOptions = {}
  ): AsyncGenerator<InstitutionEntity[], void, unknown> {
    const queryParams = this.buildQueryParams(options);
    yield* this.client.stream<InstitutionEntity>('institutions', queryParams);
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
    maxResults?: number
  ): Promise<InstitutionEntity[]> {
    const queryParams = this.buildQueryParams(options);
    return this.client.getAll<InstitutionEntity>('institutions', queryParams, maxResults);
  }

  /**
   * Build query parameters from institution search options and filters
   *
   * @private
   * @param options - Institution search options
   * @returns Formatted query parameters
   */
  private buildQueryParams(options: InstitutionSearchOptions = {}): QueryParams {
    const { filters, sort, page, per_page, select, ...otherOptions } = options;

    const queryParams: QueryParams = {
      ...otherOptions
    };

    // Handle filters
    if (filters && Object.keys(filters).length > 0) {
      const filterPairs = Object.entries(filters)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}:${value.join('|')}`;
          }
          return `${key}:${String(value)}`;
        });
      queryParams.filter = filterPairs.join(',');
    }

    // Add other parameters
    if (sort) queryParams.sort = sort;
    if (page) queryParams.page = page;
    if (per_page) queryParams.per_page = per_page;
    if (select) queryParams.select = select;

    return queryParams;
  }
}