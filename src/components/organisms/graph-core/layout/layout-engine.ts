/**
 * Generic Layout Engine System
 * 
 * Provides a pluggable architecture for graph layout algorithms that can work
 * with any vertex/edge data structures via generics. Supports algorithm registration,
 * configuration management, position caching, and animation-friendly interpolation.
 */

/**
 * Base interface for position coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Extended position with velocity for animation support
 */
export interface PositionWithVelocity extends Position {
  vx?: number;
  vy?: number;
}

/**
 * Generic vertex interface that layout algorithms can work with
 */
export interface LayoutVertex<TVertex = unknown> {
  /** Unique identifier */
  id: string;
  /** Current position (if any) */
  position?: Position;
  /** Original vertex data */
  data: TVertex;
}

/**
 * Generic edge interface that layout algorithms can work with
 */
export interface LayoutEdge<TEdge = unknown> {
  /** Unique identifier */
  id: string;
  /** Source vertex ID */
  sourceId: string;
  /** Target vertex ID */
  targetId: string;
  /** Edge weight for layout calculations */
  weight: number;
  /** Original edge data */
  data: TEdge;
}

/**
 * Layout algorithm configuration base interface
 */
export interface LayoutConfig {
  /** Canvas dimensions */
  dimensions: {
    width: number;
    height: number;
  };
  /** Whether to animate layout changes */
  animated?: boolean;
  /** Animation duration in milliseconds */
  animationDuration?: number;
  /** Random seed for reproducible layouts */
  seed?: number;
  /** Use existing positions as starting points */
  useExistingPositions?: boolean;
  /** Constrained positions (fixed nodes) */
  constraints?: Map<string, Position>;
}

/**
 * Layout algorithm result
 */
export interface LayoutResult<TVertex = unknown> {
  /** Positioned vertices */
  positions: Map<string, PositionWithVelocity>;
  /** Layout metadata */
  metadata: {
    /** Algorithm that generated this layout */
    algorithm: string;
    /** Time taken to compute (ms) */
    computeTime: number;
    /** Number of iterations performed */
    iterations?: number;
    /** Whether layout converged */
    converged?: boolean;
    /** Final energy/stress value */
    finalEnergy?: number;
    /** Whether this result was loaded from cache */
    cached?: boolean;
  };
  /** Animation keyframes if animated */
  animationFrames?: Map<string, PositionWithVelocity>[];
}

/**
 * Abstract base class for layout algorithms
 */
export abstract class LayoutAlgorithm<
  TVertex = unknown,
  TEdge = unknown,
  TConfig extends LayoutConfig = LayoutConfig
