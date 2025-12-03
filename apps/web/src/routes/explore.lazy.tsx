import { Container, Stack,Text, Title } from "@mantine/core";
import { createLazyFileRoute } from "@tanstack/react-router";

const GraphExplorer = () => <Container size="xl" py="md">
      <Stack align="center" justify="center" h="50vh" gap="md">
        <Title order={2}>Explore</Title>
        <Text c="dimmed">Graph exploration interface - Navigate to view content</Text>
      </Stack>
    </Container>;

export const Route = createLazyFileRoute("/explore")({
  component: GraphExplorer,
});

export default GraphExplorer;
