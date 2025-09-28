import { render, screen, waitFor, act } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { vi, describe, it, expect } from 'vitest';
import { CacheBrowser } from './CacheBrowser';

// Mock the cache browser service
vi.mock('@academic-explorer/utils', () => ({
  cacheBrowserService: {
    browse: vi.fn().mockResolvedValue({
      entities: [],
      stats: {
        totalEntities: 0,
        entitiesByType: {},
        entitiesByStorage: {},
        totalCacheSize: 0,
        oldestEntry: 0,
        newestEntry: 0,
      },
      hasMore: false,
      totalMatching: 0,
    }),
  },
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock react-router
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>
    {children}
  </MantineProvider>
);

describe('CacheBrowser', () => {
  it('renders without crashing', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <CacheBrowser />
        </TestWrapper>
      );
    });

    // Wait for async operations to complete
    await waitFor(() => {
      expect(screen.getByText('Cache Browser')).toBeInTheDocument();
    });

    expect(screen.getByText('Browse and manage cached OpenAlex entities')).toBeInTheDocument();
  });

  it('renders filter controls', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <CacheBrowser />
        </TestWrapper>
      );
    });

    // Wait for component to stabilize
    await waitFor(() => {
      const filterElements = screen.getAllByText('Filters');
      expect(filterElements.length).toBeGreaterThan(0);
    });

    // Check for filter elements using getAllByPlaceholderText to handle multiple instances
    const searchInputs = screen.getAllByPlaceholderText('Search entities...');
    expect(searchInputs.length).toBeGreaterThan(0);

    const entityTypeInputs = screen.getAllByPlaceholderText('Entity types');
    expect(entityTypeInputs.length).toBeGreaterThan(0);

    const storageLocationInputs = screen.getAllByPlaceholderText('Storage locations');
    expect(storageLocationInputs.length).toBeGreaterThan(0);

    // Check for filter section heading using getAllByText to handle multiple instances
    const filterElements = screen.getAllByText('Filters');
    expect(filterElements.length).toBeGreaterThan(0);
  });

  it('renders statistics section', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <CacheBrowser />
        </TestWrapper>
      );
    });

    // Wait for statistics to load
    await waitFor(() => {
      const totalEntitiesElements = screen.getAllByText('Total Entities');
      expect(totalEntitiesElements.length).toBeGreaterThan(0);
    });

    const totalSizeElements = screen.getAllByText('Total Size');
    expect(totalSizeElements.length).toBeGreaterThan(0);
  });
});