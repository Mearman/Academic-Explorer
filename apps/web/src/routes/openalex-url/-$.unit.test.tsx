import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { Route as OpenAlexUrlRoute } from './$.tsx';
import { EntityDetectionService } from "@academic-explorer/graph";

// Mock EntityDetectionService
vi.mock("@academic-explorer/graph", () => ({
  EntityDetectionService: {
    detectEntity: vi.fn(),
  },
}));

const mockDetectEntity = EntityDetectionService.detectEntity as vi.Mock;

describe('OpenAlexUrl Route Unit Tests', () => {
  let router: any;
  let history: any;

  beforeEach(() => {
    history = createMemoryHistory();
    router = createRouter({ history });
    router.addRoute(OpenAlexUrlRoute);
    router.start();
  });

  const renderRoute = (path: string) => {
    const wrapper = ({ children }: any) => <RouterProvider router={router}>{children}</RouterProvider>;
    act(() => {
      router.navigate({ to: path });
    });
    return renderHook(() => {}, { wrapper });
  };

  const testUrls = [
    // Single entity
    { url: 'https://api.openalex.org/W2741809807', expected: '/works/W2741809807' },
    { url: 'https://api.openalex.org/authors/A2798520857', expected: '/authors/A2798520857' },
    // List queries
    { url: 'https://api.openalex.org/authors', expected: '/authors' },
    { url: 'https://api.openalex.org/works', expected: '/works' },
    { url: 'https://api.openalex.org/institutions', expected: '/institutions' },
    { url: 'https://api.openalex.org/concepts', expected: '/concepts' },
    { url: 'https://api.openalex.org/sources', expected: '/sources' },
    { url: 'https://api.openalex.org/publishers', expected: '/publishers' },
    { url: 'https://api.openalex.org/funders', expected: '/funders' },
    { url: 'https://api.openalex.org/topics', expected: '/topics' },
    { url: 'https://api.openalex.org/keywords', expected: '/search?q=https%3A%2F%2Fapi.openalex.org%2Fkeywords' }, // Fallback
    // Autocomplete
    { url: 'https://api.openalex.org/autocomplete/authors?q=ronald', expected: '/autocomplete/authors?q=ronald' },
    { url: 'https://api.openalex.org/autocomplete/works?q=tigers', expected: '/autocomplete/works?q=tigers' },
    // With params
    { url: 'https://api.openalex.org/authors/A5023888391?select=id,display_name,orcid', expected: '/authors/A5023888391?select=id%2Cdisplay_name%2Corcid' },
    { url: 'https://api.openalex.org/works?filter=publication_year:2020', expected: '/works?filter=publication_year%3A2020' },
    { url: 'https://api.openalex.org/works?search=dna', expected: '/works?search=dna' },
    { url: 'https://api.openalex.org/authors?group_by=last_known_institutions.continent', expected: '/authors?group_by=last_known_institutions.continent' },
    { url: 'https://api.openalex.org/works?sort=cited_by_count:desc', expected: '/works?sort=cited_by_count%3Adesc' },
    { url: 'https://api.openalex.org/works?per_page=50&page=2', expected: '/works?per_page=50&page=2' },
    { url: 'https://api.openalex.org/works?sample=20', expected: '/works?sample=20' },
    // Invalid
    { url: 'https://api.openalex.org/invalid', expected: '/search?q=https%3A%2F%2Fapi.openalex.org%2Finvalid' },
  ];

  it.each(testUrls)('should handle $url correctly', async ({ url, expected }) => {
    const pathParts = url.replace('https://api.openalex.org/', '').split('?');
    const path = pathParts[0];
    const search = pathParts[1] ? `?${pathParts[1]}` : '';

    const splatPath = `/openalex-url/${url}`;
    renderRoute(splatPath);

    if (path.split('/').filter(p => p).length === 2) {
      // Mock for single entity
      mockDetectEntity.mockReturnValue({ entityType: 'works' }); // Adjust based on ID
    }

    // Wait for effect to run (in real test, use waitFor or similar)
    await vi.waitFor(() => {
      expect(router.history.location.pathname).toBe(expected.split('?')[0]);
      if (expected.includes('?')) {
        expect(router.history.location.search).toBe(expected.split('/')[expected.split('/').length - 1]);
      }
    });
  });

  it('should handle invalid URL', () => {
    const invalidUrl = 'https://invalid.com/path';
    const splatPath = `/openalex-url/${invalidUrl}`;
    renderRoute(splatPath);

    expect(router.history.location.pathname).toBe('/search');
    expect(router.history.location.search).toContain('q=' + encodeURIComponent(invalidUrl));
  });
});