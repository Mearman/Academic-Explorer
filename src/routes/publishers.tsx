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
  IconBookmarks, 
  IconTrendingUp, 
  IconWorldWww,
  IconBuilding
} from '@tabler/icons-react';
import { createFileRoute } from '@tanstack/react-router';

function PublishersOverviewPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Stack gap="xl">
        {/* Header */}
        <Card withBorder radius="md" p="xl">
          <Group mb="lg">
            <IconBookmarks size={32} />
            <div>
              <Title order={1}>Publishers</Title>
              <Text size="lg" c="dimmed">
                Explore academic publishers, university presses, and publishing houses
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
                <Title order={3} ta="center">Market Analysis</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Track publishing trends and market share across disciplines
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <IconWorldWww size={48} style={{ color: 'var(--mantine-color-green-6)' }} />
                <Title order={3} ta="center">Open Access</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Compare open access policies and publication accessibility
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <IconBuilding size={48} style={{ color: 'var(--mantine-color-violet-6)' }} />
                <Title order={3} ta="center">Portfolio Analysis</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Explore publisher portfolios and journal collections
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <Badge size="xl" variant="light" color="orange">
                  8K+
                </Badge>
                <Title order={3} ta="center">Publishing Houses</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Over 8,000 publishers from academic to commercial organizations
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Search Hint */}
        <Card withBorder radius="md" p="lg" bg="blue.0">
          <Group>
            <IconBookmarks size={24} />
            <div>
              <Text fw={500} mb="xs">Start Exploring</Text>
              <Text size="sm">
                Use the search bar above to find specific publishers, or explore source and work pages to discover publishing relationships and imprints.
              </Text>
            </div>
          </Group>
        </Card>
      </Stack>
    </div>
  );
}

export const Route = createFileRoute('/publishers')({
  component: PublishersOverviewPage,
});