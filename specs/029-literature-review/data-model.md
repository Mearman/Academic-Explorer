# Data Model: Advanced Literature Review Workflows

**Feature**: 029-literature-review
**Date**: 2025-11-30

## Entity Relationships

```mermaid
erDiagram
    CatalogueList ||--o| parentOf |o-- Entity
    CatalogueList ||--|{ contains }|| Entity
    CatalogueList ||--o| hasWorkflow |o-- LiteratureReview
    LiteratureReview ||--||{ has } ScreeningDecision
    LiteratureReview ||--o{ tracks }|| PRISMAStage
    ScreeningDecision ||--|{ evaluates }|| Entity
    LiteratureReview ||--o{ analyzes }|| Theme
    Theme ||--|{ contains }|| Entity
    Entity }|--||{ stored in }|| SyncConfiguration
    CustomEntity }|--||{ extends }|| Entity
    Entity ||--o{ includes }|| Excerpt
    CustomEntity }|--o|| FileInfo
```

## Core Entities

### CatalogueList (First-Class Entity)

Catalogues are promoted to first-class entity status, enabling them to participate in the same relationship patterns as other entities. A catalogue list can have a parent entity (the entity it "belongs to") and contains other entities.

```typescript
// Catalogue as a first-class entity type
type EntityType =
  | "works" | "authors" | "institutions" | "sources"
  | "publishers" | "funders" | "topics" | "concepts"
  | "lists"  // NEW: Lists are first-class entities

interface CatalogueList {
  // ID is pako-compressed, base64url-encoded payload with "L" prefix
  // Format: "L" + base64url(pako.deflate(JSON.stringify(EncodedListPayload)))
  // This makes lists shareable via URL alone - the entire state is in the ID
  id: string
  type: "lists"
  title: string
  description?: string

  // Generic parent entity relationship
  // "This list belongs to / is derived from this entity"
  parentEntityId?: string      // Any entity ID (Work, Author, Institution, Catalogue, etc.)
  parentEntityType?: EntityType // The type of the parent entity
  relationshipLabel?: string   // Human-readable: "bibliography", "collaborators", "outputs"

  // List contents - can contain ANY entity types, including other catalogues
  entities: Array<{
    id: string
    type: EntityType
    // Optional per-entity metadata (e.g., PRISMA stage, notes)
    metadata?: Record<string, unknown>
  }>

  // List categorization
  listType: "general" | "bibliography" | "collaborators" | "outputs" | "bookmarks" | "history"

  // Optional workflow attachment
  literatureReviewId?: string  // If this list has PRISMA workflow tracking

  // Visibility and sharing
  visibility: "private" | "shared" | "public"

  // Metadata
  createdAt: string
  updatedAt: string
  createdBy?: string
  tags?: string[]
}

/**
 * Payload encoded in the list ID using pako compression
 * Designed for URL-safe sharing while keeping URLs reasonably short
 */
interface EncodedListPayload {
  // UUID for uniqueness (even if contents are identical)
  uuid: string  // e.g., "550e8400-e29b-41d4-a716-446655440000"

  // Core metadata (kept minimal for compression)
  t: string                    // title
  d?: string                   // description (optional)

  // Parent relationship (optional)
  p?: {
    id: string                 // parentEntityId
    type: EntityType           // parentEntityType
    label?: string             // relationshipLabel
  }

  // Entity IDs only (types inferred from ID prefix)
  // e.g., ["W123", "W456", "A789"] - entity type derivable from prefix
  e: string[]

  // Per-entity metadata keyed by entity ID (only if present)
  // e.g., { "W123": { prismaStage: "included" } }
  m?: Record<string, Record<string, unknown>>

  // List type (single char for compression)
  // g=general, b=bibliography, c=collaborators, o=outputs, k=bookmarks, h=history
  lt: "g" | "b" | "c" | "o" | "k" | "h"

  // Timestamps (Unix epoch for compression)
  ca: number  // createdAt
  ua: number  // updatedAt
}

/**
 * ID Encoding/Decoding utilities
 *
 * Encode: CatalogueList → pako.deflate → base64url → "L" prefix
 * Decode: Remove "L" → base64url decode → pako.inflate → CatalogueList
 *
 * Example encoded ID (hypothetical):
 * "LeJyrVspLz0nNBQA" (very short lists)
 * "LeNqtk81qwzAQhF9F6By7cuw4..." (typical bibliography)
 *
 * URL length considerations:
 * - Safe limit: ~2000 characters
 * - Typical work ID: 10-12 chars (e.g., "W2741809807")
 * - With pako compression: ~100-150 entities fit in safe URL length
 * - For larger lists: Use stored reference ID with lazy loading
 */
```

**Use Cases:**

| Parent Entity | List Type | Contents | Example |
|---------------|-----------|----------|---------|
| Work (review paper) | bibliography | Works | Papers cited by a systematic review |
| Work (draft) | bibliography | Works | User's paper being written |
| Author | collaborators | Authors | Co-author network |
| Author | outputs | Works | Curated publication list |
| Institution | outputs | Works | Research outputs |
| Institution | members | Authors | Faculty/researchers |
| Source (journal) | contents | Works | Issue table of contents |
| Topic | key_papers | Works | Seminal papers in field |
| Funder | funded | Works | Grant-funded research |
| Catalogue | subcollection | Catalogues | Nested list (list of lists) |
| `undefined` | bookmarks | Mixed | User's general bookmarks |

**Recursive Relationships:**

