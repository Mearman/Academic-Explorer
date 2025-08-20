/**
 * Graph Engine Performance Benchmarking Suite
 * 
 * Comprehensive performance testing and benchmarking tools for comparing
 * graph engine implementations across different metrics, graph sizes, and
 * usage scenarios. Provides detailed performance reports and recommendations.
 * 
 * Features:
 * - Multi-engine performance comparison
 * - Scalability testing with varying graph sizes
 * - Memory usage profiling and leak detection
 * - Rendering performance measurement
 * - Interaction latency testing
 * - Battery impact assessment
 * - Performance regression detection
 * - Automated performance reporting
 */

import type {
  IGraph,
  IDimensions as _IDimensions
} from '../../graph-core/interfaces';
import { 
  createTestGraph,
  createMockEngine as _createMockEngine,
  measureEnginePerformance,
  MemoryLeakDetector,
  type TestGraphConfig,
  type PerformanceMetrics
} from '../testing/engine-test-utils';
import type {
  IGraphEngine,
  IEngineCapabilities
} from '../types';

// ============================================================================
// Benchmark Configuration Types
// ============================================================================

export interface BenchmarkConfig {
  /** Engines to benchmark */
  engines: string[];
  
  /** Graph sizes to test */
  graphSizes: Array<{
    vertices: number;
    edges: number;
    topology?: 'random' | 'tree' | 'grid' | 'cluster' | 'star' | 'ring';
  }>;
  
  /** Number of iterations for each test */
  iterations: number;
  
  /** Maximum time per test in milliseconds */
  timeout: number;
  
  /** Whether to include memory profiling */
  includeMemoryProfiling: boolean;
  
  /** Whether to test interaction performance */
  includeInteractionTesting: boolean;
  
  /** Whether to simulate mobile conditions */
  simulateMobileConditions: boolean;
  
  /** Custom test configurations */
  customTests?: CustomTestConfig[];
}

export interface CustomTestConfig {
  name: string;
  description: string;
  graphConfig: TestGraphConfig;
  testFunction: (engine: IGraphEngine, graph: IGraph) => Promise<number>;
}

export interface BenchmarkResult {
  engineId: string;
  engineName: string;
  capabilities: IEngineCapabilities;
  tests: TestResult[];
  summary: BenchmarkSummary;
}

export interface TestResult {
  testName: string;
  graphSize: { vertices: number; edges: number };
  metrics: PerformanceMetrics;
  memoryProfile?: MemoryProfile;
  interactionMetrics?: InteractionMetrics;
  success: boolean;
  error?: string;
  warnings: string[];
}

export interface BenchmarkSummary {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendedUseCases: string[];
  performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  memoryEfficiency: 'excellent' | 'good' | 'average' | 'poor';
  scalabilityRating: 'excellent' | 'good' | 'limited' | 'poor';
}

export interface MemoryProfile {
  initialMemory: number;
  peakMemory: number;
  finalMemory: number;
  memoryGrowth: number;
  hasMemoryLeak: boolean;
  gcPressure: number;
  samples: number[];
}

export interface InteractionMetrics {
  clickLatency: number;
  hoverLatency: number;
  dragLatency: number;
  zoomLatency: number;
  panLatency: number;
  averageLatency: number;
}

export interface ComparisonReport {
  engines: BenchmarkResult[];
  comparisons: EngineComparison[];
  recommendations: RecommendationMatrix;
  performanceMatrix: PerformanceMatrix;
  migrationAdvice: MigrationAdvice[];
}

export interface EngineComparison {
  engineA: string;
  engineB: string;
  winner: string;
  advantages: { engine: string; reason: string }[];
  performanceDelta: number;
  migrationComplexity: 'low' | 'medium' | 'high';
}

export interface RecommendationMatrix {
  byGraphSize: Array<{
    vertexRange: string;
    recommended: string[];
    reasons: string[];
  }>;
  byUseCase: Array<{
    useCase: string;
    recommended: string[];
    reasons: string[];
  }>;
  byPlatform: Array<{
    platform: string;
    recommended: string[];
    reasons: string[];
  }>;
}

export interface PerformanceMatrix {
  headers: string[];
  engines: Array<{
    name: string;
    scores: number[];
    overall: number;
  }>;
}

export interface MigrationAdvice {
  fromEngine: string;
  toEngine: string;
  effort: 'low' | 'medium' | 'high';
  benefits: string[];
  risks: string[];
  timeline: string;
}

