/**
 * Entity Validation Types
 * 
 * Defines types for tracking validation issues when checking OpenAlex entities
 * against expected schemas. Used to report missing fields, unexpected fields,
 * and type mismatches for data quality monitoring.
 */

import { EntityType } from '@/lib/openalex/utils/entity-detection';

/**
 * Types of validation issues that can be detected
 */
export enum ValidationIssueType {
  /** Required field is missing from entity */
  MISSING_FIELD = 'missing_field',
  /** Unexpected field found in entity */
  EXTRA_FIELD = 'extra_field',
  /** Field has wrong type (string instead of number, etc.) */
  TYPE_MISMATCH = 'type_mismatch',
  /** Field has invalid format (invalid date, URL, etc.) */
  INVALID_FORMAT = 'invalid_format',
  /** Field value is outside expected range */
  VALUE_OUT_OF_RANGE = 'value_out_of_range'
}

/**
 * Severity levels for validation issues
 */
export enum ValidationSeverity {
  /** Critical issue that indicates data corruption */
  ERROR = 'error',
  /** Issue that might indicate schema changes */
  WARNING = 'warning',
  /** Minor issue for information only */
  INFO = 'info'
}

/**
 * Individual validation issue detected in an entity
 */
export interface ValidationIssue {
  /** Unique identifier for this issue */
  id: string;
  /** Entity ID where issue was found */
  entityId: string;
  /** Type of entity */
  entityType: EntityType;
  /** Type of validation issue */
  issueType: ValidationIssueType;
  /** Severity level */
  severity: ValidationSeverity;
  /** JSON path to the problematic field (e.g., 'authorships.0.author.id') */
  fieldPath: string;
  /** Expected type or format for the field */
  expectedType?: string;
  /** Actual type found */
  actualType?: string;
  /** Actual value found (truncated if too long) */
  actualValue?: unknown;
  /** Expected value or pattern */
  expectedValue?: unknown;
  /** Human-readable description of the issue */
  description: string;
  /** When the issue was detected */
  timestamp: string;
  /** Display name of the entity (for UI purposes) */
  entityDisplayName?: string;
  /** URL to the entity page */
  entityUrl?: string;
}

/**
 * Result of validating a single entity
 */
export interface EntityValidationResult {
  /** Entity ID that was validated */
  entityId: string;
  /** Entity type */
  entityType: EntityType;
  /** Entity display name */
  entityDisplayName?: string;
  /** Whether validation passed (no errors) */
  isValid: boolean;
  /** All issues found (errors, warnings, info) */
  issues: ValidationIssue[];
  /** Count of issues by severity */
  issueCounts: {
    errors: number;
    warnings: number;
    info: number;
  };
  /** When validation was performed */
  validatedAt: string;
  /** Time taken to validate (milliseconds) */
  validationDurationMs: number;
}

/**
 * Batch validation results for multiple entities
 */
export interface BatchValidationResult {
  /** Unique ID for this validation batch */
  batchId: string;
  /** When validation started */
  startedAt: string;
  /** When validation completed */
  completedAt: string;
  /** Total time taken (milliseconds) */
  durationMs: number;
  /** Results for individual entities */
  results: EntityValidationResult[];
  /** Summary statistics */
  summary: {
    /** Total entities validated */
    totalEntities: number;
    /** Entities with no issues */
    validEntities: number;
    /** Entities with errors */
    entitiesWithErrors: number;
    /** Entities with warnings */
    entitiesWithWarnings: number;
    /** Total issues found */
    totalIssues: number;
    /** Issues by type */
    issuesByType: Record<ValidationIssueType, number>;
    /** Issues by severity */
    issuesBySeverity: Record<ValidationSeverity, number>;
    /** Issues by entity type */
    issuesByEntityType: Record<EntityType, number>;
  };
}

/**
 * Persistent validation log entry
 */
export interface ValidationLogEntry {
  /** Unique identifier for this log entry */
  id: string;
  /** All validation results in this log entry */
  batchResult: BatchValidationResult;
  /** Metadata about the validation run */
  metadata: {
    /** Source of validation (manual, automatic, api_response) */
    source: 'manual' | 'automatic' | 'api_response';
    /** User who triggered validation (if manual) */
    triggeredBy?: string;
    /** Context that triggered validation */
    context?: string;
    /** Version of validation schemas used */
    schemaVersion?: string;
  };
}

/**
 * Validation filter options for querying/displaying issues
 */
