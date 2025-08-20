/**
 * Graph Engine Testing Utilities
 * 
 * Comprehensive testing framework for graph engine implementations, providing
 * mock engines, test data generation, interaction simulation, visual regression
 * testing, and performance validation utilities.
 * 
 * Features:
 * - Mock engine implementations for isolated testing
 * - Test data generators for various graph topologies
 * - Interaction simulation and validation
 * - Visual regression testing support
 * - Performance benchmarking and metrics
 * - Cross-engine compatibility testing
 * - Memory leak detection
 */

import type {
  IGraph,
  IVertex,
  IEdge,
  IPosition,
  IDimensions,
  IGraphConfig,
  IPositionedVertex
} from '../../graph-core/interfaces';
import type {
  IGraphEngine,
  IEngineCapabilities,
  IEngineConfig,
  IEngineStatus
} from '../types';

// ============================================================================
// Test Data Generation
// ============================================================================

/**
 * Configuration for generating test graphs
 */
export interface TestGraphConfig {
  vertexCount: number;
  edgeCount: number;
  topology?: 'random' | 'tree' | 'grid' | 'cluster' | 'star' | 'ring';
  directed?: boolean;
  weighted?: boolean;
  withMetadata?: boolean;
  seed?: number;
}

/**
 * Generate a test graph with specified characteristics
 */
export function createTestGraph<TVertexData = any, TEdgeData = any>(
  config: TestGraphConfig
): IGraph<TVertexData, TEdgeData> {
  const { 
    vertexCount, 
    edgeCount, 
    topology = 'random', 
    directed = false,
    weighted = false,
    withMetadata = true,
    seed = 42 
  } = config;
  
  // Deterministic random number generator for reproducible tests
  const rng = createSeededRandom(seed);
  
  // Generate vertices
  const vertices: IVertex<TVertexData>[] = Array.from({ length: vertexCount }, (_, i) => ({
    id: `vertex-${i}`,
    data: withMetadata ? {
      label: `Vertex ${i}`,
      type: rng() > 0.5 ? 'primary' : 'secondary',
      weight: Math.floor(rng() * 100),
      metadata: {
        created: new Date().toISOString(),
        category: ['A', 'B', 'C'][Math.floor(rng() * 3)]
      }
    } as TVertexData : {} as TVertexData
  }));
  
  // Generate edges based on topology
  const edges: IEdge<TEdgeData>[] = [];
  
  switch (topology) {
    case 'tree':
      generateTreeEdges(vertices, edges, rng, weighted);
      break;
    case 'grid':
      generateGridEdges(vertices, edges, rng, weighted);
      break;
    case 'cluster':
      generateClusterEdges(vertices, edges, rng, weighted, 3);
      break;
    case 'star':
      generateStarEdges(vertices, edges, rng, weighted);
      break;
    case 'ring':
      generateRingEdges(vertices, edges, rng, weighted);
      break;
    case 'random':
    default:
      generateRandomEdges(vertices, edges, edgeCount, rng, directed, weighted);
      break;
  }
  
  return {
    vertices,
    edges: edges.slice(0, Math.min(edgeCount, edges.length))
  };
}

// Topology generation helpers
function generateTreeEdges<TVertexData, TEdgeData>(
  vertices: IVertex<TVertexData>[],
  edges: IEdge<TEdgeData>[],
  rng: () => number,
  weighted: boolean
): void {
  for (let i = 1; i < vertices.length; i++) {
    const parentIndex = Math.floor(i / 2);
    edges.push(createEdge(
      vertices[parentIndex].id,
      vertices[i].id,
      rng,
      weighted
    ));
  }
}

function generateGridEdges<TVertexData, TEdgeData>(
  vertices: IVertex<TVertexData>[],
  edges: IEdge<TEdgeData>[],
  rng: () => number,
  weighted: boolean
): void {
  const size = Math.ceil(Math.sqrt(vertices.length));
  
  for (let i = 0; i < vertices.length; i++) {
    const row = Math.floor(i / size);
    const col = i % size;
    
    // Right neighbour
    if (col < size - 1 && i + 1 < vertices.length) {
      edges.push(createEdge(vertices[i].id, vertices[i + 1].id, rng, weighted));
    }
    
    // Bottom neighbour
    if (row < size - 1 && i + size < vertices.length) {
      edges.push(createEdge(vertices[i].id, vertices[i + size].id, rng, weighted));
    }
  }
}

