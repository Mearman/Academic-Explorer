/**
 * Component for displaying entities in a selected catalogue list
 * Supports sorting, filtering, and entity operations
 */

import React, { useState } from "react";
import {
  Card,
  Group,
  Text,
  Badge,
  ActionIcon,
  Stack,
  Table,
  TextInput,
  Select,
  Button,
  Menu,
  Modal,
  Textarea,
  Tooltip,
  Loader,
  Alert,
} from "@mantine/core";
import {
  IconExternalLink,
  IconEdit,
  IconTrash,
  IconNotes,
  IconSearch,
  IconDots,
  IconGripVertical,
} from "@tabler/icons-react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCatalogue } from "@/hooks/useCatalogue";
import { type CatalogueEntity, type EntityType, type CatalogueList } from "@academic-explorer/utils";
import { notifications } from "@mantine/notifications";
import { logger } from "@/lib/logger";

interface CatalogueEntitiesProps {
  /** Currently selected list */
  selectedList: CatalogueList | null;
  /** Callback to navigate to entity pages */
  onNavigate?: (entityType: EntityType, entityId: string) => void;
}

interface SortableEntityRowProps {
  entity: CatalogueEntity;
  index: number;
  onNavigate?: (entityType: EntityType, entityId: string) => void;
  onRemove: (entityId: string) => void;
  onEditNotes: (entityId: string, notes: string) => void;
}

function SortableEntityRow({
  entity,
  index,
  onNavigate,
  onRemove,
  onEditNotes,
}: SortableEntityRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entity.id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(entity.notes || "");

  const handleSaveNotes = () => {
    onEditNotes(entity.id!, notes);
    setEditingNotes(false);
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Table.Tr>
        <Table.Td w={40}>
          <div {...listeners} style={{ cursor: "grab" }}>
            <IconGripVertical size={16} color="var(--mantine-color-gray-4)" />
          </div>
        </Table.Td>
        <Table.Td>
          <Group gap="sm">
            <Badge size="sm" variant="light" color="blue">
              {entity.entityType}
            </Badge>
            <Text size="sm" fw={500}>
              {entity.entityId}
            </Text>
          </Group>
        </Table.Td>
        <Table.Td>
          {editingNotes ? (
            <Group gap="xs">
              <Textarea
                size="xs"
                minRows={1}
                maxRows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes..."
                flex={1}
              />
              <Button size="xs" onClick={handleSaveNotes}>
                Save
              </Button>
              <Button size="xs" variant="subtle" onClick={() => setEditingNotes(false)}>
                Cancel
              </Button>
            </Group>
          ) : (
            <Group gap="sm">
              <Text size="sm" c="dimmed" style={{ flex: 1 }}>
                {entity.notes || "No notes"}
              </Text>
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={() => setEditingNotes(true)}
                title="Edit notes"
              >
                <IconEdit size={14} />
              </ActionIcon>
            </Group>
          )}
        </Table.Td>
        <Table.Td>
          <Text size="xs" c="dimmed">
            {entity.addedAt.toLocaleDateString()}
          </Text>
        </Table.Td>
        <Table.Td>
          <Group gap="xs">
            {onNavigate && (
              <Tooltip label="View entity">
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  onClick={() => onNavigate(entity.entityType, entity.entityId)}
                >
                  <IconExternalLink size={14} />
                </ActionIcon>
              </Tooltip>
            )}
            <Menu shadow="md" width={160}>
              <Menu.Target>
                <ActionIcon size="sm" variant="subtle">
                  <IconDots size={14} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconNotes size={14} />}
                  onClick={() => setEditingNotes(true)}
                >
                  Edit Notes
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconTrash size={14} />}
                  color="red"
                  onClick={() => onRemove(entity.id!)}
                >
                  Remove
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Table.Td>
      </Table.Tr>
    </div>
  );
}

