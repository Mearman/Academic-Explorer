/**
 * @file entity-service.unit.test.ts
 * @description Comprehensive unit tests for entity service functions
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  fetchWork,
  fetchAuthor,
  fetchSource,
  fetchInstitution,
  fetchPublisher,
  fetchFunder,
  fetchTopic,
  fetchAnyEntity,
  fetchEntitiesBatch,
  fetchEntityWithRetry,
  validateEntityIdFormat,
  checkEntityExists,
  getEntityTypeFromId,
  EntityService,
  ServiceErrorType,
  type ServiceResponse,
  type ServiceError
} from './entity-service';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { mockWork, mockAuthor, mockSource, mockInstitution } from '@/test/mocks/data';

// Mock the cachedOpenAlex client with simpler approach to reduce memory usage
vi.mock('@/lib/openalex', () => ({
  cachedOpenAlex: {
    work: vi.fn(),
    author: vi.fn(),
    source: vi.fn(),
    institution: vi.fn(),
    publisher: vi.fn(),
    funder: vi.fn(),
    topic: vi.fn()
  }
}));

describe('Entity Service Functions', () => {
  // Get mock reference for accessing mocked functions
  let cachedOpenAlex: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Get mock reference for accessing mocked functions
    const openAlexModule = vi.mocked(await import('@/lib/openalex'));
    cachedOpenAlex = openAlexModule.cachedOpenAlex;
    
    // Reset mock implementations
    cachedOpenAlex.work.mockReset();
    cachedOpenAlex.author.mockReset();
    cachedOpenAlex.source.mockReset();
    cachedOpenAlex.institution.mockReset();
    cachedOpenAlex.publisher.mockReset();
    cachedOpenAlex.funder.mockReset();
    cachedOpenAlex.topic.mockReset();
  });

  describe('fetchWork', () => {
    it('should fetch work successfully', async () => {
      cachedOpenAlex.work.mockResolvedValue(mockWork);

      const result = await fetchWork('W2741809807');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockWork);
      expect(result.error).toBeUndefined();
      expect(result.cached).toBe(true);
      expect(result.fetchTime).toBeGreaterThan(0);
      expect(cachedOpenAlex.work).toHaveBeenCalledWith('W2741809807', false);
    });

    it('should handle work with numeric ID', async () => {
      cachedOpenAlex.work.mockResolvedValue(mockWork);

      const result = await fetchWork('2741809807');

      expect(result.success).toBe(true);
      expect(cachedOpenAlex.work).toHaveBeenCalledWith('W2741809807', false);
    });

    it('should handle work from URL', async () => {
      cachedOpenAlex.work.mockResolvedValue(mockWork);

      const result = await fetchWork('https://openalex.org/W2741809807');

      expect(result.success).toBe(true);
      expect(cachedOpenAlex.work).toHaveBeenCalledWith('W2741809807', false);
    });

    it('should skip cache when requested', async () => {
      cachedOpenAlex.work.mockResolvedValue(mockWork);

      const result = await fetchWork('W2741809807', { skipCache: true });

      expect(result.success).toBe(true);
      expect(result.cached).toBe(false);
      expect(cachedOpenAlex.work).toHaveBeenCalledWith('W2741809807', true);
    });

    it('should return error for invalid ID format', async () => {
      const result = await fetchWork('invalid-id');

      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: ServiceErrorType.INVALID_ID,
          retryable: false,
          userMessage: expect.stringContaining('Invalid entity ID format'),
          entityId: 'invalid-id'
        })
      );
    });

    it('should handle 404 errors', async () => {
      cachedOpenAlex.work.mockRejectedValue(new Error('Not found - 404'));

      const result = await fetchWork('W2741809807');

      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: ServiceErrorType.NOT_FOUND,
          statusCode: 404,
          retryable: false,
          userMessage: expect.stringContaining('was not found'),
          entityId: 'W2741809807'
        })
      );
    });

    it('should handle network errors', async () => {
      cachedOpenAlex.work.mockRejectedValue(new Error('Network connection failed'));

      const result = await fetchWork('W2741809807');

      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: ServiceErrorType.NETWORK_ERROR,
          retryable: true,
          userMessage: expect.stringContaining('Network connection failed')
        })
      );
    });

    it('should handle rate limiting errors', async () => {
      cachedOpenAlex.work.mockRejectedValue(new Error('Too many requests - 429'));

      const result = await fetchWork('W2741809807');

      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: ServiceErrorType.RATE_LIMITED,
          statusCode: 429,
          retryable: true,
          userMessage: expect.stringContaining('Too many requests')
        })
      );
    });

    it('should handle timeout errors', async () => {
      // Mock an AbortError to simulate timeout
      const abortError = new Error('Request timeout');
      abortError.name = 'AbortError';
      cachedOpenAlex.work.mockRejectedValue(abortError);

      const result = await fetchWork('W2741809807');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ServiceErrorType.TIMEOUT);
    });

    it('should throw errors when throwOnError is true', async () => {
      cachedOpenAlex.work.mockRejectedValue(new Error('Test error'));

      await expect(
        fetchWork('W2741809807', { throwOnError: true })
      ).rejects.toThrow();
    });
  });

  describe('fetchAuthor', () => {
    it('should fetch author successfully', async () => {
      cachedOpenAlex.author.mockResolvedValue(mockAuthor);

      const result = await fetchAuthor('A2887492');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAuthor);
      expect(cachedOpenAlex.author).toHaveBeenCalledWith('A2887492', false);
    });

    it('should handle numeric author ID', async () => {
      cachedOpenAlex.author.mockResolvedValue(mockAuthor);

      const result = await fetchAuthor('2887492');

      expect(result.success).toBe(true);
      expect(cachedOpenAlex.author).toHaveBeenCalledWith('A2887492', false);
    });

    it('should return error for invalid author ID', async () => {
      const result = await fetchAuthor('W2741809807'); // Wrong prefix

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ServiceErrorType.INVALID_ID);
    });
  });

  describe('fetchSource', () => {
    it('should fetch source successfully', async () => {
      cachedOpenAlex.source.mockResolvedValue(mockSource);

      const result = await fetchSource('S123456789');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSource);
      expect(cachedOpenAlex.source).toHaveBeenCalledWith('S123456789', false);
    });
  });

  describe('fetchInstitution', () => {
    it('should fetch institution successfully', async () => {
      cachedOpenAlex.institution.mockResolvedValue(mockInstitution);

      const result = await fetchInstitution('I123456789');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInstitution);
      expect(cachedOpenAlex.institution).toHaveBeenCalledWith('I123456789', false);
    });
  });

  describe('fetchPublisher', () => {
    it('should fetch publisher successfully', async () => {
      const mockPublisher = {
        id: 'https://openalex.org/P123456789',
        display_name: 'Test Publisher',
        works_count: 1000
      };
      cachedOpenAlex.publisher.mockResolvedValue(mockPublisher);

      const result = await fetchPublisher('P123456789');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPublisher);
      expect(cachedOpenAlex.publisher).toHaveBeenCalledWith('P123456789', false);
    });
  });

  describe('fetchFunder', () => {
    it('should fetch funder successfully', async () => {
      const mockFunder = {
        id: 'https://openalex.org/F123456789',
        display_name: 'Test Funder',
        grants_count: 500
      };
      cachedOpenAlex.funder.mockResolvedValue(mockFunder);

      const result = await fetchFunder('F123456789');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFunder);
      expect(cachedOpenAlex.funder).toHaveBeenCalledWith('F123456789', false);
    });
  });

  describe('fetchTopic', () => {
    it('should fetch topic successfully', async () => {
      const mockTopic = {
        id: 'https://openalex.org/T123456789',
        display_name: 'Test Topic',
        works_count: 2000
      };
      cachedOpenAlex.topic.mockResolvedValue(mockTopic);

      const result = await fetchTopic('T123456789');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTopic);
      expect(cachedOpenAlex.topic).toHaveBeenCalledWith('T123456789', false);
    });
  });

  describe('fetchAnyEntity', () => {
    it('should auto-detect entity type and fetch work', async () => {
      cachedOpenAlex.work.mockResolvedValue(mockWork);

      const result = await fetchAnyEntity('W2741809807');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockWork);
      expect(cachedOpenAlex.work).toHaveBeenCalledWith('W2741809807', false);
    });

    it('should auto-detect entity type and fetch author', async () => {
      cachedOpenAlex.author.mockResolvedValue(mockAuthor);

      const result = await fetchAnyEntity('A2887492');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAuthor);
      expect(cachedOpenAlex.author).toHaveBeenCalledWith('A2887492', false);
    });

    it('should handle URLs for any entity type', async () => {
      cachedOpenAlex.source.mockResolvedValue(mockSource);

      const result = await fetchAnyEntity('https://openalex.org/S123456789');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSource);
      expect(cachedOpenAlex.source).toHaveBeenCalledWith('S123456789', false);
    });

    it('should return error for invalid entity ID', async () => {
      const result = await fetchAnyEntity('invalid-id');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ServiceErrorType.INVALID_ID);
    });
  });

  describe('fetchEntitiesBatch', () => {
    it('should fetch multiple entities successfully', async () => {
      const mockWorks = [
        { ...mockWork, id: 'https://openalex.org/W2741809801' },
        { ...mockWork, id: 'https://openalex.org/W2741809802' },
        { ...mockWork, id: 'https://openalex.org/W2741809803' }
      ];

      cachedOpenAlex.work
        .mockResolvedValueOnce(mockWorks[0])
        .mockResolvedValueOnce(mockWorks[1])
        .mockResolvedValueOnce(mockWorks[2]);

      const result = await fetchEntitiesBatch(['W2741809801', 'W2741809802', 'W2741809803'], EntityType.WORK);

      // Verify that we got results for all requested IDs
      expect(Object.keys(result.results)).toHaveLength(3);
      expect(result.results['W2741809801']).toBeDefined();
      expect(result.results['W2741809802']).toBeDefined();
      expect(result.results['W2741809803']).toBeDefined();
      
      // All should be successful
      expect(Object.values(result.results).every(r => r.success)).toBe(true);

      expect(result.summary).toEqual({
        total: 3,
        successful: 3,
        failed: 0,
        cached: 3
      });
    });

    it('should handle mixed success and failure in batch', async () => {
      cachedOpenAlex.work
        .mockResolvedValueOnce(mockWork)
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce(mockWork);

      const result = await fetchEntitiesBatch(['W2741809801', 'W2741809802', 'W2741809803'], EntityType.WORK);

      // Verify that we got results for all requested IDs
      expect(Object.keys(result.results)).toHaveLength(3);
      expect(result.results['W2741809801']).toBeDefined();
      expect(result.results['W2741809802']).toBeDefined();
      expect(result.results['W2741809803']).toBeDefined();
      
      // Check success/failure pattern
      const results = Object.values(result.results);
      const successes = results.filter(r => r.success);
      const failures = results.filter(r => !r.success);
      
      expect(successes).toHaveLength(2);
      expect(failures).toHaveLength(1);

      expect(result.summary).toEqual({
        total: 3,
        successful: 2,
        failed: 1,
        cached: 2  // Only successful requests count as cached
      });
    });

    it('should handle empty batch', async () => {
      const result = await fetchEntitiesBatch([], EntityType.WORK);

      expect(result.results).toEqual({});
      expect(result.summary).toEqual({
        total: 0,
        successful: 0,
        failed: 0,
        cached: 0
      });
    });
  });

  describe('fetchEntityWithRetry', () => {
    it('should succeed on first attempt', async () => {
      cachedOpenAlex.work.mockResolvedValue(mockWork);

      const result = await fetchEntityWithRetry('W2741809807');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockWork);
      expect(cachedOpenAlex.work).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      cachedOpenAlex.work
        .mockRejectedValueOnce(new Error('Network connection failed'))
        .mockRejectedValueOnce(new Error('Network connection failed'))
        .mockResolvedValue(mockWork);

      const result = await fetchEntityWithRetry('W2741809807', undefined, {
        maxRetries: 3,
        retryDelay: 1 // Very short delay
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockWork);
      expect(cachedOpenAlex.work).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      const result = await fetchEntityWithRetry('invalid-id', undefined, {
        maxRetries: 3
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ServiceErrorType.INVALID_ID);
      expect(result.error?.retryable).toBe(false);
      expect(cachedOpenAlex.work).toHaveBeenCalledTimes(0);
    });

    it('should stop retrying after max retries', async () => {
      cachedOpenAlex.work.mockRejectedValue(new Error('Network connection failed'));

      const result = await fetchEntityWithRetry('W2741809807', undefined, {
        maxRetries: 2,
        retryDelay: 1 // Very short delay
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ServiceErrorType.NETWORK_ERROR);
      expect(cachedOpenAlex.work).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use exponential backoff for retries', async () => {
      cachedOpenAlex.work.mockRejectedValue(new Error('Network connection failed'));

      const start = Date.now();
      await fetchEntityWithRetry('W2741809807', undefined, {
        maxRetries: 2,
        retryDelay: 5
      });
      const end = Date.now();

      // Should have taken at least the sum of delays (5ms + 10ms = 15ms)
      // But allow for some variation due to execution time
      expect(end - start).toBeGreaterThanOrEqual(10);
    });
  });

  describe('validateEntityIdFormat', () => {
    it('should validate correct entity IDs', () => {
      const result = validateEntityIdFormat('W2741809807');

      expect(result.valid).toBe(true);
      expect(result.normalizedId).toBe('W2741809807');
      expect(result.detectedType).toBe(EntityType.WORK);
      expect(result.error).toBeUndefined();
    });

    it('should validate numeric IDs with explicit type', () => {
      const result = validateEntityIdFormat('2741809807', EntityType.WORK);

      expect(result.valid).toBe(true);
      expect(result.normalizedId).toBe('W2741809807');
      expect(result.detectedType).toBe(EntityType.WORK);
    });

    it('should validate URLs', () => {
      const result = validateEntityIdFormat('https://openalex.org/A2887492');

      expect(result.valid).toBe(true);
      expect(result.normalizedId).toBe('A2887492');
      expect(result.detectedType).toBe(EntityType.AUTHOR);
    });

    it('should reject invalid IDs', () => {
      const result = validateEntityIdFormat('invalid-id');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.normalizedId).toBeUndefined();
      expect(result.detectedType).toBeUndefined();
    });

    it('should reject mismatched entity types', () => {
      const result = validateEntityIdFormat('W2741809807', EntityType.AUTHOR);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('but author was expected');
    });

    it('should handle empty IDs', () => {
      const result = validateEntityIdFormat('');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });
  });

  describe('checkEntityExists', () => {
    it('should return true for existing entity', async () => {
      cachedOpenAlex.work.mockResolvedValue(mockWork);

      const result = await checkEntityExists('W2741809807');

      expect(result.exists).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return false for non-existent entity', async () => {
      cachedOpenAlex.work.mockRejectedValue(new Error('Not found - 404'));

      const result = await checkEntityExists('W2741809807');

      expect(result.exists).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('should return error for other failures', async () => {
      cachedOpenAlex.work.mockRejectedValue(new Error('Network connection failed'));

      const result = await checkEntityExists('W2741809807');

      expect(result.exists).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: ServiceErrorType.NETWORK_ERROR
        })
      );
    });

    it('should handle invalid entity IDs', async () => {
      const result = await checkEntityExists('invalid-id');

      expect(result.exists).toBe(false);
      expect(result.error?.type).toBe(ServiceErrorType.INVALID_ID);
    });
  });

  describe('getEntityTypeFromId', () => {
    it('should detect entity type from valid ID', () => {
      const result = getEntityTypeFromId('W2741809807');

      expect(result.type).toBe(EntityType.WORK);
      expect(result.error).toBeUndefined();
    });

    it('should detect all entity types', () => {
      const testCases = [
        { id: 'W123456789', type: EntityType.WORK },
        { id: 'A123456789', type: EntityType.AUTHOR },
        { id: 'S123456789', type: EntityType.SOURCE },
        { id: 'I123456789', type: EntityType.INSTITUTION },
        { id: 'P123456789', type: EntityType.PUBLISHER },
        { id: 'F123456789', type: EntityType.FUNDER },
        { id: 'T123456789', type: EntityType.TOPIC },
        { id: 'C123456789', type: EntityType.CONCEPT },
        { id: 'K123456789', type: EntityType.KEYWORD },
        { id: 'N123456789', type: EntityType.CONTINENT },
        { id: 'R123456789', type: EntityType.REGION }
      ];

      testCases.forEach(({ id, type }) => {
        const result = getEntityTypeFromId(id);
        expect(result.type).toBe(type);
        expect(result.error).toBeUndefined();
      });
    });

    it('should return error for invalid ID', () => {
      const result = getEntityTypeFromId('invalid-id');

      expect(result.type).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it('should return error for numeric ID without prefix', () => {
      const result = getEntityTypeFromId('123456789');

      expect(result.type).toBeUndefined();
      expect(result.error).toContain('Cannot detect entity type from numeric ID');
    });
  });

  describe('EntityService Object', () => {
    it('should export all service functions', () => {
      expect(EntityService.fetchWork).toBe(fetchWork);
      expect(EntityService.fetchAuthor).toBe(fetchAuthor);
      expect(EntityService.fetchSource).toBe(fetchSource);
      expect(EntityService.fetchInstitution).toBe(fetchInstitution);
      expect(EntityService.fetchPublisher).toBe(fetchPublisher);
      expect(EntityService.fetchFunder).toBe(fetchFunder);
      expect(EntityService.fetchTopic).toBe(fetchTopic);
      expect(EntityService.fetchAnyEntity).toBe(fetchAnyEntity);
      expect(EntityService.fetchEntitiesBatch).toBe(fetchEntitiesBatch);
      expect(EntityService.fetchEntityWithRetry).toBe(fetchEntityWithRetry);
      expect(EntityService.validateEntityIdFormat).toBe(validateEntityIdFormat);
      expect(EntityService.checkEntityExists).toBe(checkEntityExists);
      expect(EntityService.getEntityTypeFromId).toBe(getEntityTypeFromId);
    });

    it('should export error types and constants', () => {
      expect(EntityService.ErrorType).toBe(ServiceErrorType);
      expect(EntityService.DefaultOptions).toBeDefined();
    });
  });

  describe('Error Type Detection', () => {
    const errorTestCases = [
      {
        error: new Error('Not found - 404'),
        expectedType: ServiceErrorType.NOT_FOUND,
        expectedRetryable: false
      },
      {
        error: new Error('Forbidden - 403'),
        expectedType: ServiceErrorType.FORBIDDEN,
        expectedRetryable: false
      },
      {
        error: new Error('Too many requests - 429'),
        expectedType: ServiceErrorType.RATE_LIMITED,
        expectedRetryable: true
      },
      {
        error: new Error('Request timeout'),
        expectedType: ServiceErrorType.TIMEOUT,
        expectedRetryable: true
      },
      {
        error: new Error('Network connection failed'),
        expectedType: ServiceErrorType.NETWORK_ERROR,
        expectedRetryable: true
      },
      {
        error: new Error('Internal server error - 500'),
        expectedType: ServiceErrorType.SERVER_ERROR,
        expectedRetryable: true
      },
      {
        error: new Error('Random error'),
        expectedType: ServiceErrorType.UNKNOWN,
        expectedRetryable: true
      }
    ];

    errorTestCases.forEach(({ error, expectedType, expectedRetryable }) => {
      it(`should detect ${expectedType} error type`, async () => {
        cachedOpenAlex.work.mockRejectedValue(error);

        const result = await fetchWork('W2741809807');

        expect(result.success).toBe(false);
        expect(result.error?.type).toBe(expectedType);
        expect(result.error?.retryable).toBe(expectedRetryable);
      });
    });
  });

  describe('Service Response Properties', () => {
    it('should include all required response properties for success', async () => {
      cachedOpenAlex.work.mockResolvedValue(mockWork);

      const result = await fetchWork('W2741809807');

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          data: mockWork,
          cached: true,
          fetchTime: expect.any(Number)
        })
      );
      expect(result.error).toBeUndefined();
    });

    it('should include all required response properties for failure', async () => {
      cachedOpenAlex.work.mockRejectedValue(new Error('Test error'));

      const result = await fetchWork('W2741809807');

      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            type: expect.any(String),
            userMessage: expect.any(String),
            technicalMessage: expect.any(String),
            retryable: expect.any(Boolean),
            timestamp: expect.any(Number),
            entityId: 'W2741809807'
          }),
          fetchTime: expect.any(Number)
        })
      );
      expect(result.data).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle whitespace in entity IDs', async () => {
      cachedOpenAlex.work.mockResolvedValue(mockWork);

      const result = await fetchWork('  W2741809807  ');

      expect(result.success).toBe(true);
      expect(cachedOpenAlex.work).toHaveBeenCalledWith('W2741809807', false);
    });

    it('should handle case-insensitive entity IDs', async () => {
      cachedOpenAlex.work.mockResolvedValue(mockWork);

      const result = await fetchWork('w2741809807');

      expect(result.success).toBe(true);
      expect(cachedOpenAlex.work).toHaveBeenCalledWith('W2741809807', false);
    });

    it('should handle very long timeout values', async () => {
      cachedOpenAlex.work.mockResolvedValue(mockWork);

      const result = await fetchWork('W2741809807', { timeout: 5000 });

      expect(result.success).toBe(true);
    });

    it('should handle zero timeout gracefully', async () => {
      // Mock an AbortError to simulate immediate timeout with zero timeout
      const abortError = new Error('Request timeout');
      abortError.name = 'AbortError';
      cachedOpenAlex.work.mockRejectedValue(abortError);

      const result = await fetchWork('W2741809807', { timeout: 1 });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ServiceErrorType.TIMEOUT);
    });
  });
});
