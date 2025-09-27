import { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Group, 
  Text, 
  Card, 
  Badge, 
  Button, 
  TextInput, 
  MultiSelect, 
  Select,
  Stack,
  NumberInput,
  Alert,
  ActionIcon,
  Tooltip
} from '@mantine/core';
import { 
  IconSearch, 
  IconRefresh, 
  IconTrash, 
  IconDatabase,
  IconInfoCircle,
  IconFilter,
  IconExternalLink
} from '@tabler/icons-react';
import { type ColumnDef } from '@tanstack/react-table';
import { useNavigate } from '@tanstack/react-router';
import {
  cacheBrowserService,
  type CachedEntityMetadata,
  type CacheBrowserStats,
  type CacheBrowserFilters,
  type CacheBrowserOptions,
  type CacheBrowserEntityType
} from '@academic-explorer/utils';
import { logger } from '@academic-explorer/utils';
import { BaseTable } from '@/components/tables/BaseTable';

interface CacheBrowserState {
  entities: CachedEntityMetadata[];
  stats: CacheBrowserStats | null;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  totalMatching: number;
}

interface CacheBrowserProps {
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

const STORAGE_LOCATION_OPTIONS = [
  { value: 'indexeddb', label: 'IndexedDB' },
  { value: 'localstorage', label: 'LocalStorage' },
  { value: 'repository', label: 'Repository' },
  { value: 'memory', label: 'Memory' },
];

const SORT_OPTIONS = [
  { value: 'timestamp', label: 'Cache Date' },
  { value: 'type', label: 'Entity Type' },
  { value: 'label', label: 'Name' },
  { value: 'size', label: 'Size' },
];

export function CacheBrowser({ className }: CacheBrowserProps) {
  const navigate = useNavigate();
  
  const [state, setState] = useState<CacheBrowserState>({
    entities: [],
    stats: null,
    isLoading: false,
    error: null,
    hasMore: false,
    totalMatching: 0,
  });

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['works', 'authors']);
  const [selectedStorage, setSelectedStorage] = useState<string[]>(['indexeddb', 'localstorage']);
  const [sortBy, setSortBy] = useState<CacheBrowserOptions['sortBy']>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrrentPage] = useState(0);

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [minSize, setMinSize] = useState<number | undefined>();
  const [maxSize, setMaxSize] = useState<number | undefined>();

  const filters: Partial<CacheBrowserFilters> = useMemo(() => ({
    searchQuery,
    entityTypes: new Set(selectedTypes as CacheBrowserEntityType[]),
    storageLocations: new Set(selectedStorage),
    sizeRange: (minSize !== undefined || maxSize !== undefined) ? {
      min: minSize || 0,
      max: maxSize || Number.MAX_SAFE_INTEGER,
    } : undefined,
  }), [searchQuery, selectedTypes, selectedStorage, minSize, maxSize]);

  const options: Partial<CacheBrowserOptions> = useMemo(() => ({
    sortBy,
    sortDirection,
    limit: pageSize,
    offset: currentPage * pageSize,
    includeBasicInfo: true,
    includeRepositoryData: true,
  }), [sortBy, sortDirection, pageSize, currentPage]);

  const loadCachedEntities = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      logger.debug('cache-browser', 'Loading cached entities', { filters, options });
      
      const result = await cacheBrowserService.browse(filters, options);
      
      setState(prev => ({
        ...prev,
        entities: result.entities,
        stats: result.stats,
        hasMore: result.hasMore,
        totalMatching: result.totalMatching,
        isLoading: false,
      }));

      logger.debug('cache-browser', 'Loaded cached entities', {
        count: result.entities.length,
        total: result.totalMatching,
      });

    } catch (error) {
      logger.error('cache-browser', 'Failed to load cached entities', { error });
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: `Failed to load cached entities: ${String(error)}`,
      }));
    }
  };

  const clearCache = async () => {
    try {
      logger.debug('cache-browser', 'Clearing cache with filters', { filters });
      
      const clearedCount = await cacheBrowserService.clearCache(filters);
      
      logger.debug('cache-browser', 'Cache cleared', { clearedCount });
      
      // Reload entities after clearing
      await loadCachedEntities();
      
    } catch (error) {
      logger.error('cache-browser', 'Failed to clear cache', { error });
      setState(prev => ({
        ...prev,
        error: `Failed to clear cache: ${String(error)}`,
      }));
    }
  };

  // Load entities on filter/option changes
  useEffect(() => {
    void loadCachedEntities();
  }, [filters, options]);

  // Reset page when filters change
  useEffect(() => {
    setCurrrentPage(0);
  }, [searchQuery, selectedTypes, selectedStorage, minSize, maxSize]);

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
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
      logger.debug('cache-browser', 'No route defined for entity', { entity });
    }
  };

  const columns: ColumnDef<CachedEntityMetadata>[] = useMemo(() => [
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ getValue }) => (
        <Badge variant="light" size="sm">
          {String(getValue())}
        </Badge>
      ),
    },
    {
      accessorKey: 'label',
      header: 'Name',
      cell: ({ row }) => (
        <Group gap="xs">
          <Text size="sm" fw={500}>
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
      accessorKey: 'storageLocation',
      header: 'Storage',
      cell: ({ getValue }) => (
        <Badge variant="outline" size="xs">
          {String(getValue())}
        </Badge>
      ),
    },
    {
      accessorKey: 'dataSize',
      header: 'Size',
      cell: ({ getValue }) => (
        <Text size="xs">
          {formatSize(Number(getValue()))}
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
      header: 'Info',
      cell: ({ row }) => {
        const info = row.original.basicInfo;
        if (!info) return null;
        
        return (
          <Stack gap={1}>
            {info.citationCount !== undefined && (
              <Text size="xs" c="dimmed">
                Citations: {info.citationCount.toLocaleString()}
              </Text>
            )}
            {info.worksCount !== undefined && (
              <Text size="xs" c="dimmed">
                Works: {info.worksCount.toLocaleString()}
              </Text>
            )}
          </Stack>
        );
      },
    },
  ], []);

  return (
    <Box className={className}>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Text size="xl" fw={600}>Cache Browser</Text>
            <Text size="sm" c="dimmed">Browse and manage cached OpenAlex entities</Text>
          </div>
          
          <Group gap="xs">
            <Tooltip label="Refresh cache data">
              <ActionIcon onClick={() => { void loadCachedEntities(); }} loading={state.isLoading}>
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
            
            <Button
              leftSection={<IconTrash size={16} />}
              variant="light"
              color="red"
              onClick={() => { void clearCache(); }}
              disabled={state.isLoading || state.entities.length === 0}
            >
              Clear Filtered
            </Button>
          </Group>
        </Group>

        {/* Statistics */}
        {state.stats && (
          <Card p="md" withBorder>
            <Group gap="xl">
              <div>
                <Text size="lg" fw={600}>{state.stats.totalEntities.toLocaleString()}</Text>
                <Text size="xs" c="dimmed">Total Entities</Text>
              </div>
              
              <div>
                <Text size="lg" fw={600}>{formatSize(state.stats.totalCacheSize)}</Text>
                <Text size="xs" c="dimmed">Total Size</Text>
              </div>
              
              <div>
                <Text size="lg" fw={600}>{Object.keys(state.stats.entitiesByStorage).length}</Text>
                <Text size="xs" c="dimmed">Storage Types</Text>
              </div>
              
              <div>
                <Text size="lg" fw={600}>{state.totalMatching.toLocaleString()}</Text>
                <Text size="xs" c="dimmed">Matching Filters</Text>
              </div>
            </Group>
          </Card>
        )}

        {/* Filters */}
        <Card p="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={500}>Filters</Text>
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconFilter size={14} />}
                onClick={() => { setShowAdvancedFilters(!showAdvancedFilters); }}
              >
                Advanced
              </Button>
            </Group>

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
              
              <MultiSelect
                placeholder="Storage locations"
                data={STORAGE_LOCATION_OPTIONS}
                value={selectedStorage}
                onChange={setSelectedStorage}
                clearable
              />
            </Group>

            <Group>
              <Select
                label="Sort by"
                data={SORT_OPTIONS}
                value={sortBy}
                onChange={(value) => { setSortBy(value as CacheBrowserOptions['sortBy']); }}
                w={150}
              />
              
              <Select
                label="Direction"
                data={[
                  { value: 'desc', label: 'Descending' },
                  { value: 'asc', label: 'Ascending' },
                ]}
                value={sortDirection}
                onChange={(value) => { setSortDirection(value as 'asc' | 'desc'); }}
                w={120}
              />
              
              <Select
                label="Page size"
                data={[
                  { value: '25', label: '25' },
                  { value: '50', label: '50' },
                  { value: '100', label: '100' },
                  { value: '200', label: '200' },
                ]}
                value={pageSize.toString()}
                onChange={(value) => { setPageSize(Number(value) || 50); }}
                w={100}
              />
            </Group>

            {showAdvancedFilters && (
              <Group>
                <NumberInput
                  label="Min size (bytes)"
                  placeholder="0"
                  value={minSize}
                  onChange={(value) => { setMinSize(Number(value) || undefined); }}
                  w={150}
                />
                
                <NumberInput
                  label="Max size (bytes)"
                  placeholder="No limit"
                  value={maxSize}
                  onChange={(value) => { setMaxSize(Number(value) || undefined); }}
                  w={150}
                />
              </Group>
            )}
          </Stack>
        </Card>

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

        {/* Results table */}
        <Card p="md" withBorder>
          <BaseTable
            data={state.entities}
            columns={columns}
            isLoading={state.isLoading}
            pageSize={pageSize}
            searchable={false} // We handle search ourselves
            onRowClick={handleEntityClick}
          />
          
          {state.hasMore && (
            <Group justify="center" mt="md">
              <Button
                variant="light"
                onClick={() => { setCurrrentPage(prev => prev + 1); }}
                loading={state.isLoading}
              >
                Load More
              </Button>
            </Group>
          )}
        </Card>
      </Stack>
    </Box>
  );
}