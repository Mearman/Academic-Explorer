/**
 * React hook for extracting entity relationships from raw entity data
 * Falls back to parsing entity fields when GraphContext is not available
 *
 * @module use-entity-relationships-from-data
 */

import { useMemo } from 'react';
import type { EntityType } from '@academic-explorer/types';
import { RelationType } from '@academic-explorer/graph';
import type {
  RelationshipSection,
  RelationshipItem,
  PaginationState,
} from '@/types/relationship';
import { RELATIONSHIP_TYPE_LABELS, DEFAULT_PAGE_SIZE } from '@/types/relationship';

export interface UseEntityRelationshipsFromDataResult {
  /** Incoming relationship sections (other entities → this entity) */
  incoming: RelationshipSection[];

  /** Outgoing relationship sections (this entity → other entities) */
  outgoing: RelationshipSection[];

  /** Total count of incoming relationships */
  incomingCount: number;

  /** Total count of outgoing relationships */
  outgoingCount: number;
}

/**
 * Extract relationships from raw entity data (Author, Work, etc.)
 * This provides a fallback when GraphContext is not available
 *
 * @param entityData - The raw entity data from OpenAlex API
 * @param entityType - The type of the entity
 * @returns Relationship sections extracted from entity fields
 */
export function useEntityRelationshipsFromData(
  entityData: Record<string, unknown> | null | undefined,
  entityType: EntityType,
): UseEntityRelationshipsFromDataResult {
  const entityId = (entityData?.id as string) || '';

  const { incoming, outgoing } = useMemo(() => {
    if (!entityData || !entityId) {
      return { incoming: [], outgoing: [] };
    }

    const incomingSections: RelationshipSection[] = [];
    const outgoingSections: RelationshipSection[] = [];

    // Extract relationships based on entity type
    switch (entityType) {
      case 'authors':
        extractAuthorRelationships(entityData, entityId, outgoingSections);
        break;
      case 'works':
        extractWorkRelationships(entityData, entityId, outgoingSections, incomingSections);
        break;
      case 'institutions':
        extractInstitutionRelationships(entityData, entityId, outgoingSections);
        break;
      case 'sources':
        extractSourceRelationships(entityData, entityId, outgoingSections);
        break;
      case 'topics':
        extractTopicRelationships(entityData, entityId, outgoingSections);
        break;
      case 'funders':
        // Funders typically don't have embedded relationship data
        break;
      case 'publishers':
        // Publishers typically don't have embedded relationship data
        break;
    }

    return { incoming: incomingSections, outgoing: outgoingSections };
  }, [entityData, entityType, entityId]);

  const incomingCount = useMemo(() => {
    return incoming.reduce((sum, section) => sum + section.totalCount, 0);
  }, [incoming]);

  const outgoingCount = useMemo(() => {
    return outgoing.reduce((sum, section) => sum + section.totalCount, 0);
  }, [outgoing]);

  return {
    incoming,
    outgoing,
    incomingCount,
    outgoingCount,
  };
}

/**
 * Helper to create a properly structured RelationshipItem
 */
function createRelationshipItem(
  sourceId: string,
  targetId: string,
  sourceType: EntityType,
  targetType: EntityType,
  relationType: RelationType,
  direction: 'outbound' | 'inbound',
  displayName: string,
): RelationshipItem {
  return {
    id: `${sourceId}-${relationType}-${targetId}`,
    sourceId,
    targetId,
    sourceType,
    targetType,
    type: relationType,
    direction,
    displayName,
    isSelfReference: sourceId === targetId,
    // metadata is optional - we can add typed metadata in future iterations
  };
}

/**
 * Helper to create a properly structured RelationshipSection
 */
function createRelationshipSection(
  type: RelationType,
  direction: 'outbound' | 'inbound',
  label: string,
  items: RelationshipItem[],
  isPartialData: boolean = false,
): RelationshipSection {
  const totalCount = items.length;
  const pageSize = DEFAULT_PAGE_SIZE;
  const visibleItems = items.slice(0, pageSize);
  const visibleCount = visibleItems.length;
  const hasMore = totalCount > pageSize;

  const pagination: PaginationState = {
    pageSize,
    currentPage: 0,
    totalPages: Math.ceil(totalCount / pageSize),
    hasNextPage: hasMore,
    hasPreviousPage: false,
  };

  return {
    id: `${type}-${direction}`,
    type,
    direction,
    label,
    items,
    visibleItems,
    totalCount,
    visibleCount,
    hasMore,
    pagination,
    isPartialData,
  };
}

/**
 * Extract relationships from Author entity
 */
