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
  IconBuilding, 
  IconExternalLink, 
  IconInfoCircle, 
  IconCode,
  IconWorld,
  IconHierarchy,
  IconTrendingUp,
  IconCalendar,
  IconLink,
  IconBuildingBank
} from '@tabler/icons-react';
import { RawDataView } from '@/components';
import type { Publisher } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { usePublisherData } from '@/hooks/use-entity-data';
import { EntityError, EntitySkeleton, EntityFallback } from '@/components';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import { 
  EntityPageTemplate,
  EntityErrorBoundary
} from '@/components';

function PublisherDisplay({ publisher }: { publisher: Publisher }) {
  // External links for the publisher
  const externalLinks = [
    publisher.homepage_url && {
      url: publisher.homepage_url,
      label: 'Publisher Homepage',
      type: 'homepage' as const
    },
    publisher.ids.wikidata && {
      url: `https://www.wikidata.org/wiki/${publisher.ids.wikidata}`,
      label: 'Wikidata Entry',
      type: 'wikidata' as const
    },
    {
      url: `https://openalex.org/${publisher.id}`,
      label: 'View on OpenAlex',
      type: 'openalex' as const
    }
  ].filter(Boolean);

  return (
    <EntityPageTemplate entity={publisher}>
      <Tabs defaultValue="overview" keepMounted={false}>
        <Tabs.List grow mb="xl">
          <Tabs.Tab value="overview" leftSection={<IconBuilding size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="raw-data" leftSection={<IconCode size={16} />}>
            Raw Data
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview">
          <Stack gap="xl">
            {/* Key Metrics */}
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Paper p="lg" radius="md" withBorder>
                  <Stack gap="xs" align="center">
                    <Text size="xl" fw={700} c="publisher">
                      {publisher.works_count.toLocaleString()}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Works Published
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Paper p="lg" radius="md" withBorder>
                  <Stack gap="xs" align="center">
                    <Text size="xl" fw={700} c="citation">
                      {publisher.cited_by_count.toLocaleString()}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Total Citations
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Paper p="lg" radius="md" withBorder>
                  <Stack gap="xs" align="center">
                    <Text size="xl" fw={700} c="impact">
                      {publisher.summary_stats.h_index}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      h-index
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Paper p="lg" radius="md" withBorder>
                  <Stack gap="xs" align="center">
                    <Text size="xl" fw={700} c="level">
                      {publisher.hierarchy_level}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Hierarchy Level
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>

            {/* Publisher Details */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconBuildingBank size={20} />
                <Title order={2} size="lg">Publisher Information</Title>
              </Group>
              
              <Grid>
                {publisher.display_name_alternatives && publisher.display_name_alternatives.length > 0 && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Alternative Names
                      </Text>
                      <Stack gap="xs">
                        {publisher.display_name_alternatives.map((name, index) => (
                          <Text key={index} size="sm" fw={500}>
                            {name}
                          </Text>
                        ))}
                      </Stack>
                    </Paper>
                  </Grid.Col>
                )}
                
                {publisher.country_codes && publisher.country_codes.length > 0 && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Countries
                      </Text>
                      <Group gap="xs">
                        {publisher.country_codes.map((country, index) => (
                          <Badge key={index} variant="light" size="sm">
                            {country}
                          </Badge>
                        ))}
                      </Group>
                    </Paper>
                  </Grid.Col>
                )}
                
                {publisher.parent_publisher && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Parent Publisher
                      </Text>
                      <Text size="sm" fw={500}>
                        {publisher.parent_publisher}
                      </Text>
                    </Paper>
                  </Grid.Col>
                )}
                
                {publisher.sources && publisher.sources.length > 0 && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Sources Count
                      </Text>
                      <Text size="sm" fw={500}>
                        {publisher.sources.length.toLocaleString()} sources
                      </Text>
                    </Paper>
                  </Grid.Col>
                )}
              </Grid>
            </Card>

            {/* Hierarchy Information */}
            {publisher.lineage && publisher.lineage.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Group mb="lg">
                  <IconHierarchy size={20} />
                  <Title order={2} size="lg">Publisher Hierarchy</Title>
                </Group>
                
                <Paper p="md" withBorder radius="sm" bg="blue.0">
                  <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                    Lineage Chain
                  </Text>
                  <Stack gap="xs">
                    {publisher.lineage.map((ancestor, index) => (
                      <Group key={index} gap="xs">
                        <Badge 
                          variant="light" 
                          size="sm"
                          color={index === 0 ? 'blue' : 'gray'}
                        >
                          Level {index + 1}
                        </Badge>
                        <Text size="sm" fw={500}>
                          {ancestor}
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                </Paper>
              </Card>
            )}

            {/* Impact Metrics */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconTrendingUp size={20} />
                <Title order={2} size="lg">Impact Metrics</Title>
              </Group>
              
              <Grid>
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      2-Year Mean Citedness
                    </Text>
                    <Text size="lg" fw={700} c="impact">
                      {publisher.summary_stats['2yr_mean_citedness'].toFixed(2)}
                    </Text>
                  </Paper>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      i10-index
                    </Text>
                    <Text size="lg" fw={700} c="impact">
                      {publisher.summary_stats.i10_index}
                    </Text>
                  </Paper>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Works API URL
                    </Text>
                    <Anchor 
                      href={publisher.works_api_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="sm"
                      fw={500}
                      c="publisher"
                    >
                      View Works API
                    </Anchor>
                  </Paper>
                </Grid.Col>
              </Grid>
            </Card>

            {/* Entity IDs */}
            {Object.keys(publisher.ids).length > 1 && (
              <Card withBorder radius="md" p="xl">
                <Group mb="lg">
                  <IconInfoCircle size={20} />
                  <Title order={2} size="lg">External Identifiers</Title>
                </Group>
                
                <Grid>
                  {publisher.ids.openalex && (
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper p="md" withBorder radius="sm" bg="gray.0">
                        <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                          OpenAlex ID
                        </Text>
                        <Text size="sm" fw={500} family="monospace">
                          {publisher.ids.openalex}
                        </Text>
                      </Paper>
                    </Grid.Col>
                  )}
                  
                  {publisher.ids.wikidata && (
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper p="md" withBorder radius="sm" bg="gray.0">
                        <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                          Wikidata ID
                        </Text>
                        <Anchor 
                          href={`https://www.wikidata.org/wiki/${publisher.ids.wikidata}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="sm"
                          fw={500}
                          family="monospace"
                        >
                          {publisher.ids.wikidata}
                        </Anchor>
                      </Paper>
                    </Grid.Col>
                  )}
                  
                  {publisher.ids.ror && (
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper p="md" withBorder radius="sm" bg="gray.0">
                        <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                          ROR ID
                        </Text>
                        <Anchor 
                          href={`https://ror.org/${publisher.ids.ror}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="sm"
                          fw={500}
                          family="monospace"
                        >
                          {publisher.ids.ror}
                        </Anchor>
                      </Paper>
                    </Grid.Col>
                  )}
                </Grid>
              </Card>
            )}

            {/* Timestamps */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconCalendar size={20} />
                <Title order={2} size="lg">Record Information</Title>
              </Group>
              
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Created Date
                    </Text>
                    <Text size="sm" fw={500}>
                      {new Date(publisher.created_date).toLocaleDateString()}
                    </Text>
                  </Paper>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Last Updated
                    </Text>
                    <Text size="sm" fw={500}>
                      {new Date(publisher.updated_date).toLocaleDateString()}
                    </Text>
                  </Paper>
                </Grid.Col>
              </Grid>
            </Card>

            {/* External Links */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconLink size={20} />
                <Title order={2} size="lg">External Resources</Title>
              </Group>
              
              <Grid>
                {externalLinks.map((link, index) => {
                  if (!link) return null;
                  
                  const getIcon = () => {
                    switch (link.type) {
                      case 'homepage':
                        return <IconWorld size={16} />;
                      case 'wikidata':
                        return <IconInfoCircle size={16} />;
                      default:
                        return <IconExternalLink size={16} />;
                    }
                  };

                  const getColor = () => {
                    switch (link.type) {
                      case 'homepage':
                        return 'blue';
                      case 'wikidata':
                        return 'green';
                      default:
                        return 'publisher';
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
                            {getIcon()}
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
            data={publisher}
            title="Publisher Raw Data"
            entityType="publisher"
            entityId={publisher.id}
            maxHeight={700}
            showDownload={true}
          />
        </Tabs.Panel>
      </Tabs>
    </EntityPageTemplate>
  );
}

function PublisherPage() {
  const { id } = Route.useParams();
  const isRedirecting = useNumericIdRedirect(id, EntityType.PUBLISHER);
  
  const { 
    data: publisher, 
    loading, 
    error, 
    retry 
  } = usePublisherData(id, {
    enabled: !!id && !isRedirecting,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('Publisher fetch error:', error);
    }
  });

  // Show redirection loading state
  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType="publishers" entityId={id}>
        <EntitySkeleton entityType={EntityType.PUBLISHER} />
      </EntityErrorBoundary>
    );
  }

  // Show loading skeleton
  if (loading) {
    return (
      <EntityErrorBoundary entityType="publishers" entityId={id}>
        <EntitySkeleton entityType={EntityType.PUBLISHER} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="publishers" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.PUBLISHER}
        />
      </EntityErrorBoundary>
    );
  }

  // Show publisher data
  if (publisher) {
    return (
      <EntityErrorBoundary entityType="publishers" entityId={id}>
        <PublisherDisplay publisher={publisher} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="publishers" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.PUBLISHER}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/publishers/$id')({
  component: PublisherPage,
});