/**
 * Entity Validator Utility
 * 
 * Validates OpenAlex entity data against Zod schemas to detect schema changes,
 * missing fields, unexpected fields, and type mismatches.
 */

import type { ZodError, ZodIssue } from 'zod';

import { entitySchemas } from '@/lib/openalex/schemas/entities.schema';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import type {
  ValidationIssue,
  EntityValidationResult,
  BatchValidationResult,
} from '@/types/entity-validation';
import {
  ValidationIssueType,
  ValidationSeverity,
  generateValidationIssueId,
  generateBatchId,
} from '@/types/entity-validation';

/**
 * Validate a single entity against its schema
 */
export async function validateEntityData(
  entityId: string,
  entityType: EntityType,
  entityData: unknown,
  entityDisplayName?: string
): Promise<EntityValidationResult> {
  const startTime = Date.now();
  const issues: ValidationIssue[] = [];
  
  try {
    // Get the appropriate schema for this entity type
    const schema = getSchemaForEntityType(entityType);
    if (!schema) {
      throw new Error(`No validation schema found for entity type: ${entityType}`);
    }
    
    // Validate the entity data
    const result = schema.safeParse(entityData);
    
    if (!result.success) {
      // Convert Zod errors to validation issues
      const zodIssues = convertZodErrorToValidationIssues(
        result.error,
        entityId,
        entityType,
        entityDisplayName
      );
      issues.push(...zodIssues);
    } else {
      // Check for extra fields that weren't caught by passthrough
      const extraFieldIssues = detectExtraFields(
        entityData,
        result.data,
        entityId,
        entityType,
        entityDisplayName
      );
      issues.push(...extraFieldIssues);
    }
    
    const endTime = Date.now();
    
    // Count issues by severity
    const issueCounts = {
      errors: issues.filter(i => i.severity === ValidationSeverity.ERROR).length,
      warnings: issues.filter(i => i.severity === ValidationSeverity.WARNING).length,
      info: issues.filter(i => i.severity === ValidationSeverity.INFO).length,
    };
    
    return {
      entityId,
      entityType,
      entityDisplayName,
      isValid: issueCounts.errors === 0,
      issues,
      issueCounts,
      validatedAt: new Date().toISOString(),
      validationDurationMs: endTime - startTime,
    };
    
  } catch (error) {
    const endTime = Date.now();
    
    // Create a validation issue for the validation error itself
    const validationErrorIssue: ValidationIssue = {
      id: generateValidationIssueId(entityId, '_validation', ValidationIssueType.TYPE_MISMATCH),
      entityId,
      entityType,
      issueType: ValidationIssueType.TYPE_MISMATCH,
      severity: ValidationSeverity.ERROR,
      fieldPath: '_validation',
      description: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date().toISOString(),
      entityDisplayName,
    };
    
    return {
      entityId,
      entityType,
      entityDisplayName,
      isValid: false,
      issues: [validationErrorIssue],
      issueCounts: { errors: 1, warnings: 0, info: 0 },
      validatedAt: new Date().toISOString(),
      validationDurationMs: endTime - startTime,
    };
  }
}

/**
 * Validate multiple entities in a batch
 */
export async function validateEntitiesBatch(
  entities: Array<{ id: string; type: EntityType; data: unknown; displayName?: string }>
): Promise<BatchValidationResult> {
  const batchId = generateBatchId();
  const startTime = Date.now();
  
  // Validate each entity
  const results = await Promise.all(
    entities.map(entity => 
      validateEntityData(entity.id, entity.type, entity.data, entity.displayName)
    )
  );
  
  const endTime = Date.now();
  
  // Calculate summary statistics
  const summary = calculateBatchSummary(results);
  
  return {
    batchId,
    startedAt: new Date(startTime).toISOString(),
    completedAt: new Date(endTime).toISOString(),
    durationMs: endTime - startTime,
    results,
    summary,
  };
}

/**
 * Get the appropriate Zod schema for an entity type
 */
