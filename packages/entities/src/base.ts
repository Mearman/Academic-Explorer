/**
 * Base types and common structures for OpenAlex API
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

// Common ID structures
export interface BaseIds {
  openalex: OpenAlexId;
  wikidata?: WikidataId;
  wikipedia?: string;
  mag?: string;
}

export interface WorkIds extends BaseIds {
  doi?: DOI;
  pmid?: string;
  pmcid?: string;
}

export interface AuthorIds extends BaseIds {
  orcid?: ORCID;
  scopus?: string;
  twitter?: string;
}

export interface SourceIds extends BaseIds {
  issn_l?: string;
  issn?: string[];
  fatcat?: string;
}

export interface InstitutionIds extends BaseIds {
  ror?: RORId;
  grid?: string;
}

export interface ConceptIds extends BaseIds {
  umls_aui?: string[];
  umls_cui?: string[];
}

export interface TopicIds {
  openalex: OpenAlexId;
  wikipedia?: string;
}

export interface PublisherIds {
  openalex: OpenAlexId;
  ror?: RORId;
  wikidata?: WikidataId;
}

export interface FunderIds {
  openalex: OpenAlexId;
  ror?: RORId;
  wikidata?: WikidataId;
  crossref?: string;
  doi?: string;
}

export interface KeywordIds {
  openalex: OpenAlexId;
  wikipedia?: string;
  wikidata?: WikidataId;
}

// Common concept and topic structures
export interface ConceptItem {
  id: OpenAlexId;
  wikidata?: WikidataId;
  display_name: string;
  level: number;
  score: number;
}

export interface TopicItem {
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
}

// Common summary statistics structure
export interface SummaryStats {
  "2yr_mean_citedness": number;
  h_index: number;
  i10_index: number;
}

// APC (Article Processing Charge) structures
export interface APCInfo {
  value: number;
  currency: string;
  value_usd: number;
  provenance: string;
}

export interface APCPrice {
  price: number;
  currency: string;
}

// Utility type for making all fields except id optional (for partial hydration)
export type PartialExceptId<T> = {
  id: T extends { id: infer U } ? U : never;
} & Partial<Omit<T, "id">>;
