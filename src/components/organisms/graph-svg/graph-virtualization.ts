/**
 * Graph virtualization system for efficient rendering of large citation networks
 * Implements spatial indexing, level-of-detail, and frustum culling for optimal performance
 */

import type { EntityGraphVertex, EntityGraphEdge } from '@/types/entity-graph';

export interface ViewportBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface Viewport {
  zoom: number;
  pan: { x: number; y: number };
  width: number;
  height: number;
  bufferMargin?: number;
}

export interface VirtualizationConfig {
  maxVertices: number;
  maxEdges: number;
  lodLevels?: number;
  enableSpatialIndex?: boolean;
  bufferMargin?: number;
  targetFrameRate?: number;
  adaptiveQuality?: boolean;
  simplificationThreshold?: number;
}

export interface LevelOfDetail {
  vertices: Array<EntityGraphVertex & { x: number; y: number }>;
  renderLabels: boolean;
  renderDetails: boolean;
  renderEdges: boolean;
  simplificationLevel: number;
}

export interface VirtualizationResult {
  vertices: Array<EntityGraphVertex & { x: number; y: number }>;
  edges: EntityGraphEdge[];
  lod: LevelOfDetail;
  stats: {
    totalVertices: number;
    totalEdges: number;
    visibleVertices: number;
    visibleEdges: number;
    culledVertices: number;
    culledEdges: number;
    renderTime: number;
    spatialQueries: number;
  };
}

export interface SpatialIndex {
  cells: Map<string, Array<EntityGraphVertex & { x: number; y: number }>>;
  cellSize: number;
  bounds: ViewportBounds;
  queryRange: (viewport: ViewportBounds) => Array<EntityGraphVertex & { x: number; y: number }>;
  updateVertex: (vertex: EntityGraphVertex & { x: number; y: number }) => void;
  removeVertex: (vertexId: string) => void;
  clear: () => void;
}

/**
 * Calculate viewport bounds in world coordinates
 */
export function calculateViewportBounds(viewport: Viewport): ViewportBounds {
  const { zoom, pan, width, height, bufferMargin = 0 } = viewport;
  
  const left = (0 - pan.x) / zoom - bufferMargin;
  const right = (width - pan.x) / zoom + bufferMargin;
  const top = (0 - pan.y) / zoom - bufferMargin;
  const bottom = (height - pan.y) / zoom + bufferMargin;

  return { left, right, top, bottom };
}

/**
 * Filter vertices within viewport bounds
 */
export function getVisibleVertices(
  vertices: Array<EntityGraphVertex & { x: number; y: number }>,
  viewport: ViewportBounds
): Array<EntityGraphVertex & { x: number; y: number }> {
  return vertices.filter(vertex => 
    vertex.x >= viewport.left &&
    vertex.x <= viewport.right &&
    vertex.y >= viewport.top &&
    vertex.y <= viewport.bottom
  );
}

/**
 * Filter edges with visible endpoints
 */
export function getVisibleEdges(
  edges: EntityGraphEdge[],
  visibleVertices: Array<EntityGraphVertex & { x: number; y: number }>,
  options: { includePartiallyVisible?: boolean } = {}
): EntityGraphEdge[] {
  const { includePartiallyVisible = false } = options;
  const visibleVertexIds = new Set(visibleVertices.map(v => v.id));

  return edges.filter(edge => {
    const sourceVisible = visibleVertexIds.has(edge.sourceId);
    const targetVisible = visibleVertexIds.has(edge.targetId);

    return includePartiallyVisible 
      ? (sourceVisible || targetVisible)
      : (sourceVisible && targetVisible);
  });
}

/**
 * Create level of detail based on zoom level and performance constraints
 */
