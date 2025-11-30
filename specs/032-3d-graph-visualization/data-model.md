# Data Model: 3D Graph Visualization

**Date**: 2025-11-30-150221
**Feature**: 3D Graph Visualization
**Based on**: Existing BibGraph graph-types.ts with 3D extensions

## Core Type Extensions

### Position3D Interface

```typescript
// Extension of existing Position interface for 3D coordinates
export interface Position3D {
  x: number
  y: number
  z: number
}

// Utility functions for 3D position calculations
export interface Position3DUtils {
  distance(a: Position3D, b: Position3D): number
  normalize(position: Position3D): Position3D
  lerp(a: Position3D, b: Position3D, t: number): Position3D
  fromArray(array: [number, number, number]): Position3D
  toArray(position: Position3D): [number, number, number]
}
```

### GraphNode3D Interface

```typescript
// Extension of existing GraphNode with 3D capabilities
export interface GraphNode3D extends Omit<GraphNode, 'x' | 'y'> {
  position: Position3D
  // 3D-specific properties for physics simulation
  velocity?: Position3D      // Current velocity in 3D space
  force?: Position3D         // Accumulated forces for simulation
  mass?: number             // Mass for physics calculations
  radius?: number           // Collision radius/space allocation

  // Visual properties for 3D rendering
  color?: string            // Override color for 3D context
  opacity?: number          // Transparency based on depth
  scale?: number            // Size scaling factor

  // Spatial indexing properties
  bounds?: BoundingBox3D    // Bounding box for spatial queries
  lodLevel?: number         // Current level-of-detail
}
```

### GraphEdge3D Interface

```typescript
// Extension of existing GraphEdge with 3D curve support
export interface GraphEdge3D extends GraphEdge {
  // 3D curve control points for curved edges
  controlPoints?: Position3D[]

  // Visual properties for 3D rendering
  curveType?: 'linear' | 'quadratic' | 'cubic'
  width?: number            // Edge width based on camera distance
  opacity?: number          // Transparency based on depth

  // Spatial indexing properties
  bounds?: BoundingBox3D    // Bounding box for edge culling
  lodLevel?: number         // Current level-of-detail
}
```

### Bounding Volume Types

```typescript
// 3D bounding box for spatial indexing and culling
export interface BoundingBox3D {
  min: Position3D
  max: Position3D
  center: Position3D
  size: Position3D

  // Utility methods
  contains(point: Position3D): boolean
  intersects(other: BoundingBox3D): boolean
  union(other: BoundingBox3D): BoundingBox3D
  expand(point: Position3D): void
}
```

## Camera and View Types

### Camera3D State

```typescript
// Camera state for persistence and restoration
export interface CameraState3D {
  position: Position3D
  target: Position3D
  up: Position3D
  fov?: number              // Field of view
  zoom?: number             // Zoom level
  near?: number             // Near clipping plane
  far?: number              // Far clipping plane
}

// Camera animation settings
export interface CameraAnimation {
  duration: number          // Animation duration in ms
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
  onComplete?: () => void   // Callback when animation completes
}
```

### ViewMode Types

```typescript
// Visualization mode enumeration
export type ViewMode = '2D' | '3D'

// 3D-specific control modes for different workflows
export type ControlMode = 'explore' | 'analyze' | 'present'

// Camera control settings per mode
export interface ControlSettings {
  enableRotate: boolean
  enablePan: boolean
  enableZoom: boolean
  rotateSpeed: number
  panSpeed: number
  zoomSpeed: number
  dampingFactor: number
}
```

## Spatial Data Structures

### Octree Interface

