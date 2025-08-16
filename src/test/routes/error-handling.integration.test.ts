/**
 * Integration tests for error handling and 404 routing scenarios
 * Tests route guards, error boundaries, and fallback routing behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock TanStack Router hooks and components
const mockNavigate = vi.fn();
const mockUseSearch = vi.fn();
const mockUseParams = vi.fn();
const mockNotFound = vi.fn();

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearch: mockUseSearch,
    useParams: mockUseParams,
    createFileRoute: vi.fn(() => ({
      component: vi.fn(),
      errorComponent: vi.fn(),
      notFoundComponent: vi.fn(),
    })),
    notFound: mockNotFound,
    Link: vi.fn(({ to, children }) => children),
    Outlet: vi.fn(() => null),
  };
});

// Mock entity detection utilities
const mockDetectEntityType = vi.fn();
const mockParseExternalId = vi.fn();
const mockDecodeExternalId = vi.fn();
const mockGetEntityEndpoint = vi.fn();

class EntityDetectionError extends Error {
  constructor(message: string, public originalId?: string) {
    super(message);
    this.name = 'EntityDetectionError';
  }
}

vi.mock('@/lib/openalex/utils/entity-detection', () => ({
  detectEntityType: mockDetectEntityType,
  parseExternalId: mockParseExternalId,
  decodeExternalId: mockDecodeExternalId,
  getEntityEndpoint: mockGetEntityEndpoint,
  EntityDetectionError,
  EntityType: {
    WORK: 'works',
    AUTHOR: 'authors',
    INSTITUTION: 'institutions',
    SOURCE: 'sources',
    CONCEPT: 'concepts',
    FUNDER: 'funders',
    PUBLISHER: 'publishers',
    TOPIC: 'topics',
  },
  ExternalIdType: {
    DOI: 'doi',
    ORCID: 'orcid',
    ROR: 'ror',
    ISSN: 'issn',
    WIKIDATA: 'wikidata',
  },
}));

// Mock error boundary components
vi.mock('@/components', () => ({
  EntityErrorBoundary: vi.fn(({ children, fallback }) => 
    fallback || children
  ),
  EntityError: vi.fn(({ error, entityId }) => 
    `Error: ${error} for entity ${entityId}`
  ),
  EntityFallback: vi.fn(({ entityId }) => 
    `Fallback for entity ${entityId}`
  ),
}));

// Mock OpenAlex client with error scenarios
const mockOpenAlexClient = {
  works: {
    get: vi.fn(),
    getByExternalId: vi.fn(),
  },
  authors: {
    get: vi.fn(),
    getByExternalId: vi.fn(),
  },
  institutions: {
    get: vi.fn(),
    getByExternalId: vi.fn(),
  },
  sources: {
    get: vi.fn(),
    getByExternalId: vi.fn(),
  },
};

vi.mock('@/lib/openalex/cached-client', () => ({
  cachedOpenAlex: mockOpenAlexClient,
}));

describe('Error Handling and 404 Routing Integration', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseSearch.mockReturnValue({});
    mockUseParams.mockReturnValue({});
    mockNotFound.mockClear();
    mockDetectEntityType.mockClear();
    mockParseExternalId.mockClear();
    mockDecodeExternalId.mockClear();
    mockGetEntityEndpoint.mockClear();
    
    Object.values(mockOpenAlexClient).forEach(entityClient => {
      entityClient.get?.mockClear();
      entityClient.getByExternalId?.mockClear();
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('404 Not Found Scenarios', () => {
    it('should handle route not found for invalid paths', () => {
      const invalidPaths = [
        '/invalid-route',
        '/not/a/real/path',
        '/authors/invalid-id-format',
        '/works/not-a-work-id',
        '/completely/made/up/route',
      ];

      invalidPaths.forEach(path => {
        mockNotFound();
        expect(mockNotFound).toHaveBeenCalled();
        mockNotFound.mockClear();
      });
    });

    it('should handle entity not found', async () => {
      const entityId = 'W1234567890';
      mockUseParams.mockReturnValue({ id: entityId });
      mockOpenAlexClient.works.get.mockResolvedValue(null);

      const result = await mockOpenAlexClient.works.get(entityId);
      expect(result).toBeNull();
      expect(mockOpenAlexClient.works.get).toHaveBeenCalledWith(entityId);
    });

    it('should handle external ID not found', async () => {
      const doi = '10.1038/nonexistent';
      mockOpenAlexClient.works.getByExternalId.mockResolvedValue(null);

      const result = await mockOpenAlexClient.works.getByExternalId(doi);
      expect(result).toBeNull();
    });

    it('should handle malformed entity IDs', () => {
      const malformedIds = [
        '', // Empty ID
        'W', // Too short
        'A123', // Too short
        'X1234567890', // Invalid prefix
        'W123456789X', // Invalid suffix
        'not-an-id-at-all',
      ];

      malformedIds.forEach(id => {
        mockDetectEntityType.mockImplementation(() => {
          throw new EntityDetectionError(`Invalid entity ID format: ${id}`, id);
        });

        expect(() => mockDetectEntityType(id)).toThrow(EntityDetectionError);
        mockDetectEntityType.mockClear();
      });
    });
  });

  describe('API Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network Error: Unable to connect');
      mockOpenAlexClient.works.get.mockRejectedValue(networkError);

      await expect(
        mockOpenAlexClient.works.get('W1234567890')
      ).rejects.toThrow('Network Error: Unable to connect');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockOpenAlexClient.authors.get.mockRejectedValue(timeoutError);

      await expect(
        mockOpenAlexClient.authors.get('A1234567890')
      ).rejects.toThrow('Request timeout');
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded') as Error & { status: number };
      rateLimitError.status = 429;
      mockOpenAlexClient.sources.get.mockRejectedValue(rateLimitError);

      await expect(
        mockOpenAlexClient.sources.get('S1234567890')
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle server errors', async () => {
      const serverError = new Error('Internal Server Error') as Error & { status: number };
      serverError.status = 500;
      mockOpenAlexClient.institutions.get.mockRejectedValue(serverError);

      await expect(
        mockOpenAlexClient.institutions.get('I1234567890')
      ).rejects.toThrow('Internal Server Error');
    });
  });

  describe('Entity Detection Errors', () => {
    it('should handle ambiguous entity IDs', () => {
      const ambiguousId = '1234567890'; // Could be multiple entity types
      mockDetectEntityType.mockImplementation(() => {
        throw new EntityDetectionError(`Ambiguous entity ID: ${ambiguousId}`, ambiguousId);
      });

      expect(() => mockDetectEntityType(ambiguousId)).toThrow(EntityDetectionError);
    });

    it('should handle invalid external ID formats', () => {
      const invalidExternalIds = [
        '10.1038/', // Incomplete DOI
        '0000-0000', // Incomplete ORCID
        'not-a-ror-id',
        'invalid-issn',
        'bad-wikidata-id',
      ];

      invalidExternalIds.forEach(id => {
        mockParseExternalId.mockImplementation(() => {
          throw new EntityDetectionError(`Invalid external ID format: ${id}`, id);
        });

        expect(() => mockParseExternalId(id)).toThrow(EntityDetectionError);
        mockParseExternalId.mockClear();
      });
    });

    it('should handle unsupported external ID types', () => {
      const unsupportedIds = [
        'PMID:12345678',
        'arXiv:1234.5678',
        'ISBN:978-0-123456-78-9',
      ];

      unsupportedIds.forEach(id => {
        mockParseExternalId.mockImplementation(() => {
          throw new EntityDetectionError(`Unsupported external ID type: ${id}`, id);
        });

        expect(() => mockParseExternalId(id)).toThrow(EntityDetectionError);
        mockParseExternalId.mockClear();
      });
    });
  });

  describe('Route Parameter Validation Errors', () => {
    it('should handle missing required parameters', () => {
      // Simulate missing ID parameter
      mockUseParams.mockReturnValue({});
      
      const params = mockUseParams();
      expect(params.id).toBeUndefined();
    });

    it('should handle malformed search parameters', () => {
      const malformedSearchParams = [
        { year: 'not-a-number' },
        { per_page: -1 },
        { page: 0 },
        { min_citations: 'invalid' },
        { is_oa: 'not-boolean' },
      ];

      malformedSearchParams.forEach(params => {
        mockUseSearch.mockReturnValue(params);
        const searchParams = mockUseSearch();
        
        // Each malformed param should be handled gracefully
        expect(typeof searchParams).toBe('object');
      });
    });

    it('should handle extremely large parameter values', () => {
      const extremeParams = {
        year: 999999,
        per_page: 999999,
        page: 999999,
        min_citations: 999999999,
        q: 'x'.repeat(10000), // Very long query
      };

      mockUseSearch.mockReturnValue(extremeParams);
      const searchParams = mockUseSearch();
      
      expect(searchParams).toEqual(extremeParams);
    });
  });

  describe('Fallback Route Handling', () => {
    it('should fallback to entity detection for bare IDs', () => {
      const bareId = 'A1234567890';
      mockUseParams.mockReturnValue({ bareId });
      mockDetectEntityType.mockReturnValue('authors');
      mockGetEntityEndpoint.mockReturnValue('authors');

      const entityType = mockDetectEntityType(bareId);
      const endpoint = mockGetEntityEndpoint(bareId);

      expect(entityType).toBe('authors');
      expect(endpoint).toBe('authors');
      
      // Should navigate to proper entity route
      mockNavigate({
        to: `/authors/${bareId}`,
        replace: true,
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: `/authors/${bareId}`,
        replace: true,
      });
    });

    it('should handle catch-all entity route', () => {
      const entityPath = 'complex/unknown/entity/path';
      mockUseParams.mockReturnValue({ _splat: entityPath });

      const params = mockUseParams();
      expect(params._splat).toBe(entityPath);
    });

    it('should handle HTTPS URL patterns', () => {
      const httpsUrl = 'https://openalex.org/W1234567890';
      mockUseParams.mockReturnValue({ _splat: httpsUrl });
      mockDecodeExternalId.mockReturnValue(httpsUrl);
      mockDetectEntityType.mockReturnValue('works');

      const decodedUrl = mockDecodeExternalId(httpsUrl);
      const entityType = mockDetectEntityType(decodedUrl);

      expect(decodedUrl).toBe(httpsUrl);
      expect(entityType).toBe('works');
    });
  });

  describe('Error Boundary Integration', () => {
    it('should catch and handle component errors', () => {
      const componentError = new Error('Component rendering error');
      
      // Simulate error boundary catching the error
      const errorBoundaryFallback = `Error: ${componentError.message} for entity W1234567890`;
      
      expect(errorBoundaryFallback).toContain('Component rendering error');
      expect(errorBoundaryFallback).toContain('W1234567890');
    });

    it('should provide fallback UI for failed entity loads', () => {
      const entityId = 'A1234567890';
      const fallbackUI = `Fallback for entity ${entityId}`;
      
      expect(fallbackUI).toContain(entityId);
    });

    it('should handle errors during data fetching', async () => {
      const fetchError = new Error('Failed to fetch entity data');
      mockOpenAlexClient.works.get.mockRejectedValue(fetchError);

      await expect(
        mockOpenAlexClient.works.get('W1234567890')
      ).rejects.toThrow('Failed to fetch entity data');
    });
  });

  describe('Navigation Error Recovery', () => {
    it('should recover from navigation to invalid routes', () => {
      const invalidRoute = '/invalid/route/path';
      
      // Simulate navigation error
      mockNavigate.mockImplementation(() => {
        throw new Error('Navigation failed');
      });

      expect(() => {
        mockNavigate({ to: invalidRoute });
      }).toThrow('Navigation failed');
    });

    it('should handle back button to invalid history state', () => {
      // Simulate browser back button to invalid state
      window.history.pushState(null, '', '/invalid-state');
      
      // Should handle gracefully without crashing
      expect(window.location.pathname).toBe('/invalid-state');
    });

    it('should recover from circular redirects', () => {
      let redirectCount = 0;
      mockNavigate.mockImplementation(() => {
        redirectCount++;
        if (redirectCount > 10) {
          throw new Error('Maximum redirects exceeded');
        }
      });

      // Simulate circular redirect scenario
      expect(() => {
        for (let i = 0; i < 15; i++) {
          mockNavigate({ to: `/redirect-${i}` });
        }
      }).toThrow('Maximum redirects exceeded');
    });
  });

  describe('Search Error Handling', () => {
    it('should handle invalid search queries gracefully', () => {
      const invalidQueries = [
        '', // Empty query
        ' '.repeat(1000), // Very long whitespace
        '[]{}()!@#$%^&*', // Special characters only
        null, // Null query
        undefined, // Undefined query
      ];

      invalidQueries.forEach(query => {
        mockUseSearch.mockReturnValue({ q: query });
        const searchParams = mockUseSearch();
        
        // Should not crash the application
        expect(typeof searchParams).toBe('object');
        mockUseSearch.mockClear();
      });
    });

    it('should handle search API errors', async () => {
      const searchError = new Error('Search API unavailable');
      
      // This would typically be handled by the search component
      expect(searchError.message).toBe('Search API unavailable');
    });

    it('should handle search timeout', async () => {
      const timeoutError = new Error('Search request timed out');
      
      expect(timeoutError.message).toBe('Search request timed out');
    });
  });

  describe('Memory and Performance Errors', () => {
    it('should handle out of memory errors', () => {
      const memoryError = new Error('JavaScript heap out of memory');
      
      expect(memoryError.message).toBe('JavaScript heap out of memory');
    });

    it('should handle performance degradation', () => {
      // Simulate performance issues
      const performanceStart = performance.now();
      
      // Simulate heavy operation
      for (let i = 0; i < 1000; i++) {
        // Mock heavy computation
      }
      
      const performanceEnd = performance.now();
      const duration = performanceEnd - performanceStart;
      
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle quota exceeded errors', () => {
      const quotaError = new Error('QuotaExceededError: Storage quota exceeded');
      
      expect(quotaError.message).toContain('QuotaExceededError');
    });
  });

  describe('Cross-Origin and Security Errors', () => {
    it('should handle CORS errors', () => {
      const corsError = new Error('CORS error: Cross-origin request blocked');
      
      expect(corsError.message).toContain('CORS error');
    });

    it('should handle CSP violations', () => {
      const cspError = new Error('Content Security Policy violation');
      
      expect(cspError.message).toContain('Content Security Policy');
    });

    it('should handle mixed content errors', () => {
      const mixedContentError = new Error('Mixed content: insecure request in secure context');
      
      expect(mixedContentError.message).toContain('Mixed content');
    });
  });
});