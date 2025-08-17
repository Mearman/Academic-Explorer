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
  IconBookmark, 
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

function PublishersOverviewPage() {
  const { graph } = useEntityGraphStore();
  
  // Get all publisher entities the user has visited
  const browsedPublishers = useMemo(() => {
    const publisherVertices = Array.from(graph.vertices.values())
      .filter(vertex => vertex.entityType === 'publisher')
      .sort((a, b) => {
        if (a.lastVisited && b.lastVisited) {
          return new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime();
        }
        if (a.lastVisited && !b.lastVisited) return -1;
        if (!a.lastVisited && b.lastVisited) return 1;
        return b.visitCount - a.visitCount;
      });
    
    return publisherVertices;
  }, [graph.vertices]);
  
  const directlyVisitedPublishers = browsedPublishers.filter(vertex => vertex.directlyVisited);
  const discoveredPublishers = browsedPublishers.filter(vertex => !vertex.directlyVisited);

  return (
    <div className="container mx-auto px-4 py-8">
      <Stack gap="xl">
        {/* Header */}
        <Card withBorder radius="md" p="xl">
          <Group justify="space-between" align="flex-start">
            <Group>
              <IconBookmark size={32} />
              <div>
                <Title order={1}>Publishers You've Explored</Title>
                <Text size="lg" c="dimmed">
                  Your browsing history of academic publishers and publishing houses
                </Text>
              </div>
            </Group>
            <Link to="/query">
              <Button leftSection={<IconSearch size={16} />} variant="light">
                Find More Publishers
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
                  {directlyVisitedPublishers.length}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Publishers Visited
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper p="lg" withBorder radius="md">
              <Stack gap="xs" align="center">
                <IconBookmark size={32} style={{ color: 'var(--mantine-color-green-6)' }} />
                <Text size="xl" fw={700} c="green">
                  {discoveredPublishers.length}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Publishers Discovered
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper p="lg" withBorder radius="md">
              <Stack gap="xs" align="center">
                <IconClock size={32} style={{ color: 'var(--mantine-color-violet-6)' }} />
                <Text size="xl" fw={700} c="violet">
                  {browsedPublishers.reduce((sum, vertex) => sum + vertex.visitCount, 0)}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Total Visits
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {browsedPublishers.length === 0 ? (
          /* Empty State */
          <Alert icon={<IconInfoCircle size={16} />} title="No publishers explored yet" color="blue">
            <Text mb="md">
              You haven't visited any publisher pages yet. Start exploring by searching for publishers or browsing through works and source pages.
            </Text>
            <Link to="/query">
              <Button size="sm">Start Exploring</Button>
            </Link>
          </Alert>
        ) : (
          <>
            {/* Recently Visited Publishers */}
            {directlyVisitedPublishers.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Title order={2} mb="lg">Recently Visited Publishers</Title>
                <Grid>
                  {directlyVisitedPublishers.slice(0, 12).map((vertex) => (
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

            {/* Discovered Publishers */}
            {discoveredPublishers.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Title order={2} mb="lg">Publishers Discovered Through Research</Title>
                <Text size="sm" c="dimmed" mb="md">
                  Publishers found through publication sources and academic works
                </Text>
                <Grid>
                  {discoveredPublishers.slice(0, 8).map((vertex) => (
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

        {/* Browse All Publishers */}
        <EntityBrowser
          entityType={EntityType.PUBLISHER}
          title="Browse All Publishers"
          description="Explore academic and commercial publishers"
          placeholder="Search for publishers by name or country..."
        />
      </Stack>
    </div>
  );
}

export const Route = createFileRoute('/publishers/')({
  component: PublishersOverviewPage,
});