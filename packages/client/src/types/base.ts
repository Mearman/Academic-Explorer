/**
 * Base types and common structures for OpenAlex API
 *
 * Re-exports from @academic-explorer/types package to avoid duplication.
 */

// Re-export all base types from the types package
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
} from "@academic-explorer/types/entities";