export function createLevelOfDetail(
  vertices: Array<EntityGraphVertex & { x: number; y: number }>,
  options: {
    zoom: number;
    maxVertices?: number;
    simplificationThreshold?: number;
  }
): LevelOfDetail {
  const { zoom, maxVertices = Infinity, simplificationThreshold = 0.5 } = options;

  // Determine rendering quality based on zoom level
  const renderLabels = zoom > 0.8;
  const renderDetails = zoom > 1.5;
  const renderEdges = zoom > 0.3;

  // Calculate simplification level (0 = no simplification, 1 = maximum simplification)
  const simplificationLevel = Math.max(0, 1 - (zoom / 2));

  // Filter and sort vertices by importance
  let lodVertices = [...vertices];

  if (lodVertices.length > maxVertices) {
    // Sort by importance: citation count, visit status, then random
    lodVertices.sort((a, b) => {
      // Prioritize visited vertices
      if (a.directlyVisited && !b.directlyVisited) return -1;
      if (!a.directlyVisited && b.directlyVisited) return 1;

      // Then by citation count
      const aCitations = a.metadata.citedByCount || 0;
      const bCitations = b.metadata.citedByCount || 0;
      if (aCitations !== bCitations) return bCitations - aCitations;

      // Then by visit count
      if (a.visitCount !== b.visitCount) return b.visitCount - a.visitCount;

      // Finally random for deterministic but varied selection
      return a.id.localeCompare(b.id);
    });

    // Apply simplification threshold
    const targetCount = Math.min(maxVertices, Math.ceil(lodVertices.length * (1 - simplificationLevel * simplificationThreshold)));
    lodVertices = lodVertices.slice(0, targetCount);
  }

  return {
    vertices: lodVertices,
    renderLabels,
    renderDetails,
    renderEdges,
    simplificationLevel,
  };
}

/**
 * Optimize vertex rendering based on importance and visual impact
 */
export function optimizeVertexRendering(
  vertices: Array<EntityGraphVertex & { x: number; y: number }>,
  options: {
    maxRenderCount: number;
    importanceWeight?: number;
    sizeWeight?: number;
    prioritizeVisited?: boolean;
  }
): Array<EntityGraphVertex & { x: number; y: number }> {
  const { 
    maxRenderCount, 
    importanceWeight = 0.6, 
    sizeWeight = 0.4, 
    prioritizeVisited = true 
  } = options;

  if (vertices.length <= maxRenderCount) {
    return vertices;
  }

  // Calculate importance scores
  const scoredVertices = vertices.map(vertex => {
    let score = 0;

    // Citation-based importance
    const citationScore = Math.log((vertex.metadata.citedByCount || 0) + 1) / 10;
    score += citationScore * importanceWeight;

    // Visit-based importance
    if (prioritizeVisited && vertex.directlyVisited) {
      score += Math.log(vertex.visitCount + 1) * 2;
    }

    // Size-based importance (could be radius or visual prominence)
    const sizeScore = Math.min(1, (vertex.metadata.citedByCount || 0) / 1000);
    score += sizeScore * sizeWeight;

    return { vertex, score };
  });

  // Sort by score and take top vertices
  scoredVertices.sort((a, b) => b.score - a.score);
  return scoredVertices.slice(0, maxRenderCount).map(item => item.vertex);
}

/**
 * Create spatial index for efficient range queries
 */
export function createSpatialIndex(
  vertices: Array<EntityGraphVertex & { x: number; y: number }>,
  options: {
    cellSize: number;
    bounds: ViewportBounds;
  }
): SpatialIndex {
  const { cellSize, bounds } = options;
  const cells = new Map<string, Array<EntityGraphVertex & { x: number; y: number }>>();

  // Helper function to get cell key
  const getCellKey = (x: number, y: number): string => {
    const cellX = Math.floor(x / cellSize);
    const cellY = Math.floor(y / cellSize);
    return `${cellX},${cellY}`;
  };

  // Helper function to get all cell keys for a range
  const getCellKeysInRange = (viewport: ViewportBounds): string[] => {
    const keys: string[] = [];
    const startCellX = Math.floor(viewport.left / cellSize);
    const endCellX = Math.floor(viewport.right / cellSize);
    const startCellY = Math.floor(viewport.top / cellSize);
    const endCellY = Math.floor(viewport.bottom / cellSize);

    for (let x = startCellX; x <= endCellX; x++) {
      for (let y = startCellY; y <= endCellY; y++) {
        keys.push(`${x},${y}`);
      }
    }

    return keys;
  };

  // Populate spatial index
  for (const vertex of vertices) {
    const key = getCellKey(vertex.x, vertex.y);
    if (!cells.has(key)) {
      cells.set(key, []);
    }
    cells.get(key)!.push(vertex);
  }

  return {
    cells,
    cellSize,
    bounds,

    queryRange(viewport: ViewportBounds): Array<EntityGraphVertex & { x: number; y: number }> {
      const results: Array<EntityGraphVertex & { x: number; y: number }> = [];
      const cellKeys = getCellKeysInRange(viewport);

      for (const key of cellKeys) {
        const cellVertices = cells.get(key);
        if (cellVertices) {
          for (const vertex of cellVertices) {
            if (
              vertex.x >= viewport.left &&
              vertex.x <= viewport.right &&
              vertex.y >= viewport.top &&
              vertex.y <= viewport.bottom
            ) {
              results.push(vertex);
            }
          }
        }
      }

      return results;
    },

    updateVertex(vertex: EntityGraphVertex & { x: number; y: number }): void {
      // Remove from old cell
      this.removeVertex(vertex.id);

      // Add to new cell
      const key = getCellKey(vertex.x, vertex.y);
      if (!cells.has(key)) {
        cells.set(key, []);
      }
      cells.get(key)!.push(vertex);
    },

    removeVertex(vertexId: string): void {
      for (const [key, cellVertices] of cells) {
        const index = cellVertices.findIndex(v => v.id === vertexId);
        if (index !== -1) {
          cellVertices.splice(index, 1);
          if (cellVertices.length === 0) {
            cells.delete(key);
          }
          break;
        }
      }
    },

    clear(): void {
      cells.clear();
    },
  };
}

