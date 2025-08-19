# Graph Engine Plugin System

A comprehensive plugin architecture for graph visualization with standardized interfaces and multiple rendering strategies. The system provides zero-modification integration with existing components while offering advanced features like performance monitoring, multiple export formats, and comprehensive interaction support.

## Overview

The Graph Engine system provides a pluggable architecture where different rendering engines can be swapped seamlessly while maintaining consistent behavior and interfaces. Each engine implements the `IGraphEngine` interface and provides specific capabilities for layout algorithms, interactions, exports, and performance optimizations.

## Available Engines

### CustomSVG Engine (`custom-svg`)

High-performance SVG-based rendering engine that wraps existing SVG graph components without any modifications. Provides comprehensive feature support with excellent scalability.

**Key Features:**
- ✅ Zero modifications to existing SVG components
- ✅ Multiple layout algorithms (force-directed, circular, grid, hierarchical)
- ✅ Full interaction support (pan, zoom, selection, dragging)
- ✅ Export capabilities (PNG, SVG, JPEG, WebP, JSON)
- ✅ Performance monitoring and optimization
- ✅ Proper lifecycle management with cleanup
- ✅ Accessibility features and keyboard navigation

**Performance Characteristics:**
- Recommended maximum: 2,000 vertices, 5,000 edges
- Level-of-detail rendering support
- Viewport culling for off-screen elements
- Progressive rendering for large datasets
- Web worker support for layout calculations

## Quick Start

### Basic Usage

```typescript
import { createCustomSVGEngine, createOptimizedEngineConfig } from '@/components/organisms/graph-core/graph-engines';

// Create engine instance
const engine = createCustomSVGEngine();

// Set up configuration
const config = createOptimizedEngineConfig(
  100,  // vertex count
  200,  // edge count
  { width: 800, height: 600 },
  { prioritizeQuality: true }
);

// Initialize engine
await engine.initialize(containerElement, config, {
  onVertexClick: (vertex, event) => {
    console.log('Vertex clicked:', vertex.id);
  },
  onLayoutComplete: (layoutId, positions) => {
    console.log('Layout complete:', layoutId);
  },
});

// Load and display graph
await engine.loadGraph({
  vertices: [
    { id: 'A', label: 'Node A', data: { type: 'author' } },
    { id: 'B', label: 'Node B', data: { type: 'work' } },
  ],
  edges: [
    { id: 'AB', sourceId: 'A', targetId: 'B', data: { weight: 1.0 } },
  ],
});
```

### Advanced Setup with Custom Event Handlers

```typescript
import { setupGraphEngine, getPerformanceRecommendations } from '@/components/organisms/graph-core/graph-engines';

// Check performance recommendations
const recommendations = getPerformanceRecommendations(500, 1200);
console.log('Performance recommendations:', recommendations);

// Setup engine with comprehensive event handling
const engine = await setupGraphEngine({
  container: document.getElementById('graph-container'),
  engineType: 'custom-svg',
  config: {
    layout: {
      dimensions: { width: 1200, height: 800 },
      animated: true,
      animationDuration: 1000,
    },
    activeLayoutId: 'force-directed',
    layoutParameters: {
      iterations: 150,
      repulsionStrength: 1000,
      attractionStrength: 0.1,
    },
    interaction: {
      enablePan: true,
      enableZoom: true,
      enableVertexSelection: true,
      enableMultiSelection: true,
      enableVertexDragging: true,
      zoomLimits: { min: 0.1, max: 5.0 },
    },
    performance: {
      enableLOD: true,
      enableCulling: true,
      maxVertices: 2000,
    },
    engineOptions: {
      weightEdges: true,
      sizeByVisits: true,
      antiAliasing: true,
    },
  },
  eventHandlers: {
    onVertexClick: (vertex, event) => {
      console.log('Vertex clicked:', vertex);
    },
    onVertexHover: (vertex, event) => {
      console.log('Vertex hovered:', vertex?.id);
    },
    onSelectionChange: (vertices, edges) => {
      console.log('Selection changed:', vertices.size, edges.size);
    },
    onViewportChange: (zoom, pan) => {
      console.log('Viewport changed:', zoom, pan);
    },
    onLayoutStart: (layoutId) => {
      console.log('Layout started:', layoutId);
    },
    onLayoutComplete: (layoutId, positions) => {
      console.log('Layout completed:', layoutId, positions.size);
    },
    onPerformanceUpdate: (metrics) => {
      console.log('Performance:', metrics.fps, 'FPS');
    },
    onError: (error, context) => {
      console.error('Engine error:', error, context);
    },
  },
});
```

