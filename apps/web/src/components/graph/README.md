# Graph Styling and Rendering Utilities

This directory contains styling and rendering utilities for graph visualization in BibGraph.

## User Story 2: Visual Distinction

Implements visual styling to distinguish:
- **Xpac works** (datasets, software, specimens): Dashed borders + muted colors
- **Works with unverified authors**: Warning indicators (orange borders)
- **Edge directions**: Outbound (solid lines) vs Inbound (dashed lines) with multi-modal visual distinction

## Files

- `node-styles.ts`: Core styling functions that determine node appearance
- `node-renderer.ts`: Node rendering utilities for various visualization libraries
- `edge-styles.ts`: Core styling functions for edge direction and relationship type
- `edge-renderer.ts`: Edge rendering utilities for various visualization libraries
- `index.ts`: Public API exports
- `animated-layout-context.ts`: Animation context (if exists)

## Usage

### Basic Styling

```typescript
import { getConditionalNodeStyle } from '@/components/graph';
// Note: GraphNode type is now defined locally in @/services/relationship-detection-service

const node = {
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

---

## Edge Styling

### Basic Edge Styling

```typescript
import { getEdgeStyle } from '@/components/graph';
// Note: GraphEdge and RelationType are now defined locally in @/services/relationship-detection-service

const edge = {
  id: 'W123-A456',
  source: 'W123',  // Work ID
  target: 'A456',  // Author ID
  type: RelationType.AUTHORSHIP,
  direction: 'outbound', // Work owns the authorship data
};

const style = getEdgeStyle(edge);
// Returns: {
//   stroke: '#4A90E2',           // Blue (AUTHORSHIP color)
//   strokeDasharray: undefined,  // Solid line (outbound)
//   strokeWidth: 2,
//   markerEnd: 'arrow-solid',
//   data-direction: 'outbound',
//   data-relation-type: 'AUTHORSHIP'
// }
```

### Integration with react-force-graph-2d

```typescript
import ForceGraph2D from 'react-force-graph-2d';
import {
  createEdgeCanvasObjectFunction,
  getEdgeColor,
  getEdgeWidth,
} from '@/components/graph';

function GraphVisualization({ nodes, edges }: GraphData) {
  return (
    <ForceGraph2D
      graphData={{ nodes, links: edges }}
      linkCanvasObject={createEdgeCanvasObjectFunction()}
      linkColor={(link) => getEdgeColor(link as GraphEdge)}
      linkWidth={(link) => getEdgeWidth(link as GraphEdge)}
    />
  );
}
```

### Integration with SVG-based renderers

```typescript
import { getSvgEdgeAttributes } from '@/components/graph';

function SvgEdge({ edge }: { edge: GraphEdge }) {
  const attrs = getSvgEdgeAttributes(edge);

  return (
    <line
      x1={edge.source.x}
      y1={edge.source.y}
      x2={edge.target.x}
      y2={edge.target.y}
      {...attrs}
    />
  );
}
```

### Integration with DOM-based renderers (e.g., XYFlow)

```typescript
import { getDomEdgeStyle } from '@/components/graph';

function CustomEdge({ data }: { data: GraphEdge }) {
  const style = getDomEdgeStyle(data);

  return (
    <div
      style={{
        ...style,
        position: 'absolute',
        // ... positioning logic
      }}
    />
  );
}
```

## Edge Styling Behavior

### Outbound Edge (Solid Line)
- Relationship stored directly on source entity
- Solid line (no dash pattern)
- Type-specific color (e.g., blue for AUTHORSHIP)
- Solid arrow marker
- `data-direction="outbound"`

Example: Work → Author (Work contains `authorships[]` array)

### Inbound Edge (Dashed Line)
- Relationship discovered via reverse lookup
- Dashed line (8px dash, 4px gap)
- Same type-specific color
- Dashed arrow marker
- `data-direction="inbound"`

Example: Work ← Work (cited by another work, discovered via reverse lookup)

### Multi-Modal Visual Distinction

Each edge provides **three independent visual channels** for WCAG 2.1 AA accessibility:

1. **Line Style**: Solid vs Dashed (perceivable without color)
2. **Color**: Type-specific colors with ≥3:1 contrast ratio
3. **Arrow Marker**: Different marker styles (arrow-solid vs arrow-dashed)

### Relationship Type Colors

All 15 relationship types have distinct colors:

```typescript
import { TYPE_COLORS } from '@/components/graph';

const colors = TYPE_COLORS;
// {
//   AUTHORSHIP: '#4A90E2',         // Blue
//   REFERENCE: '#7B68EE',          // Medium Slate Blue
//   PUBLICATION: '#50C878',        // Emerald
//   TOPIC: '#FF6B6B',              // Light Coral
//   AFFILIATION: '#FFA500',        // Orange
//   HOST_ORGANIZATION: '#9370DB',  // Medium Purple
//   LINEAGE: '#20B2AA',            // Light Sea Green
//   FUNDED_BY: '#FF8C00',          // Dark Orange
//   // ... 7 more colors
//   RELATED_TO: '#708090',         // Slate Gray (fallback)
// }
```

## Edge Accessibility

All styled edges include `data-` attributes for testing and accessibility:

```typescript
import { getEdgeStyle } from '@/components/graph';

const style = getEdgeStyle(edge);
// Includes:
// - data-direction: 'outbound' | 'inbound'
// - data-relation-type: RelationType (e.g., 'AUTHORSHIP')
```

## Testing

Use data attributes for E2E testing:

```typescript
// Playwright example
await page.locator('[data-direction="outbound"]').count(); // Find all outbound edges
await page.locator('[data-relation-type="AUTHORSHIP"]').count(); // Find authorship edges
await page.locator('[data-direction="inbound"][data-relation-type="REFERENCE"]').count(); // Inbound citations
```
