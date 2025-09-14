import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Title, Text, Stack, Alert, Container, Card } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import { SearchInterface } from '../components/search/SearchInterface'
import { BaseTable } from '../components/tables/BaseTable'
import { formatPublicationYear } from '../lib/utils/date-helpers'
import { formatLargeNumber } from '../lib/utils/data-helpers'
import { pageTitle, pageDescription } from '../styles/layout.css'
import type { ColumnDef } from '@tanstack/react-table'
import { logger } from '@/lib/logger'

interface SearchFilters {
  query: string;
  startDate: Date | null;
  endDate: Date | null;
}

// Mock academic work data for demonstration
interface MockWork {
  id: string;
  title: string;
  authors: string[];
  publication_year: number;
  cited_by_count: number;
  journal: string;
  is_open_access: boolean;
}

// Mock data generator
const generateMockData = (query: string): MockWork[] => {
  if (!query.trim()) return [];

  return [
    {
      id: '1',
      title: `Advanced Research on ${query}: A Computational Approach`,
      authors: ['Dr. Sarah Johnson', 'Prof. Michael Chen'],
      publication_year: 2023,
      cited_by_count: 47,
      journal: 'Journal of Advanced Computing',
      is_open_access: true,
    },
    {
      id: '2',
      title: `Machine Learning Applications in ${query} Studies`,
      authors: ['Dr. Emily Rodriguez', 'Prof. David Kim', 'Dr. Lisa Wang'],
      publication_year: 2022,
      cited_by_count: 89,
      journal: 'Nature Machine Intelligence',
      is_open_access: false,
    },
    {
      id: '3',
      title: `The Future of ${query}: Trends and Predictions`,
      authors: ['Prof. Robert Taylor'],
      publication_year: 2024,
      cited_by_count: 23,
      journal: 'Science Advances',
      is_open_access: true,
    },
  ];
};

function SearchPage() {
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    startDate: null,
    endDate: null,
  });

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search', searchFilters],
    queryFn: () => {
      // Simulate API delay
      return new Promise<MockWork[]>((resolve) => {
        setTimeout(() => {
          resolve(generateMockData(searchFilters.query));
        }, 800);
      });
    },
    enabled: Boolean(searchFilters.query.trim()),
  });

  const columns: ColumnDef<MockWork>[] = [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <div>
          <Text fw={500} size="sm" lineClamp={2}>
            {row.original.title}
          </Text>
          <Text size="xs" c="dimmed">
            {row.original.authors.join(', ')}
          </Text>
        </div>
      ),
    },
    {
      accessorKey: 'journal',
      header: 'Journal',
      cell: ({ row }) => (
        <Text size="sm">{row.original.journal}</Text>
      ),
    },
    {
      accessorKey: 'publication_year',
      header: 'Year',
      cell: ({ row }) => (
        <Text size="sm">{formatPublicationYear(row.original.publication_year)}</Text>
      ),
    },
    {
      accessorKey: 'cited_by_count',
      header: 'Citations',
      cell: ({ row }) => (
        <Text size="sm" fw={500}>
          {formatLargeNumber(row.original.cited_by_count)}
        </Text>
      ),
    },
    {
      accessorKey: 'is_open_access',
      header: 'Access',
      cell: ({ row }) => (
        <Text
          size="sm"
          c={row.original.is_open_access ? 'green' : 'gray'}
          fw={row.original.is_open_access ? 500 : 400}
        >
          {row.original.is_open_access ? 'Open Access' : 'Closed'}
        </Text>
      ),
    },
  ];

  const handleSearch = (filters: SearchFilters) => {
    setSearchFilters(filters);
  };

  const hasResults = searchResults && searchResults.length > 0;
  const hasQuery = Boolean(searchFilters.query.trim());

  return (
    <Container size="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} className={pageTitle}>
            Academic Search Demo
          </Title>
          <Text className={pageDescription}>
            Explore Phase 1 functionality: TanStack React Table, Mantine Dates, enhanced search utilities,
            and debounced search with date filtering.
          </Text>
        </div>

        <SearchInterface
          onSearch={handleSearch}
          isLoading={isLoading}
          placeholder="Try searching for 'machine learning', 'climate change', or 'artificial intelligence'"
          showDateFilter={true}
        />

        {hasQuery && (
          <Card withBorder>
            {isLoading ? (
              <Text ta="center" py="xl">
                Searching...
              </Text>
            ) : hasResults ? (
              <Stack>
                <Text size="sm" c="dimmed">
                  Found {searchResults.length} results for "{searchFilters.query}"
                  {searchFilters.startDate || searchFilters.endDate ? (
                    <span>
                      {' '}with date filters applied
                    </span>
                  ) : null}
                </Text>

                <BaseTable
                  data={searchResults}
                  columns={columns}
                  searchable={false} // Search is handled by the SearchInterface
                  onRowClick={(work) => {
                    logger.debug('ui', 'Work clicked in search results', { workId: work.id, workTitle: work.display_name }, 'SearchPage');
                    // Could navigate to work detail page
                  }}
                />
              </Stack>
            ) : (
              <Alert
                icon={<IconInfoCircle />}
                title="No results found"
                color="blue"
                variant="light"
              >
                <Text size="sm">
                  No academic works found for "{searchFilters.query}". Try different search terms or adjust your filters.
                </Text>
              </Alert>
            )}
          </Card>
        )}

        {!hasQuery && (
          <Card withBorder>
            <Stack align="center" py="xl">
              <Text size="lg" fw={500}>
                Enter a search term to explore academic literature
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                This demo showcases the Phase 1 enhancements including debounced search,
                date filtering, sortable tables, and enhanced data utilities.
              </Text>
            </Stack>
          </Card>
        )}
      </Stack>
    </Container>
  );
}

export const Route = createFileRoute('/search')({
  component: SearchPage,
})