export interface ValidationFilter {
  /** Filter by entity types */
  entityTypes?: EntityType[];
  /** Filter by issue types */
  issueTypes?: ValidationIssueType[];
  /** Filter by severity levels */
  severities?: ValidationSeverity[];
  /** Filter by entity IDs */
  entityIds?: string[];
  /** Filter by field paths */
  fieldPaths?: string[];
  /** Date range filter */
  dateRange?: {
    from: string;
    to: string;
  };
  /** Text search in descriptions */
  searchText?: string;
  /** Maximum number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Export format options for validation data
 */
export enum ValidationExportFormat {
  /** JSON format with full details */
  JSON = 'json',
  /** CSV format for spreadsheets */
  CSV = 'csv',
  /** Markdown report format */
  MARKDOWN = 'markdown',
  /** Excel format */
  XLSX = 'xlsx'
}

/**
 * Export configuration
 */
export interface ValidationExportConfig {
  /** Export format */
  format: ValidationExportFormat;
  /** Filters to apply before export */
  filters?: ValidationFilter;
  /** Include entity details in export */
  includeEntityDetails?: boolean;
  /** Include validation statistics */
  includeStatistics?: boolean;
  /** Group by entity type */
  groupByEntityType?: boolean;
  /** Sort by field */
  sortBy?: 'timestamp' | 'severity' | 'entityType' | 'issueType';
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
}

/**
 * Validation settings/preferences
 */
export interface ValidationSettings {
  /** Whether validation is enabled */
  enabled: boolean;
  /** Automatically validate on entity load */
  autoValidateOnLoad: boolean;
  /** Show validation indicators in UI */
  showValidationIndicators: boolean;
  /** Show warnings (or only errors) */
  showWarnings: boolean;
  /** Show info messages */
  showInfo: boolean;
  /** Maximum number of log entries to keep */
  maxLogEntries: number;
  /** Severity threshold for notifications */
  notificationThreshold: ValidationSeverity;
  /** Fields to exclude from validation */
  excludedFields: string[];
  /** Entity types to validate */
  validatedEntityTypes: EntityType[];
}

/**
 * Validation statistics for dashboard
 */
export interface ValidationStatistics {
  /** Total validation runs */
  totalValidationRuns: number;
  /** Total entities validated */
  totalEntitiesValidated: number;
  /** Total issues found */
  totalIssuesFound: number;
  /** Most common issue types */
  commonIssueTypes: Array<{
    issueType: ValidationIssueType;
    count: number;
    percentage: number;
  }>;
  /** Most problematic entity types */
  problematicEntityTypes: Array<{
    entityType: EntityType;
    errorCount: number;
    warningCount: number;
    totalCount: number;
  }>;
  /** Trend data over time */
  trends: Array<{
    date: string;
    validationRuns: number;
    issuesFound: number;
    entitiesValidated: number;
  }>;
  /** Recent validation activity */
  recentActivity: Array<{
    timestamp: string;
    entityId: string;
    entityType: EntityType;
    issueCount: number;
    severity: ValidationSeverity;
  }>;
}

/**
 * Type guards for runtime type checking
 */
export function isValidationIssue(obj: unknown): obj is ValidationIssue {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'entityId' in obj &&
    'issueType' in obj &&
    'severity' in obj &&
    'fieldPath' in obj
  );
}

export function isEntityValidationResult(obj: unknown): obj is EntityValidationResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'entityId' in obj &&
    'entityType' in obj &&
    'isValid' in obj &&
    'issues' in obj &&
    Array.isArray((obj as Record<string, unknown>).issues)
  );
}

/**
 * Default validation settings
 */
export const DEFAULT_VALIDATION_SETTINGS: ValidationSettings = {
  enabled: true,
  autoValidateOnLoad: false,
  showValidationIndicators: true,
  showWarnings: true,
  showInfo: false,
  maxLogEntries: 100,
  notificationThreshold: ValidationSeverity.WARNING,
  excludedFields: [],
  validatedEntityTypes: [
    EntityType.WORK,
    EntityType.AUTHOR,
    EntityType.SOURCE,
    EntityType.INSTITUTION,
    EntityType.PUBLISHER,
    EntityType.FUNDER,
    EntityType.TOPIC,
    EntityType.CONCEPT
  ]
};

/**
 * Utility functions
 */

/**
 * Generate a unique ID for validation issues
 */
export function generateValidationIssueId(
  entityId: string,
  fieldPath: string,
  issueType: ValidationIssueType
): string {
  return `${entityId}_${fieldPath}_${issueType}_${Date.now()}`;
}

/**
 * Generate a unique ID for validation batches
 */
export function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get display color for validation severity
 */
export function getValidationSeverityColor(severity: ValidationSeverity): string {
  switch (severity) {
    case ValidationSeverity.ERROR:
      return 'red';
    case ValidationSeverity.WARNING:
      return 'orange';
    case ValidationSeverity.INFO:
      return 'blue';
    default:
      return 'gray';
  }
}

/**
 * Get display icon for validation issue type
 */
export function getValidationIssueTypeIcon(issueType: ValidationIssueType): string {
  switch (issueType) {
    case ValidationIssueType.MISSING_FIELD:
      return 'exclamation-circle';
    case ValidationIssueType.EXTRA_FIELD:
      return 'plus-circle';
    case ValidationIssueType.TYPE_MISMATCH:
      return 'x-circle';
    case ValidationIssueType.INVALID_FORMAT:
      return 'alert-triangle';
    case ValidationIssueType.VALUE_OUT_OF_RANGE:
      return 'alert-circle';
    default:
      return 'help-circle';
  }
}