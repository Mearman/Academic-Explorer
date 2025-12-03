import { Container, Stack,Text, Title } from "@mantine/core";
import { createLazyFileRoute } from "@tanstack/react-router";

/**
 * Integrated graph exploration route
 * Content is rendered inside the root MainLayout
 */
const GraphExplorer = () => <Container size="xl" py="md">
      <Stack align="center" justify="center" h="50vh" gap="md">
        <Title order={2}>Graph Explorer</Title>
        <Text c="dimmed">Graph exploration interface - Navigate to view content</Text>
      </Stack>
    </Container>;

export const Route = createLazyFileRoute("/explore/graph")({
  component: GraphExplorer,
});

export default GraphExplorer;
