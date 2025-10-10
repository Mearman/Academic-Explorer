import { BaseTable } from '@/components/tables/BaseTable';
import {
    cacheBrowserService,
    logger,
    type CacheBrowserEntityType,
    type CacheBrowserFilters,
    type CacheBrowserOptions,
    type CacheBrowserStats,
    type CachedEntityMetadata
} from '@academic-explorer/utils';
import {
    ActionIcon,
    Alert,
    Badge,
    Container,
    Group,
    MultiSelect,
    Paper,
    Select,
    Stack,
    Text,
    TextInput,
    Tooltip,
} from '@mantine/core';
import {
    IconExternalLink,
    IconFilter,
    IconInfoCircle,
    IconRefresh,
    IconSearch
} from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { type ColumnDef } from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const LOGGER_CATEGORY = 'entity-browser';

interface EntityBrowserState {
  entities: CachedEntityMetadata[];
  stats: CacheBrowserStats | null;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  totalMatching: number;
}

interface EntityBrowserProps {
  className?: string;
}

const ENTITY_TYPE_OPTIONS = [
  { value: 'works', label: 'Works' },
  { value: 'authors', label: 'Authors' },
  { value: 'sources', label: 'Sources' },
  { value: 'institutions', label: 'Institutions' },
  { value: 'topics', label: 'Topics' },
  { value: 'publishers', label: 'Publishers' },
  { value: 'funders', label: 'Funders' },
  { value: 'keywords', label: 'Keywords' },
  { value: 'concepts', label: 'Concepts' },
];

const SORT_OPTIONS = [
  { value: 'timestamp', label: 'Recently Cached' },
  { value: 'type', label: 'Entity Type' },
  { value: 'label', label: 'Name' },
  { value: 'size', label: 'Data Size' },
];

