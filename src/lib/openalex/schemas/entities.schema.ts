/**
 * OpenAlex Entity Validation Schemas
 * 
 * Zod schemas for validating OpenAlex API responses and detecting schema changes.
 * These schemas are used to identify missing fields, unexpected fields, and type mismatches
 * in entity data for quality monitoring purposes.
 */

import { z } from 'zod';

// Common utility schemas
const openAlexId = z.string().regex(/^[WASIPFTCKRN]\d{7,10}$/);
const isoDateString = z.string().datetime();
const yearNumber = z.number().int().min(1000).max(new Date().getFullYear() + 10);
const countNumber = z.number().int().min(0);

// External IDs schema
const externalIdsSchema = z.object({
  openalex: z.string().optional(),
  orcid: z.string().optional(),
  doi: z.string().optional(),
  mag: z.string().optional(),
  pmid: z.string().optional(),
  pmcid: z.string().optional(),
  arxiv: z.string().optional(),
  wikipedia: z.string().optional(),
  wikidata: z.string().optional(),
  ror: z.string().optional(),
  grid: z.string().optional(),
  isni: z.string().optional(),
  fundref: z.string().optional(),
  crossref: z.string().optional(),
  issn: z.array(z.string()).optional(),
  issn_l: z.string().optional(),
}).passthrough(); // Allow additional fields

// Counts by year schema
const countsByYearSchema = z.object({
  year: yearNumber,
  works_count: countNumber,
  cited_by_count: countNumber,
}).passthrough();

// APC Price schema
const apcPriceSchema = z.object({
  price: z.number().min(0),
  currency: z.string().length(3), // ISO currency code
}).passthrough();

// Location schema (for works)
const locationSchema = z.object({
  is_oa: z.boolean(),
  landing_page_url: z.string().url().optional(),
  pdf_url: z.string().url().optional(),
  source: z.object({
    id: openAlexId,
    display_name: z.string(),
    issn_l: z.string().optional(),
    issn: z.array(z.string()).optional(),
    is_oa: z.boolean(),
    is_in_doaj: z.boolean(),
    type: z.string(),
    host_organization: z.string().optional(),
    host_organization_name: z.string().optional(),
    host_organization_lineage: z.array(z.string()).optional(),
    host_organization_lineage_names: z.array(z.string()).optional(),
  }).passthrough().optional(),
  license: z.string().optional(),
  license_id: z.string().optional(),
  version: z.string().optional(),
  is_accepted: z.boolean(),
  is_published: z.boolean(),
}).passthrough();

// Open Access schema
const openAccessSchema = z.object({
  is_oa: z.boolean(),
  oa_status: z.enum(['gold', 'green', 'hybrid', 'bronze', 'closed']),
  oa_url: z.string().url().optional(),
  any_repository_has_fulltext: z.boolean(),
}).passthrough();

// Topic schema
const topicSchema = z.object({
  id: openAlexId,
  display_name: z.string(),
  score: z.number().min(0).max(1).optional(),
}).passthrough();

// Concept schema (legacy)
const conceptSchema = z.object({
  id: openAlexId,
  wikidata: z.string().optional(),
  display_name: z.string(),
  level: z.number().int().min(0).max(5),
  score: z.number().min(0).max(1),
}).passthrough();

// Keyword schema
const keywordSchema = z.object({
  id: openAlexId,
  display_name: z.string(),
  score: z.number().min(0).max(1).optional(),
}).passthrough();

// MeSH term schema
const meshTermSchema = z.object({
  descriptor_ui: z.string(),
  descriptor_name: z.string(),
  qualifier_ui: z.string().optional(),
  qualifier_name: z.string().optional(),
  is_major_topic: z.boolean(),
}).passthrough();

// SDG schema
const sdgSchema = z.object({
  id: z.string().url(),
  display_name: z.string(),
  score: z.number().min(0).max(1),
}).passthrough();

// Grant schema
const grantSchema = z.object({
  funder: openAlexId,
  funder_display_name: z.string(),
  award_id: z.string().optional(),
}).passthrough();

