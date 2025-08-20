/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { EntityGraphVertex, EntityGraphEdge } from '@/types/entity-graph';
import { EdgeType } from '@/types/entity-graph';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

import { 
  createForceSimulation, 
  createCircularLayout,
  createForceSimulationWithWorker,
  SimulationConfig,
  PositionedVertex,
  OptimizedSimulationConfig,
  HierarchicalLayoutConfig,
  createHierarchicalLayout,
  calculateLayoutBounds,
  optimizeForLargeGraphs
} from './force-simulation-enhanced';

// Test data generators
function generateTestVertices(count: number): EntityGraphVertex[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `vertex-${i}`,
    displayName: `Vertex ${i}`,
    entityType: EntityType.WORK,
    directlyVisited: i % 3 === 0,
    firstSeen: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    visitCount: Math.floor(Math.random() * 10),
    encounters: [],
    encounterStats: {
      totalEncounters: Math.floor(Math.random() * 5),
      searchResultCount: Math.floor(Math.random() * 3),
      relatedEntityCount: Math.floor(Math.random() * 2),
    },
    metadata: {
      citedByCount: Math.floor(Math.random() * 1000),
      url: `https://example.com/work/${i}`,
      // Add depth for hierarchical layout tests
      ...(i < 100 ? { depth: Math.floor(i / 10) } : {}),
    } as any, // Use any to allow depth property
    position: undefined,
  }));
}

function generateTestEdges(vertices: EntityGraphVertex[], density = 0.1): EntityGraphEdge[] {
  const edges: EntityGraphEdge[] = [];
  const vertexIds = vertices.map(v => v.id);
  
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      if (Math.random() < density) {
        edges.push({
          id: `edge-${i}-${j}`,
          sourceId: vertexIds[i],
          targetId: vertexIds[j],
          source: vertexIds[i],
          target: vertexIds[j],
          edgeType: EdgeType.CITES,
          type: EdgeType.CITES,
          weight: Math.random() * 0.5 + 0.5,
          discoveredFromDirectVisit: true,
          discoveredAt: new Date().toISOString(),
          metadata: {
            source: 'openalex' as const,
            confidence: Math.random(),
          },
        });
      }
    }
  }
  
  return edges;
}

