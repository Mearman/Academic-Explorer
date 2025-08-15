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
  IconCurrencyDollar, 
  IconBuilding, 
  IconWorld,
  IconChartPie
} from '@tabler/icons-react';
import { createFileRoute } from '@tanstack/react-router';

function FundersOverviewPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Stack gap="xl">
        {/* Header */}
        <Card withBorder radius="md" p="xl">
          <Group mb="lg">
            <IconCurrencyDollar size={32} />
            <div>
              <Title order={1}>Funders</Title>
              <Text size="lg" c="dimmed">
                Explore funding agencies, foundations, and organizations supporting research
              </Text>
            </div>
          </Group>
        </Card>

        {/* Overview Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <IconWorld size={48} style={{ color: 'var(--mantine-color-blue-6)' }} />
                <Title order={3} ta="center">Global Funding</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Government agencies, private foundations, and international organizations
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <IconChartPie size={48} style={{ color: 'var(--mantine-color-green-6)' }} />
                <Title order={3} ta="center">Investment Analysis</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Track funding patterns and research investment trends
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <IconBuilding size={48} style={{ color: 'var(--mantine-color-violet-6)' }} />
                <Title order={3} ta="center">Institution Impact</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Discover which institutions and researchers receive funding
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Stack gap="md" align="center" h="100%" justify="center">
                <Badge size="xl" variant="light" color="orange">
                  25K+
                </Badge>
                <Title order={3} ta="center">Funding Organizations</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Over 25,000 funders from government, private, and nonprofit sectors
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Search Hint */}
        <Card withBorder radius="md" p="lg" bg="blue.0">
          <Group>
            <IconCurrencyDollar size={24} />
            <div>
              <Text fw={500} mb="xs">Start Exploring</Text>
              <Text size="sm">
                Use the search bar above to find specific funding organizations, or explore work pages to discover funding acknowledgments and grant information.
              </Text>
            </div>
          </Group>
        </Card>
      </Stack>
    </div>
  );
}

export const Route = createFileRoute('/funders')({
  component: FundersOverviewPage,
});