function getSchemaForEntityType(entityType: EntityType) {
  switch (entityType) {
    case EntityType.WORK:
      return entitySchemas.work;
    case EntityType.AUTHOR:
      return entitySchemas.author;
    case EntityType.SOURCE:
      return entitySchemas.source;
    case EntityType.INSTITUTION:
      return entitySchemas.institution;
    case EntityType.PUBLISHER:
      return entitySchemas.publisher;
    case EntityType.FUNDER:
      return entitySchemas.funder;
    case EntityType.TOPIC:
      return entitySchemas.topic;
    case EntityType.CONCEPT:
      return entitySchemas.concept;
    default:
      return null;
  }
}

/**
 * Convert Zod validation errors to validation issues
 */
function convertZodErrorToValidationIssues(
  zodError: ZodError,
  entityId: string,
  entityType: EntityType,
  entityDisplayName?: string
): ValidationIssue[] {
  return zodError.issues.map(issue => convertZodIssueToValidationIssue(
    issue,
    entityId,
    entityType,
    entityDisplayName
  ));
}

/**
 * Convert a single Zod issue to a validation issue
 */
function convertZodIssueToValidationIssue(
  zodIssue: ZodIssue,
  entityId: string,
  entityType: EntityType,
  entityDisplayName?: string
): ValidationIssue {
  const fieldPath = zodIssue.path.join('.');
  let issueType: ValidationIssueType;
  let severity: ValidationSeverity;
  let description: string;
  
  // Determine issue type and severity based on Zod issue code
  switch (zodIssue.code) {
    case 'invalid_type':
      issueType = ValidationIssueType.TYPE_MISMATCH;
      severity = ValidationSeverity.WARNING;
      description = `Expected ${zodIssue.expected} but received ${
        'received' in zodIssue ? zodIssue.received : 'unknown'
      }`;
      break;
      
    case 'unrecognized_keys':
      issueType = ValidationIssueType.EXTRA_FIELD;
      severity = ValidationSeverity.INFO;
      description = `Unexpected field(s): ${
        'keys' in zodIssue ? (zodIssue.keys as string[])?.join(', ') : 'unknown'
      }`;
      break;
      
    case 'too_small':
    case 'too_big':
      issueType = ValidationIssueType.VALUE_OUT_OF_RANGE;
      severity = ValidationSeverity.WARNING;
      description = zodIssue.message;
      break;
      
    case 'custom':
      issueType = ValidationIssueType.TYPE_MISMATCH;
      severity = ValidationSeverity.WARNING;
      description = zodIssue.message;
      break;
      
    default:
      issueType = ValidationIssueType.TYPE_MISMATCH;
      severity = ValidationSeverity.WARNING;
      description = zodIssue.message;
  }
  
  // Check if this is a required field issue
  if (zodIssue.code === 'invalid_type' && 'received' in zodIssue && zodIssue.received === 'undefined') {
    issueType = ValidationIssueType.MISSING_FIELD;
    severity = ValidationSeverity.WARNING;
    description = `Required field is missing`;
  }
  
  return {
    id: generateValidationIssueId(entityId, fieldPath, issueType),
    entityId,
    entityType,
    issueType,
    severity,
    fieldPath,
    expectedType: 'expected' in zodIssue ? String(zodIssue.expected) : undefined,
    actualType: 'received' in zodIssue ? String(zodIssue.received) : undefined,
    actualValue: truncateValue(zodIssue.path.length > 0 ? getNestedValue(zodIssue, zodIssue.path.map(p => String(p))) : undefined),
    description,
    timestamp: new Date().toISOString(),
    entityDisplayName,
  };
}

/**
 * Detect extra fields that passed through Zod validation
 */
function detectExtraFields(
  originalData: unknown,
  validatedData: unknown,
  entityId: string,
  entityType: EntityType,
  entityDisplayName?: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  if (!originalData || typeof originalData !== 'object' || !validatedData || typeof validatedData !== 'object') {
    return issues;
  }
  
  // Find fields in original data that don't exist in validated data
  const originalKeys = new Set(Object.keys(originalData as Record<string, unknown>));
  const validatedKeys = new Set(Object.keys(validatedData as Record<string, unknown>));
  
  // Note: With passthrough(), extra fields should be preserved
  // This is more for detecting fields that were transformed or removed
  for (const key of originalKeys) {
    if (!validatedKeys.has(key)) {
      issues.push({
        id: generateValidationIssueId(entityId, key, ValidationIssueType.EXTRA_FIELD),
        entityId,
        entityType,
        issueType: ValidationIssueType.EXTRA_FIELD,
        severity: ValidationSeverity.INFO,
        fieldPath: key,
        description: `Field was not recognized by schema`,
        timestamp: new Date().toISOString(),
        entityDisplayName,
        actualValue: truncateValue((originalData as Record<string, unknown>)[key]),
      });
    }
  }
  
  return issues;
}

