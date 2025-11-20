/**
 * Entity Relationship Query Registry
 *
 * Centralized configuration for querying related entities via OpenAlex API.
 * Defines inbound and outbound relationship queries for each entity type.
 *
 * @module relationship-queries
 */

import type { EntityType } from './entities';

/**
 * Relationship type string literals (matches graph package RelationType enum)
 * Defined here to avoid circular dependency between types and graph packages
 */
export type RelationshipTypeString =
  | 'AUTHORSHIP'
  | 'AFFILIATION'
  | 'PUBLICATION'
  | 'REFERENCE'
  | 'TOPIC'
  | 'HOST_ORGANIZATION'
  | 'LINEAGE'
  | 'AUTHOR_RESEARCHES'
  | 'FUNDED_BY'
  | 'TOPIC_PART_OF_FIELD'
  | 'FIELD_PART_OF_DOMAIN';

/**
 * Configuration for a single relationship query
 *
 * @template SourceType - The type of the source entity (the entity we're querying from)
 * @template TargetType - The type of the target entity (the entity type returned by the query)
 */
export interface RelationshipQueryConfig<
  SourceType extends EntityType = EntityType,
  TargetType extends EntityType = EntityType
> {
  /** The type of relationship (e.g., AUTHORSHIP, REFERENCE) */
  type: RelationshipTypeString;

  /** The target entity type to query (e.g., 'works', 'authors') */
  targetType: TargetType;

  /** Human-readable label for this relationship */
  label: string;

  /**
   * Build the OpenAlex API filter string for this relationship
   * @param entityId - The ID of the source entity
   * @returns Filter string (e.g., "author.id:A123")
   */
  buildFilter: (entityId: string) => string;

  /** Optional: Page size for pagination (default: 25) */
  pageSize?: number;

  /** Optional: Fields to select in the API response */
  select?: string[];
}

/**
 * Complete relationship query configuration for an entity type
 */
export interface EntityRelationshipQueries {
  /** Inbound relationships (other entities → this entity) */
  inbound: RelationshipQueryConfig[];

  /** Outbound relationships (this entity → other entities) */
  outbound: RelationshipQueryConfig[];
}

/**
 * Registry mapping each entity type to its relationship queries
 */