function generateClusterEdges<TVertexData, TEdgeData>(
  vertices: IVertex<TVertexData>[],
  edges: IEdge<TEdgeData>[],
  rng: () => number,
  weighted: boolean,
  clusterCount: number
): void {
  const clusterSize = Math.ceil(vertices.length / clusterCount);
  
  for (let cluster = 0; cluster < clusterCount; cluster++) {
    const start = cluster * clusterSize;
    const end = Math.min(start + clusterSize, vertices.length);
    
    // Dense connections within cluster
    for (let i = start; i < end; i++) {
      for (let j = i + 1; j < end; j++) {
        if (rng() > 0.3) { // 70% probability of edge within cluster
          edges.push(createEdge(vertices[i].id, vertices[j].id, rng, weighted));
        }
      }
    }
    
    // Sparse connections between clusters
    if (cluster < clusterCount - 1) {
      const nextStart = (cluster + 1) * clusterSize;
      if (nextStart < vertices.length && rng() > 0.8) { // 20% probability
        const i = start + Math.floor(rng() * (end - start));
        const j = nextStart + Math.floor(rng() * Math.min(clusterSize, vertices.length - nextStart));
        edges.push(createEdge(vertices[i].id, vertices[j].id, rng, weighted));
      }
    }
  }
}

function generateStarEdges<TVertexData, TEdgeData>(
  vertices: IVertex<TVertexData>[],
  edges: IEdge<TEdgeData>[],
  rng: () => number,
  weighted: boolean
): void {
  const center = vertices[0];
  for (let i = 1; i < vertices.length; i++) {
    edges.push(createEdge(center.id, vertices[i].id, rng, weighted));
  }
}

function generateRingEdges<TVertexData, TEdgeData>(
  vertices: IVertex<TVertexData>[],
  edges: IEdge<TEdgeData>[],
  rng: () => number,
  weighted: boolean
): void {
  for (let i = 0; i < vertices.length; i++) {
    const nextIndex = (i + 1) % vertices.length;
    edges.push(createEdge(vertices[i].id, vertices[nextIndex].id, rng, weighted));
  }
}

function generateRandomEdges<TVertexData, TEdgeData>(
  vertices: IVertex<TVertexData>[],
  edges: IEdge<TEdgeData>[],
  edgeCount: number,
  rng: () => number,
  directed: boolean,
  weighted: boolean
): void {
  const maxEdges = directed ? 
    vertices.length * (vertices.length - 1) : 
    vertices.length * (vertices.length - 1) / 2;
  
  const targetEdges = Math.min(edgeCount, maxEdges);
  const edgeSet = new Set<string>();
  
  while (edges.length < targetEdges && edgeSet.size < maxEdges) {
    const i = Math.floor(rng() * vertices.length);
    const j = Math.floor(rng() * vertices.length);
    
    if (i !== j) {
      const edgeKey = directed ? `${i}-${j}` : `${Math.min(i, j)}-${Math.max(i, j)}`;
      
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        edges.push(createEdge(vertices[i].id, vertices[j].id, rng, weighted));
      }
    }
  }
}

function createEdge<TEdgeData>(
  source: string,
  target: string,
  rng: () => number,
  weighted: boolean
): IEdge<TEdgeData> {
  return {
    id: `${source}-${target}`,
    sourceId: source,
    targetId: target,
    data: (weighted ? {
      weight: rng(),
      type: 'connection',
      strength: Math.floor(rng() * 10) + 1
    } : {}) as TEdgeData
  };
}

function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

// ============================================================================
// Mock Engine Implementation
// ============================================================================

/**
 * Mock engine for testing purposes
 */
