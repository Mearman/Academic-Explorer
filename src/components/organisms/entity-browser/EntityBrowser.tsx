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
  Badge,
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

import { useEntityBrowser } from '@/hooks/use-entity-browser';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

import * as styles from './entity-browser.css';
import { EntityFilters } from './EntityFilters';
import { EntitySortOptions } from './EntitySortOptions';
import { ResultsSection } from './ResultsSection';

interface EntityBrowserProps {
  entityType: EntityType;
  title: string;
  description?: string;
  placeholder?: string;
  className?: string;
}

// Custom hook for entity browser state and handlers
function useEntityBrowserState(entityType: EntityType) {
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
    setCurrentPage(1);
  }, []);

  const handleFilterChange = useCallback((filters: Record<string, unknown>) => {
    setActiveFilters(filters);
    setCurrentPage(1);
  }, []);

  const handleSortChange = useCallback((sort: string) => {
    setSortBy(sort);
    setCurrentPage(1);
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

  return {
    searchQuery,
    showFilters,
    sortBy,
    perPage,
    currentPage,
    activeFilters,
    setShowFilters,
    setPerPage,
    setCurrentPage,
    setActiveFilters,
    data,
    isLoading,
    isError,
    error,
    refetch,
    handleSearch,
    handleFilterChange,
    handleSortChange,
    handleRandomEntities,
    handleClearAll,
    results,
    meta,
    totalPages,
    hasActiveSearch,
    hasResults,
  };
}

export function EntityBrowser({
  entityType,
  title,
  description,
  placeholder,
  className,
}: EntityBrowserProps) {
  const {
    searchQuery,
    showFilters,
    sortBy,
    perPage,
    currentPage,
    activeFilters,
    setShowFilters,
    setPerPage,
    setCurrentPage,
    setActiveFilters,
    isLoading,
    isError,
    error,
    refetch,
    handleSearch,
    handleFilterChange,
    handleSortChange,
    handleRandomEntities,
    handleClearAll,
    results,
    meta,
    totalPages,
    hasActiveSearch,
    hasResults,
  } = useEntityBrowserState(entityType);

  return (
    <Card withBorder radius="md" p="xl" className={`${styles.container} ${className || ''}`}>
      <Stack gap="lg">
        <BrowserHeader
          title={title}
          description={description}
          hasActiveSearch={hasActiveSearch}
          showFilters={showFilters}
          isLoading={isLoading}
          onToggleFilters={() => setShowFilters(!showFilters)}
          onRandom={handleRandomEntities}
          onClearAll={handleClearAll}
        />

        <SearchControls
          entityType={entityType}
          placeholder={placeholder}
          searchQuery={searchQuery}
          sortBy={sortBy}
          perPage={perPage}
          activeFilters={activeFilters}
          showFilters={showFilters}
          onSearch={handleSearch}
          onSortChange={handleSortChange}
          onPerPageChange={setPerPage}
          onFilterChange={handleFilterChange}
          onRemoveFilter={(key) => {
            const newFilters = { ...activeFilters };
            delete newFilters[key];
            setActiveFilters(newFilters);
          }}
        />

        <ResultsSection
          entityType={entityType}
          results={results}
          meta={meta}
          currentPage={currentPage}
          totalPages={totalPages}
          perPage={perPage}
          isLoading={isLoading}
          isError={isError}
          error={error}
          hasResults={hasResults}
          hasActiveSearch={hasActiveSearch}
          onRefetch={refetch}
          onPageChange={setCurrentPage}
          onClearAll={handleClearAll}
          onRandom={handleRandomEntities}
        />
      </Stack>
    </Card>
  );
}

// Component for browser header with controls
function BrowserHeader({
  title,
  description,
  hasActiveSearch,
  showFilters,
  isLoading,
  onToggleFilters,
  onRandom,
  onClearAll,
}: {
  title: string;
  description?: string;
  hasActiveSearch: boolean;
  showFilters: boolean;
  isLoading: boolean;
  onToggleFilters: () => void;
  onRandom: () => void;
  onClearAll: () => void;
}) {
  return (
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
            onClick={onRandom}
            loading={isLoading}
          >
            <IconArrowsShuffle size={18} />
          </ActionIcon>
        </Tooltip>

        <Button
          variant="light"
          leftSection={<IconFilter size={16} />}
          onClick={onToggleFilters}
          color={showFilters ? 'blue' : 'gray'}
        >
          Filters
        </Button>

        {hasActiveSearch && (
          <Button
            variant="light"
            leftSection={<IconX size={16} />}
            onClick={onClearAll}
            color="red"
          >
            Clear
          </Button>
        )}
      </Group>
    </Group>
  );
}

// Component for search controls and filters
function SearchControls({
  entityType,
  placeholder,
  searchQuery,
  sortBy,
  perPage,
  activeFilters,
  showFilters,
  onSearch,
  onSortChange,
  onPerPageChange,
  onFilterChange,
  onRemoveFilter,
}: {
  entityType: EntityType;
  placeholder?: string;
  searchQuery: string;
  sortBy: string;
  perPage: number;
  activeFilters: Record<string, unknown>;
  showFilters: boolean;
  onSearch: (query: string) => void;
  onSortChange: (sort: string) => void;
  onPerPageChange: (perPage: number) => void;
  onFilterChange: (filters: Record<string, unknown>) => void;
  onRemoveFilter: (key: string) => void;
}) {
  return (
    <Stack gap="md">
      <Group gap="md" grow>
        <TextInput
          placeholder={placeholder || `Search ${entityType.toLowerCase()}s...`}
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          leftSection={<IconSearch size={16} />}
          size="md"
        />

        <Group gap="md" style={{ flexShrink: 0 }}>
          <EntitySortOptions
            entityType={entityType}
            value={sortBy}
            onChange={onSortChange}
          />

          <Select
            data={[
              { value: '10', label: '10 per page' },
              { value: '25', label: '25 per page' },
              { value: '50', label: '50 per page' },
              { value: '100', label: '100 per page' },
            ]}
            value={perPage.toString()}
            onChange={(value) => onPerPageChange(Number(value) || 25)}
            size="md"
            style={{ width: 140 }}
          />
        </Group>
      </Group>

      {showFilters && (
        <EntityFilters
          entityType={entityType}
          filters={activeFilters}
          onChange={onFilterChange}
        />
      )}

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
                  onClick={() => onRemoveFilter(key)}
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
  );
}