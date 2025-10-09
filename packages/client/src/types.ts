/**
 * Comprehensive OpenAlex API TypeScript Type Definitions
 * Based on https://docs.openalex.org/
 */

// Base types
export type OpenAlexId = string;
export type DOI = string;
export type ORCID = string;
export type RORId = string;
export type ISSNId = string;
export type WikidataId = string;

// Filter utility types
export type DateString = string; // ISO 8601 date string (e.g., "2023-01-15")
export type NumericFilter = string | number; // Supports comparison operators like ">100", ">=50", etc.

// Utility type for making all fields except id optional (for partial hydration)
type PartialExceptId<T> = {
  id: T extends { id: infer U } ? U : never;
} & Partial<Omit<T, "id">>;

/**
 * Base entity interface that all OpenAlex entities extend
 * Contains common properties shared across all entity types
 */
export interface BaseEntity {
  /** Unique OpenAlex identifier */
  id: OpenAlexId;

  /** Primary display name for the entity */
  display_name: string;

  /** Total number of citations for works associated with this entity */
  cited_by_count: number;

  /** Year-by-year breakdown of works and citations */
  counts_by_year: CountsByYear[];

  /** ISO 8601 timestamp when the entity was last updated */
  updated_date: string;

  /** ISO 8601 timestamp when the entity was first created */
  created_date: string;
}

/**
 * Extended entity interface for entities that have associated works collections
 * Used by Authors, Sources, Institutions, Topics, Publishers, and Funders
 */
export interface EntityWithWorks extends BaseEntity {
  /** Total number of works associated with this entity */
  works_count: number;

  /** OpenAlex API URL for retrieving works associated with this entity */
  works_api_url: string;
}

// Common utility types
export interface OpenAlexResponse<T> {
  results: T[];
  meta: {
    count: number;
    db_response_time_ms: number;
    page: number;
    per_page: number;
    groups_count?: number;
  };
  group_by?: Array<{
    key: string;
    key_display_name: string;
    count: number;
    cited_by_count?: number;
    works_count?: number;
    h_index?: number;
  }>;
}

export interface Location {
  source?: {
    id: OpenAlexId;
    display_name: string;
    issn_l?: string;
    issn?: string[];
    is_oa: boolean;
    is_in_doaj: boolean;
    host_organization?: OpenAlexId;
    host_organization_name?: string;
    host_organization_lineage?: OpenAlexId[];
    type: string;
  };
  landing_page_url?: string;
  pdf_url?: string;
  is_oa: boolean;
  version?: string;
  license?: string;
}

export interface CountsByYear {
  year: number;
  cited_by_count: number;
  works_count?: number;
  oa_works_count?: number;
}

export interface Institution {
  id: OpenAlexId;
  display_name: string;
  ror?: RORId;
  country_code?: string;
  type: string;
  lineage?: OpenAlexId[];
}

export interface Authorship {
  author_position: "first" | "middle" | "last";
  author: {
    id: OpenAlexId;
    display_name: string;
    orcid?: ORCID;
  };
  institutions: Institution[];
  countries: string[];
  is_corresponding: boolean;
  raw_author_name?: string;
  raw_affiliation_strings?: string[];
}

