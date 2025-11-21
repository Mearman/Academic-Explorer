/**
 * Relationship Detection Service
 * Automatically detects and creates relationships between newly added nodes and existing graph nodes
 */

import { graphStore } from "../stores/graph-store";
import type { OpenAlexEntity, EntityType } from "@academic-explorer/types";
import {
  isAuthor,
  isInstitution,
  isNonNull,
  isSource,
  isWork,
} from "@academic-explorer/types";
import {
  ADVANCED_FIELD_SELECTIONS,
  cachedOpenAlex,
} from "@academic-explorer/client";
import type {
  GraphEdge,
  GraphNode,
} from "@academic-explorer/graph";
import { EntityDetectionService, RelationType } from "@academic-explorer/graph";
import { logError, logger } from "@academic-explorer/utils/logger";
import { QueryClient } from "@tanstack/react-query";
import {
  RequestDeduplicationService,
  createRequestDeduplicationService,
} from "./request-deduplication-service";

/**
 * Minimal entity data needed for relationship detection
 * Contains only the essential fields to determine relationships
 */
export interface MinimalEntityData {
  id: string;
  entityType: EntityType;
  display_name: string;
  authorships?: Array<{ author: { id: string; display_name: string } }>;
  primary_location?: { source?: { id: string; display_name: string } };
  referenced_works?: string[];
  affiliations?: Array<{ institution: { id: string; display_name: string } }>;
  last_known_institutions?: Array<{ id: string; display_name: string }>;
  lineage?: string[];
  publisher?: string;
  // Taxonomy relationships
  fields?: Array<{ id: string; display_name: string }>;
  domain?: { id: string; display_name: string };
  subfields?: Array<{ id: string; display_name: string }>;
  field?: { id: string; display_name: string };
  topics?: Array<{
    id: string;
    display_name: string;
    count?: number;
    score?: number;
    subfield?: { id: string; display_name: string };
    field?: { id: string; display_name: string };
    domain?: { id: string; display_name: string };
  }>;
  subfield?: { id: string; display_name: string };

  // New relationship fields for complete OpenAlex support
  grants?: Array<{                          // T021: Add grants field
    funder: string;
    funder_display_name: string;
    award_id: string | null;
  }>;
  keywords?: Array<{                       // T022: Add keywords field
    id: string;
    display_name: string;
    score?: number;
  }>;
  concepts?: Array<{                        // T023: Add concepts field (legacy)
    id: string;
    display_name: string;
    score: number;
    level: number;
    wikidata?: string;
  }>;
  enhanced_topics?: Array<{                // T024: Add enhanced topics with count/score
    id: string;
    display_name: string;
    count: number;
    score: number;
    subfield: { id: string; display_name: string };
    field: { id: string; display_name: string };
    domain: { id: string; display_name: string };
  }>;
  repositories?: Array<{                  // T025: Add repositories field
    id: string;
    display_name: string;
    host_organization: string;
  }>;
  roles?: Array<{                          // T026: Add roles field
    role: string;
    id: string;
    works_count: number;
  }>;
}

/**
 * Detected relationship between nodes
 */
export interface DetectedRelationship {
  sourceNodeId: string; // Entity that owns the relationship data
  targetNodeId: string; // Entity being referenced
  relationType: RelationType;
  direction: 'outbound' | 'inbound'; // Data ownership direction
  label: string;
  weight?: number;
  metadata?: Record<string, unknown>; // OpenAlex relationship metadata
}

/**
 * Helper function to create a minimal GraphNode for testing
 */
export function createTestGraphNode(params: {
  id: string;
  entityId: string;
  entityType: string;
  label: string;
  x?: number;
  y?: number;
  color?: string;
  size?: number;
}): GraphNode {
  return {
    id: params.id,
    entityType: params.entityType as any,
    label: params.label,
    entityId: params.entityId,
    x: params.x ?? 0,
    y: params.y ?? 0,
    externalIds: [],
    entityData: {
      color: params.color,
      size: params.size,
    },
  };
}

/**
 * Service for automatically detecting relationships between newly added nodes and existing graph nodes
 */
export class RelationshipDetectionService {
  private detector: EntityDetectionService;
  private queryClient: QueryClient;
  private deduplicationService: RequestDeduplicationService;

  constructor(queryClient: QueryClient) {
    this.detector = new EntityDetectionService();
    this.queryClient = queryClient;
    this.deduplicationService = createRequestDeduplicationService(queryClient);
  }

  /**
   * Detect and create relationships for multiple nodes in batch
   * Uses two-pass approach to find relationships between nodes added in the same batch
   */
  async detectRelationshipsForNodes(nodeIds: string[]): Promise<GraphEdge[]> {
    logger.debug(
      "relationship-detection",
      "detectRelationshipsForNodes called",
      { nodeCount: nodeIds.length, nodeIds },
    );

    if (nodeIds.length === 0) return [];

    logger.debug(
      "graph",
      "STARTING batch relationship detection with two-pass approach",
      {
        nodeCount: nodeIds.length,
        nodeIds,
      },
      "RelationshipDetectionService",
    );

    // Log the node types being processed
    const store = graphStore;
    const nodeTypes = nodeIds.map((id) => {
      const node = store.getNode(id);
      return node ? `${id}(${node.entityType})` : `${id}(not found)`;
    });
    logger.debug(
      "graph",
      "Processing nodes by type",
      {
        nodeTypes,
      },
      "RelationshipDetectionService",
    );

    const allNewEdges: GraphEdge[] = [];

    // Two-pass approach:
    // Pass 1: Process each node individually (finds relationships with pre-existing nodes)
    for (const nodeId of nodeIds) {
      try {
        const edges = await this.detectRelationshipsForNode(nodeId);
        allNewEdges.push(...edges);
      } catch (error) {
        logError(
          logger,
          "Failed to detect relationships for node in batch pass 1",
          error,
          "RelationshipDetectionService",
          "graph",
        );
      }
    }

    // Pass 2: Re-check all nodes for relationships with each other (cross-batch relationships)
    logger.debug(
      "graph",
      "Starting pass 2: cross-batch relationship detection",
      {
        nodeCount: nodeIds.length,
      },
      "RelationshipDetectionService",
    );

    for (const nodeId of nodeIds) {
      try {
        const crossBatchEdges = await this.detectCrossBatchRelationships({
          nodeId,
          batchNodeIds: nodeIds,
        });
        allNewEdges.push(...crossBatchEdges);
      } catch (error) {
        logError(
          logger,
          "Failed to detect cross-batch relationships for node",
          error,
          "RelationshipDetectionService",
          "graph",
        );
      }
    }

    // Remove duplicate edges (same source-target-type combinations)
    const uniqueEdges = this.deduplicateEdges(allNewEdges);

    logger.debug(
      "graph",
      "Batch relationship detection completed",
      {
        processedNodeCount: nodeIds.length,
        totalEdgesCreated: uniqueEdges.length,
        duplicatesRemoved: allNewEdges.length - uniqueEdges.length,
      },
      "RelationshipDetectionService",
    );

    return uniqueEdges;
  }

