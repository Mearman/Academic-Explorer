/**
 * TypeScript types for static data index generation and management
 * Provides type-safe interfaces for entity metadata, index structures, and validation
 */

/**
 * OpenAlex entity types supported by the static data system
 */
export type EntityType = 
  | 'works' 
  | 'authors' 
  | 'sources' 
  | 'institutions' 
  | 'topics' 
  | 'publishers' 
  | 'funders' 
  | 'keywords' 
  | 'concepts';

/**
 * Metadata extracted from entity files for fast lookups
 */
export interface EntityFileMetadata {
  /** Entity identifier (e.g., W123456789, A123456789) */
  id: string;
  /** Entity type */
  type: EntityType;
  /** Relative file path from the entity type directory */
  filePath: string;
  /** Absolute file path on the filesystem */
  absolutePath: string;
  /** File size in bytes */
  fileSize: number;
  /** File modification timestamp (Unix timestamp) */
  lastModified: number;
  /** Basic entity information extracted from the file */
  basicInfo?: {
    /** Display name or title */
    displayName?: string;
    /** Publication year for works */
    publicationYear?: number;
    /** Citation count */
    citationCount?: number;
    /** Works count for authors/institutions */
    worksCount?: number;
    /** External identifiers (DOI, ORCID, etc.) */
    externalIds?: Record<string, string>;
  };
}

/**
 * Index structure for a specific entity type directory
 */
export interface EntityTypeIndex {
  /** Entity type this index covers */
  entityType: EntityType;
  /** Directory path this index covers */
  directoryPath: string;
  /** Index generation timestamp */
  generatedAt: number;
  /** Schema version for compatibility checking */
  schemaVersion: string;
  /** Total number of entities in this index */
  totalEntities: number;
  /** Total size of all entity files in bytes */
  totalSize: number;
  /** Map of entity ID to file metadata */
  entities: Record<string, EntityFileMetadata>;
  /** Statistics about the indexed entities */
  stats: {
    /** Entities by publication year (for works) */
    entitiesByYear?: Record<number, number>;
    /** Most recent modification timestamp */
    lastModified: number;
    /** Oldest modification timestamp */
    oldestModified: number;
    /** Average file size */
    averageFileSize: number;
    /** File size distribution buckets */
    fileSizeDistribution: {
      small: number;   // < 10KB
      medium: number;  // 10KB - 100KB
      large: number;   // 100KB - 1MB
      huge: number;    // > 1MB
    };
  };
}

/**
 * Aggregated index covering all entity types
 */
export interface MasterIndex {
  /** Master index generation timestamp */
  generatedAt: number;
  /** Schema version for compatibility checking */
  schemaVersion: string;
  /** Root directory path for static data */
  rootPath: string;
  /** Total entities across all types */
  totalEntities: number;
  /** Total size across all entity files */
  totalSize: number;
  /** Entity counts by type */
  entitiesByType: Record<EntityType, number>;
  /** Paths to individual entity type indexes */
  typeIndexPaths: Record<EntityType, string>;
  /** Cross-entity statistics */
  globalStats: {
    /** Most recent modification across all entities */
    lastModified: number;
    /** Oldest modification across all entities */
    oldestModified: number;
    /** Coverage statistics */
    coverage: {
      /** Percentage of entities with basic info */
      withBasicInfo: number;
      /** Percentage of entities with external IDs */
      withExternalIds: number;
      /** Percentage of entities with citation counts */
      withCitationCounts: number;
    };
  };
}

/**
 * Index validation result with detailed diagnostics
 */
export interface IndexValidationResult {
  /** Whether the index is valid and consistent */
  isValid: boolean;
  /** Entity type being validated */
  entityType: EntityType;
  /** Index file path */
  indexPath: string;
  /** Validation timestamp */
  validatedAt: number;
  /** Number of entities validated */
  entitiesValidated: number;
  /** Validation errors found */
  errors: IndexValidationError[];
  /** Validation warnings (non-critical issues) */
  warnings: IndexValidationWarning[];
  /** Repair actions that can be performed */
  repairActions: IndexRepairAction[];
  /** Performance metrics from validation */
  performance: {
    /** Validation duration in milliseconds */
    durationMs: number;
    /** Files checked per second */
    filesPerSecond: number;
    /** Memory usage peak during validation */
    memoryUsageMB: number;
  };
}

/**
 * Specific validation error with context
 */
export interface IndexValidationError {
  /** Error type classification */
  type: 'missing_file' | 'corrupted_metadata' | 'invalid_structure' | 'outdated_timestamp' | 'duplicate_id';
  /** Human-readable error message */
  message: string;
  /** Entity ID associated with the error */
  entityId?: string;
  /** File path associated with the error */
  filePath?: string;
  /** Expected value (for comparison errors) */
  expected?: unknown;
  /** Actual value found */
  actual?: unknown;
  /** Whether this error can be automatically repaired */
  canAutoRepair: boolean;
}

/**
 * Non-critical validation warning
 */
export interface IndexValidationWarning {
  /** Warning type classification */
  type: 'missing_basic_info' | 'large_file_size' | 'old_modification_date' | 'unusual_structure';
  /** Human-readable warning message */
  message: string;
  /** Entity ID associated with the warning */
  entityId?: string;
  /** File path associated with the warning */
  filePath?: string;
  /** Severity level */
  severity: 'low' | 'medium' | 'high';
}

/**
 * Repair action that can be performed on a corrupted index
 */
