/**
 * Layout Integration Example
 * 
 * Demonstrates how to use the generic layout engine system with entity graphs.
 * This file shows best practices for integrating custom layout algorithms
 * and working with the layout recommendation system.
 */

import type { EntityGraphVertex, EntityGraphEdge } from '@/types/entity-graph';

import { 
  CircularStrategy, 
  NodeOrdering 
} from '../graph-core/layout/algorithms/circular';

import {
  initializeEnhancedLayoutSystem,
  createSmartLayout,
  createEnhancedForceSimulation,
  createEnhancedCircularLayout,
  getLayoutRecommendations,
  getAlgorithmStats,
  clearLayoutCache,
  type PositionedVertex,
  type OptimizedSimulationConfig
} from './force-simulation-enhanced';

/**
 * Example: Smart layout with automatic algorithm selection
 */
export async function exampleSmartLayout(
  vertices: EntityGraphVertex[],
  edges: EntityGraphEdge[],
  containerDimensions: { width: number; height: number }
): Promise<{
  positions: PositionedVertex[];
  metadata: {
    algorithm: string;
    score: number;
    reasoning: string[];
    vertexCount: number;
    edgeCount: number;
  };
}> {
  console.log('=== Smart Layout Example ===');
  console.log(`Graph: ${vertices.length} vertices, ${edges.length} edges`);

  // Initialize the layout system
  initializeEnhancedLayoutSystem();

  // Get recommendations
  const recommendations = getLayoutRecommendations(vertices, edges, {
    needsAnimation: true,
    needsClustering: vertices.length > 50,
  });

  console.log('Algorithm recommendations:');
  recommendations.forEach((rec, i) => {
    console.log(`${i + 1}. ${rec.displayName} (score: ${rec.score})`);
    console.log(`   Reasoning: ${rec.reasoning.join(', ')}`);
  });

  // Use smart layout with automatic selection
  const result = await createSmartLayout(vertices, edges, {
    width: containerDimensions.width,
    height: containerDimensions.height,
    animated: true,
    performanceBudget: 5000, // 5 seconds max
  });

  console.log(`Selected algorithm: ${result.algorithm}`);
  return result;
}

/**
 * Example: Force-directed layout with custom parameters
 */
export async function exampleAdvancedForceLayout(
  vertices: EntityGraphVertex[],
  edges: EntityGraphEdge[],
  containerDimensions: { width: number; height: number }
): Promise<PositionedVertex[]> {
  console.log('=== Advanced Force Layout Example ===');

  const config: OptimizedSimulationConfig = {
    width: containerDimensions.width,
    height: containerDimensions.height,
    iterations: 200,
    repulsionStrength: 1200,
    attractionStrength: 0.08,
    damping: 0.85,
    useQuadTree: vertices.length > 100,
    adaptiveIterations: true,
    performanceBudget: 8000,
    enableClustering: vertices.length > 200,
    clusterThreshold: 0.7,
  };

  const positions = await createEnhancedForceSimulation(vertices, edges, config);
  
  console.log(`Force layout completed for ${positions.length} vertices`);
  return positions;
}

/**
 * Example: Circular layout with different strategies
 */
export async function exampleCircularLayoutStrategies(
  vertices: EntityGraphVertex[],
  edges: EntityGraphEdge[],
  containerDimensions: { width: number; height: number }
): Promise<{
  simple: PositionedVertex[];
  concentric: PositionedVertex[];
  clustered: PositionedVertex[];
  spiral: PositionedVertex[];
}> {
  console.log('=== Circular Layout Strategies Example ===');

  // Simple circular layout
  const simple = await createEnhancedCircularLayout(vertices, edges, {
    width: containerDimensions.width,
    height: containerDimensions.height,
    strategy: CircularStrategy.SIMPLE,
    ordering: NodeOrdering.DEGREE,
  });

  // Concentric circles based on hierarchy
  const concentric = await createEnhancedCircularLayout(vertices, edges, {
    width: containerDimensions.width,
    height: containerDimensions.height,
    strategy: CircularStrategy.CONCENTRIC,
    ordering: NodeOrdering.DEGREE,
  });

  // Clustered circular layout
  const clustered = await createEnhancedCircularLayout(vertices, edges, {
    width: containerDimensions.width,
    height: containerDimensions.height,
    strategy: CircularStrategy.CLUSTERED,
    ordering: NodeOrdering.OPTIMIZE_CROSSINGS,
  });

  // Spiral layout
  const spiral = await createEnhancedCircularLayout(vertices, edges, {
    width: containerDimensions.width,
    height: containerDimensions.height,
    strategy: CircularStrategy.SPIRAL,
    ordering: NodeOrdering.WEIGHT,
  });

  console.log('Generated all circular layout variations');
  return { simple, concentric, clustered, spiral };
}

