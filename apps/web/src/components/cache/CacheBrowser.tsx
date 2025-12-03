import { Container, Paper,Text, Title } from "@mantine/core";

/**
 * Placeholder component for the removed CacheBrowser functionality
 */
export const CacheBrowser = () => <Container size="lg" py="xl">
      <Paper p="xl">
        <Title order={1}>Cache Browser</Title>
        <Text mt="md" c="dimmed">
          The Cache Browser component has been temporarily removed during application cleanup.
          This functionality may be restored in a future version.
        </Text>
        <Text mt="sm" c="dimmed">
          For cache management, please use the CLI tools: `pnpm cli cache:*`
        </Text>
      </Paper>
    </Container>;