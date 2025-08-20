/**
 * CustomSVG Engine Adapter Layer
 * 
 * Bridges between the standardized IGraphEngine interface and the existing
 * SVG graph components. Handles data format conversion, lifecycle management,
 * and integration with existing force simulation and layout systems.
 */

import React from 'react';

import type { 
  EntityGraphVertex, 
  EntityGraphEdge, 
  EntityType,
  EdgeType
} from '@/types/entity-graph';
// Existing component imports
import type { 
  PositionedVertex,
  SimulationConfig 
} from '../../../graph-layout/force-simulation';
import { 
  createForceSimulation,
  createCircularLayout 
} from '../../../graph-layout/force-simulation';
import type {
  IGraph,
  IVertex,
  IEdge,
  IPosition,
  IDimensions,
  IPositionedVertex,
  IGraphConfig as _IGraphConfig,
} from '../../interfaces';
import type { IEngineConfig, IEngineEvent, IEngineEventHandlers } from '../types';

// ============================================================================
// Data Format Conversion Utilities
// ============================================================================

/**
 * Convert generic IVertex to EntityGraphVertex (existing format)
 */
// eslint-disable-next-line complexity
export function convertVertexToEntity<TData = unknown>(
  vertex: IVertex<TData>
): EntityGraphVertex {
  // Extract entity-specific properties from metadata or data
  const data = (vertex.data as any) || {};
  const metadata = (vertex.metadata as any) || {};
  
  return {
    id: vertex.id,
    entityType: (metadata.entityType || data?.entityType || 'work') as EntityType,
    displayName: vertex.label || data?.displayName || vertex.id,
    directlyVisited: Boolean(data?.directlyVisited || metadata.directlyVisited),
    firstSeen: String(data?.firstSeen || metadata.firstSeen || new Date().toISOString()),
    lastVisited: data?.lastVisited || metadata.lastVisited || undefined,
    visitCount: Number(data?.visitCount || metadata.visitCount || 0),
    encounters: Array.isArray(data?.encounters) ? data.encounters : 
                Array.isArray(metadata.encounters) ? metadata.encounters : [],
    encounterStats: (data?.encounterStats || metadata.encounterStats) ? {
      totalEncounters: Number((data?.encounterStats || metadata.encounterStats)?.totalEncounters || 0),
      searchResultCount: Number((data?.encounterStats || metadata.encounterStats)?.searchResultCount || 0),
      relatedEntityCount: Number((data?.encounterStats || metadata.encounterStats)?.relatedEntityCount || 0),
    } : {
      totalEncounters: 0,
      searchResultCount: 0,
      relatedEntityCount: 0,
    },
    metadata: {
      url: data?.url || metadata.url || undefined,
      publicationYear: data?.publicationYear ? Number(data.publicationYear) : 
                      metadata.publicationYear ? Number(metadata.publicationYear) : undefined,
      citedByCount: data?.citedByCount ? Number(data.citedByCount) : 
                   metadata.citedByCount ? Number(metadata.citedByCount) : undefined,
      isOpenAccess: data?.isOpenAccess !== undefined ? Boolean(data.isOpenAccess) : 
                   metadata.isOpenAccess !== undefined ? Boolean(metadata.isOpenAccess) : undefined,
      countryCode: data?.countryCode ? String(data.countryCode) : 
                  metadata.countryCode ? String(metadata.countryCode) : undefined,
      summary: data?.summary ? String(data.summary) : 
              metadata.summary ? String(metadata.summary) : undefined,
    },
    position: (metadata.position || data?.position) ? {
      x: Number(
        (metadata.position as { x?: number })?.x ||
        (data?.position as { x?: number })?.x ||
        0
      ),
      y: Number(
        (metadata.position as { y?: number })?.y ||
        (data?.position as { y?: number })?.y ||
        0
      ),
    } : undefined,
  };
}

/**
 * Convert EntityGraphVertex back to generic IVertex
 */
export function convertEntityToVertex(
  entity: EntityGraphVertex
): IVertex {
  return {
    id: entity.id,
    label: entity.displayName,
    data: {
      ...entity.metadata,
      entityType: entity.entityType,
      displayName: entity.displayName,
      url: entity.metadata?.url,
      visitCount: entity.visitCount,
      directlyVisited: entity.directlyVisited,
    },
    metadata: {
      ...entity.metadata,
      entityType: entity.entityType,
      position: entity.position,
    },
  };
}