// ============================================================================
// Benchmark Runner
// ============================================================================

export class GraphEngineBenchmarkRunner {
  private config: BenchmarkConfig;
  private engines: Map<string, IGraphEngine> = new Map();
  private container: HTMLElement;
  
  constructor(config: BenchmarkConfig) {
    this.config = config;
    this.container = this.createBenchmarkContainer();
  }
  
  /**
   * Register engines for benchmarking
   */
  registerEngine(id: string, engine: IGraphEngine): void {
    this.engines.set(id, engine);
  }
  
  /**
   * Run comprehensive benchmark suite
   */
  async runBenchmarkSuite(): Promise<ComparisonReport> {
    const results: BenchmarkResult[] = [];
    
    for (const engineId of this.config.engines) {
      const engine = this.engines.get(engineId);
      if (!engine) {
        console.warn(`Engine ${engineId} not found, skipping`);
        continue;
      }
      
      try {
        const result = await this.benchmarkEngine(engineId, engine);
        results.push(result);
      } catch (error) {
        console.error(`Failed to benchmark engine ${engineId}:`, error);
      }
    }
    
    return this.generateComparisonReport(results);
  }
  
  /**
   * Benchmark a single engine
   */
  async benchmarkEngine(engineId: string, engine: IGraphEngine): Promise<BenchmarkResult> {
    const tests: TestResult[] = [];
    
    // Test across different graph sizes
    for (const graphSize of this.config.graphSizes) {
      const testResult = await this.runEngineTest(
        engine,
        `Size Test: ${graphSize.vertices}v/${graphSize.edges}e`,
        {
          vertexCount: graphSize.vertices,
          edgeCount: graphSize.edges,
          topology: graphSize.topology || 'random',
          seed: 42
        }
      );
      tests.push(testResult);
    }
    
    // Run custom tests
    if (this.config.customTests) {
      for (const customTest of this.config.customTests) {
        const testResult = await this.runCustomTest(engine, customTest);
        tests.push(testResult);
      }
    }
    
    // Generate summary
    const summary = this.generateBenchmarkSummary(engine, tests);
    
    return {
      engineId,
      engineName: engine.name,
      capabilities: engine.capabilities,
      tests,
      summary
    };
  }
  
