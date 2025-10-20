import type { Source } from "@academic-explorer/client";
import { isSource } from "@academic-explorer/client";
import { ActionIcon, Badge, Card, Group, Stack, Text } from "@mantine/core";
import { IconExternalLink, IconLockOpen } from "@tabler/icons-react";
import React from "react";

export interface SourceCardProps {
  source: Source;
  onNavigate?: (path: string) => void;
  className?: string;
}

/**
 * Specialized card component for displaying Source entities (journals, conferences)
 * Shows name, publisher, ISSN, open access status, and APC info
 */
export const SourceCard: React.FC<SourceCardProps> = ({
  source,
  onNavigate,
  className,
}) => {
  // Type guard to ensure source is valid
  if (!isSource(source)) {
    return (
      <Card className={className}>
        <Text c="red">Invalid source data</Text>
      </Card>
    );
  }

  // Use source data directly (validation should happen at API/client level)
  const validatedSource = source;

  const href = `/sources/${validatedSource.id}`;

  const handleClick = () => {
    if (onNavigate) {
      onNavigate(href);
    }
  };

  return (
    <Card
      shadow="sm"
      padding="md"
      radius="md"
      withBorder
      className={className}
      style={{ cursor: "pointer" }}
      onClick={handleClick}
    >
      <Stack gap="sm">
        {/* Header with type badge and OA status */}
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs">
            <Badge color="purple" variant="light">
              Source
            </Badge>
            {validatedSource.is_oa && (
              <Badge
                color="green"
                variant="light"
                leftSection={<IconLockOpen size={12} />}
              >
                Open Access
              </Badge>
            )}
          </Group>
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (onNavigate) onNavigate(href);
            }}
          >
            <IconExternalLink size={16} />
          </ActionIcon>
        </Group>

        {/* Name */}
        <Text fw={600} size="md" lineClamp={2}>
          {validatedSource.display_name}
        </Text>

        {/* Publisher */}
        {validatedSource.publisher && (
          <Text size="sm" c="dimmed" lineClamp={1}>
            Publisher: {validatedSource.publisher}
          </Text>
        )}

        {/* Source type and ISSN */}
        <Group gap="xs">
          {validatedSource.type && (
            <Badge color="gray" variant="dot" size="sm">
              {validatedSource.type}
            </Badge>
          )}
          {validatedSource.issn_l && (
            <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
              ISSN: {validatedSource.issn_l}
            </Text>
          )}
        </Group>

        {/* Metrics */}
        <Group gap="md">
          <Text size="sm" c="dimmed">
            <Text component="span" fw={500}>
              {validatedSource.works_count?.toLocaleString() || 0}
            </Text>{" "}
            works
          </Text>
          <Text size="sm" c="dimmed">
            <Text component="span" fw={500}>
              {validatedSource.cited_by_count?.toLocaleString() || 0}
            </Text>{" "}
            citations
          </Text>
        </Group>

        {/* APC info */}
        {validatedSource.apc_usd !== undefined &&
          validatedSource.apc_usd > 0 && (
            <Text size="sm" c="dimmed">
              APC: ${validatedSource.apc_usd.toLocaleString()} USD
            </Text>
          )}

        {/* OpenAlex ID */}
        <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
          {validatedSource.id}
        </Text>
      </Stack>
    </Card>
  );
};
