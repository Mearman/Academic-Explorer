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
  IconUser, 
  IconTrendingUp, 
  IconWorld,
  IconSchool
} from '@tabler/icons-react';
import { createFileRoute } from '@tanstack/react-router';

function AuthorsOverviewPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Stack gap="xl">
        {/* Header */}
        <Card withBorder radius="md" p="xl">
          <Group mb="lg">
            <IconUser size={32} />
            <div>
              <Title order={1}>Authors</Title>
              <Text size="lg" c="dimmed">
                Explore academic authors and researchers from around the world
              </Text>
            </div>
          </Group>
        </Card>

        {/* Overview Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <IconTrendingUp size={48} style={{ color: 'var(--mantine-color-blue-6)' }} />
                <Title order={3} ta="center">Research Impact</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Discover highly cited researchers and their contributions to various fields
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <IconWorld size={48} style={{ color: 'var(--mantine-color-green-6)' }} />
                <Title order={3} ta="center">Global Reach</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Authors from institutions worldwide, spanning all continents and research areas
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <IconSchool size={48} style={{ color: 'var(--mantine-color-violet-6)' }} />
                <Title order={3} ta="center">Affiliations</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Track author movements between institutions and collaborative networks
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <Badge size="xl" variant="light" color="orange">
                  100M+
                </Badge>
                <Title order={3} ta="center">Author Profiles</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Over 100 million author profiles with comprehensive metadata and metrics
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* How to Use */}
        <Card withBorder radius="md" p="xl">
          <Title order={2} mb="lg">How to Explore Authors</Title>
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="md">
                <div>
                  <Text fw={500} mb="xs">🔍 Search by Name</Text>
                  <Text size="sm" c="dimmed">
                    Use the search bar to find authors by their name or ORCID ID
                  </Text>
                </div>
                <div>
                  <Text fw={500} mb="xs">📊 Browse by Metrics</Text>
                  <Text size="sm" c="dimmed">
                    Discover highly cited authors and track their publication patterns
                  </Text>
                </div>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="md">
                <div>
                  <Text fw={500} mb="xs">🏛️ Institution Networks</Text>
                  <Text size="sm" c="dimmed">
                    Explore author affiliations and institutional collaborations
                  </Text>
                </div>
                <div>
                  <Text fw={500} mb="xs">🔗 Research Connections</Text>
                  <Text size="sm" c="dimmed">
                    Follow citation networks and co-authorship relationships
                  </Text>
                </div>
              </Stack>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Search Hint */}
        <Card withBorder radius="md" p="lg" bg="blue.0">
          <Group>
            <IconUser size={24} />
            <div>
              <Text fw={500} mb="xs">Start Exploring</Text>
              <Text size="sm">
                Use the search bar above to find specific authors, or browse through institution pages to discover researchers in your field of interest.
              </Text>
            </div>
          </Group>
        </Card>
      </Stack>
    </div>
  );
}

export const Route = createFileRoute('/authors')({
  component: AuthorsOverviewPage,
});