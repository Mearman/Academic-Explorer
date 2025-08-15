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
  IconBook, 
  IconChartBar, 
  IconCalendar,
  IconWorldWww
} from '@tabler/icons-react';
import { createFileRoute } from '@tanstack/react-router';

function WorksOverviewPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Stack gap="xl">
        {/* Header */}
        <Card withBorder radius="md" p="xl">
          <Group mb="lg">
            <IconBook size={32} />
            <div>
              <Title order={1}>Works</Title>
              <Text size="lg" c="dimmed">
                Discover academic publications, papers, and scholarly works across all disciplines
              </Text>
            </div>
          </Group>
        </Card>

        {/* Overview Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <IconChartBar size={48} style={{ color: 'var(--mantine-color-blue-6)' }} />
                <Title order={3} ta="center">Citation Analytics</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Track citation counts, impact metrics, and scholarly influence across time
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <IconCalendar size={48} style={{ color: 'var(--mantine-color-green-6)' }} />
                <Title order={3} ta="center">Publication Timeline</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Explore research trends and publication patterns from 1945 to today
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <IconWorldWww size={48} style={{ color: 'var(--mantine-color-violet-6)' }} />
                <Title order={3} ta="center">Open Access</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Find open access publications and track the movement toward open science
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <Badge size="xl" variant="light" color="orange">
                  250M+
                </Badge>
                <Title order={3} ta="center">Scholarly Works</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Over 250 million papers, articles, and publications with full metadata
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Publication Types */}
        <Card withBorder radius="md" p="xl">
          <Title order={2} mb="lg">Publication Types</Title>
          <Grid>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="blue.0">
                <Text fw={500} mb="xs">📄 Journal Articles</Text>
                <Text size="sm" c="dimmed">
                  Peer-reviewed research articles from academic journals worldwide
                </Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="green.0">
                <Text fw={500} mb="xs">📚 Books & Chapters</Text>
                <Text size="sm" c="dimmed">
                  Academic books, edited volumes, and book chapters
                </Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="violet.0">
                <Text fw={500} mb="xs">🎓 Conference Papers</Text>
                <Text size="sm" c="dimmed">
                  Proceedings from academic conferences and symposiums
                </Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="orange.0">
                <Text fw={500} mb="xs">📋 Preprints</Text>
                <Text size="sm" c="dimmed">
                  Early-stage research from preprint servers like arXiv and bioRxiv
                </Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="red.0">
                <Text fw={500} mb="xs">🎯 Dissertations</Text>
                <Text size="sm" c="dimmed">
                  Doctoral dissertations and thesis works
                </Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="md" withBorder radius="sm" bg="teal.0">
                <Text fw={500} mb="xs">📊 Reports & More</Text>
                <Text size="sm" c="dimmed">
                  Technical reports, working papers, and other scholarly outputs
                </Text>
              </Paper>
            </Grid.Col>
          </Grid>
        </Card>

        {/* How to Use */}
        <Card withBorder radius="md" p="xl">
          <Title order={2} mb="lg">How to Explore Works</Title>
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="md">
                <div>
                  <Text fw={500} mb="xs">🔍 Search by Title or DOI</Text>
                  <Text size="sm" c="dimmed">
                    Find specific papers using title keywords, DOI, or OpenAlex ID
                  </Text>
                </div>
                <div>
                  <Text fw={500} mb="xs">📈 Browse by Impact</Text>
                  <Text size="sm" c="dimmed">
                    Discover highly cited papers and emerging research trends
                  </Text>
                </div>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="md">
                <div>
                  <Text fw={500} mb="xs">🏷️ Filter by Topics</Text>
                  <Text size="sm" c="dimmed">
                    Explore works by research area, field, or academic discipline
                  </Text>
                </div>
                <div>
                  <Text fw={500} mb="xs">📅 Timeline Analysis</Text>
                  <Text size="sm" c="dimmed">
                    Track research evolution and publication trends over time
                  </Text>
                </div>
              </Stack>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Search Hint */}
        <Card withBorder radius="md" p="lg" bg="blue.0">
          <Group>
            <IconBook size={24} />
            <div>
              <Text fw={500} mb="xs">Start Exploring</Text>
              <Text size="sm">
                Use the search bar above to find specific publications, or explore author and institution pages to discover their research outputs.
              </Text>
            </div>
          </Group>
        </Card>
      </Stack>
    </div>
  );
}

export const Route = createFileRoute('/works')({
  component: WorksOverviewPage,
});