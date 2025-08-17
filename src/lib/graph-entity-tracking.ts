/**
 * Graph Entity Tracking Utilities
 * 
 * Helper functions for recording entity visits, encounters, and relationships
 * in the new graph database system. Replaces the old entity encounter tracking
 * with comprehensive graph-based storage.
 */

import type { EntityData } from '@/hooks/use-entity-data';
import { graphDb } from '@/lib/graph-db';
import { extractAllRelationships, relationshipsToEvents } from '@/lib/graph-helpers';
import type { Work, Author, Authorship, Affiliation, Topic } from '@/lib/openalex/types/entities';
import type { EntityType } from '@/lib/openalex/utils/entity-detection';
import type {
  EntityVisitEvent,
  EntityEncounterEvent,
  QueryParametersEvent,
  QueryExecutionEvent,
} from '@/types/graph-storage';
import { EncounterType } from '@/types/graph-storage';

/**
 * Initialize the graph database (call on app startup)
 */
export async function initializeGraphDatabase(): Promise<void> {
  await graphDb.init();
}

/**
 * Record a direct entity visit (when user navigates to entity page)
 */
export async function recordEntityVisit(
  entityId: string,
  entityType: EntityType,
  displayName: string,
  source: 'direct' | 'link' | 'search' | 'related' = 'direct',
  metadata?: Record<string, unknown>
): Promise<void> {
  const timestamp = new Date().toISOString();
  
  const event: EntityVisitEvent = {
    entityId,
    entityType,
    displayName,
    timestamp,
    source,
    metadata: {
      url: window.location.href,
      ...metadata,
    },
  };

  try {
    await graphDb.recordEntityVisit(event);
    console.log(`[GraphEntityTracking] Recorded entity visit: ${entityType}:${entityId}`);
  } catch (error) {
    console.error('[GraphEntityTracking] Failed to record entity visit:', error);
  }
}

/**
 * Record entities that appear in search results
 */
export async function recordSearchResultEncounters(
  searchResults: Array<{
    id: string;
    entityType: EntityType;
    displayName: string;
  }>,
  searchQuery: string,
  queryFilters?: Record<string, unknown>,
  queryExecutionMetadata?: {
    totalResults: number;
    pageNumber: number;
    perPage: number;
  }
): Promise<void> {
  const timestamp = new Date().toISOString();

  try {
    // 1. Record query parameters (or get existing)
    const queryParametersEvent: QueryParametersEvent = {
      queryString: searchQuery,
      queryFilters,
      timestamp,
      metadata: {
        source: 'search_interface',
      },
    };

    const queryVertex = await graphDb.recordQueryParameters(queryParametersEvent);

    // 2. Record query execution
    const queryExecutionEvent: QueryExecutionEvent = {
      queryParametersId: queryVertex.id,
      timestamp,
      resultEntityIds: searchResults.map(r => r.id),
      totalResults: queryExecutionMetadata?.totalResults || searchResults.length,
      pageNumber: queryExecutionMetadata?.pageNumber || 1,
      perPage: queryExecutionMetadata?.perPage || searchResults.length,
      metadata: {
        source: 'search_execution',
      },
    };

    const { executionVertex } = await graphDb.recordQueryExecution(queryExecutionEvent);

    // 3. Record entity encounters for each search result
    for (let i = 0; i < searchResults.length; i++) {
      const entity = searchResults[i];
      
      const encounterEvent: EntityEncounterEvent = {
        entityId: entity.id,
        entityType: entity.entityType,
        displayName: entity.displayName,
        encounterType: EncounterType.SEARCH_RESULT,
        timestamp,
        context: {
          searchQuery,
          position: i + 1,
          queryExecutionId: executionVertex.id,
        },
      };

      await graphDb.recordEntityEncounter(encounterEvent);
    }

    console.log(`[GraphEntityTracking] Recorded search results: ${searchResults.length} entities for query "${searchQuery}"`);
  } catch (error) {
    console.error('[GraphEntityTracking] Failed to record search results:', error);
  }
}

/**
 * Record entities that appear as related entities (co-authors, citations, etc.)
 */
export async function recordRelatedEntityEncounters(
  relatedEntities: Array<{
    id: string;
    entityType: EntityType;
    displayName: string;
  }>,
  sourceEntityId: string,
  relationshipContext: string
): Promise<void> {
  const timestamp = new Date().toISOString();

  try {
    for (let i = 0; i < relatedEntities.length; i++) {
      const entity = relatedEntities[i];
      
      const encounterEvent: EntityEncounterEvent = {
        entityId: entity.id,
        entityType: entity.entityType,
        displayName: entity.displayName,
        encounterType: EncounterType.RELATED_ENTITY,
        timestamp,
        context: {
          sourceEntityId,
          position: i + 1,
          additionalInfo: {
            relationshipContext,
          },
        },
      };

      await graphDb.recordEntityEncounter(encounterEvent);
    }

    console.log(`[GraphEntityTracking] Recorded ${relatedEntities.length} related entities for ${sourceEntityId} (${relationshipContext})`);
  } catch (error) {
    console.error('[GraphEntityTracking] Failed to record related entities:', error);
  }
}

