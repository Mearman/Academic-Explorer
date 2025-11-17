/**
 * Contract: Relationship Detection Service
 *
 * Defines the interface for detecting and creating graph edges from OpenAlex entity data.
 * This contract ensures correct edge direction (source = data owner, target = referenced entity)
 * and proper metadata extraction from OpenAlex relationship fields.
 *
 * Location: apps/web/src/services/relationship-detection-service.ts
 */

import type { RelationType, GraphEdge, EdgeDirection } from '@academic-explorer/graph';
import type { Work, Author, Source, Institution, Publisher, Funder, Topic } from '@academic-explorer/types';

/**
 * OpenAlex entity type union
 */
export type OpenAlexEntity = Work | Author | Source | Institution | Publisher | Funder | Topic;

/**
 * Relationship detection result
 */
export interface DetectedRelationship {
  /** OpenAlex ID of entity that owns the relationship data */
  sourceNodeId: string;
  /** OpenAlex ID of referenced entity */
  targetNodeId: string;
  /** Relationship type (noun form matching OpenAlex field names) */
  relationType: RelationType;
  /** Direction classification */
  direction: EdgeDirection;
  /** Human-readable label */
  label: string;
  /** OpenAlex relationship metadata specific to type */
  metadata?: Record<string, unknown>;
}

/**
 * Main service interface for relationship detection
 */
export interface IRelationshipDetectionService {
  /**
   * Detect all outbound relationships from an OpenAlex entity
   *
   * @param entity - OpenAlex entity (Work, Author, Source, Institution, Publisher, Funder, Topic)
   * @returns Array of detected relationships with correct source/target direction
   *
   * @example
   * ```typescript
   * const work: Work = await client.getWork('W2741809807');
   * const relationships = detectRelationships(work);
   * // Returns edges like:
   * // { sourceNodeId: 'W2741809807', targetNodeId: 'A2208157607', type: 'AUTHORSHIP', direction: 'outbound', ... }
   * // { sourceNodeId: 'W2741809807', targetNodeId: 'W2118041844', type: 'REFERENCE', direction: 'outbound', ... }
   * ```
   */
  detectRelationships(entity: OpenAlexEntity): DetectedRelationship[];

  /**
   * Convert detected relationship to GraphEdge
   *
   * @param relationship - Detected relationship from detectRelationships()
   * @returns GraphEdge ready for graph storage
   */
  toGraphEdge(relationship: DetectedRelationship): GraphEdge;
}

/**
 * Type-specific detection functions
 * Each function extracts relationships from a specific OpenAlex field
 */
export interface ITypeSpecificDetectors {
  /**
   * Detect AUTHORSHIP edges from Work.authorships[]
   *
   * Direction: Work (source) → Author (target)
   * Metadata: author_position, is_corresponding, institutions, raw_affiliation_strings
   */
  detectAuthorships(work: Work): DetectedRelationship[];

  /**
   * Detect REFERENCE edges from Work.referenced_works[]
   *
   * Direction: Work (source) → Referenced Work (target)
   * Metadata: None (OpenAlex provides only IDs)
   */
  detectReferences(work: Work): DetectedRelationship[];

  /**
   * Detect PUBLICATION edge from Work.primary_location.source
   *
   * Direction: Work (source) → Source (target)
   * Metadata: is_oa, landing_page_url, pdf_url, version, license
   */
  detectPublication(work: Work): DetectedRelationship | null;

  /**
   * Detect TOPIC edges from Work.topics[]
   *
   * Direction: Work (source) → Topic (target)
   * Metadata: score, subfield, field, domain
   */
  detectTopics(work: Work): DetectedRelationship[];

  /**
   * Detect AFFILIATION edges from Author.affiliations[]
   *
   * Direction: Author (source) → Institution (target)
   * Metadata: years, institution details
   */
  detectAffiliations(author: Author): DetectedRelationship[];

  /**
   * Detect HOST_ORGANIZATION edge from Source.host_organization
   *
   * Direction: Source (source) → Publisher (target)
   * Metadata: lineage
   */
  detectHostOrganization(source: Source): DetectedRelationship | null;

  /**
   * Detect LINEAGE edges from Institution.lineage[]
   *
   * Direction: Institution (source) → Parent Institution (target)
   * Metadata: None (OpenAlex provides only IDs)
   */
  detectLineage(institution: Institution): DetectedRelationship[];
}

/**
 * Graph re-detection service for existing graphs
 * Used when loading graphs to correct edge directions
 */
export interface IGraphRedetectionService {
  /**
   * Re-detect all edges for a graph from stored entity data
   *
   * @param entities - Array of OpenAlex entities stored in graph
   * @returns Array of GraphEdges with corrected directions and metadata
   *
   * @performance Must complete in <2 seconds for graphs with <100 entities
   *
   * @example
   * ```typescript
   * const storedGraph = await graphStore.load('graph-123');
   * const correctedEdges = redetectEdges(storedGraph.entities);
   * await graphStore.update('graph-123', { edges: correctedEdges });
   * ```
   */
  redetectEdges(entities: OpenAlexEntity[]): GraphEdge[];
}

/**
 * Edge direction classifier
 * Determines whether an edge is outbound or inbound based on OpenAlex data
 */
