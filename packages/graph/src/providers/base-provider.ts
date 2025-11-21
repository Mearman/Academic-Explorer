/**
 * Abstract base class for graph data providers
 * Defines the interface for fetching and expanding graph entities from various data sources
 */

import { EventEmitter } from "../utils/event-emitter"
import { logger } from "@academic-explorer/utils"
import type { GraphNode, GraphEdge, EntityIdentifier } from "../types/core"
import type { EntityType } from "@academic-explorer/types"
import type { ExpansionLimits, TruncationInfo } from "../types/expansion"

export interface SearchQuery {
	query: string
	entityTypes: EntityType[]
	limit?: number
	offset?: number
	filters?: Record<string, unknown>
}

export interface ProviderExpansionOptions {
	relationshipTypes?: string[]
	maxDepth?: number
	limit?: number
	limits?: ExpansionLimits
	includeMetadata?: boolean
	includeReverseRelationships?: boolean
}

export interface GraphExpansion {
	nodes: GraphNode[]
	edges: GraphEdge[]
	metadata: {
		expandedFrom: string
		depth: number
		totalFound: number
		options: ProviderExpansionOptions
		/**
		 * Truncation metadata for relationship limits (FR-033, research.md Section 4)
		 * Tracks how many entities are included vs available for each relationship type
		 */
		truncated?: {
			[relationship: string]: TruncationInfo | undefined
			/** Authorship relationship truncation info (Work → Authors) */
			authorship?: TruncationInfo
			/** Reference relationship truncation info (Work → Cited Works) */
			references?: TruncationInfo
			/** Grants relationship truncation info (Work → Funders) */
			grants?: TruncationInfo
			/** Topics relationship truncation info (Work → Topics) */
			topics?: TruncationInfo
			/** Affiliations relationship truncation info (Author → Institutions) */
			affiliations?: TruncationInfo
			/** Lineage relationship truncation info (Institution → Parents) */
			lineage?: TruncationInfo
			/** Keywords relationship truncation info (Work → Keywords) */
			keywords?: TruncationInfo
			/** Author research topics truncation info (Author → Topics) */
			author_researches?: TruncationInfo
			/** Host organization truncation info (Source → Publisher) */
			host_organization?: TruncationInfo
			/** Publisher parent truncation info (Publisher → Parent) */
			publisher_child_of?: TruncationInfo
		}
	}
}

export interface ProviderStats {
	totalRequests: number
	successfulRequests: number
	failedRequests: number
	avgResponseTime: number
	lastRequestTime: number
}

export interface ProviderOptions {
	name: string
	version?: string
	maxConcurrentRequests?: number
	retryAttempts?: number
	retryDelay?: number
	timeout?: number
}

/**
 * Apply configurable relationship limits (FR-033, research.md Section 4)
 * Returns the appropriate limit for a specific relationship type following priority:
 * 1. Relationship-specific limit (options.limits?.[relationship])
 * 2. Global default limit (options.limits?.default)
 * 3. Legacy limit parameter (options.limit)
 * 4. Fallback default (10)
 *
 * @param options - Provider expansion options containing limit configuration
 * @param relationship - The relationship type key to get the limit for
 * @returns The configured limit for the relationship, or 10 if not specified
 */
export function getRelationshipLimit(
	options: ProviderExpansionOptions,
	relationship: keyof ExpansionLimits
): number {
	// Priority: relationship-specific > global default > fallback default
	return (options.limits?.[relationship] as number | undefined)
		?? options.limits?.default
		?? options.limit
		?? 10
}

/**
 * Abstract base class for graph data providers
 */
export abstract class GraphDataProvider extends EventEmitter {
	protected stats: ProviderStats
	protected readonly options: Required<ProviderOptions>

	constructor(options: ProviderOptions) {
		super()

		this.options = {
			version: "1.0.0",
			maxConcurrentRequests: 10,
			retryAttempts: 3,
			retryDelay: 1000,
			timeout: 30000,
			...options,
		}

		this.stats = {
			totalRequests: 0,
			successfulRequests: 0,
			failedRequests: 0,
			avgResponseTime: 0,
			lastRequestTime: 0,
		}
	}

	// Abstract methods to be implemented by concrete providers
	abstract fetchEntity(id: EntityIdentifier): Promise<GraphNode>
	abstract searchEntities(query: SearchQuery): Promise<GraphNode[]>
	abstract expandEntity(nodeId: string, options: ProviderExpansionOptions): Promise<GraphExpansion>

