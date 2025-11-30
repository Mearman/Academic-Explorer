# File System Sync Types

export interface FileSystemWatcherHandle {
  id: string
  path: string
  isActive: boolean
  lastEvent?: Date
  eventCount: number
}

export type FileChangeType = "created" | "modified" | "deleted" | "moved"

export interface FileChangeEvent {
  type: FileChangeType
  path: string
  oldPath?: string // For moved files
  timestamp: Date
  size?: number
  lastModified?: Date
}

export type ConflictResolutionStrategy = "local-wins" | "remote-wins" | "manual" | "merge"

export interface ConflictResolution {
  id: string
  type: "modification" | "deletion" | "creation" | "metadata"
  localFile?: File
  remoteEntity?: any
  timestamp: Date
  resolutionStrategy: ConflictResolutionStrategy
  chosenStrategy?: ConflictResolutionStrategy
  preview?: {
    localChanges: string[]
    remoteChanges: string[]
  }
}

export interface SyncBatch {
  id: string
  files: Array<{
    path: string
    type: FileChangeType
    size?: number
    priority: number
  }>
  status: "pending" | "processing" | "completed" | "failed"
  startTime?: Date
  endTime?: Date
  errors: Array<{
    path: string
    error: string
    timestamp: Date
  }>
}

export interface FileSystemCapabilities {
  isSupported: boolean
  fileSystemAccessAPI: boolean
  directoryAPI: boolean
  originPrivateFileSystem: boolean
  watchAPI: boolean
  permissions: {
    read: boolean
    write: boolean
    readDirectories: boolean
    writeDirectories: boolean
  }
}

export interface SyncSession {
  id: string
  startTime: Date
  endTime?: Date
  status: "running" | "completed" | "failed" | "paused"
  statistics: {
    filesProcessed: number
    filesCreated: number
    filesModified: number
    filesDeleted: number
    bytesTransferred: number
    errors: number
    conflicts: number
  }
  batches: SyncBatch[]
}

export interface FileMetadata {
  path: string
  name: string
  size: number
  lastModified: Date
  type: string
  checksum?: string
  extractedData?: {
    title?: string
    authors?: string[]
    abstract?: string
    publicationYear?: number
    doi?: string
    pages?: string
    journal?: string
    volume?: string
    issue?: string
  }
}

export interface SyncConfiguration {
  id: string
  userId?: string

  // Folder Configuration
  localFolderPath?: string
  syncDirection: "bidirectional" | "import-only" | "export-only"

  // Sync Settings
  autoSync: boolean
  syncIntervalMinutes: number
  fileTypes: string[] // ["pdf", "docx", "epub", "txt"]
  includeSubdirectories: boolean
  excludePatterns: string[] // glob patterns for files/folders to ignore

  // Conflict Resolution
  conflictStrategy: ConflictResolutionStrategy
  conflictResolutionHistory: Array<{
    fileId: string
    timestamp: Date
    resolution: string
    chosenStrategy: string
  }>

  // Performance Settings
  batchSize: number
  maxFileSize: number // bytes
  rateLimitMs?: number
  concurrentBatches: number

  // Status
  isActive: boolean
  lastSyncAt?: Date
  syncStatus: "idle" | "syncing" | "error" | "conflicts-detected" | "paused"

  // Monitoring
  enableLogging: boolean
  logLevel: "debug" | "info" | "warn" | "error"
  notifications: {
    syncComplete: boolean
    conflictsDetected: boolean
    errors: boolean
  }

  // Metadata
  createdAt: Date
  updatedAt: Date
  version: number
}

export interface FileSystemSyncProvider {
  // Core sync operations
  initialize(config: SyncConfiguration): Promise<void>
  startSync(): Promise<SyncSession>
  pauseSync(): Promise<void>
  resumeSync(): Promise<void>
  stopSync(): Promise<void>

  // File operations
  watchDirectory(path: string): Promise<FileSystemWatcherHandle>
  unwatchDirectory(handleId: string): Promise<void>
  syncFile(path: string, direction: "up" | "down" | "both"): Promise<void>

  // Conflict management
  detectConflicts(): Promise<ConflictResolution[]>
  resolveConflict(conflictId: string, strategy: ConflictResolutionStrategy): Promise<void>

  // Metadata operations
  extractMetadata(file: File): Promise<FileMetadata>
  compareFiles(local: File, remote: any): Promise<boolean>

  // Monitoring and status
  getCapabilities(): FileSystemCapabilities
  getCurrentSession(): SyncSession | null
  getStatistics(): Promise<{
    totalFiles: number
    syncedFiles: number
    pendingFiles: number
    conflictedFiles: number
    totalBytes: number
  }>
}

export interface FileProcessorWorkerMessage {
  type: "process-file" | "extract-metadata" | "batch-process" | "progress" | "error" | "complete"
  id?: string
  payload?: any
  error?: string
}

export interface BatchProcessingOptions {
  batchSize: number
  maxConcurrency: number
  retryAttempts: number
  retryDelay: number
  progressCallback?: (progress: number, total: number, current: string) => void
}

export interface SyncValidationResult {
  isValid: boolean
  errors: Array<{
    type: "permission" | "path" | "configuration" | "conflict"
    message: string
    path?: string
  }>
  warnings: Array<{
    type: "performance" | "compatibility" | "size"
    message: string
  }>
  recommendations: string[]
}