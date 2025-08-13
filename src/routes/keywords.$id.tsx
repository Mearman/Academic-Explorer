import { createFileRoute } from '@tanstack/react-router';
import { 
  Card, 
  Badge, 
  Group, 
  Stack, 
  Text, 
  Title, 
  Anchor, 
  Paper,
  Grid,
  Tabs
} from '@mantine/core';
import { 
  IconExternalLink, 
  IconInfoCircle, 
  IconFileText, 
  IconTags, 
  IconLink, 
  IconCode,
  IconCalendar,
  IconSearch,
  IconStar,
  IconQuote
} from '@tabler/icons-react';
import { RawDataView } from '@/components/organisms/raw-data-view';
import type { Keyword } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useKeywordData } from '@/hooks/use-entity-data';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import { EntityError, EntitySkeleton, EntityFallback } from '@/components/entity-error';
import { 
  EntityPageTemplate,
  EntityErrorBoundary
} from '@/components';

function KeywordDisplay({ keyword }: { keyword: Keyword }) {
  // External links for the keyword
  const externalLinks = [
    keyword.works_api_url && {
      url: keyword.works_api_url,
      label: 'View Works (API)',
      type: 'api' as const,
      icon: <IconSearch size={16} />
    },
    {
      url: `https://openalex.org/${keyword.id}`,
      label: 'View on OpenAlex',
      type: 'openalex' as const,
      icon: <IconExternalLink size={16} />
    }
  ].filter(Boolean);

  return (
    <EntityPageTemplate entity={keyword}>
      <Tabs defaultValue="overview" keepMounted={false}>
        <Tabs.List grow mb="xl">
          <Tabs.Tab value="overview" leftSection={<IconFileText size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="raw-data" leftSection={<IconCode size={16} />}>
            Raw Data
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview">
          <Stack gap="xl">
            {/* Enhanced Key Metrics */}
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Paper p="lg" radius="md" withBorder>
                  <Stack gap="xs" align="center">
                    <Text size="xl" fw={700} c="keyword">
                      {keyword.works_count.toLocaleString()}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Works
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Paper p="lg" radius="md" withBorder>
                  <Stack gap="xs" align="center">
                    <Text size="xl" fw={700} c="green">
                      {keyword.cited_by_count.toLocaleString()}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Citations
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
              {keyword.score && (
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <Paper p="lg" radius="md" withBorder>
                    <Stack gap="xs" align="center">
                      <Text size="xl" fw={700} c="pink">
                        {keyword.score.toFixed(3)}
                      </Text>
                      <Text size="sm" c="dimmed" ta="center">
                        Relevance Score
                      </Text>
                    </Stack>
                  </Paper>
                </Grid.Col>
              )}
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Paper p="lg" radius="md" withBorder>
                  <Stack gap="xs" align="center">
                    <Text size="xl" fw={700} c="blue">
                      {keyword.display_name.length}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Character Length
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>

            {/* Enhanced Keyword Display */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconQuote size={20} />
                <Title order={2} size="lg">Keyword</Title>
              </Group>
              
              <Paper p="xl" withBorder radius="md" bg="keyword.0">
                <Group justify="center">
                  <Text size="xl" fw={600} c="keyword" ta="center" fs="italic">
                    &ldquo;{keyword.display_name}&rdquo;
                  </Text>
                </Group>
              </Paper>
            </Card>

            {/* Enhanced Score Information */}
            {keyword.score && (
              <Card withBorder radius="md" p="xl">
                <Group mb="lg">
                  <IconStar size={20} />
                  <Title order={2} size="lg">Relevance Analysis</Title>
                </Group>
                
                <Grid>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="pink.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Relevance Score
                      </Text>
                      <Text size="lg" fw={700} c="pink">
                        {keyword.score.toFixed(6)}
                      </Text>
                      <Text size="xs" c="dimmed" mt="xs">
                        Higher scores indicate greater relevance to associated works
                      </Text>
                    </Paper>
                  </Grid.Col>
                  
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Score Category
                      </Text>
                      <Badge 
                        variant="light" 
                        color={keyword.score > 0.5 ? 'green' : keyword.score > 0.2 ? 'yellow' : 'red'}
                        size="lg"
                      >
                        {keyword.score > 0.5 ? 'High Relevance' : keyword.score > 0.2 ? 'Medium Relevance' : 'Low Relevance'}
                      </Badge>
                      <Text size="xs" c="dimmed" mt="xs">
                        Based on frequency and context in academic literature
                      </Text>
                    </Paper>
                  </Grid.Col>
                </Grid>
              </Card>
            )}

            {/* Enhanced Usage Statistics */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconTags size={20} />
                <Title order={2} size="lg">Usage Statistics</Title>
              </Group>
              
              <Grid>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Paper p="md" withBorder radius="sm" bg="blue.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Total Works
                    </Text>
                    <Text size="lg" fw={700} c="blue">
                      {keyword.works_count.toLocaleString()}
                    </Text>
                    <Text size="xs" c="dimmed" mt="xs">
                      Academic works using this keyword
                    </Text>
                  </Paper>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Paper p="md" withBorder radius="sm" bg="green.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Total Citations
                    </Text>
                    <Text size="lg" fw={700} c="green">
                      {keyword.cited_by_count.toLocaleString()}
                    </Text>
                    <Text size="xs" c="dimmed" mt="xs">
                      Citations of works using this keyword
                    </Text>
                  </Paper>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Paper p="md" withBorder radius="sm" bg="orange.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Citations per Work
                    </Text>
                    <Text size="lg" fw={700} c="orange">
                      {keyword.works_count > 0 ? (keyword.cited_by_count / keyword.works_count).toFixed(1) : '0'}
                    </Text>
                    <Text size="xs" c="dimmed" mt="xs">
                      Average citation impact
                    </Text>
                  </Paper>
                </Grid.Col>
              </Grid>
            </Card>

            {/* Enhanced Keyword Properties */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconInfoCircle size={20} />
                <Title order={2} size="lg">Keyword Properties</Title>
              </Group>
              
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Character Count
                    </Text>
                    <Text size="sm" fw={500}>
                      {keyword.display_name.length} characters
                    </Text>
                  </Paper>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Word Count
                    </Text>
                    <Text size="sm" fw={500}>
                      {keyword.display_name.split(' ').length} word{keyword.display_name.split(' ').length !== 1 ? 's' : ''}
                    </Text>
                  </Paper>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Keyword Type
                    </Text>
                    <Badge 
                      variant="light" 
                      color={keyword.display_name.includes(' ') ? 'blue' : 'green'}
                      size="md"
                    >
                      {keyword.display_name.includes(' ') ? 'Multi-word Phrase' : 'Single Word'}
                    </Badge>
                  </Paper>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Case Style
                    </Text>
                    <Badge 
                      variant="light" 
                      color="violet"
                      size="md"
                    >
                      {keyword.display_name === keyword.display_name.toLowerCase() ? 'Lowercase' : 
                       keyword.display_name === keyword.display_name.toUpperCase() ? 'Uppercase' : 'Mixed Case'}
                    </Badge>
                  </Paper>
                </Grid.Col>
              </Grid>
            </Card>

            {/* Enhanced Keyword Metadata */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconInfoCircle size={20} />
                <Title order={2} size="lg">Keyword Metadata</Title>
              </Group>
              
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Keyword ID
                    </Text>
                    <Text size="sm" fw={500} ff="monospace">
                      {keyword.id}
                    </Text>
                  </Paper>
                </Grid.Col>

                {keyword.created_date && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Group gap="xs" mb="xs">
                        <IconCalendar size={14} />
                        <Text size="xs" tt="uppercase" fw={600} c="dimmed">
                          Created Date
                        </Text>
                      </Group>
                      <Text size="sm" fw={500}>
                        {new Date(keyword.created_date).toLocaleDateString()}
                      </Text>
                    </Paper>
                  </Grid.Col>
                )}

                {keyword.updated_date && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Group gap="xs" mb="xs">
                        <IconCalendar size={14} />
                        <Text size="xs" tt="uppercase" fw={600} c="dimmed">
                          Last Updated
                        </Text>
                      </Group>
                      <Text size="sm" fw={500}>
                        {new Date(keyword.updated_date).toLocaleDateString()}
                      </Text>
                    </Paper>
                  </Grid.Col>
                )}

                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Works API URL
                    </Text>
                    <Anchor 
                      href={keyword.works_api_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="sm"
                      fw={500}
                      c="blue"
                      truncate
                    >
                      {keyword.works_api_url}
                    </Anchor>
                  </Paper>
                </Grid.Col>
              </Grid>
            </Card>

            {/* Enhanced External Links */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconLink size={20} />
                <Title order={2} size="lg">External Resources</Title>
              </Group>
              
              <Grid>
                {externalLinks.map((link, index) => {
                  if (!link) return null;
                  
                  const getColor = () => {
                    switch (link.type) {
                      case 'api':
                        return 'green';
                      default:
                        return 'keyword';
                    }
                  };

                  return (
                    <Grid.Col key={index} span={{ base: 12, sm: 6, md: 4 }}>
                      <Anchor
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none' }}
                      >
                        <Paper
                          p="md"
                          withBorder
                          radius="md"
                          style={(theme) => ({
                            transition: 'all 150ms ease',
                            cursor: 'pointer',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: theme.shadows.md,
                              borderColor: theme.colors[getColor()][5],
                            },
                          })}
                        >
                          <Group>
                            {link.icon}
                            <Text size="sm" fw={500} c={getColor()}>
                              {link.label}
                            </Text>
                          </Group>
                        </Paper>
                      </Anchor>
                    </Grid.Col>
                  );
                })}
              </Grid>
            </Card>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="raw-data">
          <RawDataView 
            data={keyword}
            title="Keyword Raw Data"
            entityType="keyword"
            entityId={keyword.id}
            maxHeight={700}
            showDownload={true}
          />
        </Tabs.Panel>
      </Tabs>
    </EntityPageTemplate>
  );
}

function KeywordPage() {
  const { id } = Route.useParams();
  const isRedirecting = useNumericIdRedirect(id, EntityType.KEYWORD);
  
  const { 
    data: keyword, 
    loading, 
    error, 
    retry 
  } = useKeywordData(id, {
    enabled: !!id && !isRedirecting,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('Keyword fetch error:', error);
    }
  });

  // Show redirection loading state
  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType="keywords" entityId={id}>
        <EntitySkeleton entityType={EntityType.KEYWORD} />
      </EntityErrorBoundary>
    );
  }

  // Show loading skeleton
  if (loading) {
    return (
      <EntityErrorBoundary entityType="keywords" entityId={id}>
        <EntitySkeleton entityType={EntityType.KEYWORD} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="keywords" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.KEYWORD}
        />
      </EntityErrorBoundary>
    );
  }

  // Show keyword data
  if (keyword) {
    return (
      <EntityErrorBoundary entityType="keywords" entityId={id}>
        <KeywordDisplay keyword={keyword} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="keywords" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.KEYWORD}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/keywords/$id')({
  component: KeywordPage,
});