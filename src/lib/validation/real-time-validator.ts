/**
 * Real-Time Validator
 * 
 * Provides real-time validation with user feedback, debouncing, caching,
 * and comprehensive error formatting for accessibility.
 */

// Removed unused imports: z, entitySchemas
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import type {
  ValidationIssue,
  EntityValidationResult,
} from '@/types/entity-validation';
import {
  ValidationIssueType,
  ValidationSeverity,
  generateValidationIssueId,
} from '@/types/entity-validation';

// Configuration interfaces
interface RealTimeValidatorConfig {
  debounceMs?: number;
  enableRealTimeValidation?: boolean;
  validateOnBlur?: boolean;
  showErrorsInRealTime?: boolean;
  cacheResults?: boolean;
  timeout?: number;
}

interface FieldValidationOptions {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  format?: 'url' | 'email' | 'openalex_id' | 'date' | 'iso_date';
  min?: number;
  max?: number;
  schema?: string;
  entityType: EntityType;
}

interface FieldValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  fieldPath: string;
  value: unknown;
}

interface CrossFieldConsistencyResult {
  isValid: boolean;
  issues: ValidationIssue[];
  checkedFields: string[];
}

interface SchemaViolationResult {
  issues: ValidationIssue[];
  deprecatedFields: string[];
  extraFields: string[];
  structuralIssues: string[];
}

interface ErrorFormatOptions {
  userFriendly?: boolean;
  includeFieldPath?: boolean;
  includeFixSuggestions?: boolean;
  groupByField?: boolean;
  groupByType?: boolean;
}

interface AccessibleErrorOptions {
  includeFieldContext?: boolean;
  provideSuggestions?: boolean;
  useSemanticMarkup?: boolean;
}

