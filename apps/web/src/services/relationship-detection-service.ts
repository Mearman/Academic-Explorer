/**
 * Relationship Detection Service
 * Automatically detects and creates relationships between newly added nodes and existing graph nodes
 */

import { QueryClient } from "@tanstack/react-query";
import { cachedOpenAlex } from "@academic-explorer/client";
import { EntityDetectionService } from "@academic-explorer/graph";
import { useGraphStore } from "@/stores/graph-store";
import { logError, logger } from "@academic-explorer/utils/logger";
import { isWork, isAuthor, isSource, isInstitution, isNonNull } from "@academic-explorer/client";
import { RequestDeduplicationService, createRequestDeduplicationService } from "./request-deduplication-service";
import type {
	GraphNode,
	GraphEdge,
	EntityType,
} from "@academic-explorer/graph";
import { RelationType } from "@academic-explorer/graph";
import type {
	OpenAlexEntity,
} from "@academic-explorer/client";
import { ADVANCED_FIELD_SELECTIONS } from "@academic-explorer/client";

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
    logger.debug("relationship-detection", "detectRelationshipsForNodes called", { nodeCount: nodeIds.length, nodeIds });

    if (nodeIds.length === 0) return [];

    logger.debug("graph", "STARTING batch relationship detection with two-pass approach", {
      nodeCount: nodeIds.length,
      nodeIds
    }, "RelationshipDetectionService");

		// Log the node types being processed
		const store = useGraphStore.getState();
		const nodeTypes = nodeIds.map(id => {
			const node = store.getNode(id);
			return node ? `${id}(${node.entityType})` : `${id}(not found)`;
		});
		logger.debug("graph", "Processing nodes by type", {
			nodeTypes
		}, "RelationshipDetectionService");

		const allNewEdges: GraphEdge[] = [];

		// Two-pass approach:
		// Pass 1: Process each node individually (finds relationships with pre-existing nodes)
		for (const nodeId of nodeIds) {
			try {
				const edges = await this.detectRelationshipsForNode(nodeId);
				allNewEdges.push(...edges);
			} catch (error) {
				logError(logger, "Failed to detect relationships for node in batch pass 1", error, "RelationshipDetectionService", "graph");
			}
		}

		// Pass 2: Re-check all nodes for relationships with each other (cross-batch relationships)
		logger.debug("graph", "Starting pass 2: cross-batch relationship detection", {
			nodeCount: nodeIds.length
		}, "RelationshipDetectionService");

		for (const nodeId of nodeIds) {
			try {
				const crossBatchEdges = await this.detectCrossBatchRelationships(nodeId, nodeIds);
				allNewEdges.push(...crossBatchEdges);
			} catch (error) {
				logError(logger, "Failed to detect cross-batch relationships for node", error, "RelationshipDetectionService", "graph");
			}
		}

		// Remove duplicate edges (same source-target-type combinations)
		const uniqueEdges = this.deduplicateEdges(allNewEdges);

		logger.debug("graph", "Batch relationship detection completed", {
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

		// Try to find the node using the provided nodeId, and also try normalizing it
		let newNode = store.getNode(nodeId);

		// If not found and nodeId is a full URL, try extracting just the ID part
		if (!newNode && nodeId.includes("openalex.org/")) {
			const shortId = nodeId.split("/").pop();
			if (shortId) {
				newNode = store.getNode(shortId);
			}
		}

		// If still not found, try checking entityId field
		if (!newNode) {
			const allNodes = Object.values(store.nodes);
			newNode = allNodes.find(node => node.entityId === nodeId || node.id === nodeId);
		}

		if (!newNode) {
			logger.warn("graph", "Node not found for relationship detection", {
				nodeId,
				availableNodeCount: Object.keys(store.nodes).length
			}, "RelationshipDetectionService");
			return [];
		}

		// Note: We fetch relationship data on-demand, so hydration level doesn't matter
		// The relationship detection service will fetch the minimal data needed regardless

		try {
			logger.debug("graph", "Starting relationship detection for node", {
				nodeId,
				entityType: newNode.entityType,
				label: newNode.label
			}, "RelationshipDetectionService");

			// Fetch minimal entity data
			const minimalData = await this.fetchMinimalEntityData(newNode.entityId, newNode.entityType);

			if (!minimalData) {
				logger.warn("graph", "Could not fetch minimal data for relationship detection", {
					nodeId,
					entityId: newNode.entityId
				}, "RelationshipDetectionService");
				return [];
			}

			// Get all existing nodes in the graph
			const existingNodes = Object.values(store.nodes)
				.filter((node): node is GraphNode => isNonNull(node))
				.filter(node => node.id !== nodeId);

			// Detect relationships with existing nodes
			const detectedRelationships = await this.analyzeRelationships(minimalData, existingNodes);

			logger.debug("graph", "Relationship detection completed", {
				nodeId,
				detectedCount: detectedRelationships.length,
				relationships: detectedRelationships.map(r => ({
					target: r.targetNodeId,
					entityType: r.relationType
				}))
			}, "RelationshipDetectionService");

			// Convert detected relationships to graph edges
			const newEdges = this.createEdgesFromRelationships(detectedRelationships);

			// Add edges to the graph store
			if (newEdges.length > 0) {
				store.addEdges(newEdges);
				logger.debug("graph", "Added relationship edges to graph", {
					nodeId,
					edgeCount: newEdges.length,
					edgeIds: newEdges.map(e => e.id)
				}, "RelationshipDetectionService");
			}

			return newEdges;

		} catch (error) {
			logError(logger, "Failed to detect relationships for node", error, "RelationshipDetectionService", "graph");
			return [];
		}
	}

	/**
	 * Fetch minimal entity data required for relationship detection
	 * Uses field selection to minimize API response size and improve performance
	 */
	private async fetchMinimalEntityData(entityId: string, entityType: EntityType): Promise<MinimalEntityData | null> {
		try {
			// Use advanced type-safe field selections with minimal fields
			const getMinimalFields = (entityType: EntityType): string[] => {
				switch (entityType) {
					case "works": return ADVANCED_FIELD_SELECTIONS.works.minimal;
					case "authors": return ADVANCED_FIELD_SELECTIONS.authors.minimal;
					case "sources": return ADVANCED_FIELD_SELECTIONS.sources.minimal;
					case "institutions": return ADVANCED_FIELD_SELECTIONS.institutions.minimal;
					case "concepts": return ADVANCED_FIELD_SELECTIONS.concepts.minimal;
					case "topics": return ADVANCED_FIELD_SELECTIONS.topics.minimal;
					case "publishers": return ADVANCED_FIELD_SELECTIONS.publishers.minimal;
					case "funders": return ADVANCED_FIELD_SELECTIONS.funders.minimal;
					default: return ["id", "display_name"]; // Default for keywords or unknown types
				}
			};

			const selectFields = getMinimalFields(entityType);

			// Deduplication service is always initialized in constructor

			// Fetch entity with minimal fields using deduplication service
			const entity = await this.deduplicationService.getEntity(
				entityId,
				() => this.fetchEntityWithSelect(entityId, entityType, selectFields)
			);

			logger.debug("graph", "Entity fetch result", {
				entityId,
				entityFetched: !!entity
			}, "RelationshipDetectionService");

			// Transform to minimal data format
			const minimalData: MinimalEntityData = {
				id: entity.id,
				entityType,
				display_name: entity.display_name
			};

			logger.debug("graph", "Entity fetched with fields", {
				entityId,
				entityType,
				hasReferencedWorks: "referenced_works" in entity,
				referencedWorks: "referenced_works" in entity ? (entity as any).referenced_works : undefined,
				entityKeys: Object.keys(entity)
			}, "RelationshipDetectionService");

			// Add type-specific fields
			switch (entityType) {
				case "works": {
					if (isWork(entity)) {
						Object.assign(minimalData, {
							authorships: entity.authorships,
							...(entity.primary_location && { primary_location: entity.primary_location }),
							referenced_works: entity.referenced_works
						});
					}
					break;
				}
				case "authors": {
					if (isAuthor(entity)) {
						Object.assign(minimalData, {
							affiliations: entity.affiliations
						});
					}
					break;
				}
				case "sources": {
					if (isSource(entity)) {
						Object.assign(minimalData, {
							...(entity.publisher && { publisher: entity.publisher })
						});
					}
					break;
				}
				case "institutions": {
					if (isInstitution(entity)) {
						Object.assign(minimalData, {
							...(entity.lineage && { lineage: entity.lineage })
						});
					}
					break;
				}
			}

			logger.debug("graph", "Minimal entity data fetched successfully", {
				entityId,
				entityType,
				hasAuthorships: !!minimalData.authorships?.length,
				hasAffiliations: !!minimalData.affiliations?.length,
				hasReferences: !!minimalData.referenced_works?.length,
				referencedWorksCount: minimalData.referenced_works?.length ?? 0
			}, "RelationshipDetectionService");

			return minimalData;

		} catch (error) {
			logError(logger, "Failed to fetch minimal entity data", error, "RelationshipDetectionService", "graph");
			return null;
		}
	}

	/**
	 * Analyze relationships between the new entity and existing graph nodes
	 */
	private async analyzeRelationships(newEntityData: MinimalEntityData, existingNodes: GraphNode[]): Promise<DetectedRelationship[]> {
		const relationships: DetectedRelationship[] = [];

		logger.debug("graph", "Analyzing relationships", {
			newEntityId: newEntityData.id,
			newEntityType: newEntityData.entityType,
			existingNodeCount: existingNodes.length
		}, "RelationshipDetectionService");

		logger.debug("graph", "Processing entity for relationships", {
			entityId: newEntityData.id,
			entityType: newEntityData.entityType,
			hasReferencedWorks: "referenced_works" in newEntityData && !!newEntityData.referenced_works,
			referencedWorksCount: ("referenced_works" in newEntityData && Array.isArray(newEntityData.referenced_works)) ? newEntityData.referenced_works.length : 0,
			existingNodeIds: existingNodes.map(n => n.entityId)
		}, "RelationshipDetectionService");

		// Analyze relationships based on entity type
		switch (newEntityData.entityType) {
			case "works":
				logger.debug("graph", "About to analyze work relationships", {
					workId: newEntityData.id,
					hasReferencedWorks: "referenced_works" in newEntityData && !!newEntityData.referenced_works
				}, "RelationshipDetectionService");
				logger.debug("relationship-detection", "Calling analyzeWorkRelationships", { entityId: newEntityData.id });
				relationships.push(...await this.analyzeWorkRelationships(newEntityData, existingNodes));
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
	/**
	 * Fetch referenced_works for a work entity if not already present
	 */
	private async fetchReferencedWorksForWork(workId: string): Promise<string[] | null> {
		try {
			logger.debug("graph", "Fetching referenced_works for work entity", {
				workId
			}, "RelationshipDetectionService");

			const workData = await cachedOpenAlex.client.works.getWork(workId, {
				select: ["id", "referenced_works"]
			});

			return workData.referenced_works;
		} catch (error) {
			logger.error("graph", "Failed to fetch referenced_works for work", {
				workId,
				error: error instanceof Error ? error.message : "Unknown error"
			}, "RelationshipDetectionService");
			return null;
		}
	}

	private async analyzeWorkRelationships(workData: MinimalEntityData, existingNodes: GraphNode[]): Promise<DetectedRelationship[]> {
		const relationships: DetectedRelationship[] = [];

		logger.debug("graph", "Analyzing work relationships", {
			workId: workData.id,
			hasReferencedWorks: !!workData.referenced_works,
			referencedWorksCount: workData.referenced_works?.length ?? 0,
			existingNodesCount: existingNodes.length
		}, "RelationshipDetectionService");

		// If referenced_works is not available in the fetched data, try to get it from the graph node data
		if (!workData.referenced_works) {
			const store = useGraphStore.getState();
			const graphNode = Object.values(store.nodes).find(node => node.entityId === workData.id);
			if (graphNode?.entityData && (graphNode.entityData as any).referenced_works) {
				workData.referenced_works = (graphNode.entityData as any).referenced_works;
			}
		}

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

		// Check for citation relationships - fetch referenced_works if not present
		let referencedWorks = workData.referenced_works;
		logger.debug("graph", "Checking referenced_works", {
			workId: workData.id,
			hasReferencedWorks: !!referencedWorks,
			referencedWorksLength: referencedWorks?.length ?? 0
		}, "RelationshipDetectionService");

		if (!referencedWorks) {
			logger.debug("graph", "Work entity missing referenced_works, fetching from API", {
				workId: workData.id
			}, "RelationshipDetectionService");

			const fetchedReferencedWorks = await this.fetchReferencedWorksForWork(workData.id);
			if (fetchedReferencedWorks) {
				referencedWorks = fetchedReferencedWorks;
				logger.debug("graph", "Successfully fetched referenced_works for work", {
					workId: workData.id,
					referencedWorksCount: referencedWorks.length
				}, "RelationshipDetectionService");
			} else {
				logger.debug("graph", "Failed to fetch referenced_works", {
					workId: workData.id
				}, "RelationshipDetectionService");
			}
		}

		if (referencedWorks && referencedWorks.length > 0) {
			logger.debug("graph", "Analyzing citation relationships", {
				workId: workData.id,
				referencedWorksCount: referencedWorks.length
			}, "RelationshipDetectionService");

			for (const referencedWorkId of referencedWorks) {
				// Both referenced_works and node IDs use full URL format, so direct comparison should work
				const referencedNode = existingNodes.find(node =>
					node.entityId === referencedWorkId || node.id === referencedWorkId
				);

				if (referencedNode) {
					logger.debug("graph", "Found citation relationship", {
						sourceWork: workData.id,
						targetWork: referencedWorkId,
						relationshipType: RelationType.REFERENCES
					}, "RelationshipDetectionService");

					relationships.push({
						sourceNodeId: workData.id,
						targetNodeId: referencedWorkId, // Use the entity ID to match the expected pattern
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
	 * Fetch entity without field selection (for debugging)
	 */
	private async fetchEntityWithoutSelect(entityId: string, entityType: EntityType): Promise<OpenAlexEntity> {
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
	private async fetchEntityWithSelect(entityId: string, entityType: EntityType, selectFields: string[]): Promise<OpenAlexEntity> {
		const params = { select: selectFields };

		switch (entityType) {
			case "works":
				return cachedOpenAlex.client.works.getWork(entityId, params);
			case "authors":
				return cachedOpenAlex.client.authors.getAuthor(entityId, params);
			case "sources":
				return cachedOpenAlex.client.sources.getSource(entityId, params);
			case "institutions":
				return cachedOpenAlex.client.institutions.getInstitution(entityId, params);
			case "topics":
				return cachedOpenAlex.client.topics.get(entityId, params);
			case "publishers":
				return cachedOpenAlex.client.publishers.get(entityId, params);
			case "funders":
				return cachedOpenAlex.client.funders.get(entityId, params);
			case "keywords":
				return cachedOpenAlex.client.keywords.getKeyword(entityId, params);
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
			const sourceData = await this.fetchMinimalEntityData(sourceNode.entityId, sourceNode.entityType);
			if (!sourceData) {
				return [];
			}

			// Get only the other nodes in this batch (exclude the source node itself)
			const otherBatchNodes = batchNodeIds
				.filter(id => id !== nodeId)
				.map(id => store.getNode(id))
				.filter((node): node is GraphNode => isNonNull(node));

			// Analyze relationships specifically with the batch nodes
			const detectedRelationships = this.analyzeCrossBatchRelationships(sourceData, otherBatchNodes);

			logger.debug("graph", "Cross-batch relationship detection", {
				sourceNodeId: nodeId,
				batchNodeCount: otherBatchNodes.length,
				detectedCount: detectedRelationships.length
			}, "RelationshipDetectionService");

			return this.createEdgesFromRelationships(detectedRelationships);

		} catch (error) {
			logError(logger, "Failed to detect cross-batch relationships", error, "RelationshipDetectionService", "graph");
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
				referencedWorkIds: sourceData.referenced_works,
				batchNodeIds: batchNodes.map(n => n.entityId)
			}, "RelationshipDetectionService");

			for (const referencedWorkId of sourceData.referenced_works) {
				const referencedNode = batchNodes.find(node =>
					node.entityId === referencedWorkId || node.id === referencedWorkId
				);
				if (referencedNode) {
					logger.debug("graph", "FOUND cross-batch citation relationship!", {
						sourceWork: sourceData.display_name,
						sourceId: sourceData.id,
						targetWork: referencedNode.label,
						targetId: referencedWorkId
					}, "RelationshipDetectionService");

					relationships.push({
						sourceNodeId: sourceData.id,
						targetNodeId: referencedWorkId, // Use the entity ID to match the expected pattern
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
			...(rel.weight !== undefined && { weight: rel.weight }),
			...(rel.metadata && { metadata: rel.metadata })
		}));
	}
}

/**
 * Create a new RelationshipDetectionService instance
 */
export function createRelationshipDetectionService(queryClient: QueryClient): RelationshipDetectionService {
	return new RelationshipDetectionService(queryClient);
}