import type { Source } from "@academic-explorer/client";
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
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
  const href = `/sources/${source.id}`;

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
            {source.is_oa && (
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
          {source.display_name}
        </Text>

        {/* Publisher */}
        {source.publisher && (
          <Text size="sm" c="dimmed" lineClamp={1}>
            Publisher: {source.publisher}
          </Text>
        )}

        {/* Source type and ISSN */}
        <Group gap="xs">
          {source.type && (
            <Badge color="gray" variant="dot" size="sm">
              {source.type}
            </Badge>
          )}
          {source.issn_l && (
            <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
              ISSN: {source.issn_l}
            </Text>
          )}
        </Group>

        {/* Metrics */}
        <Group gap="md">
          <Text size="sm" c="dimmed">
            <Text component="span" fw={500}>
              {source.works_count?.toLocaleString() || 0}
            </Text>{" "}
            works
          </Text>
          <Text size="sm" c="dimmed">
            <Text component="span" fw={500}>
              {source.cited_by_count?.toLocaleString() || 0}
            </Text>{" "}
            citations
          </Text>
        </Group>

        {/* APC info */}
        {source.apc_usd !== undefined && source.apc_usd > 0 && (
          <Text size="sm" c="dimmed">
            APC: ${source.apc_usd.toLocaleString()} USD
          </Text>
        )}

        {/* OpenAlex ID */}
        <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
          {source.id}
        </Text>
      </Stack>
    </Card>
  );
};
