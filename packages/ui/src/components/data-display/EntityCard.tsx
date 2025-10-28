import type { EntityType } from "@academic-explorer/types";
import { Badge, Card, Group, Stack, Text } from "@mantine/core";
import { forwardRef } from "react";

export interface EntityCardProps {
  id: string;
  displayName: string;
  entityType: EntityType;
  worksCount?: number;
  citedByCount?: number;
  description?: string;
  tags?: Array<{ label: string; color?: string }>;
  onClick?: () => void;
  onNavigate?: (path: string) => void;
}

export const EntityCard = forwardRef<HTMLDivElement, EntityCardProps>(
  (
    {
      id,
      displayName,
      entityType,
      worksCount,
      citedByCount,
      description,
      tags,
      onClick,
      onNavigate,
    },
    ref
  ) => {
    const handleClick = () => {
      if (onClick) {
        onClick();
      } else if (onNavigate) {
        // Generate path based on entity type
        const entityPath = `/${entityType}s/${id}`;
        onNavigate(entityPath);
      }
    };

    return (
      <Card
        ref={ref}
        shadow="sm"
        padding="lg"
        radius="md"
        withBorder
        style={{ cursor: onClick || onNavigate ? "pointer" : "default" }}
        onClick={handleClick}
      >
        <Stack gap="xs">
          <Group justify="space-between" align="flex-start">
            <Text fw={500} size="lg" lineClamp={2}>
              {displayName}
            </Text>
            <Badge color="blue" variant="light" size="sm">
              {entityType}
            </Badge>
          </Group>

          {description && (
            <Text size="sm" c="dimmed" lineClamp={3}>
              {description}
            </Text>
          )}

          {(worksCount !== undefined || citedByCount !== undefined) && (
            <Group gap="md" mt="xs">
              {worksCount !== undefined && (
                <Text size="sm" c="dimmed">
                  Works: <Text span fw={500}>{worksCount.toLocaleString()}</Text>
                </Text>
              )}
              {citedByCount !== undefined && (
                <Text size="sm" c="dimmed">
                  Citations: <Text span fw={500}>{citedByCount.toLocaleString()}</Text>
                </Text>
              )}
            </Group>
          )}

          {tags && tags.length > 0 && (
            <Group gap="xs" mt="xs">
              {tags.map((tag, index) => (
                <Badge
                  key={`${tag.label}-${index}`}
                  color={tag.color || "gray"}
                  variant="dot"
                  size="sm"
                >
                  {tag.label}
                </Badge>
              ))}
            </Group>
          )}
        </Stack>
      </Card>
    );
  }
);

EntityCard.displayName = "EntityCard";