// Cache for validation results
const validationCache = new Map<string, { result: FieldValidationResult; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

/**
 * Real-time validator class with debouncing and caching
 */
export class RealTimeValidator {
  private config: Required<RealTimeValidatorConfig>;
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private customValidator?: (field: string, value: unknown) => Promise<FieldValidationResult>;

  constructor(config: RealTimeValidatorConfig = {}) {
    this.config = {
      debounceMs: config.debounceMs ?? 300,
      enableRealTimeValidation: config.enableRealTimeValidation ?? true,
      validateOnBlur: config.validateOnBlur ?? true,
      showErrorsInRealTime: config.showErrorsInRealTime ?? true,
      cacheResults: config.cacheResults ?? true,
      timeout: config.timeout ?? 5000,
    };
  }

  /**
   * Set a custom validator function for testing
   */
  setCustomValidator(validator: (field: string, value: unknown) => Promise<FieldValidationResult>) {
    this.customValidator = validator;
  }

  /**
   * Set validation timeout
   */
  setTimeout(timeoutMs: number) {
    this.config.timeout = timeoutMs;
  }

  /**
   * Validate a field with debouncing
   */
  validateField(fieldPath: string, value: unknown, options?: FieldValidationOptions): Promise<FieldValidationResult> {
    if (!this.config.enableRealTimeValidation) {
      return Promise.resolve({ isValid: true, issues: [], fieldPath, value });
    }

    return new Promise((resolve) => {
      // Clear existing timer
      const existingTimer = this.debounceTimers.get(fieldPath);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer
      const timer = setTimeout(async () => {
        this.debounceTimers.delete(fieldPath);
        
        try {
          const result = await this.performValidation(fieldPath, value, options);
          resolve(result);
        } catch (error) {
          resolve({
            isValid: false,
            issues: [{
              id: generateValidationIssueId('validation', fieldPath, ValidationIssueType.TYPE_MISMATCH),
              entityId: 'validation',
              entityType: options?.entityType || EntityType.WORK,
              issueType: ValidationIssueType.TYPE_MISMATCH,
              severity: ValidationSeverity.ERROR,
              fieldPath,
              description: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
              timestamp: new Date().toISOString(),
            }],
            fieldPath,
            value,
          });
        }
      }, this.config.debounceMs);

      this.debounceTimers.set(fieldPath, timer);
    });
  }

  /**
   * Perform the actual validation with caching and timeout
   */
  private async performValidation(
    fieldPath: string,
    value: unknown,
    options?: FieldValidationOptions
  ): Promise<FieldValidationResult> {
    // Check cache first
    if (this.config.cacheResults) {
      const cacheKey = `${fieldPath}:${JSON.stringify(value)}:${JSON.stringify(options)}`;
      const cached = validationCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.result;
      }
    }

    // Use custom validator if set (for testing)
    if (this.customValidator) {
      return this.customValidator(fieldPath, value);
    }

    // Wrap validation in timeout
    const validationPromise = this.validateFieldInternal(fieldPath, value, options);
    const timeoutPromise = new Promise<FieldValidationResult>((_, reject) => {
      setTimeout(() => reject(new Error('Validation timeout')), this.config.timeout);
    });

    try {
      const result = await Promise.race([validationPromise, timeoutPromise]);
      
      // Cache the result
      if (this.config.cacheResults) {
        const cacheKey = `${fieldPath}:${JSON.stringify(value)}:${JSON.stringify(options)}`;
        validationCache.set(cacheKey, { result, timestamp: Date.now() });
      }

      return result;
    } catch (error) {
      if (error instanceof Error && error.message === 'Validation timeout') {
        return {
          isValid: false,
          issues: [{
            id: generateValidationIssueId('timeout', fieldPath, ValidationIssueType.TYPE_MISMATCH),
            entityId: 'timeout',
            entityType: options?.entityType || EntityType.WORK,
            issueType: ValidationIssueType.TYPE_MISMATCH,
            severity: ValidationSeverity.ERROR,
            fieldPath,
            description: 'Validation timeout - operation took too long',
            timestamp: new Date().toISOString(),
          }],
          fieldPath,
          value,
        };
      }
      throw error;
    }
  }

  /**
   * Internal validation logic
   */
  private async validateFieldInternal(
    fieldPath: string,
    value: unknown,
    options?: FieldValidationOptions
  ): Promise<FieldValidationResult> {
    const issues: ValidationIssue[] = [];
    const entityType = options?.entityType || EntityType.WORK;

    // Check required fields
    if (options?.required && (value === undefined || value === null || value === '')) {
      issues.push({
        id: generateValidationIssueId('required', fieldPath, ValidationIssueType.MISSING_FIELD),
        entityId: 'required',
        entityType,
        issueType: ValidationIssueType.MISSING_FIELD,
        severity: ValidationSeverity.ERROR,
        fieldPath,
        description: 'This field is required',
        timestamp: new Date().toISOString(),
      });
    }

    // Skip further validation if value is empty and not required
    if (!options?.required && (value === undefined || value === null || value === '')) {
      return { isValid: true, issues: [], fieldPath, value };
    }

    // Type validation
    if (options?.type && value !== undefined && value !== null) {
      const typeIssue = validateFieldType(fieldPath, value, options.type, entityType);
      if (typeIssue) issues.push(typeIssue);
    }

    // Format validation
    if (options?.format && typeof value === 'string' && value.length > 0) {
      const formatIssue = validateFieldFormat(fieldPath, value, options.format, entityType);
      if (formatIssue) issues.push(formatIssue);
    }

    // Range validation
    if (options?.min !== undefined || options?.max !== undefined) {
      const rangeIssue = validateFieldRange(fieldPath, value, entityType, options.min, options.max);
      if (rangeIssue) issues.push(rangeIssue);
    }

    // Schema validation for complex objects
    if (options?.schema && typeof value === 'object') {
      const schemaIssues = await validateFieldSchema(fieldPath, value, options.schema, entityType);
      issues.push(...schemaIssues);
    }

    return {
      isValid: issues.length === 0,
      issues,
      fieldPath,
      value,
    };
  }
}

/**
 * Validate field type
 */
