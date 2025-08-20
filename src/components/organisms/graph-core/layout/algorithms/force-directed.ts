/**
 * Force-Directed Layout Algorithm
 * 
 * Implements a generic force-directed graph layout using the Fruchterman-Reingold
 * algorithm with customizable forces and parameters. Provides smooth animations
 * and supports various constraints and optimizations.
 */

import {
  LayoutAlgorithm,
  LayoutConfig,
  LayoutVertex,
  LayoutEdge,
  LayoutResult,
  PositionWithVelocity,
} from '../layout-engine';

/**
 * Configuration for force-directed layout
 */
export interface ForceDirectedConfig extends LayoutConfig {
  /** Maximum number of simulation iterations */
  maxIterations?: number;
  /** Convergence threshold (when to stop) */
  convergenceThreshold?: number;
  /** Repulsion force strength */
  repulsionStrength?: number;
  /** Attraction force strength */
  attractionStrength?: number;
  /** Velocity damping factor */
  damping?: number;
  /** Cooling factor (reduces forces over time) */
  cooling?: number;
  /** Initial temperature for simulated annealing */
  initialTemperature?: number;
  /** Minimum distance between nodes */
  minDistance?: number;
  /** Maximum force magnitude */
  maxForce?: number;
  /** Whether to use edge lengths based on weights */
  useEdgeWeights?: boolean;
  /** Target edge length multiplier */
  edgeLengthMultiplier?: number;
  /** Whether to separate disconnected components */
  separateComponents?: boolean;
  /** Central gravity strength */
  centralGravity?: number;
  /** Whether to generate animation frames */
  generateFrames?: boolean;
  /** Number of animation frames to generate */
  frameCount?: number;
}

/**
 * Force-directed layout algorithm implementation
 */
