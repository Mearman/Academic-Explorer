import { useLocation } from '@tanstack/react-router';
import { useEffect, useCallback } from 'react';

import { saveEntityToSimpleStorage } from '@/lib/entity-graph-sync';
import type { 
  Work, 
  Author, 
  Institution, 
  Source, 
  Topic
} from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityGraphStore } from '@/stores/entity-graph-store';
import type {
  EntityVisitEvent,
  RelationshipDiscoveryEvent,
} from '@/types/entity-graph';
import { EdgeType } from '@/types/entity-graph';

/**
 * Clean OpenAlex ID by removing URL prefix
 */
function cleanOpenAlexId(id: string): string {
  if (id.startsWith('https://openalex.org/')) {
    return id.replace('https://openalex.org/', '');
  }
  return id;
}

interface UseEntityGraphTrackingProps {
  /** Whether to automatically track entity visits */
  autoTrack?: boolean;
  /** Whether to extract relationships from entity data */
  extractRelationships?: boolean;
}

export function useEntityGraphTracking({
  autoTrack = true,
  extractRelationships = true,
}: UseEntityGraphTrackingProps = {}) {
  const location = useLocation();
  const { visitEntity, addRelationship } = useEntityGraphStore();

  // Wrapper for async addRelationship with error handling
  const addRelationshipSafe = useCallback((event: RelationshipDiscoveryEvent): void => {
    addRelationship(event).catch(error => {
      console.warn('[EntityGraphTracking] Failed to add relationship:', error);
    });
  }, [addRelationship]);

  /**
   * Track an entity visit event
   */
  const trackEntityVisit = useCallback((
    entityId: string,
    entityType: EntityType,
    displayName: string,
    metadata?: Record<string, unknown>
  ) => {
    const event: EntityVisitEvent = {
      entityId,
      entityType,
      displayName,
      timestamp: new Date().toISOString(),
      source: 'direct', // TODO: Could be enhanced to detect source
      metadata: {
        url: window.location.href,
        ...metadata,
      },
    };

    visitEntity(event).catch(error => {
      console.error('[EntityGraphTracking] Failed to record entity visit:', error);
    });
  }, [visitEntity]);

  /**
   * Extract and track relationships from Work entity
   */
  const extractWorkRelationships = useCallback((work: Work) => {
    const timestamp = new Date().toISOString();

    // Author relationships
    work.authorships?.forEach(authorship => {
      if (authorship.author.id) {
        const cleanAuthorId = cleanOpenAlexId(authorship.author.id);
        const event: RelationshipDiscoveryEvent = {
          sourceEntityId: work.id,
          targetEntityId: cleanAuthorId,
          relationshipType: EdgeType.AUTHORED_BY,
          timestamp,
          source: 'openalex',
          metadata: {
            targetEntityType: EntityType.AUTHOR,
            targetDisplayName: authorship.author.display_name,
            context: `Author position: ${authorship.author_position}`,
            confidence: authorship.is_corresponding ? 1.0 : 0.8,
          },
        };
        addRelationshipSafe(event);

        // Institution relationships through authorship
        authorship.institutions?.forEach(institution => {
          if (institution.id) {
            const cleanInstitutionId = cleanOpenAlexId(institution.id);
            const institutionEvent: RelationshipDiscoveryEvent = {
              sourceEntityId: cleanAuthorId,
              targetEntityId: cleanInstitutionId,
              relationshipType: EdgeType.AFFILIATED_WITH,
              timestamp,
              source: 'openalex',
              metadata: {
                targetEntityType: EntityType.INSTITUTION,
                targetDisplayName: institution.display_name,
                context: `Affiliation during work: ${work.display_name}`,
              },
            };
            addRelationship(institutionEvent);
          }
        });
      }
    });

    // Source/journal relationship
    if (work.primary_location?.source?.id) {
      const cleanSourceId = cleanOpenAlexId(work.primary_location.source.id);
      const event: RelationshipDiscoveryEvent = {
        sourceEntityId: work.id,
        targetEntityId: cleanSourceId,
        relationshipType: EdgeType.PUBLISHED_IN,
        timestamp,
        source: 'openalex',
        metadata: {
          targetEntityType: EntityType.SOURCE,
          targetDisplayName: work.primary_location.source.display_name,
          context: `Published in ${work.publication_year}`,
        },
      };
      addRelationship(event);
    }

    // Topic relationships
    work.topics?.forEach(topic => {
      if (topic.id) {
        const cleanTopicId = cleanOpenAlexId(topic.id);
        const event: RelationshipDiscoveryEvent = {
          sourceEntityId: work.id,
          targetEntityId: cleanTopicId,
          relationshipType: EdgeType.RELATED_TO_TOPIC,
          timestamp,
          source: 'openalex',
          metadata: {
            targetEntityType: EntityType.TOPIC,
            targetDisplayName: topic.display_name,
            context: 'Work topic classification',
          },
        };
        addRelationshipSafe(event);
      }
    });

    // Concept relationships (legacy)
    work.concepts?.forEach(concept => {
      if (concept.id) {
        const cleanConceptId = cleanOpenAlexId(concept.id);
        const event: RelationshipDiscoveryEvent = {
          sourceEntityId: work.id,
          targetEntityId: cleanConceptId,
          relationshipType: EdgeType.HAS_CONCEPT,
          timestamp,
          source: 'openalex',
          metadata: {
            targetEntityType: EntityType.CONCEPT,
            targetDisplayName: concept.display_name,
            context: `Concept level ${concept.level}, score: ${concept.score}`,
            confidence: concept.score,
          },
        };
        addRelationshipSafe(event);
      }
    });

    // Funding relationships
    work.grants?.forEach(grant => {
      if (grant.funder) {
        const cleanFunderId = cleanOpenAlexId(grant.funder);
        const event: RelationshipDiscoveryEvent = {
          sourceEntityId: work.id,
          targetEntityId: cleanFunderId,
          relationshipType: EdgeType.FUNDED_BY,
          timestamp,
          source: 'openalex',
          metadata: {
            targetEntityType: EntityType.FUNDER,
            targetDisplayName: grant.funder_display_name || 'Unknown Funder',
            context: `Grant: ${grant.award_id}`,
          },
        };
        addRelationshipSafe(event);
      }
    });

    // Citation relationships (if referenced works are available)
    work.referenced_works?.slice(0, 20).forEach(referencedWorkId => {
      const cleanWorkId = cleanOpenAlexId(referencedWorkId);
      const event: RelationshipDiscoveryEvent = {
        sourceEntityId: work.id,
        targetEntityId: cleanWorkId,
        relationshipType: EdgeType.CITES,
        timestamp,
        source: 'openalex',
        metadata: {
          targetEntityType: EntityType.WORK,
          targetDisplayName: 'Referenced Work', // Would need to fetch actual title
          context: 'Citation reference',
        },
      };
      addRelationship(event);
    });
  }, [addRelationshipSafe]);

  /**
   * Extract relationships from Author entity
   */
  const extractAuthorRelationships = useCallback((author: Author) => {
    console.log(`[EntityGraphTracking] 🔍 Extracting author relationships for ${author.display_name} (${author.id})`);
    console.log(`[EntityGraphTracking] Author has ${author.affiliations?.length || 0} affiliations, ${author.last_known_institutions?.length || 0} last known institutions, ${author.topics?.length || 0} topics`);
    const timestamp = new Date().toISOString();

    // Institution affiliations
    author.affiliations?.forEach(affiliation => {
      if (affiliation.institution.id) {
        const cleanInstitutionId = cleanOpenAlexId(affiliation.institution.id);
        console.log(`[EntityGraphTracking] Creating affiliation relationship: ${author.id} → ${cleanInstitutionId} (${affiliation.institution.display_name})`);
        const event: RelationshipDiscoveryEvent = {
          sourceEntityId: author.id,
          targetEntityId: cleanInstitutionId,
          relationshipType: EdgeType.AFFILIATED_WITH,
          timestamp,
          source: 'openalex',
          metadata: {
            targetEntityType: EntityType.INSTITUTION,
            targetDisplayName: affiliation.institution.display_name,
            context: `Years: ${affiliation.years?.join(', ')}`,
          },
        };
        addRelationshipSafe(event);
      }
    });

    // Last known institutions
    author.last_known_institutions?.forEach(institution => {
      if (institution.id) {
        const cleanInstitutionId = cleanOpenAlexId(institution.id);
        console.log(`[EntityGraphTracking] Creating last known institution relationship: ${author.id} → ${cleanInstitutionId} (${institution.display_name})`);
        const event: RelationshipDiscoveryEvent = {
          sourceEntityId: author.id,
          targetEntityId: cleanInstitutionId,
          relationshipType: EdgeType.AFFILIATED_WITH,
          timestamp,
          source: 'openalex',
          metadata: {
            targetEntityType: EntityType.INSTITUTION,
            targetDisplayName: institution.display_name,
            context: 'Most recent affiliation',
          },
        };
        addRelationshipSafe(event);
      }
    });

    // Topic relationships
    author.topics?.forEach(topic => {
      if (topic.id) {
        const cleanTopicId = cleanOpenAlexId(topic.id);
        console.log(`[EntityGraphTracking] Creating topic relationship: ${author.id} → ${cleanTopicId} (${topic.display_name})`);
        const event: RelationshipDiscoveryEvent = {
          sourceEntityId: author.id,
          targetEntityId: cleanTopicId,
          relationshipType: EdgeType.RELATED_TO_TOPIC,
          timestamp,
          source: 'openalex',
          metadata: {
            targetEntityType: EntityType.TOPIC,
            targetDisplayName: topic.display_name,
            context: 'Author research area',
          },
        };
        addRelationshipSafe(event);
      }
    });
  }, [addRelationshipSafe]);

  /**
   * Extract relationships from Institution entity
   */
  const extractInstitutionRelationships = useCallback((institution: Institution) => {
    const timestamp = new Date().toISOString();

    // Associated institutions (parent/child relationships)
    institution.associated_institutions?.forEach(associated => {
      if (associated.id) {
        const cleanAssociatedId = cleanOpenAlexId(associated.id);
        const relationshipType = associated.relationship === 'parent' 
          ? EdgeType.PART_OF 
          : associated.relationship === 'child'
          ? EdgeType.HAS_PART
          : EdgeType.RELATED_TO;

        const event: RelationshipDiscoveryEvent = {
          sourceEntityId: institution.id,
          targetEntityId: cleanAssociatedId,
          relationshipType,
          timestamp,
          source: 'openalex',
          metadata: {
            targetEntityType: EntityType.INSTITUTION,
            targetDisplayName: associated.display_name,
            context: `Relationship: ${associated.relationship}`,
          },
        };
        addRelationshipSafe(event);
      }
    });

    // Geographical relationships
    if (institution.geo?.country_code) {
      // For now, we don't have continent/region IDs directly
      // This could be enhanced with a country-to-continent mapping
    }

    // Topic relationships
    institution.topics?.forEach(topic => {
      if (topic.id) {
        const cleanTopicId = cleanOpenAlexId(topic.id);
        const event: RelationshipDiscoveryEvent = {
          sourceEntityId: institution.id,
          targetEntityId: cleanTopicId,
          relationshipType: EdgeType.RELATED_TO_TOPIC,
          timestamp,
          source: 'openalex',
          metadata: {
            targetEntityType: EntityType.TOPIC,
            targetDisplayName: topic.display_name,
            context: 'Institutional research focus',
          },
        };
        addRelationshipSafe(event);
      }
    });
  }, [addRelationshipSafe]);

  /**
   * Extract relationships from Source entity
   */
  const extractSourceRelationships = useCallback((source: Source) => {
    const timestamp = new Date().toISOString();

    // Host organization relationship
    if (source.host_organization && source.host_organization_name) {
      const cleanHostId = cleanOpenAlexId(source.host_organization);
      const event: RelationshipDiscoveryEvent = {
        sourceEntityId: source.id,
        targetEntityId: cleanHostId,
        relationshipType: EdgeType.PART_OF,
        timestamp,
        source: 'openalex',
        metadata: {
          targetEntityType: EntityType.PUBLISHER,
          targetDisplayName: source.host_organization_name,
          context: 'Publisher relationship',
        },
      };
      addRelationship(event);
    }

    // Topic relationships
    source.topics?.forEach(topic => {
      if (topic.id) {
        const cleanTopicId = cleanOpenAlexId(topic.id);
        const event: RelationshipDiscoveryEvent = {
          sourceEntityId: source.id,
          targetEntityId: cleanTopicId,
          relationshipType: EdgeType.RELATED_TO_TOPIC,
          timestamp,
          source: 'openalex',
          metadata: {
            targetEntityType: EntityType.TOPIC,
            targetDisplayName: topic.display_name,
            context: 'Journal subject area',
          },
        };
        addRelationshipSafe(event);
      }
    });
  }, [addRelationshipSafe]);

  /**
   * Extract relationships from any entity
   */
  const extractEntityRelationships = useCallback((entity: unknown, entityType: EntityType) => {
    if (!extractRelationships) return;

    console.log(`[EntityGraphTracking] Extracting relationships for ${entityType} entity`);
    try {
      switch (entityType) {
        case EntityType.WORK:
          extractWorkRelationships(entity as Work);
          break;
        case EntityType.AUTHOR:
          extractAuthorRelationships(entity as Author);
          break;
        case EntityType.INSTITUTION:
          extractInstitutionRelationships(entity as Institution);
          break;
        case EntityType.SOURCE:
          extractSourceRelationships(entity as Source);
          break;
        // Add more cases as needed for Publisher, Funder, etc.
        default: {
          // For other entity types, we might have basic topic relationships
          const basicEntity = entity as { id?: string; topics?: Topic[] };
          if (basicEntity.topics && basicEntity.id) {
            const timestamp = new Date().toISOString();
            basicEntity.topics.forEach(topic => {
              if (topic.id && basicEntity.id) {
                const cleanTopicId = cleanOpenAlexId(topic.id);
                const event: RelationshipDiscoveryEvent = {
                  sourceEntityId: basicEntity.id,
                  targetEntityId: cleanTopicId,
                  relationshipType: EdgeType.RELATED_TO_TOPIC,
                  timestamp,
                  source: 'openalex',
                  metadata: {
                    targetEntityType: EntityType.TOPIC,
                    targetDisplayName: topic.display_name,
                    context: 'Topic relationship',
                  },
                };
                addRelationshipSafe(event);
              }
            });
          }
          break;
        }
      }
    } catch (error) {
      console.warn('Error extracting relationships:', error);
    }
  }, [
    extractRelationships,
    extractWorkRelationships,
    extractAuthorRelationships,
    extractInstitutionRelationships,
    extractSourceRelationships,
    addRelationshipSafe,
  ]);

  /**
   * Extract and persist related entities from Work entity to simple storage
   */
  const persistWorkRelatedEntities = useCallback(async (work: Work) => {
    const promises: Promise<void>[] = [];

    // Persist authors
    work.authorships?.forEach(authorship => {
      if (authorship.author.id && authorship.author.display_name) {
        const cleanAuthorId = cleanOpenAlexId(authorship.author.id);
        promises.push(
          saveEntityToSimpleStorage(cleanAuthorId, EntityType.AUTHOR, authorship.author.display_name, false)
        );

        // Persist institutions through authorship
        authorship.institutions?.forEach(institution => {
          if (institution.id && institution.display_name) {
            const cleanInstitutionId = cleanOpenAlexId(institution.id);
            promises.push(
              saveEntityToSimpleStorage(cleanInstitutionId, EntityType.INSTITUTION, institution.display_name, false)
            );
          }
        });
      }
    });

    // Persist publication source
    if (work.primary_location?.source?.id && work.primary_location.source.display_name) {
      const cleanSourceId = cleanOpenAlexId(work.primary_location.source.id);
      promises.push(
        saveEntityToSimpleStorage(cleanSourceId, EntityType.SOURCE, work.primary_location.source.display_name, false)
      );
    }

    // Persist topics
    work.topics?.forEach(topic => {
      if (topic.id && topic.display_name) {
        const cleanTopicId = cleanOpenAlexId(topic.id);
        promises.push(
          saveEntityToSimpleStorage(cleanTopicId, EntityType.TOPIC, topic.display_name, false)
        );
      }
    });

    // Persist concepts (legacy)
    work.concepts?.forEach(concept => {
      if (concept.id && concept.display_name) {
        const cleanConceptId = cleanOpenAlexId(concept.id);
        promises.push(
          saveEntityToSimpleStorage(cleanConceptId, EntityType.CONCEPT, concept.display_name, false)
        );
      }
    });

    // Persist funders
    work.grants?.forEach(grant => {
      if (grant.funder && grant.funder_display_name) {
        const cleanFunderId = cleanOpenAlexId(grant.funder);
        promises.push(
          saveEntityToSimpleStorage(cleanFunderId, EntityType.FUNDER, grant.funder_display_name, false)
        );
      }
    });

    // Wait for all entities to be persisted
    await Promise.all(promises);
    console.log(`[EntityGraphTracking] Persisted ${promises.length} related entities from work ${work.id}`);
  }, []);

  /**
   * Extract and persist related entities from Author entity to simple storage
   */
  const persistAuthorRelatedEntities = useCallback(async (author: Author) => {
    const promises: Promise<void>[] = [];

    // Persist affiliated institutions
    author.affiliations?.forEach(affiliation => {
      if (affiliation.institution.id && affiliation.institution.display_name) {
        const cleanInstitutionId = cleanOpenAlexId(affiliation.institution.id);
        promises.push(
          saveEntityToSimpleStorage(cleanInstitutionId, EntityType.INSTITUTION, affiliation.institution.display_name, false)
        );
      }
    });

    // Persist last known institutions
    author.last_known_institutions?.forEach(institution => {
      if (institution.id && institution.display_name) {
        const cleanInstitutionId = cleanOpenAlexId(institution.id);
        promises.push(
          saveEntityToSimpleStorage(cleanInstitutionId, EntityType.INSTITUTION, institution.display_name, false)
        );
      }
    });

    // Persist research topics
    author.topics?.forEach(topic => {
      if (topic.id && topic.display_name) {
        const cleanTopicId = cleanOpenAlexId(topic.id);
        promises.push(
          saveEntityToSimpleStorage(cleanTopicId, EntityType.TOPIC, topic.display_name, false)
        );
      }
    });

    // Wait for all entities to be persisted
    await Promise.all(promises);
    console.log(`[EntityGraphTracking] Persisted ${promises.length} related entities from author ${author.id}`);
  }, []);

  /**
   * Extract and persist related entities from Institution entity to simple storage
   */
  const persistInstitutionRelatedEntities = useCallback(async (institution: Institution) => {
    const promises: Promise<void>[] = [];

    // Persist associated institutions
    institution.associated_institutions?.forEach(associated => {
      if (associated.id && associated.display_name) {
        const cleanAssociatedId = cleanOpenAlexId(associated.id);
        promises.push(
          saveEntityToSimpleStorage(cleanAssociatedId, EntityType.INSTITUTION, associated.display_name, false)
        );
      }
    });

    // Persist research topics
    institution.topics?.forEach(topic => {
      if (topic.id && topic.display_name) {
        const cleanTopicId = cleanOpenAlexId(topic.id);
        promises.push(
          saveEntityToSimpleStorage(cleanTopicId, EntityType.TOPIC, topic.display_name, false)
        );
      }
    });

    // Wait for all entities to be persisted
    await Promise.all(promises);
    console.log(`[EntityGraphTracking] Persisted ${promises.length} related entities from institution ${institution.id}`);
  }, []);

  /**
   * Extract and persist related entities from Source entity to simple storage
   */
  const persistSourceRelatedEntities = useCallback(async (source: Source) => {
    const promises: Promise<void>[] = [];

    // Persist host organization (publisher)
    if (source.host_organization && source.host_organization_name) {
      const cleanHostId = cleanOpenAlexId(source.host_organization);
      promises.push(
        saveEntityToSimpleStorage(cleanHostId, EntityType.PUBLISHER, source.host_organization_name, false)
      );
    }

    // Persist subject areas (topics)
    source.topics?.forEach(topic => {
      if (topic.id && topic.display_name) {
        const cleanTopicId = cleanOpenAlexId(topic.id);
        promises.push(
          saveEntityToSimpleStorage(cleanTopicId, EntityType.TOPIC, topic.display_name, false)
        );
      }
    });

    // Wait for all entities to be persisted
    await Promise.all(promises);
    console.log(`[EntityGraphTracking] Persisted ${promises.length} related entities from source ${source.id}`);
  }, []);

  /**
   * Persist related entities based on entity type
   */
  const persistRelatedEntities = useCallback(async (entity: unknown, entityType: EntityType) => {
    try {
      switch (entityType) {
        case EntityType.WORK:
          await persistWorkRelatedEntities(entity as Work);
          break;
        case EntityType.AUTHOR:
          await persistAuthorRelatedEntities(entity as Author);
          break;
        case EntityType.INSTITUTION:
          await persistInstitutionRelatedEntities(entity as Institution);
          break;
        case EntityType.SOURCE:
          await persistSourceRelatedEntities(entity as Source);
          break;
        // For other entity types, we could add basic topic persistence
        default: {
          const basicEntity = entity as { id?: string; topics?: Topic[] };
          if (basicEntity.topics) {
            const promises: Promise<void>[] = [];
            basicEntity.topics.forEach(topic => {
              if (topic.id && topic.display_name) {
                const cleanTopicId = cleanOpenAlexId(topic.id);
                promises.push(
                  saveEntityToSimpleStorage(cleanTopicId, EntityType.TOPIC, topic.display_name, false)
                );
              }
            });
            await Promise.all(promises);
            if (promises.length > 0) {
              console.log(`[EntityGraphTracking] Persisted ${promises.length} topic entities from ${entityType} entity`);
            }
          }
          break;
        }
      }
    } catch (error) {
      console.warn('[EntityGraphTracking] Error persisting related entities:', error);
    }
  }, [persistWorkRelatedEntities, persistAuthorRelatedEntities, persistInstitutionRelatedEntities, persistSourceRelatedEntities]);

  /**
   * Track entity data when it becomes available
   */
  const trackEntityData = useCallback(async (
    entity: unknown,
    entityType: EntityType,
    entityId: string
  ) => {
    console.log(`[EntityGraphTracking] 🎯 trackEntityData called for ${entityType}:${entityId}`);
    const basicEntity = entity as { 
      id: string; 
      display_name: string;
      cited_by_count?: number;
      publication_year?: number;
      works_count?: number;
    };

    // Track the visit
    trackEntityVisit(entityId, entityType, basicEntity.display_name, {
      citedByCount: basicEntity.cited_by_count,
      publicationYear: basicEntity.publication_year,
      worksCount: basicEntity.works_count,
    });

    // Extract relationships (in-memory graph)
    console.log(`[EntityGraphTracking] 🔗 About to extract relationships for ${entityType}:${entityId}`);
    extractEntityRelationships(entity, entityType);

    // Persist related entities to simple storage
    console.log(`[EntityGraphTracking] 💾 About to persist related entities for ${entityType}:${entityId}`);
    await persistRelatedEntities(entity, entityType);
    console.log(`[EntityGraphTracking] ✅ Completed tracking for ${entityType}:${entityId}`);
  }, [trackEntityVisit, extractEntityRelationships, persistRelatedEntities]);

  /**
   * Auto-track entity visits based on current route
   */
  useEffect(() => {
    if (!autoTrack) return;

    const pathname = location.pathname;
    
    // Parse entity routes
    const entityRoutePatterns = [
      { pattern: /^\/works\/(.+)$/, type: 'work' as EntityType },
      { pattern: /^\/authors\/(.+)$/, type: 'author' as EntityType },
      { pattern: /^\/institutions\/(.+)$/, type: 'institution' as EntityType },
      { pattern: /^\/sources\/(.+)$/, type: 'source' as EntityType },
      { pattern: /^\/publishers\/(.+)$/, type: 'publisher' as EntityType },
      { pattern: /^\/funders\/(.+)$/, type: 'funder' as EntityType },
      { pattern: /^\/topics\/(.+)$/, type: 'topic' as EntityType },
      { pattern: /^\/concepts\/(.+)$/, type: 'concept' as EntityType },
      { pattern: /^\/keywords\/(.+)$/, type: 'keyword' as EntityType },
      { pattern: /^\/continents\/(.+)$/, type: 'continent' as EntityType },
      { pattern: /^\/regions\/(.+)$/, type: 'region' as EntityType },
    ];

    for (const { pattern, type } of entityRoutePatterns) {
      const match = pathname.match(pattern);
      if (match) {
        const entityId = decodeURIComponent(match[1]);
        
        // For now, just track the visit with basic info
        // The actual entity data will be tracked when it's loaded
        trackEntityVisit(entityId, type, `${type.charAt(0).toUpperCase() + type.slice(1)} (loading...)`, {
          autoTracked: true,
          route: pathname,
        });
        
        break;
      }
    }
  }, [location.pathname, autoTrack, trackEntityVisit]);

  return {
    trackEntityVisit,
    trackEntityData,
    extractEntityRelationships,
    extractWorkRelationships,
    extractAuthorRelationships,
    extractInstitutionRelationships,
    extractSourceRelationships,
  };
}