```typescript
// Octree for efficient spatial indexing of 3D objects
export interface Octree<T> {
  root: OctreeNode<T>
  maxDepth: number
  maxObjects: number

  // Core operations
  insert(object: T, bounds: BoundingBox3D): void
  remove(object: T, bounds: BoundingBox3D): boolean
  query(bounds: BoundingBox3D): T[]
  querySphere(center: Position3D, radius: number): T[]
  raycast(origin: Position3D, direction: Position3D): RaycastResult<T>[]

  // Tree operations
  clear(): void
  rebuild(): void
  getStatistics(): OctreeStatistics
}

export interface OctreeNode<T> {
  bounds: BoundingBox3D
  objects: OctreeObject<T>[]
  children: OctreeNode<T>[]
  depth: number
  isLeaf: boolean
}

export interface OctreeObject<T> {
  object: T
  bounds: BoundingBox3D
}

export interface RaycastResult<T> {
  object: T
  distance: number
  point: Position3D
  normal: Position3D
}

export interface OctreeStatistics {
  totalObjects: number
  totalNodes: number
  maxDepth: number
  averageObjectsPerNode: number
}
```

### Level of Detail (LOD) System

```typescript
// LOD configuration for performance optimization
export interface LODConfig {
  distances: number[]               // Distance thresholds for each level
  detailLevels: DetailLevel[]       // Rendering settings per level
  transitionSmoothness: number      // Smooth transition between levels
}

export interface DetailLevel {
  level: number
  maxDistance: number
  nodeRadius: number
  edgeWidth: number
  labelsVisible: boolean
  instancedRendering: boolean
  maxVisibleNodes: number
  useSimplifiedGeometry: boolean
}

// LOD manager for dynamic detail adjustment
export interface LODManager {
  config: LODConfig
  currentCamera: CameraState3D

  // LOD operations
  updateLOD(nodes: GraphNode3D[], edges: GraphEdge3D[]): void
  getVisibleNodes(): GraphNode3D[]
  getVisibleEdges(): GraphEdge3D[]
  setLODLevel(object: GraphNode3D | GraphEdge3D, level: number): void

  // Performance monitoring
  getPerformanceMetrics(): LODPerformanceMetrics
}
```

## Performance and Memory Types

### Memory Management

```typescript
// Object pool for efficient memory allocation
export interface ObjectPool<T> {
  factory: () => T
  reset: (obj: T) => void
  pool: T[]
  maxSize: number

  acquire(): T
  release(obj: T): void
  clear(): void
  getStatistics(): PoolStatistics
}

export interface PoolStatistics {
  totalCreated: number
  totalReused: number
  currentPoolSize: number
  peakPoolSize: number
  reuseRatio: number
}

// Streaming buffer for large graphs
export interface StreamingBuffer<T> {
  windowSize: number              // Size of visible window
  bufferRadius: number            // Extra radius for smooth transitions
  dataProvider: DataProvider<T>

  // Streaming operations
  updateWindow(center: Position3D): Promise<void>
  getVisibleData(): T[]
  preload(bounds: BoundingBox3D): Promise<void>
  cleanup(): void
}
```

### Performance Monitoring

```typescript
// Performance metrics for 3D rendering
export interface PerformanceMetrics {
  frameRate: number               // Current FPS
  frameTime: number               // Frame time in ms
  drawCalls: number               // Number of draw calls per frame
  visibleNodes: number            // Currently visible nodes
  visibleEdges: number            // Currently visible edges
  memoryUsage: MemoryUsage
  lodStatistics: LODStatistics
}

export interface MemoryUsage {
  geometrySize: number            // Size of geometry buffers in bytes
  textureSize: number             // Size of textures in bytes
  indexSize: number               // Size of index buffers in bytes
  totalGPU: number                // Total GPU memory usage
  totalCPU: number                // Total CPU memory usage
}

// Performance thresholds for optimization
export interface PerformanceThresholds {
  targetFrameRate: number         // Target FPS (e.g., 60)
  maxFrameTime: number            // Max frame time in ms
  maxDrawCalls: number            // Max draw calls per frame
  maxMemoryUsage: number          // Max memory usage in bytes
  lodTransitionDistance: number   // Distance for LOD transitions
}
```

## Academic Entity Hierarchy

### 3D Positioning Strategy

