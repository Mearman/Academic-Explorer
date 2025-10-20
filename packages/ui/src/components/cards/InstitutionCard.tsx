import type { InstitutionEntity } from "@academic-explorer/client";
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { ActionIcon, Badge, Card, Group, Stack, Text } from "@mantine/core";
import { IconExternalLink, IconMapPin } from "@tabler/icons-react";
import React from "react";

export interface InstitutionCardProps {
  institution: InstitutionEntity;
  onNavigate?: (path: string) => void;
  className?: string;
}

/**
 * Specialized card component for displaying Institution entities
 * Shows name, location, type, works count, and citation count
 */
export const InstitutionCard: React.FC<InstitutionCardProps> = ({
  institution,
  onNavigate,
  className,
}) => {
  const href = `/institutions/${institution.id}`;

  const handleClick = () => {
    if (onNavigate) {
      onNavigate(href);
    }
  };

  // Build location string
  const location = [institution.geo?.city, institution.geo?.country]
    .filter(Boolean)
    .join(", ");

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
          <Badge color="orange" variant="light">
            Institution
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
          {institution.display_name}
        </Text>

        {/* Location */}
        {location && (
          <Group gap="xs">
            <IconMapPin size={16} />
            <Text size="sm" c="dimmed" lineClamp={1}>
              {location}
            </Text>
          </Group>
        )}

        {/* Institution type */}
        {institution.type && (
          <Badge color="gray" variant="dot" size="sm">
            {institution.type}
          </Badge>
        )}

        {/* Metrics */}
        <Group gap="md">
          <Text size="sm" c="dimmed">
            <Text component="span" fw={500}>
              {institution.works_count?.toLocaleString() || 0}
            </Text>{" "}
            works
          </Text>
          <Text size="sm" c="dimmed">
            <Text component="span" fw={500}>
              {institution.cited_by_count?.toLocaleString() || 0}
            </Text>{" "}
            citations
          </Text>
        </Group>

        {/* OpenAlex ID */}
        <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
          {institution.id}
        </Text>
      </Stack>
    </Card>
  );
};
