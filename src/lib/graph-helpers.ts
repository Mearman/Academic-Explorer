/**
 * Graph Helpers
 * 
 * Helper functions for extracting relationships from OpenAlex entities
 * and converting them into graph edges. Each entity type has specific
 * relationship patterns that need to be identified and stored.
 */

import type {
  Work,
  Author,
  Institution,
  Source,
  Publisher,
  Topic,
  Concept,
  OpenAlexEntity,
} from '@/lib/openalex/types/entities';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import type {
  RelationshipDiscoveryEvent,
} from '@/types/graph-storage';
import {
  GraphEdgeType,
} from '@/types/graph-storage';

/**
 * Extracted relationship representing a potential edge in the graph
 */
export interface ExtractedRelationship {
  /** Source entity ID */
  sourceEntityId: string;
  
  /** Target entity ID */
  targetEntityId: string;
  
  /** Relationship type */
  relationshipType: GraphEdgeType;
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** Additional properties for the edge */
  properties: {
    /** Context information */
    context?: string;
    
    /** Position/rank information */
    position?: number;
    
    /** Temporal information */
    temporalInfo?: {
      establishedYear?: number;
      endedYear?: number;
    };
    
    /** Bibliographic information */
    bibliographicInfo?: {
      citationContext?: string;
      pageNumber?: string;
      section?: string;
    };
    
    /** Authorship information */
    authorshipInfo?: {
      authorPosition?: 'first' | 'middle' | 'last';
      isCorresponding?: boolean;
      rawAuthorName?: string;
    };
    
    /** Affiliation information */
    affiliationInfo?: {
      years?: number[];
      isCurrent?: boolean;
      affiliationType?: string;
    };
    
    /** Additional properties */
    additionalProperties?: Record<string, unknown>;
  };
  
  /** Target entity metadata (for creating discovered vertices) */
  targetEntityMetadata?: {
    entityType: EntityType;
    displayName: string;
    additionalInfo?: Record<string, unknown>;
  };
}

/**
 * Extract all relationships from a Work entity
 */
