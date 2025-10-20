import type { Author } from "@academic-explorer/client";
import { isAuthor } from "@academic-explorer/client";
import {
  ActionIcon,
  Anchor,
  Badge,
  Card,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import React from "react";

export interface AuthorCardProps {
  author: Author;
  onNavigate?: (path: string) => void;
  className?: string;
  showAffiliations?: boolean;
}

/**
 * Specialized card component for displaying Author entities
 * Shows name, affiliations, h-index, works count, ORCID, and citation metrics
 */
export const AuthorCard: React.FC<AuthorCardProps> = ({
  author,
  onNavigate,
  className,
  showAffiliations = true,
}) => {
  // Type guard to ensure author is valid
  if (!isAuthor(author)) {
    return (
      <Card className={className}>
        <Text c="red">Invalid author data</Text>
      </Card>
    );
  }

  // Use author data directly (validation should happen at API/client level)
  const validatedAuthor = author;

  const href = `/authors/${validatedAuthor.id}`;

  const handleClick = () => {
    if (onNavigate) {
      onNavigate(href);
    }
  };

  // Get primary affiliation
  const primaryInstitution =
    validatedAuthor.last_known_institutions?.[0]?.display_name;

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
        {/* Header with type badge and ORCID */}
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs">
            <Badge color="green" variant="light">
              Author
            </Badge>
            {validatedAuthor.orcid && (
              <Anchor
                href={validatedAuthor.orcid}
                target="_blank"
                size="xs"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                ORCID
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
          {validatedAuthor.display_name}
        </Text>

        {/* Affiliation */}
        {showAffiliations && primaryInstitution && (
          <Text size="sm" c="dimmed" lineClamp={1}>
            {primaryInstitution}
          </Text>
        )}

        {/* Summary stats */}
        {validatedAuthor.summary_stats && (
          <Group gap="md">
            <Text size="sm" c="dimmed">
              h-index:{" "}
              <Text component="span" fw={500}>
                {validatedAuthor.summary_stats.h_index}
              </Text>
            </Text>
            <Text size="sm" c="dimmed">
              i10:{" "}
              <Text component="span" fw={500}>
                {validatedAuthor.summary_stats.i10_index}
              </Text>
            </Text>
          </Group>
        )}

        {/* Metrics */}
        <Group gap="md">
          <Text size="sm" c="dimmed">
            <Text component="span" fw={500}>
              {validatedAuthor.works_count?.toLocaleString() || 0}
            </Text>{" "}
            works
          </Text>
          <Text size="sm" c="dimmed">
            <Text component="span" fw={500}>
              {validatedAuthor.cited_by_count?.toLocaleString() || 0}
            </Text>{" "}
            citations
          </Text>
        </Group>

        {/* OpenAlex ID */}
        <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
          {validatedAuthor.id}
        </Text>
      </Stack>
    </Card>
  );
};
