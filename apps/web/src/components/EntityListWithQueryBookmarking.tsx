/**
 * Enhanced EntityList component with query bookmarking functionality
 * Wraps the existing EntityList to add query bookmarking controls
 */

import { Group, Stack, Title, Text } from "@mantine/core";
import { EntityList, type EntityListProps } from "./EntityList";
import { QueryBookmarkButton } from "./QueryBookmarkButton";
import { useQueryBookmarking } from "@/hooks/use-query-bookmarking";
import type { OpenAlexSearchParams } from "@/lib/route-schemas";
import type { EntityType } from "@academic-explorer/types";

interface EntityListWithQueryBookmarkingProps extends Omit<EntityListProps, "title"> {
  entityType: EntityType;
  entityId?: string;
  title?: string;
  showBookmarkButton?: boolean;
  bookmarkButtonPosition?: "header" | "inline";
  bookmarkButtonSize?: "xs" | "sm" | "md" | "lg";
  customHeader?: React.ReactNode;
}

export function EntityListWithQueryBookmarking({
  entityType,
  entityId,
  title,
  showBookmarkButton = true,
  bookmarkButtonPosition = "header",
  bookmarkButtonSize = "sm",
  customHeader,
  ...entityListProps
}: EntityListWithQueryBookmarkingProps) {

  const {
    currentQueryParams,
    paginationInfo,
    isQueryBookmarked,
    generateDefaultTitle,
    queryId
  } = useQueryBookmarking({
    entityType,
    entityId
  });

  // Check if this query has semantic parameters worth bookmarking
  const hasSemanticQuery = Object.keys(currentQueryParams).length > 0 || !!entityId;

  const renderHeader = () => {
    if (customHeader) {
      return customHeader;
    }

    return (
      <Group justify="space-between" mb="md">
        <div>
          <Title order={2}>
            {title || `${entityType.charAt(0).toUpperCase() + entityType.slice(1)}${
              entityId ? ` Details` : " List"
            }`}
          </Title>

          {/* Show query info if available */}
          {hasSemanticQuery && (
            <Text size="sm" c="dimmed" mt="xs">
              {generateDefaultTitle()}
              {queryId && (
                <Text component="span" size="xs" c="blue" ml="sm">
                  ID: {queryId.slice(0, 12)}...
                </Text>
              )}
            </Text>
          )}

          {/* Show pagination info */}
          {paginationInfo.hasPagination && (
            <Text size="xs" c="dimmed" mt="xs">
              Page {paginationInfo.page} ({paginationInfo.perPage} per page)
            </Text>
          )}
        </div>

        {/* Bookmark button in header */}
        {showBookmarkButton && bookmarkButtonPosition === "header" && (
          <QueryBookmarkButton
            entityType={entityType}
            entityId={entityId}
            size={bookmarkButtonSize}
          />
        )}
      </Group>
    );
  };

  return (
    <Stack>
      {renderHeader()}

      <EntityList
        entityType={entityType}
        {...entityListProps}
        title={undefined} // Title handled by this wrapper
      />

      {/* Bookmark button inline (alternative position) */}
      {showBookmarkButton && bookmarkButtonPosition === "inline" && hasSemanticQuery && (
        <Group justify="center" mt="md">
          <QueryBookmarkButton
            entityType={entityType}
            entityId={entityId}
            size="md"
            showLabel
          />
        </Group>
      )}

      {/* Debug information (development only) */}
      {process.env.NODE_ENV === "development" && (
        <div style={{
          marginTop: "1rem",
          padding: "0.5rem",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
          fontSize: "12px",
          fontFamily: "monospace"
        }}>
          <div><strong>Query Debug Info:</strong></div>
          <div>Entity: {entityType}{entityId && `/${entityId}`}</div>
          <div>Query ID: {queryId}</div>
          <div>Bookmarked: {isQueryBookmarked ? "Yes" : "No"}</div>
          <div>Semantic Params: {JSON.stringify(currentQueryParams, null, 2)}</div>
          <div>Pagination: {JSON.stringify(paginationInfo, null, 2)}</div>
        </div>
      )}
    </Stack>
  );
}