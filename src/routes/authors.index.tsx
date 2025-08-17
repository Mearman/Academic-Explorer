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
  IconUser, 
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

function AuthorsOverviewPage() {
  const { graph } = useEntityGraphStore();
  
  // Get all author entities the user has visited
  const browsedAuthors = useMemo(() => {
    const authorVertices = Array.from(graph.vertices.values())
      .filter(vertex => vertex.entityType === EntityType.AUTHOR)
      .sort((a, b) => {
        // Sort by last visited, then by visit count
        if (a.lastVisited && b.lastVisited) {
          return new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime();
        }
        if (a.lastVisited && !b.lastVisited) return -1;
        if (!a.lastVisited && b.lastVisited) return 1;
        return b.visitCount - a.visitCount;
      });
    
    return authorVertices;
  }, [graph.vertices]);
  
  const directlyVisitedAuthors = browsedAuthors.filter(vertex => vertex.directlyVisited);
  const searchResultAuthors = browsedAuthors.filter(vertex => vertex.encounterStats?.searchResultCount > 0);
  const relatedEntityAuthors = browsedAuthors.filter(vertex => vertex.encounterStats?.relatedEntityCount > 0);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Stack gap="xl">
        {/* Header */}
        <Card withBorder radius="md" p="xl">
          <Group justify="space-between" align="flex-start">
            <Group>
              <IconUser size={32} />
              <div>
                <Title order={1}>Authors You've Explored</Title>
                <Text size="lg" c="dimmed">
                  Your browsing history of academic authors and researchers
                </Text>
              </div>
            </Group>
            <Link to="/query">
              <Button leftSection={<IconSearch size={16} />} variant="light">
                Find More Authors
              </Button>
            </Link>
          </Group>
        </Card>

        {/* Summary Stats */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Paper p="lg" withBorder radius="md">
              <Stack gap="xs" align="center">
                <IconEye size={32} style={{ color: 'var(--mantine-color-blue-6)' }} />
                <Text size="xl" fw={700} c="blue">
                  {directlyVisitedAuthors.length}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Authors Visited
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Paper p="lg" withBorder radius="md">
              <Stack gap="xs" align="center">
                <IconSearch size={32} style={{ color: 'var(--mantine-color-green-6)' }} />
                <Text size="xl" fw={700} c="green">
                  {searchResultAuthors.length}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  In Search Results
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Paper p="lg" withBorder radius="md">
              <Stack gap="xs" align="center">
                <IconUser size={32} style={{ color: 'var(--mantine-color-orange-6)' }} />
                <Text size="xl" fw={700} c="orange">
                  {relatedEntityAuthors.length}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Related Authors
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Paper p="lg" withBorder radius="md">
              <Stack gap="xs" align="center">
                <IconClock size={32} style={{ color: 'var(--mantine-color-violet-6)' }} />
                <Text size="xl" fw={700} c="violet">
                  {browsedAuthors.reduce((sum, vertex) => sum + (vertex.encounterStats?.totalEncounters || vertex.visitCount), 0)}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Total Encounters
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {browsedAuthors.length === 0 ? (
          /* Empty State */
          (<Alert icon={<IconInfoCircle size={16} />} title="No authors explored yet" color="blue">
            <Text mb="md">
              You haven't visited any author pages yet. Start exploring by searching for authors or browsing through works and institutions.
            </Text>
            <Link to="/query">
              <Button size="sm">Start Exploring</Button>
            </Link>
          </Alert>)
        ) : (
          <>
            {/* Recently Visited Authors */}
            {directlyVisitedAuthors.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Title order={2} mb="lg">Recently Visited Authors</Title>
                <Grid>
                  {directlyVisitedAuthors.slice(0, 12).map((vertex) => (
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
                {directlyVisitedAuthors.length > 12 && (
                  <Text size="sm" c="dimmed" ta="center" mt="md">
                    Showing {12} of {directlyVisitedAuthors.length} visited authors
                  </Text>
                )}
              </Card>
            )}

            {/* Authors from Search Results */}
            {searchResultAuthors.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Title order={2} mb="lg">Authors from Search Results</Title>
                <Text size="sm" c="dimmed" mb="md">
                  Authors you've encountered while searching ({searchResultAuthors.filter(v => !v.directlyVisited).length} not yet visited)
                </Text>
                <Grid>
                  {searchResultAuthors.slice(0, 8).map((vertex) => (
                    <Grid.Col key={vertex.id} span={{ base: 12, sm: 6, md: 3 }}>
                      <Paper p="md" withBorder radius="sm" style={{ height: '100%' }}>
                        <Stack gap="xs">
                          <EntityLink
                            entityId={vertex.id}
                            displayName={vertex.displayName}
                            size="xs"
                            weight={400}
                          />
                          <Group gap="xs">
                            <Badge size="xs" variant="light" color="green">
                              {vertex.encounterStats?.searchResultCount || 0} search{(vertex.encounterStats?.searchResultCount || 0) !== 1 ? 'es' : ''}
                            </Badge>
                            {vertex.directlyVisited && (
                              <Badge size="xs" variant="light" color="blue">
                                visited
                              </Badge>
                            )}
                          </Group>
                          <Text size="xs" c="dimmed">
                            First seen {new Date(vertex.encounterStats?.firstSearchResult || vertex.firstSeen).toLocaleDateString()}
                          </Text>
                        </Stack>
                      </Paper>
                    </Grid.Col>
                  ))}
                </Grid>
                {searchResultAuthors.length > 8 && (
                  <Text size="sm" c="dimmed" ta="center" mt="md">
                    Showing {8} of {searchResultAuthors.length} authors from search results
                  </Text>
                )}
              </Card>
            )}

            {/* Related Authors */}
            {relatedEntityAuthors.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Title order={2} mb="lg">Related Authors</Title>
                <Text size="sm" c="dimmed" mb="md">
                  Authors found through co-authorships, citations, and institutional connections ({relatedEntityAuthors.filter(v => !v.directlyVisited).length} not yet visited)
                </Text>
                <Grid>
                  {relatedEntityAuthors.slice(0, 8).map((vertex) => (
                    <Grid.Col key={vertex.id} span={{ base: 12, sm: 6, md: 3 }}>
                      <Paper p="md" withBorder radius="sm" style={{ height: '100%' }}>
                        <Stack gap="xs">
                          <EntityLink
                            entityId={vertex.id}
                            displayName={vertex.displayName}
                            size="xs"
                            weight={400}
                          />
                          <Group gap="xs">
                            <Badge size="xs" variant="light" color="orange">
                              {vertex.encounterStats?.relatedEntityCount || 0} connection{(vertex.encounterStats?.relatedEntityCount || 0) !== 1 ? 's' : ''}
                            </Badge>
                            {vertex.directlyVisited && (
                              <Badge size="xs" variant="light" color="blue">
                                visited
                              </Badge>
                            )}
                          </Group>
                          <Text size="xs" c="dimmed">
                            First seen {new Date(vertex.encounterStats?.firstRelatedEntity || vertex.firstSeen).toLocaleDateString()}
                          </Text>
                        </Stack>
                      </Paper>
                    </Grid.Col>
                  ))}
                </Grid>
                {relatedEntityAuthors.length > 8 && (
                  <Text size="sm" c="dimmed" ta="center" mt="md">
                    Showing {8} of {relatedEntityAuthors.length} related authors
                  </Text>
                )}
              </Card>
            )}
          </>
        )}

        {/* Browse All Authors */}
        <EntityBrowser
          entityType={EntityType.AUTHOR}
          title="Browse All Authors"
          description="Explore authors from the OpenAlex database"
          placeholder="Search for authors by name, ORCID, or institution..."
        />
      </Stack>
    </div>
  )
}

export const Route = createFileRoute('/authors/')({
  component: AuthorsOverviewPage,
});