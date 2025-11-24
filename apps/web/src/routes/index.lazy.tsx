import { createLazyFileRoute } from "@tanstack/react-router";
import { Container, Title, Text } from "@mantine/core";

export const Route = createLazyFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <Container>
      <Title>Academic Explorer</Title>
      <Text>
        Welcome to Academic Explorer. The graph and simulation features have been removed.
      </Text>
    </Container>
  );
}
