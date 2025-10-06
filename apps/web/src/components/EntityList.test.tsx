import type { Funder, OpenAlexResponse, Publisher, Source } from '@academic-explorer/client';
import { cachedOpenAlex } from '@academic-explorer/client';
import { MantineProvider } from '@mantine/core';
import { render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EntityList, type ColumnConfig } from './EntityList';

// Mock the cached OpenAlex client
vi.mock('@academic-explorer/client', () => ({
  cachedOpenAlex: {
    client: {
      funders: {
        getMultiple: vi.fn(),
      },
      publishers: {
        getMultiple: vi.fn(),
      },
      sources: {
        getSources: vi.fn(),
      },
    },
  },
}));

const mockCachedOpenAlex = vi.mocked(cachedOpenAlex);
// Test wrapper with MantineProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

const createMockResponse = <T extends Funder | Publisher | Source>(
  entities: T[]
): OpenAlexResponse<T> => ({
  results: entities,
  meta: {
    count: entities.length,
    db_response_time_ms: 50,
    page: 1,
    per_page: entities.length,
  },
});

const mockFundersData = createMockResponse<Funder>([
  {
    id: 'F123456789',
    display_name: 'Test Funder 1',
    country_code: 'US',
    grants_count: 1000,
    works_count: 5000,
    cited_by_count: 50000,
    ids: { openalex: 'F123456789' },
    updated_date: '2023-01-01T00:00:00.000000Z',
    created_date: '2023-01-01T00:00:00.000000Z',
  },
  {
    id: 'F234567890',
    display_name: 'Test Funder 2',
    country_code: 'US',
    grants_count: 800,
    works_count: 4000,
    cited_by_count: 40000,
    ids: { openalex: 'F234567890' },
    updated_date: '2023-01-01T00:00:00.000000Z',
    created_date: '2023-01-01T00:00:00.000000Z',
  },
  // ... more mock funders
]);

const mockPublishersData = createMockResponse<Publisher>([
  {
    id: 'P123456789',
    display_name: 'Test Publisher 1',
    country_codes: ['US'],
    hierarchy_level: 1,
    works_count: 10000,
    cited_by_count: 100000,
    sources_count: 100,
    ids: { openalex: 'P123456789' },
    updated_date: '2023-01-01T00:00:00.000000Z',
    created_date: '2023-01-01T00:00:00.000000Z',
  },
  {
    id: 'P234567890',
    display_name: 'Test Publisher 2',
    country_codes: ['US'],
    hierarchy_level: 1,
    works_count: 8000,
    cited_by_count: 80000,
    sources_count: 80,
    ids: { openalex: 'P234567890' },
    updated_date: '2023-01-01T00:00:00.000000Z',
    created_date: '2023-01-01T00:00:00.000000Z',
  },
]);

const mockSourcesData = createMockResponse<Source>([
  {
    id: 'S123456789',
    display_name: 'Test Source 1',
    issn_l: '0000-0001',
    issn: ['0000-0001'],
    publisher: 'Test Publisher 1',
    works_count: 1000,
    cited_by_count: 10000,
    is_oa: true,
    is_in_doaj: true,
    type: 'journal',
    ids: { openalex: 'S123456789' },
    updated_date: '2023-01-01T00:00:00.000000Z',
    created_date: '2023-01-01T00:00:00.000000Z',
  },
  {
    id: 'S234567890',
    display_name: 'Test Source 2',
    issn_l: '0000-0002',
    issn: ['0000-0002'],
    publisher: 'Test Publisher 2',
    works_count: 800,
    cited_by_count: 8000,
    is_oa: false,
    is_in_doaj: false,
    type: 'journal',
    ids: { openalex: 'S234567890' },
    updated_date: '2023-01-01T00:00:00.000000Z',
    created_date: '2023-01-01T00:00:00.000000Z',
  },
]);

const baseColumns: ColumnConfig[] = [
  { key: 'id', header: 'ID' },
  { key: 'display_name', header: 'Name' },
];

describe('EntityList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<TestWrapper><EntityList entityType="funders" columns={baseColumns} /></TestWrapper>);

    expect(screen.getByText(/loading funders/i)).toBeInTheDocument();
  });

  it('renders funders data successfully', async () => {
    mockCachedOpenAlex.client.funders.getMultiple.mockResolvedValue(mockFundersData);

    const { container } = render(<TestWrapper><EntityList entityType="funders" columns={baseColumns} title="Test Funders" /></TestWrapper>);

    await waitFor(() => {
      expect(within(container).getByText('Test Funders')).toBeInTheDocument();
    });

    // Check for table data within the rendered component only
    const table = within(container).getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(3); // header + 2 rows
  });

  it('renders publishers data successfully', async () => {
    mockCachedOpenAlex.client.publishers.getMultiple.mockResolvedValue(mockPublishersData);

    const { container: containerPub } = render(<TestWrapper><EntityList entityType="publishers" columns={baseColumns} title="Test Publishers" /></TestWrapper>);

    await waitFor(() => {
      expect(within(containerPub).getByText('Test Publishers')).toBeInTheDocument();
    });

    const tablePub = within(containerPub).getByRole('table');
    expect(within(tablePub).getAllByRole('row')).toHaveLength(3);
  });

  it('renders sources data successfully', async () => {
    mockCachedOpenAlex.client.sources.getSources.mockResolvedValue(mockSourcesData);

    const { container: containerSrc } = render(<TestWrapper><EntityList entityType="sources" columns={baseColumns} title="Test Sources" /></TestWrapper>);

    await waitFor(() => {
      expect(within(containerSrc).getByText('Test Sources')).toBeInTheDocument();
    });

    const tableSrc = within(containerSrc).getByRole('table');
    expect(within(tableSrc).getAllByRole('row')).toHaveLength(3);
  });

  it('renders error state on fetch failure', async () => {
    const error = new Error('API Error');
    mockCachedOpenAlex.client.funders.getMultiple.mockRejectedValue(error);

    render(<TestWrapper><EntityList entityType="funders" columns={baseColumns} /></TestWrapper>);

    await waitFor(() => {
      expect(screen.getByText(/error: api error/i)).toBeInTheDocument();
    });
  });

  it('uses default title when not provided', async () => {
    mockCachedOpenAlex.client.funders.getMultiple.mockResolvedValue(mockFundersData);

    const { container: containerDefault } = render(<TestWrapper><EntityList entityType="funders" columns={baseColumns} /></TestWrapper>);

    await waitFor(() => {
      expect(within(containerDefault).getByText(/funders/i)).toBeInTheDocument();
    });
  });

  it('handles empty data gracefully', async () => {
    const emptyResponse: OpenAlexResponse<any> = {
      results: [],
      meta: { count: 0, db_response_time_ms: 0, per_page: 50, page: 1 },
    };
    mockCachedOpenAlex.client.funders.getMultiple.mockResolvedValue(emptyResponse);

    const { container: containerEmpty } = render(<TestWrapper><EntityList entityType="funders" columns={baseColumns} /></TestWrapper>);

    await waitFor(() => {
      const tableEmpty = within(containerEmpty).getByRole('table');
      expect(within(tableEmpty).getAllByRole('row')).toHaveLength(2); // header + no data row
    });
  });
});
