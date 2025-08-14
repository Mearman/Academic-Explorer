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
  Tabs,
  List
} from '@mantine/core';
import { 
  IconExternalLink, 
  IconFileText, 
  IconTags, 
  IconLink, 
  IconCode,
  IconWorldWww,
  IconBuildingBank,
  IconCalendar,
  IconCertificate,
  IconId,
  IconBook2,
  IconChartLine
} from '@tabler/icons-react';
import { RawDataView, EntityLink, ConceptList } from '@/components';
import type { Source } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useSourceData } from '@/hooks/use-entity-data';
import { EntityError, EntitySkeleton, EntityFallback } from '@/components';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import { 
  EntityPageTemplate,
  EntityErrorBoundary
} from '@/components';

function SourceDisplay({ source }: { source: Source }) {
  // External links for the source
  const externalLinks = [
    source.homepage_url && {
      url: source.homepage_url,
      label: 'Source Homepage',
      type: 'homepage' as const
    },
    source.issn_l && {
      url: `https://portal.issn.org/resource/ISSN/${source.issn_l}`,
      label: 'ISSN Portal',
      type: 'issn' as const
    },
    source.is_in_doaj && {
      url: `https://doaj.org/toc/${source.issn_l}`,
      label: 'Directory of Open Access Journals',
      type: 'doaj' as const
    },
    {
      url: `https://openalex.org/${source.id}`,
      label: 'View on OpenAlex',
      type: 'openalex' as const
    }
  ].filter(Boolean);

  return (
    <EntityPageTemplate entity={source}>
      <Tabs defaultValue="overview" keepMounted={false}>
        <Tabs.List grow mb="xl">
          <Tabs.Tab value="overview" leftSection={<IconBook2 size={16} />}>
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
                    <Text size="xl" fw={700} c="source">
                      {source.works_count.toLocaleString()}
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
                    <Text size="xl" fw={700} c="blue">
                      {source.cited_by_count.toLocaleString()}
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
                    <Text size="xl" fw={700} c="grape">
                      {source.summary_stats?.h_index || 'N/A'}
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
                    <Badge 
                      color={source.is_oa ? 'openAccess' : 'publisher'} 
                      size="lg" 
                      radius="sm"
                    >
                      {source.is_oa ? 'Open Access' : 'Subscription'}
                    </Badge>
                    <Text size="sm" c="dimmed" ta="center">
                      Access Model
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>

            {/* Publication Details */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconFileText size={20} />
                <Title order={2} size="lg">Publication Details</Title>
              </Group>
              
              <Grid>
                {source.type && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Publication Type
                      </Text>
                      <Text size="sm" fw={500} tt="capitalize">
                        {source.type.replace(/[-_]/g, ' ')}
                      </Text>
                    </Paper>
                  </Grid.Col>
                )}
                
                {source.issn_l && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        ISSN-L
                      </Text>
                      <Text size="sm" fw={500} >
                        {source.issn_l}
                      </Text>
                    </Paper>
                  </Grid.Col>
                )}
                
                {source.issn && source.issn.length > 0 && (
                  <Grid.Col span={12}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        All ISSN Numbers
                      </Text>
                      <Group gap="xs">
                        {source.issn.map((issn) => (
                          <Badge key={issn} variant="outline" size="sm" >
                            {issn}
                          </Badge>
                        ))}
                      </Group>
                    </Paper>
                  </Grid.Col>
                )}
                
                {source.fatcat_id && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Fatcat ID
                      </Text>
                      <Anchor 
                        href={`https://fatcat.wiki/container/${source.fatcat_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="sm"
                        fw={500}
                        c="blue"
                      >
                        {source.fatcat_id}
                      </Anchor>
                    </Paper>
                  </Grid.Col>
                )}
              </Grid>
            </Card>

            {/* Publisher Information */}
            {source.host_organization && (
              <Card withBorder radius="md" p="xl">
                <Group mb="lg">
                  <IconBuildingBank size={20} />
                  <Title order={2} size="lg">Publisher Information</Title>
                </Group>
                
                <Stack gap="md">
                  <Paper p="md" withBorder radius="sm" bg="blue.0">
                    <Group justify="space-between">
                      <Stack gap="xs">
                        <EntityLink
                          entityId={source.host_organization}
                          displayName={source.host_organization_name || 'Unknown Publisher'}
                          size="sm"
                          weight={500}
                        />
                        {source.host_organization_lineage && source.host_organization_lineage.length > 1 && (
                          <Text size="xs" c="dimmed">
                            Part of larger organization
                          </Text>
                        )}
                      </Stack>
                      
                      <Group gap="xs">
                        {source.is_oa && (
                          <Badge variant="light" color="openAccess" size="sm">
                            Open Access
                          </Badge>
                        )}
                        {source.is_in_doaj && (
                          <Badge variant="light" color="green" size="sm">
                            DOAJ
                          </Badge>
                        )}
                      </Group>
                    </Group>
                  </Paper>
                  
                  {source.host_organization_lineage_names && source.host_organization_lineage_names.length > 1 && (
                    <Paper p="sm" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Organization Hierarchy
                      </Text>
                      <Group gap="xs">
                        {source.host_organization_lineage_names.map((name, index) => (
                          <React.Fragment key={index}>
                            <Text size="xs" c="dimmed">
                              {name}
                            </Text>
                            {index < source.host_organization_lineage_names!.length - 1 && (
                              <Text size="xs" c="dimmed">→</Text>
                            )}
                          </React.Fragment>
                        ))}
                      </Group>
                    </Paper>
                  )}
                </Stack>
              </Card>
            )}

            {/* Alternative Titles */}
            {source.alternate_titles && source.alternate_titles.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Group mb="lg">
                  <IconId size={20} />
                  <Title order={2} size="lg">Alternative Titles</Title>
                  <Badge variant="light" color="gray" radius="sm">
                    {source.alternate_titles.length} alternatives
                  </Badge>
                </Group>
                
                <List spacing="xs" size="sm">
                  {source.alternate_titles.slice(0, 10).map((title, index) => (
                    <List.Item key={index}>
                      <Text size="sm">{title}</Text>
                    </List.Item>
                  ))}
                  {source.alternate_titles.length > 10 && (
                    <List.Item>
                      <Text size="sm" c="dimmed" fs="italic">
                        ... and {source.alternate_titles.length - 10} more
                      </Text>
                    </List.Item>
                  )}
                </List>
              </Card>
            )}

            {/* Research Topics */}
            {source.topics && source.topics.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Group mb="lg">
                  <IconTags size={20} />
                  <Title order={2} size="lg">Research Topics</Title>
                  <Badge variant="light" color="blue" radius="sm">
                    {source.topics.length} topics
                  </Badge>
                </Group>
                
                <ConceptList 
                  topics={source.topics}
                  showScores={true}
                  variant="badges"
                  maxItems={15}
                />
              </Card>
            )}

            {/* Summary Statistics */}
            {source.summary_stats && (
              <Card withBorder radius="md" p="xl">
                <Group mb="lg">
                  <IconChartLine size={20} />
                  <Title order={2} size="lg">Impact Metrics</Title>
                </Group>
                
                <Grid>
                  {source.summary_stats.h_index && (
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <Paper p="md" withBorder radius="sm" bg="grape.0">
                        <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                          h-index
                        </Text>
                        <Text size="lg" fw={600}>
                          {source.summary_stats.h_index}
                        </Text>
                        <Text size="xs" c="dimmed" mt="xs">
                          Publication impact measure
                        </Text>
                      </Paper>
                    </Grid.Col>
                  )}
                  
                  {source.summary_stats.i10_index && (
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <Paper p="md" withBorder radius="sm" bg="orange.0">
                        <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                          i10-index
                        </Text>
                        <Text size="lg" fw={600}>
                          {source.summary_stats.i10_index}
                        </Text>
                        <Text size="xs" c="dimmed" mt="xs">
                          Publications with 10+ citations
                        </Text>
                      </Paper>
                    </Grid.Col>
                  )}
                  
                  {source.summary_stats['2yr_mean_citedness'] && (
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <Paper p="md" withBorder radius="sm" bg="cyan.0">
                        <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                          2-Year Mean Citedness
                        </Text>
                        <Text size="lg" fw={600}>
                          {source.summary_stats['2yr_mean_citedness'].toFixed(2)}
                        </Text>
                        <Text size="xs" c="dimmed" mt="xs">
                          Average citations per paper
                        </Text>
                      </Paper>
                    </Grid.Col>
                  )}
                </Grid>
              </Card>
            )}

            {/* Publication Years & Activity */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconCalendar size={20} />
                <Title order={2} size="lg">Publication Timeline</Title>
              </Group>
              
              <Grid>
                {source.works_api_url && (
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Total Works
                      </Text>
                      <Text size="lg" fw={600}>
                        {source.works_count.toLocaleString()}
                      </Text>
                      <Anchor 
                        href={source.works_api_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="xs"
                        c="blue"
                      >
                        View API
                      </Anchor>
                    </Paper>
                  </Grid.Col>
                )}
                
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Last Updated
                    </Text>
                    <Text size="sm" fw={500}>
                      {new Date(source.updated_date).toLocaleDateString()}
                    </Text>
                  </Paper>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      First Indexed
                    </Text>
                    <Text size="sm" fw={500}>
                      {new Date(source.created_date).toLocaleDateString()}
                    </Text>
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
                  
                  const getIcon = () => {
                    switch (link.type) {
                      case 'homepage':
                        return <IconWorldWww size={16} />;
                      case 'issn':
                        return <IconCertificate size={16} />;
                      case 'doaj':
                        return <IconFileText size={16} />;
                      default:
                        return <IconExternalLink size={16} />;
                    }
                  };

                  const getColor = () => {
                    switch (link.type) {
                      case 'homepage':
                        return 'blue';
                      case 'issn':
                        return 'purple';
                      case 'doaj':
                        return 'openAccess';
                      default:
                        return 'source';
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
            data={source}
            title="Source Raw Data"
            entityType="source"
            entityId={source.id}
            maxHeight={700}
            showDownload={true}
          />
        </Tabs.Panel>
      </Tabs>
    </EntityPageTemplate>
  );
}

function SourcePage() {
  const { id } = Route.useParams();
  
  // Handle numeric ID redirection to /entity/ route
  const isRedirecting = useNumericIdRedirect(id, EntityType.SOURCE);
  
  const { 
    data: source, 
    loading, 
    error, 
    retry 
  } = useSourceData(id, {
    enabled: !!id && !isRedirecting, // Don't fetch if redirecting
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('Source fetch error:', error);
    }
  });

  // Show loading state for redirection
  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType="sources" entityId={id}>
        <EntitySkeleton entityType={EntityType.SOURCE} />
      </EntityErrorBoundary>
    );
  }

  // Show loading state for data fetch
  if (loading) {
    return (
      <EntityErrorBoundary entityType="sources" entityId={id}>
        <EntitySkeleton entityType={EntityType.SOURCE} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="sources" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.SOURCE}
        />
      </EntityErrorBoundary>
    );
  }

  // Show source data
  if (source) {
    return (
      <EntityErrorBoundary entityType="sources" entityId={id}>
        <SourceDisplay source={source} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="sources" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.SOURCE}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/sources/$id')({
  component: SourcePage,
});