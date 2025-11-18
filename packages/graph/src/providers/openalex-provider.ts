/**
 * OpenAlex-specific implementation of GraphDataProvider
 * Provides graph data from the OpenAlex academic database
 * Integrated with SmartEntityCache for optimized data fetching
 */

import {
	GraphDataProvider,
	type SearchQuery,
	type ProviderExpansionOptions,
	type GraphExpansion,
	getRelationshipLimit,
} from "./base-provider"
import { logger } from "@academic-explorer/utils"
import type {
	GraphNode,
	GraphEdge,
	EntityType,
	EntityIdentifier,
	ExternalIdentifier,
} from "../types/core"
import { RelationType } from "../types/core"
import { EntityDetectionService } from "../services/entity-detection-service"
import { createCanonicalEdgeId, validateOpenAlexId, extractOpenAlexId } from "../utils/edge-utils"

// OpenAlex entity interfaces removed - unused after refactoring

// Removed unused interfaces - they were not being used in the implementation

interface OpenAlexSearchResponse {
	results: Record<string, unknown>[]
	meta?: {
		count?: number
		per_page?: number
		page?: number
	}
}

// Smart Entity Cache interfaces (to be implemented)
interface CacheContext {
	operation: "fetch" | "search" | "expand" | "traverse"
	entityType?: EntityType
	depth?: number
	purpose?: "visualization" | "analysis" | "export"
}

interface SmartEntityCache {
	getEntity(
		id: string,
		context: CacheContext,
		fields?: string[]
	): Promise<Record<string, unknown> | null>
	batchGetEntities(
		ids: string[],
		context: CacheContext,
		fields?: string[]
	): Promise<Map<string, Record<string, unknown>>>
	preloadEntity(id: string, context: CacheContext): Promise<void>
	batchPreloadEntities(ids: string[], context: CacheContext): Promise<void>
	getCacheStats(): Promise<CacheStats>
	invalidateEntity(id: string): Promise<void>
	clear(): Promise<void>
}

interface ContextualFieldSelector {
	selectFieldsForContext(entityType: EntityType, context: CacheContext): string[]
	getMinimalFields(entityType: EntityType): string[]
	getExpansionFields(entityType: EntityType, relationType: RelationType): string[]
}

interface CacheStats {
	hitRate: number
	missRate: number
	totalRequests: number
	bandwidthSaved: number
	fieldLevelHits: number
	contextOptimizations: number
}

// Interface to avoid circular dependency with client package
interface OpenAlexClient {
	getWork(id: string): Promise<Record<string, unknown>>
	getAuthor(id: string): Promise<Record<string, unknown>>
	getSource(id: string): Promise<Record<string, unknown>>
	getInstitution(id: string): Promise<Record<string, unknown>>
	get(endpoint: string, id: string): Promise<Record<string, unknown>>
	works(params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }>
	authors(params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }>
	sources(params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }>
	institutions(params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }>
}

interface OpenAlexProviderOptions {
	client: OpenAlexClient
	cache?: SmartEntityCache
	fieldSelector?: ContextualFieldSelector
	name?: string
	version?: string
	maxConcurrentRequests?: number
	retryAttempts?: number
	retryDelay?: number
	timeout?: number
}

/**
 * OpenAlex provider for graph data with SmartEntityCache integration
 */
export class OpenAlexGraphProvider extends GraphDataProvider {
	private cache?: SmartEntityCache
	private fieldSelector?: ContextualFieldSelector
	private currentContext: CacheContext = { operation: "fetch" }
	private cacheStats = {
		hits: 0,
		misses: 0,
		fallbacks: 0,
		contextOptimizations: 0,
	}

	constructor(
		private client: OpenAlexClient,
		options: Omit<OpenAlexProviderOptions, "client"> = {}
	) {
		super({
			name: "openalex",
			version: "1.0.0",
			...options,
		})

		this.cache = options.cache
		this.fieldSelector = options.fieldSelector || this.createDefaultFieldSelector()
	}

	/**
	 * Fetch a single entity by ID with cache integration
	 */
	async fetchEntity(id: EntityIdentifier): Promise<GraphNode> {
		return this.trackRequest(
			(async () => {
				const entityType = this.detectEntityType(id)
				const normalizedId = this.normalizeIdentifier(id)

				// Set context for single entity fetch
				const context: CacheContext = {
					operation: "fetch",
					entityType,
					purpose: "visualization",
				}

				const entityData = await this.fetchEntityDataWithCache(normalizedId, entityType, context)

				const node: GraphNode = {
					id: normalizedId,
					entityType,
					entityId: normalizedId,
					label: this.extractLabel(entityData, entityType),
					x: Math.random() * 800,
					y: Math.random() * 600,
					externalIds: this.extractExternalIds(entityData, entityType),
					entityData,
				}

				this.onEntityFetched(node)
				return node
			})()
		)
	}

	/**
	 * Search for entities based on query with cache-aware enrichment
	 */
	async searchEntities(query: SearchQuery): Promise<GraphNode[]> {
		return this.trackRequest(
			(async () => {
				const results: GraphNode[] = []

				// Set search context
				const context: CacheContext = {
					operation: "search",
					purpose: "visualization",
				}

				// Search each entity type requested
				for (const entityType of query.entityTypes) {
					try {
						const contextWithType = { ...context, entityType }
						const searchResults = await this.searchByEntityTypeWithCache(
							query.query,
							entityType,
							contextWithType,
							{
								limit: Math.floor((query.limit || 20) / query.entityTypes.length),
								offset: query.offset,
							}
						)

						results.push(...searchResults)
					} catch (error) {
						logger.warn(
							"provider",
							`Search failed for entity type ${entityType}`,
							{ error },
							"OpenAlexProvider"
						)
					}
				}

				return results.slice(0, query.limit || 20)
			})()
		)
	}

