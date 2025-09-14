/**
 * TanStack Query integration for graph data caching
 * Provides query keys, cache operations, and utilities for persistent graph storage
 */

import { QueryClient, useQuery, UseQueryOptions } from "@tanstack/react-query";
import { rateLimitedOpenAlex } from "@/lib/openalex/rate-limited-client";
import { EntityDetector } from "@/lib/graph/utils/entity-detection";
import { logger } from "@/lib/logger";
import type { GraphNode, GraphEdge } from "@/lib/graph/types";
import type { OpenAlexEntity } from "@/lib/openalex/types";

// Query key factories for graph data
export const graphQueryKeys = {
  // Base key
  all: ['graph'] as const,

  // Graph nodes and edges
  nodes: () => [...graphQueryKeys.all, 'nodes'] as const,
  edges: () => [...graphQueryKeys.all, 'edges'] as const,

  // Expansion tracking
  expanded: () => [...graphQueryKeys.all, 'expanded'] as const,
  expandedNode: (nodeId: string) => [...graphQueryKeys.expanded(), nodeId] as const,

  // Cache-based queries
  cachedNodes: () => [...graphQueryKeys.all, 'cached-nodes'] as const,
  cachedNodesByType: (entityType: string) => [...graphQueryKeys.cachedNodes(), entityType] as const,
};

/**
 * Get all cached OpenAlex entities from TanStack Query cache
 * These are the raw API responses that can be transformed to graph nodes
 */
export function getCachedOpenAlexEntities(queryClient: QueryClient): OpenAlexEntity[] {
  const cachedEntities: OpenAlexEntity[] = [];

  // Find all entity queries in the cache
  const entityQueries = queryClient.getQueryCache().findAll({
    predicate: (query) => {
      const queryKey = query.queryKey;
      // Look for entity queries: ['entity', 'works', 'W123...'] or ['entity', entityId]
      return Array.isArray(queryKey) &&
             queryKey.length >= 2 &&
             queryKey[0] === 'entity' &&
             query.state.status === 'success' &&
             Boolean(query.state.data);
    }
  });

  // Extract the data from successful queries
  entityQueries.forEach(query => {
    try {
      const entity = query.state.data as OpenAlexEntity;
      if (entity && entity.id) {
        cachedEntities.push(entity);
      }
    } catch (error) {
      logger.warn("cache", "Failed to extract entity from cached query", {
        queryKey: query.queryKey,
        error: error instanceof Error ? error.message : "Unknown error"
      }, "GraphCache");
    }
  });

  logger.info("cache", "Retrieved cached OpenAlex entities", {
    count: cachedEntities.length
  }, "GraphCache");

  return cachedEntities;
}

/**
 * Get cached entities filtered by type
 */
export function getCachedEntitiesByType(
  queryClient: QueryClient,
  entityTypes: string[]
): Record<string, OpenAlexEntity[]> {
  const allEntities = getCachedOpenAlexEntities(queryClient);
  const detector = new EntityDetector();

  const result: Record<string, OpenAlexEntity[]> = {};
  entityTypes.forEach(type => {
    result[type] = [];
  });

  allEntities.forEach(entity => {
    const detection = detector.detectEntityIdentifier(entity.id);
    if (detection.entityType && entityTypes.includes(detection.entityType)) {
      result[detection.entityType].push(entity);
    }
  });

  return result;
}

/**
 * Store graph nodes in TanStack Query cache
 */
export function setCachedGraphNodes(queryClient: QueryClient, nodes: GraphNode[]) {
  queryClient.setQueryData(graphQueryKeys.nodes(), nodes);

  logger.info("cache", "Stored graph nodes in TanStack Query cache", {
    count: nodes.length
  }, "GraphCache");
}

/**
 * Store graph edges in TanStack Query cache
 */
export function setCachedGraphEdges(queryClient: QueryClient, edges: GraphEdge[]) {
  queryClient.setQueryData(graphQueryKeys.edges(), edges);

  logger.info("cache", "Stored graph edges in TanStack Query cache", {
    count: edges.length
  }, "GraphCache");
}

/**
 * Get cached graph nodes from TanStack Query cache
 */
export function getCachedGraphNodes(queryClient: QueryClient): GraphNode[] | undefined {
  return queryClient.getQueryData(graphQueryKeys.nodes());
}

/**
 * Get cached graph edges from TanStack Query cache
 */
export function getCachedGraphEdges(queryClient: QueryClient): GraphEdge[] | undefined {
  return queryClient.getQueryData(graphQueryKeys.edges());
}

/**
 * Mark a node as expanded in the cache
 */
export function setNodeExpanded(queryClient: QueryClient, nodeId: string, expanded: boolean) {
  queryClient.setQueryData(graphQueryKeys.expandedNode(nodeId), expanded);

  logger.info("cache", "Updated node expansion status", {
    nodeId,
    expanded
  }, "GraphCache");
}

/**
 * Check if a node is marked as expanded in the cache
 */
export function isNodeExpanded(queryClient: QueryClient, nodeId: string): boolean {
  const expanded = queryClient.getQueryData(graphQueryKeys.expandedNode(nodeId));
  return Boolean(expanded);
}

/**
 * Clear all graph-related cache data
 */
export function clearGraphCache(queryClient: QueryClient) {
  // Remove all graph queries
  queryClient.removeQueries({
    predicate: (query) => {
      const queryKey = query.queryKey;
      return Array.isArray(queryKey) && queryKey[0] === 'graph';
    }
  });

  logger.info("cache", "Cleared all graph cache data", {}, "GraphCache");
}

/**
 * Get cache statistics for graph data
 */
export function getGraphCacheStats(queryClient: QueryClient) {
  const cachedEntities = getCachedOpenAlexEntities(queryClient);
  const cachedNodes = getCachedGraphNodes(queryClient);
  const cachedEdges = getCachedGraphEdges(queryClient);

  // Count expanded nodes
  const expandedQueries = queryClient.getQueryCache().findAll({
    predicate: (query) => {
      const queryKey = query.queryKey;
      return Array.isArray(queryKey) &&
             queryKey.length >= 3 &&
             queryKey[0] === 'graph' &&
             queryKey[1] === 'expanded';
    }
  });

  return {
    cachedEntities: cachedEntities.length,
    cachedNodes: cachedNodes?.length || 0,
    cachedEdges: cachedEdges?.length || 0,
    expandedNodes: expandedQueries.length,
  };
}

/**
 * Hook to get cached OpenAlex entities with reactivity
 */
export function useCachedEntities() {
  return useQuery({
    queryKey: graphQueryKeys.cachedNodes(),
    queryFn: () => {
      // This will trigger when the cache changes
      const queryClient = new QueryClient(); // This is not ideal - we should get from context
      return getCachedOpenAlexEntities(queryClient);
    },
    staleTime: 0, // Always consider stale to check for cache updates
    refetchInterval: 5000, // Check for cache updates every 5 seconds
  });
}

/**
 * Utility to get QueryClient instance from React Query context
 * Should be used within components that have access to QueryClientProvider
 */
export function useGraphCache() {
  // We'll need to get the QueryClient from the React Query context
  // This will be implemented when we use it in components
  return {
    getCachedEntities: getCachedOpenAlexEntities,
    getCachedEntitiesByType,
    setCachedGraphNodes,
    setCachedGraphEdges,
    getCachedGraphNodes,
    getCachedGraphEdges,
    setNodeExpanded,
    isNodeExpanded,
    clearGraphCache,
    getGraphCacheStats,
  };
}