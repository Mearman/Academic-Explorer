import { useContext, useMemo } from 'react';

import type {
  GraphEngineType,
  GraphEngineCapabilities,
} from '../provider';
import { GraphEngineContext } from '../provider';

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseEngineCapabilitiesReturn {
  /** Get capabilities for a specific engine */
  getCapabilities: (engineType: GraphEngineType) => GraphEngineCapabilities | null;
  
  /** Get all available engines with their capabilities */
  getAllCapabilities: () => Array<{ engineType: GraphEngineType; capabilities: GraphEngineCapabilities }>;
  
  /** Find engines that support a specific feature */
  findEnginesWithFeature: <K extends keyof GraphEngineCapabilities['features']>(
    feature: K,
    value?: GraphEngineCapabilities['features'][K]
  ) => GraphEngineType[];
  
  /** Find engines that support a specific layout algorithm */
  findEnginesWithLayout: (layoutName: string) => GraphEngineType[];
  
  /** Find engines within performance constraints */
  findEnginesForGraphSize: (vertexCount: number, edgeCount: number) => Array<{
    engineType: GraphEngineType;
    suitability: 'excellent' | 'good' | 'marginal' | 'poor';
    performanceScore: number;
  }>;
  
  /** Compare two engines across multiple criteria */
  compareEngines: (
    engine1: GraphEngineType,
    engine2: GraphEngineType,
    criteria?: EngineComparisonCriteria
  ) => EngineComparison | null;
  
  /** Get engine recommendations based on requirements */
  recommendEngines: (requirements: EngineRequirements) => EngineRecommendation[];
  
  /** Check if an engine supports all required features */
  checkEngineCompatibility: (
    engineType: GraphEngineType,
    requirements: EngineRequirements
  ) => EngineCompatibilityResult;
  
  /** List of supported engines */
  supportedEngines: GraphEngineType[];
  
  /** Get engine recommendation based on current context */
  getEngineRecommendation: (requirements?: EngineRequirements) => GraphEngineType | null;
}

export interface EngineComparisonCriteria {
  /** Weight for performance comparison (0-1, default: 0.4) */
  performanceWeight?: number;
  
  /** Weight for feature richness (0-1, default: 0.3) */
  featureWeight?: number;
  
  /** Weight for export capabilities (0-1, default: 0.2) */
  exportWeight?: number;
  
  /** Weight for memory efficiency (0-1, default: 0.1) */
  memoryWeight?: number;
}

export interface EngineComparison {
  /** First engine being compared */
  engine1: GraphEngineType;
  
  /** Second engine being compared */
  engine2: GraphEngineType;
  
  /** Overall winner based on weighted criteria */
  winner: GraphEngineType;
  
  /** Detailed comparison results */
  comparison: {
    performance: {
      winner: GraphEngineType;
      engine1Score: number;
      engine2Score: number;
      details: string;
    };
    features: {
      winner: GraphEngineType;
      engine1Score: number;
      engine2Score: number;
      details: string;
    };
    export: {
      winner: GraphEngineType;
      engine1Score: number;
      engine2Score: number;
      details: string;
    };
    memory: {
      winner: GraphEngineType;
      engine1Score: number;
      engine2Score: number;
      details: string;
    };
  };
  
  /** Summary of advantages for each engine */
  advantages: {
    [engine in GraphEngineType]?: string[];
  };
}

export interface EngineRequirements {
  /** Minimum required performance characteristics */
  performance?: {
    minVertices?: number;
    minEdges?: number;
    requireHardwareAcceleration?: boolean;
    minMemoryEfficiency?: 1 | 2 | 3 | 4 | 5;
    minRenderingSpeed?: 1 | 2 | 3 | 4 | 5;
  };
  
  /** Required features */
  features?: {
    animations?: boolean;
    zoomPan?: boolean;
    vertexDragging?: boolean;
    edgeSelection?: boolean;
    multiSelection?: boolean;
    customVertexShapes?: boolean;
    curvedEdges?: boolean;
    edgeLabels?: boolean;
    clustering?: boolean;
    levelOfDetail?: boolean;
  };
  