function extractAuthorRelationships(
  data: Record<string, unknown>,
  authorId: string,
  outgoing: RelationshipSection[],
): void {
  // AFFILIATION: Author → Institutions
  const affiliations = data.affiliations as Array<{
    institution?: {
      id?: string;
      display_name?: string;
      ror?: string;
      country_code?: string;
      type?: string;
    };
    years?: number[];
  }> | undefined;

  if (affiliations && affiliations.length > 0) {
    const affiliationItems: RelationshipItem[] = affiliations
      .filter(aff => aff.institution?.id && aff.institution?.display_name)
      .map(aff => createRelationshipItem(
        authorId,
        aff.institution!.id!,
        'authors' as EntityType,
        'institutions' as EntityType,
        RelationType.AFFILIATION,
        'outbound',
        aff.institution!.display_name!));

    if (affiliationItems.length > 0) {
      outgoing.push(createRelationshipSection(
        RelationType.AFFILIATION,
        'outbound',
        RELATIONSHIP_TYPE_LABELS[RelationType.AFFILIATION],
        affiliationItems,
      ));
    }
  }

  // AUTHOR_RESEARCHES: Author → Topics
  const topics = data.topics as Array<{
    id?: string;
    display_name?: string;
    count?: number;
    score?: number;
  }> | undefined;

  if (topics && topics.length > 0) {
    const topicItems: RelationshipItem[] = topics
      .filter(topic => topic.id && topic.display_name)
      .map(topic => createRelationshipItem(
        authorId,
        topic.id!,
        'authors' as EntityType,
        'topics' as EntityType,
        RelationType.AUTHOR_RESEARCHES,
        'outbound',
        topic.display_name!));

    if (topicItems.length > 0) {
      outgoing.push(createRelationshipSection(
        RelationType.AUTHOR_RESEARCHES,
        'outbound',
        'Research Topics',
        topicItems,
      ));
    }
  }
}

/**
 * Extract relationships from Work entity
 */
function extractWorkRelationships(
  data: Record<string, unknown>,
  workId: string,
  outgoing: RelationshipSection[],
  incoming: RelationshipSection[],
): void {
  // AUTHORSHIP: Work → Authors
  const authorships = data.authorships as Array<{
    author?: {
      id?: string;
      display_name?: string;
      orcid?: string;
    };
    author_position?: string;
    is_corresponding?: boolean;
  }> | undefined;

  if (authorships && authorships.length > 0) {
    const authorItems: RelationshipItem[] = authorships
      .filter(auth => auth.author?.id && auth.author?.display_name)
      .map(auth => createRelationshipItem(
        workId,
        auth.author!.id!,
        'works' as EntityType,
        'authors' as EntityType,
        RelationType.AUTHORSHIP,
        'outbound',
        auth.author!.display_name!));

    if (authorItems.length > 0) {
      outgoing.push(createRelationshipSection(
        RelationType.AUTHORSHIP,
        'outbound',
        RELATIONSHIP_TYPE_LABELS[RelationType.AUTHORSHIP],
        authorItems,
      ));
    }
  }

  // PUBLICATION: Work → Source
  const primaryLocation = data.primary_location as {
    source?: {
      id?: string;
      display_name?: string;
      issn_l?: string;
      type?: string;
    };
  } | undefined;

  if (primaryLocation?.source?.id && primaryLocation?.source?.display_name) {
    const sourceItem = createRelationshipItem(
      workId,
      primaryLocation.source.id,
      'works' as EntityType,
      'sources' as EntityType,
      RelationType.PUBLICATION,
      'outbound',
      primaryLocation.source.display_name);

    outgoing.push(createRelationshipSection(
      RelationType.PUBLICATION,
      'outbound',
      RELATIONSHIP_TYPE_LABELS[RelationType.PUBLICATION],
      [sourceItem],
    ));
  }

  // REFERENCE: Work → Referenced Works
  const referencedWorks = data.referenced_works as string[] | undefined;
  if (referencedWorks && referencedWorks.length > 0) {
    const referenceItems: RelationshipItem[] = referencedWorks.map((refWorkId) =>
      createRelationshipItem(
        workId,
        refWorkId,
        'works' as EntityType,
        'works' as EntityType,
        RelationType.REFERENCE,
        'outbound',
        refWorkId // Only have ID, not display name
      )
    );

    outgoing.push(createRelationshipSection(
      RelationType.REFERENCE,
      'outbound',
      RELATIONSHIP_TYPE_LABELS[RelationType.REFERENCE],
      referenceItems,
      true, // Partial data - only IDs available
    ));
  }

  // TOPIC: Work → Topics
  const workTopics = data.topics as Array<{
    id?: string;
    display_name?: string;
    score?: number;
  }> | undefined;

  if (workTopics && workTopics.length > 0) {
    const topicItems: RelationshipItem[] = workTopics
      .filter(topic => topic.id && topic.display_name)
      .map(topic => createRelationshipItem(
        workId,
        topic.id!,
        'works' as EntityType,
        'topics' as EntityType,
        RelationType.TOPIC,
        'outbound',
        topic.display_name!));

    if (topicItems.length > 0) {
      outgoing.push(createRelationshipSection(
        RelationType.TOPIC,
        'outbound',
        RELATIONSHIP_TYPE_LABELS[RelationType.TOPIC],
        topicItems,
      ));
    }
  }

  // Note: For incoming citations, we'd need to query the API
  // For now, we just note the count exists
  const citedByCount = data.cited_by_count as number | undefined;
  if (citedByCount && citedByCount > 0) {
    // We can't create actual items without fetching, so create an empty section
    // that indicates citations exist but aren't loaded
    incoming.push(createRelationshipSection(
      RelationType.REFERENCE, // Citations are reverse of references
      'inbound',
      'Citations',
      [],
      true, // Partial data - count only, no actual items
    ));
  }
}

