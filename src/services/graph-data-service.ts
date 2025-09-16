/**
 * Graph data service for integrating OpenAlex API with graph visualization
 * Handles data transformation, caching, and progressive loading
 * Now integrated with TanStack Query for persistent caching
 */

import { QueryClient } from "@tanstack/react-query";
import { rateLimitedOpenAlex } from "@/lib/openalex/rate-limited-client";
import { EntityDetector } from "@/lib/graph/utils/entity-detection";
import { EntityFactory, type ExpansionOptions } from "@/lib/entities";
import { useGraphStore } from "@/stores/graph-store";
import { useExpansionSettingsStore } from "@/stores/expansion-settings-store";
import { logError, logger } from "@/lib/logger";
import { RequestDeduplicationService, createRequestDeduplicationService } from "./request-deduplication-service";
import { RelationshipDetectionService, createRelationshipDetectionService } from "./relationship-detection-service";
import { safeSlice } from "@/lib/openalex/utils/hydration-helpers";
import {
	getCachedOpenAlexEntities,
	setCachedGraphNodes,
	setCachedGraphEdges,
	setNodeExpanded,
	isNodeExpanded
} from "@/lib/cache/graph-cache";
import type {
	GraphNode,
	GraphEdge,
	EntityType,
	ExternalIdentifier,
	SearchOptions,
	GraphCache,
} from "@/lib/graph/types";
import type { ExpansionTarget } from "@/lib/graph/types/expansion-settings";
import { RelationType } from "@/lib/graph/types";
import type {
	Work,
	Author,
	Source,
	InstitutionEntity,
	OpenAlexEntity,
} from "@/lib/openalex/types";

export class GraphDataService {
	private detector: EntityDetector;
	private cache: GraphCache;
	private queryClient: QueryClient;
	private deduplicationService: RequestDeduplicationService;
	private relationshipDetectionService: RelationshipDetectionService;

	constructor(queryClient: QueryClient) {
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
				() => rateLimitedOpenAlex.getEntity(apiEntityId)
			);

			// Entity successfully fetched

			// Transform to graph data with incremental hydration
			const { nodes, edges } = this.transformEntityToGraph(entity);

			// Clear existing graph and expansion cache
			store.clear();
			this.cache.expandedNodes.clear();
			this.cache.fetchedRelationships.clear();

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

			logger.info("graph", "Entity graph loaded with incremental hydration", {
				nodeCount: nodes.length,
				edgeCount: edges.length,
				primaryNodeId,
				// No artificial hydration level tracking
			}, "GraphDataService");

			// Detect relationships between all initial nodes using batch processing
			logger.info("graph", "Starting relationship detection for initial graph nodes", {
				nodeCount: nodes.length
			}, "GraphDataService");

			const nodeIds = nodes.map(node => node.id);
			this.relationshipDetectionService.detectRelationshipsForNodes(nodeIds).catch((error: unknown) => {
				logError("Failed to detect relationships for initial nodes", error, "GraphDataService", "graph");
			});

