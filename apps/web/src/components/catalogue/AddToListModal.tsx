/**
 * Modal component for adding entities to catalogue lists
 */

import React, { useState } from "react";
import {
  Select,
  Button,
  Group,
  Stack,
  Textarea,
  Text,
  Alert,
  Loader,
} from "@mantine/core";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { useCatalogue } from "@/hooks/useCatalogue";
import type { EntityType as CatalogueEntityType } from "@academic-explorer/utils";
import { logger } from "@/lib/logger";
import { notifications } from "@mantine/notifications";

// Entity type from entity pages (singular form)
type EntityPageType = "author" | "work" | "institution" | "source" | "concept" | "topic" | "publisher" | "funder";

// Mapping from singular entity types to plural catalogue types
function mapToCatalogueEntityType(entityType: EntityPageType): CatalogueEntityType {
  const mapping: Record<EntityPageType, CatalogueEntityType> = {
    author: "authors",
    work: "works",
    institution: "institutions",
    source: "sources",
    concept: "topics", // concepts are stored as topics in catalogue
    topic: "topics",
    publisher: "publishers",
    funder: "funders",
  };
  return mapping[entityType];
}

interface AddToListModalProps {
  entityType: EntityPageType;
  entityId: string;
  entityDisplayName?: string;
  onClose: () => void;
}

export function AddToListModal({
  entityType,
  entityId,
  entityDisplayName,
  onClose
}: AddToListModalProps) {
  const { lists, isLoadingLists, addEntityToList } = useCatalogue();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Convert entity type to catalogue format
  const catalogueEntityType = mapToCatalogueEntityType(entityType);

  // Filter lists based on entity type
  // Bibliographies can only contain works
  const availableLists = lists.filter(list => {
    if (list.type === "bibliography") {
      return catalogueEntityType === "works";
    }
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedListId) return;

    setIsSubmitting(true);
    try {
      await addEntityToList({
        listId: selectedListId,
        entityType: catalogueEntityType,
        entityId,
        notes: notes.trim() || undefined,
      });

      const selectedList = lists.find(l => l.id === selectedListId);
      logger.debug("catalogue-ui", "Entity added to list from modal", {
        listId: selectedListId,
        listTitle: selectedList?.title,
        entityType,
        entityId,
        hasNotes: !!notes.trim()
      });

      // Show notification first (it will persist after modal closes)
      notifications.show({
        title: "Added to List",
        message: `${entityDisplayName || entityId} added to "${selectedList?.title}"`,
        color: "green",
        icon: <IconCheck size={16} />,
      });

      // Close modal immediately - notification will persist
      onClose();
    } catch (error) {
      logger.error("catalogue-ui", "Failed to add entity to list from modal", {
        listId: selectedListId,
        entityType,
        entityId,
        error
      });

      notifications.show({
        title: "Error",
        message: "Failed to add entity to list",
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingLists) {
    return (
      <Stack align="center" py="xl">
        <Loader size="lg" />
        <Text size="sm" c="dimmed">
          Loading lists...
        </Text>
      </Stack>
    );
  }

  if (availableLists.length === 0) {
    return (
      <Stack gap="md">
        <Alert icon={<IconAlertCircle size={16} />} color="yellow">
          {catalogueEntityType === "works"
            ? "No lists or bibliographies available. Create a list first to add entities."
            : "No lists available for this entity type. Bibliographies can only contain works."
          }
        </Alert>
        <Group justify="flex-end">
          <Button onClick={onClose}>Close</Button>
        </Group>
      </Stack>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Add {entityDisplayName || entityId} to a catalogue list
        </Text>

        <Select
          id="select-list"
          label="Select List"
          placeholder="Choose a list"
          value={selectedListId}
          onChange={setSelectedListId}
          data={availableLists.map(list => ({
            value: list.id!,
            label: `${list.title} (${list.type})`,
          }))}
          required
          searchable
          data-testid="add-to-list-select"
        />

        <Textarea
          id="entity-notes"
          label="Notes (Optional)"
          placeholder="Add notes about this entity..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          minRows={3}
          data-testid="add-to-list-notes"
        />

        <Group justify="flex-end" gap="xs">
          <Button
            variant="subtle"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!selectedListId}
            data-testid="add-to-list-submit"
          >
            Add to List
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
