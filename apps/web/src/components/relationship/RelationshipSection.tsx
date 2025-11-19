/**
 * RelationshipSection component
 * Displays a grouped section of relationships by type (e.g., "Citations", "Authors", "Affiliations")
 * Shows relationship type label, count badge, and list of relationship items
 *
 * @module RelationshipSection
 * @see specs/016-entity-relationship-viz/spec.md
 */

import React from 'react';
import { Stack, Group, Text, Badge, Paper } from '@mantine/core';
import { RelationshipList } from './RelationshipList';
import type { RelationshipSection as RelationshipSectionType } from '@/types/relationship';

export interface RelationshipSectionProps {
  /** The relationship section data to display */
  section: RelationshipSectionType;

  /** Optional callback when "Load more" is clicked */
  onLoadMore?: () => void;
}

/**
 * Displays a section of grouped relationships
 * Shows type label, count, and paginated list of relationship items
 */
export const RelationshipSection: React.FC<RelationshipSectionProps> = ({
  section,
  onLoadMore,
}) => {
  const testId = `relationship-section-${section.type}-${section.direction}`;

  return (
    <Paper
      p="md"
      withBorder
      data-testid={testId}
    >
      <Stack gap="md">
        {/* Header with label and count */}
        <Group justify="space-between">
          <Group gap="xs">
            <Text fw={600} size="sm">
              {section.label}
            </Text>
            {section.icon && <Text size="sm">{section.icon}</Text>}
          </Group>
          <Badge
            variant="light"
            size="sm"
            data-testid="relationship-count"
          >
            {section.totalCount}
          </Badge>
        </Group>

        {/* Relationship list */}
        <RelationshipList section={section} onLoadMore={onLoadMore} />
      </Stack>
    </Paper>
  );
};
