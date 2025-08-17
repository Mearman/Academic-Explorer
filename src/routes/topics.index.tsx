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
  IconBrain, 
  IconClock, 
  IconEye,
  IconInfoCircle,
  IconSearch
} from '@tabler/icons-react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo } from 'react';

import { EntityLink, EntityBrowser } from '@/components';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityGraphStore } from '@/stores/entity-graph-store';

function TopicsOverviewPage() {
  const { graph } = useEntityGraphStore();
  
  // Get all topic entities the user has visited
  const browsedTopics = useMemo(() => {
    const topicVertices = Array.from(graph.vertices.values())
      .filter(vertex => vertex.entityType === 'topic')
      .sort((a, b) => {
        if (a.lastVisited && b.lastVisited) {
          return new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime();
        }
        if (a.lastVisited && !b.lastVisited) return -1;
        if (!a.lastVisited && b.lastVisited) return 1;
        return b.visitCount - a.visitCount;
      });
    
    return topicVertices;
  }, [graph.vertices]);
  
  const directlyVisitedTopics = browsedTopics.filter(vertex => vertex.directlyVisited);
  const discoveredTopics = browsedTopics.filter(vertex => !vertex.directlyVisited);

  return (
    <div className="container mx-auto px-4 py-8">
      <Stack gap="xl">
        {/* Header */}
        <Card withBorder radius="md" p="xl">
          <Group justify="space-between" align="flex-start">
            <Group>
              <IconBrain size={32} />
              <div>
                <Title order={1}>Topics You've Explored</Title>
                <Text size="lg" c="dimmed">
                  Your browsing history of research areas and concepts
                </Text>
              </div>
            </Group>
            <Link to="/query">
              <Button leftSection={<IconSearch size={16} />} variant="light">
                Find More Topics
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
                  {directlyVisitedTopics.length}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Topics Visited
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper p="lg" withBorder radius="md">
              <Stack gap="xs" align="center">
                <IconBrain size={32} style={{ color: 'var(--mantine-color-green-6)' }} />
                <Text size="xl" fw={700} c="green">
                  {discoveredTopics.length}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Topics Discovered
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper p="lg" withBorder radius="md">
              <Stack gap="xs" align="center">
                <IconClock size={32} style={{ color: 'var(--mantine-color-violet-6)' }} />
                <Text size="xl" fw={700} c="violet">
                  {browsedTopics.reduce((sum, vertex) => sum + vertex.visitCount, 0)}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Total Visits
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {browsedTopics.length === 0 ? (
          /* Empty State */
          <Alert icon={<IconInfoCircle size={16} />} title="No topics explored yet" color="blue">
            <Text mb="md">
              You haven't visited any topic pages yet. Start exploring by searching for research areas or browsing through works and author pages.
            </Text>
            <Link to="/query">
              <Button size="sm">Start Exploring</Button>
            </Link>
          </Alert>
        ) : (
          <>
            {/* Recently Visited Topics */}
            {directlyVisitedTopics.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Title order={2} mb="lg">Recently Visited Topics</Title>
                <Grid>
                  {directlyVisitedTopics.slice(0, 12).map((vertex) => (
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

            {/* Discovered Topics */}
            {discoveredTopics.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Title order={2} mb="lg">Topics Discovered Through Research</Title>
                <Text size="sm" c="dimmed" mb="md">
                  Research areas found through work classifications and related papers
                </Text>
                <Grid>
                  {discoveredTopics.slice(0, 8).map((vertex) => (
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

        {/* Browse All Topics */}
        <EntityBrowser
          entityType={EntityType.TOPIC}
          title="Browse All Topics"
          description="Explore research topics, fields, and domains"
          placeholder="Search for topics by name, field, or domain..."
        />
      </Stack>
    </div>
  );
}

export const Route = createFileRoute('/topics/')({
  component: TopicsOverviewPage,
});