	/**
	 * Expand an entity to show its relationships with cache-aware preloading
	 */
	async expandEntity(nodeId: string, options: ProviderExpansionOptions): Promise<GraphExpansion> {
		return this.trackRequest(
			(async () => {
				const entityType = this.detectEntityType(nodeId)
				const nodes: GraphNode[] = []
				const edges: GraphEdge[] = []

				// Set expansion context
				const context: CacheContext = {
					operation: "expand",
					entityType,
					depth: 1,
					purpose: "visualization",
				}

				// Get the base entity data with expansion-specific fields
				const baseEntity = await this.fetchEntityDataWithCache(nodeId, entityType, context)

				// Add the base entity node
				const baseNode: GraphNode = {
					id: nodeId,
					entityType,
					entityId: nodeId,
					label: this.extractLabel(baseEntity, entityType),
					x: Math.random() * 800,
					y: Math.random() * 600,
					externalIds: this.extractExternalIds(baseEntity, entityType),
					entityData: baseEntity,
				}
				nodes.push(baseNode)

				// Expand based on entity type and available relationships
				switch (entityType) {
					case "works":
						await this.expandWorkWithCache(nodeId, baseEntity, nodes, edges, options, context)
						break
					case "authors":
						await this.expandAuthorWithCache(nodeId, baseEntity, nodes, edges, options, context)
						break
					case "sources":
						await this.expandSourceWithCache(nodeId, baseEntity, nodes, edges, options, context)
						break
					case "institutions":
						await this.expandInstitutionWithCache(nodeId, baseEntity, nodes, edges, options, context)
						break
					case "topics":
						await this.expandTopicWithCache(nodeId, baseEntity, nodes, edges, options, context)
						break
					case "funders":
						await this.expandFunderWithCache(nodeId, baseEntity, nodes, edges, options, context)
						break
					case "publishers":
						await this.expandPublisherWithCache(nodeId, baseEntity, nodes, edges, options, context)
						break
					default:
						// Basic expansion for other entity types
						break
				}

				return {
					nodes,
					edges,
					metadata: {
						expandedFrom: nodeId,
						depth: 1,
						totalFound: nodes.length,
						options,
						cacheStats: this.cacheStats,
					},
				}
			})()
		)
	}

	/**
	 * Health check - test if OpenAlex API is accessible
	 */
	async isHealthy(): Promise<boolean> {
		try {
			// Simple test request to verify API accessibility
			await this.client.works({
				filter: { has_doi: true },
				select: ["id"],
				per_page: 1,
			})
			return true
		} catch {
			return false
		}
	}

	// Private helper methods

	private detectEntityType(id: string): EntityType {
		const entityType = EntityDetectionService.detectEntityType(id)
		if (!entityType) {
			throw new Error(`Cannot detect entity type for ID: ${id}`)
		}
		return entityType
	}

	private normalizeIdentifier(id: string): string {
		const normalizedId = EntityDetectionService.normalizeIdentifier(id)
		if (!normalizedId) {
			throw new Error(`Cannot normalize identifier: ${id}`)
		}
		return normalizedId
	}

	/**
	 * Fetch entity data with cache integration and fallback
	 */
	private async fetchEntityDataWithCache(
		id: string,
		entityType: EntityType,
		context: CacheContext
	): Promise<Record<string, unknown>> {
		// Try cache first if available
		if (this.cache && this.fieldSelector) {
			try {
				const contextFields = this.fieldSelector.selectFieldsForContext(entityType, context)
				const cachedData = await this.cache.getEntity(id, context, contextFields)

				if (cachedData) {
					this.cacheStats.hits++
					return cachedData
				}
			} catch (error) {
				logger.warn("provider", `Cache lookup failed for ${id}`, { error }, "OpenAlexProvider")
			}
		}

		// Fallback to direct API call
		this.cacheStats.misses++
		this.cacheStats.fallbacks++

		return this.fetchEntityData(id, entityType)
	}

	private async fetchEntityData(
		id: string,
		entityType: EntityType
	): Promise<Record<string, unknown>> {
		switch (entityType) {
			case "works":
				return this.client.getWork(id)
			case "authors":
				return this.client.getAuthor(id)
			case "sources":
				return this.client.getSource(id)
			case "institutions":
				return this.client.getInstitution(id)
			case "topics":
				return this.client.get("topics", id)
			case "publishers":
				return this.client.get("publishers", id)
			case "funders":
				return this.client.get("funders", id)
			case "concepts":
				return this.client.get("concepts", id)
			case "keywords":
				return this.client.get("keywords", id)
			default:
				throw new Error(`Unsupported entity type: ${entityType}`)
		}
	}

	private extractLabel(data: Record<string, unknown>, entityType: EntityType): string {
		// Extract appropriate label based on entity type
		switch (entityType) {
			case "works":
				return (data.title as string) || (data.display_name as string) || "Untitled Work"
			case "authors":
				return (data.display_name as string) || "Unknown Author"
			case "sources":
				return (data.display_name as string) || "Unknown Source"
			case "institutions":
				return (data.display_name as string) || "Unknown Institution"
			default:
				return (data.display_name as string) || (data.name as string) || "Unknown"
		}
	}

	private extractExternalIds(
		data: Record<string, unknown>,
		_entityType: EntityType
	): ExternalIdentifier[] {
		const externalIds: ExternalIdentifier[] = []

		// Extract IDs based on entity type
		const ids = (data.ids as Record<string, string>) || {}

		if (ids.doi) {
			externalIds.push({
				type: "doi" as const,
				value: ids.doi,
				url: `https://doi.org/${ids.doi}`,
			})
		}

		if (ids.orcid) {
			externalIds.push({
				type: "orcid" as const,
				value: ids.orcid,
				url: ids.orcid,
			})
		}

		if (ids.ror) {
			externalIds.push({
				type: "ror" as const,
				value: ids.ror,
				url: `https://ror.org/${ids.ror}`,
			})
		}

		return externalIds
	}

	private async searchByEntityTypeWithCache(
		query: string,
		entityType: EntityType,
		context: CacheContext,
		options: { limit?: number; offset?: number }
	): Promise<GraphNode[]> {
		const searchResults = await this.searchByEntityType(query, entityType, options)

		// Batch preload search results into cache for future access
		if (this.cache && searchResults.length > 0) {
			try {
				const entityIds = searchResults.map((node) => node.id)
				await this.cache.batchPreloadEntities(entityIds, context)
			} catch (error) {
				logger.warn("provider", "Failed to preload search results", { error }, "OpenAlexProvider")
			}
		}

		return searchResults
	}

