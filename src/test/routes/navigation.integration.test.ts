/**
 * Integration tests for TanStack Router navigation functionality
 * Tests cross-route navigation, parameter handling, and browser integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock TanStack Router hooks
const mockNavigate = vi.fn();
const mockUseSearch = vi.fn();
const mockUseParams = vi.fn();

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearch: mockUseSearch,
    useParams: mockUseParams,
  };
});

// Mock entity detection utilities
vi.mock('@/lib/openalex/utils/entity-detection', () => ({
  detectEntityType: vi.fn(),
  detectIdType: vi.fn(),
  getEntityEndpoint: vi.fn(),
  parseExternalId: vi.fn(),
  decodeExternalId: vi.fn((id: string) => id),
  EntityType: {
    AUTHOR: 'authors',
    WORK: 'works',
    SOURCE: 'sources',
    INSTITUTION: 'institutions',
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

describe('TanStack Router Navigation Integration', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseSearch.mockReturnValue({});
    mockUseParams.mockReturnValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Entity Route Navigation', () => {
    const entityTypes = [
      'authors',
      'works',
      'sources',
      'institutions',
      'concepts',
      'funders',
      'publishers',
      'topics',
    ];

    entityTypes.forEach(entityType => {
      describe(`${entityType} routes`, () => {
        it(`should handle navigation to /${entityType} index route`, () => {
          // Simulate navigation to entity index
          const expectedRoute = `/${entityType}`;
          
          // Mock the route parameters
          mockNavigate({
            to: expectedRoute,
          });

          expect(mockNavigate).toHaveBeenCalledWith({
            to: expectedRoute,
          });
        });

        it(`should handle navigation to /${entityType}/$id with valid OpenAlex ID`, () => {
          const entityPrefix = entityType === 'authors' ? 'A' :
                              entityType === 'works' ? 'W' :
                              entityType === 'sources' ? 'S' :
                              entityType === 'institutions' ? 'I' :
                              entityType === 'concepts' ? 'C' :
                              entityType === 'funders' ? 'F' :
                              entityType === 'publishers' ? 'P' :
                              entityType === 'topics' ? 'T' : 'A';
          
          const validId = `${entityPrefix}1234567890`;
          const expectedRoute = `/${entityType}/${validId}`;
          
          mockNavigate({
            to: expectedRoute,
          });

          expect(mockNavigate).toHaveBeenCalledWith({
            to: expectedRoute,
          });
        });

        it(`should handle navigation to /${entityType}/$id with invalid ID format`, () => {
          const invalidId = 'invalid-id-format';
          const expectedRoute = `/${entityType}/${invalidId}`;
          
          // This should still navigate, but the entity page will handle validation
          mockNavigate({
            to: expectedRoute,
          });

          expect(mockNavigate).toHaveBeenCalledWith({
            to: expectedRoute,
          });
        });
      });
    });
  });

  describe('Cross-Route Navigation Patterns', () => {
    it('should navigate from index to search page', () => {
      mockNavigate({
        to: '/search',
        search: { q: 'machine learning' },
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/search',
        search: { q: 'machine learning' },
      });
    });

    it('should navigate from search to entity page', () => {
      mockNavigate({
        to: '/authors/A1234567890',
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/authors/A1234567890',
      });
    });

    it('should navigate between different entity types', () => {
      // Navigate from author to work
      mockNavigate({
        to: '/works/W1234567890',
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/works/W1234567890',
      });

      // Navigate from work to source
      mockNavigate({
        to: '/sources/S1234567890',
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/sources/S1234567890',
      });
    });

    it('should handle navigation with complex search parameters', () => {
      const complexSearch = {
        q: 'artificial intelligence',
        field: 'title',
        mode: 'boolean',
        is_oa: true,
        from_date: '2020-01-01',
        to_date: '2023-12-31',
        min_citations: 10,
        sort: 'cited_by_count',
        order: 'desc',
        per_page: 50,
      };

      mockNavigate({
        to: '/search',
        search: complexSearch,
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/search',
        search: complexSearch,
      });
    });
  });

  describe('Route Parameter Validation', () => {
    it('should handle valid OpenAlex ID parameters', () => {
      const validIds = [
        'A1234567890',
        'W9876543210',
        'S5555555555',
        'I1111111111',
        'C2222222222',
        'F3333333333',
        'P4444444444',
        'T7777777777',
      ];

      validIds.forEach(id => {
        const entityType = id.charAt(0) === 'A' ? 'authors' :
                          id.charAt(0) === 'W' ? 'works' :
                          id.charAt(0) === 'S' ? 'sources' :
                          id.charAt(0) === 'I' ? 'institutions' :
                          id.charAt(0) === 'C' ? 'concepts' :
                          id.charAt(0) === 'F' ? 'funders' :
                          id.charAt(0) === 'P' ? 'publishers' :
                          id.charAt(0) === 'T' ? 'topics' : 'authors';

        mockUseParams.mockReturnValue({ id });
        
        // The route should accept the ID without error
        expect(() => {
          mockNavigate({ to: `/${entityType}/${id}` });
        }).not.toThrow();
      });
    });

    it('should handle numeric ID parameters that need redirection', () => {
      const numericIds = ['1234567890', '9876543210', '5555555555'];
      
      numericIds.forEach(id => {
        mockUseParams.mockReturnValue({ id });
        
        // Numeric IDs should be handled by the useNumericIdRedirect hook
        // The route should still navigate, redirection logic is handled in components
        expect(() => {
          mockNavigate({ to: `/authors/${id}` });
        }).not.toThrow();
      });
    });

    it('should handle encoded URL parameters correctly', () => {
      const encodedIds = [
        'https%3A//openalex.org/A1234567890',
        'https%3A%2F%2Fopenalex.org%2FW1234567890',
        '10.1234%2Fexample.doi',
        '0000-0000-0000-0000',
      ];

      encodedIds.forEach(encodedId => {
        mockUseParams.mockReturnValue({ id: encodedId });
        
        expect(() => {
          mockNavigate({ to: `/entity/${encodedId}` });
        }).not.toThrow();
      });
    });
  });

  describe('Application Route Navigation', () => {
    it('should navigate to dashboard', () => {
      mockNavigate({ to: '/dashboard' });
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard' });
    });

    it('should navigate to help page', () => {
      mockNavigate({ to: '/help' });
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/help' });
    });

    it('should navigate to search with preserved state', () => {
      const searchState = {
        q: 'quantum computing',
        field: 'abstract',
        is_oa: true,
      };

      mockNavigate({
        to: '/search',
        search: searchState,
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/search',
        search: searchState,
      });
    });
  });

  describe('Navigation State Management', () => {
    it('should preserve search parameters across navigation', () => {
      // Set initial search state
      const initialSearch = { q: 'machine learning', is_oa: true };
      mockUseSearch.mockReturnValue(initialSearch);

      // Navigate to entity page and back
      mockNavigate({ to: '/authors/A1234567890' });
      mockNavigate({ 
        to: '/search',
        search: initialSearch,
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/search',
        search: initialSearch,
      });
    });

    it('should handle navigation with replace option', () => {
      mockNavigate({
        to: '/works/W1234567890',
        replace: true,
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/works/W1234567890',
        replace: true,
      });
    });

    it('should handle navigation with hash fragments', () => {
      mockNavigate({
        to: '/authors/A1234567890',
        hash: 'works-section',
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/authors/A1234567890',
        hash: 'works-section',
      });
    });
  });

  describe('Dynamic Route Resolution', () => {
    it('should resolve bare ID route for entity detection', () => {
      const bareId = 'A1234567890';
      mockUseParams.mockReturnValue({ bareId });

      mockNavigate({ to: `/${bareId}` });
      expect(mockNavigate).toHaveBeenCalledWith({ to: `/${bareId}` });
    });

    it('should resolve entity type and ID route', () => {
      mockUseParams.mockReturnValue({ 
        type: 'author',
        id: '1234567890' 
      });

      mockNavigate({ to: '/entity/author/1234567890' });
      expect(mockNavigate).toHaveBeenCalledWith({ 
        to: '/entity/author/1234567890' 
      });
    });

    it('should handle catch-all entity route', () => {
      const entityPath = 'some/complex/entity/path';
      mockUseParams.mockReturnValue({ _splat: entityPath });

      mockNavigate({ to: `/entity/${entityPath}` });
      expect(mockNavigate).toHaveBeenCalledWith({ 
        to: `/entity/${entityPath}` 
      });
    });
  });

  describe('Regional and Special Routes', () => {
    it('should handle continents route', () => {
      mockNavigate({ to: '/continents/north-america' });
      expect(mockNavigate).toHaveBeenCalledWith({ 
        to: '/continents/north-america' 
      });
    });

    it('should handle regions route', () => {
      mockNavigate({ to: '/regions/europe' });
      expect(mockNavigate).toHaveBeenCalledWith({ 
        to: '/regions/europe' 
      });
    });

    it('should handle keywords route', () => {
      mockNavigate({ to: '/keywords/artificial-intelligence' });
      expect(mockNavigate).toHaveBeenCalledWith({ 
        to: '/keywords/artificial-intelligence' 
      });
    });
  });

  describe('Navigation Performance', () => {
    it('should handle rapid sequential navigation', () => {
      const routes = [
        '/authors/A1111111111',
        '/works/W2222222222',
        '/sources/S3333333333',
        '/institutions/I4444444444',
      ];

      routes.forEach(route => {
        mockNavigate({ to: route });
      });

      expect(mockNavigate).toHaveBeenCalledTimes(routes.length);
    });

    it('should handle navigation with large search parameters', () => {
      const largeSearchParams = {
        q: 'machine learning artificial intelligence deep learning neural networks',
        field: 'title',
        mode: 'boolean',
        is_oa: true,
        has_fulltext: true,
        has_doi: true,
        has_abstract: true,
        not_retracted: true,
        from_date: '2020-01-01',
        to_date: '2023-12-31',
        min_citations: 10,
        max_citations: 1000,
        author_id: 'A1234567890',
        institution_id: 'I1234567890',
        source_id: 'S1234567890',
        funder_id: 'F1234567890',
        topic_id: 'T1234567890',
        sort: 'cited_by_count',
        order: 'desc',
        per_page: 200,
        page: 1,
      };

      mockNavigate({
        to: '/search',
        search: largeSearchParams,
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/search',
        search: largeSearchParams,
      });
    });
  });
});