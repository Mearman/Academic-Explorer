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
import { logError, logger } from "@/lib/logger";
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
	RelationType,
	ExternalIdentifier,
	SearchOptions,
	GraphCache,
} from "@/lib/graph/types";
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

	constructor(queryClient: QueryClient) {
		this.detector = new EntityDetector();
		this.queryClient = queryClient;
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

			// Fetch entity with rate-limited OpenAlex client
			const entity = await rateLimitedOpenAlex.getEntity(detection.normalizedId);

			// Check if entity was successfully fetched
			if (!entity) {
				throw new Error(`Entity not found or failed to fetch: ${detection.normalizedId}`);
			}

			// Transform to graph data
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

			logger.info("graph", "Entity graph loaded with placeholder nodes", {
				nodeCount: nodes.length,
				edgeCount: edges.length,
				primaryNodeId,
				placeholderCount: nodes.filter(n => n.metadata?.isPlaceholder).length
			}, "GraphDataService");

			// Start loading placeholder node data in the background (non-blocking)
			if (nodes.some(n => n.metadata?.isPlaceholder)) {
				// Use setTimeout to ensure this happens after the current execution context
				setTimeout(() => {
					this.loadAllPlaceholderNodes().catch((error: unknown) => {
						logError("Background placeholder loading failed", error, "GraphDataService", "graph");
					});
				}, 100);
			}

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
			// Check if the node already exists with full data (not a placeholder)
			const existingNode = Array.from(store.nodes.values()).find(
				node => node.entityId === entityId && !node.metadata?.isPlaceholder
			);

			if (existingNode) {
				// Node already exists with full data, select it and always try to expand further
				store.selectNode(existingNode.id);

				logger.info("graph", "Existing node selected, no automatic expansion", {
					nodeId: existingNode.id,
					entityId,
				}, "GraphDataService");

				// Note: Expansion is now manual-only - user must explicitly click to expand
				return;
			}

			// Detect entity type
			const detection = this.detector.detectEntityIdentifier(entityId);

			if (!detection.entityType) {
				throw new Error(`Unable to detect entity type for: ${entityId}`);
			}

			// Fetch entity with rate-limited OpenAlex client
			const entity = await rateLimitedOpenAlex.getEntity(detection.normalizedId);

			// Check if entity was successfully fetched
			if (!entity) {
				throw new Error(`Entity not found or failed to fetch: ${detection.normalizedId}`);
			}

			// Transform to graph data
			const { nodes, edges } = this.transformEntityToGraph(entity);

			// Add new data to existing graph (do NOT clear)
			store.addNodes(nodes);
			store.addEdges(edges);

			// Select the newly added primary node
			const primaryNodeId = nodes[0]?.id;
			if (primaryNodeId) {
				store.selectNode(primaryNodeId);

				// Note: No automatic expansion - user must manually expand nodes
			}

			logger.info("graph", "Entity loaded into graph", {
				entityId,
				entityType: detection.entityType,
				nodeCount: nodes.length,
				edgeCount: edges.length,
				placeholderCount: nodes.filter(n => n.metadata?.isPlaceholder).length
			}, "GraphDataService");

			// Start loading placeholder node data in the background for new nodes
			const newPlaceholderNodes = nodes.filter(n => n.metadata?.isPlaceholder);
			if (newPlaceholderNodes.length > 0) {
				setTimeout(() => {
					// Load only the new placeholder nodes
					const loadPromises = newPlaceholderNodes.map(node =>
						this.loadPlaceholderNodeData(node.id)
					);
					Promise.allSettled(loadPromises).catch((error: unknown) => {
						logError("Background placeholder loading failed", error, "GraphDataService", "graph");
					});
				}, 100);
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
   * Load data for placeholder nodes in the background
   * This method loads full entity data for nodes that are currently placeholders
   */
	async loadPlaceholderNodeData(nodeId: string): Promise<void> {
		const store = useGraphStore.getState();
		const node = store.getNode(nodeId);

		if (!node || !node.metadata?.isPlaceholder) {
			logger.debug("graph", "Node is not a placeholder, skipping data load", { nodeId }, "GraphDataService");
			return;
		}

		try {
			// Mark node as loading
			store.markNodeAsLoading(nodeId);

			logger.info("graph", "Loading placeholder node data", {
				nodeId,
				entityType: node.type,
				label: node.label
			}, "GraphDataService");

			// Fetch full entity data from OpenAlex
			const entity = await rateLimitedOpenAlex.getEntity(node.entityId);

			// Check if entity was successfully fetched
			if (!entity) {
				throw new Error(`Entity not found or failed to fetch: ${node.entityId}`);
			}

			// Extract full data from the entity
			const fullNodeData = this.createNodeFromEntity(entity, node.type);

			// Update the node with full data
			store.markNodeAsLoaded(nodeId, {
				label: fullNodeData.label,
				externalIds: fullNodeData.externalIds,
				metadata: {
					...fullNodeData.metadata,
					isPlaceholder: false,
					isLoading: false,
				}
			});

			logger.info("graph", "Placeholder node data loaded successfully", {
				nodeId,
				newLabel: fullNodeData.label
			}, "GraphDataService");

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Failed to load node data";
			store.markNodeAsError(nodeId, errorMessage);
			logError("Failed to load placeholder node data", error, "GraphDataService", "graph");
		}
	}

	/**
   * Load data for all placeholder nodes in batches
   * This method processes placeholder nodes in the background without blocking the UI
   */
	async loadAllPlaceholderNodes(): Promise<void> {
		const store = useGraphStore.getState();
		const placeholderNodes = store.getPlaceholderNodes();

		if (placeholderNodes.length === 0) {
			logger.debug("graph", "No placeholder nodes to load", {}, "GraphDataService");
			return;
		}

		logger.info("graph", "Starting batch load of placeholder nodes", {
			placeholderCount: placeholderNodes.length
		}, "GraphDataService");

		// Process nodes in batches to avoid overwhelming the API
		const BATCH_SIZE = 3;
		const batches: GraphNode[][] = [];

		for (let i = 0; i < placeholderNodes.length; i += BATCH_SIZE) {
			batches.push(placeholderNodes.slice(i, i + BATCH_SIZE));
		}

		// Process batches sequentially with delay to respect rate limits
		for (const [batchIndex, batch] of batches.entries()) {
			logger.debug("graph", `Processing batch ${String(batchIndex + 1)}/${String(batches.length)}`, {
				batchSize: batch.length,
				nodeIds: batch.map(n => n.id)
			}, "GraphDataService");

			// Load all nodes in this batch in parallel
			const loadPromises = batch.map(node => this.loadPlaceholderNodeData(node.id));
			await Promise.allSettled(loadPromises);

			// Add delay between batches to respect rate limits (except for last batch)
			if (batchIndex < batches.length - 1) {
				await new Promise(resolve => setTimeout(resolve, 1000));
			}
		}

		logger.info("graph", "Finished loading all placeholder nodes", {
			totalProcessed: placeholderNodes.length,
			batchCount: String(batches.length)
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

			// Expand the entity
			const context = {
				entityId: node.entityId,
				entityType: node.type,
				client: rateLimitedOpenAlex
			};

			const relatedData = await entity.expand(context, options);

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

			// Layout is automatically handled by the provider when nodes/edges are added

		} catch (error) {
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
				...results.geo,
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
			searchStats.set("geo", results.geo.length);

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
   * Transform Work entity with lazy loading approach
   */
	private transformWork(work: Work, _mainNode: GraphNode): { nodes: GraphNode[]; edges: GraphEdge[] } {
		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];
		const store = useGraphStore.getState();

		// Add author nodes as placeholders (they'll be loaded on demand)
		work.authorships.slice(0, 5).forEach((authorship, index) => {
			// Check if author node already exists
			const existingNode = store.getNode(authorship.author.id);

			if (!existingNode) {
				// Create placeholder node with basic info from authorship
				const authorNode: GraphNode = {
					id: authorship.author.id,
					type: "authors" as EntityType,
					label: authorship.author.display_name,
					entityId: authorship.author.id,
					position: { x: (index - 2) * 150, y: -150 },
					externalIds: authorship.author.orcid ? [
						{
							type: "orcid",
							value: authorship.author.orcid,
							url: `https://orcid.org/${authorship.author.orcid}`,
						}
					] : [],
					metadata: {
						position: authorship.author_position,
						isPlaceholder: true, // Mark as placeholder for lazy loading
					}
				};
				nodes.push(authorNode);
			}

			edges.push({
				id: `${authorship.author.id}-authored-${work.id}`,
				source: authorship.author.id,
				target: work.id,
				type: "authored" as RelationType,
				weight: authorship.author_position === "first" ? 1.0 : 0.5,
			});
		});

		// Add source/journal node as placeholder
		if (work.primary_location?.source) {
			const existingSourceNode = store.getNode(work.primary_location.source.id);

			if (!existingSourceNode) {
				const sourceNode: GraphNode = {
					id: work.primary_location.source.id,
					type: "sources" as EntityType,
					label: work.primary_location.source.display_name,
					entityId: work.primary_location.source.id,
					position: { x: 0, y: 150 },
					externalIds: work.primary_location.source.issn_l ? [
						{
							type: "issn_l",
							value: work.primary_location.source.issn_l,
							url: `https://portal.issn.org/resource/ISSN/${work.primary_location.source.issn_l}`,
						}
					] : [],
					metadata: {
						isPlaceholder: true, // Mark as placeholder for lazy loading
					}
				};
				nodes.push(sourceNode);
			}

			edges.push({
				id: `${work.id}-published-in-${work.primary_location.source.id}`,
				source: work.id,
				target: work.primary_location.source.id,
				type: "published_in" as RelationType,
			});
		}

		// Add referenced works as placeholders - they'll be loaded on demand
		work.referenced_works.slice(0, 3).forEach((citedWorkId, index) => {
			const existingCitedNode = store.getNode(citedWorkId);

			if (!existingCitedNode) {
				// Create minimal placeholder - label will be updated when data is loaded
				const citedNode: GraphNode = {
					id: citedWorkId,
					type: "works" as EntityType,
					label: `Referenced Work ${String(index + 1)}`,
					entityId: citedWorkId,
					position: { x: (index - 1) * 200, y: 300 },
					externalIds: [],
					metadata: { isPlaceholder: true },
				};
				nodes.push(citedNode);
			}

			edges.push({
				id: `${work.id}-cites-${citedWorkId}`,
				source: work.id,
				target: citedWorkId,
				type: "cited" as RelationType,
			});
		});

		return { nodes, edges };
	}

	/**
   * Transform Author entity with lazy loading approach
   */
	private transformAuthor(author: Author, _mainNode: GraphNode): { nodes: GraphNode[]; edges: GraphEdge[] } {
		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];
		const store = useGraphStore.getState();

		// Add affiliated institutions as placeholders
		author.affiliations.slice(0, 3).forEach((affiliation, index) => {
			const existingInstitutionNode = store.getNode(affiliation.institution.id);

			if (!existingInstitutionNode) {
				const institutionNode: GraphNode = {
					id: affiliation.institution.id,
					type: "institutions" as EntityType,
					label: affiliation.institution.display_name,
					entityId: affiliation.institution.id,
					position: { x: (index - 1) * 200, y: 150 },
					externalIds: affiliation.institution.ror ? [
						{
							type: "ror",
							value: affiliation.institution.ror,
							url: `https://ror.org/${affiliation.institution.ror}`,
						}
					] : [],
					metadata: {
						isPlaceholder: true, // Mark as placeholder for lazy loading
					}
				};
				nodes.push(institutionNode);
			}

			edges.push({
				id: `${author.id}-affiliated-${affiliation.institution.id}`,
				source: author.id,
				target: affiliation.institution.id,
				type: "affiliated" as RelationType,
			});
		});

		return { nodes, edges };
	}

	/**
   * Transform Source entity (basic implementation)
   */
	private transformSource(source: Source, _mainNode: GraphNode): { nodes: GraphNode[]; edges: GraphEdge[] } {
		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];

		// Add publisher if available
		if (source.publisher) {
			const publisherNode: GraphNode = {
				id: source.publisher,
				type: "publishers" as EntityType,
				label: source.publisher || "Publisher",
				entityId: source.publisher,
				position: { x: 0, y: 150 },
				externalIds: [],
			};
			nodes.push(publisherNode);

			edges.push({
				id: `${source.id}-published-by-${source.publisher}`,
				source: source.id,
				target: source.publisher,
				type: "published_in" as RelationType,
			});
		}

		return { nodes, edges };
	}

	/**
   * Transform Institution entity (basic implementation)
   */
	private transformInstitution(institution: InstitutionEntity, _mainNode: GraphNode): { nodes: GraphNode[]; edges: GraphEdge[] } {
		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];

		// Add parent institutions from lineage
		institution.lineage?.slice(0, 2).forEach((parentId, index) => {
			if (parentId !== institution.id) {
				const parentNode: GraphNode = {
					id: parentId,
					type: "institutions" as EntityType,
					label: ["Parent Institution", 1 + index].join(" "),
					entityId: parentId,
					position: { x: (index - 0.5) * 200, y: -150 },
					externalIds: [],
					metadata: { isPlaceholder: true },
				};
				nodes.push(parentNode);

				edges.push({
					id: `${institution.id}-part-of-${parentId}`,
					source: institution.id,
					target: parentId,
					type: "affiliated" as RelationType,
				});
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
			metadata: this.extractMetadata(entity, entityType),
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
   * Extract metadata from entity for display
   */
	private extractMetadata(entity: OpenAlexEntity, entityType: EntityType): Record<string, unknown> {
		const metadata: Record<string, unknown> = {};

		switch (entityType) {
			case "works": {
				const work = entity as Work;
				metadata.publication_year = work.publication_year;
				metadata.cited_by_count = work.cited_by_count;
				metadata.referenced_works_count = work.referenced_works_count;
				metadata.open_access = work.open_access.is_oa;
				break;
			}

			case "authors": {
				const author = entity as Author;
				metadata.works_count = author.works_count;
				metadata.cited_by_count = author.cited_by_count;
				break;
			}

			case "sources": {
				const source = entity as Source;
				metadata.works_count = source.works_count;
				metadata.type = source.type;
				break;
			}

			case "institutions": {
				const institution = entity as InstitutionEntity;
				metadata.works_count = institution.works_count;
				metadata.country_code = institution.country_code;
				metadata.type = institution.type;
				break;
			}
		}

		return metadata;
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
