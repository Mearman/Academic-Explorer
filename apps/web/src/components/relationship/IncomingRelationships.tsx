/**
 * IncomingRelationships component
 * Displays all incoming relationship sections for an entity
 *
 * @module IncomingRelationships
 * @see specs/016-entity-relationship-viz/spec.md (User Story 1, User Story 3)
 */

import React, { useState, useEffect } from 'react';
import { Stack, Title, Paper, Text, Skeleton } from '@mantine/core';
import type { EntityType } from '@academic-explorer/types';
import { RelationType } from '@academic-explorer/graph';
import { useEntityRelationships } from '@/hooks/use-entity-relationships';
import { RelationshipSection } from './RelationshipSection';
import { RelationshipTypeFilter } from './RelationshipTypeFilter';

export interface IncomingRelationshipsProps {
  /** The entity whose incoming relationships to display */
  entityId: string;

  /** The type of the entity */
  entityType: EntityType;
}

/**
 * Displays incoming relationship sections for an entity
 * Shows all types of relationships where other entities point to this entity
 */
export const IncomingRelationships: React.FC<IncomingRelationshipsProps> = ({
  entityId,
  entityType,
}) => {
  // Filter state with localStorage persistence (T047)
  const storageKey = `entity-relationship-filter-${entityType}-${entityId}`;

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

  const { incoming, incomingCount, outgoingCount, loading, error } = useEntityRelationships(
    entityId,
    entityType,
    {
      types: selectedTypes,
      direction: 'inbound',
    }
  );

  // Show loading skeleton while fetching
  if (loading) {
    return (
      <Stack gap="md" data-testid="incoming-relationships-loading">
        <Title order={2} size="h3">Incoming Relationships</Title>
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
      <Paper p="md" withBorder data-testid="incoming-relationships-error">
        <Text c="red" size="sm">
          Failed to load relationships: {error.message}
        </Text>
      </Paper>
    );
  }

  // Don't render section if no incoming relationships
  if (incoming.length === 0) {
    return null;
  }

  return (
    <Stack gap="md" data-testid="incoming-relationships">
      <Title order={2} size="h3">
        Incoming Relationships
      </Title>

      <RelationshipTypeFilter
        selectedTypes={selectedTypes}
        onChange={setSelectedTypes}
        title="Filter Incoming Relationships"
      />

      {incoming.map((section) => (
        <RelationshipSection key={section.id} section={section} />
      ))}
    </Stack>
  );
};
