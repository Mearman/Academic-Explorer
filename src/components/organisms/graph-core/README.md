# Graph Core Renderer System

A comprehensive, extensible, and pluggable renderer system for graph visualisation that supports both SVG and Canvas rendering contexts with zero coupling to specific data formats.

## Architecture Overview

The renderer system follows the **Strategy Pattern** with three main components:

1. **Vertex Renderer** - Handles node rendering with pluggable colour, size, shape, label, and tooltip strategies
2. **Edge Renderer** - Handles connection rendering with pluggable colour, width, style, label, and arrow strategies  
3. **Renderer Registry** - Manages multiple renderer implementations with automatic fallback and composition utilities

## Key Features

- ✅ **Zero coupling** to OpenAlex or any specific data formats
- ✅ **Pluggable strategy pattern** for all rendering aspects
- ✅ **SVG and Canvas support** with unified API
- ✅ **Intelligent caching** with TTL and automatic cleanup
- ✅ **Composition utilities** for combining multiple strategies
- ✅ **Registry system** for managing multiple renderer implementations
- ✅ **Automatic fallback** for unknown data types
- ✅ **TypeScript-first** with comprehensive generics support
- ✅ **Performance optimised** with batch rendering and caching
- ✅ **Extensible** - easily add new strategies and renderers

## Quick Start

### Basic Usage

```typescript
import { createVertexRenderer, createEdgeRenderer } from '@/components/organisms/graph-core';

// Create basic renderers with default strategies
const vertexRenderer = createVertexRenderer();
const edgeRenderer = createEdgeRenderer();

// Create mock rendering context (SVG)
const svgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
const svgContext = {
  type: 'svg' as const,
  container: svgContainer,
  createElement: <K extends keyof SVGElementTagNameMap>(tagName: K) => 
    document.createElementNS('http://www.w3.org/2000/svg', tagName),
  setAttribute: (element: Element, name: string, value: string | number) => 
    element.setAttribute(name, String(value)),
};

// Render vertices and edges
const vertices = [
  { id: 'v1', x: 100, y: 100, metadata: { type: 'author' } },
  { id: 'v2', x: 200, y: 150, metadata: { type: 'work' } },
];

const edges = [
  { id: 'e1', source: 'v1', target: 'v2', metadata: { type: 'citation' } },
];

vertices.forEach(vertex => vertexRenderer.render(vertex, svgContext));

const vertexLookup = (id: string) => vertices.find(v => v.id === id);
edges.forEach(edge => edgeRenderer.render(edge, svgContext, vertexLookup));
```

### Custom Strategies

```typescript
import type { ColourStrategy, EdgeColourStrategy } from '@/components/organisms/graph-core';

// Custom vertex colour strategy
const academicColourStrategy: ColourStrategy<{ type: string }> = {
  name: 'academic-colours',
  getColour: (vertex) => {
    switch (vertex.metadata.type) {
      case 'author': return '#e74c3c';
      case 'work': return '#3498db';
      case 'institution': return '#2ecc71';
      default: return '#95a5a6';
    }
  },
};

// Custom edge colour strategy
const relationshipColourStrategy: EdgeColourStrategy<{ type: string }> = {
  name: 'relationship-colours',
  getColour: (edge) => {
    switch (edge.metadata.type) {
      case 'citation': return '#e67e22';
      case 'collaboration': return '#9b59b6';
      case 'affiliation': return '#1abc9c';
      default: return '#bdc3c7';
    }
  },
};

// Create renderer with custom strategies
const customVertexRenderer = createVertexRenderer({
  strategy: {
    ...DefaultVertexStrategy,
    colour: academicColourStrategy,
  },
});

const customEdgeRenderer = createEdgeRenderer({
  strategy: {
    ...DefaultEdgeStrategy,
    colour: relationshipColourStrategy,
  },
});
```

### Registry System

```typescript
import { 
  getRendererRegistry, 
  createCompositeVertexRenderer,
  createCompositeEdgeRenderer 
} from '@/components/organisms/graph-core';

const registry = getRendererRegistry();

// Register custom strategies
registry.registerVertexStrategy({
  info: {
    name: 'academic-theme',
    description: 'Academic research theme with publication colours',
    version: '1.0.0',
    tags: ['academic', 'research', 'publication'],
    dataTypes: ['author', 'work', 'institution'],
  },
  colour: academicColourStrategy,
});

// Create renderers using strategy composition
const compositeVertexRenderer = createCompositeVertexRenderer(['academic-theme']);
const compositeEdgeRenderer = createCompositeEdgeRenderer(['academic-theme']);

// Auto-select best renderer for data types
const bestVertexRenderer = registry.selectBestVertexRenderer(['author', 'work']);
const bestEdgeRenderer = registry.selectBestEdgeRenderer(['citation', 'collaboration']);
```

## API Reference

### Core Interfaces

#### VertexData<TMetadata>
```typescript
interface VertexData<TMetadata = Record<string, unknown>> {
  id: string;
  x: number;
  y: number;
  metadata: TMetadata;
  // Optional computed properties for caching
  _computedSize?: number;
  _computedColour?: string;
  _computedLabel?: string;
}
```

#### EdgeData<TMetadata>
```typescript
interface EdgeData<TMetadata = Record<string, unknown>> {
  id: string;
  source: string; // Source vertex ID
  target: string; // Target vertex ID
  metadata: TMetadata;
  // Optional computed properties for caching
  _computedColour?: string;
  _computedWidth?: number;
  _computedLabel?: string;
}
```

### Strategy Interfaces