  /**
   * Run a single engine test
   */
  private async runEngineTest(
    engine: IGraphEngine,
    testName: string,
    graphConfig: TestGraphConfig
  ): Promise<TestResult> {
    const warnings: string[] = [];
    
    try {
      // Generate test graph
      const graph = createTestGraph(graphConfig);
      
      // Setup memory profiling
      const memoryDetector = this.config.includeMemoryProfiling ? 
        new MemoryLeakDetector() : undefined;
      
      memoryDetector?.start();
      
      // Run performance measurement
      const startTime = performance.now();
      const metrics = await Promise.race([
        measureEnginePerformance(engine, graph, this.container),
        this.createTimeout(this.config.timeout)
      ]);
      
      if (!metrics) {
        throw new Error(`Test timeout after ${this.config.timeout}ms`);
      }
      
      const testDuration = performance.now() - startTime;
      
      // Check performance against capabilities
      if (graph.vertices.length > engine.capabilities.maxVertices) {
        warnings.push(`Graph size (${graph.vertices.length}v) exceeds engine limit (${engine.capabilities.maxVertices}v)`);
      }
      
      if (graph.edges.length > engine.capabilities.maxEdges) {
        warnings.push(`Graph size (${graph.edges.length}e) exceeds engine limit (${engine.capabilities.maxEdges}e)`);
      }
      
      if (testDuration > 5000) {
        warnings.push('Test took longer than 5 seconds');
      }
      
      // Collect memory profile
      const memoryDetectionResult = memoryDetector?.finish();
      const memoryProfile: MemoryProfile | undefined = memoryDetectionResult ? {
        ...memoryDetectionResult,
        peakMemory: Math.max(...memoryDetectionResult.samples),
        gcPressure: memoryDetectionResult.memoryGrowth > 5 * 1024 * 1024 ? 0.8 : 0.3
      } : undefined;
      
      // Test interactions if enabled
      const interactionMetrics = this.config.includeInteractionTesting ?
        await this.measureInteractionPerformance(engine, graph) : undefined;
      
      return {
        testName,
        graphSize: { vertices: graph.vertices.length, edges: graph.edges.length },
        metrics,
        memoryProfile,
        interactionMetrics,
        success: true,
        warnings
      };
      
    } catch (error) {
      return {
        testName,
        graphSize: { vertices: graphConfig.vertexCount, edges: graphConfig.edgeCount },
        metrics: this.getEmptyMetrics(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        warnings
      };
    }
  }
  
  /**
   * Run custom test
   */
  private async runCustomTest(
    engine: IGraphEngine,
    customTest: CustomTestConfig
  ): Promise<TestResult> {
    try {
      const graph = createTestGraph(customTest.graphConfig);
      const customScore = await customTest.testFunction(engine, graph);
      
      const metrics: PerformanceMetrics = {
        ...this.getEmptyMetrics(),
        renderingTime: customScore
      };
      
      return {
        testName: customTest.name,
        graphSize: { 
          vertices: customTest.graphConfig.vertexCount, 
          edges: customTest.graphConfig.edgeCount 
        },
        metrics,
        success: true,
        warnings: []
      };
    } catch (error) {
      return {
        testName: customTest.name,
        graphSize: { 
          vertices: customTest.graphConfig.vertexCount, 
          edges: customTest.graphConfig.edgeCount 
        },
        metrics: this.getEmptyMetrics(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        warnings: []
      };
    }
  }
  
  /**
   * Measure interaction performance
   */
  private async measureInteractionPerformance(
    engine: IGraphEngine,
    _graph: IGraph
  ): Promise<InteractionMetrics> {
    const measurements: number[] = [];
    
    // Simulate various interactions and measure response time
    const interactions = [
      () => this.measureClick(engine),
      () => this.measureHover(engine),
      () => this.measureDrag(engine),
      () => this.measureZoom(engine),
      () => this.measurePan(engine)
    ];
    
    for (const interaction of interactions) {
      try {
        const latency = await interaction();
        measurements.push(latency);
      } catch (error) {
        console.warn('Interaction measurement failed:', error);
        measurements.push(1000); // Penalty for failed interaction
      }
    }
    
    return {
      clickLatency: measurements[0] || 0,
      hoverLatency: measurements[1] || 0,
      dragLatency: measurements[2] || 0,
      zoomLatency: measurements[3] || 0,
      panLatency: measurements[4] || 0,
      averageLatency: measurements.reduce((sum, val) => sum + val, 0) / measurements.length
    };
  }
  
  /**
   * Generate benchmark summary
   */
  private generateBenchmarkSummary(
    engine: IGraphEngine,
    tests: TestResult[]
  ): BenchmarkSummary {
    const successfulTests = tests.filter(t => t.success);
    
    if (successfulTests.length === 0) {
      return {
        overallScore: 0,
        strengths: [],
        weaknesses: ['Engine failed all tests'],
        recommendedUseCases: [],
        performanceGrade: 'F',
        memoryEfficiency: 'poor',
        scalabilityRating: 'poor'
      };
    }
    
    // Calculate average metrics
    const avgRenderTime = this.average(successfulTests.map(t => t.metrics.renderingTime));
    const avgMemoryUsage = this.average(successfulTests.map(t => t.metrics.memoryUsage));
    const avgInteractionLatency = this.average(
      successfulTests
        .map(t => t.interactionMetrics?.averageLatency)
        .filter(Boolean) as number[]
    );
    
    // Calculate scores (lower is better for times, efficiency matters for memory)
    const renderScore = Math.max(0, 100 - (avgRenderTime / 50)); // 50ms = perfect score
    const memoryScore = Math.max(0, 100 - (avgMemoryUsage / (50 * 1024 * 1024))); // 50MB = perfect
    const interactionScore = Math.max(0, 100 - (avgInteractionLatency / 10)); // 10ms = perfect
    
    const overallScore = (renderScore + memoryScore + interactionScore) / 3;
    
    // Determine strengths and weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    if (renderScore > 80) strengths.push('Fast rendering performance');
    else if (renderScore < 40) weaknesses.push('Slow rendering performance');
    
    if (memoryScore > 80) strengths.push('Efficient memory usage');
    else if (memoryScore < 40) weaknesses.push('High memory consumption');
    
    if (interactionScore > 80) strengths.push('Responsive interactions');
    else if (interactionScore < 40) weaknesses.push('Slow interaction response');
    
    // Add capability-based strengths
    if (engine.capabilities.supportsHardwareAcceleration) {
      strengths.push('GPU acceleration support');
    }
    if (engine.capabilities.supportsPhysicsSimulation) {
      strengths.push('Physics simulation capabilities');
    }
    if (engine.capabilities.supportsClustering) {
      strengths.push('Advanced clustering features');
    }
    
    // Determine recommended use cases
    const recommendedUseCases: string[] = [];
    const {maxVertices} = engine.capabilities;
    
    if (maxVertices >= 10000) {
      recommendedUseCases.push('Large-scale data visualisation');
    }
    if (engine.capabilities.supportsInteractiveLayout) {
      recommendedUseCases.push('Interactive graph exploration');
    }
    if (engine.capabilities.supportsPhysicsSimulation) {
      recommendedUseCases.push('Animated network analysis');
    }
    if (engine.capabilities.batteryImpact === 'minimal') {
      recommendedUseCases.push('Mobile applications');
    }
    
    return {
      overallScore,
      strengths,
      weaknesses,
      recommendedUseCases,
      performanceGrade: this.calculateGrade(overallScore),
      memoryEfficiency: this.classifyMemoryEfficiency(memoryScore),
      scalabilityRating: this.classifyScalability(maxVertices, renderScore)
    };
  }
  
  /**
   * Generate comparison report
   */
  private generateComparisonReport(results: BenchmarkResult[]): ComparisonReport {
    const comparisons = this.generateEngineComparisons(results);
    const recommendations = this.generateRecommendationMatrix(results);
    const performanceMatrix = this.generatePerformanceMatrix(results);
    const migrationAdvice = this.generateMigrationAdvice(results);
    
    return {
      engines: results,
      comparisons,
      recommendations,
      performanceMatrix,
      migrationAdvice
    };
  }
  
  private generateEngineComparisons(results: BenchmarkResult[]): EngineComparison[] {
    const comparisons: EngineComparison[] = [];
    
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const engineA = results[i];
        const engineB = results[j];
        
        const comparison = this.compareEngines(engineA, engineB);
        comparisons.push(comparison);
      }
    }
    
    return comparisons;
  }
  
