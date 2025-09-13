# Graph Rendering Engines

A collection of pluggable graph rendering engines designed for different use cases, performance requirements, and feature needs. Each engine implements the standardised `IGraphEngine` interface while providing unique capabilities and optimisations.

## 🚀 Available Engines

### 1. Cytoscape.js Engine (`CytoscapeEngine`)
**Network Analysis & Interactive Layouts**

```typescript
import { createCytoscapeEngine } from '@/components/organisms/graph-engines';
const engine = createCytoscapeEngine();
```

**Best For:**
- Network analysis and graph theory applications
- Interactive graph exploration
- Medium-sized graphs (up to 10,000 vertices)
- Rich user interactions and selections

**Key Capabilities:**
- ✅ Sophisticated layout algorithms (force-directed, hierarchical, circular)
- ✅ Rich interaction capabilities (selection, dragging, grouping)
- ✅ CSS-like styling system
- ✅ Built-in graph analysis functions
- ✅ Extensible plugin ecosystem
- ✅ Clustering and grouping support

**Performance:**
- **Max Vertices:** 10,000
- **Max Edges:** 50,000
- **Memory Usage:** Medium
- **CPU Usage:** Medium
- **Battery Impact:** Moderate

**Installation Requirements:**
```bash
npm install cytoscape @types/cytoscape
npm install cytoscape-cose-bilkent cytoscape-dagre cytoscape-elk
```

---

### 2. D3.js Force Simulation (`D3ForceEngine`)
**Physics-Based Layouts & Real-Time Animation**

```typescript
import { createD3ForceEngine } from '@/components/organisms/graph-engines';
const engine = createD3ForceEngine();
```

**Best For:**
- Beautiful physics-based animations
- Custom force implementations
- Smooth real-time interactions
- Educational and exploratory visualisations

**Key Capabilities:**
- ✅ Physics-based force simulation (charge, link, collision forces)
- ✅ Highly customisable layout algorithms
- ✅ Smooth real-time animations
- ✅ Custom force implementations
- ✅ Direct SVG/Canvas manipulation
- ✅ Precise control over visual styling

**Performance:**
- **Max Vertices:** 5,000
- **Max Edges:** 20,000
- **Memory Usage:** Low
- **CPU Usage:** High (physics calculations)
- **Battery Impact:** Significant (continuous animation)

**Installation Requirements:**
```bash
npm install d3-force d3-selection d3-drag d3-zoom d3-scale
npm install @types/d3-force @types/d3-selection --save-dev
```

---

### 3. WebGL Renderer (`WebGLEngine`)
**High-Performance GPU Acceleration**

```typescript
import { createWebGLEngine } from '@/components/organisms/graph-engines';
const engine = createWebGLEngine();
```

**Best For:**
- Massive graphs (100k+ vertices)
- High-performance visualisations
- Advanced visual effects
- Real-time data streaming

**Key Capabilities:**
- ✅ Hardware-accelerated GPU rendering
- ✅ Support for 100k+ vertices with 60fps
- ✅ Instanced rendering for identical shapes
- ✅ Custom GLSL shaders for visual effects
- ✅ Level-of-detail (LOD) rendering
- ✅ Advanced effects (bloom, depth-of-field)

**Performance:**
- **Max Vertices:** 100,000+
- **Max Edges:** 500,000+
- **Memory Usage:** High (GPU memory)
- **CPU Usage:** Low (GPU handles rendering)
- **Battery Impact:** Significant (GPU intensive)

**Installation Requirements:**
```bash
npm install gl-matrix
npm install regl three --save-optional
```

**Browser Requirements:**
- WebGL 1.0 support (Chrome 56+, Firefox 51+, Safari 12+)
- WebGL 2.0 recommended for advanced features

---

### 4. HTML5 Canvas (`CanvasEngine`)
**Cross-Browser Compatibility & Reliability**

```typescript
import { createCanvasEngine } from '@/components/organisms/graph-engines';
const engine = createCanvasEngine();
```

**Best For:**
- Maximum browser compatibility
- Predictable rendering behaviour
- Print-quality exports
- Simple, reliable implementations

**Key Capabilities:**
- ✅ Excellent cross-browser compatibility
- ✅ Predictable 2D rendering with pixel precision
- ✅ Built-in text rendering and typography
- ✅ Easy PNG/JPEG export
- ✅ Low memory footprint
- ✅ No external dependencies

