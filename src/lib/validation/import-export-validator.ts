/**
 * Import/Export Data Validator
 * 
 * Validates data integrity during import/export operations,
 * including format validation, corruption detection, and data repair.
 */

import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { validateEntityData } from '@/lib/openalex/utils/entity-validator';
import type {
  EntityValidationResult,
  ValidationExportConfig,
} from '@/types/entity-validation';
import {
  ValidationIssueType,
} from '@/types/entity-validation';

// Configuration interfaces
interface ImportValidatorConfig {
  maxFileSize?: number;
  supportedFormats?: string[];
  validateSchema?: boolean;
  repairCorruption?: boolean;
  maxRecords?: number;
  chunkSize?: number;
}

interface ExportValidatorConfig {
  validateIntegrity?: boolean;
  sanitizeData?: boolean;
  includeMetadata?: boolean;
  maxChunkSize?: number;
  compressionLevel?: number;
}

// Result interfaces
interface FileFormatValidationResult {
  isValid: boolean;
  format: string;
  recordCount: number;
  columns?: string[];
  estimatedMemoryUsage?: number;
  issues: Array<{
    issueType: ValidationIssueType;
    description: string;
    line?: number;
    column?: string;
  }>;
}

interface ImportSchemaValidationResult {
  validRecords: unknown[];
  invalidRecords: unknown[];
  issues: Array<{
    recordIndex: number;
    entityId?: string;
    issueType: ValidationIssueType;
    fieldPath: string;
    description: string;
  }>;
  detectedTypes?: EntityType[];
}

interface ImportDataValidationResult {
  isValid: boolean;
  detectedTypes: EntityType[];
  totalRecords: number;
  validRecords: number;
  corruptionDetected: boolean;
  issues: Array<{
    recordIndex: number;
    issueType: ValidationIssueType;
    description: string;
  }>;
}

interface CorruptionDetectionResult {
  corruptionDetected: boolean;
  corruptionType: 'truncation' | 'encoding' | 'structural' | 'checksum';
  affectedRecords: number;
  repairableDamage: boolean;
  details: string;
}

interface DataConsistencyResult {
  duplicates: Array<{
    id: string;
    count: number;
    indices: number[];
  }>;
  orphanedReferences: Array<{
    sourceIndex: number;
    fieldPath: string;
    referencedId: string;
    referencedType: EntityType;
  }>;
  inconsistentRelationships: Array<{
    description: string;
    affectedRecords: number[];
  }>;
}

interface DataRepairResult {
  repaired: boolean;
  preservedOriginal: boolean;
  data: unknown;
  repairLog: Array<{
    field: string;
    action: 'default_value' | 'type_conversion' | 'clamp_to_minimum' | 'clamp_to_maximum' | 'remove_field';
    originalValue: unknown;
    newValue: unknown;
  }>;
}

interface ExportIntegrityResult {
  isValid: boolean;
  format: string;
  recordCount: number;
  csvColumns?: string[];
  warnings: string[];
  checksumValid?: boolean;
  dataCorrupted?: boolean;
}

interface ExportCompletenessResult {
  isComplete: boolean;
  missingCount: number;
  completeness: number; // 0-1
  missingRecords?: string[];
}

interface StreamingExportResult {
  chunks: number;
  totalProcessed: number;
  memoryEfficient: boolean;
  averageChunkTime: number;
}

interface PartialExportValidationResult {
  isValid: boolean;
  chunkIntegrity: boolean;
  expectedNextChunk: number;
  checksumValid?: boolean;
}

/**
 * Import Validator Class
 */
export class ImportValidator {
  private config: Required<ImportValidatorConfig>;

  constructor(config: ImportValidatorConfig = {}) {
    this.config = {
      maxFileSize: config.maxFileSize ?? 100 * 1024 * 1024, // 100MB
      supportedFormats: config.supportedFormats ?? ['json', 'csv', 'xlsx'],
      validateSchema: config.validateSchema ?? true,
      repairCorruption: config.repairCorruption ?? true,
      maxRecords: config.maxRecords ?? 100000,
      chunkSize: config.chunkSize ?? 1000,
    };
  }

