/**
 * Comprehensive OpenAlex API Client
 * Main entry point for all OpenAlex API operations
 */

import { OpenAlexBaseClient, OpenAlexClientConfig } from './client';
import { WorksApi } from './entities/works';
import { AuthorsApi } from './entities/authors';
import { SourcesApi } from './entities/sources';
import { InstitutionsApi } from './entities/institutions';
import { TopicsApi } from './entities/topics';
import { PublishersApi } from './entities/publishers';
import { FundersApi } from './entities/funders';
import { KeywordsApi } from './entities/keywords';
import { GeoApi } from './entities/geo';
import { AutocompleteApi } from './utils/autocomplete';
import { TextAnalysisApi } from './utils/text-analysis';
import { SamplingApi } from './utils/sampling';
import { GroupingApi } from './utils/grouping';
import { StatisticsApi } from './utils/statistics';
import { QueryBuilder, createWorksQuery, createAuthorsQuery } from './utils/query-builder';
import { logError } from '@/lib/logger';
import type {
  Work,
  Author,
  Source,
  InstitutionEntity,
  Topic,
  Publisher,
  Funder,
  Keyword,
  Geo,
  EntityType,
  OpenAlexEntity,
  AutocompleteResult,
  OpenAlexResponse,
  QueryParams,
  TextAnalysis,
  SampleParams,
  GroupParams,
  StatsParams
} from './types';

export type OpenAlexClientOptions = OpenAlexClientConfig;

/**
 * Main OpenAlex API Client
 *
 * Provides access to all OpenAlex entities and utilities through a unified interface.
 *
 * @example
 * ```typescript
 * const client = new OpenAlexClient({
 *   userEmail: 'researcher@university.edu'
 * });
 *
 * // Get a specific work
 * const work = await client.works.getWork('W2741809807');
 *
 * // Search for authors
 * const authors = await client.authors.searchAuthors('machine learning');
 *
 * // Use autocomplete
 * const suggestions = await client.autocomplete.autocompleteAuthors('albert ein');
 * ```
 */
export class OpenAlexClient {
  /** Base HTTP client for all API operations */
  private readonly baseClient: OpenAlexBaseClient;

  /** Works API - scholarly documents, papers, books, etc. */
  public readonly works: WorksApi;

  /** Authors API - researchers and their publications */
  public readonly authors: AuthorsApi;

  /** Sources API - journals, conferences, repositories */
  public readonly sources: SourcesApi;

  /** Institutions API - universities, companies, research centers */
  public readonly institutions: InstitutionsApi;

  /** Topics API - research topics and subjects (new) */
  public readonly topics: TopicsApi;

  /** Publishers API - academic publishers */
  public readonly publishers: PublishersApi;

  /** Funders API - research funding organizations */
  public readonly funders: FundersApi;

  /** Keywords API - research keywords and their usage */
  public readonly keywords: KeywordsApi;

  /** Geo API - geographic regions and continents */
  public readonly geo: GeoApi;

  /** Autocomplete API - search suggestions and cross-entity search */
  public readonly autocomplete: AutocompleteApi;

  /** Text Analysis API - "aboutness" detection and content analysis */
  public readonly textAnalysis: TextAnalysisApi;

  /** Sampling API - random sampling and statistical sampling methods */
  public readonly sampling: SamplingApi;

  /** Grouping API - advanced grouping and aggregation operations */
  public readonly grouping: GroupingApi;

  /** Statistics API - database-wide statistics and analytics */
  public readonly statistics: StatisticsApi;

