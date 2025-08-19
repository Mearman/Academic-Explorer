/**
 * Universal Entity Persistence Service
 * 
 * Handles comprehensive entity persistence during navigation:
 * 1. Persists root entity (ID + display_name) to IndexedDB
 * 2. Persists all related entities found in the data
 * 3. Persists relationship vertices/edges
 * 4. Performs selective OpenAlex queries for missing display names
 */

import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { EdgeType } from '@/types/entity-graph';
import type { 
  Work, 
  Author, 
  Institution, 
  Source, 
  Topic, 
  Publisher,
  Funder,
  Concept
} from '@/lib/openalex/types';

import { entityGraphStorage } from './entity-graph-storage';
import { saveEntityToSimpleStorage, saveEdgeToSimpleStorage } from './entity-graph-sync';
import { cachedClient } from './openalex/cached-client';

/**
 * Entity reference that may need display name hydration
 */
interface EntityReference {
  id: string;
  displayName?: string;
  entityType: EntityType;
}

/**
 * Extracted relationship with metadata
 */
interface ExtractedRelationship {
  sourceId: string;
  targetId: string;
  edgeType: EdgeType;
  targetEntity: EntityReference;
  context?: string;
}

/**
 * Universal entity navigation persistence service
 */
export class UniversalEntityPersistence {
  
  /**
   * Persist entity and all related data during navigation
   */
  async persistEntityNavigation(
    entity: unknown,
    entityType: EntityType,
    entityId: string
  ): Promise<void> {
    console.log(`[UniversalPersistence] 🎯 Starting persistence for ${entityType}:${entityId}`);
    
    try {
      // Initialize storage
      await entityGraphStorage.init();
      
      const basicEntity = entity as unknown as { 
        id: string; 
        display_name: string;
      };

      // 1. Persist root entity as directly visited
      console.log(`[UniversalPersistence] 📝 Persisting root entity: ${basicEntity.display_name}`);
      await saveEntityToSimpleStorage(
        entityId, 
        entityType, 
        basicEntity.display_name, 
        true // Mark as directly visited
      );

      // 2. Extract all related entities and relationships
      const relationships = this.extractAllRelationships(entity, entityType);
      console.log(`[UniversalPersistence] 🔗 Extracted ${relationships.length} relationships`);

      // 3. Collect unique related entities
      const relatedEntities = new Map<string, EntityReference>();
      relationships.forEach(rel => {
        if (!relatedEntities.has(rel.targetId)) {
          relatedEntities.set(rel.targetId, rel.targetEntity);
        }
      });

      // 4. Hydrate missing display names via selective OpenAlex queries
      await this.hydrateEntityDisplayNames(relatedEntities);

      // 5. Persist all related entities
      console.log(`[UniversalPersistence] 💾 Persisting ${relatedEntities.size} related entities`);
      for (const [entityId, entityRef] of relatedEntities) {
        if (entityRef.displayName) {
          await saveEntityToSimpleStorage(
            entityId,
            entityRef.entityType,
            entityRef.displayName,
            false // Not directly visited
          );
        }
      }

      // 6. Persist all relationships (edges)
      console.log(`[UniversalPersistence] 🔗 Persisting ${relationships.length} relationships`);
      for (const rel of relationships) {
        const edgeId = this.generateEdgeId(rel.sourceId, rel.targetId, rel.edgeType);
        await saveEdgeToSimpleStorage(
          rel.sourceId,
          rel.targetId,
          rel.edgeType,
          edgeId
        );
      }

      console.log(`[UniversalPersistence] ✅ Completed persistence for ${entityType}:${entityId}`);
      console.log(`[UniversalPersistence] 📊 Summary: 1 root + ${relatedEntities.size} related entities, ${relationships.length} relationships`);
      
    } catch (error) {
      console.error(`[UniversalPersistence] ❌ Failed to persist entity navigation:`, error);
    }
  }

