/**
 * Entity Encounter Tracking Utilities
 * 
 * Helper functions for recording different types of entity encounters
 * in the entity graph store.
 */

import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityGraphStore } from '@/stores/entity-graph-store';
import { EncounterType, type EntityEncounterEvent } from '@/types/entity-graph';

/**
 * Record entities that appear in search results
 */
export function recordSearchResultEncounters(
  searchResults: Array<{
    id: string;
    entityType: EntityType;
    displayName: string;
  }>,
  searchQuery: string
) {
  const { recordEntityEncounter } = useEntityGraphStore.getState();
  const timestamp = new Date().toISOString();

  searchResults.forEach((entity, index) => {
    const event: EntityEncounterEvent = {
      entityId: entity.id,
      entityType: entity.entityType,
      displayName: entity.displayName,
      encounterType: EncounterType.SEARCH_RESULT,
      timestamp,
      context: {
        searchQuery,
        position: index + 1,
      },
    };

    recordEntityEncounter(event);
  });
}

/**
 * Record entities that appear as related entities (co-authors, citations, etc.)
 */
export function recordRelatedEntityEncounters(
  relatedEntities: Array<{
    id: string;
    entityType: EntityType;
    displayName: string;
  }>,
  sourceEntityId: string,
  relationshipContext: string
) {
  const { recordEntityEncounter } = useEntityGraphStore.getState();
  const timestamp = new Date().toISOString();

  relatedEntities.forEach((entity, index) => {
    const event: EntityEncounterEvent = {
      entityId: entity.id,
      entityType: entity.entityType,
      displayName: entity.displayName,
      encounterType: EncounterType.RELATED_ENTITY,
      timestamp,
      context: {
        sourceEntityId,
        position: index + 1,
        additionalInfo: {
          relationshipContext, // e.g., "co-authors", "cited works", "institutional affiliations"
        },
      },
    };

    recordEntityEncounter(event);
  });
}

/**
 * Record entities that appear in lists of co-authors
 */
export function recordCoAuthorEncounters(
  coAuthors: Array<{
    id: string;
    displayName: string;
  }>,
  sourceWorkId: string
) {
  const relatedEntities = coAuthors.map(author => ({
    ...author,
    entityType: EntityType.AUTHOR,
  }));

  recordRelatedEntityEncounters(relatedEntities, sourceWorkId, 'co-authors');
}

/**
 * Record entities that appear in citation lists
 */
export function recordCitationEncounters(
  citedWorks: Array<{
    id: string;
    displayName: string;
  }>,
  sourceWorkId: string
) {
  const relatedEntities = citedWorks.map(work => ({
    ...work,
    entityType: EntityType.WORK,
  }));

  recordRelatedEntityEncounters(relatedEntities, sourceWorkId, 'cited works');
}

/**
 * Record entities that appear in institution affiliation lists
 */
export function recordInstitutionAffiliationEncounters(
  institutions: Array<{
    id: string;
    displayName: string;
  }>,
  sourceAuthorId: string
) {
  const relatedEntities = institutions.map(institution => ({
    ...institution,
    entityType: EntityType.INSTITUTION,
  }));

  recordRelatedEntityEncounters(relatedEntities, sourceAuthorId, 'institutional affiliations');
}

/**
 * Record entities that appear in topic/concept associations
 */
export function recordTopicEncounters(
  topics: Array<{
    id: string;
    displayName: string;
  }>,
  sourceEntityId: string,
  sourceEntityType: EntityType
) {
  const relatedEntities = topics.map(topic => ({
    ...topic,
    entityType: EntityType.TOPIC,
  }));

  recordRelatedEntityEncounters(relatedEntities, sourceEntityId, `${sourceEntityType} topics`);
}

/**
 * Record entities that appear in publication venue lists
 */
export function recordPublicationVenueEncounters(
  venues: Array<{
    id: string;
    displayName: string;
  }>,
  sourceAuthorId: string
) {
  const relatedEntities = venues.map(venue => ({
    ...venue,
    entityType: EntityType.SOURCE,
  }));

  recordRelatedEntityEncounters(relatedEntities, sourceAuthorId, 'publication venues');
}

/**
 * Batch record multiple types of encounters from an entity page
 */
export function recordEntityPageEncounters(
  entityId: string,
  encounters: {
    coAuthors?: Array<{ id: string; displayName: string }>;
    citedWorks?: Array<{ id: string; displayName: string }>;
    institutions?: Array<{ id: string; displayName: string }>;
    topics?: Array<{ id: string; displayName: string }>;
    venues?: Array<{ id: string; displayName: string }>;
  }
) {
  if (encounters.coAuthors?.length) {
    recordCoAuthorEncounters(encounters.coAuthors, entityId);
  }

  if (encounters.citedWorks?.length) {
    recordCitationEncounters(encounters.citedWorks, entityId);
  }

  if (encounters.institutions?.length) {
    recordInstitutionAffiliationEncounters(encounters.institutions, entityId);
  }

  if (encounters.topics?.length) {
    recordTopicEncounters(encounters.topics, entityId, EntityType.WORK);
  }

  if (encounters.venues?.length) {
    recordPublicationVenueEncounters(encounters.venues, entityId);
  }
}

/**
 * Get entity encounter statistics for display
 */
export function getEntityEncounterSummary(entityId: string) {
  const { graph } = useEntityGraphStore.getState();
  const vertex = graph.vertices.get(entityId);

  if (!vertex) {
    return null;
  }

  return {
    totalEncounters: vertex.encounterStats?.totalEncounters || 0,
    directVisits: vertex.visitCount,
    searchResults: vertex.encounterStats?.searchResultCount || 0,
    relatedEntityAppearances: vertex.encounterStats?.relatedEntityCount || 0,
    firstSeen: vertex.firstSeen,
    lastSeen: vertex.encounterStats?.lastEncounter || vertex.lastVisited || vertex.firstSeen,
    hasBeenVisited: vertex.directlyVisited,
  };
}