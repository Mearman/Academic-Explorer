/**
 * Service and Utility Exports
 * Graph utilities and service interfaces
 */

// Phase 1: Core Services (Interface-only for buildability)
export {
	EntityResolver,
	type IEntityResolver,
	type EntityExpansionOptions,
	type ExpansionResult,
} from "./entity-resolver-interface"

// Entity Detection Service - Pure service for identifier detection and normalization
export {
	EntityDetectionService,
	detectEntityType,
	normalizeIdentifier,
	isValidIdentifier,
	detectEntity,
	type DetectionResult,
} from "./entity-detection-service"

// Graph Analysis Service - Academic graph analysis and metrics calculation
export {
	GraphAnalyzer,
	type CitationMetrics,
	type NetworkMetrics,
	type CollaborationMetrics,
	type TrendAnalysis,
	type TimeRange,
	type AnalysisOptions,
} from "./graph-analyzer"

// Contextual Field Selector - Intelligent field selection based on usage context
export { ContextualFieldSelector, contextualFieldSelector } from "./contextual-field-selector"

// Smart Entity Cache - Field-level caching with incremental saturation
export {
	SmartEntityCache,
	type CachedEntity,
	type CacheContext,
	type FieldRequest,
	type BatchRequest,
	type CacheStats,
	type EntityData,
	type EntityDataProvider,
} from "./smart-entity-cache"

// Graph utility result interface
export interface GraphUtilityResult {
	success: boolean
	message?: string
	data?: unknown
	errors?: string[]
	warnings?: string[]
}

// Graph utilities service interface
export interface GraphUtilitiesService {
	// Node operations
	addNode(node: unknown): GraphUtilityResult
	removeNode(nodeId: string): GraphUtilityResult
	updateNode(nodeId: string, updates: unknown): GraphUtilityResult
	getNode(nodeId: string): GraphUtilityResult

	// Edge operations
	addEdge(edge: unknown): GraphUtilityResult
	removeEdge(edgeId: string): GraphUtilityResult
	updateEdge(edgeId: string, updates: unknown): GraphUtilityResult
	getEdge(edgeId: string): GraphUtilityResult

	// Graph operations
	clear(): GraphUtilityResult
	getStats(): GraphUtilityResult
	validate(): GraphUtilityResult

	// Layout operations
	applyLayout(layoutType: string, options?: unknown): GraphUtilityResult
	getLayoutProgress(): GraphUtilityResult

	// Search and filtering
	findNodes(criteria: unknown): GraphUtilityResult
	findEdges(criteria: unknown): GraphUtilityResult
	filterGraph(filter: unknown): GraphUtilityResult
}

const STUB_ERROR = "Service not available in graph package - use from application layer"

// Graph utilities service instance (stub)
export const graphUtilitiesService: GraphUtilitiesService = {
	addNode: () => {
		throw new Error(STUB_ERROR)
	},
	removeNode: () => {
		throw new Error(STUB_ERROR)
	},
	updateNode: () => {
		throw new Error(STUB_ERROR)
	},
	getNode: () => {
		throw new Error(STUB_ERROR)
	},
	addEdge: () => {
		throw new Error(STUB_ERROR)
	},
	removeEdge: () => {
		throw new Error(STUB_ERROR)
	},
	updateEdge: () => {
		throw new Error(STUB_ERROR)
	},
	getEdge: () => {
		throw new Error(STUB_ERROR)
	},
	clear: () => {
		throw new Error(STUB_ERROR)
	},
	getStats: () => {
		throw new Error(STUB_ERROR)
	},
	validate: () => {
		throw new Error(STUB_ERROR)
	},
	applyLayout: () => {
		throw new Error(STUB_ERROR)
	},
	getLayoutProgress: () => {
		throw new Error(STUB_ERROR)
	},
	findNodes: () => {
		throw new Error(STUB_ERROR)
	},
	findEdges: () => {
		throw new Error(STUB_ERROR)
	},
	filterGraph: () => {
		throw new Error(STUB_ERROR)
	},
}

// Performance monitoring interface (graph-specific)
export interface GraphPerformanceMetrics {
	fps?: number
	frameTime?: number
	memoryUsage?: number
	nodeCount?: number
	edgeCount?: number
	renderTime?: number
	updateTime?: number
}

// Analytics and metrics service interface
export interface AnalyticsService {
	trackEvent(event: string, properties?: Record<string, unknown>): void
	trackPerformance(metrics: GraphPerformanceMetrics): void
	getMetrics(): GraphPerformanceMetrics
	reset(): void
}

// Analytics service instance (stub)
export const analyticsService: AnalyticsService = {
	trackEvent: () => {
		throw new Error(STUB_ERROR)
	},
	trackPerformance: () => {
		throw new Error(STUB_ERROR)
	},
	getMetrics: () => {
		throw new Error(STUB_ERROR)
	},
	reset: () => {
		throw new Error(STUB_ERROR)
	},
}
