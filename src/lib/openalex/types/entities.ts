/**
 * OpenAlex Entity Types
 * Based on OpenAlex API v1 documentation
 */

// Common types
export interface ExternalIds {
  openalex?: string;
  orcid?: string;
  doi?: string;
  mag?: string;
  pmid?: string;
  pmcid?: string;
  arxiv?: string;
  wikipedia?: string;
  wikidata?: string;
  ror?: string;
  grid?: string;
  isni?: string;
  fundref?: string;
  crossref?: string;
  issn?: string[];
  issn_l?: string;
}

export interface CountsByYear {
  year: number;
  works_count: number;
  cited_by_count: number;
}

export interface APCPrice {
  price: number;
  currency: string;
}

export interface Location {
  is_oa: boolean;
  landing_page_url?: string;
  pdf_url?: string;
  source?: {
    id: string;
    display_name: string;
    issn_l?: string;
    issn?: string[];
    is_oa: boolean;
    is_in_doaj: boolean;
    type: string;
    host_organization?: string;
    host_organization_name?: string;
    host_organization_lineage?: string[];
    host_organization_lineage_names?: string[];
  };
  license?: string;
  license_id?: string;
  version?: string;
  is_accepted: boolean;
  is_published: boolean;
}

// Work entity
export interface Work {
  id: string;
  doi?: string;
  title?: string;
  display_name: string;
  publication_year?: number;
  publication_date?: string;
  ids: ExternalIds;
  language?: string;
  primary_location?: Location;
  type?: string;
  type_crossref?: string;
  indexed_in?: string[];
  open_access: {
    is_oa: boolean;
    oa_status: 'gold' | 'green' | 'hybrid' | 'bronze' | 'closed';
    oa_url?: string;
    any_repository_has_fulltext: boolean;
  };
  authorships: Authorship[];
  countries_distinct_count: number;
  institutions_distinct_count: number;
  corresponding_author_ids?: string[];
  corresponding_institution_ids?: string[];
  apc_list?: APCPrice;
  apc_paid?: APCPrice;
  fwci?: number;
  has_fulltext: boolean;
  cited_by_count: number;
  cited_by_percentile_year?: {
    min: number;
    max: number;
  };
  biblio?: {
    volume?: string;
    issue?: string;
    first_page?: string;
    last_page?: string;
  };
  is_retracted: boolean;
  is_paratext: boolean;
  primary_topic?: Topic;
  topics?: Topic[];
  keywords?: Keyword[];
  concepts?: Concept[];
  mesh?: MeshTerm[];
  locations_count: number;
  locations?: Location[];
  best_oa_location?: Location;
  sustainable_development_goals?: SDG[];
  grants?: Grant[];
  datasets?: string[];
  versions?: string[];
  referenced_works_count: number;
  referenced_works?: string[];
  related_works?: string[];
  abstract_inverted_index?: Record<string, number[]>;
  cited_by_api_url: string;
  counts_by_year: CountsByYear[];
  updated_date: string;
  created_date: string;
}

export interface Authorship {
  author_position: 'first' | 'middle' | 'last';
  author: {
    id: string;
    display_name: string;
    orcid?: string;
  };
  institutions: {
    id: string;
    display_name: string;
    ror?: string;
    country_code?: string;
    type?: string;
    lineage?: string[];
  }[];
  countries?: string[];
  is_corresponding: boolean;
  raw_author_name: string;
  raw_affiliation_strings: string[];
  affiliations: {
    raw_affiliation_string: string;
    institution_ids: string[];
  }[];
}

// Author entity
export interface Author {
  id: string;
  orcid?: string;
  display_name: string;
  display_name_alternatives?: string[];
  works_count: number;
  cited_by_count: number;
  summary_stats: {
    '2yr_mean_citedness': number;
    h_index: number;
    i10_index: number;
  };
  ids: ExternalIds;
  affiliations: Affiliation[];
  last_known_institutions?: Institution[];
  topics?: Topic[];
  counts_by_year: CountsByYear[];
  works_api_url: string;
  updated_date: string;
  created_date: string;
}

export interface Affiliation {
  institution: {
    id: string;
    ror?: string;
    display_name: string;
    country_code?: string;
    type?: string;
    lineage?: string[];
  };
  years: number[];
}

// Source (Journal/Conference) entity
export interface Source {
  id: string;
  issn_l?: string;
  issn?: string[];
  display_name: string;
  host_organization?: string;
  host_organization_name?: string;
  host_organization_lineage?: string[];
  works_count: number;
  cited_by_count: number;
  summary_stats: {
    '2yr_mean_citedness': number;
    h_index: number;
    i10_index: number;
  };
  is_oa: boolean;
  is_in_doaj: boolean;
  is_core: boolean;
  ids: ExternalIds;
  homepage_url?: string;
  apc_prices?: APCPrice[];
  apc_usd?: number;
  country_code?: string;
  societies?: Society[];
  alternate_titles?: string[];
  abbreviated_title?: string;
  type: 'journal' | 'repository' | 'conference' | 'ebook-platform' | 'book-series' | 'other';
  topics?: Topic[];
  counts_by_year: CountsByYear[];
  works_api_url: string;
  updated_date: string;
  created_date: string;
}