// Work entity
export interface Work extends BaseEntity {
  doi?: DOI;
  title?: string;
  publication_year?: number;
  publication_date?: string;
  ids: {
    openalex: OpenAlexId;
    doi?: DOI;
    mag?: number;
    pmid?: string;
    pmcid?: string;
  };
  primary_location?: Location;
  best_oa_location?: Location;
  locations: Location[];
  locations_count: number;
  authorships: Authorship[];
  countries_distinct_count: number;
  institutions_distinct_count: number;
  corresponding_author_ids: OpenAlexId[];
  corresponding_institution_ids: OpenAlexId[];
  apc_list?: {
    value: number;
    currency: string;
    value_usd: number;
    provenance: string;
  };
  apc_paid?: {
    value: number;
    currency: string;
    value_usd: number;
    provenance: string;
  };
  fwci?: number;
  has_fulltext: boolean;
  fulltext_origin?: string;
  cited_by_api_url: string;
  type: string;
  type_crossref?: string;
  indexed_in: string[];
  open_access: {
    is_oa: boolean;
    oa_date?: string;
    oa_url?: string;
    any_repository_has_fulltext: boolean;
  };
  authorships_count?: number;
  cited_by_percentile_year?: {
    min: number;
    max: number;
  };
  concepts: Array<{
    id: OpenAlexId;
    wikidata?: WikidataId;
    display_name: string;
    level: number;
    score: number;
  }>;
  mesh: Array<{
    descriptor_ui: string;
    descriptor_name: string;
    qualifier_ui?: string;
    qualifier_name?: string;
    is_major_topic: boolean;
  }>;
  alternate_host_venues?: Array<{
    id?: OpenAlexId;
    display_name: string;
    type: string;
    url?: string;
    is_oa: boolean;
    version?: string;
    license?: string;
  }>;
  referenced_works: OpenAlexId[];
  referenced_works_count: number;
  related_works: OpenAlexId[];
  sustainable_development_goals?: Array<{
    id: OpenAlexId;
    display_name: string;
    score: number;
  }>;
  grants?: Array<{
    funder: OpenAlexId;
    funder_display_name: string;
    award_id?: string;
  }>;
  datasets?: string[];
  versions?: OpenAlexId[];
  is_retracted: boolean;
  is_paratext: boolean;
  abstract_inverted_index?: Record<string, number[]>;
  biblio?: {
    volume?: string;
    issue?: string;
    first_page?: string;
    last_page?: string;
  };
  language?: string;
  topics?: Array<{
    id: OpenAlexId;
    display_name: string;
    score: number;
    subfield?: {
      id: OpenAlexId;
      display_name: string;
    };
    field?: {
      id: OpenAlexId;
      display_name: string;
    };
    domain?: {
      id: OpenAlexId;
      display_name: string;
    };
  }>;
  keywords?: Array<{
    id: OpenAlexId;
    display_name: string;
    score: number;
  }>;
}

// Partial hydration types - only id is guaranteed, all other fields are optional
export type PartialWork = PartialExceptId<Work>;

// Author entity
export interface Author extends EntityWithWorks {
  orcid?: ORCID;
  display_name_alternatives?: string[];
  ids: {
    openalex: OpenAlexId;
    orcid?: ORCID;
    scopus?: string;
    twitter?: string;
    wikipedia?: string;
    mag?: number;
  };
  last_known_institutions?: Institution[];
  affiliations: Array<{
    institution: Institution;
    years: number[];
  }>;
  summary_stats: {
    "2yr_mean_citedness": number;
    h_index: number;
    i10_index: number;
  };
  x_concepts?: Array<{
    id: OpenAlexId;
    wikidata?: WikidataId;
    display_name: string;
    level: number;
    score: number;
  }>;
  topics?: Array<{
    id: OpenAlexId;
    display_name: string;
    count: number;
    subfield?: {
      id: OpenAlexId;
      display_name: string;
    };
    field?: {
      id: OpenAlexId;
      display_name: string;
    };
    domain?: {
      id: OpenAlexId;
      display_name: string;
    };
  }>;
}

export type PartialAuthor = PartialExceptId<Author>;

// Add partial types for other entities as needed
export type PartialSource = PartialExceptId<Source>;
export type PartialInstitution = PartialExceptId<Institution>;

