/**
 * Graph data service for integrating OpenAlex API with graph visualization
 * Handles data transformation, caching, and progressive loading
 * Now integrated with TanStack Query for persistent caching
 */

import { QueryClient } from "@tanstack/react-query";
import { cachedOpenAlex } from "@academic-explorer/client";
import { EntityDetector } from "@academic-explorer/graph";
import { useGraphStore } from "@/stores/graph-store";
import { useRepositoryStore } from "@/stores/repository-store";
import { useExpansionSettingsStore } from "@/stores/expansion-settings-store";
import { logError, logger } from "@academic-explorer/utils/logger";
import { RequestDeduplicationService, createRequestDeduplicationService } from "./request-deduplication-service";
import { RelationshipDetectionService, createRelationshipDetectionService } from "./relationship-detection-service";
import { isWork, isAuthor, isSource, isInstitution } from "@academic-explorer/client";

interface ExpansionOptions {
  depth?: number;
  limit?: number;
  force?: boolean;
}

function isEntityType(type: string): type is EntityType {
  return ["works", "authors", "sources", "institutions"].includes(type as EntityType);
}
// Cache functions - implement as stubs for now
function getCachedOpenAlexEntities(_queryClient: QueryClient): OpenAlexEntity[] {
	return [];
}
function setCachedGraphNodes(_queryClient: QueryClient, _nodes: GraphNode[]): void {
	// Stub implementation
}
function setCachedGraphEdges(_queryClient: QueryClient, _edges: GraphEdge[]): void {
	// Stub implementation
}
function setNodeExpanded(_queryClient: QueryClient, _nodeId: string, _expanded: boolean): void {
	// Stub implementation
}
function isNodeExpanded(_queryClient: QueryClient, _nodeId: string): boolean {
	return false;
}

// EntityFactory stub implementation
class EntityFactory {
	static isSupported(entityType: EntityType): boolean {
		return ["works", "authors", "sources", "institutions"].includes(entityType);
	}
	static create(entityType: EntityType, client: any) {
		return {
			fetchWithMetadata: async (entityId: string): Promise<OpenAlexEntity> => {
				return await client.client.getEntity(entityId);
			},
			expand: async (context: { entityId: string; entityType: EntityType; client: any }, options: ExpansionOptions): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> => {
				return { nodes: [], edges: [] };
			}
		};
	}
}
import type {
	GraphNode,
	GraphEdge,
	EntityType,
	ExternalIdentifier,
	SearchOptions,
	GraphCache,
} from "@academic-explorer/graph";
import { RelationType } from "@academic-explorer/graph";
import type {
	Work,
	Author,
	Source,
	InstitutionEntity,
	OpenAlexEntity,
} from "@academic-explorer/client";

export class GraphDataService {
	private detector: EntityDetector;
	private cache: GraphCache;
	private queryClient: QueryClient;
	private deduplicationService: RequestDeduplicationService;
	private relationshipDetectionService: RelationshipDetectionService;

	constructor(queryClient: QueryClient) {
		logger.debug("graph", "GraphDataService constructor called", {}, "GraphDataService");
		this.detector = new EntityDetector();
		this.queryClient = queryClient;
		this.deduplicationService = createRequestDeduplicationService(queryClient);
		this.relationshipDetectionService = createRelationshipDetectionService(queryClient);
		this.cache = {
			nodes: new Map(),
			edges: new Map(),
			expandedNodes: new Set(),
			fetchedRelationships: new Map(),
		};
	}

	/**
   * Load initial graph for an entity with related entities
   */
	async loadEntityGraph(entityId: string): Promise<void> {
		const store = useGraphStore.getState();
		store.setLoading(true);
		store.setError(null);

		try {
			// Detect entity type
			const detection = this.detector.detectEntityIdentifier(entityId);

			if (!detection.entityType) {
				throw new Error(`Unable to detect entity type for: ${entityId}`);
			}

			// Fetch entity with deduplication service and cache-first strategy
			// For OpenAlex IDs, construct the full URL
			const apiEntityId = detection.idType === "openalex"
				? `https://openalex.org/${detection.normalizedId}`
				: detection.normalizedId;

			const entity = await this.deduplicationService.getEntity(
				apiEntityId,
				() => cachedOpenAlex.client.getEntity(apiEntityId)
			);

			// Entity successfully fetched

			// Transform to graph data with incremental hydration
			const { nodes, edges } = this.transformEntityToGraph(entity);

			// Clear existing graph and expansion cache
			store.clear();
			this.cache.expandedNodes = new Set();
			this.cache.fetchedRelationships = new Map();

			// Add new data to store
			store.addNodes(nodes);
			store.addEdges(edges);

			// Cache the graph data in TanStack Query for persistence
			setCachedGraphNodes(this.queryClient, nodes);
			setCachedGraphEdges(this.queryClient, edges);

			// Get the primary node ID and calculate depths
			const primaryNodeId = nodes[0]?.id;
			if (primaryNodeId) {
				// Calculate node depths from the primary node
				store.calculateNodeDepths(primaryNodeId);

				// Pin the primary node as the origin for traversal depth calculation
				store.pinNode(primaryNodeId);
			}

			logger.debug("graph", "Entity graph loaded with incremental hydration", {
				nodeCount: nodes.length,
				edgeCount: edges.length,
				primaryNodeId,
				// No artificial hydration level tracking
			}, "GraphDataService");

			// Detect relationships between all initial nodes using batch processing
			logger.debug("graph", "Starting relationship detection for initial graph nodes", {
				nodeCount: nodes.length
			}, "GraphDataService");

			const nodeIds = nodes.map(node => node.id);
			try {
				const detectedEdges = await this.relationshipDetectionService.detectRelationshipsForNodes(nodeIds);
				// Add detected relationship edges to the graph
				if (detectedEdges && detectedEdges.length > 0) {
					logger.debug("graph", "Adding detected relationship edges to initial graph", {
						detectedEdgeCount: detectedEdges?.length ?? 0
					}, "GraphDataService");

					store.addEdges(detectedEdges);

					// Update cached edges
					const allEdges = Object.values(store.edges).filter((edge) => edge != null);
					setCachedGraphEdges(this.queryClient, allEdges);
				}
			} catch (error) {
				logError(logger, "Failed to detect relationships for initial nodes", error, "GraphDataService", "graph");
			}

			// Layout is now handled by the ReactFlow component's useLayout hook
			// No need for explicit layout application here

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			store.setError(errorMessage);
			logError(logger, "Failed to load entity graph", error, "GraphDataService", "graph");
		} finally {
			store.setLoading(false);
		}
	}

