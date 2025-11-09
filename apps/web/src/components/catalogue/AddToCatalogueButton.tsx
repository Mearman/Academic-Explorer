/**
 * Button component for adding entities to catalogue lists
 * Integrates with existing bookmark system and entity detail components
 */

import React, { useState } from "react";
import {
  ActionIcon,
  Menu,
  Button,
  Modal,
  Stack,
  Text,
  Group,
  Badge,
  Divider,
  TextInput,
  Textarea,
  Checkbox,
} from "@mantine/core";
import {
  IconPlus,
  IconBookmark,
  IconList,
  IconBook,
} from "@tabler/icons-react";
import { useCatalogue } from "@/hooks/useCatalogue";
import { type EntityType } from "@academic-explorer/utils";
import { notifications } from "@mantine/notifications";
import { logger } from "@/lib/logger";

interface AddToCatalogueButtonProps {
  /** Entity type (works, authors, etc.) */
  entityType: EntityType;
  /** OpenAlex entity ID */
  entityId: string;
  /** Entity title for display */
  entityTitle: string;
  /** Optional custom styling */
  size?: "xs" | "sm" | "md" | "lg";
  /** Show as button instead of icon */
  variant?: "icon" | "button";
  /** Custom class name */
  className?: string;
}

interface CreateAndAddModalProps {
  opened: boolean;
  onClose: () => void;
  entityType: EntityType;
  entityId: string;
  entityTitle: string;
  onSuccess: () => void;
}

