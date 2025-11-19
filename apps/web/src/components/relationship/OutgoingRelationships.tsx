/**
 * OutgoingRelationships component
 * Displays all outgoing relationship sections for an entity
 *
 * @module OutgoingRelationships
 * @see specs/016-entity-relationship-viz/spec.md (User Story 2, User Story 3)
 */

import React, { useState, useEffect } from 'react';
import { Stack, Title, Paper, Text, Skeleton } from '@mantine/core';
import type { EntityType } from '@academic-explorer/types';
import { RelationType } from '@academic-explorer/graph';
import { useEntityRelationships } from '@/hooks/use-entity-relationships';
import { RelationshipSection } from './RelationshipSection';
import { RelationshipTypeFilter } from './RelationshipTypeFilter';

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
  // Filter state with localStorage persistence (T047)
  const storageKey = `entity-relationship-filter-${entityType}-${entityId}-outgoing`;

  const [selectedTypes, setSelectedTypes] = useState<RelationType[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      // Ignore parse errors, use empty array
    }
    return [];
  });

  // Persist filter state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(selectedTypes));
    } catch (error) {
      // Ignore storage errors (e.g., quota exceeded)
    }
  }, [selectedTypes, storageKey]);

  const { outgoing, incomingCount, outgoingCount, loading, error } = useEntityRelationships(
    entityId,
    entityType,
    {
      types: selectedTypes,
      direction: 'outbound',
    }
  );

  // Show loading skeleton while fetching
  if (loading) {
    return (
      <Stack gap="md" data-testid="outgoing-relationships-loading">
        <Title order={2} size="h3">Outgoing Relationships</Title>
        <Paper p="md" withBorder>
          <Skeleton height={8} width="40%" mb="sm" />
          <Skeleton height={8} width="60%" mb="xs" />
          <Skeleton height={8} width="50%" />
        </Paper>
        <Paper p="md" withBorder>
          <Skeleton height={8} width="35%" mb="sm" />
          <Skeleton height={8} width="55%" mb="xs" />
          <Skeleton height={8} width="45%" />
        </Paper>
      </Stack>
    );
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

      <RelationshipTypeFilter
        selectedTypes={selectedTypes}
        onChange={setSelectedTypes}
        title="Filter Outgoing Relationships"
      />

      {outgoing.map((section) => (
        <RelationshipSection key={section.id} section={section} />
      ))}
    </Stack>
  );
};
