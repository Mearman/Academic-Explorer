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
  IconBuilding, 
  IconClock, 
  IconEye,
  IconInfoCircle,
  IconSearch
} from '@tabler/icons-react';
import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';

import { EntityLink, EntityBrowser } from '@/components';
import { EntityGraphVisualization } from '@/components/organisms/entity-graph-visualization';
import { TwoPaneLayout } from '@/components/templates/two-pane-layout';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityGraphStore } from '@/stores/entity-graph-store';

function InstitutionsLayout() {
  return (
    <TwoPaneLayout
      leftPane={<InstitutionsOverviewPage />}
      rightPane={
        <EntityGraphVisualization
          height={600}
          showControls={true}
          showLegend={true}
        />
      }
      stateKey="institutions-layout"
      leftTitle="Institutions"
      rightTitle="Institutions Graph"
      showHeaders={true}
      mobileTabLabels={{ left: 'Institutions', right: 'Graph' }}
      defaultSplit={65}
    />
  );
}


function InstitutionsOverviewPage() {
  const { graph } = useEntityGraphStore();
  
  // Get all institution entities the user has visited
  const browsedInstitutions = useMemo(() => {
    const institutionVertices = Array.from(graph.vertices.values())
      .filter(vertex => vertex.entityType === 'institution')
      .sort((a, b) => {
        // Sort by last visited, then by visit count
        if (a.lastVisited && b.lastVisited) {
          return new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime();
        }
        if (a.lastVisited && !b.lastVisited) return -1;
        if (!a.lastVisited && b.lastVisited) return 1;
        return b.visitCount - a.visitCount;
      });
    
    return institutionVertices;
  }, [graph.vertices]);
  
  const directlyVisitedInstitutions = browsedInstitutions.filter(vertex => vertex.directlyVisited);
  const discoveredInstitutions = browsedInstitutions.filter(vertex => !vertex.directlyVisited);

  return (
    <div className="container mx-auto px-4 py-8">
      <Stack gap="xl">
        {/* Header */}
        <Card withBorder radius="md" p="xl">
          <Group justify="space-between" align="flex-start">
            <Group>
              <IconBuilding size={32} />
              <div>
                <Title order={1}>Institutions You've Explored</Title>
                <Text size="lg" c="dimmed">
                  Your browsing history of universities and research institutions
                </Text>
              </div>
            </Group>
            <Link to="/query">
              <Button leftSection={<IconSearch size={16} />} variant="light">
                Find More Institutions
              </Button>
            </Link>
          </Group>
        </Card>

        {/* Summary Stats */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper p="lg" withBorder radius="md">
              <Stack gap="xs" align="center">
                <IconEye size={32} color="blue" />
                <Text size="xl" fw={700} c="blue">
                  {directlyVisitedInstitutions.length}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Institutions Visited
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper p="lg" withBorder radius="md">
              <Stack gap="xs" align="center">
                <IconBuilding size={32} color="green" />
                <Text size="xl" fw={700} c="green">
                  {discoveredInstitutions.length}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Institutions Discovered
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper p="lg" withBorder radius="md">
              <Stack gap="xs" align="center">
                <IconClock size={32} color="violet" />
                <Text size="xl" fw={700} c="violet">
                  {browsedInstitutions.reduce((sum, vertex) => sum + vertex.visitCount, 0)}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Total Visits
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {browsedInstitutions.length === 0 ? (
          /* Empty State */
          <Alert icon={<IconInfoCircle size={16} />} title="No institutions explored yet" color="blue">
            <Text mb="md">
              You haven't visited any institution pages yet. Start exploring by searching for universities or browsing through author and work pages.
            </Text>
            <Link to="/query">
              <Button size="sm">Start Exploring</Button>
            </Link>
          </Alert>
        ) : (
          <>
            {/* Recently Visited Institutions */}
            {directlyVisitedInstitutions.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Title order={2} mb="lg">Recently Visited Institutions</Title>
                <Grid>
                  {directlyVisitedInstitutions.slice(0, 12).map((vertex) => (
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
                {directlyVisitedInstitutions.length > 12 && (
                  <Text size="sm" c="dimmed" ta="center" mt="md">
                    Showing {12} of {directlyVisitedInstitutions.length} visited institutions
                  </Text>
                )}
              </Card>
            )}

            {/* Discovered Institutions */}
            {discoveredInstitutions.length > 0 && (
              <Card withBorder radius="md" p="xl">
                <Title order={2} mb="lg">Institutions Discovered Through Research</Title>
                <Text size="sm" c="dimmed" mb="md">
                  Institutions found through author affiliations and collaborations
                </Text>
                <Grid>
                  {discoveredInstitutions.slice(0, 8).map((vertex) => (
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
                {discoveredInstitutions.length > 8 && (
                  <Text size="sm" c="dimmed" ta="center" mt="md">
                    Showing {8} of {discoveredInstitutions.length} discovered institutions
                  </Text>
                )}
              </Card>
            )}
          </>
        )}

        {/* Browse All Institutions */}
        <EntityBrowser
          entityType={EntityType.INSTITUTION}
          title="Browse All Institutions"
          description="Explore academic institutions from around the world"
          placeholder="Search for institutions by name, country, or type..."
        />
      </Stack>
    </div>
  );
}

export const Route = createFileRoute('/institutions')({
  component: InstitutionsLayout,
});