/**
 * Catalogue list component for displaying and managing lists
 */

import React, { useState } from "react";
import {
  Card,
  Group,
  Text,
  Badge,
  Button,
  ActionIcon,
  Stack,
  SimpleGrid,
  Tooltip,
  Loader,
  Modal,
  TextInput,
  Textarea,
  TagsInput,
  Box,
} from "@mantine/core";
import {
  IconExternalLink,
  IconEdit,
  IconTrash,
  IconBook,
  IconList,
  IconCopy,
  IconCheck,
} from "@tabler/icons-react";
import { useCatalogue } from "@/hooks/useCatalogue";
import { type CatalogueList, type EntityType } from "@academic-explorer/utils";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { logger } from "@/lib/logger";

interface CatalogueListProps {
  lists: CatalogueList[];
  selectedListId: string | null;
  onSelectList: (listId: string) => void;
  onDeleteList: (listId: string) => Promise<void>;
  onNavigate?: (url: string) => void;
  isLoading: boolean;
  listType: "list" | "bibliography";
}

interface ListCardProps {
  list: CatalogueList;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  onNavigate?: (url: string) => void;
}

function ListCard({ list, isSelected, onSelect, onEdit, onDelete, onShare, onNavigate }: ListCardProps) {
  const [stats, setStats] = useState<{
    totalEntities: number;
    entityCounts: Record<EntityType, number>;
  } | null>(null);

  const { getListStats } = useCatalogue();

  // Load stats when component mounts
  React.useEffect(() => {
    if (list.id) {
      getListStats(list.id)
        .then(setStats)
        .catch((error) => {
          logger.warn("catalogue-ui", "Failed to load list stats", {
            listId: list.id,
            error
          });
        });
    }
  }, [list.id, getListStats]);

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}#/catalogue/shared/${list.shareToken || list.id}`;
      await navigator.clipboard.writeText(url);
      notifications.show({
        title: "Link Copied",
        message: "List link copied to clipboard",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      logger.debug("catalogue-ui", "List link copied to clipboard", {
        listId: list.id,
        listTitle: list.title
      });
    } catch (error) {
      logger.error("catalogue-ui", "Failed to copy list link to clipboard", {
        listId: list.id,
        error
      });
      notifications.show({
        title: "Copy Failed",
        message: "Failed to copy link to clipboard",
        color: "red",
      });
    }
  };

  return (
    <Card
      withBorder
      padding="md"
      className={isSelected ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : ""}
      style={{ cursor: "pointer" }}
      onClick={onSelect}
    >
      <Group justify="space-between" mb="xs">
        <Group>
          {list.type === "bibliography" ? (
            <IconBook size={20} color="var(--mantine-color-blue-6)" />
          ) : (
            <IconList size={20} color="var(--mantine-color-green-6)" />
          )}
          <Text fw={500} size="lg" flex={1}>
            {list.title}
          </Text>
        </Group>

        <Group gap="xs">
          {list.isPublic && (
            <Badge size="xs" color="green" variant="light">
              Public
            </Badge>
          )}

          <Tooltip label="Copy link">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleCopyLink();
              }}
            >
              <IconCopy size={14} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Share">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
            >
              <IconExternalLink size={14} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Edit">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <IconEdit size={14} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Delete">
            <ActionIcon
              variant="subtle"
              color="red"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {list.description && (
        <Text size="sm" c="dimmed" mb="xs" lineClamp={2}>
          {list.description}
        </Text>
      )}

      {list.tags && list.tags.length > 0 && (
        <Group gap="xs" mb="xs">
          {list.tags.map((tag, index) => (
            <Badge key={index} size="xs" variant="light">
              {tag}
            </Badge>
          ))}
        </Group>
      )}

      <Group justify="space-between" mt="md">
        <Group gap="md">
          {stats ? (
            <>
              <Text size="xs" c="dimmed">
                {stats.totalEntities} {stats.totalEntities === 1 ? "item" : "items"}
              </Text>

              {/* Show entity type breakdown for bibliographies */}
              {list.type === "bibliography" && stats.entityCounts.works > 0 && (
                <Text size="xs" c="dimmed">
                  {stats.entityCounts.works} {stats.entityCounts.works === 1 ? "work" : "works"}
                </Text>
              )}
            </>
          ) : (
            <Text size="xs" c="dimmed">
              Loading...
            </Text>
          )}
        </Group>

        <Text size="xs" c="dimmed">
          {list.updatedAt.toLocaleDateString()}
        </Text>
      </Group>
    </Card>
  );
}