  /**
   * Detect and create relationships for a newly added node
   * Fetches minimal data and analyzes relationships with existing nodes
   */
  async detectRelationshipsForNode(nodeId: string): Promise<GraphEdge[]> {
    const store = graphStore;
    const existingNodes = Object.values(store.nodes) as GraphNode[];

    // Get the node from the store
    const node = store.getNode(nodeId);
    if (!node) {
      return [];
    }

    // Skip minimal hydration nodes - they don't have enough data for relationship detection
    if (node.metadata?.hydrationLevel === "minimal") {
      return [];
    }

    // Use existing entity data from the node if it has sufficient fields for relationship detection
    let entityData: MinimalEntityData | null = null;

    // Check if the node already has entity data with required fields
    if (
      node.entityData &&
      this.hasSufficientEntityData(node.entityData, node.entityType)
    ) {
      entityData = this.convertNodeEntityDataToMinimal(
        node.entityData,
        node.entityType,
      );
    } else {
      // Fetch fresh entity data for relationship detection to ensure we have all necessary fields
      entityData = await this.fetchMinimalEntityData({
        entityId: node.entityId,
        entityType: node.entityType,
      });
    }

    if (!entityData) {
      return [];
    }

    // Analyze relationships based on entity type
    const relationships = await this.analyzeRelationships({
      newEntityData: entityData,
      existingNodes,
    });

    // Create edges from relationships
    const edges = relationships.map((rel) => ({
      id: `${rel.sourceNodeId}-${rel.targetNodeId}-${rel.relationType}`,
      source: rel.sourceNodeId,
      target: rel.targetNodeId,
      type: rel.relationType,
      label: rel.label,
    }));

    // Add edges to the store
    store.addEdges(edges);

    return edges;
  }

  /**
   * Check if existing entity data has sufficient fields for relationship detection
   */
  private hasSufficientEntityData(
    entityData: Record<string, unknown>,
    entityType: EntityType,
  ): boolean {
    if (!entityData || typeof entityData !== "object") return false;

    switch (entityType) {
      case "works":
        return (
          "authorships" in entityData &&
          "primary_location" in entityData &&
          "referenced_works" in entityData
        );
      case "authors":
        return (
          "affiliations" in entityData ||
          "last_known_institutions" in entityData
        );
      case "sources":
        return "id" in entityData && "display_name" in entityData;
      case "institutions":
        return "lineage" in entityData;
      default:
        return "id" in entityData && "display_name" in entityData;
    }
  }

  /**
   * Convert existing node entity data to minimal format for relationship detection
   */
  private convertNodeEntityDataToMinimal(
    entityData: Record<string, unknown>,
    entityType: EntityType,
  ): MinimalEntityData {
    return {
      id: entityData.id as string,
      entityType,
      display_name: entityData.display_name as string,
      authorships: entityData.authorships as MinimalEntityData["authorships"],
      primary_location: entityData.primary_location as MinimalEntityData["primary_location"],
      referenced_works: entityData.referenced_works as string[] | undefined,
      affiliations: entityData.affiliations as MinimalEntityData["affiliations"],
      last_known_institutions: entityData.last_known_institutions as MinimalEntityData["last_known_institutions"],
      lineage: entityData.lineage as string[] | undefined,
      publisher: entityData.publisher as string | undefined,
    };
  }

