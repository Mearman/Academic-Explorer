import React, { useState, useCallback } from "react";
import {
  Box,
  Paper,
  Title,
  Group,
  Stack,
  Button,
  Badge,
  Text,
  ActionIcon,
  Chip,
  Divider,
  Alert,
} from "@mantine/core";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconPlus,
  IconX,
  IconGripVertical,
  IconFilter,
  IconSearch,
  IconCalendar,
  IconUser,
  IconTags,
  IconInfoCircle,
} from "@tabler/icons-react";
import { logger } from "@academic-explorer/utils";
import type { EntityType } from "@academic-explorer/client";
import type { DragEndEvent, DragStartEvent, UniqueIdentifier } from "@dnd-kit/core";

// Query builder types
export interface QueryFilterChip {
  id: string;
  type: "field" | "operator" | "value";
  field?: string;
  operator?: FilterOperator;
  value?: unknown;
  label: string;
  category: QueryChipCategory;
  entityType?: EntityType;
  dataType: QueryDataType;
  enabled: boolean;
}

export interface QueryGroup {
  id: string;
  operator: LogicalOperator;
  chips: QueryFilterChip[];
  label?: string;
  enabled: boolean;
}

export interface VisualQuery {
  id: string;
  groups: QueryGroup[];
  entityType: EntityType;
  name?: string;
  description?: string;
}

export type FilterOperator = "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "between" | "exists";
export type LogicalOperator = "AND" | "OR" | "NOT";
export type QueryChipCategory = "general" | "temporal" | "entity" | "text" | "numeric" | "boolean";
export type QueryDataType = "string" | "number" | "date" | "boolean" | "entity" | "array";

interface VisualQueryBuilderProps {
  entityType: EntityType;
  initialQuery?: VisualQuery;
  onQueryChange?: (query: VisualQuery) => void;
  onApply?: (query: VisualQuery) => void;
  disabled?: boolean;
  compact?: boolean;
}