  /** Required export formats */
  export?: {
    png?: boolean;
    svg?: boolean;
    pdf?: boolean;
    json?: boolean;
  };
  
  /** Required layout algorithms */
  layouts?: string[];
  
  /** Graph size constraints */
  graphSize?: {
    maxVertices: number;
    maxEdges: number;
  };
}

export interface EngineRecommendation {
  /** Recommended engine type */
  engineType: GraphEngineType;
  
  /** Suitability score (0-100) */
  score: number;
  
  /** Why this engine is recommended */
  reasons: string[];
  
  /** Potential drawbacks or limitations */
  limitations: string[];
  
  /** Whether this engine meets all requirements */
  meetsAllRequirements: boolean;
}

export interface EngineCompatibilityResult {
  /** Whether the engine is compatible */
  compatible: boolean;
  
  /** Missing requirements */
  missingRequirements: string[];
  
  /** Warnings about potential issues */
  warnings: string[];
  
  /** Overall suitability score (0-100) */
  suitabilityScore: number;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for querying graph engine capabilities and features.
 * 
 * Provides comprehensive analysis of engine capabilities, feature comparison,
 * and recommendation systems for optimal engine selection.
 * 
 * @returns Engine capabilities analysis interface
 * 
 * @example
 * ```tsx
 * function EngineSelector() {
 *   const {
 *     getAllCapabilities,
 *     findEnginesWithFeature,
 *     recommendEngines,
 *     compareEngines,
 *   } = useEngineCapabilities();
 *   
 *   const recommendations = recommendEngines({
 *     features: { animations: true, clustering: true },
 *     performance: { minVertices: 10000 },
 *     export: { svg: true }
 *   });
 *   
 *   const animatedEngines = findEnginesWithFeature('animations', true);
 *   
 *   return (
 *     <div>
 *       <h3>Recommended Engines:</h3>
 *       {recommendations.map(rec => (
 *         <div key={rec.engineType}>
 *           {rec.engineType} (Score: {rec.score})
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @throws Error if used outside of GraphEngineProvider
 */
export function useEngineCapabilities(): UseEngineCapabilitiesReturn {
  const context = useContext(GraphEngineContext);
  
  if (!context) {
    throw new Error(
      'useEngineCapabilities must be used within a GraphEngineProvider. ' +
      'Make sure to wrap your component tree with <GraphEngineProvider>.'
    );
  }
  
  const { availableEngines, getEngineCapabilities } = context;
  
  // Memoised capabilities analysis
  const allCapabilities = useMemo(() => {
    return Array.from(availableEngines.entries()).map(([engineType, capabilities]) => ({
      engineType,
      capabilities,
    }));
  }, [availableEngines]);
  
  // Core capability queries
  const getCapabilities = useMemo(() => {
    return (engineType: GraphEngineType): GraphEngineCapabilities | null => {
      return getEngineCapabilities(engineType);
    };
  }, [getEngineCapabilities]);
  
  const getAllCapabilities = useMemo(() => {
    return (): Array<{ engineType: GraphEngineType; capabilities: GraphEngineCapabilities }> => {
      return allCapabilities;
    };
  }, [allCapabilities]);
  
  // Feature-based queries
  const findEnginesWithFeature = useMemo(() => {
    return <K extends keyof GraphEngineCapabilities['features']>(
      feature: K,
      value?: GraphEngineCapabilities['features'][K]
    ): GraphEngineType[] => {
      return allCapabilities
        .filter(({ capabilities }) => {
          const featureValue = capabilities.features[feature];
          return value !== undefined ? featureValue === value : featureValue;
        })
        .map(({ engineType }) => engineType);
    };
  }, [allCapabilities]);
  
  const findEnginesWithLayout = useMemo(() => {
    return (layoutName: string): GraphEngineType[] => {
      return allCapabilities
        .filter(({ capabilities }) => 
          capabilities.supportedLayouts.includes(layoutName)
        )
        .map(({ engineType }) => engineType);
    };
  }, [allCapabilities]);
  
  // Performance-based queries
  const findEnginesForGraphSize = useMemo(() => {
    return (vertexCount: number, edgeCount: number) => {
      return allCapabilities
        .map(({ engineType, capabilities }) => {
          const vertexRatio = vertexCount / capabilities.performance.maxVertices;
          const edgeRatio = edgeCount / capabilities.performance.maxEdges;
          const maxRatio = Math.max(vertexRatio, edgeRatio);
          
          let suitability: 'excellent' | 'good' | 'marginal' | 'poor';
          if (maxRatio <= 0.5) suitability = 'excellent';
          else if (maxRatio <= 0.8) suitability = 'good';
          else if (maxRatio <= 1.0) suitability = 'marginal';
          else suitability = 'poor';
          
          // Calculate performance score
          const vertexScore = Math.min(100, (capabilities.performance.maxVertices / Math.max(vertexCount, 1)) * 100);
          const edgeScore = Math.min(100, (capabilities.performance.maxEdges / Math.max(edgeCount, 1)) * 100);
          const rawPerformance = (
            capabilities.performance.renderingSpeed * 0.4 +
            capabilities.performance.memoryEfficiency * 0.3 +
            (capabilities.performance.hardwareAccelerated ? 5 : 0) * 0.3
          ) * 20;
          
          const performanceScore = Math.round(
            (vertexScore * 0.3 + edgeScore * 0.3 + rawPerformance * 0.4)
          );
          
          return {
            engineType,
            suitability,
            performanceScore,
          };
        })
        .sort((a, b) => b.performanceScore - a.performanceScore);
    };
  }, [allCapabilities]);
  
  // Engine comparison
  const compareEngines = useMemo(() => {
    return (
      engine1: GraphEngineType,
      engine2: GraphEngineType,
      criteria: EngineComparisonCriteria = {}
    ): EngineComparison | null => {
      const cap1 = getEngineCapabilities(engine1);
      const cap2 = getEngineCapabilities(engine2);
      
      if (!cap1 || !cap2) return null;
      
      const weights = {
        performanceWeight: criteria.performanceWeight ?? 0.4,
        featureWeight: criteria.featureWeight ?? 0.3,
        exportWeight: criteria.exportWeight ?? 0.2,
        memoryWeight: criteria.memoryWeight ?? 0.1,
      };
      
      // Performance comparison
      const perf1 = (cap1.performance.renderingSpeed + cap1.performance.memoryEfficiency) * 10 + 
                    (cap1.performance.hardwareAccelerated ? 20 : 0);
      const perf2 = (cap2.performance.renderingSpeed + cap2.performance.memoryEfficiency) * 10 + 
                    (cap2.performance.hardwareAccelerated ? 20 : 0);
      const performanceWinner = perf1 > perf2 ? engine1 : engine2;
      
      // Feature comparison
      const features1 = Object.values(cap1.features).filter(f => f === true || (typeof f === 'object' && Object.values(f).some(v => v))).length;
      const features2 = Object.values(cap2.features).filter(f => f === true || (typeof f === 'object' && Object.values(f).some(v => v))).length;
      const featuresWinner = features1 > features2 ? engine1 : engine2;
      
      // Export comparison
      const exports1 = Object.values(cap1.features.export).filter(Boolean).length;
      const exports2 = Object.values(cap2.features.export).filter(Boolean).length;
      const exportWinner = exports1 > exports2 ? engine1 : engine2;
      
      // Memory comparison
      const memoryWinner = cap1.performance.memoryEfficiency > cap2.performance.memoryEfficiency ? engine1 : engine2;
      
      // Overall winner calculation
      const score1 = (perf1 * weights.performanceWeight) + (features1 * weights.featureWeight * 5) + 
                     (exports1 * weights.exportWeight * 10) + (cap1.performance.memoryEfficiency * weights.memoryWeight * 10);
      const score2 = (perf2 * weights.performanceWeight) + (features2 * weights.featureWeight * 5) + 
                     (exports2 * weights.exportWeight * 10) + (cap2.performance.memoryEfficiency * weights.memoryWeight * 10);
      const winner = score1 > score2 ? engine1 : engine2;
      
      // Generate advantages
      const advantages: { [engine in GraphEngineType]?: string[] } = {};
      advantages[engine1] = [];
      advantages[engine2] = [];
      
      if (cap1.performance.hardwareAccelerated && !cap2.performance.hardwareAccelerated) {
        advantages[engine1]!.push('Hardware acceleration support');
      }
      if (cap2.performance.hardwareAccelerated && !cap1.performance.hardwareAccelerated) {
        advantages[engine2]!.push('Hardware acceleration support');
      }
      
      if (cap1.performance.maxVertices > cap2.performance.maxVertices) {
        advantages[engine1]!.push(`Supports more vertices (${cap1.performance.maxVertices} vs ${cap2.performance.maxVertices})`);
      } else if (cap2.performance.maxVertices > cap1.performance.maxVertices) {
        advantages[engine2]!.push(`Supports more vertices (${cap2.performance.maxVertices} vs ${cap1.performance.maxVertices})`);
      }
      
      return {
        engine1,
        engine2,
        winner,
        comparison: {
          performance: {
            winner: performanceWinner,
            engine1Score: perf1,
            engine2Score: perf2,
            details: `Performance based on rendering speed, memory efficiency, and hardware acceleration`,
          },
          features: {
            winner: featuresWinner,
            engine1Score: features1,
            engine2Score: features2,
            details: `Feature count comparison`,
          },
          export: {
            winner: exportWinner,
            engine1Score: exports1,
            engine2Score: exports2,
            details: `Export format support comparison`,
          },
          memory: {
            winner: memoryWinner,
            engine1Score: cap1.performance.memoryEfficiency,
            engine2Score: cap2.performance.memoryEfficiency,
            details: `Memory efficiency rating (1-5 scale)`,
          },
        },
        advantages,
      };
    };
  }, [getEngineCapabilities]);
  
  // Engine recommendations
  const recommendEngines = useMemo(() => {
    return (requirements: EngineRequirements): EngineRecommendation[] => {
      return allCapabilities
        .map(({ engineType, capabilities }) => {
          const reasons: string[] = [];
          const limitations: string[] = [];
          let score = 50; // Base score
          let meetsAllRequirements = true;
          
          // Check performance requirements
          if (requirements.performance) {
            const { performance: reqPerf } = requirements;
            const { performance: capPerf } = capabilities;
            
            if (reqPerf.minVertices && capPerf.maxVertices >= reqPerf.minVertices) {
              reasons.push(`Supports required vertex count (${capPerf.maxVertices})`);
              score += 15;
            } else if (reqPerf.minVertices && capPerf.maxVertices < reqPerf.minVertices) {
              limitations.push(`Insufficient vertex capacity (${capPerf.maxVertices} < ${reqPerf.minVertices})`);
              meetsAllRequirements = false;
              score -= 20;
            }
            
            if (reqPerf.minEdges && capPerf.maxEdges >= reqPerf.minEdges) {
              reasons.push(`Supports required edge count (${capPerf.maxEdges})`);
              score += 15;
            } else if (reqPerf.minEdges && capPerf.maxEdges < reqPerf.minEdges) {
              limitations.push(`Insufficient edge capacity (${capPerf.maxEdges} < ${reqPerf.minEdges})`);
              meetsAllRequirements = false;
              score -= 20;
            }
            
            if (reqPerf.requireHardwareAcceleration && capPerf.hardwareAccelerated) {
              reasons.push('Hardware acceleration supported');
              score += 20;
            } else if (reqPerf.requireHardwareAcceleration && !capPerf.hardwareAccelerated) {
              limitations.push('No hardware acceleration');
              meetsAllRequirements = false;
              score -= 25;
            }
            
            if (reqPerf.minMemoryEfficiency && capPerf.memoryEfficiency >= reqPerf.minMemoryEfficiency) {
              reasons.push(`Good memory efficiency (${capPerf.memoryEfficiency}/5)`);
              score += 10;
            } else if (reqPerf.minMemoryEfficiency && capPerf.memoryEfficiency < reqPerf.minMemoryEfficiency) {
              limitations.push(`Poor memory efficiency (${capPerf.memoryEfficiency}/5)`);
              score -= 10;
            }
            
            if (reqPerf.minRenderingSpeed && capPerf.renderingSpeed >= reqPerf.minRenderingSpeed) {
              reasons.push(`Good rendering speed (${capPerf.renderingSpeed}/5)`);
              score += 10;
            } else if (reqPerf.minRenderingSpeed && capPerf.renderingSpeed < reqPerf.minRenderingSpeed) {
              limitations.push(`Poor rendering speed (${capPerf.renderingSpeed}/5)`);
              score -= 10;
            }
          }
          
          // Check feature requirements
          if (requirements.features) {
            for (const [feature, required] of Object.entries(requirements.features)) {
              if (required) {
                const featureKey = feature as keyof GraphEngineCapabilities['features'];
                if (capabilities.features[featureKey]) {
                  reasons.push(`Supports ${feature}`);
                  score += 5;
                } else {
                  limitations.push(`Missing ${feature} support`);
                  meetsAllRequirements = false;
                  score -= 10;
                }
              }
            }
          }
          
          // Check export requirements
          if (requirements.export) {
            for (const [format, required] of Object.entries(requirements.export)) {
              if (required) {
                const formatKey = format as keyof GraphEngineCapabilities['features']['export'];
                if (capabilities.features.export[formatKey]) {
                  reasons.push(`Supports ${format} export`);
                  score += 3;
                } else {
                  limitations.push(`Missing ${format} export`);
                  meetsAllRequirements = false;
                  score -= 5;
                }
              }
            }
          }
          
          // Check layout requirements
          if (requirements.layouts && requirements.layouts.length > 0) {
            const supportedLayouts = requirements.layouts.filter(layout => 
              capabilities.supportedLayouts.includes(layout)
            );
            
            if (supportedLayouts.length === requirements.layouts.length) {
              reasons.push(`Supports all required layouts`);
              score += 10;
            } else if (supportedLayouts.length > 0) {
              reasons.push(`Supports ${supportedLayouts.length}/${requirements.layouts.length} required layouts`);
              score += 5;
            } else {
              limitations.push('Missing required layout algorithms');
              meetsAllRequirements = false;
              score -= 15;
            }
          }
          
          // Check graph size constraints
          if (requirements.graphSize) {
            const { maxVertices, maxEdges } = requirements.graphSize;
            if (capabilities.performance.maxVertices >= maxVertices && 
                capabilities.performance.maxEdges >= maxEdges) {
              reasons.push('Handles required graph size');
              score += 15;
            } else {
              limitations.push('May struggle with required graph size');
              score -= 10;
            }
          }
          
          // Clamp score to 0-100 range
          score = Math.max(0, Math.min(100, score));
          
          return {
            engineType,
            score,
            reasons,
            limitations,
            meetsAllRequirements,
          };
        })
        .sort((a, b) => b.score - a.score);
    };
  }, [allCapabilities]);
  
  // Engine compatibility check
  const checkEngineCompatibility = useMemo(() => {
    return (engineType: GraphEngineType, requirements: EngineRequirements): EngineCompatibilityResult => {
      const capabilities = getEngineCapabilities(engineType);
      
      if (!capabilities) {
        return {
          compatible: false,
          missingRequirements: ['Engine not available'],
          warnings: [],
          suitabilityScore: 0,
        };
      }
      
      const missingRequirements: string[] = [];
      const warnings: string[] = [];
      let suitabilityScore = 100;
      
      // Check all requirements using the same logic as recommendEngines
      const recommendations = recommendEngines(requirements);
      const engineRecommendation = recommendations.find(rec => rec.engineType === engineType);
      
      if (engineRecommendation) {
        missingRequirements.push(...engineRecommendation.limitations);
        warnings.push(...engineRecommendation.reasons.map(reason => 
          reason.startsWith('Supports') ? '' : reason
        ).filter(Boolean));
        suitabilityScore = engineRecommendation.score;
      }
      
      return {
        compatible: engineRecommendation?.meetsAllRequirements ?? false,
        missingRequirements,
        warnings,
        suitabilityScore,
      };
    };
  }, [getEngineCapabilities, recommendEngines]);
  
  // Return memoised interface
  return useMemo<UseEngineCapabilitiesReturn>(() => ({
    getCapabilities,
    getAllCapabilities,
    findEnginesWithFeature,
    findEnginesWithLayout,
    findEnginesForGraphSize,
    compareEngines,
    recommendEngines,
    checkEngineCompatibility,
    supportedEngines: ['canvas-2d', 'svg', 'webgl', 'd3-force', 'cytoscape', 'vis-network'] as GraphEngineType[],
    getEngineRecommendation: (requirements?: EngineRequirements) => {
      const recommendations = recommendEngines(requirements || { graphSize: { maxVertices: 100, maxEdges: 100 } });
      return recommendations[0]?.engineType || 'canvas-2d';
    },
  }), [
    getCapabilities,
    getAllCapabilities,
    findEnginesWithFeature,
    findEnginesWithLayout,
    findEnginesForGraphSize,
    compareEngines,
    recommendEngines,
    checkEngineCompatibility,
  ]);
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook for getting engines that support specific features.
 * 
 * @example
 * ```tsx
 * function AnimatedEngines() {
 *   const animatedEngines = useEnginesWithFeatures(['animations', 'vertexDragging']);
 *   
 *   return (
 *     <div>
 *       Engines with animations and vertex dragging:
 *       {animatedEngines.map(engine => (
 *         <div key={engine}>{engine}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useEnginesWithFeatures(requiredFeatures: Array<keyof GraphEngineCapabilities['features']>): GraphEngineType[] {
  const { findEnginesWithFeature } = useEngineCapabilities();
  
  return useMemo(() => {
    if (requiredFeatures.length === 0) return [];
    
    // Find engines that support the first feature
    let candidateEngines = findEnginesWithFeature(requiredFeatures[0], true);
    
    // Filter by each additional feature
    for (let i = 1; i < requiredFeatures.length; i++) {
      const enginesWithFeature = findEnginesWithFeature(requiredFeatures[i], true);
      candidateEngines = candidateEngines.filter(engine => enginesWithFeature.includes(engine));
    }
    
    return candidateEngines;
  }, [requiredFeatures, findEnginesWithFeature]);
}

/**
 * Hook for getting the best engine for specific graph size.
 * 
 * @example
 * ```tsx
 * function OptimalEngineForSize({ vertexCount, edgeCount }) {
 *   const optimalEngine = useOptimalEngineForSize(vertexCount, edgeCount);
 *   
 *   return (
 *     <div>
 *       Best engine for {vertexCount} vertices, {edgeCount} edges: {optimalEngine}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOptimalEngineForSize(vertexCount: number, edgeCount: number): GraphEngineType | null {
  const { findEnginesForGraphSize } = useEngineCapabilities();
  
  return useMemo(() => {
    const suitableEngines = findEnginesForGraphSize(vertexCount, edgeCount);
    return suitableEngines.length > 0 ? suitableEngines[0].engineType : null;
  }, [vertexCount, edgeCount, findEnginesForGraphSize]);
}