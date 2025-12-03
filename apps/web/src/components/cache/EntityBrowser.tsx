import { Container, Paper,Text, Title } from "@mantine/core";

/**
 * Placeholder component for the removed EntityBrowser functionality
 */
export const EntityBrowser = () => <Container size="lg" py="xl">
      <Paper p="xl">
        <Title order={1}>Entity Browser</Title>
        <Text mt="md" c="dimmed">
          The Entity Browser component has been temporarily removed during application cleanup.
          This functionality may be restored in a future version.
        </Text>
        <Text mt="sm" c="dimmed">
          For entity exploration, please use the main search functionality.
        </Text>
      </Paper>
    </Container>;