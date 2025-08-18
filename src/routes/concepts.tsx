import { createFileRoute } from '@tanstack/react-router';

import { TwoPaneLayout } from '@/components/templates/two-pane-layout';
import { EntityGraphVisualization } from '@/components/organisms/entity-graph-visualization';

function ConceptsLayout() {
  return (
    <TwoPaneLayout
      leftPane={<ConceptsOverviewPage />}
      rightPane={
        <EntityGraphVisualization
          height={600}
          showControls={true}
          showLegend={true}
        />
      }
      stateKey="concepts-layout"
      leftTitle="Concepts"
      rightTitle="Concepts Graph"
      showHeaders={true}
      mobileTabLabels={{ left: 'Concepts', right: 'Graph' }}
      defaultSplit={65}
    />
  );
}

// Import the content from concepts.index.tsx
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
import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';

import { EntityLink, EntityBrowser } from '@/components';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityGraphStore } from '@/stores/entity-graph-store';

function ConceptsOverviewPage() {
  const { graph } = useEntityGraphStore();
  
  // Get all concept entities the user has visited
  const browsedConcepts = useMemo(() => {
    const conceptVertices = Array.from(graph.vertices.values())
      .filter(vertex => vertex.entityType === EntityType.CONCEPT)
      .sort((a, b) => {
        // Sort by last visited, then by visit count
        if (a.lastVisited && b.lastVisited) {
          return new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime();
        }
        if (a.lastVisited && !b.lastVisited) return -1;
        if (!a.lastVisited && b.lastVisited) return 1;
        return b.visitCount - a.visitCount;
      });
    
    return conceptVertices;
  }, [graph.vertices]);
  
  const directlyVisitedConcepts = browsedConcepts.filter(vertex => vertex.directlyVisited);
  const searchResultConcepts = browsedConcepts.filter(vertex => vertex.encounterStats?.searchResultCount > 0);
  const relatedEntityConcepts = browsedConcepts.filter(vertex => vertex.encounterStats?.relatedEntityCount > 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <Stack gap="xl">
        {/* Header */}
        <Card withBorder radius="md" p="xl">
          <Group justify="space-between" align="flex-start">
            <Group>
              <IconBrain size={32} />
              <div>
                <Title order={1}>Concepts You've Explored</Title>
                <Text size="lg" c="dimmed">
                  Your browsing history of academic concepts and research topics
                </Text>
              </div>
            </Group>
            <Link to="/query">
              <Button leftSection={<IconSearch size={16} />} variant="light">
                Find More Concepts
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
                  {directlyVisitedConcepts.length}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Concepts Visited
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Paper p="lg" withBorder radius="md">
              <Stack gap="xs" align="center">
                <IconSearch size={32} style={{ color: 'var(--mantine-color-green-6)' }} />
                <Text size="xl" fw={700} c="green">
                  {searchResultConcepts.length}
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
                <IconBrain size={32} style={{ color: 'var(--mantine-color-orange-6)' }} />
                <Text size="xl" fw={700} c="orange">
                  {relatedEntityConcepts.length}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Related Concepts
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Paper p="lg" withBorder radius="md">
              <Stack gap="xs" align="center">
                <IconClock size={32} style={{ color: 'var(--mantine-color-violet-6)' }} />
                <Text size="xl" fw={700} c="violet">
                  {browsedConcepts.reduce((sum, vertex) => sum + (vertex.encounterStats?.totalEncounters || vertex.visitCount), 0)}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Total Encounters
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {browsedConcepts.length === 0 ? (
          /* Empty State */
          (<Alert icon={<IconInfoCircle size={16} />} title="No concepts explored yet" color="blue">
            <Text mb="md">
              You haven't visited any concept pages yet. Start exploring by searching for topics or browsing through works and authors.
            </Text>
            <Link to="/query">
              <Button size="sm">Start Exploring</Button>
            </Link>
          </Alert>)
        ) : (
          <>
            {/* Recently Visited Concepts */}
            {directlyVisitedConcepts.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Title order={2} mb="lg">Recently Visited Concepts</Title>
                <Grid>
                  {directlyVisitedConcepts.slice(0, 12).map((vertex) => (
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
                {directlyVisitedConcepts.length > 12 && (
                  <Text size="sm" c="dimmed" ta="center" mt="md">
                    Showing {12} of {directlyVisitedConcepts.length} visited concepts
                  </Text>
                )}
              </Card>
            )}

            {/* Concepts from Search Results */}
            {searchResultConcepts.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Title order={2} mb="lg">Concepts from Search Results</Title>
                <Text size="sm" c="dimmed" mb="md">
                  Concepts you've encountered while searching ({searchResultConcepts.filter(v => !v.directlyVisited).length} not yet visited)
                </Text>
                <Grid>
                  {searchResultConcepts.slice(0, 8).map((vertex) => (
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
                {searchResultConcepts.length > 8 && (
                  <Text size="sm" c="dimmed" ta="center" mt="md">
                    Showing {8} of {searchResultConcepts.length} concepts from search results
                  </Text>
                )}
              </Card>
            )}

            {/* Related Concepts */}
            {relatedEntityConcepts.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Title order={2} mb="lg">Related Concepts</Title>
                <Text size="sm" c="dimmed" mb="md">
                  Concepts found through research topics, citations, and thematic connections ({relatedEntityConcepts.filter(v => !v.directlyVisited).length} not yet visited)
                </Text>
                <Grid>
                  {relatedEntityConcepts.slice(0, 8).map((vertex) => (
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
                {relatedEntityConcepts.length > 8 && (
                  <Text size="sm" c="dimmed" ta="center" mt="md">
                    Showing {8} of {relatedEntityConcepts.length} related concepts
                  </Text>
                )}
              </Card>
            )}
          </>
        )}

        {/* Browse All Concepts */}
        <EntityBrowser
          entityType={EntityType.CONCEPT}
          title="Browse All Concepts"
          description="Explore research concepts and legacy knowledge areas"
          placeholder="Search for concepts by name or level..."
        />
      </Stack>
    </div>
  )
}

export const Route = createFileRoute('/concepts')({
  component: ConceptsLayout,
});