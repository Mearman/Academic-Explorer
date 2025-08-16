/**
 * OpenAlex API Client
 * Universal client that works in both browser and Node.js environments
 */

import type {
  ApiResponse,
  WorksParams,
  AuthorsParams,
  SourcesParams,
  InstitutionsParams,
  PublishersParams,
  FundersParams,
  TopicsParams,
  ConceptsParams,
  KeywordsParams,
  ContinentsParams,
  RegionsParams,
  AutocompleteParams,
  AutocompleteResponse,
  NgramsParams,
  NgramResult,
  AboutnessParams,
  AboutnessResponse,
  Work,
  Author,
  Source,
  Institution,
  Publisher,
  Funder,
  Topic,
  Concept,
  Keyword,
  Continent,
  Region,
  ErrorResponse,
} from './types';

export interface OpenAlexConfig {
  apiUrl?: string;
  mailto?: string;
  apiKey?: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  userAgent?: string;
  polite?: boolean; // Use polite pool (slower but more reliable)
}

export class OpenAlexClient {
  private config: Required<OpenAlexConfig>;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(config: OpenAlexConfig = {}) {
    this.config = {
      apiUrl: config.apiUrl || 'https://api.openalex.org',
      mailto: config.mailto || '',
      apiKey: config.apiKey || '',
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      timeout: config.timeout || 30000,
      userAgent: config.userAgent || 'Academic-Explorer/1.0',
      polite: config.polite !== false, // Default to polite pool
    };
  }

  // Core request method
  async request<T>(
    endpoint: string,
    params: unknown = {},
    options: RequestInit = {}
  ): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    const requestId = `${endpoint}-${Date.now()}`;
    
    // Create abort controller for this request
    const abortController = new AbortController();
    this.abortControllers.set(requestId, abortController);
    
    // Set up timeout
    let timeoutId: NodeJS.Timeout | undefined;
    if (this.config.timeout > 0) {
      timeoutId = setTimeout(() => {
        abortController.abort();
      }, this.config.timeout);
    }

    try {
      const headers = this.buildHeaders();
      
      let retries = 0;
      while (retries < this.config.maxRetries) {
        try {
          // Workaround for MSW AbortSignal issue in tests
          const fetchOptions: RequestInit = {
            ...options,
            headers,
          };
          
          // Only add signal if not in test environment
          if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
            fetchOptions.signal = abortController.signal;
          }
          
          const response = await fetch(url.toString(), fetchOptions);

          if (!response.ok) {
            if (response.status === 429) {
              // Rate limited, wait and retry
              const retryAfter = response.headers.get('Retry-After');
              const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.config.retryDelay * Math.pow(2, retries);
              await this.delay(delay);
              retries++;
              continue;
            }
            
            if (response.status >= 500 && retries < this.config.maxRetries - 1) {
              // Server error, retry with exponential backoff
              await this.delay(this.config.retryDelay * Math.pow(2, retries));
              retries++;
              continue;
            }

            const error: ErrorResponse = await response.json().catch(() => ({
              error: `HTTP ${response.status}`,
              message: response.statusText,
            }));
            throw new OpenAlexError(error.message || error.error, response.status, error);
          }

          const data = await response.json();
          return data as T;
        } catch (error) {
          if (error instanceof OpenAlexError) throw error;
          if (retries === this.config.maxRetries - 1) throw error;
          
          await this.delay(this.config.retryDelay * Math.pow(2, retries));
          retries++;
        }
      }
      