## Engine Interface

### Core Methods

#### Lifecycle Management
- `initialize(container, config, eventHandlers)` - Initialize engine with DOM container
- `loadGraph(graph, layoutId?)` - Load and display a graph dataset
- `updateConfig(config)` - Update engine configuration
- `dispose()` - Clean up resources and event listeners

#### Rendering Control
- `render()` - Force re-render of current graph
- `resize(dimensions)` - Resize rendering surface
- `setViewport(zoom, pan, animated?)` - Set viewport transformation
- `fitToViewport(padding?, animated?)` - Fit graph to viewport

#### Layout Management
- `setLayout(layoutId, config?, animated?)` - Change active layout algorithm
- `stopLayout()` - Stop any running layout calculations
- `getPositions()` - Get current vertex positions
- `setPositions(positions, animated?)` - Set specific vertex positions

#### Selection and Interaction
- `selectVertices(vertexIds, replace?)` - Select vertices
- `selectEdges(edgeIds, replace?)` - Select edges
- `clearSelection()` - Clear all selections
- `getSelection()` - Get current selection state
- `hitTest(screenPosition)` - Test what elements are at a point

#### Export and Utilities
- `export(format, options?)` - Export graph in various formats
- `getMetrics()` - Get performance metrics
- `screenToGraph(screenPos)` - Convert coordinates
- `graphToScreen(graphPos)` - Convert coordinates

### Configuration Schema

```typescript
interface IEngineConfig {
  // Layout configuration
  layout: {
    dimensions: { width: number; height: number };
    animated?: boolean;
    animationDuration?: number;
    parameters?: Record<string, unknown>;
  };
  
  // Active layout algorithm
  activeLayoutId?: string;
  layoutParameters?: Record<string, unknown>;
  
  // Visual styling
  styling?: {
    backgroundColor?: string;
    vertex?: { fillColor?: string; strokeColor?: string; radius?: number };
    edge?: { strokeColor?: string; strokeWidth?: number };
    selection?: { vertexStrokeColor?: string; edgeStrokeColor?: string };
    hover?: { vertexStrokeColor?: string; edgeStrokeColor?: string };
  };
  
  // Interaction behavior
  interaction?: {
    enablePan?: boolean;
    enableZoom?: boolean;
    enableVertexSelection?: boolean;
    enableEdgeSelection?: boolean;
    enableMultiSelection?: boolean;
    enableVertexDragging?: boolean;
    zoomLimits?: { min: number; max: number };
  };
  
  // Performance settings
  performance?: {
    maxVertices?: number;
    maxEdges?: number;
    enableLOD?: boolean;
    enableCulling?: boolean;
  };
  
  // Performance mode
  performanceMode?: 'high-quality' | 'balanced' | 'performance';
  
  // Engine-specific options
  engineOptions?: Record<string, unknown>;
}
```

## Layout Algorithms

### Force-Directed Layout (`force-directed`)

Physics-based layout with configurable forces. Best for showing natural clustering and relationships.

```typescript
await engine.setLayout('force-directed', {
  iterations: 150,          // Number of simulation steps
  repulsionStrength: 1000,  // Node repulsion force
  attractionStrength: 0.1,  // Edge attraction force
  damping: 0.9,            // Velocity damping factor
  nodeSpacing: 50,         // Minimum node spacing
  edgeLength: 100,         // Preferred edge length
  centeringForce: 0.1,     // Force towards center
  collisionRadius: 30,     // Node collision radius
});
```

### Circular Layout (`circular`)

Arranges nodes in circular patterns with optional clustering.

```typescript
await engine.setLayout('circular', {
  radius: 200,                    // Circle radius
  startAngle: 0,                  // Starting angle (radians)
  strategy: 'uniform',            // 'uniform' | 'degree-based' | 'clustered'
  concentricLayers: 1,            // Number of concentric circles
  layerSpacing: 80,              // Spacing between layers
  clusterSeparation: Math.PI / 6, // Angular separation for clusters
});
```

### Grid Layout (`grid`)

Regular grid arrangement for systematic display.

```typescript
await engine.setLayout('grid', {
  columns: 0,        // Auto-calculate if 0
  rows: 0,          // Auto-calculate if 0
  cellWidth: 100,   // Grid cell width
  cellHeight: 100,  // Grid cell height
  centerGrid: true, // Center grid in viewport
  sortBy: 'id',     // 'id' | 'degree' | 'weight' | 'custom'
});
```

