/**
 * Real-Time Validator Tests
 * 
 * Comprehensive test suite for real-time data validation scenarios including
 * malformed data, schema violations, integrity conflicts, and edge cases.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

import { EntityType } from '@/lib/openalex/utils/entity-detection';
import type {
  ValidationIssue,
  EntityValidationResult,
  ValidationIssueType,
  ValidationSeverity,
} from '@/types/entity-validation';
import {
  ValidationIssueType as IssueType,
  ValidationSeverity as Severity,
} from '@/types/entity-validation';

// Import functions to test (these will be implemented)
import {
  RealTimeValidator,
  validateField,
  validateEntityIntegrity,
  checkCrossFieldConsistency,
  detectSchemaViolations,
  formatValidationErrors,
  createAccessibleErrorMessage,
} from './real-time-validator';

describe('Real-Time Validator', () => {
  let validator: RealTimeValidator;

  beforeEach(() => {
    validator = new RealTimeValidator({
      debounceMs: 100,
      enableRealTimeValidation: true,
      validateOnBlur: true,
      showErrorsInRealTime: true,
    });
  });

  describe('Field Validation', () => {
    test('should validate required fields correctly', async () => {
      const result = await validateField('title', undefined, {
        required: true,
        entityType: EntityType.WORK,
      });

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].issueType).toBe(IssueType.MISSING_FIELD);
      expect(result.issues[0].severity).toBe(Severity.ERROR);
    });

    test('should validate field type mismatches', async () => {
      const result = await validateField('publication_year', 'not-a-number', {
        type: 'number',
        entityType: EntityType.WORK,
      });

      expect(result.isValid).toBe(false);
      expect(result.issues[0].issueType).toBe(IssueType.TYPE_MISMATCH);
      expect(result.issues[0].expectedType).toBe('number');
      expect(result.issues[0].actualType).toBe('string');
    });

    test('should validate value ranges', async () => {
      const result = await validateField('publication_year', 3000, {
        type: 'number',
        min: 1000,
        max: new Date().getFullYear() + 10,
        entityType: EntityType.WORK,
      });

      expect(result.isValid).toBe(false);
      expect(result.issues[0].issueType).toBe(IssueType.VALUE_OUT_OF_RANGE);
    });

    test('should validate URL formats', async () => {
      const result = await validateField('homepage_url', 'not-a-url', {
        format: 'url',
        entityType: EntityType.INSTITUTION,
      });

      expect(result.isValid).toBe(false);
      expect(result.issues[0].issueType).toBe(IssueType.INVALID_FORMAT);
    });

    test('should validate email formats', async () => {
      const result = await validateField('contact_email', 'invalid-email', {
        format: 'email',
        entityType: EntityType.AUTHOR,
      });

      expect(result.isValid).toBe(false);
      expect(result.issues[0].issueType).toBe(IssueType.INVALID_FORMAT);
    });

    test('should validate OpenAlex ID format', async () => {
      const result = await validateField('id', 'invalid-id', {
        format: 'openalex_id',
        entityType: EntityType.WORK,
      });

      expect(result.isValid).toBe(false);
      expect(result.issues[0].issueType).toBe(IssueType.INVALID_FORMAT);
      expect(result.issues[0].description).toContain('OpenAlex ID format');
    });

    test('should validate array fields', async () => {
      const result = await validateField('authorships', 'not-an-array', {
        type: 'array',
        entityType: EntityType.WORK,
      });

      expect(result.isValid).toBe(false);
      expect(result.issues[0].issueType).toBe(IssueType.TYPE_MISMATCH);
    });

    test('should validate nested object structures', async () => {
      const invalidAuthor = {
        author: { id: 'invalid-id' }, // Missing display_name
        author_position: 'invalid-position',
      };

      const result = await validateField('authorships.0', invalidAuthor, {
        type: 'object',
        schema: 'authorship',
        entityType: EntityType.WORK,
      });

      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Entity Integrity Validation', () => {
    test('should detect missing required entity fields', async () => {
      const incompleteWork = {
        id: 'W1234567890',
        // Missing display_name, authorships, etc.
      };

      const result = await validateEntityIntegrity(
        incompleteWork,
        EntityType.WORK
      );

      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.fieldPath === 'display_name')).toBe(true);
      expect(result.issues.some(i => i.fieldPath === 'authorships')).toBe(true);
    });

    test('should validate cross-field consistency', async () => {
      const inconsistentWork = {
        id: 'W1234567890',
        display_name: 'Test Work',
        publication_year: 2023,
        publication_date: '2020-01-01', // Inconsistent with year
        authorships: [],
        open_access: { is_oa: false },
        cited_by_count: 0,
        counts_by_year: [],
      };

      const result = await checkCrossFieldConsistency(
        inconsistentWork,
        EntityType.WORK
      );

      expect(result.isValid).toBe(false);
      expect(
        result.issues.some(i => 
          i.description.includes('publication_year') && 
          i.description.includes('publication_date')
        )
      ).toBe(true);
    });

    test('should detect circular references in institution lineage', async () => {
      const circularInstitution = {
        id: 'I1234567890',
        display_name: 'Test Institution',
        lineage: ['I1234567890'], // Self-reference
        works_count: 0,
        cited_by_count: 0,
        counts_by_year: [],
      };

      const result = await validateEntityIntegrity(
        circularInstitution,
        EntityType.INSTITUTION
      );

      expect(result.isValid).toBe(false);
      expect(
        result.issues.some(i => i.description.includes('circular reference'))
      ).toBe(true);
    });

    test('should validate entity relationship consistency', async () => {
      const workWithInconsistentSource = {
        id: 'W1234567890',
        display_name: 'Test Work',
        primary_location: {
          source: {
            id: 'S1111111111',
            display_name: 'Journal A',
            type: 'journal',
          },
        },
        authorships: [
          {
            author: { id: 'A1234567890', display_name: 'Author 1' },
            institutions: [
              { id: 'I9999999999', display_name: 'Institution 1' }
            ],
          }
        ],
        // Source type mismatch
        type: 'book-chapter',
      };

      const result = await checkCrossFieldConsistency(
        workWithInconsistentSource,
        EntityType.WORK
      );

      expect(result.isValid).toBe(false);
    });
  });

  describe('Schema Violation Detection', () => {
    test('should detect unexpected additional fields', async () => {
      const workWithExtraFields = {
        id: 'W1234567890',
        display_name: 'Test Work',
        authorships: [],
        unexpected_field: 'should not exist',
        another_extra_field: 123,
      };

      const result = await detectSchemaViolations(
        workWithExtraFields,
        EntityType.WORK
      );

      expect(result.issues.length).toBeGreaterThan(0);
      expect(
        result.issues.some(i => 
          i.issueType === IssueType.EXTRA_FIELD && 
          i.fieldPath === 'unexpected_field'
        )
      ).toBe(true);
    });

    test('should detect deprecated field usage', async () => {
      const workWithDeprecatedFields = {
        id: 'W1234567890',
        display_name: 'Test Work',
        concepts: [{ id: 'C1234567890', level: 1, score: 0.5 }], // Deprecated
        authorships: [],
      };

      const result = await detectSchemaViolations(
        workWithDeprecatedFields,
        EntityType.WORK
      );

      expect(
        result.issues.some(i => 
          i.severity === Severity.WARNING &&
          i.description.includes('deprecated')
        )
      ).toBe(true);
    });

    test('should validate nested array constraints', async () => {
      const authorWithTooManyAffiliations = {
        id: 'A1234567890',
        display_name: 'Author 1',
        affiliations: new Array(101).fill(0).map((_, i) => ({
          institution: { id: `I${i}`, display_name: `Institution ${i}` },
          years: [2023],
        })), // Exceeds reasonable limit
      };

      const result = await detectSchemaViolations(
        authorWithTooManyAffiliations,
        EntityType.AUTHOR
      );

      expect(
        result.issues.some(i => 
          i.issueType === IssueType.VALUE_OUT_OF_RANGE &&
          i.description.includes('too many')
        )
      ).toBe(true);
    });
  });

  describe('Malformed Data Handling', () => {
    test('should handle null values gracefully', async () => {
      const result = await validateEntityIntegrity(null, EntityType.WORK);

      expect(result.isValid).toBe(false);
      expect(result.issues[0].issueType).toBe(IssueType.TYPE_MISMATCH);
      expect(result.issues[0].description).toContain('null');
    });

    test('should handle undefined values', async () => {
      const result = await validateEntityIntegrity(undefined, EntityType.WORK);

      expect(result.isValid).toBe(false);
      expect(result.issues[0].issueType).toBe(IssueType.MISSING_FIELD);
    });

    test('should handle empty strings in required fields', async () => {
      const workWithEmptyStrings = {
        id: 'W1234567890',
        display_name: '', // Empty required field
        authorships: [],
      };

      const result = await validateEntityIntegrity(
        workWithEmptyStrings,
        EntityType.WORK
      );

      expect(result.isValid).toBe(false);
      expect(
        result.issues.some(i => 
          i.fieldPath === 'display_name' &&
          i.issueType === IssueType.INVALID_FORMAT
        )
      ).toBe(true);
    });

    test('should handle deeply nested malformed data', async () => {
      const workWithMalformedNesting = {
        id: 'W1234567890',
        display_name: 'Test Work',
        authorships: [
          {
            author: {
              id: null, // Malformed
              display_name: undefined, // Malformed
            },
            institutions: 'not-an-array', // Wrong type
          }
        ],
      };

      const result = await validateEntityIntegrity(
        workWithMalformedNesting,
        EntityType.WORK
      );

      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(2);
    });

    test('should handle circular JSON structures', async () => {
      const circularData: Record<string, unknown> = {
        id: 'W1234567890',
        display_name: 'Test Work',
      };
      circularData.self = circularData; // Create circular reference

      // Should not throw error, should handle gracefully
      const result = await validateEntityIntegrity(
        circularData,
        EntityType.WORK
      );

      expect(result.isValid).toBe(false);
      expect(
        result.issues.some(i => i.description.includes('circular'))
      ).toBe(true);
    });
  });

  describe('Error Message Formatting', () => {
    test('should format technical errors for non-technical users', () => {
      const technicalError: ValidationIssue = {
        id: 'test-error-1',
        entityId: 'W1234567890',
        entityType: EntityType.WORK,
        issueType: IssueType.TYPE_MISMATCH,
        severity: Severity.ERROR,
        fieldPath: 'authorships.0.author.id',
        expectedType: 'string matching /^A\\d{7,10}$/',
        actualType: 'string',
        actualValue: 'invalid-id',
        description: 'Invalid type: expected string matching /^A\\d{7,10}$/ but received string',
        timestamp: new Date().toISOString(),
      };

      const formatted = formatValidationErrors([technicalError], {
        userFriendly: true,
        includeFieldPath: true,
        includeFixSuggestions: true,
      });

      expect(formatted).toContain('Author ID format');
      expect(formatted).toContain('should start with "A" followed by numbers');
      expect(formatted).not.toContain('regex');
    });

    test('should create accessible error messages with ARIA labels', () => {
      const error: ValidationIssue = {
        id: 'test-error-2',
        entityId: 'W1234567890',
        entityType: EntityType.WORK,
        issueType: IssueType.MISSING_FIELD,
        severity: Severity.ERROR,
        fieldPath: 'title',
        description: 'Required field is missing',
        timestamp: new Date().toISOString(),
      };

      const accessible = createAccessibleErrorMessage(error, {
        includeFieldContext: true,
        provideSuggestions: true,
        useSemanticMarkup: true,
      });

      expect(accessible).toContain('aria-describedby');
      expect(accessible).toContain('role="alert"');
      expect(accessible).toContain('Please provide a title');
    });

    test('should group related validation errors', () => {
      const errors: ValidationIssue[] = [
        {
          id: 'error-1',
          entityId: 'W1234567890',
          entityType: EntityType.WORK,
          issueType: IssueType.MISSING_FIELD,
          severity: Severity.ERROR,
          fieldPath: 'authorships.0.author.id',
          description: 'Missing author ID',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'error-2',
          entityId: 'W1234567890',
          entityType: EntityType.WORK,
          issueType: IssueType.MISSING_FIELD,
          severity: Severity.ERROR,
          fieldPath: 'authorships.0.author.display_name',
          description: 'Missing author name',
          timestamp: new Date().toISOString(),
        },
      ];

      const grouped = formatValidationErrors(errors, {
        groupByField: true,
        groupByType: true,
      });

      expect(grouped).toContain('Author Information');
      expect(grouped).toContain('Missing Fields');
    });
  });

  describe('Real-Time Validation Performance', () => {
    test('should debounce rapid validation calls', async () => {
      const validateSpy = vi.fn().mockResolvedValue({ isValid: true, issues: [] });
      validator.setCustomValidator(validateSpy);

      // Trigger multiple rapid validations
      validator.validateField('title', 'Test 1');
      validator.validateField('title', 'Test 2');
      validator.validateField('title', 'Test 3');

      await new Promise(resolve => setTimeout(resolve, 150));

      // Should only validate once due to debouncing
      expect(validateSpy).toHaveBeenCalledTimes(1);
      expect(validateSpy).toHaveBeenCalledWith('title', 'Test 3');
    });

    test('should cache validation results for identical inputs', async () => {
      const validateSpy = vi.fn().mockResolvedValue({ isValid: true, issues: [] });
      validator.setCustomValidator(validateSpy);

      await validator.validateField('title', 'Same Value');
      await validator.validateField('title', 'Same Value');

      expect(validateSpy).toHaveBeenCalledTimes(1);
    });

    test('should handle validation timeout gracefully', async () => {
      const slowValidator = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 5000))
      );
      validator.setCustomValidator(slowValidator);
      validator.setTimeout(1000);

      const result = await validator.validateField('title', 'Test');

      expect(result.isValid).toBe(false);
      expect(result.issues[0].description).toContain('timeout');
    });
  });

  describe('Edge Cases', () => {
    test('should handle very large data structures', async () => {
      const largeWork = {
        id: 'W1234567890',
        display_name: 'Test Work',
        authorships: new Array(1000).fill(0).map((_, i) => ({
          author: { id: `A${i}`, display_name: `Author ${i}` },
          institutions: [],
        })),
        abstract_inverted_index: Object.fromEntries(
          new Array(10000).fill(0).map((_, i) => [`word${i}`, [i]])
        ),
      };

      // Should not crash or timeout
      const result = await validateEntityIntegrity(largeWork, EntityType.WORK);
      expect(result).toBeDefined();
    });

    test('should handle Unicode and special characters', async () => {
      const unicodeWork = {
        id: 'W1234567890',
        display_name: '测试工作 🔬 Tëst Wørk',
        authorships: [{
          author: { id: 'A1234567890', display_name: 'Müller, José-María' },
          institutions: [],
        }],
      };

      const result = await validateEntityIntegrity(unicodeWork, EntityType.WORK);
      expect(result.isValid).toBe(true);
    });

    test('should handle mixed data types in arrays', async () => {
      const mixedArray = {
        id: 'W1234567890',
        display_name: 'Test Work',
        authorships: [
          { author: { id: 'A1', display_name: 'Author 1' }, institutions: [] },
          null, // Invalid
          'string', // Invalid
          123, // Invalid
        ],
      };

      const result = await validateEntityIntegrity(mixedArray, EntityType.WORK);
      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });
});