import React from "react";
import { Text, Code, Stack, Container, Paper, Title, Alert, Group, Flex } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

interface ErrorStateProps {
  entityType: string;
  entityId: string;
  error: unknown;
}

export function ErrorState({ entityType, entityId, error }: ErrorStateProps) {
  return (
    <Container size="md" p="xl">
      <Flex h="100vh" justify="center" align="center">
        <Paper p="xl" radius="xl" withBorder w="100%" maw="48rem">
          <Stack gap="lg">
            <Group justify="center" mb="md">
              <Alert variant="light" color="red" radius="xl" p="lg" w="fit-content">
                <IconAlertCircle size={40} />
              </Alert>
            </Group>

            <Title order={2} ta="center" c="red">
              Error Loading {entityType}
            </Title>

            <Stack gap="md">
              <Paper p="md" radius="lg" withBorder bg="var(--mantine-color-red-light-0)">
                <Stack gap="xs">
                  <Text size="sm" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                    {entityType} ID:
                  </Text>
                  <Code block style={{ wordBreak: "break-all", fontFamily: "monospace" }}>
                    {entityId}
                  </Code>
                </Stack>
              </Paper>

              <Alert variant="light" color="red" title="Error Details">
                <Code block style={{ wordBreak: "break-all", fontFamily: "monospace", color: "var(--mantine-color-red-8)" }}>
                  {String(error)}
                </Code>
              </Alert>
            </Stack>
          </Stack>
        </Paper>
      </Flex>
    </Container>
  );
}
