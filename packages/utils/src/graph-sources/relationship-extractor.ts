/**
 * Relationship Extraction Utilities
 *
 * Extracts relationships from OpenAlex entity data for graph visualization.
 * This logic is shared between catalogue sources and cache sources.
 *
 * @module graph-sources/relationship-extractor
 */

import type { EntityType } from '@bibgraph/types';
import { RelationType as RT } from '@bibgraph/types';

import type { GraphSourceRelationship } from './types';

/**
 * Normalize an OpenAlex ID by extracting the short ID from a URL if needed.
 * e.g., "https://openalex.org/A5048491430" -> "A5048491430"
 */
export function normalizeOpenAlexId(id: string): string {
  if (!id) return id;
  // If it's a URL, extract just the ID part
  const urlMatch = id.match(/openalex\.org\/([WASIPCFTKDQ]\d+)$/i);
  if (urlMatch) {
    return urlMatch[1].toUpperCase();
  }
  // Already a short ID - normalize to uppercase
  return id.toUpperCase();
}

/**
 * Extract display label from entity data based on entity type
 */
export function extractEntityLabel(
  entityType: EntityType,
  entityId: string,
  entityData: Record<string, unknown>
): string {
  switch (entityType) {
    case 'works':
      return (entityData.title as string) ?? (entityData.display_name as string) ?? entityId;
    default:
      return (entityData.display_name as string) ?? entityId;
  }
}

/**
 * Extract relationships from a Work entity
 */
export function extractWorkRelationships(
  data: Record<string, unknown>
): GraphSourceRelationship[] {
  const relationships: GraphSourceRelationship[] = [];

  // Authorships -> Authors
  const authorships = data.authorships as Array<{ author?: { id?: string } }> | undefined;
  for (const auth of authorships ?? []) {
    if (auth.author?.id) {
      relationships.push({
        targetId: normalizeOpenAlexId(auth.author.id),
        targetType: 'authors',
        relationType: RT.AUTHORSHIP,
      });
    }
  }

  // Primary location -> Source
  const primaryLocation = data.primary_location as { source?: { id?: string } } | undefined;
  if (primaryLocation?.source?.id) {
    relationships.push({
      targetId: normalizeOpenAlexId(primaryLocation.source.id),
      targetType: 'sources',
      relationType: RT.PUBLICATION,
    });
  }

  // Referenced works
  const referencedWorks = data.referenced_works as string[] | undefined;
  for (const refId of referencedWorks ?? []) {
    relationships.push({
      targetId: normalizeOpenAlexId(refId),
      targetType: 'works',
      relationType: RT.REFERENCE,
    });
  }

  // Topics
  const topics = data.topics as Array<{ id?: string }> | undefined;
  for (const topic of topics ?? []) {
    if (topic.id) {
      relationships.push({
        targetId: normalizeOpenAlexId(topic.id),
        targetType: 'topics',
        relationType: RT.TOPIC,
      });
    }
  }

  // Grants -> Funders
  const grants = data.grants as Array<{ funder?: string }> | undefined;
  for (const grant of grants ?? []) {
    if (grant.funder) {
      relationships.push({
        targetId: normalizeOpenAlexId(grant.funder),
        targetType: 'funders',
        relationType: RT.FUNDED_BY,
      });
    }
  }

  return relationships;
}

/**
 * Extract relationships from an Author entity
 */
export function extractAuthorRelationships(
  data: Record<string, unknown>
): GraphSourceRelationship[] {
  const relationships: GraphSourceRelationship[] = [];

  // Affiliations -> Institutions
  const affiliations = data.affiliations as Array<{ institution?: { id?: string } }> | undefined;
  for (const aff of affiliations ?? []) {
    if (aff.institution?.id) {
      relationships.push({
        targetId: normalizeOpenAlexId(aff.institution.id),
        targetType: 'institutions',
        relationType: RT.AFFILIATION,
      });
    }
  }

  // Topics
  const topics = data.topics as Array<{ id?: string }> | undefined;
  for (const topic of topics ?? []) {
    if (topic.id) {
      relationships.push({
        targetId: normalizeOpenAlexId(topic.id),
        targetType: 'topics',
        relationType: RT.AUTHOR_RESEARCHES,
      });
    }
  }

  return relationships;
}

/**
 * Extract relationships from an Institution entity
 */
export function extractInstitutionRelationships(
  data: Record<string, unknown>
): GraphSourceRelationship[] {
  const relationships: GraphSourceRelationship[] = [];
  const institutionId = normalizeOpenAlexId((data.id as string) ?? '');

  // Topics
  const topics = data.topics as Array<{ id?: string }> | undefined;
  for (const topic of topics ?? []) {
    if (topic.id) {
      relationships.push({
        targetId: normalizeOpenAlexId(topic.id),
        targetType: 'topics',
        relationType: RT.TOPIC,
      });
    }
  }

  // Lineage -> Parent institutions
  const lineage = data.lineage as string[] | undefined;
  for (const parentId of lineage ?? []) {
    if (parentId !== institutionId && parentId !== data.id) {
      relationships.push({
        targetId: normalizeOpenAlexId(parentId),
        targetType: 'institutions',
        relationType: RT.LINEAGE,
      });
    }
  }

  return relationships;
}

/**
 * Extract relationships from a Source entity
 */
export function extractSourceRelationships(
  data: Record<string, unknown>
): GraphSourceRelationship[] {
  const relationships: GraphSourceRelationship[] = [];

  // Host organization -> Publisher
  const hostOrg = data.host_organization as string | undefined;
  if (hostOrg) {
    relationships.push({
      targetId: normalizeOpenAlexId(hostOrg),
      targetType: 'publishers',
      relationType: RT.HOST_ORGANIZATION,
    });
  }

  // Topics
  const topics = data.topics as Array<{ id?: string }> | undefined;
  for (const topic of topics ?? []) {
    if (topic.id) {
      relationships.push({
        targetId: normalizeOpenAlexId(topic.id),
        targetType: 'topics',
        relationType: RT.TOPIC,
      });
    }
  }

  return relationships;
}

/**
 * Extract relationships from a Topic entity
 */
export function extractTopicRelationships(
  data: Record<string, unknown>
): GraphSourceRelationship[] {
  const relationships: GraphSourceRelationship[] = [];

  // Field
  const field = data.field as { id?: string } | undefined;
  if (field?.id) {
    relationships.push({
      targetId: normalizeOpenAlexId(field.id),
      targetType: 'fields',
      relationType: RT.TOPIC_PART_OF_FIELD,
    });
  }

  // Domain
  const domain = data.domain as { id?: string } | undefined;
  if (domain?.id) {
    relationships.push({
      targetId: normalizeOpenAlexId(domain.id),
      targetType: 'domains',
      relationType: RT.FIELD_PART_OF_DOMAIN,
    });
  }

  return relationships;
}

/**
 * Extract relationships from any entity based on its type
 */
export function extractRelationships(
  entityType: EntityType,
  entityData: Record<string, unknown>
): GraphSourceRelationship[] {
  switch (entityType) {
    case 'works':
      return extractWorkRelationships(entityData);
    case 'authors':
      return extractAuthorRelationships(entityData);
    case 'institutions':
      return extractInstitutionRelationships(entityData);
    case 'sources':
      return extractSourceRelationships(entityData);
    case 'topics':
      return extractTopicRelationships(entityData);
    default:
      // Funders, publishers, concepts, keywords, domains, fields, subfields
      // don't have relationships we extract
      return [];
  }
}