export class MockGraphEngine<TVertexData = any, TEdgeData = any> 
  implements IGraphEngine<TVertexData, TEdgeData> {
  
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly version: string = '1.0.0';
  public readonly capabilities: IEngineCapabilities;
  public readonly requirements = {
    dependencies: [],
    browserSupport: {},
    requiredFeatures: [],
    setupInstructions: 'Mock engine - no setup required'
  };
  public readonly isImplemented: boolean = true;
  
  private _status: IEngineStatus = {
    isInitialised: false,
    isRendering: false
  };
  
  private _container: HTMLElement | null = null;
  private _dimensions: IDimensions = { width: 0, height: 0 };
  private _graph: IGraph<TVertexData, TEdgeData> | null = null;
  private _positions: IPositionedVertex<TVertexData>[] = [];
  
  // Mock interaction tracking
  private _interactions: Array<{
    type: string;
    timestamp: number;
    data: any;
  }> = [];
  
  constructor(config: Partial<IEngineCapabilities> & { id: string; name: string; description: string }) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    
    this.capabilities = {
      maxVertices: config.maxVertices || 1000,
      maxEdges: config.maxEdges || 5000,
      supportsHardwareAcceleration: config.supportsHardwareAcceleration || false,
      supportsInteractiveLayout: config.supportsInteractiveLayout || true,
      supportsPhysicsSimulation: config.supportsPhysicsSimulation || false,
      supportsClustering: config.supportsClustering || false,
      supportsCustomShapes: config.supportsCustomShapes || true,
      supportsEdgeBundling: config.supportsEdgeBundling || false,
      exportFormats: config.exportFormats || ['png', 'svg', 'json'],
      memoryUsage: config.memoryUsage || 'low',
      cpuUsage: config.cpuUsage || 'low',
      batteryImpact: config.batteryImpact || 'minimal'
    };
  }
  
  get status(): IEngineStatus {
    return { ...this._status };
  }
  
  async initialise(
    container: HTMLElement,
    dimensions: IDimensions,
    config?: IEngineConfig
  ): Promise<void> {
    await this.simulateAsyncOperation(100); // Simulate initialisation time
    
    this._container = container;
    this._dimensions = dimensions;
    this._status = {
      ...this._status,
      isInitialised: true
    };
    
    this._interactions.push({
      type: 'initialise',
      timestamp: Date.now(),
      data: { dimensions, config }
    });
  }
  
  async loadGraph(
    graph: IGraph<TVertexData, TEdgeData>,
    config?: IGraphConfig<TVertexData, TEdgeData>
  ): Promise<void> {
    await this.simulateAsyncOperation(50);
    
    this._graph = graph;
    this._positions = this.generateMockPositions(graph);
    this._status = {
      ...this._status,
      isRendering: true
    };
    
    this._interactions.push({
      type: 'loadGraph',
      timestamp: Date.now(),
      data: { vertexCount: graph.vertices.length, edgeCount: graph.edges.length, config }
    });
  }
  
  async updateGraph(
    graph: IGraph<TVertexData, TEdgeData>,
    animate?: boolean
  ): Promise<void> {
    await this.simulateAsyncOperation(animate ? 200 : 50);
    
    this._graph = graph;
    this._positions = this.generateMockPositions(graph);
    
    this._interactions.push({
      type: 'updateGraph',
      timestamp: Date.now(),
      data: { vertexCount: graph.vertices.length, edgeCount: graph.edges.length, animate }
    });
  }
  
  resize(dimensions: IDimensions): void {
    this._dimensions = dimensions;
    this._interactions.push({
      type: 'resize',
      timestamp: Date.now(),
      data: dimensions
    });
  }
  
  async export(
    format: 'png' | 'svg' | 'json' | 'pdf',
    options?: Record<string, unknown>
  ): Promise<string | Blob> {
    await this.simulateAsyncOperation(100);
    
    this._interactions.push({
      type: 'export',
      timestamp: Date.now(),
      data: { format, options }
    });
    
    if (format === 'json') {
      return JSON.stringify({
        graph: this._graph,
        positions: this._positions,
        dimensions: this._dimensions
      });
    } else {
      // Return mock blob for binary formats
      return new Blob([`Mock ${format} export`], { 
        type: format === 'svg' ? 'image/svg+xml' : `image/${format}` 
      });
    }
  }
  
  getPositions(): ReadonlyArray<IPositionedVertex<TVertexData>> {
    return [...this._positions];
  }
  
  setPositions(
    positions: ReadonlyArray<IPositionedVertex<TVertexData>>,
    animate?: boolean
  ): void {
    this._positions = [...positions];
    this._interactions.push({
      type: 'setPositions',
      timestamp: Date.now(),
      data: { positionCount: positions.length, animate }
    });
  }
  
  fitToView(padding?: number, animate?: boolean): void {
    this._interactions.push({
      type: 'fitToView',
      timestamp: Date.now(),
      data: { padding, animate }
    });
  }
  
  destroy(): void {
    this._container = null;
    this._graph = null;
    this._positions = [];
    this._status = {
      isInitialised: false,
      isRendering: false
    };
    
    this._interactions.push({
      type: 'destroy',
      timestamp: Date.now(),
      data: {}
    });
  }
  
  // Testing utilities
  getInteractions(): ReadonlyArray<{
    type: string;
    timestamp: number;
    data: any;
  }> {
    return [...this._interactions];
  }
  
  clearInteractions(): void {
    this._interactions = [];
  }
  
  simulateInteraction(type: string, data: any = {}): void {
    this._interactions.push({
      type,
      timestamp: Date.now(),
      data
    });
  }
  
  private async simulateAsyncOperation(delay: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delay));
  }
  
  private generateMockPositions(graph: IGraph<TVertexData, TEdgeData>): IPositionedVertex<TVertexData>[] {
    return graph.vertices.map((vertex, _index) => ({
      ...vertex,
      position: {
        x: Math.random() * (this._dimensions.width - 40) + 20,
        y: Math.random() * (this._dimensions.height - 40) + 20
      }
    }));
  }
}

