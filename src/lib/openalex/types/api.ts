/**
 * OpenAlex API Request and Response Types
 */

import type { Work, Author, Source, Institution, Publisher, Funder, Topic, Concept, Keyword, Continent, Region } from './entities';

// Base API response structure
export interface ApiResponse<T> {
  meta: Meta;
  results: T[];
  group_by?: GroupByResult[];
}

export interface Meta {
  count: number;
  db_response_time_ms: number;
  page?: number;
  per_page?: number;
  next_cursor?: string;
  groups_count?: number;
}

// Search and filter parameters
export interface BaseParams {
  search?: string;
  filter?: string | Record<string, unknown>;
  sort?: string;
  page?: number;
  per_page?: number;
  cursor?: string;
  select?: string[];
  sample?: number;
  seed?: number;
  group_by?: string;
  // Special date range filters for works
  from_publication_date?: string;
  to_publication_date?: string;
  from_created_date?: string;
  to_created_date?: string;
  from_updated_date?: string;
  to_updated_date?: string;
}

export interface WorksParams extends BaseParams {
  filter?: string | {
    display_name?: string;
    title?: string;
    abstract?: string;
    fulltext?: string;
    publication_year?: number | string;
    publication_date?: string;
    from_publication_date?: string;
    to_publication_date?: string;
    type?: string;
    type_crossref?: string;
    is_oa?: boolean;
    oa_status?: string;
    is_retracted?: boolean;
    is_paratext?: boolean;
    has_fulltext?: boolean;
    has_doi?: boolean;
    has_orcid?: boolean;
    has_ror?: boolean;
    has_abstract?: boolean;
    has_raw_affiliation_string?: boolean;
    cited_by_count?: number | string;
    cites?: string;
    cited_by?: string;
    author?: {
      id?: string;
      orcid?: string;
      display_name?: string;
    };
    institutions?: {
      id?: string;
      ror?: string;
      country_code?: string;
      type?: string;
      continent?: string;
      is_global_south?: boolean;
    };
    source?: {
      id?: string;
      issn?: string;
      publisher?: string;
      is_oa?: boolean;
      is_in_doaj?: boolean;
    };
    funder?: string;
    publisher?: string;
    journal?: string;
    repository?: string;
    concepts?: {
      id?: string;
      wikidata?: string;
    };
    topics?: {
      id?: string;
      display_name?: string;
    };
    keywords?: {
      id?: string;
      display_name?: string;
    };
    sustainable_development_goals?: {
      id?: string;
      display_name?: string;
    };
    grants?: {
      funder?: string;
      award_id?: string;
    };
    apc_paid?: {
      currency?: string;
      price?: number | string;
      provenance?: string;
    };
    locations?: {
      is_oa?: boolean;
      source?: {
        id?: string;
        type?: string;
      };
    };
    authorships?: {
      author?: {
        id?: string;
        orcid?: string;
      };
      institutions?: {
        id?: string;
        ror?: string;
        country_code?: string;
        type?: string;
      };
      is_corresponding?: boolean;
    };
    referenced_works?: string;
    related_works?: string;
    raw_affiliation_string?: string;
  };
}

export interface AuthorsParams extends BaseParams {
  filter?: string | {
    display_name?: string;
    has_orcid?: boolean;
    orcid?: string;
    works_count?: number | string;
    cited_by_count?: number | string;
    last_known_institution?: {
      id?: string;
      ror?: string;
      country_code?: string;
      type?: string;
      continent?: string;
    };
    x_concepts?: {
      id?: string;
    };
    topics?: {
      id?: string;
    };
  };
}

export interface SourcesParams extends BaseParams {
  filter?: string | {
    display_name?: string;
    issn?: string;
    publisher?: string;
    has_issn?: boolean;
    works_count?: number | string;
    cited_by_count?: number | string;
    is_oa?: boolean;
    is_in_doaj?: boolean;
    is_core?: boolean;
    host_organization?: string;
    apc?: string;
    type?: string;
    country_code?: string;
    x_concepts?: {
      id?: string;
    };
    topics?: {
      id?: string;
    };
  };
}

