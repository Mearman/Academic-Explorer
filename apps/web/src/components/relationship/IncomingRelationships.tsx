/**
 * IncomingRelationships component
 * Displays all incoming relationship sections for an entity
 *
 * @module IncomingRelationships
 * @see specs/016-entity-relationship-viz/spec.md (User Story 1, User Story 3)
 */

import React, { useState, useEffect } from 'react';
import { Stack, Title, Paper, Text, Skeleton, Button, Group } from '@mantine/core';
import type { EntityType } from '@academic-explorer/types';
import { RelationType } from '@academic-explorer/types';
import { useEntityRelationships } from '@/hooks/use-entity-relationships';
import { useEntityRelationshipsFromData } from '@/hooks/use-entity-relationships-from-data';
import { useEntityRelationshipQueries } from '@/hooks/use-entity-relationship-queries';
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

  // Try graph-based relationships first
  const graphRelationships = useEntityRelationships(
    entityId,
    entityType,
    {
      types: selectedTypes,
      direction: 'inbound',
    }
  );

  // Query for API-based relationships (works, citing works, etc.)
  const apiRelationships = useEntityRelationshipQueries(entityId, entityType);

  // Fall back to embedded data-based relationships if graph and API have no data
  const dataRelationships = useEntityRelationshipsFromData(entityData, entityType);

  // Choose which source to use with priority: graph > API queries > embedded data
  const hasGraphData = graphRelationships.incoming.length > 0 || graphRelationships.loading;
  const hasApiData = apiRelationships.incoming.length > 0 || apiRelationships.loading;

  let incoming, loading, error;

  if (hasGraphData) {
    // Priority 1: Graph-based relationships (when entities are in graph)
    incoming = graphRelationships.incoming;
    loading = graphRelationships.loading;
    error = graphRelationships.error;
  } else if (hasApiData) {
    // Priority 2: API-queried relationships (e.g., works by author)
    incoming = apiRelationships.incoming;
    loading = apiRelationships.loading;
    error = apiRelationships.error;
  } else {
    // Priority 3: Embedded data relationships (fallback)
    incoming = dataRelationships.incoming;
    loading = false;
    error = graphRelationships.error; // Preserve graph errors even when falling back
  }

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
    const handleRetry = () => {
      // Reload the page to retry graph loading
      window.location.reload();
    };

    return (
      <Paper p="md" withBorder data-testid="incoming-relationships-error">
        <Stack gap="sm">
          <Text c="red" size="sm">
            Failed to load relationships: {error.message}
          </Text>
          {error.retryable && (
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
          )}
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