export interface IndexRepairAction {
  /** Action type */
  type: 'regenerate_metadata' | 'remove_missing_file' | 'update_timestamp' | 'deduplicate_entries' | 'rebuild_index';
  /** Human-readable description */
  description: string;
  /** Entity IDs affected by this action */
  affectedEntityIds: string[];
  /** File paths affected by this action */
  affectedFilePaths: string[];
  /** Whether this action is safe to perform automatically */
  isSafeAutoRepair: boolean;
  /** Estimated time to complete this action */
  estimatedDurationMs: number;
}

/**
 * Configuration for index generation operations
 */
export interface IndexGenerationConfig {
  /** Root directory containing entity type subdirectories */
  rootPath: string;
  /** Entity types to include (default: all) */
  entityTypes?: EntityType[];
  /** Whether to extract basic info from entity files */
  extractBasicInfo: boolean;
  /** Whether to compute detailed statistics */
  computeStats: boolean;
  /** Maximum file size to process (in bytes) */
  maxFileSize: number;
  /** Timeout for processing a single file (in milliseconds) */
  fileProcessingTimeoutMs: number;
  /** Number of files to process concurrently */
  concurrency: number;
  /** Whether to create backup of existing indexes */
  createBackups: boolean;
  /** Schema version to use for generated indexes */
  schemaVersion: string;
  /** Base API URL for reconstructing original request URLs */
  baseApiUrl?: string;
}

/**
 * Progress information for long-running index operations
 */
export interface IndexGenerationProgress {
  /** Current operation being performed */
  operation: 'scanning' | 'processing' | 'validating' | 'writing' | 'complete';
  /** Entity type currently being processed */
  currentEntityType: EntityType;
  /** Number of files processed so far */
  filesProcessed: number;
  /** Total number of files to process */
  totalFiles: number;
  /** Progress percentage (0-100) */
  progressPercent: number;
  /** Current file being processed */
  currentFile?: string;
  /** Estimated time remaining in milliseconds */
  estimatedRemainingMs?: number;
  /** Processing speed (files per second) */
  processingSpeed: number;
  /** Memory usage during processing */
  memoryUsageMB: number;
  /** Errors encountered so far */
  errorsEncountered: number;
}

/**
 * Result of index generation operation
 */
export interface IndexGenerationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Generated indexes by entity type */
  generatedIndexes: Record<EntityType, string>;
  /** Master index path (if generated) */
  masterIndexPath?: string;
  /** Operation statistics */
  stats: {
    /** Total processing time in milliseconds */
    totalDurationMs: number;
    /** Total files processed */
    filesProcessed: number;
    /** Total entities indexed */
    entitiesIndexed: number;
    /** Total data size processed */
    dataSizeProcessed: number;
    /** Errors encountered during processing */
    errors: number;
    /** Warnings generated during processing */
    warnings: number;
  };
  /** Error details if operation failed */
  error?: {
    /** Error message */
    message: string;
    /** Error code */
    code: string;
    /** Stack trace */
    stack?: string;
    /** Context information */
    context?: Record<string, unknown>;
  };
}

/**
 * File reference with metadata for path-based indexes
 */
export interface PathFileReference {
  /** JSON reference to the data file */
  $ref: string;
  /** File modification timestamp */
  lastModified: string;
  /** Content hash for integrity verification */
  contentHash?: string;
  /** Original API request URL */
  url?: string;
}

/**
 * Directory reference with metadata for hierarchical indexes
 */
export interface PathDirectoryReference {
  /** JSON reference to the subdirectory */
  $ref: string;
  /** Directory modification timestamp */
  lastModified: string;
}

/**
 * Path-based entity type index structure
 * Maps entity IDs to their corresponding JSON files
 */
export interface PathEntityTypeIndex {
  /** Index generation timestamp */
  lastUpdated: string;
  /** Path this index represents (e.g., "/authors") */
  path: string;
  /** Map of entity IDs to file references */
  responses: Record<string, PathFileReference>;
}

/**
 * Hierarchical directory index structure
 * Used for all directory levels in the cache hierarchy
 */
export interface PathDirectoryIndex {
  /** Index generation timestamp */
  lastUpdated: string;
  /** Path this index represents (e.g., "/authors/A123/queries") */
  path: string;
  /** Map of file names to file references */
  files: Record<string, PathFileReference>;
  /** Map of directory names to directory references */
  directories: Record<string, PathDirectoryReference>;
}

/**
 * Path-based root index structure
 * Maps entity type paths to their corresponding directories
 */
export interface PathRootIndex {
  /** Index generation timestamp */
  lastUpdated: string;
  /** Root path this index represents (e.g., "/") */
  path: string;
  /** Map of entity type paths to directory references */
  paths: Record<string, PathDirectoryReference>;
}

/**
 * Schema version constant for compatibility checking
 */
export const CURRENT_SCHEMA_VERSION = '1.0.0';

/**
 * Default configuration values
 */
export const DEFAULT_INDEX_CONFIG: Readonly<IndexGenerationConfig> = {
  rootPath: '',
  extractBasicInfo: true,
  computeStats: true,
  maxFileSize: 50 * 1024 * 1024, // 50MB
  fileProcessingTimeoutMs: 30000,  // 30 seconds
  concurrency: 4,
  createBackups: true,
  schemaVersion: CURRENT_SCHEMA_VERSION,
  baseApiUrl: 'https://api.openalex.org',
} as const;