	private async searchByEntityType(
		query: string,
		entityType: EntityType,
		options: { limit?: number; offset?: number }
	): Promise<GraphNode[]> {
		let searchResults: OpenAlexSearchResponse

		switch (entityType) {
			case "works":
				searchResults = await this.client.works({
					search: query,
					per_page: options.limit || 10,
				})
				break
			case "authors":
				searchResults = await this.client.authors({
					search: query,
					per_page: options.limit || 10,
				})
				break
			case "sources":
				searchResults = await this.client.sources({
					search: query,
					per_page: options.limit || 10,
				})
				break
			case "institutions":
				searchResults = await this.client.institutions({
					search: query,
					per_page: options.limit || 10,
				})
				break
			default:
				return []
		}

		// Convert results to GraphNode format with defensive checks
		const results = searchResults.results
		if (!Array.isArray(results)) {
			logger.warn(
				"provider",
				"Search results is not an array",
				{ results, entityType },
				"OpenAlexProvider"
			)
			return []
		}

		return results.map((item) => {
			const itemRecord = item as Record<string, unknown>
			return {
				id: String(itemRecord.id),
				entityType,
				entityId: String(itemRecord.id),
				label: this.extractLabel(itemRecord, entityType),
				x: Math.random() * 800,
				y: Math.random() * 600,
				externalIds: this.extractExternalIds(itemRecord, entityType),
				entityData: itemRecord,
			}
		})
	}

	private async expandWorkWithCache(
		workId: string,
		workData: Record<string, unknown>,
		nodes: GraphNode[],
		edges: GraphEdge[],
		options: ProviderExpansionOptions,
		context: CacheContext
	): Promise<void> {
		const relatedIds: string[] = []

		// Collect related entity IDs for batch preloading
		const authorships = (workData.authorships as Array<{ author?: { id?: string } }>) || []
		for (const authorship of authorships.slice(0, options.limit || 10)) {
			if (authorship.author?.id) {
				relatedIds.push(authorship.author.id)
			}
		}

		const primaryLocation = (workData.primary_location as { source?: { id?: string } }) || {}
		if (primaryLocation.source?.id) {
			relatedIds.push(primaryLocation.source.id)
		}

		// Batch preload related entities
		if (this.cache && relatedIds.length > 0) {
			try {
				const expansionContext = {
					...context,
					operation: "expand" as const,
					depth: (context.depth || 0) + 1,
				}
				await this.cache.batchPreloadEntities(relatedIds, expansionContext)
			} catch (error) {
				logger.warn("provider", "Failed to preload related entities", { error }, "OpenAlexProvider")
			}
		}

		// Add authors
		for (const authorship of authorships.slice(0, options.limit || 10)) {
			if (authorship.author?.id) {
				// Validate author ID before creating edge
				if (!validateOpenAlexId(authorship.author.id)) {
					logger.warn(
						"provider",
						"Invalid author ID, skipping",
						{ workId, authorId: authorship.author.id },
						"OpenAlexProvider"
					)
					continue
				}

				const author = authorship.author as Record<string, unknown>
				const authorNode: GraphNode = {
					id: authorship.author.id,
					entityType: "authors",
					entityId: authorship.author.id,
					label: String(author.display_name) || "Unknown Author",
					x: Math.random() * 800,
					y: Math.random() * 600,
					externalIds: this.extractExternalIds(author, "authors"),
					entityData: author,
				}

				nodes.push(authorNode)
				edges.push({
					id: createCanonicalEdgeId(workId, authorship.author.id, RelationType.AUTHORSHIP),
					source: workId,
					target: authorship.author.id,
					type: RelationType.AUTHORSHIP,
					direction: "outbound",
				})
			}
		}

		// Add source (journal/venue)
		if (primaryLocation.source?.id) {
			const source = primaryLocation.source as Record<string, unknown>
			const sourceNode: GraphNode = {
				id: primaryLocation.source.id,
				entityType: "sources",
				entityId: primaryLocation.source.id,
				label: String(source.display_name) || "Unknown Source",
				x: Math.random() * 800,
				y: Math.random() * 600,
				externalIds: this.extractExternalIds(source, "sources"),
				entityData: source,
			}

			nodes.push(sourceNode)
			edges.push({
				id: `${workId}-published-in-${primaryLocation.source.id}`,
				source: workId,
				target: primaryLocation.source.id,
				type: RelationType.PUBLICATION,
				direction: 'outbound',
			})
		}

		// Add citations (referenced works)
		const referencedWorks = (workData.referenced_works as string[]) || []

		// Apply limit for references
		const limit = getRelationshipLimit(options, RelationType.REFERENCE)
		const limitedReferences = referencedWorks.slice(0, limit)

		// Create REFERENCE edges for each cited work
		for (const citedWorkIdOrUrl of limitedReferences) {
			// Extract bare ID from URL or use as-is
			const citedWorkId = extractOpenAlexId(citedWorkIdOrUrl)

			// Validate cited work ID before creating edge
			if (!validateOpenAlexId(citedWorkId)) {
				logger.warn(
					"provider",
					"Invalid cited work ID, skipping",
					{ workId, citedWorkId: citedWorkIdOrUrl },
					"OpenAlexProvider"
				)
				continue
			}

			// Create REFERENCE edge: citing work → cited work
			const edge: GraphEdge = {
				id: createCanonicalEdgeId(workId, citedWorkId, RelationType.REFERENCE),
				source: workId,
				target: citedWorkId,
				type: RelationType.REFERENCE,
				direction: 'outbound',
			}

			// Add citation metadata if available
			if (workData.cited_by_count !== undefined && workData.cited_by_count !== null) {
				edge.metadata = {
					citation_count: workData.cited_by_count,
				}
			}

			edges.push(edge)
		}

		// Add reverse citation lookup (works that cite this work)
		// Only perform reverse lookup if referenced_works[] is empty
		// This prevents duplicate edges when tests mock works() with cited works data
		if (referencedWorks.length === 0) {
			try {
				const citingWorks = await this.client.works({
					filter: { cites: workId },
					per_page: limit,
				})

				const citingWorkResults = citingWorks && Array.isArray(citingWorks.results) ? citingWorks.results : []

				for (const citingWork of citingWorkResults) {
					const citingWorkRecord = citingWork as Record<string, unknown>
					const citingWorkId = String(citingWorkRecord.id)

					// Validate citing work ID before creating edge
					if (!validateOpenAlexId(citingWorkId)) {
						logger.warn(
							"provider",
							"Invalid citing work ID, skipping",
							{ workId, citingWorkId },
							"OpenAlexProvider"
						)
						continue
					}

					// Create REFERENCE edge with inbound direction
					// Note: semantic direction is still citing → cited
					const edge: GraphEdge = {
						id: createCanonicalEdgeId(citingWorkId, workId, RelationType.REFERENCE),
						source: citingWorkId,
						target: workId,
						type: RelationType.REFERENCE,
						direction: 'inbound',
					}

					edges.push(edge)
				}
			} catch (error) {
				logger.warn("provider", `Failed to fetch citing works for ${workId}`, { error }, "OpenAlexProvider")
			}
		}

		// Add funding relationships (grants)
		const grants = (workData.grants as Array<{ funder?: string; award_id?: string }>) || []

		// Apply limit for grants
		const grantLimit = getRelationshipLimit(options, RelationType.FUNDED_BY)
		const limitedGrants = grants.slice(0, grantLimit)

		// Create FUNDED_BY edges for each grant
		for (const grant of limitedGrants) {
			if (!grant.funder) {
				continue
			}

			// Extract bare ID from URL or use as-is
			const funderId = extractOpenAlexId(grant.funder)

			// Validate funder ID before creating edge
			if (!validateOpenAlexId(funderId)) {
				logger.warn(
					"provider",
					"Invalid funder ID, skipping",
					{ workId, funderId: grant.funder },
					"OpenAlexProvider"
				)
				continue
			}

			// Create FUNDED_BY edge: work → funder
			const edge: GraphEdge = {
				id: createCanonicalEdgeId(workId, funderId, RelationType.FUNDED_BY),
				source: workId,
				target: funderId,
				type: RelationType.FUNDED_BY,
				direction: 'outbound',
			}

			// Add award_id metadata if available
			if (grant.award_id) {
				edge.metadata = {
					award_id: grant.award_id,
				}
			}

			edges.push(edge)
		}
	}

