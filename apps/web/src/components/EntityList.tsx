import type {
  Author,
  Concept,
  EntityType,
  Funder,
  InstitutionEntity,
  InstitutionsFilters,
  OpenAlexResponse,
  Publisher,
  Source,
  Topic,
  Work,
} from "@academic-explorer/types";
import {
  buildFilterString,
  cachedOpenAlex as openAlex,
} from "@academic-explorer/client";
import { logger } from "@academic-explorer/utils";
import { DataState, useAsyncOperation } from "@academic-explorer/ui";
import { transformEntityToGridItem, transformEntityToListItem } from "../utils/entity-mappers";
import { Group, Pagination, Text } from "@mantine/core";
import type { ColumnDef } from "@tanstack/react-table";
import React, { useMemo, useState } from "react";
// TODO: EntityGrid requires EntityCard component which doesn't exist yet
// import { EntityGrid } from "./EntityGrid";
// TODO: EntityListView requires EntityCard component which doesn't exist yet
// import { EntityListView } from "./EntityListView";
import { BaseTable } from "./tables/BaseTable";
import { ViewModeToggle, type ViewMode } from "./ViewModeToggle";

type Entity =
  | Funder
  | Publisher
  | Source
  | Work
  | Author
  | InstitutionEntity
  | Topic
  | Concept;

export type ColumnConfig = {
  key: string;
  header: string;
  render?: (value: unknown, row: Entity) => React.ReactNode;
};

export interface EntityListProps {
  entityType: EntityType;
  columns: ColumnConfig[];
  perPage?: number;
  title?: string;
  urlFilters?: unknown;
  viewMode?: ViewMode;
  onViewModeChange?: (viewMode: ViewMode) => void;
}

// Entity transformation functions are now provided by @academic-explorer/utils

export function EntityList({
  viewMode = "table",
  onViewModeChange,
  entityType,
  columns,
  perPage = 50,
  title,
  urlFilters,
}: EntityListProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const asyncOperation = useAsyncOperation<Entity[]>({
    retryCount: 2,
    retryDelay: 1000,
    onError: (error) => {
      logger.error("EntityList", `Failed to fetch ${entityType}`, { error });
    }
  });

  const [paginationInfo, setPaginationInfo] = useState({
    totalPages: 1,
    totalCount: 0
  });

  // Convert ColumnConfig to TanStack Table ColumnDef format
  const tableColumns = useMemo<ColumnDef<Entity>[]>(() => {
    return columns.map((col) => ({
      id: col.key,
      accessorKey: col.render ? undefined : col.key,
      accessorFn: col.render
        ? (row) => row
        : (row) => {
            // Handle nested keys like "primary_location.source.display_name"
            const keys = col.key.split(".");
            let value: unknown = row;
            for (const key of keys) {
              value = value?.[key as keyof typeof value];
            }
            return value;
          },
      header: col.header,
      cell: col.render
        ? (info) => col.render?.(info.getValue(), info.row.original)
        : (info) => String(info.getValue() ?? ""),
    }));
  }, [columns]);

  const fetchData = React.useCallback(async () => {
    let response: OpenAlexResponse<Entity> | null = null;

    switch (entityType) {
      case "funders":
        response = await openAlex.client.funders.getMultiple({
          per_page: perPage,
          page: currentPage,
        });
        break;
      case "publishers":
        response = await openAlex.client.publishers.getMultiple({
          per_page: perPage,
          page: currentPage,
        });
        break;
      case "sources":
        response = await openAlex.client.sources.getSources({
          per_page: perPage,
          page: currentPage,
        });
        break;
      case "works": {
        const worksFilter = urlFilters
          ? buildFilterString(urlFilters)
          : undefined;
        response = await openAlex.client.works.getWorks({
          per_page: perPage,
          page: currentPage,
          filter: worksFilter,
        });
        break;
      }
      case "authors":
        response = await openAlex.client.authors.getAuthors({
          per_page: perPage,
          page: currentPage,
          filter: urlFilters ? buildFilterString(urlFilters) : undefined,
        });
        break;
      case "institutions":
        response = await openAlex.client.institutions.getInstitutions({
          per_page: perPage,
          page: currentPage,
          filters: urlFilters as InstitutionsFilters | undefined,
        });
        break;
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }

    if (response) {
      setPaginationInfo({
        totalCount: response.meta.count,
        totalPages: Math.ceil(response.meta.count / response.meta.per_page)
      });
      return response.results;
    }

    throw new Error(`No response received for ${entityType}`);
  }, [entityType, perPage, urlFilters, currentPage]);

  React.useEffect(() => {
    asyncOperation.execute(fetchData);
  }, [fetchData, asyncOperation.execute]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewModeChange = (newViewMode: ViewMode) => {
    onViewModeChange?.(newViewMode);
  };

  return (
    <DataState
      loading={asyncOperation.loading}
      error={asyncOperation.error}
      data={asyncOperation.data}
      loadingMessage={`Loading ${title || entityType}...`}
      onRetry={() => asyncOperation.execute(fetchData)}
    >
      {(data) => {
        const tableData = data.map((item) => ({
          ...item,
          id: item.id.replace("https://openalex.org/", ""),
        }));

        const gridItems = data.map((item) =>
          transformEntityToGridItem(item, entityType),
        );
        const listItems = data.map((item) =>
          transformEntityToListItem(item, entityType),
        );

        return (
          <div>
            <Group justify="space-between" mb="md">
              <h1>
                {title || entityType.charAt(0).toUpperCase() + entityType.slice(1)}
              </h1>
              {onViewModeChange && (
                <ViewModeToggle value={viewMode} onChange={handleViewModeChange} />
              )}
            </Group>
            {viewMode === "table" && (
              <BaseTable data={tableData} columns={tableColumns} />
            )}
            {/* TODO: Re-enable list view when EntityCard component is implemented */}
            {/* {viewMode === "list" && <EntityListView items={listItems} />} */}
            {/* TODO: Re-enable grid view when EntityCard component is implemented */}
            {/* {viewMode === "grid" && <EntityGrid items={gridItems} />} */}
            {paginationInfo.totalPages > 1 && (
              <Group justify="space-between" mt="md">
                <Text size="sm" c="dimmed">
                  Showing {(currentPage - 1) * perPage + 1} to{" "}
                  {Math.min(currentPage * perPage, paginationInfo.totalCount)} of {paginationInfo.totalCount}{" "}
                  entries
                </Text>
                <Pagination
                  value={currentPage}
                  onChange={handlePageChange}
                  total={paginationInfo.totalPages}
                  size="sm"
                  withEdges
                />
              </Group>
            )}
          </div>
        );
      }}
    </DataState>
  );
}
