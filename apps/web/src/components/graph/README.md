# Graph Styling and Rendering Utilities

This directory contains styling and rendering utilities for graph visualization in Academic Explorer.

## User Story 2: Visual Distinction for Xpac Works

Implements visual styling to distinguish:
- **Xpac works** (datasets, software, specimens): Dashed borders + muted colors
- **Works with unverified authors**: Warning indicators (orange borders)

## Files

- `node-styles.ts`: Core styling functions that determine node appearance
- `node-renderer.ts`: Rendering utilities for various visualization libraries
- `index.ts`: Public API exports
- `animated-layout-context.ts`: Animation context (if exists)

## Usage

### Basic Styling

```typescript
import { getConditionalNodeStyle } from '@/components/graph';
import type { GraphNode } from '@academic-explorer/graph';

const node: GraphNode = {
  id: 'W123',
  entityType: 'works',
  label: 'Example Work',
  entityId: 'W123',
  x: 0,
  y: 0,
  externalIds: [],
  isXpac: true, // This is an xpac work
  hasUnverifiedAuthor: false,
};

const style = getConditionalNodeStyle(node);
// Returns: { stroke: '#64748b', strokeDasharray: '5,3', fill: '#94a3b8', ... }
```

### Integration with react-force-graph-2d

```typescript
import ForceGraph2D from 'react-force-graph-2d';
import {
  createNodeCanvasObjectFunction,
  createNodePointerAreaPaintFunction,
} from '@/components/graph';

function GraphVisualization({ nodes, edges }: GraphData) {
  return (
    <ForceGraph2D
      graphData={{ nodes, links: edges }}
      nodeCanvasObject={createNodeCanvasObjectFunction()}
      nodePointerAreaPaint={createNodePointerAreaPaintFunction()}
    />
  );
}
```

### Integration with react-force-graph-3d

```typescript
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { createNodeThreeObject } from '@/components/graph';

function Graph3D({ nodes, edges }: GraphData) {
  return (
    <ForceGraph3D
      graphData={{ nodes, links: edges }}
      nodeThreeObject={(node) => createNodeThreeObject(node as GraphNode, THREE)}
    />
  );
}
```

### Integration with SVG-based renderers

```typescript
import { getSvgNodeAttributes } from '@/components/graph';

function SvgNode({ node }: { node: GraphNode }) {
  const attrs = getSvgNodeAttributes(node);

  return (
    <circle
      cx={node.x}
      cy={node.y}
      r={5}
      {...attrs}
    />
  );
}
```

### Integration with DOM-based renderers (e.g., XYFlow)

```typescript
import { getDomNodeStyle } from '@/components/graph';

function CustomNode({ data }: { data: GraphNode }) {
  const style = getDomNodeStyle(data);

  return (
    <div
      style={{
        ...style,
        width: '40px',
        height: '40px',
        borderRadius: '50%',
      }}
    >
      {data.label}
    </div>
  );
}
```

## Styling Behavior

### Standard Work
- Solid blue border (#2563eb)
- Blue fill (#3b82f6)
- Full opacity

### Xpac Work
- Dashed border (5px dash, 3px gap)
- Muted slate color (#64748b stroke, #94a3b8 fill)
- 70% opacity
- `data-xpac="true"` attribute

### Unverified Author
- Solid orange border (#f59e0b)
- Standard blue fill (preserved)
- Thicker border (2.5px vs 2px)
- `data-unverified-author="true"` attribute

### Xpac + Unverified Author
- Dashed orange border
- Muted fill
- Both data attributes

## Accessibility

All styled nodes include `aria-label` attributes with descriptive text:

```typescript
import { getNodeAccessibilityLabel } from '@/components/graph';

const label = getNodeAccessibilityLabel(node);
// "Example Work (extended research output, unverified author)"
```

## Testing

Use data attributes for E2E testing:

```typescript
// Playwright example
await page.locator('[data-xpac="true"]').count(); // Find all xpac nodes
await page.locator('[data-unverified-author="true"]').count(); // Find unverified
```

## Performance Considerations

- Styling functions are pure and fast (< 1ms per 1000 nodes)
- Canvas rendering optimized for large graphs (> 10,000 nodes)
- Conditional label rendering at higher zoom levels only
- WCAG AA contrast compliance maintained

## Color Palette

Access the color palette for legends or documentation:

```typescript
import { NODE_STYLE_COLORS } from '@/components/graph';

const colors = NODE_STYLE_COLORS;
// {
//   standard: { fill: '#3b82f6', stroke: '#2563eb' },
//   xpac: { fill: '#94a3b8', stroke: '#64748b' },
//   warning: { fill: '#fbbf24', stroke: '#f59e0b', tint: '#fef3c7' },
// }
```