/**
 * Extract and record all relationships from an entity's data
 */
export async function recordEntityRelationships(
  entity: EntityData,
  timestamp = new Date().toISOString()
): Promise<void> {
  try {
    const relationships = extractAllRelationships(entity);
    const relationshipEvents = relationshipsToEvents(relationships, timestamp);

    console.log(`[GraphEntityTracking] Extracted ${relationshipEvents.length} relationships from ${entity.id}`);

    // Add all relationships to the graph
    for (const relationshipEvent of relationshipEvents) {
      await graphDb.addRelationship(relationshipEvent);
    }

    console.log(`[GraphEntityTracking] Successfully recorded ${relationshipEvents.length} relationships for ${entity.id}`);
  } catch (error) {
    console.error('[GraphEntityTracking] Failed to record entity relationships:', error);
  }
}

/**
 * Comprehensive entity page tracking - records visit, relationships, and related entity encounters
 */
export async function recordEntityPageView(
  entity: EntityData,
  entityType: EntityType,
  source: 'direct' | 'link' | 'search' | 'related' = 'direct',
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    // 1. Record the direct visit
    await recordEntityVisit(
      entity.id,
      entityType,
      entity.display_name,
      source,
      metadata
    );

    // 2. Extract and record all relationships from the entity data
    await recordEntityRelationships(entity);

    // 3. Record encounters for related entities that appear on the page
    await recordEntityPageRelatedEntities(entity, entityType);

    console.log(`[GraphEntityTracking] Completed comprehensive tracking for entity page: ${entityType}:${entity.id}`);
  } catch (error) {
    console.error('[GraphEntityTracking] Failed to record entity page view:', error);
  }
}

/**
 * Record entities that appear on an entity page (extracted from the entity data)
 */
async function recordEntityPageRelatedEntities(
  entity: EntityData,
  _entityType: EntityType
): Promise<void> {

  try {
    // Extract related entities based on entity type
    const relatedEntities: Array<{
      id: string;
      entityType: EntityType;
      displayName: string;
      context: string;
    }> = [];

    // Handle Work entities
    if ('authorships' in entity) {
      const work = entity as Work;
      
      // Authors
      if (work.authorships) {
        work.authorships.forEach((authorship: Authorship) => {
          relatedEntities.push({
            id: authorship.author.id,
            entityType: 'A' as EntityType,
            displayName: authorship.author.display_name,
            context: 'authors',
          });

          // Institutions
          authorship.institutions?.forEach((institution: Authorship['institutions'][0]) => {
            relatedEntities.push({
              id: institution.id,
              entityType: 'I' as EntityType,
              displayName: institution.display_name,
              context: 'institutional_affiliations',
            });
          });
        });
      }

      // Publication source
      if (work.primary_location?.source) {
        relatedEntities.push({
          id: work.primary_location.source.id,
          entityType: 'S' as EntityType,
          displayName: work.primary_location.source.display_name,
          context: 'publication_source',
        });
      }

      // Topics
      if (work.topics) {
        work.topics.forEach((topic: Topic) => {
          relatedEntities.push({
            id: topic.id,
            entityType: 'T' as EntityType,
            displayName: topic.display_name,
            context: 'topics',
          });
        });
      }

      // Referenced works
      if (work.referenced_works) {
        work.referenced_works.slice(0, 10).forEach((workId: string) => { // Limit to first 10
          relatedEntities.push({
            id: workId,
            entityType: 'W' as EntityType,
            displayName: `Work ${workId}`,
            context: 'referenced_works',
          });
        });
      }
    }

    // Handle Author entities
    if ('affiliations' in entity && !('authorships' in entity)) {
      const author = entity as Author;
      
      // Affiliations
      if (author.affiliations) {
        author.affiliations.forEach((affiliation: Affiliation) => {
          relatedEntities.push({
            id: affiliation.institution.id,
            entityType: 'I' as EntityType,
            displayName: affiliation.institution.display_name,
            context: 'affiliations',
          });
        });
      }

      // Topics
      if (author.topics) {
        author.topics.forEach((topic: Topic) => {
          relatedEntities.push({
            id: topic.id,
            entityType: 'T' as EntityType,
            displayName: topic.display_name,
            context: 'research_topics',
          });
        });
      }
    }

    // Record encounters for all related entities
    const groupedByContext = relatedEntities.reduce((acc, entity) => {
      if (!acc[entity.context]) {
        acc[entity.context] = [];
      }
      acc[entity.context].push({
        id: entity.id,
        entityType: entity.entityType,
        displayName: entity.displayName,
      });
      return acc;
    }, {} as Record<string, Array<{ id: string; entityType: EntityType; displayName: string }>>);

    for (const [context, entities] of Object.entries(groupedByContext)) {
      await recordRelatedEntityEncounters(entities, entity.id, context);
    }

  } catch (error) {
    console.error('[GraphEntityTracking] Failed to record entity page encounters:', error);
  }
}

/**
 * Get entity tracking statistics
 */
