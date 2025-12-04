import { Alert, Button,Container, Group, Stack, Text, Title } from "@mantine/core";
import { IconHome, IconSearch } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";

const NotFoundRoute = () => {
  return (
    <Container size="md" py="xl">
      <Stack gap="md" align="center">
        <Alert
          title="404 - Page Not Found"
          color="orange"
          variant="light"
          ta="center"
        >
          <Text size="sm">
            The page you are looking for does not exist or has been moved.
          </Text>
        </Alert>

        <Title order={2} c="dimmed">
          404 Error
        </Title>

        <Text c="dimmed" size="sm" ta="center">
          The requested page could not be found.
          <br />
          This resource does not exist or may be invalid.
        </Text>

        <Group>
          <Button
            leftSection={<IconHome size={16} />}
            component="a"
            href="#/"
            variant="filled"
          >
            Go Home
          </Button>
          <Button
            leftSection={<IconSearch size={16} />}
            component="a"
            href="#/search"
            variant="light"
          >
            Search
          </Button>
        </Group>
      </Stack>
    </Container>
  );
};

export const Route = createFileRoute("/_not-found")({
  component: NotFoundRoute,
});