  /**
   * Fetch minimal entity data required for relationship detection
   * Uses field selection to minimize API response size and improve performance
   */
  private async fetchMinimalEntityData({
    entityId,
    entityType,
  }: {
    entityId: string;
    entityType: EntityType;
  }): Promise<MinimalEntityData | null> {
    try {
      // Use advanced type-safe field selections with minimal fields
      const getMinimalFields = (entityType: EntityType): string[] => {
        switch (entityType) {
          case "works":
            return ADVANCED_FIELD_SELECTIONS.works.minimal;
          case "authors":
            return ADVANCED_FIELD_SELECTIONS.authors.minimal;
          case "sources":
            return ADVANCED_FIELD_SELECTIONS.sources.minimal;
          case "institutions":
            return ADVANCED_FIELD_SELECTIONS.institutions.minimal;
          case "concepts":
            return ADVANCED_FIELD_SELECTIONS.concepts.minimal;
          case "topics":
            return ADVANCED_FIELD_SELECTIONS.topics.minimal;
          case "publishers":
            return ADVANCED_FIELD_SELECTIONS.publishers.minimal;
          case "funders":
            return ADVANCED_FIELD_SELECTIONS.funders.minimal;
          case "domains":
            return ADVANCED_FIELD_SELECTIONS.domains.minimal;
          case "fields":
            return ADVANCED_FIELD_SELECTIONS.fields.minimal;
          case "subfields":
            return ADVANCED_FIELD_SELECTIONS.subfields.minimal;
          default:
            return ["id", "display_name"]; // Default for keywords or unknown types
        }
      };

      const selectFields = getMinimalFields(entityType);

      // Deduplication service is always initialized in constructor

      // Fetch entity with minimal fields using deduplication service
      const entity = await this.deduplicationService.getEntity({
        entityId,
        fetcher: () =>
          this.fetchEntityWithSelect({ entityId, entityType, selectFields }),
      });

      logger.debug(
        "graph",
        "Entity fetch result",
        {
          entityId,
          entityFetched: !!entity,
        },
        "RelationshipDetectionService",
      );

      const resolvedId =
        typeof entity.id === "string" && entity.id.length > 0
          ? entity.id
          : entityId;

      if (resolvedId !== entity.id) {
        logger.warn(
          "relationship-detection",
          "Fetched entity is missing a valid id, using fallback",
          {
            requestedEntityId: entityId,
            resolvedId,
            entityType,
            receivedKeys: Object.keys(entity),
          },
          "RelationshipDetectionService",
        );
      }

      const entityWithId =
        typeof entity.id === "string" && entity.id.length > 0
          ? entity
          : { ...entity, id: resolvedId };

      // Transform to minimal data format
      const minimalData: MinimalEntityData = {
        id: resolvedId,
        entityType,
        display_name: entity.display_name,
      };

      logger.debug(
        "graph",
        "Entity fetched with fields",
        {
          entityId,
          entityType,
          hasReferencedWorks: "referenced_works" in entity,
          referencedWorks:
            "referenced_works" in entity
              ? (entity as { referenced_works?: string[] }).referenced_works
              : undefined,
          entityKeys: Object.keys(entity),
        },
        "RelationshipDetectionService",
      );

      // Add type-specific fields
      switch (entityType) {
        case "works": {
          if (isWork(entityWithId)) {
            // Type assertion after guard check for Work-specific properties
            const work = entityWithId as Extract<typeof entityWithId, { authorships?: unknown }>;
            Object.assign(minimalData, {
              authorships: work.authorships,
              ...(work.primary_location && {
                primary_location: work.primary_location,
              }),
              ...(work.referenced_works && {
                referenced_works: work.referenced_works,
              }),
            });
          }

          // Extract topics field for work→topic relationships
          const workRecord = entityWithId as Record<string, unknown>;
          if ("topics" in workRecord && Array.isArray(workRecord.topics)) {
            Object.assign(minimalData, { topics: workRecord.topics });
          }

          // Extract grants field for work→funder relationships (T024)
          if ("grants" in workRecord && Array.isArray(workRecord.grants)) {
            Object.assign(minimalData, { grants: workRecord.grants });
          }

          // Extract keywords field for work→keyword relationships (T025)
          if ("keywords" in workRecord && Array.isArray(workRecord.keywords)) {
            Object.assign(minimalData, { keywords: workRecord.keywords });
          }

          // Extract concepts field for work→concept relationships (legacy) (T026)
          if ("concepts" in workRecord && Array.isArray(workRecord.concepts)) {
            Object.assign(minimalData, { concepts: workRecord.concepts });
          }
          break;
        }
        case "authors": {
          if (!isAuthor(entityWithId)) {
            logger.error(
              "relationship-detection",
              "Entity failed author validation in minimal data fetching",
              {
                entityId: resolvedId,
                entityKeys: Object.keys(entityWithId),
                startsWithA:
                  resolvedId.startsWith("A") ||
                  resolvedId.startsWith("https://openalex.org/A") ||
                  resolvedId.startsWith("a") ||
                  resolvedId.startsWith("https://openalex.org/a"),
              },
              "RelationshipDetectionService",
            );
            break;
          }

          const normalizedAffiliations = Array.isArray(
            entityWithId.affiliations,
          )
            ? entityWithId.affiliations.filter((affiliation: Record<string, unknown>) =>
                Boolean(
                  (affiliation?.institution as Record<string, unknown>)?.id &&
                    typeof (affiliation.institution as Record<string, unknown>).id === "string",
                ),
              )
            : [];

          const normalizedLastKnown = Array.isArray(
            (entityWithId as Record<string, unknown>).last_known_institutions,
          )
            ? ((entityWithId as Record<string, unknown>).last_known_institutions as Record<string, unknown>[])
                .filter((institution: Record<string, unknown>) =>
                Boolean(institution?.id && typeof institution.id === "string"),
              )
            : [];

          if (normalizedAffiliations.length > 0) {
            Object.assign(minimalData, {
              affiliations: normalizedAffiliations,
            });
          }

          if (normalizedLastKnown.length > 0) {
            Object.assign(minimalData, {
              last_known_institutions: normalizedLastKnown,
            });
          }
          break;
        }
        case "sources": {
          if (isSource(entityWithId)) {
            const sourceRecord = entityWithId as Record<string, unknown>;
            if ("publisher" in sourceRecord && sourceRecord.publisher) {
              Object.assign(minimalData, {
                publisher: sourceRecord.publisher,
              });
            }
          }
          break;
        }
        case "institutions": {
          if (isInstitution(entityWithId)) {
            Object.assign(minimalData, {
              ...("lineage" in entityWithId && entityWithId.lineage && { lineage: entityWithId.lineage }),
            });
          }
          break;
        }
        case "domains": {
          const domainRecord = entityWithId as Record<string, unknown>;
          if ("fields" in domainRecord && Array.isArray(domainRecord.fields)) {
            Object.assign(minimalData, {
              fields: domainRecord.fields,
            });
          }
          break;
        }
        case "fields": {
          const fieldRecord = entityWithId as Record<string, unknown>;
          if ("domain" in fieldRecord && fieldRecord.domain) {
            Object.assign(minimalData, {
              domain: fieldRecord.domain,
            });
          }
          if ("subfields" in fieldRecord && Array.isArray(fieldRecord.subfields)) {
            Object.assign(minimalData, {
              subfields: fieldRecord.subfields,
            });
          }
          break;
        }
        case "subfields": {
          const subfieldRecord = entityWithId as Record<string, unknown>;
          if ("field" in subfieldRecord && subfieldRecord.field) {
            Object.assign(minimalData, {
              field: subfieldRecord.field,
            });
          }
          if ("domain" in subfieldRecord && subfieldRecord.domain) {
            Object.assign(minimalData, {
              domain: subfieldRecord.domain,
            });
          }
          if ("topics" in subfieldRecord && Array.isArray(subfieldRecord.topics)) {
            Object.assign(minimalData, {
              topics: subfieldRecord.topics,
            });
          }
          break;
        }
        case "topics": {
          const topicRecord = entityWithId as Record<string, unknown>;
          if ("subfield" in topicRecord && topicRecord.subfield) {
            Object.assign(minimalData, {
              subfield: topicRecord.subfield,
            });
          }
          if ("field" in topicRecord && topicRecord.field) {
            Object.assign(minimalData, {
              field: topicRecord.field,
            });
          }
          if ("domain" in topicRecord && topicRecord.domain) {
            Object.assign(minimalData, {
              domain: topicRecord.domain,
            });
          }
          break;
        }
      }

      logger.debug(
        "graph",
        "Minimal entity data fetched successfully",
        {
          entityId,
          entityType,
          hasAuthorships: !!minimalData.authorships?.length,
          hasAffiliations: !!minimalData.affiliations?.length,
          hasReferences: !!minimalData.referenced_works?.length,
          referencedWorksCount: minimalData.referenced_works?.length ?? 0,
        },
        "RelationshipDetectionService",
      );

      return minimalData;
    } catch (error) {
      logError(
        logger,
        "Failed to fetch minimal entity data",
        error,
        "RelationshipDetectionService",
        "graph",
      );
      return null;
    }
  }

