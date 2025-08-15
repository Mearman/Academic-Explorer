/**
 * Works Timeline Component
 * 
 * Displays an author's works organized chronologically with timeline visualization
 */

import {
  Card,
  Stack,
  Text,
  Title,
  Badge,
  Group,
  Select,
  NumberInput,
  Button,
  Loader,
  Alert,
  Paper,
  Timeline,
  Divider,
  Grid,
  ActionIcon,
  Tooltip
} from '@mantine/core';
import {
  IconCalendar,
  IconExternalLink,
  IconQuote,
  IconBook,
  IconFilter,
  IconRefresh,
  IconEye
} from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import React, { useState, useMemo } from 'react';

import { EntityLink } from '@/components';
import { getOpenAccessColour } from '@/components/design-tokens.utils';
import { useAuthorWorks, type AuthorWorksOptions } from '@/hooks/use-author-works';
import type { Work } from '@/lib/openalex/types';

interface WorksTimelineProps {
  authorId: string;
  authorName?: string;
}

interface YearGroup {
  year: number;
  works: Work[];
  totalCitations: number;
}

// Utility function to group works by year
function groupWorksByYear(works: Work[], sortOrder: 'asc' | 'desc' = 'desc'): YearGroup[] {
  const groups = new Map<number, Work[]>();
  
  works.forEach(work => {
    const year = work.publication_year || new Date(work.publication_date || '').getFullYear();
    if (!groups.has(year)) {
      groups.set(year, []);
    }
    groups.get(year)!.push(work);
  });

  return Array.from(groups.entries())
    .map(([year, yearWorks]) => ({
      year,
      works: yearWorks,
      totalCitations: yearWorks.reduce((sum, work) => sum + work.cited_by_count, 0)
    }))
    .sort((a, b) => sortOrder === 'desc' ? b.year - a.year : a.year - b.year);
}

// Utility function to render timeline header
function TimelineHeader({ authorName }: { authorName?: string }) {
  return (
    <div>
      <Group mb="md">
        <IconCalendar size={20} />
        <Title order={2}>Works Timeline</Title>
        {authorName && (
          <Text size="sm" c="dimmed">for {authorName}</Text>
        )}
      </Group>
      
      <Text size="sm" c="dimmed">
        Chronological view of all works with detailed information and metrics
      </Text>
    </div>
  );
}

// Utility function to render loading and empty states
function TimelineStates({ 
  loading, 
  works, 
  refetch: _refetch 
}: { 
  loading: boolean; 
  works: Work[]; 
  refetch: () => void;
}) {
  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader size="lg" />
        <Text>Loading works...</Text>
      </Group>
    );
  }

  if (works.length === 0) {
    return (
      <Alert title="No works found">
        No works found for the selected criteria. Try adjusting the filters.
      </Alert>
    );
  }

  return null;
}

// Utility function to render timeline content with year groups
function TimelineContent({ 
  worksByYear 
}: { 
  worksByYear: YearGroup[];
}) {
  if (worksByYear.length === 0) return null;
  
  return (
    <Timeline active={worksByYear.length} bulletSize={24} lineWidth={2}>
      {worksByYear.map((yearGroup, index) => (
        <Timeline.Item
          key={yearGroup.year}
          bullet={<IconCalendar size={12} />}
          title={
            <Group gap="md" mb="md">
              <Title order={3} size="lg">{yearGroup.year}</Title>
              <Badge variant="light" size="lg" radius="sm">
                {yearGroup.works.length} {yearGroup.works.length === 1 ? 'work' : 'works'}
              </Badge>
              <Badge variant="outline" size="lg" radius="sm" color="blue">
                {yearGroup.totalCitations} total citations
              </Badge>
            </Group>
          }
        >
          <Stack gap="xs">
            {yearGroup.works.map((work) => (
              <WorkCard key={work.id} work={work} />
            ))}
          </Stack>
          
          {index < worksByYear.length - 1 && <Divider my="xl" />}
        </Timeline.Item>
      ))}
    </Timeline>
  );
}