export interface IEdgeDirectionClassifier {
  /**
   * Classify edge direction based on OpenAlex entity data
   *
   * @param sourceEntity - OpenAlex entity that would be edge source
   * @param targetEntityId - OpenAlex ID of potential target
   * @param relationType - Relationship type to check
   * @returns 'outbound' if source entity contains relationship data, 'inbound' if discovered via reverse lookup
   *
   * @example
   * ```typescript
   * const work: Work = await client.getWork('W123');
   * const direction = classifyDirection(work, 'A456', 'AUTHORSHIP');
   * // Returns 'outbound' because work.authorships[] contains A456
   *
   * const citingDirection = classifyDirection(work, 'W789', 'REFERENCE');
   * // Returns 'inbound' if W789 cites W123 (found by querying, not stored on W123)
   * ```
   */
  classifyDirection(
    sourceEntity: OpenAlexEntity,
    targetEntityId: string,
    relationType: RelationType
  ): EdgeDirection;
}

/**
 * Contract validation rules
 */
export const CONTRACT_VALIDATION_RULES = {
  /**
   * All detected relationships MUST have source = entity ID that owns the data
   */
  SOURCE_IS_DATA_OWNER: 'source field must match entity ID containing relationship field',

  /**
   * All detected relationships MUST have target = referenced entity ID
   */
  TARGET_IS_REFERENCED: 'target field must match referenced entity ID from OpenAlex field',

  /**
   * RelationType MUST use noun form matching OpenAlex field names
   */
  TYPE_MATCHES_FIELD: 'relationType must be noun form of OpenAlex field (e.g., authorships → AUTHORSHIP)',

  /**
   * Direction MUST be 'outbound' for relationships stored on source entity
   */
  OUTBOUND_STORED_ON_SOURCE: 'direction must be "outbound" if relationship data stored in source entity',

  /**
   * Direction MUST be 'inbound' for relationships requiring reverse lookup
   */
  INBOUND_REQUIRES_QUERY: 'direction must be "inbound" if relationship requires querying other entities',

  /**
   * Metadata MUST match type-specific schema from data-model.md
   */
  METADATA_SCHEMA_COMPLIANCE: 'metadata structure must match type-specific schema',

  /**
   * No self-loops: source !== target
   */
  NO_SELF_LOOPS: 'source and target must be different entities',

  /**
   * No duplicate edges: only one edge per (source, target, type)
   */
  NO_DUPLICATES: 'detectRelationships must not return duplicate (source, target, type) tuples',
} as const;

/**
 * Test fixtures for contract validation
 */
export const TEST_FIXTURES = {
  /**
   * Example Work with authorships for testing AUTHORSHIP detection
   */
  WORK_WITH_AUTHORS: {
    id: 'W2741809807',
    authorships: [
      {
        author_position: 'first',
        author: { id: 'A2208157607' },
        is_corresponding: true,
        institutions: [{ id: 'I114027177', display_name: 'Stanford University' }],
        raw_affiliation_strings: ['Stanford University, Stanford, CA, USA'],
      },
      {
        author_position: 'last',
        author: { id: 'A3004849758' },
        is_corresponding: false,
        institutions: [],
        raw_affiliation_strings: [],
      },
    ],
  },

  /**
   * Expected AUTHORSHIP edges from WORK_WITH_AUTHORS
   */
  EXPECTED_AUTHORSHIPS: [
    {
      sourceNodeId: 'W2741809807',
      targetNodeId: 'A2208157607',
      relationType: 'AUTHORSHIP',
      direction: 'outbound',
      label: 'authorship',
      metadata: {
        author_position: 'first',
        is_corresponding: true,
        institutions: [{ id: 'I114027177', display_name: 'Stanford University' }],
        raw_affiliation_strings: ['Stanford University, Stanford, CA, USA'],
      },
    },
    {
      sourceNodeId: 'W2741809807',
      targetNodeId: 'A3004849758',
      relationType: 'AUTHORSHIP',
      direction: 'outbound',
      label: 'authorship',
      metadata: {
        author_position: 'last',
        is_corresponding: false,
        institutions: [],
        raw_affiliation_strings: [],
      },
    },
  ],

  /**
   * Example Work with references for testing REFERENCE detection
   */
  WORK_WITH_REFERENCES: {
    id: 'W2741809807',
    referenced_works: ['W2118041844', 'W1964141474', 'W2043901295'],
  },

  /**
   * Expected REFERENCE edges from WORK_WITH_REFERENCES
   */
  EXPECTED_REFERENCES: [
    {
      sourceNodeId: 'W2741809807',
      targetNodeId: 'W2118041844',
      relationType: 'REFERENCE',
      direction: 'outbound',
      label: 'reference',
      metadata: {},
    },
    {
      sourceNodeId: 'W2741809807',
      targetNodeId: 'W1964141474',
      relationType: 'REFERENCE',
      direction: 'outbound',
      label: 'reference',
      metadata: {},
    },
    {
      sourceNodeId: 'W2741809807',
      targetNodeId: 'W2043901295',
      relationType: 'REFERENCE',
      direction: 'outbound',
      label: 'reference',
      metadata: {},
    },
  ],
} as const;
