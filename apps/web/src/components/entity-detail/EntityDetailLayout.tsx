import React, { ReactNode } from "react";
import { Button, Text, Code, Badge, Paper, Stack, Group, Container, Title } from "@mantine/core";
import { IconEye, IconCode } from "@tabler/icons-react";
import { EntityTypeConfig, EntityType } from "./EntityTypeConfig";
import { EntityDataDisplay } from "../EntityDataDisplay";

interface EntityDetailLayoutProps {
  config: EntityTypeConfig;
  entityType: EntityType;
  entityId: string;
  displayName: string;
  selectParam?: string;
  selectFields: string[];
  viewMode: "raw" | "rich";
  onToggleView: () => void;
  data: Record<string, unknown>;
  children?: ReactNode;
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

export function EntityDetailLayout({
  config,
  entityType,
  entityId,
  displayName,
  selectParam,
  selectFields,
  viewMode,
  onToggleView,
  data,
  children,
}: EntityDetailLayoutProps) {
  return (
    <Container size="lg" p="xl" bg="var(--mantine-color-gray-0)" style={{ minHeight: "100vh" }}>
      <Stack gap="xl">
        {/* Header Section */}
        <Paper p="xl" radius="xl" withBorder>
          <Group align="flex-start" justify="space-between" gap="xl">
            <Stack gap="lg" flex={1}>
              <Badge
                size="xl"
                variant="light"
                color={getMantineColor(entityType)}
                leftSection={
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                    {config.icon}
                  </svg>
                }
              >
                {config.name}
              </Badge>

              <Title order={1} size="h1" c="var(--mantine-color-text)">
                {displayName}
              </Title>

              <Paper p="md" radius="lg" withBorder bg="var(--mantine-color-gray-0)">
                <Stack gap="sm">
                  <Group align="flex-start" gap="sm">
                    <Text size="sm" fw={600} c="dimmed" miw="100px">
                      {config.name} ID:
                    </Text>
                    <Code style={{ flex: 1, wordBreak: "break-all" }}>
                      {entityId}
                    </Code>
                  </Group>
                  <Group align="flex-start" gap="sm">
                    <Text size="sm" fw={600} c="dimmed" miw="100px">
                      Select fields:
                    </Text>
                    <Text size="sm" c="dimmed" style={{ flex: 1 }}>
                      {selectParam && typeof selectParam === 'string'
                        ? selectParam
                        : `default (${selectFields.length} fields)`}
                    </Text>
                  </Group>
                </Stack>
              </Paper>
            </Stack>

            <Button
              size="lg"
              variant="light"
              leftSection={viewMode === "raw" ? <IconEye size={20} /> : <IconCode size={20} />}
              onClick={onToggleView}
            >
              {viewMode === "raw" ? "Rich View" : "Raw View"}
            </Button>
          </Group>
        </Paper>

        {/* Content Section */}
        {viewMode === "raw" ? (
          <Paper withBorder radius="xl" style={{ overflow: "hidden" }}>
            <Paper p="md" bg="var(--mantine-color-dark-8)" style={{ borderBottom: "1px solid var(--mantine-color-dark-4)" }}>
              <Group gap="sm">
                <IconCode size={20} color="var(--mantine-color-dark-0)" />
                <Text size="lg" fw={600} c="var(--mantine-color-dark-0)">
                  Raw JSON Data
                </Text>
              </Group>
            </Paper>
            <Paper p="xl" bg="var(--mantine-color-dark-9)" style={{ overflowX: "auto", maxHeight: "1000px" }}>
              <Text
                component="pre"
                size="sm"
                c="var(--mantine-color-dark-0)"
                style={{
                  fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
                  whiteSpace: "pre",
                  lineHeight: 1.6
                }}
              >
                {JSON.stringify(data, null, 2)}
              </Text>
            </Paper>
          </Paper>
        ) : (
          <>
            <EntityDataDisplay data={data} />
            {children}
          </>
        )}
      </Stack>
    </Container>
  );
}
