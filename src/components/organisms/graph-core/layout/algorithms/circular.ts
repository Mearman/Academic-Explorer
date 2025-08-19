/**
 * Circular Layout Algorithm
 * 
 * Implements various circular graph layout strategies including simple circle,
 * concentric circles for hierarchical data, and clustered circular layouts.
 * Provides smooth animations and supports constraints.
 */

import {
  LayoutAlgorithm,
  LayoutConfig,
  LayoutVertex,
  LayoutEdge,
  LayoutResult,
  PositionWithVelocity,
  LayoutUtils,
} from '../layout-engine';

/**
 * Circular layout strategy
 */
export enum CircularStrategy {
  /** Single circle with all nodes */
  SIMPLE = 'simple',
  /** Multiple concentric circles based on hierarchy */
  CONCENTRIC = 'concentric',
  /** Circular clusters of related nodes */
  CLUSTERED = 'clustered',
  /** Spiral layout for large graphs */
  SPIRAL = 'spiral',
}

/**
 * Node ordering strategy for circular layouts
 */
export enum NodeOrdering {
  /** Original order */
  ORIGINAL = 'original',
  /** Alphabetical by display name */
  ALPHABETICAL = 'alphabetical',
  /** By vertex degree (connections) */
  DEGREE = 'degree',
  /** By vertex weight/importance */
  WEIGHT = 'weight',
  /** Minimize edge crossings */
  OPTIMIZE_CROSSINGS = 'optimize-crossings',
  /** Random order */
  RANDOM = 'random',
}

/**
 * Configuration for circular layout
 */
export interface CircularConfig extends LayoutConfig {
  /** Circular layout strategy */
  strategy?: CircularStrategy;
  /** Node ordering method */
  ordering?: NodeOrdering;
  /** Radius of the main circle */
  radius?: number;
  /** Radius scaling for concentric circles */
  radiusScale?: number;
  /** Minimum radius */
  minRadius?: number;
  /** Maximum radius */
  maxRadius?: number;
  /** Starting angle in radians */
  startAngle?: number;
  /** Whether to sweep clockwise */
  clockwise?: boolean;
  /** Spacing between concentric levels */
  levelSpacing?: number;
  /** For spiral: spiral tightness */
  spiralTightness?: number;
  /** For spiral: number of turns */
  spiralTurns?: number;
  /** For clustered: cluster detection method */
  clusterMethod?: 'connected-components' | 'degree-based' | 'custom';
  /** For clustered: custom cluster assignments */
  customClusters?: Map<string, number>;
  /** Angular padding between nodes */
  angularPadding?: number;
  /** Whether to distribute nodes evenly */
  evenDistribution?: boolean;
  /** Animation easing function */
  easingFunction?: 'linear' | 'ease-in-out' | 'bounce';
}

/**
 * Circular layout algorithm implementation
 */
