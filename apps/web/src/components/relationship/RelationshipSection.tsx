/**
 * RelationshipSection component
 * Displays a grouped section of relationships by type (e.g., "Citations", "Authors", "Affiliations")
 * Shows relationship type label, count badge, and list of relationship items
 *
 * @module RelationshipSection
 * @see specs/016-entity-relationship-viz/spec.md
 */

import { Stack, Group, Text, Badge, Paper, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import React from 'react';

import type { RelationshipSection as RelationshipSectionType } from '@/types/relationship';

import { RelationshipList } from './RelationshipList';


export interface RelationshipSectionProps {
  /** The relationship section data to display */
  section: RelationshipSectionType;

  /** Optional callback when "Load more" is clicked */
  onLoadMore?: () => void;

  /** Whether more items are currently being loaded */
  isLoadingMore?: boolean;
}

/**
 * Displays a section of grouped relationships
 * Shows type label, count, and paginated list of relationship items
 */
export const RelationshipSection: React.FC<RelationshipSectionProps> = ({
  section,
  onLoadMore,
  isLoadingMore,
}) => {
  const testId = `relationship-section-${section.type}-${section.direction}`;

  return (
    <Paper
      p="md"
      style={{ border: "1px solid var(--mantine-color-gray-3)" }}
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

        {/* Partial data warning */}
        {section.isPartialData && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Incomplete Data"
            color="yellow"
            variant="light"
            data-testid="partial-data-warning"
          >
            Relationship data may be incomplete. The graph visualization is still loading or only shows a subset of available relationships.
          </Alert>
        )}

        {/* Relationship list */}
        <RelationshipList section={section} onLoadMore={onLoadMore} isLoadingMore={isLoadingMore} />
      </Stack>
    </Paper>
  );
};