export const ENTITY_RELATIONSHIP_QUERIES: Record<EntityType, EntityRelationshipQueries> = {
  /**
   * Authors
   * - Outbound: Institutions, topics (from embedded data in affiliations[], topics[])
   * - Inbound: Works they authored (cross-type: author.id filter on works endpoint)
   */
  authors: {
    inbound: [
      {
        type: 'AUTHORSHIP',
        targetType: 'works',
        label: 'Works Authored',
        buildFilter: (id) => `author.id:${id}`,
        pageSize: 25,
        select: ['id', 'display_name', 'publication_year', 'type', 'cited_by_count'],
      },
    ],
    outbound: [],
  },

  /**
   * Works
   * - Outbound: Referenced works (same-type query), authors/sources/topics (from embedded data)
   * - Inbound: Works that cite this work (same-type query via cites filter)
   */
  works: {
    inbound: [
      {
        type: 'REFERENCE',
        targetType: 'works',
        label: 'Cited By (Citing Works)',
        buildFilter: (id) => `cites:${id}`,
        pageSize: 25,
        select: ['id', 'display_name', 'publication_year', 'type', 'cited_by_count'],
      },
    ],
    outbound: [
      {
        type: 'REFERENCE',
        targetType: 'works',
        label: 'References (Referenced Works)',
        buildFilter: (id) => `referenced_works:${id}`,
        pageSize: 25,
        select: ['id', 'display_name', 'publication_year', 'type', 'cited_by_count'],
      },
    ],
  },

  /**
   * Institutions
   * - Outbound: Child institutions (same-type query via lineage filter), parent via embedded lineage[]
   * - Inbound: Authors affiliated, works from institution (cross-type queries)
   */
  institutions: {
    inbound: [
      {
        type: 'AFFILIATION',
        targetType: 'authors',
        label: 'Affiliated Authors',
        buildFilter: (id) => `last_known_institutions.id:${id}`,
        pageSize: 25,
        select: ['id', 'display_name', 'orcid', 'works_count', 'cited_by_count'],
      },
      {
        type: 'AFFILIATION',
        targetType: 'works',
        label: 'Works from Institution',
        buildFilter: (id) => `institutions.id:${id}`,
        pageSize: 25,
        select: ['id', 'display_name', 'publication_year', 'type', 'cited_by_count'],
      },
    ],
    outbound: [
      {
        type: 'LINEAGE',
        targetType: 'institutions',
        label: 'Child Institutions',
        buildFilter: (id) => `lineage:${id}`,
        pageSize: 25,
        select: ['id', 'display_name', 'country_code', 'type', 'works_count'],
      },
    ],
  },

  /**
   * Sources (journals, conferences)
   * - Outbound: Publisher/host organization (from embedded data)
   * - Inbound: Works published in this source
   */
  sources: {
    inbound: [
      {
        type: 'PUBLICATION',
        targetType: 'works',
        label: 'Published Works',
        buildFilter: (id) => `primary_location.source.id:${id}`,
        pageSize: 25,
        select: ['id', 'display_name', 'publication_year', 'type', 'cited_by_count'],
      },
    ],
    outbound: [],
  },

  /**
   * Topics
   * - Outbound: Field, domain (from embedded data)
   * - Inbound: Works on this topic, authors researching this topic
   */
  topics: {
    inbound: [
      {
        type: 'TOPIC',
        targetType: 'works',
        label: 'Works on Topic',
        buildFilter: (id) => `topics.id:${id}`,
        pageSize: 25,
        select: ['id', 'display_name', 'publication_year', 'type', 'cited_by_count'],
      },
      {
        type: 'AUTHOR_RESEARCHES',
        targetType: 'authors',
        label: 'Authors Researching',
        buildFilter: (id) => `topics.id:${id}`,
        pageSize: 25,
        select: ['id', 'display_name', 'orcid', 'works_count', 'cited_by_count'],
      },
    ],
    outbound: [],
  },

  /**
   * Concepts (deprecated, replaced by topics)
   * - Legacy entity type, minimal relationship support
   */
  concepts: {
    inbound: [],
    outbound: [],
  },

  /**
   * Publishers
   * - Outbound: None
   * - Inbound: Sources they host
   */
  publishers: {
    inbound: [
      {
        type: 'HOST_ORGANIZATION',
        targetType: 'sources',
        label: 'Hosted Sources',
        buildFilter: (id) => `host_organization:${id}`,
        pageSize: 25,
        select: ['id', 'display_name', 'issn_l', 'type', 'works_count'],
      },
    ],
    outbound: [],
  },

  /**
   * Funders
   * - Outbound: None
   * - Inbound: Works they funded
   */
  funders: {
    inbound: [
      {
        type: 'FUNDED_BY',
        targetType: 'works',
        label: 'Funded Works',
        buildFilter: (id) => `grants.funder:${id}`,
        pageSize: 25,
        select: ['id', 'display_name', 'publication_year', 'type', 'cited_by_count'],
      },
    ],
    outbound: [],
  },

  /**
   * Keywords
   * - New entity type, minimal relationship support for now
   */
  keywords: {
    inbound: [],
    outbound: [],
  },
};

/**
 * Get relationship query configurations for a specific entity type
 *
 * @param entityType - The type of entity (e.g., 'authors', 'works')
 * @returns Inbound and outbound relationship query configurations
 */
export function getEntityRelationshipQueries(
  entityType: EntityType
): EntityRelationshipQueries {
  return ENTITY_RELATIONSHIP_QUERIES[entityType];
}

/**
 * Get all inbound query configurations for an entity type
 *
 * @param entityType - The type of entity
 * @returns Array of inbound relationship query configurations
 */
export function getInboundQueries(entityType: EntityType): RelationshipQueryConfig[] {
  return ENTITY_RELATIONSHIP_QUERIES[entityType].inbound;
}

/**
 * Get all outbound query configurations for an entity type
 *
 * @param entityType - The type of entity
 * @returns Array of outbound relationship query configurations
 */
export function getOutboundQueries(entityType: EntityType): RelationshipQueryConfig[] {
  return ENTITY_RELATIONSHIP_QUERIES[entityType].outbound;
}

/**
 * Check if an entity type has any inbound queries configured
 *
 * @param entityType - The type of entity
 * @returns True if inbound queries exist
 */
export function hasInboundQueries(entityType: EntityType): boolean {
  return ENTITY_RELATIONSHIP_QUERIES[entityType].inbound.length > 0;
}

/**
 * Check if an entity type has any outbound queries configured
 *
 * @param entityType - The type of entity
 * @returns True if outbound queries exist
 */
export function hasOutboundQueries(entityType: EntityType): boolean {
  return ENTITY_RELATIONSHIP_QUERIES[entityType].outbound.length > 0;
}
