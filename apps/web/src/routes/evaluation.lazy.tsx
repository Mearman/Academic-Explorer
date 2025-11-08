import { createLazyFileRoute } from "@tanstack/react-router";
/**
 * Main evaluation dashboard for STAR methodology integration
 * Provides PhD thesis evaluation capabilities using systematic literature reviews
 */

import { logger } from "@academic-explorer/utils/logger";
import {
  IconBulb,
  IconChartBar,
  IconSearch,
  IconTrendingUp,
} from "@tabler/icons-react";
import { useNavigate, Link } from "@tanstack/react-router";
import {
  Container,
  Title,
  Text,
  Card,
  Group,
  Stack,
  Button,
  ThemeIcon,
  SimpleGrid,
  Paper,
} from "@mantine/core";


function EvaluationDashboard() {
  const navigate = useNavigate();

  return (
    <Container size="xl" p="xl" mx="auto">
      {/* Header */}
      <Stack mb="xl">
        <Title order={1} fw={700} c="gray.9" mb="sm">
          STAR Methodology Evaluation
        </Title>
        <Text
          size="md"
          c="dimmed"
          lineClamp={3}
          maw={800}
        >
          Evaluate Academic Explorer&apos;s literature discovery capabilities
          against published systematic literature reviews using the STAR
          (Systematic Literature Review) methodology. This provides quantitative
          metrics for precision, recall, and F1-score analysis required for PhD
          thesis evaluation.
        </Text>
      </Stack>

      {/* Dashboard Cards */}
      <SimpleGrid
        cols={{ base: 1, sm: 2, lg: 3 }}
        spacing="lg"
        mb="xl"
      >
        {/* Datasets Card */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <ThemeIcon color="blue" size={40} radius="md">
              <IconChartBar size={20} />
            </ThemeIcon>
          </Group>

          <Text fw={600} size="lg" c="gray.9" mb="xs">
            STAR Datasets
          </Text>

          <Text size="sm" c="dimmed" mb="md" lineClamp={3}>
            Upload and manage systematic literature review datasets for ground
            truth comparison
          </Text>

          <Button
            variant="filled"
            color="blue"
            component={Link}
            to="/evaluation/datasets"
            onClick={() => {
              logger.debug(
                "ui",
                "Navigate to datasets clicked",
                {},
                "EvaluationDashboard",
              );
            }}
            fullWidth
          >
            Manage Datasets
          </Button>
        </Card>

        {/* Comparison Card */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <ThemeIcon color="green" size={40} radius="md">
              <IconSearch size={20} />
            </ThemeIcon>
          </Group>

          <Text fw={600} size="lg" c="gray.9" mb="xs">
            Run Comparisons
          </Text>

          <Text size="sm" c="dimmed" mb="md" lineClamp={3}>
            Execute Academic Explorer searches against STAR datasets and
            calculate precision/recall metrics
          </Text>

          <Button
            variant="filled"
            color="gray"
            disabled
            fullWidth
            mb="xs"
          >
            Start Comparison
          </Button>

          <Text size="xs" c="gray.5" ta="center">
            Requires datasets to be uploaded first
          </Text>
        </Card>

        {/* Results Card */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <ThemeIcon color="yellow" size={40} radius="md">
              <IconTrendingUp size={20} />
            </ThemeIcon>
          </Group>

          <Text fw={600} size="lg" c="gray.9" mb="xs">
            Results & Analytics
          </Text>

          <Text size="sm" c="dimmed" mb="md" lineClamp={3}>
            View detailed comparison results, precision/recall charts, and
            thesis-ready statistics
          </Text>

          <Button
            variant="filled"
            color="gray"
            disabled
            fullWidth
            mb="xs"
          >
            View Results
          </Button>

          <Text size="xs" c="gray.5" ta="center">
            No comparison results available yet
          </Text>
        </Card>
      </SimpleGrid>

      {/* Methodology Information */}
      <Paper
        bg="gray.0"
        p="lg"
        radius="md"
        withBorder
      >
        <Title order={2} fw={600} c="gray.9" mb="md">
          STAR Methodology Overview
        </Title>

        <SimpleGrid
          cols={{ base: 1, sm: 2, lg: 4 }}
          spacing="lg"
        >
          <Stack gap="xs">
            <Text size="sm" fw={600} c="gray.7">
              1. Dataset Upload
            </Text>
            <Text size="xs" c="dimmed" lineClamp={3}>
              Import existing systematic literature reviews as CSV/JSON with
              included/excluded papers
            </Text>
          </Stack>

          <Stack gap="xs">
            <Text size="sm" fw={600} c="gray.7">
              2. Search Replication
            </Text>
            <Text size="xs" c="dimmed" lineClamp={3}>
              Run Academic Explorer searches using original STAR search criteria
              and strategies
            </Text>
          </Stack>

          <Stack gap="xs">
            <Text size="sm" fw={600} c="gray.7">
              3. Paper Matching
            </Text>
            <Text size="xs" c="dimmed" lineClamp={3}>
              Match discovered papers to ground truth using DOI, title, and
              OpenAlex ID fuzzy matching
            </Text>
          </Stack>

          <Stack gap="xs">
            <Text size="sm" fw={600} c="gray.7">
              4. Metrics Calculation
            </Text>
            <Text size="xs" c="dimmed" lineClamp={3}>
              Calculate precision, recall, F1-score, and identify additional
              papers for innovation metrics
            </Text>
          </Stack>
        </SimpleGrid>

        <Paper
          mt="md"
          p="md"
          radius="sm"
          withBorder
          bg="white"
        >
          <Text size="xs" c="gray.7" fs="italic">
            <Group gap={4} mb="xs">
              <IconBulb size={14} />
              <Text span fw={600}>PhD Evaluation Context:</Text>
            </Group>
            {" "}
            This evaluation demonstrates Academic Explorer&apos;s ability to
            improve upon existing systematic reviews by identifying previously
            missed papers and providing more efficient literature discovery
            pathways. Results provide quantitative evidence for thesis Chapter 6
            evaluation.
          </Text>
        </Paper>
      </Paper>
    </Container>
  );
}

export const Route = createLazyFileRoute("/evaluation")({
  component: EvaluationDashboard,
});

export default EvaluationDashboard;