// Sortable chip component
interface SortableChipProps {
  chip: QueryFilterChip;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

const SortableChip: React.FC<SortableChipProps> = ({ chip, onRemove, disabled = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: chip.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getChipColor = (category: QueryChipCategory): string => {
    switch (category) {
      case "temporal": return "blue";
      case "entity": return "green";
      case "text": return "violet";
      case "numeric": return "orange";
      case "boolean": return "cyan";
      default: return "gray";
    }
  };

  const getIcon = (category: QueryChipCategory) => {
    switch (category) {
      case "temporal": return <IconCalendar size={14} />;
      case "entity": return <IconUser size={14} />;
      case "text": return <IconSearch size={14} />;
      case "numeric": return <IconTags size={14} />;
      case "boolean": return <IconFilter size={14} />;
      default: return <IconInfoCircle size={14} />;
    }
  };

  return (
    <Box ref={setNodeRef} style={style}>
      <Badge
        variant={chip.enabled ? "filled" : "outline"}
        color={getChipColor(chip.category)}
        size="lg"
        leftSection={getIcon(chip.category)}
        rightSection={
          <Group gap={4}>
            <ActionIcon
              size="xs"
              variant="subtle"
              color="gray"
              {...listeners}
              {...attributes}
              style={{ cursor: isDragging ? "grabbing" : "grab" }}
            >
              <IconGripVertical size={12} />
            </ActionIcon>
            <ActionIcon
              size="xs"
              variant="subtle"
              color="red"
              onClick={() => onRemove(chip.id)}
              disabled={disabled}
            >
              <IconX size={12} />
            </ActionIcon>
          </Group>
        }
        style={{
          paddingRight: "4px",
          cursor: "default",
        }}
      >
        {chip.label}
      </Badge>
    </Box>
  );
};

// Drop zone component
interface DropZoneProps {
  id: string;
  children: React.ReactNode;
  title: string;
  description?: string;
  isEmpty?: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({ id, children, title, description, isEmpty = false }) => {
  return (
    <Paper
      withBorder
      p="md"
      style={{
        minHeight: isEmpty ? "80px" : "auto",
        border: "2px dashed #e5e7eb",
        backgroundColor: isEmpty ? "#f9fafb" : "white",
        transition: "all 0.2s ease",
      }}
      data-drop-zone={id}
    >
      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="sm" fw={500}>
            {title}
          </Text>
          {description && (
            <Text size="xs" c="dimmed">
              {description}
            </Text>
          )}
        </Group>
        <Group gap="xs" wrap="wrap">
          {children}
        </Group>
        {isEmpty && (
          <Text size="xs" c="dimmed" ta="center" style={{ marginTop: "8px" }}>
            Drop filter chips here
          </Text>
        )}
      </Stack>
    </Paper>
  );
};

// Available filter chips for the entity type
const getAvailableChips = (entityType: EntityType): QueryFilterChip[] => {
  const baseChips: QueryFilterChip[] = [
    {
      id: "chip-display-name",
      type: "field",
      field: "display_name",
      label: "Title/Name",
      category: "text",
      dataType: "string",
      enabled: true,
    },
    {
      id: "chip-publication-year",
      type: "field",
      field: "publication_year",
      label: "Publication Year",
      category: "temporal",
      dataType: "number",
      enabled: true,
    },
    {
      id: "chip-cited-by-count",
      type: "field",
      field: "cited_by_count",
      label: "Citation Count",
      category: "numeric",
      dataType: "number",
      enabled: true,
    },
    {
      id: "chip-open-access",
      type: "field",
      field: "open_access",
      label: "Open Access",
      category: "boolean",
      dataType: "boolean",
      enabled: true,
    },
    // Operators
    {
      id: "op-equals",
      type: "operator",
      operator: "equals",
      label: "equals",
      category: "general",
      dataType: "string",
      enabled: true,
    },
    {
      id: "op-contains",
      type: "operator",
      operator: "contains",
      label: "contains",
      category: "general",
      dataType: "string",
      enabled: true,
    },
    {
      id: "op-greater-than",
      type: "operator",
      operator: "greater_than",
      label: "greater than",
      category: "general",
      dataType: "number",
      enabled: true,
    },
    {
      id: "op-less-than",
      type: "operator",
      operator: "less_than",
      label: "less than",
      category: "general",
      dataType: "number",
      enabled: true,
    },
  ];

  // Add entity-specific chips
  if (entityType === "works") {
    baseChips.push(
      {
        id: "chip-type",
        type: "field",
        field: "type",
        label: "Work Type",
        category: "entity",
        dataType: "string",
        enabled: true,
      },
      {
        id: "chip-concepts",
        type: "field",
        field: "concepts",
        label: "Concepts",
        category: "entity",
        dataType: "array",
        enabled: true,
      }
    );
  } else if (entityType === "authors") {
    baseChips.push(
      {
        id: "chip-works-count",
        type: "field",
        field: "works_count",
        label: "Works Count",
        category: "numeric",
        dataType: "number",
        enabled: true,
      },
      {
        id: "chip-h-index",
        type: "field",
        field: "h_index",
        label: "H-Index",
        category: "numeric",
        dataType: "number",
        enabled: true,
      }
    );
  }

  return baseChips;
};

export function VisualQueryBuilder({
  entityType,
  initialQuery,
  onQueryChange,
  onApply,
  disabled = false,
  compact = false,
}: VisualQueryBuilderProps) {
  // Initialize with empty query or provided initial query
  const [query, setQuery] = useState<VisualQuery>(() => {
    if (initialQuery) {
      return initialQuery;
    }
    return {
      id: `query-${Date.now()}`,
      groups: [
        {
          id: `group-${Date.now()}`,
          operator: "AND",
          chips: [],
          enabled: true,
        },
      ],
      entityType,
    };
  });

  const [availableChips] = useState<QueryFilterChip[]>(() => getAvailableChips(entityType));
  const [draggedChip, setDraggedChip] = useState<QueryFilterChip | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const chip = availableChips.find(c => c.id === active.id);
    if (chip) {
      setDraggedChip(chip);
      logger.debug("query-builder", "Drag started", { chipId: chip.id, chipLabel: chip.label });
    }
  }, [availableChips]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    setDraggedChip(null);

    if (!over) {
      logger.debug("query-builder", "Drag cancelled - no drop target");
      return;
    }

    const sourceChip = availableChips.find(c => c.id === active.id);
    if (!sourceChip) {
      logger.warn("query-builder", "Source chip not found", { activeId: active.id });
      return;
    }

    // Handle dropping onto a group
    const targetGroupId = over.id;
    const targetGroup = query.groups.find(g => g.id === targetGroupId);

    if (targetGroup) {
      // Create a copy of the chip with a new ID for the query
      const newChip: QueryFilterChip = {
        ...sourceChip,
        id: `${sourceChip.id}-${Date.now()}`,
      };

      const updatedQuery: VisualQuery = {
        ...query,
        groups: query.groups.map(group =>
          group.id === targetGroupId
            ? { ...group, chips: [...group.chips, newChip] }
            : group
        ),
      };

      setQuery(updatedQuery);
      onQueryChange?.(updatedQuery);

      logger.debug("query-builder", "Chip added to group", {
        chipId: newChip.id,
        groupId: targetGroupId,
        chipLabel: newChip.label
      });
    }
  }, [availableChips, query, onQueryChange]);

