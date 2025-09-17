/**
 * Relationship Detection Service
 * Automatically detects and creates relationships between newly added nodes and existing graph nodes
 */

import { QueryClient } from "@tanstack/react-query";
import { rateLimitedOpenAlex } from "@/lib/openalex/rate-limited-client";
import { EntityDetector } from "@/lib/graph/utils/entity-detection";
import { useGraphStore } from "@/stores/graph-store";
import { logError, logger } from "@/lib/logger";
import { RequestDeduplicationService, createRequestDeduplicationService } from "./request-deduplication-service";
import type {
	GraphNode,
	GraphEdge,
	EntityType,
} from "@/lib/graph/types";
import { RelationType } from "@/lib/graph/types";
import type {
	Work,
	Author,
	Source,
	InstitutionEntity,
	OpenAlexEntity,
} from "@/lib/openalex/types";
import { ADVANCED_FIELD_SELECTIONS, type AdvancedEntityFieldSelections } from "@/lib/openalex/advanced-field-selection";

/**
 * Minimal entity data needed for relationship detection
 * Contains only the essential fields to determine relationships
 */
interface MinimalEntityData {
	id: string;
	entityType: EntityType;
	display_name: string;
	authorships?: Array<{ author: { id: string; display_name: string } }>;
	primary_location?: { source?: { id: string; display_name: string } };
	referenced_works?: string[];
	affiliations?: Array<{ institution: { id: string; display_name: string } }>;
	lineage?: string[];
	publisher?: string;
}

/**
 * Detected relationship between nodes
 */
interface DetectedRelationship {
	sourceNodeId: string;
	targetNodeId: string;
	relationType: RelationType;
	label: string;
	weight?: number;
	metadata?: Record<string, unknown>;
}

/**
 * Service for automatically detecting relationships between newly added nodes and existing graph nodes
 */
export class RelationshipDetectionService {
	private detector: EntityDetector;
	private queryClient: QueryClient;
	private deduplicationService: RequestDeduplicationService;

	constructor(queryClient: QueryClient) {
		this.detector = new EntityDetector();
		this.queryClient = queryClient;
		this.deduplicationService = createRequestDeduplicationService(queryClient);
	}

	/**
	 * Detect and create relationships for multiple nodes in batch
	 * Uses two-pass approach to find relationships between nodes added in the same batch
	 */
	async detectRelationshipsForNodes(nodeIds: string[]): Promise<GraphEdge[]> {
		if (nodeIds.length === 0) return [];

		logger.info("graph", "Starting batch relationship detection with two-pass approach", {
			nodeCount: nodeIds.length,
			nodeIds
		}, "RelationshipDetectionService");

		const allNewEdges: GraphEdge[] = [];

		// Two-pass approach:
		// Pass 1: Process each node individually (finds relationships with pre-existing nodes)
		for (const nodeId of nodeIds) {
			try {
				const edges = await this.detectRelationshipsForNode(nodeId);
				allNewEdges.push(...edges);
			} catch (error) {
				logError("Failed to detect relationships for node in batch pass 1", error, "RelationshipDetectionService", "graph");
			}
		}

		// Pass 2: Re-check all nodes for relationships with each other (cross-batch relationships)
		logger.info("graph", "Starting pass 2: cross-batch relationship detection", {
			nodeCount: nodeIds.length
		}, "RelationshipDetectionService");

		for (const nodeId of nodeIds) {
			try {
				const crossBatchEdges = await this.detectCrossBatchRelationships(nodeId, nodeIds);
				allNewEdges.push(...crossBatchEdges);
			} catch (error) {
				logError("Failed to detect cross-batch relationships for node", error, "RelationshipDetectionService", "graph");
			}
		}

		// Remove duplicate edges (same source-target-type combinations)
		const uniqueEdges = this.deduplicateEdges(allNewEdges);

		logger.info("graph", "Batch relationship detection completed", {
			processedNodeCount: nodeIds.length,
			totalEdgesCreated: uniqueEdges.length,
			duplicatesRemoved: allNewEdges.length - uniqueEdges.length
		}, "RelationshipDetectionService");

		return uniqueEdges;
	}

