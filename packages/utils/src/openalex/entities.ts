/**
 * Entity interfaces for OpenAlex API
 */

import { z } from "zod";
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
import {
  workSchema,
  authorSchema,
  institutionSchema,
  conceptSchema,
  sourceSchema,
  publisherSchema,
  funderSchema,
  topicSchema,
  keywordSchema,
} from "./schemas";

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
// Work type inferred from comprehensive Zod schema
export type Work = z.infer<typeof workSchema>;

// Partial hydration types - only id is guaranteed, all other fields are optional
export type PartialWork = PartialExceptId<Work>;

/**
 * Author entity - define the complete type first.
 */
// Author type inferred from comprehensive Zod schema
export type Author = z.infer<typeof authorSchema>;

export type PartialAuthor = PartialExceptId<Author>;

// Source entity (journals, conferences, etc.)
// Source type inferred from comprehensive Zod schema
export type Source = z.infer<typeof sourceSchema>;

// Institution entity
// Institution type inferred from comprehensive Zod schema
export type InstitutionEntity = z.infer<typeof institutionSchema>;

// Concept type inferred from comprehensive Zod schema
export type Concept = z.infer<typeof conceptSchema>;

// Topic entity (replacing Concepts)
// Topic type inferred from comprehensive Zod schema
export type Topic = z.infer<typeof topicSchema>;

// Publisher entity
// Publisher type inferred from comprehensive Zod schema
export type Publisher = z.infer<typeof publisherSchema>;

// Funder entity
// Funder type inferred from comprehensive Zod schema
export type Funder = z.infer<typeof funderSchema>;

/**
 * Keywords Entity - Research keywords and their usage
 */
// Keyword type inferred from comprehensive Zod schema
export type Keyword = z.infer<typeof keywordSchema>;

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
  "id",
  "display_name",
  "cited_by_count",
  "counts_by_year",
  "updated_date",
  "created_date",
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
  "authorships_count",
  "cited_by_percentile_year",
  "concepts",
  "mesh",
  "alternate_host_venues",
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
export const SOURCE_FIELDS = sourceSchema.keyof().options;

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
export const TOPIC_FIELDS = topicSchema.keyof().options;

export type TopicField = (typeof TOPIC_FIELDS)[number];

/**
 * Fields that can be selected for Funder entities.
 */
export const FUNDER_FIELDS = funderSchema.keyof().options;

export type FunderField = (typeof FUNDER_FIELDS)[number];
