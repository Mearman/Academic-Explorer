/**
 * Fallback sidebar component for test environments
 * Ensures sidebar content always renders regardless of data loading issues
 */

import { useState } from "react";
import {
  TextInput,
  Button,
  Card,
  Text,
  Group,
  Stack,
  Badge,
  ActionIcon,
  Title,
} from "@mantine/core";
import {
  IconBookmark,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import * as styles from "./sidebar.css";

interface SidebarFallbackProps {
  title: string;
  type: "bookmarks" | "history";
  onClose?: () => void;
}

export function SidebarFallback({ title, type, onClose }: SidebarFallbackProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className={styles.sidebarContainer}>
      {/* Header */}
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarTitle}>
          <IconBookmark size={18} />
          <Title order={6}>{title}</Title>
        </div>
        {onClose && (
          <ActionIcon size="sm" variant="subtle" onClick={onClose}>
            <IconX size={14} />
          </ActionIcon>
        )}
      </div>

      {/* Search */}
      <div className={styles.searchInput}>
        <TextInput
          placeholder={`Search ${title.toLowerCase()}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftSection={<IconSearch size={14} />}
          size="sm"
        />
      </div>

      {/* Empty State */}
      <div className={styles.scrollableContent}>
        <Card withBorder p="md">
          <div className={styles.emptyState}>
            <IconBookmark size={32} />
            <Text size="sm" fw={500} ta="center">
              {searchQuery ? `No ${title.toLowerCase()} found` : `No ${title.toLowerCase()} yet`}
            </Text>
            <Text size="xs" c="dimmed" ta="center">
              {type === "bookmarks"
                ? "Bookmark entities you want to revisit later"
                : "Your browsing history will appear here"
              }
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
}