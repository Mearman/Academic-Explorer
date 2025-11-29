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
    // When selectedTypes is empty, it means "all types" - so clicking unchecks one
    if (selectedTypes.length === 0) {
      // Uncheck this type by selecting all others
      onChange(availableTypes.filter((t) => t !== type));
      return;
    }

    const isCurrentlySelected = selectedTypes.includes(type);

    if (isCurrentlySelected) {
      // Remove from selection
      const newSelection = selectedTypes.filter((t) => t !== type);
      // If removing would leave empty, keep at least this one or go back to "all"
      onChange(newSelection);
    } else {
      // Add to selection - if this completes all types, reset to empty (meaning "all")
      const newSelection = [...selectedTypes, type];
      if (newSelection.length === availableTypes.length) {
        onChange([]);
      } else {
        onChange(newSelection);
      }
    }
  };

  // Handle clear all (deselect all - show nothing)
  const handleClearAll = () => {
    // Clear means no filters, which in this UI means "all types"
    // But the button should reset to empty array (all types shown)
    onChange([]);
  };

  // Handle select all (explicitly select all types, then normalize to empty)
  const handleSelectAll = () => {
    onChange([]);
  };

  // All selected means either explicitly all selected OR empty (which means "all")
  const allSelected = selectedTypes.length === 0;
  // None explicitly selected (but empty means "all", so this is for UI state)
  const hasExplicitSelection = selectedTypes.length > 0;

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
              disabled={!hasExplicitSelection}
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
