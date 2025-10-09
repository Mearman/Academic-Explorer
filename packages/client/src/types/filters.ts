/**
 * Filter interfaces for OpenAlex API queries
 */

import type { DateString, NumericFilter } from "./base";

// Base filter types
export interface BaseEntityFilters {
  cited_by_count?: NumericFilter;
  "default.search"?: string;
  "display_name.search"?: string;
  from_created_date?: DateString;
  from_updated_date?: DateString;
  to_created_date?: DateString;
  to_updated_date?: DateString;
  works_count?: NumericFilter;
}

export interface BaseEntityWithTopicsFilters extends BaseEntityFilters {
  "topics.id"?: string | string[];
  "x_concepts.id"?: string | string[];
}

// Entity-specific filter interfaces
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

export interface AuthorsFilters extends BaseEntityWithTopicsFilters {
  "affiliations.institution.id"?: string | string[];
  "affiliations.institution.ror"?: string | string[];
  "affiliations.institution.country_code"?: string | string[];
  has_orcid?: boolean;
  "last_known_institution.id"?: string | string[];
  "last_known_institution.ror"?: string | string[];
  "last_known_institution.country_code"?: string | string[];
  orcid?: string | string[];
}

export interface SourcesFilters extends BaseEntityWithTopicsFilters {
  apc_usd?: NumericFilter;
  country_code?: string | string[];
  has_issn?: boolean;
  host_organization?: string | string[];
  host_organization_lineage?: string | string[];
  "ids.issn"?: string | string[];
  is_in_doaj?: boolean;
  is_oa?: boolean;
  issn?: string | string[];
  publisher?: string | string[];
  type?: string | string[];
}

export interface InstitutionsFilters extends BaseEntityWithTopicsFilters {
  "associated_institutions.id"?: string | string[];
  country_code?: string | string[];
  has_ror?: boolean;
  is_global_south?: boolean;
  lineage?: string | string[];
  ror?: string | string[];
  type?: string | string[];
}

export interface TopicsFilters extends BaseEntityFilters {
  "domain.id"?: string | string[];
  "field.id"?: string | string[];
  "keywords.search"?: string;
  "subfield.id"?: string | string[];
}

export interface ConceptsFilters extends BaseEntityFilters {
  level?: number | string;
  wikidata?: string | string[];
}

export interface PublishersFilters extends BaseEntityFilters {
  country_codes?: string | string[];
  lineage?: string | string[];
  parent_publisher?: string | string[];
}

export interface FundersFilters extends BaseEntityFilters {
  country_code?: string | string[];
  grants_count?: NumericFilter;
  "topics.id"?: string | string[];
}

export type KeywordsFilters = BaseEntityFilters;

// Union type for all entity filters
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
