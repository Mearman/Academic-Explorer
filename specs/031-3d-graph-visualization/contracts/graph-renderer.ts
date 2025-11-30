// Graph Renderer API Contract
// Defines the interface for 3D graph rendering operations

export interface GraphRendererAPI {
  // Lifecycle management
  initialize(canvas: HTMLCanvasElement, config: RendererConfig): Promise<void>
  dispose(): void
  resize(width: number, height: number): void

  // Graph data operations
  setGraphData(data: GraphData3D): void
  updateNodePositions(positions: Map<string, Position3D>): void
  updateNodeColors(colors: Map<string, string>): void
  updateHighlights(highlights: Set<string>): void
  updateCommunityAssignments(assignments: Map<string, number>): void

  // Rendering operations
  render(cameraState: CameraState3D): void
  renderFrame(cameraState: CameraState3D, timestamp: number): void

  // Interaction handling
  handlePointer(event: PointerEvent): InteractionResult
  handleWheel(event: WheelEvent): InteractionResult
  handleKeyboard(event: KeyboardEvent): InteractionResult

  // Performance and optimization
  setLODLevel(level: number): void
  enableFrustumCulling(enabled: boolean): void
  setMaxVisibleNodes(max: number): void

  // State and metrics
  getVisibleNodes(): GraphNode3D[]
  getVisibleEdges(): GraphEdge3D[]
  getRenderStatistics(): RenderStatistics
  getPerformanceMetrics(): PerformanceMetrics
}

export interface InteractionResult {
  handled: boolean
  node?: GraphNode3D
  edge?: GraphEdge3D
  position?: Position3D
  event?: string
}

export interface RendererConfig {
  antialias: boolean
  alpha: boolean
  powerPreference: 'default' | 'high-performance' | 'low-power'
  failIfMajorPerformanceCaveat: boolean
  preserveDrawingBuffer: boolean
  desynchronized: boolean
  premultipliedAlpha: boolean
  stencil: boolean
  depth: boolean
}

export interface RenderStatistics {
  frameCount: number
  lastFrameTime: number
  averageFrameTime: number
  drawCalls: number
  triangles: number
  vertices: number
  visibleNodes: number
  visibleEdges: number
  culledNodes: number
  culledEdges: number
}

// Rendering modes and options
export interface RenderMode {
  name: string
  nodeRenderer: NodeRendererConfig
  edgeRenderer: EdgeRendererConfig
  backgroundRenderer: BackgroundRendererConfig
}

export interface NodeRendererConfig {
  geometry: 'sphere' | 'cube' | 'point'
  material: 'basic' | 'standard' | 'phong'
  instanced: boolean
  levelOfDetail: boolean
  shadows: boolean
  glow: boolean
}

export interface EdgeRendererConfig {
  geometry: 'line' | 'tube' | 'ribbon'
  material: 'basic' | 'standard' | 'phong'
  curved: boolean
  animated: boolean
  levelOfDetail: boolean
  shadows: boolean
}

export interface BackgroundRendererConfig {
  type: 'solid' | 'gradient' | 'skybox' | 'grid'
  color?: string
  colors?: string[]
  texture?: string
  grid?: GridConfig
}

export interface GridConfig {
  size: number
  divisions: number
  color: string
  opacity: number
}