#### Vertex Strategies
- `ColourStrategy<TMetadata>` - Determines vertex colours
- `SizeStrategy<TMetadata>` - Determines vertex sizes and stroke widths
- `ShapeStrategy<TMetadata>` - Renders vertex shapes (circle, square, etc.)
- `LabelStrategy<TMetadata>` - Renders vertex labels
- `TooltipStrategy<TMetadata>` - Provides tooltip content

#### Edge Strategies
- `EdgeColourStrategy<TMetadata>` - Determines edge colours
- `EdgeWidthStrategy<TMetadata>` - Determines edge widths
- `EdgeStyleStrategy<TMetadata>` - Renders edge styles (line, curve, etc.)
- `EdgeLabelStrategy<TMetadata>` - Renders edge labels
- `EdgeArrowStrategy<TMetadata>` - Renders directional arrows
- `EdgeTooltipStrategy<TMetadata>` - Provides edge tooltip content

### Rendering Contexts

#### SVG Context
```typescript
type SVGRenderingContext = {
  type: 'svg';
  container: SVGGElement;
  createElement: <K extends keyof SVGElementTagNameMap>(tagName: K) => SVGElementTagNameMap[K];
  setAttribute: (element: Element, name: string, value: string | number) => void;
};
```

#### Canvas Context
```typescript
type CanvasRenderingContext = {
  type: 'canvas';
  context: CanvasRenderingContext2D;
  devicePixelRatio: number;
};
```

## Extensibility Examples

### Custom Shape Strategy

```typescript
import type { ShapeStrategy } from '@/components/organisms/graph-core';

const squareShapeStrategy: ShapeStrategy<{ type: string }> = {
  name: 'square-shapes',
  renderShape: (vertex, context, size, colour) => {
    if (context.type === 'svg') {
      const rect = context.createElement('rect');
      context.setAttribute(rect, 'x', vertex.x - size);
      context.setAttribute(rect, 'y', vertex.y - size);
      context.setAttribute(rect, 'width', size * 2);
      context.setAttribute(rect, 'height', size * 2);
      context.setAttribute(rect, 'fill', colour);
      context.setAttribute(rect, 'stroke', '#ffffff');
      context.setAttribute(rect, 'stroke-width', '1');
      context.container.appendChild(rect);
    } else if (context.type === 'canvas') {
      const ctx = context.context;
      ctx.save();
      ctx.fillStyle = colour;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.fillRect(vertex.x - size, vertex.y - size, size * 2, size * 2);
      ctx.strokeRect(vertex.x - size, vertex.y - size, size * 2, size * 2);
      ctx.restore();
    }
  },
};
```

### Custom Edge Style Strategy

```typescript
import type { EdgeStyleStrategy } from '@/components/organisms/graph-core';

const dashedEdgeStrategy: EdgeStyleStrategy<{ type: string }> = {
  name: 'dashed-edges',
  renderEdge: (edge, path, context, colour, width) => {
    if (context.type === 'svg') {
      const line = context.createElement('line');
      context.setAttribute(line, 'x1', path.sourceX);
      context.setAttribute(line, 'y1', path.sourceY);
      context.setAttribute(line, 'x2', path.targetX);
      context.setAttribute(line, 'y2', path.targetY);
      context.setAttribute(line, 'stroke', colour);
      context.setAttribute(line, 'stroke-width', width);
      context.setAttribute(line, 'stroke-dasharray', '5,5');
      context.container.appendChild(line);
    } else if (context.type === 'canvas') {
      const ctx = context.context;
      ctx.save();
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(path.sourceX, path.sourceY);
      ctx.lineTo(path.targetX, path.targetY);
      ctx.stroke();
      ctx.restore();
    }
  },
};
```

## Performance Considerations

- **Caching**: All computed values are cached with 5-minute TTL
- **Batch Rendering**: Use `renderBatch()` for multiple items
- **Memory Management**: Automatic cache cleanup when limits are exceeded
- **Error Handling**: Automatic fallback to default rendering on errors
- **Canvas Optimisation**: Uses device pixel ratio for high-DPI displays

## Integration with Existing Graph Components

This renderer system is designed to integrate with existing graph visualisation components:

```typescript
// Example integration with D3.js force simulation
import * as d3 from 'd3';
import { createVertexRenderer, createEdgeRenderer } from '@/components/organisms/graph-core';

const simulation = d3.forceSimulation(vertices)
  .force('link', d3.forceLink(edges).id((d: any) => d.id))
  .force('charge', d3.forceManyBody().strength(-300))
  .force('center', d3.forceCenter(width / 2, height / 2));

simulation.on('tick', () => {
  // Use our renderers instead of D3's built-in rendering
  vertices.forEach(vertex => vertexRenderer.render(vertex, context));
  edges.forEach(edge => edgeRenderer.render(edge, context, vertexLookup));
});
```

## Testing

The renderer system includes comprehensive test coverage:

- Unit tests for all strategy implementations
- Integration tests for renderer composition
- Canvas and SVG rendering verification
- Performance benchmarks for batch operations
- Memory leak detection for caching systems

```bash
# Run renderer-specific tests
pnpm test src/components/organisms/graph-core
```

## Contributing

To add new strategies or renderers:

1. Implement the appropriate strategy interface
2. Add comprehensive TypeScript types
3. Include both SVG and Canvas rendering support
4. Add unit tests with mock contexts
5. Register with the global registry if desired
6. Update this documentation with usage examples

## License

This renderer system is part of the Academic Explorer project and follows the same license terms.