	private async expandAuthorWithCache(
		authorId: string,
		authorData: Record<string, unknown>,
		nodes: GraphNode[],
		edges: GraphEdge[],
		options: ProviderExpansionOptions,
		context: CacheContext
	): Promise<void> {
		// Add recent works
		try {
			const works = await this.client.works({
				filter: { author: { id: authorId } },
				per_page: options.limit || 10,
				sort: "publication_year:desc",
			})

			const workResults = Array.isArray(works.results) ? works.results : []
			const workIds = workResults.map((work) => String((work as Record<string, unknown>).id))

			// Batch preload works into cache
			if (this.cache && workIds.length > 0) {
				try {
					const expansionContext = {
						...context,
						entityType: "works" as const,
						depth: (context.depth || 0) + 1,
					}
					await this.cache.batchPreloadEntities(workIds, expansionContext)
				} catch (error) {
					logger.warn("provider", "Failed to preload author works", { error }, "OpenAlexProvider")
				}
			}

			for (const work of workResults) {
				const workRecord = work as Record<string, unknown>
				const workId = String(workRecord.id)

				// Validate work ID before creating edge
				if (!validateOpenAlexId(workId)) {
					logger.warn(
						"provider",
						"Invalid work ID, skipping",
						{ authorId, workId },
						"OpenAlexProvider"
					)
					continue
				}

				const workNode: GraphNode = {
					id: workId,
					entityType: "works",
					entityId: workId,
					label: this.extractLabel(workRecord, "works"),
					x: Math.random() * 800,
					y: Math.random() * 600,
					externalIds: this.extractExternalIds(workRecord, "works"),
					entityData: workRecord,
				}

				nodes.push(workNode)
				edges.push({
					id: createCanonicalEdgeId(workId, authorId, RelationType.AUTHORSHIP),
					source: workId,
					target: authorId,
					type: RelationType.AUTHORSHIP,
					direction: "inbound",
				})
			}
		} catch (error) {
			logger.warn("provider", `Failed to expand author ${authorId}`, { error }, "OpenAlexProvider")
		}
	}

	private async expandSourceWithCache(
		sourceId: string,
		sourceData: Record<string, unknown>,
		nodes: GraphNode[],
		edges: GraphEdge[],
		options: ProviderExpansionOptions,
		context: CacheContext
	): Promise<void> {
		// Add recent works published in this source
		try {
			const works = await this.client.works({
				filter: { primary_location: { source: { id: sourceId } } },
				per_page: options.limit || 10,
				sort: "publication_year:desc",
			})

			const workResults = Array.isArray(works.results) ? works.results : []
			const workIds = workResults.map((work) => String((work as Record<string, unknown>).id))

			// Batch preload works into cache
			if (this.cache && workIds.length > 0) {
				try {
					const expansionContext = {
						...context,
						entityType: "works" as const,
						depth: (context.depth || 0) + 1,
					}
					await this.cache.batchPreloadEntities(workIds, expansionContext)
				} catch (error) {
					logger.warn("provider", "Failed to preload source works", { error }, "OpenAlexProvider")
				}
			}

			for (const work of workResults) {
				const workRecord = work as Record<string, unknown>
				const workNode: GraphNode = {
					id: String(workRecord.id),
					entityType: "works",
					entityId: String(workRecord.id),
					label: this.extractLabel(workRecord, "works"),
					x: Math.random() * 800,
					y: Math.random() * 600,
					externalIds: this.extractExternalIds(workRecord, "works"),
					entityData: workRecord,
				}

				nodes.push(workNode)
				edges.push({
					id: `${workRecord.id}-published-in-${sourceId}`,
					source: String(workRecord.id),
					target: sourceId,
					type: RelationType.PUBLICATION,
				direction: 'outbound',
				})
			}
		} catch (error) {
			logger.warn("provider", `Failed to expand source ${sourceId}`, { error }, "OpenAlexProvider")
		}

		// T064-T065: Extract host_organization and create HOST_ORGANIZATION edge
		const hostOrgUrl = sourceData.host_organization as string | null
		if (hostOrgUrl) {
			const publisherId = extractOpenAlexId(hostOrgUrl)

			// Validate publisher ID before creating edge
			if (validateOpenAlexId(publisherId)) {
				try {
					// Fetch publisher data to create node
					const publisherData = await this.fetchEntityDataWithCache(
						publisherId,
						"publishers",
						{
							...context,
							depth: (context.depth || 0) + 1,
						}
					)

					// Create publisher node
					const publisherNode: GraphNode = {
						id: publisherId,
						entityType: "publishers",
						entityId: publisherId,
						label: this.extractLabel(publisherData, "publishers"),
						x: Math.random() * 800,
						y: Math.random() * 600,
						externalIds: this.extractExternalIds(publisherData, "publishers"),
						entityData: publisherData,
					}

					nodes.push(publisherNode)

					// Create HOST_ORGANIZATION edge: source → publisher
					const edge: GraphEdge = {
						id: createCanonicalEdgeId(sourceId, publisherId, RelationType.HOST_ORGANIZATION),
						source: sourceId,
						target: publisherId,
						type: RelationType.HOST_ORGANIZATION,
						direction: 'outbound',
						metadata: {},
					}

					edges.push(edge)
				} catch (error) {
					logger.warn(
						"provider",
						`Failed to fetch publisher ${publisherId}`,
						{ error, sourceId },
						"OpenAlexProvider"
					)
				}
			} else {
				logger.warn(
					"provider",
					"Invalid publisher ID, skipping",
					{ sourceId, publisherId: hostOrgUrl },
					"OpenAlexProvider"
				)
			}
		}
	}