/**
 * Update virtualization based on viewport changes
 */
export function updateVirtualization(
  vertices: Array<EntityGraphVertex & { x: number; y: number }>,
  edges: EntityGraphEdge[],
  viewport: Viewport,
  config: VirtualizationConfig,
  spatialIndex?: SpatialIndex
): VirtualizationResult {
  const startTime = performance.now();
  let spatialQueries = 0;

  // Calculate viewport bounds
  const viewportBounds = calculateViewportBounds(viewport);

  // Get visible vertices (use spatial index if available)
  let visibleVertices: Array<EntityGraphVertex & { x: number; y: number }>;
  if (spatialIndex && config.enableSpatialIndex) {
    visibleVertices = spatialIndex.queryRange(viewportBounds);
    spatialQueries++;
  } else {
    visibleVertices = getVisibleVertices(vertices, viewportBounds);
  }

  // Create level of detail
  const lod = createLevelOfDetail(visibleVertices, {
    zoom: viewport.zoom,
    maxVertices: config.maxVertices,
    simplificationThreshold: config.simplificationThreshold || 0.5,
  });

  // Optimize vertex rendering
  const optimizedVertices = optimizeVertexRendering(lod.vertices, {
    maxRenderCount: config.maxVertices,
    prioritizeVisited: true,
  });

  // Get visible edges
  const visibleEdges = lod.renderEdges 
    ? getVisibleEdges(edges, optimizedVertices, { includePartiallyVisible: true })
    : [];

  // Limit edges if necessary
  const finalEdges = visibleEdges.length > config.maxEdges
    ? visibleEdges.slice(0, config.maxEdges)
    : visibleEdges;

  const renderTime = performance.now() - startTime;

  return {
    vertices: optimizedVertices,
    edges: finalEdges,
    lod,
    stats: {
      totalVertices: vertices.length,
      totalEdges: edges.length,
      visibleVertices: optimizedVertices.length,
      visibleEdges: finalEdges.length,
      culledVertices: vertices.length - optimizedVertices.length,
      culledEdges: edges.length - finalEdges.length,
      renderTime,
      spatialQueries,
    },
  };
}

/**
 * Main GraphVirtualizer class for managing large graph rendering
 */
export class GraphVirtualizer {
  private config: VirtualizationConfig;
  private vertices: Array<EntityGraphVertex & { x: number; y: number }> = [];
  private edges: EntityGraphEdge[] = [];
  private spatialIndex: SpatialIndex | null = null;
  private lastViewport: Viewport | null = null;
  private performanceHistory: number[] = [];
  private adaptiveMaxVertices: number;

  constructor(config: VirtualizationConfig) {
    this.config = {
      lodLevels: 3,
      enableSpatialIndex: true,
      bufferMargin: 100,
      targetFrameRate: 60,
      adaptiveQuality: false,
      simplificationThreshold: 0.5,
      ...config,
    };
    this.adaptiveMaxVertices = this.config.maxVertices;
  }