/**
 * Example: Performance monitoring and cache management
 */
export function examplePerformanceMonitoring(): void {
  console.log('=== Performance Monitoring Example ===');

  // Get algorithm usage statistics
  const stats = getAlgorithmStats();
  console.log('Algorithm usage statistics:', stats);

  // Log cache performance (would need to be implemented)
  console.log('Layout cache status:');
  // This would require exposing cache stats from the layout engine
  
  // Clear cache for specific patterns
  console.log('Clearing force-directed cache entries...');
  clearLayoutCache(/force/);
  
  // Clear all cache
  console.log('Clearing all cache entries...');
  clearLayoutCache();
}

/**
 * Example: Responsive layout that adapts to container size
 */
export async function exampleResponsiveLayout(
  vertices: EntityGraphVertex[],
  edges: EntityGraphEdge[],
  containerDimensions: { width: number; height: number }
): Promise<PositionedVertex[]> {
  console.log('=== Responsive Layout Example ===');
  console.log(`Container: ${containerDimensions.width}x${containerDimensions.height}`);

  // Choose algorithm based on container size and graph complexity
  const isSmallContainer = containerDimensions.width < 600 || containerDimensions.height < 400;
  const isLargeGraph = vertices.length > 100;
  const isDenseGraph = edges.length > vertices.length * 2;

  if (isSmallContainer) {
    // Use simple circular layout for small containers
    console.log('Using circular layout for small container');
    return await createEnhancedCircularLayout(vertices, edges, {
      width: containerDimensions.width,
      height: containerDimensions.height,
      strategy: CircularStrategy.SIMPLE,
      ordering: NodeOrdering.DEGREE,
    });
  } else if (isLargeGraph && isDenseGraph) {
    // Use optimized force layout for large, dense graphs
    console.log('Using optimized force layout for large, dense graph');
    const config: OptimizedSimulationConfig = {
      width: containerDimensions.width,
      height: containerDimensions.height,
      iterations: 100,
      repulsionStrength: 800,
      attractionStrength: 0.12,
      damping: 0.9,
      useQuadTree: true,
      adaptiveIterations: true,
      performanceBudget: 3000,
      enableClustering: true,
    };
    return await createEnhancedForceSimulation(vertices, edges, config);
  } else {
    // Use smart layout for balanced cases
    console.log('Using smart layout selection');
    const result = await createSmartLayout(vertices, edges, {
      width: containerDimensions.width,
      height: containerDimensions.height,
      animated: false, // Disable animation for better performance
      performanceBudget: 4000,
    });
    return result.positions;
  }
}

/**
 * Example: Layout comparison utility
 */
