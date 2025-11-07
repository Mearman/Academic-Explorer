import React from "react";
import { Loader, Paper, Stack, Container, Title, Code, Flex, Text } from "@mantine/core";
import { logger } from "@/lib/logger";
import { EntityTypeConfig, EntityType } from "./EntityTypeConfig";

interface LoadingStateProps {
  entityType: string;
  entityId: string;
  config: EntityTypeConfig;
}

// Helper function to map entity types to Mantine colors
function getMantineColor(entityType: EntityType): string {
  const colorMap: Record<EntityType, string> = {
    author: 'blue',
    work: 'violet',
    institution: 'orange',
    source: 'teal',
    concept: 'yellow',
    topic: 'pink',
    publisher: 'indigo',
    funder: 'lime',
  };
  return colorMap[entityType] || 'blue';
}

export function LoadingState({ entityType, entityId, config }: LoadingStateProps) {
  const loaderColor = getMantineColor(config.colorKey as EntityType);

  // Debug logging
  logger.debug("ui", "LoadingState rendering", { entityType, colorKey: config.colorKey });

  return (
    <Container size="sm" p="xl">
      <Flex h="100vh" justify="center" align="center">
        <Paper p="xl" radius="xl" withBorder w="100%" maw="32rem">
          <Stack align="center" gap="lg">
            <Loader size="xl" color={loaderColor} />
            <Title order={2} ta="center">
              Loading {entityType}...
            </Title>
            <Stack gap="xs" w="100%">
              <Text size="sm" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                {entityType} ID:
              </Text>
              <Code style={{ wordBreak: "break-all" }}>
                {entityId}
              </Code>
            </Stack>
          </Stack>
        </Paper>
      </Flex>
    </Container>
  );
}