export class CircularLayout<TVertex = unknown, TEdge = unknown> 
  extends LayoutAlgorithm<TVertex, TEdge, CircularConfig> {

  readonly name = 'circular';
  readonly displayName = 'Circular';
  readonly description = 'Arranges nodes in circles, spirals, or clusters';

  readonly defaultConfig: Partial<CircularConfig> = {
    strategy: CircularStrategy.SIMPLE,
    ordering: NodeOrdering.ORIGINAL,
    radius: undefined, // Auto-calculate based on dimensions
    radiusScale: 0.8,
    minRadius: 50,
    maxRadius: undefined, // Auto-calculate
    startAngle: 0,
    clockwise: true,
    levelSpacing: 80,
    spiralTightness: 0.1,
    spiralTurns: 3,
    clusterMethod: 'connected-components',
    angularPadding: 0.1,
    evenDistribution: true,
    easingFunction: 'ease-in-out',
  };

  async compute(
    vertices: LayoutVertex<TVertex>[],
    edges: LayoutEdge<TEdge>[],
    config: CircularConfig
  ): Promise<LayoutResult<TVertex>> {
    if (vertices.length === 0) {
      return {
        positions: new Map(),
        metadata: {
          algorithm: this.name,
          computeTime: 0,
          iterations: 1,
          converged: true,
        },
      };
    }

    const startTime = performance.now();
    const mergedConfig = this.createConfig(config);
    
    // Calculate default radius if not specified
    if (!mergedConfig.radius) {
      const { width, height } = mergedConfig.dimensions;
      const maxDimension = Math.min(width, height);
      mergedConfig.radius = (maxDimension * mergedConfig.radiusScale!) / 2;
    }

    // Set max radius if not specified
    if (!mergedConfig.maxRadius) {
      const { width, height } = mergedConfig.dimensions;
      mergedConfig.maxRadius = Math.min(width, height) / 2 - 20;
    }

    // Constrain radius
    mergedConfig.radius = Math.max(
      mergedConfig.minRadius!,
      Math.min(mergedConfig.maxRadius, mergedConfig.radius)
    );

    let positions: Map<string, PositionWithVelocity>;

    // Apply strategy-specific layout
    switch (mergedConfig.strategy) {
      case CircularStrategy.SIMPLE:
        positions = this.computeSimpleCircle(vertices, edges, mergedConfig);
        break;
      case CircularStrategy.CONCENTRIC:
        positions = this.computeConcentricCircles(vertices, edges, mergedConfig);
        break;
      case CircularStrategy.CLUSTERED:
        positions = this.computeClusteredCircles(vertices, edges, mergedConfig);
        break;
      case CircularStrategy.SPIRAL:
        positions = this.computeSpiralLayout(vertices, edges, mergedConfig);
        break;
      default:
        positions = this.computeSimpleCircle(vertices, edges, mergedConfig);
    }

    // Apply constraints
    if (mergedConfig.constraints) {
      mergedConfig.constraints.forEach((constraint, vertexId) => {
        const position = positions.get(vertexId);
        if (position) {
          position.x = constraint.x;
          position.y = constraint.y;
          position.vx = 0;
          position.vy = 0;
        }
      });
    }

    const computeTime = performance.now() - startTime;

    // Generate animation frames if requested
    let animationFrames: Map<string, PositionWithVelocity>[] | undefined;
    if (mergedConfig.animated) {
      const startPositions = this.initializePositions(vertices, mergedConfig);
      animationFrames = this.generateAnimationFrames(
        startPositions,
        positions,
        30 // 30 frames for smooth animation
      );
    }

    return {
      positions,
      metadata: {
        algorithm: this.name,
        computeTime,
        iterations: 1,
        converged: true,
      },
      animationFrames,
    };
  }

  /**
   * Compute simple circular layout
   */
  private computeSimpleCircle(
    vertices: LayoutVertex<TVertex>[],
    edges: LayoutEdge<TEdge>[],
    config: CircularConfig
  ): Map<string, PositionWithVelocity> {
    const positions = new Map<string, PositionWithVelocity>();
    const { width, height } = config.dimensions;
    const centerX = width / 2;
    const centerY = height / 2;

    // Order vertices
    const orderedVertices = this.orderVertices(vertices, edges, config);

    // Calculate angular positions
    const totalAngle = 2 * Math.PI;
    const angleStep = config.evenDistribution 
      ? totalAngle / orderedVertices.length
      : totalAngle / (orderedVertices.length + config.angularPadding! * orderedVertices.length);

    orderedVertices.forEach((vertex, index) => {
      let angle = config.startAngle! + index * angleStep;
      if (!config.clockwise!) {
        angle = config.startAngle! - index * angleStep;
      }

      const x = centerX + Math.cos(angle) * config.radius!;
      const y = centerY + Math.sin(angle) * config.radius!;

      positions.set(vertex.id, { x, y, vx: 0, vy: 0 });
    });

    return positions;
  }

  /**
   * Compute concentric circles layout
   */
  private computeConcentricCircles(
    vertices: LayoutVertex<TVertex>[],
    edges: LayoutEdge<TEdge>[],
    config: CircularConfig
  ): Map<string, PositionWithVelocity> {
    const positions = new Map<string, PositionWithVelocity>();
    const { width, height } = config.dimensions;
    const centerX = width / 2;
    const centerY = height / 2;

    // Group vertices by level (distance from root or degree)
    const levels = this.groupVerticesByLevel(vertices, edges);
    
    levels.forEach((levelVertices, level) => {
      const radius = Math.max(
        config.minRadius! + level * config.levelSpacing!,
        config.radius! * (level === 0 ? 0.2 : (level + 1) * 0.3)
      );

      // Don't exceed max radius
      const constrainedRadius = Math.min(radius, config.maxRadius!);

      const orderedVertices = this.orderVertices(levelVertices, edges, config);
      const angleStep = (2 * Math.PI) / orderedVertices.length;

      orderedVertices.forEach((vertex, index) => {
        let angle = config.startAngle! + index * angleStep;
        if (!config.clockwise!) {
          angle = config.startAngle! - index * angleStep;
        }

        const x = centerX + Math.cos(angle) * constrainedRadius;
        const y = centerY + Math.sin(angle) * constrainedRadius;

        positions.set(vertex.id, { x, y, vx: 0, vy: 0 });
      });
    });

    return positions;
  }

  /**
   * Compute clustered circles layout
   */
  private computeClusteredCircles(
    vertices: LayoutVertex<TVertex>[],
    edges: LayoutEdge<TEdge>[],
    config: CircularConfig
  ): Map<string, PositionWithVelocity> {
    const positions = new Map<string, PositionWithVelocity>();
    
    // Find clusters
    const clusters = this.findClusters(vertices, edges, config);
    
    // Arrange clusters in a circle
    const { width, height } = config.dimensions;
    const centerX = width / 2;
    const centerY = height / 2;
    const mainRadius = config.radius! * 0.7; // Leave room for cluster circles

    clusters.forEach((cluster, clusterIndex) => {
      // Position for this cluster's center
      const clusterAngle = (clusterIndex / clusters.length) * 2 * Math.PI;
      const clusterCenterX = centerX + Math.cos(clusterAngle) * mainRadius;
      const clusterCenterY = centerY + Math.sin(clusterAngle) * mainRadius;

      // Radius for this cluster
      const clusterRadius = Math.min(
        config.levelSpacing! * 0.8,
        config.maxRadius! * 0.3
      );

      // Arrange vertices within cluster
      const orderedVertices = this.orderVertices(cluster, edges, config);
      const angleStep = (2 * Math.PI) / orderedVertices.length;

      orderedVertices.forEach((vertex, index) => {
        let angle = index * angleStep;
        if (!config.clockwise!) {
          angle = -index * angleStep;
        }

        const x = clusterCenterX + Math.cos(angle) * clusterRadius;
        const y = clusterCenterY + Math.sin(angle) * clusterRadius;

        positions.set(vertex.id, { x, y, vx: 0, vy: 0 });
      });
    });

    return positions;
  }

  /**
   * Compute spiral layout
   */
  private computeSpiralLayout(
    vertices: LayoutVertex<TVertex>[],
    edges: LayoutEdge<TEdge>[],
    config: CircularConfig
  ): Map<string, PositionWithVelocity> {
    const positions = new Map<string, PositionWithVelocity>();
    const { width, height } = config.dimensions;
    const centerX = width / 2;
    const centerY = height / 2;

    const orderedVertices = this.orderVertices(vertices, edges, config);
    const totalAngle = config.spiralTurns! * 2 * Math.PI;
    const angleStep = totalAngle / orderedVertices.length;
    const radiusStep = (config.radius! - config.minRadius!) / orderedVertices.length;

    orderedVertices.forEach((vertex, index) => {
      const angle = config.startAngle! + index * angleStep;
      const radius = config.minRadius! + index * radiusStep + 
                    Math.sin(angle * config.spiralTightness!) * 20;

      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      positions.set(vertex.id, { x, y, vx: 0, vy: 0 });
    });

    return positions;
  }

  /**
   * Order vertices according to specified strategy
   */
  private orderVertices(
    vertices: LayoutVertex<TVertex>[],
    edges: LayoutEdge<TEdge>[],
    config: CircularConfig
  ): LayoutVertex<TVertex>[] {
    const verticesCopy = [...vertices];

    switch (config.ordering) {
      case NodeOrdering.ORIGINAL:
        return verticesCopy;

      case NodeOrdering.ALPHABETICAL:
        return verticesCopy.sort((a, b) => {
          // Assuming vertices have a displayName property in their data
          const nameA = (a.data as any)?.displayName || a.id;
          const nameB = (b.data as any)?.displayName || b.id;
          return nameA.localeCompare(nameB);
        });

      case NodeOrdering.DEGREE:
        const degrees = new Map<string, number>();
        vertices.forEach(vertex => degrees.set(vertex.id, 0));
        
        edges.forEach(edge => {
          degrees.set(edge.sourceId, (degrees.get(edge.sourceId) || 0) + 1);
          degrees.set(edge.targetId, (degrees.get(edge.targetId) || 0) + 1);
        });

        return verticesCopy.sort((a, b) => 
          (degrees.get(b.id) || 0) - (degrees.get(a.id) || 0)
        );

      case NodeOrdering.WEIGHT:
        return verticesCopy.sort((a, b) => {
          const weightA = (a.data as any)?.weight || 0;
          const weightB = (b.data as any)?.weight || 0;
          return weightB - weightA;
        });

      case NodeOrdering.OPTIMIZE_CROSSINGS:
        return this.optimizeCrossingOrder(verticesCopy, edges);

      case NodeOrdering.RANDOM:
        const randomized = [...verticesCopy];
        for (let i = randomized.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [randomized[i], randomized[j]] = [randomized[j], randomized[i]];
        }
        return randomized;

      default:
        return verticesCopy;
    }
  }

  /**
   * Optimize vertex order to minimize edge crossings
   */
  private optimizeCrossingOrder(
    vertices: LayoutVertex<TVertex>[],
    edges: LayoutEdge<TEdge>[]
  ): LayoutVertex<TVertex>[] {
    // Simple heuristic: start with highest degree vertex and build order greedily
    const degrees = new Map<string, number>();
    vertices.forEach(vertex => degrees.set(vertex.id, 0));
    
    edges.forEach(edge => {
      degrees.set(edge.sourceId, (degrees.get(edge.sourceId) || 0) + 1);
      degrees.set(edge.targetId, (degrees.get(edge.targetId) || 0) + 1);
    });

    const ordered: LayoutVertex<TVertex>[] = [];
    const remaining = new Set(vertices);
    
    // Start with highest degree vertex
    let current = vertices.reduce((max, vertex) => 
      (degrees.get(vertex.id) || 0) > (degrees.get(max.id) || 0) ? vertex : max
    );

    while (remaining.size > 0) {
      ordered.push(current);
      remaining.delete(current);

      if (remaining.size === 0) break;

      // Find next vertex that has most connections to already placed vertices
      let bestNext: LayoutVertex<TVertex> | null = null;
      let bestScore = -1;

      for (const candidate of remaining) {
        let score = 0;
        
        // Count connections to already placed vertices
        edges.forEach(edge => {
          const isSource = edge.sourceId === candidate.id;
          const isTarget = edge.targetId === candidate.id;
          
          if (isSource && ordered.some(v => v.id === edge.targetId)) {
            score++;
          } else if (isTarget && ordered.some(v => v.id === edge.sourceId)) {
            score++;
          }
        });

        if (score > bestScore) {
          bestScore = score;
          bestNext = candidate;
        }
      }

      const nextCandidate = bestNext || remaining.values().next().value;
      if (!nextCandidate) break; // Safety check - shouldn't happen but prevents undefined
      current = nextCandidate;
    }

    return ordered;
  }

  /**
   * Group vertices by level for concentric layout
   */
  private groupVerticesByLevel(
    vertices: LayoutVertex<TVertex>[],
    edges: LayoutEdge<TEdge>[]
  ): Map<number, LayoutVertex<TVertex>[]> {
    const levels = new Map<number, LayoutVertex<TVertex>[]>();

    // Simple strategy: group by degree
    const degrees = new Map<string, number>();
    vertices.forEach(vertex => degrees.set(vertex.id, 0));
    
    edges.forEach(edge => {
      degrees.set(edge.sourceId, (degrees.get(edge.sourceId) || 0) + 1);
      degrees.set(edge.targetId, (degrees.get(edge.targetId) || 0) + 1);
    });

    // Group vertices by degree ranges
    vertices.forEach(vertex => {
      const degree = degrees.get(vertex.id) || 0;
      const level = degree === 0 ? 0 : Math.floor(Math.log2(degree + 1));
      
      if (!levels.has(level)) {
        levels.set(level, []);
      }
      levels.get(level)!.push(vertex);
    });

    return levels;
  }

  /**
   * Find clusters in the graph
   */
  private findClusters(
    vertices: LayoutVertex<TVertex>[],
    edges: LayoutEdge<TEdge>[],
    config: CircularConfig
  ): LayoutVertex<TVertex>[][] {
    switch (config.clusterMethod) {
      case 'custom':
        return this.createCustomClusters(vertices, config);
      
      case 'degree-based':
        return this.createDegreeClusters(vertices, edges);
      
      case 'connected-components':
      default:
        return this.createConnectedComponentClusters(vertices, edges);
    }
  }

  /**
   * Create clusters using custom assignments
   */
  private createCustomClusters(
    vertices: LayoutVertex<TVertex>[],
    config: CircularConfig
  ): LayoutVertex<TVertex>[][] {
    if (!config.customClusters) {
      return [vertices]; // Single cluster if no assignments
    }

    const clusterMap = new Map<number, LayoutVertex<TVertex>[]>();
    
    vertices.forEach(vertex => {
      const clusterId = config.customClusters!.get(vertex.id) || 0;
      if (!clusterMap.has(clusterId)) {
        clusterMap.set(clusterId, []);
      }
      clusterMap.get(clusterId)!.push(vertex);
    });

    return Array.from(clusterMap.values());
  }

  /**
   * Create clusters based on vertex degrees
   */
  private createDegreeClusters(
    vertices: LayoutVertex<TVertex>[],
    edges: LayoutEdge<TEdge>[]
  ): LayoutVertex<TVertex>[][] {
    const degrees = new Map<string, number>();
    vertices.forEach(vertex => degrees.set(vertex.id, 0));
    
    edges.forEach(edge => {
      degrees.set(edge.sourceId, (degrees.get(edge.sourceId) || 0) + 1);
      degrees.set(edge.targetId, (degrees.get(edge.targetId) || 0) + 1);
    });

    // Group by degree ranges
    const highDegree: LayoutVertex<TVertex>[] = [];
    const mediumDegree: LayoutVertex<TVertex>[] = [];
    const lowDegree: LayoutVertex<TVertex>[] = [];

    vertices.forEach(vertex => {
      const degree = degrees.get(vertex.id) || 0;
      if (degree >= 5) {
        highDegree.push(vertex);
      } else if (degree >= 2) {
        mediumDegree.push(vertex);
      } else {
        lowDegree.push(vertex);
      }
    });

    return [highDegree, mediumDegree, lowDegree].filter(cluster => cluster.length > 0);
  }

  /**
   * Create clusters using connected components
   */
  private createConnectedComponentClusters(
    vertices: LayoutVertex<TVertex>[],
    edges: LayoutEdge<TEdge>[]
  ): LayoutVertex<TVertex>[][] {
    const visited = new Set<string>();
    const adjacencyList = new Map<string, Set<string>>();

    // Build adjacency list
    vertices.forEach(vertex => {
      adjacencyList.set(vertex.id, new Set());
    });

    edges.forEach(edge => {
      adjacencyList.get(edge.sourceId)?.add(edge.targetId);
      adjacencyList.get(edge.targetId)?.add(edge.sourceId);
    });

    const clusters: LayoutVertex<TVertex>[][] = [];

    // Find connected components
    vertices.forEach(vertex => {
      if (!visited.has(vertex.id)) {
        const component: LayoutVertex<TVertex>[] = [];
        this.dfsCluster(vertex, adjacencyList, visited, component, vertices);
        clusters.push(component);
      }
    });

    return clusters;
  }

  /**
   * DFS helper for finding connected components
   */
  private dfsCluster(
    currentVertex: LayoutVertex<TVertex>,
    adjacencyList: Map<string, Set<string>>,
    visited: Set<string>,
    component: LayoutVertex<TVertex>[],
    allVertices: LayoutVertex<TVertex>[]
  ): void {
    visited.add(currentVertex.id);
    component.push(currentVertex);

    const neighbors = adjacencyList.get(currentVertex.id) || new Set();
    neighbors.forEach(neighborId => {
      if (!visited.has(neighborId)) {
        const neighborVertex = allVertices.find(v => v.id === neighborId);
        if (neighborVertex) {
          this.dfsCluster(neighborVertex, adjacencyList, visited, component, allVertices);
        }
      }
    });
  }

  /**
   * Enhanced configuration validation
   */
  validateConfig(config: CircularConfig): string[] {
    const errors = super.validateConfig(config);

    if (config.radius !== undefined && config.radius < 0) {
      errors.push('radius must be non-negative');
    }

    if (config.radiusScale !== undefined && (config.radiusScale <= 0 || config.radiusScale > 1)) {
      errors.push('radiusScale must be between 0 and 1');
    }

    if (config.minRadius !== undefined && config.minRadius < 0) {
      errors.push('minRadius must be non-negative');
    }

    if (config.maxRadius !== undefined && config.minRadius !== undefined && 
        config.maxRadius < config.minRadius) {
      errors.push('maxRadius must be greater than minRadius');
    }

    if (config.levelSpacing !== undefined && config.levelSpacing < 0) {
      errors.push('levelSpacing must be non-negative');
    }

    if (config.spiralTurns !== undefined && config.spiralTurns < 0) {
      errors.push('spiralTurns must be non-negative');
    }

    if (config.angularPadding !== undefined && config.angularPadding < 0) {
      errors.push('angularPadding must be non-negative');
    }

    return errors;
  }
}