import type { Funder } from "@academic-explorer/client";
import {
  ActionIcon,
  Anchor,
  Badge,
  Card,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { IconExternalLink, IconWorld } from "@tabler/icons-react";
import React from "react";

export interface FunderCardProps {
  funder: Funder;
  onNavigate?: (path: string) => void;
  className?: string;
}

/**
 * Specialized card component for displaying Funder entities
 * Shows name, country, grants count, works count, and homepage link
 */
export const FunderCard: React.FC<FunderCardProps> = ({
  funder,
  onNavigate,
  className,
}) => {
  const href = `/funders/${funder.id}`;

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
        {/* Header with type badge and homepage link */}
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs">
            <Badge color="cyan" variant="light">
              Funder
            </Badge>
            {funder.homepage_url && (
              <Anchor
                href={funder.homepage_url}
                target="_blank"
                size="xs"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <IconWorld size={16} />
              </Anchor>
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
          {funder.display_name}
        </Text>

        {/* Description */}
        {funder.description && (
          <Text size="sm" c="dimmed" lineClamp={2}>
            {funder.description}
          </Text>
        )}

        {/* Country */}
        {funder.country_code && (
          <Badge color="gray" variant="outline" size="sm">
            {funder.country_code}
          </Badge>
        )}

        {/* Metrics */}
        <Group gap="md">
          {funder.grants_count !== undefined && (
            <Text size="sm" c="dimmed">
              <Text component="span" fw={500}>
                {funder.grants_count.toLocaleString()}
              </Text>{" "}
              grants
            </Text>
          )}
          <Text size="sm" c="dimmed">
            <Text component="span" fw={500}>
              {funder.works_count?.toLocaleString() || 0}
            </Text>{" "}
            works
          </Text>
        </Group>

        <Text size="sm" c="dimmed">
          <Text component="span" fw={500}>
            {funder.cited_by_count?.toLocaleString() || 0}
          </Text>{" "}
          citations
        </Text>

        {/* Summary stats */}
        {funder.summary_stats && (
          <Group gap="md">
            <Text size="sm" c="dimmed">
              h-index:{" "}
              <Text component="span" fw={500}>
                {funder.summary_stats.h_index}
              </Text>
            </Text>
            <Text size="sm" c="dimmed">
              i10:{" "}
              <Text component="span" fw={500}>
                {funder.summary_stats.i10_index}
              </Text>
            </Text>
          </Group>
        )}

        {/* OpenAlex ID */}
        <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
          {funder.id}
        </Text>
      </Stack>
    </Card>
  );
};