**Performance:**
- **Max Vertices:** 5,000
- **Max Edges:** 15,000
- **Memory Usage:** Low
- **CPU Usage:** Medium
- **Battery Impact:** Minimal

**Installation Requirements:**
```bash
# No external dependencies required!
# HTML5 Canvas is natively supported
```

**Browser Support:**
- Chrome 4+, Firefox 4+, Safari 4+, IE 9+

## 🎯 Choosing the Right Engine

### Performance Comparison

| Engine | Max Vertices | GPU Accelerated | Animation | Battery Impact | Browser Support |
|--------|-------------|----------------|-----------|----------------|-----------------|
| **WebGL** | 100,000+ | ✅ Yes | Smooth | High | Modern |
| **Cytoscape** | 10,000 | ❌ No | Good | Medium | Excellent |
| **D3 Force** | 5,000 | ❌ No | Excellent | High | Excellent |
| **Canvas** | 5,000 | ❌ No | Basic | Low | Universal |

### Use Case Recommendations

#### 🔬 **Research & Analysis**
→ **Cytoscape.js** - Rich analysis features, clustering, network metrics

#### 🎨 **Beautiful Visualisations**
→ **D3 Force** - Physics animation, custom styling, educational content

#### ⚡ **High Performance**
→ **WebGL** - Large datasets, real-time updates, advanced effects

#### 📱 **Mobile & Compatibility**
→ **Canvas** - Universal support, low battery usage, reliable rendering

## 🛠 Usage Examples

### Basic Engine Setup

```typescript
import { 
  createEngineRegistry,
  getEngineRecommendations 
} from '@/components/organisms/graph-engines';

// Create registry with all engines
const registry = createEngineRegistry();

// Get recommendation for your graph size
const recommendation = getEngineRecommendations(1000, 5000);
console.log(`Recommended engine: ${recommendation.primary}`);

// Get specific engine
const engine = registry.getEngine('cytoscape');
```

### Engine Initialisation

```typescript
// Initialize engine with container
await engine.initialise(containerElement, { width: 800, height: 600 });

// Load graph data
await engine.loadGraph(graphData, config);

// Fit to viewport
engine.fitToView(50, true);
```

### Configuration Examples

```typescript
// Cytoscape configuration
const cytoscapeConfig = {
  cytoscapeOptions: {
    layout: {
      name: 'cose-bilkent',
      idealEdgeLength: 100,
      nodeOverlap: 20,
    },
    style: [
      {
        selector: 'node',
        style: {
          'background-color': '#666',
          'label': 'data(label)',
        },
      },
    ],
  },
};

// D3 Force configuration
const d3Config = {
  forceOptions: {
    linkDistance: 80,
    chargeStrength: -300,
    centerStrength: 0.1,
  },
};

// WebGL configuration
const webglConfig = {
  webglOptions: {
    antialias: true,
    powerPreference: 'high-performance',
    levelOfDetail: {
      enabled: true,
      thresholds: [1000, 5000, 20000],
    },
  },
};
```

## 📊 Capability Matrix

| Feature | Cytoscape | D3 Force | WebGL | Canvas |
|---------|-----------|----------|-------|--------|
| **Layout Algorithms** | ✅ Rich | ✅ Physics | ⚠️ Custom | ⚠️ Manual |
| **Interactive Selection** | ✅ Built-in | ⚠️ Custom | ⚠️ Custom | ⚠️ Manual |
| **Clustering** | ✅ Native | ❌ No | ⚠️ Custom | ❌ No |
| **Custom Shapes** | ✅ Yes | ✅ Yes | ✅ Shaders | ✅ Drawing |
| **Edge Bundling** | ✅ Plugin | ❌ No | ⚠️ Custom | ❌ No |
| **Real-time Physics** | ❌ No | ✅ Native | ⚠️ Compute | ❌ No |
| **Export Formats** | PNG, SVG, JSON | PNG, SVG | PNG | PNG, SVG |

**Legend:**
- ✅ Native support
- ⚠️ Requires custom implementation
- ❌ Not supported

## 🔧 Development Status

### Current Implementation Status