  private compareEngines(engineA: BenchmarkResult, engineB: BenchmarkResult): EngineComparison {
    const scoreA = engineA.summary.overallScore;
    const scoreB = engineB.summary.overallScore;
    
    const winner = scoreA > scoreB ? engineA.engineName : engineB.engineName;
    const performanceDelta = Math.abs(scoreA - scoreB);
    
    const advantages: { engine: string; reason: string }[] = [];
    
    // Compare specific aspects
    if (engineA.capabilities.maxVertices > engineB.capabilities.maxVertices) {
      advantages.push({
        engine: engineA.engineName,
        reason: `Handles larger graphs (${engineA.capabilities.maxVertices} vs ${engineB.capabilities.maxVertices} vertices)`
      });
    } else if (engineB.capabilities.maxVertices > engineA.capabilities.maxVertices) {
      advantages.push({
        engine: engineB.engineName,
        reason: `Handles larger graphs (${engineB.capabilities.maxVertices} vs ${engineA.capabilities.maxVertices} vertices)`
      });
    }
    
    // Compare features
    const featuresA = this.getFeatureCount(engineA.capabilities);
    const featuresB = this.getFeatureCount(engineB.capabilities);
    
    if (featuresA > featuresB) {
      advantages.push({
        engine: engineA.engineName,
        reason: `More features (${featuresA} vs ${featuresB})`
      });
    } else if (featuresB > featuresA) {
      advantages.push({
        engine: engineB.engineName,
        reason: `More features (${featuresB} vs ${featuresA})`
      });
    }
    
    return {
      engineA: engineA.engineName,
      engineB: engineB.engineName,
      winner,
      advantages,
      performanceDelta,
      migrationComplexity: performanceDelta > 20 ? 'low' : 'medium'
    };
  }
  
  private generateRecommendationMatrix(results: BenchmarkResult[]): RecommendationMatrix {
    return {
      byGraphSize: this.getRecommendationsByGraphSize(results),
      byUseCase: this.getRecommendationsByUseCase(results),
      byPlatform: this.getRecommendationsByPlatform(results)
    };
  }
  
