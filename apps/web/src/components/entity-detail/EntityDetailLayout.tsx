import React, { ReactNode } from "react";
import { Button, Text, Code, Badge, Paper, Stack, Group, Container, Title, Tooltip, ActionIcon } from "@mantine/core";
import { IconEye, IconCode, IconBookmark, IconBookmarkOff, IconBookmarkFilled } from "@tabler/icons-react";
import { logger } from "@/lib/logger";
import { useUserInteractions } from "@/hooks/use-user-interactions";
import { useQueryBookmarking } from "@/hooks/use-query-bookmarking";
import { useThemeColors } from "@/hooks/use-theme-colors";
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
  // Initialize theme colors hook
  const { colors } = useThemeColors();

  // Initialize user interactions hook for entity bookmark functionality
  const userInteractions = useUserInteractions({
    entityId,
    entityType,
    autoTrackVisits: true,
  });

  // Initialize query bookmarking hook for query-specific bookmarking
  const queryBookmarking = useQueryBookmarking({
    entityType,
    entityId,
  });

  const handleBookmarkToggle = async () => {
    try {
      if (userInteractions.isBookmarked) {
        await userInteractions.unbookmarkEntity();
      } else {
        await userInteractions.bookmarkEntity({
          title: displayName,
          notes: `${config.name} from OpenAlex`,
          tags: [config.name.toLowerCase(), "openalex"],
        });
      }
    } catch (error) {
      logger.error("ui", "Failed to toggle bookmark", { error, entityType, entityId });
    }
  };

  const handleQueryBookmarkToggle = async () => {
    try {
      if (queryBookmarking.isQueryBookmarked) {
        await queryBookmarking.unbookmarkCurrentQuery();
      } else {
        await queryBookmarking.bookmarkCurrentQuery({
          title: `${displayName} (Query)`,
          notes: `Query bookmark for ${config.name} with specific parameters`,
          tags: [config.name.toLowerCase(), "query", "entity-query"]
        });
      }
    } catch (error) {
      logger.error("ui", "Failed to toggle query bookmark", { error, entityType, entityId });
    }
  };
  return (
    <Container size="lg" p="xl" bg="var(--mantine-color-body)" style={{ minHeight: "100vh" }}>
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

              <Paper p="md" radius="lg" withBorder bg="var(--mantine-color-body)">
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

            <Group gap="sm">
              {/* Entity Bookmark Button */}
              <Tooltip
                label={userInteractions.isBookmarked ? "Remove entity bookmark" : "Bookmark this entity"}
                position="bottom"
              >
                <ActionIcon
                  size="lg"
                  variant={userInteractions.isBookmarked ? "filled" : "light"}
                  color={userInteractions.isBookmarked ? "yellow" : "gray"}
                  onClick={handleBookmarkToggle}
                  loading={userInteractions.isLoadingBookmarks}
                >
                  {userInteractions.isBookmarked ? (
                    <IconBookmark size={20} fill="currentColor" />
                  ) : (
                    <IconBookmarkOff size={20} />
                  )}
                </ActionIcon>
              </Tooltip>

              {/* Query Bookmark Button - only show if there are query parameters */}
              {(selectParam || Object.keys(queryBookmarking.currentQueryParams).length > 0) && (
                <Tooltip
                  label={
                    queryBookmarking.isQueryBookmarked
                      ? "Remove query bookmark"
                      : "Bookmark this query (ignores pagination)"
                  }
                  position="bottom"
                >
                  <ActionIcon
                    size="lg"
                    variant={queryBookmarking.isQueryBookmarked ? "filled" : "light"}
                    color={queryBookmarking.isQueryBookmarked ? "blue" : "gray"}
                    onClick={handleQueryBookmarkToggle}
                  >
                    {queryBookmarking.isQueryBookmarked ? (
                      <IconBookmarkFilled size={20} />
                    ) : (
                      <IconBookmark size={20} />
                    )}
                  </ActionIcon>
                </Tooltip>
              )}

              <Button
                size="lg"
                variant="light"
                leftSection={viewMode === "raw" ? <IconEye size={20} /> : <IconCode size={20} />}
                onClick={onToggleView}
              >
                {viewMode === "raw" ? "Rich View" : "Raw View"}
              </Button>
            </Group>
          </Group>
        </Paper>

        {/* Content Section */}
        {viewMode === "raw" ? (
          <Paper withBorder radius="xl" style={{ overflow: "hidden" }}>
            <Paper p="md" bg={colors.background.tertiary} style={{ borderBottom: `1px solid ${colors.border.secondary}` }}>
              <Group gap="sm">
                <IconCode size={20} color={colors.text.primary} />
                <Text size="lg" fw={600} c={colors.text.primary}>
                  Raw JSON Data
                </Text>
              </Group>
            </Paper>
            <Paper p="xl" bg={colors.background.secondary} style={{ overflowX: "auto", maxHeight: "1000px" }}>
              <Text
                component="pre"
                size="sm"
                c={colors.text.primary}
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
