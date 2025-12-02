# Data Model: Advanced Literature Review Workflows

**Feature**: 029-literature-review
**Date**: 2025-11-30

## Entity Relationships

```mermaid
erDiagram
    LiteratureReview ||--||{ has } ScreeningDecision
    LiteratureReview ||--o{ tracks }|| PRISMAStage
    ScreeningDecision ||--|{ evaluates }|| CatalogueEntity
    LiteratureReview ||--o{ analyzes }|| Theme
    Theme ||--|{ contains }|| CatalogueEntity
    CatalogueEntity }|--||{ stored in }|| SyncConfiguration
    CustomEntity }|--||{ extends }|| CatalogueEntity
    CatalogueEntity ||--o{ includes }|| Excerpt
    CustomEntity }|--o|| FileInfo
```

## Core Entities

### LiteratureReview

Represents a systematic review project with PRISMA 2020 compliant workflow tracking.

```typescript
interface LiteratureReview {
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
```

### ScreeningDecision

Records inclusion/exclusion decisions with structured criteria and audit trail.

```typescript
interface ScreeningDecision {
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
```

### Theme

Represents thematic analysis results with manual editing capabilities.

```typescript
interface Theme {
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
```

### CustomEntity

Extends standard catalog entities for non-OpenAlex works with file system integration.

```typescript
interface CustomEntity extends CatalogueEntity {
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
}
```

### SyncConfiguration

Manages file system synchronization settings and conflict resolution preferences.

```typescript
interface SyncConfiguration {
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
```

### SampleBibliography

Pre-packaged bibliography from an existing review paper served via the public folder, following the pattern of the OpenAlex static data cache.

```typescript
interface SampleBibliography {
  id: string // Unique identifier (e.g., "cochrane-ml-diagnosis-2024")

  // Source Review Paper Attribution
  sourceReview: {
    title: string
    authors: string[]
    doi?: string
    publicationYear: number
    journal?: string
    url?: string
    abstract?: string
  }

  // Classification
  reviewType: "systematic" | "meta-analysis" | "scoping" | "narrative" | "rapid" | "umbrella"
  researchDomain: string // e.g., "Machine Learning in Medical Diagnosis"
  topics: string[] // e.g., ["artificial intelligence", "healthcare", "diagnostics"]

  // PRISMA Flow Data
  prismaData: {
    identified: number
    screened: number
    eligible: number
    included: number
    excludedAtScreening: number
    excludedAtEligibility: number
    exclusionReasons?: Record<string, number> // reason -> count
  }

  // Referenced Works
  works: Array<{
    // OpenAlex ID if available, otherwise custom identifier
    id: string
    openAlexId?: string // e.g., "W2741809807"

    // Core metadata
    title: string
    authors: string[]
    publicationYear: number
    doi?: string
    journal?: string
    abstract?: string

    // PRISMA stage assignment
    prismaStage: "identified" | "screened" | "eligible" | "included" | "excluded"
    screeningDecision?: {
      included: boolean
      reason?: string
      criteria?: string[]
    }

    // Optional quality assessment
    qualityScore?: number
    biasRisk?: "low" | "medium" | "high"
  }>

  // File System Structure (mirrors OpenAlex static cache pattern)
  // Stored at: apps/web/public/data/sample-bibliographies/{id}/
  // - index.json (this metadata)
  // - works/ (individual work JSON files)

  // Metadata
  createdAt: string // ISO date
  updatedAt: string // ISO date
  version: string // Semantic version for updates
  contributor?: string // Who contributed this sample
  license?: string // e.g., "CC-BY-4.0"
}
```

**File System Structure:**
```
apps/web/public/data/sample-bibliographies/
├── index.json                           # List of all available sample bibliographies
├── cochrane-ml-diagnosis-2024/
│   ├── index.json                       # SampleBibliography metadata
│   └── works/
│       ├── index.json                   # Work list index
│       ├── W2741809807.json            # Individual work data (if from OpenAlex)
│       └── custom-001.json             # Custom work data (if not in OpenAlex)
├── prisma-climate-adaptation-2023/
│   ├── index.json
│   └── works/
│       └── ...
```

**Master Index Structure:**
```typescript
interface SampleBibliographyIndex {
  lastUpdated: string // ISO date
  bibliographies: Array<{
    id: string
    title: string
    reviewType: string
    researchDomain: string
    workCount: number
    $ref: string // Relative path to bibliography folder
  }>
}
```

### CitationExportConfiguration

Configuration for citation export formats and custom fields.