/**
 * Convert generic IEdge to EntityGraphEdge (existing format)
 */
export function convertEdgeToEntity<TData = unknown>(
  edge: IEdge<TData>
): EntityGraphEdge {
  const data = (edge.data as any) || {};
  const metadata = (edge.metadata as any) || {};
  
  return {
    id: edge.id,
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    source: edge.sourceId, // Compatibility field
    target: edge.targetId, // Compatibility field
    edgeType: (data?.edgeType || metadata.edgeType || 'related') as EdgeType,
    type: (data?.edgeType || metadata.edgeType || 'related') as EdgeType, // Compatibility field
    weight: Number(edge.weight || data?.weight || metadata.weight || 1),
    discoveredFromDirectVisit: Boolean(data?.discoveredFromDirectVisit || metadata.discoveredFromDirectVisit),
    discoveredAt: String(data?.discoveredAt || metadata.discoveredAt || new Date().toISOString()),
    metadata: {
      source: (data?.source || metadata.source || 'inferred') as 'openalex' | 'inferred' | 'user',
      confidence: data?.confidence || metadata.confidence,
      context: data?.context || metadata.context,
    },
  };
}

/**
 * Convert EntityGraphEdge back to generic IEdge
 */
export function convertEntityToEdge(
  entity: EntityGraphEdge
): IEdge {
  return {
    id: entity.id,
    sourceId: entity.sourceId,
    targetId: entity.targetId,
    weight: entity.weight,
    label: `${entity.edgeType}`, // Convert edgeType to label
    directed: true, // EntityGraph edges are typically directed
    data: {
      ...entity.metadata,
      relationType: entity.edgeType,
      weight: entity.weight,
    },
    metadata: entity.metadata,
  };
}

/**
 * Convert IGraph to existing entity graph format
 */
export function convertGraphToEntityFormat<TVertexData = unknown, TEdgeData = unknown>(
  graph: IGraph<TVertexData, TEdgeData>
): { vertices: EntityGraphVertex[]; edges: EntityGraphEdge[] } {
  return {
    vertices: graph.vertices.map(convertVertexToEntity),
    edges: graph.edges.map(convertEdgeToEntity),
  };
}

/**
 * Convert entity graph back to IGraph format
 */
export function convertEntityFormatToGraph(
  vertices: EntityGraphVertex[],
  edges: EntityGraphEdge[]
): IGraph {
  return {
    vertices: vertices.map(convertEntityToVertex),
    edges: edges.map(convertEntityToEdge),
    metadata: {},
  };
}

/**
 * Convert PositionedVertex to IPositionedVertex
 */
export function convertPositionedVertexToInterface(
  positioned: PositionedVertex
): IPositionedVertex {
  return {
    ...convertEntityToVertex(positioned),
    position: { x: positioned.x, y: positioned.y },
    velocity: positioned.vx !== undefined && positioned.vy !== undefined ? 
      { x: positioned.vx, y: positioned.vy } : undefined,
    fixed: false, // Could be extended based on entity properties
  };
}

/**
 * Convert IPositionedVertex to PositionedVertex
 */
export function convertInterfaceToPositionedVertex(
  positioned: IPositionedVertex
): PositionedVertex {
  const entity = convertVertexToEntity(positioned);
  return {
    ...entity,
    x: positioned.position.x,
    y: positioned.position.y,
    vx: positioned.velocity?.x || 0,
    vy: positioned.velocity?.y || 0,
  };
}

// ============================================================================
// Configuration Conversion
// ============================================================================

/**
 * Convert IEngineConfig to existing SimulationConfig
 */
export function convertToSimulationConfig(
  config: IEngineConfig,
  dimensions: IDimensions
): SimulationConfig {
  const layoutParams = config.layoutParameters || {};
  
  return {
    width: dimensions.width,
    height: dimensions.height,
    iterations: layoutParams.iterations as number || 150,
    repulsionStrength: layoutParams.repulsionStrength as number || 1000,
    attractionStrength: layoutParams.attractionStrength as number || 0.1,
    damping: layoutParams.damping as number || 0.9,
  };
}

/**
 * Extract layout-specific parameters from engine config
 */
