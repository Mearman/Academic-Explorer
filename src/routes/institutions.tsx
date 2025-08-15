import { 
  Card, 
  Text, 
  Title, 
  Grid, 
  Stack, 
  Paper,
  Group,
  Badge
} from '@mantine/core';
import { 
  IconBuilding, 
  IconMapPin, 
  IconUsers,
  IconTrophy
} from '@tabler/icons-react';
import { createFileRoute } from '@tanstack/react-router';

function InstitutionsOverviewPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Stack gap="xl">
        {/* Header */}
        <Card withBorder radius="md" p="xl">
          <Group mb="lg">
            <IconBuilding size={32} />
            <div>
              <Title order={1}>Institutions</Title>
              <Text size="lg" c="dimmed">
                Explore universities, research centers, and academic institutions worldwide
              </Text>
            </div>
          </Group>
        </Card>

        {/* Overview Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <IconMapPin size={48} style={{ color: 'var(--mantine-color-blue-6)' }} />
                <Title order={3} ta="center">Global Presence</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Academic institutions from every country and continent
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <IconUsers size={48} style={{ color: 'var(--mantine-color-green-6)' }} />
                <Title order={3} ta="center">Research Communities</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Track faculty, researchers, and collaborative networks
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <IconTrophy size={48} style={{ color: 'var(--mantine-color-violet-6)' }} />
                <Title order={3} ta="center">Impact Rankings</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Compare institutional research output and citation impact
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <Badge size="xl" variant="light" color="orange">
                  110K+
                </Badge>
                <Title order={3} ta="center">Institution Profiles</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Over 110,000 institutions with comprehensive metadata and metrics
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Institution Types */}
        <Card withBorder radius="md" p="xl">
          <Title order={2} mb="lg">Institution Types</Title>
          <Grid>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="blue.0">
                <Text fw={500} mb="xs">🎓 Universities</Text>
                <Text size="sm" c="dimmed">
                  Research universities and higher education institutions
                </Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="green.0">
                <Text fw={500} mb="xs">🔬 Research Centers</Text>
                <Text size="sm" c="dimmed">
                  Dedicated research institutes and laboratories
                </Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="violet.0">
                <Text fw={500} mb="xs">🏥 Medical Centers</Text>
                <Text size="sm" c="dimmed">
                  Hospitals, medical schools, and health research facilities
                </Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="orange.0">
                <Text fw={500} mb="xs">🏛️ Government Labs</Text>
                <Text size="sm" c="dimmed">
                  National laboratories and government research agencies
                </Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="red.0">
                <Text fw={500} mb="xs">🏢 Corporate R&D</Text>
                <Text size="sm" c="dimmed">
                  Industry research departments and private laboratories
                </Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="teal.0">
                <Text fw={500} mb="xs">🌐 International Orgs</Text>
                <Text size="sm" c="dimmed">
                  Multinational research collaborations and consortiums
                </Text>
              </Paper>
            </Grid.Col>
          </Grid>
        </Card>

        {/* How to Use */}
        <Card withBorder radius="md" p="xl">
          <Title order={2} mb="lg">How to Explore Institutions</Title>
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="md">
                <div>
                  <Text fw={500} mb="xs">🔍 Search by Name</Text>
                  <Text size="sm" c="dimmed">
                    Find institutions by name, location, or ROR identifier
                  </Text>
                </div>
                <div>
                  <Text fw={500} mb="xs">📊 Compare Metrics</Text>
                  <Text size="sm" c="dimmed">
                    Analyze research output, citation impact, and collaboration patterns
                  </Text>
                </div>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="md">
                <div>
                  <Text fw={500} mb="xs">🌍 Geographic Analysis</Text>
                  <Text size="sm" c="dimmed">
                    Explore institutions by country, region, and research focus areas
                  </Text>
                </div>
                <div>
                  <Text fw={500} mb="xs">🤝 Network Connections</Text>
                  <Text size="sm" c="dimmed">
                    Discover institutional partnerships and researcher mobility
                  </Text>
                </div>
              </Stack>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Search Hint */}
        <Card withBorder radius="md" p="lg" bg="blue.0">
          <Group>
            <IconBuilding size={24} />
            <div>
              <Text fw={500} mb="xs">Start Exploring</Text>
              <Text size="sm">
                Use the search bar above to find specific institutions, or browse through author and work pages to discover their institutional affiliations.
              </Text>
            </div>
          </Group>
        </Card>
      </Stack>
    </div>
  );
}

export const Route = createFileRoute('/institutions')({
  component: InstitutionsOverviewPage,
});