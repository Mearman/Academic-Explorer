/**
 * Entity interfaces for OpenAlex API
 */

import type {
  APCInfo,
  APCPrice,
  AuthorIds,
  ConceptIds,
  ConceptItem,
  DOI,
  FunderIds,
  InstitutionIds,
  KeywordIds,
  OpenAlexId,
  ORCID,
  PartialExceptId,
  PublisherIds,
  RORId,
  SourceIds,
  SummaryStats,
  TopicIds,
  TopicItem,
  WikidataId,
  WorkIds,
} from "./base";

/**
 * Maps base entity field names to their types.
 */
type BaseEntityFieldMap = {
  id: OpenAlexId;
  display_name: string;
  cited_by_count: number;
  counts_by_year: CountsByYear[];
  updated_date: string;
  created_date: string;
};

/**
 * Maps entity-with-works field names to their types (includes base fields).
 */
type EntityWithWorksFieldMap = BaseEntityFieldMap & {
  works_count: number;
  works_api_url: string;
};

/**
 * Generic base entity type that picks only the specified fields.
 *
 * @template Keys - Union type of allowed field names for this entity
 *
 * @example
 * type AuthorKeys = 'id' | 'display_name' | 'orcid';
 * interface Author extends BaseEntity<AuthorKeys> {
 *   orcid?: ORCID;
 * }
 */
export type BaseEntity<Keys extends string = string> = {
  [K in Keys & keyof BaseEntityFieldMap]: BaseEntityFieldMap[K];
};

/**
 * Generic entity-with-works type that picks only the specified fields.
 *
 * @template Keys - Union type of allowed field names for this entity
 */
export type EntityWithWorks<Keys extends string = string> = {
  [K in Keys & keyof EntityWithWorksFieldMap]: EntityWithWorksFieldMap[K];
};

// Common utility types
export interface CountsByYear {
  year: number;
  cited_by_count: number;
  works_count?: number;
  oa_works_count?: number;
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
  ids: WorkIds;
  primary_location?: Location;
  best_oa_location?: Location;
  locations: Location[];
  locations_count: number;
  authorships: Authorship[];
  countries_distinct_count: number;
  institutions_distinct_count: number;
  corresponding_author_ids: OpenAlexId[];
  corresponding_institution_ids: OpenAlexId[];
  apc_list?: APCInfo;
  apc_paid?: APCInfo;
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
  cited_by_percentile_year?: {
    min: number;
    max: number;
  };
  concepts: ConceptItem[];
  mesh: Array<{
    descriptor_ui: string;
    descriptor_name: string;
    qualifier_ui?: string;
    qualifier_name?: string;
    is_major_topic: boolean;
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
  topics?: TopicItem[];
  keywords?: Array<{
    id: OpenAlexId;
    display_name: string;
    score: number;
  }>;
}

// Partial hydration types - only id is guaranteed, all other fields are optional
export type PartialWork = PartialExceptId<Work>;

/**
 * Author entity - define the complete type first.
 */
export interface Author
  extends EntityWithWorks<
    | "id"
    | "display_name"
    | "cited_by_count"
    | "counts_by_year"
    | "updated_date"
    | "created_date"
    | "works_count"
    | "works_api_url"
  > {
  orcid?: ORCID;
  display_name_alternatives?: string[];
  ids: AuthorIds;
  last_known_institutions?: Institution[];
  affiliations: Array<{
    institution: Institution;
    years: number[];
  }>;
  summary_stats: SummaryStats;
  x_concepts?: ConceptItem[];
  topics?: TopicItem[];
}

export type PartialAuthor = PartialExceptId<Author>;

// Source entity (journals, conferences, etc.)
export interface Source extends EntityWithWorks {
  issn_l?: string;
  issn?: string[];
  is_oa: boolean;
  is_in_doaj: boolean;
  ids: SourceIds;
  homepage_url?: string;
  apc_prices?: APCPrice[];
  apc_usd?: number;
  country_code?: string;
  societies?: string[];
  alternate_titles?: string[];
  abbreviated_title?: string;
  type: string;
  x_concepts?: ConceptItem[];
  summary_stats: SummaryStats;
  topics?: TopicItem[];
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
  ids: InstitutionIds;
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
  x_concepts?: ConceptItem[];
  topics?: TopicItem[];
  lineage?: OpenAlexId[];
}

// Concept entity (being phased out, replaced by Topics)
export interface Concept extends EntityWithWorks {
  wikidata?: WikidataId;
  level: number;
  description?: string;
  ids: ConceptIds;
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
  related_concepts?: ConceptItem[];
}

// Topic entity (replacing Concepts)
export interface Topic extends EntityWithWorks {
  description?: string;
  keywords?: string[];
  ids: TopicIds;
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
  ids: PublisherIds;
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
  ids: FunderIds;
  roles?: Array<{
    role: string;
    id: OpenAlexId;
    works_count: number;
  }>;
  summary_stats: SummaryStats;
  topics?: TopicItem[];
}

/**
 * Keywords Entity - Research keywords and their usage
 */
export interface Keyword extends Omit<EntityWithWorks, "counts_by_year"> {
  /** Optional description or definition of the keyword */
  readonly description?: string;

  /** Array of related or synonymous keywords */
  readonly keywords?: readonly string[];

  /** External identifiers for the keyword */
  readonly ids: KeywordIds;