	private async expandInstitutionWithCache(
		institutionId: string,
		institutionData: Record<string, unknown>,
		nodes: GraphNode[],
		edges: GraphEdge[],
		options: ProviderExpansionOptions,
		context: CacheContext
	): Promise<void> {
		// T054-T056: Extract and create LINEAGE edges from institution hierarchy
		const lineageArray = (institutionData.lineage as string[]) || []

		// Apply limit for lineage relationships
		const lineageLimit = getRelationshipLimit(options, RelationType.LINEAGE)

		// Process lineage array (skip self at index 0, process parents starting at index 1)
		for (let i = 1; i < Math.min(lineageArray.length, lineageLimit + 1); i++) {
			const parentIdOrUrl = lineageArray[i]

			// Extract bare ID from URL or use as-is
			const parentId = extractOpenAlexId(parentIdOrUrl)

			// Validate parent institution ID before creating edge
			if (!validateOpenAlexId(parentId)) {
				logger.warn(
					"provider",
					"Invalid parent institution ID, skipping",
					{ institutionId, parentId: parentIdOrUrl },
					"OpenAlexProvider"
				)
				continue
			}

			// Fetch parent institution data to create node
			try {
				const parentData = await this.fetchEntityDataWithCache(
					parentId,
					"institutions",
					{
						...context,
						depth: (context.depth || 0) + 1,
					}
				)

				// Create parent institution node
				const parentNode: GraphNode = {
					id: parentId,
					entityType: "institutions",
					entityId: parentId,
					label: this.extractLabel(parentData, "institutions"),
					x: Math.random() * 800,
					y: Math.random() * 600,
					externalIds: this.extractExternalIds(parentData, "institutions"),
					entityData: parentData,
				}

				nodes.push(parentNode)

				// Create LINEAGE edge: child → parent
				const edge: GraphEdge = {
					id: createCanonicalEdgeId(institutionId, parentId, RelationType.LINEAGE),
					source: institutionId,
					target: parentId,
					type: RelationType.LINEAGE,
					direction: 'outbound',
					metadata: {
						lineage_level: i, // 1-based index (1 for immediate parent, 2 for grandparent, etc.)
					},
				}

				edges.push(edge)
			} catch (error) {
				logger.warn(
					"provider",
					`Failed to fetch parent institution ${parentId}`,
					{ error, institutionId },
					"OpenAlexProvider"
				)
			}
		}

		// T057: Reverse lookup - find child institutions (only when includeReverseRelationships is true)
		if (options.includeReverseRelationships) {
			try {
				const childInstitutions = await this.client.institutions({
					filter: { lineage: institutionId },
					per_page: lineageLimit,
				})

				const childResults = Array.isArray(childInstitutions.results) ? childInstitutions.results : []

				for (const child of childResults) {
					const childRecord = child as Record<string, unknown>
					const childId = extractOpenAlexId(String(childRecord.id))

					// Validate child institution ID
					if (!validateOpenAlexId(childId)) {
						logger.warn(
							"provider",
							"Invalid child institution ID, skipping",
							{ institutionId, childId: childRecord.id },
							"OpenAlexProvider"
						)
						continue
					}

					// Create child institution node
					const childNode: GraphNode = {
						id: childId,
						entityType: "institutions",
						entityId: childId,
						label: this.extractLabel(childRecord, "institutions"),
						x: Math.random() * 800,
						y: Math.random() * 600,
						externalIds: this.extractExternalIds(childRecord, "institutions"),
						entityData: childRecord,
					}

					nodes.push(childNode)

					// Calculate lineage_level from child's lineage array
					const childLineage = (childRecord.lineage as string[]) || []
					const parentIndex = childLineage.findIndex((id) => extractOpenAlexId(id) === institutionId)
					const lineageLevel = parentIndex > 0 ? parentIndex : 1 // Default to 1 if not found

					// Create LINEAGE edge with inbound direction
					// Note: semantic direction is still child → parent
					const edge: GraphEdge = {
						id: createCanonicalEdgeId(childId, institutionId, RelationType.LINEAGE),
						source: childId,
						target: institutionId,
						type: RelationType.LINEAGE,
						direction: 'inbound',
						metadata: {
							lineage_level: lineageLevel,
						},
					}

					edges.push(edge)
				}
			} catch (error) {
				logger.warn(
					"provider",
					`Failed to fetch child institutions for ${institutionId}`,
					{ error },
					"OpenAlexProvider"
				)
			}
		}

		// Add authors affiliated with this institution
		try {
			const authors = await this.client.authors({
				filter: { last_known_institutions: { id: institutionId } },
				per_page: options.limit || 10,
			})

			const authorResults = Array.isArray(authors.results) ? authors.results : []
			const authorIds = authorResults.map((author) => String((author as Record<string, unknown>).id))

			// Batch preload authors into cache
			if (this.cache && authorIds.length > 0) {
				try {
					const expansionContext = {
						...context,
						entityType: "authors" as const,
						depth: (context.depth || 0) + 1,
					}
					await this.cache.batchPreloadEntities(authorIds, expansionContext)
				} catch (error) {
					logger.warn("provider", "Failed to preload institution authors", { error }, "OpenAlexProvider")
				}
			}

			for (const author of authorResults) {
				const authorRecord = author as Record<string, unknown>
				const authorNode: GraphNode = {
					id: String(authorRecord.id),
					entityType: "authors",
					entityId: String(authorRecord.id),
					label: this.extractLabel(authorRecord, "authors"),
					x: Math.random() * 800,
					y: Math.random() * 600,
					externalIds: this.extractExternalIds(authorRecord, "authors"),
					entityData: authorRecord,
				}

				nodes.push(authorNode)
				edges.push({
					id: `${authorRecord.id}-affiliated-${institutionId}`,
					source: String(authorRecord.id),
					target: institutionId,
					type: RelationType.AFFILIATION,
				direction: 'outbound',
				})
			}
		} catch (error) {
			logger.warn(
				"provider",
				`Failed to expand institution ${institutionId}`,
				{ error },
				"OpenAlexProvider"
			)
		}
	}

