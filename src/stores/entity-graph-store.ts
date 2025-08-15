import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type {
  EntityGraph,
  EntityGraphVertex,
  EntityGraphEdge,
  EntityVisitEvent,
  RelationshipDiscoveryEvent,
  GraphFilterOptions,
  GraphLayoutConfig,
  GraphStatistics,
  GraphTraversalResult,
  EntityType,
} from '@/types/entity-graph';
import {
  EdgeType,
  DEFAULT_MAX_VERTICES,
  DEFAULT_MIN_EDGE_WEIGHT,
  DEFAULT_MAX_HOPS,
  generateEdgeId
} from '@/types/entity-graph';

interface EntityGraphState {
  // Core graph data
  graph: EntityGraph;
  
  // UI state
  selectedVertexId: string | null;
  hoveredVertexId: string | null;
  filterOptions: GraphFilterOptions;
  layoutConfig: GraphLayoutConfig;
  
  // View state
  isGraphVisible: boolean;
  isFullscreen: boolean;
  
  // Actions - Graph management
  visitEntity: (event: EntityVisitEvent) => void;
  addRelationship: (event: RelationshipDiscoveryEvent) => void;
  removeVertex: (vertexId: string) => void;
  removeEdge: (edgeId: string) => void;
  clearGraph: () => void;
  
  // Actions - Selection and interaction
  selectVertex: (vertexId: string | null) => void;
  hoverVertex: (vertexId: string | null) => void;
  
  // Actions - Filtering and layout
  updateFilter: (options: Partial<GraphFilterOptions>) => void;
  updateLayout: (config: Partial<GraphLayoutConfig>) => void;
  resetFilters: () => void;
  
  // Actions - View state
  toggleGraphVisibility: () => void;
  toggleFullscreen: () => void;
  
  // Computed data
  getFilteredVertices: () => EntityGraphVertex[];
  getFilteredEdges: () => EntityGraphEdge[];
  getGraphStatistics: () => GraphStatistics;
  findShortestPath: (sourceId: string, targetId: string) => GraphTraversalResult | null;
  getNeighbors: (vertexId: string, hops?: number) => EntityGraphVertex[];
  
  // Utility functions
  hasVertex: (entityId: string) => boolean;
  hasEdge: (sourceId: string, targetId: string, edgeType: EdgeType) => boolean;
  getVertexDegree: (vertexId: string) => number;
}

// Default graph structure
const createEmptyGraph = (): EntityGraph => ({
  vertices: new Map(),
  edges: new Map(),
  edgesBySource: new Map(),
  edgesByTarget: new Map(),
  verticesByType: new Map(),
  directlyVisitedVertices: new Set(),
  metadata: {
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    totalVisits: 0,
    uniqueEntitiesVisited: 0,
  },
});

// Default filter options
const defaultFilterOptions: GraphFilterOptions = {
  entityTypes: undefined, // Show all by default
  edgeTypes: undefined, // Show all by default
  directlyVisitedOnly: false,
  maxHopsFromVisited: DEFAULT_MAX_HOPS,
  minVisitCount: 0,
  minCitationCount: 0,
};

// Default layout configuration
const defaultLayoutConfig: GraphLayoutConfig = {
  algorithm: 'force-directed',
  separateVisitedEntities: true,
  clusterByEntityType: true,
  sizeByVisitCount: true,
  weightEdgesByStrength: true,
  maxVertices: DEFAULT_MAX_VERTICES,
  minEdgeWeight: DEFAULT_MIN_EDGE_WEIGHT,
};

