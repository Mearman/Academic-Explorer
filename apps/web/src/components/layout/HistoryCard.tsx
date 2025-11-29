/**
 * Individual history entry card component for the sidebar
 * Handles display name resolution and actions
 */

import type { EntityType } from "@bibgraph/types";
import { logError, logger } from "@bibgraph/utils/logger";
import { catalogueService, type CatalogueEntity } from "@bibgraph/utils/storage/catalogue-db";
import {
  Card,
  Text,
  Group,
  Stack,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconExternalLink, IconTrash } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";

import { useEntityDisplayName } from "@/hooks/use-entity-display-name";

import * as styles from "./sidebar.css";

interface HistoryCardProps {
  entry: CatalogueEntity;
  onClose?: () => void;
  formatDate: (date: Date) => string;
}

export function HistoryCard({ entry, onClose, formatDate }: HistoryCardProps) {
  const navigate = useNavigate();

  // Check if this is a special ID (search or list)
  const isSpecialId = entry.entityId.startsWith("search-") || entry.entityId.startsWith("list-");

  // Try to extract title from notes first
  const titleFromNotes = entry.notes?.match(/Title: ([^\n]+)/)?.[1];

  // Fetch display name from API if not a special ID and no title in notes
  const { displayName, isLoading } = useEntityDisplayName({
    entityId: entry.entityId,
    entityType: entry.entityType as EntityType,
    enabled: !isSpecialId && !titleFromNotes,
  });

  // Determine the title to display
  let title: string;
  if (titleFromNotes) {
    title = titleFromNotes;
  } else if (isSpecialId) {
    if (entry.entityId.startsWith("search-")) {
      title = `Search: ${entry.entityId.replace("search-", "").split("-")[0]}`;
    } else {
      title = `List: ${entry.entityId.replace("list-", "")}`;
    }
  } else if (displayName) {
    title = displayName;
  } else if (isLoading) {
    title = "Loading...";
  } else {
    title = `${entry.entityType}: ${entry.entityId}`;
  }

  const handleNavigate = () => {
    let url = "";

    // Try to extract URL from notes
    const urlMatch = entry.notes?.match(/URL: ([^\n]+)/);
    if (urlMatch) {
      url = urlMatch[1];
    } else if (entry.entityId.startsWith("search-") || entry.entityId.startsWith("list-")) {
      const urlFromNotes = entry.notes?.match(/URL: ([^\n]+)/);
      url = urlFromNotes?.[1] || "";
    } else {
      url = `/${entry.entityType}/${entry.entityId}`;
    }

    if (url.startsWith("/")) {
      navigate({ to: url });
    } else if (url) {
      window.location.href = url;
    }

    if (onClose) {
      onClose();
    }
  };

  const handleDelete = () => {
    modals.openConfirmModal({
      title: "Delete History Entry",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete "{title}"? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          if (entry.id) {
            await catalogueService.removeEntityFromList("history-list", entry.id);
          }
        } catch (error) {
          logError(logger, "Failed to delete history entry", error, "HistoryCard");
        }
      },
    });
  };

  // Filter out URL and Title from notes for display
  const notesDisplay = entry.notes
    ?.split('\n')
    .filter(line => !line.startsWith('URL:') && !line.startsWith('Title:'))
    .join('\n');

  return (
    <Card
      withBorder
      padding="xs"
      shadow="none"
      className={styles.historyCard}
      onClick={handleNavigate}
    >
      <Group justify="space-between" align="flex-start" gap="xs">
        <Stack gap="xs" style={{ flex: 1 }}>
          <Text
            size="xs"
            fw={500}
            lineClamp={1}
            className={styles.historyEntry}
          >
            {title}
          </Text>
          {notesDisplay && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {notesDisplay}
            </Text>
          )}
          <Text size="xs" c="dimmed">
            {formatDate(new Date(entry.addedAt))}
          </Text>
        </Stack>
        <Group gap="xs">
          <Tooltip label="Navigate to this entry">
            <ActionIcon
              size="sm"
              variant="subtle"
              className={styles.navigationButton}
              aria-label={`Navigate to ${title}`}
              onClick={(e) => {
                e.stopPropagation();
                handleNavigate();
              }}
            >
              <IconExternalLink size={12} />
            </ActionIcon>
          </Tooltip>
          {entry.id && (
            <Tooltip label="Delete history entry">
              <ActionIcon
                size="sm"
                variant="subtle"
                color="red"
                className={styles.actionButton}
                aria-label={`Delete ${title} from history`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
              >
                <IconTrash size={12} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Group>
    </Card>
  );
}
