import type { EntityType } from "@academic-explorer/types";
import { ActionIcon, Badge, Card, Group, Stack, Text } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import React from "react";
import { getEntityColor } from "../entity-views/matchers/utils";

export interface EntityCardProps {
  id: string;
  displayName: string;
  entityType: EntityType;
  worksCount?: number;
  citedByCount?: number;
  description?: string;
  tags?: Array<{ label: string; color?: string }>;
  onNavigate?: (path: string) => void;
  href?: string;
  className?: string;
}

// Entity colors are now sourced from taxonomy for consistency

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  works: "Work",
  authors: "Author",
  sources: "Source",
  institutions: "Institution",
  publishers: "Publisher",
  funders: "Funder",
  topics: "Topic",
  concepts: "Concept",
  keywords: "Keyword",
};

/**
 * Base entity card component that can display any OpenAlex entity type
 * with common fields and consistent styling
 */
export const EntityCard: React.FC<EntityCardProps> = ({
  id,
  displayName,
  entityType,
  worksCount,
  citedByCount,
  description,
  tags = [],
  onNavigate,
  href,
  className,
}) => {
  const handleClick = () => {
    if (href && onNavigate) {
      onNavigate(href);
    }
  };

  const isClickable = !!href && !!onNavigate;

  // If we have an href, render as an anchor for browser navigation features
  if (href) {
    return (
      <Card
        component="a"
        href={href}
        shadow="sm"
        padding="md"
        radius="md"
        withBorder
        className={className}
        style={{ textDecoration: "none", color: "inherit" }}
        onClick={(e: React.MouseEvent) => {
          // If onNavigate is provided and it's a left click, handle navigation
          if (
            onNavigate &&
            e.button === 0 &&
            !e.ctrlKey &&
            !e.metaKey &&
            !e.shiftKey &&
            !e.altKey
          ) {
            e.preventDefault();
            // Extract the path from href (remove the # prefix for router navigation)
            const path = href.startsWith("#/") ? href.slice(1) : href;
            onNavigate(path);
          }
          // For middle-click, ctrl+click, etc., let the browser handle the anchor navigation
        }}
      >
        <Stack gap="sm">
          {/* Header with entity type badge */}
          <Group justify="space-between" wrap="nowrap">
            <Badge color={getEntityColor(entityType)} variant="light">
              {ENTITY_TYPE_LABELS[entityType as EntityType]}
            </Badge>
            {href && (
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
            )}
          </Group>

          {/* Title/Display Name */}
          <Text fw={600} size="md" lineClamp={2}>
            {displayName}
          </Text>

          {/* Description */}
          {description && (
            <Text size="sm" c="dimmed" lineClamp={3}>
              {description}
            </Text>
          )}

          {/* Metrics */}
          {(worksCount !== undefined || citedByCount !== undefined) && (
            <Group gap="md">
              {worksCount !== undefined && (
                <Text size="sm" c="dimmed">
                  <Text component="span" fw={500}>
                    {worksCount.toLocaleString()}
                  </Text>{" "}
                  works
                </Text>
              )}
              {citedByCount !== undefined && (
                <Text size="sm" c="dimmed">
                  <Text component="span" fw={500}>
                    {citedByCount.toLocaleString()}
                  </Text>{" "}
                  citations
                </Text>
              )}
            </Group>
          )}

          {/* Additional tags */}
          {tags.length > 0 && (
            <Group gap="xs">
              {tags.map((tag, index) => (
                <Badge
                  key={index}
                  color={tag.color || "gray"}
                  variant="dot"
                  size="sm"
                >
                  {tag.label}
                </Badge>
              ))}
            </Group>
          )}

          {/* OpenAlex ID */}
          <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
            {id}
          </Text>
        </Stack>
      </Card>
    );
  }

  // Fallback: render as regular card when no href
  return (
    <Card
      shadow="sm"
      padding="md"
      radius="md"
      withBorder
      className={className}
      style={isClickable ? { cursor: "pointer" } : undefined}
      onClick={isClickable ? handleClick : undefined}
    >
      <Stack gap="sm">
        {/* Header with entity type badge */}
        <Group justify="space-between" wrap="nowrap">
          <Badge color={getEntityColor(entityType)} variant="light">
            {ENTITY_TYPE_LABELS[entityType as EntityType]}
          </Badge>
          {href && (
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
          )}
        </Group>

        {/* Title/Display Name */}
        <Text fw={600} size="md" lineClamp={2}>
          {displayName}
        </Text>

        {/* Description */}
        {description && (
          <Text size="sm" c="dimmed" lineClamp={3}>
            {description}
          </Text>
        )}

        {/* Metrics */}
        {(worksCount !== undefined || citedByCount !== undefined) && (
          <Group gap="md">
            {worksCount !== undefined && (
              <Text size="sm" c="dimmed">
                <Text component="span" fw={500}>
                  {worksCount.toLocaleString()}
                </Text>{" "}
                works
              </Text>
            )}
            {citedByCount !== undefined && (
              <Text size="sm" c="dimmed">
                <Text component="span" fw={500}>
                  {citedByCount.toLocaleString()}
                </Text>{" "}
                citations
              </Text>
            )}
          </Group>
        )}

        {/* Additional tags */}
        {tags.length > 0 && (
          <Group gap="xs">
            {tags.map((tag, index) => (
              <Badge
                key={index}
                color={tag.color || "gray"}
                variant="dot"
                size="sm"
              >
                {tag.label}
              </Badge>
            ))}
          </Group>
        )}

        {/* OpenAlex ID */}
        <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
          {id}
        </Text>
      </Stack>
    </Card>
  );
};
