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
} from "@academic-explorer/client";
import {
  buildFilterString,
  cachedOpenAlex as openAlex,
} from "@academic-explorer/client";
import { logger } from "@academic-explorer/utils";
import { Group, Pagination, Text } from "@mantine/core";
import type { ColumnDef } from "@tanstack/react-table";
import React, { useEffect, useMemo, useState } from "react";
import { EntityGrid, type EntityGridItem } from "./EntityGrid";
import { EntityListView, type EntityListItem } from "./EntityListView";
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

function transformEntityToGridItem({
  entity,
  entityType,
}: {
  entity: Entity;
  entityType: EntityType;
}): EntityGridItem {
  const baseItem = {
    id: entity.id.replace("https://openalex.org/", ""),
    entityType,
  };

  switch (entityType) {
    case "works": {
      const work = entity as Work;
      return {
        ...baseItem,
        displayName: work.display_name,
        citedByCount: work.cited_by_count,
        description: work.abstract_inverted_index
          ? "Abstract available"
          : undefined,
      };
    }
    case "authors": {
      const author = entity as Author;
      return {
        ...baseItem,
        displayName: author.display_name,
        worksCount: author.works_count,
        citedByCount: author.cited_by_count,
        description: author.orcid ? `ORCID: ${author.orcid}` : undefined,
      };
    }
    case "institutions": {
      const institution = entity as InstitutionEntity;
      return {
        ...baseItem,
        displayName: institution.display_name,
        worksCount: institution.works_count,
        citedByCount: institution.cited_by_count,
      };
    }
    case "sources": {
      const source = entity as Source;
      return {
        ...baseItem,
        displayName: source.display_name,
        worksCount: source.works_count,
        citedByCount: source.cited_by_count,
      };
    }
    case "publishers": {
      const publisher = entity as Publisher;
      return {
        ...baseItem,
        displayName: publisher.display_name,
        worksCount: publisher.works_count,
        citedByCount: publisher.cited_by_count,
      };
    }
    case "funders": {
      const funder = entity as Funder;
      return {
        ...baseItem,
        displayName: funder.display_name,
        worksCount: funder.works_count,
        citedByCount: funder.cited_by_count,
      };
    }
    case "topics": {
      const topic = entity as Topic;
      return {
        ...baseItem,
        displayName: topic.display_name,
        worksCount: topic.works_count,
        citedByCount: topic.cited_by_count,
      };
    }
    case "concepts": {
      const concept = entity as Concept;
      return {
        ...baseItem,
        displayName: concept.display_name,
        worksCount: concept.works_count,
        citedByCount: concept.cited_by_count,
      };
    }
    default:
      return {
        ...baseItem,
        displayName: "Unknown",
      };
  }
}

function transformEntityToListItem({
  entity,
  entityType,
}: {
  entity: Entity;
  entityType: EntityType;
}): EntityListItem {
  return transformEntityToGridItem({ entity, entityType });
}

export function EntityList({
  viewMode = "table",
  onViewModeChange,
  entityType,
  columns,
  perPage = 50,
  title,
  urlFilters,
}: EntityListProps) {
  const [data, setData] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

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

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

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
          setTotalCount(response.meta.count);
          setData(response.results);
          setTotalPages(
            Math.ceil(response.meta.count / response.meta.per_page),
          );
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch data";
        setError(errorMessage);
        logger.error("EntityList", `Failed to fetch ${entityType}`, {
          error: err,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [entityType, perPage, urlFilters, currentPage]);

  if (loading) {
    return <div>Loading {title || entityType}...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  const tableData = data.map((item) => ({
    ...item,
    id: item.id.replace("https://openalex.org/", ""),
  }));

  const gridItems = data.map((item) =>
    transformEntityToGridItem({ entity: item, entityType }),
  );
  const listItems = data.map((item) =>
    transformEntityToListItem({ entity: item, entityType }),
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewModeChange = (newViewMode: ViewMode) => {
    onViewModeChange?.(newViewMode);
  };

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
      {viewMode === "list" && <EntityListView items={listItems} />}
      {viewMode === "grid" && <EntityGrid items={gridItems} />}
      {totalPages > 1 && (
        <Group justify="space-between" mt="md">
          <Text size="sm" c="dimmed">
            Showing {(currentPage - 1) * perPage + 1} to{" "}
            {Math.min(currentPage * perPage, totalCount)} of {totalCount}{" "}
            entries
          </Text>
          <Pagination
            value={currentPage}
            onChange={handlePageChange}
            total={totalPages}
            size="sm"
            withEdges
          />
        </Group>
      )}
    </div>
  );
}
