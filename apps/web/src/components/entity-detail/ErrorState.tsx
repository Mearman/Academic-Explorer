import { Alert, Code, Container, Flex,Group, Paper, Stack, Text, Title } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import React from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from "@/config/style-constants";

interface ErrorStateProps {
  entityType: string;
  entityId: string;
  error: unknown;
}

export const ErrorState = ({ entityType, entityId, error }: ErrorStateProps) => <Container size="md" p="xl" data-testid="error-state">
      <Flex h="100vh" justify="center" align="center">
        <Paper p="xl" radius="xl" style={{ border: BORDER_STYLE_GRAY_3 }} w="100%" maw="48rem">
          <Stack gap="lg">
            <Group justify="center" mb="md">
              <Alert variant="light" color="red" radius="xl" p="lg" w="fit-content">
                <IconAlertCircle size={ICON_SIZE.HERO} />
              </Alert>
            </Group>

            <Title order={2} ta="center" c="red">
              Error Loading {entityType}
            </Title>

            <Stack gap="md">
              <Paper p="md" radius="lg" style={{ border: BORDER_STYLE_GRAY_3 }} bg="var(--mantine-color-red-light-0)">
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
    </Container>;