	/**
    * Load an entity and add it to the existing graph (without clearing)
    * Used for progressive graph building when clicking on nodes
    */
	async loadEntityIntoGraph(entityId: string): Promise<void> {
		logger.debug("graph", "loadEntityIntoGraph called", { entityId, type: typeof entityId }, "GraphDataService");

		const store = useGraphStore.getState();

		try {
			// Check if the node already exists (regardless of hydration level)
			const existingNode = Object.values(store.nodes).filter((node): node is NonNullable<typeof node> => node != null).find(
				node => node.entityId === entityId
			);

			if (existingNode) {
				// Node already exists, select it and optionally hydrate if needed
				store.selectNode(existingNode.id);

				// Node will be hydrated on-demand when specific fields are needed

				logger.debug("graph", "Existing node selected", {
					nodeId: existingNode.id,
					entityId
				}, "GraphDataService");

				// Detect relationships for the existing node
				this.relationshipDetectionService.detectRelationshipsForNode(existingNode.id)
					.then((detectedEdges) => {
						// Add detected relationship edges to the graph
						if (detectedEdges && detectedEdges.length > 0) {
							logger.debug("graph", "Adding detected relationship edges for existing node", {
								nodeId: existingNode.id,
								detectedEdgeCount: detectedEdges?.length ?? 0
							}, "GraphDataService");

							const currentStore = useGraphStore.getState();
							currentStore.addEdges(detectedEdges);

							// Update cached edges
							const allEdges = Object.values(currentStore.edges).filter((edge) => edge != null);
							setCachedGraphEdges(this.queryClient, allEdges);
						}
					})
					.catch((error: unknown) => {
						logError(logger, "Failed to detect relationships for existing node", error, "GraphDataService", "graph");
					});

				return;
			}

			// Detect entity type
			const detection = this.detector.detectEntityIdentifier(entityId);

			if (!detection.entityType) {
				throw new Error(`Unable to detect entity type for: ${entityId}`);
			}

			// Fetch entity with deduplication service and cache-first strategy
			// For OpenAlex IDs, construct the full URL
			const apiEntityId = detection.idType === "openalex"
				? `https://openalex.org/${detection.normalizedId}`
				: detection.normalizedId;

			const entity = await this.deduplicationService.getEntity(
				apiEntityId,
				() => cachedOpenAlex.client.getEntity(apiEntityId)
			);

			// Entity successfully fetched

			// Transform to graph data
			const { nodes, edges } = this.transformEntityToGraph(entity);

			// Add new data to existing graph (do NOT clear)
			store.addNodes(nodes);
			store.addEdges(edges);

			// Select the newly added primary node
			const primaryNodeId = nodes[0]?.id;
			if (primaryNodeId) {
				store.selectNode(primaryNodeId);

				// Detect relationships for newly added node
				this.relationshipDetectionService.detectRelationshipsForNode(primaryNodeId)
					.then((detectedEdges) => {
						// Add detected relationship edges to the graph
						if (detectedEdges && detectedEdges.length > 0) {
							logger.debug("graph", "Adding detected relationship edges for newly added node", {
								nodeId: primaryNodeId,
								detectedEdgeCount: detectedEdges?.length ?? 0
							}, "GraphDataService");

							const currentStore = useGraphStore.getState();
							currentStore.addEdges(detectedEdges);

							// Update cached edges
							const allEdges = Object.values(currentStore.edges).filter((edge) => edge != null);
							setCachedGraphEdges(this.queryClient, allEdges);
						}
					})
					.catch((error: unknown) => {
						logError(logger, "Failed to detect relationships for newly added node", error, "GraphDataService", "graph");
					});

				// Note: No automatic expansion - user must manually expand nodes
			}

			logger.debug("graph", "Entity loaded into graph", {
				entityId,
				entityType: detection.entityType,
				nodeCount: nodes.length,
				edgeCount: edges.length,
				// No artificial hydration level tracking
			}, "GraphDataService");

			// No automatic hydration - data will be fetched on-demand when needed
			logger.debug("graph", "Nodes loaded without automatic hydration - will hydrate fields on-demand", {
				count: nodes.length
			}, "GraphDataService");

			// Detect relationships between all initial nodes using batch processing
			if (nodes && nodes.length > 1) {
				const nodeIds = nodes.map(n => n.id);
				this.relationshipDetectionService.detectRelationshipsForNodes(nodeIds)
					.then((detectedEdges) => {
						// Add detected relationship edges to the graph
						if (detectedEdges && detectedEdges.length > 0) {
							logger.debug("graph", "Adding detected relationship edges for initial graph nodes", {
								detectedEdgeCount: detectedEdges?.length ?? 0
							}, "GraphDataService");

							const currentStore = useGraphStore.getState();
							currentStore.addEdges(detectedEdges);

							// Update cached edges
							const allEdges = Object.values(currentStore.edges).filter((edge) => edge != null);
							setCachedGraphEdges(this.queryClient, allEdges);
						}
					})
					.catch((error: unknown) => {
						logError(logger, "Failed to detect relationships for initial graph nodes", error, "GraphDataService", "graph");
					});
			}

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			store.setError(errorMessage);
			logError(logger, "Failed to load entity into graph", error, "GraphDataService", "graph");
		}
	}

	/**
	 * Load an entity and add it to the repository (without adding to main graph)
	 * Used for repository mode when building a collection before adding to graph
	 */
	async loadEntityIntoRepository(entityId: string): Promise<void> {
		const repositoryStore = useRepositoryStore.getState();

		try {
			// Detect entity type
			const detection = this.detector.detectEntityIdentifier(entityId);

			if (!detection.entityType) {
				throw new Error(`Unable to detect entity type for: ${entityId}`);
			}

			// For OpenAlex IDs, construct the full URL
			const apiEntityId = detection.idType === "openalex"
				? `https://openalex.org/${detection.normalizedId}`
				: detection.normalizedId;

			const entity = await this.deduplicationService.getEntity(
				apiEntityId,
				() => cachedOpenAlex.client.getEntity(apiEntityId)
			);

			// Entity successfully fetched

			// Transform to graph data
			const { nodes, edges } = this.transformEntityToGraph(entity);

			// Add to repository instead of main graph
			repositoryStore.addToRepository(nodes, edges);

			logger.debug("repository", "Entity loaded into repository", {
				entityId,
				entityType: detection.entityType,
				nodeCount: nodes.length,
				edgeCount: edges.length,
			}, "GraphDataService");

		} catch (error) {
			logError(logger, "Failed to load entity into repository", error, "GraphDataService", "repository");
			throw error; // Re-throw to let the hook handle the error
		}
	}

	/**
	 * Load all cached OpenAlex entities into the graph
	 * Shows all available cached data up to the specified traversal depth
	 */
	loadAllCachedNodes(): void {
		const store = useGraphStore.getState();

		try {
			// Get all cached OpenAlex entities from TanStack Query
			const cachedEntities = getCachedOpenAlexEntities(this.queryClient);

			if (!cachedEntities || cachedEntities.length === 0) {
				logger.debug("graph", "No cached entities found to load", {}, "GraphDataService");
				return;
			}

			logger.debug("graph", "Loading all cached entities into graph", {
				count: cachedEntities.length
			}, "GraphDataService");

			// Transform all cached entities to graph nodes and edges
			const allNodes: GraphNode[] = [];
			const allEdges: GraphEdge[] = [];

			for (const entity of cachedEntities) {
				try {
					const { nodes, edges } = this.transformEntityToGraph(entity);
					allNodes.push(...nodes);
					allEdges.push(...edges);
				} catch (error) {
					logError(logger, "Failed to transform cached entity to graph", error, "GraphDataService", "graph");
				}
			}

			// Remove duplicates (entities might reference each other)
			const uniqueNodes: Record<string, GraphNode> = {};
			allNodes.forEach(node => uniqueNodes[node.id] = node);

			const uniqueEdges: Record<string, GraphEdge> = {};
			allEdges.forEach(edge => uniqueEdges[edge.id] = edge);

			// Add to graph store
			const finalNodes = Object.values(uniqueNodes);
			const finalEdges = Object.values(uniqueEdges);

			store.addNodes(finalNodes);
			store.addEdges(finalEdges);

			// Update cached graph data
			setCachedGraphNodes(this.queryClient, finalNodes);
			setCachedGraphEdges(this.queryClient, finalEdges);

			// If there are pinned nodes, recalculate depths from the first one
			const pinnedNodes = Object.keys(store.pinnedNodes).filter(nodeId => store.pinnedNodes[nodeId]);
			const firstPinnedNodeId = pinnedNodes[0];
			if (firstPinnedNodeId) {
				store.calculateNodeDepths(firstPinnedNodeId);
			}

			logger.debug("graph", "Loaded all cached entities into graph", {
				nodeCount: finalNodes.length,
				edgeCount: finalEdges.length,
				pinnedNodesCount: pinnedNodes.length,
				firstPinnedNodeId
			}, "GraphDataService");

		} catch (error) {
			logError(logger, "Failed to load cached nodes into graph", error, "GraphDataService", "graph");
		}
	}