	/**
	 * Detect and create relationships for a newly added node
	 * Fetches minimal data and analyzes relationships with existing nodes
	 */
	async detectRelationshipsForNode(nodeId: string): Promise<GraphEdge[]> {
		const store = useGraphStore.getState();
		const newNode = store.getNode(nodeId);

		if (!newNode) {
			logger.warn("graph", "Node not found for relationship detection", { nodeId }, "RelationshipDetectionService");
			return [];
		}

		// Note: We fetch relationship data on-demand, so hydration level doesn't matter
		// The relationship detection service will fetch the minimal data needed regardless

		try {
			logger.info("graph", "Starting relationship detection for node", {
				nodeId,
				entityType: newNode.type,
				label: newNode.label
			}, "RelationshipDetectionService");

			// Fetch minimal entity data
			const minimalData = await this.fetchMinimalEntityData(newNode.entityId, newNode.type);

			if (!minimalData) {
				logger.warn("graph", "Could not fetch minimal data for relationship detection", {
					nodeId,
					entityId: newNode.entityId
				}, "RelationshipDetectionService");
				return [];
			}

			// Get all existing nodes in the graph
			const existingNodes = Object.values(store.nodes).filter((node): node is NonNullable<typeof node> => node != null).filter(node => node.id !== nodeId);

			// Detect relationships with existing nodes
			const detectedRelationships = this.analyzeRelationships(minimalData, existingNodes);

			logger.info("graph", "Relationship detection completed", {
				nodeId,
				detectedCount: detectedRelationships.length,
				relationships: detectedRelationships.map(r => ({
					target: r.targetNodeId,
					type: r.relationType
				}))
			}, "RelationshipDetectionService");

			// Convert detected relationships to graph edges
			const newEdges = this.createEdgesFromRelationships(detectedRelationships);

			// Add edges to the graph store
			if (newEdges.length > 0) {
				store.addEdges(newEdges);
				logger.info("graph", "Added relationship edges to graph", {
					nodeId,
					edgeCount: newEdges.length,
					edgeIds: newEdges.map(e => e.id)
				}, "RelationshipDetectionService");
			}

			return newEdges;

		} catch (error) {
			logError("Failed to detect relationships for node", error, "RelationshipDetectionService", "graph");
			return [];
		}
	}

