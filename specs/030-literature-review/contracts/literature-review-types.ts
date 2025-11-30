# Literature Review Types

// Core entity types for literature review functionality
export interface LiteratureReview {
  id: string
  title: string
  description?: string
  type: "systematic" | "narrative" | "scoping" | "meta-analysis" | "rapid" | "prisma-semantic"
  researchDomain?: string
  methodology?: string

  // Workflow State
  status: "planning" | "searching" | "screening" | "analyzing" | "writing" | "complete"
  progress: {
    total: number
    included: number
    excluded: number
    pending: number
  }

  // PRISMA Tracking
  prismaFlowData: {
    identified: number
    screened: number
    eligible: number
    included: number
  }

  // Semantic Analysis Integration
  semanticAnalysisEnabled: boolean
  topicModelingStages: ("identification" | "screening" | "eligibility" | "inclusion")[]
  semanticClusters: Array<{
    stage: string
    clusters: Array<{
      id: string
      label: string
      keywords: string[]
      paperCount: number
      avgRelevanceScore: number
    }>
  }>

  // Metadata
  createdAt: Date
  updatedAt: Date
  createdBy?: string
  tags?: string[]
}

export interface ScreeningDecision {
  id: string
  literatureReviewId: string
  entityId: string

  // Decision
  included: boolean
  decisionType: "pending" | "included" | "excluded" | "maybe"

  // Criteria
  criteria: string[]
  reason?: string

  // Reviewer Information
  reviewer?: string
  timestamp: Date

  // Quality Assessment
  qualityScore?: number // 1-10 methodological quality
  biasRisk?: "low" | "medium" | "high"
  sampleSize?: number
  effectSize?: number

  // Metadata
  notes?: string
  confidence?: number // 0-100 confidence in decision
}

export interface Theme {
  id: string
  literatureReviewId?: string
  label: string
  description?: string
  color: string // Hex color for visualization

  // Topic Analysis
  keywords: string[]
  relevanceScore?: number // 1-5 relevance rating
  centroid?: number[] // For spatial visualization

  // Management
  isLocked: boolean
  parentThemeId?: string
  childThemeIds: string[]

  // Associated Studies
  paperIds: string[]
  paperCount: number

  // Metadata
  createdAt: Date
  updatedAt: Date
  createdBy?: string
}

export interface CustomEntity {
  // Custom Entity Identification
  isCustomEntity: true
  localEntityId: string // For entities not in OpenAlex

  // Metadata Source
  sourceType: "manual" | "file_import" | "doi_lookup" | "user_input" | "local_file_sync"
  verificationStatus: "verified" | "unverified" | "pending"
  lastValidated?: Date
  originalData?: any // Raw data from import

  // File System Integration
  fileInfo?: {
    localPath?: string // Relative path in synced folder
    fileName?: string
    fileSize?: number
    fileType?: string
    lastModified?: Date
    syncStatus: "synced" | "pending" | "conflict" | "error"
    extractedMetadata?: {
      title?: string
      authors?: string[]
      abstract?: string
      publicationYear?: number
      doi?: string
      pages?: string
    }
  }

  // Standard OpenAlex fields (inherited from CatalogueEntity)
  id: string
  title?: string
  publicationYear?: number
  abstract?: string
  authors?: Array<{
    id: string
    displayName: string
    familyName?: string
    givenName?: string
  }>
  // ... other standard CatalogueEntity fields
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

  // Conflict Resolution
  conflictStrategy: "local-wins" | "remote-wins" | "manual" | "merge"
  conflictResolutionHistory: Array<{
    fileId: string
    timestamp: Date
    resolution: string
    chosenStrategy: string
  }>

  // Status
  isActive: boolean
  lastSyncAt?: Date
  syncStatus: "idle" | "syncing" | "error" | "conflicts-detected"

  // Performance
  batchSize: number
  maxFileSize: number // bytes
  rateLimitMs?: number

  // Metadata
  createdAt: Date
  updatedAt: Date
}

// State management types
export interface LiteratureReviewState {
  currentReview: LiteratureReview | null
  reviews: Map<string, LiteratureReview>
  selectedEntities: string[]

  // UI State
  activeTab: "identification" | "screening" | "eligibility" | "analysis"
  exportFormat: "bibtex" | "ris" | "csv"

  // Loading States
  isExporting: boolean
  isAnalyzing: boolean
  isSyncing: boolean

  // Filters
  entityFilters: {
    types: string[]
    themes: string[]
    screeningStatus: string[]
    dateRange: {
      start: Date | null
      end: Date | null
    }
  }
}

export interface FileSystemSyncState {
  isSupported: boolean
  isActive: boolean
  currentConfiguration: SyncConfiguration | null

  // Sync Progress
  syncProgress: {
    current: number
    total: number
    currentFile?: string
    errors: Array<{
      file: string
      error: string
      timestamp: Date
    }>
  }

  // File Watching
  watchedFiles: Map<string, any>
  pendingChanges: Map<string, any>

  // Conflict Resolution
  conflicts: Array<{
    id: string
    type: "modification" | "deletion" | "creation"
    localFile: File
    remoteEntity: CustomEntity
    resolutionOptions: string[]
  }>
}

// Validation and error types
export interface ValidationError {
  field: string
  code: string
  message: string
  severity: "error" | "warning"
}

export interface ImportResult {
  success: boolean
  entitiesImported: number
  errors: ValidationError[]
  duplicatesFound: string[]
}

export interface ExportResult {
  success: boolean
  entitiesExported: number
  format: string
  filePath?: string
  errors: ValidationError[]
}