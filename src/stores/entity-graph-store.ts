import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type { 
  GraphEngineType, 
  GraphEngineSettings 
} from '@/components/organisms/graph-engines';
import { 
  loadEntityGraphFromSimpleStorage, 
  getSimpleGraphMetadata, 
  saveEntityToSimpleStorage, 
  saveEdgeToSimpleStorage 
} from '@/lib/entity-graph-sync';
import type {
  EntityGraph,
  EntityGraphVertex,
  EntityGraphEdge,
  EntityVisitEvent,
  EntityEncounterEvent,
  RelationshipDiscoveryEvent,
  GraphFilterOptions,
  GraphLayoutConfig,
  GraphStatistics,
  GraphTraversalResult,
  EntityType,
  EntityEncounter,
} from '@/types/entity-graph';
import {
  EdgeType,
  EncounterType,
  DEFAULT_MAX_VERTICES,
  DEFAULT_MIN_EDGE_WEIGHT,
  DEFAULT_MAX_HOPS,
  generateEdgeId
} from '@/types/entity-graph';

interface FindShortestPathParams {
  sourceId: string;
  targetId: string;
}

interface GetNeighborsParams {
  vertexId: string;
  hops?: number;
}

interface HasEdgeParams {
  sourceId: string;
  targetId: string;
  edgeType: EdgeType;
}

interface EntityGraphState {
  // Core graph data
  graph: EntityGraph;
  
  // Loading state
  isHydrated: boolean;
  isLoading: boolean;
  
  // UI state
  selectedVertexId: string | null;
  hoveredVertexId: string | null;
  filterOptions: GraphFilterOptions;
  layoutConfig: GraphLayoutConfig;
  
  // View state
  isGraphVisible: boolean;
  isFullscreen: boolean;
  
  // Engine state
  preferredEngine: GraphEngineType;
  engineSettings: Partial<GraphEngineSettings>;
  enginePreferences: {
    rememberPerSession: boolean;
    autoOptimiseForSize: boolean;
    showPerformanceWarnings: boolean;
  };
  
  // Actions - Graph management
  hydrateFromIndexedDB: () => Promise<void>;
  visitEntity: (event: EntityVisitEvent) => Promise<void>;
  recordEntityEncounter: (event: EntityEncounterEvent) => void;
  addRelationship: (event: RelationshipDiscoveryEvent) => Promise<void>;
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
  
  // Actions - Engine management
  setPreferredEngine: (engine: GraphEngineType) => void;
  updateEngineSettings: (settings: Partial<GraphEngineSettings>) => void;
  updateEnginePreferences: (preferences: Record<string, unknown>) => void;
  getRecommendedEngine: () => GraphEngineType;
  
  // Computed data
  getFilteredVertices: () => EntityGraphVertex[];
  getFilteredEdges: () => EntityGraphEdge[];
  getGraphStatistics: () => GraphStatistics;
  findShortestPath: (params: FindShortestPathParams) => GraphTraversalResult | null;
  getNeighbors: (params: GetNeighborsParams) => EntityGraphVertex[];
  