export async function exampleLayoutComparison(
  vertices: EntityGraphVertex[],
  edges: EntityGraphEdge[],
  containerDimensions: { width: number; height: number }
): Promise<{
  algorithms: string[];
  results: {
    [algorithmName: string]: {
      positions: PositionedVertex[];
      computeTime: number;
      quality: number; // Simple quality metric
    };
  };
  recommendation: string;
}> {
  console.log('=== Layout Comparison Example ===');

  const results: any = {};
  const algorithms = ['force-directed', 'circular-simple', 'circular-concentric'];

  // Test force-directed
  const forceStart = performance.now();
  const forcePositions = await createEnhancedForceSimulation(vertices, edges, {
    width: containerDimensions.width,
    height: containerDimensions.height,
    iterations: 150,
    repulsionStrength: 1000,
    attractionStrength: 0.1,
    damping: 0.9,
  });
  const forceTime = performance.now() - forceStart;

  // Test simple circular
  const circularStart = performance.now();
  const circularPositions = await createEnhancedCircularLayout(vertices, edges, {
    width: containerDimensions.width,
    height: containerDimensions.height,
    strategy: CircularStrategy.SIMPLE,
  });
  const circularTime = performance.now() - circularStart;

  // Test concentric circular
  const concentricStart = performance.now();
  const concentricPositions = await createEnhancedCircularLayout(vertices, edges, {
    width: containerDimensions.width,
    height: containerDimensions.height,
    strategy: CircularStrategy.CONCENTRIC,
  });
  const concentricTime = performance.now() - concentricStart;

  // Calculate simple quality metrics (edge crossing count would be more accurate)
  const calculateQuality = (positions: PositionedVertex[]): number => {
    // Simple metric: inverse of average distance variance
    const distances: number[] = [];
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        distances.push(Math.sqrt(dx * dx + dy * dy));
      }
    }
    
    if (distances.length === 0) return 100;
    
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    const variance = distances.reduce((acc, d) => acc + Math.pow(d - avgDistance, 2), 0) / distances.length;
    return Math.max(0, 100 - Math.sqrt(variance) / 10);
  };

  results['force-directed'] = {
    positions: forcePositions,
    computeTime: forceTime,
    quality: calculateQuality(forcePositions),
  };

  results['circular-simple'] = {
    positions: circularPositions,
    computeTime: circularTime,
    quality: calculateQuality(circularPositions),
  };

  results['circular-concentric'] = {
    positions: concentricPositions,
    computeTime: concentricTime,
    quality: calculateQuality(concentricPositions),
  };

  // Find best algorithm (simple scoring: 70% quality, 30% speed)
  let bestAlgorithm = '';
  let bestScore = -1;

  Object.entries(results).forEach(([name, result]: [string, any]) => {
    const speedScore = Math.max(0, 100 - result.computeTime / 50); // Normalize to ~100ms baseline
    const combinedScore = result.quality * 0.7 + speedScore * 0.3;
    
    console.log(`${name}: Quality=${result.quality.toFixed(1)}, Time=${result.computeTime.toFixed(1)}ms, Score=${combinedScore.toFixed(1)}`);
    
    if (combinedScore > bestScore) {
      bestScore = combinedScore;
      bestAlgorithm = name;
    }
  });

  console.log(`Best algorithm: ${bestAlgorithm} (score: ${bestScore.toFixed(1)})`);

  return {
    algorithms,
    results,
    recommendation: bestAlgorithm,
  };
}

/**
 * Example usage in a React component
 */
export const exampleReactIntegration = {
  async useSmartLayout(
    vertices: EntityGraphVertex[],
    edges: EntityGraphEdge[],
    containerRef: React.RefObject<HTMLDivElement>
  ): Promise<PositionedVertex[]> {
    if (!containerRef.current) {
      throw new Error('Container ref is not available');
    }

    const rect = containerRef.current.getBoundingClientRect();
    const dimensions = {
      width: rect.width || 800,
      height: rect.height || 600,
    };

    // Initialize layout system
    initializeEnhancedLayoutSystem();

    // Use smart layout with performance optimization
    const result = await createSmartLayout(vertices, edges, {
      ...dimensions,
      animated: true,
      performanceBudget: 5000,
    });

    return result.positions;
  },

  async useResponsiveLayout(
    vertices: EntityGraphVertex[],
    edges: EntityGraphEdge[],
    containerDimensions: { width: number; height: number },
    options: {
      preferPerformance?: boolean;
      enableAnimation?: boolean;
    } = {}
  ): Promise<PositionedVertex[]> {
    const { preferPerformance = false, enableAnimation = true } = options;

    if (preferPerformance || vertices.length > 500) {
      // Use circular layout for performance
      return await createEnhancedCircularLayout(vertices, edges, {
        width: containerDimensions.width,
        height: containerDimensions.height,
        strategy: CircularStrategy.SIMPLE,
        animated: enableAnimation,
      });
    } else {
      // Use smart layout selection
      const result = await createSmartLayout(vertices, edges, {
        width: containerDimensions.width,
        height: containerDimensions.height,
        animated: enableAnimation,
        performanceBudget: 6000,
      });
      return result.positions;
    }
  }
};

/**
 * Export all examples for easy usage
 */
export const LayoutExamples = {
  smartLayout: exampleSmartLayout,
  advancedForce: exampleAdvancedForceLayout,
  circularStrategies: exampleCircularLayoutStrategies,
  performanceMonitoring: examplePerformanceMonitoring,
  responsiveLayout: exampleResponsiveLayout,
  layoutComparison: exampleLayoutComparison,
  reactIntegration: exampleReactIntegration,
};