function EditListModal({
  list,
  opened,
  onClose,
  onSave,
}: {
  list: CatalogueList;
  opened: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Pick<CatalogueList, "title" | "description" | "tags" | "isPublic">>) => Promise<void>;
}) {
  const [title, setTitle] = useState(list.title);
  const [description, setDescription] = useState(list.description || "");
  const [tags, setTags] = useState(list.tags || []);
  const [isPublic, setIsPublic] = useState(list.isPublic);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { updateList } = useCatalogue();

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const updateData = {
        title: title.trim(),
        description: description.trim() || undefined,
        tags: tags.filter(tag => tag.trim().length > 0),
        isPublic,
      };

      await updateList(list.id!, updateData);
      onSave(updateData);
      onClose();

      logger.debug("catalogue-ui", "List updated successfully", {
        listId: list.id,
        updateData
      });
    } catch (error) {
      logger.error("catalogue-ui", "Failed to update list", {
        listId: list.id,
        updateData: {
          title: title.trim(),
          description: description.trim() || undefined,
          tags: tags.filter(tag => tag.trim().length > 0),
          isPublic,
        },
        error
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Edit List" size="md">
      <Stack gap="md">
        <TextInput
          label="Title"
          placeholder="List title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <Textarea
          label="Description"
          placeholder="Optional description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          minRows={3}
        />

        <TagsInput
          label="Tags"
          placeholder="Add tags..."
          data={[]}
          value={tags}
          onChange={setTags}
        />

        <Group>
          <Text size="sm">Make this list public?</Text>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
        </Group>

        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!title.trim()}
          >
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export function CatalogueListComponent({
  lists,
  selectedListId,
  onSelectList,
  onDeleteList,
  onNavigate,
  isLoading,
  listType,
}: CatalogueListProps) {
  const [editingList, setEditingList] = useState<CatalogueList | null>(null);
  const { generateShareUrl } = useCatalogue();

  const handleSelectList = (listId: string) => {
    onSelectList(listId);
  };

  const handleEditList = (list: CatalogueList) => {
    setEditingList(list);
  };

  const handleDeleteList = (list: CatalogueList) => {
    modals.openConfirmModal({
      title: `Delete ${list.type}?`,
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete "{list.title}"? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await onDeleteList(list.id!);
          notifications.show({
            title: "Deleted",
            message: `${list.type === "bibliography" ? "Bibliography" : "List"} deleted successfully`,
            color: "green",
          });
        } catch (error) {
          notifications.show({
            title: "Error",
            message: `Failed to delete ${list.type}`,
            color: "red",
          });
        }
      },
    });
  };

  const handleShareList = async (list: CatalogueList) => {
    try {
      const shareUrl = await generateShareUrl(list.id!);
      await navigator.clipboard.writeText(shareUrl);
      notifications.show({
        title: "Share URL Copied",
        message: "Share URL copied to clipboard",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      logger.debug("catalogue-ui", "Share URL generated and copied", {
        listId: list.id,
        listTitle: list.title
      });
    } catch (error) {
      logger.error("catalogue-ui", "Failed to generate or copy share URL", {
        listId: list.id,
        error
      });
      notifications.show({
        title: "Error",
        message: "Failed to generate share URL",
        color: "red",
      });
    }
  };

  if (isLoading) {
    return (
      <Stack align="center" py="xl">
        <Loader size="lg" />
        <Text size="sm" c="dimmed">
          Loading {listType === "bibliography" ? "bibliographies" : "lists"}...
        </Text>
      </Stack>
    );
  }

  if (lists.length === 0) {
    return (
      <Card withBorder p="xl">
        <Stack align="center" gap="md">
          <Box c="gray.4">
            {listType === "bibliography" ? (
              <IconBook size={48} />
            ) : (
              <IconList size={48} />
            )}
          </Box>
          <Text size="lg" fw={500}>
            No {listType === "bibliography" ? "bibliographies" : "lists"} yet
          </Text>
          <Text size="sm" c="dimmed">
            Create your first {listType} to start organizing your research
          </Text>
        </Stack>
      </Card>
    );
  }

  return (
    <>
      <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
        {lists.map((list) => (
          <ListCard
            key={list.id}
            list={list}
            isSelected={selectedListId === list.id}
            onSelect={() => handleSelectList(list.id!)}
            onEdit={() => handleEditList(list)}
            onDelete={() => handleDeleteList(list)}
            onShare={() => handleShareList(list)}
            onNavigate={onNavigate}
          />
        ))}
      </SimpleGrid>

      {editingList && (
        <EditListModal
          list={editingList}
          opened={!!editingList}
          onClose={() => setEditingList(null)}
          onSave={async () => {
            await Promise.resolve();
            setEditingList(null);
          }}
        />
      )}
    </>
  );
}