export function extractLayoutParameters(
  config: IEngineConfig,
  layoutId: string
): Record<string, unknown> {
  const baseParams = config.layoutParameters || {};
  const engineOptions = config.engineOptions || {};
  const layoutSpecific = engineOptions[`${layoutId}Layout`] as Record<string, unknown> || {};
  
  return {
    ...baseParams,
    ...layoutSpecific,
  };
}

// ============================================================================
// Event System Bridge
// ============================================================================

/**
 * Convert React mouse event to IEngineEvent
 */
export function convertReactEventToEngineEvent(
  event: React.MouseEvent,
  containerElement: HTMLElement,
  graphPosition: IPosition,
  hitTest?: { vertex?: EntityGraphVertex; edge?: EntityGraphEdge }
): IEngineEvent {
  const rect = containerElement.getBoundingClientRect();
  const screenPosition = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
  
  return {
    type: event.type,
    screenPosition,
    graphPosition,
    timestamp: Date.now(),
    modifiers: {
      shift: event.shiftKey,
      ctrl: event.ctrlKey,
      alt: event.altKey,
      meta: event.metaKey,
    },
    originalEvent: event.nativeEvent,
    hitTest: hitTest ? {
      vertex: hitTest.vertex ? convertEntityToVertex(hitTest.vertex) : undefined,
      edge: hitTest.edge ? convertEntityToEdge(hitTest.edge) : undefined,
    } : undefined,
  };
}

/**
 * Event handler bridge that converts between formats
 */
export class EventBridge<TVertexData = unknown, TEdgeData = unknown> {
  constructor(
    private eventHandlers: IEngineEventHandlers<TVertexData, TEdgeData>
  ) {}
  
  /**
   * Handle vertex click events
   */
  handleVertexClick = (
    event: React.MouseEvent,
    vertex: EntityGraphVertex,
    containerElement: HTMLElement,
    graphPosition: IPosition
  ): void => {
    if (!this.eventHandlers.onVertexClick) return;
    
    const engineEvent = convertReactEventToEngineEvent(
      event, 
      containerElement, 
      graphPosition,
      { vertex }
    );
    
    const genericVertex = convertEntityToVertex(vertex);
    this.eventHandlers.onVertexClick(genericVertex as IVertex<any>, engineEvent);
  };
  
  /**
   * Handle edge click events
   */
  handleEdgeClick = (
    event: React.MouseEvent,
    edge: EntityGraphEdge,
    containerElement: HTMLElement,
    graphPosition: IPosition
  ): void => {
    if (!this.eventHandlers.onEdgeClick) return;
    
    const engineEvent = convertReactEventToEngineEvent(
      event,
      containerElement,
      graphPosition,
      { edge }
    );
    
    const genericEdge = convertEntityToEdge(edge);
    this.eventHandlers.onEdgeClick(genericEdge as IEdge<any>, engineEvent);
  };
  
  /**
   * Handle vertex hover events
   */
  handleVertexHover = (
    event: React.MouseEvent,
    vertex: EntityGraphVertex | undefined,
    containerElement: HTMLElement,
    graphPosition: IPosition
  ): void => {
    if (!this.eventHandlers.onVertexHover) return;
    
    const engineEvent = convertReactEventToEngineEvent(
      event,
      containerElement,
      graphPosition,
      vertex ? { vertex } : undefined
    );
    
    const genericVertex = vertex ? convertEntityToVertex(vertex) : undefined;
    this.eventHandlers.onVertexHover(genericVertex as IVertex<any> | undefined, engineEvent);
  };
  
  /**
   * Handle selection change events
   */
  handleSelectionChange = (
    selectedVertices: Set<string>,
    selectedEdges: Set<string>
  ): void => {
    if (!this.eventHandlers.onSelectionChange) return;
    
    this.eventHandlers.onSelectionChange(
      selectedVertices,
      selectedEdges
    );
  };
  
  /**
   * Handle viewport change events
   */
  handleViewportChange = (zoom: number, pan: IPosition): void => {
    if (!this.eventHandlers.onViewportChange) return;
    
    this.eventHandlers.onViewportChange(zoom, pan);
  };
  
  /**
   * Handle layout start events
   */
  handleLayoutStart = (layoutId: string): void => {
    if (!this.eventHandlers.onLayoutStart) return;
    
    this.eventHandlers.onLayoutStart(layoutId);
  };
  
