/**
 * Service and Utility Exports
 * Graph utilities and service interfaces
 */

// Phase 1: Core Services (Interface-only for buildability)
export { EntityResolver, type IEntityResolver, type EntityExpansionOptions, type ExpansionResult } from './entity-resolver-interface';

// Entity Detection Service - Pure service for identifier detection and normalization
export {
  EntityDetectionService,
  detectEntityType,
  normalizeIdentifier,
  isValidIdentifier,
  detectEntity,
  type DetectionResult,
} from './entity-detection-service';

// Graph utility result interface
export interface GraphUtilityResult {
  success: boolean;
  message?: string;
  data?: unknown;
  errors?: string[];
  warnings?: string[];
}

// Graph utilities service interface
export interface GraphUtilitiesService {
  // Node operations
  addNode(node: unknown): GraphUtilityResult;
  removeNode(nodeId: string): GraphUtilityResult;
  updateNode(nodeId: string, updates: unknown): GraphUtilityResult;
  getNode(nodeId: string): GraphUtilityResult;

  // Edge operations
  addEdge(edge: unknown): GraphUtilityResult;
  removeEdge(edgeId: string): GraphUtilityResult;
  updateEdge(edgeId: string, updates: unknown): GraphUtilityResult;
  getEdge(edgeId: string): GraphUtilityResult;

  // Graph operations
  clear(): GraphUtilityResult;
  getStats(): GraphUtilityResult;
  validate(): GraphUtilityResult;

  // Layout operations
  applyLayout(layoutType: string, options?: unknown): GraphUtilityResult;
  getLayoutProgress(): GraphUtilityResult;

  // Search and filtering
  findNodes(criteria: unknown): GraphUtilityResult;
  findEdges(criteria: unknown): GraphUtilityResult;
  filterGraph(filter: unknown): GraphUtilityResult;
}

// Graph utilities service instance (stub)
export const graphUtilitiesService: GraphUtilitiesService = {
  addNode: (_node: unknown) => {
    throw new Error("graphUtilitiesService not available in graph package - use from application layer");
  },
  removeNode: (_nodeId: string) => {
    throw new Error("graphUtilitiesService not available in graph package - use from application layer");
  },
  updateNode: (_nodeId: string, _updates: unknown) => {
    throw new Error("graphUtilitiesService not available in graph package - use from application layer");
  },
  getNode: (_nodeId: string) => {
    throw new Error("graphUtilitiesService not available in graph package - use from application layer");
  },
  addEdge: (_edge: unknown) => {
    throw new Error("graphUtilitiesService not available in graph package - use from application layer");
  },
  removeEdge: (_edgeId: string) => {
    throw new Error("graphUtilitiesService not available in graph package - use from application layer");
  },
  updateEdge: (_edgeId: string, _updates: unknown) => {
    throw new Error("graphUtilitiesService not available in graph package - use from application layer");
  },
  getEdge: (_edgeId: string) => {
    throw new Error("graphUtilitiesService not available in graph package - use from application layer");
  },
  clear: () => {
    throw new Error("graphUtilitiesService not available in graph package - use from application layer");
  },
  getStats: () => {
    throw new Error("graphUtilitiesService not available in graph package - use from application layer");
  },
  validate: () => {
    throw new Error("graphUtilitiesService not available in graph package - use from application layer");
  },
  applyLayout: (_layoutType: string, _options?: unknown) => {
    throw new Error("graphUtilitiesService not available in graph package - use from application layer");
  },
  getLayoutProgress: () => {
    throw new Error("graphUtilitiesService not available in graph package - use from application layer");
  },
  findNodes: (_criteria: unknown) => {
    throw new Error("graphUtilitiesService not available in graph package - use from application layer");
  },
  findEdges: (_criteria: unknown) => {
    throw new Error("graphUtilitiesService not available in graph package - use from application layer");
  },
  filterGraph: (_filter: unknown) => {
    throw new Error("graphUtilitiesService not available in graph package - use from application layer");
  }
};

// Performance monitoring interface (graph-specific)
export interface GraphPerformanceMetrics {
  fps?: number;
  frameTime?: number;
  memoryUsage?: number;
  nodeCount?: number;
  edgeCount?: number;
  renderTime?: number;
  updateTime?: number;
}

// Analytics and metrics service interface
export interface AnalyticsService {
  trackEvent(event: string, properties?: Record<string, unknown>): void;
  trackPerformance(metrics: GraphPerformanceMetrics): void;
  getMetrics(): GraphPerformanceMetrics;
  reset(): void;
}

// Analytics service instance (stub)
export const analyticsService: AnalyticsService = {
  trackEvent: (_event: string, _properties?: Record<string, unknown>) => {
    throw new Error("analyticsService not available in graph package - use from application layer");
  },
  trackPerformance: (_metrics: GraphPerformanceMetrics) => {
    throw new Error("analyticsService not available in graph package - use from application layer");
  },
  getMetrics: () => {
    throw new Error("analyticsService not available in graph package - use from application layer");
  },
  reset: () => {
    throw new Error("analyticsService not available in graph package - use from application layer");
  }
};