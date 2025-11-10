/**
 * Entity interfaces for OpenAlex API
 *
 * Re-exports from @academic-explorer/types package to avoid duplication.
 */

// Re-export all entity types from the types package
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
} from "@academic-explorer/types/entities";

// Re-export field constants
export {
  keysOf,
  BASE_ENTITY_FIELDS,
  ENTITY_WITH_WORKS_FIELDS,
  AUTHOR_FIELDS,
  WORK_FIELDS,
  SOURCE_FIELDS,
  INSTITUTION_FIELDS,
  CONCEPT_FIELDS,
  TOPIC_FIELDS,
  PUBLISHER_FIELDS,
  FUNDER_FIELDS,
  KEYWORD_FIELDS,
} from "@academic-explorer/types/entities";

// Re-export field type definitions
export type {
  BaseEntityField,
  EntityWithWorksField,
  AuthorField,
  WorkField,
  SourceField,
  InstitutionField,
  ConceptField,
  TopicField,
  PublisherField,
  FunderField,
  KeywordField,
} from "@academic-explorer/types/entities";
