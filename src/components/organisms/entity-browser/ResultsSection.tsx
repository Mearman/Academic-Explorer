/**
 * Results Section Component for Entity Browser
 * 
 * Handles all result display logic including loading states, error states,
 * empty states, result grid, and pagination.
 */

import {
  Stack,
  Group,
  Text,
  Paper,
  Button,
  Grid,
  Badge,
  Pagination,
} from '@mantine/core';
import {
  IconSearch,
  IconArrowsShuffle,
} from '@tabler/icons-react';

import { EntityLink, LoadingSkeleton } from '@/components';
import type { EntityData } from '@/hooks/use-entity-data';
import type { EntityType } from '@/lib/openalex/utils/entity-detection';

import * as styles from './entity-browser.css';

interface ResultsSectionProps {
  entityType: EntityType;
  results: EntityData[];
  meta?: {
    count?: number;
    per_page?: number;
    db_response_time_ms?: number;
  };
  currentPage: number;
  totalPages: number;
  perPage: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasResults: boolean;
  hasActiveSearch: boolean;
  onRefetch: () => void;
  onPageChange: (page: number) => void;
  onClearAll: () => void;
  onRandom: () => void;
}

export function ResultsSection({
  entityType,
  results,
  meta,
  currentPage,
  totalPages,
  perPage,
  isLoading,
  isError,
  error,
  hasResults,
  hasActiveSearch,
  onRefetch,
  onPageChange,
  onClearAll,
  onRandom,
}: ResultsSectionProps) {
  return (
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
          <Button variant="light" onClick={onRefetch}>
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
                    {('h_index' in entity && entity.h_index !== undefined && typeof entity.h_index === 'number') && (
                      <Badge size="xs" variant="light" color="orange">
                        h-index: {entity.h_index}
                      </Badge>
                    )}
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
          <Button variant="light" onClick={onClearAll}>
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
              onClick={onRandom}
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
            onChange={onPageChange}
            size="md"
          />
        </Group>
      )}
    </Stack>
  );
}