// Authorship schema
const authorshipSchema = z.object({
  author_position: z.enum(['first', 'middle', 'last']),
  author: z.object({
    id: openAlexId,
    display_name: z.string(),
    orcid: z.string().url().optional(),
  }).passthrough(),
  institutions: z.array(z.object({
    id: openAlexId,
    display_name: z.string(),
    ror: z.string().optional(),
    country_code: z.string().length(2).optional(),
    type: z.string().optional(),
    lineage: z.array(z.string()).optional(),
  }).passthrough()),
  countries: z.array(z.string()).optional(),
  is_corresponding: z.boolean(),
  raw_author_name: z.string(),
  raw_affiliation_strings: z.array(z.string()),
  affiliations: z.array(z.object({
    raw_affiliation_string: z.string(),
    institution_ids: z.array(z.string()),
  }).passthrough()),
}).passthrough();

// Biblio schema
const biblioSchema = z.object({
  volume: z.string().optional(),
  issue: z.string().optional(),
  first_page: z.string().optional(),
  last_page: z.string().optional(),
}).passthrough();

// Work schema
export const workSchema = z.object({
  id: openAlexId,
  doi: z.string().optional(),
  title: z.string().optional(),
  display_name: z.string(),
  publication_year: yearNumber.optional(),
  publication_date: z.string().optional(), // Should be ISO date but API sometimes returns partial dates
  ids: externalIdsSchema,
  language: z.string().optional(),
  primary_location: locationSchema.optional(),
  type: z.string().optional(),
  type_crossref: z.string().optional(),
  indexed_in: z.array(z.string()).optional(),
  open_access: openAccessSchema,
  authorships: z.array(authorshipSchema),
  countries_distinct_count: countNumber,
  institutions_distinct_count: countNumber,
  corresponding_author_ids: z.array(z.string()).optional(),
  corresponding_institution_ids: z.array(z.string()).optional(),
  apc_list: apcPriceSchema.optional(),
  apc_paid: apcPriceSchema.optional(),
  fwci: z.number().optional(),
  has_fulltext: z.boolean(),
  cited_by_count: countNumber,
  cited_by_percentile_year: z.object({
    min: z.number().min(0).max(100),
    max: z.number().min(0).max(100),
  }).passthrough().optional(),
  biblio: biblioSchema.optional(),
  is_retracted: z.boolean(),
  is_paratext: z.boolean(),
  primary_topic: topicSchema.optional(),
  topics: z.array(topicSchema).optional(),
  keywords: z.array(keywordSchema).optional(),
  concepts: z.array(conceptSchema).optional(),
  mesh: z.array(meshTermSchema).optional(),
  locations_count: countNumber,
  locations: z.array(locationSchema).optional(),
  best_oa_location: locationSchema.optional(),
  sustainable_development_goals: z.array(sdgSchema).optional(),
  grants: z.array(grantSchema).optional(),
  datasets: z.array(z.string()).optional(),
  versions: z.array(z.string()).optional(),
  referenced_works_count: countNumber,
  referenced_works: z.array(z.string()).optional(),
  related_works: z.array(z.string()).optional(),
  abstract_inverted_index: z.record(z.string(), z.array(z.number())).optional(),
  cited_by_api_url: z.string().url(),
  counts_by_year: z.array(countsByYearSchema),
  updated_date: isoDateString,
  created_date: isoDateString,
}).passthrough();

// Author schema
export const authorSchema = z.object({
  id: openAlexId,
  orcid: z.string().url().optional(),
  display_name: z.string(),
  display_name_alternatives: z.array(z.string()).optional(),
  works_count: countNumber,
  cited_by_count: countNumber,
  ids: externalIdsSchema,
  last_known_institutions: z.array(z.object({
    id: openAlexId,
    display_name: z.string(),
    ror: z.string().optional(),
    country_code: z.string().length(2).optional(),
    type: z.string().optional(),
    lineage: z.array(z.string()).optional(),
  }).passthrough()).optional(),
  affiliations: z.array(z.object({
    institution: z.object({
      id: openAlexId,
      display_name: z.string(),
      ror: z.string().optional(),
      country_code: z.string().length(2).optional(),
      type: z.string().optional(),
      lineage: z.array(z.string()).optional(),
    }).passthrough(),
    years: z.array(yearNumber),
  }).passthrough()).optional(),
  topics: z.array(topicSchema).optional(),
  topic_share: z.array(z.object({
    id: openAlexId,
    display_name: z.string(),
    value: z.number().min(0).max(1),
  }).passthrough()).optional(),
  x_concepts: z.array(conceptSchema).optional(),
  works_api_url: z.string().url(),
  updated_date: isoDateString,
  created_date: isoDateString,
  counts_by_year: z.array(countsByYearSchema),
}).passthrough();