  // Utility functions
  hasVertex: (entityId: string) => boolean;
  hasEdge: (params: HasEdgeParams) => boolean;
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

// Default engine preferences
const defaultEnginePreferences = {
  rememberPerSession: true,
  autoOptimiseForSize: true,
  showPerformanceWarnings: true,
};

export const useEntityGraphStore = create<EntityGraphState>()(
  persist(
    immer((set, get) => ({
        // Initial state
        graph: createEmptyGraph(),
        isHydrated: false,
        isLoading: false,
        selectedVertexId: null,
        hoveredVertexId: null,
        filterOptions: defaultFilterOptions,
        layoutConfig: defaultLayoutConfig,
        isGraphVisible: false,
        isFullscreen: false,
        
        // Engine state
        preferredEngine: 'canvas-2d' as GraphEngineType,
        engineSettings: {},
        enginePreferences: defaultEnginePreferences,
      
      // Actions - Graph management
      hydrateFromIndexedDB: async () => {
        set((state) => {
          state.isLoading = true;
        });
        
        try {
          const {
            vertices,
            edges,
            edgesBySource,
            edgesByTarget,
            verticesByType,
            directlyVisitedVertices,
          } = await loadEntityGraphFromSimpleStorage();
          
          const metadata = await getSimpleGraphMetadata();
          
          set((state) => {
            state.graph = {
              vertices,
              edges,
              edgesBySource,
              edgesByTarget,
              verticesByType,
              directlyVisitedVertices,
              metadata,
            };
            state.isHydrated = true;
            state.isLoading = false;
          });
          
          console.log(`[EntityGraphStore] Hydrated from simple storage: ${vertices.size} vertices, ${edges.size} edges, ${directlyVisitedVertices.size} visited`);
        } catch (error) {
          console.error('[EntityGraphStore] Failed to hydrate from simple storage:', error);
          set((state) => {
            state.isLoading = false;
            state.isHydrated = true; // Mark as hydrated even on error to prevent retry loops
          });
        }
      },
      
      visitEntity: async (event: EntityVisitEvent) => {
        console.log(`[EntityGraphStore] Visiting entity ${event.entityId} (${event.displayName})`);
        // First update the in-memory store
        set((state) => {
          const existingVertex = state.graph.vertices.get(event.entityId);
          
          if (existingVertex) {
            // Update existing vertex
            existingVertex.directlyVisited = true;
            existingVertex.lastVisited = event.timestamp;
            existingVertex.visitCount += 1;
            existingVertex.metadata.url = event.metadata?.url as string;
            
            // Add visit encounter
            const context: EntityEncounter['context'] = {};
            if (event.source === 'link' && event.metadata?.sourceEntityId) {
              context.sourceEntityId = event.metadata.sourceEntityId as string;
            }
            if (event.metadata) {
              context.additionalInfo = event.metadata;
            }

            const visitEncounter: EntityEncounter = {
              type: EncounterType.DIRECT_VISIT,
              timestamp: event.timestamp,
              context,
            };
            existingVertex.encounters.push(visitEncounter);
            
            // Update encounter stats
            existingVertex.encounterStats.totalEncounters += 1;
            existingVertex.encounterStats.lastEncounter = event.timestamp;
            
            // Update display name if we have better data
            if (event.displayName && 
                !event.displayName.includes('loading') && 
                !event.displayName.includes('Loading')) {
              existingVertex.displayName = event.displayName;
            }
          } else {
            // Create new vertex
            const context: EntityEncounter['context'] = {};
            if (event.source === 'link' && event.metadata?.sourceEntityId) {
              context.sourceEntityId = event.metadata.sourceEntityId as string;
            }
            if (event.metadata) {
              context.additionalInfo = event.metadata;
            }

            const visitEncounter: EntityEncounter = {
              type: EncounterType.DIRECT_VISIT,
              timestamp: event.timestamp,
              context,
            };
            
            const newVertex: EntityGraphVertex = {
              id: event.entityId,
              entityType: event.entityType,
              displayName: event.displayName,
              directlyVisited: true,
              firstSeen: event.timestamp,
              lastVisited: event.timestamp,
              visitCount: 1,
              encounters: [visitEncounter],
              encounterStats: {
                totalEncounters: 1,
                searchResultCount: 0,
                relatedEntityCount: 0,
                lastEncounter: event.timestamp,
              },
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
          
          console.log(`[EntityGraphStore] After visiting entity - Total vertices: ${state.graph.vertices.size}, Total edges: ${state.graph.edges.size}`);
          console.log(`[EntityGraphStore] Visited vertices: ${state.graph.directlyVisitedVertices.size}`);
        });
        
        // Then persist to simple storage (only ID, displayName)
        try {
          await saveEntityToSimpleStorage(
            event.entityId, 
            event.entityType, 
            event.displayName, 
            true // Mark as visited
          );
        } catch (error) {
          console.warn('[EntityGraphStore] Failed to persist entity visit to simple storage:', error);
        }
      },
      
      recordEntityEncounter: async (event: EntityEncounterEvent) => {
        // First update the in-memory store
        set((state) => {
          const existingVertex = state.graph.vertices.get(event.entityId);
          
          const encounter: EntityEncounter = {
            type: event.encounterType,
            timestamp: event.timestamp,
            context: event.context,
          };
          
          if (existingVertex) {
            // Update existing vertex with new encounter
            existingVertex.encounters.push(encounter);
            existingVertex.encounterStats.totalEncounters += 1;
            existingVertex.encounterStats.lastEncounter = event.timestamp;
            
            // Update specific encounter type counts and timestamps
            if (event.encounterType === EncounterType.SEARCH_RESULT) {
              existingVertex.encounterStats.searchResultCount += 1;
              if (!existingVertex.encounterStats.firstSearchResult) {
                existingVertex.encounterStats.firstSearchResult = event.timestamp;
              }
            } else if (event.encounterType === EncounterType.RELATED_ENTITY) {
              existingVertex.encounterStats.relatedEntityCount += 1;
              if (!existingVertex.encounterStats.firstRelatedEntity) {
                existingVertex.encounterStats.firstRelatedEntity = event.timestamp;
              }
            }
            
            // Update display name if we have better data
            if (event.displayName && 
                !event.displayName.includes('loading') && 
                !event.displayName.includes('Loading')) {
              existingVertex.displayName = event.displayName;
            }
          } else {
            // Create new vertex for encountered entity
            const newVertex: EntityGraphVertex = {
              id: event.entityId,
              entityType: event.entityType,
              displayName: event.displayName,
              directlyVisited: false,
              firstSeen: event.timestamp,
              visitCount: 0,
              encounters: [encounter],
              encounterStats: (() => {
                const stats: EntityGraphVertex['encounterStats'] = {
                  totalEncounters: 1,
                  searchResultCount: event.encounterType === EncounterType.SEARCH_RESULT ? 1 : 0,
                  relatedEntityCount: event.encounterType === EncounterType.RELATED_ENTITY ? 1 : 0,
                };

                if (event.timestamp) {
                  stats.lastEncounter = event.timestamp;
                }
                if (event.encounterType === EncounterType.SEARCH_RESULT) {
                  stats.firstSearchResult = event.timestamp;
                }
                if (event.encounterType === EncounterType.RELATED_ENTITY) {
                  stats.firstRelatedEntity = event.timestamp;
                }

                return stats;
              })(),
              metadata: event.metadata || {},
            };
            
            state.graph.vertices.set(event.entityId, newVertex);
            
            // Update indices
            if (!state.graph.verticesByType.has(event.entityType)) {
              state.graph.verticesByType.set(event.entityType, new Set());
            }
            state.graph.verticesByType.get(event.entityType)!.add(event.entityId);
          }
          
          // Update metadata
          state.graph.metadata.lastUpdated = event.timestamp;
        });
        
        // Then persist to simple storage (only ID, displayName if it's a new entity)
        try {
          await saveEntityToSimpleStorage(
            event.entityId,
            event.entityType,
            event.displayName,
            false // Not a direct visit, just encountered
          );
        } catch (error) {
          console.warn('[EntityGraphStore] Failed to persist entity encounter to simple storage:', error);
        }
      },
      
      addRelationship: async (event: RelationshipDiscoveryEvent) => {
        console.log(`[EntityGraphStore] Adding relationship: ${event.sourceEntityId} → ${event.targetEntityId} (${event.relationshipType})`);
        // First update the in-memory store
        set((state) => {
          const edgeId = generateEdgeId({ sourceId: event.sourceEntityId, targetId: event.targetEntityId, edgeType: event.relationshipType });
          
          // Early exit conditions - check before starting any mutations
          // Don't add duplicate edges
          if (state.graph.edges.has(edgeId)) {
            return; // Safe - no mutations yet
          }
          
          // Ensure source vertex exists (at least as discovered entities)
          if (!state.graph.vertices.has(event.sourceEntityId)) {
            // This shouldn't happen in normal flow, but handle gracefully
            return; // Safe - no mutations yet
          }
          
          // Check target vertex and validate metadata early
          if (!state.graph.vertices.has(event.targetEntityId)) {
            const targetEntityType = event.metadata?.targetEntityType as EntityType;
            const targetDisplayName = event.metadata?.targetDisplayName as string;
            
            if (!targetEntityType || !targetDisplayName) {
              return; // Safe - no mutations yet, can't create vertex without basic info
            }
            
            // Now we can safely mutate - create the discovered vertex
            console.log(`[EntityGraphStore] Creating new discovered vertex: ${event.targetEntityId} (${targetDisplayName})`);
            
            const context: EntityEncounter['context'] = {
              sourceEntityId: event.sourceEntityId,
              relationshipType: event.relationshipType,
            };
            if (event.metadata) {
              context.additionalInfo = event.metadata;
            }

            const discoveryEncounter: EntityEncounter = {
              type: EncounterType.RELATIONSHIP_DISCOVERY,
              timestamp: event.timestamp,
              context,
            };
            
            const discoveredVertex: EntityGraphVertex = {
              id: event.targetEntityId,
              entityType: targetEntityType,
              displayName: targetDisplayName,
              directlyVisited: false,
              firstSeen: event.timestamp,
              visitCount: 0,
              encounters: [discoveryEncounter],
              encounterStats: {
                totalEncounters: 1,
                searchResultCount: 0,
                relatedEntityCount: 0,
                lastEncounter: event.timestamp,
              },
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
            source: event.sourceEntityId,
            target: event.targetEntityId,
            edgeType: event.relationshipType,
            type: event.relationshipType,
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
          
          // Debug log final graph state
          console.log(`[EntityGraphStore] After adding relationship - Total vertices: ${state.graph.vertices.size}, Total edges: ${state.graph.edges.size}`);
          console.log(`[EntityGraphStore] Edge added: ${edgeId} (${event.sourceEntityId} → ${event.targetEntityId})`);
        });
        
        // Then persist to simple storage (only edge data)
        try {
          const edgeId = generateEdgeId({ sourceId: event.sourceEntityId, targetId: event.targetEntityId, edgeType: event.relationshipType });
          
          // First save the target entity if it was just discovered
          const targetVertex = get().graph.vertices.get(event.targetEntityId);
          if (targetVertex) {
            await saveEntityToSimpleStorage(
              targetVertex.id,
              targetVertex.entityType,
              targetVertex.displayName,
              false // Not visited, just discovered
            );
          }
          
          // Save the edge
          await saveEdgeToSimpleStorage(
            event.sourceEntityId,
            event.targetEntityId,
            event.relationshipType,
            edgeId
          );
        } catch (error) {
          console.warn('[EntityGraphStore] Failed to persist relationship to simple storage:', error);
        }
      },
      
      removeVertex: (vertexId: string) =>
        set((state) => {
          const vertex = state.graph.vertices.get(vertexId);
          if (!vertex) return; // Safe - only reading state, no mutations yet
          
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
          if (!edge) return; // Safe - only reading state, no mutations yet
          
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
          delete state.filterOptions.entityTypes;
          delete state.filterOptions.edgeTypes;
          delete state.filterOptions.dateRange;
          state.filterOptions.directlyVisitedOnly = false;
          state.filterOptions.maxHopsFromVisited = DEFAULT_MAX_HOPS;
          state.filterOptions.minVisitCount = 0;
          state.filterOptions.minCitationCount = 0;
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
      
      // Actions - Engine management
      setPreferredEngine: (engine: GraphEngineType) =>
        set((state) => {
          state.preferredEngine = engine;
        }),
        
      updateEngineSettings: (settings: Partial<GraphEngineSettings>) =>
        set((state) => {
          state.engineSettings = { ...state.engineSettings, ...settings };
        }),
        
      updateEnginePreferences: (preferences) =>
        set((state) => {
          state.enginePreferences = { ...state.enginePreferences, ...preferences };
        }),
        
      getRecommendedEngine: (): GraphEngineType => {
        const state = get();
        const { graph, enginePreferences, preferredEngine } = state;
        
        // If auto-optimisation is disabled, return preferred
        if (!enginePreferences.autoOptimiseForSize) {
          return preferredEngine;
        }
        
        // Recommend based on graph size
        const vertexCount = graph.vertices.size;
        const edgeCount = graph.edges.size;
        
        // Large graphs -> XYFlow for performance
        if (vertexCount > 5000 || edgeCount > 10000) {
          return 'xyflow';
        }

        // Medium graphs -> XYFlow for balance
        if (vertexCount > 1000 || edgeCount > 2000) {
          return 'xyflow';
        }

        // Small graphs -> XYFlow for interactivity
        if (vertexCount > 100) {
          return 'xyflow';
        }
        
        // Very small graphs -> SVG for scalability
        return 'svg';
      },
      
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
      
      findShortestPath: ({ sourceId, targetId }) => {
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

              if (!sourceVertexId || !targetVertexId) continue;

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
            
            const targetVertex = pathVertices[pathVertices.length - 1];
            if (!targetVertex) {
              return null;
            }

            return {
              vertex: targetVertex,
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
      
      getNeighbors: ({ vertexId, hops = 1 }) => {
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
      
      hasEdge: ({ sourceId, targetId, edgeType }) => {
        const state = get();
        const edgeId = generateEdgeId({ sourceId, targetId, edgeType });
        return state.graph.edges.has(edgeId);
      },
      
      getVertexDegree: (vertexId: string) => {
        const state = get();
        const { graph } = state;
        
        const outgoing = graph.edgesBySource.get(vertexId)?.size || 0;
        const incoming = graph.edgesByTarget.get(vertexId)?.size || 0;
        
        return outgoing + incoming;
      },
    })),
    {
      name: 'academic-explorer-entity-graph',
      storage: createJSONStorage(() => localStorage),
      // Only persist engine-related settings and preferences
      partialize: (state) => ({
        preferredEngine: state.preferredEngine,
        engineSettings: state.engineSettings,
        enginePreferences: state.enginePreferences,
        filterOptions: state.filterOptions,
        layoutConfig: state.layoutConfig,
        isGraphVisible: state.isGraphVisible,
      }),
    }
  )
);