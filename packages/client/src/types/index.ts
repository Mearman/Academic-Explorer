/**
 * Re-export all OpenAlex API TypeScript types
 */

// Base types and common structures
export type {
  OpenAlexId,
  DOI,
  ORCID,
  RORId,
  ISSNId,
  WikidataId,
  DateString,
  NumericFilter,
  BaseIds,
  WorkIds,
  AuthorIds,
  SourceIds,
  InstitutionIds,
  ConceptIds,
  TopicIds,
  PublisherIds,
  FunderIds,
  KeywordIds,
  ConceptItem,
  TopicItem,
  SummaryStats,
  APCInfo,
  APCPrice,
  PartialExceptId,
} from "./base";

// Entity interfaces
export type {
  BaseEntity,
  EntityWithWorks,
  CountsByYear,
  Location,
  Institution,
  Authorship,
  Work,
  PartialWork,
  Author,
  PartialAuthor,
  Source,
  InstitutionEntity,
  Concept,
  Topic,
  Publisher,
  Funder,
  Keyword,
  KeywordCountsByYear,
  PartialSource,
  PartialInstitution,
  OpenAlexEntity,
  EntityType,
  EntityTypeMap,
} from "./entities";

// Filter interfaces
export type {
  BaseEntityFilters,
  BaseEntityWithTopicsFilters,
  WorksFilters,
  AuthorsFilters,
  SourcesFilters,
  InstitutionsFilters,
  TopicsFilters,
  ConceptsFilters,
  PublishersFilters,
  FundersFilters,
  KeywordsFilters,
  EntityFilters,
} from "./filters";

// Common utility types
export type {
  OpenAlexResponse,
  QueryParams,
  StatsParams,
  SampleParams,
  GroupParams,
  AutocompleteResult,
  NGram,
  OpenAlexError,
  TextAnalysis,
} from "./common";
