/**
 * Filter types and schemas for OpenAlex API queries
 */

import { z } from "zod";
import type { EntityType } from "./entities";

// Base filter types inferred from schemas
export type BaseEntityFilters = z.infer<typeof BaseEntityFiltersSchema>;
export type BaseEntityWithTopicsFilters = z.infer<
  typeof BaseEntityWithTopicsFiltersSchema
>;

// Entity-specific filter types inferred from schemas
export type WorksFilters = z.infer<typeof WorksFiltersSchema>;
export type AuthorsFilters = z.infer<typeof AuthorsFiltersSchema>;
export type SourcesFilters = z.infer<typeof SourcesFiltersSchema>;
export type InstitutionsFilters = z.infer<typeof InstitutionsFiltersSchema>;
export type TopicsFilters = z.infer<typeof TopicsFiltersSchema>;
export type ConceptsFilters = z.infer<typeof ConceptsFiltersSchema>;
export type PublishersFilters = z.infer<typeof PublishersFiltersSchema>;
export type FundersFilters = z.infer<typeof FundersFiltersSchema>;
export type KeywordsFilters = z.infer<typeof KeywordsFiltersSchema>;

// Union type for all entity filters
export type EntityFilters = Record<string, unknown>;

// ============================================================================
// ZOD SCHEMAS FOR FILTER VALIDATION AND TYPE INFERENCE
// ============================================================================

// Base schemas
export const BaseEntityFiltersSchema = z
  .object({
    cited_by_count: z.union([z.string(), z.number()]).optional(),
    display_name: z.string().optional(),
    from_created_date: z.string().optional(),
    to_created_date: z.string().optional(),
    from_updated_date: z.string().optional(),
    to_updated_date: z.string().optional(),
  })
  .catchall(z.unknown());

export const BaseEntityWithTopicsFiltersSchema = BaseEntityFiltersSchema.extend(
  {
    has_topics: z.boolean().optional(),
    topics: z.string().optional(),
  },
);

// Entity-specific filter schemas
export const WorksFiltersSchema = BaseEntityFiltersSchema.extend({
  doi: z.string().optional(),
  title: z.string().optional(),
  abstract: z.string().optional(),
  publication_year: z.union([z.string(), z.number()]).optional(),
  publication_date: z.string().optional(),
  authors: z.string().optional(),
  institutions: z.string().optional(),
  countries: z.string().optional(),
  type: z.union([z.string(), z.array(z.string())]).optional(),
  type_crossref: z.string().optional(),
  open_access: z.string().optional(),
  has_fulltext: z.boolean().optional(),
  is_retracted: z.boolean().optional(),
  is_paratext: z.boolean().optional(),
  concepts: z.string().optional(),
  topics: z.string().optional(),
  keywords: z.string().optional(),
  language: z.string().optional(),
  journal: z.string().optional(),
  publisher: z.string().optional(),
  from_publication_date: z.string().optional(),
  to_publication_date: z.string().optional(),
  is_oa: z.boolean().optional(),
  referenced_works: z.string().optional(),
  "ids.openalex": z.string().optional(),
  "authorships.author.id": z.string().optional(),
  "authorships.institutions.id": z.string().optional(),
  "primary_location.source.id": z.string().optional(),
}).catchall(z.unknown());

export const AuthorsFiltersSchema = BaseEntityWithTopicsFiltersSchema.extend({
  orcid: z.string().optional(),
  has_orcid: z.boolean().optional(),
  last_known_institutions: z.string().optional(),
  x_concepts: z.string().optional(),
  publication_year: z.union([z.string(), z.number()]).optional(),
  is_oa: z.boolean().optional(),
  type: z.union([z.string(), z.array(z.string())]).optional(),
  "primary_topic.id": z.union([z.string(), z.array(z.string())]).optional(),
  "authorships.author.id": z.string().optional(),
}).catchall(z.unknown());

export const SourcesFiltersSchema = BaseEntityFiltersSchema.extend({
  issn: z.string().optional(),
  issn_l: z.string().optional(),
  publisher: z.string().optional(),
  type: z.string().optional(),
  is_oa: z.boolean().optional(),
  is_in_doaj: z.boolean().optional(),
  host_organization: z.string().optional(),
  x_concepts: z.string().optional(),
  topics: z.string().optional(),
  country_code: z.string().optional(),
  "ids.issn": z.string().optional(),
}).catchall(z.unknown());

export const InstitutionsFiltersSchema =
  BaseEntityWithTopicsFiltersSchema.extend({
    ror: z.string().optional(),
    country_code: z.string().optional(),
    type: z.string().optional(),
    x_concepts: z.string().optional(),
  }).catchall(z.unknown());

export const TopicsFiltersSchema = BaseEntityFiltersSchema.extend({
  description: z.string().optional(),
  keywords: z.string().optional(),
  subfield: z.string().optional(),
  field: z.string().optional(),
  domain: z.string().optional(),
}).catchall(z.unknown());

export const ConceptsFiltersSchema = BaseEntityFiltersSchema.extend({
  description: z.string().optional(),
  level: z.string().optional(),
  ancestors: z.string().optional(),
  wikidata: z.string().optional(),
  works_count: z.union([z.string(), z.number()]).optional(),
}).catchall(z.unknown());

export const PublishersFiltersSchema = BaseEntityFiltersSchema.extend({
  country_codes: z.union([z.string(), z.array(z.string())]).optional(),
  hierarchy_level: z.string().optional(),
  parent_publisher: z.string().optional(),
  ror: z.string().optional(),
  x_concepts: z.string().optional(),
  topics: z.string().optional(),
  lineage: z.string().optional(),
}).catchall(z.unknown());

export const FundersFiltersSchema = BaseEntityFiltersSchema.extend({
  country_code: z.union([z.string(), z.array(z.string())]).optional(),
  grants_count: z.string().optional(),
  works_count: z.string().optional(),
  cited_by_count: z.string().optional(),
  alternate_titles: z.string().optional(),
  "topics.id": z.string().optional(),
}).catchall(z.unknown());

export const KeywordsFiltersSchema = BaseEntityFiltersSchema.extend({
  works_count: z.string().optional(),
  cited_by_count: z.string().optional(),
}).catchall(z.unknown());

// Union schema for runtime validation
export const EntityFiltersSchema = z.record(z.string(), z.unknown());