export function extractWorkRelationships(work: Work): ExtractedRelationship[] {
  const relationships: ExtractedRelationship[] = [];
  const workId = work.id;

  // Citation relationships
  if (work.referenced_works) {
    work.referenced_works.forEach((referencedWorkId, _index) => {
      relationships.push({
        sourceEntityId: workId,
        targetEntityId: referencedWorkId,
        relationshipType: GraphEdgeType.CITES,
        confidence: 0.9,
        properties: {
          position: _index + 1,
          context: 'Referenced work',
        },
        targetEntityMetadata: {
          entityType: 'W' as EntityType,
          displayName: `Work ${referencedWorkId}`,
        },
      });
    });
  }

  // Related works (similar/related papers)
  if (work.related_works) {
    work.related_works.forEach((relatedWorkId, _index) => {
      relationships.push({
        sourceEntityId: workId,
        targetEntityId: relatedWorkId,
        relationshipType: GraphEdgeType.RELATED_TO,
        confidence: 0.6,
        properties: {
          position: _index + 1,
          context: 'Related work',
        },
        targetEntityMetadata: {
          entityType: 'W' as EntityType,
          displayName: `Work ${relatedWorkId}`,
        },
      });
    });
  }

  // Authorship relationships
  if (work.authorships) {
    work.authorships.forEach((authorship, _index) => {
      const authorId = authorship.author.id;
      
      relationships.push({
        sourceEntityId: workId,
        targetEntityId: authorId,
        relationshipType: GraphEdgeType.AUTHORED_BY,
        confidence: 0.95,
        properties: {
          position: _index + 1,
          authorshipInfo: {
            authorPosition: authorship.author_position,
            isCorresponding: authorship.is_corresponding,
            rawAuthorName: authorship.raw_author_name,
          },
          context: `Author ${_index + 1}`,
        },
        targetEntityMetadata: {
          entityType: 'A' as EntityType,
          displayName: authorship.author.display_name,
          additionalInfo: {
            orcid: authorship.author.orcid,
          },
        },
      });

      // Institutional affiliations
      authorship.institutions.forEach((institution, instIndex) => {
        relationships.push({
          sourceEntityId: workId,
          targetEntityId: institution.id,
          relationshipType: GraphEdgeType.AFFILIATED_WITH,
          confidence: 0.8,
          properties: {
            position: instIndex + 1,
            affiliationInfo: {
              isCurrent: true, // Assume current for publication
            },
            context: `Institution for author ${authorship.author.display_name}`,
          },
          targetEntityMetadata: {
            entityType: 'I' as EntityType,
            displayName: institution.display_name,
            additionalInfo: {
              ror: institution.ror,
              countryCode: institution.country_code,
              type: institution.type,
            },
          },
        });
      });
    });
  }

  // Publication source relationship
  if (work.primary_location?.source) {
    const {source} = work.primary_location;
    relationships.push({
      sourceEntityId: workId,
      targetEntityId: source.id,
      relationshipType: GraphEdgeType.PUBLISHED_IN,
      confidence: 0.9,
      properties: {
        context: 'Primary publication source',
        bibliographicInfo: {
          section: 'primary_location',
        },
      },
      targetEntityMetadata: {
        entityType: 'S' as EntityType,
        displayName: source.display_name,
        additionalInfo: {
          issn: source.issn,
          isOa: source.is_oa,
          type: source.type,
        },
      },
    });
  }

  // Additional publication locations
  if (work.locations) {
    work.locations.forEach((location, _index) => {
      if (location.source && location.source.id !== work.primary_location?.source?.id) {
        relationships.push({
          sourceEntityId: workId,
          targetEntityId: location.source.id,
          relationshipType: GraphEdgeType.PUBLISHED_IN,
          confidence: 0.7,
          properties: {
            position: _index + 1,
            context: 'Alternative publication location',
          },
          targetEntityMetadata: {
            entityType: 'S' as EntityType,
            displayName: location.source.display_name,
            additionalInfo: {
              issn: location.source.issn,
              isOa: location.source.is_oa,
              type: location.source.type,
            },
          },
        });
      }
    });
  }

  // Funding relationships
  if (work.grants) {
    work.grants.forEach((grant, _index) => {
      relationships.push({
        sourceEntityId: workId,
        targetEntityId: grant.funder,
        relationshipType: GraphEdgeType.FUNDED_BY,
        confidence: 0.85,
        properties: {
          position: _index + 1,
          context: `Grant: ${grant.award_id || 'Unknown award'}`,
          additionalProperties: {
            awardId: grant.award_id,
            funderDisplayName: grant.funder_display_name,
          },
        },
        targetEntityMetadata: {
          entityType: 'F' as EntityType,
          displayName: grant.funder_display_name || `Funder ${grant.funder}`,
        },
      });
    });
  }

  // Topic relationships
  if (work.primary_topic) {
    relationships.push({
      sourceEntityId: workId,
      targetEntityId: work.primary_topic.id,
      relationshipType: GraphEdgeType.PRIMARY_TOPIC,
      confidence: 0.9,
      properties: {
        context: 'Primary topic',
      },
      targetEntityMetadata: {
        entityType: 'T' as EntityType,
        displayName: work.primary_topic.display_name,
      },
    });
  }

  if (work.topics) {
    work.topics.forEach((topic, _index) => {
      if (topic.id !== work.primary_topic?.id) {
        relationships.push({
          sourceEntityId: workId,
          targetEntityId: topic.id,
          relationshipType: GraphEdgeType.HAS_TOPIC,
          confidence: 0.7,
          properties: {
            position: _index + 1,
            context: 'Additional topic',
          },
          targetEntityMetadata: {
            entityType: 'T' as EntityType,
            displayName: topic.display_name,
          },
        });
      }
    });
  }

  // Concept relationships (legacy)
  if (work.concepts) {
    work.concepts.forEach((concept, _index) => {
      relationships.push({
        sourceEntityId: workId,
        targetEntityId: concept.id,
        relationshipType: GraphEdgeType.HAS_CONCEPT,
        confidence: concept.score || 0.5,
        properties: {
          position: _index + 1,
          context: `Concept (score: ${concept.score})`,
          additionalProperties: {
            score: concept.score,
            level: concept.level,
          },
        },
        targetEntityMetadata: {
          entityType: 'C' as EntityType,
          displayName: concept.display_name,
        },
      });
    });
  }

  return relationships;
}