  /**
   * Extract all relationships from any entity type
   */
  private extractAllRelationships(entity: unknown, entityType: EntityType): ExtractedRelationship[] {
    const relationships: ExtractedRelationship[] = [];
    
    try {
      switch (entityType) {
        case EntityType.WORK:
          relationships.push(...this.extractWorkRelationships(entity as Work));
          break;
        case EntityType.AUTHOR:
          relationships.push(...this.extractAuthorRelationships(entity as Author));
          break;
        case EntityType.INSTITUTION:
          relationships.push(...this.extractInstitutionRelationships(entity as Institution));
          break;
        case EntityType.SOURCE:
          relationships.push(...this.extractSourceRelationships(entity as Source));
          break;
        case EntityType.PUBLISHER:
          relationships.push(...this.extractPublisherRelationships(entity as Publisher));
          break;
        case EntityType.FUNDER:
          relationships.push(...this.extractFunderRelationships(entity as Funder));
          break;
        case EntityType.TOPIC:
          relationships.push(...this.extractTopicRelationships(entity as Topic));
          break;
        case EntityType.CONCEPT:
          relationships.push(...this.extractConceptRelationships(entity as Concept));
          break;
        default:
          // For other entity types, try to extract basic topic relationships
          const basicEntity = entity as { id?: string; topics?: Topic[] };
          if (basicEntity.topics && basicEntity.id) {
            relationships.push(...this.extractBasicTopicRelationships(basicEntity.id, basicEntity.topics));
          }
          break;
      }
    } catch (error) {
      console.warn(`[UniversalPersistence] Error extracting relationships for ${entityType}:`, error);
    }
    
    return relationships;
  }

  /**
   * Extract relationships from Work entity
   */
  private extractWorkRelationships(work: Work): ExtractedRelationship[] {
    const relationships: ExtractedRelationship[] = [];
    
    // Author relationships
    work.authorships?.forEach(authorship => {
      if (authorship.author.id && authorship.author.display_name) {
        relationships.push({
          sourceId: work.id,
          targetId: this.cleanOpenAlexId(authorship.author.id),
          edgeType: EdgeType.AUTHORED_BY,
          targetEntity: {
            id: this.cleanOpenAlexId(authorship.author.id),
            displayName: authorship.author.display_name,
            entityType: EntityType.AUTHOR,
          },
          context: `Author position: ${authorship.author_position}`,
        });
        
        // Institution relationships through authorship
        authorship.institutions?.forEach(institution => {
          if (institution.id && institution.display_name) {
            relationships.push({
              sourceId: this.cleanOpenAlexId(authorship.author.id),
              targetId: this.cleanOpenAlexId(institution.id),
              edgeType: EdgeType.AFFILIATED_WITH,
              targetEntity: {
                id: this.cleanOpenAlexId(institution.id),
                displayName: institution.display_name,
                entityType: EntityType.INSTITUTION,
              },
              context: `Affiliation during work: ${work.display_name}`,
            });
          }
        });
      }
    });

    // Source/journal relationship
    if (work.primary_location?.source?.id && work.primary_location.source.display_name) {
      relationships.push({
        sourceId: work.id,
        targetId: this.cleanOpenAlexId(work.primary_location.source.id),
        edgeType: EdgeType.PUBLISHED_IN,
        targetEntity: {
          id: this.cleanOpenAlexId(work.primary_location.source.id),
          displayName: work.primary_location.source.display_name,
          entityType: EntityType.SOURCE,
        },
        context: `Published in ${work.publication_year}`,
      });
    }

    // Topic relationships
    work.topics?.forEach(topic => {
      if (topic.id && topic.display_name) {
        relationships.push({
          sourceId: work.id,
          targetId: this.cleanOpenAlexId(topic.id),
          edgeType: EdgeType.RELATED_TO_TOPIC,
          targetEntity: {
            id: this.cleanOpenAlexId(topic.id),
            displayName: topic.display_name,
            entityType: EntityType.TOPIC,
          },
          context: 'Work topic classification',
        });
      }
    });

    // Concept relationships (legacy)
    work.concepts?.forEach(concept => {
      if (concept.id && concept.display_name) {
        relationships.push({
          sourceId: work.id,
          targetId: this.cleanOpenAlexId(concept.id),
          edgeType: EdgeType.HAS_CONCEPT,
          targetEntity: {
            id: this.cleanOpenAlexId(concept.id),
            displayName: concept.display_name,
            entityType: EntityType.CONCEPT,
          },
          context: `Concept level ${concept.level}, score: ${concept.score}`,
        });
      }
    });

    // Funding relationships
    work.grants?.forEach(grant => {
      if (grant.funder && grant.funder_display_name) {
        relationships.push({
          sourceId: work.id,
          targetId: this.cleanOpenAlexId(grant.funder),
          edgeType: EdgeType.FUNDED_BY,
          targetEntity: {
            id: this.cleanOpenAlexId(grant.funder),
            displayName: grant.funder_display_name,
            entityType: EntityType.FUNDER,
          },
          context: `Grant: ${grant.award_id}`,
        });
      }
    });

    return relationships;
  }

