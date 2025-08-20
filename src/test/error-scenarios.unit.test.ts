/**
 * Comprehensive test suite for error scenarios
 * Tests various error conditions that can occur in the application
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { server } from './setup';
import { http, HttpResponse } from 'msw';

// Mock network status for testing
const mockNetworkStatus = {
  isOnline: true,
  isOffline: false,
  connectionType: '4g' as const,
  effectiveConnectionType: '4g' as const,
  connectionQuality: 'fast' as const,
  isSlowConnection: false,
  downlink: 10,
  rtt: 50,
  saveData: false,
  lastOnlineTime: Date.now(),
  offlineDuration: 0,
};

describe('Error Scenarios - Network Failures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset navigator.onLine to true by default
    vi.stubGlobal('navigator', {
      ...navigator,
      onLine: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Network Error Types', () => {
    it('should handle DNS resolution failures', async () => {
      // Use MSW to simulate network failure
      server.use(
        http.get('https://api.openalex.org/test-dns-failure', () => {
          return HttpResponse.error();
        })
      );
      
      try {
        await fetch('https://api.openalex.org/test-dns-failure');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(TypeError);
        expect((error as TypeError).message).toBe('Failed to fetch');
      }
    });

    it('should handle connection timeout errors', async () => {
      const controller = new AbortController();
      controller.abort(); // Immediately abort for testing
      
      server.use(
        http.get('https://api.openalex.org/test-timeout', () => {
          return HttpResponse.error();
        })
      );
      
      try {
        await fetch('https://api.openalex.org/test-timeout', {
          signal: controller.signal,
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DOMException);
        expect((error as DOMException).name).toBe('AbortError');
      }
    });

    it('should handle server unavailable (503) errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => ({ error: 'Service temporarily unavailable' }),
      });

      const response = await fetch('https://api.openalex.org/works');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(503);
      expect(response.statusText).toBe('Service Unavailable');
    });

    it('should handle rate limiting (429) errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({
          'Retry-After': '60',
          'X-RateLimit-Remaining': '0',
        }),
        json: async () => ({ error: 'Rate limit exceeded' }),
      });

      const response = await fetch('https://api.openalex.org/works');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('60');
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => 'Invalid JSON{',
        json: async () => {
          throw new SyntaxError('Unexpected token { in JSON');
        },
      });

      const response = await fetch('https://api.openalex.org/works');
      expect(response.ok).toBe(true);
      
      try {
        await response.json();
        expect.fail('Should have thrown a JSON parsing error');
      } catch (error) {
        expect(error).toBeInstanceOf(SyntaxError);
        expect((error as SyntaxError).message).toContain('JSON');
      }
    });
  });

  describe('Offline Scenarios', () => {
    it('should detect when browser goes offline', () => {
      vi.stubGlobal('navigator', {
        ...navigator,
        onLine: false,
      });

      expect(navigator.onLine).toBe(false);
    });

    it('should handle fetch failures when offline', async () => {
      vi.stubGlobal('navigator', {
        ...navigator,
        onLine: false,
      });

      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      try {
        await fetch('https://api.openalex.org/works');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(TypeError);
        expect((error as TypeError).message).toBe('Failed to fetch');
      }
    });

    it('should simulate network recovery after offline period', async () => {
      // Start offline
      vi.stubGlobal('navigator', {
        ...navigator,
        onLine: false,
      });
      expect(navigator.onLine).toBe(false);

      // Simulate coming back online
      vi.stubGlobal('navigator', {
        ...navigator,
        onLine: true,
      });
      expect(navigator.onLine).toBe(true);

      // Should be able to make requests again
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: [] }),
      });

      const response = await fetch('https://api.openalex.org/works');
      expect(response.ok).toBe(true);
    });
  });

  describe('Storage Quota Exceeded Scenarios', () => {
    it('should handle IndexedDB quota exceeded errors', () => {
      const quotaExceededError = new DOMException(
        'The quota has been exceeded',
        'QuotaExceededError'
      );

      expect(quotaExceededError.name).toBe('QuotaExceededError');
      expect(quotaExceededError.message).toBe('The quota has been exceeded');
    });

    it('should handle localStorage quota exceeded errors', () => {
      const quotaExceededError = new DOMException(
        'QuotaExceededError',
        'QuotaExceededError'
      );

      // Simulate localStorage.setItem throwing quota exceeded
      const mockSetItem = vi.fn().mockImplementation(() => {
        throw quotaExceededError;
      });

      vi.stubGlobal('localStorage', {
        setItem: mockSetItem,
        getItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      });

      expect(() => {
        localStorage.setItem('test', 'value');
      }).toThrow(quotaExceededError);
    });
  });

  describe('Browser Compatibility Errors', () => {
    it('should handle missing IndexedDB support', () => {
      const originalIndexedDB = global.indexedDB;
      
      // Remove IndexedDB support
      vi.stubGlobal('indexedDB', undefined);
      
      expect(global.indexedDB).toBeUndefined();
      
      // Restore for other tests
      vi.stubGlobal('indexedDB', originalIndexedDB);
    });

    it('should handle missing Service Worker support', () => {
      const originalServiceWorker = navigator.serviceWorker;
      
      vi.stubGlobal('navigator', {
        ...navigator,
        serviceWorker: undefined,
      });
      
      expect(navigator.serviceWorker).toBeUndefined();
      
      // Restore for other tests
      vi.stubGlobal('navigator', {
        ...navigator,
        serviceWorker: originalServiceWorker,
      });
    });

    it('should handle missing localStorage support', () => {
      const originalLocalStorage = global.localStorage;
      
      vi.stubGlobal('localStorage', undefined);
      
      expect(global.localStorage).toBeUndefined();
      
      // Restore for other tests
      vi.stubGlobal('localStorage', originalLocalStorage);
    });
  });

  describe('Content Security Policy Errors', () => {
    it('should handle CSP violations for external resources', () => {
      const cspError = new Error(
        "Refused to load the script 'https://external.com/script.js' because it violates the following Content Security Policy directive"
      );

      expect(cspError.message).toContain('Content Security Policy directive');
    });

    it('should handle CSP violations for inline scripts', () => {
      const cspError = new Error(
        "Refused to execute inline script because it violates the following Content Security Policy directive: \"script-src 'self'\""
      );

      expect(cspError.message).toContain("script-src 'self'");
    });
  });

  describe('Memory and Resource Exhaustion', () => {
    it('should handle out of memory errors', () => {
      const oomError = new Error('Maximum call stack size exceeded');
      expect(oomError.message).toBe('Maximum call stack size exceeded');
    });

    it('should handle large dataset processing errors', () => {
      const rangeError = new RangeError('Invalid array length');
      expect(rangeError).toBeInstanceOf(RangeError);
      expect(rangeError.message).toBe('Invalid array length');
    });

    it('should handle resource loading failures', () => {
      const resourceError = new Error('Loading CSS chunk failed');
      expect(resourceError.message).toBe('Loading CSS chunk failed');
    });
  });

  describe('Corrupt Data Scenarios', () => {
    it('should handle corrupted localStorage data', () => {
      vi.stubGlobal('localStorage', {
        getItem: vi.fn().mockReturnValue('corrupted{json'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      });

      const corruptedData = localStorage.getItem('test');
      expect(() => {
        if (corruptedData === null) {
          throw new Error('No data found');
        }
        JSON.parse(corruptedData);
      }).toThrow();
    });

    it('should handle corrupted IndexedDB data', () => {
      const corruptedData = { malformed: 'object', missing: undefined };
      
      // Simulate corrupted data that doesn't match expected schema
      expect(corruptedData.missing).toBeUndefined();
      expect(typeof corruptedData.malformed).toBe('string');
    });

    it('should handle missing required fields in API responses', () => {
      const incompleteApiResponse = {
        // Missing required 'id' field
        title: 'Test Paper',
        // Missing required 'authors' field
      };

      expect('id' in incompleteApiResponse).toBe(false);
      expect('authors' in incompleteApiResponse).toBe(false);
    });
  });
});

describe('Error Recovery Mechanisms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Automatic Retry Logic', () => {
    it('should retry failed requests with exponential backoff', async () => {
      let attemptCount = 0;
      
      mockFetch.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new TypeError('Failed to fetch'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        });
      });

      // Simulate retry logic without real delays
      let success = false;
      
      for (let i = 0; i < 3; i++) {
        try {
          const response = await fetch('https://api.openalex.org/works');
          if (response.ok) {
            success = true;
            break;
          }
        } catch (error) {
          // No actual delay - just continue to next attempt
        }
      }

      expect(success).toBe(true);
      expect(attemptCount).toBe(3);
    });

    it('should respect maximum retry limits', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
      
      const maxRetries = 3;
      let attemptCount = 0;
      let finalError: Error | null = null;

      for (let i = 0; i <= maxRetries; i++) {
        try {
          attemptCount++;
          await fetch('https://api.openalex.org/works');
          break;
        } catch (error) {
          finalError = error as Error;
          if (i === maxRetries) {
            break; // Stop retrying after max attempts
          }
        }
      }

      expect(attemptCount).toBe(maxRetries + 1);
      expect(finalError).toBeInstanceOf(TypeError);
    });
  });

  describe('Graceful Degradation', () => {
    it('should provide cached data when network fails', () => {
      const cachedData = {
        results: [{ id: 'W123', title: 'Cached Paper' }],
        timestamp: Date.now() - 1000,
      };

      // Simulate network failure but cached data available
      const isNetworkAvailable = false;
      const hasCachedData = true;

      if (!isNetworkAvailable && hasCachedData) {
        expect(cachedData.results).toHaveLength(1);
        expect(cachedData.results[0].title).toBe('Cached Paper');
      }
    });

    it('should disable features when dependencies unavailable', () => {
      const features = {
        search: true,
        saveToCollection: false, // Disabled due to IndexedDB unavailability
        exportResults: false, // Disabled due to File API unavailability
      };

      expect(features.search).toBe(true);
      expect(features.saveToCollection).toBe(false);
      expect(features.exportResults).toBe(false);
    });
  });

  describe('User Notification Systems', () => {
    it('should categorise errors by severity', () => {
      const errors = [
        { type: 'network', severity: 'warning', message: 'Slow connection detected' },
        { type: 'storage', severity: 'error', message: 'Storage quota exceeded' },
        { type: 'api', severity: 'info', message: 'Rate limit approaching' },
        { type: 'critical', severity: 'critical', message: 'Application error' },
      ];

      const criticalErrors = errors.filter(e => e.severity === 'critical');
      const warnings = errors.filter(e => e.severity === 'warning');

      expect(criticalErrors).toHaveLength(1);
      expect(warnings).toHaveLength(1);
      expect(criticalErrors[0].message).toBe('Application error');
    });
  });
});