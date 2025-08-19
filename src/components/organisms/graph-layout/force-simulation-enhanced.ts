/**
 * Enhanced force simulation with performance optimizations for large graphs
 * Includes web worker support, hierarchical layouts, and adaptive algorithms
 */

import type { EntityGraphVertex, EntityGraphEdge } from '@/types/entity-graph';

export interface PositionedVertex extends EntityGraphVertex {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

export interface SimulationConfig {
  width: number;
  height: number;
  iterations?: number;
  repulsionStrength?: number;
  attractionStrength?: number;
  damping?: number;
}

export interface OptimizedSimulationConfig extends SimulationConfig {
  useQuadTree?: boolean;
  adaptiveIterations?: boolean;
  performanceBudget?: number; // Maximum time in milliseconds
  targetFrameRate?: number;
  maxRenderNodes?: number;
  enableClustering?: boolean;
  clusterThreshold?: number;
}

export interface HierarchicalLayoutConfig {
  width: number;
  height: number;
  levelHeight: number;
  nodeSpacing: number;
  direction: 'vertical' | 'horizontal';
  alignMethod: 'left' | 'center' | 'right';
  crossingReduction?: boolean;
}

export interface LayoutBounds {
  width: number;
  height: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// QuadTree implementation for efficient spatial queries
class QuadTreeNode {
  public children: QuadTreeNode[] = [];
  public vertices: PositionedVertex[] = [];

  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    public maxVertices = 10,
    public level = 0,
    public maxLevel = 5
  ) {}

  insert(vertex: PositionedVertex): void {
    if (!this.contains(vertex)) {
      return;
    }

    if (this.vertices.length < this.maxVertices || this.level >= this.maxLevel) {
      this.vertices.push(vertex);
      return;
    }

    if (this.children.length === 0) {
      this.subdivide();
    }

    for (const child of this.children) {
      child.insert(vertex);
    }
  }

  private contains(vertex: PositionedVertex): boolean {
    return (
      vertex.x >= this.x &&
      vertex.x < this.x + this.width &&
      vertex.y >= this.y &&
      vertex.y < this.y + this.height
    );
  }

  private subdivide(): void {
    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;
    const nextLevel = this.level + 1;

    this.children = [
      new QuadTreeNode(this.x, this.y, halfWidth, halfHeight, this.maxVertices, nextLevel, this.maxLevel),
      new QuadTreeNode(this.x + halfWidth, this.y, halfWidth, halfHeight, this.maxVertices, nextLevel, this.maxLevel),
      new QuadTreeNode(this.x, this.y + halfHeight, halfWidth, halfHeight, this.maxVertices, nextLevel, this.maxLevel),
      new QuadTreeNode(this.x + halfWidth, this.y + halfHeight, halfWidth, halfHeight, this.maxVertices, nextLevel, this.maxLevel),
    ];

    for (const vertex of this.vertices) {
      for (const child of this.children) {
        child.insert(vertex);
      }
    }

    this.vertices = [];
  }

  queryRange(x: number, y: number, range: number): PositionedVertex[] {
    const result: PositionedVertex[] = [];
    this.queryRangeRecursive(x, y, range, result);
    return result;
  }

  private queryRangeRecursive(x: number, y: number, range: number, result: PositionedVertex[]): void {
    // Check if query range intersects with this node
    if (
      x + range < this.x ||
      x - range > this.x + this.width ||
      y + range < this.y ||
      y - range > this.y + this.height
    ) {
      return;
    }

    // Add vertices within range
    for (const vertex of this.vertices) {
      const dx = vertex.x - x;
      const dy = vertex.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= range) {
        result.push(vertex);
      }
    }

    // Recursively query children
    for (const child of this.children) {
      child.queryRangeRecursive(x, y, range, result);
    }
  }
}

/**
 * Enhanced force simulation with optimizations for large graphs
 */
