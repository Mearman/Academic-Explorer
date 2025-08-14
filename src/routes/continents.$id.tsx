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
  IconBrandWikipedia
} from '@tabler/icons-react';
import { RawDataView } from '@/components';
import type { Continent } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useContinentData } from '@/hooks/use-entity-data';
import { EntityError, EntitySkeleton, EntityFallback } from '@/components';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import { 
  EntityPageTemplate,
  EntityErrorBoundary
} from '@/components';

function ContinentDisplay({ continent }: { continent: Continent }) {
  // External links for the continent
  const externalLinks = [
    continent.wikidata && {
      url: `https://www.wikidata.org/wiki/${continent.wikidata}`,
      label: 'Wikidata Entry',
      type: 'wikidata' as const,
      icon: <IconBrandWikipedia size={16} />
    },
    {
      url: `https://openalex.org/${continent.id}`,
      label: 'View on OpenAlex',
      type: 'openalex' as const,
      icon: <IconExternalLink size={16} />
    }
  ].filter(Boolean);

  return (
    <EntityPageTemplate entity={continent}>
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
                    <Text size="xl" fw={700} c="pink">
                      {continent.works_count.toLocaleString()}
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
                      {continent.cited_by_count.toLocaleString()}
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
                      {continent.works_count > 0 ? (continent.cited_by_count / continent.works_count).toFixed(1) : '0'}
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
                      {continent.display_name.length}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Name Length
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>

            {/* Enhanced Continent Overview */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconWorld size={20} />
                <Title order={2} size="lg">Continent Overview</Title>
              </Group>
              
              <Paper p="xl" withBorder radius="md" bg="continent.0">
                <Stack align="center" gap="md">
                  <Text size="xxl" fw={700} c="pink" ta="center">
                    {continent.display_name}
                  </Text>
                  <Badge variant="light" color="continent" size="lg" radius="sm">
                    Geographic Region
                  </Badge>
                </Stack>
              </Paper>
            </Card>

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
                      {continent.works_count.toLocaleString()}
                    </Text>
                    <Text size="xs" c="dimmed" mt="xs">
                      Research publications from this continent
                    </Text>
                  </Paper>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Paper p="md" withBorder radius="sm" bg="green.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Citation Impact
                    </Text>
                    <Text size="lg" fw={700} c="green">
                      {continent.cited_by_count.toLocaleString()}
                    </Text>
                    <Text size="xs" c="dimmed" mt="xs">
                      Total citations received by continental research
                    </Text>
                  </Paper>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Paper p="md" withBorder radius="sm" bg="orange.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Research Quality
                    </Text>
                    <Text size="lg" fw={700} c="orange">
                      {continent.works_count > 0 ? (continent.cited_by_count / continent.works_count).toFixed(2) : '0.00'}
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
                      Continent Name
                    </Text>
                    <Text size="lg" fw={600} c="pink">
                      {continent.display_name}
                    </Text>
                  </Paper>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Geographic Type
                    </Text>
                    <Badge variant="light" color="blue" size="lg">
                      Continental Region
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
                        {continent.display_name.length} characters
                      </Badge>
                      <Badge variant="light" color="violet" size="sm">
                        {continent.display_name.split(' ').length} word{continent.display_name.split(' ').length !== 1 ? 's' : ''}
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
                      color={continent.works_count > 100000 ? 'green' : continent.works_count > 10000 ? 'yellow' : 'red'}
                      size="lg"
                    >
                      {continent.works_count > 100000 ? 'High Research Activity' : 
                       continent.works_count > 10000 ? 'Moderate Research Activity' : 'Lower Research Activity'}
                    </Badge>
                  </Paper>
                </Grid.Col>
              </Grid>
            </Card>

            {/* Enhanced Research Profile */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconChartBar size={20} />
                <Title order={2} size="lg">Continental Research Profile</Title>
              </Group>
              
              <Stack gap="lg">
                <Paper p="lg" withBorder radius="md" bg="gradient-to-r from-blue-50 to-green-50">
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Stack gap="sm">
                        <Text size="lg" fw={600} c="dark">
                          Research Output
                        </Text>
                        <Text size="sm" c="dimmed">
                          This continent has produced <strong>{continent.works_count.toLocaleString()}</strong> academic works, 
                          representing a significant contribution to global research.
                        </Text>
                      </Stack>
                    </Grid.Col>
                    
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Stack gap="sm">
                        <Text size="lg" fw={600} c="dark">
                          Citation Impact
                        </Text>
                        <Text size="sm" c="dimmed">
                          Research from this continent has received <strong>{continent.cited_by_count.toLocaleString()}</strong> citations, 
                          with an average of <strong>{continent.works_count > 0 ? (continent.cited_by_count / continent.works_count).toFixed(1) : '0'}</strong> citations per work.
                        </Text>
                      </Stack>
                    </Grid.Col>
                  </Grid>
                </Paper>
              </Stack>
            </Card>

            {/* Enhanced Continent Metadata */}
            <Card withBorder radius="md" p="xl">
              <Group mb="lg">
                <IconInfoCircle size={20} />
                <Title order={2} size="lg">Continent Metadata</Title>
              </Group>
              
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Continent ID
                    </Text>
                    <Text size="sm" fw={500} ff="monospace">
                      {continent.id}
                    </Text>
                  </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder radius="sm" bg="gray.0">
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                      Display Name
                    </Text>
                    <Text size="sm" fw={500}>
                      {continent.display_name}
                    </Text>
                  </Paper>
                </Grid.Col>

                {/* External IDs */}
                {continent.wikidata && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder radius="sm" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                        Wikidata ID
                      </Text>
                      <Anchor 
                        href={`https://www.wikidata.org/wiki/${continent.wikidata}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="sm"
                        fw={500}
                        c="blue"
                      >
                        {continent.wikidata}
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
                        return 'continent';
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
            data={continent}
            title="Continent Raw Data"
            entityType="continent"
            entityId={continent.id}
            maxHeight={700}
            showDownload={true}
          />
        </Tabs.Panel>
      </Tabs>
    </EntityPageTemplate>
  );
}

function ContinentPage() {
  const { id } = Route.useParams();
  const isRedirecting = useNumericIdRedirect(id, EntityType.CONTINENT);
  
  const { 
    data: continent, 
    loading, 
    error, 
    retry 
  } = useContinentData(id, {
    enabled: !!id && !isRedirecting,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('Continent fetch error:', error);
    }
  });

  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType="continents" entityId={id}>
        <EntitySkeleton entityType={EntityType.CONTINENT} />
      </EntityErrorBoundary>
    );
  }

  // Show loading skeleton
  if (loading) {
    return (
      <EntityErrorBoundary entityType="continents" entityId={id}>
        <EntitySkeleton entityType={EntityType.CONTINENT} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="continents" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.CONTINENT}
        />
      </EntityErrorBoundary>
    );
  }

  // Show continent data
  if (continent) {
    return (
      <EntityErrorBoundary entityType="continents" entityId={id}>
        <ContinentDisplay continent={continent} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="continents" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.CONTINENT}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/continents/$id')({
  component: ContinentPage,
});