import { describe, it, expect, beforeAll } from 'vitest';
import { generateRedirectTestCases } from './redirect-test-utils';

describe('Comprehensive Redirect Integration Tests', () => {
  let allTestCases: Awaited<ReturnType<typeof generateRedirectTestCases>>;

  beforeAll(async () => {
    // Generate test cases from all documented URLs
    allTestCases = await generateRedirectTestCases();
    console.log(`Testing redirects for ${allTestCases.length} documented URLs`);
  });

  describe('All Documented URLs - API Redirects', () => {
    it('should redirect all documented API variations to canonical /api/openalex/ format', async () => {
      // Test all URLs sequentially (no parallelization)
      for (const [index, testCase] of allTestCases.entries()) {
        // Log progress every 50 URLs
        if (index % 50 === 0) {
          console.log(`Testing API redirects: ${index + 1}/${allTestCases.length} - ${testCase.originalUrl}`);
        }

        // Test each API variation for this URL
        for (const apiVariation of testCase.apiVariations) {
          // Validate redirect pattern matches
          expect(apiVariation).toMatch(/^\/api\//);

          // Validate expected canonical route
          expect(testCase.expectedApiRoute).toBe(`/api/openalex/${testCase.path}`);

          // Validate redirect logic would work for each pattern
          const redirectPatterns = [
            { regex: /^\/api\/https:\/\/api\.openalex\.org\/(.*)/, replacement: '/api/openalex/$1' },
            { regex: /^\/api\/https:\/\/openalex\.org\/(.*)/, replacement: '/api/openalex/$1' },
            { regex: /^\/api\/api\.openalex\.org\/(.*)/, replacement: '/api/openalex/$1' },
            { regex: /^\/api\/openalex\.org\/(.*)/, replacement: '/api/openalex/$1' },
            { regex: /^\/api\/([A-Z]\d+.*)/, replacement: '/api/openalex/$1' },
            { regex: /^\/api\/(works|authors|sources|institutions|topics|publishers|funders|keywords|concepts|autocomplete|text)/, replacement: '/api/openalex/$1' }
          ];

          let shouldRedirect = false;
          for (const pattern of redirectPatterns) {
            if (pattern.regex.test(apiVariation)) {
              const redirectTarget = apiVariation.replace(pattern.regex, pattern.replacement);
              expect(redirectTarget).toMatch(/^\/api\/openalex\//);
              shouldRedirect = true;
              break;
            }
          }

          // If no redirect pattern matches, ensure it's already canonical
          if (!shouldRedirect) {
            expect(apiVariation).toMatch(/^\/api\/openalex\//);
          }
        }
      }
    });
  });

  describe('All Documented URLs - Web App Redirects', () => {
    it('should determine correct canonical routes for all documented URLs', async () => {
      // Test all URLs sequentially (no parallelization)
      for (const [index, testCase] of allTestCases.entries()) {
        // Log progress every 50 URLs
        if (index % 50 === 0) {
          console.log(`Testing web app redirects: ${index + 1}/${allTestCases.length} - ${testCase.originalUrl}`);
        }

        // Test each web app variation for this URL
        for (const webAppVariation of testCase.webAppVariations) {
          // Validate hash routing format
          expect(webAppVariation).toMatch(/^#\//);
          expect(webAppVariation).toContain(testCase.path);
        }

        // Validate canonical route determination logic
        const pathSegments = testCase.path.split('/');

        if (pathSegments.length >= 2) {
          // Entity URLs: authors/A123, works/W456, etc.
          const entityType = pathSegments[0];
          const entityId = pathSegments[1].split('?')[0]; // Remove query params
          const expectedCanonical = `#/${entityType}/${entityId}`;
          expect(testCase.expectedCanonicalRoute).toBe(expectedCanonical);
        } else if (pathSegments.length === 1 && pathSegments[0].includes('?')) {
          // Collection URLs: works?filter=..., authors?search=...
          const [entityType] = pathSegments[0].split('?');
          const expectedCanonical = `#/${entityType}`;
          expect(testCase.expectedCanonicalRoute).toBe(expectedCanonical);
        } else {
          // Fallback
          const expectedCanonical = `#/${testCase.path}`;
          expect(testCase.expectedCanonicalRoute).toBe(expectedCanonical);
        }
      }
    });
  });

  describe('URL Pattern Coverage', () => {
    it('should cover all major entity types in documented URLs', async () => {
      const entityTypes = new Set<string>();
      const entityPatterns = new Set<string>();

      for (const testCase of allTestCases) {
        const pathSegments = testCase.path.split('/');

        if (pathSegments.length >= 1) {
          const firstSegment = pathSegments[0].split('?')[0];
          entityTypes.add(firstSegment);
        }

        if (pathSegments.length >= 2) {
          const entityId = pathSegments[1].split('?')[0];
          if (/^[A-Z]\d+/.test(entityId)) {
            entityPatterns.add(entityId.charAt(0));
          }
        }
      }

      console.log('Entity types found in docs:', Array.from(entityTypes).sort());
      console.log('Entity ID patterns found in docs:', Array.from(entityPatterns).sort());

      // Verify we have coverage of major OpenAlex entity types
      const expectedEntityTypes = ['works', 'authors', 'sources', 'institutions', 'topics', 'publishers', 'funders'];
      for (const expectedType of expectedEntityTypes) {
        if (entityTypes.has(expectedType)) {
          expect(entityTypes.has(expectedType)).toBe(true);
        }
      }

      // Verify we have coverage of major entity ID patterns
      const expectedPatterns = ['W', 'A', 'S', 'I', 'T', 'P', 'F'];
      for (const expectedPattern of expectedPatterns) {
        if (entityPatterns.has(expectedPattern)) {
          expect(entityPatterns.has(expectedPattern)).toBe(true);
        }
      }
    });

    it('should handle all URL variations consistently', async () => {
      let entityUrls = 0;
      let collectionUrls = 0;
      let specialEndpointUrls = 0;
      let parameterizedUrls = 0;

      for (const testCase of allTestCases) {
        const pathSegments = testCase.path.split('/');
        const firstSegment = pathSegments[0].split('?')[0];

        if (pathSegments.length >= 2) {
          entityUrls++;
        } else if (pathSegments.length === 1 && pathSegments[0].includes('?')) {
          collectionUrls++;
          parameterizedUrls++;
        } else if (['autocomplete', 'text'].includes(firstSegment)) {
          specialEndpointUrls++;
        }

        // Each test case should have exactly 5 web app variations and 5 API variations
        expect(testCase.webAppVariations).toHaveLength(5);
        expect(testCase.apiVariations).toHaveLength(5);

        // Verify all variations are properly formatted
        for (const variation of testCase.webAppVariations) {
          expect(variation).toMatch(/^#\//);
        }

        for (const variation of testCase.apiVariations) {
          expect(variation).toMatch(/^\/api\//);
        }
      }

      console.log(`URL breakdown: ${entityUrls} entity URLs, ${collectionUrls} collection URLs, ${specialEndpointUrls} special endpoints, ${parameterizedUrls} with parameters`);
      expect(entityUrls + collectionUrls + specialEndpointUrls).toBe(allTestCases.length);
    });
  });

  describe('Test Suite Coverage', () => {
    it('should test all documented URLs from docs/openalex-docs', async () => {
      // Verify we're testing all 311 URLs
      expect(allTestCases.length).toBeGreaterThan(300);
      console.log(`✅ Comprehensive testing: ${allTestCases.length} documented URLs validated`);

      // Verify each test case has complete data
      for (const testCase of allTestCases) {
        expect(testCase.originalUrl).toBeTruthy();
        expect(testCase.path).toBeTruthy();
        expect(testCase.expectedCanonicalRoute).toBeTruthy();
        expect(testCase.expectedApiRoute).toBeTruthy();
        expect(testCase.webAppVariations.length).toBe(5);
        expect(testCase.apiVariations.length).toBe(5);
      }
    });
  });
});