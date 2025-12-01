# 3D Graph Visualization

The `ForceGraph3DVisualization` component provides an interactive 3D force-directed graph visualization using Three.js and react-force-graph-3d.

## Features

- **Force-directed layout** - Nodes automatically arrange based on connections
- **Entity-based styling** - Nodes colored by OpenAlex entity type
- **Community visualization** - Optional community-based coloring
- **Path highlighting** - Visualize paths between nodes
- **Keyboard navigation** - Full accessibility support

### Performance Features (v2.0)

- **Camera persistence** - Camera position saved across sessions
- **Level of Detail (LOD)** - Adaptive quality based on distance and performance
- **Performance monitoring** - Real-time FPS and frame time tracking
- **Frustum culling** - Optimized rendering for large graphs

## Usage

### Basic Usage

```tsx
import { ForceGraph3DVisualization } from '@/components/graph/3d/ForceGraph3DVisualization';

function MyGraphView() {
  return (
    <ForceGraph3DVisualization
      nodes={graphNodes}
      edges={graphEdges}
      height={600}
      onNodeClick={(node) => console.log('Clicked:', node)}
    />
  );
}
```

### With Performance Features

```tsx
<ForceGraph3DVisualization
  nodes={graphNodes}
  edges={graphEdges}
  height={600}
  // Enable camera position persistence
  enableCameraPersistence
  cameraStorageKey="my-graph-camera"
  // Show real-time performance stats
  showPerformanceOverlay
  // Enable adaptive LOD for large graphs
  enableAdaptiveLOD
  // Get notified when FPS drops below threshold
  onPerformanceDrop={(fps) => console.warn('Low FPS:', fps)}
/>
```

## Props

### Core Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `nodes` | `GraphNode[]` | required | Array of graph nodes |
| `edges` | `GraphEdge[]` | required | Array of graph edges |
| `visible` | `boolean` | `true` | Control visibility |
| `width` | `number` | container | Visualization width |
| `height` | `number` | `500` | Visualization height |

### Highlighting Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `displayMode` | `'highlight' \| 'filter'` | `'highlight'` | How to handle non-selected nodes |
| `highlightedNodeIds` | `Set<string>` | empty | Nodes to highlight |
| `highlightedPath` | `string[]` | `[]` | Path to highlight |

### Community Props

| Prop | Type | Description |
|------|------|-------------|
| `communityAssignments` | `Map<string, number>` | Node to community mapping |
| `communityColors` | `Map<number, string>` | Community color scheme |

### Performance Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enableCameraPersistence` | `boolean` | `false` | Save camera position to localStorage |
| `cameraStorageKey` | `string` | `'graph3d-camera'` | Storage key for camera state |
| `showPerformanceOverlay` | `boolean` | `false` | Show FPS/performance stats |
| `enableAdaptiveLOD` | `boolean` | `false` | Enable Level of Detail system |
| `onPerformanceDrop` | `(fps: number) => void` | - | Called when FPS drops below 30 |

### Event Handlers

| Prop | Type | Description |
|------|------|-------------|
| `onNodeClick` | `(node: GraphNode) => void` | Node click handler |
| `onNodeHover` | `(node: GraphNode \| null) => void` | Node hover handler |
| `onBackgroundClick` | `() => void` | Background click handler |

## Keyboard Controls

| Key | Action |
|-----|--------|
| Arrow Up | Zoom in (or pan up with Shift) |
| Arrow Down | Zoom out (or pan down with Shift) |
| Arrow Left | Pan left |
| Arrow Right | Pan right |
| Home | Fit graph to view |
| +/= | Zoom in |
| -/_ | Zoom out |
| R | Reset view |

## Level of Detail (LOD) System

When `enableAdaptiveLOD` is enabled, the visualization automatically adjusts rendering quality:

### LOD Levels

| Level | Geometry Segments | Labels | Materials | Use Case |
|-------|-------------------|--------|-----------|----------|
| HIGH | 32 | Yes | Phong (lit) | Close objects, small graphs |
| MEDIUM | 16 | Yes (abbreviated) | Basic | Medium distance |
| LOW | 8 | No | Basic | Far objects, large graphs |

### Adaptive Behavior

The LOD system considers:
1. **Distance from camera** - Far objects use lower detail
2. **Frame rate** - If FPS drops below 30, global LOD decreases
3. **Node count** - More nodes = lower default LOD

## Performance Overlay

When `showPerformanceOverlay` is enabled, a stats panel appears showing:

- **FPS** - Current frames per second
- **Frame time** - Average time per frame in milliseconds
- **Nodes/Edges** - Visible object counts
- **Jank score** - Stuttering indicator (0-100%)
- **Memory** - JS heap usage (Chrome only)
- **LOD level** - Current global LOD (if adaptive LOD enabled)

### Performance Levels

| Level | FPS Range | Indicator |
|-------|-----------|-----------|
| GOOD | 55+ | Green |
| OK | 30-55 | Yellow |
| POOR | <30 | Red |

## Camera Persistence

When `enableCameraPersistence` is enabled:

- Camera position is saved to localStorage on every frame (debounced)
- On reload, the saved position is restored
- Use `cameraStorageKey` to have different saved positions for different graphs

## Spatial Utilities

The visualization uses these spatial utilities from `@bibgraph/utils`:

### Octree

Spatial indexing for efficient queries:

```typescript
import { Octree, createOctreeFromItems } from '@bibgraph/utils';

// Create from items
const octree = createOctreeFromItems(nodes.map(n => ({
  position: { x: n.x, y: n.y, z: n.z },
  data: n,
})));

// Query by range
const nearby = octree.queryRange(boundingBox);

// Find nearest
const nearest = octree.findNearest(point);

// Find k nearest
const kNearest = octree.findKNearest(point, 5);
```

### GraphLODManager

Level of Detail management:

```typescript
import { GraphLODManager, LODLevel } from '@bibgraph/utils';

const lodManager = new GraphLODManager({
  adaptiveMode: true,
  targetFps: 60,
  minFps: 30,
});

// Get LOD for a node
const lod = lodManager.getEffectiveLOD(nodePosition, cameraPosition);

// Get render settings
const settings = lodManager.getNodeRenderSettings(lod);
// { segments: 16, showLabel: true, materialType: 'phong', useRing: true }
```

## Best Practices

### Large Graphs (500+ nodes)

1. Enable `enableAdaptiveLOD` to automatically reduce quality
2. Use `displayMode="filter"` to hide non-relevant nodes
3. Consider enabling `showPerformanceOverlay` during development

### Small Graphs (<100 nodes)

- Keep default settings for best visual quality
- LOD features provide minimal benefit

### Mobile/Low-Power Devices

1. Start with `enableAdaptiveLOD={true}`
2. Consider setting lower `height` values
3. Monitor `onPerformanceDrop` for user feedback

## Related Files

- `useCameraPersistence.ts` - Camera state management hook
- `useGraph3DPerformance.ts` - Performance monitoring hook
- `packages/utils/src/spatial/octree.ts` - Octree implementation
- `packages/utils/src/spatial/graph-lod-manager.ts` - LOD system
