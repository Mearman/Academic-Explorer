import type { EntityType } from "@/config/cache";
import type {
  Author,
  Concept,
  Funder,
  InstitutionEntity,
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
import { BaseTable } from "./tables/BaseTable";
export type { EntityType } from "@academic-explorer/client";

type Entity =
  | Funder
  | Publisher
  | Source
  | Work
  | Author
  | InstitutionEntity
  | Topic
  | Concept;

export interface ColumnConfig {
  key: string;
  header: string;
  render?: (value: unknown, row: Entity) => React.ReactNode;
}

export interface EntityListProps {
  entityType: EntityType;
  columns: ColumnConfig[];
  perPage?: number;
  title?: string;
  urlFilters?: unknown;
}

export function EntityList({
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
      accessorKey: col.key,
      header: col.header,
      cell: col.render
        ? (info) => col.render?.(info.getValue(), info.row.original)
        : (info) => String(info.getValue() ?? ""),
    }));
  }, [columns]);  useEffect(() => {
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
          case "works":
            const worksFilter = urlFilters
              ? buildFilterString(urlFilters as any)
              : undefined;
            console.log("EntityList - works filter:", worksFilter);
            response = await openAlex.client.works.getWorks({
              per_page: perPage,
              page: currentPage,
              filter: worksFilter,
            });
            break;
          case "authors":
            response = await openAlex.client.authors.getAuthors({
              per_page: perPage,
              page: currentPage,
              filter: urlFilters
                ? buildFilterString(urlFilters as any)
                : undefined,
            });
            break;
          case "institutions":
            response = await openAlex.client.institutions.getInstitutions({
              per_page: perPage,
              page: currentPage,
              filters: urlFilters as any,
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div>
      <h1>
        {title || entityType.charAt(0).toUpperCase() + entityType.slice(1)}
      </h1>
      <BaseTable data={tableData} columns={tableColumns} />
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