export async function getEntityTrackingStats(entityId: string) {
  try {
    const vertex = await graphDb.getVertex(entityId);
    
    if (!vertex) {
      return null;
    }

    return {
      totalEncounters: vertex.stats.totalEncounters,
      directVisits: vertex.visitCount,
      searchResults: vertex.stats.searchResultCount,
      relatedEntityAppearances: vertex.stats.relatedEntityCount,
      firstSeen: vertex.firstSeen,
      lastSeen: vertex.stats.lastEncounter || vertex.lastVisited || vertex.firstSeen,
      hasBeenVisited: vertex.directlyVisited,
      inDegree: vertex.stats.inDegree,
      outDegree: vertex.stats.outDegree,
      totalDegree: vertex.stats.totalDegree,
    };
  } catch (error) {
    console.error('[GraphEntityTracking] Failed to get entity stats:', error);
    return null;
  }
}

/**
 * Get global graph statistics
 */
export async function getGraphStats() {
  try {
    const metadata = await graphDb.getMetadata();
    const allVertices = await graphDb.getAllVertices();
    const allEdges = await graphDb.getAllEdges();

    // Calculate additional statistics
    const entityVertices = allVertices.filter(v => v.vertexType === 'entity');
    const queryVertices = allVertices.filter(v => v.vertexType === 'query_parameters');
    const executionVertices = allVertices.filter(v => v.vertexType === 'query_execution');
    
    const directlyVisitedEntities = entityVertices.filter(v => v.directlyVisited);

    return {
      totalVertices: allVertices.length,
      totalEdges: allEdges.length,
      entityVertices: entityVertices.length,
      queryVertices: queryVertices.length,
      executionVertices: executionVertices.length,
      directlyVisitedEntities: directlyVisitedEntities.length,
      totalVisits: metadata.totalVisits,
      uniqueEntitiesVisited: metadata.uniqueEntitiesVisited,
      totalQueryExecutions: metadata.totalQueryExecutions,
      uniqueQueryParameters: metadata.uniqueQueryParameters,
      averageEntityDegree: entityVertices.length > 0 
        ? entityVertices.reduce((sum, v) => sum + v.stats.totalDegree, 0) / entityVertices.length
        : 0,
      lastUpdated: metadata.lastUpdated,
    };
  } catch (error) {
    console.error('[GraphEntityTracking] Failed to get graph stats:', error);
    return null;
  }
}

/**
 * Export utility functions for backwards compatibility with existing tracking system
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
    entityType: 'A' as EntityType,
  }));

  return recordRelatedEntityEncounters(relatedEntities, sourceWorkId, 'co-authors');
}

export function recordCitationEncounters(
  citedWorks: Array<{
    id: string;
    displayName: string;
  }>,
  sourceWorkId: string
) {
  const relatedEntities = citedWorks.map(work => ({
    ...work,
    entityType: 'W' as EntityType,
  }));

  return recordRelatedEntityEncounters(relatedEntities, sourceWorkId, 'cited_works');
}

export function recordInstitutionAffiliationEncounters(
  institutions: Array<{
    id: string;
    displayName: string;
  }>,
  sourceAuthorId: string
) {
  const relatedEntities = institutions.map(institution => ({
    ...institution,
    entityType: 'I' as EntityType,
  }));

  return recordRelatedEntityEncounters(relatedEntities, sourceAuthorId, 'institutional_affiliations');
}

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
    entityType: 'T' as EntityType,
  }));

  return recordRelatedEntityEncounters(relatedEntities, sourceEntityId, `${sourceEntityType}_topics`);
}

export function recordPublicationVenueEncounters(
  venues: Array<{
    id: string;
    displayName: string;
  }>,
  sourceAuthorId: string
) {
  const relatedEntities = venues.map(venue => ({
    ...venue,
    entityType: 'S' as EntityType,
  }));

  return recordRelatedEntityEncounters(relatedEntities, sourceAuthorId, 'publication_venues');
}

/**
 * Batch record multiple types of encounters from an entity page
 */
export async function recordEntityPageEncounters(
  entityId: string,
  encounters: {
    coAuthors?: Array<{ id: string; displayName: string }>;
    citedWorks?: Array<{ id: string; displayName: string }>;
    institutions?: Array<{ id: string; displayName: string }>;
    topics?: Array<{ id: string; displayName: string }>;
    venues?: Array<{ id: string; displayName: string }>;
  }
) {
  const promises: Promise<void>[] = [];

  if (encounters.coAuthors?.length) {
    promises.push(recordCoAuthorEncounters(encounters.coAuthors, entityId));
  }

  if (encounters.citedWorks?.length) {
    promises.push(recordCitationEncounters(encounters.citedWorks, entityId));
  }

  if (encounters.institutions?.length) {
    promises.push(recordInstitutionAffiliationEncounters(encounters.institutions, entityId));
  }

  if (encounters.topics?.length) {
    promises.push(recordTopicEncounters(encounters.topics, entityId, 'W' as EntityType));
  }

  if (encounters.venues?.length) {
    promises.push(recordPublicationVenueEncounters(encounters.venues, entityId));
  }

  await Promise.all(promises);
}