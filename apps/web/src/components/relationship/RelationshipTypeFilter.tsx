/**
 * Filter component for relationship types
 * Allows filtering relationship sections by RelationType with checkboxes
 *
 * @module RelationshipTypeFilter
 * @see specs/016-entity-relationship-viz/spec.md (User Story 3)
 */

import React from 'react';
import { Stack, Checkbox, Group, Button, Paper, Title } from '@mantine/core';
import { RelationType } from '@academic-explorer/types';
import { RELATIONSHIP_TYPE_LABELS } from '@/types/relationship';

export interface RelationshipTypeFilterProps {
  /** Currently selected relationship types (empty = all) */
  selectedTypes: RelationType[];

  /** Callback when filter changes */
  onChange: (types: RelationType[]) => void;

  /** Optional title for the filter section */
  title?: string;
}

/**
 * Component for filtering relationships by type
 * Displays checkboxes for each RelationType with "Clear all" button
 */
export const RelationshipTypeFilter: React.FC<RelationshipTypeFilterProps> = ({
  selectedTypes,
  onChange,
  title = 'Filter by Relationship Type',
}) => {
  // Get all available relationship types (unique values only, excluding deprecated aliases)
  const allTypes = React.useMemo(() => {
    const values = Object.values(RelationType);
    const seen = new Set<string>();
    return values.filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }, []);

  // Handle checkbox toggle
  const handleToggle = (type: RelationType) => {
    const isCurrentlySelected = selectedTypes.includes(type);

    if (isCurrentlySelected) {
      // Remove from selection
      onChange(selectedTypes.filter((t) => t !== type));
    } else {
      // Add to selection
      onChange([...selectedTypes, type]);
    }
  };

  // Handle clear all
  const handleClearAll = () => {
    onChange([]);
  };

  // Handle select all
  const handleSelectAll = () => {
    onChange(allTypes);
  };

  const allSelected = selectedTypes.length === allTypes.length || selectedTypes.length === 0;
  const noneSelected = selectedTypes.length === 0;

  return (
    <Paper p="md" withBorder data-testid="relationship-type-filter">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={3} size="h4">{title}</Title>
          <Group gap="xs">
            <Button
              size="xs"
              variant="subtle"
              onClick={handleSelectAll}
              disabled={allSelected}
              data-testid="select-all-button"
            >
              Select All
            </Button>
            <Button
              size="xs"
              variant="subtle"
              onClick={handleClearAll}
              disabled={noneSelected}
              data-testid="clear-all-button"
            >
              Clear All
            </Button>
          </Group>
        </Group>

        <Stack gap="xs">
          {allTypes.map((type) => {
            const label = RELATIONSHIP_TYPE_LABELS[type] || type;
            const isChecked = selectedTypes.length === 0 || selectedTypes.includes(type);

            return (
              <Checkbox
                key={type}
                label={label}
                checked={isChecked}
                onChange={() => handleToggle(type)}
                data-testid={`filter-checkbox-${type}`}
              />
            );
          })}
        </Stack>
      </Stack>
    </Paper>
  );
};