	/**
	 * Fetch minimal entity data required for relationship detection
	 * Uses field selection to minimize API response size and improve performance
	 */
	private async fetchMinimalEntityData(entityId: string, entityType: EntityType): Promise<MinimalEntityData | null> {
		try {
			// Use advanced type-safe field selections with full path inference
			const fieldsMap: AdvancedEntityFieldSelections = {
				works: ADVANCED_FIELD_SELECTIONS.works.minimal,
				authors: ADVANCED_FIELD_SELECTIONS.authors.minimal,
				sources: ADVANCED_FIELD_SELECTIONS.sources.minimal,
				institutions: ADVANCED_FIELD_SELECTIONS.institutions.minimal,
				concepts: ADVANCED_FIELD_SELECTIONS.concepts.minimal,
				topics: ["id", "display_name"], // TODO: Add advanced type-safe selections
				publishers: ["id", "display_name"], // TODO: Add advanced type-safe selections
				funders: ["id", "display_name"], // TODO: Add advanced type-safe selections
				keywords: ["id", "display_name"] // Keywords don't have strict typing yet
			};

			const selectFields = fieldsMap[entityType];

			logger.debug("graph", "Fetching minimal entity data", {
				entityId,
				entityType,
				selectFields
			}, "RelationshipDetectionService");

			// Deduplication service is always initialized in constructor

			// Fetch entity with minimal fields using deduplication service
			const entity = await this.deduplicationService.getEntity(
				entityId,
				() => this.fetchEntityWithSelect(entityId, entityType, selectFields)
			);

			// Transform to minimal data format with null checks
			const minimalData: MinimalEntityData = {
				id: entity.id || "",
				entityType,
				display_name: entity.display_name || ""
			};

			// Add type-specific fields
			switch (entityType) {
				case "works": {
					const work = entity as Work;
					minimalData.authorships = work.authorships;
					minimalData.primary_location = work.primary_location;
					minimalData.referenced_works = work.referenced_works;
					break;
				}
				case "authors": {
					const author = entity as Author;
					minimalData.affiliations = author.affiliations;
					break;
				}
				case "sources": {
					const source = entity as Source;
					minimalData.publisher = source.publisher;
					break;
				}
				case "institutions": {
					const institution = entity as InstitutionEntity;
					minimalData.lineage = institution.lineage;
					break;
				}
			}

			logger.debug("graph", "Minimal entity data fetched successfully", {
				entityId,
				entityType,
				hasAuthorships: !!minimalData.authorships?.length,
				hasAffiliations: !!minimalData.affiliations?.length,
				hasReferences: !!minimalData.referenced_works?.length,
				referencedWorksCount: minimalData.referenced_works?.length || 0,
				firstFewReferences: minimalData.referenced_works?.slice(0, 3) || []
			}, "RelationshipDetectionService");

			return minimalData;

		} catch (error) {
			logError("Failed to fetch minimal entity data", error, "RelationshipDetectionService", "graph");
			return null;
		}
	}

	/**
	 * Analyze relationships between the new entity and existing graph nodes
	 */
	private analyzeRelationships(newEntityData: MinimalEntityData, existingNodes: GraphNode[]): DetectedRelationship[] {
		const relationships: DetectedRelationship[] = [];

		logger.debug("graph", "Analyzing relationships", {
			newEntityId: newEntityData.id,
			newEntityType: newEntityData.entityType,
			existingNodeCount: existingNodes.length
		}, "RelationshipDetectionService");

		// Analyze relationships based on entity type
		switch (newEntityData.entityType) {
			case "works":
				relationships.push(...this.analyzeWorkRelationships(newEntityData, existingNodes));
				break;
			case "authors":
				relationships.push(...this.analyzeAuthorRelationships(newEntityData, existingNodes));
				break;
			case "sources":
				relationships.push(...this.analyzeSourceRelationships(newEntityData, existingNodes));
				break;
			case "institutions":
				relationships.push(...this.analyzeInstitutionRelationships(newEntityData, existingNodes));
				break;
		}

		// Deduplicate relationship types using Record pattern
		const relationshipTypesRecord: Record<string, boolean> = {};
		for (const relationship of relationships) {
			relationshipTypesRecord[relationship.relationType] = true;
		}
		const uniqueRelationshipTypes = Object.keys(relationshipTypesRecord);

		logger.debug("graph", "Relationship analysis completed", {
			newEntityId: newEntityData.id,
			detectedCount: relationships.length,
			relationshipTypes: uniqueRelationshipTypes
		}, "RelationshipDetectionService");

		return relationships;
	}

