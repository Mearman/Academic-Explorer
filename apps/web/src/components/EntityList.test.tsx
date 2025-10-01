import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { EntityList, type ColumnConfig, type EntityType } from './EntityList';
import { syntheticOpenAlexResponse } from '@/lib/utils/synthetic-data';
import type { OpenAlexResponse } from '@academic-explorer/openalex-client/types';

// Mock the OpenAlex client
vi.mock('@academic-explorer/openalex-client', () => ({
  openAlex: {
    funders: {
      getMultiple: vi.fn(),
    },
    publishers: {
      getMultiple: vi.fn(),
    },
    sources: {
      getMultiple: vi.fn(),
    },
  },
}));

const mockOpenAlex = vi.mocked(openAlex);

const mockFundersData = syntheticOpenAlexResponse('funders', 5);
const mockPublishersData = syntheticOpenAlexResponse('publishers', 5);
const mockSourcesData = syntheticOpenAlexResponse('sources', 5);

const baseColumns: ColumnConfig[] = [
  { key: 'id', header: 'ID' },
  { key: 'display_name', header: 'Name' },
];

describe('EntityList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<EntityList entityType="funders" columns={baseColumns} />);

    expect(screen.getByText(/loading funders/i)).toBeInTheDocument();
  });

  it('renders funders data successfully', async () => {
    mockOpenAlex.funders.getMultiple.mockResolvedValue(mockFundersData);

    render(<EntityList entityType="funders" columns={baseColumns} title="Test Funders" />);

    await waitFor(() => {
      expect(screen.getByText('Test Funders')).toBeInTheDocument();
    });

    // Check for table data (assuming BaseTable renders rows)
    expect(screen.getAllByRole('row')).toHaveLength(6); // header + 5 rows
  });

  it('renders publishers data successfully', async () => {
    mockOpenAlex.publishers.getMultiple.mockResolvedValue(mockPublishersData);

    render(<EntityList entityType="publishers" columns={baseColumns} title="Test Publishers" />);

    await waitFor(() => {
      expect(screen.getByText('Test Publishers')).toBeInTheDocument();
    });

    expect(screen.getAllByRole('row')).toHaveLength(6);
  });

  it('renders sources data successfully', async () => {
    mockOpenAlex.sources.getMultiple.mockResolvedValue(mockSourcesData);

    render(<EntityList entityType="sources" columns={baseColumns} title="Test Sources" />);

    await waitFor(() => {
      expect(screen.getByText('Test Sources')).toBeInTheDocument();
    });

    expect(screen.getAllByRole('row')).toHaveLength(6);
  });

  it('renders error state on fetch failure', async () => {
    const error = new Error('API Error');
    mockOpenAlex.funders.getMultiple.mockRejectedValue(error);

    render(<EntityList entityType="funders" columns={baseColumns} />);

    await waitFor(() => {
      expect(screen.getByText(/error: api error/i)).toBeInTheDocument();
    });
  });

  it('uses default title when not provided', async () => {
    mockOpenAlex.funders.getMultiple.mockResolvedValue(mockFundersData);

    render(<EntityList entityType="funders" columns={baseColumns} />);

    await waitFor(() => {
      expect(screen.getByText(/funders/i)).toBeInTheDocument();
    });
  });

  it('handles empty data gracefully', async () => {
    const emptyResponse: OpenAlexResponse<any> = {
      results: [],
      meta: { count: 0, per_page: 50, db_count: 0, page: 1 },
    };
    mockOpenAlex.funders.getMultiple.mockResolvedValue(emptyResponse);

    render(<EntityList entityType="funders" columns={baseColumns} />);

    await waitFor(() => {
      expect(screen.getAllByRole('row')).toHaveLength(1); // Only header
    });
  });
});