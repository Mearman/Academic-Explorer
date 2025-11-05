import React from "react";
import { Loader, Paper, Stack, Container, Title, Code } from "@mantine/core";
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

  return (
    <Container size="sm" p="xl" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Paper p="xl" radius="xl" withBorder w="100%" maw="32rem">
        <Stack align="center" gap="lg">
          <Loader size="xl" color={loaderColor} />
          <Title order={2} ta="center">
            Loading {entityType}...
          </Title>
          <Code style={{ wordBreak: "break-all" }}>
            {entityId}
          </Code>
        </Stack>
      </Paper>
    </Container>
  );
}
