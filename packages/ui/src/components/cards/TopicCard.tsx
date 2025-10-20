import type { Topic } from "@academic-explorer/client";
import { topicSchema } from "@academic-explorer/types/entities";
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
  // Validate topic data with Zod schema
  let validatedTopic: Topic;
  try {
    validatedTopic = topicSchema.parse(topic);
  } catch (error) {
    console.error("Invalid topic data:", error);
    return null; // or render an error state
  }

  const href = `/topics/${validatedTopic.id}`;

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
          {validatedTopic.display_name}
        </Text>

        {/* Description */}
        {validatedTopic.description && (
          <Text size="sm" c="dimmed" lineClamp={2}>
            {validatedTopic.description}
          </Text>
        )}

        {/* Hierarchy */}
        {showHierarchy && (
          <Stack gap="xs">
            {validatedTopic.domain && (
              <Text size="xs" c="dimmed">
                Domain: {validatedTopic.domain.display_name}
              </Text>
            )}
            {validatedTopic.field && (
              <Text size="xs" c="dimmed">
                Field: {validatedTopic.field.display_name}
              </Text>
            )}
            {validatedTopic.subfield && (
              <Text size="xs" c="dimmed">
                Subfield: {validatedTopic.subfield.display_name}
              </Text>
            )}
          </Stack>
        )}

        {/* Keywords */}
        {validatedTopic.keywords && validatedTopic.keywords.length > 0 && (
          <Group gap="xs">
            {validatedTopic.keywords.slice(0, 3).map((keyword, index) => (
              <Badge key={index} color="gray" variant="dot" size="sm">
                {keyword}
              </Badge>
            ))}
            {validatedTopic.keywords.length > 3 && (
              <Text size="xs" c="dimmed">
                +{validatedTopic.keywords.length - 3} more
              </Text>
            )}
          </Group>
        )}

        {/* Metrics */}
        <Group gap="md">
          <Text size="sm" c="dimmed">
            <Text component="span" fw={500}>
              {validatedTopic.works_count?.toLocaleString() || 0}
            </Text>{" "}
            works
          </Text>
          <Text size="sm" c="dimmed">
            <Text component="span" fw={500}>
              {validatedTopic.cited_by_count?.toLocaleString() || 0}
            </Text>{" "}
            citations
          </Text>
        </Group>

        {/* OpenAlex ID */}
        <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
          {validatedTopic.id}
        </Text>
      </Stack>
    </Card>
  );
};
