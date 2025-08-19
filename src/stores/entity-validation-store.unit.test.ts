/**
 * Entity Validation Store Unit Tests
 * 
 * Test-driven development for validation store features including:
 * - Validation statistics computation
 * - Cache management for statistics
 * - Validation operations and state management
 * - Log management and filtering
 * - Export functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEntityValidationStore } from './entity-validation-store';
import type { 
  EntityValidationResult, 
  BatchValidationResult, 
  ValidationIssue,
  ValidationLogEntry,
  ValidationStatistics,
  ValidationFilter 
} from '@/types/entity-validation';
import { 
  ValidationIssueType, 
  ValidationSeverity, 
  DEFAULT_VALIDATION_SETTINGS 
} from '@/types/entity-validation';
import type { EntityType } from '@/lib/openalex/utils/entity-detection';

// Mock the validator module
vi.mock('@/lib/openalex/utils/entity-validator', () => ({
  validateEntityData: vi.fn(),
  validateEntitiesBatch: vi.fn(),
}));

// Mock the exporter module
vi.mock('@/lib/openalex/utils/validation-exporter', () => ({
  exportValidationData: vi.fn(),
}));

describe('EntityValidationStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useEntityValidationStore.getState().clearAllValidationResults();
    useEntityValidationStore.getState().clearValidationLogs();
    useEntityValidationStore.getState().resetValidationSettings();
  });

  describe('Statistics Computation', () => {
    it('should compute basic validation statistics', () => {
      const store = useEntityValidationStore.getState();
      
      // Add test validation results
      const mockResults = createMockValidationResults();
      mockResults.forEach(result => {
        store.validationResults.set(result.entityId, result);
      });

      const statistics = store.getValidationStatistics();

      expect(statistics).toMatchObject({
        totalEntitiesValidated: 3,
        totalIssuesFound: 5, // 2 + 1 + 2 issues
        averageIssuesPerEntity: expect.closeTo(1.67, 2),
        validationSuccessRate: expect.closeTo(33.33, 2), // 1 out of 3 has no issues
        mostCommonIssueType: ValidationIssueType.MISSING_FIELD,
      });
    });

    it('should calculate issue type distribution correctly', () => {
      const store = useEntityValidationStore.getState();
      
      // Add results with specific issue types
      const result1: EntityValidationResult = {
        entityId: 'W123',
        entityType: 'W' as EntityType,
        entityDisplayName: 'Test Work',
        isValid: false,
        validatedAt: new Date().toISOString(),
        issues: [
          createMockIssue('W123', ValidationIssueType.MISSING_FIELD),
          createMockIssue('W123', ValidationIssueType.MISSING_FIELD),
          createMockIssue('W123', ValidationIssueType.TYPE_MISMATCH),
        ],
      };

      store.validationResults.set('W123', result1);

      const statistics = store.getValidationStatistics();

      expect(statistics.commonIssueTypes).toEqual([
        {
          issueType: ValidationIssueType.MISSING_FIELD,
          count: 2,
          percentage: expect.closeTo(66.67, 2),
        },
        {
          issueType: ValidationIssueType.TYPE_MISMATCH,
          count: 1,
          percentage: expect.closeTo(33.33, 2),
        },
        {
          issueType: ValidationIssueType.EXTRA_FIELD,
          count: 0,
          percentage: 0,
        },
        {
          issueType: ValidationIssueType.INVALID_FORMAT,
          count: 0,
          percentage: 0,
        },
        {
          issueType: ValidationIssueType.VALUE_OUT_OF_RANGE,
          count: 0,
          percentage: 0,
        },
      ]);
    });

    it('should calculate problematic entity types correctly', () => {
      const store = useEntityValidationStore.getState();
      
      // Add results for different entity types
      const workResult: EntityValidationResult = {
        entityId: 'W123',
        entityType: 'W' as EntityType,
        entityDisplayName: 'Test Work',
        isValid: false,
        validatedAt: new Date().toISOString(),
        issues: [
          createMockIssue('W123', ValidationIssueType.MISSING_FIELD, ValidationSeverity.ERROR),
          createMockIssue('W123', ValidationIssueType.TYPE_MISMATCH, ValidationSeverity.WARNING),
        ],
      };

      const authorResult: EntityValidationResult = {
        entityId: 'A456',
        entityType: 'A' as EntityType,
        entityDisplayName: 'Test Author',
        isValid: false,
        validatedAt: new Date().toISOString(),
        issues: [
          createMockIssue('A456', ValidationIssueType.INVALID_FORMAT, ValidationSeverity.ERROR),
        ],
      };

      store.validationResults.set('W123', workResult);
      store.validationResults.set('A456', authorResult);

      const statistics = store.getValidationStatistics();

      expect(statistics.problematicEntityTypes).toEqual([
        {
          entityType: 'W',
          errorCount: 1,
          warningCount: 1,
          totalCount: 2,
        },
        {
          entityType: 'A',
          errorCount: 1,
          warningCount: 0,
          totalCount: 1,
        },
      ]);
    });

    it('should track recent activity correctly', () => {
      const store = useEntityValidationStore.getState();
      
      const now = new Date();
      const result1: EntityValidationResult = {
        entityId: 'W123',
        entityType: 'W' as EntityType,
        entityDisplayName: 'Recent Work',
        isValid: false,
        validatedAt: new Date(now.getTime() - 1000).toISOString(), // 1 second ago
        issues: [createMockIssue('W123', ValidationIssueType.MISSING_FIELD, ValidationSeverity.ERROR)],
      };

      const result2: EntityValidationResult = {
        entityId: 'A456',
        entityType: 'A' as EntityType,
        entityDisplayName: 'Older Author',
        isValid: true,
        validatedAt: new Date(now.getTime() - 5000).toISOString(), // 5 seconds ago
        issues: [],
      };

      store.validationResults.set('W123', result1);
      store.validationResults.set('A456', result2);

      const statistics = store.getValidationStatistics();

      expect(statistics.recentActivity).toHaveLength(2);
      expect(statistics.recentActivity[0]).toMatchObject({
        entityId: 'W123',
        entityType: 'W',
        issueCount: 1,
        severity: ValidationSeverity.ERROR,
      });
      expect(statistics.recentActivity[1]).toMatchObject({
        entityId: 'A456',
        entityType: 'A',
        issueCount: 0,
        severity: ValidationSeverity.INFO,
      });
    });
  });

  describe('Statistics Caching', () => {
    it('should cache statistics for performance', () => {
      const store = useEntityValidationStore.getState();
      
      // Add some data
      const result = createMockValidationResults()[0];
      store.validationResults.set(result.entityId, result);

      // First call should compute and cache
      const stats1 = store.getValidationStatistics();
      const cacheTime1 = store.statisticsCacheTime;

      // Second call should return cached result
      const stats2 = store.getValidationStatistics();
      const cacheTime2 = store.statisticsCacheTime;

      expect(stats1).toBe(stats2); // Same reference
      expect(cacheTime1).toBe(cacheTime2);
    });

    it('should invalidate cache when validation results change', () => {
      const store = useEntityValidationStore.getState();
      
      // Add initial data and get stats
      const result1 = createMockValidationResults()[0];
      store.validationResults.set(result1.entityId, result1);
      store.getValidationStatistics();
      
      const initialCacheTime = store.statisticsCacheTime;

      // Add more data
      const result2 = createMockValidationResults()[1];
      store.validationResults.set(result2.entityId, result2);

      // Cache should be invalidated
      expect(store.statisticsCache).toBeNull();
      expect(store.statisticsCacheTime).toBeNull();

      // New stats should be computed
      const newStats = store.getValidationStatistics();
      expect(store.statisticsCacheTime).not.toBe(initialCacheTime);
      expect(newStats.totalEntitiesValidated).toBe(2);
    });

    it('should invalidate cache on clearing results', () => {
      const store = useEntityValidationStore.getState();
      
      // Add data and cache stats
      const result = createMockValidationResults()[0];
      store.validationResults.set(result.entityId, result);
      store.getValidationStatistics();

      expect(store.statisticsCache).not.toBeNull();

      // Clear results should invalidate cache
      store.clearAllValidationResults();

      expect(store.statisticsCache).toBeNull();
      expect(store.statisticsCacheTime).toBeNull();
    });

    it('should respect cache expiration time (5 minutes)', () => {
      const store = useEntityValidationStore.getState();
      
      // Add data
      const result = createMockValidationResults()[0];
      store.validationResults.set(result.entityId, result);

      // Set old cache time (6 minutes ago)
      const oldTime = Date.now() - (6 * 60 * 1000);
      store.statisticsCache = {
        totalValidationRuns: 0,
        totalEntitiesValidated: 1,
        totalIssuesFound: 2,
        averageIssuesPerEntity: 2,
        validationSuccessRate: 0,
        mostCommonIssueType: ValidationIssueType.MISSING_FIELD,
        commonIssueTypes: [],
        problematicEntityTypes: [],
        trends: [],
        recentActivity: [],
      };
      store.statisticsCacheTime = oldTime;

      // Should recompute despite cached value
      const newStats = store.getValidationStatistics();
      expect(store.statisticsCacheTime).toBeGreaterThan(oldTime);
    });
  });

  describe('Validation Operations', () => {
    it('should handle entity validation with loading state', async () => {
      const store = useEntityValidationStore.getState();
      const { validateEntityData } = await import('@/lib/openalex/utils/entity-validator');
      
      const mockResult: EntityValidationResult = {
        entityId: 'W123',
        entityType: 'W' as EntityType,
        entityDisplayName: 'Test Work',
        isValid: true,
        validatedAt: new Date().toISOString(),
        issues: [],
      };

      (validateEntityData as any).mockResolvedValue(mockResult);

      expect(store.isValidating).toBe(false);

      const resultPromise = store.validateEntity('W123', 'W' as EntityType, { test: 'data' });

      expect(store.isValidating).toBe(true);

      const result = await resultPromise;

      expect(store.isValidating).toBe(false);
      expect(result).toEqual(mockResult);
      expect(store.validationResults.get('W123')).toEqual(mockResult);
    });

    it('should handle validation errors properly', async () => {
      const store = useEntityValidationStore.getState();
      const { validateEntityData } = await import('@/lib/openalex/utils/entity-validator');

      (validateEntityData as any).mockRejectedValue(new Error('Validation failed'));

      await expect(
        store.validateEntity('W123', 'W' as EntityType, { test: 'data' })
      ).rejects.toThrow('Validation failed');

      expect(store.isValidating).toBe(false);
    });

    it('should handle batch validation correctly', async () => {
      const store = useEntityValidationStore.getState();
      const { validateEntitiesBatch } = await import('@/lib/openalex/utils/entity-validator');

      const mockBatchResult: BatchValidationResult = {
        batchId: 'batch-123',
        totalEntities: 2,
        validEntities: 1,
        invalidEntities: 1,
        totalIssues: 2,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        results: createMockValidationResults().slice(0, 2),
      };

      (validateEntitiesBatch as any).mockResolvedValue(mockBatchResult);

      const entities = [
        { id: 'W123', type: 'W' as EntityType, data: { test: 'data1' } },
        { id: 'A456', type: 'A' as EntityType, data: { test: 'data2' } },
      ];

      const result = await store.validateBatch(entities);

      expect(result).toEqual(mockBatchResult);
      expect(store.validationResults.get('W123')).toBeDefined();
      expect(store.validationResults.get('A456')).toBeDefined();
    });
  });

  describe('Log Management', () => {
    it('should add log entries correctly', () => {
      const store = useEntityValidationStore.getState();
      
      const mockBatchResult: BatchValidationResult = {
        batchId: 'batch-123',
        totalEntities: 1,
        validEntities: 0,
        invalidEntities: 1,
        totalIssues: 2,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        results: [createMockValidationResults()[0]],
      };

      store.addLogEntry(mockBatchResult, { source: 'automated' });

      expect(store.validationLogs).toHaveLength(1);
      expect(store.validationLogs[0]).toMatchObject({
        id: 'log_batch-123',
        batchResult: mockBatchResult,
        metadata: {
          source: 'automated',
        },
      });
    });

    it('should maintain maximum log entries limit', () => {
      const store = useEntityValidationStore.getState();
      
      // Set a small limit for testing
      store.updateValidationSettings({ maxLogEntries: 3 });

      // Add more entries than the limit
      for (let i = 0; i < 5; i++) {
        const mockBatchResult: BatchValidationResult = {
          batchId: `batch-${i}`,
          totalEntities: 1,
          validEntities: 1,
          invalidEntities: 0,
          totalIssues: 0,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          results: [],
        };
        store.addLogEntry(mockBatchResult);
      }

      expect(store.validationLogs).toHaveLength(3);
      // Should keep the most recent entries
      expect(store.validationLogs[0].id).toBe('log_batch-4');
      expect(store.validationLogs[2].id).toBe('log_batch-2');
    });

    it('should remove log entries and clear selection', () => {
      const store = useEntityValidationStore.getState();
      
      const mockBatchResult: BatchValidationResult = {
        batchId: 'batch-123',
        totalEntities: 1,
        validEntities: 1,
        invalidEntities: 0,
        totalIssues: 0,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        results: [],
      };

      store.addLogEntry(mockBatchResult);
      store.selectLogEntry('log_batch-123');

      expect(store.selectedLogEntry).toBe('log_batch-123');

      store.removeLogEntry('log_batch-123');

      expect(store.validationLogs).toHaveLength(0);
      expect(store.selectedLogEntry).toBeNull();
    });
  });

  describe('Filtering and Querying', () => {
    it('should filter validation issues by entity type', () => {
      const store = useEntityValidationStore.getState();
      
      // Add mixed results
      const workResult = createMockValidationResults()[0]; // W type
      const authorResult = createMockValidationResults()[1]; // A type
      
      store.validationResults.set(workResult.entityId, workResult);
      store.validationResults.set(authorResult.entityId, authorResult);

      const filter: ValidationFilter = {
        entityTypes: ['W' as EntityType],
        limit: 100,
        offset: 0,
      };

      const filteredIssues = store.getValidationIssues(filter);

      expect(filteredIssues).toHaveLength(2); // Only issues from W entity
      expect(filteredIssues.every(issue => issue.entityType === 'W')).toBe(true);
    });

    it('should filter validation issues by severity', () => {
      const store = useEntityValidationStore.getState();
      
      const result: EntityValidationResult = {
        entityId: 'W123',
        entityType: 'W' as EntityType,
        entityDisplayName: 'Test Work',
        isValid: false,
        validatedAt: new Date().toISOString(),
        issues: [
          createMockIssue('W123', ValidationIssueType.MISSING_FIELD, ValidationSeverity.ERROR),
          createMockIssue('W123', ValidationIssueType.TYPE_MISMATCH, ValidationSeverity.WARNING),
          createMockIssue('W123', ValidationIssueType.INVALID_FORMAT, ValidationSeverity.INFO),
        ],
      };

      store.validationResults.set('W123', result);

      const filter: ValidationFilter = {
        severities: [ValidationSeverity.ERROR],
        limit: 100,
        offset: 0,
      };

      const filteredIssues = store.getValidationIssues(filter);

      expect(filteredIssues).toHaveLength(1);
      expect(filteredIssues[0].severity).toBe(ValidationSeverity.ERROR);
    });

    it('should filter validation issues by search text', () => {
      const store = useEntityValidationStore.getState();
      
      const result: EntityValidationResult = {
        entityId: 'W123',
        entityType: 'W' as EntityType,
        entityDisplayName: 'Special Test Work',
        isValid: false,
        validatedAt: new Date().toISOString(),
        issues: [
          createMockIssue('W123', ValidationIssueType.MISSING_FIELD, ValidationSeverity.ERROR, 'missing title field'),
          createMockIssue('W123', ValidationIssueType.TYPE_MISMATCH, ValidationSeverity.WARNING, 'invalid author format'),
        ],
      };

      store.validationResults.set('W123', result);

      const filter: ValidationFilter = {
        searchText: 'title',
        limit: 100,
        offset: 0,
      };

      const filteredIssues = store.getValidationIssues(filter);

      expect(filteredIssues).toHaveLength(1);
      expect(filteredIssues[0].description).toContain('title');
    });

    it('should apply pagination to filtered results', () => {
      const store = useEntityValidationStore.getState();
      
      // Create result with many issues
      const issues = Array.from({ length: 25 }, (_, i) => 
        createMockIssue('W123', ValidationIssueType.MISSING_FIELD, ValidationSeverity.ERROR, `Issue ${i}`)
      );

      const result: EntityValidationResult = {
        entityId: 'W123',
        entityType: 'W' as EntityType,
        entityDisplayName: 'Test Work',
        isValid: false,
        validatedAt: new Date().toISOString(),
        issues,
      };

      store.validationResults.set('W123', result);

      const filter: ValidationFilter = {
        limit: 10,
        offset: 5,
      };

      const filteredIssues = store.getValidationIssues(filter);

      expect(filteredIssues).toHaveLength(10);
      expect(filteredIssues[0].description).toBe('Issue 5');
      expect(filteredIssues[9].description).toBe('Issue 14');
    });
  });

  describe('Utility Functions', () => {
    it('should correctly identify entities with issues', () => {
      const store = useEntityValidationStore.getState();
      
      const validResult = createMockValidationResults()[2]; // No issues
      const invalidResult = createMockValidationResults()[0]; // Has issues

      store.validationResults.set(validResult.entityId, validResult);
      store.validationResults.set(invalidResult.entityId, invalidResult);

      expect(store.hasValidationIssues(validResult.entityId)).toBe(false);
      expect(store.hasValidationIssues(invalidResult.entityId)).toBe(true);
      expect(store.hasValidationIssues('nonexistent')).toBe(false);
    });

    it('should count entity issues correctly', () => {
      const store = useEntityValidationStore.getState();
      
      const result = createMockValidationResults()[0]; // 2 issues
      store.validationResults.set(result.entityId, result);

      expect(store.getEntityIssueCount(result.entityId)).toBe(2);
      expect(store.getEntityIssueCount('nonexistent')).toBe(0);
    });

    it('should determine highest severity correctly', () => {
      const store = useEntityValidationStore.getState();
      
      const result: EntityValidationResult = {
        entityId: 'W123',
        entityType: 'W' as EntityType,
        entityDisplayName: 'Test Work',
        isValid: false,
        validatedAt: new Date().toISOString(),
        issues: [
          createMockIssue('W123', ValidationIssueType.MISSING_FIELD, ValidationSeverity.WARNING),
          createMockIssue('W123', ValidationIssueType.TYPE_MISMATCH, ValidationSeverity.ERROR),
          createMockIssue('W123', ValidationIssueType.INVALID_FORMAT, ValidationSeverity.INFO),
        ],
      };

      store.validationResults.set('W123', result);

      expect(store.getEntityHighestSeverity('W123')).toBe(ValidationSeverity.ERROR);
      expect(store.getEntityHighestSeverity('nonexistent')).toBeNull();
    });
  });
});

// Helper functions for creating mock data

function createMockValidationResults(): EntityValidationResult[] {
  return [
    {
      entityId: 'W123456789',
      entityType: 'W' as EntityType,
      entityDisplayName: 'Test Work 1',
      isValid: false,
      validatedAt: new Date().toISOString(),
      issues: [
        createMockIssue('W123456789', ValidationIssueType.MISSING_FIELD),
        createMockIssue('W123456789', ValidationIssueType.TYPE_MISMATCH),
      ],
    },
    {
      entityId: 'A987654321',
      entityType: 'A' as EntityType,
      entityDisplayName: 'Test Author 1',
      isValid: false,
      validatedAt: new Date().toISOString(),
      issues: [
        createMockIssue('A987654321', ValidationIssueType.MISSING_FIELD),
      ],
    },
    {
      entityId: 'S555666777',
      entityType: 'S' as EntityType,
      entityDisplayName: 'Test Source 1',
      isValid: true,
      validatedAt: new Date().toISOString(),
      issues: [],
    },
  ];
}

function createMockIssue(
  entityId: string,
  issueType: ValidationIssueType,
  severity: ValidationSeverity = ValidationSeverity.ERROR,
  description?: string
): ValidationIssue {
  return {
    entityId,
    entityType: entityId.charAt(0) as EntityType,
    entityDisplayName: `Mock Entity ${entityId}`,
    issueType,
    severity,
    fieldPath: 'test.field',
    description: description || `Mock ${issueType} issue`,
    expectedValue: 'expected',
    actualValue: 'actual',
    timestamp: new Date().toISOString(),
  };
}