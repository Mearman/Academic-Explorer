# Quickstart Guide: 3D Graph Visualization

**Purpose**: Get started with 3D graph visualization in BibGraph's algorithms page
**Date**: 2025-11-30-150221

## Overview

The 3D graph visualization feature extends BibGraph's existing algorithms page with interactive 3D exploration capabilities. Users can switch between 2D and 3D modes, with all existing functionality preserved.

## Prerequisites

- **Browser Support**: WebGL2-compatible browser (94.7% global support)
- **Hardware**: Modern GPU with WebGL2 support
- **Memory**: Additional ~50MB for 3D rendering components

## Quick Setup

### 1. Basic Usage

1. Navigate to `/algorithms` page
2. Generate sample graph data or load existing graph
3. Click the "3D" toggle button in the visualization header
4. If WebGL is available, the graph will render in 3D space

### 2. Camera Controls

**Mouse Controls:**
- **Left Click + Drag**: Rotate camera around graph center
- **Scroll Wheel**: Zoom in/out
- **Right Click + Drag**: Pan camera (horizontal/vertical)
- **Double Click**: Focus on clicked node

**Touch Controls (Mobile/Tablet):**
- **One Finger Drag**: Rotate camera
- **Pinch**: Zoom in/out
- **Two Finger Drag**: Pan camera

### 3. Mode Switching

The visualization supports three interaction modes:

- **Explore Mode**: Full camera controls for free exploration
- **Analyze Mode**: Rotation locked, focus on zoom/pan for detailed analysis
- **Present Mode**: Smooth, limited controls for presentations

Switch modes using the dropdown in the visualization controls panel.

## Key Features

### Depth Visualization

- **Size Scaling**: Nodes appear smaller when further from camera
- **Opacity Effects**: Distant nodes become more transparent
- **Occlusion**: Closer nodes properly hide distant nodes
- **Shadow Effects**: Enhanced depth perception through subtle shadows

### Performance Optimization

- **Automatic LOD**: System adjusts detail based on distance
- **Frustum Culling**: Only visible objects are rendered
- **Instanced Rendering**: Efficient rendering for large node counts
- **Memory Management**: Optimized for serial test execution

### State Persistence

- **Camera Position**: Your last camera view is saved automatically
- **View Mode**: 2D/3D preference persists across sessions
- **Control Settings**: Custom sensitivity and mode preferences saved

## Troubleshooting

### WebGL Not Available

**Issue**: "3D" toggle is disabled with informative tooltip
**Causes**:
- Browser doesn't support WebGL2
- WebGL is disabled in browser settings
- Hardware acceleration is disabled

**Solutions**:
1. Update to latest browser version
2. Enable hardware acceleration in browser settings
3. Try a different browser (Chrome, Firefox, Edge recommended)
4. Use 2D mode (fallback always available)

### Performance Issues

**Issue**: Low frame rate or stuttering
**Solutions**:
1. Reduce graph size using node/edge sliders
2. Switch to "Performance" mode in user preferences
3. Close other browser tabs
4. Disable shadows and advanced effects

### Mobile Issues

**Issue**: Difficult to control on mobile device
**Solutions**:
1. Use two-finger drag for panning
2. Pinch gestures work better than scroll for zooming
3. Try "Analyze Mode" for more stable controls

## Advanced Usage

### Custom Camera Presets

Save frequently used camera positions:
1. Navigate to desired view
2. Right-click → "Save Camera Position"
3. Name the preset for future use

### Community Detection in 3D

Run community detection algorithms and visualize results:
1. Select "Clustering" tab in algorithms panel
2. Choose algorithm and run
3. Communities appear as colored 3D clusters
4. Rotate view to see community separation in 3D space

### Path Finding in 3D

Use shortest path algorithms with 3D visualization:
1. Click source node (highlighted in blue)
2. Click target node (highlighted in red)
3. Run "Shortest Path" algorithm
4. Path appears as animated 3D curve

## Integration with Existing Features

### Algorithm Compatibility

All existing graph algorithms work seamlessly in 3D mode:
- **Community Detection**: Louvain, Spectral, Hierarchical clustering
- **Path Finding**: Dijkstra, A*, BFS shortest paths
- **Centrality Analysis**: Betweenness, closeness, eigenvector
- **Graph Properties**: Connected components, cycles, articulation points

### Data Export

3D views support all existing export options:
- **PNG Screenshots**: High-resolution 3D captures
- **JSON Data**: Includes 3D coordinates and camera state
- **Graph Formats**: GEXF, GraphML with 3D positioning

## Keyboard Shortcuts

- **Space**: Reset camera to default position
- **R**: Toggle rotation lock
- **Z**: Toggle zoom lock
- **P**: Toggle pan lock
- **1-3**: Quick switch between control modes
- **Esc**: Clear all selections

## Performance Tips

### For Large Graphs (500+ nodes)

1. Start with 2D view to load data
2. Switch to 3D after initial loading
3. Use "Performance" rendering mode
4. Enable LOD culling in settings
5. Reduce detail level for distant nodes

### For Presentations

1. Use "Present Mode" for smooth, stable camera
2. Pre-save camera positions for key views
3. Disable animations for consistent performance
4. Use high-contrast color scheme for visibility

## Development Notes

### Adding Custom 3D Components

Extend the 3D visualization system:
```typescript
import { Graph3DAdapter } from '@bibgraph/utils/3d'
import { CameraControlsAPI } from '@bibgraph/ui/graph-3d'

const adapter = new Graph3DAdapter()
const controls = new CameraControlsAPI()

// Custom 3D node rendering
const customNode = adapter.to3DNode(existingNode)
customNode.color = '#ff0000'
customNode.radius = 2.0
```

### Performance Monitoring

Monitor 3D rendering performance:
```typescript
import { GraphRendererAPI } from '@bibgraph/ui/graph-3d'

const metrics = renderer.getPerformanceMetrics()
console.log(`FPS: ${metrics.frameRate}`)
console.log(`Visible nodes: ${metrics.visibleNodes}`)
```

## Support and Feedback

- **Documentation**: See full API documentation in `/contracts/` directory
- **Issues**: Report performance problems or browser compatibility issues
- **Feature Requests**: Submit enhancement ideas through BibGraph issue tracker

**Note**: This feature maintains 100% backward compatibility. All existing 2D functionality continues to work unchanged.