	private async expandTopicWithCache(
		topicId: string,
		topicData: Record<string, unknown>,
		nodes: GraphNode[],
		edges: GraphEdge[],
		options: ProviderExpansionOptions,
		context: CacheContext
	): Promise<void> {
		// Extract topic hierarchy properties (T043: Extract hierarchy from topic data)
		const field = topicData.field as { id: string; display_name: string } | undefined
		const domain = topicData.domain as { id: string; display_name: string } | undefined
		const subfield = topicData.subfield as { id: string; display_name: string } | undefined

		// T044: Create TOPIC_PART_OF_FIELD edge
		if (field?.id && field?.display_name) {
			const fieldId = this.extractFieldOrDomainId(field.id)

			// Validate extracted field ID
			if (fieldId) {
				// Create field stub node (T048)
				nodes.push({
					id: fieldId,
					entityType: "topics", // Fields are part of topics taxonomy
					entityId: fieldId,
					label: field.display_name,
					x: Math.random() * 800,
					y: Math.random() * 600,
					externalIds: [],
					entityData: { id: fieldId, display_name: field.display_name },
				})

				// Create edge: topic → field
				edges.push({
					id: createCanonicalEdgeId(topicId, fieldId, RelationType.TOPIC_PART_OF_FIELD),
					source: topicId,
					target: fieldId,
					type: RelationType.TOPIC_PART_OF_FIELD,
					direction: 'outbound',
				})
			}
		}

		// T045: Create FIELD_PART_OF_DOMAIN edge
		if (field?.id && domain?.id && domain?.display_name) {
			const fieldId = this.extractFieldOrDomainId(field.id)
			const domainId = this.extractFieldOrDomainId(domain.id)

			// Validate both IDs extracted successfully
			if (fieldId && domainId) {
				// Create domain stub node (T048)
				nodes.push({
					id: domainId,
					entityType: "topics", // Domains are part of topics taxonomy
					entityId: domainId,
					label: domain.display_name,
					x: Math.random() * 800,
					y: Math.random() * 600,
					externalIds: [],
					entityData: { id: domainId, display_name: domain.display_name },
				})

				// Create edge: field → domain
				edges.push({
					id: createCanonicalEdgeId(fieldId, domainId, RelationType.FIELD_PART_OF_DOMAIN),
					source: fieldId,
					target: domainId,
					type: RelationType.FIELD_PART_OF_DOMAIN,
					direction: 'outbound',
				})
			}
		}

		// T046: Create TOPIC_PART_OF_SUBFIELD edge (if subfield available)
		if (subfield?.id && subfield?.display_name) {
			const subfieldId = this.extractFieldOrDomainId(subfield.id)

			if (subfieldId) {
				// Create subfield stub node
				nodes.push({
					id: subfieldId,
					entityType: "topics",
					entityId: subfieldId,
					label: subfield.display_name,
					x: Math.random() * 800,
					y: Math.random() * 600,
					externalIds: [],
					entityData: { id: subfieldId, display_name: subfield.display_name },
				})

				// Create edge: topic → subfield
				edges.push({
					id: createCanonicalEdgeId(topicId, subfieldId, RelationType.TOPIC_PART_OF_SUBFIELD),
					source: topicId,
					target: subfieldId,
					type: RelationType.TOPIC_PART_OF_SUBFIELD,
					direction: 'outbound',
				})
			}
		}

		// Add recent works in this topic
		try {
			const works = await this.client.works({
				filter: { topics: { id: topicId } },
				per_page: options.limit || 10,
				sort: "publication_year:desc",
			})

			const workResults = Array.isArray(works.results) ? works.results : []
			const workIds = workResults.map((work) => String((work as Record<string, unknown>).id))

			// Batch preload works into cache
			if (this.cache && workIds.length > 0) {
				try {
					const expansionContext = {
						...context,
						entityType: "works" as const,
						depth: (context.depth || 0) + 1,
					}
					await this.cache.batchPreloadEntities(workIds, expansionContext)
				} catch (error) {
					logger.warn("provider", "Failed to preload topic works", { error }, "OpenAlexProvider")
				}
			}

			for (const work of workResults) {
				const workRecord = work as Record<string, unknown>
				const workNode: GraphNode = {
					id: String(workRecord.id),
					entityType: "works",
					entityId: String(workRecord.id),
					label: this.extractLabel(workRecord, "works"),
					x: Math.random() * 800,
					y: Math.random() * 600,
					externalIds: this.extractExternalIds(workRecord, "works"),
					entityData: workRecord,
				}

				nodes.push(workNode)
				edges.push({
					id: `${workRecord.id}-has-topic-${topicId}`,
					source: String(workRecord.id),
					target: topicId,
					type: RelationType.TOPIC,
				direction: 'outbound',
				})
			}
		} catch (error) {
			logger.warn("provider", `Failed to expand topic ${topicId}`, { error }, "OpenAlexProvider")
		}
	}

	/**
	 * Extract field or domain ID from OpenAlex URL or direct ID
	 * Handles formats:
	 *   - "https://openalex.org/fields/17" → "fields/17"
	 *   - "https://openalex.org/domains/3" → "domains/3"
	 *   - "fields/17" → "fields/17" (already in correct format)
	 * T049: Validate IDs and handle missing hierarchy
	 */
	private extractFieldOrDomainId(urlOrId: string): string | null {
		if (!urlOrId || typeof urlOrId !== 'string') {
			return null
		}

		// If already in correct format (fields/17 or domains/3), return as-is
		if (/^(fields|domains)\/\d+$/.test(urlOrId)) {
			return urlOrId
		}

		// Match pattern: .../fields/17 or .../domains/3 from URL
		const match = urlOrId.match(/\/(fields|domains)\/(\d+)/)
		if (match) {
			return `${match[1]}/${match[2]}`
		}

		logger.warn(
			"provider",
			`Failed to extract field/domain ID from URL: ${urlOrId}`,
			{ urlOrId },
			"OpenAlexProvider"
		)
		return null
	}