> {
  /** Algorithm identifier */
  abstract readonly name: string;
  
  /** Algorithm display name */
  abstract readonly displayName: string;
  
  /** Algorithm description */
  abstract readonly description: string;
  
  /** Default configuration */
  abstract readonly defaultConfig: Partial<TConfig>;

  /**
   * Compute layout for given vertices and edges
   */
  abstract compute(
    vertices: LayoutVertex<TVertex>[],
    edges: LayoutEdge<TEdge>[],
    config: TConfig
  ): Promise<LayoutResult<TVertex>>;

  /**
   * Validate configuration
   */
  validateConfig(config: TConfig): string[] {
    const errors: string[] = [];
    
    if (!config.dimensions || config.dimensions.width <= 0 || config.dimensions.height <= 0) {
      errors.push('Invalid dimensions: width and height must be positive');
    }
    
    if (config.animationDuration !== undefined && config.animationDuration < 0) {
      errors.push('Animation duration must be non-negative');
    }
    
    return errors;
  }

  /**
   * Create default configuration merged with provided config
   */
  protected createConfig(config: Partial<TConfig>): TConfig {
    return {
      ...this.defaultConfig,
      ...config,
    } as TConfig;
  }

  /**
   * Initialize positions for vertices
   */
  protected initializePositions(
    vertices: LayoutVertex<TVertex>[],
    config: TConfig
  ): Map<string, PositionWithVelocity> {
    const positions = new Map<string, PositionWithVelocity>();
    const { width, height } = config.dimensions;
    const centerX = width / 2;
    const centerY = height / 2;

    vertices.forEach((vertex, index) => {
      let position: PositionWithVelocity;

      // Use constraint if exists
      if (config.constraints?.has(vertex.id)) {
        const constraint = config.constraints.get(vertex.id)!;
        position = { x: constraint.x, y: constraint.y, vx: 0, vy: 0 };
      }
      // Use existing position if available and config allows
      else if (config.useExistingPositions && vertex.position) {
        position = { 
          x: vertex.position.x, 
          y: vertex.position.y, 
          vx: 0, 
          vy: 0 
        };
      }
      // Default circular initialization
      else {
        const angle = (index / vertices.length) * 2 * Math.PI;
        const radius = Math.min(width, height) * 0.2;
        position = {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
        };
      }

      positions.set(vertex.id, position);
    });

    return positions;
  }

  /**
   * Apply boundary constraints to positions
   */
  protected constrainToBounds(
    positions: Map<string, PositionWithVelocity>,
    config: TConfig,
    margin = 20
  ): void {
    const { width, height } = config.dimensions;
    
    positions.forEach((position) => {
      position.x = Math.max(margin, Math.min(width - margin, position.x));
      position.y = Math.max(margin, Math.min(height - margin, position.y));
    });
  }

  /**
   * Generate animation frames for smooth transitions
   */
  protected generateAnimationFrames(
    startPositions: Map<string, PositionWithVelocity>,
    endPositions: Map<string, PositionWithVelocity>,
    frameCount: number
  ): Map<string, PositionWithVelocity>[] {
    const frames: Map<string, PositionWithVelocity>[] = [];

    for (let frame = 0; frame <= frameCount; frame++) {
      const t = frame / frameCount;
      const easedT = this.easeInOutCubic(t);
      const framePositions = new Map<string, PositionWithVelocity>();

      endPositions.forEach((endPos, vertexId) => {
        const startPos = startPositions.get(vertexId) || { x: endPos.x, y: endPos.y, vx: 0, vy: 0 };
        
        framePositions.set(vertexId, {
          x: startPos.x + (endPos.x - startPos.x) * easedT,
          y: startPos.y + (endPos.y - startPos.y) * easedT,
          vx: endPos.vx || 0,
          vy: endPos.vy || 0,
        });
      });

      frames.push(framePositions);
    }

    return frames;
  }

  /**
   * Cubic ease-in-out function for smooth animations
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  }
}

/**
 * Layout engine for managing and executing layout algorithms
 */
export class LayoutEngine<TVertex = unknown, TEdge = unknown> {
  private algorithms = new Map<string, LayoutAlgorithm<TVertex, TEdge, any>>();
  private positionCache = new Map<string, Map<string, PositionWithVelocity>>();
  private lastComputeTime = new Map<string, number>();

  /**
   * Register a layout algorithm
   */
  registerAlgorithm<TConfig extends LayoutConfig>(
    algorithm: LayoutAlgorithm<TVertex, TEdge, TConfig>
  ): void {
    this.algorithms.set(algorithm.name, algorithm);
  }

  /**
   * Unregister a layout algorithm
   */
  unregisterAlgorithm(name: string): boolean {
    return this.algorithms.delete(name);
  }

  /**
   * Get registered algorithm
   */
  getAlgorithm(name: string): LayoutAlgorithm<TVertex, TEdge, any> | undefined {
    return this.algorithms.get(name);
  }

  /**
   * List all registered algorithms
   */
  getAvailableAlgorithms(): Array<{
    name: string;
    displayName: string;
    description: string;
  }> {
    return Array.from(this.algorithms.values()).map(algo => ({
      name: algo.name,
      displayName: algo.displayName,
      description: algo.description,
    }));
  }

  /**
   * Compute layout using specified algorithm
   */
  async computeLayout<TConfig extends LayoutConfig>(
    algorithmName: string,
    vertices: LayoutVertex<TVertex>[],
    edges: LayoutEdge<TEdge>[],
    config: TConfig,
    options: {
      useCache?: boolean;
      cacheKey?: string;
    } = {}
  ): Promise<LayoutResult<TVertex>> {
    const algorithm = this.algorithms.get(algorithmName);
    if (!algorithm) {
      throw new Error(`Unknown layout algorithm: ${algorithmName}`);
    }

    // Validate configuration
    const errors = algorithm.validateConfig(config);
    if (errors.length > 0) {
      throw new Error(`Configuration errors: ${errors.join(', ')}`);
    }

    // Check cache if requested
    const cacheKey = options.cacheKey || this.generateCacheKey(vertices, edges, config);
    if (options.useCache && this.positionCache.has(cacheKey)) {
      const cachedPositions = this.positionCache.get(cacheKey)!;
      return {
        positions: new Map(cachedPositions),
        metadata: {
          algorithm: algorithmName,
          computeTime: this.lastComputeTime.get(cacheKey) || 0,
          cached: true,
        },
      };
    }

    // Compute layout
    const startTime = performance.now();
    const result = await algorithm.compute(vertices, edges, config);
    const computeTime = performance.now() - startTime;

    // Update result metadata
    result.metadata.computeTime = computeTime;

    // Cache result if requested
    if (options.useCache) {
      this.positionCache.set(cacheKey, new Map(result.positions));
      this.lastComputeTime.set(cacheKey, computeTime);
    }

    return result;
  }

  /**
   * Clear layout cache
   */
  clearCache(pattern?: RegExp): void {
    if (!pattern) {
      this.positionCache.clear();
      this.lastComputeTime.clear();
      return;
    }

    for (const key of this.positionCache.keys()) {
      if (pattern.test(key)) {
        this.positionCache.delete(key);
        this.lastComputeTime.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    totalMemoryUsage: number;
    averageComputeTime: number;
  } {
    const totalEntries = this.positionCache.size;
    let totalPositions = 0;
    let totalComputeTime = 0;

    this.positionCache.forEach((positions, key) => {
      totalPositions += positions.size;
      totalComputeTime += this.lastComputeTime.get(key) || 0;
    });

    return {
      totalEntries,
      totalMemoryUsage: totalPositions * 32, // Rough estimate: 32 bytes per position
      averageComputeTime: totalEntries > 0 ? totalComputeTime / totalEntries : 0,
    };
  }

  /**
   * Generate cache key from vertices, edges, and config
   */
  private generateCacheKey<TConfig extends LayoutConfig>(
    vertices: LayoutVertex<TVertex>[],
    edges: LayoutEdge<TEdge>[],
    config: TConfig
  ): string {
    const vertexHash = vertices
      .map(v => `${v.id}:${v.position?.x || 0}:${v.position?.y || 0}`)
      .sort()
      .join('|');
    
    const edgeHash = edges
      .map(e => `${e.sourceId}-${e.targetId}:${e.weight}`)
      .sort()
      .join('|');
    
    const configHash = JSON.stringify(config, Object.keys(config).sort());
    
    return `${this.simpleHash(vertexHash)}-${this.simpleHash(edgeHash)}-${this.simpleHash(configHash)}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * Global layout engine instance
 */
export const layoutEngine = new LayoutEngine();

/**
 * Layout utilities
 */
export class LayoutUtils {
  /**
   * Calculate the centroid of a set of positions
   */
  static calculateCentroid(positions: Position[]): Position {
    if (positions.length === 0) {
      return { x: 0, y: 0 };
    }

    const sum = positions.reduce(
      (acc, pos) => ({
        x: acc.x + pos.x,
        y: acc.y + pos.y,
      }),
      { x: 0, y: 0 }
    );

    return {
      x: sum.x / positions.length,
      y: sum.y / positions.length,
    };
  }

  /**
   * Calculate distance between two positions
   */
  static distance(a: Position, b: Position): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Normalize positions to fit within specified bounds
   */
  static normalizePositions(
    positions: Map<string, Position>,
    targetWidth: number,
    targetHeight: number,
    margin = 20
  ): Map<string, Position> {
    const positionArray = Array.from(positions.values());
    if (positionArray.length === 0) return new Map();

    // Find bounds
    const minX = Math.min(...positionArray.map(p => p.x));
    const maxX = Math.max(...positionArray.map(p => p.x));
    const minY = Math.min(...positionArray.map(p => p.y));
    const maxY = Math.max(...positionArray.map(p => p.y));

    const currentWidth = maxX - minX;
    const currentHeight = maxY - minY;

    // Calculate scale factors
    const scaleX = (targetWidth - 2 * margin) / (currentWidth || 1);
    const scaleY = (targetHeight - 2 * margin) / (currentHeight || 1);
    const scale = Math.min(scaleX, scaleY);

    // Apply scaling and centering
    const normalized = new Map<string, Position>();
    const targetCenterX = targetWidth / 2;
    const targetCenterY = targetHeight / 2;
    const currentCenterX = (minX + maxX) / 2;
    const currentCenterY = (minY + maxY) / 2;

    positions.forEach((position, id) => {
      const scaledX = (position.x - currentCenterX) * scale;
      const scaledY = (position.y - currentCenterY) * scale;
      
      normalized.set(id, {
        x: targetCenterX + scaledX,
        y: targetCenterY + scaledY,
      });
    });

    return normalized;
  }

  /**
   * Interpolate between two position maps
   */
  static interpolatePositions(
    from: Map<string, Position>,
    to: Map<string, Position>,
    t: number
  ): Map<string, Position> {
    const interpolated = new Map<string, Position>();

    to.forEach((toPos, id) => {
      const fromPos = from.get(id) || toPos;
      interpolated.set(id, {
        x: fromPos.x + (toPos.x - fromPos.x) * t,
        y: fromPos.y + (toPos.y - fromPos.y) * t,
      });
    });

    return interpolated;
  }

  /**
   * Generate grid positions
   */
  static generateGridPositions(
    count: number,
    width: number,
    height: number,
    margin = 20
  ): Position[] {
    const positions: Position[] = [];
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    
    const cellWidth = (width - 2 * margin) / cols;
    const cellHeight = (height - 2 * margin) / rows;

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      positions.push({
        x: margin + col * cellWidth + cellWidth / 2,
        y: margin + row * cellHeight + cellHeight / 2,
      });
    }

    return positions;
  }
}