/**
 * Graph data service for integrating OpenAlex API with graph visualization
 * Handles data transformation, caching, and progressive loading
 */

import { rateLimitedOpenAlex } from "@/lib/openalex/rate-limited-client";
import { EntityDetector } from "@/lib/graph/utils/entity-detection";
import { EntityFactory, type ExpansionOptions } from "@/lib/entities";
import { useGraphStore } from "@/stores/graph-store";
import { logError, logger } from "@/lib/logger";
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

	constructor() {
		this.detector = new EntityDetector();
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

			// Transform to graph data
			const { nodes, edges } = this.transformEntityToGraph(entity);

			// Clear existing graph and expansion cache
			store.clear();
			this.cache.expandedNodes.clear();
			this.cache.fetchedRelationships.clear();

			// Add new data
			store.addNodes(nodes);
			store.addEdges(edges);

			// Get the primary node ID for expansion
			const primaryNodeId = nodes[0]?.id;

			if (primaryNodeId) {
				// Automatically load related entities for full context
				await this.expandNode(primaryNodeId, {
					limit: 15, // Full expansion for rich graph experience
					depth: 1   // Only direct relations
				});
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
   * Expand a node to show related entities
   */
	async expandNode(nodeId: string, options: ExpansionOptions = {}): Promise<void> {
		const { force = false } = options;

		// Check if already expanded (unless forced)
		if (!force && this.cache.expandedNodes.has(nodeId)) {
			return;
		}

		const store = useGraphStore.getState();

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

			// Mark as expanded
			this.cache.expandedNodes.add(nodeId);

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

			const { nodes, edges } = this.transformSearchResults(flatResults);

			// Clear existing graph and add search results
			store.clear();
			store.addNodes(nodes);
			store.addEdges(edges);

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
   * Transform Work entity
   */
	private transformWork(work: Work, _mainNode: GraphNode): { nodes: GraphNode[]; edges: GraphEdge[] } {
		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];

		// Add author nodes and authorship edges
		work.authorships?.slice(0, 5).forEach((authorship, index) => {
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
				}
			};
			nodes.push(authorNode);

			edges.push({
				id: `${authorship.author.id}-authored-${work.id}`,
				source: authorship.author.id,
				target: work.id,
				type: "authored" as RelationType,
				weight: authorship.author_position === "first" ? 1.0 : 0.5,
			});
		});

		// Add source/journal node
		if (work.primary_location?.source) {
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
			};
			nodes.push(sourceNode);

			edges.push({
				id: `${work.id}-published-in-${work.primary_location.source.id}`,
				source: work.id,
				target: work.primary_location.source.id,
				type: "published_in" as RelationType,
			});
		}

		// Add a few cited works (if available)
		work.referenced_works?.slice(0, 3).forEach((citedWorkId, index) => {
			// Create placeholder nodes for cited works (would need separate API calls to get full data)
			const citedNode: GraphNode = {
				id: citedWorkId,
				type: "works" as EntityType,
				label: ["Referenced Work", 1 + index].join(" "),
				entityId: citedWorkId,
				position: { x: (index - 1) * 200, y: 300 },
				externalIds: [],
				metadata: { isPlaceholder: true },
			};
			nodes.push(citedNode);

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
   * Transform Author entity (basic implementation)
   */
	private transformAuthor(author: Author, _mainNode: GraphNode): { nodes: GraphNode[]; edges: GraphEdge[] } {
		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];

		// Add affiliated institutions
		author.affiliations?.slice(0, 3).forEach((affiliation, index) => {
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
			};
			nodes.push(institutionNode);

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
				metadata.year = work.publication_year;
				metadata.citationCount = work.cited_by_count;
				metadata.openAccess = work.open_access?.is_oa;
				break;
			}

			case "authors": {
				const author = entity as Author;
				metadata.worksCount = author.works_count;
				metadata.citationCount = author.cited_by_count;
				break;
			}

			case "sources": {
				const source = entity as Source;
				metadata.worksCount = source.works_count;
				metadata.type = source.type;
				break;
			}

			case "institutions": {
				const institution = entity as InstitutionEntity;
				metadata.worksCount = institution.works_count;
				metadata.country = institution.country_code;
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
			const entityType = detection.entityType as EntityType;

			if (entityType) {
				const node = this.createNodeFromEntity(entity, entityType);
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