// Institution entity
export interface Institution {
  id: string;
  ror?: string;
  display_name: string;
  display_name_alternatives?: string[];
  display_name_acronyms?: string[];
  country_code?: string;
  type: 'education' | 'healthcare' | 'company' | 'archive' | 'nonprofit' | 'government' | 'facility' | 'other';
  type_id: string;
  lineage?: string[];
  homepage_url?: string;
  image_url?: string;
  image_thumbnail_url?: string;
  associated_institutions?: AssociatedInstitution[];
  geo?: {
    city?: string;
    geonames_city_id?: string;
    region?: string;
    country_code?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  international?: {
    display_name: Record<string, string>;
  };
  repositories?: string[];
  relationship?: 'parent' | 'child' | 'related';
  ids: ExternalIds;
  works_count: number;
  cited_by_count: number;
  summary_stats: {
    '2yr_mean_citedness': number;
    h_index: number;
    i10_index: number;
  };
  topics?: Topic[];
  counts_by_year: CountsByYear[];
  roles?: Role[];
  works_api_url: string;
  updated_date: string;
  created_date: string;
}

export interface AssociatedInstitution {
  id: string;
  ror?: string;
  display_name: string;
  country_code?: string;
  type: string;
  relationship: 'parent' | 'child' | 'related';
}

// Publisher entity
export interface Publisher {
  id: string;
  display_name: string;
  display_name_alternatives?: string[];
  hierarchy_level: number;
  parent_publisher?: string;
  lineage?: string[];
  country_codes?: string[];
  homepage_url?: string;
  image_url?: string;
  image_thumbnail_url?: string;
  works_count: number;
  cited_by_count: number;
  summary_stats: {
    '2yr_mean_citedness': number;
    h_index: number;
    i10_index: number;
  };
  ids: ExternalIds;
  sources?: string[];
  counts_by_year: CountsByYear[];
  roles?: Role[];
  works_api_url: string;
  updated_date: string;
  created_date: string;
}

// Funder entity
export interface Funder {
  id: string;
  display_name: string;
  display_name_alternatives?: string[];
  country_code?: string;
  description?: string;
  homepage_url?: string;
  image_url?: string;
  image_thumbnail_url?: string;
  grants_count: number;
  works_count: number;
  cited_by_count: number;
  summary_stats: {
    '2yr_mean_citedness': number;
    h_index: number;
    i10_index: number;
  };
  ids: ExternalIds;
  counts_by_year: CountsByYear[];
  roles?: Role[];
  works_api_url: string;
  updated_date: string;
  created_date: string;
}

// Topic entity
export interface Topic {
  id: string;
  display_name: string;
  subfield?: {
    id: string;
    display_name: string;
  };
  field?: {
    id: string;
    display_name: string;
  };
  domain?: {
    id: string;
    display_name: string;
  };
  keywords?: string[];
  siblings?: Topic[];
  works_count: number;
  cited_by_count: number;
  ids: ExternalIds;
  works_api_url: string;
  updated_date: string;
  created_date: string;
}

// Concept entity (legacy, being phased out)
export interface Concept {
  id: string;
  wikidata?: string;
  display_name: string;
  level: number;
  score?: number;
  description?: string;
  works_count: number;
  cited_by_count: number;
  ids: ExternalIds;
  image_url?: string;
  image_thumbnail_url?: string;
  international?: {
    display_name: Record<string, string>;
    description?: Record<string, string>;
  };
  ancestors?: Concept[];
  related_concepts?: Concept[];
  counts_by_year: CountsByYear[];
  works_api_url: string;
  updated_date: string;
  created_date: string;
}

// Keyword entity
export interface Keyword {
  id: string;
  display_name: string;
  score?: number;
  works_count: number;
  cited_by_count: number;
  works_api_url: string;
  updated_date: string;
  created_date: string;
}

// Geo entities
export interface Continent {
  id: string;
  display_name: string;
  wikidata?: string;
  works_count: number;
  cited_by_count: number;
}

export interface Region {
  id: string;
  display_name: string;
  description?: string;
  wikidata?: string;
  works_count: number;
  cited_by_count: number;
}

// Supporting types
export interface Grant {
  funder: string;
  funder_display_name?: string;
  award_id?: string;
}

export interface MeshTerm {
  descriptor_ui?: string;
  descriptor_name?: string;
  qualifier_ui?: string;
  qualifier_name?: string;
  is_major_topic: boolean;
}

export interface SDG {
  id: string;
  display_name: string;
  score: number;
}

export interface Society {
  url?: string;
  display_name?: string;
}

export interface Role {
  role: 'funder' | 'institution' | 'publisher';
  id: string;
  works_count: number;
}

// Type guards
export function isWork(entity: unknown): entity is Work {
  return typeof entity === 'object' && entity !== null && 'authorships' in entity;
}

export function isAuthor(entity: unknown): entity is Author {
  return typeof entity === 'object' && entity !== null && 'affiliations' in entity && !('authorships' in entity);
}

export function isSource(entity: unknown): entity is Source {
  return typeof entity === 'object' && entity !== null && 'is_oa' in entity && 'is_in_doaj' in entity;
}

export function isInstitution(entity: unknown): entity is Institution {
  return typeof entity === 'object' && entity !== null && 'type' in entity && 'geo' in entity;
}

export function isPublisher(entity: unknown): entity is Publisher {
  return typeof entity === 'object' && entity !== null && 'hierarchy_level' in entity;
}

export function isFunder(entity: unknown): entity is Funder {
  return typeof entity === 'object' && entity !== null && 'grants_count' in entity;
}

export function isTopic(entity: unknown): entity is Topic {
  return typeof entity === 'object' && entity !== null && 'subfield' in entity;
}

export function isConcept(entity: unknown): entity is Concept {
  return typeof entity === 'object' && entity !== null && 'level' in entity;
}

export function isContinent(entity: unknown): entity is Continent {
  return typeof entity === 'object' && entity !== null && 'display_name' in entity && 'works_count' in entity && 'cited_by_count' in entity && !('description' in entity);
}

export function isRegion(entity: unknown): entity is Region {
  return typeof entity === 'object' && entity !== null && 'display_name' in entity && 'works_count' in entity && 'cited_by_count' in entity && 'description' in entity;
}