  const handleRemoveChip = useCallback((chipId: string) => {
    const updatedQuery: VisualQuery = {
      ...query,
      groups: query.groups.map(group => ({
        ...group,
        chips: group.chips.filter(chip => chip.id !== chipId),
      })),
    };

    setQuery(updatedQuery);
    onQueryChange?.(updatedQuery);

    logger.debug("query-builder", "Chip removed", { chipId });
  }, [query, onQueryChange]);

  const handleAddGroup = useCallback(() => {
    const newGroup: QueryGroup = {
      id: `group-${Date.now()}`,
      operator: "AND",
      chips: [],
      enabled: true,
    };

    const updatedQuery: VisualQuery = {
      ...query,
      groups: [...query.groups, newGroup],
    };

    setQuery(updatedQuery);
    onQueryChange?.(updatedQuery);

    logger.debug("query-builder", "Group added", { groupId: newGroup.id });
  }, [query, onQueryChange]);

  const handleApply = useCallback(() => {
    if (onApply) {
      onApply(query);
      logger.debug("query-builder", "Query applied", {
        groupCount: query.groups.length,
        totalChips: query.groups.reduce((sum, g) => sum + g.chips.length, 0)
      });
    }
  }, [query, onApply]);

  const handleClear = useCallback(() => {
    const clearedQuery: VisualQuery = {
      ...query,
      groups: [
        {
          id: `group-${Date.now()}`,
          operator: "AND",
          chips: [],
          enabled: true,
        },
      ],
    };

    setQuery(clearedQuery);
    onQueryChange?.(clearedQuery);

    logger.debug("query-builder", "Query cleared");
  }, [query, onQueryChange]);

  const hasAnyChips = query.groups.some(group => group.chips.length > 0);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Paper p="md" withBorder>
        <Stack gap="md">
          {/* Header */}
          <Group justify="space-between">
            <Title order={3} size="h4">
              Visual Query Builder
            </Title>
            <Group gap="sm">
              <Button
                variant="subtle"
                leftSection={<IconPlus size={16} />}
                onClick={handleAddGroup}
                disabled={disabled}
                size="sm"
              >
                Add Group
              </Button>
              {onApply && (
                <Button
                  leftSection={<IconSearch size={16} />}
                  onClick={handleApply}
                  disabled={disabled || !hasAnyChips}
                >
                  Apply Query
                </Button>
              )}
            </Group>
          </Group>

          {/* Instructions */}
          <Alert color="blue" variant="light">
            <Text size="sm">
              Drag filter chips from the palette below into query groups to build your search.
              Combine multiple groups with AND/OR logic to create complex queries.
            </Text>
          </Alert>

          {/* Query Groups */}
          <Stack gap="sm">
            {query.groups.map((group, index) => (
              <Box key={group.id}>
                {index > 0 && (
                  <Group justify="center" my="xs">
                    <Chip checked={false} onChange={() => {}}>
                      {group.operator}
                    </Chip>
                  </Group>
                )}
                <SortableContext items={group.chips} strategy={verticalListSortingStrategy}>
                  <DropZone
                    id={group.id}
                    title={`Query Group ${index + 1}`}
                    description={`${group.chips.length} filter${group.chips.length === 1 ? '' : 's'}`}
                    isEmpty={group.chips.length === 0}
                  >
                    {group.chips.map((chip) => (
                      <SortableChip
                        key={chip.id}
                        chip={chip}
                        onRemove={handleRemoveChip}
                        disabled={disabled}
                      />
                    ))}
                  </DropZone>
                </SortableContext>
              </Box>
            ))}
          </Stack>

          <Divider />

          {/* Available Chips Palette */}
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" fw={500}>
                Filter Palette
              </Text>
              <Button
                variant="subtle"
                size="xs"
                onClick={handleClear}
                disabled={disabled || !hasAnyChips}
                color="red"
              >
                Clear All
              </Button>
            </Group>

            <Text size="xs" c="dimmed">
              Drag these chips into query groups above to build your search
            </Text>

            {/* Group available chips by category */}
            {Object.entries(
              availableChips.reduce((acc, chip) => {
                const category = chip.category;
                if (!acc[category]) acc[category] = [];
                acc[category].push(chip);
                return acc;
              }, {} as Record<QueryChipCategory, QueryFilterChip[]>)
            ).map(([category, chips]) => (
              <Box key={category}>
                <Text size="xs" fw={500} c="dimmed" mb={4} tt="capitalize">
                  {category}
                </Text>
                <Group gap="xs" wrap="wrap">
                  {chips.map((chip) => (
                    <SortableChip
                      key={chip.id}
                      chip={chip}
                      onRemove={() => {}} // No remove for palette chips
                      disabled={disabled}
                    />
                  ))}
                </Group>
              </Box>
            ))}
          </Stack>
        </Stack>
      </Paper>
    </DndContext>
  );
}