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
  IconLink, 
  IconCode,
  IconWorld,
  IconMap,
  IconChartBar,
  IconBrandWikipedia,
  IconMapPin,
  IconTextCaption
} from '@tabler/icons-react';
import { RawDataView } from '@/components';
import type { Region } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useRegionData } from '@/hooks/use-entity-data';
import { EntityError, EntitySkeleton, EntityFallback } from '@/components';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import { 
  EntityPageTemplate,
  EntityErrorBoundary
} from '@/components';

function RegionDisplay({ region }: { region: Region }) {
  // External links for the region
  const externalLinks = [
    region.wikidata && {
      url: `https://www.wikidata.org/wiki/${region.wikidata}`,
      label: 'Wikidata Entry',
      type: 'wikidata' as const,
      icon: <IconBrandWikipedia size={16} />
    },
    {
      url: `https://openalex.org/${region.id}`,
      label: 'View on OpenAlex',
      type: 'openalex' as const,
      icon: <IconExternalLink size={16} />
    }
  ].filter(Boolean);

  return (
    <EntityPageTemplate entity={region}>
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
                    <Text size="xl" fw={700} c="region">
                      {region.works_count.toLocaleString()}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Academic Works
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Paper p="lg" radius="md" withBorder>
                  <Stack gap="xs" align="center">
                    <Text size="xl" fw={700} c="green">
                      {region.cited_by_count.toLocaleString()}
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
                    <Text size="xl" fw={700} c="orange">
                      {region.works_count > 0 ? (region.cited_by_count / region.works_count).toFixed(1) : '0'}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Citations per Work
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Paper p="lg" radius="md" withBorder>
                  <Stack gap="xs" align="center">
                    <Text size="xl" fw={700} c="blue">
                      {region.display_name.length}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Name Length
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>

            {/* Enhanced Region Overview */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconMapPin size={20} />
                <Title order={2} size="lg">Region Overview</Title>
              </Group>
              
              <Paper p="xl" withBorder radius="md" bg="region.0">
                <Stack align="center" gap="md">
                  <Text size="xxl" fw={700} c="region" ta="center">
                    {region.display_name}
                  </Text>
                  <Badge variant="light" color="region" size="lg" radius="sm">
                    Regional Territory
                  </Badge>
                </Stack>
              </Paper>
            </Card>

            {/* Enhanced Region Description */}
            {region.description && (
              <Card withBorder radius="md" p="xl">
                <Group mb="lg">
                  <IconTextCaption size={20} />
                  <Title order={2} size="lg">Regional Description</Title>
                </Group>
                
                <Paper p="lg" withBorder radius="md" bg="gray.0">
                  <Text size="md" lh={1.6} c="dark">
                    {region.description}
                  </Text>
                </Paper>
              </Card>
            )}

            {/* Enhanced Research Impact */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconChartBar size={20} />
                <Title order={2} size="lg">Research Impact</Title>
              </Group>
              
              <Grid>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Paper p="md" withBorder radius="sm" bg="blue.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Academic Works
                    </Text>
                    <Text size="lg" fw={700} c="blue">
                      {region.works_count.toLocaleString()}
                    </Text>
                    <Text size="xs" c="dimmed" mt="xs">
                      Research publications from this region
                    </Text>
                  </Paper>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Paper p="md" withBorder radius="sm" bg="green.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Citation Impact
                    </Text>
                    <Text size="lg" fw={700} c="green">
                      {region.cited_by_count.toLocaleString()}
                    </Text>
                    <Text size="xs" c="dimmed" mt="xs">
                      Total citations received by regional research
                    </Text>
                  </Paper>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Paper p="md" withBorder radius="sm" bg="orange.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Research Quality
                    </Text>
                    <Text size="lg" fw={700} c="orange">
                      {region.works_count > 0 ? (region.cited_by_count / region.works_count).toFixed(2) : '0.00'}
                    </Text>
                    <Text size="xs" c="dimmed" mt="xs">
                      Average citations per work (impact factor)
                    </Text>
                  </Paper>
                </Grid.Col>
              </Grid>
            </Card>

            {/* Enhanced Geographic Information */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconMap size={20} />
                <Title order={2} size="lg">Geographic Information</Title>
              </Group>
              
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Region Name
                    </Text>
                    <Text size="lg" fw={600} c="region">
                      {region.display_name}
                    </Text>
                  </Paper>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Geographic Type
                    </Text>
                    <Badge variant="light" color="blue" size="lg">
                      Regional Territory
                    </Badge>
                  </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Name Characteristics
                    </Text>
                    <Group gap="xs">
                      <Badge variant="light" color="teal" size="sm">
                        {region.display_name.length} characters
                      </Badge>
                      <Badge variant="light" color="violet" size="sm">
                        {region.display_name.split(' ').length} word{region.display_name.split(' ').length !== 1 ? 's' : ''}
                      </Badge>
                    </Group>
                  </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Research Density
                    </Text>
                    <Badge 
                      variant="light" 
                      color={region.works_count > 50000 ? 'green' : region.works_count > 5000 ? 'yellow' : 'red'}
                      size="lg"
                    >
                      {region.works_count > 50000 ? 'High Research Activity' : 
                       region.works_count > 5000 ? 'Moderate Research Activity' : 'Lower Research Activity'}
                    </Badge>
                  </Paper>
                </Grid.Col>

                {region.description && (
                  <Grid.Col span={12}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Has Description
                      </Text>
                      <Badge variant="light" color="green" size="md">
                        Detailed Description Available
                      </Badge>
                    </Paper>
                  </Grid.Col>
                )}
              </Grid>
            </Card>

            {/* Enhanced Regional Research Profile */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconChartBar size={20} />
                <Title order={2} size="lg">Regional Research Profile</Title>
              </Group>
              
              <Stack gap="lg">
                <Paper p="lg" withBorder radius="md" bg="gradient-to-r from-cyan-50 to-blue-50">
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Stack gap="sm">
                        <Text size="lg" fw={600} c="dark">
                          Research Output
                        </Text>
                        <Text size="sm" c="dimmed">
                          This region has produced <strong>{region.works_count.toLocaleString()}</strong> academic works, 
                          contributing to global knowledge and research advancement.
                        </Text>
                        {region.description && (
                          <Text size="sm" c="dimmed" mt="sm">
                            Regional context: {region.description}
                          </Text>
                        )}
                      </Stack>
                    </Grid.Col>
                    
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Stack gap="sm">
                        <Text size="lg" fw={600} c="dark">
                          Citation Impact
                        </Text>
                        <Text size="sm" c="dimmed">
                          Research from this region has received <strong>{region.cited_by_count.toLocaleString()}</strong> citations, 
                          with an average of <strong>{region.works_count > 0 ? (region.cited_by_count / region.works_count).toFixed(1) : '0'}</strong> citations per work.
                        </Text>
                      </Stack>
                    </Grid.Col>
                  </Grid>
                </Paper>
              </Stack>
            </Card>

            {/* Enhanced Regional Analysis */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconWorld size={20} />
                <Title order={2} size="lg">Regional Analysis</Title>
              </Group>
              
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="cyan.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Research Productivity
                    </Text>
                    <Text size="sm" fw={500} mb="xs">
                      {region.works_count > 100000 ? 'Highly Productive Research Region' :
                       region.works_count > 10000 ? 'Moderately Productive Research Region' :
                       'Developing Research Region'}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Based on total academic work output
                    </Text>
                  </Paper>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="orange.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Citation Performance
                    </Text>
                    <Text size="sm" fw={500} mb="xs">
                      {region.works_count > 0 && (region.cited_by_count / region.works_count) > 10 ? 'High Impact Research' :
                       region.works_count > 0 && (region.cited_by_count / region.works_count) > 5 ? 'Moderate Impact Research' :
                       'Emerging Research Impact'}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Based on average citations per work
                    </Text>
                  </Paper>
                </Grid.Col>
              </Grid>
            </Card>

            {/* Enhanced Region Metadata */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconInfoCircle size={20} />
                <Title order={2} size="lg">Region Metadata</Title>
              </Group>
              
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Region ID
                    </Text>
                    <Text size="sm" fw={500} ff="monospace">
                      {region.id}
                    </Text>
                  </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Display Name
                    </Text>
                    <Text size="sm" fw={500}>
                      {region.display_name}
                    </Text>
                  </Paper>
                </Grid.Col>

                {region.description && (
                  <Grid.Col span={12}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Description Length
                      </Text>
                      <Text size="sm" fw={500}>
                        {region.description.length} characters, {region.description.split(' ').length} words
                      </Text>
                    </Paper>
                  </Grid.Col>
                )}

                {/* External IDs */}
                {region.wikidata && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Wikidata ID
                      </Text>
                      <Anchor 
                        href={`https://www.wikidata.org/wiki/${region.wikidata}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="sm"
                        fw={500}
                        c="blue"
                      >
                        {region.wikidata}
                      </Anchor>
                    </Paper>
                  </Grid.Col>
                )}
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
                      case 'wikidata':
                        return 'blue';
                      default:
                        return 'region';
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
            data={region}
            title="Region Raw Data"
            entityType="region"
            entityId={region.id}
            maxHeight={700}
            showDownload={true}
          />
        </Tabs.Panel>
      </Tabs>
    </EntityPageTemplate>
  );
}

function RegionPage() {
  const { id } = Route.useParams();
  const isRedirecting = useNumericIdRedirect(id, EntityType.REGION);
  
  const { 
    data: region, 
    loading, 
    error, 
    retry 
  } = useRegionData(id, {
    enabled: !!id && !isRedirecting,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('Region fetch error:', error);
    }
  });

  // Show redirection loading state
  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType="regions" entityId={id}>
        <EntitySkeleton entityType={EntityType.REGION} />
      </EntityErrorBoundary>
    );
  }

  // Show loading skeleton
  if (loading) {
    return (
      <EntityErrorBoundary entityType="regions" entityId={id}>
        <EntitySkeleton entityType={EntityType.REGION} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="regions" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.REGION}
        />
      </EntityErrorBoundary>
    );
  }

  // Show region data
  if (region) {
    return (
      <EntityErrorBoundary entityType="regions" entityId={id}>
        <RegionDisplay region={region} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="regions" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.REGION}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/regions/$id')({
  component: RegionPage,
});