	/**
   * Hydrate a minimal node to full hydration level with selective API field loading
   * This method uses selective field loading to minimize API payload while providing rich metadata
   */
	async hydrateNodeToFull(nodeId: string): Promise<void> {
		const store = useGraphStore.getState();
		const node = store.getNode(nodeId);

		if (!node) {
			logger.warn("graph", "Node not found, cannot hydrate to full", { nodeId }, "GraphDataService");
			return;
		}

		// No artificial checks - just proceed with hydration
		// Data will be fetched and updated regardless of current state

		try {
			// Mark node as loading
			store.markNodeAsLoading(nodeId);

			logger.debug("graph", "Hydrating node to full with selective field loading", {
				nodeId,
				entityType: node.entityType,
				label: node.label
			}, "GraphDataService");

			// Check if we can use selective field loading for this entity type
			if (EntityFactory.isSupported(node.entityType)) {
				// Use entity-specific selective field loading for metadata
				const entityInstance = EntityFactory.create(node.entityType, cachedOpenAlex);

				logger.debug("graph", "Using selective field loading for metadata fields", {
					nodeId,
					entityId: node.entityId,
					entityType: node.entityType
				}, "GraphDataService");

				const entity = await this.deduplicationService.getEntity(
					node.entityId,
					() => entityInstance.fetchWithMetadata(node.entityId)
				);

				// Extract metadata-level data from the entity
				const fullNodeData = this.createNodeFromEntity(entity, node.entityType);

				// Update the node with full metadata
				store.markNodeAsLoaded(nodeId, {
					label: fullNodeData.label,
					externalIds: fullNodeData.externalIds,
					...(fullNodeData.entityData && { entityData: fullNodeData.entityData })
				});

				logger.debug("graph", "Node hydrated with selective field loading", {
					nodeId,
					newLabel: fullNodeData.label,
					fieldsLoaded: "metadata"
				}, "GraphDataService");

			} else {
				// Fallback to full entity fetch for unsupported types
				logger.debug("graph", "Fallback to full entity fetch", {
					nodeId,
					entityType: node.entityType,
					reason: "entity type not supported for selective loading"
				}, "GraphDataService");

				const entity = await this.deduplicationService.getEntity(
					node.entityId,
					() => cachedOpenAlex.client.getEntity(node.entityId)
				);

				// Extract full data from the entity
				const fullNodeData = this.createNodeFromEntity(entity, node.entityType);

				// Update the node with full data
				store.markNodeAsLoaded(nodeId, {
					label: fullNodeData.label,
					externalIds: fullNodeData.externalIds,
					...(fullNodeData.entityData && { entityData: fullNodeData.entityData })
				});

				logger.debug("graph", "Node hydrated with full entity fetch", {
					nodeId,
					newLabel: fullNodeData.label,
					fieldsLoaded: "all"
				}, "GraphDataService");
			}

		} catch (error) {
			store.markNodeAsError(nodeId);
			logError(logger, "Failed to hydrate node to full", error, "GraphDataService", "graph");
		}
	}

	/**
	 * Manually trigger relationship detection for a specific node
	 * This can be used to detect relationships for nodes that were added before this feature was available
	 */
	async detectRelationshipsForNode(nodeId: string): Promise<void> {
		try {
			await this.relationshipDetectionService.detectRelationshipsForNode(nodeId);
		} catch (error) {
			logError(logger, "Failed to detect relationships for node", error, "GraphDataService", "graph");
		}
	}

	/**
	 * Detect relationships for all nodes in the current graph
	 * This can be useful to retroactively detect relationships after loading cached data
	 */
	async detectRelationshipsForAllNodes(): Promise<void> {
		const store = useGraphStore.getState();
		const allNodes = Object.values(store.nodes).filter((node): node is NonNullable<typeof node> => node != null);

		logger.debug("graph", "Starting relationship detection for all nodes", {
			nodeCount: allNodes.length
		}, "GraphDataService");

		let processedCount = 0;
		const batchSize = 5;
		const delayBetweenBatches = 1000; // 1 second delay to avoid overwhelming the API

		for (let i = 0; i < allNodes.length; i += batchSize) {
			const batch = allNodes.slice(i, i + batchSize);

			// Process batch in parallel and collect edges
			const batchPromises = batch.map(node =>
				this.relationshipDetectionService.detectRelationshipsForNode(node.id)
					.then((edges) => ({ nodeId: node.id, edges, success: true }))
					.catch((error: unknown) => {
						logger.warn("graph", "Failed to detect relationships for node in batch", {
							nodeId: node.id,
							error: error instanceof Error ? error.message : "Unknown error"
						}, "GraphDataService");
						return { nodeId: node.id, edges: [], success: false };
					})
			);

			const batchResults = await Promise.allSettled(batchPromises);

			// Collect all detected edges from successful batch operations
			const allDetectedEdges: GraphEdge[] = [];
			batchResults.forEach(result => {
				if (result.status === "fulfilled" && result.value.success && result.value.edges.length > 0) {
					allDetectedEdges.push(...result.value.edges);
				}
			});

			// Add detected edges to graph if any were found
			if (allDetectedEdges.length > 0) {
				logger.debug("graph", "Adding detected edges from batch processing", {
					batchIndex: Math.floor(i / batchSize) + 1,
					detectedEdgeCount: allDetectedEdges.length
				}, "GraphDataService");

				const currentStore = useGraphStore.getState();
				currentStore.addEdges(allDetectedEdges);

				// Update cached edges
				const updatedEdges = Object.values(currentStore.edges).filter((edge) => edge != null);
				setCachedGraphEdges(this.queryClient, updatedEdges);
			}
			processedCount += batch.length;

			logger.debug("graph", "Relationship detection batch completed", {
				batchIndex: Math.floor(i / batchSize) + 1,
				processedCount,
				totalNodes: allNodes.length,
				progress: Math.round((processedCount / allNodes.length) * 100)
			}, "GraphDataService");

			// Add delay between batches (except for the last batch)
			if (i + batchSize < allNodes.length) {
				await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
			}
		}

		logger.debug("graph", "Relationship detection completed for all nodes", {
			totalProcessed: processedCount,
			totalNodes: allNodes.length
		}, "GraphDataService");
	}