	/**
	 * Analyze relationships for a Work entity
	 */
	private analyzeWorkRelationships(workData: MinimalEntityData, existingNodes: GraphNode[]): DetectedRelationship[] {
		const relationships: DetectedRelationship[] = [];

		// Check for author relationships
		if (workData.authorships) {
			for (const authorship of workData.authorships) {
				const authorNode = existingNodes.find(node =>
					node.entityId === authorship.author.id || node.id === authorship.author.id
				);
				if (authorNode) {
					relationships.push({
						sourceNodeId: authorship.author.id,
						targetNodeId: workData.id,
						relationType: RelationType.AUTHORED,
						label: "authored",
						weight: 1.0
					});
				}
			}
		}

		// Check for source/journal relationships
		if (workData.primary_location?.source) {
			const sourceId = workData.primary_location.source.id;
			const sourceNode = existingNodes.find(node =>
				node.entityId === sourceId || node.id === sourceId
			);
			if (sourceNode) {
				relationships.push({
					sourceNodeId: workData.id,
					targetNodeId: sourceId,
					relationType: RelationType.PUBLISHED_IN,
					label: "published in"
				});
			}
		}

		// Check for citation relationships
		if (workData.referenced_works) {
			for (const referencedWorkId of workData.referenced_works) {
				const referencedNode = existingNodes.find(node =>
					node.entityId === referencedWorkId || node.id === referencedWorkId
				);
				if (referencedNode) {
					relationships.push({
						sourceNodeId: workData.id,
						targetNodeId: referencedWorkId,
						relationType: RelationType.REFERENCES,
						label: "references"
					});
				}
			}
		}

		return relationships;
	}

