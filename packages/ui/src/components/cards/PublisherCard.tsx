import type { Publisher } from "@academic-explorer/client";
import { ActionIcon, Badge, Card, Group, Stack, Text } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import React from "react";

export interface PublisherCardProps {
  publisher: Publisher;
  onNavigate?: (path: string) => void;
  className?: string;
}

/**
 * Specialized card component for displaying Publisher entities
 * Shows name, sources count, works count, and hierarchy level
 */
export const PublisherCard: React.FC<PublisherCardProps> = ({
  publisher,
  onNavigate,
  className,
}) => {
  const href = `/publishers/${publisher.id}`;

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
        {/* Header with type badge */}
        <Group justify="space-between" wrap="nowrap">
          <Badge color="pink" variant="light">
            Publisher
          </Badge>
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
          {publisher.display_name}
        </Text>

        {/* Hierarchy level */}
        {publisher.hierarchy_level !== undefined && (
          <Badge color="gray" variant="dot" size="sm">
            Level {publisher.hierarchy_level}
          </Badge>
        )}

        {/* Country codes */}
        {publisher.country_codes && publisher.country_codes.length > 0 && (
          <Group gap="xs">
            {publisher.country_codes.slice(0, 3).map((code, index) => (
              <Badge key={index} color="gray" variant="outline" size="sm">
                {code}
              </Badge>
            ))}
            {publisher.country_codes.length > 3 && (
              <Text size="xs" c="dimmed">
                +{publisher.country_codes.length - 3} more
              </Text>
            )}
          </Group>
        )}

        {/* Metrics */}
        <Group gap="md">
          <Text size="sm" c="dimmed">
            <Text component="span" fw={500}>
              {publisher.sources_count?.toLocaleString() || 0}
            </Text>{" "}
            sources
          </Text>
          <Text size="sm" c="dimmed">
            <Text component="span" fw={500}>
              {publisher.works_count?.toLocaleString() || 0}
            </Text>{" "}
            works
          </Text>
        </Group>

        <Text size="sm" c="dimmed">
          <Text component="span" fw={500}>
            {publisher.cited_by_count?.toLocaleString() || 0}
          </Text>{" "}
          citations
        </Text>

        {/* OpenAlex ID */}
        <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
          {publisher.id}
        </Text>
      </Stack>
    </Card>
  );
};
