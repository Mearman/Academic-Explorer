import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { Route as OpenAlexUrlRoute } from './$.tsx';
import { EntityDetectionService } from "@academic-explorer/graph";
import { syntheticData } from '@/lib/utils/synthetic-data'; // For stubbing if needed

// Mock EntityDetectionService
vi.mock("@academic-explorer/graph", () => ({
  EntityDetectionService: {
    detectEntity: vi.fn(),
  },
}));

const mockDetectEntity = EntityDetectionService.detectEntity as vi.Mock;

describe('OpenAlexUrl Route Integration Tests', () => {
  let router: any;
  let history: any;

  beforeEach(() => {
    vi.clearAllMocks();
    history = createMemoryHistory();
    router = createRouter({ history });
    router.addRoute(OpenAlexUrlRoute);
    router.start();
  });

  const renderRoute = (path: string) => {
    const wrapper = ({ children }: any) => <RouterProvider router={router}>{children}</RouterProvider>;
    render(<div data-testid="route-test">{path}</div>, { wrapper });
    act(() => {
      router.navigate({ to: path });
    });
  };

  const testCases = [
    // Single entity redirects
    {
      url: 'https://api.openalex.org/W2741809807',
      setup: () => mockDetectEntity.mockReturnValue({ entityType: 'works' }),
      expectedPath: '/works/W2741809807',
    },
    {
      url: 'https://api.openalex.org/authors/A2798520857',
      setup: () => mockDetectEntity.mockReturnValue({ entityType: 'authors' }),
      expectedPath: '/authors/A2798520857',
    },
    // List queries
    {
      url: 'https://api.openalex.org/works',
      setup: () => {},
      expectedPath: '/works',
    },
    {
      url: 'https://api.openalex.org/funders',
      setup: () => {},
      expectedPath: '/funders',
    },
    {
      url: 'https://api.openalex.org/publishers',
      setup: () => {},
      expectedPath: '/publishers',
    },
    {
      url: 'https://api.openalex.org/sources',
      setup: () => {},
      expectedPath: '/sources',
    },
    // Autocomplete
    {
      url: 'https://api.openalex.org/autocomplete/authors?q=ronald',
      setup: () => {},
      expectedPath: '/autocomplete/authors?q=ronald',
    },
    {
      url: 'https://api.openalex.org/autocomplete/works?q=tigers',
      setup: () => {},
      expectedPath: '/autocomplete/works?q=tigers',
    },
    // Params preservation
    {
      url: 'https://api.openalex.org/works?filter=publication_year:2020&sort=cited_by_count:desc',
      setup: () => {},
      expectedPath: '/works?filter=publication_year:2020&sort=cited_by_count:desc',
    },
    {
      url: 'https://api.openalex.org/authors?group_by=last_known_institutions.continent&per_page=50&page=2',
      setup: () => {},
      expectedPath: '/authors?group_by=last_known_institutions.continent&per_page=50&page=2',
    },
    // Fallback
    {
      url: 'https://api.openalex.org/keywords',
      setup: () => {},
      expectedPath: '/search?q=https%3A%2F%2Fapi.openalex.org%2Fkeywords',
    },
    // Invalid detection
    {
      url: 'https://api.openalex.org/invalid/id',
      setup: () => mockDetectEntity.mockReturnValue(null),
      expectedPath: '/search?q=https%3A%2F%2Fapi.openalex.org%2Finvalid%2Fid',
    },
  ];

  it.each(testCases)('should redirect correctly for $url', async ({ url, setup, expectedPath }) => {
    setup();
    const splatPath = `/openalex-url/${url}`;
    renderRoute(splatPath);

    await waitFor(() => {
      expect(router.history.location.pathname + router.history.location.search).toBe(expectedPath);
    }, { timeout: 1000 });
  });

  it('should handle URL parsing errors gracefully', async () => {
    const invalidUrl = 'invalid-url';
    const splatPath = `/openalex-url/${invalidUrl}`;
    renderRoute(splatPath);

    await waitFor(() => {
      expect(router.history.location.pathname).toBe('/search');
      expect(router.history.location.search).toContain('q=' + encodeURIComponent(invalidUrl));
    });
  });

  it('should preserve encoded params', async () => {
    const url = 'https://api.openalex.org/works?filter=display_name.search:john%20smith';
    const expectedPath = '/works?filter=display_name.search%3Ajohn%20smith';
    const setup = () => {};
    setup();
    const splatPath = `/openalex-url/${url}`;
    renderRoute(splatPath);

    await waitFor(() => {
      expect(router.history.location.pathname + router.history.location.search).toBe(expectedPath);
    });
  });
});