// Source schema
export const sourceSchema = z.object({
  id: openAlexId,
  issn_l: z.string().optional(),
  issn: z.array(z.string()).optional(),
  display_name: z.string(),
  host_organization: openAlexId.optional(),
  host_organization_name: z.string().optional(),
  host_organization_lineage: z.array(z.string()).optional(),
  host_organization_lineage_names: z.array(z.string()).optional(),
  works_count: countNumber,
  cited_by_count: countNumber,
  is_oa: z.boolean(),
  is_in_doaj: z.boolean(),
  is_core: z.boolean().optional(),
  ids: externalIdsSchema,
  homepage_url: z.string().url().optional(),
  apc_prices: z.array(apcPriceSchema).optional(),
  apc_usd: z.number().min(0).optional(),
  country_code: z.string().length(2).optional(),
  societies: z.array(z.string()).optional(),
  alternate_titles: z.array(z.string()).optional(),
  abbreviated_title: z.string().optional(),
  type: z.string().optional(),
  topics: z.array(topicSchema).optional(),
  topic_share: z.array(z.object({
    id: openAlexId,
    display_name: z.string(),
    value: z.number().min(0).max(1),
  }).passthrough()).optional(),
  x_concepts: z.array(conceptSchema).optional(),
  works_api_url: z.string().url(),
  updated_date: isoDateString,
  created_date: isoDateString,
  counts_by_year: z.array(countsByYearSchema),
}).passthrough();