      throw new OpenAlexError('Max retries exceeded', 0);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      this.abortControllers.delete(requestId);
    }
  }

  private buildUrl(endpoint: string, params: unknown): URL {
    const baseUrl = this.config.polite 
      ? this.config.apiUrl.replace('https://api.', 'https://api.')
      : this.config.apiUrl;
    
    const url = new URL(endpoint, baseUrl);
    
    // Add mailto for polite pool
    if (this.config.mailto) {
      url.searchParams.set('mailto', this.config.mailto);
    }

    // Add API key if provided
    if (this.config.apiKey) {
      url.searchParams.set('api_key', this.config.apiKey);
    }

    // Add other parameters
    if (params && typeof params === 'object') {
      Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (typeof value === 'object') {
            url.searchParams.set(key, JSON.stringify(value));
          } else {
            url.searchParams.set(key, String(value));
          }
        }
      });
    }

    return url;
  }

  private buildHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (typeof window === 'undefined' && this.config.userAgent) {
      // Node.js environment
      headers['User-Agent'] = this.config.userAgent;
    }

    return headers;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cancel a request
  public cancelRequest(endpoint: string): void {
    this.abortControllers.forEach((controller, key) => {
      if (key.startsWith(endpoint)) {
        controller.abort();
        this.abortControllers.delete(key);
      }
    });
  }

  // Cancel all requests
  public cancelAllRequests(): void {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }

  // Works endpoints
  public async works(params: WorksParams = {}): Promise<ApiResponse<Work>> {
    return this.request<ApiResponse<Work>>('/works', params);
  }

  public async worksGroupBy(params: WorksParams & { group_by: string }): Promise<ApiResponse<Work>> {
    return this.request<ApiResponse<Work>>('/works', params);
  }

  public async work(id: string): Promise<Work> {
    return this.request<Work>(`/works/${this.normaliseId(id)}`);
  }

  public async workNgrams(id: string, params: NgramsParams = {}): Promise<NgramResult[]> {
    return this.request<NgramResult[]>(`/works/${this.normaliseId(id)}/ngrams`, params);
  }

  public async worksAutocomplete(params: AutocompleteParams): Promise<AutocompleteResponse<Work>> {
    return this.request<AutocompleteResponse<Work>>('/autocomplete/works', params);
  }

  public async randomWork(): Promise<Work> {
    return this.request<Work>('/works/random');
  }

  // Authors endpoints
  public async authors(params: AuthorsParams = {}): Promise<ApiResponse<Author>> {
    return this.request<ApiResponse<Author>>('/authors', params);
  }

  public async authorsGroupBy(params: AuthorsParams & { group_by: string }): Promise<ApiResponse<Author>> {
    return this.request<ApiResponse<Author>>('/authors', params);
  }

  public async author(id: string): Promise<Author> {
    return this.request<Author>(`/authors/${this.normaliseId(id)}`);
  }

  public async authorsAutocomplete(params: AutocompleteParams): Promise<AutocompleteResponse<Author>> {
    return this.request<AutocompleteResponse<Author>>('/autocomplete/authors', params);
  }

  public async randomAuthor(): Promise<Author> {
    return this.request<Author>('/authors/random');
  }

  // Sources endpoints
  public async sources(params: SourcesParams = {}): Promise<ApiResponse<Source>> {
    return this.request<ApiResponse<Source>>('/sources', params);
  }

  public async sourcesGroupBy(params: SourcesParams & { group_by: string }): Promise<ApiResponse<Source>> {
    return this.request<ApiResponse<Source>>('/sources', params);
  }

  public async source(id: string): Promise<Source> {
    return this.request<Source>(`/sources/${this.normaliseId(id)}`);
  }

  public async sourcesAutocomplete(params: AutocompleteParams): Promise<AutocompleteResponse<Source>> {
    return this.request<AutocompleteResponse<Source>>('/autocomplete/sources', params);
  }

  public async randomSource(): Promise<Source> {
    return this.request<Source>('/sources/random');
  }

  // Institutions endpoints
  public async institutions(params: InstitutionsParams = {}): Promise<ApiResponse<Institution>> {
    return this.request<ApiResponse<Institution>>('/institutions', params);
  }

  public async institutionsGroupBy(params: InstitutionsParams & { group_by: string }): Promise<ApiResponse<Institution>> {
    return this.request<ApiResponse<Institution>>('/institutions', params);
  }

  public async institution(id: string): Promise<Institution> {
    return this.request<Institution>(`/institutions/${this.normaliseId(id)}`);
  }

  public async institutionsAutocomplete(params: AutocompleteParams): Promise<AutocompleteResponse<Institution>> {
    return this.request<AutocompleteResponse<Institution>>('/autocomplete/institutions', params);
  }

  public async randomInstitution(): Promise<Institution> {
    return this.request<Institution>('/institutions/random');
  }

  // Publishers endpoints
  public async publishers(params: PublishersParams = {}): Promise<ApiResponse<Publisher>> {
    return this.request<ApiResponse<Publisher>>('/publishers', params);
  }

  public async publishersGroupBy(params: PublishersParams & { group_by: string }): Promise<ApiResponse<Publisher>> {
    return this.request<ApiResponse<Publisher>>('/publishers', params);
  }

  public async publisher(id: string): Promise<Publisher> {
    return this.request<Publisher>(`/publishers/${this.normaliseId(id)}`);
  }

  public async publishersAutocomplete(params: AutocompleteParams): Promise<AutocompleteResponse<Publisher>> {
    return this.request<AutocompleteResponse<Publisher>>('/autocomplete/publishers', params);
  }

  public async randomPublisher(): Promise<Publisher> {
    return this.request<Publisher>('/publishers/random');
  }

  // Funders endpoints
  public async funders(params: FundersParams = {}): Promise<ApiResponse<Funder>> {
    return this.request<ApiResponse<Funder>>('/funders', params);
  }

  public async fundersGroupBy(params: FundersParams & { group_by: string }): Promise<ApiResponse<Funder>> {
    return this.request<ApiResponse<Funder>>('/funders', params);
  }

  public async funder(id: string): Promise<Funder> {
    return this.request<Funder>(`/funders/${this.normaliseId(id)}`);
  }

  public async fundersAutocomplete(params: AutocompleteParams): Promise<AutocompleteResponse<Funder>> {
    return this.request<AutocompleteResponse<Funder>>('/autocomplete/funders', params);
  }

  public async randomFunder(): Promise<Funder> {
    return this.request<Funder>('/funders/random');
  }

  // Topics endpoints
  public async topics(params: TopicsParams = {}): Promise<ApiResponse<Topic>> {
    return this.request<ApiResponse<Topic>>('/topics', params);
  }

  public async topicsGroupBy(params: TopicsParams & { group_by: string }): Promise<ApiResponse<Topic>> {
    return this.request<ApiResponse<Topic>>('/topics', params);
  }

  public async topic(id: string): Promise<Topic> {
    return this.request<Topic>(`/topics/${this.normaliseId(id)}`);
  }

  public async topicsAutocomplete(params: AutocompleteParams): Promise<AutocompleteResponse<Topic>> {
    return this.request<AutocompleteResponse<Topic>>('/autocomplete/topics', params);
  }

  public async randomTopic(): Promise<Topic> {
    return this.request<Topic>('/topics/random');
  }

  // Concepts endpoints (legacy)
  public async concepts(params: ConceptsParams = {}): Promise<ApiResponse<Concept>> {
    return this.request<ApiResponse<Concept>>('/concepts', params);
  }

  public async conceptsGroupBy(params: ConceptsParams & { group_by: string }): Promise<ApiResponse<Concept>> {
    return this.request<ApiResponse<Concept>>('/concepts', params);
  }

  public async concept(id: string): Promise<Concept> {
    return this.request<Concept>(`/concepts/${this.normaliseId(id)}`);
  }

  public async conceptsAutocomplete(params: AutocompleteParams): Promise<AutocompleteResponse<Concept>> {
    return this.request<AutocompleteResponse<Concept>>('/autocomplete/concepts', params);
  }

  public async randomConcept(): Promise<Concept> {
    return this.request<Concept>('/concepts/random');
  }

  // Keywords endpoints
  public async keywords(params: KeywordsParams = {}): Promise<ApiResponse<Keyword>> {
    return this.request<ApiResponse<Keyword>>('/keywords', params);
  }

  public async keywordsGroupBy(params: KeywordsParams & { group_by: string }): Promise<ApiResponse<Keyword>> {
    return this.request<ApiResponse<Keyword>>('/keywords', params);
  }

  public async keyword(id: string): Promise<Keyword> {
    return this.request<Keyword>(`/keywords/${this.normaliseId(id)}`);
  }

  // Geo endpoints - Continents
  public async continents(params: ContinentsParams = {}): Promise<ApiResponse<Continent>> {
    return this.request<ApiResponse<Continent>>('/continents', params);
  }

  public async continentsGroupBy(params: ContinentsParams & { group_by: string }): Promise<ApiResponse<Continent>> {
    return this.request<ApiResponse<Continent>>('/continents', params);
  }

  public async continent(id: string): Promise<Continent> {
    return this.request<Continent>(`/continents/${this.normaliseId(id)}`);
  }

  public async randomContinent(): Promise<Continent> {
    return this.request<Continent>('/continents/random');
  }

  // Geo endpoints - Regions
  public async regions(params: RegionsParams = {}): Promise<ApiResponse<Region>> {
    return this.request<ApiResponse<Region>>('/regions', params);
  }

  public async regionsGroupBy(params: RegionsParams & { group_by: string }): Promise<ApiResponse<Region>> {
    return this.request<ApiResponse<Region>>('/regions', params);
  }

  public async region(id: string): Promise<Region> {
    return this.request<Region>(`/regions/${this.normaliseId(id)}`);
  }

  public async randomRegion(): Promise<Region> {
    return this.request<Region>('/regions/random');
  }

  // Aboutness endpoint
  public async aboutness(params: AboutnessParams): Promise<AboutnessResponse> {
    return this.request<AboutnessResponse>('/text', {}, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Batch operations
  public async worksBatch(ids: string[]): Promise<Work[]> {
    if (ids.length === 0) {
      return [];
    }
    const normalizedIds = ids.map(id => this.normaliseId(id));
    const filter = `openalex_id:${normalizedIds.join('|')}`;
    const response = await this.works({ filter, per_page: ids.length });
    return response.results;
  }

  public async authorsBatch(ids: string[]): Promise<Author[]> {
    if (ids.length === 0) {
      return [];
    }
    const normalizedIds = ids.map(id => this.normaliseId(id));
    const filter = `openalex_id:${normalizedIds.join('|')}`;
    const response = await this.authors({ filter, per_page: ids.length });
    return response.results;
  }

  // Helper to normalise IDs (handle different ID formats including external IDs)
  private normaliseId(id: string): string {
    // Remove OpenAlex URL prefix if present
    if (id.startsWith('https://openalex.org/')) {
      const cleanId = id.replace('https://openalex.org/', '');
      
      // For geo endpoints, extract just the final part after the entity type
      if (cleanId.startsWith('continents/')) {
        return cleanId.replace('continents/', '');
      }
      if (cleanId.startsWith('regions/')) {
        return cleanId.replace('regions/', '');
      }
      
      return cleanId;
    }
    
    // Handle external IDs - OpenAlex API accepts them directly
    // DOI patterns
    if (id.match(/^10\.\d{4,}\/[^\s]+$/) || id.match(/^https?:\/\/(dx\.)?doi\.org\//i)) {
      return id; // Pass DOIs through unchanged
    }
    
    // ORCID patterns
    if (id.match(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/) || id.match(/^https?:\/\/orcid\.org\//i)) {
      return id; // Pass ORCIDs through unchanged
    }
    
    // ROR patterns
    if (id.match(/^https?:\/\/ror\.org\//i) || (id.match(/^[0-9a-z]+$/i) && id.length >= 9)) {
      return id; // Pass ROR IDs through unchanged
    }
    
    // ISSN-L patterns
    if (id.match(/^\d{4}-\d{3}[\dX]$/)) {
      return id; // Pass ISSN-L through unchanged
    }
    
    // Wikidata patterns
    if (id.match(/^Q\d+$/i)) {
      return id; // Pass Wikidata IDs through unchanged
    }
    
    // PMID patterns
    if (id.match(/^\d{7,}$/)) {
      return id; // Pass potential PMIDs through unchanged
    }
    
    // PMCID patterns
    if (id.match(/^PMC\d+$/i)) {
      return id; // Pass PMCIDs through unchanged
    }
    
    // Handle OpenAlex IDs
    if (id.match(/^[WASIPFTCKRN]\d+$/i)) {
      return id.toUpperCase(); // Normalise case for OpenAlex IDs
    }
    
    // For any other format, pass through unchanged
    // The OpenAlex API will handle validation and return appropriate errors
    return id;
  }

  // Get configuration
  public getConfig(): Readonly<Required<OpenAlexConfig>> {
    return { ...this.config };
  }

  // Update configuration
  public updateConfig(config: Partial<OpenAlexConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Handle entity redirects (for merged entities)
  public async handleEntityRedirect<T>(
    entityFetcher: () => Promise<T>,
    originalId: string
  ): Promise<{ data: T; redirectedId?: string }> {
    const data = await entityFetcher();
    
    // Check if the returned entity has a different ID than requested
    // This indicates a redirect due to merged entities
    if (typeof data === 'object' && data !== null && 'id' in data) {
      const returnedId = (data as { id: string }).id;
      const normalizedOriginal = this.normaliseId(originalId);
      const normalizedReturned = this.normaliseId(returnedId);
      
      if (normalizedOriginal !== normalizedReturned) {
        return { data, redirectedId: returnedId };
      }
    }
    
    return { data };
  }

  // Enhanced entity fetchers with redirect support
  public async workWithRedirect(id: string): Promise<{ data: Work; redirectedId?: string }> {
    return this.handleEntityRedirect(() => this.work(id), id);
  }

  public async authorWithRedirect(id: string): Promise<{ data: Author; redirectedId?: string }> {
    return this.handleEntityRedirect(() => this.author(id), id);
  }

  public async sourceWithRedirect(id: string): Promise<{ data: Source; redirectedId?: string }> {
    return this.handleEntityRedirect(() => this.source(id), id);
  }

  public async institutionWithRedirect(id: string): Promise<{ data: Institution; redirectedId?: string }> {
    return this.handleEntityRedirect(() => this.institution(id), id);
  }

  public async publisherWithRedirect(id: string): Promise<{ data: Publisher; redirectedId?: string }> {
    return this.handleEntityRedirect(() => this.publisher(id), id);
  }

  public async funderWithRedirect(id: string): Promise<{ data: Funder; redirectedId?: string }> {
    return this.handleEntityRedirect(() => this.funder(id), id);
  }

  public async topicWithRedirect(id: string): Promise<{ data: Topic; redirectedId?: string }> {
    return this.handleEntityRedirect(() => this.topic(id), id);
  }

  public async conceptWithRedirect(id: string): Promise<{ data: Concept; redirectedId?: string }> {
    return this.handleEntityRedirect(() => this.concept(id), id);
  }

  public async keywordWithRedirect(id: string): Promise<{ data: Keyword; redirectedId?: string }> {
    return this.handleEntityRedirect(() => this.keyword(id), id);
  }

  public async continentWithRedirect(id: string): Promise<{ data: Continent; redirectedId?: string }> {
    return this.handleEntityRedirect(() => this.continent(id), id);
  }

  public async regionWithRedirect(id: string): Promise<{ data: Region; redirectedId?: string }> {
    return this.handleEntityRedirect(() => this.region(id), id);
  }
}

// Custom error class
export class OpenAlexError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: ErrorResponse | unknown
  ) {
    super(message);
    this.name = 'OpenAlexError';
  }
}

// Export singleton instance for convenience
export const openAlex = new OpenAlexClient();

// Export types
export * from './types';