// Source entity (journals, conferences, etc.)
export interface Source extends EntityWithWorks {
  issn_l?: string;
  issn?: string[];
  publisher?: string;
  is_oa: boolean;
  is_in_doaj: boolean;
  ids: {
    openalex: OpenAlexId;
    issn_l?: string;
    issn?: string[];
    mag?: number;
    wikidata?: WikidataId;
    fatcat?: string;
  };
  homepage_url?: string;
  apc_prices?: Array<{
    price: number;
    currency: string;
  }>;
  apc_usd?: number;
  country_code?: string;
  societies?: string[];
  alternate_titles?: string[];
  abbreviated_title?: string;
  type: string;
  x_concepts?: Array<{
    id: OpenAlexId;
    wikidata?: WikidataId;
    display_name: string;
    level: number;
    score: number;
  }>;
  summary_stats: {
    "2yr_mean_citedness": number;
    h_index: number;
    i10_index: number;
  };
  topics?: Array<{
    id: OpenAlexId;
    display_name: string;
    count: number;
    subfield?: {
      id: OpenAlexId;
      display_name: string;
    };
    field?: {
      id: OpenAlexId;
      display_name: string;
    };
    domain?: {
      id: OpenAlexId;
      display_name: string;
    };
  }>;
}

// Institution entity
export interface InstitutionEntity extends EntityWithWorks {
  ror?: RORId;
  country_code: string;
  type: string;
  homepage_url?: string;
  image_url?: string;
  image_thumbnail_url?: string;
  display_name_acronyms?: string[];
  display_name_alternatives?: string[];
  ids: {
    openalex: OpenAlexId;
    ror?: RORId;
    grid?: string;
    wikipedia?: string;
    wikidata?: WikidataId;
    mag?: number;
  };
  geo: {
    city?: string;
    geonames_city_id?: string;
    region?: string;
    country_code: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
  international: {
    display_name: Record<string, string>;
  };
  associated_institutions?: Array<{
    id: OpenAlexId;
    display_name: string;
    ror?: RORId;
    country_code: string;
    type: string;
    relationship: string;
  }>;
  x_concepts?: Array<{
    id: OpenAlexId;
    wikidata?: WikidataId;
    display_name: string;
    level: number;
    score: number;
  }>;
  topics?: Array<{
    id: OpenAlexId;
    display_name: string;
    count: number;
    subfield?: {
      id: OpenAlexId;
      display_name: string;
    };
    field?: {
      id: OpenAlexId;
      display_name: string;
    };
    domain?: {
      id: OpenAlexId;
      display_name: string;
    };
  }>;
  lineage?: OpenAlexId[];
}

// Concept entity (being phased out, replaced by Topics)
export interface Concept extends EntityWithWorks {
  wikidata?: WikidataId;
  level: number;
  description?: string;
  ids: {
    openalex: OpenAlexId;
    wikidata?: WikidataId;
    wikipedia?: string;
    umls_aui?: string[];
    umls_cui?: string[];
    mag?: number;
  };
  image_url?: string;
  image_thumbnail_url?: string;
  international: {
    display_name: Record<string, string>;
    description?: Record<string, string>;
  };
  ancestors?: Array<{
    id: OpenAlexId;
    wikidata?: WikidataId;
    display_name: string;
    level: number;
  }>;
  related_concepts?: Array<{
    id: OpenAlexId;
    wikidata?: WikidataId;
    display_name: string;
    level: number;
    score: number;
  }>;
}

// Topic entity (replacing Concepts)
export interface Topic extends EntityWithWorks {
  description?: string;
  keywords?: string[];
  ids: {
    openalex: OpenAlexId;
    wikipedia?: string;
  };
  subfield: {
    id: OpenAlexId;
    display_name: string;
  };
  field: {
    id: OpenAlexId;
    display_name: string;
  };
  domain: {
    id: OpenAlexId;
    display_name: string;
  };
  siblings?: Array<{
    id: OpenAlexId;
    display_name: string;
  }>;
}

// Publisher entity
export interface Publisher extends EntityWithWorks {
  alternate_titles?: string[];
  country_codes?: string[];
  hierarchy_level: number;
  parent_publisher?: OpenAlexId;
  lineage: OpenAlexId[];
  sources_count: number;
  ids: {
    openalex: OpenAlexId;
    ror?: RORId;
    wikidata?: WikidataId;
  };
  sources_api_url: string;
}

// Funder entity
export interface Funder extends EntityWithWorks {
  alternate_titles?: string[];
  country_code?: string;
  description?: string;
  homepage_url?: string;
  image_url?: string;
  image_thumbnail_url?: string;
  grants_count: number;
  ids: {
    openalex: OpenAlexId;
    ror?: RORId;
    wikidata?: WikidataId;
    crossref?: string;
    doi?: string;
  };
  roles?: Array<{
    role: string;
    id: OpenAlexId;
    works_count: number;
  }>;
  summary_stats: {
    "2yr_mean_citedness": number;
    h_index: number;
    i10_index: number;
  };
  topics?: Array<{
    id: OpenAlexId;
    display_name: string;
    count: number;
    subfield?: {
      id: OpenAlexId;
      display_name: string;
    };
    field?: {
      id: OpenAlexId;
      display_name: string;
    };
    domain?: {
      id: OpenAlexId;
      display_name: string;
    };
  }>;
}

/**
 * Keywords Entity - Research keywords and their usage
 *
 * @interface Keyword
 * @description Represents a research keyword in the OpenAlex database with strict typing
 */
export interface Keyword extends Omit<EntityWithWorks, 'counts_by_year'> {
  /** Optional description or definition of the keyword */
  readonly description?: string;

