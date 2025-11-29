/**
 * Filter component for entity types
 * Allows filtering autocomplete/search by EntityType with checkboxes
 */

import type { EntityType } from "@bibgraph/types";
import { ENTITY_METADATA } from "@bibgraph/types";
import {
  Badge,
  Button,
  Checkbox,
  Group,
  Paper,
  Stack,
  Title,
} from "@mantine/core";
import React from "react";

/**
 * Entity types that support autocomplete endpoints
 */
export const AUTOCOMPLETE_ENTITY_TYPES: EntityType[] = [
  "works",
  "authors",
  "sources",
  "institutions",
  "topics",
  "concepts",
  "publishers",
  "funders",
];

export interface EntityTypeFilterProps {
  /** Currently selected entity types (empty = all) */
  selectedTypes: EntityType[];

  /** Callback when filter changes */
  onChange: (types: EntityType[]) => void;

  /** Available entity types to show (defaults to AUTOCOMPLETE_ENTITY_TYPES) */
  availableTypes?: EntityType[];

  /** Optional title for the filter section */
  title?: string;

  /** Show as inline chips instead of vertical list */
  inline?: boolean;
}

/**
 * Component for filtering by entity type
 * Displays checkboxes or chips for each EntityType
 */
export const EntityTypeFilter: React.FC<EntityTypeFilterProps> = ({
  selectedTypes,
  onChange,
  availableTypes = AUTOCOMPLETE_ENTITY_TYPES,
  title = "Entity Types",
  inline = false,
}) => {
  // Handle checkbox toggle
  const handleToggle = (type: EntityType) => {
    const isCurrentlySelected = selectedTypes.includes(type);

    if (isCurrentlySelected) {
      // Remove from selection
      onChange(selectedTypes.filter((t) => t !== type));
    } else {
      // Add to selection
      onChange([...selectedTypes, type]);
    }
  };

  // Handle clear all (select none)
  const handleClearAll = () => {
    onChange([]);
  };

  // Handle select all
  const handleSelectAll = () => {
    onChange([...availableTypes]);
  };

  const allSelected =
    selectedTypes.length === availableTypes.length ||
    selectedTypes.length === 0;
  const noneSelected = selectedTypes.length === 0;

  if (inline) {
    return (
      <Group gap="xs" wrap="wrap" data-testid="entity-type-filter-inline">
        {availableTypes.map((type) => {
          const metadata = ENTITY_METADATA[type];
          const isChecked =
            selectedTypes.length === 0 || selectedTypes.includes(type);

          return (
            <Badge
              key={type}
              variant={isChecked ? "filled" : "outline"}
              color={metadata.color}
              style={{ cursor: "pointer" }}
              onClick={() => handleToggle(type)}
              data-testid={`filter-badge-${type}`}
            >
              {metadata.plural}
            </Badge>
          );
        })}
      </Group>
    );
  }

  return (
    <Paper p="md" withBorder data-testid="entity-type-filter">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={3} size="h4">
            {title}
          </Title>
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

        <Group gap="xs" wrap="wrap">
          {availableTypes.map((type) => {
            const metadata = ENTITY_METADATA[type];
            const isChecked =
              selectedTypes.length === 0 || selectedTypes.includes(type);

            return (
              <Checkbox
                key={type}
                label={
                  <Badge variant="light" color={metadata.color} size="sm">
                    {metadata.plural}
                  </Badge>
                }
                checked={isChecked}
                onChange={() => handleToggle(type)}
                data-testid={`filter-checkbox-${type}`}
              />
            );
          })}
        </Group>
      </Stack>
    </Paper>
  );
};
