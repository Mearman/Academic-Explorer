/**
 * Individual bookmark card component for the sidebar
 * Handles display name resolution and actions
 */

import type { EntityType } from "@bibgraph/types";
import { logger } from "@bibgraph/utils/logger";
import { catalogueService, type CatalogueEntity } from "@bibgraph/utils/storage/catalogue-db";
import {
  Card,
  Text,
  Group,
  Stack,
  Badge,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconTrash } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import { useEntityDisplayName } from "@/hooks/use-entity-display-name";

import * as styles from "./sidebar.css";

interface BookmarkCardProps {
  bookmark: CatalogueEntity;
  onClose?: () => void;
  onDeleted?: () => void;
}

export function BookmarkCard({ bookmark, onClose, onDeleted }: BookmarkCardProps) {
  // Check if this is a special ID (search or list)
  const isSpecialId = bookmark.entityId.startsWith("search-") || bookmark.entityId.startsWith("list-");

  // Try to extract title from notes first
  const titleFromNotes = bookmark.notes?.match(/Title: ([^\n]+)/)?.[1];

  // Fetch display name from API if not a special ID and no title in notes
  const { displayName, isLoading } = useEntityDisplayName({
    entityId: bookmark.entityId,
    entityType: bookmark.entityType as EntityType,
    enabled: !isSpecialId && !titleFromNotes,
  });

  // Determine the title to display
  let title: string;
  if (titleFromNotes) {
    title = titleFromNotes;
  } else if (isSpecialId) {
    if (bookmark.entityId.startsWith("search-")) {
      title = `Search: ${bookmark.entityId.replace("search-", "").split("-")[0]}`;
    } else {
      title = `List: ${bookmark.entityId.replace("list-", "")}`;
    }
  } else if (displayName) {
    title = displayName;
  } else if (isLoading) {
    title = "Loading...";
  } else {
    title = `${bookmark.entityType}: ${bookmark.entityId}`;
  }

  // Compute link URL - for special IDs, try to extract from notes; otherwise use entity path
  const getLinkUrl = (): string => {
    // Try to extract URL from notes first
    const urlMatch = bookmark.notes?.match(/URL: ([^\n]+)/);
    if (urlMatch) {
      const url = urlMatch[1];
      // Convert OpenAlex API URLs to internal paths
      if (url.startsWith("https://api.openalex.org")) {
        return url.replace("https://api.openalex.org", "");
      }
      // Return internal paths as-is
      if (url.startsWith("/")) {
        return url;
      }
    }
    // Default to entity path
    return `/${String(bookmark.entityType)}/${String(bookmark.entityId)}`;
  };

  const linkUrl = getLinkUrl();

  const handleClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleDelete = () => {
    modals.openConfirmModal({
      title: "Delete Bookmark",
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
          if (bookmark.id) {
            await catalogueService.removeBookmark(bookmark.id);
            onDeleted?.();
          }
        } catch (error) {
          logger.error("bookmarks", "Failed to delete bookmark:", error);
        }
      },
    });
  };

  // Filter out URL and Title from notes for display
  const notesDisplay = bookmark.notes
    ?.split('\n')
    .filter(line => !line.startsWith('URL:') && !line.startsWith('Title:'))
    .join('\n');

  return (
    <Card
      component={Link}
      to={linkUrl}
      style={{ border: "1px solid var(--mantine-color-gray-3)", textDecoration: "none" }}
      padding="xs"
      shadow="none"
      className={styles.bookmarkCard}
      onClick={handleClick}
    >
      <Group justify="space-between" align="flex-start" gap="xs">
        <Stack gap="xs" style={{ flex: 1 }}>
          <Text
            size="xs"
            fw={500}
            lineClamp={2}
            className={styles.bookmarkTitle}
          >
            {title}
          </Text>
          {notesDisplay && (
            <Text size="xs" c="dimmed" lineClamp={2}>
              {notesDisplay}
            </Text>
          )}
          <Badge size="xs" variant="light" className={styles.tagBadge}>
            {bookmark.entityType}
          </Badge>
          <Text size="xs" c="dimmed">
            {new Date(bookmark.addedAt).toLocaleDateString()}
          </Text>
        </Stack>
        {bookmark.id && (
          <Tooltip label="Delete bookmark">
            <ActionIcon
              size="sm"
              variant="subtle"
              color="red"
              className={styles.actionButton}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleDelete();
              }}
            >
              <IconTrash size={12} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </Card>
  );
}