| Engine | Status | Features | Test Coverage |
|--------|--------|----------|---------------|
| **Canvas 2D** | ✅ **Fully Implemented** | 2D rendering, animations, debug mode | ✅ 37 unit tests |
| **WebGL** | ✅ **Fully Implemented** | GPU acceleration, advanced shaders | ✅ 11 unit tests |
| **xyflow** | ✅ **Fully Implemented** | Interactive, layouts, clustering | ✅ 4 test suites |
| **Cytoscape** | ✅ **Fully Implemented** | Rich layouts, network analysis | ⚠️ No tests |
| **D3 Force** | ✅ **Fully Implemented** | Force simulation, custom physics | ⚠️ No tests |
| **vis-network** | ✅ **Fully Implemented** | Physics simulation, clustering | ⚠️ No tests |
| **SVG** | ❌ **Not Implemented** | Vector graphics support | ❌ Not started |

### Development Priorities

1. **Test Coverage** - Add comprehensive test suites for untested engines (Cytoscape, D3 Force, vis-network)
2. **SVG Engine** - Implement vector graphics engine for scalable visualizations
3. **Performance Optimization** - Profile and optimize existing implementations
4. **Documentation** - Complete API documentation and usage examples
5. **Integration Testing** - End-to-end tests for engine switching and data handling

## 📚 API Reference

### Core Interfaces

```typescript
interface IGraphEngine<TVertexData, TEdgeData> {
  // Engine identification
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly capabilities: IEngineCapabilities;
  readonly isImplemented: boolean;
  
  // Lifecycle methods
  initialise(container: HTMLElement, dimensions: IDimensions): Promise<void>;
  loadGraph(graph: IGraph<TVertexData, TEdgeData>): Promise<void>;
  updateGraph(graph: IGraph<TVertexData, TEdgeData>): Promise<void>;
  destroy(): void;
  
  // Interaction methods
  resize(dimensions: IDimensions): void;
  fitToView(padding?: number, animate?: boolean): void;
  getPositions(): ReadonlyArray<IPositionedVertex<TVertexData>>;
  setPositions(positions: ReadonlyArray<IPositionedVertex<TVertexData>>): void;
  
  // Export functionality
  export(format: 'png' | 'svg' | 'json' | 'pdf'): Promise<string | Blob>;
}
```

### Registry Methods

```typescript
interface IGraphEngineRegistry<TVertexData, TEdgeData> {
  registerEngine(engine: IGraphEngine<TVertexData, TEdgeData>): void;
  getEngine(id: string): IGraphEngine<TVertexData, TEdgeData> | undefined;
  getEngines(): ReadonlyArray<IGraphEngine<TVertexData, TEdgeData>>;
  getEnginesByCapabilities(requirements: Partial<IEngineCapabilities>): ReadonlyArray<IGraphEngine<TVertexData, TEdgeData>>;
  getRecommendedEngine(vertexCount: number, edgeCount: number): IGraphEngine<TVertexData, TEdgeData> | undefined;
}
```

## 🎨 Preview Components

Each engine provides a `getPreviewComponent()` method that returns a React component showing what the engine would look like when fully implemented:

```typescript
const PreviewComponent = engine.getPreviewComponent();
return (
  <PreviewComponent 
    dimensions={{ width: 800, height: 600 }}
    sampleData={mockGraphData}
  />
);
```

## 🔮 Future Features

### Planned Enhancements

- **WebWorker Support** - Offload physics calculations and layout algorithms
- **Streaming Updates** - Handle real-time graph data updates
- **Advanced Clustering** - Hierarchical and community detection algorithms  
- **Multi-Engine Compositing** - Combine multiple engines for hybrid rendering
- **AR/VR Support** - 3D graph visualisation for immersive experiences

### Performance Optimisations

- **Viewport Culling** - Only render visible nodes and edges
- **Dynamic LOD** - Automatically adjust detail based on zoom level
- **Intelligent Batching** - Group similar rendering operations
- **Memory Pooling** - Reuse objects to reduce garbage collection

## 📖 Further Reading

- [Graph Theory Fundamentals](https://en.wikipedia.org/wiki/Graph_theory)
- [Network Visualisation Best Practices](https://www.oreilly.com/library/view/interactive-data-visualization/9781449340223/)
- [Performance Optimisation for Large Graphs](https://observablehq.com/@d3/performance-testing)
- [WebGL Graphics Programming](https://webglfundamentals.org/)

---

*This documentation describes a comprehensive graph engine system with 6 fully implemented engines. Development continues with testing, optimization, and additional engine implementations based on project requirements.*