  /**
   * Analyze relationships between the new entity and existing graph nodes
   */
  private async analyzeRelationships({
    newEntityData,
    existingNodes,
  }: {
    newEntityData: MinimalEntityData;
    existingNodes: GraphNode[];
  }): Promise<DetectedRelationship[]> {
    const relationships: DetectedRelationship[] = [];

    logger.debug(
      "graph",
      "Analyzing relationships",
      {
        newEntityId: newEntityData.id,
        newEntityType: newEntityData.entityType,
        existingNodeCount: existingNodes.length,
      },
      "RelationshipDetectionService",
    );

    logger.debug(
      "graph",
      "Processing entity for relationships",
      {
        entityId: newEntityData.id,
        entityType: newEntityData.entityType,
        hasReferencedWorks:
          "referenced_works" in newEntityData &&
          !!newEntityData.referenced_works,
        referencedWorksCount:
          "referenced_works" in newEntityData &&
          Array.isArray(newEntityData.referenced_works)
            ? newEntityData.referenced_works.length
            : 0,
        existingNodeIds: existingNodes.map((n) => n.entityId),
      },
      "RelationshipDetectionService",
    );

    // Analyze relationships based on entity type
    switch (newEntityData.entityType) {
      case "works":
        logger.debug(
          "graph",
          "About to analyze work relationships",
          {
            workId: newEntityData.id,
            hasReferencedWorks:
              "referenced_works" in newEntityData &&
              !!newEntityData.referenced_works,
          },
          "RelationshipDetectionService",
        );
        logger.debug(
          "relationship-detection",
          "Calling analyzeWorkRelationships",
          { entityId: newEntityData.id },
        );
        relationships.push(
          ...(await this.analyzeWorkRelationships({
            workData: newEntityData,
            existingNodes,
          })),
        );
        break;
      case "authors":
        relationships.push(
          ...this.analyzeAuthorRelationships({
            authorData: newEntityData,
            existingNodes,
          }),
          ...this.analyzeTopicRelationshipsForEntity({
            entityData: newEntityData,
            entityType: 'authors',
            existingNodes,
          }),
        );
        break;
      case "sources":
        relationships.push(
          ...this.analyzeSourceRelationships({
            sourceData: newEntityData,
            existingNodes,
          }),
          ...this.analyzeTopicRelationshipsForEntity({
            entityData: newEntityData,
            entityType: 'sources',
            existingNodes,
          }),
        );
        break;
      case "institutions":
        relationships.push(
          ...this.analyzeInstitutionRelationships({
            institutionData: newEntityData,
            existingNodes,
          }),
          ...this.analyzeTopicRelationshipsForEntity({
            entityData: newEntityData,
            entityType: 'institutions',
            existingNodes,
          }),
        );
        break;
      case "domains":
        relationships.push(
          ...this.analyzeDomainRelationships({
            domainData: newEntityData,
            existingNodes,
          }),
        );
        break;
      case "fields":
        relationships.push(
          ...this.analyzeFieldRelationships({
            fieldData: newEntityData,
            existingNodes,
          }),
        );
        break;
      case "subfields":
        relationships.push(
          ...this.analyzeSubfieldRelationships({
            subfieldData: newEntityData,
            existingNodes,
          }),
        );
        break;
      case "topics":
        relationships.push(
          ...this.analyzeTopicRelationships({
            topicData: newEntityData,
            existingNodes,
          }),
        );
        break;
    }

    // Deduplicate relationship types using Record pattern
    const relationshipTypesRecord: Record<string, boolean> = {};
    for (const relationship of relationships) {
      relationshipTypesRecord[relationship.relationType] = true;
    }
    const uniqueRelationshipTypes = Object.keys(relationshipTypesRecord);

    logger.debug(
      "graph",
      "Relationship analysis completed",
      {
        newEntityId: newEntityData.id,
        detectedCount: relationships.length,
        relationshipTypes: uniqueRelationshipTypes,
      },
      "RelationshipDetectionService",
    );

    return relationships;
  }