export function EntityBrowser({ className }: EntityBrowserProps) {
  const navigate = useNavigate();

  const [state, setState] = useState<EntityBrowserState>({
    entities: [],
    stats: null,
    isLoading: false,
    error: null,
    hasMore: false,
    totalMatching: 0,
  });

  // Accessibility state for screen reader announcements
  const [_announcement, _setAnnouncement] = useState('');
  const _statusRegionRef = useRef<HTMLDivElement>(null);
  const _resultRegionRef = useRef<HTMLDivElement>(null);

  // Filter state - simplified for browsing
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    'works', 'authors', 'sources', 'institutions', 'topics'
  ]);
  const [sortBy, setSortBy] = useState<CacheBrowserOptions['sortBy']>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState(100); // Increase default for virtualization
  const [currentPage, setCurrentPage] = useState(0);

  const filters: Partial<CacheBrowserFilters> = useMemo(() => ({
    searchQuery,
    entityTypes: new Set(selectedTypes as CacheBrowserEntityType[]),
    storageLocations: new Set(['indexeddb', 'localstorage', 'repository']), // Include all storage
  }), [searchQuery, selectedTypes]);

  // Determine if we should load more data for virtualization
  const shouldLoadMore = state.entities.length > 200; // Enable virtualization for larger datasets
  const effectiveLimit = shouldLoadMore ? Math.max(pageSize * 10, 1000) : pageSize; // Load more data when virtualizing

  const options: Partial<CacheBrowserOptions> = useMemo(() => ({
    sortBy,
    sortDirection,
    limit: effectiveLimit,
    offset: shouldLoadMore ? 0 : currentPage * pageSize, // Reset offset when virtualizing
    includeBasicInfo: true,
    includeRepositoryData: true,
  }), [sortBy, sortDirection, effectiveLimit, shouldLoadMore, pageSize, currentPage]);

  const loadEntities = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      logger.debug(LOGGER_CATEGORY, 'Loading entities', { filters, options });

      const result = await cacheBrowserService.browse(filters, options);

      setState(prev => ({
        ...prev,
        entities: result.entities,
        stats: result.stats,
        hasMore: result.hasMore,
        totalMatching: result.totalMatching,
        isLoading: false,
      }));

      logger.debug(LOGGER_CATEGORY, 'Loaded entities', {
        count: result.entities.length,
        total: result.totalMatching,
      });

    } catch (error) {
      logger.error(LOGGER_CATEGORY, 'Failed to load entities', { error });
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: `Failed to load entities: ${String(error)}`,
      }));
    }
  }, [filters, options]);

  // Load entities on filter/option changes
  useEffect(() => {
    void loadEntities();
  }, [filters, options, loadEntities]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, selectedTypes]);

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getEntityTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      works: 'blue',
      authors: 'green',
      sources: 'purple',
      institutions: 'orange',
      topics: 'pink',
      publishers: 'teal',
      funders: 'yellow',
      keywords: 'gray',
      concepts: 'red',
    };
    return colors[type] || 'gray';
  };

  const handleEntityClick = (entity: CachedEntityMetadata) => {
    // Navigate to entity detail page
    if (entity.type === 'authors' && entity.id.startsWith('A')) {
      void navigate({ to: `/authors/${entity.id}` });
    } else if (entity.type === 'works' && entity.id.startsWith('W')) {
      void navigate({ to: `/works/${entity.id}` });
    } else if (entity.type === 'sources' && entity.id.startsWith('S')) {
      void navigate({ to: `/sources/${entity.id}` });
    } else if (entity.type === 'institutions' && entity.id.startsWith('I')) {
      void navigate({ to: `/institutions/${entity.id}` });
    } else if (entity.type === 'topics' && entity.id.startsWith('T')) {
      void navigate({ to: `/topics/${entity.id}` });
    } else {
      logger.debug(LOGGER_CATEGORY, 'No route defined for entity', { entity });
    }
  };

  const columns: ColumnDef<CachedEntityMetadata>[] = useMemo(() => [
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ getValue }) => (
        <Badge
          variant="light"
          size="sm"
          color={getEntityTypeColor(String(getValue()))}
        >
          {String(getValue())}
        </Badge>
      ),
    },
    {
      accessorKey: 'label',
      header: 'Name',
      cell: ({ row }) => (
        <Group gap="xs">
          <Text size="sm" fw={500} style={{ flex: 1 }}>
            {row.original.label}
          </Text>
          {row.original.basicInfo?.url && (
            <ActionIcon
              size="xs"
              variant="subtle"
              onClick={(e) => {
                e.stopPropagation();
                if (row.original.basicInfo?.url) {
                  window.open(row.original.basicInfo.url, '_blank');
                }
              }}
            >
              <IconExternalLink size={12} />
            </ActionIcon>
          )}
        </Group>
      ),
    },
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ getValue }) => (
        <Text size="xs" c="dimmed" ff="monospace">
          {String(getValue())}
        </Text>
      ),
    },
    {
      accessorKey: 'cacheTimestamp',
      header: 'Cached',
      cell: ({ getValue }) => (
        <Text size="xs" c="dimmed">
          {formatDate(Number(getValue()))}
        </Text>
      ),
    },
    {
      accessorKey: 'basicInfo',
      header: 'Details',
      cell: ({ row }) => {
        const info = row.original.basicInfo;
        if (!info) return null;

        return (
          <Stack gap={1}>
            {info.citationCount !== undefined && (
              <Text size="xs" c="dimmed">
                {info.citationCount.toLocaleString()} citations
              </Text>
            )}
            {info.worksCount !== undefined && (
              <Text size="xs" c="dimmed">
                {info.worksCount.toLocaleString()} works
              </Text>
            )}
          </Stack>
        );
      },
    },
  ], []);

  return (
    <Container size="xl" className={className}>
      <Stack gap="lg">
        {/* Header */}
        <Paper p="lg" withBorder>
          <Group justify="space-between" mb="md">
            <div>
              <Text size="xl" fw={600}>Browse Entities</Text>
              <Text size="sm" c="dimmed">Explore your cached OpenAlex entities</Text>
            </div>

            <Group gap="xs">
              <Tooltip label="Refresh entities">
                <ActionIcon onClick={() => { void loadEntities(); }} loading={state.isLoading}>
                  <IconRefresh size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          {/* Quick Stats */}
          {state.stats && (
            <Group gap="xl">
              <div>
                <Text size="lg" fw={600}>{state.stats.totalEntities.toLocaleString()}</Text>
                <Text size="xs" c="dimmed">Total Entities</Text>
              </div>

              <div>
                <Text size="lg" fw={600}>{state.totalMatching.toLocaleString()}</Text>
                <Text size="xs" c="dimmed">Matching Filters</Text>
              </div>

              <div>
                <Text size="lg" fw={600}>{Object.keys(state.stats.entitiesByType).length}</Text>
                <Text size="xs" c="dimmed">Entity Types</Text>
              </div>
            </Group>
          )}
        </Paper>

        {/* Filters */}
        <Paper p="md" withBorder>
          <Text fw={500} mb="md">
            <Group gap="xs">
              <IconFilter size={16} />
              Filters
            </Group>
          </Text>

          <Stack gap="md">
            <Group grow>
              <TextInput
                placeholder="Search entities..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); }}
              />

              <MultiSelect
                placeholder="Entity types"
                data={ENTITY_TYPE_OPTIONS}
                value={selectedTypes}
                onChange={setSelectedTypes}
                clearable
              />
            </Group>

            <Group>
              <Select
                label="Sort by"
                data={SORT_OPTIONS}
                value={sortBy}
                onChange={(value) => { setSortBy(value as CacheBrowserOptions['sortBy']); }}
                w={180}
              />

              <Select
                label="Direction"
                data={[
                  { value: 'desc', label: 'Newest First' },
                  { value: 'asc', label: 'Oldest First' },
                ]}
                value={sortDirection}
                onChange={(value) => { setSortDirection(value as 'asc' | 'desc'); }}
                w={140}
              />

              <Select
                label="Show"
                data={[
                  { value: '50', label: '50 items' },
                  { value: '100', label: '100 items' },
                  { value: '250', label: '250 items' },
                  { value: '500', label: '500 items' },
                ]}
                value={pageSize.toString()}
                onChange={(value) => { setPageSize(Number(value) || 100); }}
                w={120}
              />
            </Group>
          </Stack>
        </Paper>

        {/* Error display */}
        {state.error && (
          <Alert
            icon={<IconInfoCircle size={16} />}
            color="red"
            title="Error"
            withCloseButton
            onClose={() => { setState(prev => ({ ...prev, error: null })); }}
          >
            {state.error}
          </Alert>
        )}

        {/* Results */}
        <Paper p="md" withBorder>
          <BaseTable
            data={state.entities}
            columns={columns}
            isLoading={state.isLoading}
            pageSize={pageSize}
            searchable={false} // We handle search ourselves
            onRowClick={handleEntityClick}
            enableVirtualization={state.entities.length > 100} // Enable for large datasets
            estimateSize={60} // Row height for EntityBrowser rows
            maxHeight={700} // Reasonable height for entity browser
          />

          {state.hasMore && (
            <Group justify="center" mt="md">
              <Text size="sm" c="dimmed">
                Showing {state.entities.length} of {state.totalMatching} entities
              </Text>
            </Group>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