	/**
	 * Analyze relationships for an Author entity
	 */
	private analyzeAuthorRelationships(authorData: MinimalEntityData, existingNodes: GraphNode[]): DetectedRelationship[] {
		const relationships: DetectedRelationship[] = [];

		// Check for institutional affiliations
		if (authorData.affiliations) {
			for (const affiliation of authorData.affiliations) {
				const institutionNode = existingNodes.find(node =>
					node.entityId === affiliation.institution.id || node.id === affiliation.institution.id
				);
				if (institutionNode) {
					relationships.push({
						sourceNodeId: authorData.id,
						targetNodeId: affiliation.institution.id,
						relationType: RelationType.AFFILIATED,
						label: "affiliated with"
					});
				}
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
	private analyzeSourceRelationships(sourceData: MinimalEntityData, existingNodes: GraphNode[]): DetectedRelationship[] {
		const relationships: DetectedRelationship[] = [];

		// Check for publisher relationships
		if (sourceData.publisher) {
			const publisherNode = existingNodes.find(node =>
				node.entityId === sourceData.publisher || node.id === sourceData.publisher
			);
			if (publisherNode) {
				relationships.push({
					sourceNodeId: sourceData.id,
					targetNodeId: sourceData.publisher,
					relationType: RelationType.SOURCE_PUBLISHED_BY,
					label: "published by"
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
	private analyzeInstitutionRelationships(institutionData: MinimalEntityData, existingNodes: GraphNode[]): DetectedRelationship[] {
		const relationships: DetectedRelationship[] = [];

		// Check for parent institution relationships
		if (institutionData.lineage) {
			for (const parentId of institutionData.lineage) {
				if (parentId !== institutionData.id) {
					const parentNode = existingNodes.find(node =>
						node.entityId === parentId || node.id === parentId
					);
					if (parentNode) {
						relationships.push({
							sourceNodeId: institutionData.id,
							targetNodeId: parentId,
							relationType: RelationType.INSTITUTION_CHILD_OF,
							label: "child of"
						});
					}
				}
			}
		}

		return relationships;
	}

	/**
	 * Fetch entity with field selection based on entity type
	 */
	private async fetchEntityWithSelect(entityId: string, entityType: EntityType, selectFields: string[]): Promise<OpenAlexEntity> {
		const params = { select: selectFields };

		switch (entityType) {
			case "works":
				return rateLimitedOpenAlex.getWork(entityId, params);
			case "authors":
				return rateLimitedOpenAlex.getAuthor(entityId, params);
			case "sources":
				return rateLimitedOpenAlex.getSource(entityId, params);
			case "institutions":
				return rateLimitedOpenAlex.getInstitution(entityId, params);
			case "topics":
				return rateLimitedOpenAlex.getTopic(entityId, params);
			case "publishers":
				return rateLimitedOpenAlex.getPublisher(entityId, params);
			case "funders":
				return rateLimitedOpenAlex.getFunder(entityId, params);
			case "keywords":
				return rateLimitedOpenAlex.getKeyword(entityId, params);
			default:
				throw new Error(`Unsupported entity type for field selection: ${entityType}`);
		}
	}

	/**
	 * Detect relationships between a node and other nodes in the same batch
	 * This finds relationships that wouldn't be caught in the first pass
	 */
	private async detectCrossBatchRelationships(nodeId: string, batchNodeIds: string[]): Promise<GraphEdge[]> {
		const store = useGraphStore.getState();
		const sourceNode = store.getNode(nodeId);

		if (!sourceNode) {
			return [];
		}

		try {
			// Fetch minimal entity data for the source node
			const sourceData = await this.fetchMinimalEntityData(sourceNode.entityId, sourceNode.type);
			if (!sourceData) {
				return [];
			}

			// Get only the other nodes in this batch (exclude the source node itself)
			const otherBatchNodes = batchNodeIds
				.filter(id => id !== nodeId)
				.map(id => store.getNode(id))
				.filter(Boolean) as GraphNode[];

			// Analyze relationships specifically with the batch nodes
			const detectedRelationships = this.analyzeCrossBatchRelationships(sourceData, otherBatchNodes);

			logger.debug("graph", "Cross-batch relationship detection", {
				sourceNodeId: nodeId,
				batchNodeCount: otherBatchNodes.length,
				detectedCount: detectedRelationships.length
			}, "RelationshipDetectionService");

			return this.createEdgesFromRelationships(detectedRelationships);

		} catch (error) {
			logError("Failed to detect cross-batch relationships", error, "RelationshipDetectionService", "graph");
			return [];
		}
	}

	/**
	 * Analyze relationships between source entity and batch nodes specifically
	 * Similar to analyzeRelationships but focused on batch nodes only
	 */
	private analyzeCrossBatchRelationships(sourceData: MinimalEntityData, batchNodes: GraphNode[]): DetectedRelationship[] {
		const relationships: DetectedRelationship[] = [];

		// For works, check if any batch nodes are referenced works
		if (sourceData.entityType === "works" && sourceData.referenced_works) {
			logger.debug("graph", "Checking cross-batch citations for work", {
				workId: sourceData.id,
				workTitle: sourceData.display_name,
				referencedWorksCount: sourceData.referenced_works.length,
				batchNodeCount: batchNodes.length,
				referencedWorkIds: sourceData.referenced_works.slice(0, 5), // First 5 for debugging
				batchNodeIds: batchNodes.map(n => n.entityId).slice(0, 5) // First 5 for debugging
			}, "RelationshipDetectionService");

			for (const referencedWorkId of sourceData.referenced_works) {
				const referencedNode = batchNodes.find(node =>
					node.entityId === referencedWorkId || node.id === referencedWorkId
				);
				if (referencedNode) {
					logger.info("graph", "FOUND cross-batch citation relationship!", {
						sourceWork: sourceData.display_name,
						sourceId: sourceData.id,
						targetWork: referencedNode.label,
						targetId: referencedWorkId
					}, "RelationshipDetectionService");

					relationships.push({
						sourceNodeId: sourceData.id,
						targetNodeId: referencedWorkId,
						relationType: RelationType.REFERENCES,
						label: "references"
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
	private createEdgesFromRelationships(relationships: DetectedRelationship[]): GraphEdge[] {
		return relationships.map(rel => ({
			id: `${rel.sourceNodeId}-${rel.relationType}-${rel.targetNodeId}`,
			source: rel.sourceNodeId,
			target: rel.targetNodeId,
			type: rel.relationType,
			label: rel.label,
			weight: rel.weight,
			metadata: rel.metadata
		}));
	}
}

/**
 * Create a new RelationshipDetectionService instance
 */
export function createRelationshipDetectionService(queryClient: QueryClient): RelationshipDetectionService {
	return new RelationshipDetectionService(queryClient);
}