  /** Array of related or synonymous keywords */
  readonly keywords?: readonly string[];

  /** External identifiers for the keyword */
  readonly ids: {
    /** OpenAlex identifier (always present) */
    readonly openalex: OpenAlexId;
    /** Wikipedia URL if available */
    readonly wikipedia?: string;
    /** Wikidata identifier if available */
    readonly wikidata?: WikidataId;
  };
  
  /** Year-by-year breakdown of works and citations (overrides BaseEntity) */
  readonly counts_by_year: readonly KeywordCountsByYear[];
}

/**
 * Year-by-year statistics for a keyword
 *
 * @interface KeywordCountsByYear
 * @description Represents annual statistics for keyword usage
 */
export interface KeywordCountsByYear {
  /** Calendar year (4-digit year) */
  readonly year: number;

  /** Number of works published in this year with this keyword (non-negative) */
  readonly works_count: number;

  /** Number of citations in this year for works with this keyword (non-negative) */
  readonly cited_by_count: number;
}

/**
 * Text Analysis Result - For /text endpoint
 */
export interface TextAnalysis {
  results: Array<{
    entity_type: "topic" | "concept" | "keyword";
    entity_id: OpenAlexId;
    display_name: string;
    score: number;
    confidence?: number;
  }>;
  meta: {
    count: number;
    processing_time_ms: number;
    text_length: number;
  };
}

// Filter and query types
export interface WorksFilters {
  // Works-specific filters
  "authorships.author.id"?: string | string[];
  "authorships.author.orcid"?: string | string[];
  "authorships.institutions.id"?: string | string[];
  "authorships.institutions.ror"?: string | string[];
  "authorships.institutions.country_code"?: string | string[];
  "authorships.institutions.type"?: string | string[];
  "best_oa_location.source.id"?: string | string[];
  cited_by_count?: string | number;
  "concepts.id"?: string | string[];
  corresponding_author_ids?: string | string[];
  corresponding_institution_ids?: string | string[];
  "default.search"?: string;
  "display_name.search"?: string;
  doi?: string | string[];
  from_created_date?: string;
  from_publication_date?: string;
  from_updated_date?: string;
  fulltext_origin?: string | string[];
  "grants.funder"?: string | string[];
  has_abstract?: boolean;
  has_doi?: boolean;
  has_fulltext?: boolean;
  has_oa_accepted_or_published_version?: boolean;
  has_oa_submitted_version?: boolean;
  has_references?: boolean;
  "host_venue.id"?: string | string[];
  "host_venue.issn"?: string | string[];
  "host_venue.lineage"?: string | string[];
  "host_venue.publisher"?: string | string[];
  "ids.openalex"?: string | string[];
  is_oa?: boolean;
  is_paratext?: boolean;
  is_retracted?: boolean;
  language?: string | string[];
  "locations.source.id"?: string | string[];
  "open_access.is_oa"?: boolean;
  "primary_location.source.id"?: string | string[];
  "primary_topic.id"?: string | string[];
  publication_date?: string;
  publication_year?: number | string;
  referenced_works?: string | string[];
  repository?: string | string[];
  "sustainable_development_goals.id"?: string | string[];
  "title.search"?: string;
  to_created_date?: string;
  to_publication_date?: string;
  to_updated_date?: string;
  "topics.id"?: string | string[];
  type?: string | string[];
  type_crossref?: string | string[];
  version?: string | string[];
}

export interface AuthorsFilters {
  "affiliations.institution.id"?: string | string[];
  "affiliations.institution.ror"?: string | string[];
  "affiliations.institution.country_code"?: string | string[];
  cited_by_count?: string | number;
  "default.search"?: string;
  "display_name.search"?: string;
  from_created_date?: string;
  from_updated_date?: string;
  has_orcid?: boolean;
  "last_known_institution.id"?: string | string[];
  "last_known_institution.ror"?: string | string[];
  "last_known_institution.country_code"?: string | string[];
  orcid?: string | string[];
  to_created_date?: string;
  to_updated_date?: string;
  "topics.id"?: string | string[];
  works_count?: string | number;
  "x_concepts.id"?: string | string[];
}

export interface SourcesFilters {
  apc_usd?: string | number;
  cited_by_count?: string | number;
  country_code?: string | string[];
  "default.search"?: string;
  "display_name.search"?: string;
  from_created_date?: string;
  from_updated_date?: string;
  has_issn?: boolean;
  host_organization?: string | string[];
  host_organization_lineage?: string | string[];
  "ids.issn"?: string | string[];
  is_in_doaj?: boolean;
  is_oa?: boolean;
  issn?: string | string[];
  publisher?: string | string[];
  to_created_date?: string;
  to_updated_date?: string;
  "topics.id"?: string | string[];
  type?: string | string[];
  works_count?: string | number;
  "x_concepts.id"?: string | string[];
}

export interface InstitutionsFilters {
  "associated_institutions.id"?: string | string[];
  cited_by_count?: string | number;
  country_code?: string | string[];
  "default.search"?: string;
  "display_name.search"?: string;
  from_created_date?: string;
  from_updated_date?: string;
  has_ror?: boolean;
  is_global_south?: boolean;
  lineage?: string | string[];
  ror?: string | string[];
  to_created_date?: string;
  to_updated_date?: string;
  "topics.id"?: string | string[];
  type?: string | string[];
  works_count?: string | number;
  "x_concepts.id"?: string | string[];
}

export interface TopicsFilters {
  cited_by_count?: string | number;
  "default.search"?: string;
  "display_name.search"?: string;
  "domain.id"?: string | string[];
  "field.id"?: string | string[];
  from_created_date?: string;
  from_updated_date?: string;
  "keywords.search"?: string;
  "subfield.id"?: string | string[];
  to_created_date?: string;
  to_updated_date?: string;
  works_count?: string | number;
}

export interface ConceptsFilters {
  cited_by_count?: string | number;
  "default.search"?: string;
  "display_name.search"?: string;
  from_created_date?: string;
  from_updated_date?: string;
  level?: number | string;
  to_created_date?: string;
  to_updated_date?: string;
  wikidata?: string | string[];
  works_count?: string | number;
}

export interface PublishersFilters {
  cited_by_count?: string | number;
  country_codes?: string | string[];
  "default.search"?: string;
  "display_name.search"?: string;
  from_created_date?: string;
  from_updated_date?: string;
  lineage?: string | string[];
  parent_publisher?: string | string[];
  to_created_date?: string;
  to_updated_date?: string;
  works_count?: string | number;
}

export interface FundersFilters {
  cited_by_count?: string | number;
  country_code?: string | string[];
  "default.search"?: string;
  "display_name.search"?: string;
  from_created_date?: string;
  from_updated_date?: string;
  grants_count?: string | number;
  to_created_date?: string;
  to_updated_date?: string;
  "topics.id"?: string | string[];
  works_count?: string | number;
}

/**
 * Filters for querying keywords with strict typing
 *
 * @interface KeywordsFilters
 * @description Supported filter parameters for keyword queries
 */
export interface KeywordsFilters {
  /** Filter by citation count (e.g., ">100", ">=50", "<1000") */
  cited_by_count?: NumericFilter;