```typescript
// Academic entity hierarchy for 3D positioning
export interface AcademicHierarchy {
  domains: Domain[]
  fields: Field[]
  subfields: Subfield[]
  topics: Topic[]
}

// Domain-level positioning
export interface Domain {
  id: string
  name: string
  zLevel: number                 // Z-coordinate for domain level
  bounds: BoundingBox3D
  color: string
  subfields: string[]           // Subfield IDs
}

// Field-level positioning
export interface Field {
  id: string
  name: string
  domainId: string
  zLevel: number
  bounds: BoundingBox3D
  color: string
  subfields: string[]
}

// 3D layout configuration
export interface HierarchyLayout3D {
  levelSeparation: number        // Z-distance between levels
  domainRadius: number           // Base radius for domain positioning
  fieldRadius: number            // Base radius for field positioning
  topicSpacing: number           // Spacing between topics
  centerPoint: Position3D       // Center of the hierarchy
}
```

## Type Safety and Validation

### 3D Type Guards

```typescript
// Type guards for 3D objects
export function isPosition3D(obj: unknown): obj is Position3D {
  return obj !== null &&
    typeof obj === 'object' &&
    'x' in obj && 'y' in obj && 'z' in obj &&
    typeof obj.x === 'number' &&
    typeof obj.y === 'number' &&
    typeof obj.z === 'number'
}

export function isGraphNode3D(obj: unknown): obj is GraphNode3D {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj && 'entityType' in obj && 'position' in obj &&
    isPosition3D((obj as GraphNode3D).position)
}

export function isCameraState3D(obj: unknown): obj is CameraState3D {
  return obj !== null &&
    typeof obj === 'object' &&
    'position' in obj && 'target' in obj && 'up' in obj &&
    isPosition3D((obj as CameraState3D).position) &&
    isPosition3D((obj as CameraState3D).target) &&
    isPosition3D((obj as CameraState3D).up)
}
```

### Zod Schemas

```typescript
// Zod schemas for runtime validation
import { z } from 'zod'

export const Position3DSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number()
})

export const GraphNode3DSchema = z.object({
  id: z.string(),
  entityType: z.enum(['works', 'authors', 'sources', 'institutions', 'concepts', 'keywords', 'funders', 'publishers', 'topics', 'subfields', 'fields', 'domains']),
  label: z.string(),
  entityId: z.string(),
  position: Position3DSchema,
  velocity: Position3DSchema.optional(),
  force: Position3DSchema.optional(),
  mass: z.number().optional(),
  radius: z.number().optional(),
  externalIds: z.array(z.string())
})

export const CameraState3DSchema = z.object({
  position: Position3DSchema,
  target: Position3DSchema,
  up: Position3DSchema,
  fov: z.number().optional(),
  zoom: z.number().optional(),
  near: z.number().optional(),
  far: z.number().optional()
})
```

## Integration with Existing Types

### Adapter Interface

```typescript
// Adapter pattern for 2D to 3D conversion
export interface Graph3DAdapter {
  // Conversion methods
  to3DNode(node: GraphNode): GraphNode3D
  to3DEdge(edge: GraphEdge, nodes: Map<string, GraphNode3D>): GraphEdge3D
  from3DNode(node3D: GraphNode3D): GraphNode
  from3DEdge(edge3D: GraphEdge3D, nodes: Map<string, GraphNode>): GraphEdge

  // Batch conversion
  to3DGraph(nodes: GraphNode[], edges: GraphEdge[]): {
    nodes3D: GraphNode3D[]
    edges3D: GraphEdge3D[]
  }

  // Hierarchy positioning
  applyHierarchyLayout(nodes3D: GraphNode3D[]): void
}
```

### Backward Compatibility

```typescript
// Ensure existing 2D functionality remains intact
export interface LegacyGraphSupport {
  // Automatic mode detection
  detectOptimalMode(nodes: GraphNode[]): ViewMode

  // Fallback rendering
  renderIn2D(data: GraphData): void
  renderIn3D(data: GraphData3D): void

  // Migration utilities
  migrateFrom2D(node2D: GraphNode): GraphNode3D
  migrateTo2D(node3D: GraphNode3D): GraphNode
}
```

This data model provides a comprehensive type-safe foundation for 3D graph visualization while maintaining full backward compatibility with existing BibGraph functionality.