  /**
   * Extract relationships from Author entity
   */
  private extractAuthorRelationships(author: Author): ExtractedRelationship[] {
    const relationships: ExtractedRelationship[] = [];

    // Institution affiliations
    author.affiliations?.forEach(affiliation => {
      if (affiliation.institution.id && affiliation.institution.display_name) {
        relationships.push({
          sourceId: author.id,
          targetId: this.cleanOpenAlexId(affiliation.institution.id),
          edgeType: EdgeType.AFFILIATED_WITH,
          targetEntity: {
            id: this.cleanOpenAlexId(affiliation.institution.id),
            displayName: affiliation.institution.display_name,
            entityType: EntityType.INSTITUTION,
          },
          context: `Years: ${affiliation.years?.join(', ')}`,
        });
      }
    });

    // Last known institutions
    author.last_known_institutions?.forEach(institution => {
      if (institution.id && institution.display_name) {
        relationships.push({
          sourceId: author.id,
          targetId: this.cleanOpenAlexId(institution.id),
          edgeType: EdgeType.AFFILIATED_WITH,
          targetEntity: {
            id: this.cleanOpenAlexId(institution.id),
            displayName: institution.display_name,
            entityType: EntityType.INSTITUTION,
          },
          context: 'Most recent affiliation',
        });
      }
    });

    // Topic relationships
    author.topics?.forEach(topic => {
      if (topic.id && topic.display_name) {
        relationships.push({
          sourceId: author.id,
          targetId: this.cleanOpenAlexId(topic.id),
          edgeType: EdgeType.RELATED_TO_TOPIC,
          targetEntity: {
            id: this.cleanOpenAlexId(topic.id),
            displayName: topic.display_name,
            entityType: EntityType.TOPIC,
          },
          context: 'Author research area',
        });
      }
    });

    return relationships;
  }

  /**
   * Extract relationships from Institution entity
   */
  private extractInstitutionRelationships(institution: Institution): ExtractedRelationship[] {
    const relationships: ExtractedRelationship[] = [];

    // Associated institutions (parent/child relationships)
    institution.associated_institutions?.forEach(associated => {
      if (associated.id && associated.display_name) {
        const relationshipType = associated.relationship === 'parent' 
          ? EdgeType.PART_OF 
          : associated.relationship === 'child'
          ? EdgeType.HAS_PART
          : EdgeType.RELATED_TO;

        relationships.push({
          sourceId: institution.id,
          targetId: this.cleanOpenAlexId(associated.id),
          edgeType: relationshipType,
          targetEntity: {
            id: this.cleanOpenAlexId(associated.id),
            displayName: associated.display_name,
            entityType: EntityType.INSTITUTION,
          },
          context: `Relationship: ${associated.relationship}`,
        });
      }
    });

    // Topic relationships
    institution.topics?.forEach(topic => {
      if (topic.id && topic.display_name) {
        relationships.push({
          sourceId: institution.id,
          targetId: this.cleanOpenAlexId(topic.id),
          edgeType: EdgeType.RELATED_TO_TOPIC,
          targetEntity: {
            id: this.cleanOpenAlexId(topic.id),
            displayName: topic.display_name,
            entityType: EntityType.TOPIC,
          },
          context: 'Institutional research focus',
        });
      }
    });

    return relationships;
  }

  /**
   * Extract relationships from Source entity
   */
  private extractSourceRelationships(source: Source): ExtractedRelationship[] {
    const relationships: ExtractedRelationship[] = [];

    // Host organization relationship
    if (source.host_organization && source.host_organization_name) {
      relationships.push({
        sourceId: source.id,
        targetId: this.cleanOpenAlexId(source.host_organization),
        edgeType: EdgeType.PART_OF,
        targetEntity: {
          id: this.cleanOpenAlexId(source.host_organization),
          displayName: source.host_organization_name,
          entityType: EntityType.PUBLISHER,
        },
        context: 'Publisher relationship',
      });
    }

    // Topic relationships
    source.topics?.forEach(topic => {
      if (topic.id && topic.display_name) {
        relationships.push({
          sourceId: source.id,
          targetId: this.cleanOpenAlexId(topic.id),
          edgeType: EdgeType.RELATED_TO_TOPIC,
          targetEntity: {
            id: this.cleanOpenAlexId(topic.id),
            displayName: topic.display_name,
            entityType: EntityType.TOPIC,
          },
          context: 'Journal subject area',
        });
      }
    });

    return relationships;
  }

  /**
   * Extract basic topic relationships for entities
   */
  private extractBasicTopicRelationships(entityId: string, topics: Topic[]): ExtractedRelationship[] {
    const relationships: ExtractedRelationship[] = [];
    
    topics.forEach(topic => {
      if (topic.id && topic.display_name) {
        relationships.push({
          sourceId: entityId,
          targetId: this.cleanOpenAlexId(topic.id),
          edgeType: EdgeType.RELATED_TO_TOPIC,
          targetEntity: {
            id: this.cleanOpenAlexId(topic.id),
            displayName: topic.display_name,
            entityType: EntityType.TOPIC,
          },
          context: 'Topic relationship',
        });
      }
    });

    return relationships;
  }

