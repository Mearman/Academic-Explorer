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

export function createForceSimulation(
  vertices: EntityGraphVertex[],
  edges: EntityGraphEdge[],
  config: SimulationConfig
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

  const centerX = width / 2;
  const centerY = height / 2;

  // Initialize positions with circular layout or saved positions
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

    const angle = (index / vertices.length) * 2 * Math.PI;
    const radius = Math.min(width, height) * 0.3;
    return {
      ...vertex,
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
    };
  });

  // Run simulation
  for (let iteration = 0; iteration < iterations; iteration++) {
    // Reset forces
    positionedVertices.forEach(vertex => {
      vertex.vx = vertex.vx || 0;
      vertex.vy = vertex.vy || 0;
    });

    // Apply repulsion forces
    applyRepulsionForces(positionedVertices, repulsionStrength);
    
    // Apply attraction forces along edges
    applyAttractionForces(positionedVertices, edges, attractionStrength);
    
    // Update positions with damping and boundary constraints
    updatePositions(positionedVertices, damping, width, height);
  }

  return positionedVertices;
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

function applyAttractionForces(
  vertices: PositionedVertex[],
  edges: EntityGraphEdge[],
  strength: number
): void {
  edges.forEach(edge => {
    const source = vertices.find(v => v.id === edge.sourceId);
    const target = vertices.find(v => v.id === edge.targetId);
    
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

function updatePositions(
  vertices: PositionedVertex[],
  damping: number,
  width: number,
  height: number
): void {
  const margin = 50;
  
  vertices.forEach(vertex => {
    vertex.vx! *= damping;
    vertex.vy! *= damping;
    vertex.x += vertex.vx!;
    vertex.y += vertex.vy!;

    // Keep vertices within bounds
    vertex.x = Math.max(margin, Math.min(width - margin, vertex.x));
    vertex.y = Math.max(margin, Math.min(height - margin, vertex.y));
  });
}

export function createCircularLayout(
  vertices: EntityGraphVertex[],
  width: number,
  height: number
): PositionedVertex[] {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.3;
  
  return vertices.map((vertex, index) => {
    const angle = (index / vertices.length) * 2 * Math.PI;
    return {
      ...vertex,
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  });
}