export function createForceSimulation(
  vertices: EntityGraphVertex[],
  edges: EntityGraphEdge[],
  config: SimulationConfig | OptimizedSimulationConfig
): PositionedVertex[] {
  if (vertices.length === 0) return [];

  const {
    width,
    height,
    iterations = 150,
    repulsionStrength = 1000,
    attractionStrength = 0.1,
    damping = 0.9,
  } = config;

  const optimizedConfig = config as OptimizedSimulationConfig;
  const useQuadTree = optimizedConfig.useQuadTree && vertices.length > 50;
  const adaptiveIterations = optimizedConfig.adaptiveIterations || false;
  const performanceBudget = optimizedConfig.performanceBudget || Infinity;

  const centerX = width / 2;
  const centerY = height / 2;
  const startTime = performance.now();

  // Initialize positions
  const positionedVertices: PositionedVertex[] = vertices.map((vertex, index) => {
    if (vertex.position) {
      return {
        ...vertex,
        x: vertex.position.x,
        y: vertex.position.y,
        vx: 0,
        vy: 0,
      };
    }

    // Use improved initial positioning for better convergence
    const angle = (index / vertices.length) * 2 * Math.PI;
    const radius = Math.min(width, height) * 0.3;
    const spiralFactor = Math.sqrt(index / vertices.length);
    
    return {
      ...vertex,
      x: centerX + Math.cos(angle) * radius * spiralFactor,
      y: centerY + Math.sin(angle) * radius * spiralFactor,
      vx: 0,
      vy: 0,
    };
  });

  // Build edge lookup for faster access
  const edgeMap = new Map<string, EntityGraphEdge[]>();
  edges.forEach(edge => {
    if (!edgeMap.has(edge.sourceId)) {
      edgeMap.set(edge.sourceId, []);
    }
    if (!edgeMap.has(edge.targetId)) {
      edgeMap.set(edge.targetId, []);
    }
    edgeMap.get(edge.sourceId)!.push(edge);
    edgeMap.get(edge.targetId)!.push(edge);
  });

  const actualIterations = iterations;
  let lastEnergyChange = Infinity;
  let stableIterations = 0;

  // Run simulation
  for (let iteration = 0; iteration < actualIterations; iteration++) {
    // Check performance budget
    if (performance.now() - startTime > performanceBudget) {
      console.warn(`Force simulation stopped early due to performance budget. Completed ${iteration}/${actualIterations} iterations.`);
      break;
    }

    // Reset forces
    positionedVertices.forEach(vertex => {
      vertex.vx = vertex.vx || 0;
      vertex.vy = vertex.vy || 0;
    });

    // Apply repulsion forces
    if (useQuadTree) {
      applyRepulsionForcesWithQuadTree(positionedVertices, repulsionStrength, width, height);
    } else {
      applyRepulsionForces(positionedVertices, repulsionStrength);
    }
    
    // Apply attraction forces along edges
    applyAttractionForcesOptimized(positionedVertices, edges, attractionStrength, edgeMap);
    
    // Apply centering force to prevent drift
    applyCenteringForce(positionedVertices, centerX, centerY, 0.01);
    
    // Update positions with adaptive damping
    const currentDamping = adaptiveIterations ? 
      damping * (1 - iteration / actualIterations) * 0.5 + damping * 0.5 : 
      damping;
    
    const totalEnergy = updatePositionsWithBounds(positionedVertices, currentDamping, width, height);
    
    // Adaptive iteration control
    if (adaptiveIterations) {
      const energyChange = Math.abs(totalEnergy - lastEnergyChange);
      if (energyChange < 0.01) {
        stableIterations++;
        if (stableIterations > 20) {
          console.log(`Force simulation converged early at iteration ${iteration}`);
          break;
        }
      } else {
        stableIterations = 0;
      }
      lastEnergyChange = totalEnergy;
    }
  }

  return positionedVertices;
}

