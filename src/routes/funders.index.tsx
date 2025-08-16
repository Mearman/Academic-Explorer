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
  IconCoin, 
  IconClock, 
  IconEye,
  IconInfoCircle,
  IconSearch
} from '@tabler/icons-react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo } from 'react';

import { EntityLink } from '@/components';
import { useEntityGraphStore } from '@/stores/entity-graph-store';

function FundersOverviewPage() {
  const { graph } = useEntityGraphStore();
  
  // Get all funder entities the user has visited
  const browsedFunders = useMemo(() => {
    const funderVertices = Array.from(graph.vertices.values())
      .filter(vertex => vertex.entityType === 'funder')
      .sort((a, b) => {
        if (a.lastVisited && b.lastVisited) {
          return new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime();
        }
        if (a.lastVisited && !b.lastVisited) return -1;
        if (!a.lastVisited && b.lastVisited) return 1;
        return b.visitCount - a.visitCount;
      });
    
    return funderVertices;
  }, [graph.vertices]);
  
  const directlyVisitedFunders = browsedFunders.filter(vertex => vertex.directlyVisited);
  const discoveredFunders = browsedFunders.filter(vertex => !vertex.directlyVisited);

  return (
    <div className="container mx-auto px-4 py-8">
      <Stack gap="xl">
        {/* Header */}
        <Card withBorder radius="md" p="xl">
          <Group justify="space-between" align="flex-start">
            <Group>
              <IconCoin size={32} />
              <div>
                <Title order={1}>Funders You've Explored</Title>
                <Text size="lg" c="dimmed">
                  Your browsing history of funding agencies and research sponsors
                </Text>
              </div>
            </Group>
            <Link to="/search">
              <Button leftSection={<IconSearch size={16} />} variant="light">
                Find More Funders
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
                  {directlyVisitedFunders.length}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Funders Visited
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper p="lg" withBorder radius="md">
              <Stack gap="xs" align="center">
                <IconCoin size={32} style={{ color: 'var(--mantine-color-green-6)' }} />
                <Text size="xl" fw={700} c="green">
                  {discoveredFunders.length}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Funders Discovered
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper p="lg" withBorder radius="md">
              <Stack gap="xs" align="center">
                <IconClock size={32} style={{ color: 'var(--mantine-color-violet-6)' }} />
                <Text size="xl" fw={700} c="violet">
                  {browsedFunders.reduce((sum, vertex) => sum + vertex.visitCount, 0)}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Total Visits
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {browsedFunders.length === 0 ? (
          /* Empty State */
          <Alert icon={<IconInfoCircle size={16} />} title="No funders explored yet" color="blue">
            <Text mb="md">
              You haven't visited any funder pages yet. Start exploring by searching for funding agencies or browsing through works and author pages.
            </Text>
            <Link to="/search">
              <Button size="sm">Start Exploring</Button>
            </Link>
          </Alert>
        ) : (
          <>
            {/* Recently Visited Funders */}
            {directlyVisitedFunders.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Title order={2} mb="lg">Recently Visited Funders</Title>
                <Grid>
                  {directlyVisitedFunders.slice(0, 12).map((vertex) => (
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

            {/* Discovered Funders */}
            {discoveredFunders.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Title order={2} mb="lg">Funders Discovered Through Research</Title>
                <Text size="sm" c="dimmed" mb="md">
                  Funding agencies found through research grants and project affiliations
                </Text>
                <Grid>
                  {discoveredFunders.slice(0, 8).map((vertex) => (
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
      </Stack>
    </div>
  );
}

export const Route = createFileRoute('/funders/')({
  component: FundersOverviewPage,
});