describe('Enhanced Force Simulation Performance Tests', () => {
  describe('Basic Force Simulation', () => {
    it('should handle small graphs efficiently', () => {
      const vertices = generateTestVertices(10);
      const edges = generateTestEdges(vertices, 0.3);
      const config: SimulationConfig = {
        width: 800,
        height: 600,
        iterations: 50,
      };

      const start = performance.now();
      const result = createForceSimulation(vertices, edges, config);
      const duration = performance.now() - start;

      expect(result).toHaveLength(10);
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
      
      // Verify all vertices have valid positions
      result.forEach(vertex => {
        expect(vertex.x).toBeGreaterThanOrEqual(0);
        expect(vertex.y).toBeGreaterThanOrEqual(0);
        expect(vertex.x).toBeLessThanOrEqual(config.width);
        expect(vertex.y).toBeLessThanOrEqual(config.height);
      });
    });

    it('should handle medium graphs with acceptable performance', () => {
      const vertices = generateTestVertices(100);
      const edges = generateTestEdges(vertices, 0.1);
      const config: SimulationConfig = {
        width: 1200,
        height: 800,
        iterations: 100,
      };

      const start = performance.now();
      const result = createForceSimulation(vertices, edges, config);
      const duration = performance.now() - start;

      expect(result).toHaveLength(100);
      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
      
      // Check for reasonable distribution
      const centerX = config.width / 2;
      const centerY = config.height / 2;
      const distances = result.map(v => 
        Math.sqrt((v.x - centerX) ** 2 + (v.y - centerY) ** 2)
      );
      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
      
      expect(avgDistance).toBeGreaterThan(50); // Vertices should spread out
      expect(avgDistance).toBeLessThan(Math.min(config.width, config.height) / 2);
    });
  });

  describe('Optimized Large Graph Simulation', () => {
    it('should optimize configuration for large graphs', () => {
      const vertices = generateTestVertices(1000);
      const edges = generateTestEdges(vertices, 0.02);
      
      const optimizedConfig = optimizeForLargeGraphs(vertices, edges, {
        width: 1600,
        height: 1200,
        targetFrameRate: 30,
        maxRenderNodes: 500,
      });

      expect(optimizedConfig.iterations).toBeLessThanOrEqual(100);
      expect(optimizedConfig.repulsionStrength).toBeLessThan(1000);
      expect(optimizedConfig.useQuadTree).toBe(true);
      expect(optimizedConfig.adaptiveIterations).toBe(true);
    });

    it('should handle large graphs with performance constraints', async () => {
      const vertices = generateTestVertices(500);
      const edges = generateTestEdges(vertices, 0.03);
      const config: OptimizedSimulationConfig = {
        width: 1600,
        height: 1200,
        iterations: 50,
        useQuadTree: true,
        adaptiveIterations: true,
        performanceBudget: 1000, // 1 second max
      };

      const start = performance.now();
      const result = createForceSimulation(vertices, edges, config);
      const duration = performance.now() - start;

      expect(result).toHaveLength(500);
      expect(duration).toBeLessThan(config.performanceBudget!);
      
      // Verify positions are within bounds
      result.forEach(vertex => {
        expect(vertex.x).toBeGreaterThanOrEqual(0);
        expect(vertex.y).toBeGreaterThanOrEqual(0);
        expect(vertex.x).toBeLessThanOrEqual(config.width);
        expect(vertex.y).toBeLessThanOrEqual(config.height);
      });
    });
  });

  describe('Web Worker Integration', () => {
    let mockWorker: any;
    
    beforeEach(() => {
      // Create mock worker instance
      mockWorker = {
        postMessage: vi.fn(),
        terminate: vi.fn(),
        onmessage: null,
        onerror: null,
      };
      
      // Mock Worker constructor to return our mock instance
      global.Worker = vi.fn().mockImplementation(() => mockWorker);
    });

    it('should support web worker simulation for large graphs', async () => {
      const vertices = generateTestVertices(200);
      const edges = generateTestEdges(vertices, 0.05);
      const config: SimulationConfig = {
        width: 1200,
        height: 800,
        iterations: 100,
      };

      const simulationPromise = createForceSimulationWithWorker(vertices, edges, config);

      // Simulate worker completion
      setTimeout(() => {
        const positionedVertices = vertices.map((vertex, _index) => ({
          ...vertex,
          x: Math.random() * config.width,
          y: Math.random() * config.height,
        }));
        
        if (mockWorker.onmessage) {
          mockWorker.onmessage({
            data: {
              type: 'simulation-complete',
              vertices: positionedVertices,
            }
          });
        }
      }, 50);

      const result = await simulationPromise;
      
      expect(result).toHaveLength(200);
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'run-simulation',
        vertices,
        edges,
        config,
      });
    });

    it('should fallback to main thread if worker fails', async () => {
      const vertices = generateTestVertices(50);
      const edges = generateTestEdges(vertices, 0.1);
      const config: SimulationConfig = {
        width: 800,
        height: 600,
        iterations: 50,
      };

      const simulationPromise = createForceSimulationWithWorker(vertices, edges, config);

      // Simulate worker error
      setTimeout(() => {
        if (mockWorker.onerror) {
          mockWorker.onerror(new Error('Worker failed'));
        }
      }, 10);

      const result = await simulationPromise;
      
      expect(result).toHaveLength(50);
      // Should still get valid results from fallback
      result.forEach(vertex => {
        expect(vertex.x).toBeTypeOf('number');
        expect(vertex.y).toBeTypeOf('number');
      });
    });
  });

  describe('Hierarchical Layout', () => {
    it('should create hierarchical layout for citation networks', () => {
      const vertices = generateTestVertices(50);
      // Depth is already added in generateTestVertices for hierarchical tests
      
      const edges = generateTestEdges(vertices, 0.08);
      const config: HierarchicalLayoutConfig = {
        width: 1200,
        height: 800,
        levelHeight: 150,
        nodeSpacing: 60,
        direction: 'vertical',
        alignMethod: 'center',
      };

      const result = createHierarchicalLayout(vertices, edges, config);

      expect(result).toHaveLength(50);
      
      // Verify hierarchical positioning
      const levels = new Map<number, PositionedVertex[]>();
      result.forEach(vertex => {
        const depth = (vertex.metadata as any).depth || 0;
        if (!levels.has(depth)) {
          levels.set(depth, []);
        }
        levels.get(depth)!.push(vertex);
      });

      // Check that vertices at same depth have similar Y coordinates
      levels.forEach((levelVertices, depth) => {
        const expectedY = depth * config.levelHeight + config.levelHeight / 2;
        levelVertices.forEach(vertex => {
          expect(Math.abs(vertex.y - expectedY)).toBeLessThan(config.levelHeight / 4);
        });
      });
    });

    it('should handle horizontal hierarchical layout', () => {
      const vertices = generateTestVertices(30);
      vertices.forEach((vertex, _index) => {
        (vertex.metadata as any).depth = Math.floor(_index / 6); // 5 levels
      });
      
      const edges = generateTestEdges(vertices, 0.1);
      const config: HierarchicalLayoutConfig = {
        width: 1200,
        height: 800,
        levelHeight: 200,
        nodeSpacing: 50,
        direction: 'horizontal',
        alignMethod: 'center',
      };

      const result = createHierarchicalLayout(vertices, edges, config);

      expect(result).toHaveLength(30);
      
      // For horizontal layout, check X coordinates are organized by depth
      const levels = new Map<number, PositionedVertex[]>();
      result.forEach(vertex => {
        const depth = (vertex.metadata as any).depth || 0;
        if (!levels.has(depth)) {
          levels.set(depth, []);
        }
        levels.get(depth)!.push(vertex);
      });

      levels.forEach((levelVertices, depth) => {
        const expectedX = depth * config.levelHeight + config.levelHeight / 2;
        levelVertices.forEach(vertex => {
          expect(Math.abs(vertex.x - expectedX)).toBeLessThan(config.levelHeight / 4);
        });
      });
    });
  });

  describe('Layout Optimization', () => {
    it('should calculate optimal layout bounds', () => {
      const vertices = generateTestVertices(100);
      const bounds = calculateLayoutBounds(vertices, { padding: 50 });

      expect(bounds.width).toBeGreaterThan(0);
      expect(bounds.height).toBeGreaterThan(0);
      expect(bounds.width).toBeGreaterThanOrEqual(500); // Minimum viable width
      expect(bounds.height).toBeGreaterThanOrEqual(400); // Minimum viable height
    });

    it('should adapt layout for different aspect ratios', () => {
      const vertices = generateTestVertices(80);
      
      // Test wide layout
      const wideConfig: SimulationConfig = {
        width: 1600,
        height: 400,
        iterations: 50,
      };
      
      const wideResult = createForceSimulation(vertices, [], wideConfig);
      
      // Verify vertices spread horizontally
      const xPositions = wideResult.map(v => v.x);
      const xRange = Math.max(...xPositions) - Math.min(...xPositions);
      const yPositions = wideResult.map(v => v.y);
      const yRange = Math.max(...yPositions) - Math.min(...yPositions);
      
      expect(xRange).toBeGreaterThan(yRange); // Should be wider than tall
      
      // Test tall layout
      const tallConfig: SimulationConfig = {
        width: 400,
        height: 1200,
        iterations: 50,
      };
      
      const tallResult = createForceSimulation(vertices, [], tallConfig);
      
      const tallXPositions = tallResult.map(v => v.x);
      const tallXRange = Math.max(...tallXPositions) - Math.min(...tallXPositions);
      const tallYPositions = tallResult.map(v => v.y);
      const tallYRange = Math.max(...tallYPositions) - Math.min(...tallYPositions);
      
      expect(tallYRange).toBeGreaterThan(tallXRange); // Should be taller than wide
    });
  });

  describe('Performance Benchmarks', () => {
    it('should maintain performance standards for citation networks', () => {
      const testCases = [
        { nodeCount: 50, edgeDensity: 0.1, maxTime: 200 },
        { nodeCount: 100, edgeDensity: 0.08, maxTime: 500 },
        { nodeCount: 200, edgeDensity: 0.05, maxTime: 1500 },
        { nodeCount: 500, edgeDensity: 0.02, maxTime: 5000 },
      ];

      testCases.forEach(({ nodeCount, edgeDensity, maxTime }) => {
        const vertices = generateTestVertices(nodeCount);
        const edges = generateTestEdges(vertices, edgeDensity);
        const config: SimulationConfig = {
          width: 1200,
          height: 800,
          iterations: Math.min(100, Math.max(20, 200 - Math.floor(nodeCount / 10))),
        };

        const start = performance.now();
        const result = createForceSimulation(vertices, edges, config);
        const duration = performance.now() - start;

        expect(result).toHaveLength(nodeCount);
        expect(duration).toBeLessThan(maxTime);
      });
    });

    it('should scale iterations based on graph complexity', () => {
      const simpleVertices = generateTestVertices(20);
      const simpleEdges = generateTestEdges(simpleVertices, 0.05);
      
      const complexVertices = generateTestVertices(20);
      const complexEdges = generateTestEdges(complexVertices, 0.5);

      const simpleConfig = optimizeForLargeGraphs(simpleVertices, simpleEdges, {
        width: 800,
        height: 600,
      });
      
      const complexConfig = optimizeForLargeGraphs(complexVertices, complexEdges, {
        width: 800,
        height: 600,
      });

      // More complex graphs should need more iterations
      expect(complexConfig.iterations || 0).toBeGreaterThanOrEqual(simpleConfig.iterations || 0);
    });
  });
});