export interface InstitutionsParams extends BaseParams {
  filter?: string | {
    display_name?: string;
    ror?: string;
    country_code?: string;
    type?: string;
    continent?: string;
    is_global_south?: boolean;
    has_ror?: boolean;
    works_count?: number | string;
    cited_by_count?: number | string;
    x_concepts?: {
      id?: string;
    };
    topics?: {
      id?: string;
    };
  };
}

export interface PublishersParams extends BaseParams {
  filter?: string | {
    display_name?: string;
    country_codes?: string;
    works_count?: number | string;
    cited_by_count?: number | string;
    hierarchy_level?: number;
    parent_publisher?: string;
  };
}

export interface FundersParams extends BaseParams {
  filter?: string | {
    display_name?: string;
    country_code?: string;
    grants_count?: number | string;
    works_count?: number | string;
    cited_by_count?: number | string;
  };
}

export interface TopicsParams extends BaseParams {
  filter?: string | {
    display_name?: string;
    ids?: {
      openalex?: string;
    };
    works_count?: number | string;
    cited_by_count?: number | string;
  };
}

export interface ConceptsParams extends BaseParams {
  filter?: string | {
    display_name?: string;
    has_wikidata?: boolean;
    wikidata?: string;
    level?: number;
    works_count?: number | string;
    cited_by_count?: number | string;
    ancestors?: {
      id?: string;
    };
  };
}

export interface KeywordsParams extends BaseParams {
  filter?: string | {
    display_name?: string;
    works_count?: number | string;
    cited_by_count?: number | string;
  };
}

export interface ContinentsParams extends BaseParams {
  filter?: string | {
    display_name?: string;
    works_count?: number | string;
    cited_by_count?: number | string;
  };
}

export interface RegionsParams extends BaseParams {
  filter?: string | {
    display_name?: string;
    works_count?: number | string;
    cited_by_count?: number | string;
  };
}

// Aboutness endpoint params and response
export interface AboutnessParams {
  text: string;
  return_concepts?: number;
  return_topics?: number;
}

export interface AboutnessResult {
  id: string;
  display_name: string;
  score: number;
}

export interface AboutnessResponse {
  concepts: AboutnessResult[];
  topics: AboutnessResult[];
}

// Group by results
export interface GroupByResult {
  key: string;
  key_display_name?: string;
  count: number;
}

// Autocomplete
export interface AutocompleteParams {
  q: string;
  filter?: string;
}

export interface AutocompleteResult<T> {
  id: string;
  display_name: string;
  hint?: string;
  cited_by_count?: number;
  works_count?: number;
  entity_type?: string;
  external_id?: string;
  filter_key?: string;
  _full?: T;
}

export interface AutocompleteResponse<T> {
  meta: {
    count: number;
    db_response_time_ms: number;
  };
  results: AutocompleteResult<T>[];
}

// N-grams
export interface NgramsParams {
  ngrams?: string;
}

export interface NgramResult {
  ngram: string;
  ngram_count: number;
  ngram_tokens: number;
  term_frequency: number;
}

// Random
export interface RandomWork extends Work {
  random?: boolean;
}

// Entity responses by type
export type WorksResponse = ApiResponse<Work>;
export type AuthorsResponse = ApiResponse<Author>;
export type SourcesResponse = ApiResponse<Source>;
export type InstitutionsResponse = ApiResponse<Institution>;
export type PublishersResponse = ApiResponse<Publisher>;
export type FundersResponse = ApiResponse<Funder>;
export type TopicsResponse = ApiResponse<Topic>;
export type ConceptsResponse = ApiResponse<Concept>;
export type KeywordsResponse = ApiResponse<Keyword>;
export type ContinentsResponse = ApiResponse<Continent>;
export type RegionsResponse = ApiResponse<Region>;

// Single entity responses
export interface SingleEntityResponse<T> {
  id: string;
  error?: string;
  message?: string;
  _full?: T;
}

// Error response
export interface ErrorResponse {
  error: string;
  message: string;
  documentation_url?: string;
}

// Batch operations
export interface BatchRequest {
  ids: string[];
  mailto?: string;
  per_page?: number;
  cursor?: string;
}

// Rate limit info
export interface RateLimitInfo {
  'x-ratelimit-limit': string;
  'x-ratelimit-remaining': string;
  'x-ratelimit-reset': string;
}

// Export all entity types for convenience
export * from './entities';