  /**
   * Update the graph data
   */
  updateData(
    vertices: Array<EntityGraphVertex & { x: number; y: number }>,
    edges: EntityGraphEdge[]
  ): void {
    this.vertices = vertices;
    this.edges = edges;

    // Rebuild spatial index if enabled
    if (this.config.enableSpatialIndex && vertices.length > 0) {
      const bounds = this.calculateDataBounds(vertices);
      this.spatialIndex = createSpatialIndex(vertices, {
        cellSize: 100, // Configurable cell size
        bounds,
      });
    }
  }

  /**
   * Update viewport and get virtualized rendering data
   */
  updateViewport(viewport: Viewport): VirtualizationResult {
    this.lastViewport = viewport;

    const result = updateVirtualization(
      this.vertices,
      this.edges,
      viewport,
      { ...this.config, maxVertices: this.adaptiveMaxVertices },
      this.spatialIndex || undefined
    );

    // Update performance tracking
    this.updatePerformanceTracking(result.stats.renderTime);

    return result;
  }

  /**
   * Get current configuration
   */
  getConfig(): VirtualizationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<VirtualizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.maxVertices !== undefined) {
      this.adaptiveMaxVertices = newConfig.maxVertices;
    }

    // Rebuild spatial index if settings changed
    if (newConfig.enableSpatialIndex !== undefined && this.vertices.length > 0) {
      if (newConfig.enableSpatialIndex) {
        const bounds = this.calculateDataBounds(this.vertices);
        this.spatialIndex = createSpatialIndex(this.vertices, {
          cellSize: 100,
          bounds,
        });
      } else {
        this.spatialIndex = null;
      }
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    averageRenderTime: number;
    currentFPS: number;
    adaptiveMaxVertices: number;
    recommendedMaxVertices: number;
  } {
    const averageRenderTime = this.performanceHistory.length > 0
      ? this.performanceHistory.reduce((sum, time) => sum + time, 0) / this.performanceHistory.length
      : 0;

    const currentFPS = averageRenderTime > 0 ? 1000 / averageRenderTime : 60;
    const targetFrameTime = 1000 / (this.config.targetFrameRate || 60);
    const recommendedMaxVertices = Math.floor(this.adaptiveMaxVertices * (targetFrameTime / Math.max(averageRenderTime, 1)));

    return {
      averageRenderTime,
      currentFPS,
      adaptiveMaxVertices: this.adaptiveMaxVertices,
      recommendedMaxVertices: Math.max(50, Math.min(recommendedMaxVertices, this.config.maxVertices)),
    };
  }

  /**
   * Force spatial index rebuild (useful after vertex position changes)
   */
  rebuildSpatialIndex(): void {
    if (this.config.enableSpatialIndex && this.vertices.length > 0) {
      const bounds = this.calculateDataBounds(this.vertices);
      this.spatialIndex = createSpatialIndex(this.vertices, {
        cellSize: 100,
        bounds,
      });
    }
  }

  private calculateDataBounds(vertices: Array<{ x: number; y: number }>): ViewportBounds {
    if (vertices.length === 0) {
      return { left: 0, right: 1000, top: 0, bottom: 1000 };
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const vertex of vertices) {
      minX = Math.min(minX, vertex.x);
      maxX = Math.max(maxX, vertex.x);
      minY = Math.min(minY, vertex.y);
      maxY = Math.max(maxY, vertex.y);
    }

    // Add padding
    const padding = 100;
    return {
      left: minX - padding,
      right: maxX + padding,
      top: minY - padding,
      bottom: maxY + padding,
    };
  }

  private updatePerformanceTracking(renderTime: number): void {
    this.performanceHistory.push(renderTime);
    
    // Keep only recent performance data
    if (this.performanceHistory.length > 60) { // 60 frame history
      this.performanceHistory.shift();
    }

    // Adaptive quality adjustment
    if (this.config.adaptiveQuality && this.performanceHistory.length >= 10) {
      const averageTime = this.performanceHistory.reduce((sum, time) => sum + time, 0) / this.performanceHistory.length;
      const targetTime = 1000 / (this.config.targetFrameRate || 60);

      if (averageTime > targetTime * 1.5) {
        // Performance is poor, reduce quality
        this.adaptiveMaxVertices = Math.max(50, Math.floor(this.adaptiveMaxVertices * 0.9));
      } else if (averageTime < targetTime * 0.5 && this.adaptiveMaxVertices < this.config.maxVertices) {
        // Performance is good, increase quality
        this.adaptiveMaxVertices = Math.min(this.config.maxVertices, Math.floor(this.adaptiveMaxVertices * 1.1));
      }
    }
  }
}