### Hierarchical Layout (`hierarchical`)

Tree-based layout for hierarchical data structures.

```typescript
await engine.setLayout('hierarchical', {
  direction: 'top-down',      // 'top-down' | 'bottom-up' | 'left-right' | 'right-left'
  levelSeparation: 100,       // Vertical spacing between levels
  nodeSeparation: 50,         // Horizontal spacing between nodes
  treeAlignment: 'center',    // 'center' | 'left' | 'right'
  rootSelection: 'auto',      // 'auto' | 'degree' | 'specified'
});
```

## Event System

### Event Types

The engine provides comprehensive event handling for user interactions:

```typescript
interface IEngineEventHandlers {
  // Element interactions
  onVertexClick?: (vertex: IVertex, event: IEngineEvent) => void;
  onEdgeClick?: (edge: IEdge, event: IEngineEvent) => void;
  onVertexHover?: (vertex: IVertex | undefined, event: IEngineEvent) => void;
  onEdgeHover?: (edge: IEdge | undefined, event: IEngineEvent) => void;
  
  // State changes
  onSelectionChange?: (vertices: ReadonlySet<string>, edges: ReadonlySet<string>) => void;
  onViewportChange?: (zoom: number, pan: IPosition) => void;
  
  // Layout events
  onLayoutStart?: (layoutId: string) => void;
  onLayoutComplete?: (layoutId: string, positions: ReadonlyMap<string, IPosition>) => void;
  
  // Performance and errors
  onPerformanceUpdate?: (metrics: IEngineMetrics) => void;
  onError?: (error: Error, context?: string) => void;
}
```

### Event Data Structure

```typescript
interface IEngineEvent {
  type: string;                    // Event type
  screenPosition: IPosition;       // Mouse position in screen coordinates
  graphPosition: IPosition;        // Mouse position in graph coordinates
  timestamp: number;               // Event timestamp
  modifiers: {                     // Modifier keys
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
  };
  originalEvent?: Event;           // Original DOM event
  hitTest?: {                      // Hit test results
    vertex?: IVertex;
    edge?: IEdge;
  };
}
```

## Export Capabilities

### Supported Formats

- **PNG** - Raster image via SVG-to-Canvas conversion
- **SVG** - Native vector export with full fidelity
- **JPEG** - Compressed raster image
- **WebP** - Modern raster format (if browser supports)
- **JSON** - Graph data and positions

### Export Options

```typescript
// Export as PNG with custom options
const pngData = await engine.export('png', {
  scale: 2.0,                    // 2x resolution
  backgroundColor: '#ffffff',     // White background
  includeLabels: true,           // Include text labels
  quality: 0.9,                  // Quality (0-1, for lossy formats)
});

// Export as SVG with metadata
const svgData = await engine.export('svg', {
  includeMetadata: true,         // Include graph metadata
  includeLabels: true,           // Include text labels
});

// Export graph data as JSON
const jsonData = await engine.export('json', {
  includeMetadata: true,         // Include debug info
});
```

## Performance Optimization

### Automatic Optimization

The engine provides automatic performance optimization based on graph size:

```typescript
// Get recommendations for your data
const recommendations = getPerformanceRecommendations(1500, 3000);
console.log(recommendations);
// {
//   engine: 'custom-svg',
//   recommended: false,
//   warnings: ['Vertex count (1500) exceeds recommended maximum (1000)'],
//   optimizations: ['Enable viewport culling', 'Enable level-of-detail rendering'],
// }

// Create optimized configuration
const config = createOptimizedEngineConfig(
  1500, 3000,
  { width: 1200, height: 800 },
  { prioritizePerformance: true }
);
```

### Manual Optimization

```typescript
// Enable performance features
const config = {
  performanceMode: 'performance',
  performance: {
    enableLOD: true,              // Level-of-detail rendering
    enableCulling: true,          // Viewport culling
    maxVertices: 2000,           // Maximum vertices to render
    maxEdges: 5000,              // Maximum edges to render
  },
  engineOptions: {
    simplifyAtDistance: true,     // Simplify distant elements
    reduceLabelsAtZoom: true,     // Hide labels when zoomed out
    batchSimilarElements: true,   // Batch similar rendering calls
    useWebWorkers: true,          // Layout calculations in workers
  },
};
```

### Performance Monitoring

