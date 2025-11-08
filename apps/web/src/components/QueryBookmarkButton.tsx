/**
 * Query bookmark button component for Academic Explorer
 * Provides bookmarking functionality for complex queries with pagination awareness
 */

import {
  IconBookmark,
  IconBookmarkOff,
  IconBookmarkFilled,
  IconLoader
} from "@tabler/icons-react";
import { ActionIcon, Tooltip, Text } from "@mantine/core";
import { useQueryBookmarking } from "@/hooks/use-query-bookmarking";
import { useState } from "react";

interface QueryBookmarkButtonProps {
  entityType: string;
  entityId?: string;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "subtle" | "light" | "filled" | "outline" | "default" | "transparent";
  showLabel?: boolean;
  disabled?: boolean;
  onBookmark?: () => void;
  onUnbookmark?: () => void;
}

export function QueryBookmarkButton({
  entityType,
  entityId,
  size = "sm",
  variant = "subtle",
  showLabel = false,
  disabled = false,
  onBookmark,
  onUnbookmark
}: QueryBookmarkButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    isQueryBookmarked,
    bookmarkCurrentQuery,
    unbookmarkCurrentQuery,
    generateDefaultTitle,
    currentQueryParams
  } = useQueryBookmarking({
    entityType,
    entityId,
    disabled
  });

  // Don't show bookmark button if there are no semantic query parameters
  // and no specific entity ID (i.e., just a plain list page)
  const hasSemanticQuery = Object.keys(currentQueryParams).length > 0 || !!entityId;
  if (!hasSemanticQuery) {
    return null;
  }

  const handleClick = async () => {
    if (isLoading || disabled) return;

    setIsLoading(true);

    try {
      if (isQueryBookmarked) {
        await unbookmarkCurrentQuery();
        onUnbookmark?.();
      } else {
        await bookmarkCurrentQuery({
          title: generateDefaultTitle()
        });
        onBookmark?.();
      }
    } catch (error) {
      console.error("Failed to toggle query bookmark:", error);
      // You could add error notification here
    } finally {
      setIsLoading(false);
    }
  };

  const getTooltipLabel = () => {
    if (disabled) return "Query bookmarking disabled";
    if (isLoading) return isQueryBookmarked ? "Removing bookmark..." : "Adding bookmark...";
    return isQueryBookmarked ? "Remove query bookmark" : "Bookmark this query";
  };

  return (
    <Tooltip label={getTooltipLabel()} position="top">
      <div style={{ display: "flex", alignItems: "center", gap: showLabel ? "8px" : "0" }}>
        <ActionIcon
          onClick={handleClick}
          disabled={disabled || isLoading}
          variant={variant}
          size={size}
          color={isQueryBookmarked ? "blue" : "gray"}
          aria-label={getTooltipLabel()}
          data-testid="query-bookmark-button"
        >
          {isLoading ? (
            <IconLoader size={16} />
          ) : isQueryBookmarked ? (
            <IconBookmarkFilled size={16} />
          ) : (
            <IconBookmark size={16} />
          )}
        </ActionIcon>

        {showLabel && (
          <Text size="sm" c={isQueryBookmarked ? "blue" : "gray"}>
            {isQueryBookmarked ? "Bookmarked" : "Bookmark"}
          </Text>
        )}
      </div>
    </Tooltip>
  );
}