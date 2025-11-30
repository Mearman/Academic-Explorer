# Citation Export Types

export interface CitationExportConfiguration {
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

export interface CitationKeyGeneratorOptions {
  pattern: "author-year" | "author-year-title" | "author-year-keywords"
  maxAuthors: number
  titleWords: number
  includeInitials: boolean
  separator: string
  conflictResolution: "append-letter" | "append-year" | "append-number"
}

export interface BibTeXEntry {
  citationKey: string
  entryType: string
  fields: Record<string, string>
  customFields?: Record<string, any>
}

export interface RISEntry {
  type: string
  fields: Array<{
    tag: string
    value: string
  }>
}

export interface CSVColumn {
  key: string
  header: string
  include: boolean
  formatter?: (value: any) => string
  type: "string" | "number" | "date" | "array" | "object"
}

export interface CitationExportResult {
  success: boolean
  format: string
  content: string
  filename: string
  entityCount: number
  warnings?: string[]
  errors?: string[]
  processingTime: number // milliseconds
}

export interface EnhancedCatalogueEntity {
  id: string
  title?: string
  authors?: Array<{
    displayName: string
    familyName?: string
    givenName?: string
  }>
  publicationYear?: number
  abstract?: string
  doi?: string
  journal?: {
    name?: string
    volume?: string
    issue?: string
    pages?: string
  }
  publisher?: string
  type?: string

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

  // Custom Entity Extension
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

export interface ExportProgressCallback {
  (progress: {
    current: number
    total: number
    currentItem?: string
    stage: string
  }): void
}

export interface CitationExportOptions {
  includeAbstracts?: boolean
  includeCustomFields?: boolean
  includeExcerpts?: boolean
  includeQualityMetadata?: boolean
  dateFormat?: string
  authorFormat?: "full" | "abbreviated" | "initials"
  titleCase?: "title" | "sentence"
}