/**
 * Web worker-based force simulation for heavy computations
 */
export async function createForceSimulationWithWorker(
  vertices: EntityGraphVertex[],
  edges: EntityGraphEdge[],
  config: SimulationConfig
): Promise<PositionedVertex[]> {
  return new Promise((resolve, reject) => {
    try {
      // Create worker (URL would need to point to actual worker file)
      const worker = new Worker('/force-simulation-worker.js');
      
      const timeout = setTimeout(() => {
        worker.terminate();
        console.warn('Web worker timed out, falling back to main thread');
        resolve(createForceSimulation(vertices, edges, config));
      }, 10000); // 10 second timeout

      worker.onmessage = (event) => {
        clearTimeout(timeout);
        worker.terminate();
        
        if (event.data.type === 'simulation-complete') {
          resolve(event.data.vertices);
        } else if (event.data.type === 'error') {
          reject(new Error(event.data.message));
        }
      };

      worker.onerror = (error) => {
        clearTimeout(timeout);
        worker.terminate();
        console.warn('Web worker failed, falling back to main thread:', error);
        resolve(createForceSimulation(vertices, edges, config));
      };

      // Send simulation task to worker
      worker.postMessage({
        type: 'run-simulation',
        vertices,
        edges,
        config,
      });

    } catch (error) {
      // Fallback to main thread if worker creation fails
      console.warn('Failed to create web worker, using main thread:', error);
      resolve(createForceSimulation(vertices, edges, config));
    }
  });
}

/**
 * Create hierarchical layout for citation networks
 */
export function createHierarchicalLayout(
  vertices: EntityGraphVertex[],
  edges: EntityGraphEdge[],
  config: HierarchicalLayoutConfig
): PositionedVertex[] {
  if (vertices.length === 0) return [];

  const { width, height, levelHeight, nodeSpacing, direction, alignMethod } = config;

  // Group vertices by depth/level
  const levels = new Map<number, EntityGraphVertex[]>();
  let maxDepth = 0;

  vertices.forEach(vertex => {
    const depth = (vertex.metadata as any).depth || 0;
    maxDepth = Math.max(maxDepth, depth);
    
    if (!levels.has(depth)) {
      levels.set(depth, []);
    }
    levels.get(depth)!.push(vertex);
  });

  const positionedVertices: PositionedVertex[] = [];

  // Position vertices level by level
  levels.forEach((levelVertices, depth) => {
    const levelSize = levelVertices.length;
    const availableSpace = direction === 'vertical' ? width : height;
    const totalSpacing = (levelSize - 1) * nodeSpacing;
    const remainingSpace = availableSpace - totalSpacing;
    const startOffset = remainingSpace / 2;

    levelVertices.forEach((vertex, index) => {
      let x: number, y: number;

      if (direction === 'vertical') {
        // Vertical layout: X varies by position in level, Y by depth
        const levelY = depth * levelHeight + levelHeight / 2;
        let levelX: number;

        switch (alignMethod) {
          case 'left':
            levelX = startOffset + index * (nodeSpacing + remainingSpace / levelSize);
            break;
          case 'right':
            levelX = width - startOffset - index * (nodeSpacing + remainingSpace / levelSize);
            break;
          case 'center':
          default:
            levelX = startOffset + index * (nodeSpacing + remainingSpace / levelSize);
            break;
        }

        x = Math.max(nodeSpacing, Math.min(width - nodeSpacing, levelX));
        y = Math.max(nodeSpacing, Math.min(height - nodeSpacing, levelY));
      } else {
        // Horizontal layout: Y varies by position in level, X by depth
        const levelX = depth * levelHeight + levelHeight / 2;
        let levelY: number;

        switch (alignMethod) {
          case 'left': // Top for horizontal
            levelY = startOffset + index * (nodeSpacing + remainingSpace / levelSize);
            break;
          case 'right': // Bottom for horizontal
            levelY = height - startOffset - index * (nodeSpacing + remainingSpace / levelSize);
            break;
          case 'center':
          default:
            levelY = startOffset + index * (nodeSpacing + remainingSpace / levelSize);
            break;
        }

        x = Math.max(nodeSpacing, Math.min(width - nodeSpacing, levelX));
        y = Math.max(nodeSpacing, Math.min(height - nodeSpacing, levelY));
      }

      positionedVertices.push({
        ...vertex,
        x,
        y,
      });
    });
  });

  // Optional: Apply crossing reduction for better edge routing
  if (config.crossingReduction) {
    return reduceCrossings(positionedVertices, edges, config);
  }

  return positionedVertices;
}