/**
 * Extract all relationships from an Author entity
 */
export function extractAuthorRelationships(author: Author): ExtractedRelationship[] {
  const relationships: ExtractedRelationship[] = [];
  const authorId = author.id;

  // Current affiliations
  if (author.affiliations) {
    author.affiliations.forEach((affiliation, _index) => {
      relationships.push({
        sourceEntityId: authorId,
        targetEntityId: affiliation.institution.id,
        relationshipType: GraphEdgeType.AFFILIATED_WITH,
        confidence: 0.8,
        properties: {
          position: _index + 1,
          affiliationInfo: {
            years: affiliation.years,
            isCurrent: affiliation.years.includes(new Date().getFullYear()),
          },
          context: `Affiliation with ${affiliation.institution.display_name}`,
        },
        targetEntityMetadata: {
          entityType: 'I' as EntityType,
          displayName: affiliation.institution.display_name,
          additionalInfo: {
            ror: affiliation.institution.ror,
            countryCode: affiliation.institution.country_code,
            type: affiliation.institution.type,
          },
        },
      });
    });
  }

  // Last known institutions
  if (author.last_known_institutions) {
    author.last_known_institutions.forEach((institution, _index) => {
      relationships.push({
        sourceEntityId: authorId,
        targetEntityId: institution.id,
        relationshipType: GraphEdgeType.AFFILIATED_WITH,
        confidence: 0.7,
        properties: {
          position: _index + 1,
          affiliationInfo: {
            isCurrent: true,
          },
          context: `Last known institution`,
        },
        targetEntityMetadata: {
          entityType: 'I' as EntityType,
          displayName: institution.display_name,
          additionalInfo: {
            ror: institution.ror,
            countryCode: institution.country_code,
            type: institution.type,
          },
        },
      });
    });
  }

  // Topic relationships
  if (author.topics) {
    author.topics.forEach((topic, _index) => {
      relationships.push({
        sourceEntityId: authorId,
        targetEntityId: topic.id,
        relationshipType: GraphEdgeType.HAS_TOPIC,
        confidence: 0.6,
        properties: {
          position: _index + 1,
          context: `Author research topic`,
        },
        targetEntityMetadata: {
          entityType: 'T' as EntityType,
          displayName: topic.display_name,
        },
      });
    });
  }

  return relationships;
}

/**
 * Extract all relationships from an Institution entity
 */
export function extractInstitutionRelationships(institution: Institution): ExtractedRelationship[] {
  const relationships: ExtractedRelationship[] = [];
  const institutionId = institution.id;

  // Associated institutions (hierarchical relationships)
  if (institution.associated_institutions) {
    institution.associated_institutions.forEach((associated, _index) => {
      let relationshipType: GraphEdgeType;
      
      switch (associated.relationship) {
        case 'parent':
          relationshipType = GraphEdgeType.CHILD_OF;
          break;
        case 'child':
          relationshipType = GraphEdgeType.PARENT_OF;
          break;
        case 'related':
          relationshipType = GraphEdgeType.RELATED_TO;
          break;
        default:
          relationshipType = GraphEdgeType.ASSOCIATED_WITH;
      }

      relationships.push({
        sourceEntityId: institutionId,
        targetEntityId: associated.id,
        relationshipType,
        confidence: 0.8,
        properties: {
          position: _index + 1,
          context: `${associated.relationship} institution`,
          additionalProperties: {
            relationshipType: associated.relationship,
          },
        },
        targetEntityMetadata: {
          entityType: 'I' as EntityType,
          displayName: associated.display_name,
          additionalInfo: {
            ror: associated.ror,
            countryCode: associated.country_code,
            type: associated.type,
          },
        },
      });
    });
  }

  // Topic relationships
  if (institution.topics) {
    institution.topics.forEach((topic, _index) => {
      relationships.push({
        sourceEntityId: institutionId,
        targetEntityId: topic.id,
        relationshipType: GraphEdgeType.HAS_TOPIC,
        confidence: 0.6,
        properties: {
          position: _index + 1,
          context: `Institution research focus`,
        },
        targetEntityMetadata: {
          entityType: 'T' as EntityType,
          displayName: topic.display_name,
        },
      });
    });
  }

  return relationships;
}

/**
 * Extract all relationships from a Source entity
 */
