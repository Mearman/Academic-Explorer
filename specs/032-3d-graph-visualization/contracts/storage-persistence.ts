// Storage Persistence API Contract
// Defines the interface for persisting 3D visualization state

export interface StoragePersistenceAPI {
  // Camera state persistence
  saveCameraState(state: CameraState3D, key?: string): Promise<void>
  loadCameraState(key?: string): Promise<CameraState3D | null>
  deleteCameraState(key?: string): Promise<void>

  // User preferences
  savePreferences(prefs: UserPreferences): Promise<void>
  loadPreferences(): Promise<UserPreferences>

  // View mode persistence
  saveViewMode(mode: ViewMode): Promise<void>
  loadViewMode(): Promise<ViewMode>

  // Control settings persistence
  saveControlSettings(settings: ControlSettings): Promise<void>
  loadControlSettings(): Promise<ControlSettings>

  // LOD configuration persistence
  saveLODConfig(config: LODConfig): Promise<void>
  loadLODConfig(): Promise<LODConfig>

  // Performance metrics (for monitoring)
  savePerformanceMetrics(metrics: PerformanceMetrics): Promise<void>
  loadPerformanceMetrics(limit?: number): Promise<PerformanceMetrics[]>

  // Cache management
  clearCache(): Promise<void>
  getCacheSize(): Promise<number>
  compressOldData(): Promise<void>
}

export interface UserPreferences {
  defaultViewMode: ViewMode
  autoDetectWebGL: boolean
  enableAnimations: boolean
  animationSpeed: number
  enableShadows: boolean
  antialiasLevel: 'low' | 'medium' | 'high'
  performanceMode: 'quality' | 'balanced' | 'performance'
  colorScheme: 'default' | 'high-contrast' | 'colorblind-friendly'
}

export interface StorageKeys {
  CAMERA_STATE: string
  USER_PREFERENCES: string
  VIEW_MODE: string
  CONTROL_SETTINGS: string
  LOD_CONFIG: string
  PERFORMANCE_METRICS: string
}

export const DEFAULT_STORAGE_KEYS: StorageKeys = {
  CAMERA_STATE: 'bibgraph-camera-state',
  USER_PREFERENCES: 'bibgraph-user-preferences',
  VIEW_MODE: 'bibgraph-view-mode',
  CONTROL_SETTINGS: 'bibgraph-control-settings',
  LOD_CONFIG: 'bibgraph-lod-config',
  PERFORMANCE_METRICS: 'bibgraph-performance-metrics'
}

// Storage event handling
export interface StorageEventAPI {
  on(event: StorageEvent, callback: (data: any) => void): void
  off(event: StorageEvent, callback: (data: any) => void): void
}

export type StorageEvent =
  | 'cameraStateChanged'
  | 'preferencesChanged'
  | 'viewModeChanged'
  | 'controlSettingsChanged'
  | 'lodConfigChanged'
  | 'storageQuotaExceeded'
  | 'storageError'

// Storage migration utilities
export interface StorageMigrationAPI {
  migrate(fromVersion: string, toVersion: string): Promise<boolean>
  getStoredVersion(): Promise<string>
  setStoredVersion(version: string): Promise<void>
  backupData(): Promise<string>
  restoreData(backup: string): Promise<boolean>
}

// Cache invalidation
export interface CacheInvalidationAPI {
  invalidateCache(pattern?: string): Promise<void>
  isCacheValid(key: string): Promise<boolean>
  setCacheExpiry(key: string, ttl: number): Promise<void>
  getCacheExpiry(key: string): Promise<number>
}