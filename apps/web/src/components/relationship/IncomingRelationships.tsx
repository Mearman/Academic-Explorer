/**
 * IncomingRelationships component
 * Displays all incoming relationship sections for an entity
 *
 * @module IncomingRelationships
 * @see specs/016-entity-relationship-viz/spec.md (User Story 1, User Story 3)
 */

import type { EntityType } from '@bibgraph/types';
import { RelationType } from '@bibgraph/types';
import { Stack, Title, Paper, Text, Skeleton, Button, Group } from '@mantine/core';
import React, { useState, useEffect } from 'react';

import { useEntityRelationshipQueries } from '@/hooks/use-entity-relationship-queries';
import { useEntityRelationshipsFromData } from '@/hooks/use-entity-relationships-from-data';

import { RelationshipSection } from './RelationshipSection';
import { RelationshipTypeFilter } from './RelationshipTypeFilter';

export interface IncomingRelationshipsProps {
  /** The entity whose incoming relationships to display */
  entityId: string;

  /** The type of the entity */
  entityType: EntityType;

  /** Optional raw entity data for fallback when graph context is not available */
  entityData?: Record<string, unknown> | null;
}

/**
 * Displays incoming relationship sections for an entity
 * Shows all types of relationships where other entities point to this entity
 */
export const IncomingRelationships: React.FC<IncomingRelationshipsProps> = ({
  entityId,
  entityType,
  entityData,
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
    } catch {
      // Ignore parse errors, use empty array
    }
    return [];
  });

  // Persist filter state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(selectedTypes));
    } catch {
      // Ignore storage errors (e.g., quota exceeded)
    }
  }, [selectedTypes, storageKey]);

  // Query for API-based relationships (works, citing works, etc.)
  const apiRelationships = useEntityRelationshipQueries(entityId, entityType);

  // Fall back to embedded data-based relationships if API has no data
  const dataRelationships = useEntityRelationshipsFromData(entityData, entityType);

  // Choose which source to use with priority: API queries > embedded data
  const hasApiData = apiRelationships.incoming.length > 0 || apiRelationships.loading;

  let incoming, loading, error;

  if (hasApiData) {
    // Priority 1: API-queried relationships (e.g., works by author)
    incoming = apiRelationships.incoming;
    loading = apiRelationships.loading;
    error = apiRelationships.error;
  } else {
    // Priority 2: Embedded data relationships (fallback)
    incoming = dataRelationships.incoming;
    loading = false;
    error = apiRelationships.error;
  }

  // Show loading skeleton while fetching
  if (loading) {
    return (
      <Stack gap="md" data-testid="incoming-relationships-loading">
        <Title order={2} size="h3">Incoming Relationships</Title>
        <Paper p="md" style={{ border: "1px solid var(--mantine-color-gray-3)" }}>
          <Skeleton height={8} width="40%" mb="sm" />
          <Skeleton height={8} width="60%" mb="xs" />
          <Skeleton height={8} width="50%" />
        </Paper>
        <Paper p="md" style={{ border: "1px solid var(--mantine-color-gray-3)" }}>
          <Skeleton height={8} width="35%" mb="sm" />
          <Skeleton height={8} width="55%" mb="xs" />
          <Skeleton height={8} width="45%" />
        </Paper>
      </Stack>
    );
  }

  if (error) {
    const handleRetry = () => {
      // Reload the page to retry loading
      window.location.reload();
    };

    return (
      <Paper p="md" style={{ border: "1px solid var(--mantine-color-gray-3)" }} data-testid="incoming-relationships-error">
        <Stack gap="sm">
          <Text c="red" size="sm">
            Failed to load relationships: {error.message}
          </Text>
          <Group>
            <Button
              size="xs"
              variant="light"
              color="red"
              onClick={handleRetry}
              data-testid="incoming-relationships-retry-button"
            >
              Retry
            </Button>
          </Group>
        </Stack>
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