  /**
   * Handle layout complete events
   */
  handleLayoutComplete = (layoutId: string, positions: ReadonlyMap<string, IPosition>): void => {
    if (!this.eventHandlers.onLayoutComplete) return;
    
    this.eventHandlers.onLayoutComplete(layoutId, positions);
  };
}

// ============================================================================
// Layout Algorithm Bridge
// ============================================================================

/**
 * Bridge to existing layout algorithms
 */
export class LayoutBridge {
  /**
   * Execute force-directed layout using existing implementation
   */
  static async executeForceDirected(
    vertices: EntityGraphVertex[],
    edges: EntityGraphEdge[],
    config: SimulationConfig
  ): Promise<PositionedVertex[]> {
    return new Promise((resolve) => {
      // Run synchronously but yield control periodically for responsiveness
      const result = createForceSimulation(vertices, edges, config);
      setTimeout(() => resolve(result), 0);
    });
  }
  
  /**
   * Execute circular layout using existing implementation
   */
  static async executeCircular(
    vertices: EntityGraphVertex[],
    width: number,
    height: number,
    _options: Record<string, unknown> = {}
  ): Promise<PositionedVertex[]> {
    return new Promise((resolve) => {
      const result = createCircularLayout(vertices, width, height);
      setTimeout(() => resolve(result), 0);
    });
  }
  
  /**
   * Execute grid layout (custom implementation)
   */
  static async executeGrid(
    vertices: EntityGraphVertex[],
    width: number,
    height: number,
    options: Record<string, unknown> = {}
  ): Promise<PositionedVertex[]> {
    return new Promise((resolve) => {
      const {
        columns = 0,
        rows = 0,
        cellWidth = 100,
        cellHeight = 100,
        centerGrid = true,
      } = options;
      
      const count = vertices.length;
      const cols = Number(columns) || Math.ceil(Math.sqrt(count));
      const actualRows = Number(rows) || Math.ceil(count / cols);
      const cellW = Number(cellWidth);
      const cellH = Number(cellHeight);
      
      const gridWidth = cols * cellW;
      const gridHeight = actualRows * cellH;
      
      const offsetX = centerGrid ? (width - gridWidth) / 2 : 0;
      const offsetY = centerGrid ? (height - gridHeight) / 2 : 0;
      
      const positioned: PositionedVertex[] = vertices.map((vertex, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        return {
          ...vertex,
          x: offsetX + col * cellW + cellW / 2,
          y: offsetY + row * cellH + cellH / 2,
          vx: 0,
          vy: 0,
        };
      });
      
      setTimeout(() => resolve(positioned), 0);
    });
  }
}

// ============================================================================
// Coordinate Transformation Utilities
// ============================================================================

/**
 * Coordinate transformation helper
 */
export class CoordinateTransform {
  constructor(
    private dimensions: IDimensions,
    private zoom: number = 1,
    private pan: IPosition = { x: 0, y: 0 }
  ) {}
  
  /**
   * Update transformation parameters
   */
  update(zoom: number, pan: IPosition): void {
    this.zoom = zoom;
    this.pan = pan;
  }
  
  /**
   * Convert screen coordinates to graph coordinates
   */
  screenToGraph(screenPosition: IPosition): IPosition {
    return {
      x: (screenPosition.x - this.pan.x) / this.zoom,
      y: (screenPosition.y - this.pan.y) / this.zoom,
    };
  }
  
  /**
   * Convert graph coordinates to screen coordinates
   */
  graphToScreen(graphPosition: IPosition): IPosition {
    return {
      x: graphPosition.x * this.zoom + this.pan.x,
      y: graphPosition.y * this.zoom + this.pan.y,
    };
  }
  
  /**
   * Get viewport bounds in graph coordinates
   */
  getViewportBounds(): {
    left: number;
    top: number;
    right: number;
    bottom: number;
  } {
    const topLeft = this.screenToGraph({ x: 0, y: 0 });
    const bottomRight = this.screenToGraph({
      x: this.dimensions.width,
      y: this.dimensions.height,
    });
    
    return {
      left: topLeft.x,
      top: topLeft.y,
      right: bottomRight.x,
      bottom: bottomRight.y,
    };
  }
}