```
CatalogueList: "My Systematic Reviews"
  ├── id: "LeNqtk81qwzAQhF9F..." (pako-encoded payload)
  ├── decoded payload: {
  │     uuid: "550e8400-e29b-41d4-a716-446655440000",
  │     t: "My Systematic Reviews",
  │     p: { id: "A5017898742", type: "authors" },
  │     e: ["LeJyrVspLz0nNBQA...", "LeKx2jVspMz1nOCR...", "LeMz3kWtqNz2oPDS..."],
  │     lt: "g",
  │     ca: 1719792000, ua: 1719792000
  │   }
  └── contains nested list IDs (each also pako-encoded)

CatalogueList: "Review 1 Bibliography"
  ├── id: "LeJyrVspLz0nNBQA..." (pako-encoded payload)
  ├── decoded payload: {
  │     uuid: "660f9500-f3ac-52e5-b827-557766551111",
  │     t: "Review 1 Bibliography",
  │     p: { id: "W3187234764", type: "works", label: "bibliography" },
  │     e: ["W2741809807", "W2760813866", "W2893746512"],
  │     m: {
  │       "W2741809807": { prismaStage: "included" },
  │       "W2760813866": { prismaStage: "included" },
  │       "W2893746512": { prismaStage: "excluded" }
  │     },
  │     lt: "b",
  │     ca: 1719792000, ua: 1719792000
  │   }
  └── entities hydrated from OpenAlex using IDs in payload
```

**Sample Bibliographies:**

Sample bibliographies are simply CatalogueLists where:
- The pako-encoded ID contains the full list state
- `parentEntityId` references an existing OpenAlex review paper
- `listType` is "bibliography" (`lt: "b"`)
- Entity metadata includes PRISMA stage assignments
- Lists are shareable via URL: `/lists/LeNqtk81qwzAQhF9F...`

```typescript
// Sample bibliography payload (before pako encoding)
const samplePayload: EncodedListPayload = {
  uuid: "cochrane-ml-2024-550e8400",  // Can use semantic UUID for samples
  t: "ML in Medical Diagnosis - Cochrane Review",
  d: "Bibliography from Cochrane systematic review on ML diagnostics",
  p: {
    id: "W3187234764",    // Parent: the published review paper
    type: "works",
    label: "bibliography"
  },
  e: ["W2741809807", "W2760813866", "W2893746512"],  // Entity IDs
  m: {
    "W2741809807": { prismaStage: "included", qualityScore: 8 },
    "W2760813866": { prismaStage: "included", qualityScore: 7 },
    "W2893746512": { prismaStage: "excluded", reason: "wrong population" }
  },
  lt: "b",  // bibliography
  ca: 1718409600,  // 2024-06-15 as Unix timestamp
  ua: 1718409600
}

// Encoded ID: "L" + base64url(pako.deflate(JSON.stringify(samplePayload)))
// Result: "LeNqtk81qwzAQhF9F6By7cuw4sRMnJNBDpUqlXnLoIbfKWq..."

// Decoded CatalogueList (hydrated from payload + OpenAlex data)
const sampleBibliography: CatalogueList = {
  id: "LeNqtk81qwzAQhF9F6By7cuw4sRMnJNBDpUqlXnLoIbfKWq...",
  type: "lists",
  title: "ML in Medical Diagnosis - Cochrane Review",
  description: "Bibliography from Cochrane systematic review on ML diagnostics",
  parentEntityId: "W3187234764",
  parentEntityType: "works",
  relationshipLabel: "bibliography",
  listType: "bibliography",
  visibility: "public",
  entities: [
    { id: "W2741809807", type: "works", metadata: { prismaStage: "included", qualityScore: 8 } },
    { id: "W2760813866", type: "works", metadata: { prismaStage: "included", qualityScore: 7 } },
    { id: "W2893746512", type: "works", metadata: { prismaStage: "excluded", reason: "wrong population" } }
  ],
  createdAt: "2024-06-15T00:00:00.000Z",
  updatedAt: "2024-06-15T00:00:00.000Z"
}
```

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

### Sample Catalogue Data (Static Files)

Sample catalogues are pre-packaged `CatalogueList` entities served via the public folder. They use the same data structure as user-created catalogues, just stored as static JSON for demonstration and onboarding purposes.

**File System Structure:**
```
apps/web/public/data/catalogues/
├── index.json                           # Master index of all sample catalogues
├── L-cochrane-ml-2024/
│   ├── catalogue.json                   # CatalogueList entity data
│   └── literature-review.json           # Optional: LiteratureReview workflow data
├── L-climate-adaptation-2023/
│   ├── catalogue.json
│   └── literature-review.json
└── ...
```

**Master Index Structure:**
```typescript
interface SampleCatalogueIndex {
  lastUpdated: string // ISO date
  catalogues: Array<{
    id: string                    // CatalogueList ID (e.g., "L-cochrane-ml-2024")
    title: string
    parentEntityId?: string       // Parent entity (e.g., review paper Work ID)
    parentEntityType?: EntityType
    listType: string
    entityCount: number
    tags: string[]
    $ref: string                  // Relative path to catalogue folder
  }>
}
```

**Data Loading Strategy:**
1. Load sample catalogue index from static JSON
2. Load specific `CatalogueList` entity data on demand
3. Fetch parent entity from OpenAlex (cache → API fallback) if specified
4. Fetch contained entities from OpenAlex as needed
5. All entities navigable via existing routes (`/works/W123`, `/catalogues/L123`)

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