  /** Default search across multiple fields */
  "default.search"?: string;

  /** Search in keyword display names */
  "display_name.search"?: string;

  /** Filter by creation date (ISO 8601 date string, e.g., "2020-01-01") */
  from_created_date?: DateString;

  /** Filter by last update date (ISO 8601 date string) */
  from_updated_date?: DateString;

  /** Filter by creation date upper bound (ISO 8601 date string) */
  to_created_date?: DateString;

  /** Filter by last update date upper bound (ISO 8601 date string) */
  to_updated_date?: DateString;

  /** Filter by works count (e.g., ">10", ">=5", "<100") */
  works_count?: NumericFilter;
}

// Statistical endpoint parameters
export interface StatsParams {
  entity_type?: EntityType;
  timeframe?: "all" | "year" | "month";
  format?: "json" | "csv";
}

// Random sampling parameters
export interface SampleParams extends QueryParams {
  seed?: number;
  sample_size?: number;
}

// Grouping parameters
export interface GroupParams extends QueryParams {
  group_by?: string;
  group_limit?: number;
}

// Query parameters
export interface QueryParams extends Record<string, unknown> {
  filter?: string;
  search?: string;
  sort?: string;
  page?: number;
  per_page?: number;
  cursor?: string;
  select?: string[];
  sample?: number;
  seed?: number;
  group_by?: string;
  mailto?: string;
}

// Autocomplete types
export interface AutocompleteResult {
  id: OpenAlexId;
  display_name: string;
  hint?: string;
  cited_by_count?: number;
  works_count?: number;
  entity_type:
    | "work"
    | "author"
    | "source"
    | "institution"
    | "topic"
    | "publisher"
    | "funder"
    | "concept"
    | "keyword";
  external_id?: string;
  filter_key?: string;
}

// N-grams types
export interface NGram {
  ngram: string;
  ngram_tokens: number;
  ngram_count: number;
  work_count: number;
}

// Error types
export interface OpenAlexError {
  error: string;
  message: string;
  status_code?: number;
}

// Union types for all entities
export type OpenAlexEntity =
  | Work
  | Author
  | Source
  | InstitutionEntity
  | Topic
  | Concept
  | Publisher
  | Funder
  | Keyword;
export type EntityType =
  | "works"
  | "authors"
  | "sources"
  | "institutions"
  | "topics"
  | "concepts"
  | "publishers"
  | "funders"
  | "keywords";
export type EntityFilters =
  | WorksFilters
  | AuthorsFilters
  | SourcesFilters
  | InstitutionsFilters
  | TopicsFilters
  | ConceptsFilters
  | PublishersFilters
  | FundersFilters
  | KeywordsFilters;

// Mapping from entity type to entity interface
export type EntityTypeMap = {
  works: Work;
  authors: Author;
  sources: Source;
  institutions: InstitutionEntity;
  topics: Topic;
  concepts: Concept;
  publishers: Publisher;
  funders: Funder;
  keywords: Keyword;
};