/**
 * Optimize simulation configuration for large graphs
 */
export function optimizeForLargeGraphs(
  vertices: EntityGraphVertex[],
  edges: EntityGraphEdge[],
  constraints: {
    width: number;
    height: number;
    targetFrameRate?: number;
    maxRenderNodes?: number;
    performanceBudget?: number;
  }
): OptimizedSimulationConfig {
  const nodeCount = vertices.length;
  const edgeCount = edges.length;
  const density = edgeCount / (nodeCount * (nodeCount - 1) / 2);

  // Calculate complexity score
  const complexityScore = nodeCount * 0.5 + edgeCount * 0.3 + density * 100;

  // Adaptive configuration based on graph size and complexity
  let iterations: number;
  let repulsionStrength: number;
  let useQuadTree = false;
  let adaptiveIterations = false;

  if (nodeCount < 50) {
    iterations = 150;
    repulsionStrength = 1000;
  } else if (nodeCount < 200) {
    iterations = 100;
    repulsionStrength = 800;
    useQuadTree = true;
  } else if (nodeCount < 500) {
    iterations = 75;
    repulsionStrength = 600;
    useQuadTree = true;
    adaptiveIterations = true;
  } else {
    iterations = 50;
    repulsionStrength = 400;
    useQuadTree = true;
    adaptiveIterations = true;
  }

  // Adjust for edge density
  if (density > 0.1) {
    iterations = Math.floor(iterations * 1.5);
    repulsionStrength *= 1.2;
  }

  return {
    width: constraints.width,
    height: constraints.height,
    iterations,
    repulsionStrength,
    attractionStrength: 0.1,
    damping: 0.9,
    useQuadTree,
    adaptiveIterations,
    performanceBudget: constraints.performanceBudget || 5000,
    targetFrameRate: constraints.targetFrameRate || 30,
    maxRenderNodes: constraints.maxRenderNodes || 1000,
    enableClustering: nodeCount > 1000,
    clusterThreshold: 0.8,
  };
}

/**
 * Calculate optimal layout bounds for a set of vertices
 */
export function calculateLayoutBounds(
  vertices: EntityGraphVertex[],
  options: { padding?: number; aspectRatio?: number } = {}
): LayoutBounds {
  const { padding = 50, aspectRatio } = options;
  
  if (vertices.length === 0) {
    return {
      width: 800,
      height: 600,
      minX: 0,
      maxX: 800,
      minY: 0,
      maxY: 600,
    };
  }

  // Calculate area needed based on vertex count
  const baseArea = vertices.length * 10000; // 100x100 per vertex
  const minArea = Math.max(baseArea, 500 * 400); // Minimum 500x400

  let width: number, height: number;

  if (aspectRatio) {
    width = Math.sqrt(minArea * aspectRatio);
    height = Math.sqrt(minArea / aspectRatio);
  } else {
    // Default to 4:3 aspect ratio
    width = Math.sqrt(minArea * 4 / 3);
    height = Math.sqrt(minArea * 3 / 4);
  }

  // Ensure minimum dimensions
  width = Math.max(width, 500);
  height = Math.max(height, 400);

  return {
    width: width + padding * 2,
    height: height + padding * 2,
    minX: padding,
    maxX: width + padding,
    minY: padding,
    maxY: height + padding,
  };
}