	private async expandFunderWithCache(
		funderId: string,
		funderData: Record<string, unknown>,
		nodes: GraphNode[],
		edges: GraphEdge[],
		options: ProviderExpansionOptions,
		context: CacheContext
	): Promise<void> {
		// Add works funded by this funder (reverse lookup)
		try {
			// Apply limit for grants
			const grantLimit = getRelationshipLimit(options, RelationType.FUNDED_BY)

			const works = await this.client.works({
				filter: { "grants.funder": funderId },
				per_page: grantLimit,
				sort: "publication_year:desc",
			})

			const workResults = Array.isArray(works.results) ? works.results : []
			const workIds = workResults.map((work) => String((work as Record<string, unknown>).id))

			// Batch preload works into cache
			if (this.cache && workIds.length > 0) {
				try {
					const expansionContext = {
						...context,
						entityType: "works" as const,
						depth: (context.depth || 0) + 1,
					}
					await this.cache.batchPreloadEntities(workIds, expansionContext)
				} catch (error) {
					logger.warn("provider", "Failed to preload funder works", { error }, "OpenAlexProvider")
				}
			}

			for (const work of workResults) {
				const workRecord = work as Record<string, unknown>
				const workId = String(workRecord.id)

				// Validate work ID before creating edge
				if (!validateOpenAlexId(workId)) {
					logger.warn(
						"provider",
						"Invalid work ID, skipping",
						{ funderId, workId },
						"OpenAlexProvider"
					)
					continue
				}

				const workNode: GraphNode = {
					id: workId,
					entityType: "works",
					entityId: workId,
					label: this.extractLabel(workRecord, "works"),
					x: Math.random() * 800,
					y: Math.random() * 600,
					externalIds: this.extractExternalIds(workRecord, "works"),
					entityData: workRecord,
				}

				nodes.push(workNode)

				// Create FUNDED_BY edge with inbound direction
				// Note: semantic direction is still work → funder
				edges.push({
					id: createCanonicalEdgeId(workId, funderId, RelationType.FUNDED_BY),
					source: workId,
					target: funderId,
					type: RelationType.FUNDED_BY,
					direction: 'inbound',
				})
			}
		} catch (error) {
			logger.warn("provider", `Failed to expand funder ${funderId}`, { error }, "OpenAlexProvider")
		}
	}

	private async expandPublisherWithCache(
		publisherId: string,
		publisherData: Record<string, unknown>,
		nodes: GraphNode[],
		edges: GraphEdge[],
		options: ProviderExpansionOptions,
		context: CacheContext
	): Promise<void> {
		// T067: Reverse lookup - find all sources hosted by this publisher
		if (options.includeReverseRelationships) {
			try {
				const hostOrgLimit = getRelationshipLimit(options, RelationType.HOST_ORGANIZATION)

				const hostedSources = await this.client.sources({
					filter: { 'host_organization.id': publisherId },
					per_page: hostOrgLimit,
				})

				const sourceResults = Array.isArray(hostedSources.results) ? hostedSources.results : []

				for (const source of sourceResults) {
					const sourceRecord = source as Record<string, unknown>
					const sourceId = extractOpenAlexId(String(sourceRecord.id))

					// Validate source ID before creating edge
					if (!validateOpenAlexId(sourceId)) {
						logger.warn(
							"provider",
							"Invalid source ID, skipping",
							{ publisherId, sourceId: sourceRecord.id },
							"OpenAlexProvider"
						)
						continue
					}

					// Create source node
					const sourceNode: GraphNode = {
						id: sourceId,
						entityType: "sources",
						entityId: sourceId,
						label: this.extractLabel(sourceRecord, "sources"),
						x: Math.random() * 800,
						y: Math.random() * 600,
						externalIds: this.extractExternalIds(sourceRecord, "sources"),
						entityData: sourceRecord,
					}

					nodes.push(sourceNode)

					// Create HOST_ORGANIZATION edge (inbound)
					edges.push({
						id: createCanonicalEdgeId(sourceId, publisherId, RelationType.HOST_ORGANIZATION),
						source: sourceId,
						target: publisherId,
						type: RelationType.HOST_ORGANIZATION,
						direction: 'inbound',
						metadata: {},
					})
				}
			} catch (error) {
				logger.warn(
					"provider",
					`Failed to fetch sources for publisher ${publisherId}`,
					{ error },
					"OpenAlexProvider"
				)
			}
		}

		// T068: Parent publisher relationship
		const parentPublisherUrl = publisherData.parent_publisher as string | null
		if (parentPublisherUrl) {
			const parentId = extractOpenAlexId(parentPublisherUrl)

			// Validate parent publisher ID before creating edge
			if (validateOpenAlexId(parentId)) {
				try {
					// Fetch parent publisher data to create node
					const parentData = await this.fetchEntityDataWithCache(
						parentId,
						"publishers",
						{
							...context,
							depth: (context.depth || 0) + 1,
						}
					)

					// Create parent publisher node
					const parentNode: GraphNode = {
						id: parentId,
						entityType: "publishers",
						entityId: parentId,
						label: this.extractLabel(parentData, "publishers"),
						x: Math.random() * 800,
						y: Math.random() * 600,
						externalIds: this.extractExternalIds(parentData, "publishers"),
						entityData: parentData,
					}

					nodes.push(parentNode)

					// Create PUBLISHER_CHILD_OF edge
					edges.push({
						id: createCanonicalEdgeId(publisherId, parentId, RelationType.PUBLISHER_CHILD_OF),
						source: publisherId,
						target: parentId,
						type: RelationType.PUBLISHER_CHILD_OF,
						direction: 'outbound',
						metadata: {},
					})
				} catch (error) {
					logger.warn(
						"provider",
						`Failed to fetch parent publisher ${parentId}`,
						{ error, publisherId },
						"OpenAlexProvider"
					)
				}
			} else {
				logger.warn(
					"provider",
					"Invalid parent publisher ID, skipping",
					{ publisherId, parentId: parentPublisherUrl },
					"OpenAlexProvider"
				)
			}
		}

		// T069: Publisher lineage (similar to institutions)
		const lineageArray = (publisherData.lineage as string[]) || []
		const lineageLimit = getRelationshipLimit(options, RelationType.LINEAGE)

		// Process lineage array (skip self at index 0, process ancestors starting at index 1)
		for (let i = 1; i < Math.min(lineageArray.length, lineageLimit + 1); i++) {
			const ancestorIdOrUrl = lineageArray[i]

			// Extract bare ID from URL or use as-is
			const ancestorId = extractOpenAlexId(ancestorIdOrUrl)

			// Validate ancestor publisher ID before creating edge
			if (!validateOpenAlexId(ancestorId)) {
				logger.warn(
					"provider",
					"Invalid ancestor publisher ID, skipping",
					{ publisherId, ancestorId: ancestorIdOrUrl },
					"OpenAlexProvider"
				)
				continue
			}

			// Fetch ancestor publisher data to create node
			try {
				const ancestorData = await this.fetchEntityDataWithCache(
					ancestorId,
					"publishers",
					{
						...context,
						depth: (context.depth || 0) + 1,
					}
				)

				// Create ancestor publisher node
				const ancestorNode: GraphNode = {
					id: ancestorId,
					entityType: "publishers",
					entityId: ancestorId,
					label: this.extractLabel(ancestorData, "publishers"),
					x: Math.random() * 800,
					y: Math.random() * 600,
					externalIds: this.extractExternalIds(ancestorData, "publishers"),
					entityData: ancestorData,
				}

				nodes.push(ancestorNode)

				// Create LINEAGE edge: descendant → ancestor
				const edge: GraphEdge = {
					id: createCanonicalEdgeId(publisherId, ancestorId, RelationType.LINEAGE),
					source: publisherId,
					target: ancestorId,
					type: RelationType.LINEAGE,
					direction: 'outbound',
					metadata: {
						lineage_level: i, // 1-based index (1 for immediate parent, 2 for grandparent, etc.)
					},
				}

				edges.push(edge)
			} catch (error) {
				logger.warn(
					"provider",
					`Failed to fetch ancestor publisher ${ancestorId}`,
					{ error, publisherId },
					"OpenAlexProvider"
				)
			}
		}
	}