	// Optional: Batch operations (can be overridden for efficiency)
	async fetchEntities(ids: EntityIdentifier[]): Promise<GraphNode[]> {
		return Promise.all(ids.map((id) => this.fetchEntity(id)))
	}

	// Provider metadata
	getProviderInfo() {
		return {
			name: this.options.name,
			version: this.options.version,
			stats: { ...this.stats },
		}
	}

	// Statistics tracking
	protected trackRequest<T>(promise: Promise<T>): Promise<T> {
		const startTime = Date.now()
		this.stats.totalRequests++

		return promise
			.then((result) => {
				this.stats.successfulRequests++
				this.updateResponseTime(startTime, true)
				this.safeEmit("requestSuccess", { duration: Date.now() - startTime })
				return result
			})
			.catch((error) => {
				this.stats.failedRequests++
				this.updateResponseTime(startTime, false)
				this.safeEmit("requestError", { error, duration: Date.now() - startTime })
				throw error
			})
	}

	private updateResponseTime(startTime: number, isSuccess: boolean) {
		const duration = Date.now() - startTime
		this.stats.lastRequestTime = Date.now()

		// Update average response time only for successful requests
		if (isSuccess && this.stats.successfulRequests > 0) {
			const totalDuration = this.stats.avgResponseTime * (this.stats.successfulRequests - 1) + duration
			this.stats.avgResponseTime = totalDuration / this.stats.successfulRequests
		}
	}

	// Safe event emission that catches listener errors
	protected safeEmit(event: string | symbol, ...args: unknown[]): boolean {
		try {
			return this.emit(String(event), ...args)
		} catch (error) {
			// Log the error but don't let it interrupt the main flow
			logger.warn(
				"provider",
				`Event listener error for ${String(event)}`,
				{ error },
				"GraphDataProvider"
			)
			return false
		}
	}

	// Event hooks (can be overridden)
	protected onEntityFetched(entity: GraphNode): void {
		this.safeEmit("entityFetched", entity)
	}

	protected onError(error: Error): void {
		this.safeEmit("error", error)
	}

	protected onCacheHit(entityId: string): void {
		this.safeEmit("cacheHit", entityId)
	}

	protected onCacheMiss(entityId: string): void {
		this.safeEmit("cacheMiss", entityId)
	}

	// Health check
	abstract isHealthy(): Promise<boolean>

	// Cleanup resources
	destroy(): void {
		this.removeAllListeners()
	}
}

/**
 * Provider registry for managing multiple data providers
 */
export class ProviderRegistry {
	private providers = new Map<string, GraphDataProvider>()
	private defaultProvider: string | null = null

	register(provider: GraphDataProvider): void {
		const info = provider.getProviderInfo()
		this.providers.set(info.name, provider)

		if (!this.defaultProvider) {
			this.defaultProvider = info.name
		}
	}

	unregister(providerName: string): void {
		const provider = this.providers.get(providerName)
		if (provider) {
			provider.destroy()
			this.providers.delete(providerName)

			if (this.defaultProvider === providerName) {
				this.defaultProvider = this.providers.keys().next().value || null
			}
		}
	}

	get(providerName?: string): GraphDataProvider | null {
		const name = providerName || this.defaultProvider
		return name ? this.providers.get(name) || null : null
	}

	setDefault(providerName: string): void {
		if (this.providers.has(providerName)) {
			this.defaultProvider = providerName
		} else {
			throw new Error(`Provider '${providerName}' not found`)
		}
	}

	listProviders(): string[] {
		return Array.from(this.providers.keys())
	}

	getStats(): Record<string, ProviderStats> {
		const stats: Record<string, ProviderStats> = {}

		for (const [name, provider] of this.providers) {
			stats[name] = provider.getProviderInfo().stats
		}

		return stats
	}

	async healthCheck(): Promise<Record<string, boolean>> {
		const health: Record<string, boolean> = {}

		for (const [name, provider] of this.providers) {
			try {
				health[name] = await provider.isHealthy()
			} catch {
				health[name] = false
			}
		}

		return health
	}

	destroy(): void {
		for (const provider of this.providers.values()) {
			provider.destroy()
		}
		this.providers.clear()
		this.defaultProvider = null
	}
}