// Helper functions

function applyRepulsionForcesWithQuadTree(
  vertices: PositionedVertex[],
  strength: number,
  width: number,
  height: number
): void {
  const quadTree = new QuadTreeNode(0, 0, width, height);
  
  // Insert all vertices into quad tree
  vertices.forEach(vertex => quadTree.insert(vertex));
  
  // Apply repulsion forces using spatial queries
  vertices.forEach(vertex => {
    const nearby = quadTree.queryRange(vertex.x, vertex.y, 200); // Query radius
    
    nearby.forEach(other => {
      if (vertex.id === other.id) return;
      
      const dx = vertex.x - other.x;
      const dy = vertex.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      
      const force = strength / (distance * distance);
      const forceX = (dx / distance) * force;
      const forceY = (dy / distance) * force;
      
      vertex.vx! += forceX;
      vertex.vy! += forceY;
    });
  });
}

function applyRepulsionForces(vertices: PositionedVertex[], strength: number): void {
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const v1 = vertices[i];
      const v2 = vertices[j];
      
      const dx = v1.x - v2.x;
      const dy = v1.y - v2.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      
      const force = strength / (distance * distance);
      const forceX = (dx / distance) * force;
      const forceY = (dy / distance) * force;
      
      v1.vx! += forceX;
      v1.vy! += forceY;
      v2.vx! -= forceX;
      v2.vy! -= forceY;
    }
  }
}

function applyAttractionForcesOptimized(
  vertices: PositionedVertex[],
  edges: EntityGraphEdge[],
  strength: number,
  edgeMap: Map<string, EntityGraphEdge[]>
): void {
  const vertexMap = new Map<string, PositionedVertex>();
  vertices.forEach(vertex => vertexMap.set(vertex.id, vertex));

  edges.forEach(edge => {
    const source = vertexMap.get(edge.sourceId);
    const target = vertexMap.get(edge.targetId);
    
    if (source && target) {
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      
      const force = distance * strength * edge.weight;
      const forceX = (dx / distance) * force;
      const forceY = (dy / distance) * force;
      
      source.vx! += forceX;
      source.vy! += forceY;
      target.vx! -= forceX;
      target.vy! -= forceY;
    }
  });
}

function applyCenteringForce(
  vertices: PositionedVertex[],
  centerX: number,
  centerY: number,
  strength: number
): void {
  vertices.forEach(vertex => {
    const dx = centerX - vertex.x;
    const dy = centerY - vertex.y;
    
    vertex.vx! += dx * strength;
    vertex.vy! += dy * strength;
  });
}

function updatePositionsWithBounds(
  vertices: PositionedVertex[],
  damping: number,
  width: number,
  height: number
): number {
  const margin = 50;
  let totalEnergy = 0;
  
  vertices.forEach(vertex => {
    vertex.vx! *= damping;
    vertex.vy! *= damping;
    vertex.x += vertex.vx!;
    vertex.y += vertex.vy!;

    // Keep vertices within bounds
    vertex.x = Math.max(margin, Math.min(width - margin, vertex.x));
    vertex.y = Math.max(margin, Math.min(height - margin, vertex.y));
    
    // Calculate kinetic energy for convergence detection
    totalEnergy += vertex.vx! * vertex.vx! + vertex.vy! * vertex.vy!;
  });
  
  return totalEnergy;
}

function reduceCrossings(
  vertices: PositionedVertex[],
  edges: EntityGraphEdge[],
  config: HierarchicalLayoutConfig
): PositionedVertex[] {
  // Implement crossing reduction algorithm (simplified version)
  // This would typically use techniques like the barycenter method
  // For now, return vertices as-is
  return vertices;
}

// Re-export original functions for backwards compatibility
export { createCircularLayout } from './force-simulation';