export function extractSourceRelationships(source: Source): ExtractedRelationship[] {
  const relationships: ExtractedRelationship[] = [];
  const sourceId = source.id;

  // Host organization relationship
  if (source.host_organization) {
    relationships.push({
      sourceEntityId: sourceId,
      targetEntityId: source.host_organization,
      relationshipType: GraphEdgeType.HOSTED_BY,
      confidence: 0.9,
      properties: {
        context: `Hosted by ${source.host_organization_name}`,
        additionalProperties: {
          hostOrganizationName: source.host_organization_name,
          hostOrganizationLineage: source.host_organization_lineage,
        },
      },
      targetEntityMetadata: {
        entityType: 'P' as EntityType, // Assuming publisher
        displayName: source.host_organization_name || `Organization ${source.host_organization}`,
      },
    });
  }

  // Topic relationships
  if (source.topics) {
    source.topics.forEach((topic, _index) => {
      relationships.push({
        sourceEntityId: sourceId,
        targetEntityId: topic.id,
        relationshipType: GraphEdgeType.HAS_TOPIC,
        confidence: 0.6,
        properties: {
          position: _index + 1,
          context: `Source subject area`,
        },
        targetEntityMetadata: {
          entityType: 'T' as EntityType,
          displayName: topic.display_name,
        },
      });
    });
  }

  return relationships;
}

/**
 * Extract all relationships from a Publisher entity
 */
export function extractPublisherRelationships(publisher: Publisher): ExtractedRelationship[] {
  const relationships: ExtractedRelationship[] = [];
  const publisherId = publisher.id;

  // Parent publisher relationship
  if (publisher.parent_publisher) {
    relationships.push({
      sourceEntityId: publisherId,
      targetEntityId: publisher.parent_publisher,
      relationshipType: GraphEdgeType.SUBSIDIARY_OF,
      confidence: 0.9,
      properties: {
        context: 'Parent publisher relationship',
        additionalProperties: {
          hierarchyLevel: publisher.hierarchy_level,
        },
      },
      targetEntityMetadata: {
        entityType: 'P' as EntityType,
        displayName: `Publisher ${publisher.parent_publisher}`,
      },
    });
  }

  // Sources published by this publisher
  if (publisher.sources) {
    publisher.sources.forEach((sourceId, _index) => {
      relationships.push({
        sourceEntityId: publisherId,
        targetEntityId: sourceId,
        relationshipType: GraphEdgeType.PUBLISHER_OF,
        confidence: 0.8,
        properties: {
          position: _index + 1,
          context: 'Published source',
        },
        targetEntityMetadata: {
          entityType: 'S' as EntityType,
          displayName: `Source ${sourceId}`,
        },
      });
    });
  }

  return relationships;
}

/**
 * Extract all relationships from a Topic entity
 */
export function extractTopicRelationships(topic: Topic): ExtractedRelationship[] {
  const relationships: ExtractedRelationship[] = [];
  const topicId = topic.id;

  // Hierarchical relationships
  if (topic.subfield) {
    relationships.push({
      sourceEntityId: topicId,
      targetEntityId: topic.subfield.id,
      relationshipType: GraphEdgeType.SUBFIELD_OF,
      confidence: 0.9,
      properties: {
        context: `Subfield: ${topic.subfield.display_name}`,
      },
      targetEntityMetadata: {
        entityType: 'T' as EntityType,
        displayName: topic.subfield.display_name,
      },
    });
  }

  if (topic.field) {
    relationships.push({
      sourceEntityId: topicId,
      targetEntityId: topic.field.id,
      relationshipType: GraphEdgeType.FIELD_OF,
      confidence: 0.9,
      properties: {
        context: `Field: ${topic.field.display_name}`,
      },
      targetEntityMetadata: {
        entityType: 'T' as EntityType,
        displayName: topic.field.display_name,
      },
    });
  }

  if (topic.domain) {
    relationships.push({
      sourceEntityId: topicId,
      targetEntityId: topic.domain.id,
      relationshipType: GraphEdgeType.DOMAIN_OF,
      confidence: 0.9,
      properties: {
        context: `Domain: ${topic.domain.display_name}`,
      },
      targetEntityMetadata: {
        entityType: 'T' as EntityType,
        displayName: topic.domain.display_name,
      },
    });
  }

  // Sibling topics
  if (topic.siblings) {
    topic.siblings.forEach((sibling, _index) => {
      relationships.push({
        sourceEntityId: topicId,
        targetEntityId: sibling.id,
        relationshipType: GraphEdgeType.SIBLING_OF,
        confidence: 0.7,
        properties: {
          position: _index + 1,
          context: `Sibling topic: ${sibling.display_name}`,
        },
        targetEntityMetadata: {
          entityType: 'T' as EntityType,
          displayName: sibling.display_name,
        },
      });
    });
  }

  return relationships;
}

