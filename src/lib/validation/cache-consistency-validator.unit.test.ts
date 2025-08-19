/**
 * Cache Consistency Validation Tests
 * 
 * Tests for validating data consistency across different cache layers,
 * detecting cache invalidation issues, and ensuring data integrity.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

import { EntityType } from '@/lib/openalex/utils/entity-detection';
import type {
  EntityValidationResult,
  ValidationIssue,
} from '@/types/entity-validation';
import {
  ValidationIssueType,
  ValidationSeverity,
} from '@/types/entity-validation';

// Import functions to test (these will be implemented)
import {
  CacheConsistencyValidator,
  validateCacheConsistency,
  detectStaleData,
  validateCacheIntegrity,
  checkCrossLayerConsistency,
  detectCacheCorruption,
  repairCacheInconsistency,
  validateCacheMetadata,
  analyzeCachePerformance,
} from './cache-consistency-validator';

// Mock cache layers for testing
interface MockCacheLayer {
  name: string;
  data: Map<string, unknown>;
  metadata: Map<string, { timestamp: number; ttl: number; version: string; checksum?: string; size?: number; accessCount?: number }>;
  lastUpdate: number;
  getData: (key: string) => unknown;
  setData: (key: string, value: unknown) => void;
  getMetadata: (key: string) => { timestamp: number; ttl: number; version: string; checksum?: string; size?: number; accessCount?: number } | null;
  setMetadata: (key: string, metadata: { timestamp: number; ttl: number; version: string; checksum?: string; size?: number; accessCount?: number }) => void;
  clear: (key: string) => void;
}

describe('Cache Consistency Validator', () => {
  let validator: CacheConsistencyValidator;
  let memoryCache: MockCacheLayer;
  let indexedDbCache: MockCacheLayer;
  let localStorageCache: MockCacheLayer;

  beforeEach(() => {
    const createMockCacheLayer = (name: string, lastUpdate: number): MockCacheLayer => {
      const data = new Map<string, unknown>();
      const metadata = new Map<string, { timestamp: number; ttl: number; version: string; checksum?: string; size?: number; accessCount?: number }>();
      
      return {
        name,
        data,
        metadata,
        lastUpdate,
        getData: (key: string) => data.get(key),
        setData: (key: string, value: unknown) => { data.set(key, value); },
        getMetadata: (key: string) => metadata.get(key) || null,
        setMetadata: (key: string, meta: { timestamp: number; ttl: number; version: string; checksum?: string; size?: number; accessCount?: number }) => { metadata.set(key, meta); },
        clear: (key: string) => { data.delete(key); metadata.delete(key); }
      };
    };

    memoryCache = createMockCacheLayer('memory', Date.now());
    indexedDbCache = createMockCacheLayer('indexeddb', Date.now() - 1000);
    localStorageCache = createMockCacheLayer('localstorage', Date.now() - 2000);

    validator = new CacheConsistencyValidator({
      layers: [memoryCache, indexedDbCache, localStorageCache],
      stalenessThreshold: 300000, // 5 minutes
      integrityCheckInterval: 60000, // 1 minute
      autoRepair: true,
    });
  });

  describe('Cache Data Consistency', () => {
    test('should detect consistent data across cache layers', async () => {
      const entityId = 'W1234567890';
      const entityData = {
        id: entityId,
        display_name: 'Test Work',
        cited_by_count: 42,
        updated_date: '2023-01-01T00:00:00.000Z',
      };

      // Same data in all layers
      memoryCache.data.set(entityId, entityData);
      indexedDbCache.data.set(entityId, entityData);
      localStorageCache.data.set(entityId, entityData);

      const result = await validateCacheConsistency(entityId, EntityType.WORK);

      expect(result.isConsistent).toBe(true);
      expect(result.layers.every(layer => layer.hasData)).toBe(true);
      expect(result.inconsistencies).toHaveLength(0);
    });

    test('should detect data inconsistencies between layers', async () => {
      const entityId = 'W1234567890';
      
      const memoryData = {
        id: entityId,
        display_name: 'Updated Work Title',
        cited_by_count: 45,
        updated_date: '2023-01-02T00:00:00.000Z',
      };

      const persistentData = {
        id: entityId,
        display_name: 'Old Work Title',
        cited_by_count: 42,
        updated_date: '2023-01-01T00:00:00.000Z',
      };

      memoryCache.data.set(entityId, memoryData);
      indexedDbCache.data.set(entityId, persistentData);
      localStorageCache.data.set(entityId, persistentData);

      const result = await validateCacheConsistency(entityId, EntityType.WORK);

      expect(result.isConsistent).toBe(false);
      expect(result.inconsistencies.length).toBeGreaterThan(0);
      expect(
        result.inconsistencies.some(i => 
          i.field === 'display_name' && 
          i.values.includes('Updated Work Title') &&
          i.values.includes('Old Work Title')
        )
      ).toBe(true);
    });

    test('should identify the most recent version across layers', async () => {
      const entityId = 'W1234567890';
      
      const oldData = {
        id: entityId,
        display_name: 'Old Title',
        updated_date: '2023-01-01T00:00:00.000Z',
      };

      const newerData = {
        id: entityId,
        display_name: 'Newer Title',
        updated_date: '2023-01-02T00:00:00.000Z',
      };

      const newestData = {
        id: entityId,
        display_name: 'Newest Title',
        updated_date: '2023-01-03T00:00:00.000Z',
      };

      memoryCache.data.set(entityId, newestData);
      indexedDbCache.data.set(entityId, newerData);
      localStorageCache.data.set(entityId, oldData);

      const result = await validateCacheConsistency(entityId, EntityType.WORK);

      expect(result.mostRecentVersion.layer).toBe('memory');
      expect((result.mostRecentVersion.data as { display_name: string }).display_name).toBe('Newest Title');
      expect(result.recommendedAction).toBe('propagate_from_memory');
    });

    test('should handle missing data in specific layers', async () => {
      const entityId = 'W1234567890';
      const entityData = {
        id: entityId,
        display_name: 'Test Work',
        cited_by_count: 42,
      };

      // Only in memory cache
      memoryCache.data.set(entityId, entityData);

      const result = await validateCacheConsistency(entityId, EntityType.WORK);

      expect(result.isConsistent).toBe(false);
      expect(result.layers.filter(l => l.hasData)).toHaveLength(1);
      expect(result.layers.filter(l => !l.hasData)).toHaveLength(2);
      expect(result.recommendedAction).toBe('propagate_to_missing_layers');
    });
  });

  describe('Stale Data Detection', () => {
    test('should detect stale data based on timestamps', async () => {
      const entityId = 'W1234567890';
      const now = Date.now();
      
      const staleData = {
        id: entityId,
        display_name: 'Stale Work',
        updated_date: new Date(now - 400000).toISOString(), // 6+ minutes old
      };

      memoryCache.data.set(entityId, staleData);
      memoryCache.metadata.set(entityId, {
        timestamp: now - 400000,
        ttl: 300000, // 5 minute TTL
        version: 'v1',
      });

      const result = await detectStaleData(entityId);

      expect(result.isStale).toBe(true);
      expect(result.staleLayers).toContain('memory');
      expect(result.ageMs).toBeGreaterThan(300000);
    });

    test('should handle TTL-based expiration', async () => {
      const entityId = 'W1234567890';
      const now = Date.now();

      const entityData = {
        id: entityId,
        display_name: 'Test Work',
      };

      memoryCache.data.set(entityId, entityData);
      memoryCache.metadata.set(entityId, {
        timestamp: now - 200000, // 3 minutes ago
        ttl: 180000, // 3 minute TTL (expired)
        version: 'v1',
      });

      const result = await detectStaleData(entityId);

      expect(result.isStale).toBe(true);
      expect(result.reason).toBe('ttl_expired');
    });

    test('should handle version-based staleness', async () => {
      const entityId = 'W1234567890';
      
      const oldVersionData = {
        id: entityId,
        display_name: 'Old Version',
        version: 'v1.0.0',
      };

      const newVersionData = {
        id: entityId,
        display_name: 'New Version',
        version: 'v2.0.0',
      };

      memoryCache.data.set(entityId, oldVersionData);
      indexedDbCache.data.set(entityId, newVersionData);

      const result = await validateCacheConsistency(entityId, EntityType.WORK);

      expect(result.versionMismatch).toBe(true);
      expect(result.recommendedAction).toBe('update_to_latest_version');
    });
  });

  describe('Cache Integrity Validation', () => {
    test('should detect corrupted cache entries', async () => {
      const entityId = 'W1234567890';
      
      const corruptedData: Record<string, unknown> = {
        id: entityId,
        display_name: null, // Corrupted required field
        cited_by_count: 'invalid', // Wrong type
        malformed_field: { circular: null },
      };
      // Create circular reference
      (corruptedData.malformed_field as Record<string, unknown>).circular = corruptedData;

      memoryCache.data.set(entityId, corruptedData);

      const result = await detectCacheCorruption(entityId);

      expect(result.isCorrupted).toBe(true);
      expect(result.corruptionTypes).toContain('null_required_field');
      expect(result.corruptionTypes).toContain('type_mismatch');
      expect(result.corruptionTypes).toContain('circular_reference');
    });

    test('should validate cache metadata integrity', async () => {
      const entityId = 'W1234567890';
      
      memoryCache.data.set(entityId, { id: entityId, display_name: 'Test' });
      // Missing metadata
      
      const result = await validateCacheMetadata(entityId);

      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.includes('missing metadata'))).toBe(true);
    });

    test('should detect checksum mismatches', async () => {
      const entityId = 'W1234567890';
      const originalData = { id: entityId, display_name: 'Original' };
      const modifiedData = { id: entityId, display_name: 'Modified' };

      // Simulate checksum storage
      const originalChecksum = 'abc123';
      
      memoryCache.data.set(entityId, modifiedData);
      memoryCache.metadata.set(entityId, {
        timestamp: Date.now(),
        ttl: 300000,
        version: 'v1',
        checksum: originalChecksum,
      });

      const result = await validateCacheIntegrity(entityId);

      expect(result.checksumValid).toBe(false);
      expect(result.dataModified).toBe(true);
    });
  });

  describe('Cross-Layer Consistency', () => {
    test('should validate hierarchical cache consistency', async () => {
      const entityId = 'W1234567890';
      
      // Memory cache (fastest) - most recent
      const memoryData = {
        id: entityId,
        display_name: 'Latest Version',
        cited_by_count: 50,
        updated_date: '2023-01-03T00:00:00.000Z',
      };

      // IndexedDB (medium) - intermediate
      const idbData = {
        id: entityId,
        display_name: 'Intermediate Version',
        cited_by_count: 45,
        updated_date: '2023-01-02T00:00:00.000Z',
      };

      // LocalStorage (slowest) - oldest
      const lsData = {
        id: entityId,
        display_name: 'Old Version',
        cited_by_count: 40,
        updated_date: '2023-01-01T00:00:00.000Z',
      };

      memoryCache.data.set(entityId, memoryData);
      indexedDbCache.data.set(entityId, idbData);
      localStorageCache.data.set(entityId, lsData);

      const result = await checkCrossLayerConsistency(entityId);

      expect(result.hierarchyValid).toBe(true); // Faster layers have newer data
      expect(result.propagationNeeded).toBe(true); // Slower layers need updates
      expect(result.propagationDirection).toBe('downward');
    });

    test('should detect inverted hierarchy issues', async () => {
      const entityId = 'W1234567890';
      
      // Slower layer has newer data than faster layer (problematic)
      const memoryData = {
        id: entityId,
        updated_date: '2023-01-01T00:00:00.000Z', // Older
      };

      const idbData = {
        id: entityId,
        updated_date: '2023-01-02T00:00:00.000Z', // Newer
      };

      memoryCache.data.set(entityId, memoryData);
      indexedDbCache.data.set(entityId, idbData);

      const result = await checkCrossLayerConsistency(entityId);

      expect(result.hierarchyValid).toBe(false);
      expect(result.invertedHierarchy).toBe(true);
      expect(result.recommendedAction).toBe('propagate_upward');
    });
  });

  describe('Cache Repair Operations', () => {
    test('should repair simple data inconsistencies', async () => {
      const entityId = 'W1234567890';
      
      const correctData = {
        id: entityId,
        display_name: 'Correct Title',
        cited_by_count: 45,
        updated_date: '2023-01-02T00:00:00.000Z',
      };

      const incorrectData = {
        id: entityId,
        display_name: 'Wrong Title',
        cited_by_count: 40,
        updated_date: '2023-01-01T00:00:00.000Z',
      };

      memoryCache.data.set(entityId, correctData);
      indexedDbCache.data.set(entityId, incorrectData);

      const result = await repairCacheInconsistency(entityId, {
        strategy: 'use_most_recent',
        propagate: true,
      });

      expect(result.repaired).toBe(true);
      expect(result.propagatedToLayers).toContain('indexeddb');
      expect((result.finalState as { display_name: string }).display_name).toBe('Correct Title');
    });

    test('should handle repair conflicts with user input', async () => {
      const entityId = 'W1234567890';
      
      const conflictingData1 = {
        id: entityId,
        display_name: 'Version A',
        updated_date: '2023-01-02T00:00:00.000Z',
      };

      const conflictingData2 = {
        id: entityId,
        display_name: 'Version B',
        updated_date: '2023-01-02T00:00:00.000Z', // Same timestamp
      };

      memoryCache.data.set(entityId, conflictingData1);
      indexedDbCache.data.set(entityId, conflictingData2);

      const result = await repairCacheInconsistency(entityId, {
        strategy: 'require_user_choice',
        conflictResolution: 'prompt',
      });

      expect(result.requiresUserInput).toBe(true);
      expect(result.conflictOptions).toHaveLength(2);
      expect((result.conflictOptions![0].data as { display_name: string }).display_name).toBe('Version A');
      expect((result.conflictOptions![1].data as { display_name: string }).display_name).toBe('Version B');
    });

    test('should repair corrupted cache data', async () => {
      const entityId = 'W1234567890';
      
      const corruptedData = {
        id: entityId,
        display_name: null,
        cited_by_count: 'invalid',
        undefined_field: undefined,
      };

      memoryCache.data.set(entityId, corruptedData);

      const result = await repairCacheInconsistency(entityId, {
        strategy: 'repair_corruption',
        useDefaults: true,
      });

      expect(result.repaired).toBe(true);
      expect((result.finalState as { display_name: string }).display_name).toBe('[Unknown Title]');
      expect((result.finalState as { cited_by_count: number }).cited_by_count).toBe(0);
      expect('undefined_field' in (result.finalState as Record<string, unknown>)).toBe(false);
    });
  });

  describe('Cache Performance Analysis', () => {
    test('should analyze cache hit rates across layers', async () => {
      const analysisData = {
        requests: 1000,
        memoryHits: 800,
        indexedDbHits: 150,
        localStorageHits: 50,
        misses: 0,
      };

      const result = await analyzeCachePerformance(analysisData);

      expect(result.totalHitRate).toBe(1.0); // 100%
      expect(result.layerHitRates.memory).toBe(0.8); // 80%
      expect(result.layerHitRates.indexeddb).toBe(0.15); // 15%
      expect(result.layerHitRates.localstorage).toBe(0.05); // 5%
      expect(result.efficiency).toBe('optimal');
    });

    test('should detect cache performance issues', async () => {
      const problematicData = {
        requests: 1000,
        memoryHits: 100, // Low memory hit rate
        indexedDbHits: 300,
        localStorageHits: 400,
        misses: 200, // High miss rate
      };

      const result = await analyzeCachePerformance(problematicData);

      expect(result.totalHitRate).toBe(0.8); // 80%
      expect(result.efficiency).toBe('poor');
      expect(result.issues).toContain('low_memory_hit_rate');
      expect(result.issues).toContain('high_miss_rate');
      expect(result.recommendations).toContain('increase_memory_cache_size');
    });

    test('should analyze cache invalidation patterns', async () => {
      const invalidationData = {
        totalInvalidations: 100,
        timeBasedInvalidations: 60,
        manualInvalidations: 30,
        errorBasedInvalidations: 10,
        averageDataAge: 180000, // 3 minutes
      };

      const result = await validator.analyzeInvalidationPatterns(invalidationData);

      expect(result.invalidationRate).toBe(0.6); // Time-based
      expect(result.patterns.timeBasedRate).toBe(0.6);
      expect(result.patterns.manualRate).toBe(0.3);
      expect(result.patterns.errorRate).toBe(0.1);
      expect(result.dataFreshness).toBe('good'); // 3 minutes average
    });
  });

  describe('Cache Validation Integration', () => {
    test('should integrate with entity validation store', async () => {
      const entityId = 'W1234567890';
      const validationResult: EntityValidationResult = {
        entityId,
        entityType: EntityType.WORK,
        isValid: false,
        issues: [
          {
            id: 'issue-1',
            entityId,
            entityType: EntityType.WORK,
            issueType: ValidationIssueType.MISSING_FIELD,
            severity: ValidationSeverity.ERROR,
            fieldPath: 'display_name',
            description: 'Missing required field',
            timestamp: new Date().toISOString(),
          }
        ],
        issueCounts: { errors: 1, warnings: 0, info: 0 },
        validatedAt: new Date().toISOString(),
        validationDurationMs: 100,
      };

      // Store validation result in cache
      memoryCache.data.set(`validation_${entityId}`, validationResult);

      const consistencyResult = await validateCacheConsistency(
        `validation_${entityId}`,
        EntityType.WORK
      );

      expect(consistencyResult.isConsistent).toBeDefined();
      expect(consistencyResult.layers).toBeDefined();
    });

    test('should handle cache validation result inconsistencies', async () => {
      const entityId = 'W1234567890';
      
      const validationResult1: EntityValidationResult = {
        entityId,
        entityType: EntityType.WORK,
        isValid: true,
        issues: [],
        issueCounts: { errors: 0, warnings: 0, info: 0 },
        validatedAt: '2023-01-01T00:00:00.000Z',
        validationDurationMs: 100,
      };

      const validationResult2: EntityValidationResult = {
        entityId,
        entityType: EntityType.WORK,
        isValid: false,
        issues: [
          {
            id: 'issue-1',
            entityId,
            entityType: EntityType.WORK,
            issueType: ValidationIssueType.TYPE_MISMATCH,
            severity: ValidationSeverity.ERROR,
            fieldPath: 'cited_by_count',
            description: 'Type mismatch',
            timestamp: '2023-01-02T00:00:00.000Z',
          }
        ],
        issueCounts: { errors: 1, warnings: 0, info: 0 },
        validatedAt: '2023-01-02T00:00:00.000Z',
        validationDurationMs: 150,
      };

      memoryCache.data.set(`validation_${entityId}`, validationResult2);
      indexedDbCache.data.set(`validation_${entityId}`, validationResult1);

      const result = await validateCacheConsistency(
        `validation_${entityId}`,
        EntityType.WORK
      );

      expect(result.isConsistent).toBe(false);
      expect(result.inconsistencies.length).toBeGreaterThan(0);
      expect(result.recommendedAction).toBe('propagate_from_memory');
    });
  });
});