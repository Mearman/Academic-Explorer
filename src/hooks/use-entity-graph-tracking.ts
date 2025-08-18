import { useLocation } from '@tanstack/react-router';
import { useEffect, useCallback } from 'react';

import type { 
  Work, 
  Author, 
  Institution, 
  Source, 
  Topic
} from '@/lib/openalex/types';
import { useEntityGraphStore } from '@/stores/entity-graph-store';
import type {
  EntityVisitEvent,
  RelationshipDiscoveryEvent,
  EntityType,
} from '@/types/entity-graph';
import { EdgeType } from '@/types/entity-graph';

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
        const event: RelationshipDiscoveryEvent = {
          sourceEntityId: work.id,
          targetEntityId: authorship.author.id,
          relationshipType: EdgeType.AUTHORED_BY,
          timestamp,
          source: 'openalex',
          metadata: {
            targetEntityType: 'author' as EntityType,
            targetDisplayName: authorship.author.display_name,
            context: `Author position: ${authorship.author_position}`,
            confidence: authorship.is_corresponding ? 1.0 : 0.8,
          },
        };
        addRelationshipSafe(event);

        // Institution relationships through authorship
        authorship.institutions?.forEach(institution => {
          if (institution.id) {
            const institutionEvent: RelationshipDiscoveryEvent = {
              sourceEntityId: authorship.author.id,
              targetEntityId: institution.id,
              relationshipType: EdgeType.AFFILIATED_WITH,
              timestamp,
              source: 'openalex',
              metadata: {
                targetEntityType: 'institution' as EntityType,
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
      const event: RelationshipDiscoveryEvent = {
        sourceEntityId: work.id,
        targetEntityId: work.primary_location.source.id,
        relationshipType: EdgeType.PUBLISHED_IN,
        timestamp,
        source: 'openalex',
        metadata: {
          targetEntityType: 'source' as EntityType,
          targetDisplayName: work.primary_location.source.display_name,
          context: `Published in ${work.publication_year}`,
        },
      };
      addRelationship(event);
    }

    // Topic relationships
    work.topics?.forEach(topic => {
      if (topic.id) {
        const event: RelationshipDiscoveryEvent = {
          sourceEntityId: work.id,
          targetEntityId: topic.id,
          relationshipType: EdgeType.RELATED_TO_TOPIC,
          timestamp,
          source: 'openalex',
          metadata: {
            targetEntityType: 'topic' as EntityType,
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
        const event: RelationshipDiscoveryEvent = {
          sourceEntityId: work.id,
          targetEntityId: concept.id,
          relationshipType: EdgeType.HAS_CONCEPT,
          timestamp,
          source: 'openalex',
          metadata: {
            targetEntityType: 'concept' as EntityType,
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
        const event: RelationshipDiscoveryEvent = {
          sourceEntityId: work.id,
          targetEntityId: grant.funder,
          relationshipType: EdgeType.FUNDED_BY,
          timestamp,
          source: 'openalex',
          metadata: {
            targetEntityType: 'funder' as EntityType,
            targetDisplayName: grant.funder_display_name || 'Unknown Funder',
            context: `Grant: ${grant.award_id}`,
          },
        };
        addRelationshipSafe(event);
      }
    });

    // Citation relationships (if referenced works are available)
    work.referenced_works?.slice(0, 20).forEach(referencedWorkId => {
      const event: RelationshipDiscoveryEvent = {
        sourceEntityId: work.id,
        targetEntityId: referencedWorkId,
        relationshipType: EdgeType.CITES,
        timestamp,
        source: 'openalex',
        metadata: {
          targetEntityType: 'work' as EntityType,
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
    const timestamp = new Date().toISOString();

    // Institution affiliations
    author.affiliations?.forEach(affiliation => {
      if (affiliation.institution.id) {
        const event: RelationshipDiscoveryEvent = {
          sourceEntityId: author.id,
          targetEntityId: affiliation.institution.id,
          relationshipType: EdgeType.AFFILIATED_WITH,
          timestamp,
          source: 'openalex',
          metadata: {
            targetEntityType: 'institution' as EntityType,
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
        const event: RelationshipDiscoveryEvent = {
          sourceEntityId: author.id,
          targetEntityId: institution.id,
          relationshipType: EdgeType.AFFILIATED_WITH,
          timestamp,
          source: 'openalex',
          metadata: {
            targetEntityType: 'institution' as EntityType,
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
        const event: RelationshipDiscoveryEvent = {
          sourceEntityId: author.id,
          targetEntityId: topic.id,
          relationshipType: EdgeType.RELATED_TO_TOPIC,
          timestamp,
          source: 'openalex',
          metadata: {
            targetEntityType: 'topic' as EntityType,
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
        const relationshipType = associated.relationship === 'parent' 
          ? EdgeType.PART_OF 
          : associated.relationship === 'child'
          ? EdgeType.HAS_PART
          : EdgeType.RELATED_TO;

        const event: RelationshipDiscoveryEvent = {
          sourceEntityId: institution.id,
          targetEntityId: associated.id,
          relationshipType,
          timestamp,
          source: 'openalex',
          metadata: {
            targetEntityType: 'institution' as EntityType,
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
        const event: RelationshipDiscoveryEvent = {
          sourceEntityId: institution.id,
          targetEntityId: topic.id,
          relationshipType: EdgeType.RELATED_TO_TOPIC,
          timestamp,
          source: 'openalex',
          metadata: {
            targetEntityType: 'topic' as EntityType,
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
      const event: RelationshipDiscoveryEvent = {
        sourceEntityId: source.id,
        targetEntityId: source.host_organization,
        relationshipType: EdgeType.PART_OF,
        timestamp,
        source: 'openalex',
        metadata: {
          targetEntityType: 'publisher' as EntityType,
          targetDisplayName: source.host_organization_name,
          context: 'Publisher relationship',
        },
      };
      addRelationship(event);
    }

    // Topic relationships
    source.topics?.forEach(topic => {
      if (topic.id) {
        const event: RelationshipDiscoveryEvent = {
          sourceEntityId: source.id,
          targetEntityId: topic.id,
          relationshipType: EdgeType.RELATED_TO_TOPIC,
          timestamp,
          source: 'openalex',
          metadata: {
            targetEntityType: 'topic' as EntityType,
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

    try {
      switch (entityType) {
        case 'work':
          extractWorkRelationships(entity as Work);
          break;
        case 'author':
          extractAuthorRelationships(entity as Author);
          break;
        case 'institution':
          extractInstitutionRelationships(entity as Institution);
          break;
        case 'source':
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
                const event: RelationshipDiscoveryEvent = {
                  sourceEntityId: basicEntity.id,
                  targetEntityId: topic.id,
                  relationshipType: EdgeType.RELATED_TO_TOPIC,
                  timestamp,
                  source: 'openalex',
                  metadata: {
                    targetEntityType: 'topic' as EntityType,
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
   * Track entity data when it becomes available
   */
  const trackEntityData = useCallback((
    entity: unknown,
    entityType: EntityType,
    entityId: string
  ) => {
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

    // Extract relationships
    extractEntityRelationships(entity, entityType);
  }, [trackEntityVisit, extractEntityRelationships]);

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