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
  IconTags, 
  IconBrain, 
  IconNetwork,
  IconTrendingUp
} from '@tabler/icons-react';
import { createFileRoute } from '@tanstack/react-router';

function TopicsOverviewPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Stack gap="xl">
        {/* Header */}
        <Card withBorder radius="md" p="xl">
          <Group mb="lg">
            <IconTags size={32} />
            <div>
              <Title order={1}>Topics</Title>
              <Text size="lg" c="dimmed">
                Explore research areas, fields, and academic topics across all disciplines
              </Text>
            </div>
          </Group>
        </Card>

        {/* Overview Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <IconBrain size={48} style={{ color: 'var(--mantine-color-blue-6)' }} />
                <Title order={3} ta="center">Knowledge Mapping</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Machine-learned topic hierarchies and research area classifications
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <IconNetwork size={48} style={{ color: 'var(--mantine-color-green-6)' }} />
                <Title order={3} ta="center">Interdisciplinary Links</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Discover connections between research areas and emerging fields
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <IconTrendingUp size={48} style={{ color: 'var(--mantine-color-violet-6)' }} />
                <Title order={3} ta="center">Trending Research</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Track emerging topics and fast-growing research areas
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <Badge size="xl" variant="light" color="orange">
                  65K+
                </Badge>
                <Title order={3} ta="center">Research Topics</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Over 65,000 topics organized in a comprehensive hierarchy
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Topic Levels */}
        <Card withBorder radius="md" p="xl">
          <Title order={2} mb="lg">Topic Hierarchy</Title>
          <Grid>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="blue.0">
                <Text fw={500} mb="xs">🔵 Level 0 - Domains</Text>
                <Text size="sm" c="dimmed">
                  Broad academic domains like Physical Sciences, Life Sciences
                </Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="green.0">
                <Text fw={500} mb="xs">🟢 Level 1 - Fields</Text>
                <Text size="sm" c="dimmed">
                  Major fields like Physics, Biology, Computer Science
                </Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="violet.0">
                <Text fw={500} mb="xs">🟣 Level 2 - Subfields</Text>
                <Text size="sm" c="dimmed">
                  Specialized areas like Machine Learning, Genetics
                </Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="orange.0">
                <Text fw={500} mb="xs">🟠 Level 3 - Specialties</Text>
                <Text size="sm" c="dimmed">
                  Specific research topics like Deep Learning, CRISPR
                </Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="red.0">
                <Text fw={500} mb="xs">🔴 Level 4 - Techniques</Text>
                <Text size="sm" c="dimmed">
                  Specific methods and techniques within specialties
                </Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="teal.0">
                <Text fw={500} mb="xs">🔷 Level 5 - Applications</Text>
                <Text size="sm" c="dimmed">
                  Highly specific applications and implementations
                </Text>
              </Paper>
            </Grid.Col>
          </Grid>
        </Card>

        {/* How to Use */}
        <Card withBorder radius="md" p="xl">
          <Title order={2} mb="lg">How to Explore Topics</Title>
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="md">
                <div>
                  <Text fw={500} mb="xs">🔍 Search by Keyword</Text>
                  <Text size="sm" c="dimmed">
                    Find topics by name, description, or related research terms
                  </Text>
                </div>
                <div>
                  <Text fw={500} mb="xs">📊 Browse by Activity</Text>
                  <Text size="sm" c="dimmed">
                    Discover active research areas and trending topics
                  </Text>
                </div>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="md">
                <div>
                  <Text fw={500} mb="xs">🌐 Navigate Hierarchy</Text>
                  <Text size="sm" c="dimmed">
                    Explore topic relationships and interdisciplinary connections
                  </Text>
                </div>
                <div>
                  <Text fw={500} mb="xs">📈 Track Evolution</Text>
                  <Text size="sm" c="dimmed">
                    Follow how research topics emerge, grow, and evolve over time
                  </Text>
                </div>
              </Stack>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Search Hint */}
        <Card withBorder radius="md" p="lg" bg="blue.0">
          <Group>
            <IconTags size={24} />
            <div>
              <Text fw={500} mb="xs">Start Exploring</Text>
              <Text size="sm">
                Use the search bar above to find specific research topics, or explore work and author pages to discover their associated research areas.
              </Text>
            </div>
          </Group>
        </Card>
      </Stack>
    </div>
  );
}

export const Route = createFileRoute('/topics')({
  component: TopicsOverviewPage,
});