	/**
   * Hydrate all minimal nodes to full in batches
   * This method processes minimal nodes in the background without blocking the UI
   */
	async hydrateAllMinimalNodes(): Promise<void> {
		const store = useGraphStore.getState();
		const minimalNodes = store.getMinimalNodes();

		if (!minimalNodes || minimalNodes.length === 0) {
			logger.debug("graph", "No minimal nodes to hydrate", {}, "GraphDataService");
			return;
		}

		logger.debug("graph", "Starting batch hydration of minimal nodes", {
			minimalNodeCount: minimalNodes.length
		}, "GraphDataService");

		// Process nodes individually with minimal delays for faster loading
		// Deduplication service will handle caching and prevent duplicate requests
		const DELAY_BETWEEN_NODES = 100; // Reduced to 100ms for faster loading
		const BATCH_SIZE = 10; // Process more nodes per batch
		const BATCH_DELAY = 500; // Reduced delay between batches

		let processedCount = 0;

		for (let i = 0; i < minimalNodes.length; i++) {
			const node = minimalNodes[i];
			if (!node) continue;

			logger.debug("graph", `Processing minimal node ${String(i + 1)}/${String(minimalNodes.length)}`, {
				nodeId: node.id,
				entityType: node.entityType,
				label: node.label
			}, "GraphDataService");

			try {
				await this.hydrateNodeToFull(node.id);
				processedCount++;

				// Add delay between individual nodes
				if (i < minimalNodes.length - 1) {
					await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_NODES));
				}

				// Add longer delay every BATCH_SIZE nodes
				if ((i + 1) % BATCH_SIZE === 0 && i < minimalNodes.length - 1) {
					logger.debug("graph", `Batch of ${String(BATCH_SIZE)} nodes completed, taking longer break`, {
						processedSoFar: i + 1,
						remaining: minimalNodes.length - (i + 1)
					}, "GraphDataService");

					await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
				}
			} catch (error) {
				logger.warn("graph", "Failed to hydrate minimal node, continuing with next", {
					nodeId: node.id,
					error: error instanceof Error ? error.message : "Unknown error"
				}, "GraphDataService");

				// Continue with next node even if this one fails
			}
		}

		logger.debug("graph", "Finished hydrating all minimal nodes", {
			totalRequested: minimalNodes.length,
			totalProcessed: processedCount,
			successRate: processedCount / minimalNodes.length
		}, "GraphDataService");
	}

	/**
   * Hydrate all minimal nodes immediately in parallel
   * This method hydrates all minimal nodes simultaneously without delays for maximum speed
   * Recommended for use when the graph is first loaded to proactively hydrate all minimal node data
   */
	async hydrateAllMinimalNodesImmediate(): Promise<void> {
		const store = useGraphStore.getState();
		const minimalNodes = store.getMinimalNodes();

		if (!minimalNodes || minimalNodes.length === 0) {
			logger.debug("graph", "No minimal nodes to hydrate immediately", {}, "GraphDataService");
			return;
		}

		logger.debug("graph", "Starting immediate parallel hydration of all minimal nodes", {
			minimalNodeCount: minimalNodes.length
		}, "GraphDataService");

		// Hydrate all minimal nodes in parallel using Promise.allSettled to prevent failures from blocking others
		const hydratePromises = minimalNodes.map(node =>
			this.hydrateNodeToFull(node.id).catch((error: unknown) => {
				logger.warn("graph", "Failed to hydrate minimal node in parallel batch", {
					nodeId: node.id,
					entityType: node.entityType,
					label: node.label,
					error: error instanceof Error ? error.message : "Unknown error"
				}, "GraphDataService");
				return null; // Return null for failed hydrations to continue processing
			})
		);

		const results = await Promise.allSettled(hydratePromises);

		// Count successful hydrations
		const successfulHydrations = results.filter(result => result.status === "fulfilled").length;
		const failedHydrations = results.length - successfulHydrations;

		logger.debug("graph", "Completed immediate parallel hydration of all minimal nodes", {
			totalRequested: minimalNodes.length,
			successful: successfulHydrations,
			failed: failedHydrations,
			successRate: successfulHydrations / minimalNodes.length
		}, "GraphDataService");
	}

	/**
   * Expand a node to show related entities
   * This method performs incremental expansion without setting global loading state
   */
 	async expandNode(nodeId: string, options: ExpansionOptions = {}): Promise<void> {
 		const { force = false } = options;

 		logger.debug("graph-data", "expandNode function START", { nodeId, force });
 		logger.error("graph", "DEBUG: expandNode called with", { nodeId, force }, "GraphDataService");
 		logger.error("graph", "DEBUG: expandNode START CONSOLE LOG", { nodeId, force }, "GraphDataService");
 		logger.debug("graph", "GraphDataService.expandNode called", { nodeId, force }, "GraphDataService");

 		// Check if already expanded using TanStack Query cache (unless forced)
		const alreadyExpanded = isNodeExpanded(this.queryClient, nodeId);
		logger.warn("graph", "Checking if node already expanded", { nodeId, alreadyExpanded, force }, "GraphDataService");
		logger.error("graph", "DEBUG: alreadyExpanded check", { alreadyExpanded, force, shouldSkip: !force && alreadyExpanded }, "GraphDataService");
		if (!force && alreadyExpanded) {
			logger.debug("graph", "Node already expanded, running relationship detection only", { nodeId }, "GraphDataService");
			logger.error("graph", "DEBUG: Taking early return path for already expanded node - THIS SHOULD NOT HAPPEN WITH force=true", { nodeId }, "GraphDataService");

			// Even if node is already expanded, run relationship detection
			// in case new nodes were added since last expansion
			const store = useGraphStore.getState();
			const allNodeIds = Object.keys(store.nodes);

			if (allNodeIds.length > 1) {
				logger.debug("graph", "Running relationship detection for already-expanded node", {
					nodeId,
					totalNodes: allNodeIds.length
				}, "GraphDataService");

				try {
					const detectedEdges = await this.relationshipDetectionService.detectRelationshipsForNodes(allNodeIds);

					if (detectedEdges && detectedEdges.length > 0) {
						logger.debug("graph", "Found new relationships for already-expanded node", {
							nodeId,
							detectedEdgeCount: detectedEdges?.length ?? 0,
							relationships: detectedEdges.map(e => ({
								source: e.source,
								target: e.target,
								type: e.type
							}))
						}, "GraphDataService");

						store.addEdges(detectedEdges);
					} else {
						logger.debug("graph", "No new relationships found for already-expanded node", { nodeId }, "GraphDataService");
					}
				} catch (error) {
					logError(logger, "Failed to detect relationships for already-expanded node", error, "GraphDataService", "graph");
				}
			}

			return;
		}

		const store = useGraphStore.getState();

		// DON'T set loading state for incremental expansions to avoid showing "Loading graph..."
		// Individual expansions should be seamless and not disrupt the existing graph

		try {
			// Get the node to expand - use "in" operator to avoid ESLint false positive
			logger.error("graph", "DEBUG: Checking if node exists in store", { nodeId, exists: nodeId in store.nodes, storeNodeCount: Object.keys(store.nodes).length }, "GraphDataService");
			if (!(nodeId in store.nodes)) {
				logger.error("graph", "DEBUG: Node not in store, returning early", { nodeId }, "GraphDataService");
				return;
			}
			const node = store.nodes[nodeId];
			logger.error("graph", "DEBUG: Retrieved node from store", { nodeId, nodeExists: !!node, ...(node?.type !== undefined && { nodeType: node.entityType }) }, "GraphDataService");
			if (!node) {
				logger.error("graph", "DEBUG: Node is null, returning early", { nodeId }, "GraphDataService");
				return;
			}

			// Check if entity type is supported
			logger.error("graph", "DEBUG: Checking if entity type is supported", { nodeId, entityType: node.entityType, isSupported: EntityFactory.isSupported(node.entityType) }, "GraphDataService");
			if (!EntityFactory.isSupported(node.entityType)) {
				logger.warn("graph", `Expansion not implemented for entity type: ${node.entityType}`, {
					nodeId,
					entityType: node.entityType
				}, "GraphDataService");
				logger.error("graph", "DEBUG: Entity type not supported, returning early", { nodeId, entityType: node.entityType }, "GraphDataService");
				return;
			}

			// Mark the node as loading to provide visual feedback
			store.markNodeAsLoading(nodeId);

			// Log expansion attempt
			logger.debug("graph", "Expanding node", {
				nodeId,
				entityType: node.entityType,
				force,
				limit: options.limit,
				depth: options.depth,
				wasAlreadyExpanded: this.cache.expandedNodes.has(nodeId)
			}, "GraphDataService");

			// Create entity instance using the factory
			const entity = EntityFactory.create(node.entityType, cachedOpenAlex);

			// Get expansion settings for this entity type
			const expansionSettingsStore = useExpansionSettingsStore.getState();
			// Safely convert entity type to expansion target with type guard
			if (!isEntityType(node.entityType)) {
				logger.error("graph", "Invalid entity type for expansion", { nodeId, entityType: node.entityType }, "GraphDataService");
				return;
			}
			const expansionTarget = node.entityType; // Already validated as EntityType, which extends ExpansionTarget
			const expansionSettings = expansionSettingsStore.getSettings(expansionTarget);

			// Log expansion settings usage
			logger.debug("graph", "Retrieved expansion settings for node expansion", {
				nodeId,
				entityType: node.entityType,
				expansionTarget,
				settingsEnabled: expansionSettings.enabled,
				settingsLimit: expansionSettings.limit,
				sortsCount: (expansionSettings.sorts ?? []).length,
				filtersCount: (expansionSettings.filters ?? []).length
			}, "GraphDataService");

			// Expand the entity with expansion settings
			const context = {
				entityId: node.entityId,
				entityType: node.entityType,
				client: cachedOpenAlex
			};
			const enhancedOptions = {
				...options,
				expansionSettings
			};

			const relatedData = await entity.expand(context, enhancedOptions);

			// First: Add nodes and initial edges to the store
			const currentNodes = Object.values(store.nodes).filter((node) => node != null);
			const currentEdges = Object.values(store.edges).filter((edge): edge is NonNullable<typeof edge> => edge != null);
			const finalNodes = [...currentNodes, ...relatedData.nodes];
			const finalEdges = [...currentEdges, ...relatedData.edges];

			logger.debug("graph", "Adding nodes to store before relationship detection", {
				expandedNodeId: nodeId,
				newNodeCount: relatedData.nodes.length,
				newEdgeCount: relatedData.edges.length,
				totalNodeCount: finalNodes.length,
				totalEdgeCount: finalEdges.length
			}, "GraphDataService");

			// Single atomic update to add nodes and initial edges
			store.setGraphData(finalNodes, finalEdges);

			// Second: Detect relationships for newly added nodes AFTER adding to graph
			let detectedEdges: GraphEdge[] = [];
			if (relatedData.nodes.length > 0) {
				const newNodeIds = relatedData.nodes.map((n: GraphNode) => n.id);
				logger.debug("graph", "Starting relationship detection for expanded nodes", {
					expandedNodeId: nodeId,
					newNodeCount: newNodeIds.length,
					entityType: node.entityType
				}, "GraphDataService");

				try {
					// Run relationship detection now that nodes are in the store
					detectedEdges = await this.relationshipDetectionService.detectRelationshipsForNodes(newNodeIds);

					logger.debug("graph", "Relationship detection completed", {
						expandedNodeId: nodeId,
						detectedEdgeCount: detectedEdges?.length ?? 0,
						relationships: detectedEdges.map(e => ({
							source: e.source,
							target: e.target,
							type: e.type
						}))
					}, "GraphDataService");

					// Third: Add the detected relationship edges if any were found
					if (detectedEdges && detectedEdges.length > 0) {
						const finalEdgesWithRelationships = [...finalEdges, ...detectedEdges];
						logger.debug("graph", "Adding detected relationship edges", {
							expandedNodeId: nodeId,
							relationshipEdgeCount: detectedEdges?.length ?? 0,
							totalEdgeCount: finalEdgesWithRelationships.length
						}, "GraphDataService");

						// Update store with relationship edges
						store.setGraphData(finalNodes, finalEdgesWithRelationships);
					}
				} catch (error) {
					logError(logger, "Failed to detect relationships for expanded nodes", error, "GraphDataService", "graph");
					// Continue with expansion even if relationship detection fails
				}
			}

			// Update cached graph data with final state (including any detected relationship edges)
			const finalEdgesWithRelationships = (detectedEdges && detectedEdges.length > 0) ? [...finalEdges, ...detectedEdges] : finalEdges;
			setCachedGraphNodes(this.queryClient, finalNodes);
			setCachedGraphEdges(this.queryClient, finalEdgesWithRelationships);

			logger.error("graph", "DEBUG: About to check force condition", { force, nodeId }, "GraphDataService");
   			// If force is true, run relationship detection on all nodes in the graph
   			// This ensures relationships are detected even when no new nodes are added
   			logger.error("graph", "FORCE CHECK START", { force, nodeId, typeofForce: typeof force }, "GraphDataService");
   			if (force) {
   				logger.error("graph", "INSIDE FORCE IF BLOCK", { force, nodeId }, "GraphDataService");
  				logger.debug("graph-data", "FORCE BRANCH EXECUTING", { nodeId });
   				const allNodeIds = Object.keys(store.nodes);
   				logger.error("graph", "FORCE BRANCH NODES", { count: allNodeIds.length, nodeIds: allNodeIds }, "GraphDataService");
   				if (allNodeIds.length > 1) { // Only run if there are multiple nodes
   					logger.error("graph", "FORCE BRANCH CONDITION MET", { count: allNodeIds.length }, "GraphDataService");
  					logger.debug("graph", "Running relationship detection on all nodes due to force=true", {
  						expandedNodeId: nodeId,
  						totalNodeCount: allNodeIds.length,
  						allNodeIds
  					}, "GraphDataService");

   					try {
   						logger.error("graph", "DEBUG: FORCE BRANCH - Calling detectRelationshipsForNodes", { allNodeIds, count: allNodeIds.length }, "GraphDataService");
   						const forceDetectedEdges = await this.relationshipDetectionService.detectRelationshipsForNodes(allNodeIds);
   						logger.error("graph", "DEBUG: FORCE BRANCH - detectRelationshipsForNodes returned", { forceDetectedEdgesCount: forceDetectedEdges?.length ?? 0, ...(forceDetectedEdges !== undefined && { forceDetectedEdges }) }, "GraphDataService");

						if (forceDetectedEdges && forceDetectedEdges.length > 0) {
							logger.debug("graph", "Adding force-detected relationship edges", {
								expandedNodeId: nodeId,
								forceDetectedEdgeCount: forceDetectedEdges.length,
								relationships: forceDetectedEdges.map(e => ({
									source: e.source,
									target: e.target,
									type: e.type
								}))
							}, "GraphDataService");

							// Get current graph state
							const currentNodes = Object.values(store.nodes).filter((node) => node != null);
							const currentEdges = Object.values(store.edges).filter((edge): edge is NonNullable<typeof edge> => edge != null);

							// Add the force-detected edges
							const finalEdgesWithForceRelationships = [...currentEdges, ...forceDetectedEdges];
							store.setGraphData(currentNodes, finalEdgesWithForceRelationships);

							// Update cached edges
							setCachedGraphEdges(this.queryClient, finalEdgesWithForceRelationships);
						}
					} catch (error) {
						logError(logger, "Failed to detect relationships with force=true", error, "GraphDataService", "graph");
					}
				}
			}



  			// Mark as expanded in TanStack Query cache
  			setNodeExpanded(this.queryClient, nodeId, true);

  			// Mark the node as loaded (expansion completed successfully)
  			store.markNodeAsLoaded(nodeId, {
  				// No artificial metadata - node is considered loaded when operation completes
  			});

  			// Layout is automatically handled by the provider when nodes/edges are added

  			logger.debug("graph-data", "About to reach force check", { nodeId, force });

  		} catch (error) {
  			// Mark the node as error if expansion failed
  			store.markNodeAsError(nodeId);

  			logger.debug("graph-data", "expandNode function ERROR", { nodeId, error: error instanceof Error ? error.message : String(error) });
  			logError(logger, "Failed to expand node", error, "GraphDataService", "graph");
  		} finally {
  			logger.debug("graph-data", "expandNode function END", { nodeId, force });
  		}
 	}

	/**
   * Search and add results to graph
   */
	async searchAndVisualize(query: string, options: SearchOptions): Promise<void> {
		const store = useGraphStore.getState();
		store.setLoading(true);
		store.setError(null);

		try {
			// Search each entity type using the client API
			const limit = options.limit ?? 20;
			const entityTypes = options.entityTypes ?? ["works", "authors", "sources", "institutions", "topics"];
			const allResults: OpenAlexEntity[] = [];

			// Search each entity type and collect results
			for (const entityType of entityTypes) {
				let entityResults: OpenAlexEntity[] = [];
				try {
					switch (entityType) {
						case "works": {
							const worksResponse = await cachedOpenAlex.client.works.getWorks({
								search: query,
								per_page: limit
							});
							entityResults = worksResponse.results;
							break;
						}
						case "authors": {
							const authorsResponse = await cachedOpenAlex.client.authors.getAuthors({
								search: query,
								per_page: limit
							});
							entityResults = authorsResponse.results;
							break;
						}
						case "sources": {
							const sourcesResponse = await cachedOpenAlex.client.sources.getSources({
								search: query,
								per_page: limit
							});
							entityResults = sourcesResponse.results;
							break;
						}
						case "institutions": {
							const institutionsResponse = await cachedOpenAlex.client.institutions.searchInstitutions(query, {
								per_page: limit
							});
							entityResults = institutionsResponse.results;
							break;
						}
						case "topics": {
							const topicsResponse = await cachedOpenAlex.client.topics.getMultiple({
								search: query,
								per_page: limit
							});
							entityResults = topicsResponse.results;
							break;
						}
					}
				} catch (error) {
					logger.warn("api", `Failed to search ${entityType}`, { query, error });
				}
				allResults.push(...entityResults);
			}

			// Use the collected results
			const flatResults: OpenAlexEntity[] = allResults;

			// Track search statistics by counting results by entity type
			const searchStats: Record<EntityType, number> = {
				works: 0,
				authors: 0,
				sources: 0,
				institutions: 0,
				topics: 0,
				concepts: 0,
				publishers: 0,
				funders: 0,
				keywords: 0,
			};

			// Count results by entity type
			for (const result of flatResults) {
				try {
					const detection = this.detector.detectEntityIdentifier(result.id);
					if (detection.entityType && isEntityType(detection.entityType)) {
						searchStats[detection.entityType]++;
					}
				} catch (error) {
					// Skip results that can't be detected
					logger.warn("graph", "Could not detect entity type for search result", { result, error });
				}
			}

			const { nodes, edges } = this.transformSearchResults(flatResults);

			// Clear existing graph and add search results
			store.clear();
			store.addNodes(nodes);
			store.addEdges(edges);
			store.updateSearchStats(searchStats);

			// Layout is now handled by the ReactFlow component's useLayout hook
			// No need for explicit layout application here

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Search failed";
			store.setError(errorMessage);
			logError(logger, "Failed to search and visualize", error, "GraphDataService", "graph");
		} finally {
			store.setLoading(false);
		}
	}

	/**
   * Fetch entity with specific fields using the appropriate OpenAlex API method
   */
	private async fetchEntityWithFields(entityId: string, entityType: EntityType, fields: string[]): Promise<OpenAlexEntity> {
		const params = { select: fields };

		switch (entityType) {
			case "works":
				return await cachedOpenAlex.client.works.getWork(entityId, params);
			case "authors":
				return await cachedOpenAlex.client.authors.getAuthor(entityId, params);
			case "sources":
				return await cachedOpenAlex.client.sources.getSource(entityId, params);
			case "institutions":
				return await cachedOpenAlex.client.institutions.getInstitution(entityId, params);
			case "topics":
				return await cachedOpenAlex.client.topics.get(entityId, params);
			case "publishers":
				return await cachedOpenAlex.client.publishers.get(entityId, params);
			case "funders":
				return await cachedOpenAlex.client.funders.get(entityId, params);
			case "keywords":
				return await cachedOpenAlex.client.keywords.getKeyword(entityId, params);
			default:
				// Fallback to generic method without field selection
				return await cachedOpenAlex.client.getEntity(entityId);
		}
	}

	/**
   * Create a minimal node with just essential data using selective API field loading
   * Uses incremental hydration with minimal API field loading
   */
	async createMinimalNode(entityId: string, entityType: EntityType): Promise<GraphNode | null> {
		try {
			// Define minimal fields needed for basic node display
			const minimalFieldsMap: Partial<Record<EntityType, string[]>> = {
				works: ["id", "display_name", "publication_year", "cited_by_count", "open_access.is_oa", "referenced_works", "authorships", "primary_location.source.id"],
				authors: ["id", "display_name", "works_count", "cited_by_count", "affiliations"],
				sources: ["id", "display_name", "works_count", "cited_by_count", "type"],
				institutions: ["id", "display_name", "works_count", "cited_by_count", "country_code"],
				topics: ["id", "display_name", "works_count", "cited_by_count"],
				publishers: ["id", "display_name", "works_count", "sources_count"],
				funders: ["id", "display_name", "works_count", "grants_count"],
				keywords: ["id", "display_name", "works_count", "cited_by_count"]
			};

			const fields = minimalFieldsMap[entityType] ?? ["id", "display_name"];

			// Use the specific entity method with field selection for minimal data
			const entity = await this.deduplicationService.getEntity(
				entityId,
				() => this.fetchEntityWithFields(entityId, entityType, fields)
			);

			// Create node with minimal data using entityData
			return {
				id: entity.id,
				type: entityType,
				label: entity.display_name ?? `${entityType} ${entity.id}`,
				entityId: entity.id,
				position: { x: 0, y: 0 }, // Will be positioned by layout
				externalIds: [], // Will be populated during full hydration
				entityData: this.getEntityData(entity)
			};
		} catch (error) {
			logError(logger, `Failed to create minimal node for ${entityId}`, error, "GraphDataService", "graph");
			return null;
		}
	}

	/**
   * Load minimal data in background for nodes to get basic display data (non-blocking)
   * Uses selective API field loading for efficiency
   */
	private async loadMinimalDataInBackground(entityId: string, entityType: EntityType): Promise<void> {
		const store = useGraphStore.getState();

		if (!(entityId in store.nodes)) {
			return;
		}
		const node = store.nodes[entityId];

		try {
			// Create minimal node with selective field loading
			const minimalNode = await this.createMinimalNode(entityId, entityType);
			if (minimalNode) {
				// Update only the label and entityData, preserve position
				store.updateNode(entityId, {
					...node,
					label: minimalNode.label,
					...(minimalNode.entityData && { entityData: minimalNode.entityData })
				});

				logger.debug("graph", "Background minimal data loading completed", {
					entityId,
					newLabel: minimalNode.label,
					entityType
				}, "GraphDataService");
			}
		} catch (error) {
			// Silent failure for background loading - don't spam logs
			logger.debug("graph", "Background minimal data loading failed silently", {
				entityId,
				entityType,
				error: error instanceof Error ? error.message : "Unknown error"
			}, "GraphDataService");
		}
	}


	/**
   * Hydrate a node with full data when needed (e.g., when user interacts with it)
   */
	async hydrateNode(nodeId: string): Promise<void> {
		const store = useGraphStore.getState();

		if (!(nodeId in store.nodes)) {
			logger.warn("graph", "Cannot hydrate non-existent node", { nodeId });
			return;
		}
		const node = store.nodes[nodeId];
		if (!node) return;

		// No artificial hydration checks - proceed with field-level hydration as needed

		try {
			// Mark node as loading during hydration
			store.markNodeAsLoading(nodeId);

			// Fetch full entity data without field restrictions
			const fullEntity = await this.deduplicationService.getEntity(
				node.entityId,
				() => cachedOpenAlex.client.getEntity(node.entityId)
			);

			// Create updated node data WITHOUT creating related entities (hydration only)
			// This prevents automatic expansion of related entities during single-click hydration
			const fullNodeData = this.createNodeFromEntity(fullEntity, node.entityType);

			// Update node with full data
			store.updateNode(nodeId, {
				...fullNodeData,
				position: node.position, // Preserve current position
			});

			logger.debug("graph", "Node fully hydrated (without expansion)", {
				nodeId,
				entityType: node.entityType,
				externalIdCount: fullNodeData.externalIds.length
			});
		} catch (error) {
			logError(logger, `Failed to hydrate node ${nodeId}`, error, "GraphDataService", "graph");
			store.markNodeAsLoading(nodeId, false); // Clear loading state on error
		}
	}

	/**
	 * Expand all visible nodes to find only entities of the specified type
	 * This efficiently fetches only the target entity type, avoiding unnecessary API calls
	 */
	async expandAllNodesOfType(entityType: EntityType, options: ExpansionOptions = {}): Promise<void> {
		logger.debug("graph", "expandAllNodesOfType called", { entityType, options }, "GraphDataService");
		const store = useGraphStore.getState();
		// Use direct selectors instead of unstable getter function to avoid infinite loops
		const { nodes, visibleEntityTypes } = store;
		const allVisibleNodes = Object.values(nodes).filter((node) => node != null).filter((node) => node.entityType in visibleEntityTypes);

		if (allVisibleNodes.length === 0) {
			logger.debug("graph", "No visible nodes found to expand", { entityType }, "GraphDataService");
			return;
		}

		logger.debug("graph", `Expanding all visible nodes to find ${entityType} entities`, {
			entityType,
			visibleNodeCount: allVisibleNodes.length,
			options
		}, "GraphDataService");

		// Set loading state for the bulk operation
		store.setLoading(true);

		try {
			const newNodes: GraphNode[] = [];
			const newEdges: GraphEdge[] = [];

			// For each visible node, extract only entities of the target type from their data
			for (const node of allVisibleNodes) {
				try {
					// Get the node's entity data
					if (!node.entityData) {
						// If node doesn't have entity data, skip it
						continue;
					}

					// Extract entities of target type from the node's entity data
					const relatedEntityIds = this.extractRelatedEntitiesOfType(node.entityData, entityType);

					if (relatedEntityIds.length === 0) {
						continue;
					}

					logger.debug("graph", `Found ${relatedEntityIds.length.toString()} ${entityType} entities related to ${node.id}`, {
						nodeId: node.id,
						sourceType: node.entityType,
						targetType: entityType,
						relatedCount: relatedEntityIds.length
					}, "GraphDataService");

					// Fetch only the entities of target type (efficiently)
					for (const entityId of relatedEntityIds.slice(0, options.limit ?? relatedEntityIds.length)) {
						// Skip if we already have this node
						if (entityId in store.nodes) {
							continue;
						}

						try {
							// Create minimal node for the target entity type
							const minimalNode = await this.createMinimalNode(entityId, entityType);
							if (minimalNode) {
								newNodes.push(minimalNode);

								// Create edge from source node to new node
								const relationshipType = this.determineRelationshipType(node.entityType, entityType);
								const edge: GraphEdge = {
									id: `${node.id}-${relationshipType}-${entityId}`,
									source: node.id,
									target: entityId,
									type: relationshipType,
									label: relationshipType.replace(/_/g, " ")
								};
								newEdges.push(edge);
							}
						} catch (error) {
							logger.warn("graph", `Failed to fetch ${entityType} entity`, {
								entityId,
								error: error instanceof Error ? error.message : "Unknown error"
							}, "GraphDataService");
						}
					}
				} catch (error) {
					logger.warn("graph", `Failed to process node ${node.id}`, {
						nodeId: node.id,
						error: error instanceof Error ? error.message : "Unknown error"
					}, "GraphDataService");
				}
			}

			// Add new nodes and edges to the graph
			if (newNodes.length > 0) {
				store.addNodes(newNodes);
				logger.debug("graph", `Added ${newNodes.length.toString()} new ${entityType} nodes to graph`, {
					entityType,
					addedCount: newNodes.length
				}, "GraphDataService");
			}

			if (newEdges.length > 0) {
				store.addEdges(newEdges);
				logger.debug("graph", `Added ${newEdges.length.toString()} new edges to graph`, {
					entityType,
					edgeCount: newEdges.length
				}, "GraphDataService");
			}

			logger.debug("graph", `Completed expanding all visible nodes for ${entityType} entities`, {
				entityType,
				expandedNodeCount: allVisibleNodes.length,
				newNodesAdded: newNodes.length,
				newEdgesAdded: newEdges.length
			}, "GraphDataService");

		} catch (error) {
			const errorMessage = `Failed to expand all visible nodes for ${entityType}`;
			logger.error("graph", errorMessage, {
				entityType,
				error: error instanceof Error ? error.message : "Unknown error"
			}, "GraphDataService");
			store.setError(errorMessage);
			logError(logger, errorMessage, error, "GraphDataService", "graph");
		} finally {
			store.setLoading(false);
		}
	}

	/**
	 * Extract related entity IDs of a specific type from entity data
	 */
	private extractRelatedEntitiesOfType(entityData: unknown, targetType: EntityType): string[] {
		if (!entityData || typeof entityData !== "object") {
			return [];
		}

		// Type guard for entityData as record
		function isRecord(value: unknown): value is Record<string, unknown> {
			return value !== null && typeof value === "object" && !Array.isArray(value);
		}

		if (!isRecord(entityData)) {
			return [];
		}

		const data = entityData;
		const entityIds: string[] = [];

		// Map of entity types to their common field names in OpenAlex data
		const fieldMappings: Record<EntityType, string[]> = {
			works: ["referenced_works", "related_works", "cites"],
			authors: ["authorships", "authors"],
			sources: ["primary_location", "locations", "host_venue"],
			institutions: ["institutions", "affiliations"],
			topics: ["topics", "concepts"],
			concepts: ["concepts"],
			publishers: ["publishers"],
			funders: ["grants", "funders"],
			keywords: ["keywords"]
		};

		const fieldsToCheck = fieldMappings[targetType];

		for (const field of fieldsToCheck) {
			const fieldValue = data[field];

			if (Array.isArray(fieldValue)) {
				for (const item of fieldValue) {
					if (typeof item === "string" && item.startsWith("https://openalex.org/")) {
						entityIds.push(item);
					} else if (item && typeof item === "object" && !Array.isArray(item)) {
						if (isRecord(item) && typeof item['id'] === "string" && item['id'].startsWith("https://openalex.org/")) {
							entityIds.push(item['id']);
						}
					}
				}
			} else if (fieldValue && typeof fieldValue === "object" && !Array.isArray(fieldValue)) {
				if (isRecord(fieldValue) && typeof fieldValue['id'] === "string" && fieldValue['id'].startsWith("https://openalex.org/")) {
					entityIds.push(fieldValue['id']);
				}
			}
		}

		// Remove duplicates using Record pattern
		const unique: Record<string, boolean> = {};
		entityIds.forEach(id => unique[id] = true);
		return Object.keys(unique);
	}

	/**
	 * Determine the relationship type between two entity types
	 */
	private determineRelationshipType(sourceType: EntityType, targetType: EntityType): RelationType {
		// Map common relationships between entity types
		const relationshipMap: Partial<Record<string, RelationType>> = {
			"works-works": RelationType.REFERENCES,
			"works-authors": RelationType.AUTHORED,
			"works-sources": RelationType.PUBLISHED_IN,
			"works-institutions": RelationType.AFFILIATED,
			"works-topics": RelationType.WORK_HAS_TOPIC,
			"works-funders": RelationType.FUNDED_BY,
			"authors-works": RelationType.AUTHORED,
			"authors-institutions": RelationType.AFFILIATED,
			"sources-publishers": RelationType.SOURCE_PUBLISHED_BY,
			"institutions-institutions": RelationType.INSTITUTION_CHILD_OF,
		};

		const key = `${sourceType}-${targetType}`;
		return relationshipMap[key] ?? RelationType.RELATED_TO;
	}

	/**
   * Transform OpenAlex entity to graph nodes and edges
   */
	private transformEntityToGraph(entity: OpenAlexEntity): { nodes: GraphNode[]; edges: GraphEdge[] } {
		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];

		// Determine entity type
		const detection = this.detector.detectEntityIdentifier(entity.id);
		if (!detection.entityType || !isEntityType(detection.entityType)) {
			throw new Error(`Unable to determine valid entity type for: ${entity.id}`);
		}
		const {entityType} = detection;

		// Create main entity node
		const mainNode = this.createNodeFromEntity(entity, entityType);
		nodes.push(mainNode);

		// Transform based on entity type
		switch (entityType) {
			case "works": {
				if (!isWork(entity)) {
					logger.error("graph", "Entity is not a valid Work", { entityId: entity.id }, "GraphDataService");
					break;
				}
				const workData = this.transformWork(entity);
				nodes.push(...workData.nodes);
				edges.push(...workData.edges);
				break;
			}

			case "authors": {
				if (!isAuthor(entity)) {
					logger.error("graph", "Entity is not a valid Author", { entityId: entity.id }, "GraphDataService");
					break;
				}
				const authorData = this.transformAuthor(entity);
				nodes.push(...authorData.nodes);
				edges.push(...authorData.edges);
				break;
			}

			case "sources": {
				if (!isSource(entity)) {
					logger.error("graph", "Entity is not a valid Source", { entityId: entity.id }, "GraphDataService");
					break;
				}
				const sourceData = this.transformSource(entity);
				nodes.push(...sourceData.nodes);
				edges.push(...sourceData.edges);
				break;
			}

			case "institutions": {
				if (!isInstitution(entity)) {
					logger.error("graph", "Entity is not a valid Institution", { entityId: entity.id }, "GraphDataService");
					break;
				}
				const institutionData = this.transformInstitution(entity);
				nodes.push(...institutionData.nodes);
				edges.push(...institutionData.edges);
				break;
			}
		}

		return { nodes, edges };
	}

	/**
   * Transform Work entity with incremental hydration approach
   */
	private transformWork(work: Work): { nodes: GraphNode[]; edges: GraphEdge[] } {
		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];
		const store = useGraphStore.getState();

		// Only create edges to authors that already exist in the graph
		// Do NOT automatically create author nodes - they should only be created during explicit expansion
		work.authorships?.forEach((authorship) => {
			const existingAuthorNode = store.getNode(authorship.author.id);

			// Only create edge if the author node already exists in the graph
			if (existingAuthorNode) {
				edges.push({
					id: `${authorship.author.id}-authored-${work.id}`,
					source: authorship.author.id,
					target: work.id,
					type: RelationType.AUTHORED,
					label: authorship.author_position === "first" ? "first author" : "co-author",
					weight: authorship.author_position === "first" ? 1.0 : 0.5,
				});
			}
		});

		// Only create edges to sources that already exist in the graph
		// Do NOT automatically create source nodes - they should only be created during explicit expansion
		if (work.primary_location?.source) {
			const existingSourceNode = store.getNode(work.primary_location.source.id);

			// Only create edge if the source node already exists in the graph
			if (existingSourceNode) {
				edges.push({
					id: `${work.id}-published-in-${work.primary_location.source.id}`,
					source: work.id,
					target: work.primary_location.source.id,
					type: RelationType.PUBLISHED_IN,
					label: "published in",
				});
			}
		}

		// Only create edges to referenced works that already exist in the graph
		// Do NOT automatically create referenced work nodes - they should only be created during explicit expansion
		work.referenced_works?.forEach((citedWorkId) => {
			const existingCitedNode = store.getNode(citedWorkId);

			// Only create edge if the referenced work node already exists in the graph
			if (existingCitedNode) {
				edges.push({
					id: `${work.id}-cites-${citedWorkId}`,
					source: work.id,
					target: citedWorkId,
					type: RelationType.REFERENCES,
					label: "references",
				});
			}
		});

		return { nodes, edges };
	}

	/**
   * Transform Author entity with incremental hydration approach
   * Note: Institution nodes are now only created during explicit expansion, not automatic loading
   */
	private transformAuthor(author: Author): { nodes: GraphNode[]; edges: GraphEdge[] } {
		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];
		const store = useGraphStore.getState();

		// Only create edges to institutions that already exist in the graph
		// Do NOT automatically create institution nodes - they should only be created during explicit expansion
		author.affiliations?.forEach((affiliation) => {
			const existingInstitutionNode = store.getNode(affiliation.institution.id);

			// Only create edge if the institution node already exists in the graph
			if (existingInstitutionNode) {
				edges.push({
					id: `${author.id}-affiliated-${affiliation.institution.id}`,
					source: author.id,
					target: affiliation.institution.id,
					type: RelationType.AFFILIATED,
					label: "affiliated with",
				});
			}
		});

		return { nodes, edges };
	}

	/**
   * Transform Source entity (basic implementation)
   */
	private transformSource(source: Source): { nodes: GraphNode[]; edges: GraphEdge[] } {
		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];
		const store = useGraphStore.getState();

		// Only create edges to publishers that already exist in the graph
		// Do NOT automatically create publisher nodes - they should only be created during explicit expansion
		if (source.publisher) {
			const existingPublisherNode = store.getNode(source.publisher);

			// Only create edge if the publisher node already exists in the graph
			if (existingPublisherNode) {
				edges.push({
					id: `${source.id}-published-by-${source.publisher}`,
					source: source.id,
					target: source.publisher,
					type: RelationType.SOURCE_PUBLISHED_BY,
					label: "published by",
				});
			}
		}

		return { nodes, edges };
	}

	/**
   * Transform Institution entity (basic implementation)
   */
	private transformInstitution(institution: InstitutionEntity): { nodes: GraphNode[]; edges: GraphEdge[] } {
		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];
		const store = useGraphStore.getState();

		// Only create edges to parent institutions that already exist in the graph
		// Do NOT automatically create parent institution nodes - they should only be created during explicit expansion
		institution.lineage?.forEach((parentId) => {
			if (parentId !== institution.id) {
				const existingParentNode = store.getNode(parentId);

				// Only create edge if the parent institution node already exists in the graph
				if (existingParentNode) {
					edges.push({
						id: `${institution.id}-child-of-${parentId}`,
						source: institution.id,
						target: parentId,
						type: RelationType.INSTITUTION_CHILD_OF,
						label: "child of",
					});
				}
			}
		});

		return { nodes, edges };
	}

	/**
   * Create a graph node from an OpenAlex entity
   */
	private createNodeFromEntity(entity: OpenAlexEntity, entityType: EntityType): GraphNode {
		const externalIds = this.extractExternalIds(entity, entityType);

		return {
			id: entity.id,
			type: entityType,
			label: entity.display_name ?? "Unknown Entity",
			entityId: entity.id,
			position: { x: 0, y: 0 }, // Will be updated by layout
			externalIds,
			entityData: this.getEntityData(entity),
		};
	}

	/**
   * Extract external identifiers from entity
   */
	private extractExternalIds(entity: OpenAlexEntity, entityType: EntityType): ExternalIdentifier[] {
		const externalIds: ExternalIdentifier[] = [];

		// Type guard for basic entity validation
		if (!entity || typeof entity !== "object") {
			return externalIds;
		}

		switch (entityType) {
			case "works": {
				if ("doi" in entity && typeof entity.doi === "string" && entity.doi) {
					externalIds.push({
						type: "doi",
						value: entity.doi,
						url: `https://doi.org/${entity.doi}`,
					});
				}
				break;
			}

			case "authors": {
				if ("orcid" in entity && typeof entity.orcid === "string" && entity.orcid) {
					externalIds.push({
						type: "orcid",
						value: entity.orcid,
						url: entity.orcid.startsWith("http") ? entity.orcid : `https://orcid.org/${entity.orcid}`,
					});
				}
				break;
			}

			case "sources": {
				if ("issn_l" in entity && typeof entity.issn_l === "string" && entity.issn_l) {
					externalIds.push({
						type: "issn_l",
						value: entity.issn_l,
						url: `https://portal.issn.org/resource/ISSN/${entity.issn_l}`,
					});
				}
				break;
			}

			case "institutions": {
				if ("ror" in entity && typeof entity.ror === "string" && entity.ror) {
					externalIds.push({
						type: "ror",
						value: entity.ror,
						url: entity.ror.startsWith("http") ? entity.ror : `https://ror.org/${entity.ror}`,
					});
				}
				break;
			}
		}

		return externalIds;
	}

	/**
   * Get entity data for storage in GraphNode - no artificial metadata extraction
   */
	/**
	 * Type guard to safely convert OpenAlexEntity to Record<string, unknown>
	 */
	private convertEntityToRecord(entity: OpenAlexEntity): Record<string, unknown> {
		// All OpenAlex entities are guaranteed to be objects with string keys
		if (typeof entity !== "object" || entity === null) {
			throw new Error("Invalid entity data: entity must be a non-null object");
		}

		// Type guard to ensure we have a valid record-like object
		function isRecord(value: unknown): value is Record<string, unknown> {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}

		if (!isRecord(entity)) {
			throw new Error("Entity is not a valid record object");
		}

		// Use Object.assign to safely copy all enumerable properties
		// Safe since we've validated entity as a record-like object
		return Object.assign({}, entity);
	}

	private getEntityData(entity: OpenAlexEntity): Record<string, unknown> {
		// Store the complete entity data - helper functions will extract what's needed on-demand
		return this.convertEntityToRecord(entity);
	}

	/**
   * Transform search results to graph nodes and edges
   */
	private transformSearchResults(results: OpenAlexEntity[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];

		results.forEach((entity, index) => {
			const detection = this.detector.detectEntityIdentifier(entity.id);

			if (detection.entityType) {
				const node = this.createNodeFromEntity(entity, detection.entityType);
				// Position nodes in a grid layout for search results
				const cols = Math.ceil(Math.sqrt(results.length));
				const row = Math.floor(index / cols);
				const col = index % cols;
				node.position = {
					x: col * 200 - (cols * 100),
					y: row * 150 - 75
				};
				nodes.push(node);
			}
		});

		return { nodes, edges };
	}
}

/**
 * Factory function to create a GraphDataService instance
 */
export function createGraphDataService(queryClient: QueryClient): GraphDataService {
	return new GraphDataService(queryClient);
}
