import { 
  Card, 
  Text, 
  Title, 
  Grid, 
  Stack, 
  Paper,
  Group,
  Badge,
  Button,
  Alert
} from '@mantine/core';
import { 
  IconBooks, 
  IconClock, 
  IconEye,
  IconInfoCircle,
  IconSearch,
  IconChartBar,
  IconWorldWww,
  IconAward
} from '@tabler/icons-react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo } from 'react';

import { EntityLink } from '@/components';
import { useEntityGraphStore } from '@/stores/entity-graph-store';

function SourcesOverviewPage() {
  const { graph } = useEntityGraphStore();
  
  // Get all source entities the user has visited
  const browsedSources = useMemo(() => {
    const sourceVertices = Array.from(graph.vertices.values())
      .filter(vertex => vertex.entityType === 'source')
      .sort((a, b) => {
        if (a.lastVisited && b.lastVisited) {
          return new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime();
        }
        if (a.lastVisited && !b.lastVisited) return -1;
        if (!a.lastVisited && b.lastVisited) return 1;
        return b.visitCount - a.visitCount;
      });
    
    return sourceVertices;
  }, [graph.vertices]);
  
  const directlyVisitedSources = browsedSources.filter(vertex => vertex.directlyVisited);
  const discoveredSources = browsedSources.filter(vertex => !vertex.directlyVisited);

  return (
    <div className="container mx-auto px-4 py-8">
      <Stack gap="xl">
        {/* Header */}
        <Card withBorder radius="md" p="xl">
          <Group justify="space-between" align="flex-start">
            <Group>
              <IconBooks size={32} />
              <div>
                <Title order={1}>Sources You've Explored</Title>
                <Text size="lg" c="dimmed">
                  Your browsing history of journals, conferences, and publication venues
                </Text>
              </div>
            </Group>
            <Link to="/query">
              <Button leftSection={<IconSearch size={16} />} variant="light">
                Find More Sources
              </Button>
            </Link>
          </Group>
        </Card>

        {/* Summary Stats */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper p="lg" withBorder radius="md">
              <Stack gap="xs" align="center">
                <IconEye size={32} style={{ color: 'var(--mantine-color-blue-6)' }} />
                <Text size="xl" fw={700} c="blue">
                  {directlyVisitedSources.length}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Sources Visited
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper p="lg" withBorder radius="md">
              <Stack gap="xs" align="center">
                <IconBooks size={32} style={{ color: 'var(--mantine-color-green-6)' }} />
                <Text size="xl" fw={700} c="green">
                  {discoveredSources.length}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Sources Discovered
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper p="lg" withBorder radius="md">
              <Stack gap="xs" align="center">
                <IconClock size={32} style={{ color: 'var(--mantine-color-violet-6)' }} />
                <Text size="xl" fw={700} c="violet">
                  {browsedSources.reduce((sum, vertex) => sum + vertex.visitCount, 0)}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Total Visits
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {browsedSources.length === 0 ? (
          /* Empty State */
          <Alert icon={<IconInfoCircle size={16} />} title="No sources explored yet" color="blue">
            <Text mb="md">
              You haven't visited any publication sources yet. Start exploring by searching for journals or browsing through work pages.
            </Text>
            <Link to="/query">
              <Button size="sm">Start Exploring</Button>
            </Link>
          </Alert>
        ) : (
          <>
            {/* Recently Visited Sources */}
            {directlyVisitedSources.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Title order={2} mb="lg">Recently Visited Sources</Title>
                <Grid>
                  {directlyVisitedSources.slice(0, 12).map((vertex) => (
                    <Grid.Col key={vertex.id} span={{ base: 12, sm: 6, md: 4 }}>
                      <Paper p="md" withBorder radius="sm" style={{ height: '100%' }}>
                        <Stack gap="xs">
                          <EntityLink
                            entityId={vertex.id}
                            displayName={vertex.displayName}
                            size="sm"
                            weight={500}
                          />
                          <Group gap="xs">
                            <Badge size="xs" variant="light" color="blue">
                              {vertex.visitCount} visit{vertex.visitCount !== 1 ? 's' : ''}
                            </Badge>
                            {vertex.lastVisited && (
                              <Text size="xs" c="dimmed">
                                {new Date(vertex.lastVisited).toLocaleDateString()}
                              </Text>
                            )}
                          </Group>
                        </Stack>
                      </Paper>
                    </Grid.Col>
                  ))}
                </Grid>
              </Card>
            )}

            {/* Discovered Sources */}
            {discoveredSources.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Title order={2} mb="lg">Sources Discovered Through Research</Title>
                <Text size="sm" c="dimmed" mb="md">
                  Journals and venues found through publication connections
                </Text>
                <Grid>
                  {discoveredSources.slice(0, 8).map((vertex) => (
                    <Grid.Col key={vertex.id} span={{ base: 12, sm: 6, md: 3 }}>
                      <Paper p="md" withBorder radius="sm" style={{ height: '100%' }}>
                        <Stack gap="xs">
                          <EntityLink
                            entityId={vertex.id}
                            displayName={vertex.displayName}
                            size="xs"
                            weight={400}
                          />
                          <Text size="xs" c="dimmed">
                            Discovered {new Date(vertex.firstSeen).toLocaleDateString()}
                          </Text>
                        </Stack>
                      </Paper>
                    </Grid.Col>
                  ))}
                </Grid>
              </Card>
            )}
          </>
        )}

        {/* Overview Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <IconChartBar size={48} style={{ color: 'var(--mantine-color-blue-6)' }} />
                <Title order={3} ta="center">Impact Metrics</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Journal impact factors, h-index, and citation distributions
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <IconWorldWww size={48} style={{ color: 'var(--mantine-color-green-6)' }} />
                <Title order={3} ta="center">Open Access</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Track open access policies and publication accessibility
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <IconAward size={48} style={{ color: 'var(--mantine-color-violet-6)' }} />
                <Title order={3} ta="center">Prestige Rankings</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Compare journal rankings and venue reputation across fields
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <Badge size="xl" variant="light" color="orange">
                  250K+
                </Badge>
                <Title order={3} ta="center">Publication Venues</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Over 250,000 journals, conferences, and publication sources
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Source Types */}
        <Card withBorder radius="md" p="xl">
          <Title order={2} mb="lg">Publication Venue Types</Title>
          <Grid>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="blue.0">
                <Text fw={500} mb="xs">📚 Academic Journals</Text>
                <Text size="sm" c="dimmed">
                  Peer-reviewed scholarly journals across all disciplines
                </Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="green.0">
                <Text fw={500} mb="xs">🎪 Conference Proceedings</Text>
                <Text size="sm" c="dimmed">
                  Academic conferences, symposiums, and workshop proceedings
                </Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="violet.0">
                <Text fw={500} mb="xs">📖 Book Series</Text>
                <Text size="sm" c="dimmed">
                  Academic book publishers and monograph series
                </Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="orange.0">
                <Text fw={500} mb="xs">🌐 Preprint Servers</Text>
                <Text size="sm" c="dimmed">
                  arXiv, bioRxiv, medRxiv, and other preprint repositories
                </Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="red.0">
                <Text fw={500} mb="xs">📰 Trade Publications</Text>
                <Text size="sm" c="dimmed">
                  Industry magazines and professional publications
                </Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="teal.0">
                <Text fw={500} mb="xs">🏛️ Institutional Repos</Text>
                <Text size="sm" c="dimmed">
                  University repositories and institutional collections
                </Text>
              </Paper>
            </Grid.Col>
          </Grid>
        </Card>

        {/* How to Use */}
        <Card withBorder radius="md" p="xl">
          <Title order={2} mb="lg">How to Explore Sources</Title>
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="md">
                <div>
                  <Text fw={500} mb="xs">🔍 Search by Name or ISSN</Text>
                  <Text size="sm" c="dimmed">
                    Find journals and conferences by name, ISSN, or subject area
                  </Text>
                </div>
                <div>
                  <Text fw={500} mb="xs">📈 Compare Impact</Text>
                  <Text size="sm" c="dimmed">
                    Analyze citation metrics, h-index, and publication trends
                  </Text>
                </div>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="md">
                <div>
                  <Text fw={500} mb="xs">🏷️ Browse by Field</Text>
                  <Text size="sm" c="dimmed">
                    Discover top venues in specific research areas and disciplines
                  </Text>
                </div>
                <div>
                  <Text fw={500} mb="xs">🔓 Open Access Analysis</Text>
                  <Text size="sm" c="dimmed">
                    Find open access journals and track publishing accessibility
                  </Text>
                </div>
              </Stack>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Search Hint */}
        <Card withBorder radius="md" p="lg" bg="blue.0">
          <Group>
            <IconBooks size={24} />
            <div>
              <Text fw={500} mb="xs">Start Exploring</Text>
              <Text size="sm">
                Use the search bar above to find specific journals or conferences, or explore work pages to discover where research is being published.
              </Text>
            </div>
          </Group>
        </Card>
      </Stack>
    </div>
  );
}

export const Route = createFileRoute('/sources/')({
  component: SourcesOverviewPage,
});