export const useEntityGraphStore = create<EntityGraphState>()(
  immer((set, get) => ({
      // Initial state
      graph: createEmptyGraph(),
      selectedVertexId: null,
      hoveredVertexId: null,
      filterOptions: defaultFilterOptions,
      layoutConfig: defaultLayoutConfig,
      isGraphVisible: false,
      isFullscreen: false,
      
      // Actions - Graph management
      visitEntity: (event: EntityVisitEvent) =>
        set((state) => {
          const existingVertex = state.graph.vertices.get(event.entityId);
          
          if (existingVertex) {
            // Update existing vertex
            existingVertex.directlyVisited = true;
            existingVertex.lastVisited = event.timestamp;
            existingVertex.visitCount += 1;
            existingVertex.metadata.url = event.metadata?.url as string;
          } else {
            // Create new vertex
            const newVertex: EntityGraphVertex = {
              id: event.entityId,
              entityType: event.entityType,
              displayName: event.displayName,
              directlyVisited: true,
              firstSeen: event.timestamp,
              lastVisited: event.timestamp,
              visitCount: 1,
              metadata: {
                url: event.metadata?.url as string,
                ...event.metadata,
              },
            };
            
            state.graph.vertices.set(event.entityId, newVertex);
            
            // Update indices
            if (!state.graph.verticesByType.has(event.entityType)) {
              state.graph.verticesByType.set(event.entityType, new Set());
            }
            state.graph.verticesByType.get(event.entityType)!.add(event.entityId);
          }
          
          // Update directly visited index
          state.graph.directlyVisitedVertices.add(event.entityId);
          
          // Update metadata
          state.graph.metadata.lastUpdated = event.timestamp;
          state.graph.metadata.totalVisits += 1;
          state.graph.metadata.uniqueEntitiesVisited = state.graph.directlyVisitedVertices.size;
        }),
      
      addRelationship: (event: RelationshipDiscoveryEvent) =>
        set((state) => {
          const edgeId = generateEdgeId(event.sourceEntityId, event.targetEntityId, event.relationshipType);
          
          // Don't add duplicate edges
          if (state.graph.edges.has(edgeId)) {
            return;
          }
          
          // Ensure both vertices exist (at least as discovered entities)
          if (!state.graph.vertices.has(event.sourceEntityId)) {
            // This shouldn't happen in normal flow, but handle gracefully
            return;
          }
          
          if (!state.graph.vertices.has(event.targetEntityId)) {
            // Create a discovered (not directly visited) vertex
            // This would need entity type and display name from the event metadata
            const targetEntityType = event.metadata?.targetEntityType as EntityType;
            const targetDisplayName = event.metadata?.targetDisplayName as string;
            
            if (!targetEntityType || !targetDisplayName) {
              return; // Can't create vertex without basic info
            }
            
            const discoveredVertex: EntityGraphVertex = {
              id: event.targetEntityId,
              entityType: targetEntityType,
              displayName: targetDisplayName,
              directlyVisited: false,
              firstSeen: event.timestamp,
              visitCount: 0,
              metadata: event.metadata || {},
            };
            
            state.graph.vertices.set(event.targetEntityId, discoveredVertex);
            
            // Update indices
            if (!state.graph.verticesByType.has(targetEntityType)) {
              state.graph.verticesByType.set(targetEntityType, new Set());
            }
            state.graph.verticesByType.get(targetEntityType)!.add(event.targetEntityId);
          }
          
          // Create the edge
          const edge: EntityGraphEdge = {
            id: edgeId,
            sourceId: event.sourceEntityId,
            targetId: event.targetEntityId,
            edgeType: event.relationshipType,
            weight: 0.5, // Default weight, could be computed based on relationship strength
            discoveredFromDirectVisit: state.graph.directlyVisitedVertices.has(event.sourceEntityId),
            discoveredAt: event.timestamp,
            metadata: {
              source: event.source,
              confidence: event.metadata?.confidence as number,
              context: event.metadata?.context as string,
            },
          };
          
          state.graph.edges.set(edgeId, edge);
          
          // Update edge indices
          if (!state.graph.edgesBySource.has(event.sourceEntityId)) {
            state.graph.edgesBySource.set(event.sourceEntityId, new Set());
          }
          state.graph.edgesBySource.get(event.sourceEntityId)!.add(edgeId);
          
          if (!state.graph.edgesByTarget.has(event.targetEntityId)) {
            state.graph.edgesByTarget.set(event.targetEntityId, new Set());
          }
          state.graph.edgesByTarget.get(event.targetEntityId)!.add(edgeId);
          
          // Update metadata
          state.graph.metadata.lastUpdated = event.timestamp;
        }),
      
      removeVertex: (vertexId: string) =>
        set((state) => {
          const vertex = state.graph.vertices.get(vertexId);
          if (!vertex) return;
          
          // Remove all connected edges
          const connectedEdges = [
            ...(state.graph.edgesBySource.get(vertexId) || []),
            ...(state.graph.edgesByTarget.get(vertexId) || []),
          ];
          
          for (const edgeId of connectedEdges) {
            const edge = state.graph.edges.get(edgeId);
            if (edge) {
              state.graph.edges.delete(edgeId);
              state.graph.edgesBySource.get(edge.sourceId)?.delete(edgeId);
              state.graph.edgesByTarget.get(edge.targetId)?.delete(edgeId);
            }
          }
          
          // Remove vertex
          state.graph.vertices.delete(vertexId);
          state.graph.directlyVisitedVertices.delete(vertexId);
          state.graph.verticesByType.get(vertex.entityType)?.delete(vertexId);
          
          // Clear selection if this vertex was selected
          if (state.selectedVertexId === vertexId) {
            state.selectedVertexId = null;
          }
          if (state.hoveredVertexId === vertexId) {
            state.hoveredVertexId = null;
          }
          
          // Update metadata
          state.graph.metadata.lastUpdated = new Date().toISOString();
          state.graph.metadata.uniqueEntitiesVisited = state.graph.directlyVisitedVertices.size;
        }),
      
      removeEdge: (edgeId: string) =>
        set((state) => {
          const edge = state.graph.edges.get(edgeId);
          if (!edge) return;
          
          state.graph.edges.delete(edgeId);
          state.graph.edgesBySource.get(edge.sourceId)?.delete(edgeId);
          state.graph.edgesByTarget.get(edge.targetId)?.delete(edgeId);
          
          state.graph.metadata.lastUpdated = new Date().toISOString();
        }),
      
      clearGraph: () =>
        set((state) => {
          state.graph = createEmptyGraph();
          state.selectedVertexId = null;
          state.hoveredVertexId = null;
        }),
      
      // Actions - Selection and interaction
      selectVertex: (vertexId: string | null) =>
        set((state) => {
          state.selectedVertexId = vertexId;
        }),
      
      hoverVertex: (vertexId: string | null) =>
        set((state) => {
          state.hoveredVertexId = vertexId;
        }),
      
      // Actions - Filtering and layout
      updateFilter: (options: Partial<GraphFilterOptions>) =>
        set((state) => {
          if (options.entityTypes !== undefined) state.filterOptions.entityTypes = options.entityTypes;
          if (options.edgeTypes !== undefined) state.filterOptions.edgeTypes = options.edgeTypes;
          if (options.directlyVisitedOnly !== undefined) state.filterOptions.directlyVisitedOnly = options.directlyVisitedOnly;
          if (options.maxHopsFromVisited !== undefined) state.filterOptions.maxHopsFromVisited = options.maxHopsFromVisited;
          if (options.minVisitCount !== undefined) state.filterOptions.minVisitCount = options.minVisitCount;
          if (options.minCitationCount !== undefined) state.filterOptions.minCitationCount = options.minCitationCount;
          if (options.dateRange !== undefined) state.filterOptions.dateRange = options.dateRange;
        }),
      
      updateLayout: (config: Partial<GraphLayoutConfig>) =>
        set((state) => {
          if (config.algorithm !== undefined) state.layoutConfig.algorithm = config.algorithm;
          if (config.separateVisitedEntities !== undefined) state.layoutConfig.separateVisitedEntities = config.separateVisitedEntities;
          if (config.clusterByEntityType !== undefined) state.layoutConfig.clusterByEntityType = config.clusterByEntityType;
          if (config.sizeByVisitCount !== undefined) state.layoutConfig.sizeByVisitCount = config.sizeByVisitCount;
          if (config.weightEdgesByStrength !== undefined) state.layoutConfig.weightEdgesByStrength = config.weightEdgesByStrength;
          if (config.maxVertices !== undefined) state.layoutConfig.maxVertices = config.maxVertices;
          if (config.minEdgeWeight !== undefined) state.layoutConfig.minEdgeWeight = config.minEdgeWeight;
        }),
      
      resetFilters: () =>
        set((state) => {
          state.filterOptions.entityTypes = defaultFilterOptions.entityTypes;
          state.filterOptions.edgeTypes = defaultFilterOptions.edgeTypes;
          state.filterOptions.directlyVisitedOnly = defaultFilterOptions.directlyVisitedOnly;
          state.filterOptions.maxHopsFromVisited = defaultFilterOptions.maxHopsFromVisited;
          state.filterOptions.minVisitCount = defaultFilterOptions.minVisitCount;
          state.filterOptions.minCitationCount = defaultFilterOptions.minCitationCount;
          state.filterOptions.dateRange = defaultFilterOptions.dateRange;
        }),
      
      // Actions - View state
      toggleGraphVisibility: () =>
        set((state) => {
          state.isGraphVisible = !state.isGraphVisible;
        }),
      
      toggleFullscreen: () =>
        set((state) => {
          state.isFullscreen = !state.isFullscreen;
        }),
      
      // Computed data
      getFilteredVertices: () => {
        const state = get();
        const { filterOptions, graph } = state;
        
        let vertices = Array.from(graph.vertices.values());
        
        // Filter by entity types
        if (filterOptions.entityTypes && filterOptions.entityTypes.length > 0) {
          vertices = vertices.filter(v => filterOptions.entityTypes!.includes(v.entityType));
        }
        
        // Filter by direct visits only
        if (filterOptions.directlyVisitedOnly) {
          vertices = vertices.filter(v => v.directlyVisited);
        }
        
        // Filter by minimum visit count
        if (filterOptions.minVisitCount && filterOptions.minVisitCount > 0) {
          vertices = vertices.filter(v => v.visitCount >= filterOptions.minVisitCount!);
        }
        
        // Filter by minimum citation count
        if (filterOptions.minCitationCount && filterOptions.minCitationCount > 0) {
          vertices = vertices.filter(v => 
            !v.metadata.citedByCount || v.metadata.citedByCount >= filterOptions.minCitationCount!
          );
        }
        
        // Filter by date range
        if (filterOptions.dateRange) {
          const fromDate = new Date(filterOptions.dateRange.from);
          const toDate = new Date(filterOptions.dateRange.to);
          
          vertices = vertices.filter(v => {
            const vertexDate = new Date(v.lastVisited || v.firstSeen);
            return vertexDate >= fromDate && vertexDate <= toDate;
          });
        }
        
        // Filter by hops from visited entities
        if (filterOptions.maxHopsFromVisited !== undefined && filterOptions.maxHopsFromVisited >= 0) {
          const directlyVisited = vertices.filter(v => v.directlyVisited);
          const reachableVertices = new Set<string>();
          
          // Add directly visited vertices
          directlyVisited.forEach(v => reachableVertices.add(v.id));
          
          // BFS to find vertices within specified hops
          const queue: Array<{ vertexId: string; distance: number }> = 
            directlyVisited.map(v => ({ vertexId: v.id, distance: 0 }));
          
          while (queue.length > 0) {
            const { vertexId, distance } = queue.shift()!;
            
            if (distance >= filterOptions.maxHopsFromVisited!) continue;
            
            const outgoingEdges = graph.edgesBySource.get(vertexId) || new Set();
            const incomingEdges = graph.edgesByTarget.get(vertexId) || new Set();
            
            for (const edgeId of [...outgoingEdges, ...incomingEdges]) {
              const edge = graph.edges.get(edgeId);
              if (!edge) continue;
              
              const neighborId = edge.sourceId === vertexId ? edge.targetId : edge.sourceId;
              
              if (!reachableVertices.has(neighborId)) {
                reachableVertices.add(neighborId);
                queue.push({ vertexId: neighborId, distance: distance + 1 });
              }
            }
          }
          
          vertices = vertices.filter(v => reachableVertices.has(v.id));
        }
        
        return vertices;
      },
      
      getFilteredEdges: () => {
        const state = get();
        const { filterOptions, graph } = state;
        const filteredVertices = state.getFilteredVertices();
        const filteredVertexIds = new Set(filteredVertices.map(v => v.id));
        
        let edges = Array.from(graph.edges.values());
        
        // Only include edges between filtered vertices
        edges = edges.filter(e => 
          filteredVertexIds.has(e.sourceId) && filteredVertexIds.has(e.targetId)
        );
        
        // Filter by edge types
        if (filterOptions.edgeTypes && filterOptions.edgeTypes.length > 0) {
          edges = edges.filter(e => filterOptions.edgeTypes!.includes(e.edgeType));
        }
        
        return edges;
      },
      
      getGraphStatistics: () => {
        const state = get();
        const { graph } = state;
        
        const vertices = Array.from(graph.vertices.values());
        const edges = Array.from(graph.edges.values());
        
        // Entity type distribution
        const entityTypeDistribution: Record<EntityType, number> = {} as Record<EntityType, number>;
        for (const vertex of vertices) {
          entityTypeDistribution[vertex.entityType] = (entityTypeDistribution[vertex.entityType] || 0) + 1;
        }
        
        // Edge type distribution
        const edgeTypeDistribution: Record<EdgeType, number> = {} as Record<EdgeType, number>;
        for (const edge of edges) {
          edgeTypeDistribution[edge.edgeType] = (edgeTypeDistribution[edge.edgeType] || 0) + 1;
        }
        
        // Most connected vertices
        const vertexDegrees = new Map<string, number>();
        for (const edge of edges) {
          vertexDegrees.set(edge.sourceId, (vertexDegrees.get(edge.sourceId) || 0) + 1);
          vertexDegrees.set(edge.targetId, (vertexDegrees.get(edge.targetId) || 0) + 1);
        }
        
        const mostConnectedVertices = Array.from(vertexDegrees.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([vertexId, degree]) => ({
            vertexId,
            degree,
            displayName: graph.vertices.get(vertexId)?.displayName || 'Unknown',
          }));
        
        // Most visited entities
        const mostVisitedEntities = vertices
          .filter(v => v.directlyVisited)
          .sort((a, b) => b.visitCount - a.visitCount)
          .slice(0, 10)
          .map(v => ({
            vertexId: v.id,
            visitCount: v.visitCount,
            displayName: v.displayName,
          }));
        
        // Recent activity
        const recentActivity = vertices
          .filter(v => v.lastVisited)
          .sort((a, b) => new Date(b.lastVisited!).getTime() - new Date(a.lastVisited!).getTime())
          .slice(0, 10)
          .map(v => ({
            vertexId: v.id,
            lastVisited: v.lastVisited!,
            displayName: v.displayName,
          }));
        
        return {
          totalVertices: vertices.length,
          totalEdges: edges.length,
          directlyVisitedCount: graph.directlyVisitedVertices.size,
          entityTypeDistribution,
          edgeTypeDistribution,
          mostConnectedVertices,
          mostVisitedEntities,
          recentActivity,
          connectedComponents: 1, // Simplified - would need proper algorithm
          clusteringCoefficient: 0, // Simplified - would need proper algorithm
        };
      },
      
      findShortestPath: (sourceId: string, targetId: string) => {
        const state = get();
        const { graph } = state;
        
        // Simplified BFS implementation
        if (!graph.vertices.has(sourceId) || !graph.vertices.has(targetId)) {
          return null;
        }
        
        const queue: Array<{ vertexId: string; path: string[]; distance: number; totalWeight: number }> = [
          { vertexId: sourceId, path: [sourceId], distance: 0, totalWeight: 0 }
        ];
        const visited = new Set<string>([sourceId]);
        
        while (queue.length > 0) {
          const current = queue.shift()!;
          
          if (current.vertexId === targetId) {
            const pathVertices = current.path.map(id => graph.vertices.get(id)!);
            const edgeTypes: EdgeType[] = [];
            
            for (let i = 0; i < current.path.length - 1; i++) {
              const sourceVertexId = current.path[i];
              const targetVertexId = current.path[i + 1];
              
              // Find the edge between these vertices
              const outgoingEdges = graph.edgesBySource.get(sourceVertexId) || new Set();
              for (const edgeId of outgoingEdges) {
                const edge = graph.edges.get(edgeId);
                if (edge && edge.targetId === targetVertexId) {
                  edgeTypes.push(edge.edgeType);
                  break;
                }
              }
            }
            
            return {
              vertex: pathVertices[pathVertices.length - 1],
              path: pathVertices,
              distance: current.distance,
              pathWeight: current.totalWeight,
              edgeTypes,
            };
          }
          
          // Explore neighbors
          const outgoingEdges = graph.edgesBySource.get(current.vertexId) || new Set();
          const incomingEdges = graph.edgesByTarget.get(current.vertexId) || new Set();
          
          for (const edgeId of [...outgoingEdges, ...incomingEdges]) {
            const edge = graph.edges.get(edgeId);
            if (!edge) continue;
            
            const neighborId = edge.sourceId === current.vertexId ? edge.targetId : edge.sourceId;
            
            if (!visited.has(neighborId)) {
              visited.add(neighborId);
              queue.push({
                vertexId: neighborId,
                path: [...current.path, neighborId],
                distance: current.distance + 1,
                totalWeight: current.totalWeight + edge.weight,
              });
            }
          }
        }
        
        return null;
      },
      
      getNeighbors: (vertexId: string, hops = 1) => {
        const state = get();
        const { graph } = state;
        
        const neighbors = new Set<string>();
        const queue: Array<{ vertexId: string; distance: number }> = [{ vertexId, distance: 0 }];
        const visited = new Set<string>([vertexId]);
        
        while (queue.length > 0) {
          const current = queue.shift()!;
          
          if (current.distance >= hops) continue;
          
          const outgoingEdges = graph.edgesBySource.get(current.vertexId) || new Set();
          const incomingEdges = graph.edgesByTarget.get(current.vertexId) || new Set();
          
          for (const edgeId of [...outgoingEdges, ...incomingEdges]) {
            const edge = graph.edges.get(edgeId);
            if (!edge) continue;
            
            const neighborId = edge.sourceId === current.vertexId ? edge.targetId : edge.sourceId;
            
            if (!visited.has(neighborId)) {
              visited.add(neighborId);
              neighbors.add(neighborId);
              queue.push({ vertexId: neighborId, distance: current.distance + 1 });
            }
          }
        }
        
        return Array.from(neighbors)
          .map(id => graph.vertices.get(id))
          .filter((vertex): vertex is EntityGraphVertex => vertex !== undefined);
      },
      
      // Utility functions
      hasVertex: (entityId: string) => {
        const state = get();
        return state.graph.vertices.has(entityId);
      },
      
      hasEdge: (sourceId: string, targetId: string, edgeType: EdgeType) => {
        const state = get();
        const edgeId = generateEdgeId(sourceId, targetId, edgeType);
        return state.graph.edges.has(edgeId);
      },
      
      getVertexDegree: (vertexId: string) => {
        const state = get();
        const { graph } = state;
        
        const outgoing = graph.edgesBySource.get(vertexId)?.size || 0;
        const incoming = graph.edgesByTarget.get(vertexId)?.size || 0;
        
        return outgoing + incoming;
      },
    }))
);