```typescript
// Enable performance profiling
engine.setProfilingEnabled(true);

// Get real-time metrics
const metrics = engine.getMetrics();
console.log({
  fps: metrics.fps,                    // Frames per second
  renderTime: metrics.renderTime,      // Average render time (ms)
  vertexCount: metrics.vertexCount,    // Rendered vertices
  edgeCount: metrics.edgeCount,        // Rendered edges
  culledVertices: metrics.culledVertices,  // Hidden vertices
  culledEdges: metrics.culledEdges,        // Hidden edges
});
```

## Development and Testing

### Engine Validation

```typescript
import { validateEngine } from '@/components/organisms/graph-core/graph-engines';

// Validate engine implementation
const validation = validateEngine('custom-svg');
console.log(validation);
// {
//   valid: true,
//   errors: [],
//   warnings: []
// }
```

### Performance Benchmarking

```typescript
import { benchmarkEngine } from '@/components/organisms/graph-core/graph-engines';

// Benchmark engine performance
const results = await benchmarkEngine('custom-svg', [
  { vertices: 100, edges: 200 },
  { vertices: 500, edges: 1000 },
  { vertices: 1000, edges: 2000 },
], 5000); // 5 second benchmark

console.log('Benchmark results:', results);
```

### Debug Information

```typescript
// Get comprehensive debug information
const debugInfo = engine.getDebugInfo();
console.log(debugInfo);
// {
//   engineId: 'custom-svg',
//   engineVersion: '1.0.0',
//   initialized: true,
//   graphLoaded: true,
//   vertexCount: 150,
//   edgeCount: 300,
//   dimensions: { width: 800, height: 600 },
//   viewport: { zoom: 1.2, pan: { x: 50, y: 30 } },
//   activeLayout: 'force-directed',
//   ...
// }
```

## Migration from Existing Components

The CustomSVG engine is designed as a drop-in wrapper for existing SVG graph components with zero modifications required:

### Before (Direct Component Usage)
```typescript
import { GraphSVG } from '@/components/organisms/graph-svg/GraphSVG';

// Manual component management
<GraphSVG
  vertices={vertices}
  edges={edges}
  width={800}
  height={600}
  onVertexClick={handleVertexClick}
  // ... many other props
/>
```

### After (Engine-Based Usage)
```typescript
import { createCustomSVGEngine } from '@/components/organisms/graph-core/graph-engines';

// Automated lifecycle management
const engine = createCustomSVGEngine();
await engine.initialize(container, config, { onVertexClick: handleVertexClick });
await engine.loadGraph({ vertices, edges });
```

### Benefits of Migration

1. **Standardized Interface** - Consistent API across different rendering strategies
2. **Lifecycle Management** - Automatic initialization, cleanup, and error handling
3. **Performance Optimization** - Built-in performance monitoring and optimization
4. **Export Capabilities** - Multiple export formats with configurable options
5. **Event System** - Comprehensive event handling with coordinate transformations
6. **Future-Proof** - Easy to swap rendering engines without code changes

## Troubleshooting

### Common Issues

**Engine initialization fails**
- Check that container element exists and is attached to DOM
- Ensure container has valid dimensions (width/height > 0)
- Verify configuration object is valid

**Poor performance with large graphs**
- Enable viewport culling and level-of-detail rendering
- Use performance mode instead of high-quality mode
- Consider data pagination or filtering
- Check browser developer tools for memory usage

**Layout doesn't appear correctly**
- Ensure graph data has valid vertex and edge IDs
- Check that edge sourceId/targetId reference existing vertices
- Verify layout algorithm supports your graph structure
- Try fitting to viewport after layout completion

**Export functionality not working**
- Check that export format is supported by engine
- Ensure browser supports required APIs (Canvas, SVG, etc.)
- Verify sufficient memory for large exports
- Check browser console for detailed error messages

### Best Practices

1. **Initialize once** - Don't create multiple engines for the same container
2. **Dispose properly** - Always call `dispose()` when removing the graph
3. **Monitor performance** - Enable profiling during development
4. **Use appropriate layouts** - Match layout algorithm to data characteristics
5. **Handle errors** - Implement error event handlers for production use
6. **Test thoroughly** - Validate with various graph sizes and configurations

## API Reference

For complete API documentation, see the TypeScript interface definitions in `types.ts`. All methods are fully typed with comprehensive JSDoc documentation.

## Contributing

To add support for new rendering engines:

1. Implement the `IGraphEngine` interface
2. Create capability declaration following the pattern in `capabilities.ts`
3. Add adapter layer if integrating with existing components
4. Register engine in the main index file
5. Add comprehensive tests and documentation
6. Follow performance optimization patterns from CustomSVG engine

The plugin architecture is designed to be extensible while maintaining consistency across all engine implementations.