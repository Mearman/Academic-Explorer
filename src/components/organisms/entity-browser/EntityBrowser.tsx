'use client';

import {
  Card,
  Text,
  Title,
  Stack,
  Group,
  Button,
  TextInput,
  Select,
  Grid,
  Paper,
  Badge,
  Pagination,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconSearch,
  IconArrowsShuffle,
  IconFilter,
  IconX,
} from '@tabler/icons-react';
import { useState, useCallback, useMemo } from 'react';

import { EntityLink, LoadingSkeleton } from '@/components';
import { useEntityBrowser } from '@/hooks/use-entity-browser';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

import * as styles from './entity-browser.css';
import { EntityFilters } from './EntityFilters';
import { EntitySortOptions } from './EntitySortOptions';

interface EntityBrowserProps {
  entityType: EntityType;
  title: string;
  description?: string;
  placeholder?: string;
  className?: string;
}

export function EntityBrowser({
  entityType,
  title,
  description,
  placeholder,
  className,
}: EntityBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<string>('cited_by_count:desc');
  const [perPage, setPerPage] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({});

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    getRandom,
    clearSearch,
  } = useEntityBrowser({
    entityType,
    search: searchQuery,
    filters: activeFilters,
    sort: sortBy,
    perPage,
    page: currentPage,
  });

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on new search
  }, []);

  const handleFilterChange = useCallback((filters: Record<string, unknown>) => {
    setActiveFilters(filters);
    setCurrentPage(1); // Reset to first page on filter change
  }, []);

  const handleSortChange = useCallback((sort: string) => {
    setSortBy(sort);
    setCurrentPage(1); // Reset to first page on sort change
  }, []);

  const handleRandomEntities = useCallback(() => {
    getRandom(perPage);
    setSearchQuery('');
    setActiveFilters({});
    setCurrentPage(1);
  }, [getRandom, perPage]);

  const handleClearAll = useCallback(() => {
    clearSearch();
    setSearchQuery('');
    setActiveFilters({});
    setCurrentPage(1);
    setSortBy('cited_by_count:desc');
  }, [clearSearch]);

  const results = data?.results || [];
  const meta = data?.meta;
  const totalPages = useMemo(() => {
    if (!meta?.count || !meta?.per_page) return 0;
    return Math.ceil(meta.count / meta.per_page);
  }, [meta]);

  const hasActiveSearch = searchQuery.length > 0 || Object.keys(activeFilters).length > 0;
  const hasResults = results.length > 0;

  return (
    <Card withBorder radius="md" p="xl" className={`${styles.container} ${className || ''}`}>
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={2}>{title}</Title>
            {description && (
              <Text size="sm" c="dimmed" mt="xs">
                {description}
              </Text>
            )}
          </div>

          <Group>
            <Tooltip label="Get random entities">
              <ActionIcon
                variant="light"
                size="lg"
                onClick={handleRandomEntities}
                loading={isLoading}
              >
                <IconArrowsShuffle size={18} />
              </ActionIcon>
            </Tooltip>

            <Button
              variant="light"
              leftSection={<IconFilter size={16} />}
              onClick={() => setShowFilters(!showFilters)}
              color={showFilters ? 'blue' : 'gray'}
            >
              Filters
            </Button>

            {hasActiveSearch && (
              <Button
                variant="light"
                leftSection={<IconX size={16} />}
                onClick={handleClearAll}
                color="red"
              >
                Clear
              </Button>
            )}
          </Group>
        </Group>

        {/* Search and Controls */}
        <Stack gap="md">
          <Group gap="md" grow>
            <TextInput
              placeholder={placeholder || `Search ${entityType.toLowerCase()}s...`}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              leftSection={<IconSearch size={16} />}
              size="md"
            />

            <Group gap="md" style={{ flexShrink: 0 }}>
              <EntitySortOptions
                entityType={entityType}
                value={sortBy}
                onChange={handleSortChange}
              />

              <Select
                data={[
                  { value: '10', label: '10 per page' },
                  { value: '25', label: '25 per page' },
                  { value: '50', label: '50 per page' },
                  { value: '100', label: '100 per page' },
                ]}
                value={perPage.toString()}
                onChange={(value) => setPerPage(Number(value) || 25)}
                size="md"
                style={{ width: 140 }}
              />
            </Group>
          </Group>

          {/* Filters */}
          {showFilters && (
            <EntityFilters
              entityType={entityType}
              filters={activeFilters}
              onChange={handleFilterChange}
            />
          )}

          {/* Active Filters Display */}
          {Object.keys(activeFilters).length > 0 && (
            <Group gap="xs">
              <Text size="sm" fw={500}>
                Active Filters:
              </Text>
              {Object.entries(activeFilters).map(([key, value]) => (
                <Badge
                  key={key}
                  variant="light"
                  rightSection={
                    <ActionIcon
                      size="xs"
                      color="blue"
                      radius="xl"
                      variant="transparent"
                      onClick={() => {
                        const newFilters = { ...activeFilters };
                        delete newFilters[key];
                        setActiveFilters(newFilters);
                      }}
                    >
                      <IconX size={10} />
                    </ActionIcon>
                  }
                >
                  {key}: {String(value)}
                </Badge>
              ))}
            </Group>
          )}
        </Stack>

        {/* Results */}
        <Stack gap="md">
          {/* Meta Information */}
          {meta && (
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                {meta.count?.toLocaleString() || 0} results
                {meta.db_response_time_ms && ` (${meta.db_response_time_ms}ms)`}
              </Text>
              {totalPages > 1 && (
                <Text size="sm" c="dimmed">
                  Page {currentPage} of {totalPages}
                </Text>
              )}
            </Group>
          )}

          {/* Loading State */}
          {isLoading && (
            <Stack gap="md">
              {Array.from({ length: perPage }).map((_, index) => (
                <LoadingSkeleton key={index} height="xl" />
              ))}
            </Stack>
          )}

          {/* Error State */}
          {isError && (
            <Paper p="lg" withBorder style={{ textAlign: 'center' }}>
              <Text c="red" fw={500} mb="md">
                Error loading {entityType.toLowerCase()}s
              </Text>
              <Text size="sm" c="dimmed" mb="lg">
                {error instanceof Error ? error.message : 'Something went wrong'}
              </Text>
              <Button variant="light" onClick={() => refetch()}>
                Try Again
              </Button>
            </Paper>
          )}

          {/* Results Grid */}
          {hasResults && !isLoading && (
            <Grid>
              {results.map((entity) => (
                <Grid.Col key={entity.id} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
                  <Paper p="md" withBorder radius="sm" className={styles.resultItem}>
                    <Stack gap="xs">
                      <EntityLink
                        entityId={entity.id}
                        displayName={entity.display_name}
                        size="sm"
                        weight={500}
                      />
                      
                      {/* Entity-specific metrics */}
                      <Group gap="xs">
                        {entity.cited_by_count !== undefined && (
                          <Badge size="xs" variant="light" color="blue">
                            {entity.cited_by_count.toLocaleString()} citations
                          </Badge>
                        )}
                        {'works_count' in entity && entity.works_count !== undefined && (
                          <Badge size="xs" variant="light" color="green">
                            {entity.works_count.toLocaleString()} works
                          </Badge>
                        )}
                        {('h_index' in entity && entity.h_index !== undefined) ? (
                          <Badge size="xs" variant="light" color="orange">
                            h-index: {entity.h_index}
                          </Badge>
                        ) : undefined}
                      </Group>

                      {/* Additional entity-specific information */}
                      <Stack gap={2}>
                        {'orcid' in entity && entity.orcid && (
                          <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>
                            ORCID: {entity.orcid}
                          </Text>
                        )}
                        {'country_code' in entity && entity.country_code && (
                          <Text size="xs" c="dimmed">
                            Country: {entity.country_code.toUpperCase()}
                          </Text>
                        )}
                        {'type' in entity && entity.type && (
                          <Text size="xs" c="dimmed">
                            Type: {entity.type}
                          </Text>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid.Col>
              ))}
            </Grid>
          )}

          {/* Empty State */}
          {!hasResults && !isLoading && !isError && hasActiveSearch && (
            <Paper p="lg" withBorder style={{ textAlign: 'center' }}>
              <Text fw={500} mb="md">
                No {entityType.toLowerCase()}s found
              </Text>
              <Text size="sm" c="dimmed" mb="lg">
                Try adjusting your search terms or filters
              </Text>
              <Button variant="light" onClick={handleClearAll}>
                Clear Search
              </Button>
            </Paper>
          )}

          {/* No Search State */}
          {!hasResults && !isLoading && !isError && !hasActiveSearch && (
            <Paper p="lg" withBorder style={{ textAlign: 'center' }}>
              <Text fw={500} mb="md">
                Start exploring {entityType.toLowerCase()}s
              </Text>
              <Text size="sm" c="dimmed" mb="lg">
                Search for specific {entityType.toLowerCase()}s or get random ones to start browsing
              </Text>
              <Group justify="center" gap="md">
                <Button
                  variant="light"
                  leftSection={<IconSearch size={16} />}
                  onClick={() => (document.querySelector('input[type="text"]') as HTMLInputElement)?.focus()}
                >
                  Start Searching
                </Button>
                <Button
                  variant="light"
                  leftSection={<IconArrowsShuffle size={16} />}
                  onClick={handleRandomEntities}
                >
                  Get Random
                </Button>
              </Group>
            </Paper>
          )}

          {/* Pagination */}
          {totalPages > 1 && !isLoading && (
            <Group justify="center" mt="lg">
              <Pagination
                total={totalPages}
                value={currentPage}
                onChange={setCurrentPage}
                size="md"
              />
            </Group>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}