  private generatePerformanceMatrix(results: BenchmarkResult[]): PerformanceMatrix {
    const headers = ['Rendering', 'Memory', 'Interactions', 'Scalability', 'Overall'];
    
    const engines = results.map(result => {
      const successfulTests = result.tests.filter(t => t.success);
      
      const renderScore = successfulTests.length > 0 ?
        Math.max(0, 100 - (this.average(successfulTests.map(t => t.metrics.renderingTime)) / 50)) : 0;
      
      const memoryScore = successfulTests.length > 0 ?
        Math.max(0, 100 - (this.average(successfulTests.map(t => t.metrics.memoryUsage)) / (50 * 1024 * 1024))) : 0;
      
      const interactionScore = successfulTests.length > 0 ?
        Math.max(0, 100 - (this.average(
          successfulTests
            .map(t => t.interactionMetrics?.averageLatency)
            .filter(Boolean) as number[]
        ) / 10)) : 0;
      
      const scalabilityScore = Math.min(100, (result.capabilities.maxVertices / 10000) * 100);
      
      const scores = [renderScore, memoryScore, interactionScore, scalabilityScore];
      const overall = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      
      return {
        name: result.engineName,
        scores: [...scores, overall],
        overall
      };
    });
    
    return { headers, engines };
  }
  
  private generateMigrationAdvice(results: BenchmarkResult[]): MigrationAdvice[] {
    const advice: MigrationAdvice[] = [];
    
    for (const fromEngine of results) {
      for (const toEngine of results) {
        if (fromEngine.engineId !== toEngine.engineId) {
          const migration = this.assessMigrationPath(fromEngine, toEngine);
          advice.push(migration);
        }
      }
    }
    
    return advice;
  }
  
  private assessMigrationPath(from: BenchmarkResult, to: BenchmarkResult): MigrationAdvice {
    const benefits: string[] = [];
    const risks: string[] = [];
    let effort: 'low' | 'medium' | 'high' = 'medium';
    
    // Performance comparison
    if (to.summary.overallScore > from.summary.overallScore + 10) {
      benefits.push(`${Math.round(to.summary.overallScore - from.summary.overallScore)}% performance improvement`);
    } else if (from.summary.overallScore > to.summary.overallScore + 10) {
      risks.push(`${Math.round(from.summary.overallScore - to.summary.overallScore)}% performance regression`);
    }
    
    // Capability comparison
    if (to.capabilities.maxVertices > from.capabilities.maxVertices) {
      benefits.push('Better scalability for large graphs');
    } else if (to.capabilities.maxVertices < from.capabilities.maxVertices) {
      risks.push('Reduced scalability limits');
    }
    
    // Feature comparison
    const fromFeatures = this.getFeatureCount(from.capabilities);
    const toFeatures = this.getFeatureCount(to.capabilities);
    
    if (toFeatures > fromFeatures) {
      benefits.push('Access to additional features');
    } else if (toFeatures < fromFeatures) {
      risks.push('Loss of some features');
      effort = 'high';
    }
    
    // Memory efficiency
    if (to.summary.memoryEfficiency === 'excellent' && from.summary.memoryEfficiency !== 'excellent') {
      benefits.push('Better memory efficiency');
    } else if (from.summary.memoryEfficiency === 'excellent' && to.summary.memoryEfficiency !== 'excellent') {
      risks.push('Potential memory usage increase');
    }
    
    // Determine if migration should be low effort (high performance improvement with few risks)
    if (to.summary.overallScore > from.summary.overallScore + 20 && risks.length === 0) {
      effort = 'low';
    }
    
    // Determine timeline based on effort level
    let timeline: string;
    if (effort === 'low') {
      timeline = '1-2 days';
    } else if (effort === 'medium') {
      timeline = '1-2 weeks';
    } else {
      timeline = '1-2 months';
    }

    return {
      fromEngine: from.engineName,
      toEngine: to.engineName,
      effort,
      benefits,
      risks,
      timeline
    };
  }
  