```typescript
interface CitationExportConfiguration {
  format: "bibtex" | "ris" | "csv"

  // BibTeX Options
  bibtexOptions?: {
    includeCustomFields: boolean
    customFieldPrefix?: string
    entryTypeMapping: Record<string, string>
  }

  // RIS Options
  risOptions?: {
    includeAbstracts: boolean
    includeNotes: boolean
    tagFormat: "standard" | "extended"
  }

  // CSV Options
  csvOptions?: {
    delimiter: string
    includeHeaders: boolean
    columns: Array<{
      key: string
      header: string
      include: boolean
      formatter?: (value: any) => string
    }>
  }

  // Citation Key Generation
  keyGeneration: {
    pattern: "author-year" | "author-year-title" | "author-year-keywords"
    maxAuthors: number
    titleWords: number
    includeInitials: boolean
    separator: string
  }
}
```

## Extended Catalogue Entity Interface

### EnhancedCatalogueEntity

Enhances the existing CatalogueEntity with literature review capabilities.

```typescript
interface EnhancedCatalogueEntity extends CatalogueEntity {
  // Citation Management
  citationKey?: string
  citationStyle?: "apa" | "mla" | "chicago" | "harvard" | "ieee"

  // Literature Review Integration
  screeningStatus?: "pending" | "included" | "excluded" | "maybe"
  literatureReviewId?: string

  // Thematic Analysis
  themes?: string[]
  concepts?: string[]
  relevanceScore?: number // 1-5 relevance rating

  // Writing Integration
  excerpts?: Array<{
    text: string
    pageNumbers?: string
    quoteType: "direct" | "paraphrase" | "summary"
    notes?: string
  }>

  // Quality Assessment Metadata
  reviewMetadata?: {
    qualityScore?: number // 1-10 methodological quality
    biasRisk?: "low" | "medium" | "high"
    sampleSize?: number
    effectSize?: number
  }

  // Custom Entity Extension (overridden for custom entities)
  isCustomEntity?: boolean
  localEntityId?: string
  sourceType?: "manual" | "file_import" | "doi_lookup" | "user_input" | "local_file_sync"
  verificationStatus?: "verified" | "unverified" | "pending"
  fileInfo?: {
    localPath?: string
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
}
```

## State Management Patterns

### Literature Review State

```typescript
interface LiteratureReviewState {
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
```

### File System Sync State

```typescript
interface FileSystemSyncState {
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
  watchedFiles: Map<string, FileSystemWatcherHandle>
  pendingChanges: Map<string, FileChangeType>

  // Conflict Resolution
  conflicts: Array<{
    id: string
    type: "modification" | "deletion" | "creation"
    localFile: File
    remoteEntity: CustomEntity
    resolutionOptions: ConflictResolutionStrategy[]
  }>
}
```

## Data Validation Rules

### Custom Entity Validation

1. **Duplicate Detection**: Semantic similarity between custom and OpenAlex entities
2. **Metadata Completeness**: Required fields based on entity type
3. **File Format Validation**: Supported academic file formats
4. **DOI Validation**: Proper DOI format and accessibility
5. **Citation Key Uniqueness**: No duplicate citation keys within same literature review

### Literature Review Validation

1. **PRISMA Compliance**: Required fields for each review type
2. **Screening Criteria**: Inclusion/exclusion criteria must be specified
3. **Progress Tracking**: All stage counts must be consistent
4. **Quality Assessment**: Standardized scoring when enabled
5. **Thematic Coherence**: Themes must have meaningful labels and keywords

### File System Validation

1. **Permission Validation**: Proper File System Access API permissions
2. **Path Security**: Prevent directory traversal attacks
3. **File Size Limits**: Maximum file sizes for processing
4. **Format Support**: Only process supported academic file formats
5. **Sync Integrity**: Maintain bidirectional consistency

## Migration Strategy

### Database Schema Updates

1. **Extend Existing Tables**: Add new columns to existing catalogue tables
2. **Create New Tables**: Literature review, themes, sync configuration
3. **Index Optimization**: Add indexes for performance-critical queries
4. **Backward Compatibility**: Existing entities remain functional

### Default Data Population

1. **PRISMA Templates**: Pre-configured review types with standard workflows
2. **Theme Presets**: Common academic themes and keyword patterns
3. **Export Templates**: Standard citation format configurations
4. **Sync Templates**: Common file system organization patterns

This data model provides a comprehensive foundation for implementing advanced literature review workflows while maintaining compatibility with existing BibGraph architecture.