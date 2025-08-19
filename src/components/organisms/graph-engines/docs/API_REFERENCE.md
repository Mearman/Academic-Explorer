# Graph Engine API Reference

Complete TypeScript API reference for the graph engine system, providing detailed documentation for all interfaces, classes, and utility functions.

---

## 📚 Table of Contents

- [Core Interfaces](#core-interfaces)
- [Engine Implementations](#engine-implementations)
- [Configuration Types](#configuration-types)
- [Testing & Benchmarking](#testing--benchmarking)
- [Migration Utilities](#migration-utilities)
- [Utility Functions](#utility-functions)
- [Examples & Usage Patterns](#examples--usage-patterns)

---

## 🔧 Core Interfaces

### IGraphEngine&lt;TVertexData, TEdgeData&gt;

The standardised interface that all graph rendering engines must implement.

```typescript
interface IGraphEngine<TVertexData = unknown, TEdgeData = unknown> {
  // Engine identification
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly capabilities: IEngineCapabilities;
  readonly requirements: IEngineRequirements;
  readonly status: IEngineStatus;
  readonly isImplemented: boolean;
  
  // Lifecycle methods
  initialise(container: HTMLElement, dimensions: IDimensions, config?: IEngineConfig): Promise<void>;
  loadGraph(graph: IGraph<TVertexData, TEdgeData>, config?: IGraphConfig<TVertexData, TEdgeData>): Promise<void>;
  updateGraph(graph: IGraph<TVertexData, TEdgeData>, animate?: boolean): Promise<void>;
  resize(dimensions: IDimensions): void;
  destroy(): void;
  
  // Interaction methods
  getPositions(): ReadonlyArray<IPositionedVertex<TVertexData>>;
  setPositions(positions: ReadonlyArray<IPositionedVertex<TVertexData>>, animate?: boolean): void;
  fitToView(padding?: number, animate?: boolean): void;
  export(format: 'png' | 'svg' | 'json' | 'pdf', options?: Record<string, unknown>): Promise<string | Blob>;
  
  // Optional preview component for placeholder engines
  getPreviewComponent?(): React.ComponentType<{
    dimensions: IDimensions;
    sampleData?: IGraph<TVertexData, TEdgeData>;
  }>;
}
```

#### Usage Example

```typescript
import { createCytoscapeEngine } from '@/components/organisms/graph-engines';

// Create engine instance
const engine = createCytoscapeEngine();

// Check if engine is implemented
if (!engine.isImplemented) {
  console.warn('Engine is placeholder only');
  return;
}

// Initialise with container
const container = document.getElementById('graph-container')!;
await engine.initialise(container, { width: 800, height: 600 });

// Load graph data
const graph = {
  vertices: [
    { id: 'v1', data: { label: 'Node 1', type: 'primary' } },
    { id: 'v2', data: { label: 'Node 2', type: 'secondary' } }
  ],
  edges: [
    { id: 'e1', source: 'v1', target: 'v2', data: { weight: 1.0 } }
  ]
};

await engine.loadGraph(graph);

// Interact with the graph
engine.fitToView(20, true);
const positions = engine.getPositions();
```

### IEngineCapabilities

Defines the performance characteristics and feature set of a graph engine.

```typescript
interface IEngineCapabilities {
  readonly maxVertices: number;                    // Maximum recommended vertices
  readonly maxEdges: number;                       // Maximum recommended edges
  readonly supportsHardwareAcceleration: boolean;  // GPU acceleration support
  readonly supportsInteractiveLayout: boolean;     // Interactive layout algorithms
  readonly supportsPhysicsSimulation: boolean;     // Real-time physics
  readonly supportsClustering: boolean;            // Node clustering/grouping
  readonly supportsCustomShapes: boolean;          // Custom node shapes
  readonly supportsEdgeBundling: boolean;          // Edge bundling algorithms
  readonly exportFormats: ReadonlyArray<'png' | 'svg' | 'json' | 'pdf'>;
  readonly memoryUsage: 'low' | 'medium' | 'high';
  readonly cpuUsage: 'low' | 'medium' | 'high';
  readonly batteryImpact: 'minimal' | 'moderate' | 'significant';
}
```

#### Usage Example

```typescript
// Check engine capabilities before use
function selectAppropriateEngine(vertexCount: number, edgeCount: number): IGraphEngine {
  const engines = [
    createCanvasEngine(),
    createCytoscapeEngine(),
    createWebGLEngine()
  ];
  
  return engines.find(engine => {
    const caps = engine.capabilities;
    return vertexCount <= caps.maxVertices && 
           edgeCount <= caps.maxEdges &&
           engine.isImplemented;
  }) || createCanvasEngine(); // Fallback
}

// Use capabilities for feature detection
function checkInteractivitySupport(engine: IGraphEngine): boolean {
  return engine.capabilities.supportsInteractiveLayout;
}
```

### IEngineStatus

Runtime status information for a graph engine instance.

```typescript
interface IEngineStatus {
  readonly isInitialised: boolean;
  readonly isRendering: boolean;
  readonly lastError?: string;
  readonly metrics?: {
    readonly frameRate: number;
    readonly memoryUsage: number;
    readonly verticesRendered: number;
    readonly edgesRendered: number;
    readonly lastRenderTime: number;
  };
}
```

#### Usage Example

```typescript
// Monitor engine status
function monitorEngineHealth(engine: IGraphEngine): void {
  const status = engine.status;
  
  console.log('Engine Status:', {
    initialised: status.isInitialised,
    rendering: status.isRendering,
    error: status.lastError
  });
  
  if (status.metrics) {
    console.log('Performance Metrics:', {
      fps: status.metrics.frameRate,
      memory: `${status.metrics.memoryUsage / 1024 / 1024}MB`,
      vertices: status.metrics.verticesRendered,
      renderTime: `${status.metrics.lastRenderTime}ms`
    });
  }
}
```

### IGraphEngineRegistry&lt;TVertexData, TEdgeData&gt;

Registry for managing and discovering available graph engines.

```typescript
interface IGraphEngineRegistry<TVertexData = unknown, TEdgeData = unknown> {
  registerEngine(engine: IGraphEngine<TVertexData, TEdgeData>): void;
  getEngine(id: string): IGraphEngine<TVertexData, TEdgeData> | undefined;
  getEngines(): ReadonlyArray<IGraphEngine<TVertexData, TEdgeData>>;
  getEnginesByCapabilities(requirements: Partial<IEngineCapabilities>): ReadonlyArray<IGraphEngine<TVertexData, TEdgeData>>;
  getRecommendedEngine(vertexCount: number, edgeCount: number): IGraphEngine<TVertexData, TEdgeData> | undefined;
}
```

#### Usage Example

```typescript
import { createEngineRegistry } from '@/components/organisms/graph-engines';

// Create and populate registry
const registry = createEngineRegistry();
registry.registerEngine(createCanvasEngine());
registry.registerEngine(createCytoscapeEngine());
registry.registerEngine(createD3ForceEngine());
registry.registerEngine(createWebGLEngine());

// Find engines by capabilities
const highPerformanceEngines = registry.getEnginesByCapabilities({
  supportsHardwareAcceleration: true,
  maxVertices: 10000
});

// Get recommendation for specific graph size
const recommendedEngine = registry.getRecommendedEngine(1500, 3000);
console.log(`Recommended engine: ${recommendedEngine?.name}`);

// List all available engines
const allEngines = registry.getEngines();
console.log('Available engines:', allEngines.map(e => e.name));
```

---

## 🎮 Engine Implementations

### Canvas Engine

Simple, reliable 2D rendering using HTML5 Canvas.

```typescript
import { createCanvasEngine } from '@/components/organisms/graph-engines/canvas';

const engine = createCanvasEngine();

// Canvas-specific configuration
const config: ICanvasConfig = {
  canvasOptions: {
    contextType: '2d',
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high',
    textBaseline: 'middle',
    textAlign: 'center'
  },
  performanceLevel: 'balanced'
};

await engine.initialise(container, dimensions, config);
```

**Capabilities:**
- Max Vertices: 5,000
- Max Edges: 15,000
- GPU Acceleration: ❌
- Memory Usage: Low
- Battery Impact: Minimal
- Export Formats: PNG, SVG

### Cytoscape.js Engine

Feature-rich network analysis with sophisticated layouts.

```typescript
import { createCytoscapeEngine } from '@/components/organisms/graph-engines/cytoscape';

const engine = createCytoscapeEngine();

// Cytoscape-specific configuration
const config: ICytoscapeConfig = {
  cytoscapeOptions: {
    layout: {
      name: 'cose-bilkent',
      idealEdgeLength: 100,
      nodeOverlap: 20,
      refresh: 20,
      randomize: false
    },
    style: [
      {
        selector: 'node',
        style: {
          'background-color': '#666',
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'font-size': 12
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': '#ccc',
          'curve-style': 'bezier'
        }
      }
    ],
    userZoomingEnabled: true,
    userPanningEnabled: true,
    boxSelectionEnabled: true
  }
};

await engine.initialise(container, dimensions, config);
```

**Capabilities:**
- Max Vertices: 10,000
- Max Edges: 50,000
- Interactive Layouts: ✅
- Clustering: ✅
- Custom Shapes: ✅
- Export Formats: PNG, SVG, JSON

### D3.js Force Engine

Physics-based simulations with beautiful animations.

```typescript
import { createD3ForceEngine } from '@/components/organisms/graph-engines/d3-force';

const engine = createD3ForceEngine();

// D3 Force-specific configuration
const config: ID3ForceConfig = {
  forceOptions: {
    linkDistance: 80,
    linkStrength: 0.5,
    chargeStrength: -300,
    centerStrength: 0.1,
    collideRadius: 10,
    alpha: 1,
    alphaDecay: 0.0228,
    velocityDecay: 0.4
  }
};

await engine.initialise(container, dimensions, config);
```

**Capabilities:**
- Max Vertices: 5,000
- Max Edges: 20,000
- Physics Simulation: ✅
- Real-time Animation: ✅
- CPU Usage: High
- Battery Impact: Significant

### WebGL Engine

High-performance GPU-accelerated rendering for massive graphs.

```typescript
import { createWebGLEngine } from '@/components/organisms/graph-engines/webgl';

const engine = createWebGLEngine();

// WebGL-specific configuration
const config: IWebGLConfig = {
  webglOptions: {
    antialias: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
    shaderPrecision: 'highp',
    instancedRendering: true,
    levelOfDetail: {
      enabled: true,
      thresholds: [1000, 5000, 20000]
    }
  }
};

await engine.initialise(container, dimensions, config);
```

**Capabilities:**
- Max Vertices: 100,000+
- Max Edges: 500,000+
- Hardware Acceleration: ✅
- Level of Detail: ✅
- Memory Usage: High (GPU)
- Browser Requirements: WebGL 1.0+

---

## ⚙️ Configuration Types

### IEngineConfig

Base configuration for all engines.

```typescript
interface IEngineConfig {
  readonly parameters?: Record<string, unknown>;
  readonly performanceLevel?: 'memory' | 'balanced' | 'performance';
  readonly debug?: boolean;
  readonly styling?: Record<string, unknown>;
}
```

### IGraphConfig&lt;TVertexData, TEdgeData&gt;

Configuration for graph layout and styling.

```typescript
interface IGraphConfig<TVertexData = unknown, TEdgeData = unknown> {
  layout?: {
    algorithm: string;
    parameters?: Record<string, unknown>;
  };
  styling?: {
    vertex?: {
      size?: number | ((vertex: IVertex<TVertexData>) => number);
      color?: string | ((vertex: IVertex<TVertexData>) => string);
      opacity?: number | ((vertex: IVertex<TVertexData>) => number);
      label?: string | ((vertex: IVertex<TVertexData>) => string);
      shape?: string | ((vertex: IVertex<TVertexData>) => string);
    };
    edge?: {
      width?: number | ((edge: IEdge<TEdgeData>) => number);
      color?: string | ((edge: IEdge<TEdgeData>) => string);
      opacity?: number | ((edge: IEdge<TEdgeData>) => number);
      style?: 'solid' | 'dashed' | 'dotted';
      arrow?: boolean;
    };
  };
  interactions?: {
    zoom?: { enabled: boolean; min?: number; max?: number };
    pan?: { enabled: boolean };
    selection?: { enabled: boolean; multiple?: boolean };
  };
}
```

#### Complete Configuration Example

```typescript
const comprehensiveConfig: IGraphConfig<NodeData, EdgeData> = {
  layout: {
    algorithm: 'force-directed',
    parameters: {
      linkDistance: 100,
      chargeStrength: -500,
      centerStrength: 0.2,
      iterations: 1000
    }
  },
  styling: {
    vertex: {
      size: (vertex) => {
        const baseSize = 20;
        const scale = Math.log(vertex.data.importance + 1) * 5;
        return Math.min(baseSize + scale, 50);
      },
      color: (vertex) => {
        const colorMap = {
          primary: '#2196F3',
          secondary: '#4CAF50',
          tertiary: '#FF9800'
        };
        return colorMap[vertex.data.category] || '#666';
      },
      opacity: (vertex) => vertex.data.active ? 1.0 : 0.5,
      label: (vertex) => vertex.data.displayName || vertex.id,
      shape: (vertex) => vertex.data.isSpecial ? 'diamond' : 'circle'
    },
    edge: {
      width: (edge) => Math.max(1, edge.data.strength * 5),
      color: (edge) => edge.data.type === 'strong' ? '#333' : '#ccc',
      opacity: 0.7,
      style: 'solid',
      arrow: true
    }
  },
  interactions: {
    zoom: { enabled: true, min: 0.1, max: 5 },
    pan: { enabled: true },
    selection: { enabled: true, multiple: true }
  }
};
```

---

## 🧪 Testing & Benchmarking

### Testing Utilities

Complete testing framework for engine validation.

```typescript
import {
  createTestGraph,
  createMockEngine,
  InteractionSimulator,
  MemoryLeakDetector,
  engineAssertions
} from '@/components/organisms/graph-engines/testing/engine-test-utils';

// Generate test data
const testGraph = createTestGraph({
  vertexCount: 100,
  edgeCount: 200,
  topology: 'random',
  seed: 42
});

// Create mock engine for testing
const mockEngine = createMockEngine({
  id: 'test-engine',
  name: 'Test Engine',
  maxVertices: 1000,
  supportsInteractiveLayout: true
});

// Test engine functionality
describe('Engine Tests', () => {
  it('should initialise correctly', async () => {
    await engineAssertions.shouldInitialiseSuccessfully(mockEngine);
  });
  
  it('should load graph data', async () => {
    await engineAssertions.shouldLoadGraphSuccessfully(mockEngine, testGraph);
  });
  
  it('should handle interactions', async () => {
    const simulator = new InteractionSimulator(mockEngine);
    
    await simulator.clickVertex('vertex-1');
    await simulator.dragVertex('vertex-2', { x: 0, y: 0 }, { x: 100, y: 100 });
    await simulator.zoom(1.5);
    
    const interactions = mockEngine.getInteractions();
    expect(interactions).toHaveLength(3);
  });
  
  it('should not leak memory', async () => {
    const detector = new MemoryLeakDetector();
    detector.start();
    
    // Perform operations that might leak memory
    await mockEngine.initialise(container, { width: 800, height: 600 });
    await mockEngine.loadGraph(testGraph);
    await mockEngine.updateGraph(testGraph);
    mockEngine.destroy();
    
    const results = detector.finish();
    expect(results.hasMemoryLeak).toBe(false);
  });
});
```

### Performance Benchmarking

Comprehensive performance testing and comparison tools.

```typescript
import {
  GraphEngineBenchmarkRunner,
  quickBenchmark,
  createBenchmarkSuite
} from '@/components/organisms/graph-engines/benchmarks/performance-tests';

// Quick benchmark comparison
const engines = [
  { id: 'canvas', engine: createCanvasEngine() },
  { id: 'cytoscape', engine: createCytoscapeEngine() }
];

const quickResults = await quickBenchmark(engines);
console.log('Quick Benchmark Results:', quickResults.performanceMatrix);

// Comprehensive benchmark suite
const benchmarkConfig = createBenchmarkSuite();
const runner = new GraphEngineBenchmarkRunner(benchmarkConfig);

// Register engines
engines.forEach(({ id, engine }) => {
  runner.registerEngine(id, engine);
});

// Run full benchmark
const fullResults = await runner.runBenchmarkSuite();

// Access detailed results
fullResults.engines.forEach(engine => {
  console.log(`${engine.engineName}: ${engine.summary.performanceGrade}`);
  console.log('Strengths:', engine.summary.strengths);
  console.log('Weaknesses:', engine.summary.weaknesses);
});

// Get migration advice
fullResults.migrationAdvice.forEach(advice => {
  console.log(`Migrating from ${advice.fromEngine} to ${advice.toEngine}:`);
  console.log('Benefits:', advice.benefits);
  console.log('Effort:', advice.effort);
  console.log('Timeline:', advice.timeline);
});

// Cleanup
runner.destroy();
```

---

## 🔄 Migration Utilities

### EntityGraphAdapter

Backward compatibility wrapper for gradual migration.

```typescript
import { EntityGraphAdapter } from '@/components/organisms/graph-engines/compatibility/EntityGraphAdapter';

// Drop-in replacement for EntityGraphVisualization
function MigratedGraphComponent() {
  const vertices = useEntityGraphStore(state => state.vertices);
  const edges = useEntityGraphStore(state => state.edges);
  
  return (
    <EntityGraphAdapter
      // Legacy props (unchanged)
      vertices={vertices}
      edges={edges}
      onVertexClick={handleVertexClick}
      layout={{ algorithm: 'force-directed' }}
      width={800}
      height={600}
      
      // New engine system props
      preferredEngine="cytoscape"
      enablePerformanceMonitoring={true}
      enableMigrationAssistance={true}
      fallbackStrategy="canvas"
      
      // Callbacks for migration insights
      onEngineReady={(engineId, capabilities) => {
        console.log(`Using engine: ${engineId}`);
        console.log('Capabilities:', capabilities);
      }}
      
      onPerformanceMetrics={(metrics) => {
        console.log('Performance metrics:', metrics);
      }}
      
      onMigrationRecommendation={(recommendations) => {
        console.log('Migration recommendations:', recommendations);
      }}
      
      engineConfig={{
        cytoscapeOptions: {
          layout: {
            name: 'cose-bilkent',
            idealEdgeLength: 100
          }
        }
      }}
    />
  );
}
```

### Configuration Migration

Utility for converting legacy configurations.

```typescript
import { migrateLegacyConfig } from '@/components/organisms/graph-engines/compatibility';

// Legacy configuration
const legacyConfig = {
  layout: {
    algorithm: 'force-directed',
    linkDistance: 80,
    chargeStrength: -300
  },
  styling: {
    vertexColors: {
      work: '#4CAF50',
      author: '#2196F3'
    }
  }
};

// Migrate to new format
const newConfig = migrateLegacyConfig(legacyConfig);

// Use with new engine system
<GraphVisualization config={newConfig} />
```

---

## 🛠 Utility Functions

### Engine Selection Helpers

```typescript
import { 
  getEngineRecommendations,
  isEngineCompatible,
  getBestEngineForUseCase 
} from '@/components/organisms/graph-engines/utils';

// Get recommendations for graph size
const recommendations = getEngineRecommendations(1500, 3000);
console.log('Primary recommendation:', recommendations.primary);
console.log('Alternatives:', recommendations.alternatives);
console.log('Reasoning:', recommendations.reasons);

// Check compatibility
const isCompatible = isEngineCompatible('webgl', {
  maxVertices: 10000,
  supportsHardwareAcceleration: true
});

// Get best engine for use case
const bestEngine = getBestEngineForUseCase('research-analysis', {
  graphSize: { vertices: 2000, edges: 4000 },
  interactionRequirements: ['selection', 'clustering'],
  performanceRequirements: ['smooth-animation']
});
```

### Performance Monitoring

```typescript
import { 
  createPerformanceMonitor,
  trackEngineMetrics 
} from '@/components/organisms/graph-engines/monitoring';

// Create performance monitor
const monitor = createPerformanceMonitor(engine);

monitor.on('performanceWarning', (warning) => {
  console.warn('Performance issue:', warning);
});

monitor.on('memoryPressure', (pressure) => {
  console.warn('Memory pressure detected:', pressure);
});

// Track specific metrics
trackEngineMetrics(engine, {
  trackFrameRate: true,
  trackMemoryUsage: true,
  trackRenderTime: true,
  alertThresholds: {
    frameRate: 30,
    memoryUsage: 100 * 1024 * 1024, // 100MB
    renderTime: 100 // 100ms
  }
});
```

---

## 📋 Examples & Usage Patterns

### Basic Usage

```typescript
import { 
  GraphEngineProvider,
  GraphVisualization,
  createCytoscapeEngine 
} from '@/components/organisms/graph-engines';

function BasicGraphExample() {
  const engine = useMemo(() => createCytoscapeEngine(), []);
  
  const graphData = {
    vertices: [
      { id: 'A', data: { label: 'Node A', type: 'primary' } },
      { id: 'B', data: { label: 'Node B', type: 'secondary' } },
      { id: 'C', data: { label: 'Node C', type: 'tertiary' } }
    ],
    edges: [
      { id: 'A-B', source: 'A', target: 'B', data: { weight: 1.0 } },
      { id: 'B-C', source: 'B', target: 'C', data: { weight: 0.5 } }
    ]
  };
  
  return (
    <GraphEngineProvider engine={engine}>
      <GraphVisualization
        graph={graphData}
        dimensions={{ width: 800, height: 600 }}
        config={{
          layout: { algorithm: 'cose-bilkent' },
          styling: {
            vertex: {
              color: (v) => v.data.type === 'primary' ? '#2196F3' : '#4CAF50',
              size: 20,
              label: (v) => v.data.label
            }
          }
        }}
        onVertexClick={(vertex) => console.log('Clicked:', vertex)}
      />
    </GraphEngineProvider>
  );
}
```

### Advanced Configuration

```typescript
function AdvancedGraphExample() {
  const [selectedEngine, setSelectedEngine] = useState<'canvas' | 'cytoscape' | 'webgl'>('cytoscape');
  
  const engine = useMemo(() => {
    switch (selectedEngine) {
      case 'canvas': return createCanvasEngine();
      case 'cytoscape': return createCytoscapeEngine();
      case 'webgl': return createWebGLEngine();
      default: return createCanvasEngine();
    }
  }, [selectedEngine]);
  
  const advancedConfig: IGraphConfig = {
    layout: {
      algorithm: 'force-directed',
      parameters: {
        linkDistance: (edge) => edge.data.distance || 100,
        nodeStrength: (vertex) => vertex.data.influence || -300,
        iterations: 1000
      }
    },
    styling: {
      vertex: {
        size: (vertex) => {
          const baseSize = 15;
          const scale = vertex.data.connections * 2;
          return Math.min(baseSize + scale, 40);
        },
        color: (vertex) => {
          const hue = (vertex.data.category * 137.508) % 360;
          return `hsl(${hue}, 70%, 50%)`;
        },
        opacity: (vertex) => vertex.data.active ? 1.0 : 0.3,
        label: (vertex) => vertex.data.shortName || vertex.id,
        shape: (vertex) => {
          return vertex.data.isImportant ? 'diamond' : 'circle';
        }
      },
      edge: {
        width: (edge) => Math.max(1, edge.data.strength * 3),
        color: (edge) => {
          return edge.data.type === 'strong' ? '#333' : '#999';
        },
        opacity: 0.6,
        style: (edge) => edge.data.uncertain ? 'dashed' : 'solid'
      }
    },
    interactions: {
      zoom: { enabled: true, min: 0.1, max: 10 },
      pan: { enabled: true },
      selection: { enabled: true, multiple: true }
    }
  };
  
  return (
    <div>
      <div>
        <label>Engine:</label>
        <select value={selectedEngine} onChange={(e) => setSelectedEngine(e.target.value as any)}>
          <option value="canvas">Canvas (Reliable)</option>
          <option value="cytoscape">Cytoscape (Feature-rich)</option>
          <option value="webgl">WebGL (High Performance)</option>
        </select>
      </div>
      
      <GraphEngineProvider engine={engine}>
        <GraphVisualization
          graph={complexGraphData}
          dimensions={{ width: 1200, height: 800 }}
          config={advancedConfig}
          onVertexClick={handleVertexClick}
          onVertexDoubleClick={handleVertexDoubleClick}
          onEdgeClick={handleEdgeClick}
        />
      </GraphEngineProvider>
    </div>
  );
}
```

### Dynamic Engine Switching

```typescript
function DynamicEngineExample() {
  const [graphData, setGraphData] = useState<IGraph>({ vertices: [], edges: [] });
  const [isLoading, setIsLoading] = useState(false);
  
  // Choose engine based on graph size and user preferences
  const optimalEngine = useMemo(() => {
    const vertexCount = graphData.vertices.length;
    const userPrefs = getUserPreferences();
    
    if (vertexCount > 10000) {
      return createWebGLEngine();
    } else if (vertexCount > 1000 || userPrefs.interactivity === 'high') {
      return createCytoscapeEngine();
    } else if (userPrefs.animation === 'enabled') {
      return createD3ForceEngine();
    } else {
      return createCanvasEngine(); // Reliable fallback
    }
  }, [graphData]);
  
  const handleLoadLargeGraph = useCallback(async () => {
    setIsLoading(true);
    try {
      const largeGraph = await fetchLargeGraphData();
      setGraphData(largeGraph);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return (
    <div>
      <button onClick={handleLoadLargeGraph} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Load Large Graph'}
      </button>
      
      <div style={{ marginTop: 16 }}>
        Engine: {optimalEngine.name} ({graphData.vertices.length} vertices)
      </div>
      
      <GraphEngineProvider engine={optimalEngine}>
        <GraphVisualization
          graph={graphData}
          dimensions={{ width: 1000, height: 700 }}
          loading={isLoading}
        />
      </GraphEngineProvider>
    </div>
  );
}
```

### Custom Engine Implementation

```typescript
// Custom engine implementation example
class CustomSVGEngine implements IGraphEngine {
  readonly id = 'custom-svg';
  readonly name = 'Custom SVG Engine';
  readonly description = 'Custom SVG-based graph renderer';
  readonly version = '1.0.0';
  readonly isImplemented = true;
  
  readonly capabilities: IEngineCapabilities = {
    maxVertices: 2000,
    maxEdges: 5000,
    supportsHardwareAcceleration: false,
    supportsInteractiveLayout: true,
    supportsPhysicsSimulation: false,
    supportsClustering: false,
    supportsCustomShapes: true,
    supportsEdgeBundling: false,
    exportFormats: ['png', 'svg'],
    memoryUsage: 'low',
    cpuUsage: 'medium',
    batteryImpact: 'minimal'
  };
  
  readonly requirements: IEngineRequirements = {
    dependencies: [],
    browserSupport: { chrome: 1, firefox: 1, safari: 3 },
    requiredFeatures: ['SVG'],
    setupInstructions: 'No setup required - uses native SVG'
  };
  
  private _status: IEngineStatus = {
    isInitialised: false,
    isRendering: false
  };
  
  get status(): IEngineStatus {
    return this._status;
  }
  
  async initialise(container: HTMLElement, dimensions: IDimensions): Promise<void> {
    // Custom initialisation logic
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', dimensions.width.toString());
    svg.setAttribute('height', dimensions.height.toString());
    container.appendChild(svg);
    
    this._status = { ...this._status, isInitialised: true };
  }
  
  async loadGraph(graph: IGraph): Promise<void> {
    // Custom graph loading logic
    this._status = { ...this._status, isRendering: true };
  }
  
  // ... implement other required methods
}

// Register and use custom engine
const customEngine = new CustomSVGEngine();
const registry = createEngineRegistry();
registry.registerEngine(customEngine);
```

---

## 🔍 Type Definitions Quick Reference

```typescript
// Core graph data structures
interface IVertex<TData = unknown> {
  id: string;
  data: TData;
}

interface IEdge<TData = unknown> {
  id: string;
  source: string;
  target: string;
  data: TData;
}

interface IGraph<TVertexData = unknown, TEdgeData = unknown> {
  vertices: IVertex<TVertexData>[];
  edges: IEdge<TEdgeData>[];
}

interface IPosition {
  x: number;
  y: number;
}

interface IDimensions {
  width: number;
  height: number;
}

interface IPositionedVertex<TData = unknown> extends IVertex<TData> {
  position: IPosition;
}

// Event handler types
type VertexClickHandler<T> = (vertex: IVertex<T>) => void;
type EdgeClickHandler<T> = (edge: IEdge<T>) => void;
type GraphEventHandler = () => void;
```

---

*This API reference provides comprehensive documentation for the graph engine system. For implementation examples and migration guidance, refer to the [Migration Guide](../MIGRATION_GUIDE.md) and [testing utilities](../testing/engine-test-utils.ts).*