			// Layout is now handled by the ReactFlow component's useLayout hook
			// No need for explicit layout application here

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			store.setError(errorMessage);
			logError("Failed to load entity graph", error, "GraphDataService", "graph");
		} finally {
			store.setLoading(false);
		}
	}

	/**
   * Load an entity and add it to the existing graph (without clearing)
   * Used for progressive graph building when clicking on nodes
   */
	async loadEntityIntoGraph(entityId: string): Promise<void> {
		const store = useGraphStore.getState();

		try {
			// Check if the node already exists (regardless of hydration level)
			const existingNode = Array.from(store.nodes.values()).find(
				node => node.entityId === entityId
			);

			if (existingNode) {
				// Node already exists, select it and optionally hydrate if needed
				store.selectNode(existingNode.id);

				// Node will be hydrated on-demand when specific fields are needed

				logger.info("graph", "Existing node selected", {
					nodeId: existingNode.id,
					entityId
				}, "GraphDataService");

				// Detect relationships for the existing node
				this.relationshipDetectionService.detectRelationshipsForNode(existingNode.id).catch((error: unknown) => {
					logError("Failed to detect relationships for existing node", error, "GraphDataService", "graph");
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
				() => rateLimitedOpenAlex.getEntity(apiEntityId)
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
				this.relationshipDetectionService.detectRelationshipsForNode(primaryNodeId).catch((error: unknown) => {
					logError("Failed to detect relationships for newly added node", error, "GraphDataService", "graph");
				});

				// Note: No automatic expansion - user must manually expand nodes
			}

			logger.info("graph", "Entity loaded into graph", {
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
			if (nodes.length > 1) {
				const nodeIds = nodes.map(n => n.id);
				this.relationshipDetectionService.detectRelationshipsForNodes(nodeIds).catch((error: unknown) => {
					logError("Failed to detect relationships for initial graph nodes", error, "GraphDataService", "graph");
				});
			}

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			store.setError(errorMessage);
			logError("Failed to load entity into graph", error, "GraphDataService", "graph");
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

			if (cachedEntities.length === 0) {
				logger.info("graph", "No cached entities found to load", {}, "GraphDataService");
				return;
			}

			logger.info("graph", "Loading all cached entities into graph", {
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
					logError("Failed to transform cached entity to graph", error, "GraphDataService", "graph");
				}
			}

			// Remove duplicates (entities might reference each other)
			const uniqueNodes = new Map<string, GraphNode>();
			allNodes.forEach(node => uniqueNodes.set(node.id, node));

			const uniqueEdges = new Map<string, GraphEdge>();
			allEdges.forEach(edge => uniqueEdges.set(edge.id, edge));

			// Add to graph store
			const finalNodes = Array.from(uniqueNodes.values());
			const finalEdges = Array.from(uniqueEdges.values());

			store.addNodes(finalNodes);
			store.addEdges(finalEdges);

			// Update cached graph data
			setCachedGraphNodes(this.queryClient, finalNodes);
			setCachedGraphEdges(this.queryClient, finalEdges);

			// If there are pinned nodes, recalculate depths from the first one
			const pinnedNodes = Array.from(store.pinnedNodes);
			const firstPinnedNodeId = pinnedNodes[0];
			if (firstPinnedNodeId) {
				store.calculateNodeDepths(firstPinnedNodeId);
			}

			logger.info("graph", "Loaded all cached entities into graph", {
				nodeCount: finalNodes.length,
				edgeCount: finalEdges.length,
				pinnedNodesCount: pinnedNodes.length,
				firstPinnedNodeId
			}, "GraphDataService");

		} catch (error) {
			logError("Failed to load cached nodes into graph", error, "GraphDataService", "graph");
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

			logger.info("graph", "Hydrating node to full with selective field loading", {
				nodeId,
				entityType: node.type,
				label: node.label
			}, "GraphDataService");

			// Check if we can use selective field loading for this entity type
			if (EntityFactory.isSupported(node.type)) {
				// Use entity-specific selective field loading for metadata
				const entityInstance = EntityFactory.create(node.type, rateLimitedOpenAlex);

				logger.debug("graph", "Using selective field loading for metadata fields", {
					nodeId,
					entityId: node.entityId,
					entityType: node.type
				}, "GraphDataService");

				const entity = await this.deduplicationService.getEntity(
					node.entityId,
					() => entityInstance.fetchWithMetadata(node.entityId)
				);

				// Extract metadata-level data from the entity
				const fullNodeData = this.createNodeFromEntity(entity, node.type);

				// Update the node with full metadata
				store.markNodeAsLoaded(nodeId, {
					label: fullNodeData.label,
					externalIds: fullNodeData.externalIds,
					entityData: fullNodeData.entityData
				});

				logger.info("graph", "Node hydrated with selective field loading", {
					nodeId,
					newLabel: fullNodeData.label,
					fieldsLoaded: "metadata"
				}, "GraphDataService");

			} else {
				// Fallback to full entity fetch for unsupported types
				logger.debug("graph", "Fallback to full entity fetch", {
					nodeId,
					entityType: node.type,
					reason: "entity type not supported for selective loading"
				}, "GraphDataService");

				const entity = await this.deduplicationService.getEntity(
					node.entityId,
					() => rateLimitedOpenAlex.getEntity(node.entityId)
				);

				// Extract full data from the entity
				const fullNodeData = this.createNodeFromEntity(entity, node.type);

				// Update the node with full data
				store.markNodeAsLoaded(nodeId, {
					label: fullNodeData.label,
					externalIds: fullNodeData.externalIds,
					entityData: fullNodeData.entityData
				});

				logger.info("graph", "Node hydrated with full entity fetch", {
					nodeId,
					newLabel: fullNodeData.label,
					fieldsLoaded: "all"
				}, "GraphDataService");
			}

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Failed to load node data";
			store.markNodeAsError(nodeId, errorMessage);
			logError("Failed to hydrate node to full", error, "GraphDataService", "graph");
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
			logError("Failed to detect relationships for node", error, "GraphDataService", "graph");
		}
	}

	/**
	 * Detect relationships for all nodes in the current graph
	 * This can be useful to retroactively detect relationships after loading cached data
	 */
	async detectRelationshipsForAllNodes(): Promise<void> {
		const store = useGraphStore.getState();
		const allNodes = Array.from(store.nodes.values());

		logger.info("graph", "Starting relationship detection for all nodes", {
			nodeCount: allNodes.length
		}, "GraphDataService");

		let processedCount = 0;
		const batchSize = 5;
		const delayBetweenBatches = 1000; // 1 second delay to avoid overwhelming the API

		for (let i = 0; i < allNodes.length; i += batchSize) {
			const batch = allNodes.slice(i, i + batchSize);

			// Process batch in parallel
			const batchPromises = batch.map(node =>
				this.relationshipDetectionService.detectRelationshipsForNode(node.id).catch((error: unknown) => {
					logger.warn("graph", "Failed to detect relationships for node in batch", {
						nodeId: node.id,
						error: error instanceof Error ? error.message : "Unknown error"
					}, "GraphDataService");
				})
			);

			await Promise.allSettled(batchPromises);
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

		logger.info("graph", "Relationship detection completed for all nodes", {
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

		if (minimalNodes.length === 0) {
			logger.debug("graph", "No minimal nodes to hydrate", {}, "GraphDataService");
			return;
		}

		logger.info("graph", "Starting batch hydration of minimal nodes", {
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

			logger.debug("graph", `Processing minimal node ${String(i + 1)}/${String(minimalNodes.length)}`, {
				nodeId: node.id,
				entityType: node.type,
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

		logger.info("graph", "Finished hydrating all minimal nodes", {
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

		if (minimalNodes.length === 0) {
			logger.debug("graph", "No minimal nodes to hydrate immediately", {}, "GraphDataService");
			return;
		}

		logger.info("graph", "Starting immediate parallel hydration of all minimal nodes", {
			minimalNodeCount: minimalNodes.length
		}, "GraphDataService");

		// Hydrate all minimal nodes in parallel using Promise.allSettled to prevent failures from blocking others
		const hydratePromises = minimalNodes.map(node =>
			this.hydrateNodeToFull(node.id).catch((error: unknown) => {
				logger.warn("graph", "Failed to hydrate minimal node in parallel batch", {
					nodeId: node.id,
					entityType: node.type,
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

		logger.info("graph", "Completed immediate parallel hydration of all minimal nodes", {
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

		// Check if already expanded using TanStack Query cache (unless forced)
		if (!force && isNodeExpanded(this.queryClient, nodeId)) {
			logger.info("graph", "Node already expanded, skipping expansion", { nodeId }, "GraphDataService");
			return;
		}

		const store = useGraphStore.getState();

		// DON'T set loading state for incremental expansions to avoid showing "Loading graph..."
		// Individual expansions should be seamless and not disrupt the existing graph

		try {
			// Get the node to expand
			const node = store.nodes.get(nodeId);
			if (!node) return;

			// Check if entity type is supported
			if (!EntityFactory.isSupported(node.type)) {
				logger.warn("graph", `Expansion not implemented for entity type: ${node.type}`, {
					nodeId,
					entityType: node.type
				}, "GraphDataService");
				return;
			}

			// Mark the node as loading to provide visual feedback
			store.markNodeAsLoading(nodeId);

			// Log expansion attempt
			logger.info("graph", "Expanding node", {
				nodeId,
				entityType: node.type,
				force,
				limit: options.limit,
				depth: options.depth,
				wasAlreadyExpanded: this.cache.expandedNodes.has(nodeId)
			}, "GraphDataService");

			// Create entity instance using the factory
			const entity = EntityFactory.create(node.type, rateLimitedOpenAlex);

			// Get expansion settings for this entity type
			const expansionSettingsStore = useExpansionSettingsStore.getState();
			const expansionTarget = node.type as ExpansionTarget;
			const expansionSettings = expansionSettingsStore.getSettings(expansionTarget);

			// Log expansion settings usage
			logger.debug("graph", "Retrieved expansion settings for node expansion", {
				nodeId,
				entityType: node.type,
				expansionTarget,
				settingsEnabled: expansionSettings.enabled,
				settingsLimit: expansionSettings.limit,
				sortsCount: (expansionSettings.sorts ?? []).length,
				filtersCount: (expansionSettings.filters ?? []).length
			}, "GraphDataService");

			// Expand the entity with expansion settings
			const context = {
				entityId: node.entityId,
				entityType: node.type,
				client: rateLimitedOpenAlex
			};
			const enhancedOptions = {
				...options,
				expansionSettings
			};

			const relatedData = await entity.expand(context, enhancedOptions);

			// Add new nodes and edges to the graph
			store.addNodes(relatedData.nodes);
			store.addEdges(relatedData.edges);

			// Update cached graph data
			const allNodes = Array.from(store.nodes.values());
			const allEdges = Array.from(store.edges.values());
			setCachedGraphNodes(this.queryClient, allNodes);
			setCachedGraphEdges(this.queryClient, allEdges);

			// Mark as expanded in TanStack Query cache
			setNodeExpanded(this.queryClient, nodeId, true);

			// Detect relationships for newly added nodes after expansion
			if (relatedData.nodes.length > 0) {
				const newNodeIds = relatedData.nodes.map(n => n.id);
				logger.info("graph", "Starting relationship detection for expanded nodes", {
					expandedNodeId: nodeId,
					newNodeCount: newNodeIds.length,
					entityType: node.type
				}, "GraphDataService");

				// Run relationship detection asynchronously to not block the expansion
				this.relationshipDetectionService.detectRelationshipsForNodes(newNodeIds).catch((error: unknown) => {
					logError("Failed to detect relationships for expanded nodes", error, "GraphDataService", "graph");
				});
			}

			// Mark the node as loaded (expansion completed successfully)
			store.markNodeAsLoaded(nodeId, {
				// No artificial metadata - node is considered loaded when operation completes
			});

			// Layout is automatically handled by the provider when nodes/edges are added

		} catch (error) {
			// Mark the node as error if expansion failed
			const errorMessage = error instanceof Error ? error.message : "Expansion failed";
			store.markNodeAsError(nodeId, errorMessage);

			logError("Failed to expand node", error, "GraphDataService", "graph");
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
			const results = await rateLimitedOpenAlex.searchAll(query, {
				entityTypes: options.entityTypes,
				limit: options.limit || 20,
			});

			// Flatten the results object into a single array
			const flatResults: OpenAlexEntity[] = [
				...results.works,
				...results.authors,
				...results.sources,
				...results.institutions,
				...results.topics,
				...results.publishers,
				...results.funders,
				...results.keywords,
			];

			// Track search statistics
			const searchStats = new Map<EntityType, number>();
			searchStats.set("works", results.works.length);
			searchStats.set("authors", results.authors.length);
			searchStats.set("sources", results.sources.length);
			searchStats.set("institutions", results.institutions.length);
			searchStats.set("topics", results.topics.length);
			searchStats.set("publishers", results.publishers.length);
			searchStats.set("funders", results.funders.length);
			searchStats.set("keywords", results.keywords.length);

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
			logError("Failed to search and visualize", error, "GraphDataService", "graph");
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
				return await rateLimitedOpenAlex.getWork(entityId, params);
			case "authors":
				return await rateLimitedOpenAlex.getAuthor(entityId, params);
			case "sources":
				return await rateLimitedOpenAlex.getSource(entityId, params);
			case "institutions":
				return await rateLimitedOpenAlex.getInstitution(entityId, params);
			case "topics":
				return await rateLimitedOpenAlex.getTopic(entityId, params);
			case "publishers":
				return await rateLimitedOpenAlex.getPublisher(entityId, params);
			case "funders":
				return await rateLimitedOpenAlex.getFunder(entityId, params);
			case "keywords":
				return await rateLimitedOpenAlex.getKeyword(entityId, params);
			default:
				// Fallback to generic method without field selection
				return await rateLimitedOpenAlex.getEntity(entityId);
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
				works: ["id", "display_name", "publication_year", "cited_by_count", "open_access.is_oa"],
				authors: ["id", "display_name", "works_count", "cited_by_count"],
				sources: ["id", "display_name", "works_count", "cited_by_count", "type"],
				institutions: ["id", "display_name", "works_count", "cited_by_count", "country_code"],
				topics: ["id", "display_name", "works_count", "cited_by_count"],
				publishers: ["id", "display_name", "works_count", "sources_count"],
				funders: ["id", "display_name", "works_count", "grants_count"],
				keywords: ["id", "display_name", "works_count", "cited_by_count"]
			};

			const fields = minimalFieldsMap[entityType] || ["id", "display_name"];

			// Use the specific entity method with field selection for minimal data
			const entity = await this.deduplicationService.getEntity(
				entityId,
				() => this.fetchEntityWithFields(entityId, entityType, fields)
			);

			// Create node with minimal data using entityData
			return {
				id: entity.id,
				type: entityType,
				label: entity.display_name || `${entityType} ${entity.id}`,
				entityId: entity.id,
				position: { x: 0, y: 0 }, // Will be positioned by layout
				externalIds: [], // Will be populated during full hydration
				entityData: this.getEntityData(entity)
			};
		} catch (error) {
			logError(`Failed to create minimal node for ${entityId}`, error, "GraphDataService", "graph");
			return null;
		}
	}

	/**
   * Load minimal data in background for nodes to get basic display data (non-blocking)
   * Uses selective API field loading for efficiency
   */
	private async loadMinimalDataInBackground(entityId: string, entityType: EntityType): Promise<void> {
		const store = useGraphStore.getState();
		const node = store.nodes.get(entityId);

		if (!node) {
			return;
		}

		try {
			// Create minimal node with selective field loading
			const minimalNode = await this.createMinimalNode(entityId, entityType);
			if (minimalNode) {
				// Update only the label and entityData, preserve position
				store.updateNode(entityId, {
					...node,
					label: minimalNode.label,
					entityData: minimalNode.entityData
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
   * Legacy background hydration for nodes to get basic display data (non-blocking)
   * @deprecated Use loadMinimalDataInBackground instead for better performance
   */
	private async hydrateNodeInBackground(entityId: string): Promise<void> {
		const store = useGraphStore.getState();
		const node = store.nodes.get(entityId);

		if (!node) {
			return;
		}

		try {
			// Get minimal data for display purposes only
			const minimalNode = await this.createMinimalNode(entityId, node.type);
			if (minimalNode) {
				// Update only the label and basic entityData, keep position
				store.updateNode(entityId, {
					...node,
					label: minimalNode.label,
					entityData: minimalNode.entityData
				});

				logger.debug("graph", "Background hydration completed", {
					entityId,
					newLabel: minimalNode.label
				});
			}
		} catch (error) {
			// Silent failure for background hydration - don't spam logs
			logger.debug("graph", "Background hydration failed silently", {
				entityId,
				error: error instanceof Error ? error.message : "Unknown error"
			});
		}
	}

	/**
   * Hydrate a node with full data when needed (e.g., when user interacts with it)
   */
	async hydrateNode(nodeId: string): Promise<void> {
		const store = useGraphStore.getState();
		const node = store.nodes.get(nodeId);

		if (!node) {
			logger.warn("graph", "Cannot hydrate non-existent node", { nodeId });
			return;
		}

		// No artificial hydration checks - proceed with field-level hydration as needed

		try {
			// Mark node as loading during hydration
			store.markNodeAsLoading(nodeId);

			// Fetch full entity data without field restrictions
			const fullEntity = await this.deduplicationService.getEntity(
				node.entityId,
				() => rateLimitedOpenAlex.getEntity(node.entityId)
			);

			// Create updated node data WITHOUT creating related entities (hydration only)
			// This prevents automatic expansion of related entities during single-click hydration
			const fullNodeData = this.createNodeFromEntity(fullEntity, node.type);

			// Update node with full data
			store.updateNode(nodeId, {
				...fullNodeData,
				position: node.position, // Preserve current position
			});

			logger.info("graph", "Node fully hydrated (without expansion)", {
				nodeId,
				entityType: node.type,
				externalIdCount: fullNodeData.externalIds.length
			});
		} catch (error) {
			logError(`Failed to hydrate node ${nodeId}`, error, "GraphDataService", "graph");
			store.markNodeAsLoading(nodeId, false); // Clear loading state on error
		}
	}

	/**
	 * Expand all visible nodes to find only entities of the specified type
	 * This efficiently fetches only the target entity type, avoiding unnecessary API calls
	 */
	async expandAllNodesOfType(entityType: EntityType, options: ExpansionOptions = {}): Promise<void> {
		const store = useGraphStore.getState();
		const allVisibleNodes = store.getVisibleNodes();

		if (allVisibleNodes.length === 0) {
			logger.info("graph", "No visible nodes found to expand", { entityType }, "GraphDataService");
			return;
		}

		logger.info("graph", `Expanding all visible nodes to find ${entityType} entities`, {
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

					logger.debug("graph", `Found ${relatedEntityIds.length} ${entityType} entities related to ${node.id}`, {
						nodeId: node.id,
						sourceType: node.type,
						targetType: entityType,
						relatedCount: relatedEntityIds.length
					}, "GraphDataService");

					// Fetch only the entities of target type (efficiently)
					for (const entityId of relatedEntityIds.slice(0, options.limit || 10)) {
						// Skip if we already have this node
						if (store.nodes.has(entityId)) {
							continue;
						}

						try {
							// Create minimal node for the target entity type
							const minimalNode = await this.createMinimalNode(entityId, entityType);
							if (minimalNode) {
								newNodes.push(minimalNode);

								// Create edge from source node to new node
								const relationshipType = this.determineRelationshipType(node.type, entityType);
								if (relationshipType) {
									const edge: GraphEdge = {
										id: `${node.id}-${relationshipType}-${entityId}`,
										source: node.id,
										target: entityId,
										type: relationshipType,
										label: relationshipType.replace(/_/g, ' ')
									};
									newEdges.push(edge);
								}
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
				logger.info("graph", `Added ${newNodes.length} new ${entityType} nodes to graph`, {
					entityType,
					addedCount: newNodes.length
				}, "GraphDataService");
			}

			if (newEdges.length > 0) {
				store.addEdges(newEdges);
				logger.info("graph", `Added ${newEdges.length} new edges to graph`, {
					entityType,
					edgeCount: newEdges.length
				}, "GraphDataService");
			}

			logger.info("graph", `Completed expanding all visible nodes for ${entityType} entities`, {
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
			logError(errorMessage, error, "GraphDataService", "graph");
		} finally {
			store.setLoading(false);
		}
	}

	/**
	 * Extract related entity IDs of a specific type from entity data
	 */
	private extractRelatedEntitiesOfType(entityData: unknown, targetType: EntityType): string[] {
		if (!entityData || typeof entityData !== 'object') {
			return [];
		}

		const data = entityData as Record<string, unknown>;
		const entityIds: string[] = [];

		// Map of entity types to their common field names in OpenAlex data
		const fieldMappings: Record<EntityType, string[]> = {
			works: ['referenced_works', 'related_works', 'cites'],
			authors: ['authorships', 'authors'],
			sources: ['primary_location', 'locations', 'host_venue'],
			institutions: ['institutions', 'affiliations'],
			topics: ['topics', 'concepts'],
			concepts: ['concepts'],
			publishers: ['publishers'],
			funders: ['grants', 'funders'],
			keywords: ['keywords']
		};

		const fieldsToCheck = fieldMappings[targetType] || [];

		for (const field of fieldsToCheck) {
			const fieldValue = data[field];

			if (Array.isArray(fieldValue)) {
				for (const item of fieldValue) {
					if (typeof item === 'string' && item.startsWith('https://openalex.org/')) {
						entityIds.push(item);
					} else if (item && typeof item === 'object') {
						const itemData = item as Record<string, unknown>;
						if (typeof itemData.id === 'string' && itemData.id.startsWith('https://openalex.org/')) {
							entityIds.push(itemData.id);
						}
					}
				}
			} else if (fieldValue && typeof fieldValue === 'object') {
				const objData = fieldValue as Record<string, unknown>;
				if (typeof objData.id === 'string' && objData.id.startsWith('https://openalex.org/')) {
					entityIds.push(objData.id);
				}
			}
		}

		return [...new Set(entityIds)]; // Remove duplicates
	}

	/**
	 * Determine the relationship type between two entity types
	 */
	private determineRelationshipType(sourceType: EntityType, targetType: EntityType): RelationType | null {
		// Map common relationships between entity types
		const relationshipMap: Record<string, RelationType> = {
			'works-works': RelationType.REFERENCES,
			'works-authors': RelationType.AUTHORED,
			'works-sources': RelationType.PUBLISHED_IN,
			'works-institutions': RelationType.AFFILIATED,
			'works-topics': RelationType.WORK_HAS_TOPIC,
			'works-funders': RelationType.FUNDED_BY,
			'authors-works': RelationType.AUTHORED,
			'authors-institutions': RelationType.AFFILIATED,
			'sources-publishers': RelationType.SOURCE_PUBLISHED_BY,
			'institutions-institutions': RelationType.INSTITUTION_CHILD_OF,
		};

		const key = `${sourceType}-${targetType}`;
		return relationshipMap[key] || RelationType.RELATED_TO;
	}

	/**
   * Transform OpenAlex entity to graph nodes and edges
   */
	private transformEntityToGraph(entity: OpenAlexEntity): { nodes: GraphNode[]; edges: GraphEdge[] } {
		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];

		// Determine entity type
		const detection = this.detector.detectEntityIdentifier(entity.id);
		const entityType = detection.entityType as EntityType;

		// Create main entity node
		const mainNode = this.createNodeFromEntity(entity, entityType);
		nodes.push(mainNode);

		// Transform based on entity type
		switch (entityType) {
			case "works": {
				const workData = this.transformWork(entity as Work, mainNode);
				nodes.push(...workData.nodes);
				edges.push(...workData.edges);
				break;
			}

			case "authors": {
				const authorData = this.transformAuthor(entity as Author, mainNode);
				nodes.push(...authorData.nodes);
				edges.push(...authorData.edges);
				break;
			}

			case "sources": {
				const sourceData = this.transformSource(entity as Source, mainNode);
				nodes.push(...sourceData.nodes);
				edges.push(...sourceData.edges);
				break;
			}

			case "institutions": {
				const institutionData = this.transformInstitution(entity as InstitutionEntity, mainNode);
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
	private transformWork(work: Work, _mainNode: GraphNode): { nodes: GraphNode[]; edges: GraphEdge[] } {
		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];
		const store = useGraphStore.getState();

		// Only create edges to authors that already exist in the graph
		// Do NOT automatically create author nodes - they should only be created during explicit expansion
		safeSlice(work.authorships, 0, 5).forEach((authorship) => {
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
		safeSlice(work.referenced_works, 0, 3).forEach((citedWorkId) => {
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
	private transformAuthor(author: Author, _mainNode: GraphNode): { nodes: GraphNode[]; edges: GraphEdge[] } {
		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];
		const store = useGraphStore.getState();

		// Only create edges to institutions that already exist in the graph
		// Do NOT automatically create institution nodes - they should only be created during explicit expansion
		safeSlice(author.affiliations, 0, 3).forEach((affiliation) => {
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
	private transformSource(source: Source, _mainNode: GraphNode): { nodes: GraphNode[]; edges: GraphEdge[] } {
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
	private transformInstitution(institution: InstitutionEntity, _mainNode: GraphNode): { nodes: GraphNode[]; edges: GraphEdge[] } {
		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];
		const store = useGraphStore.getState();

		// Only create edges to parent institutions that already exist in the graph
		// Do NOT automatically create parent institution nodes - they should only be created during explicit expansion
		safeSlice(institution.lineage, 0, 2).forEach((parentId) => {
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
			label: entity.display_name || "Unknown Entity",
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

		switch (entityType) {
			case "works": {
				const work = entity as Work;
				if (work.doi) {
					externalIds.push({
						type: "doi",
						value: work.doi,
						url: `https://doi.org/${work.doi}`,
					});
				}
				break;
			}

			case "authors": {
				const author = entity as Author;
				if (author.orcid) {
					externalIds.push({
						type: "orcid",
						value: author.orcid,
						url: author.orcid.startsWith("http") ? author.orcid : `https://orcid.org/${author.orcid}`,
					});
				}
				break;
			}

			case "sources": {
				const source = entity as Source;
				if (source.issn_l) {
					externalIds.push({
						type: "issn_l",
						value: source.issn_l,
						url: `https://portal.issn.org/resource/ISSN/${source.issn_l}`,
					});
				}
				break;
			}

			case "institutions": {
				const institution = entity as InstitutionEntity;
				if (institution.ror) {
					externalIds.push({
						type: "ror",
						value: institution.ror,
						url: institution.ror.startsWith("http") ? institution.ror : `https://ror.org/${institution.ror}`,
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
	private getEntityData(entity: OpenAlexEntity): Record<string, unknown> {
		// Store the complete entity data - helper functions will extract what's needed on-demand
		return entity as unknown as Record<string, unknown>;
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