/**
 * Extract relationships from Institution entity
 */
function extractInstitutionRelationships(
  data: Record<string, unknown>,
  institutionId: string,
  outgoing: RelationshipSection[],
): void {
  // LINEAGE: Institution → Parent Institutions
  const lineage = data.lineage as string[] | undefined;
  if (lineage && lineage.length > 1) {
    // lineage includes the institution itself, so filter it out
    const parentIds = lineage.filter(id => id !== institutionId);
    if (parentIds.length > 0) {
      const parentItems: RelationshipItem[] = parentIds.map((parentId) =>
        createRelationshipItem(
          institutionId,
          parentId,
          'institutions' as EntityType,
          'institutions' as EntityType,
          RelationType.LINEAGE,
          'outbound',
          parentId // Only have ID, not display name
        )
      );

      outgoing.push(createRelationshipSection(
        RelationType.LINEAGE,
        'outbound',
        RELATIONSHIP_TYPE_LABELS[RelationType.LINEAGE],
        parentItems,
        true, // Partial data - only IDs available
      ));
    }
  }
}

/**
 * Extract relationships from Source entity
 */
function extractSourceRelationships(
  data: Record<string, unknown>,
  sourceId: string,
  outgoing: RelationshipSection[],
): void {
  // HOST_ORGANIZATION: Source → Publisher
  const hostOrganization = data.host_organization as string | undefined;
  const hostOrganizationName = data.host_organization_name as string | undefined;

  if (hostOrganization && hostOrganizationName) {
    const publisherItem = createRelationshipItem(
      sourceId,
      hostOrganization,
      'sources' as EntityType,
      'publishers' as EntityType,
      RelationType.HOST_ORGANIZATION,
      'outbound',
      hostOrganizationName);

    outgoing.push(createRelationshipSection(
      RelationType.HOST_ORGANIZATION,
      'outbound',
      RELATIONSHIP_TYPE_LABELS[RelationType.HOST_ORGANIZATION],
      [publisherItem],
    ));
  }
}

/**
 * Extract relationships from Topic entity
 */
function extractTopicRelationships(
  data: Record<string, unknown>,
  topicId: string,
  outgoing: RelationshipSection[],
): void {
  // TOPIC_PART_OF_FIELD: Topic → Field → Domain hierarchy
  const field = data.field as {
    id?: string;
    display_name?: string;
  } | undefined;

  if (field?.id && field?.display_name) {
    const fieldItem = createRelationshipItem(
      topicId,
      field.id,
      'topics' as EntityType,
      'fields' as EntityType,
      RelationType.TOPIC_PART_OF_FIELD,
      'outbound',
      field.display_name);

    outgoing.push(createRelationshipSection(
      RelationType.TOPIC_PART_OF_FIELD,
      'outbound',
      'Field',
      [fieldItem],
    ));
  }

  const domain = data.domain as {
    id?: string;
    display_name?: string;
  } | undefined;

  if (domain?.id && domain?.display_name) {
    const domainItem = createRelationshipItem(
      topicId,
      domain.id,
      'topics' as EntityType,
      'domains' as EntityType,
      RelationType.FIELD_PART_OF_DOMAIN, // Domain is higher level than field
      'outbound',
      domain.display_name);

    outgoing.push(createRelationshipSection(
      RelationType.FIELD_PART_OF_DOMAIN,
      'outbound',
      'Domain',
      [domainItem],
    ));
  }
}