  /**
   * Validate file before import
   */
  async validateFile(data: string, format: string): Promise<FileFormatValidationResult> {
    // Check file size
    const sizeInBytes = new Blob([data]).size;
    if (sizeInBytes > this.config.maxFileSize) {
      return {
        isValid: false,
        format,
        recordCount: 0,
        issues: [{
          issueType: ValidationIssueType.VALUE_OUT_OF_RANGE,
          description: `File size (${Math.round(sizeInBytes / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(this.config.maxFileSize / 1024 / 1024)}MB)`,
        }],
      };
    }

    return validateFileFormat(data, format);
  }
}

/**
 * Export Validator Class
 */
export class ExportValidator {
  private config: Required<ExportValidatorConfig>;

  constructor(config: ExportValidatorConfig = {}) {
    this.config = {
      validateIntegrity: config.validateIntegrity ?? true,
      sanitizeData: config.sanitizeData ?? true,
      includeMetadata: config.includeMetadata ?? true,
      maxChunkSize: config.maxChunkSize ?? 10000,
      compressionLevel: config.compressionLevel ?? 6,
    };
  }

  /**
   * Verify export completeness
   */
  async verifyCompleteness(
    exportedData: EntityValidationResult[],
    originalCount: number
  ): Promise<ExportCompletenessResult> {
    const exportedCount = exportedData.length;
    const missingCount = originalCount - exportedCount;
    const completeness = originalCount > 0 ? exportedCount / originalCount : 1;

    return {
      isComplete: missingCount === 0,
      missingCount,
      completeness,
    };
  }

  /**
   * Generate checksum for export data
   */
  async generateChecksum(data: EntityValidationResult[]): Promise<string> {
    const jsonString = JSON.stringify(data);
    // Simple hash function - in real implementation would use crypto
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Verify checksum of export data
   */
  async verifyChecksum(
    data: EntityValidationResult[],
    expectedChecksum: string
  ): Promise<{ isValid: boolean; checksum: string; corruptionDetected?: boolean }> {
    const actualChecksum = await this.generateChecksum(data);
    return {
      isValid: actualChecksum === expectedChecksum,
      checksum: actualChecksum,
      corruptionDetected: actualChecksum !== expectedChecksum,
    };
  }

  /**
   * Stream export for large datasets
   */
  async streamExport(
    data: EntityValidationResult[],
    config: ValidationExportConfig,
    streamOptions: { chunkSize: number }
  ): Promise<StreamingExportResult> {
    const {chunkSize} = streamOptions;
    const chunks = Math.ceil(data.length / chunkSize);
    const startTime = Date.now();

    // Simulate chunked processing
    for (let i = 0; i < chunks; i++) {
      const chunkStart = i * chunkSize;
      const chunkEnd = Math.min(chunkStart + chunkSize, data.length);
      const _chunk = data.slice(chunkStart, chunkEnd);
      
      // Process chunk (would actually write to stream)
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate processing
    }

    const totalTime = Date.now() - startTime;

    return {
      chunks,
      totalProcessed: data.length,
      memoryEfficient: true,
      averageChunkTime: totalTime / chunks,
    };
  }

  /**
   * Validate partial export
   */
  async validatePartialExport(partialExport: {
    chunk: number;
    totalChunks: number;
    data: EntityValidationResult[];
  }): Promise<PartialExportValidationResult> {
    const { chunk, totalChunks, data } = partialExport;

    return {
      isValid: chunk > 0 && chunk <= totalChunks && data.length > 0,
      chunkIntegrity: data.every(item => 
        typeof item === 'object' && 
        'entityId' in item && 
        'isValid' in item
      ),
      expectedNextChunk: chunk + 1,
    };
  }
}

/**
 * Validate file format
 */
export async function validateFileFormat(
  data: string,
  format: string
): Promise<FileFormatValidationResult> {
  const _issues: Array<{
    issueType: ValidationIssueType;
    description: string;
    line?: number;
    column?: string;
  }> = [];

  try {
    switch (format.toLowerCase()) {
      case 'json':
        return await validateJsonFormat(data);
      case 'csv':
        return await validateCsvFormat(data);
      case 'xlsx':
        return await validateXlsxFormat(data);
      default:
        return {
          isValid: false,
          format,
          recordCount: 0,
          issues: [{
            issueType: ValidationIssueType.INVALID_FORMAT,
            description: `Unsupported format: ${format}`,
          }],
        };
    }
  } catch (error) {
    return {
      isValid: false,
      format,
      recordCount: 0,
      issues: [{
        issueType: ValidationIssueType.INVALID_FORMAT,
        description: `Format validation failed: ${error instanceof Error ? error.message : String(error)}`,
      }],
    };
  }
}

/**
 * Validate JSON format
 */
async function validateJsonFormat(data: string): Promise<FileFormatValidationResult> {
  try {
    const parsed = JSON.parse(data);
    const recordCount = Array.isArray(parsed) ? parsed.length : 1;
    const estimatedMemoryUsage = data.length * 2; // Rough estimate

    return {
      isValid: true,
      format: 'json',
      recordCount,
      estimatedMemoryUsage,
      issues: [],
    };
  } catch (error) {
    return {
      isValid: false,
      format: 'json',
      recordCount: 0,
      issues: [{
        issueType: ValidationIssueType.INVALID_FORMAT,
        description: `JSON syntax error: ${error instanceof Error ? error.message : String(error)}`,
      }],
    };
  }
}

/**
 * Validate CSV format
 */
async function validateCsvFormat(data: string): Promise<FileFormatValidationResult> {
  const lines = data.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    return {
      isValid: false,
      format: 'csv',
      recordCount: 0,
      issues: [{
        issueType: ValidationIssueType.MISSING_FIELD,
        description: 'CSV file is empty',
      }],
    };
  }

