/**
 * OutgoingRelationships component
 * Displays all outgoing relationship sections for an entity
 *
 * @module OutgoingRelationships
 * @see specs/016-entity-relationship-viz/spec.md (User Story 2)
 */

import React from 'react';
import { Stack, Title, Paper, Text } from '@mantine/core';
import type { EntityType } from '@academic-explorer/types';
import { useEntityRelationships } from '@/hooks/use-entity-relationships';
import { RelationshipSection } from './RelationshipSection';

export interface OutgoingRelationshipsProps {
  /** The entity whose outgoing relationships to display */
  entityId: string;

  /** The type of the entity */
  entityType: EntityType;
}

/**
 * Displays outgoing relationship sections for an entity
 * Shows all types of relationships where this entity points to other entities
 */
export const OutgoingRelationships: React.FC<OutgoingRelationshipsProps> = ({
  entityId,
  entityType,
}) => {
  const { outgoing, loading, error } = useEntityRelationships(entityId, entityType);

  // Don't render if loading or error
  if (loading) {
    return null; // Entity detail page already handles loading state
  }

  if (error) {
    return (
      <Paper p="md" withBorder data-testid="outgoing-relationships-error">
        <Text c="red" size="sm">
          Failed to load relationships: {error.message}
        </Text>
      </Paper>
    );
  }

  // Don't render section if no outgoing relationships
  if (outgoing.length === 0) {
    return null;
  }

  return (
    <Stack gap="md" data-testid="outgoing-relationships">
      <Title order={2} size="h3">
        Outgoing Relationships
      </Title>
      {outgoing.map((section) => (
        <RelationshipSection key={section.id} section={section} />
      ))}
    </Stack>
  );
};
