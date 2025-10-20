import type { Topic } from "@academic-explorer/client";
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { ActionIcon, Badge, Card, Group, Stack, Text } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import React from "react";

export interface TopicCardProps {
  topic: Topic;
  onNavigate?: (path: string) => void;
  className?: string;
  showHierarchy?: boolean;
}

/**
 * Specialized card component for displaying Topic entities
 * Shows name, description, field/subfield/domain hierarchy, and works count
 */
export const TopicCard: React.FC<TopicCardProps> = ({
  topic,
  onNavigate,
  className,
  showHierarchy = true,
}) => {
  const href = `/topics/${topic.id}`;

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
          <Badge color="violet" variant="light">
            Topic
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
          {topic.display_name}
        </Text>

        {/* Description */}
        {topic.description && (
          <Text size="sm" c="dimmed" lineClamp={2}>
            {topic.description}
          </Text>
        )}

        {/* Hierarchy */}
        {showHierarchy && (
          <Stack gap="xs">
            {topic.domain && (
              <Text size="xs" c="dimmed">
                Domain: {topic.domain.display_name}
              </Text>
            )}
            {topic.field && (
              <Text size="xs" c="dimmed">
                Field: {topic.field.display_name}
              </Text>
            )}
            {topic.subfield && (
              <Text size="xs" c="dimmed">
                Subfield: {topic.subfield.display_name}
              </Text>
            )}
          </Stack>
        )}

        {/* Keywords */}
        {topic.keywords && topic.keywords.length > 0 && (
          <Group gap="xs">
            {topic.keywords.slice(0, 3).map((keyword, index) => (
              <Badge key={index} color="gray" variant="dot" size="sm">
                {keyword}
              </Badge>
            ))}
            {topic.keywords.length > 3 && (
              <Text size="xs" c="dimmed">
                +{topic.keywords.length - 3} more
              </Text>
            )}
          </Group>
        )}

        {/* Metrics */}
        <Group gap="md">
          <Text size="sm" c="dimmed">
            <Text component="span" fw={500}>
              {topic.works_count?.toLocaleString() || 0}
            </Text>{" "}
            works
          </Text>
          <Text size="sm" c="dimmed">
            <Text component="span" fw={500}>
              {topic.cited_by_count?.toLocaleString() || 0}
            </Text>{" "}
            citations
          </Text>
        </Group>

        {/* OpenAlex ID */}
        <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
          {topic.id}
        </Text>
      </Stack>
    </Card>
  );
};