export class ForceDirectedLayout<TVertex = unknown, TEdge = unknown> 
  extends LayoutAlgorithm<TVertex, TEdge, ForceDirectedConfig> {

  readonly name = 'force-directed';
  readonly displayName = 'Force-Directed';
  readonly description = 'Physics-based layout using attraction and repulsion forces';

  readonly defaultConfig: Partial<ForceDirectedConfig> = {
    maxIterations: 300,
    convergenceThreshold: 0.01,
    repulsionStrength: 1000,
    attractionStrength: 0.1,
    damping: 0.85,
    cooling: 0.02,
    initialTemperature: 100,
    minDistance: 30,
    maxForce: 100,
    useEdgeWeights: true,
    edgeLengthMultiplier: 1.0,
    separateComponents: true,
    centralGravity: 0.01,
    generateFrames: false,
    frameCount: 60,
  };

  async compute(
    vertices: LayoutVertex<TVertex>[],
    edges: LayoutEdge<TEdge>[],
    config: ForceDirectedConfig
  ): Promise<LayoutResult<TVertex>> {
    if (vertices.length === 0) {
      return {
        positions: new Map(),
        metadata: {
          algorithm: this.name,
          computeTime: 0,
          iterations: 0,
          converged: true,
        },
      };
    }

    const startTime = performance.now();
    const mergedConfig = this.createConfig(config);
    
    // Initialize positions
    const positions = this.initializePositions(vertices, mergedConfig);
    const forces = new Map<string, { x: number; y: number }>();
    
    // Initialize forces
    vertices.forEach(vertex => {
      forces.set(vertex.id, { x: 0, y: 0 });
    });

    // Prepare animation frames if requested
    const animationFrames: Map<string, PositionWithVelocity>[] = [];
    const frameInterval = mergedConfig.generateFrames 
      ? Math.max(1, Math.floor(mergedConfig.maxIterations! / mergedConfig.frameCount!))
      : 0;

    let temperature = mergedConfig.initialTemperature!;
    let converged = false;
    let iterations = 0;

    // Main simulation loop
    for (iterations = 0; iterations < mergedConfig.maxIterations! && !converged; iterations++) {
      // Clear forces
      forces.forEach(force => {
        force.x = 0;
        force.y = 0;
      });

      // Apply repulsion forces between all vertices
      this.applyRepulsionForces(vertices, positions, forces, mergedConfig, temperature);

      // Apply attraction forces along edges
      this.applyAttractionForces(vertices, edges, positions, forces, mergedConfig, temperature);

      // Apply central gravity
      if (mergedConfig.centralGravity! > 0) {
        this.applyCentralGravity(vertices, positions, forces, mergedConfig, temperature);
      }

      // Update positions and check convergence
      const totalMovement = this.updatePositions(
        vertices, 
        positions, 
        forces, 
        mergedConfig, 
        temperature
      );

      // Apply boundary constraints
      this.constrainToBounds(positions, mergedConfig);

      // Check convergence
      const normalizedMovement = totalMovement / vertices.length;
      if (normalizedMovement < mergedConfig.convergenceThreshold!) {
        converged = true;
      }

      // Cool down temperature
      temperature *= (1 - mergedConfig.cooling!);

      // Capture animation frame
      if (mergedConfig.generateFrames && (iterations % frameInterval === 0 || converged)) {
        animationFrames.push(new Map(positions));
      }
    }

    // Separate disconnected components if requested
    if (mergedConfig.separateComponents) {
      this.separateComponents(vertices, edges, positions, mergedConfig);
    }

    const computeTime = performance.now() - startTime;

    // Calculate final energy for quality assessment
    const finalEnergy = this.calculateTotalEnergy(vertices, edges, positions, mergedConfig);

    return {
      positions: new Map(positions),
      metadata: {
        algorithm: this.name,
        computeTime,
        iterations,
        converged,
        finalEnergy,
      },
      animationFrames: animationFrames.length > 0 ? animationFrames : undefined,
    };
  }

  /**
   * Apply repulsion forces between all vertex pairs
   */
  private applyRepulsionForces(
    vertices: LayoutVertex<TVertex>[],
    positions: Map<string, PositionWithVelocity>,
    forces: Map<string, { x: number; y: number }>,
    config: ForceDirectedConfig,
    temperature: number
  ): void {
    const repulsionStrength = config.repulsionStrength! * temperature / config.initialTemperature!;

    for (let i = 0; i < vertices.length; i++) {
      for (let j = i + 1; j < vertices.length; j++) {
        const v1 = vertices[i];
        const v2 = vertices[j];
        
        const pos1 = positions.get(v1.id)!;
        const pos2 = positions.get(v2.id)!;
        
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < config.minDistance!) {
          // Apply strong repulsion for very close nodes
          const adjustedDistance = config.minDistance!;
          const force = repulsionStrength / (adjustedDistance * adjustedDistance);
          const forceX = (dx / adjustedDistance) * force;
          const forceY = (dy / adjustedDistance) * force;
          
          const force1 = forces.get(v1.id)!;
          const force2 = forces.get(v2.id)!;
          
          force1.x += forceX;
          force1.y += forceY;
          force2.x -= forceX;
          force2.y -= forceY;
        } else if (distance > 0) {
          // Normal repulsion
          const force = repulsionStrength / (distance * distance);
          const forceX = (dx / distance) * force;
          const forceY = (dy / distance) * force;
          
          const force1 = forces.get(v1.id)!;
          const force2 = forces.get(v2.id)!;
          
          force1.x += forceX;
          force1.y += forceY;
          force2.x -= forceX;
          force2.y -= forceY;
        }
      }
    }
  }

  /**
   * Apply attraction forces along edges
   */
  private applyAttractionForces(
    vertices: LayoutVertex<TVertex>[],
    edges: LayoutEdge<TEdge>[],
    positions: Map<string, PositionWithVelocity>,
    forces: Map<string, { x: number; y: number }>,
    config: ForceDirectedConfig,
    temperature: number
  ): void {
    const attractionStrength = config.attractionStrength! * temperature / config.initialTemperature!;

    edges.forEach(edge => {
      const sourcePos = positions.get(edge.sourceId);
      const targetPos = positions.get(edge.targetId);
      
      if (!sourcePos || !targetPos) return;

      const dx = targetPos.x - sourcePos.x;
      const dy = targetPos.y - sourcePos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        // Calculate ideal edge length based on weight if enabled
        const idealLength = config.useEdgeWeights 
          ? (1 / edge.weight) * config.edgeLengthMultiplier! * 100
          : config.edgeLengthMultiplier! * 100;

        // Spring force: F = k * (distance - idealLength)
        const force = attractionStrength * edge.weight * (distance - idealLength);
        const forceX = (dx / distance) * force;
        const forceY = (dy / distance) * force;
        
        const sourceForce = forces.get(edge.sourceId)!;
        const targetForce = forces.get(edge.targetId)!;
        
        sourceForce.x += forceX;
        sourceForce.y += forceY;
        targetForce.x -= forceX;
        targetForce.y -= forceY;
      }
    });
  }

  /**
   * Apply central gravity to prevent nodes from drifting away
   */
  private applyCentralGravity(
    vertices: LayoutVertex<TVertex>[],
    positions: Map<string, PositionWithVelocity>,
    forces: Map<string, { x: number; y: number }>,
    config: ForceDirectedConfig,
    temperature: number
  ): void {
    const { width, height } = config.dimensions;
    const centerX = width / 2;
    const centerY = height / 2;
    const gravityStrength = config.centralGravity! * temperature / config.initialTemperature!;

    vertices.forEach(vertex => {
      const position = positions.get(vertex.id)!;
      const force = forces.get(vertex.id)!;
      
      const dx = centerX - position.x;
      const dy = centerY - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        const gravityForce = gravityStrength * distance;
        force.x += (dx / distance) * gravityForce;
        force.y += (dy / distance) * gravityForce;
      }
    });
  }

  /**
   * Update vertex positions based on forces
   */
  private updatePositions(
    vertices: LayoutVertex<TVertex>[],
    positions: Map<string, PositionWithVelocity>,
    forces: Map<string, { x: number; y: number }>,
    config: ForceDirectedConfig,
    temperature: number
  ): number {
    let totalMovement = 0;

    vertices.forEach(vertex => {
      // Skip constrained vertices
      if (config.constraints?.has(vertex.id)) {
        return;
      }

      const position = positions.get(vertex.id)!;
      const force = forces.get(vertex.id)!;

      // Limit force magnitude
      const forceMagnitude = Math.sqrt(force.x * force.x + force.y * force.y);
      if (forceMagnitude > config.maxForce!) {
        const scale = config.maxForce! / forceMagnitude;
        force.x *= scale;
        force.y *= scale;
      }

      // Update velocity with damping
      position.vx = (position.vx || 0) * config.damping! + force.x;
      position.vy = (position.vy || 0) * config.damping! + force.y;

      // Limit velocity based on temperature
      const maxVelocity = temperature;
      const velocityMagnitude = Math.sqrt(position.vx * position.vx + position.vy * position.vy);
      if (velocityMagnitude > maxVelocity) {
        const scale = maxVelocity / velocityMagnitude;
        position.vx *= scale;
        position.vy *= scale;
      }

      // Update position
      const oldX = position.x;
      const oldY = position.y;
      
      position.x += position.vx;
      position.y += position.vy;

      // Track movement for convergence
      const movement = Math.sqrt(
        (position.x - oldX) * (position.x - oldX) + 
        (position.y - oldY) * (position.y - oldY)
      );
      totalMovement += movement;
    });

    return totalMovement;
  }

  /**
   * Separate disconnected components to prevent overlap
   */
  private separateComponents(
    vertices: LayoutVertex<TVertex>[],
    edges: LayoutEdge<TEdge>[],
    positions: Map<string, PositionWithVelocity>,
    config: ForceDirectedConfig
  ): void {
    // Find connected components using DFS
    const components = this.findConnectedComponents(vertices, edges);
    
    if (components.length <= 1) return;

    const { width, height } = config.dimensions;
    const componentsPerRow = Math.ceil(Math.sqrt(components.length));
    const componentWidth = width / componentsPerRow;
    const componentHeight = height / Math.ceil(components.length / componentsPerRow);

    components.forEach((component, _index) => {
      const row = Math.floor(_index / componentsPerRow);
      const col = _index % componentsPerRow;
      
      const targetCenterX = col * componentWidth + componentWidth / 2;
      const targetCenterY = row * componentHeight + componentHeight / 2;

      // Calculate current centroid of component
      let sumX = 0, sumY = 0;
      component.forEach(vertexId => {
        const pos = positions.get(vertexId)!;
        sumX += pos.x;
        sumY += pos.y;
      });

      const currentCenterX = sumX / component.length;
      const currentCenterY = sumY / component.length;

      // Translate component to new position
      const offsetX = targetCenterX - currentCenterX;
      const offsetY = targetCenterY - currentCenterY;

      component.forEach(vertexId => {
        const pos = positions.get(vertexId)!;
        pos.x += offsetX;
        pos.y += offsetY;
      });
    });
  }

  /**
   * Find connected components in the graph
   */
  private findConnectedComponents(
    vertices: LayoutVertex<TVertex>[],
    edges: LayoutEdge<TEdge>[]
  ): string[][] {
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

    const components: string[][] = [];

    // DFS to find components
    vertices.forEach(vertex => {
      if (!visited.has(vertex.id)) {
        const component: string[] = [];
        this.dfs(vertex.id, adjacencyList, visited, component);
        components.push(component);
      }
    });

    return components;
  }

  /**
   * Depth-first search helper
   */
  private dfs(
    vertexId: string,
    adjacencyList: Map<string, Set<string>>,
    visited: Set<string>,
    component: string[]
  ): void {
    visited.add(vertexId);
    component.push(vertexId);

    const neighbors = adjacencyList.get(vertexId) || new Set();
    neighbors.forEach(neighborId => {
      if (!visited.has(neighborId)) {
        this.dfs(neighborId, adjacencyList, visited, component);
      }
    });
  }

  /**
   * Calculate total energy of the system for quality assessment
   */
  private calculateTotalEnergy(
    vertices: LayoutVertex<TVertex>[],
    edges: LayoutEdge<TEdge>[],
    positions: Map<string, PositionWithVelocity>,
    config: ForceDirectedConfig
  ): number {
    let totalEnergy = 0;

    // Kinetic energy from velocities
    positions.forEach(position => {
      const vx = position.vx || 0;
      const vy = position.vy || 0;
      totalEnergy += 0.5 * (vx * vx + vy * vy);
    });

    // Potential energy from repulsion
    for (let i = 0; i < vertices.length; i++) {
      for (let j = i + 1; j < vertices.length; j++) {
        const pos1 = positions.get(vertices[i].id)!;
        const pos2 = positions.get(vertices[j].id)!;
        
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          totalEnergy += config.repulsionStrength! / distance;
        }
      }
    }

    // Potential energy from springs
    edges.forEach(edge => {
      const sourcePos = positions.get(edge.sourceId);
      const targetPos = positions.get(edge.targetId);
      
      if (sourcePos && targetPos) {
        const dx = targetPos.x - sourcePos.x;
        const dy = targetPos.y - sourcePos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const idealLength = config.useEdgeWeights 
          ? (1 / edge.weight) * config.edgeLengthMultiplier! * 100
          : config.edgeLengthMultiplier! * 100;

        const displacement = distance - idealLength;
        totalEnergy += 0.5 * config.attractionStrength! * edge.weight * displacement * displacement;
      }
    });

    return totalEnergy;
  }

  /**
   * Enhanced configuration validation
   */
  validateConfig(config: ForceDirectedConfig): string[] {
    const errors = super.validateConfig(config);

    if (config.maxIterations !== undefined && config.maxIterations < 1) {
      errors.push('maxIterations must be at least 1');
    }

    if (config.convergenceThreshold !== undefined && config.convergenceThreshold <= 0) {
      errors.push('convergenceThreshold must be positive');
    }

    if (config.repulsionStrength !== undefined && config.repulsionStrength < 0) {
      errors.push('repulsionStrength must be non-negative');
    }

    if (config.attractionStrength !== undefined && config.attractionStrength < 0) {
      errors.push('attractionStrength must be non-negative');
    }

    if (config.damping !== undefined && (config.damping < 0 || config.damping > 1)) {
      errors.push('damping must be between 0 and 1');
    }

    if (config.cooling !== undefined && (config.cooling < 0 || config.cooling > 1)) {
      errors.push('cooling must be between 0 and 1');
    }

    if (config.minDistance !== undefined && config.minDistance < 0) {
      errors.push('minDistance must be non-negative');
    }

    if (config.frameCount !== undefined && config.frameCount < 1) {
      errors.push('frameCount must be at least 1');
    }

    return errors;
  }
}