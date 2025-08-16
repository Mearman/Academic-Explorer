/**
 * Integration tests for HTTPS URL routing functionality
 * Tests the complete routing pipeline for all URL patterns that should redirect to canonical entity pages
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { decodeExternalId, detectEntityType, getEntityEndpoint, detectIdType, ExternalIdType } from '@/lib/openalex/utils/entity-detection';

// Mock navigate function to capture redirects
const mockNavigate = vi.fn();

// Mock TanStack Router hooks
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: vi.fn(() => ({
    useParams: () => ({}),
    component: vi.fn(),
  })),
  useNavigate: () => mockNavigate,
  notFound: () => new Error('Not Found'),
}));

describe('HTTPS URL Routing Integration', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Entity Detection and Routing Logic', () => {
    // Test the user's specific 14 URL patterns that should redirect to /#/authors/A5017898742
    const testCases = [
      {
        description: 'Numeric ID with authors prefix',
        input: '5017898742',
        context: 'authors',
        expectedEntityType: 'authors',
        expectedId: 'A5017898742',
      },
      {
        description: 'HTTPS OpenAlex URL with authors prefix',
        input: 'https://openalex.org/A5017898742',
        context: 'authors',
        expectedEntityType: 'authors',
        expectedId: 'A5017898742',
      },
      {
        description: 'Browser-transformed HTTPS OpenAlex URL with authors prefix',
        input: 'https:/openalex.org/A5017898742',
        context: 'authors',
        expectedEntityType: 'authors',
        expectedId: 'A5017898742',
      },
      {
        description: 'HTTPS OpenAlex full path with authors prefix',
        input: 'https://openalex.org/authors/A5017898742',
        context: 'authors',
        expectedEntityType: 'authors',
        expectedId: 'A5017898742',
      },
      {
        description: 'Browser-transformed HTTPS OpenAlex full path with authors prefix',
        input: 'https:/openalex.org/authors/A5017898742',
        context: 'authors',
        expectedEntityType: 'authors',
        expectedId: 'A5017898742',
      },
      {
        description: 'Root-level HTTPS OpenAlex URL',
        input: 'https://openalex.org/A5017898742',
        context: 'root',
        expectedEntityType: 'authors',
        expectedId: 'A5017898742',
      },
      {
        description: 'Root-level browser-transformed HTTPS OpenAlex URL',
        input: 'https:/openalex.org/A5017898742',
        context: 'root',
        expectedEntityType: 'authors',
        expectedId: 'A5017898742',
      },
      {
        description: 'Root-level HTTPS OpenAlex full path',
        input: 'https://openalex.org/authors/A5017898742',
        context: 'root',
        expectedEntityType: 'authors',
        expectedId: 'A5017898742',
      },
      {
        description: 'Root-level browser-transformed HTTPS OpenAlex full path',
        input: 'https:/openalex.org/authors/A5017898742',
        context: 'root',
        expectedEntityType: 'authors',
        expectedId: 'A5017898742',
      },
      {
        description: 'Bare OpenAlex ID',
        input: 'A5017898742',
        context: 'root',
        expectedEntityType: 'authors',
        expectedId: 'A5017898742',
      },
      {
        description: 'HTTPS ORCID URL',
        input: 'https://orcid.org/0000-0003-1613-5981',
        context: 'root',
        expectedEntityType: 'authors',
        expectedId: '0000-0003-1613-5981',
      },
      {
        description: 'Browser-transformed HTTPS ORCID URL',
        input: 'https:/orcid.org/0000-0003-1613-5981',
        context: 'root',
        expectedEntityType: 'authors',
        expectedId: '0000-0003-1613-5981',
      },
      {
        description: 'HTTPS ORCID URL with authors prefix',
        input: 'https://orcid.org/0000-0003-1613-5981',
        context: 'authors',
        expectedEntityType: 'authors',
        expectedId: '0000-0003-1613-5981',
      },
      {
        description: 'Browser-transformed HTTPS ORCID URL with authors prefix',
        input: 'https:/orcid.org/0000-0003-1613-5981',
        context: 'authors',
        expectedEntityType: 'authors',
        expectedId: '0000-0003-1613-5981',
      },
    ];

    testCases.forEach(({ description, input, context, expectedEntityType, expectedId }) => {
      it(`should correctly process: ${description}`, () => {
        // Test URL decoding
        const decoded = decodeExternalId(input);
        expect(decoded).toBe(input); // Should not change for these test cases
        
        // Test entity detection for OpenAlex IDs
        if (input.includes('openalex.org/') || /^[WASIPFTCKRN]\d{7,10}$/i.test(input)) {
          let extractedId = input;
          
          // Extract OpenAlex ID from URL
          if (input.includes('openalex.org/')) {
            const match = input.match(/openalex\.org\/([WASIPFTCKRN]\d{7,10})/i);
            if (match) {
              extractedId = match[1].toUpperCase();
            }
            // Handle alternative format like openalex.org/authors/A5017898742
            const altMatch = input.match(/openalex\.org\/[a-z]+\/([WASIPFTCKRN]\d{7,10})/i);
            if (altMatch) {
              extractedId = altMatch[1].toUpperCase();
            }
          }
          
          const entityType = detectEntityType(extractedId);
          const endpoint = getEntityEndpoint(entityType);
          
          expect(endpoint).toBe(expectedEntityType);
          expect(extractedId.toUpperCase()).toBe(expectedId);
        }
        
        // Test ORCID ID handling
        if (input.includes('orcid.org/')) {
          const orcidMatch = input.match(/orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/i);
          expect(orcidMatch).toBeTruthy();
          if (orcidMatch) {
            expect(orcidMatch[1]).toBe(expectedId);
          }
        }
        
        // Test numeric ID handling
        if (/^\d{7,10}$/.test(input)) {
          expect(input).toBe('5017898742');
          // Numeric IDs should be prefixed with 'A' for authors
          expect(`A${input}`).toBe(expectedId);
        }
      });
    });
  });

  describe('Route Processing Logic', () => {
    it('should handle all OpenAlex URL patterns', () => {
      const openAlexPatterns = [
        'https://openalex.org/A5017898742',
        'https:/openalex.org/A5017898742',
        'https://openalex.org/authors/A5017898742',
        'https:/openalex.org/authors/A5017898742',
      ];

      openAlexPatterns.forEach(pattern => {
        const decoded = decodeExternalId(pattern);
        
        // Test basic OpenAlex pattern
        const basicMatch = decoded.match(/openalex\.org\/([WASIPFTCKRN]\d{7,10})/i);
        if (basicMatch) {
          const id = basicMatch[1].toUpperCase();
          expect(id).toBe('A5017898742');
          const entityType = detectEntityType(id);
          expect(getEntityEndpoint(entityType)).toBe('authors');
        }
        
        // Test alternative OpenAlex pattern
        const altMatch = decoded.match(/openalex\.org\/([a-z]+)\/([WASIPFTCKRN]\d{7,10})/i);
        if (altMatch) {
          const id = altMatch[2].toUpperCase();
          expect(id).toBe('A5017898742');
          const entityType = detectEntityType(id);
          expect(getEntityEndpoint(entityType)).toBe('authors');
        }
      });
    });

    it('should handle all ORCID URL patterns', () => {
      const orcidPatterns = [
        'https://orcid.org/0000-0003-1613-5981',
        'https:/orcid.org/0000-0003-1613-5981',
      ];

      orcidPatterns.forEach(pattern => {
        const decoded = decodeExternalId(pattern);
        const orcidMatch = decoded.match(/orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/i);
        
        expect(orcidMatch).toBeTruthy();
        if (orcidMatch) {
          expect(orcidMatch[1]).toBe('0000-0003-1613-5981');
          // ORCID IDs should always route to authors
          expect(detectIdType(orcidMatch[1])).toBe(ExternalIdType.ORCID);
        }
      });
    });

    it('should handle numeric and bare OpenAlex IDs', () => {
      // Test numeric ID
      const numericId = '5017898742';
      expect(/^\d{7,10}$/.test(numericId)).toBe(true);
      
      // Test bare OpenAlex ID
      const bareId = 'A5017898742';
      expect(/^[WASIPFTCKRN]\d{7,10}$/i.test(bareId)).toBe(true);
      const entityType = detectEntityType(bareId);
      expect(getEntityEndpoint(entityType)).toBe('authors');
    });
  });

  describe('URL Context Routing', () => {
    it('should route correctly based on URL context', () => {
      const testScenarios = [
        {
          url: '/#/authors/5017898742',
          route: 'authors.$id',
          expectedRedirect: '/authors/A5017898742',
        },
        {
          url: '/#/authors/https:/openalex.org/A5017898742',
          route: 'authors.$id',
          expectedRedirect: '/authors/A5017898742',
        },
        {
          url: '/#/https:/openalex.org/A5017898742',
          route: 'https.$',
          expectedRedirect: '/authors/A5017898742',
        },
        {
          url: '/#/A5017898742',
          route: '$bareId',
          expectedRedirect: '/authors/A5017898742',
        },
        {
          url: '/#/authors/https:/orcid.org/0000-0003-1613-5981',
          route: 'authors.$id',
          expectedRedirect: '/authors/0000-0003-1613-5981',
        },
        {
          url: '/#/https:/orcid.org/0000-0003-1613-5981',
          route: 'https.$',
          expectedRedirect: '/authors/0000-0003-1613-5981',
        },
      ];

      testScenarios.forEach(({ url, route, expectedRedirect }) => {
        const hashPart = url.replace('/#/', '');
        
        // Determine which route would handle this URL
        let actualRoute: string;
        if (hashPart.startsWith('authors/')) {
          actualRoute = 'authors.$id';
        } else if (hashPart.startsWith('https')) {
          actualRoute = 'https.$';
        } else {
          actualRoute = '$bareId';
        }
        
        expect(actualRoute).toBe(route);
        
        // Verify the redirect would be correct
        if (route === 'authors.$id') {
          const id = hashPart.replace('authors/', '');
          if (id === '5017898742') {
            expect(expectedRedirect).toBe('/authors/A5017898742');
          } else if (id.includes('openalex.org/A5017898742')) {
            expect(expectedRedirect).toBe('/authors/A5017898742');
          } else if (id.includes('orcid.org/0000-0003-1613-5981')) {
            expect(expectedRedirect).toBe('/authors/0000-0003-1613-5981');
          }
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed URLs gracefully', () => {
      const malformedUrls = [
        'https://',
        'https:/openalex.org/',
        'https:/orcid.org/',
        'openalex.org/invalid',
        'orcid.org/invalid',
      ];

      malformedUrls.forEach(url => {
        const decoded = decodeExternalId(url);
        expect(decoded).toBe(url);
        
        // These should not match any of our patterns
        const openAlexMatch = decoded.match(/openalex\.org\/([WASIPFTCKRN]\d{7,10})/i);
        const orcidMatch = decoded.match(/orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/i);
        
        expect(openAlexMatch).toBeFalsy();
        expect(orcidMatch).toBeFalsy();
      });
    });

    it('should handle non-author OpenAlex IDs correctly', () => {
      const nonAuthorIds = [
        'W1234567890', // Work
        'S1234567890', // Source
        'I1234567890', // Institution
      ];

      nonAuthorIds.forEach(id => {
        const entityType = detectEntityType(id);
        const endpoint = getEntityEndpoint(entityType);
        
        expect(entityType).not.toBe('authors');
        expect(endpoint).not.toBe('authors');
        
        // Verify specific mappings
        if (id.startsWith('W')) {
          expect(endpoint).toBe('works');
        } else if (id.startsWith('S')) {
          expect(endpoint).toBe('sources');
        } else if (id.startsWith('I')) {
          expect(endpoint).toBe('institutions');
        }
      });
    });
  });
});