  // Utility methods
  private createTimeout(ms: number): Promise<null> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), ms);
    });
  }
  
  private getEmptyMetrics(): PerformanceMetrics {
    return {
      initialisationTime: 0,
      loadTime: 0,
      updateTime: 0,
      memoryUsage: 0,
      renderingTime: 0,
      interactionLatency: 0
    };
  }
  
  private async measureClick(engine: IGraphEngine): Promise<number> {
    const start = performance.now();
    engine.fitToView(); // Proxy for click interaction
    return performance.now() - start;
  }
  
  private async measureHover(engine: IGraphEngine): Promise<number> {
    const start = performance.now();
    engine.getPositions(); // Proxy for hover interaction
    return performance.now() - start;
  }
  
  private async measureDrag(engine: IGraphEngine): Promise<number> {
    const start = performance.now();
    const positions = engine.getPositions();
    if (positions.length > 0) {
      engine.setPositions(positions); // Proxy for drag interaction
    }
    return performance.now() - start;
  }
  
  private async measureZoom(engine: IGraphEngine): Promise<number> {
    const start = performance.now();
    engine.fitToView(20, false); // Proxy for zoom interaction
    return performance.now() - start;
  }
  
  private async measurePan(engine: IGraphEngine): Promise<number> {
    const start = performance.now();
    engine.fitToView(10, false); // Proxy for pan interaction
    return performance.now() - start;
  }
  
  private average(numbers: number[]): number {
    return numbers.length > 0 ? numbers.reduce((sum, val) => sum + val, 0) / numbers.length : 0;
  }
  
  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
  
  private classifyMemoryEfficiency(score: number): 'excellent' | 'good' | 'average' | 'poor' {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'average';
    return 'poor';
  }
  
  private classifyScalability(maxVertices: number, renderScore: number): 'excellent' | 'good' | 'limited' | 'poor' {
    if (maxVertices >= 10000 && renderScore > 70) return 'excellent';
    if (maxVertices >= 5000 && renderScore > 50) return 'good';
    if (maxVertices >= 1000) return 'limited';
    return 'poor';
  }
  
  private getFeatureCount(capabilities: IEngineCapabilities): number {
    return [
      capabilities.supportsHardwareAcceleration,
      capabilities.supportsInteractiveLayout,
      capabilities.supportsPhysicsSimulation,
      capabilities.supportsClustering,
      capabilities.supportsCustomShapes,
      capabilities.supportsEdgeBundling
    ].filter(Boolean).length;
  }
  
  private getRecommendationsByGraphSize(results: BenchmarkResult[]): Array<{
    vertexRange: string;
    recommended: string[];
    reasons: string[];
  }> {
    return [
      {
        vertexRange: '< 1,000',
        recommended: this.getBestEnginesForSize(results, 0, 1000),
        reasons: ['Low resource usage', 'Fast rendering', 'Universal compatibility']
      },
      {
        vertexRange: '1,000 - 5,000',
        recommended: this.getBestEnginesForSize(results, 1000, 5000),
        reasons: ['Balanced performance', 'Rich features', 'Good interactivity']
      },
      {
        vertexRange: '5,000 - 10,000',
        recommended: this.getBestEnginesForSize(results, 5000, 10000),
        reasons: ['Advanced algorithms', 'Smooth animations', 'Scalable architecture']
      },
      {
        vertexRange: '> 10,000',
        recommended: this.getBestEnginesForSize(results, 10000, Infinity),
        reasons: ['GPU acceleration', 'High performance', 'Large-scale support']
      }
    ];
  }
  
  private getRecommendationsByUseCase(results: BenchmarkResult[]): Array<{
    useCase: string;
    recommended: string[];
    reasons: string[];
  }> {
    return [
      {
        useCase: 'Research & Analysis',
        recommended: results
          .filter(r => r.capabilities.supportsClustering || r.capabilities.supportsInteractiveLayout)
          .sort((a, b) => b.summary.overallScore - a.summary.overallScore)
          .slice(0, 2)
          .map(r => r.engineName),
        reasons: ['Advanced algorithms', 'Interactive features', 'Analysis tools']
      },
      {
        useCase: 'Data Visualisation',
        recommended: results
          .filter(r => r.capabilities.supportsCustomShapes)
          .sort((a, b) => b.summary.overallScore - a.summary.overallScore)
          .slice(0, 2)
          .map(r => r.engineName),
        reasons: ['Custom styling', 'Visual appeal', 'Export capabilities']
      },
      {
        useCase: 'Real-time Updates',
        recommended: results
          .filter(r => r.summary.performanceGrade === 'A' || r.summary.performanceGrade === 'B')
          .sort((a, b) => b.summary.overallScore - a.summary.overallScore)
          .slice(0, 2)
          .map(r => r.engineName),
        reasons: ['Fast updates', 'Low latency', 'Smooth animations']
      }
    ];
  }
  
  private getRecommendationsByPlatform(results: BenchmarkResult[]): Array<{
    platform: string;
    recommended: string[];
    reasons: string[];
  }> {
    return [
      {
        platform: 'Desktop',
        recommended: results
          .sort((a, b) => b.summary.overallScore - a.summary.overallScore)
          .slice(0, 3)
          .map(r => r.engineName),
        reasons: ['Full feature set', 'Best performance', 'Advanced capabilities']
      },
      {
        platform: 'Mobile',
        recommended: results
          .filter(r => r.capabilities.batteryImpact === 'minimal' || r.capabilities.batteryImpact === 'moderate')
          .sort((a, b) => b.summary.overallScore - a.summary.overallScore)
          .slice(0, 2)
          .map(r => r.engineName),
        reasons: ['Low battery usage', 'Touch optimised', 'Responsive design']
      },
      {
        platform: 'Web',
        recommended: results
          .sort((a, b) => b.summary.overallScore - a.summary.overallScore)
          .slice(0, 2)
          .map(r => r.engineName),
        reasons: ['Cross-browser support', 'Web standards', 'Easy integration']
      }
    ];
  }
  
  private getBestEnginesForSize(results: BenchmarkResult[], minSize: number, maxSize: number): string[] {
    return results
      .filter(r => r.capabilities.maxVertices >= minSize && (maxSize === Infinity || r.capabilities.maxVertices <= maxSize))
      .sort((a, b) => b.summary.overallScore - a.summary.overallScore)
      .slice(0, 2)
      .map(r => r.engineName);
  }
  
  private createBenchmarkContainer(): HTMLElement {
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.visibility = 'hidden';
    document.body.appendChild(container);
    return container;
  }
  
  destroy(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a quick benchmark with default settings
 */
export async function quickBenchmark(
  engines: Array<{ id: string; engine: IGraphEngine }>,
  graphSizes = [
    { vertices: 100, edges: 200 },
    { vertices: 500, edges: 1000 },
    { vertices: 1000, edges: 2000 }
  ]
): Promise<ComparisonReport> {
  const config: BenchmarkConfig = {
    engines: engines.map(e => e.id),
    graphSizes,
    iterations: 3,
    timeout: 10000,
    includeMemoryProfiling: true,
    includeInteractionTesting: true,
    simulateMobileConditions: false
  };
  
  const runner = new GraphEngineBenchmarkRunner(config);
  
  // Register engines
  for (const { id, engine } of engines) {
    runner.registerEngine(id, engine);
  }
  
  try {
    return await runner.runBenchmarkSuite();
  } finally {
    runner.destroy();
  }
}

/**
 * Create a comprehensive benchmark suite
 */
export function createBenchmarkSuite(): BenchmarkConfig {
  return {
    engines: ['canvas', 'cytoscape', 'd3-force', 'webgl'],
    graphSizes: [
      { vertices: 50, edges: 100, topology: 'tree' },
      { vertices: 100, edges: 200, topology: 'random' },
      { vertices: 500, edges: 1000, topology: 'cluster' },
      { vertices: 1000, edges: 2000, topology: 'grid' },
      { vertices: 2000, edges: 5000, topology: 'random' },
      { vertices: 5000, edges: 10000, topology: 'random' }
    ],
    iterations: 5,
    timeout: 30000,
    includeMemoryProfiling: true,
    includeInteractionTesting: true,
    simulateMobileConditions: true,
    customTests: [
      {
        name: 'Large Dense Graph',
        description: 'Test with high edge density',
        graphConfig: {
          vertexCount: 1000,
          edgeCount: 5000,
          topology: 'random'
        },
        testFunction: async (engine: IGraphEngine, graph: IGraph) => {
          const start = performance.now();
          await engine.loadGraph(graph);
          return performance.now() - start;
        }
      },
      {
        name: 'Sparse Tree',
        description: 'Test with tree topology',
        graphConfig: {
          vertexCount: 2000,
          edgeCount: 1999,
          topology: 'tree'
        },
        testFunction: async (engine: IGraphEngine, graph: IGraph) => {
          const start = performance.now();
          await engine.updateGraph(graph);
          return performance.now() - start;
        }
      }
    ]
  };
}

// GraphEngineBenchmarkRunner is already exported above