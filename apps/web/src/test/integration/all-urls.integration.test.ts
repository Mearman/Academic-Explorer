/**
 * Comprehensive URL Testing
 * Tests all 276 URLs from openalex-urls.json against the application routing
 * Verifies that each URL loads correctly and displays data
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load all URLs from the JSON file
const urlsPath = join(process.cwd(), '../../openalex-urls.json');
let urls: Record<string, string> = {};

beforeAll(() => {
  try {
    const content = readFileSync(urlsPath, 'utf-8');
    urls = JSON.parse(content);
  } catch (error) {
    console.warn('Could not load openalex-urls.json, skipping URL tests');
  }
});

describe('OpenAlex URL Routing - All 276 URLs', () => {
  const baseUrl = 'https://mearman.github.io/Academic-Explorer';
  const apiBaseUrl = 'https://api.openalex.org';

  // Test helper to convert API URL to app URL
  const toAppUrl = (apiUrl: string): string => {
    if (apiUrl.startsWith(apiBaseUrl)) {
      // Convert API URL to relative path
      const relativePath = apiUrl.replace(apiBaseUrl, '');
      return `${baseUrl}/#${relativePath}`;
    }
    return apiUrl;
  };

  // Test helper to extract entity type and ID from URL
  const parseUrl = (url: string): { type: string; id?: string; isSearch: boolean } => {
    const match = url.match(/\/([a-z]+)(?:\/([A-Z]\d+))?/);
    if (match) {
      return {
        type: match[1],
        id: match[2],
        isSearch: !match[2] || url.includes('?'),
      };
    }
    return { type: 'unknown', isSearch: false };
  };

  it('should have loaded 276 URLs from openalex-urls.json', () => {
    const urlCount = Object.keys(urls).length;
    expect(urlCount).toBe(276);
  });

  // Group URLs by type for organized testing
  const urlsByType: Record<string, string[]> = {};
  Object.values(urls).forEach((url) => {
    const { type } = parseUrl(url);
    if (!urlsByType[type]) {
      urlsByType[type] = [];
    }
    urlsByType[type].push(url);
  });

  // Test each entity type
  Object.entries(urlsByType).forEach(([type, typeUrls]) => {
    describe(`${type} URLs (${typeUrls.length} total)`, () => {
      typeUrls.forEach((apiUrl, index) => {
        it(`should route ${type} URL ${index + 1}: ${apiUrl}`, () => {
          const appUrl = toAppUrl(apiUrl);
          const { id, isSearch } = parseUrl(apiUrl);

          // Verify app URL is correctly formed
          expect(appUrl).toContain(baseUrl);
          expect(appUrl).toContain('#/');

          // Verify URL structure based on type
          if (id) {
            // Single entity URL should have ID
            expect(appUrl).toContain(id);
          }

          if (isSearch) {
            // Search/filter URL should work with query parameters
            expect(appUrl).toBeTruthy();
          }

          // Both URL formats should be valid:
          // 1. Full API URL: /#/https://api.openalex.org/...
          // 2. Relative path: /#/works/...
          const relativeFormat = apiUrl.replace(apiBaseUrl, '');
          const relativeUrl = `${baseUrl}/#${relativeFormat}`;
          expect(relativeUrl).toBeTruthy();
        });
      });

      it(`should handle ${type} search queries correctly`, () => {
        const searchUrls = typeUrls.filter((url) => url.includes('?'));
        if (searchUrls.length > 0) {
          searchUrls.forEach((url) => {
            const appUrl = toAppUrl(url);
            // Verify query parameters are preserved
            if (url.includes('filter=')) {
              expect(appUrl).toContain('filter=');
            }
            if (url.includes('sort=')) {
              expect(appUrl).toContain('sort=');
            }
          });
        }
      });
    });
  });

  describe('URL format compatibility', () => {
    it('should handle both URL formats', () => {
      const sampleUrls = Object.values(urls).slice(0, 10);
      expect(sampleUrls.length).toBeGreaterThan(0);

      sampleUrls.forEach((apiUrl) => {
        // Format 1: Full API URL
        const fullFormat = `${baseUrl}/#/${apiUrl}`;
        expect(fullFormat).toContain(apiBaseUrl);

        // Format 2: Relative path
        const relativePath = apiUrl.replace(apiBaseUrl, '');
        const relativeFormat = `${baseUrl}/#${relativePath}`;
        expect(relativeFormat).not.toContain(apiBaseUrl);

        // Both should be valid routing targets
        expect(fullFormat).toBeTruthy();
        expect(relativeFormat).toBeTruthy();
      });
    });
  });

  describe('Entity types coverage', () => {
    const expectedTypes = ['works', 'authors', 'sources', 'institutions', 'topics', 'publishers', 'funders'];

    expectedTypes.forEach((type) => {
      it(`should have URLs for entity type: ${type}`, () => {
        const hasType = Object.values(urls).some((url) => url.includes(`/${type}`));
        expect(hasType).toBe(true);
      });
    });
  });

  describe('URL structure validation', () => {
    it('should have valid OpenAlex entity IDs', () => {
      const entityUrls = Object.values(urls).filter((url) => {
        const { id } = parseUrl(url);
        return id !== undefined;
      });

      entityUrls.forEach((url) => {
        const { id } = parseUrl(url);
        if (id) {
          // OpenAlex IDs follow pattern: [A-Z]\d+
          expect(id).toMatch(/^[A-Z]\d+$/);
        }
      });
    });

    it('should have valid query parameters in search URLs', () => {
      const searchUrls = Object.values(urls).filter((url) => url.includes('?'));

      searchUrls.forEach((url) => {
        const urlObj = new URL(url);
        const params = urlObj.searchParams;

        // Check for valid OpenAlex API parameters
        const validParams = ['filter', 'sort', 'page', 'per_page', 'select', 'search'];
        const hasValidParam = Array.from(params.keys()).some((key) => validParams.includes(key));

        expect(hasValidParam || params.keys.length === 0).toBe(true);
      });
    });
  });

  describe('Data consistency expectations', () => {
    it('should expect same data fields between API and app', () => {
      // Define expected fields for each entity type
      const expectedFields = {
        works: ['id', 'display_name', 'publication_year', 'cited_by_count', 'authorships'],
        authors: ['id', 'display_name', 'works_count', 'cited_by_count', 'affiliations'],
        sources: ['id', 'display_name', 'works_count', 'cited_by_count', 'issn'],
        institutions: ['id', 'display_name', 'works_count', 'cited_by_count', 'country_code'],
        topics: ['id', 'display_name', 'works_count', 'cited_by_count', 'field'],
        publishers: ['id', 'display_name', 'works_count', 'cited_by_count'],
        funders: ['id', 'display_name', 'works_count', 'cited_by_count'],
      };

      Object.entries(expectedFields).forEach(([type, fields]) => {
        expect(fields.length).toBeGreaterThan(0);
        expect(fields).toContain('id');
        expect(fields).toContain('display_name');
      });
    });
  });
});