/**
 * Extract all relationships from a Concept entity (legacy)
 */
export function extractConceptRelationships(concept: Concept): ExtractedRelationship[] {
  const relationships: ExtractedRelationship[] = [];
  const conceptId = concept.id;

  // Ancestor relationships
  if (concept.ancestors) {
    concept.ancestors.forEach((ancestor, _index) => {
      relationships.push({
        sourceEntityId: conceptId,
        targetEntityId: ancestor.id,
        relationshipType: GraphEdgeType.DESCENDANT_OF,
        confidence: 0.8,
        properties: {
          position: _index + 1,
          context: `Ancestor concept (level ${ancestor.level})`,
          additionalProperties: {
            ancestorLevel: ancestor.level,
          },
        },
        targetEntityMetadata: {
          entityType: 'C' as EntityType,
          displayName: ancestor.display_name,
        },
      });
    });
  }

  // Related concepts
  if (concept.related_concepts) {
    concept.related_concepts.forEach((related, _index) => {
      relationships.push({
        sourceEntityId: conceptId,
        targetEntityId: related.id,
        relationshipType: GraphEdgeType.RELATED_TO,
        confidence: related.score || 0.6,
        properties: {
          position: _index + 1,
          context: `Related concept (score: ${related.score})`,
          additionalProperties: {
            score: related.score,
            level: related.level,
          },
        },
        targetEntityMetadata: {
          entityType: 'C' as EntityType,
          displayName: related.display_name,
        },
      });
    });
  }

  return relationships;
}

/**
 * Main function to extract all relationships from any OpenAlex entity
 */
export function extractAllRelationships(entity: OpenAlexEntity): ExtractedRelationship[] {
  // Determine entity type and extract appropriate relationships
  if ('authorships' in entity) {
    return extractWorkRelationships(entity as Work);
  }
  
  if ('affiliations' in entity && !('authorships' in entity)) {
    return extractAuthorRelationships(entity as Author);
  }
  
  if ('geo' in entity || ('type' in entity && typeof entity.type === 'string' && ['education', 'healthcare', 'company'].includes(entity.type))) {
    return extractInstitutionRelationships(entity as Institution);
  }
  
  if ('is_oa' in entity && 'is_in_doaj' in entity) {
    return extractSourceRelationships(entity as Source);
  }
  
  if ('hierarchy_level' in entity) {
    return extractPublisherRelationships(entity as Publisher);
  }
  
  if ('subfield' in entity) {
    return extractTopicRelationships(entity as Topic);
  }
  
  if ('level' in entity) {
    return extractConceptRelationships(entity as Concept);
  }
  
  // For Funder and other entities without specific relationship extraction
  return [];
}

/**
 * Convert extracted relationships to RelationshipDiscoveryEvents
 */
export function relationshipsToEvents(
  relationships: ExtractedRelationship[],
  timestamp = new Date().toISOString()
): RelationshipDiscoveryEvent[] {
  return relationships.map(relationship => ({
    sourceEntityId: relationship.sourceEntityId,
    targetEntityId: relationship.targetEntityId,
    relationshipType: relationship.relationshipType,
    timestamp,
    source: 'openalex' as const,
    metadata: {
      confidence: relationship.confidence,
      context: relationship.properties.context,
      targetEntityType: relationship.targetEntityMetadata?.entityType,
      targetDisplayName: relationship.targetEntityMetadata?.displayName,
      ...relationship.properties.additionalProperties,
      ...relationship.targetEntityMetadata?.additionalInfo,
    },
  }));
}

/**
 * Batch process multiple entities and extract all their relationships
 */
