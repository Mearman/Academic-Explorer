/**
 * RelationshipCounts component
 * Displays summary count badges for all relationships (incoming, outgoing, total)
 *
 * @module RelationshipCounts
 * @see specs/016-entity-relationship-viz/spec.md (User Story 4)
 */

import { Group, Badge, Paper, Text } from '@mantine/core';
import React from 'react';

export interface RelationshipCountsProps {
  /** Total number of incoming relationships */
  incomingCount: number;

  /** Total number of outgoing relationships */
  outgoingCount: number;

  /** Optional: Show grand total badge */
  showGrandTotal?: boolean;
}

/**
 * Displays summary badges showing relationship counts
 * Shows total incoming, outgoing, and optionally grand total
 */
export const RelationshipCounts: React.FC<RelationshipCountsProps> = ({
  incomingCount,
  outgoingCount,
  showGrandTotal = true,
}) => {
  const grandTotal = incomingCount + outgoingCount;

  // Don't render if no relationships
  if (grandTotal === 0) {
    return null;
  }

  return (
    <Paper p="md" style={{ border: "1px solid var(--mantine-color-gray-3)" }} data-testid="relationship-counts">
      <Group gap="md">
        <Text size="sm" fw={600}>Total Relationships:</Text>

        <Badge
          variant="light"
          color="blue"
          size="lg"
          data-testid="incoming-count-badge"
        >
          {incomingCount} Incoming
        </Badge>

        <Badge
          variant="light"
          color="green"
          size="lg"
          data-testid="outgoing-count-badge"
        >
          {outgoingCount} Outgoing
        </Badge>

        {showGrandTotal && (
          <Badge
            variant="filled"
            color="gray"
            size="lg"
            data-testid="grand-total-badge"
          >
            {grandTotal} Total
          </Badge>
        )}
      </Group>
    </Paper>
  );
};