function validateFieldType(
  fieldPath: string,
  value: unknown,
  expectedType: string,
  entityType: EntityType
): ValidationIssue | null {
  const actualType = Array.isArray(value) ? 'array' : typeof value;
  
  if (actualType !== expectedType) {
    return {
      id: generateValidationIssueId('type', fieldPath, ValidationIssueType.TYPE_MISMATCH),
      entityId: 'type',
      entityType,
      issueType: ValidationIssueType.TYPE_MISMATCH,
      severity: ValidationSeverity.WARNING,
      fieldPath,
      expectedType,
      actualType,
      actualValue: value,
      description: `Expected ${expectedType} but received ${actualType}`,
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Validate field format
 */
function validateFieldFormat(
  fieldPath: string,
  value: string,
  format: string,
  entityType: EntityType
): ValidationIssue | null {
  let isValid = true;
  let description = '';

  switch (format) {
    case 'url':
      try {
        new URL(value);
      } catch {
        isValid = false;
        description = 'Please enter a valid URL (e.g., https://example.com)';
      }
      break;

    case 'email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        isValid = false;
        description = 'Please enter a valid email address';
      }
      break;
    }

    case 'openalex_id': {
      const openAlexRegex = /^[WASIPFTCKRN]\d{7,10}$/;
      if (!openAlexRegex.test(value)) {
        isValid = false;
        description = 'OpenAlex ID format is incorrect - should start with a letter (W, A, S, etc.) followed by 7-10 digits';
      }
      break;
    }

    case 'date':
    case 'iso_date':
      if (isNaN(Date.parse(value))) {
        isValid = false;
        description = 'Please enter a valid date';
      }
      break;

    default:
      return null; // Unknown format, skip validation
  }

  if (!isValid) {
    return {
      id: generateValidationIssueId('format', fieldPath, ValidationIssueType.INVALID_FORMAT),
      entityId: 'format',
      entityType,
      issueType: ValidationIssueType.INVALID_FORMAT,
      severity: ValidationSeverity.WARNING,
      fieldPath,
      actualValue: value,
      description,
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Validate field range
 */
function validateFieldRange(
  fieldPath: string,
  value: unknown,
  entityType: EntityType,
  min?: number,
  max?: number
): ValidationIssue | null {
  if (typeof value !== 'number') return null;

  if (min !== undefined && value < min) {
    return {
      id: generateValidationIssueId('range', fieldPath, ValidationIssueType.VALUE_OUT_OF_RANGE),
      entityId: 'range',
      entityType,
      issueType: ValidationIssueType.VALUE_OUT_OF_RANGE,
      severity: ValidationSeverity.WARNING,
      fieldPath,
      actualValue: value,
      description: `Value must be at least ${min}`,
      timestamp: new Date().toISOString(),
    };
  }

  if (max !== undefined && value > max) {
    return {
      id: generateValidationIssueId('range', fieldPath, ValidationIssueType.VALUE_OUT_OF_RANGE),
      entityId: 'range',
      entityType,
      issueType: ValidationIssueType.VALUE_OUT_OF_RANGE,
      severity: ValidationSeverity.WARNING,
      fieldPath,
      actualValue: value,
      description: `Value must be at most ${max}`,
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Validate field against schema
 */
async function validateFieldSchema(
  fieldPath: string,
  value: unknown,
  schemaName: string,
  entityType: EntityType
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  
  if (typeof value !== 'object' || value === null) {
    return issues;
  }

  const entityId = 'schema';
  
  switch (schemaName) {
    case 'authorship': {
      const authorship = value as Record<string, unknown>;
      
      // Validate author field
      if (!authorship.author || typeof authorship.author !== 'object') {
        issues.push({
          id: generateValidationIssueId(entityId, `${fieldPath}.author`, ValidationIssueType.MISSING_FIELD),
          entityId,
          entityType,
          issueType: ValidationIssueType.MISSING_FIELD,
          severity: ValidationSeverity.ERROR,
          fieldPath: `${fieldPath}.author`,
          description: 'Author information is required',
          timestamp: new Date().toISOString(),
        });
      } else {
        const author = authorship.author as Record<string, unknown>;
        
        // Check author ID
        if (!author.id || typeof author.id !== 'string') {
          issues.push({
            id: generateValidationIssueId(entityId, `${fieldPath}.author.id`, ValidationIssueType.MISSING_FIELD),
            entityId,
            entityType,
            issueType: ValidationIssueType.MISSING_FIELD,
            severity: ValidationSeverity.ERROR,
            fieldPath: `${fieldPath}.author.id`,
            description: 'Author ID is required',
            timestamp: new Date().toISOString(),
          });
        }
        
        // Check author display_name
        if (!author.display_name || typeof author.display_name !== 'string') {
          issues.push({
            id: generateValidationIssueId(entityId, `${fieldPath}.author.display_name`, ValidationIssueType.MISSING_FIELD),
            entityId,
            entityType,
            issueType: ValidationIssueType.MISSING_FIELD,
            severity: ValidationSeverity.ERROR,
            fieldPath: `${fieldPath}.author.display_name`,
            description: 'Author name is required',
            timestamp: new Date().toISOString(),
          });
        }
      }
      
      // Validate institutions field
      if (authorship.institutions && !Array.isArray(authorship.institutions)) {
        issues.push({
          id: generateValidationIssueId(entityId, `${fieldPath}.institutions`, ValidationIssueType.TYPE_MISMATCH),
          entityId,
          entityType,
          issueType: ValidationIssueType.TYPE_MISMATCH,
          severity: ValidationSeverity.ERROR,
          fieldPath: `${fieldPath}.institutions`,
          expectedType: 'array',
          actualType: typeof authorship.institutions,
          description: 'Institutions must be an array',
          timestamp: new Date().toISOString(),
        });
      }
      break;
    }
    
    default:
      // Unknown schema, skip validation
      break;
  }
  
  return issues;
}

/**
 * Standalone function for field validation (for compatibility)
 */
export async function validateField(
  fieldPath: string,
  value: unknown,
  options: FieldValidationOptions
): Promise<FieldValidationResult> {
  const validator = new RealTimeValidator();
  return validator.validateField(fieldPath, value, options);
}

/**
 * Validate entity integrity
 */
export async function validateEntityIntegrity(
  entityData: unknown,
  entityType: EntityType
): Promise<EntityValidationResult> {
  const issues: ValidationIssue[] = [];
  const entityId = typeof entityData === 'object' && entityData !== null && 'id' in entityData 
    ? String((entityData as Record<string, unknown>).id)
    : 'unknown';

  // Handle null/undefined entities
  if (entityData === null) {
    return {
      entityId,
      entityType,
      isValid: false,
      issues: [{
        id: generateValidationIssueId(entityId, '_entity', ValidationIssueType.TYPE_MISMATCH),
        entityId,
        entityType,
        issueType: ValidationIssueType.TYPE_MISMATCH,
        severity: ValidationSeverity.ERROR,
        fieldPath: '_entity',
        description: 'Entity data is null',
        timestamp: new Date().toISOString(),
      }],
      issueCounts: { errors: 1, warnings: 0, info: 0 },
      validatedAt: new Date().toISOString(),
      validationDurationMs: 0,
    };
  }

  if (entityData === undefined) {
    return {
      entityId,
      entityType,
      isValid: false,
      issues: [{
        id: generateValidationIssueId(entityId, '_entity', ValidationIssueType.MISSING_FIELD),
        entityId,
        entityType,
        issueType: ValidationIssueType.MISSING_FIELD,
        severity: ValidationSeverity.ERROR,
        fieldPath: '_entity',
        description: 'Entity data is missing',
        timestamp: new Date().toISOString(),
      }],
      issueCounts: { errors: 1, warnings: 0, info: 0 },
      validatedAt: new Date().toISOString(),
      validationDurationMs: 0,
    };
  }

  // Handle circular references
  if (hasCircularReferences(entityData)) {
    issues.push({
      id: generateValidationIssueId(entityId, '_structure', ValidationIssueType.TYPE_MISMATCH),
      entityId,
      entityType,
      issueType: ValidationIssueType.TYPE_MISMATCH,
      severity: ValidationSeverity.ERROR,
      fieldPath: '_structure',
      description: 'Entity contains circular references',
      timestamp: new Date().toISOString(),
    });
  }

  // Check for institutional lineage circular references
  if (entityType === EntityType.INSTITUTION && typeof entityData === 'object' && entityData !== null) {
    const institution = entityData as Record<string, unknown>;
    if ('lineage' in institution && Array.isArray(institution.lineage)) {
      const lineage = institution.lineage as string[];
      const institutionId = String(institution.id || '');
      
      if (lineage.includes(institutionId)) {
        issues.push({
          id: generateValidationIssueId(entityId, 'lineage', ValidationIssueType.TYPE_MISMATCH),
          entityId,
          entityType,
          issueType: ValidationIssueType.TYPE_MISMATCH,
          severity: ValidationSeverity.ERROR,
          fieldPath: 'lineage',
          description: 'Institution lineage contains circular reference - institution cannot be in its own lineage',
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  // Validate basic structure
  if (typeof entityData !== 'object') {
    issues.push({
      id: generateValidationIssueId(entityId, '_type', ValidationIssueType.TYPE_MISMATCH),
      entityId,
      entityType,
      issueType: ValidationIssueType.TYPE_MISMATCH,
      severity: ValidationSeverity.ERROR,
      fieldPath: '_type',
      description: `Expected object but received ${typeof entityData}`,
      timestamp: new Date().toISOString(),
    });
  } else {
    // Validate required fields based on entity type
    const requiredFields = getRequiredFieldsForEntityType(entityType);
    const entityObj = entityData as Record<string, unknown>;

    for (const field of requiredFields) {
      if (!(field in entityObj) || entityObj[field] === undefined || entityObj[field] === null) {
        issues.push({
          id: generateValidationIssueId(entityId, field, ValidationIssueType.MISSING_FIELD),
          entityId,
          entityType,
          issueType: ValidationIssueType.MISSING_FIELD,
          severity: ValidationSeverity.ERROR,
          fieldPath: field,
          description: `Required field is missing`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Check for empty display_name
    if ('display_name' in entityObj && typeof entityObj.display_name === 'string' && entityObj.display_name.trim() === '') {
      issues.push({
        id: generateValidationIssueId(entityId, 'display_name', ValidationIssueType.INVALID_FORMAT),
        entityId,
        entityType,
        issueType: ValidationIssueType.INVALID_FORMAT,
        severity: ValidationSeverity.ERROR,
        fieldPath: 'display_name',
        description: 'Display name cannot be empty',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate deeply nested structures
    const nestedIssues = validateNestedStructures(entityObj, entityType, entityId);
    issues.push(...nestedIssues);
  }

  const issueCounts = {
    errors: issues.filter(i => i.severity === ValidationSeverity.ERROR).length,
    warnings: issues.filter(i => i.severity === ValidationSeverity.WARNING).length,
    info: issues.filter(i => i.severity === ValidationSeverity.INFO).length,
  };

  return {
    entityId,
    entityType,
    isValid: issueCounts.errors === 0,
    issues,
    issueCounts,
    validatedAt: new Date().toISOString(),
    validationDurationMs: 0, // Would measure actual time
  };
}

/**
 * Check cross-field consistency
 */
export async function checkCrossFieldConsistency(
  entityData: unknown,
  entityType: EntityType
): Promise<CrossFieldConsistencyResult> {
  const issues: ValidationIssue[] = [];
  const checkedFields: string[] = [];

  if (typeof entityData !== 'object' || entityData === null) {
    return { isValid: true, issues: [], checkedFields: [] };
  }

  const entity = entityData as Record<string, unknown>;
  const entityId = String(entity.id || 'unknown');

  // Check publication year vs publication date consistency
  if ('publication_year' in entity && 'publication_date' in entity) {
    checkedFields.push('publication_year', 'publication_date');
    
    const year = entity.publication_year;
    const date = entity.publication_date;
    
    if (typeof year === 'number' && typeof date === 'string') {
      const dateYear = new Date(date).getFullYear();
      if (!isNaN(dateYear) && year !== dateYear) {
        issues.push({
          id: generateValidationIssueId(entityId, 'publication_consistency', ValidationIssueType.TYPE_MISMATCH),
          entityId,
          entityType,
          issueType: ValidationIssueType.TYPE_MISMATCH,
          severity: ValidationSeverity.WARNING,
          fieldPath: 'publication_year,publication_date',
          description: `Publication year (${year}) doesn't match publication date year (${dateYear})`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  // Check source-type consistency for works
  if (entityType === EntityType.WORK && 'primary_location' in entity && 'type' in entity) {
    checkedFields.push('primary_location', 'type');
    
    const primaryLocation = entity.primary_location as Record<string, unknown> | null;
    const workType = entity.type;
    
    if (primaryLocation && typeof primaryLocation === 'object' && 'source' in primaryLocation) {
      const source = primaryLocation.source as Record<string, unknown> | null;
      
      if (source && typeof source === 'object' && 'type' in source) {
        const sourceType = source.type;
        
        // Check for logical inconsistencies
        if (sourceType === 'journal' && workType === 'book-chapter') {
          issues.push({
            id: generateValidationIssueId(entityId, 'source_type_consistency', ValidationIssueType.TYPE_MISMATCH),
            entityId,
            entityType,
            issueType: ValidationIssueType.TYPE_MISMATCH,
            severity: ValidationSeverity.WARNING,
            fieldPath: 'primary_location.source.type,type',
            description: `Work type "${workType}" is inconsistent with source type "${sourceType}"`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    checkedFields,
  };
}

/**
 * Detect schema violations
 */
export async function detectSchemaViolations(
  entityData: unknown,
  entityType: EntityType
): Promise<SchemaViolationResult> {
  const issues: ValidationIssue[] = [];
  const deprecatedFields: string[] = [];
  const extraFields: string[] = [];
  const structuralIssues: string[] = [];

  if (typeof entityData !== 'object' || entityData === null) {
    return { issues: [], deprecatedFields: [], extraFields: [], structuralIssues: [] };
  }

  const entity = entityData as Record<string, unknown>;
  const entityId = String(entity.id || 'unknown');

  // Check for deprecated fields
  const deprecatedFieldNames = getDeprecatedFieldsForEntityType(entityType);
  for (const field of deprecatedFieldNames) {
    if (field in entity) {
      deprecatedFields.push(field);
      issues.push({
        id: generateValidationIssueId(entityId, field, ValidationIssueType.EXTRA_FIELD),
        entityId,
        entityType,
        issueType: ValidationIssueType.EXTRA_FIELD,
        severity: ValidationSeverity.WARNING,
        fieldPath: field,
        description: `Field '${field}' is deprecated and should not be used`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Check for unexpected extra fields
  const allowedFields = getAllowedFieldsForEntityType(entityType);
  for (const field of Object.keys(entity)) {
    if (!allowedFields.includes(field) && !deprecatedFieldNames.includes(field)) {
      extraFields.push(field);
      issues.push({
        id: generateValidationIssueId(entityId, field, ValidationIssueType.EXTRA_FIELD),
        entityId,
        entityType,
        issueType: ValidationIssueType.EXTRA_FIELD,
        severity: ValidationSeverity.WARNING,
        fieldPath: field,
        description: `Unexpected field '${field}' found in ${entityType} entity`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Check array size constraints
  for (const [field, value] of Object.entries(entity)) {
    if (Array.isArray(value) && value.length > 100) { // Reasonable limit
      issues.push({
        id: generateValidationIssueId(entityId, field, ValidationIssueType.VALUE_OUT_OF_RANGE),
        entityId,
        entityType,
        issueType: ValidationIssueType.VALUE_OUT_OF_RANGE,
        severity: ValidationSeverity.WARNING,
        fieldPath: field,
        description: `Array field '${field}' has too many items (${value.length})`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return { issues, deprecatedFields, extraFields, structuralIssues };
}

/**
 * Format validation errors for user display
 */
export function formatValidationErrors(
  errors: ValidationIssue[],
  options: ErrorFormatOptions = {}
): string {
  if (errors.length === 0) return '';

  const formattedErrors = errors.map(error => {
    let message = error.description;

    // Make technical errors more user-friendly
    if (options.userFriendly) {
      message = makeUserFriendly(error);
    }

    // Include field path if requested
    if (options.includeFieldPath && error.fieldPath !== '_entity') {
      message = `${getFieldDisplayName(error.fieldPath)}: ${message}`;
    }

    // Add fix suggestions
    if (options.includeFixSuggestions) {
      const suggestion = getFixSuggestion(error);
      if (suggestion) {
        message += ` ${suggestion}`;
      }
    }

    return message;
  });

  // Group errors if requested
  if (options.groupByField) {
    const grouped = new Map<string, string[]>();
    
    formattedErrors.forEach((message, index) => {
      const error = errors[index];
      const fieldName = getFieldDisplayName(error.fieldPath);
      
      if (!grouped.has(fieldName)) {
        grouped.set(fieldName, []);
      }
      grouped.get(fieldName)!.push(message.replace(`${fieldName}: `, ''));
    });
    
    const groupedMessages: string[] = [];
    for (const [fieldName, messages] of grouped) {
      if (messages.length === 1) {
        groupedMessages.push(`${fieldName}: ${messages[0]}`);
      } else {
        groupedMessages.push(`${fieldName}: ${messages.join(', ')}`);
      }
    }
    
    return groupedMessages.join('\n');
  }

  if (options.groupByType) {
    const grouped = new Map<ValidationIssueType, string[]>();
    
    formattedErrors.forEach((message, index) => {
      const error = errors[index];
      
      if (!grouped.has(error.issueType)) {
        grouped.set(error.issueType, []);
      }
      grouped.get(error.issueType)!.push(message);
    });
    
    const groupedMessages: string[] = [];
    for (const [type, messages] of grouped) {
      const typeHeader = getIssueTypeDisplayName(type);
      groupedMessages.push(`${typeHeader}:\n${messages.map(m => `  • ${m}`).join('\n')}`);
    }
    
    return groupedMessages.join('\n\n');
  }

  return formattedErrors.join('\n');
}

/**
 * Create accessible error message with ARIA labels
 */
export function createAccessibleErrorMessage(
  error: ValidationIssue,
  options: AccessibleErrorOptions = {}
): string {
  const fieldName = getFieldDisplayName(error.fieldPath);
  const severityColor = error.severity === ValidationSeverity.ERROR ? 'danger' : 'warning';
  
  let message = makeUserFriendly(error);

  if (options.includeFieldContext) {
    message = `${fieldName}: ${message}`;
  }

  if (options.provideSuggestions) {
    const suggestion = getFixSuggestion(error);
    if (suggestion) {
      message += ` ${suggestion}`;
    }
  }

  if (options.useSemanticMarkup) {
    return `<div role="alert" aria-describedby="error-${error.id}" class="validation-error validation-error--${severityColor}">
      <span id="error-${error.id}">${message}</span>
    </div>`;
  }

  return message;
}

// Helper functions

function hasCircularReferences(obj: unknown, seen = new Set()): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  if (seen.has(obj)) return true;

  seen.add(obj);
  
  try {
    for (const value of Object.values(obj as Record<string, unknown>)) {
      if (hasCircularReferences(value, seen)) return true;
    }
  } catch {
    return true; // Assume circular if we can't iterate
  }

  seen.delete(obj);
  return false;
}

function getRequiredFieldsForEntityType(entityType: EntityType): string[] {
  switch (entityType) {
    case EntityType.WORK:
      return ['id', 'display_name', 'authorships'];
    case EntityType.AUTHOR:
      return ['id', 'display_name'];
    case EntityType.SOURCE:
      return ['id', 'display_name'];
    case EntityType.INSTITUTION:
      return ['id', 'display_name'];
    default:
      return ['id', 'display_name'];
  }
}

function getDeprecatedFieldsForEntityType(entityType: EntityType): string[] {
  switch (entityType) {
    case EntityType.WORK:
      return ['concepts']; // Deprecated in favor of topics
    default:
      return [];
  }
}

function getAllowedFieldsForEntityType(entityType: EntityType): string[] {
  switch (entityType) {
    case EntityType.WORK:
      return [
        'id', 'display_name', 'title', 'authorships', 'publication_year', 'publication_date',
        'type', 'open_access', 'cited_by_count', 'biblio', 'is_retracted', 'is_paratext',
        'primary_location', 'locations', 'best_oa_location', 'sustainable_development_goals',
        'grants', 'datasets', 'versions', 'related_works', 'abstract_inverted_index',
        'cited_by_api_url', 'counts_by_year', 'updated_date', 'created_date', 'topics',
        'keywords', 'language', 'countries_distinct_count', 'institutions_distinct_count',
        'corresponding_author_ids', 'corresponding_institution_ids'
      ];
    case EntityType.AUTHOR:
      return [
        'id', 'display_name', 'display_name_alternatives', 'works_count', 'cited_by_count',
        'summary_stats', 'ids', 'affiliations', 'last_known_institution', 'works_api_url',
        'updated_date', 'created_date', 'counts_by_year'
      ];
    case EntityType.INSTITUTION:
      return [
        'id', 'display_name', 'display_name_alternatives', 'display_name_acronyms',
        'country_code', 'type', 'homepage_url', 'image_url', 'image_thumbnail_url',
        'works_count', 'cited_by_count', 'summary_stats', 'ids', 'geo', 'international',
        'associated_institutions', 'repositories', 'lineage', 'works_api_url',
        'updated_date', 'created_date', 'counts_by_year'
      ];
    case EntityType.SOURCE:
      return [
        'id', 'display_name', 'display_name_alternatives', 'issn_l', 'issn', 'is_oa',
        'is_in_doaj', 'host_organization', 'host_organization_name', 'host_organization_lineage',
        'works_count', 'cited_by_count', 'summary_stats', 'x_concepts', 'counts_by_year',
        'works_api_url', 'updated_date', 'created_date', 'apc_prices', 'apc_usd',
        'country_code', 'societies', 'abbreviation', 'type', 'homepage_url'
      ];
    default:
      return [
        'id', 'display_name', 'works_count', 'cited_by_count', 'counts_by_year',
        'works_api_url', 'updated_date', 'created_date'
      ];
  }
}

function validateNestedStructures(
  entityObj: Record<string, unknown>,
  entityType: EntityType,
  entityId: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Validate authorships array for works
  if (entityType === EntityType.WORK && 'authorships' in entityObj) {
    const {authorships} = entityObj;
    
    if (Array.isArray(authorships)) {
      authorships.forEach((authorship, index) => {
        if (typeof authorship === 'object' && authorship !== null) {
          const auth = authorship as Record<string, unknown>;
          
          // Check author field
          if ('author' in auth) {
            if (typeof auth.author !== 'object' || auth.author === null) {
              issues.push({
                id: generateValidationIssueId(entityId, `authorships.${index}.author`, ValidationIssueType.TYPE_MISMATCH),
                entityId,
                entityType,
                issueType: ValidationIssueType.TYPE_MISMATCH,
                severity: ValidationSeverity.ERROR,
                fieldPath: `authorships.${index}.author`,
                description: 'Author must be an object',
                timestamp: new Date().toISOString(),
              });
            } else {
              const author = auth.author as Record<string, unknown>;
              
              // Check for null/undefined ID
              if (!author.id || author.id === null) {
                issues.push({
                  id: generateValidationIssueId(entityId, `authorships.${index}.author.id`, ValidationIssueType.MISSING_FIELD),
                  entityId,
                  entityType,
                  issueType: ValidationIssueType.MISSING_FIELD,
                  severity: ValidationSeverity.ERROR,
                  fieldPath: `authorships.${index}.author.id`,
                  description: 'Author ID cannot be null',
                  timestamp: new Date().toISOString(),
                });
              }
              
              // Check for undefined display_name
              if (author.display_name === undefined) {
                issues.push({
                  id: generateValidationIssueId(entityId, `authorships.${index}.author.display_name`, ValidationIssueType.MISSING_FIELD),
                  entityId,
                  entityType,
                  issueType: ValidationIssueType.MISSING_FIELD,
                  severity: ValidationSeverity.ERROR,
                  fieldPath: `authorships.${index}.author.display_name`,
                  description: 'Author display name is required',
                  timestamp: new Date().toISOString(),
                });
              }
            }
          }
          
          // Check institutions field type
          if ('institutions' in auth && typeof auth.institutions === 'string') {
            issues.push({
              id: generateValidationIssueId(entityId, `authorships.${index}.institutions`, ValidationIssueType.TYPE_MISMATCH),
              entityId,
              entityType,
              issueType: ValidationIssueType.TYPE_MISMATCH,
              severity: ValidationSeverity.ERROR,
              fieldPath: `authorships.${index}.institutions`,
              expectedType: 'array',
              actualType: 'string',
              description: 'Institutions must be an array, not a string',
              timestamp: new Date().toISOString(),
            });
          }
        }
      });
    }
  }

  return issues;
}

function makeUserFriendly(error: ValidationIssue): string {
  switch (error.issueType) {
    case ValidationIssueType.MISSING_FIELD:
      return `Please provide a ${getFieldDisplayName(error.fieldPath).toLowerCase()}`;
    case ValidationIssueType.TYPE_MISMATCH:
      if (error.expectedType === 'string matching /^A\\\\d{7,10}$/' || error.fieldPath.includes('id')) {
        return 'Author ID format is incorrect - should start with "A" followed by numbers';
      }
      return `Wrong data type - expected ${error.expectedType}, got ${error.actualType}`;
    case ValidationIssueType.INVALID_FORMAT:
      return error.description.replace(/regex/gi, 'format');
    default:
      return error.description;
  }
}

function getFieldDisplayName(fieldPath: string): string {
  const displayNames: Record<string, string> = {
    'display_name': 'Title',
    'publication_year': 'Publication Year',
    'publication_date': 'Publication Date',
    'cited_by_count': 'Citation Count',
    'authorships': 'Authors',
    'homepage_url': 'Homepage URL',
  };
  
  // Group author-related fields under "Author Information"
  if (fieldPath.includes('author')) {
    return 'Author Information';
  }
  
  return displayNames[fieldPath] || fieldPath.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getIssueTypeDisplayName(issueType: ValidationIssueType): string {
  switch (issueType) {
    case ValidationIssueType.MISSING_FIELD:
      return 'Missing Fields';
    case ValidationIssueType.TYPE_MISMATCH:
      return 'Type Mismatches';
    case ValidationIssueType.INVALID_FORMAT:
      return 'Format Issues';
    case ValidationIssueType.VALUE_OUT_OF_RANGE:
      return 'Value Range Issues';
    case ValidationIssueType.EXTRA_FIELD:
      return 'Extra Fields';
    default:
      return 'Other Issues';
  }
}

function getFixSuggestion(error: ValidationIssue): string {
  switch (error.issueType) {
    case ValidationIssueType.MISSING_FIELD:
      return 'This field is required.';
    case ValidationIssueType.INVALID_FORMAT:
      if (error.fieldPath.includes('url')) {
        return 'Please enter a complete URL starting with http:// or https://';
      }
      if (error.fieldPath.includes('email')) {
        return 'Please enter a valid email address like user@example.com';
      }
      return 'Please check the format and try again.';
    case ValidationIssueType.VALUE_OUT_OF_RANGE:
      return 'Please enter a value within the allowed range.';
    default:
      return '';
  }
}