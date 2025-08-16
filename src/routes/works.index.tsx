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
  IconBook, 
  IconClock, 
  IconEye,
  IconInfoCircle,
  IconSearch
} from '@tabler/icons-react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo } from 'react';

import { EntityLink } from '@/components';
import { useEntityGraphStore } from '@/stores/entity-graph-store';

function WorksOverviewPage() {
  const { graph } = useEntityGraphStore();
  
  // Get all work entities the user has visited
  const browsedWorks = useMemo(() => {
    const workVertices = Array.from(graph.vertices.values())
      .filter(vertex => vertex.entityType === 'work')
      .sort((a, b) => {
        // Sort by last visited, then by visit count
        if (a.lastVisited && b.lastVisited) {
          return new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime();
        }
        if (a.lastVisited && !b.lastVisited) return -1;
        if (!a.lastVisited && b.lastVisited) return 1;
        return b.visitCount - a.visitCount;
      });
    
    return workVertices;
  }, [graph.vertices]);
  
  const directlyVisitedWorks = browsedWorks.filter(vertex => vertex.directlyVisited);
  const discoveredWorks = browsedWorks.filter(vertex => !vertex.directlyVisited);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Stack gap="xl">
        {/* Header */}
        <Card withBorder radius="md" p="xl">
          <Group justify="space-between" align="flex-start">
            <Group>
              <IconBook size={32} />
              <div>
                <Title order={1}>Works You've Explored</Title>
                <Text size="lg" c="dimmed">
                  Your browsing history of academic publications and papers
                </Text>
              </div>
            </Group>
            <Link to="/query">
              <Button leftSection={<IconSearch size={16} />} variant="light">
                Find More Works
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
                  {directlyVisitedWorks.length}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Works Read
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper p="lg" withBorder radius="md">
              <Stack gap="xs" align="center">
                <IconBook size={32} style={{ color: 'var(--mantine-color-green-6)' }} />
                <Text size="xl" fw={700} c="green">
                  {discoveredWorks.length}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Works Discovered
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper p="lg" withBorder radius="md">
              <Stack gap="xs" align="center">
                <IconClock size={32} style={{ color: 'var(--mantine-color-violet-6)' }} />
                <Text size="xl" fw={700} c="violet">
                  {browsedWorks.reduce((sum, vertex) => sum + vertex.visitCount, 0)}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Total Visits
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {browsedWorks.length === 0 ? (
          /* Empty State */
          <Alert icon={<IconInfoCircle size={16} />} title="No works explored yet" color="blue">
            <Text mb="md">
              You haven't visited any academic works yet. Start exploring by searching for papers or browsing through author and institution pages.
            </Text>
            <Link to="/query">
              <Button size="sm">Start Exploring</Button>
            </Link>
          </Alert>
        ) : (
          <>
            {/* Recently Read Works */}
            {directlyVisitedWorks.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Title order={2} mb="lg">Recently Read Works</Title>
                <Grid>
                  {directlyVisitedWorks.slice(0, 12).map((vertex) => (
                    <Grid.Col key={vertex.id} span={{ base: 12, md: 6 }}>
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
                {directlyVisitedWorks.length > 12 && (
                  <Text size="sm" c="dimmed" ta="center" mt="md">
                    Showing {12} of {directlyVisitedWorks.length} read works
                  </Text>
                )}
              </Card>
            )}

            {/* Discovered Works */}
            {discoveredWorks.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Title order={2} mb="lg">Works Discovered Through Research</Title>
                <Text size="sm" c="dimmed" mb="md">
                  Papers found through citations, references, and author connections
                </Text>
                <Grid>
                  {discoveredWorks.slice(0, 8).map((vertex) => (
                    <Grid.Col key={vertex.id} span={{ base: 12, md: 6 }}>
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
                {discoveredWorks.length > 8 && (
                  <Text size="sm" c="dimmed" ta="center" mt="md">
                    Showing {8} of {discoveredWorks.length} discovered works
                  </Text>
                )}
              </Card>
            )}
          </>
        )}
      </Stack>
    </div>
  );
}

export const Route = createFileRoute('/works/')({
  component: WorksOverviewPage,
});