export function CatalogueEntities({ selectedList, onNavigate }: CatalogueEntitiesProps) {
  // Guard clause - if no selected list or no ID, don't render
  if (!selectedList?.id) {
    return null;
  }

  const { entities, isLoadingEntities, removeEntityFromList, reorderEntities } = useCatalogue();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("position");

  // Filter entities based on search and type
  const filteredEntities = entities.filter((entity) => {
    const matchesSearch = searchQuery === "" ||
      entity.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entity.notes && entity.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = filterType === "all" || entity.entityType === filterType;

    return matchesSearch && matchesType;
  });

  // Sort entities
  const sortedEntities = [...filteredEntities].sort((a, b) => {
    switch (sortBy) {
      case "position":
        return a.position - b.position;
      case "entityId":
        return a.entityId.localeCompare(b.entityId);
      case "addedAt":
        return b.addedAt.getTime() - a.addedAt.getTime();
      case "entityType":
        return a.entityType.localeCompare(b.entityType);
      default:
        return 0;
    }
  });

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !selectedList) return;

    const oldIndex = sortedEntities.findIndex((item) => item.id === active.id);
    const newIndex = sortedEntities.findIndex((item) => item.id === over.id);

    if (oldIndex === newIndex) return;

    const items = arrayMove(sortedEntities, oldIndex, newIndex);

    // Update positions
    const reorderedIds = items.map((entity, index) => {
      entity.position = index + 1;
      return entity.id!;
    });

    try {
      await reorderEntities(selectedList.id!, reorderedIds);
      logger.debug("catalogue-ui", "Entities reordered successfully", {
        listId: selectedList.id!,
        entityCount: reorderedIds.length
      });
    } catch (error) {
      logger.error("catalogue-ui", "Failed to reorder entities", {
        listId: selectedList.id!,
        error
      });
      notifications.show({
        title: "Error",
        message: "Failed to reorder entities",
        color: "red",
      });
    }
  };

  const handleRemoveEntity = async (entityRecordId: string) => {
    if (!selectedList) return;

    try {
      await removeEntityFromList(selectedList.id!, entityRecordId);
      logger.debug("catalogue-ui", "Entity removed from list", {
        listId: selectedList.id!,
        entityRecordId
      });
      notifications.show({
        title: "Removed",
        message: "Entity removed from list",
        color: "green",
      });
    } catch (error) {
      logger.error("catalogue-ui", "Failed to remove entity from list", {
        listId: selectedList.id!,
        entityRecordId,
        error
      });
      notifications.show({
        title: "Error",
        message: "Failed to remove entity",
        color: "red",
      });
    }
  };

  const handleEditNotes = async (entityRecordId: string, notes: string) => {
    // This would need to be implemented in the hook/service
    // For now, we'll just log it
    logger.debug("catalogue-ui", "Entity notes updated", {
      entityRecordId,
      notesLength: notes.length
    });
  };

  // Get unique entity types for filter dropdown
  const entityTypes = Array.from(new Set(entities.map((e) => e.entityType)));

  if (!selectedList) {
    return (
      <Card withBorder p="xl">
        <Stack align="center" gap="md">
          <Text size="lg" c="dimmed">
            Select a list to view its entities
          </Text>
        </Stack>
      </Card>
    );
  }

  if (isLoadingEntities) {
    return (
      <Card withBorder p="xl">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text size="sm" c="dimmed">
            Loading entities from "{selectedList.title}"...
          </Text>
        </Stack>
      </Card>
    );
  }

  if (entities.length === 0) {
    return (
      <Card withBorder p="xl">
        <Stack align="center" gap="md">
          <Text size="lg" fw={500}>
            No entities yet
          </Text>
          <Text size="sm" c="dimmed">
            Add entities to "{selectedList.title}" to get started
          </Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Card withBorder padding="md">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Text size="lg" fw={500}>
            {entities.length} {entities.length === 1 ? "entity" : "entities"} in "{selectedList.title}"
          </Text>
          <Badge size="sm" color="blue">
            {selectedList.type === "bibliography" ? "Bibliography" : "List"}
          </Badge>
        </Group>

        {/* Filters */}
        <Group gap="md">
          <TextInput
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftSection={<IconSearch size={16} />}
            flex={1}
          />

          <Select
            value={filterType}
            onChange={(value) => setFilterType(value || "all")}
            data={[
              { value: "all", label: "All Types" },
              ...entityTypes.map((type) => ({ value: type, label: type })),
            ]}
            w={120}
          />

          <Select
            value={sortBy}
            onChange={(value) => setSortBy(value || "position")}
            data={[
              { value: "position", label: "Order" },
              { value: "entityId", label: "Entity ID" },
              { value: "entityType", label: "Type" },
              { value: "addedAt", label: "Date Added" },
            ]}
            w={120}
          />
        </Group>

        {/* Entities Table */}
        <Card withBorder padding={0}>
          <Table.ScrollContainer minWidth={500}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={40}></Table.Th>
                  <Table.Th>Entity</Table.Th>
                  <Table.Th>Notes</Table.Th>
                  <Table.Th w={100}>Added</Table.Th>
                  <Table.Th w={100}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <DndContext
                  sensors={useSensors(useSensor(PointerSensor))}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={sortedEntities.map(entity => entity.id!)}
                    strategy={verticalListSortingStrategy}
                  >
                    {sortedEntities.map((entity) => (
                      <SortableEntityRow
                        key={entity.id}
                        entity={entity}
                        index={sortedEntities.indexOf(entity)}
                        onNavigate={onNavigate}
                        onRemove={handleRemoveEntity}
                        onEditNotes={handleEditNotes}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>

        {filteredEntities.length === 0 && entities.length > 0 && (
          <Alert color="yellow">
            No entities match your current filters
          </Alert>
        )}

        <Text size="xs" c="dimmed" ta="center">
          Drag entities to reorder them • Click on entity ID to view details
        </Text>
      </Stack>
    </Card>
  );
}