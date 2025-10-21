import type { Funder } from "@academic-explorer/types";
import { isFunder } from "@academic-explorer/types";
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
  // Type guard to ensure funder is valid
  if (!isFunder(funder)) {
    return (
      <Card className={className}>
        <Text c="red">Invalid funder data</Text>
      </Card>
    );
  }

  // Use funder data directly (validation should happen at API/client level)
  const validatedFunder = funder;

  const href = `/funders/${validatedFunder.id}`;

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
            {validatedFunder.homepage_url && (
              <Anchor
                href={validatedFunder.homepage_url}
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
          {validatedFunder.display_name}
        </Text>

        {/* Description */}
        {validatedFunder.description && (
          <Text size="sm" c="dimmed" lineClamp={2}>
            {validatedFunder.description}
          </Text>
        )}

        {/* Country */}
        {validatedFunder.country_code && (
          <Badge color="gray" variant="outline" size="sm">
            {validatedFunder.country_code}
          </Badge>
        )}

        {/* Metrics */}
        <Group gap="md">
          {validatedFunder.grants_count !== undefined && (
            <Text size="sm" c="dimmed">
              <Text component="span" fw={500}>
                {validatedFunder.grants_count.toLocaleString()}
              </Text>{" "}
              grants
            </Text>
          )}
          <Text size="sm" c="dimmed">
            <Text component="span" fw={500}>
              {validatedFunder.works_count?.toLocaleString() || 0}
            </Text>{" "}
            works
          </Text>
        </Group>

        <Text size="sm" c="dimmed">
          <Text component="span" fw={500}>
            {validatedFunder.cited_by_count?.toLocaleString() || 0}
          </Text>{" "}
          citations
        </Text>

        {/* Summary stats */}
        {validatedFunder.summary_stats && (
          <Group gap="md">
            <Text size="sm" c="dimmed">
              h-index:{" "}
              <Text component="span" fw={500}>
                {validatedFunder.summary_stats.h_index}
              </Text>
            </Text>
            <Text size="sm" c="dimmed">
              i10:{" "}
              <Text component="span" fw={500}>
                {validatedFunder.summary_stats.i10_index}
              </Text>
            </Text>
          </Group>
        )}

        {/* OpenAlex ID */}
        <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
          {validatedFunder.id}
        </Text>
      </Stack>
    </Card>
  );
};
