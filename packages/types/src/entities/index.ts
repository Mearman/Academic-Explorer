/**
 * Entity index file - only direct exports, no re-exports
 */

export type { EntityType, OpenAlexEntity } from "./entities";
export type { BaseEntity, Author, Work, Institution, Source, Publisher, Funder, Concept, Domain, Field, Subfield, Topic, Keyword, InstitutionEntity } from "./entities";
export {
  getEntityRelationshipQueries,
  getInboundQueries,
  getOutboundQueries,
  hasInboundQueries,
  hasOutboundQueries,
  ENTITY_RELATIONSHIP_QUERIES
} from "./relationship-queries";
export {
  ENTITY_METADATA,
  getEntityMetadata,
  getEntitySingularForm,
  getEntityIdPrefix,
  getEntityRoutePath,
  getEntityIcon,
  getEntityColor,
  getEntityDisplayName,
  getEntityPlural,
  toEntityType,
  toSingularForm,
  isEntityType,
  detectEntityType
} from "./entity-metadata";
export { getEntityType, isOpenAlexEntity } from "./type-guards";