function CreateAndAddModal({
  opened,
  onClose,
  entityType,
  entityId,
  entityTitle,
  onSuccess,
}: CreateAndAddModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createList, addEntityToList } = useCatalogue();

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      // Determine list type based on entity type
      const listType = entityType === "works" ? "bibliography" : "list";

      // Create new list
      const listId = await createList({
        title: title.trim(),
        description: description.trim() || undefined,
        type: listType,
        tags: tags.filter(tag => tag.trim().length > 0),
        isPublic,
      });

      // Add entity to the new list
      await addEntityToList({
        listId,
        entityType,
        entityId,
        notes: `Added from: ${entityTitle}`,
      });

      logger.debug("catalogue-ui", "Created list and added entity successfully", {
        listId,
        listTitle: title.trim(),
        entityType,
        entityId,
        entityTitle
      });

      notifications.show({
        title: "Success",
        message: `Created "${title}" and added ${entityType === "works" ? "work" : entityType}`,
        color: "green",
      });

      onSuccess();
      onClose();
    } catch (error) {
      logger.error("catalogue-ui", "Failed to create list and add entity", {
        entityType,
        entityId,
        entityTitle,
        listTitle: title.trim(),
        error
      });
      notifications.show({
        title: "Error",
        message: "Failed to create list and add entity",
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Create New List" size="md">
      <Stack gap="md">
        <div>
          <Text size="sm" c="dimmed">Adding:</Text>
          <Text fw={500}>{entityTitle}</Text>
          <Badge size="xs" variant="light" mt="xs">
            {entityType}
          </Badge>
        </div>

        <Divider />

        <TextInput
          label="List Title"
          placeholder="Enter list title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />

        <Textarea
          label="Description"
          placeholder="Optional description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          minRows={3}
        />

        <Group>
          <Checkbox
            id="is-public-modal"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            label="Make this list publicly shareable"
            size="sm"
          />
        </Group>

        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!title.trim()}
          >
            Create & Add
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export function AddToCatalogueButton({
  entityType,
  entityId,
  entityTitle,
  size = "sm",
  variant = "icon",
  className,
}: AddToCatalogueButtonProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { lists, addEntityToList } = useCatalogue();

  // Filter lists that can accept this entity type
  const compatibleLists = lists.filter(list => {
    if (list.type === "bibliography") {
      return entityType === "works";
    }
    return true; // Regular lists can accept any entity type
  });

  const handleAddToList = async (listId: string, listTitle: string) => {
    try {
      await addEntityToList({
        listId,
        entityType,
        entityId,
        notes: `Added from: ${entityTitle}`,
      });

      logger.debug("catalogue-ui", "Entity added to existing list", {
        listId,
        listTitle,
        entityType,
        entityId,
        entityTitle
      });

      notifications.show({
        title: "Added to List",
        message: `Added to "${listTitle}"`,
        color: "green",
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        logger.debug("catalogue-ui", "Entity already exists in list", {
          listId,
          listTitle,
          entityType,
          entityId,
          entityTitle
        });
        notifications.show({
          title: "Already in List",
          message: `"${entityTitle}" is already in "${listTitle}"`,
          color: "yellow",
        });
      } else {
        logger.error("catalogue-ui", "Failed to add entity to list", {
          listId,
          listTitle,
          entityType,
          entityId,
          entityTitle,
          error
        });
        notifications.show({
          title: "Error",
          message: "Failed to add to list",
          color: "red",
        });
      }
    }
  };

  const handleCreateAndAdd = () => {
    setShowCreateModal(true);
  };

  if (variant === "button") {
    return (
      <>
        <Menu shadow="md" width={200}>
          <Menu.Target>
            <Button
              size={size}
              leftSection={<IconBookmark size={16} />}
              variant="light"
              className={className}
            >
              Add to List
            </Button>
          </Menu.Target>

          <Menu.Dropdown>
            {compatibleLists.length > 0 ? (
              <>
                {compatibleLists.slice(0, 5).map((list) => (
                  <Menu.Item
                    key={list.id}
                    leftSection={
                      list.type === "bibliography" ? (
                        <IconBook size={14} />
                      ) : (
                        <IconList size={14} />
                      )
                    }
                    onClick={() => handleAddToList(list.id!, list.title)}
                  >
                    {list.title}
                  </Menu.Item>
                ))}
                {compatibleLists.length > 5 && (
                  <Menu.Item disabled>
                    ... and {compatibleLists.length - 5} more
                  </Menu.Item>
                )}
                <Menu.Divider />
              </>
            ) : (
              <Menu.Item disabled>
                No compatible lists found
              </Menu.Item>
            )}
            <Menu.Item
              leftSection={<IconPlus size={14} />}
              onClick={handleCreateAndAdd}
            >
              Create New List
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>

        <CreateAndAddModal
          opened={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          entityType={entityType}
          entityId={entityId}
          entityTitle={entityTitle}
          onSuccess={() => {}}
        />
      </>
    );
  }

  return (
    <>
      <Menu shadow="md" width={200}>
        <Menu.Target>
          <ActionIcon
            size={size}
            variant="light"
            className={className}
            title="Add to catalogue list"
          >
            <IconBookmark size={16} />
          </ActionIcon>
        </Menu.Target>

        <Menu.Dropdown>
          {compatibleLists.length > 0 ? (
            <>
              {compatibleLists.slice(0, 5).map((list) => (
                <Menu.Item
                  key={list.id}
                  leftSection={
                    list.type === "bibliography" ? (
                      <IconBook size={14} />
                    ) : (
                      <IconList size={14} />
                    )
                  }
                  onClick={() => handleAddToList(list.id!, list.title)}
                >
                  {list.title}
                </Menu.Item>
              ))}
              {compatibleLists.length > 5 && (
                <Menu.Item disabled>
                  ... and {compatibleLists.length - 5} more
                </Menu.Item>
              )}
              <Menu.Divider />
            </>
          ) : (
            <Menu.Item disabled>
              No compatible lists found
            </Menu.Item>
          )}
          <Menu.Item
            leftSection={<IconPlus size={14} />}
            onClick={handleCreateAndAdd}
          >
            Create New List
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <CreateAndAddModal
        opened={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        entityType={entityType}
        entityId={entityId}
        entityTitle={entityTitle}
        onSuccess={() => {}}
      />
    </>
  );
}