  constructor(options: OpenAlexClientOptions = {}) {
    this.baseClient = new OpenAlexBaseClient(options);

    // Initialize all entity APIs
    this.works = new WorksApi(this.baseClient);
    this.authors = new AuthorsApi(this.baseClient);
    this.sources = new SourcesApi(this.baseClient);
    this.institutions = new InstitutionsApi(this.baseClient);
    this.topics = new TopicsApi(this.baseClient);
    this.publishers = new PublishersApi(this.baseClient);
    this.funders = new FundersApi(this.baseClient);
    this.keywords = new KeywordsApi(this.baseClient);
    this.geo = new GeoApi(this.baseClient);

    // Initialize utility APIs
    this.autocomplete = new AutocompleteApi(this.baseClient);
    this.textAnalysis = new TextAnalysisApi(this.baseClient);
    this.sampling = new SamplingApi(this.baseClient);
    this.grouping = new GroupingApi(this.baseClient);
    this.statistics = new StatisticsApi(this.baseClient);
  }

  /**
   * Get any entity by OpenAlex ID with automatic type detection
   *
   * @example
   * ```typescript
   * const work = await client.getEntity('W2741809807');
   * const author = await client.getEntity('A5023888391');
   * ```
   */
  public async getEntity(id: string): Promise<OpenAlexEntity> {
    const entityType = this.detectEntityType(id);

    switch (entityType) {
      case 'works':
        return this.works.getWork(id);
      case 'authors':
        return this.authors.getAuthor(id);
      case 'sources':
        return this.sources.getSource(id);
      case 'institutions':
        return this.institutions.getInstitution(id);
      case 'topics':
        return this.topics.get(id);
      case 'publishers':
        return this.publishers.get(id);
      case 'funders':
        return this.funders.get(id);
      case 'keywords':
        return this.keywords.getKeyword(id);
      case 'geo':
        return this.geo.getGeo(id);
      default:
        throw new Error(`Unable to determine entity type for ID: ${id}`);
    }
  }