  /** Year-by-year breakdown of works and citations (overrides BaseEntity) */
  readonly counts_by_year: readonly KeywordCountsByYear[];
}

/**
 * Year-by-year statistics for a keyword
 */
export interface KeywordCountsByYear {
  /** Calendar year (4-digit year) */
  readonly year: number;

  /** Number of works published in this year with this keyword (non-negative) */
  readonly works_count: number;

  /** Number of citations in this year for works with this keyword (non-negative) */
  readonly cited_by_count: number;
}

// Partial types for other entities
export type PartialSource = PartialExceptId<Source>;
export type PartialInstitution = PartialExceptId<InstitutionEntity>;

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

// Field arrays for use with select parameter

/**
 * Helper to create a validated array of keys for an entity type.
 * This ensures all elements in the array are valid keys of T.
 */
export const keysOf =
  <T>() =>
  <const K extends readonly (keyof T)[]>(keys: K) =>
    keys;

/**
 * Fields that can be selected for BaseEntity.
 * These are the core fields present on all OpenAlex entities.
 */
export const BASE_ENTITY_FIELDS = keysOf<BaseEntity>()([
  "id",
  "display_name",
  "cited_by_count",
  "counts_by_year",
  "updated_date",
  "created_date",
]);

export type BaseEntityField = (typeof BASE_ENTITY_FIELDS)[number];

/**
 * Fields that can be selected for EntityWithWorks.
 * These are the fields present on entities that have associated works collections.
 */
export const ENTITY_WITH_WORKS_FIELDS = keysOf<EntityWithWorks>()([
  ...BASE_ENTITY_FIELDS,
  "works_count",
  "works_api_url",
]);

export type EntityWithWorksField = (typeof ENTITY_WITH_WORKS_FIELDS)[number];

/**
 * Fields that can be selected for Author entities.
 * Use with the select parameter to request specific fields.
 */
export const AUTHOR_FIELDS = keysOf<Author>()([
  ...ENTITY_WITH_WORKS_FIELDS,
  "orcid",
  "display_name_alternatives",
  "ids",
  "last_known_institutions",
  "affiliations",
  "summary_stats",
  "x_concepts",
  "topics",
]);

export type AuthorField = (typeof AUTHOR_FIELDS)[number];

/**
 * Fields that can be selected for Work entities.
 */
export const WORK_FIELDS = keysOf<Work>()([
  ...BASE_ENTITY_FIELDS,
  "doi",
  "title",
  "publication_year",
  "publication_date",
  "ids",
  "primary_location",
  "best_oa_location",
  "locations",
  "locations_count",
  "authorships",
  "countries_distinct_count",
  "institutions_distinct_count",
  "corresponding_author_ids",
  "corresponding_institution_ids",
  "apc_list",
  "apc_paid",
  "fwci",
  "has_fulltext",
  "fulltext_origin",
  "cited_by_api_url",
  "type",
  "type_crossref",
  "indexed_in",
  "open_access",
  "cited_by_percentile_year",
  "concepts",
  "mesh",
  "referenced_works",
  "referenced_works_count",
  "related_works",
  "sustainable_development_goals",
  "grants",
  "datasets",
  "versions",
  "is_retracted",
  "is_paratext",
  "abstract_inverted_index",
  "biblio",
  "language",
  "topics",
  "keywords",
]);

export type WorkField = (typeof WORK_FIELDS)[number];

/**
 * Fields that can be selected for Source entities.
 */
export const SOURCE_FIELDS = keysOf<Source>()([
  ...ENTITY_WITH_WORKS_FIELDS,
  "issn_l",
  "issn",
  "is_oa",
  "is_in_doaj",
  "ids",
  "homepage_url",
  "apc_prices",
  "apc_usd",
  "country_code",
  "societies",
  "alternate_titles",
  "abbreviated_title",
  "type",
  "x_concepts",
  "summary_stats",
  "topics",
]);

export type SourceField = (typeof SOURCE_FIELDS)[number];

/**
 * Fields that can be selected for Institution entities.
 */
export const INSTITUTION_FIELDS = keysOf<InstitutionEntity>()([
  "id",
  "display_name",
  "cited_by_count",
  "counts_by_year",
  "updated_date",
  "created_date",
  "works_count",
  "works_api_url",
  "ror",
  "country_code",
  "type",
  "homepage_url",
  "image_url",
  "image_thumbnail_url",
  "display_name_acronyms",
  "display_name_alternatives",
  "ids",
  "geo",
  "international",
  "associated_institutions",
  "x_concepts",
  "topics",
  "lineage",
]);

export type InstitutionField = (typeof INSTITUTION_FIELDS)[number];

/**
 * Fields that can be selected for Topic entities.
 */
export const TOPIC_FIELDS = keysOf<Topic>()([
  "id",
  "display_name",
  "cited_by_count",
  "updated_date",
  "created_date",
  "works_count",
  "works_api_url",
  "description",
  "keywords",
  "ids",
  "subfield",
  "field",
  "domain",
  "siblings",
]);

export type TopicField = (typeof TOPIC_FIELDS)[number];

/**
 * Fields that can be selected for Funder entities.
 */
export const FUNDER_FIELDS = keysOf<Funder>()([
  "id",
  "display_name",
  "cited_by_count",
  "counts_by_year",
  "updated_date",
  "created_date",
  "works_count",
  "alternate_titles",
  "country_code",
  "description",
  "homepage_url",
  "image_url",
  "image_thumbnail_url",
  "grants_count",
  "ids",
  "roles",
  "summary_stats",
]);

export type FunderField = (typeof FUNDER_FIELDS)[number];