// Utility function to render load more and pagination info
function TimelinePagination({ 
  hasNextPage, 
  isLoadingMore, 
  loadMore, 
  works, 
  totalCount 
}: {
  hasNextPage: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
  works: Work[];
  totalCount: number;
}) {
  if (hasNextPage) {
    return (
      <Group justify="center" mt="xl">
        <Button
          variant="light"
          loading={isLoadingMore}
          onClick={loadMore}
          leftSection={<IconEye size={16} />}
        >
          Load More Works
        </Button>
      </Group>
    );
  }

  if (works.length > 0) {
    return (
      <Text ta="center" size="sm" c="dimmed" mt="xl">
        All works loaded ({totalCount} total)
      </Text>
    );
  }

  return null;
}

function WorkCard({ work }: { work: Work }) {
  const publicationYear = work.publication_year || new Date(work.publication_date || '').getFullYear();
  const oaColour = getOpenAccessColour(work.open_access.oa_status);
  
  // Extract clean work ID for routing
  const workId = work.id.replace('https://openalex.org/', '');
  const workPath = `/works/${workId}`;
  
  return (
    <Paper 
      p="md" 
      withBorder 
      radius="sm" 
      mb="sm"
      component={Link}
      to={workPath}
      style={{ 
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }
      }}
    >
      <Stack gap="xs">
        {/* Title and Basic Info */}
        <Group justify="space-between" align="flex-start">
          <div style={{ flex: 1 }}>
            <Title order={4} size="sm" lineClamp={2} mb="xs" c="blue">
              {work.display_name}
            </Title>
            
            {/* Authors */}
            {work.authorships && work.authorships.length > 0 && (
              <Text size="xs" c="dimmed" mb="xs">
                {work.authorships
                  .slice(0, 5)
                  .map(authorship => authorship.author?.display_name)
                  .filter(Boolean)
                  .join(', ')}
                {work.authorships.length > 5 && ` (+${work.authorships.length - 5} more)`}
              </Text>
            )}
          </div>
          
          <Group gap="xs">
            {work.open_access.is_oa && (
              <Badge
                size="xs"
                variant="light"
                color={oaColour}
                radius="sm"
              >
                Open Access
              </Badge>
            )}
            {work.ids.doi && (
              <Tooltip label="View DOI">
                <ActionIcon
                  variant="light"
                  size="sm"
                  component="a"
                  href={`https://doi.org/${work.ids.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()} // Prevent card click when clicking DOI
                >
                  <IconExternalLink size={12} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>

        {/* Publication Details */}
        <Group gap="lg" wrap="wrap">
          {work.primary_location?.source && (
            <Group gap="xs">
              <IconBook size={14} />
              <Text size="xs" onClick={(e) => e.stopPropagation()}>
                <EntityLink
                  entityId={work.primary_location.source.id}
                  displayName={work.primary_location.source.display_name}
                  size="xs"
                />
              </Text>
            </Group>
          )}
          
          <Group gap="xs">
            <IconCalendar size={14} />
            <Text size="xs">{publicationYear}</Text>
          </Group>
          
          <Group gap="xs">
            <IconQuote size={14} />
            <Text size="xs">{work.cited_by_count} citations</Text>
          </Group>
          
          {work.type && (
            <Badge size="xs" variant="outline" radius="sm">
              {work.type}
            </Badge>
          )}
        </Group>

        {/* Topics */}
        {work.topics && work.topics.length > 0 && (
          <Group gap="xs">
            {work.topics.slice(0, 3).map(topic => (
              <Badge
                key={topic.id}
                size="xs"
                variant="light"
                color="blue"
                radius="sm"
              >
                {topic.display_name}
              </Badge>
            ))}
            {work.topics.length > 3 && (
              <Text size="xs" c="dimmed">+{work.topics.length - 3} more</Text>
            )}
          </Group>
        )}
      </Stack>
    </Paper>
  );
}

function TimelineFilters({
  options,
  onOptionsChange,
  totalWorks,
  onRefetch
}: {
  options: AuthorWorksOptions;
  onOptionsChange: (options: Partial<AuthorWorksOptions>) => void;
  totalWorks: number;
  onRefetch: () => void;
}) {
  const currentYear = new Date().getFullYear();
  
  return (
    <Card withBorder p="md" mb="lg">
      <Group mb="md">
        <IconFilter size={18} />
        <Title order={3} size="md">Filter Works</Title>
        <Badge variant="light" size="sm">{totalWorks} total works</Badge>
      </Group>
      
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Select
            label="Sort by"
            value={options.sortBy || 'publication_date'}
            onChange={(value) => {
              if (value === 'publication_date' || value === 'cited_by_count' || value === 'relevance_score') {
                onOptionsChange({ sortBy: value });
              }
            }}
            data={[
              { value: 'publication_date', label: 'Publication Date' },
              { value: 'cited_by_count', label: 'Citation Count' },
              { value: 'relevance_score', label: 'Relevance' }
            ]}
            size="sm"
          />
        </Grid.Col>
        
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Select
            label="Order"
            value={options.sortOrder || 'desc'}
            onChange={(value) => {
              if (value === 'asc' || value === 'desc') {
                onOptionsChange({ sortOrder: value });
              }
            }}
            data={[
              { value: 'desc', label: 'Newest First' },
              { value: 'asc', label: 'Oldest First' }
            ]}
            size="sm"
          />
        </Grid.Col>
        
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <NumberInput
            label="From Year"
            placeholder="e.g., 2000"
            value={options.yearRange?.start || ''}
            onChange={(value) => onOptionsChange({ 
              yearRange: { 
                ...options.yearRange, 
                start: typeof value === 'number' ? value : undefined 
              } 
            })}
            min={1900}
            max={currentYear}
            size="sm"
          />
        </Grid.Col>
        
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <NumberInput
            label="To Year"
            placeholder="e.g., 2024"
            value={options.yearRange?.end || ''}
            onChange={(value) => onOptionsChange({ 
              yearRange: { 
                ...options.yearRange, 
                end: typeof value === 'number' ? value : undefined 
              } 
            })}
            min={1900}
            max={currentYear}
            size="sm"
          />
        </Grid.Col>
      </Grid>
      
      <Group mt="md">
        <Button
          leftSection={<IconRefresh size={16} />}
          variant="light"
          size="sm"
          onClick={onRefetch}
        >
          Refresh
        </Button>
      </Group>
    </Card>
  );
}

export function WorksTimeline({ authorId, authorName }: WorksTimelineProps) {
  const [options, setOptions] = useState<AuthorWorksOptions>({
    sortBy: 'publication_date',
    sortOrder: 'desc',
    limit: 50
  });

  const {
    works,
    totalCount,
    loading,
    error,
    hasNextPage,
    isLoadingMore,
    loadMore,
    refetch,
    updateOptions
  } = useAuthorWorks(authorId, options);

  // Group works by year
  const worksByYear = useMemo((): YearGroup[] => {
    return groupWorksByYear(works, options.sortOrder);
  }, [works, options.sortOrder]);

  const handleOptionsChange = (newOptions: Partial<AuthorWorksOptions>) => {
    setOptions(prev => ({ ...prev, ...newOptions }));
    updateOptions(newOptions);
  };

  if (error) {
    return (
      <Alert color="red" title="Error loading works">
        {error}
        <Button variant="light" size="sm" mt="sm" onClick={refetch}>
          Try Again
        </Button>
      </Alert>
    );
  }

  return (
    <Stack gap="lg">
      <TimelineHeader authorName={authorName} />

      <TimelineFilters
        options={options}
        onOptionsChange={handleOptionsChange}
        totalWorks={totalCount}
        onRefetch={refetch}
      />

      <TimelineStates loading={loading} works={works} refetch={refetch} />

      {!loading && <TimelineContent worksByYear={worksByYear} />}

      <TimelinePagination 
        hasNextPage={hasNextPage}
        isLoadingMore={isLoadingMore}
        loadMore={loadMore}
        works={works}
        totalCount={totalCount}
      />
    </Stack>
  );
}