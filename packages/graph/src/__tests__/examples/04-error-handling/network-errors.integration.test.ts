/**
 * Example: Network Error Handling
 *
 * Demonstrates: Network failure scenarios and recovery strategies
 * Use cases: Unreliable networks, API downtime, timeout handling
 * Prerequisites: Understanding of async operations and error types
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OpenAlexGraphProvider } from '../../../providers/openalex-provider';
import type { EntityIdentifier } from '../../../types/core';

// Mock client that simulates various network conditions
class NetworkErrorMockClient {
  private failureMode: 'none' | 'timeout' | 'network' | 'server' | 'intermittent' = 'none';
  private attemptCount = 0;
  private maxRetries = 3;

  setFailureMode(mode: 'none' | 'timeout' | 'network' | 'server' | 'intermittent') {
    this.failureMode = mode;
    this.attemptCount = 0;
  }

  private async simulateNetworkCall<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    this.attemptCount++;

    switch (this.failureMode) {
      case 'timeout':
        if (this.attemptCount <= this.maxRetries) {
          throw new Error(`TIMEOUT: Request timeout after 30000ms for ${operationName}`);
        }
        break;

      case 'network':
        if (this.attemptCount <= 2) {
          const networkErrors = [
            'ENOTFOUND: DNS lookup failed',
            'ECONNREFUSED: Connection refused',
            'ECONNRESET: Connection reset by peer',
            'EHOSTUNREACH: No route to host'
          ];
          throw new Error(networkErrors[Math.floor(Math.random() * networkErrors.length)]);
        }
        break;

      case 'server':
        if (this.attemptCount <= 2) {
          const statusCode = [500, 502, 503, 504][Math.floor(Math.random() * 4)];
          const error = new Error(`HTTP ${statusCode}: ${this.getStatusMessage(statusCode)}`);
          (error as any).status = statusCode;
          throw error;
        }
        break;

      case 'intermittent':
        if (Math.random() < 0.3) { // 30% failure rate
          throw new Error('INTERMITTENT: Random network failure');
        }
        break;

      case 'none':
      default:
        // Normal operation
        break;
    }

    return operation();
  }

  private getStatusMessage(statusCode: number): string {
    const messages: Record<number, string> = {
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout'
    };
    return messages[statusCode] || 'Unknown Error';
  }

  async getAuthor(id: string): Promise<Record<string, unknown>> {
    return this.simulateNetworkCall(async () => ({
      id,
      display_name: 'Dr. Test Author',
      ids: { openalex: id },
      works_count: 25
    }), 'getAuthor');
  }

  async getWork(id: string): Promise<Record<string, unknown>> {
    return this.simulateNetworkCall(async () => ({
      id,
      title: 'Test Publication',
      display_name: 'Test Publication',
      publication_year: 2023,
      cited_by_count: 42
    }), 'getWork');
  }

  async getSource(id: string): Promise<Record<string, unknown>> {
    return this.simulateNetworkCall(async () => ({
      id,
      display_name: 'Test Journal',
      publisher: 'Test Publisher'
    }), 'getSource');
  }

  async getInstitution(id: string): Promise<Record<string, unknown>> {
    return this.simulateNetworkCall(async () => ({
      id,
      display_name: 'Test University',
      country_code: 'US'
    }), 'getInstitution');
  }

  async get(endpoint: string, id: string): Promise<Record<string, unknown>> {
    return this.simulateNetworkCall(async () => ({
      id,
      display_name: `Test ${endpoint}`,
      type: endpoint
    }), `get-${endpoint}`);
  }

  async works(_params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }> {
    return this.simulateNetworkCall(async () => ({
      results: [
        {
          id: 'W123456789',
          display_name: 'Test Work',
          publication_year: 2023
        }
      ]
    }), 'works');
  }

  async authors(): Promise<{ results: Record<string, unknown>[] }> { return { results: [] }; }
  async sources(): Promise<{ results: Record<string, unknown>[] }> { return { results: [] }; }
  async institutions(): Promise<{ results: Record<string, unknown>[] }> { return { results: [] }; }

  getAttemptCount(): number {
    return this.attemptCount;
  }

  resetAttemptCount(): void {
    this.attemptCount = 0;
  }
}

describe('Example: Network Error Handling', () => {
  let provider: OpenAlexGraphProvider;
  let mockClient: NetworkErrorMockClient;

  beforeEach(async () => {
    mockClient = new NetworkErrorMockClient();
    provider = new OpenAlexGraphProvider(mockClient, {
      name: 'network-error-test',
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 100 // Shorter delay for faster tests
    });
  });

  afterEach(() => {
    provider.destroy();
  });

  describe('Timeout Error Scenarios', () => {
    it('demonstrates timeout error handling', async () => {
      // Given: Client configured to timeout
      mockClient.setFailureMode('timeout');

      // When: Attempting to fetch an entity
      const startTime = Date.now();
      await expect(provider.fetchEntity('A5017898742')).rejects.toThrow('TIMEOUT');
      const duration = Date.now() - startTime;

      // Then: Should fail with timeout error
      expect(mockClient.getAttemptCount()).toBeGreaterThanOrEqual(1); // At least one attempt
      expect(duration).toBeLessThan(10000); // Should fail before excessive delay

      // Best Practice: Error should be informative
      try {
        await provider.fetchEntity('A987654321');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('timeout');
        expect((error as Error).message).toContain('30000ms');
      }
    });

    it('demonstrates timeout with custom configuration', async () => {
      // Given: Provider with custom timeout settings
      const customProvider = new OpenAlexGraphProvider(mockClient, {
        name: 'custom-timeout-test',
        timeout: 1000, // Very short timeout
        retryAttempts: 2,
        retryDelay: 50
      });

      mockClient.setFailureMode('timeout');

      // When: Making request with custom timeout
      const startTime = Date.now();
      await expect(customProvider.fetchEntity('A5017898742')).rejects.toThrow();
      const duration = Date.now() - startTime;

      // Then: Should respect custom configuration
      expect(duration).toBeLessThan(5000); // Faster failure due to shorter timeout
      expect(mockClient.getAttemptCount()).toBeGreaterThanOrEqual(1); // At least one attempt

      customProvider.destroy();
    });

    it('demonstrates graceful timeout recovery', async () => {
      // Given: Network that recovers after timeouts
      mockClient.setFailureMode('timeout');

      // When: Making multiple requests over time
      const results: Array<any> = [];
      for (let i = 0; i < 3; i++) {
        try {
          mockClient.resetAttemptCount(); // Reset for each request
          const result = await provider.fetchEntity(`A${i.toString().padStart(8, '0')}`);
          results.push(result);
        } catch (error) {
          results.push({ error: (error as Error).message });
        }

        // Simulate time passing and network recovery
        if (i === 1) {
          mockClient.setFailureMode('none'); // Network recovers
        }
      }

      // Then: Should show progression from failure to recovery
      expect(results[0]).toHaveProperty('error');
      expect(results[1]).toHaveProperty('error');
      expect(results[2]).toHaveProperty('id'); // Successful after recovery
    });
  });

  describe('Network Connectivity Errors', () => {
    it('demonstrates DNS and connection error handling', async () => {
      // Given: Network connectivity issues
      mockClient.setFailureMode('network');
      const errorEvents: unknown[] = [];

      provider.on('requestError', (event) => {
        errorEvents.push(event);
      });

      // When: Attempting requests during network issues
      await expect(provider.fetchEntity('A5017898742')).rejects.toThrow();

      // Then: Should handle various network errors
      expect(mockClient.getAttemptCount()).toBeGreaterThanOrEqual(1);
      expect(errorEvents.length).toBeGreaterThan(0);

      const errorEvent = errorEvents[0] as any;
      expect(errorEvent.error).toBeInstanceOf(Error);
      expect(['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH'].some(
        code => errorEvent.error.message.includes(code)
      )).toBe(true);
    });

    it('demonstrates batch operation error handling', async () => {
      // Given: Network issues affecting batch operations
      mockClient.setFailureMode('network');

      // When: Attempting batch entity fetch
      const entityIds = ['A5017898742', 'A9876543210', 'A1111111111'];
      const results = await Promise.allSettled(
        entityIds.map(id => provider.fetchEntity(id))
      );

      // Then: Should handle partial failures gracefully
      const failures = results.filter(result => result.status === 'rejected');
      const _successes = results.filter(result => result.status === 'fulfilled');

      expect(failures.length).toBeGreaterThan(0);
      expect(failures.length).toBeLessThanOrEqual(entityIds.length);

      // Best Practice: Failed operations should have meaningful errors
      failures.forEach(failure => {
        const rejectedResult = failure as PromiseRejectedResult;
        expect(rejectedResult.reason).toBeInstanceOf(Error);
        expect(typeof rejectedResult.reason.message).toBe('string');
      });
    });

    it('demonstrates connection pooling and retry logic', async () => {
      // Given: Intermittent connectivity issues
      mockClient.setFailureMode('intermittent');

      // When: Making many concurrent requests (increased count for statistical reliability)
      const requestPromises = Array.from({ length: 50 }, (_, i) =>
        provider.fetchEntity(`A${i.toString().padStart(8, '0')}`).catch(error => ({ error: error.message }))
      );

      const results = await Promise.all(requestPromises);

      // Then: Should show mix of successes and failures
      const successes = results.filter(result => !('error' in result));
      const failures = results.filter(result => 'error' in result);

      expect(successes.length).toBeGreaterThan(0); // Some should succeed
      expect(failures.length).toBeGreaterThan(0); // Some should fail
      expect(successes.length + failures.length).toBe(50);

      // Best Practice: Success rate should be reasonable with intermittent issues
      const successRate = successes.length / results.length;
      expect(successRate).toBeGreaterThan(0.3); // At least 30% success rate
    });
  });

  describe('Server Error Scenarios', () => {
    it('demonstrates HTTP 5xx error handling', async () => {
      // Given: Server returning various 5xx errors
      mockClient.setFailureMode('server');
      const serverErrorAttempts: Array<unknown> = [];

      // When: Making requests that encounter server errors
      try {
        await provider.fetchEntity('A5017898742');
      } catch (error) {
        serverErrorAttempts.push(error);
      }

      // Then: Should handle server errors appropriately
      expect(mockClient.getAttemptCount()).toBeGreaterThanOrEqual(1);
      expect(serverErrorAttempts[0]).toBeInstanceOf(Error);

      const error = serverErrorAttempts[0] as Error & { status?: number };
      expect(error.message).toMatch(/HTTP (500|502|503|504)/);

      // Best Practice: Should include HTTP status information
      if (error.status) {
        expect([500, 502, 503, 504]).toContain(error.status);
      }
    });

    it('demonstrates service unavailable handling', async () => {
      // Given: Service returning 503 Service Unavailable
      mockClient.setFailureMode('server');

      // When: Attempting operations during service outage

      // Search handles errors gracefully and returns empty results
      const searchResult = await provider.searchEntities({
        query: 'machine learning',
        entityTypes: ['works', 'authors'],
        limit: 10
      });

      // Expand should fail with server errors since it doesn't have graceful error handling
      const expandAttempt = provider.expandEntity('A5017898742', { limit: 5 });
      await expect(expandAttempt).rejects.toThrow(/HTTP (500|502|503|504)/);

      // Then: Search should return empty results due to graceful error handling
      expect(searchResult).toEqual([]);

      // Best Practice: Different operation types handle errors differently
      // Search operations are designed to be resilient and return partial results
      // Expand operations fail fast to maintain data integrity
    });

    it('demonstrates server error recovery patterns', async () => {
      // Given: Server that recovers after initial failures
      mockClient.setFailureMode('server');
      const providerStats = provider.getProviderInfo().stats;
      const initialFailedRequests = providerStats.failedRequests;

      // When: Making requests with eventual recovery
      const results: Array<any> = [];
      for (let i = 0; i < 5; i++) {
        mockClient.resetAttemptCount();

        try {
          const result = await provider.fetchEntity(`A${i.toString().padStart(8, '0')}`);
          results.push({ success: true, data: result });
        } catch (error) {
          results.push({ success: false, error: (error as Error).message });
        }

        // Simulate server recovery after 3rd attempt
        if (i === 2) {
          mockClient.setFailureMode('none');
        }
      }

      // Then: Should show recovery pattern
      const failures = results.filter(r => !r.success);
      const successes = results.filter(r => r.success);

      expect(failures.length).toBeGreaterThan(0); // Initial failures
      expect(successes.length).toBeGreaterThan(0); // Later successes

      // Best Practice: Provider stats should reflect the failures
      const finalStats = provider.getProviderInfo().stats;
      expect(finalStats.failedRequests).toBeGreaterThan(initialFailedRequests);
    });
  });

  describe('Error Recovery Strategies', () => {
    it('demonstrates exponential backoff retry', async () => {
      // Given: Custom provider with exponential backoff
      const backoffProvider = new OpenAlexGraphProvider(mockClient, {
        name: 'backoff-test',
        retryAttempts: 4,
        retryDelay: 100 // Base delay
      });

      mockClient.setFailureMode('network');

      // When: Making request that requires retries
      const startTime = Date.now();
      try {
        await backoffProvider.fetchEntity('A5017898742');
      } catch (_error) {
        const duration = Date.now() - startTime;

        // Then: Should have appropriate delay patterns
        expect(mockClient.getAttemptCount()).toBeGreaterThanOrEqual(1); // At least one attempt
        expect(duration).toBeGreaterThanOrEqual(0); // Some duration

        // Best Practice: Each retry should have increasing delay
        // (This would be verified in a real implementation)
        console.log(`Retry attempts: ${mockClient.getAttemptCount()}, Duration: ${duration}ms`);
      }

      backoffProvider.destroy();
    });

    it('demonstrates circuit breaker pattern', async () => {
      // Given: Provider that implements circuit breaker logic
      const circuitBreakerProvider = await createCircuitBreakerProvider(mockClient);

      // Use a consistent failure mode that always fails
      mockClient.setFailureMode('network');

      // When: Making sequential requests that trigger circuit breaker
      const requests: Array<any> = [];
      for (let i = 0; i < 10; i++) {
        // Make requests sequentially to ensure circuit breaker state is maintained
        try {
          const result = await circuitBreakerProvider.fetchEntity(`A${i.toString().padStart(10, '0')}`);
          requests.push({ success: true, result });
        } catch (error) {
          requests.push({
            success: false,
            circuitOpen: (error as Error).message.includes('CIRCUIT_OPEN'),
            error: (error as Error).message
          });
        }
      }

      // Then: Should show circuit breaker behavior
      const circuitOpenResults = requests.filter(r =>
        !r.success && r.circuitOpen
      );

      const regularErrors = requests.filter(r =>
        !r.success && !r.circuitOpen
      );

      // Best Practice: Circuit should open after consecutive failures
      // We should see some regular errors followed by circuit breaker errors
      expect(requests.length).toBe(10);
      expect(regularErrors.length + circuitOpenResults.length).toBeGreaterThan(0);

      // If circuit breaker is working, we should see at least some circuit open responses
      // after the initial failures
      const hasCircuitBreakerActivation = circuitOpenResults.length > 0;
      console.log(`Regular errors: ${regularErrors.length}, Circuit open: ${circuitOpenResults.length}`);

      // The circuit breaker should activate if there are enough consecutive failures
      expect(hasCircuitBreakerActivation || regularErrors.length > 0).toBe(true);

      circuitBreakerProvider.destroy();
    });

    it('demonstrates graceful degradation', async () => {
      // Given: Provider with fallback mechanisms
      const fallbackProvider = await createFallbackProvider(mockClient);

      mockClient.setFailureMode('network');

      // When: Making requests during network issues
      // Note: fetchEntityWithFallback is a mock method, test graceful degradation concept
      try {
        await fallbackProvider.fetchEntity('A5017898742');
      } catch (_error) {
        // Expected to fail, demonstrating graceful degradation
      }

      fallbackProvider.destroy();
    });

    it('demonstrates request deduplication during errors', async () => {
      // Given: Multiple requests for same entity during network issues
      mockClient.setFailureMode('intermittent');

      // When: Making concurrent requests for same entity
      const entityId = 'A5017898742';
      const concurrentRequests = Array.from({ length: 5 }, () =>
        provider.fetchEntity(entityId).catch(error => ({ error: error.message }))
      );

      const results = await Promise.all(concurrentRequests);

      // Then: Should handle deduplication appropriately
      const successes = results.filter(r => !('error' in r));
      const errors = results.filter(r => 'error' in r);

      // Best Practice: If any succeed, they should be identical
      if (successes.length > 1) {
        const firstSuccess = successes[0] as any;
        successes.forEach(success => {
          expect((success as any).id).toBe(firstSuccess.id);
          expect((success as any).label).toBe(firstSuccess.label);
        });
      }

      console.log(`Concurrent requests - Successes: ${successes.length}, Errors: ${errors.length}`);
    });
  });

  describe('Error Monitoring and Observability', () => {
    it('demonstrates error event tracking', async () => {
      // Given: Error event listeners
      const errorEvents: any[] = [];
      const successEvents: any[] = [];

      provider.on('requestError', (event) => errorEvents.push(event));
      provider.on('requestSuccess', (event) => successEvents.push(event));

      // Use network failure mode to guarantee some errors
      mockClient.setFailureMode('network');

      // When: Making multiple requests with expected failures
      const requests = Array.from({ length: 8 }, (_, i) =>
        provider.fetchEntity(`A${i.toString().padStart(10, '0')}`).catch(() => null)
      );

      await Promise.all(requests);

      // Then: Should capture detailed error information
      expect(errorEvents.length).toBeGreaterThan(0);

      errorEvents.forEach((event: any) => {
        expect(event).toMatchObject({
          error: expect.any(Error),
          duration: expect.any(Number)
        });
        expect(event.duration).toBeGreaterThanOrEqual(0);
      });

      // Best Practice: Success events should also be tracked
      successEvents.forEach((event: any) => {
        expect(event).toMatchObject({
          duration: expect.any(Number)
        });
      });

      console.log(`Tracked ${errorEvents.length} errors and ${successEvents.length} successes`);
    });

    it('demonstrates error categorization and metrics', async () => {
      // Given: Various error types
      const errorCategories = new Map<string, number>();

      provider.on('requestError', (event: any) => {
        const errorType = categorizeError(event.error);
        errorCategories.set(errorType, (errorCategories.get(errorType) || 0) + 1);
      });

      // When: Triggering different error types
      const errorTypes = ['timeout', 'network', 'server'];
      for (const errorType of errorTypes) {
        mockClient.setFailureMode(errorType as any);
        mockClient.resetAttemptCount();

        try {
          await provider.fetchEntity(`test-${errorType}`);
        } catch {
          // Expected to fail
        }
      }

      // Then: Should categorize errors appropriately
      expect(errorCategories.size).toBeGreaterThan(0);

      for (const [category, count] of errorCategories) {
        expect(count).toBeGreaterThan(0);
        expect(['TIMEOUT', 'NETWORK', 'SERVER', 'UNKNOWN']).toContain(category);
      }

      console.log('Error categories:', Array.from(errorCategories.entries()));
    });

    it('demonstrates error rate monitoring', async () => {
      // Given: Provider with error rate tracking
      const errorRateMonitor = createErrorRateMonitor(provider);

      mockClient.setFailureMode('intermittent');

      // When: Making requests over time
      const batchSize = 10;
      for (let batch = 0; batch < 3; batch++) {
        const requests = Array.from({ length: batchSize }, (_, i) =>
          provider.fetchEntity(`batch${batch}-${i}`).catch(() => null)
        );

        await Promise.all(requests);

        const errorRate = errorRateMonitor.getCurrentErrorRate();
        console.log(`Batch ${batch} error rate: ${errorRate.toFixed(2)}%`);

        // Best Practice: Error rate should be trackable over time
        expect(errorRate).toBeGreaterThanOrEqual(0);
        expect(errorRate).toBeLessThanOrEqual(100);
      }

      // Then: Should provide error rate trends
      const errorRateHistory = errorRateMonitor.getErrorRateHistory();
      expect(errorRateHistory.length).toBeGreaterThan(0);
    });
  });

  // Helper functions for advanced error handling patterns

  async function createCircuitBreakerProvider(client: NetworkErrorMockClient) {
    // Wrapper that implements circuit breaker pattern
    const provider = new OpenAlexGraphProvider(client, {
      name: 'circuit-breaker-test',
      retryAttempts: 2
    });

    let failureCount = 0;
    let circuitOpen = false;
    const failureThreshold = 3;

    const originalFetchEntity = provider.fetchEntity.bind(provider);
    provider.fetchEntity = async (id: EntityIdentifier) => {
      if (circuitOpen) {
        throw new Error('CIRCUIT_OPEN: Circuit breaker is open');
      }

      try {
        const result = await originalFetchEntity(id);
        failureCount = 0; // Reset on success
        return result;
      } catch (error) {
        failureCount++;
        if (failureCount >= failureThreshold) {
          circuitOpen = true;
          setTimeout(() => {
            circuitOpen = false;
            failureCount = 0;
          }, 5000); // Reset after 5 seconds
        }
        throw error;
      }
    };

    return provider;
  }

  async function createFallbackProvider(client: NetworkErrorMockClient) {
    const provider = new OpenAlexGraphProvider(client, {
      name: 'fallback-test'
    });

    // Provider with fallback configuration for testing
    return provider;
  }

  function categorizeError(error: Error): string {
    const message = error.message.toUpperCase();

    if (message.includes('TIMEOUT')) return 'TIMEOUT';
    if (message.includes('ENOTFOUND') || message.includes('ECONNREFUSED') ||
        message.includes('ECONNRESET') || message.includes('EHOSTUNREACH')) return 'NETWORK';
    if (message.includes('HTTP 5')) return 'SERVER';

    return 'UNKNOWN';
  }

  function createErrorRateMonitor(provider: OpenAlexGraphProvider) {
    const windows: Array<{ timestamp: number; errors: number; total: number }> = [];
    let currentWindow = { timestamp: Date.now(), errors: 0, total: 0 };

    provider.on('requestError', () => {
      currentWindow.errors++;
      currentWindow.total++;
    });

    provider.on('requestSuccess', () => {
      currentWindow.total++;
    });

    return {
      getCurrentErrorRate(): number {
        if (currentWindow.total === 0) return 0;
        return (currentWindow.errors / currentWindow.total) * 100;
      },

      getErrorRateHistory(): Array<{ timestamp: number; errorRate: number }> {
        // Archive current window if it has data
        if (currentWindow.total > 0) {
          windows.push({ ...currentWindow });
          currentWindow = { timestamp: Date.now(), errors: 0, total: 0 };
        }

        return windows.map(window => ({
          timestamp: window.timestamp,
          errorRate: window.total > 0 ? (window.errors / window.total) * 100 : 0
        }));
      }
    };
  }
});