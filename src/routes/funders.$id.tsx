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
  Avatar
} from '@mantine/core';
import { 
  IconExternalLink, 
  IconInfoCircle, 
  IconCash, 
  IconCode, 
  IconLink, 
  IconWorld, 
  IconBuilding,
  IconCalendar,
  IconTrendingUp,
  IconUsers,
  IconFileText,
  IconAward,
  IconGraph
} from '@tabler/icons-react';
import { RawDataView } from '@/components/organisms/raw-data-view';
import type { Funder } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useFunderData } from '@/hooks/use-entity-data';
import { EntityError, EntitySkeleton, EntityFallback } from '@/components/entity-error';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import { 
  EntityPageTemplate,
  EntityErrorBoundary
} from '@/components';

function FunderDisplay({ funder }: { funder: Funder }) {
  // External links for the funder
  const externalLinks = [
    funder.homepage_url && {
      url: funder.homepage_url,
      label: 'Funder Homepage',
      type: 'homepage' as const
    },
    funder.ids.ror && {
      url: `https://ror.org/${funder.ids.ror}`,
      label: 'Research Organization Registry (ROR)',
      type: 'ror' as const
    },
    funder.ids.crossref && {
      url: `https://www.crossref.org/fundingdata/funders/${funder.ids.crossref}`,
      label: 'Crossref Funder Registry',
      type: 'crossref' as const
    },
    funder.ids.fundref && {
      url: `https://www.crossref.org/fundingdata/funders/${funder.ids.fundref}`,
      label: 'FundRef Registry',
      type: 'fundref' as const
    },
    funder.ids.wikidata && {
      url: `https://www.wikidata.org/wiki/${funder.ids.wikidata}`,
      label: 'Wikidata Entry',
      type: 'wikidata' as const
    },
    {
      url: `https://openalex.org/${funder.id}`,
      label: 'View on OpenAlex',
      type: 'openalex' as const
    }
  ].filter(Boolean);

  return (
    <EntityPageTemplate entity={funder}>
      <Tabs defaultValue="overview" keepMounted={false}>
        <Tabs.List grow mb="xl">
          <Tabs.Tab value="overview" leftSection={<IconCash size={16} />}>
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
                    <Text size="xl" fw={700} c="funder">
                      {funder.grants_count.toLocaleString()}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Grants
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Paper p="lg" radius="md" withBorder>
                  <Stack gap="xs" align="center">
                    <Text size="xl" fw={700} c="work">
                      {funder.works_count.toLocaleString()}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Works Funded
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Paper p="lg" radius="md" withBorder>
                  <Stack gap="xs" align="center">
                    <Text size="xl" fw={700} c="openAccess">
                      {funder.cited_by_count.toLocaleString()}
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
                    <Text size="xl" fw={700} c="publisher">
                      {funder.summary_stats.h_index}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      h-index
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>

            {/* Enhanced Funder Details */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconBuilding size={20} />
                <Title order={2} size="lg">Funder Details</Title>
              </Group>
              
              <Grid>
                {funder.description && (
                  <Grid.Col span={12}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Description
                      </Text>
                      <Text size="sm" fw={500} style={{ lineHeight: 1.6 }}>
                        {funder.description}
                      </Text>
                    </Paper>
                  </Grid.Col>
                )}
                
                {funder.country_code && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Country
                      </Text>
                      <Group gap="xs">
                        <IconWorld size={16} />
                        <Text size="sm" fw={500}>
                          {funder.country_code}
                        </Text>
                      </Group>
                    </Paper>
                  </Grid.Col>
                )}

                {funder.display_name_alternatives && funder.display_name_alternatives.length > 0 && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Alternative Names
                      </Text>
                      <Stack gap="xs">
                        {funder.display_name_alternatives.map((name, index) => (
                          <Text key={index} size="sm" fw={500}>
                            {name}
                          </Text>
                        ))}
                      </Stack>
                    </Paper>
                  </Grid.Col>
                )}

                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Created
                    </Text>
                    <Group gap="xs">
                      <IconCalendar size={16} />
                      <Text size="sm" fw={500}>
                        {new Date(funder.created_date).toLocaleDateString()}
                      </Text>
                    </Group>
                  </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Last Updated
                    </Text>
                    <Group gap="xs">
                      <IconCalendar size={16} />
                      <Text size="sm" fw={500}>
                        {new Date(funder.updated_date).toLocaleDateString()}
                      </Text>
                    </Group>
                  </Paper>
                </Grid.Col>
              </Grid>
            </Card>

            {/* Enhanced Statistics */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconTrendingUp size={20} />
                <Title order={2} size="lg">Research Impact Statistics</Title>
              </Group>
              
              <Grid>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Paper p="md" withBorder radius="sm" bg="blue.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      2-Year Mean Citedness
                    </Text>
                    <Group gap="xs">
                      <IconGraph size={16} />
                      <Text size="sm" fw={500}>
                        {funder.summary_stats['2yr_mean_citedness'].toFixed(2)}
                      </Text>
                    </Group>
                  </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Paper p="md" withBorder radius="sm" bg="blue.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      i10-index
                    </Text>
                    <Group gap="xs">
                      <IconAward size={16} />
                      <Text size="sm" fw={500}>
                        {funder.summary_stats.i10_index}
                      </Text>
                    </Group>
                  </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Paper p="md" withBorder radius="sm" bg="blue.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Works API URL
                    </Text>
                    <Anchor 
                      href={funder.works_api_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="sm"
                      fw={500}
                      c="funder"
                    >
                      API Endpoint
                    </Anchor>
                  </Paper>
                </Grid.Col>
              </Grid>
            </Card>

            {/* Enhanced Identifiers */}
            {Object.keys(funder.ids).length > 1 && (
              <Card withBorder radius="md" p="xl">
                <Group mb="lg">
                  <IconInfoCircle size={20} />
                  <Title order={2} size="lg">External Identifiers</Title>
                </Group>
                
                <Grid>
                  {Object.entries(funder.ids).map(([key, value]) => {
                    if (key === 'openalex' || !value) return null;
                    
                    return (
                      <Grid.Col key={key} span={{ base: 12, sm: 6, md: 4 }}>
                        <Paper p="md" withBorder radius="sm" bg="gray.0">
                          <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                            {key.toUpperCase()}
                          </Text>
                          <Text size="sm" fw={500} style={{ wordBreak: 'break-all' }}>
                            {Array.isArray(value) ? value.join(', ') : value}
                          </Text>
                        </Paper>
                      </Grid.Col>
                    );
                  })}
                </Grid>
              </Card>
            )}

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
                        return <IconWorld size={16} />;
                      case 'ror':
                      case 'crossref':
                      case 'fundref':
                        return <IconBuilding size={16} />;
                      case 'wikidata':
                        return <IconInfoCircle size={16} />;
                      default:
                        return <IconExternalLink size={16} />;
                    }
                  };

                  const getColor = () => {
                    switch (link.type) {
                      case 'homepage':
                        return 'funder';
                      case 'ror':
                      case 'crossref':
                      case 'fundref':
                        return 'institution';
                      case 'wikidata':
                        return 'topic';
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

            {/* Enhanced Counts by Year */}
            {funder.counts_by_year && funder.counts_by_year.length > 0 && (
              <Card withBorder radius="md" p="xl" bg="green.0">
                <Group mb="lg">
                  <IconUsers size={20} />
                  <Title order={2} size="lg">Historical Trends</Title>
                </Group>
                
                <Text size="sm" c="dimmed" mb="md">
                  Recent funding activity by year (last 5 years)
                </Text>
                
                <Grid>
                  {funder.counts_by_year
                    .slice(-5)
                    .map((yearData) => (
                      <Grid.Col key={yearData.year} span={{ base: 12, sm: 6, md: 2.4 }}>
                        <Paper p="md" withBorder radius="sm">
                          <Stack gap="xs" align="center">
                            <Text size="lg" fw={700}>
                              {yearData.year}
                            </Text>
                            <Text size="xs" c="dimmed">
                              Works: {yearData.works_count}
                            </Text>
                            <Text size="xs" c="dimmed">
                              Citations: {yearData.cited_by_count}
                            </Text>
                          </Stack>
                        </Paper>
                      </Grid.Col>
                    ))}
                </Grid>
              </Card>
            )}

            {/* Enhanced Roles */}
            {funder.roles && funder.roles.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Group mb="lg">
                  <IconFileText size={20} />
                  <Title order={2} size="lg">Organizational Roles</Title>
                </Group>
                
                <Grid>
                  {funder.roles.map((role, index) => (
                    <Grid.Col key={index} span={{ base: 12, md: 6 }}>
                      <Paper p="md" withBorder radius="sm" bg="yellow.0">
                        <Group justify="space-between">
                          <div>
                            <Text size="sm" fw={600} tt="capitalize">
                              {role.role}
                            </Text>
                            <Text size="xs" c="dimmed">
                              ID: {role.id}
                            </Text>
                          </div>
                          <Badge variant="light" color="funder">
                            {role.works_count} works
                          </Badge>
                        </Group>
                      </Paper>
                    </Grid.Col>
                  ))}
                </Grid>
              </Card>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="raw-data">
          <RawDataView 
            data={funder}
            title="Funder Raw Data"
            entityType="funder"
            entityId={funder.id}
            maxHeight={700}
            showDownload={true}
          />
        </Tabs.Panel>
      </Tabs>
    </EntityPageTemplate>
  );
}

function FunderPage() {
  const { id } = Route.useParams();
  const isRedirecting = useNumericIdRedirect(id, EntityType.FUNDER);
  
  const { 
    data: funder, 
    loading, 
    error, 
    retry 
  } = useFunderData(id, {
    enabled: !!id && !isRedirecting,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('Funder fetch error:', error);
    }
  });

  // Show redirection loading state
  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType="funders" entityId={id}>
        <EntitySkeleton entityType={EntityType.FUNDER} />
      </EntityErrorBoundary>
    );
  }

  // Show loading skeleton
  if (loading) {
    return (
      <EntityErrorBoundary entityType="funders" entityId={id}>
        <EntitySkeleton entityType={EntityType.FUNDER} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="funders" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.FUNDER}
        />
      </EntityErrorBoundary>
    );
  }

  // Show funder data
  if (funder) {
    return (
      <EntityErrorBoundary entityType="funders" entityId={id}>
        <FunderDisplay funder={funder} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="funders" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.FUNDER}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/funders/$id')({
  component: FunderPage,
});