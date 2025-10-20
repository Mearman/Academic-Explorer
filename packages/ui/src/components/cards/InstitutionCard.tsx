import type { InstitutionEntity } from "@academic-explorer/client";
import { isInstitution } from "@academic-explorer/client";
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
  // Type guard to ensure institution is valid
  if (!isInstitution(institution)) {
    return (
      <Card className={className}>
        <Text c="red">Invalid institution data</Text>
      </Card>
    );
  }

  // Use institution data directly (validation should happen at API/client level)
  const validatedInstitution = institution;

  const href = `/institutions/${validatedInstitution.id}`;

  const handleClick = () => {
    if (onNavigate) {
      onNavigate(href);
    }
  };

  // Build location string
  const location = [
    validatedInstitution.geo?.city,
    validatedInstitution.geo?.country,
  ]
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
          {validatedInstitution.display_name}
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
        {validatedInstitution.type && (
          <Badge color="gray" variant="dot" size="sm">
            {validatedInstitution.type}
          </Badge>
        )}

        {/* Metrics */}
        <Group gap="md">
          <Text size="sm" c="dimmed">
            <Text component="span" fw={500}>
              {validatedInstitution.works_count?.toLocaleString() || 0}
            </Text>{" "}
            works
          </Text>
          <Text size="sm" c="dimmed">
            <Text component="span" fw={500}>
              {validatedInstitution.cited_by_count?.toLocaleString() || 0}
            </Text>{" "}
            citations
          </Text>
        </Group>

        {/* OpenAlex ID */}
        <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
          {validatedInstitution.id}
        </Text>
      </Stack>
    </Card>
  );
};