export function batchExtractRelationships(
  entities: OpenAlexEntity[],
  timestamp = new Date().toISOString()
): RelationshipDiscoveryEvent[] {
  const allRelationships: ExtractedRelationship[] = [];
  
  entities.forEach(entity => {
    const entityRelationships = extractAllRelationships(entity);
    allRelationships.push(...entityRelationships);
  });
  
  return relationshipsToEvents(allRelationships, timestamp);
}

/**
 * Extract co-occurrence relationships (derived relationships)
 */
export function extractCoOccurrenceRelationships(
  entities: OpenAlexEntity[],
  timestamp = new Date().toISOString()
): RelationshipDiscoveryEvent[] {
  const coOccurrenceEvents: RelationshipDiscoveryEvent[] = [];
  
  // Group works by their authors to find co-authorship
  const worksByAuthors = new Map<string, string[]>();
  
  entities.forEach(entity => {
    if ('authorships' in entity) {
      const work = entity as Work;
      work.authorships.forEach(authorship => {
        const authorId = authorship.author.id;
        if (!worksByAuthors.has(authorId)) {
          worksByAuthors.set(authorId, []);
        }
        worksByAuthors.get(authorId)!.push(work.id);
      });
    }
  });
  
  // Create co-authorship edges
  worksByAuthors.forEach((workIds, authorId) => {
    if (workIds.length > 1) {
      // This author has multiple works, create co-authorship relationships
      // between this author and all other authors on the same works
      workIds.forEach(workId => {
        const work = entities.find(e => e.id === workId) as Work;
        if (work && work.authorships) {
          work.authorships.forEach(authorship => {
            const coAuthorId = authorship.author.id;
            if (coAuthorId !== authorId) {
              coOccurrenceEvents.push({
                sourceEntityId: authorId,
                targetEntityId: coAuthorId,
                relationshipType: GraphEdgeType.CO_AUTHORED_WITH,
                timestamp,
                source: 'derived',
                metadata: {
                  confidence: 0.8,
                  context: `Co-authored work: ${work.display_name}`,
                  workId: work.id,
                },
              });
            }
          });
        }
      });
    }
  });
  
  return coOccurrenceEvents;
}

/**
 * Validate that a relationship can be created between two entity types
 */
export function isValidRelationship(
  sourceEntityType: EntityType,
  targetEntityType: EntityType,
  relationshipType: GraphEdgeType
): boolean {
  const validRelationships: Record<string, EntityType[]> = {
    [GraphEdgeType.CITES]: [EntityType.WORK],
    [GraphEdgeType.AUTHORED_BY]: [EntityType.AUTHOR],
    [GraphEdgeType.AFFILIATED_WITH]: [EntityType.INSTITUTION],
    [GraphEdgeType.PUBLISHED_IN]: [EntityType.SOURCE],
    [GraphEdgeType.FUNDED_BY]: [EntityType.FUNDER],
    [GraphEdgeType.HAS_TOPIC]: [EntityType.TOPIC],
    [GraphEdgeType.HAS_CONCEPT]: [EntityType.CONCEPT],
    [GraphEdgeType.HOSTED_BY]: [EntityType.PUBLISHER],
    [GraphEdgeType.SUBSIDIARY_OF]: [EntityType.PUBLISHER],
    [GraphEdgeType.PARENT_OF]: [EntityType.INSTITUTION, EntityType.PUBLISHER],
    [GraphEdgeType.CHILD_OF]: [EntityType.INSTITUTION, EntityType.PUBLISHER],
    [GraphEdgeType.SUBFIELD_OF]: [EntityType.TOPIC],
    [GraphEdgeType.FIELD_OF]: [EntityType.TOPIC],
    [GraphEdgeType.DOMAIN_OF]: [EntityType.TOPIC],
  };
  
  const allowedTargets = validRelationships[relationshipType];
  return allowedTargets ? allowedTargets.includes(targetEntityType) : true;
}

/**
 * Get the display name for an entity ID if available in the extracted metadata
 */
export function getEntityDisplayName(
  entityId: string,
  relationships: ExtractedRelationship[]
): string | null {
  const relationship = relationships.find(
    r => r.targetEntityId === entityId && r.targetEntityMetadata?.displayName
  );
  
  return relationship?.targetEntityMetadata?.displayName || null;
}