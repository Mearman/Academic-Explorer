import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { CacheBrowser } from './CacheBrowser';

// Mock the cache browser service
jest.mock('@academic-explorer/utils', () => ({
  cacheBrowserService: {
    browse: jest.fn().mockResolvedValue({
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
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock react-router
jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => jest.fn(),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>
    {children}
  </MantineProvider>
);

describe('CacheBrowser', () => {
  it('renders without crashing', () => {
    render(
      <TestWrapper>
        <CacheBrowser />
      </TestWrapper>
    );
    
    // Check if main elements are present
    expect(screen.getByText('Cache Browser')).toBeInTheDocument();
    expect(screen.getByText('Browse and manage cached OpenAlex entities')).toBeInTheDocument();
  });

  it('renders filter controls', () => {
    render(
      <TestWrapper>
        <CacheBrowser />
      </TestWrapper>
    );
    
    // Check for filter elements
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search entities...')).toBeInTheDocument();
  });

  it('renders statistics section', () => {
    render(
      <TestWrapper>
        <CacheBrowser />
      </TestWrapper>
    );
    
    // Check for statistics
    expect(screen.getByText('Total Entities')).toBeInTheDocument();
    expect(screen.getByText('Total Size')).toBeInTheDocument();
  });
});