  // Placeholder implementations for other entity types
  private extractPublisherRelationships(publisher: Publisher): ExtractedRelationship[] {
    // TODO: Implement based on Publisher structure
    return [];
  }

  private extractFunderRelationships(funder: Funder): ExtractedRelationship[] {
    // TODO: Implement based on Funder structure
    return [];
  }

  private extractTopicRelationships(topic: Topic): ExtractedRelationship[] {
    // TODO: Implement based on Topic structure (field, subfield, domain relationships)
    return [];
  }

  private extractConceptRelationships(concept: Concept): ExtractedRelationship[] {
    // TODO: Implement based on Concept structure (ancestor relationships)
    return [];
  }

  /**
   * Hydrate missing display names via selective OpenAlex queries
   */
  private async hydrateEntityDisplayNames(entities: Map<string, EntityReference>): Promise<void> {
    const entitiesNeedingHydration: EntityReference[] = [];
    
    // Identify entities without display names
    for (const entity of entities.values()) {
      if (!entity.displayName) {
        entitiesNeedingHydration.push(entity);
      }
    }

    if (entitiesNeedingHydration.length === 0) {
      console.log(`[UniversalPersistence] 💧 No entities need display name hydration`);
      return;
    }

    console.log(`[UniversalPersistence] 💧 Hydrating ${entitiesNeedingHydration.length} entity display names`);

    // Group by entity type for batch queries
    const entitiesByType = new Map<EntityType, EntityReference[]>();
    entitiesNeedingHydration.forEach(entity => {
      if (!entitiesByType.has(entity.entityType)) {
        entitiesByType.set(entity.entityType, []);
      }
      entitiesByType.get(entity.entityType)!.push(entity);
    });

    // Perform selective queries by entity type
    for (const [entityType, entityRefs] of entitiesByType) {
      try {
        console.log(`[UniversalPersistence] 🔍 Querying ${entityRefs.length} ${entityType} entities for display names`);
        
        // Create filter for multiple IDs
        const ids = entityRefs.map(e => e.id).join('|');
        const filter = `openalex:${ids}`;
        
        // Query with minimal select to get only ID and display_name
        const response = await this.performSelectiveQuery(entityType, filter);
        
        if (response?.results) {
          // Update entities with display names from API response
          response.results.forEach((result: { id: string; display_name: string }) => {
            const cleanId = this.cleanOpenAlexId(result.id);
            const entity = entities.get(cleanId);
            if (entity && result.display_name) {
              entity.displayName = result.display_name;
              console.log(`[UniversalPersistence] ✅ Hydrated ${entityType}:${cleanId} -> "${result.display_name}"`);
            }
          });
        }
      } catch (error) {
        console.warn(`[UniversalPersistence] ⚠️ Failed to hydrate ${entityType} display names:`, error);
      }
    }
  }

  /**
   * Perform selective OpenAlex query to get display names only
   */
  private async performSelectiveQuery(entityType: EntityType, filter: string) {
    const endpoint = this.getEndpointForEntityType(entityType);
    if (!endpoint) return null;

    try {
      // Use select parameter to get only id and display_name
      const response = await (cachedClient as any)[endpoint]({
        filter,
        select: 'id,display_name',
        'per-page': 200, // Batch process multiple entities
      });
      
      return response;
    } catch (error) {
      console.warn(`[UniversalPersistence] Query failed for ${entityType}:`, error);
      return null;
    }
  }

  /**
   * Get API endpoint method name for entity type
   */
  private getEndpointForEntityType(entityType: EntityType): string | null {
    switch (entityType) {
      case EntityType.WORK: return 'works';
      case EntityType.AUTHOR: return 'authors';
      case EntityType.INSTITUTION: return 'institutions';
      case EntityType.SOURCE: return 'sources';
      case EntityType.PUBLISHER: return 'publishers';
      case EntityType.FUNDER: return 'funders';
      case EntityType.TOPIC: return 'topics';
      case EntityType.CONCEPT: return 'concepts';
      default: return null;
    }
  }

  /**
   * Clean OpenAlex ID by removing URL prefix
   */
  private cleanOpenAlexId(id: string): string {
    if (id.startsWith('https://openalex.org/')) {
      return id.replace('https://openalex.org/', '');
    }
    return id;
  }

  /**
   * Generate unique edge ID
   */
  private generateEdgeId(sourceId: string, targetId: string, edgeType: EdgeType): string {
    return `${this.cleanOpenAlexId(sourceId)}-${edgeType}-${this.cleanOpenAlexId(targetId)}`;
  }
}

// Export singleton instance
export const universalEntityPersistence = new UniversalEntityPersistence();