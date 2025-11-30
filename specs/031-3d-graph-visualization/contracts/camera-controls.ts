// Camera Controls API Contract
// Defines the interface for 3D camera control operations

export interface CameraControlsAPI {
  // Core camera operations
  setPosition(position: Position3D, animate?: boolean): Promise<void>
  setTarget(target: Position3D, animate?: boolean): Promise<void>
  reset(animate?: boolean): Promise<void>

  // Animation controls
  animateTo(state: CameraState3D, options?: CameraAnimation): Promise<void>
  stopAnimation(): void

  // Mode switching
  setControlMode(mode: ControlMode): void
  getControlMode(): ControlMode

  // Event handling
  on(event: CameraEvent, callback: (data: any) => void): void
  off(event: CameraEvent, callback: (data: any) => void): void

  // State management
  getState(): CameraState3D
  setState(state: CameraState3D): void
  saveState(key?: string): void
  loadState(key?: string): boolean
}

export type CameraEvent =
  | 'positionChange'
  | 'targetChange'
  | 'zoomChange'
  | 'rotationStart'
  | 'rotationEnd'
  | 'animationComplete'

// Camera control configuration
export interface CameraControlsConfig {
  mode: ControlMode
  enableDamping: boolean
  dampingFactor: number
  enablePan: boolean
  enableRotate: boolean
  enableZoom: boolean
  minDistance: number
  maxDistance: number
  minPolarAngle: number
  maxPolarAngle: number
  autoRotate: boolean
  autoRotateSpeed: number
}

// Preset camera configurations
export interface CameraPresets {
  overview: CameraState3D
  detail: CameraState3D
  topDown: CameraState3D
  side: CameraState3D
  custom: Record<string, CameraState3D>
}