// ============================================================================
// Testing Utilities
// ============================================================================

/**
 * Create a mock engine with specified capabilities
 */
export function createMockEngine(
  config: Partial<IEngineCapabilities & { id?: string; name?: string; description?: string }> = {}
): MockGraphEngine {
  return new MockGraphEngine({
    id: config.id || 'mock-engine',
    name: config.name || 'Mock Engine',
    description: config.description || 'Mock engine for testing',
    ...config
  });
}

/**
 * Simulate user interactions on an engine
 */
export class InteractionSimulator {
  constructor(private engine: MockGraphEngine) {}
  
  async clickVertex(vertexId: string): Promise<void> {
    this.engine.simulateInteraction('vertexClick', { vertexId });
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  async doubleClickVertex(vertexId: string): Promise<void> {
    this.engine.simulateInteraction('vertexDoubleClick', { vertexId });
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  async hoverVertex(vertexId: string): Promise<void> {
    this.engine.simulateInteraction('vertexHover', { vertexId });
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  async dragVertex(vertexId: string, from: IPosition, to: IPosition): Promise<void> {
    this.engine.simulateInteraction('vertexDragStart', { vertexId, position: from });
    await new Promise(resolve => setTimeout(resolve, 10));
    
    this.engine.simulateInteraction('vertexDrag', { vertexId, position: to });
    await new Promise(resolve => setTimeout(resolve, 10));
    
    this.engine.simulateInteraction('vertexDragEnd', { vertexId, position: to });
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  async zoom(factor: number): Promise<void> {
    this.engine.simulateInteraction('zoom', { factor });
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  async pan(delta: { x: number; y: number }): Promise<void> {
    this.engine.simulateInteraction('pan', { delta });
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

/**
 * Performance testing utilities
 */
export interface PerformanceMetrics {
  initialisationTime: number;
  loadTime: number;
  updateTime: number;
  memoryUsage: number;
  renderingTime: number;
  interactionLatency: number;
}

export async function measureEnginePerformance(
  engine: IGraphEngine,
  graph: IGraph,
  container: HTMLElement
): Promise<PerformanceMetrics> {
  const metrics: Partial<PerformanceMetrics> = {};
  
  // Measure initialisation
  const initStart = performance.now();
  await engine.initialise(container, { width: 800, height: 600 });
  metrics.initialisationTime = performance.now() - initStart;
  
  // Measure graph loading
  const loadStart = performance.now();
  await engine.loadGraph(graph);
  metrics.loadTime = performance.now() - loadStart;
  
  // Measure update performance
  const updateStart = performance.now();
  await engine.updateGraph(graph);
  metrics.updateTime = performance.now() - updateStart;
  
  // Measure memory usage (if available)
  metrics.memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
  
  // Measure rendering time (proxy: time for positions to be available)
  const renderStart = performance.now();
  const _positions = engine.getPositions();
  metrics.renderingTime = performance.now() - renderStart;
  
  // Measure interaction latency
  const interactionStart = performance.now();
  engine.fitToView();
  metrics.interactionLatency = performance.now() - interactionStart;
  
  return metrics as PerformanceMetrics;
}

/**
 * Visual regression testing utilities
 */
export async function takeEngineScreenshot(
  engine: IGraphEngine,
  graph: IGraph,
  container: HTMLElement
): Promise<string> {
  // Initialize and load graph
  await engine.initialise(container, { width: 800, height: 600 });
  await engine.loadGraph(graph);
  
  // Wait for rendering to complete
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Export as PNG for visual comparison
  const result = await engine.export('png');
  
  if (result instanceof Blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(result);
    });
  } else {
    return result;
  }
}

/**
 * Cross-engine compatibility testing
 */
export async function testEngineCompatibility(
  engines: IGraphEngine[],
  testGraphs: IGraph[]
): Promise<{
  engine: string;
  graph: number;
  success: boolean;
  error?: string;
  metrics?: PerformanceMetrics;
}[]> {
  const results: any[] = [];
  const container = document.createElement('div');
  document.body.appendChild(container);
  
  try {
    for (const engine of engines) {
      for (let i = 0; i < testGraphs.length; i++) {
        const graph = testGraphs[i];
        
        try {
          const metrics = await measureEnginePerformance(engine, graph, container);
          
          results.push({
            engine: engine.id,
            graph: i,
            success: true,
            metrics
          });
        } catch (error) {
          results.push({
            engine: engine.id,
            graph: i,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        } finally {
          engine.destroy();
        }
      }
    }
  } finally {
    document.body.removeChild(container);
  }
  
  return results;
}

/**
 * Memory leak detection utilities
 */
export class MemoryLeakDetector {
  private initialMemory: number = 0;
  private samples: number[] = [];
  
  start(): void {
    this.initialMemory = this.getCurrentMemoryUsage();
    this.samples = [this.initialMemory];
  }
  
  sample(): void {
    this.samples.push(this.getCurrentMemoryUsage());
  }
  
  finish(): {
    initialMemory: number;
    finalMemory: number;
    memoryGrowth: number;
    hasMemoryLeak: boolean;
    samples: number[];
  } {
    const finalMemory = this.getCurrentMemoryUsage();
    const memoryGrowth = finalMemory - this.initialMemory;
    
    return {
      initialMemory: this.initialMemory,
      finalMemory,
      memoryGrowth,
      hasMemoryLeak: memoryGrowth > 10 * 1024 * 1024, // 10MB threshold
      samples: [...this.samples]
    };
  }
  
  private getCurrentMemoryUsage(): number {
    return (performance as any).memory?.usedJSHeapSize || 0;
  }
}

/**
 * Test assertions for graph engines
 */
export const engineAssertions = {
  async shouldInitialiseSuccessfully(engine: IGraphEngine): Promise<void> {
    const container = document.createElement('div');
    try {
      await engine.initialise(container, { width: 800, height: 600 });
      if (!engine.status.isInitialised) {
        throw new Error('Engine should be initialised after calling initialise()');
      }
    } finally {
      engine.destroy();
    }
  },
  
  async shouldLoadGraphSuccessfully(engine: IGraphEngine, graph: IGraph): Promise<void> {
    const container = document.createElement('div');
    try {
      await engine.initialise(container, { width: 800, height: 600 });
      await engine.loadGraph(graph);
      
      const positions = engine.getPositions();
      if (positions.length !== graph.vertices.length) {
        throw new Error(`Expected ${graph.vertices.length} positions, got ${positions.length}`);
      }
    } finally {
      engine.destroy();
    }
  },
  
  shouldHaveValidCapabilities(engine: IGraphEngine): void {
    const { capabilities } = engine;
    
    if (capabilities.maxVertices <= 0) {
      throw new Error('maxVertices should be positive');
    }
    
    if (capabilities.maxEdges <= 0) {
      throw new Error('maxEdges should be positive');
    }
    
    if (capabilities.exportFormats.length === 0) {
      throw new Error('Engine should support at least one export format');
    }
  },
  
  async shouldHandleEmptyGraph(engine: IGraphEngine): Promise<void> {
    const container = document.createElement('div');
    try {
      await engine.initialise(container, { width: 800, height: 600 });
      await engine.loadGraph({ vertices: [], edges: [] });
      
      const positions = engine.getPositions();
      if (positions.length !== 0) {
        throw new Error('Empty graph should have no positions');
      }
    } finally {
      engine.destroy();
    }
  }
};

// Export all utilities
export {
  InteractionSimulator as createInteractionSimulator,
  MemoryLeakDetector as createMemoryLeakDetector
};