// Institution schema
export const institutionSchema = z.object({
  id: openAlexId,
  ror: z.string().optional(),
  display_name: z.string(),
  country_code: z.string().length(2).optional(),
  type: z.string().optional(),
  homepage_url: z.string().url().optional(),
  image_url: z.string().url().optional(),
  image_thumbnail_url: z.string().url().optional(),
  display_name_acronyms: z.array(z.string()).optional(),
  display_name_alternatives: z.array(z.string()).optional(),
  works_count: countNumber,
  cited_by_count: countNumber,
  ids: externalIdsSchema,
  geo: z.object({
    city: z.string().optional(),
    geonames_city_id: z.string().optional(),
    region: z.string().optional(),
    country_code: z.string().length(2).optional(),
    country: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).passthrough().optional(),
  international: z.object({
    display_name: z.record(z.string(), z.string()).optional(),
  }).passthrough().optional(),
  associated_institutions: z.array(z.object({
    id: openAlexId,
    display_name: z.string(),
    ror: z.string().optional(),
    country_code: z.string().length(2).optional(),
    type: z.string().optional(),
    relationship: z.string(),
  }).passthrough()).optional(),
  repositories: z.array(z.object({
    id: openAlexId,
    display_name: z.string(),
    host_organization: openAlexId.optional(),
    host_organization_name: z.string().optional(),
  }).passthrough()).optional(),
  topics: z.array(topicSchema).optional(),
  topic_share: z.array(z.object({
    id: openAlexId,
    display_name: z.string(),
    value: z.number().min(0).max(1),
  }).passthrough()).optional(),
  x_concepts: z.array(conceptSchema).optional(),
  works_api_url: z.string().url(),
  updated_date: isoDateString,
  created_date: isoDateString,
  counts_by_year: z.array(countsByYearSchema),
}).passthrough();

// Publisher schema
export const publisherSchema = z.object({
  id: openAlexId,
  display_name: z.string(),
  alternate_titles: z.array(z.string()).optional(),
  country_codes: z.array(z.string().length(2)).optional(),
  hierarchy_level: z.number().int().min(0).optional(),
  parent_publisher: openAlexId.optional(),
  works_count: countNumber,
  cited_by_count: countNumber,
  ids: externalIdsSchema,
  image_url: z.string().url().optional(),
  image_thumbnail_url: z.string().url().optional(),
  homepage_url: z.string().url().optional(),
  sources_api_url: z.string().url(),
  updated_date: isoDateString,
  created_date: isoDateString,
  counts_by_year: z.array(countsByYearSchema),
}).passthrough();

// Funder schema
export const funderSchema = z.object({
  id: openAlexId,
  display_name: z.string(),
  alternate_titles: z.array(z.string()).optional(),
  country_code: z.string().length(2).optional(),
  description: z.string().optional(),
  homepage_url: z.string().url().optional(),
  image_url: z.string().url().optional(),
  image_thumbnail_url: z.string().url().optional(),
  grants_count: countNumber,
  works_count: countNumber,
  cited_by_count: countNumber,
  ids: externalIdsSchema,
  roles: z.array(z.object({
    role: z.string(),
    id: openAlexId,
    works_count: countNumber,
  }).passthrough()).optional(),
  topics: z.array(topicSchema).optional(),
  topic_share: z.array(z.object({
    id: openAlexId,
    display_name: z.string(),
    value: z.number().min(0).max(1),
  }).passthrough()).optional(),
  x_concepts: z.array(conceptSchema).optional(),
  updated_date: isoDateString,
  created_date: isoDateString,
  counts_by_year: z.array(countsByYearSchema),
}).passthrough();

// Topic schema
export const topicSchemaFull = z.object({
  id: openAlexId,
  display_name: z.string(),
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  ids: externalIdsSchema,
  subfield: z.object({
    id: openAlexId,
    display_name: z.string(),
  }).passthrough().optional(),
  field: z.object({
    id: openAlexId,
    display_name: z.string(),
  }).passthrough().optional(),
  domain: z.object({
    id: openAlexId,
    display_name: z.string(),
  }).passthrough().optional(),
  siblings: z.array(z.object({
    id: openAlexId,
    display_name: z.string(),
  }).passthrough()).optional(),
  works_count: countNumber,
  cited_by_count: countNumber,
  works_api_url: z.string().url(),
  updated_date: isoDateString,
  created_date: isoDateString,
}).passthrough();

// Concept schema (legacy, full)
export const conceptSchemaFull = z.object({
  id: openAlexId,
  wikidata: z.string().url().optional(),
  display_name: z.string(),
  description: z.string().optional(),
  ids: externalIdsSchema,
  image_url: z.string().url().optional(),
  image_thumbnail_url: z.string().url().optional(),
  level: z.number().int().min(0).max(5),
  ancestors: z.array(z.object({
    id: openAlexId,
    wikidata: z.string().optional(),
    display_name: z.string(),
    level: z.number().int().min(0).max(5),
  }).passthrough()).optional(),
  related_concepts: z.array(z.object({
    id: openAlexId,
    wikidata: z.string().optional(),
    display_name: z.string(),
    level: z.number().int().min(0).max(5),
    score: z.number().min(0).max(1),
  }).passthrough()).optional(),
  works_count: countNumber,
  cited_by_count: countNumber,
  works_api_url: z.string().url(),
  updated_date: isoDateString,
  created_date: isoDateString,
  counts_by_year: z.array(countsByYearSchema),
}).passthrough();

// Export all schemas as a map for easy access
export const entitySchemas = {
  work: workSchema,
  author: authorSchema,
  source: sourceSchema,
  institution: institutionSchema,
  publisher: publisherSchema,
  funder: funderSchema,
  topic: topicSchemaFull,
  concept: conceptSchemaFull,
} as const;

// Type exports for validated entities
export type ValidatedWork = z.infer<typeof workSchema>;
export type ValidatedAuthor = z.infer<typeof authorSchema>;
export type ValidatedSource = z.infer<typeof sourceSchema>;
export type ValidatedInstitution = z.infer<typeof institutionSchema>;
export type ValidatedPublisher = z.infer<typeof publisherSchema>;
export type ValidatedFunder = z.infer<typeof funderSchema>;
export type ValidatedTopic = z.infer<typeof topicSchemaFull>;
export type ValidatedConcept = z.infer<typeof conceptSchemaFull>;

// Union type for all validated entities
export type ValidatedEntity = 
  | ValidatedWork
  | ValidatedAuthor
  | ValidatedSource
  | ValidatedInstitution
  | ValidatedPublisher
  | ValidatedFunder
  | ValidatedTopic
  | ValidatedConcept;