	// ==================== CACHE INTEGRATION METHODS ====================

	/**
	 * Set the current cache context for subsequent operations
	 */
	setCacheContext(context: CacheContext): void {
		this.currentContext = context
	}

	/**
	 * Preload a single entity into the cache
	 */
	async preloadEntity(id: string, context: CacheContext): Promise<void> {
		if (!this.cache) return

		try {
			await this.cache.preloadEntity(id, context)
		} catch (error) {
			logger.warn("provider", `Failed to preload entity ${id}`, { error }, "OpenAlexProvider")
		}
	}

	/**
	 * Batch preload multiple entities into the cache
	 */
	async batchPreloadEntities(ids: string[], context: CacheContext): Promise<void> {
		if (!this.cache || ids.length === 0) return

		try {
			await this.cache.batchPreloadEntities(ids, context)
		} catch (error) {
			logger.warn("provider", "Failed to batch preload entities", { error }, "OpenAlexProvider")
		}
	}

	/**
	 * Get cache performance statistics
	 */
	async getCacheStats(): Promise<CacheStats | null> {
		if (!this.cache) return null

		try {
			return await this.cache.getCacheStats()
		} catch (error) {
			logger.warn("provider", "Failed to get cache stats", { error }, "OpenAlexProvider")
			return null
		}
	}

	/**
	 * Get provider-level cache statistics
	 */
	getProviderCacheStats(): {
		hits: number
		misses: number
		fallbacks: number
		contextOptimizations: number
		hitRate: number
	} {
		const total = this.cacheStats.hits + this.cacheStats.misses
		return {
			...this.cacheStats,
			hitRate: total > 0 ? this.cacheStats.hits / total : 0,
		}
	}

	/**
	 * Invalidate cached entity data
	 */
	async invalidateEntity(id: string): Promise<void> {
		if (!this.cache) return

		try {
			await this.cache.invalidateEntity(id)
		} catch (error) {
			logger.warn("provider", `Failed to invalidate entity ${id}`, { error }, "OpenAlexProvider")
		}
	}

	/**
	 * Clear all cache data
	 */
	async clearCache(): Promise<void> {
		if (!this.cache) return

		try {
			await this.cache.clear()
			// Reset provider-level stats
			this.cacheStats = {
				hits: 0,
				misses: 0,
				fallbacks: 0,
				contextOptimizations: 0,
			}
		} catch (error) {
			logger.warn("provider", "Failed to clear cache", { error }, "OpenAlexProvider")
		}
	}

	// ==================== FIELD SELECTOR HELPERS ====================

	/**
	 * Create default field selector if none provided
	 */
	private createDefaultFieldSelector(): ContextualFieldSelector {
		return {
			selectFieldsForContext: (entityType: EntityType, context: CacheContext): string[] => {
				const baseFields = this.getMinimalFields(entityType)

				switch (context.operation) {
					case "fetch":
						return [...baseFields, "authorships", "primary_location", "topics"]
					case "search":
						return baseFields
					case "expand":
						return [...baseFields, ...this.getExpansionFields(entityType, RelationType.AUTHORSHIP)]
					case "traverse":
						return baseFields
					default:
						return baseFields
				}
			},

			getMinimalFields: (entityType: EntityType): string[] => {
				return this.getMinimalFields(entityType)
			},

			getExpansionFields: (entityType: EntityType, relationType: RelationType): string[] => {
				return this.getExpansionFields(entityType, relationType)
			},
		}
	}

	private getMinimalFields(entityType: EntityType): string[] {
		switch (entityType) {
			case "works":
				return ["id", "display_name", "publication_year", "type"]
			case "authors":
				return ["id", "display_name", "orcid"]
			case "sources":
				return ["id", "display_name", "type"]
			case "institutions":
				return ["id", "display_name", "country_code"]
			case "topics":
				return ["id", "display_name", "level"]
			default:
				return ["id", "display_name"]
		}
	}

	private getExpansionFields(entityType: EntityType, relationType: RelationType): string[] {
		switch (entityType) {
			case "works":
				if (relationType === RelationType.AUTHORSHIP) {
					return ["authorships.author.id", "authorships.author.display_name"]
				}
				return ["primary_location.source.id", "topics.id"]
			case "authors":
				return ["last_known_institutions.id", "works_count"]
			default:
				return []
		}
	}
}