/**
 * Calculate summary statistics for a batch of validation results
 */
function calculateBatchSummary(results: EntityValidationResult[]) {
  const allIssues = results.flatMap(r => r.issues);
  
  // Count issues by type
  const issuesByType: Record<ValidationIssueType, number> = {
    [ValidationIssueType.MISSING_FIELD]: 0,
    [ValidationIssueType.EXTRA_FIELD]: 0,
    [ValidationIssueType.TYPE_MISMATCH]: 0,
    [ValidationIssueType.INVALID_FORMAT]: 0,
    [ValidationIssueType.VALUE_OUT_OF_RANGE]: 0,
  };
  
  // Count issues by severity
  const issuesBySeverity: Record<ValidationSeverity, number> = {
    [ValidationSeverity.ERROR]: 0,
    [ValidationSeverity.WARNING]: 0,
    [ValidationSeverity.INFO]: 0,
  };
  
  // Count issues by entity type - initialize with all entity types to ensure complete Record
  const issuesByEntityType: Record<EntityType, number> = {
    [EntityType.WORK]: 0,
    [EntityType.AUTHOR]: 0,
    [EntityType.SOURCE]: 0,
    [EntityType.INSTITUTION]: 0,
    [EntityType.PUBLISHER]: 0,
    [EntityType.FUNDER]: 0,
    [EntityType.TOPIC]: 0,
    [EntityType.CONCEPT]: 0,
    [EntityType.KEYWORD]: 0,
    [EntityType.CONTINENT]: 0,
    [EntityType.REGION]: 0,
  };
  
  for (const issue of allIssues) {
    issuesByType[issue.issueType]++;
    issuesBySeverity[issue.severity]++;
    issuesByEntityType[issue.entityType]++;
  }
  
  return {
    totalEntities: results.length,
    validEntities: results.filter(r => r.isValid).length,
    entitiesWithErrors: results.filter(r => r.issueCounts.errors > 0).length,
    entitiesWithWarnings: results.filter(r => r.issueCounts.warnings > 0).length,
    totalIssues: allIssues.length,
    issuesByType,
    issuesBySeverity,
    issuesByEntityType,
  };
}

/**
 * Get nested value from object using path array
 */
function getNestedValue(obj: unknown, path: (string | number)[]): unknown {
  let current = obj;
  for (const key of path) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string | number, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Truncate long values for display purposes
 */
function truncateValue(value: unknown, maxLength = 100): unknown {
  if (typeof value === 'string' && value.length > maxLength) {
    return value.substring(0, maxLength) + '...';
  }
  
  if (Array.isArray(value) && value.length > 5) {
    return [...value.slice(0, 5), `... ${value.length - 5} more items`];
  }
  
  if (typeof value === 'object' && value !== null) {
    const keys = Object.keys(value);
    if (keys.length > 5) {
      const truncated: Record<string, unknown> = {};
      const valueAsRecord = value as Record<string, unknown>;
      for (let i = 0; i < 5; i++) {
        truncated[keys[i]] = valueAsRecord[keys[i]];
      }
      truncated['...'] = `${keys.length - 5} more properties`;
      return truncated;
    }
  }
  
  return value;
}

/**
 * Quick validation check - returns boolean without full validation details
 */
export function quickValidateEntity(entityType: EntityType, entityData: unknown): boolean {
  try {
    const schema = getSchemaForEntityType(entityType);
    if (!schema) return false;
    
    const result = schema.safeParse(entityData);
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Get validation issues count without full validation
 */
export function getEntityIssuesCount(entityType: EntityType, entityData: unknown): number {
  try {
    const schema = getSchemaForEntityType(entityType);
    if (!schema) return 1; // Schema not found counts as 1 issue
    
    const result = schema.safeParse(entityData);
    return result.success ? 0 : result.error.issues.length;
  } catch {
    return 1; // Validation error counts as 1 issue
  }
}