  /**
   * Analyze relationships for a Work entity
   */
  /**
   * Fetch referenced_works for a work entity if not already present
   */
  private async fetchReferencedWorksForWork(
    workId: string,
  ): Promise<string[] | undefined> {
    try {
      logger.debug(
        "graph",
        "Fetching referenced_works for work entity",
        {
          workId,
        },
        "RelationshipDetectionService",
      );

      const workData = await cachedOpenAlex.client.works.getWork(workId, {
        select: ["id", "referenced_works"],
      });

      return workData.referenced_works;
    } catch (error) {
      logger.error(
        "graph",
        "Failed to fetch referenced_works for work",
        {
          workId,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        "RelationshipDetectionService",
      );
      return undefined;
    }
  }

  // Helper functions to reduce cognitive complexity
  private analyzeAuthorRelationshipsForWork({
    workData,
    existingNodes,
    relationships,
  }: {
    workData: MinimalEntityData;
    existingNodes: GraphNode[];
    relationships: DetectedRelationship[];
  }): void {
    if (workData.authorships) {
      for (const authorship of workData.authorships) {
        const authorNode = existingNodes.find(
          (node) =>
            node.entityId === authorship.author.id ||
            node.id === authorship.author.id,
        );
        if (authorNode) {
          relationships.push({
            sourceNodeId: workData.id, // Work owns the authorships[] data
            targetNodeId: authorship.author.id, // Author is referenced
            relationType: RelationType.AUTHORSHIP,
            direction: 'outbound',
            label: "authorship",
            weight: 1.0,
          });
        }
      }
    }
  }

  private analyzeSourceRelationshipsForWork({
    workData,
    existingNodes,
    relationships,
  }: {
    workData: MinimalEntityData;
    existingNodes: GraphNode[];
    relationships: DetectedRelationship[];
  }): void {
    if (workData.primary_location?.source) {
      const sourceId = workData.primary_location.source.id;
      const sourceNode = existingNodes.find(
        (node) => node.entityId === sourceId || node.id === sourceId,
      );
      if (sourceNode) {
        relationships.push({
          sourceNodeId: workData.id, // Work owns primary_location.source data
          targetNodeId: sourceId, // Source/venue
          relationType: RelationType.PUBLICATION,
          direction: 'outbound',
          label: "publication",
        });
      }
    }
  }

  private analyzeTopicRelationshipsForWork({
    workData,
    existingNodes,
    relationships,
  }: {
    workData: MinimalEntityData;
    existingNodes: GraphNode[];
    relationships: DetectedRelationship[];
  }): void {
    if (workData.topics && Array.isArray(workData.topics)) {
      for (const topicRef of workData.topics) {
        const topicId = typeof topicRef === "string" ? topicRef : (topicRef as { id: string }).id;
        if (topicId && topicId !== workData.id) {
          const topicNode = existingNodes.find(
            (node) => node.entityId === topicId || node.id === topicId,
          );
          if (topicNode) {
            relationships.push({
              sourceNodeId: workData.id, // Work owns the topics[] data
              targetNodeId: topicId, // Topic is referenced
              relationType: RelationType.TOPIC,
              direction: 'outbound',
              label: "topic",
            });
          }
        }
      }
    }
  }

  private async analyzeCitationRelationshipsForWork({
    workData,
    existingNodes,
    relationships,
  }: {
    workData: MinimalEntityData;
    existingNodes: GraphNode[];
    relationships: DetectedRelationship[];
  }): Promise<void> {
    let referencedWorks = workData.referenced_works;

    // Get referenced_works from the graph node data if not present
    if (!referencedWorks) {
      const store = graphStore;
      const graphNode = Object.values(store.nodes).find(
        (node: GraphNode) => node.entityId === workData.id,
      ) as GraphNode | undefined;
      const referencedWorksFromNode =
        graphNode?.entityData &&
        (graphNode.entityData as { referenced_works?: string[] })
          ?.referenced_works;
      if (referencedWorksFromNode && referencedWorksFromNode.length > 0) {
        referencedWorks = referencedWorksFromNode;
      }
    }

    // Fetch referenced_works if still not present
    if (!referencedWorks) {
      referencedWorks = await this.fetchReferencedWorksForWork(workData.id);
    }

    if (referencedWorks && referencedWorks.length > 0) {
      for (const referencedWorkId of referencedWorks) {
        const referencedNode = existingNodes.find(
          (node) =>
            node.entityId === referencedWorkId || node.id === referencedWorkId,
        );

        if (referencedNode) {
          relationships.push({
            sourceNodeId: workData.id, // Work owns the referenced_works[] data
            targetNodeId: referencedWorkId, // Referenced work
            relationType: RelationType.REFERENCE,
            direction: 'outbound',
            label: "reference",
          });
        }
      }
    }
  }

  /**
   * Analyze grant relationships for a Work entity (T023)
   * Work → Funder relationships via work.grants[] array
   */
  private analyzeGrantsForWork({
    workData,
    existingNodes,
    relationships,
  }: {
    workData: MinimalEntityData;
    existingNodes: GraphNode[];
    relationships: DetectedRelationship[];
  }): void {
    if (workData.grants && Array.isArray(workData.grants)) {
      for (const grant of workData.grants) {
        // Grant data structure: { funder: string, funder_display_name: string, award_id: string | null }
        const funderId = grant.funder;
        if (funderId && funderId !== workData.id) {
          const funderNode = existingNodes.find(
            (node) => node.entityId === funderId || node.id === funderId,
          );
          if (funderNode) {
            relationships.push({
              sourceNodeId: workData.id, // Work owns the grants[] data
              targetNodeId: funderId, // Funder is referenced
              relationType: RelationType.FUNDED_BY,
              direction: 'outbound',
              label: "funded by",
              metadata: {
                funderDisplayName: grant.funder_display_name,
                awardId: grant.award_id,
              },
            });

            logger.debug(
              "relationship-detection",
              "Created work→funder relationship",
              {
                workId: workData.id,
                workTitle: workData.display_name,
                funderId,
                funderDisplayName: grant.funder_display_name,
                awardId: grant.award_id,
              },
              "RelationshipDetectionService",
            );
          }
        }
      }
    }
  }

  /**
   * Analyze keyword relationships for a Work entity (T025)
   * Work → Keyword relationships via work.keywords[] array
   */
  private analyzeKeywordsForWork({
    workData,
    existingNodes,
    relationships,
  }: {
    workData: MinimalEntityData;
    existingNodes: GraphNode[];
    relationships: DetectedRelationship[];
  }): void {
    if (workData.keywords && Array.isArray(workData.keywords)) {
      for (const keyword of workData.keywords) {
        const keywordId = keyword.id || keyword.display_name;
        if (keywordId && keywordId !== workData.id) {
          const keywordNode = existingNodes.find(
            (node) => node.entityId === keywordId || node.id === keywordId,
          );
          if (keywordNode) {
            relationships.push({
              sourceNodeId: workData.id,
              targetNodeId: keywordId,
              relationType: RelationType.WORK_HAS_KEYWORD,
              direction: "outbound",
              label: "has keyword",
              metadata: {
                keywordDisplayName: keyword.display_name,
                keywordScore: keyword.score,
              },
            });

            logger.debug(
              "relationship-detection",
              "Created work→keyword relationship",
              {
                workId: workData.id,
                workTitle: workData.display_name,
                keywordId,
                keywordDisplayName: keyword.display_name,
                keywordScore: keyword.score,
              },
              "RelationshipDetectionService",
            );
          }
        }
      }
    }
  }

  private async analyzeWorkRelationships({
    workData,
    existingNodes,
  }: {
    workData: MinimalEntityData;
    existingNodes: GraphNode[];
  }): Promise<DetectedRelationship[]> {
    const relationships: DetectedRelationship[] = [];

    logger.debug(
      "graph",
      "Analyzing work relationships",
      {
        workId: workData.id,
        hasReferencedWorks: !!workData.referenced_works,
        referencedWorksCount: workData.referenced_works?.length ?? 0,
        existingNodesCount: existingNodes.length,
      },
      "RelationshipDetectionService",
    );

    this.analyzeAuthorRelationshipsForWork({
      workData,
      existingNodes,
      relationships,
    });
    this.analyzeSourceRelationshipsForWork({
      workData,
      existingNodes,
      relationships,
    });
    await this.analyzeCitationRelationshipsForWork({
      workData,
      existingNodes,
      relationships,
    });
    this.analyzeGrantsForWork({
      workData,
      existingNodes,
      relationships,
    });
    this.analyzeKeywordsForWork({
      workData,
      existingNodes,
      relationships,
    });
    this.analyzeTopicRelationshipsForWork({
      workData,
      existingNodes,
      relationships,
    });

    return relationships;
  }

  /**
   * Analyze relationships for an Author entity
   */
  private analyzeAuthorRelationships({
    authorData,
    existingNodes,
  }: {
    authorData: MinimalEntityData;
    existingNodes: GraphNode[];
  }): DetectedRelationship[] {
    const relationships: DetectedRelationship[] = [];
    const institutionIds = new Set<string>();

    if (authorData.affiliations) {
      for (const affiliation of authorData.affiliations) {
        const institutionId = affiliation?.institution?.id;
        if (institutionId) {
          institutionIds.add(institutionId);
        }
      }
    }

    if (authorData.last_known_institutions) {
      for (const institution of authorData.last_known_institutions) {
        if (institution?.id) {
          institutionIds.add(institution.id);
        }
      }
    }

    for (const institutionId of institutionIds) {
      const institutionNode = existingNodes.find(
        (node) => node.entityId === institutionId || node.id === institutionId,
      );
      if (institutionNode) {
        relationships.push({
          sourceNodeId: authorData.id, // Author owns affiliations[] data
          targetNodeId: institutionId, // Institution is referenced
          relationType: RelationType.AFFILIATION,
          direction: 'outbound',
          label: "affiliation",
        });
      }
    }

    // Check existing works for authorship relationships
    // Note: We would need to fetch work data to check authorships, but that would be expensive
    // This is better handled when the work is added and analyzes its authors

    return relationships;
  }

  /**
   * Analyze relationships for a Source entity
   */
  private analyzeSourceRelationships({
    sourceData,
    existingNodes,
  }: {
    sourceData: MinimalEntityData;
    existingNodes: GraphNode[];
  }): DetectedRelationship[] {
    const relationships: DetectedRelationship[] = [];

    // Check for publisher relationships
    if (sourceData.publisher) {
      const publisherNode = existingNodes.find(
        (node) =>
          node.entityId === sourceData.publisher ||
          node.id === sourceData.publisher,
      );
      if (publisherNode) {
        relationships.push({
          sourceNodeId: sourceData.id, // Source owns publisher data
          targetNodeId: sourceData.publisher, // Publisher
          relationType: RelationType.HOST_ORGANIZATION,
          direction: 'outbound',
          label: "host organization",
        });
      }
    }

    // Check existing works for publication relationships
    // Note: We would need to fetch work data to check primary_location.source
    // This is better handled when the work is added and analyzes its source

    return relationships;
  }

  /**
   * Analyze relationships for an Institution entity
   */
  private analyzeInstitutionRelationships({
    institutionData,
    existingNodes,
  }: {
    institutionData: MinimalEntityData;
    existingNodes: GraphNode[];
  }): DetectedRelationship[] {
    const relationships: DetectedRelationship[] = [];

    // Check for parent institution relationships
    if ("lineage" in institutionData && institutionData.lineage) {
      for (const parentId of institutionData.lineage) {
        if (parentId !== institutionData.id) {
          const parentNode = existingNodes.find(
            (node) => node.entityId === parentId || node.id === parentId,
          );
          if (parentNode) {
            relationships.push({
              sourceNodeId: institutionData.id, // Institution owns lineage[] data
              targetNodeId: parentId, // Parent institution
              relationType: RelationType.LINEAGE,
              direction: 'outbound',
              label: "lineage",
            });
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Analyze relationships for a Domain entity
   * Domains have outgoing relationships to Fields
   */
  private analyzeDomainRelationships({
    domainData,
    existingNodes,
  }: {
    domainData: MinimalEntityData;
    existingNodes: GraphNode[];
  }): DetectedRelationship[] {
    const relationships: DetectedRelationship[] = [];

    // Check for field relationships (domain -> fields)
    if ("fields" in domainData && Array.isArray(domainData.fields)) {
      for (const fieldRef of domainData.fields) {
        const fieldId = typeof fieldRef === "string" ? fieldRef : (fieldRef as any).id;
        if (fieldId && fieldId !== domainData.id) {
          const fieldNode = existingNodes.find(
            (node) => node.entityId === fieldId || node.id === fieldId,
          );
          if (fieldNode) {
            relationships.push({
              sourceNodeId: domainData.id, // Domain owns fields[] data
              targetNodeId: fieldId, // Field
              relationType: RelationType.FIELD_PART_OF_DOMAIN,
              direction: 'outbound',
              label: "field",
            });
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Analyze relationships for a Field entity
   * Fields have incoming relationship from Domain and outgoing relationships to Subfields
   */
  private analyzeFieldRelationships({
    fieldData,
    existingNodes,
  }: {
    fieldData: MinimalEntityData;
    existingNodes: GraphNode[];
  }): DetectedRelationship[] {
    const relationships: DetectedRelationship[] = [];

    // Check for domain relationship (field <- domain)
    if ("domain" in fieldData && fieldData.domain) {
      const domainRef = fieldData.domain as any;
      const domainId = typeof domainRef === "string" ? domainRef : domainRef.id;
      if (domainId && domainId !== fieldData.id) {
        const domainNode = existingNodes.find(
          (node) => node.entityId === domainId || node.id === domainId,
        );
        if (domainNode) {
          // This is an inbound relationship - the domain owns the fields[] array
          // We create the reverse edge here for visualization
          relationships.push({
            sourceNodeId: domainId, // Domain is the source
            targetNodeId: fieldData.id, // Field is the target
            relationType: RelationType.FIELD_PART_OF_DOMAIN,
            direction: 'inbound',
            label: "field",
          });
        }
      }
    }

    // Check for subfield relationships (field -> subfields)
    if ("subfields" in fieldData && Array.isArray(fieldData.subfields)) {
      for (const subfieldRef of fieldData.subfields) {
        const subfieldId = typeof subfieldRef === "string" ? subfieldRef : (subfieldRef as any).id;
        if (subfieldId && subfieldId !== fieldData.id) {
          const subfieldNode = existingNodes.find(
            (node) => node.entityId === subfieldId || node.id === subfieldId,
          );
          if (subfieldNode) {
            relationships.push({
              sourceNodeId: fieldData.id, // Field owns subfields[] data
              targetNodeId: subfieldId, // Subfield
              relationType: RelationType.TOPIC_PART_OF_FIELD, // Reusing existing type
              direction: 'outbound',
              label: "subfield",
            });
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Analyze relationships for a Subfield entity
   * Subfields have incoming relationships from Field/Domain and outgoing relationships to Topics
   */
  private analyzeSubfieldRelationships({
    subfieldData,
    existingNodes,
  }: {
    subfieldData: MinimalEntityData;
    existingNodes: GraphNode[];
  }): DetectedRelationship[] {
    const relationships: DetectedRelationship[] = [];

    // Check for field relationship (subfield <- field)
    if ("field" in subfieldData && subfieldData.field) {
      const fieldRef = subfieldData.field as any;
      const fieldId = typeof fieldRef === "string" ? fieldRef : fieldRef.id;
      if (fieldId && fieldId !== subfieldData.id) {
        const fieldNode = existingNodes.find(
          (node) => node.entityId === fieldId || node.id === fieldId,
        );
        if (fieldNode) {
          // This is an inbound relationship - the field owns the subfields[] array
          relationships.push({
            sourceNodeId: fieldId, // Field is the source
            targetNodeId: subfieldData.id, // Subfield is the target
            relationType: RelationType.TOPIC_PART_OF_FIELD,
            direction: 'inbound',
            label: "subfield",
          });
        }
      }
    }

    // Check for domain relationship (subfield <- domain)
    if ("domain" in subfieldData && subfieldData.domain) {
      const domainRef = subfieldData.domain as any;
      const domainId = typeof domainRef === "string" ? domainRef : domainRef.id;
      if (domainId && domainId !== subfieldData.id) {
        const domainNode = existingNodes.find(
          (node) => node.entityId === domainId || node.id === domainId,
        );
        if (domainNode) {
          relationships.push({
            sourceNodeId: domainId, // Domain is the source
            targetNodeId: subfieldData.id, // Subfield is the target
            relationType: RelationType.FIELD_PART_OF_DOMAIN,
            direction: 'inbound',
            label: "domain",
          });
        }
      }
    }

    // Check for topic relationships (subfield -> topics)
    if ("topics" in subfieldData && Array.isArray(subfieldData.topics)) {
      for (const topicRef of subfieldData.topics) {
        const topicId = typeof topicRef === "string" ? topicRef : (topicRef as any).id;
        if (topicId && topicId !== subfieldData.id) {
          const topicNode = existingNodes.find(
            (node) => node.entityId === topicId || node.id === topicId,
          );
          if (topicNode) {
            relationships.push({
              sourceNodeId: subfieldData.id, // Subfield owns topics[] data
              targetNodeId: topicId, // Topic
              relationType: RelationType.TOPIC_PART_OF_SUBFIELD,
              direction: 'outbound',
              label: "topic",
            });
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Analyze relationships for a Topic entity
   * Topics have incoming relationships from Subfield, Field, and Domain
   */
  private analyzeTopicRelationships({
    topicData,
    existingNodes,
  }: {
    topicData: MinimalEntityData;
    existingNodes: GraphNode[];
  }): DetectedRelationship[] {
    const relationships: DetectedRelationship[] = [];

    // Check for subfield relationship (topic <- subfield)
    if ("subfield" in topicData && topicData.subfield) {
      const subfieldRef = topicData.subfield as any;
      const subfieldId = typeof subfieldRef === "string" ? subfieldRef : subfieldRef.id;
      if (subfieldId && subfieldId !== topicData.id) {
        const subfieldNode = existingNodes.find(
          (node) => node.entityId === subfieldId || node.id === subfieldId,
        );
        if (subfieldNode) {
          // This is an inbound relationship - the subfield owns the topics[] array
          relationships.push({
            sourceNodeId: subfieldId, // Subfield is the source
            targetNodeId: topicData.id, // Topic is the target
            relationType: RelationType.TOPIC_PART_OF_SUBFIELD,
            direction: 'inbound',
            label: "topic",
          });
        }
      }
    }

    // Check for field relationship (topic <- field)
    if ("field" in topicData && topicData.field) {
      const fieldRef = topicData.field as any;
      const fieldId = typeof fieldRef === "string" ? fieldRef : fieldRef.id;
      if (fieldId && fieldId !== topicData.id) {
        const fieldNode = existingNodes.find(
          (node) => node.entityId === fieldId || node.id === fieldId,
        );
        if (fieldNode) {
          relationships.push({
            sourceNodeId: fieldId, // Field is the source
            targetNodeId: topicData.id, // Topic is the target
            relationType: RelationType.TOPIC_PART_OF_FIELD,
            direction: 'inbound',
            label: "field",
          });
        }
      }
    }

    // Check for domain relationship (topic <- domain)
    if ("domain" in topicData && topicData.domain) {
      const domainRef = topicData.domain as any;
      const domainId = typeof domainRef === "string" ? domainRef : domainRef.id;
      if (domainId && domainId !== topicData.id) {
        const domainNode = existingNodes.find(
          (node) => node.entityId === domainId || node.id === domainId,
        );
        if (domainNode) {
          relationships.push({
            sourceNodeId: domainId, // Domain is the source
            targetNodeId: topicData.id, // Topic is the target
            relationType: RelationType.FIELD_PART_OF_DOMAIN,
            direction: 'inbound',
            label: "domain",
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Analyze topic relationships for an entity (authors, sources, institutions)
   *
   * @param entityData - Entity data containing topics array
   * @param entityType - Type of entity (must be authors, sources, or institutions)
   * @param existingNodes - Existing graph nodes to create relationships with
   * @returns Array of detected topic relationships
   */
  private analyzeTopicRelationshipsForEntity({
    entityData,
    entityType,
    existingNodes,
  }: {
    entityData: MinimalEntityData;
    entityType: EntityType;
    existingNodes: GraphNode[];
  }): DetectedRelationship[] {
    // T044: Add null-safety check for topics
    if (!entityData.topics || entityData.topics.length === 0) {
      return [];
    }

    // T045: Add entityType validation - Only process if entityType is 'authors', 'sources', or 'institutions'
    if (entityType !== 'authors' && entityType !== 'sources' && entityType !== 'institutions') {
      return [];
    }

    const relationships: DetectedRelationship[] = [];

    // T046: Get existing graph nodes and iterate entity.topics array checking for topic node existence
    for (const topic of entityData.topics) {
      if (!topic || !topic.id) {
        continue;
      }

      const topicNode = existingNodes.find(
        (node) => node.entityId === topic.id || node.id === topic.id,
      );

      if (topicNode) {
        // T047: Create GraphEdge with topic relationship
        relationships.push({
          sourceNodeId: entityData.id,
          targetNodeId: topic.id,
          relationType: RelationType.TOPIC,
          direction: 'outbound',
          label: 'research topic',
          metadata: {
            // T048: Store topic metadata in edge
            count: topic.count,
            score: topic.score,
            subfield: topic.subfield,
            field: topic.field,
            domain: topic.domain,
          },
        });
      }
    }

    return relationships;
  }

  /**
   * Fetch entity without field selection (for debugging)
   */
  private async fetchEntityWithoutSelect({
    entityId,
    entityType,
  }: {
    entityId: string;
    entityType: EntityType;
  }): Promise<OpenAlexEntity> {
    switch (entityType) {
      case "works":
        return cachedOpenAlex.client.works.getWork(entityId);
      case "authors":
        return cachedOpenAlex.client.authors.getAuthor(entityId);
      case "sources":
        return cachedOpenAlex.client.sources.getSource(entityId);
      case "institutions":
        return cachedOpenAlex.client.institutions.getInstitution(entityId);
      case "topics":
        return cachedOpenAlex.client.topics.get(entityId);
      case "publishers":
        return cachedOpenAlex.client.publishers.get(entityId);
      case "funders":
        return cachedOpenAlex.client.funders.get(entityId);
      case "keywords":
        return cachedOpenAlex.client.keywords.getKeyword(entityId);
      default:
        throw new Error(`Unsupported entity entityType: ${entityType}`);
    }
  }

  /**
   * Fetch entity with field selection based on entity type
   */
  private async fetchEntityWithSelect({
    entityId,
    entityType,
    selectFields,
  }: {
    entityId: string;
    entityType: EntityType;
    selectFields: string[];
  }): Promise<OpenAlexEntity> {
    const params = { select: selectFields };

    switch (entityType) {
      case "works":
        return cachedOpenAlex.client.works.getWork(entityId, params);
      case "authors":
        return cachedOpenAlex.client.authors.getAuthor(entityId, params);
      case "sources":
        return cachedOpenAlex.client.sources.getSource(entityId, params);
      case "institutions":
        return cachedOpenAlex.client.institutions.getInstitution(
          entityId,
          params,
        );
      case "topics":
        return cachedOpenAlex.client.topics.get(entityId, params);
      case "publishers":
        return cachedOpenAlex.client.publishers.get(entityId, params);
      case "funders":
        return cachedOpenAlex.client.funders.get(entityId, params);
      case "keywords":
        return cachedOpenAlex.client.keywords.getKeyword(entityId, params);
      default:
        throw new Error(
          `Unsupported entity type for field selection: ${entityType}`,
        );
    }
  }

  /**
   * Detect relationships between a node and other nodes in the same batch
   * This finds relationships that wouldn't be caught in the first pass
   */
  private async detectCrossBatchRelationships({
    nodeId,
    batchNodeIds,
  }: {
    nodeId: string;
    batchNodeIds: string[];
  }): Promise<GraphEdge[]> {
    const store = graphStore;
    const sourceNode = store.getNode(nodeId);

    if (!sourceNode) {
      return [];
    }

    try {
      // Fetch minimal entity data for the source node
      const sourceData = await this.fetchMinimalEntityData({
        entityId: sourceNode.entityId,
        entityType: sourceNode.entityType,
      });
      if (!sourceData) {
        return [];
      }

      // Get only the other nodes in this batch (exclude the source node itself)
      const otherBatchNodes = batchNodeIds
        .filter((id) => id !== nodeId)
        .map((id) => store.getNode(id))
        .filter((node): node is GraphNode => isNonNull(node));

      // Analyze relationships specifically with the batch nodes
      const detectedRelationships = this.analyzeCrossBatchRelationships({
        sourceData,
        batchNodes: otherBatchNodes,
      });

      logger.debug(
        "graph",
        "Cross-batch relationship detection",
        {
          sourceNodeId: nodeId,
          batchNodeCount: otherBatchNodes.length,
          detectedCount: detectedRelationships.length,
        },
        "RelationshipDetectionService",
      );

      return this.createEdgesFromRelationships(detectedRelationships);
    } catch (error) {
      logError(
        logger,
        "Failed to detect cross-batch relationships",
        error,
        "RelationshipDetectionService",
        "graph",
      );
      return [];
    }
  }

  /**
   * Analyze relationships between source entity and batch nodes specifically
   * Similar to analyzeRelationships but focused on batch nodes only
   */
  private analyzeCrossBatchRelationships({
    sourceData,
    batchNodes,
  }: {
    sourceData: MinimalEntityData;
    batchNodes: GraphNode[];
  }): DetectedRelationship[] {
    const relationships: DetectedRelationship[] = [];

    // For works, check if any batch nodes are referenced works
    if (sourceData.entityType === "works" && sourceData.referenced_works) {
      logger.debug(
        "graph",
        "Checking cross-batch citations for work",
        {
          workId: sourceData.id,
          workTitle: sourceData.display_name,
          referencedWorksCount: sourceData.referenced_works.length,
          batchNodeCount: batchNodes.length,
          referencedWorkIds: sourceData.referenced_works,
          batchNodeIds: batchNodes.map((n) => n.entityId),
        },
        "RelationshipDetectionService",
      );

      for (const referencedWorkId of sourceData.referenced_works) {
        const referencedNode = batchNodes.find(
          (node) =>
            node.entityId === referencedWorkId || node.id === referencedWorkId,
        );
        if (referencedNode) {
          logger.debug(
            "graph",
            "FOUND cross-batch citation relationship!",
            {
              sourceWork: sourceData.display_name,
              sourceId: sourceData.id,
              targetWork: referencedNode.label,
              targetId: referencedWorkId,
            },
            "RelationshipDetectionService",
          );

          relationships.push({
            sourceNodeId: sourceData.id, // Source work references this work
            targetNodeId: referencedWorkId, // Referenced work
            relationType: RelationType.REFERENCE,
            direction: 'outbound',
            label: "reference",
          });
        }
      }
    }

    // Additional cross-batch relationship patterns can be added here
    // Only for actual relationships present in OpenAlex data, not synthetic ones

    return relationships;
  }

  /**
   * Remove duplicate edges based on source-target-type combination
   */
  private deduplicateEdges(edges: GraphEdge[]): GraphEdge[] {
    const seen: Record<string, boolean> = {};
    const uniqueEdges: GraphEdge[] = [];

    for (const edge of edges) {
      const key = `${edge.source}-${edge.type}-${edge.target}`;
      if (!seen[key]) {
        seen[key] = true;
        uniqueEdges.push(edge);
      }
    }

    return uniqueEdges;
  }

  /**
   * Convert detected relationships to graph edges
   */
  private createEdgesFromRelationships(
    relationships: DetectedRelationship[],
  ): GraphEdge[] {
    return relationships.map((rel) => ({
      id: `${rel.sourceNodeId}-${rel.relationType}-${rel.targetNodeId}`,
      source: rel.sourceNodeId,
      target: rel.targetNodeId,
      type: rel.relationType,
      label: rel.label,
      ...(rel.weight !== undefined && { weight: rel.weight }),
      ...(rel.metadata && { metadata: rel.metadata }),
    }));
  }
}

/**
 * Create a new RelationshipDetectionService instance
 */
export function createRelationshipDetectionService(
  queryClient: QueryClient,
): RelationshipDetectionService {
  return new RelationshipDetectionService(queryClient);
}

// Re-export GraphNode from @academic-explorer/graph for test compatibility
export type { GraphNode } from "@academic-explorer/graph";