  /**
   * Search across all entity types
   *
   * @example
   * ```typescript
   * const results = await client.searchAll('machine learning', {
   *   entityTypes: ['works', 'authors'],
   *   limit: 10
   * });
   * ```
   */
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
    geo: Geo[];
  }> {
    const { entityTypes = ['works', 'authors', 'sources', 'institutions'], limit = 25, page = 1 } = options;

    const searchParams = {
      'default.search': query,
      per_page: limit,
      page,
    };

    const results = await Promise.allSettled([
      entityTypes.includes('works') ? this.works.getWorks(searchParams) : Promise.resolve({ results: [] }),
      entityTypes.includes('authors') ? this.authors.getAuthors(searchParams) : Promise.resolve({ results: [] }),
      entityTypes.includes('sources') ? this.sources.getSources(searchParams) : Promise.resolve({ results: [] }),
      entityTypes.includes('institutions') ? this.institutions.getInstitutions(searchParams) : Promise.resolve({ results: [] }),
      entityTypes.includes('topics') ? this.topics.getMultiple(searchParams) : Promise.resolve({ results: [] }),
      entityTypes.includes('publishers') ? this.publishers.getMultiple(searchParams) : Promise.resolve({ results: [] }),
      entityTypes.includes('funders') ? this.funders.getMultiple(searchParams) : Promise.resolve({ results: [] }),
      entityTypes.includes('keywords') ? this.keywords.getKeywords(searchParams) : Promise.resolve({ results: [] }),
      entityTypes.includes('geo') ? this.geo.getGeos(searchParams) : Promise.resolve({ results: [] }),
    ]);

    return {
      works: results[0].status === 'fulfilled' ? results[0].value.results : [],
      authors: results[1].status === 'fulfilled' ? results[1].value.results : [],
      sources: results[2].status === 'fulfilled' ? results[2].value.results : [],
      institutions: results[3].status === 'fulfilled' ? results[3].value.results : [],
      topics: results[4].status === 'fulfilled' ? results[4].value.results : [],
      publishers: results[5].status === 'fulfilled' ? results[5].value.results : [],
      funders: results[6].status === 'fulfilled' ? results[6].value.results : [],
      keywords: results[7].status === 'fulfilled' ? results[7].value.results : [],
      geo: results[8].status === 'fulfilled' ? results[8].value.results : [],
    };
  }

  /**
   * Get autocomplete suggestions across entity types
   *
   * @example
   * ```typescript
   * const suggestions = await client.getSuggestions('stanford univ');
   * ```
   */
  public async getSuggestions(query: string, entityType?: EntityType): Promise<AutocompleteResult[]> {
    return this.autocomplete.autocomplete(query, entityType);
  }

  /**
   * Create a query builder for works
   */
  public createWorksQuery(): QueryBuilder {
    return createWorksQuery();
  }

  /**
   * Create a query builder for authors
   */
  public createAuthorsQuery(): QueryBuilder {
    return createAuthorsQuery();
  }

  /**
   * Detect entity type from OpenAlex ID
   *
   * @example
   * ```typescript
   * client.detectEntityType('W2741809807') // 'works'
   * client.detectEntityType('A5023888391') // 'authors'
   * ```
   */
  public detectEntityType(id: string): EntityType | null {
    if (!id || typeof id !== 'string') {
      return null;
    }

    // Remove URL prefix if present
    const cleanId = id.replace(/^https?:\/\/openalex\.org\//, '');

    // Basic format check - should have letter followed by digits, including K and G (case insensitive)
    const regexTest = /^[WASITCPFKG]\d+$/i.test(cleanId);
    if (!regexTest) {
      return null;
    }

    const firstChar = cleanId.charAt(0).toUpperCase();

    switch (firstChar) {
      case 'W':
        return 'works';
      case 'A':
        return 'authors';
      case 'S':
        return 'sources';
      case 'I':
        return 'institutions';
      case 'T':
        return 'topics';
      case 'C':
        return 'concepts'; // Legacy, being phased out
      case 'P':
        return 'publishers';
      case 'F':
        return 'funders';
      case 'K':
        return 'keywords';
      case 'G':
        return 'geo';
      default:
        return null;
    }
  }

  /**
   * Check if an ID is a valid OpenAlex ID
   *
   * @example
   * ```typescript
   * client.isValidOpenAlexId('W2741809807') // true
   * client.isValidOpenAlexId('invalid') // false
   * ```
   */
  public isValidOpenAlexId(id: string): boolean {
    if (!id || typeof id !== 'string') {
      return false;
    }

    // Remove URL prefix if present
    const cleanId = id.replace(/^https?:\/\/openalex\.org\//, '');

    // Check if it matches OpenAlex ID pattern (letter + 8-10 digits)
    // Based on the test expectations, including new entity types K and G
    return /^[WASITCPFKG]\d{8,10}$/.test(cleanId);
  }

  /**
   * Get client statistics and rate limit information
   */
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
    return {
      rateLimit: this.baseClient.getRateLimitStatus(),
      // Entity counts could be added here if needed
    };
  }

  /**
   * Update client configuration
   *
   * @example
   * ```typescript
   * client.updateConfig({
   *   userEmail: 'new-email@university.edu',
   *   rateLimit: { requestsPerSecond: 5 }
   * });
   * ```
   */
  public updateConfig(config: Partial<OpenAlexClientConfig>): void {
    this.baseClient.updateConfig(config);
  }

  /**
   * Get multiple entities by IDs (mixed types supported)
   *
   * @example
   * ```typescript
   * const entities = await client.getEntities([
   *   'W2741809807',  // work
   *   'A5023888391',  // author
   *   'S4210194219'   // source
   * ]);
   * ```
   */
  public async getEntities(ids: string[]): Promise<OpenAlexEntity[]> {
    const promises = ids.map(id => this.getEntity(id).catch(error => {
      logError(`Failed to fetch entity ${id}`, error, 'OpenAlexClient', 'api');
      return null;
    }));

    const results = await Promise.all(promises);
    return results.filter(result => result !== null) as OpenAlexEntity[];
  }

  /**
   * Stream entities from any endpoint
   *
   * @example
   * ```typescript
   * for await (const batch of client.stream('works', { filter: 'publication_year:2023' })) {
   *   console.log(`Processing batch of ${batch.length} works`);
   * }
   * ```
   */
  public async *stream<T = OpenAlexEntity>(
    entityType: EntityType,
    params: QueryParams = {}
  ): AsyncGenerator<T[], void, unknown> {
    switch (entityType) {
      case 'works':
        yield* this.works.streamWorks(params) as AsyncGenerator<T[], void, unknown>;
        break;
      case 'authors':
        yield* this.authors.streamAuthors(params) as AsyncGenerator<T[], void, unknown>;
        break;
      case 'sources':
        yield* this.sources.streamSources(params as Record<string, unknown>) as AsyncGenerator<T[], void, unknown>;
        break;
      case 'institutions':
        yield* this.institutions.streamInstitutions(params as Record<string, unknown>) as AsyncGenerator<T[], void, unknown>;
        break;
      case 'topics':
        yield* this.topics.stream(params as Record<string, unknown>) as AsyncGenerator<T[], void, unknown>;
        break;
      case 'publishers':
        yield* this.publishers.stream(params as Record<string, unknown>) as AsyncGenerator<T[], void, unknown>;
        break;
      case 'funders':
        yield* this.funders.stream(params as Record<string, unknown>) as AsyncGenerator<T[], void, unknown>;
        break;
      case 'keywords':
        yield* this.keywords.streamKeywords(params) as AsyncGenerator<T[], void, unknown>;
        break;
      case 'geo':
        yield* this.geo.streamGeos(params) as AsyncGenerator<T[], void, unknown>;
        break;
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }

  /**
   * Batch process entities with a callback function
   *
   * @example
   * ```typescript
   * await client.batchProcess('works',
   *   { filter: 'publication_year:2023', per_page: 100 },
   *   async (works) => {
   *     for (const work of works) {
   *       console.log(`Processing work: ${work.display_name}`);
   *       // Process each work
   *     }
   *   }
   * );
   * ```
   */
  public async batchProcess<T = OpenAlexEntity>(
    entityType: EntityType,
    params: QueryParams,
    processor: (batch: T[]) => Promise<void> | void
  ): Promise<void> {
    for await (const batch of this.stream<T>(entityType, params)) {
      await processor(batch);
    }
  }
}

/**
 * Create a default OpenAlex client instance
 *
 * @example
 * ```typescript
 * import { createOpenAlexClient } from '@/lib/openalex';
 *
 * const client = createOpenAlexClient({
 *   userEmail: 'researcher@university.edu'
 * });
 * ```
 */
export function createOpenAlexClient(options?: OpenAlexClientOptions): OpenAlexClient {
  return new OpenAlexClient(options);
}

/**
 * Default client instance (can be used directly)
 *
 * @example
 * ```typescript
 * import { openAlex } from '@/lib/openalex';
 *
 * const work = await openAlex.works.getWork('W2741809807');
 * ```
 */
export const openAlex = new OpenAlexClient();

// Re-export commonly used types and utilities
export type {
  Work,
  Author,
  Source,
  InstitutionEntity,
  Topic,
  Publisher,
  Funder,
  Keyword,
  Geo,
  EntityType,
  OpenAlexEntity,
  AutocompleteResult,
  OpenAlexResponse,
  QueryParams,
  OpenAlexClientConfig,
  TextAnalysis,
  SampleParams,
  GroupParams,
  StatsParams,
};

export {
  QueryBuilder,
  createWorksQuery,
  createAuthorsQuery,
} from './utils/query-builder';

export {
  OpenAlexApiError,
  OpenAlexRateLimitError
} from './client';

export {
  reconstructAbstract,
  getAbstractStats,
  hasAbstract,
  extractKeywords,
  formatCitation,
  analyzeReadability,
} from './utils/transformers';