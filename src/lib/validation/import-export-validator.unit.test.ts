/**
 * Import/Export Data Validation Tests
 * 
 * Tests for validating data integrity during import/export operations,
 * including format validation, data consistency checks, and corruption detection.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

import { EntityType } from '@/lib/openalex/utils/entity-detection';
import type {
  ValidationExportConfig,
  ValidationExportFormat,
  BatchValidationResult,
  EntityValidationResult,
} from '@/types/entity-validation';
import {
  ValidationIssueType,
  ValidationSeverity,
  ValidationExportFormat as ExportFormat,
} from '@/types/entity-validation';

// Import functions to test (these will be implemented)
import {
  ImportValidator,
  ExportValidator,
  validateImportData,
  validateExportIntegrity,
  checkDataConsistency,
  detectCorruption,
  validateFileFormat,
  sanitizeExportData,
  validateImportSchema,
  repairCorruptedData,
} from './import-export-validator';

describe('Import Validator', () => {
  let importValidator: ImportValidator;

  beforeEach(() => {
    importValidator = new ImportValidator({
      maxFileSize: 100 * 1024 * 1024, // 100MB
      supportedFormats: ['json', 'csv', 'xlsx'],
      validateSchema: true,
      repairCorruption: true,
    });
  });

  describe('File Format Validation', () => {
    test('should validate JSON file format', async () => {
      const validJson = JSON.stringify([
        {
          id: 'W1234567890',
          display_name: 'Test Work',
          authorships: [],
          cited_by_count: 0,
        }
      ]);

      const result = await validateFileFormat(validJson, 'json');

      expect(result.isValid).toBe(true);
      expect(result.format).toBe('json');
      expect(result.recordCount).toBe(1);
    });

    test('should detect malformed JSON', async () => {
      const malformedJson = '{"id": "W123", "display_name": "Test Work"'; // Missing closing brace

      const result = await validateFileFormat(malformedJson, 'json');

      expect(result.isValid).toBe(false);
      expect(result.issues[0].issueType).toBe(ValidationIssueType.INVALID_FORMAT);
      expect(result.issues[0].description).toContain('JSON syntax');
    });

    test('should validate CSV structure', async () => {
      const csvData = `id,display_name,cited_by_count
W1234567890,"Test Work",42
W1234567891,"Another Work",100`;

      const result = await validateFileFormat(csvData, 'csv');

      expect(result.isValid).toBe(true);
      expect(result.recordCount).toBe(2);
      expect(result.columns).toEqual(['id', 'display_name', 'cited_by_count']);
    });

    test('should detect CSV with inconsistent columns', async () => {
      const inconsistentCsv = `id,display_name,cited_by_count
W1234567890,"Test Work",42
W1234567891,"Another Work"` // Missing column

      const result = await validateFileFormat(inconsistentCsv, 'csv');

      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.description.includes('column count'))).toBe(true);
    });

    test('should handle large files gracefully', async () => {
      const largeData = JSON.stringify(
        new Array(10000).fill(0).map((_, i) => ({
          id: `W${i.toString().padStart(10, '0')}`,
          display_name: `Work ${i}`,
          cited_by_count: i,
        }))
      );

      const result = await validateFileFormat(largeData, 'json');

      expect(result.isValid).toBe(true);
      expect(result.recordCount).toBe(10000);
      expect(result.estimatedMemoryUsage).toBeGreaterThan(0);
    });

    test('should detect file size limits', async () => {
      const oversizedValidator = new ImportValidator({
        maxFileSize: 1024, // 1KB limit
      });

      const largeData = 'x'.repeat(2048); // 2KB data

      const result = await oversizedValidator.validateFile(largeData, 'json');

      expect(result.isValid).toBe(false);
      expect(result.issues[0].description).toContain('file size');
    });
  });

  describe('Data Schema Validation', () => {
    test('should validate entity schemas in imported data', async () => {
      const importData = [
        {
          id: 'W1234567890',
          display_name: 'Valid Work',
          authorships: [],
          cited_by_count: 42,
          open_access: { is_oa: true },
        },
        {
          id: 'invalid-id', // Invalid ID format
          display_name: 'Invalid Work',
          cited_by_count: 'not-a-number', // Type mismatch
        }
      ];

      const result = await validateImportSchema(importData, EntityType.WORK);

      expect(result.validRecords).toHaveLength(1);
      expect(result.invalidRecords).toHaveLength(1);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some(i => i.description.includes('ID format'))).toBe(true);
    });

    test('should handle mixed entity types in import', async () => {
      const mixedData = [
        {
          id: 'W1234567890',
          display_name: 'Test Work',
          authorships: [],
        },
        {
          id: 'A1234567890', 
          display_name: 'Test Author',
          works_count: 10,
        }
      ];

      const result = await validateImportData(mixedData, 'auto-detect');

      expect(result.detectedTypes).toEqual([EntityType.WORK, EntityType.AUTHOR]);
      expect(result.isValid).toBe(true);
    });

    test('should validate required fields across all records', async () => {
      const incompleteData = [
        {
          id: 'W1234567890',
          display_name: 'Complete Work',
          authorships: [],
        },
        {
          id: 'W1234567891',
          // Missing display_name
          authorships: [],
        }
      ];

      const result = await validateImportSchema(incompleteData, EntityType.WORK);

      expect(result.invalidRecords).toHaveLength(1);
      expect(
        result.issues.some(i => 
          i.fieldPath === 'display_name' && 
          i.issueType === ValidationIssueType.MISSING_FIELD
        )
      ).toBe(true);
    });
  });

  describe('Data Corruption Detection', () => {
    test('should detect truncated records', async () => {
      const truncatedData = `[
        {"id": "W1234567890", "display_name": "Complete Work"},
        {"id": "W1234567891", "display_na`; // Truncated

      const result = await detectCorruption(truncatedData, 'json');

      expect(result.corruptionDetected).toBe(true);
      expect(result.corruptionType).toBe('truncation');
      expect(result.affectedRecords).toBeGreaterThan(0);
    });

    test('should detect encoding issues', async () => {
      const encodingData = '{"id": "W123", "display_name": "Test\x00Work"}'; // Null byte

      const result = await detectCorruption(encodingData, 'json');

      expect(result.corruptionDetected).toBe(true);
      expect(result.corruptionType).toBe('encoding');
    });

    test('should detect duplicated records', async () => {
      const duplicatedData = [
        { id: 'W1234567890', display_name: 'Work 1' },
        { id: 'W1234567890', display_name: 'Work 1 Duplicate' },
        { id: 'W1234567891', display_name: 'Work 2' },
      ];

      const result = await checkDataConsistency(duplicatedData);

      expect(result.duplicates.length).toBe(1);
      expect(result.duplicates[0].id).toBe('W1234567890');
      expect(result.duplicates[0].count).toBe(2);
    });

    test('should detect orphaned references', async () => {
      const dataWithOrphans = [
        {
          id: 'W1234567890',
          display_name: 'Work 1',
          authorships: [
            {
              author: { id: 'A1111111111', display_name: 'Author 1' },
              institutions: [{ id: 'I9999999999' }], // Orphaned reference
            }
          ],
        }
      ];

      const result = await checkDataConsistency(dataWithOrphans);

      expect(result.orphanedReferences.length).toBeGreaterThan(0);
      expect(result.orphanedReferences[0].referencedId).toBe('I9999999999');
    });
  });

  describe('Data Repair', () => {
    test('should repair basic data corruption', async () => {
      const corruptedData = {
        id: 'W1234567890',
        display_name: null, // Corrupted required field
        cited_by_count: 'invalid', // Type corruption
        authorships: 'not-an-array', // Structure corruption
      };

      const result = await repairCorruptedData(corruptedData, EntityType.WORK);

      expect(result.repaired).toBe(true);
      expect((result.data as { display_name: string }).display_name).toBe('Unknown Title');
      expect((result.data as { cited_by_count: number }).cited_by_count).toBe(0);
      expect(Array.isArray((result.data as { authorships: unknown[] }).authorships)).toBe(true);
    });

    test('should log repair operations', async () => {
      const corruptedData = {
        id: 'W1234567890',
        display_name: '',
        cited_by_count: -1,
      };

      const result = await repairCorruptedData(corruptedData, EntityType.WORK);

      expect(result.repairLog).toHaveLength(2);
      expect(result.repairLog[0].field).toBe('display_name');
      expect(result.repairLog[0].action).toBe('default_value');
      expect(result.repairLog[1].field).toBe('cited_by_count');
      expect(result.repairLog[1].action).toBe('clamp_to_minimum');
    });

    test('should preserve data when repair is not possible', async () => {
      const unreparableData = {
        completely: 'invalid',
        structure: 123,
      };

      const result = await repairCorruptedData(unreparableData, EntityType.WORK);

      expect(result.repaired).toBe(false);
      expect(result.preservedOriginal).toBe(true);
      expect(result.data).toEqual(unreparableData);
    });
  });
});

describe('Export Validator', () => {
  let exportValidator: ExportValidator;

  beforeEach(() => {
    exportValidator = new ExportValidator({
      validateIntegrity: true,
      sanitizeData: true,
      includeMetadata: true,
    });
  });

  describe('Export Format Validation', () => {
    test('should validate JSON export structure', async () => {
      const exportConfig: ValidationExportConfig = {
        format: ExportFormat.JSON,
        includeEntityDetails: true,
        includeStatistics: true,
      };

      const mockData: EntityValidationResult[] = [
        {
          entityId: 'W1234567890',
          entityType: EntityType.WORK,
          isValid: true,
          issues: [],
          issueCounts: { errors: 0, warnings: 0, info: 0 },
          validatedAt: new Date().toISOString(),
          validationDurationMs: 100,
        }
      ];

      const result = await validateExportIntegrity(mockData, exportConfig);

      expect(result.isValid).toBe(true);
      expect(result.format).toBe('json');
      expect(result.recordCount).toBe(1);
    });

    test('should validate CSV export columns', async () => {
      const exportConfig: ValidationExportConfig = {
        format: ExportFormat.CSV,
      };

      const mockData: EntityValidationResult[] = [
        {
          entityId: 'W1234567890',
          entityType: EntityType.WORK,
          isValid: false,
          issues: [
            {
              id: 'issue-1',
              entityId: 'W1234567890',
              entityType: EntityType.WORK,
              issueType: ValidationIssueType.MISSING_FIELD,
              severity: ValidationSeverity.ERROR,
              fieldPath: 'title',
              description: 'Missing required field',
              timestamp: new Date().toISOString(),
            }
          ],
          issueCounts: { errors: 1, warnings: 0, info: 0 },
          validatedAt: new Date().toISOString(),
          validationDurationMs: 150,
        }
      ];

      const result = await validateExportIntegrity(mockData, exportConfig);

      expect(result.isValid).toBe(true);
      expect(result.csvColumns).toContain('entityId');
      expect(result.csvColumns).toContain('issueType');
      expect(result.csvColumns).toContain('severity');
    });

    test('should handle empty export data', async () => {
      const exportConfig: ValidationExportConfig = {
        format: ExportFormat.JSON,
      };

      const result = await validateExportIntegrity([], exportConfig);

      expect(result.isValid).toBe(true);
      expect(result.recordCount).toBe(0);
      expect(result.warnings).toContain('No data to export');
    });
  });

  describe('Data Sanitization', () => {
    test('should sanitize sensitive information', async () => {
      const sensitiveData: EntityValidationResult[] = [
        {
          entityId: 'W1234567890',
          entityType: EntityType.WORK,
          isValid: false,
          issues: [
            {
              id: 'issue-1',
              entityId: 'W1234567890',
              entityType: EntityType.WORK,
              issueType: ValidationIssueType.TYPE_MISMATCH,
              severity: ValidationSeverity.ERROR,
              fieldPath: 'internal_id',
              actualValue: 'internal-database-key-12345', // Sensitive
              description: 'Internal database reference exposed',
              timestamp: new Date().toISOString(),
            }
          ],
          issueCounts: { errors: 1, warnings: 0, info: 0 },
          validatedAt: new Date().toISOString(),
          validationDurationMs: 100,
        }
      ];

      const sanitized = await sanitizeExportData(sensitiveData, {
        removeSensitiveFields: true,
        anonymizeValues: true,
      });

      expect(sanitized[0].issues[0].actualValue).toBe('[REDACTED]');
    });

    test('should truncate large field values', async () => {
      const largeValueData: EntityValidationResult[] = [
        {
          entityId: 'W1234567890',
          entityType: EntityType.WORK,
          isValid: false,
          issues: [
            {
              id: 'issue-1',
              entityId: 'W1234567890',
              entityType: EntityType.WORK,
              issueType: ValidationIssueType.VALUE_OUT_OF_RANGE,
              severity: ValidationSeverity.WARNING,
              fieldPath: 'abstract',
              actualValue: 'x'.repeat(10000), // Very long value
              description: 'Abstract too long',
              timestamp: new Date().toISOString(),
            }
          ],
          issueCounts: { errors: 0, warnings: 1, info: 0 },
          validatedAt: new Date().toISOString(),
          validationDurationMs: 100,
        }
      ];

      const sanitized = await sanitizeExportData(largeValueData, {
        truncateLargeValues: true,
        maxValueLength: 100,
      });

      const actualValue = sanitized[0].issues[0].actualValue as string;
      expect(actualValue.length).toBeLessThanOrEqual(103); // 100 + "..."
      expect(actualValue).toContain('...');
    });
  });

  describe('Export Integrity Checks', () => {
    test('should verify exported data completeness', async () => {
      const originalCount = 100;
      const exportedData = new Array(95).fill(null).map((_, i) => ({
        entityId: `W${i}`,
        entityType: EntityType.WORK,
        isValid: true,
        issues: [],
        issueCounts: { errors: 0, warnings: 0, info: 0 },
        validatedAt: new Date().toISOString(),
        validationDurationMs: 50,
      }));

      const integrityCheck = await exportValidator.verifyCompleteness(
        exportedData,
        originalCount
      );

      expect(integrityCheck.isComplete).toBe(false);
      expect(integrityCheck.missingCount).toBe(5);
      expect(integrityCheck.completeness).toBe(0.95);
    });

    test('should validate export checksums', async () => {
      const exportData = [
        {
          entityId: 'W1234567890',
          entityType: EntityType.WORK,
          isValid: true,
          issues: [],
          issueCounts: { errors: 0, warnings: 0, info: 0 },
          validatedAt: new Date().toISOString(),
          validationDurationMs: 100,
        }
      ];

      const checksum = await exportValidator.generateChecksum(exportData);
      const verification = await exportValidator.verifyChecksum(exportData, checksum);

      expect(verification.isValid).toBe(true);
      expect(verification.checksum).toBe(checksum);
    });

    test('should detect data corruption during export', async () => {
      const originalData = [
        {
          entityId: 'W1234567890',
          entityType: EntityType.WORK,
          isValid: true,
          issues: [],
          issueCounts: { errors: 0, warnings: 0, info: 0 },
          validatedAt: new Date().toISOString(),
          validationDurationMs: 100,
        }
      ];

      const corruptedData: unknown[] = [
        {
          entityId: 'W1234567890',
          entityType: EntityType.WORK,
          isValid: true,
          issues: [], 
          issueCounts: { errors: 0, warnings: 0, info: 0 },
          validatedAt: 'invalid-date', // Corrupted
          validationDurationMs: 'not-a-number', // Corrupted
        }
      ];

      const originalChecksum = await exportValidator.generateChecksum(originalData);
      const verification = await exportValidator.verifyChecksum(corruptedData as EntityValidationResult[], originalChecksum);

      expect(verification.isValid).toBe(false);
      expect(verification.corruptionDetected).toBe(true);
    });
  });

  describe('Large Export Handling', () => {
    test('should handle streaming exports for large datasets', async () => {
      const largeDataset = new Array(10000).fill(null).map((_, i) => ({
        entityId: `W${i.toString().padStart(10, '0')}`,
        entityType: EntityType.WORK,
        isValid: Math.random() > 0.1,
        issues: [],
        issueCounts: { errors: 0, warnings: 0, info: 0 },
        validatedAt: new Date().toISOString(),
        validationDurationMs: 50,
      }));

      const streamingResult = await exportValidator.streamExport(
        largeDataset,
        { format: ExportFormat.JSON },
        { chunkSize: 1000 }
      );

      expect(streamingResult.chunks).toBe(10);
      expect(streamingResult.totalProcessed).toBe(10000);
      expect(streamingResult.memoryEfficient).toBe(true);
    });

    test('should validate partial exports', async () => {
      const partialExport = {
        chunk: 1,
        totalChunks: 5,
        data: new Array(1000).fill(null).map((_, i) => ({
          entityId: `W${i}`,
          entityType: EntityType.WORK,
          isValid: true,
          issues: [],
          issueCounts: { errors: 0, warnings: 0, info: 0 },
          validatedAt: new Date().toISOString(),
          validationDurationMs: 50,
        })),
      };

      const validation = await exportValidator.validatePartialExport(partialExport);

      expect(validation.isValid).toBe(true);
      expect(validation.chunkIntegrity).toBe(true);
      expect(validation.expectedNextChunk).toBe(2);
    });
  });
});