  const headerLine = lines[0];
  const columns = headerLine.split(',').map(col => col.trim().replace(/"/g, ''));
  const recordCount = Math.max(0, lines.length - 1); // Exclude header

  const issues: Array<{
    issueType: ValidationIssueType;
    description: string;
    line?: number;
    column?: string;
  }> = [];

  // Check for consistent column count
  const expectedColumnCount = columns.length;
  for (let i = 1; i < lines.length; i++) {
    const lineColumns = lines[i].split(',');
    if (lineColumns.length !== expectedColumnCount) {
      issues.push({
        issueType: ValidationIssueType.INVALID_FORMAT,
        description: `Line ${i + 1} has ${lineColumns.length} columns, expected ${expectedColumnCount}`,
        line: i + 1,
      });
    }
  }

  return {
    isValid: issues.length === 0,
    format: 'csv',
    recordCount,
    columns,
    issues,
  };
}

/**
 * Validate XLSX format (placeholder)
 */
async function validateXlsxFormat(_data: string): Promise<FileFormatValidationResult> {
  // In a real implementation, would parse XLSX binary data
  return {
    isValid: true,
    format: 'xlsx',
    recordCount: 0,
    issues: [],
  };
}

/**
 * Validate import data schema
 */
export async function validateImportSchema(
  data: unknown[],
  entityType: EntityType
): Promise<ImportSchemaValidationResult> {
  const validRecords: unknown[] = [];
  const invalidRecords: unknown[] = [];
  const issues: Array<{
    recordIndex: number;
    entityId?: string;
    issueType: ValidationIssueType;
    fieldPath: string;
    description: string;
  }> = [];

  for (let i = 0; i < data.length; i++) {
    const record = data[i];
    
    try {
      const validationResult = await validateEntityData(
        typeof record === 'object' && record !== null && 'id' in record 
          ? String((record as Record<string, unknown>).id)
          : `record_${i}`,
        entityType,
        record
      );

      if (validationResult.isValid) {
        validRecords.push(record);
      } else {
        invalidRecords.push(record);
        
        // Convert validation issues to import issues
        for (const issue of validationResult.issues) {
          issues.push({
            recordIndex: i,
            entityId: issue.entityId,
            issueType: issue.issueType,
            fieldPath: issue.fieldPath,
            description: issue.description,
          });
        }
      }
    } catch (error) {
      invalidRecords.push(record);
      issues.push({
        recordIndex: i,
        issueType: ValidationIssueType.TYPE_MISMATCH,
        fieldPath: '_validation',
        description: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return {
    validRecords,
    invalidRecords,
    issues,
  };
}

/**
 * Validate import data with auto-detection
 */
export async function validateImportData(
  data: unknown[],
  entityTypeOrAuto: EntityType | 'auto-detect'
): Promise<ImportDataValidationResult> {
  let detectedTypes: EntityType[] = [];
  
  if (entityTypeOrAuto === 'auto-detect') {
    detectedTypes = detectEntityTypes(data);
  } else {
    detectedTypes = [entityTypeOrAuto];
  }

  let totalValid = 0;
  const allIssues: Array<{
    recordIndex: number;
    issueType: ValidationIssueType;
    description: string;
  }> = [];

  for (const entityType of detectedTypes) {
    const schemaResult = await validateImportSchema(data, entityType);
    totalValid += schemaResult.validRecords.length;
    
    allIssues.push(...schemaResult.issues.map(issue => ({
      recordIndex: issue.recordIndex,
      issueType: issue.issueType,
      description: issue.description,
    })));
  }

  return {
    isValid: totalValid > 0,
    detectedTypes,
    totalRecords: data.length,
    validRecords: totalValid,
    corruptionDetected: false,
    issues: allIssues,
  };
}

/**
 * Detect corruption in data
 */
export async function detectCorruption(
  data: string,
  format: string
): Promise<CorruptionDetectionResult> {
  // Check for truncation
  if (format === 'json') {
    try {
      JSON.parse(data);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unexpected end')) {
        return {
          corruptionDetected: true,
          corruptionType: 'truncation',
          affectedRecords: 1,
          repairableDamage: false,
          details: 'JSON data appears to be truncated',
        };
      }
    }
  }

  // Check for encoding issues
  if (data.includes('\x00') || data.includes('\ufffd')) {
    return {
      corruptionDetected: true,
      corruptionType: 'encoding',
      affectedRecords: 1,
      repairableDamage: true,
      details: 'Data contains invalid characters',
    };
  }

  return {
    corruptionDetected: false,
    corruptionType: 'structural',
    affectedRecords: 0,
    repairableDamage: false,
    details: 'No corruption detected',
  };
}

/**
 * Check data consistency
 */
export async function checkDataConsistency(data: unknown[]): Promise<DataConsistencyResult> {
  const duplicates: Array<{ id: string; count: number; indices: number[] }> = [];
  const orphanedReferences: Array<{
    sourceIndex: number;
    fieldPath: string;
    referencedId: string;
    referencedType: EntityType;
  }> = [];

  // Check for duplicates
  const idMap = new Map<string, number[]>();
  
  for (let i = 0; i < data.length; i++) {
    const record = data[i];
    if (typeof record === 'object' && record !== null && 'id' in record) {
      const id = String((record as Record<string, unknown>).id);
      if (!idMap.has(id)) {
        idMap.set(id, []);
      }
      idMap.get(id)!.push(i);
    }
  }

  for (const [id, indices] of idMap.entries()) {
    if (indices.length > 1) {
      duplicates.push({ id, count: indices.length, indices });
    }
  }

  // Check for orphaned references (simplified)
  for (let i = 0; i < data.length; i++) {
    const record = data[i];
    if (typeof record === 'object' && record !== null) {
      const obj = record as Record<string, unknown>;
      
      // Check for institution references in authorships
      if ('authorships' in obj && Array.isArray(obj.authorships)) {
        for (const authorship of obj.authorships) {
          if (typeof authorship === 'object' && authorship !== null && 'institutions' in authorship) {
            const {institutions} = (authorship as Record<string, unknown>);
            if (Array.isArray(institutions)) {
              for (const institution of institutions) {
                if (typeof institution === 'object' && institution !== null && 'id' in institution) {
                  const institutionId = String((institution as Record<string, unknown>).id);
                  // In a real implementation, would check if this ID exists in the dataset
                  if (institutionId.startsWith('I') && !idMap.has(institutionId)) {
                    orphanedReferences.push({
                      sourceIndex: i,
                      fieldPath: 'authorships.institutions.id',
                      referencedId: institutionId,
                      referencedType: EntityType.INSTITUTION,
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return {
    duplicates,
    orphanedReferences,
    inconsistentRelationships: [],
  };
}

/**
 * Repair corrupted data
 */
export async function repairCorruptedData(
  data: unknown,
  _entityType: EntityType
): Promise<DataRepairResult> {
  if (typeof data !== 'object' || data === null) {
    return {
      repaired: false,
      preservedOriginal: true,
      data,
      repairLog: [],
    };
  }

  const repairLog: Array<{
    field: string;
    action: 'default_value' | 'type_conversion' | 'clamp_to_minimum' | 'clamp_to_maximum' | 'remove_field';
    originalValue: unknown;
    newValue: unknown;
  }> = [];

  const repairedData = { ...data as Record<string, unknown> };
  let repaired = false;

  // Repair missing display_name
  if (!repairedData.display_name || repairedData.display_name === null) {
    repairedData.display_name = 'Unknown Title';
    repairLog.push({
      field: 'display_name',
      action: 'default_value',
      originalValue: repairedData.display_name,
      newValue: 'Unknown Title',
    });
    repaired = true;
  }

  // Repair invalid cited_by_count
  if (typeof repairedData.cited_by_count === 'string' || repairedData.cited_by_count === null) {
    const original = repairedData.cited_by_count;
    repairedData.cited_by_count = 0;
    repairLog.push({
      field: 'cited_by_count',
      action: 'type_conversion',
      originalValue: original,
      newValue: 0,
    });
    repaired = true;
  }

  // Clamp negative citation counts
  if (typeof repairedData.cited_by_count === 'number' && repairedData.cited_by_count < 0) {
    const original = repairedData.cited_by_count;
    repairedData.cited_by_count = 0;
    repairLog.push({
      field: 'cited_by_count',
      action: 'clamp_to_minimum',
      originalValue: original,
      newValue: 0,
    });
    repaired = true;
  }

  // Repair invalid authorship arrays
  if (typeof repairedData.authorships === 'string' || repairedData.authorships === null) {
    const original = repairedData.authorships;
    repairedData.authorships = [];
    repairLog.push({
      field: 'authorships',
      action: 'default_value',
      originalValue: original,
      newValue: [],
    });
    repaired = true;
  }

  return {
    repaired,
    preservedOriginal: !repaired,
    data: repairedData,
    repairLog,
  };
}

/**
 * Validate export integrity
 */
export async function validateExportIntegrity(
  data: EntityValidationResult[],
  config: ValidationExportConfig
): Promise<ExportIntegrityResult> {
  const warnings: string[] = [];

  if (data.length === 0) {
    warnings.push('No data to export');
  }

  let csvColumns: string[] | undefined;
  if (config.format === 'csv') {
    csvColumns = ['entityId', 'entityType', 'isValid', 'issueType', 'severity', 'fieldPath', 'description'];
  }

  return {
    isValid: true,
    format: config.format.toLowerCase(),
    recordCount: data.length,
    csvColumns,
    warnings,
  };
}

/**
 * Sanitize export data
 */
export async function sanitizeExportData(
  data: EntityValidationResult[],
  options: {
    removeSensitiveFields?: boolean;
    anonymizeValues?: boolean;
    truncateLargeValues?: boolean;
    maxValueLength?: number;
  } = {}
): Promise<EntityValidationResult[]> {
  return data.map(result => {
    const sanitizedIssues = result.issues.map(issue => {
      const sanitizedIssue = { ...issue };

      // Remove sensitive values
      if (options.removeSensitiveFields && 
          (issue.fieldPath.includes('internal') || issue.fieldPath.includes('private'))) {
        sanitizedIssue.actualValue = '[REDACTED]';
      }

      // Truncate large values
      if (options.truncateLargeValues && 
          typeof issue.actualValue === 'string' && 
          issue.actualValue.length > (options.maxValueLength || 100)) {
        sanitizedIssue.actualValue = issue.actualValue.substring(0, options.maxValueLength || 100) + '...';
      }

      return sanitizedIssue;
    });

    return {
      ...result,
      issues: sanitizedIssues,
    };
  });
}

// Helper functions

function detectEntityTypes(data: unknown[]): EntityType[] {
  const detectedTypes = new Set<EntityType>();

  for (const record of data.slice(0, 10)) { // Sample first 10 records
    if (typeof record === 'object' && record !== null && 'id' in record) {
      const id = String((record as Record<string, unknown>).id);
      
      if (id.startsWith('W')) detectedTypes.add(EntityType.WORK);
      else if (id.startsWith('A')) detectedTypes.add(EntityType.AUTHOR);
      else if (id.startsWith('S')) detectedTypes.add(EntityType.SOURCE);
      else if (id.startsWith('I')) detectedTypes.add(EntityType.INSTITUTION);
      else if (id.startsWith('P')) detectedTypes.add(EntityType.PUBLISHER);
      else if (id.startsWith('F')) detectedTypes.add(EntityType.FUNDER);
      else if (id.startsWith('T')) detectedTypes.add(EntityType.TOPIC);
      else if (id.startsWith('C')) detectedTypes.add(EntityType.CONCEPT);
    }
  }

  return Array.from(detectedTypes);
}